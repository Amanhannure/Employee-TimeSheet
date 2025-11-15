import Timesheet from '../models/TimeSheet.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';
import { Parser } from 'json2csv';

// ✅ ADDED: Check for pending rejected timesheets blocking
const checkPendingRejectedBlock = async (employeeId) => {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const pendingRejected = await Timesheet.findOne({
      employee: employeeId,
      status: 'rejected',
      submittedAt: { $lte: fifteenDaysAgo } // Rejected more than 15 days ago
    });
    
    return {
      isBlocked: !!pendingRejected,
      blockedTimesheet: pendingRejected
    };
  } catch (error) {
    console.error('Error checking pending rejected block:', error);
    return { isBlocked: false, blockedTimesheet: null };
  }
};

// ✅ ADDED: Validate no future dates in entries
const validateNoFutureDates = (entries) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  const futureEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate > today;
  });
  
  if (futureEntries.length > 0) {
    const futureDates = [...new Set(futureEntries.map(entry => 
      new Date(entry.date).toLocaleDateString('en-GB')
    ))];
    throw new Error(`Cannot submit hours for future dates: ${futureDates.join(', ')}`);
  }
  
  return true;
};

// ✅ ADDED: Safe project hours counting with transaction
const countProjectHours = async (timesheet, session = null) => {
  try {
    console.log('📊 Counting project hours for timesheet:', timesheet._id);
    
    const projectHours = {};
    const updates = [];
    
    // Group hours by project
    timesheet.entries.forEach(entry => {
      if (entry.project && entry.project.toString() !== '') {
        const projectId = entry.project.toString();
        const totalHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
        
        if (totalHours > 0) {
          if (!projectHours[projectId]) {
            projectHours[projectId] = 0;
          }
          projectHours[projectId] += totalHours;
        }
      }
    });

    // Update project hours with session support
    for (const [projectId, hours] of Object.entries(projectHours)) {
      if (hours > 0) {
        try {
          const query = Project.findById(projectId);
          if (session) query.session(session);
          
          const project = await query;
          if (project) {
            // Update consumed hours
            project.consumedHours = (project.consumedHours || 0) + hours;
            
            // Check if project should be put on hold
            if (project.consumedHours >= project.totalHours) {
              project.status = 'hold';
              console.log(`🛑 Project ${project.projectCode} put on hold - hours consumed`);
            }
            
            updates.push({
              projectId: projectId,
              projectCode: project.projectCode,
              hours: hours,
              newConsumed: project.consumedHours
            });
            
            if (session) {
              await project.save({ session });
            } else {
              await project.save();
            }
            
            console.log(`✅ Added ${hours} hours to project ${project.projectCode}`);
          } else {
            console.warn(`⚠️ Project not found: ${projectId}`);
          }
        } catch (error) {
          console.error(`❌ Error updating project ${projectId}:`, error);
          throw error;
        }
      }
    }
    
    return { projectHours, updates };
  } catch (error) {
    console.error('❌ Error counting project hours:', error);
    throw error;
  }
};

// ✅ ENHANCED: Submit timesheet with future date validation and blocking check
export const submitTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { weekStartDate, weekEndDate, entries } = req.body;
    
    console.log('📝 Submitting timesheet:', { 
      weekStartDate, 
      weekEndDate, 
      entriesCount: entries?.length 
    });

    // ✅ NEW: Check if employee is blocked by pending rejected timesheets
    const blockCheck = await checkPendingRejectedBlock(req.user.id);
    if (blockCheck.isBlocked) {
      await session.abortTransaction();
      return res.status(403).json({ 
        message: 'Cannot submit new timesheets. You have rejected timesheets older than 15 days that need attention.',
        code: 'PENDING_REJECTED_BLOCK',
        requiresResolution: true,
        blockedSince: blockCheck.blockedTimesheet.submittedAt
      });
    }

    // Validation
    if (!weekStartDate || !weekEndDate) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Week dates are required' });
    }

    if (!entries || entries.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'At least one timesheet entry is required' });
    }

    // ✅ NEW: Validate no future dates
    try {
      validateNoFutureDates(entries);
    } catch (dateError) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: dateError.message,
        code: 'FUTURE_DATES_NOT_ALLOWED'
      });
    }

    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if timesheet already exists for this week
    const existingTimesheet = await Timesheet.findOne({
      employee: req.user.id,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate)
    }).session(session);

    if (existingTimesheet) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Timesheet already submitted for this week',
        existingTimesheet 
      });
    }

    // ✅ FIXED: Manual calculation of weekNumber and year
    const startDate = new Date(weekStartDate);
    const startOfYear = new Date(startDate.getFullYear(), 0, 1);
    const days = Math.floor((startDate - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + 1) / 7);
    const year = startDate.getFullYear();

    // Calculate totals
    const totalNormalHours = entries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
    const totalOvertimeHours = entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);

    const timesheetData = {
      employee: req.user.id,
      employeeCode: user.employeeId,
      employeeName: `${user.firstName} ${user.lastName}`,
      department: user.department,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      weekNumber: weekNumber,
      year: year,
      entries: entries,
      totalNormalHours: totalNormalHours,
      totalOvertimeHours: totalOvertimeHours,
      totalHours: totalNormalHours + totalOvertimeHours,
      status: 'pending',
      submittedAt: new Date(),
      projectHoursCounted: false
    };

    console.log('💾 Saving timesheet data:', {
      weekNumber,
      year,
      totalNormalHours,
      totalOvertimeHours,
      status: 'pending'
    });

    const timesheet = new Timesheet(timesheetData);
    await timesheet.save({ session });

    await session.commitTransaction();
    
    const populatedTimesheet = await Timesheet.findById(timesheet._id)
      .populate('employee', 'firstName lastName employeeId department');

    console.log('✅ Timesheet submitted successfully with status: pending');

    res.status(201).json({
      message: 'Timesheet submitted successfully',
      timesheet: populatedTimesheet
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Submit timesheet error:', error);
    res.status(500).json({ 
      message: 'Server error submitting timesheet',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✅ ENHANCED: Approve timesheet with transaction and project counting
export const approveTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findById(id).session(session);
    if (!timesheet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    if (timesheet.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Timesheet is not in pending status. Current status: ${timesheet.status}` 
      });
    }

    // Count project hours BEFORE status change (atomic operation)
    const { projectHours, updates } = await countProjectHours(timesheet, session);

    // Update timesheet status
    timesheet.status = 'approved';
    timesheet.approvedBy = req.user.id;
    timesheet.approvedAt = new Date();
    timesheet.projectHoursCounted = true;
    
    // Mark individual entries as counted
    timesheet.entries.forEach(entry => {
      if (entry.project && entry.project.toString() !== '') {
        entry.hoursCounted = true;
      }
    });
    
    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    console.log('✅ Timesheet approved successfully with project hours counted');

    res.json({
      message: 'Timesheet approved successfully',
      timesheet: populatedTimesheet,
      projectHours: projectHours,
      updates: updates
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Approve timesheet error:', error);
    res.status(500).json({ 
      message: 'Server error approving timesheet',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✅ ENHANCED: Reject timesheet with 15-day timer
export const rejectTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { remarks, category } = req.body;

    const sanitizedRemarks = remarks ? remarks.trim().substring(0, 500) : '';
    const rejectionCategory = category || 'other';

    const timesheet = await Timesheet.findById(id).session(session);
    if (!timesheet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    if (timesheet.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Timesheet is not in pending status. Current status: ${timesheet.status}` 
      });
    }

    if (!sanitizedRemarks) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Rejection remarks are required' });
    }

    // ✅ NEW: Set rejection timestamp for 15-day tracking
    timesheet.status = 'rejected';
    timesheet.rejectionReason = sanitizedRemarks;
    timesheet.rejectionCategory = rejectionCategory;
    timesheet.rejectedBy = req.user.id;
    timesheet.rejectedAt = new Date();
    timesheet.editableUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
    
    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('rejectedBy', 'firstName lastName');

    res.json({
      message: 'Timesheet rejected successfully. Employee has 15 days to edit and resubmit.',
      timesheet: populatedTimesheet,
      editableUntil: timesheet.editableUntil,
      daysRemaining: 15
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Reject timesheet error:', error);
    res.status(500).json({ 
      message: 'Server error rejecting timesheet',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✅ NEW: Edit rejected timesheet (within 15-day window)
export const editRejectedTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { entries } = req.body;

    const timesheet = await Timesheet.findById(id).session(session);
    if (!timesheet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // ✅ NEW: Check if timesheet is rejected and within 15-day window
    if (timesheet.status !== 'rejected') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Only rejected timesheets can be edited',
        code: 'NOT_REJECTED'
      });
    }

    if (!timesheet.editableUntil || new Date() > timesheet.editableUntil) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Editing period has expired. This timesheet can no longer be edited.',
        code: 'EDITING_PERIOD_EXPIRED',
        editableUntil: timesheet.editableUntil
      });
    }

    if (!entries || entries.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'At least one timesheet entry is required' });
    }

    // ✅ NEW: Validate no future dates for edited entries
    try {
      validateNoFutureDates(entries);
    } catch (dateError) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: dateError.message,
        code: 'FUTURE_DATES_NOT_ALLOWED'
      });
    }

    // Store original values for audit
    const originalEntries = JSON.parse(JSON.stringify(timesheet.entries));
    
    // Update timesheet entries and recalculate totals
    timesheet.entries = entries;
    
    const totalNormalHours = entries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
    const totalOvertimeHours = entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
    
    timesheet.totalNormalHours = totalNormalHours;
    timesheet.totalOvertimeHours = totalOvertimeHours;
    timesheet.totalHours = totalNormalHours + totalOvertimeHours;
    
    // Reset status to pending for re-approval
    timesheet.status = 'pending';
    timesheet.resubmittedAt = new Date();
    timesheet.resubmissionCount = (timesheet.resubmissionCount || 0) + 1;
    timesheet.rejectionReason = '';
    timesheet.rejectionCategory = undefined;
    
    // Add edit history
    const changes = {
      entries: `Modified ${entries.length} entries`,
      totalHours: `${timesheet.totalHours} hours`,
      resubmissionCount: timesheet.resubmissionCount
    };
    
    timesheet.addEditHistory(req.user.id, changes, 'Resubmitted after rejection');

    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department');

    const daysRemaining = Math.ceil((timesheet.editableUntil - new Date()) / (24 * 60 * 60 * 1000));

    res.json({
      message: 'Timesheet edited and resubmitted successfully',
      timesheet: populatedTimesheet,
      remainingEdits: `${daysRemaining} days`,
      resubmissionCount: timesheet.resubmissionCount
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Edit rejected timesheet error:', error);
    res.status(500).json({ 
      message: 'Server error editing timesheet',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✅ NEW: Get timesheets that are eligible for editing
export const getEditableTimesheets = async (req, res) => {
  try {
    const editableTimesheets = await Timesheet.find({
      employee: req.user.id,
      status: 'rejected',
      editableUntil: { $gt: new Date() } // Still editable
    })
    .populate('employee', 'firstName lastName employeeId department')
    .populate('rejectedBy', 'firstName lastName')
    .sort({ weekStartDate: -1 });

    // Enhance with editing info
    const enhancedTimesheets = editableTimesheets.map(timesheet => {
      const timesheetObj = timesheet.toObject();
      const now = new Date();
      
      timesheetObj.canEdit = true;
      timesheetObj.daysRemaining = Math.ceil((timesheet.editableUntil - now) / (24 * 60 * 60 * 1000));
      timesheetObj.isExpired = false;
      
      return timesheetObj;
    });

    res.json({
      editableTimesheets: enhancedTimesheets,
      count: editableTimesheets.length
    });
  } catch (error) {
    console.error('❌ Get editable timesheets error:', error);
    res.status(500).json({ 
      message: 'Server error loading editable timesheets',
      error: error.message 
    });
  }
};

// ✅ NEW: Check if user is blocked from submitting new timesheets
export const checkSubmissionBlock = async (req, res) => {
  try {
    const blockCheck = await checkPendingRejectedBlock(req.user.id);
    
    // Get blocking timesheets details
    let blockingTimesheets = [];
    if (blockCheck.isBlocked) {
      blockingTimesheets = await Timesheet.find({
        employee: req.user.id,
        status: 'rejected',
        submittedAt: { $lte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
      })
      .sort({ submittedAt: 1 })
      .select('weekStartDate weekEndDate rejectionReason submittedAt');
    }
    
    res.json({
      canSubmit: !blockCheck.isBlocked,
      isBlocked: blockCheck.isBlocked,
      blockingTimesheets: blockingTimesheets,
      message: blockCheck.isBlocked 
        ? `You have ${blockingTimesheets.length} rejected timesheet(s) older than 15 days that need attention.` 
        : 'You can submit new timesheets.'
    });
  } catch (error) {
    console.error('❌ Check submission block error:', error);
    res.status(500).json({ 
      message: 'Server error checking submission status',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Get user timesheets with rejected timesheet info
export const getMyTimesheets = async (req, res) => {
  try {
    const { year, month, status } = req.query;
    
    let filter = { employee: req.user.id };
    
    if (year && !isNaN(year)) {
      filter.year = parseInt(year);
    }
    
    if (month && !isNaN(month)) {
      const startDate = new Date(year || new Date().getFullYear(), month - 1, 1);
      const endDate = new Date(year || new Date().getFullYear(), month, 0);
      filter.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    if (status && ['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const timesheets = await Timesheet.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ weekStartDate: -1 })
      .limit(100);

    // ✅ ADDED: Calculate editing eligibility for rejected timesheets
    const enhancedTimesheets = timesheets.map(timesheet => {
      const timesheetObj = timesheet.toObject();
      
      if (timesheet.status === 'rejected') {
        const now = new Date();
        timesheetObj.canEdit = timesheet.editableUntil && timesheet.editableUntil > now;
        timesheetObj.daysRemaining = timesheet.editableUntil 
          ? Math.ceil((timesheet.editableUntil - now) / (24 * 60 * 60 * 1000))
          : 0;
        timesheetObj.isExpired = !timesheetObj.canEdit;
        timesheetObj.isBlocking = timesheet.submittedAt && 
          (now - timesheet.submittedAt) > (15 * 24 * 60 * 60 * 1000);
      }
      
      return timesheetObj;
    });

    res.json(enhancedTimesheets);
  } catch (error) {
    console.error('❌ Get my timesheets error:', error);
    res.status(500).json({ 
      message: 'Server error loading timesheets',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Get all timesheets with enhanced rejected info
export const getAllTimesheets = async (req, res) => {
  try {
    const { status, department, year, month, employeeCode, page = 1, limit = 50 } = req.query;
    
    let filter = {};
    
    if (status && ['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }
    
    if (department && typeof department === 'string') {
      filter.department = department;
    }
    
    if (employeeCode && typeof employeeCode === 'string') {
      filter.employeeCode = { $regex: employeeCode, $options: 'i' };
    }
    
    if (year && !isNaN(year)) {
      filter.year = parseInt(year);
    }
    
    if (month && !isNaN(month) && year && !isNaN(year)) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const timesheets = await Timesheet.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ weekStartDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Timesheet.countDocuments(filter);

    res.json({
      timesheets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Get all timesheets error:', error);
    res.status(500).json({ 
      message: 'Server error loading timesheets',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Get timesheet by ID with editing info
export const getTimesheetById = async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');

    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    const hasAccess = req.user.role === 'admin' || 
                     req.user.role === 'manager' ||
                     timesheet.employee._id.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Access denied to this timesheet',
        requiredRole: 'admin, manager, or timesheet owner'
      });
    }

    // ✅ ADDED: Enhanced response with editing info
    const enhancedTimesheet = timesheet.toObject();
    
    if (timesheet.status === 'rejected') {
      const now = new Date();
      enhancedTimesheet.canEdit = timesheet.editableUntil && timesheet.editableUntil > now;
      enhancedTimesheet.daysRemaining = timesheet.editableUntil 
        ? Math.ceil((timesheet.editableUntil - now) / (24 * 60 * 60 * 1000))
        : 0;
      enhancedTimesheet.isExpired = !enhancedTimesheet.canEdit;
      enhancedTimesheet.isBlocking = timesheet.submittedAt && 
        (now - timesheet.submittedAt) > (15 * 24 * 60 * 60 * 1000);
    }

    res.json(enhancedTimesheet);
  } catch (error) {
    console.error('❌ Get timesheet by ID error:', error);
    res.status(500).json({ 
      message: 'Server error loading timesheet',
      error: error.message 
    });
  }
};

// ✅ NEW: Cron job to expire editing periods (would be called by a scheduler)
export const expireEditingPeriods = async (req, res) => {
  try {
    // ✅ ADDED: Only allow admins
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const now = new Date();
    
    const result = await Timesheet.updateMany(
      { 
        status: 'rejected',
        editableUntil: { $lte: now },
        isExpired: { $ne: true }
      },
      { 
        isExpired: true,
        expiredAt: now
      }
    );
    
    console.log(`⏰ Expired ${result.modifiedCount} timesheet editing periods`);
    
    res.json({
      message: `Expired ${result.modifiedCount} timesheet editing periods`,
      expiredCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Expire editing periods error:', error);
    res.status(500).json({ 
      message: 'Server error expiring editing periods',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Export to CSV with enhanced rejected info
export const exportTimesheetToCSV = async (req, res) => {
  try {
    const { id } = req.params;
    
    const timesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');

    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    const hasAccess = req.user.role === 'admin' || 
                     req.user.role === 'manager' ||
                     timesheet.employee._id.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Prepare data for CSV
    const csvData = timesheet.entries.map(entry => ({
      'Employee Code': timesheet.employeeCode,
      'Employee Name': timesheet.employeeName,
      'Department': timesheet.department,
      'Date': new Date(entry.date).toLocaleDateString('en-GB'),
      'Day': entry.dayOfWeek,
      'Project Code': entry.projectCode,
      'Location': entry.location || '',
      'Normal Hours': entry.normalHours || 0,
      'Overtime Hours': entry.overtimeHours || 0,
      'Total Hours': ((entry.normalHours || 0) + (entry.overtimeHours || 0)).toFixed(2),
      'Activity Code': entry.activityCode,
      'Remarks': entry.remarks || '',
      'Status': timesheet.status,
      'Week Start': new Date(timesheet.weekStartDate).toLocaleDateString('en-GB'),
      'Week End': new Date(timesheet.weekEndDate).toLocaleDateString('en-GB'),
      // ✅ ADDED: Rejection and editing info
      'Rejection Reason': timesheet.rejectionReason || '',
      'Rejection Category': timesheet.rejectionCategory || '',
      'Editable Until': timesheet.editableUntil ? new Date(timesheet.editableUntil).toLocaleDateString('en-GB') : '',
      'Can Edit': timesheet.status === 'rejected' ? (timesheet.editableUntil && timesheet.editableUntil > new Date() ? 'Yes' : 'No') : 'N/A',
      'Days Remaining': timesheet.status === 'rejected' && timesheet.editableUntil ? 
        Math.ceil((timesheet.editableUntil - new Date()) / (24 * 60 * 60 * 1000)) : 'N/A'
    }));

    // Add summary row
    if (csvData.length > 0) {
      csvData.push({
        'Employee Code': 'TOTAL',
        'Employee Name': '',
        'Department': '',
        'Date': '',
        'Day': '',
        'Project Code': '',
        'Location': '',
        'Normal Hours': timesheet.totalNormalHours,
        'Overtime Hours': timesheet.totalOvertimeHours,
        'Total Hours': timesheet.totalHours,
        'Activity Code': '',
        'Remarks': '',
        'Status': '',
        'Week Start': '',
        'Week End': '',
        'Rejection Reason': '',
        'Rejection Category': '',
        'Editable Until': '',
        'Can Edit': '',
        'Days Remaining': ''
      });
    }

    const fields = [
      'Employee Code', 'Employee Name', 'Department', 'Date', 'Day', 
      'Project Code', 'Location', 'Normal Hours', 'Overtime Hours', 
      'Total Hours', 'Activity Code', 'Remarks', 'Status', 
      'Week Start', 'Week End', 'Rejection Reason', 'Rejection Category',
      'Editable Until', 'Can Edit', 'Days Remaining'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`timesheet-${timesheet.employeeCode}-${timesheet.weekStartDate.toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Export timesheet error:', error);
    res.status(500).json({ 
      message: 'Server error exporting timesheet',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Export multiple timesheets
export const exportMultipleTimesheetsToCSV = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Timesheet IDs array is required' });
    }

    if (ids.length > 50) {
      return res.status(400).json({ message: 'Maximum 50 timesheets can be exported at once' });
    }

    const timesheets = await Timesheet.find({ _id: { $in: ids } })
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ weekStartDate: 1 });

    if (timesheets.length === 0) {
      return res.status(404).json({ message: 'No timesheets found' });
    }

    let allEntries = [];
    
    timesheets.forEach(timesheet => {
      const weekEntries = timesheet.entries.map(entry => ({
        'Employee Code': timesheet.employeeCode,
        'Employee Name': timesheet.employeeName,
        'Department': timesheet.department,
        'Date': new Date(entry.date).toLocaleDateString('en-GB'),
        'Day': entry.dayOfWeek,
        'Project Code': entry.projectCode,
        'Location': entry.location || '',
        'Normal Hours': entry.normalHours || 0,
        'Overtime Hours': entry.overtimeHours || 0,
        'Total Hours': ((entry.normalHours || 0) + (entry.overtimeHours || 0)).toFixed(2),
        'Activity Code': entry.activityCode,
        'Remarks': entry.remarks || '',
        'Status': timesheet.status,
        'Week Start': new Date(timesheet.weekStartDate).toLocaleDateString('en-GB'),
        'Week End': new Date(timesheet.weekEndDate).toLocaleDateString('en-GB'),
        'Approved By': timesheet.approvedBy ? `${timesheet.approvedBy.firstName} ${timesheet.approvedBy.lastName}` : '',
        'Approved At': timesheet.approvedAt ? new Date(timesheet.approvedAt).toLocaleDateString('en-GB') : '',
        'Rejected By': timesheet.rejectedBy ? `${timesheet.rejectedBy.firstName} ${timesheet.rejectedBy.lastName}` : '',
        'Rejection Reason': timesheet.rejectionReason || '',
        'Editable Until': timesheet.editableUntil ? new Date(timesheet.editableUntil).toLocaleDateString('en-GB') : ''
      }));
      
      allEntries = allEntries.concat(weekEntries);
    });

    const fields = [
      'Employee Code', 'Employee Name', 'Department', 'Date', 'Day', 
      'Project Code', 'Location', 'Normal Hours', 'Overtime Hours', 
      'Total Hours', 'Activity Code', 'Remarks', 'Status', 
      'Week Start', 'Week End', 'Approved By', 'Approved At',
      'Rejected By', 'Rejection Reason', 'Editable Until'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(allEntries);

    res.header('Content-Type', 'text/csv');
    res.attachment(`timesheets-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Export multiple timesheets error:', error);
    res.status(500).json({ 
      message: 'Server error exporting timesheets',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Archive old timesheets
export const archiveOldTimesheets = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const result = await Timesheet.archiveOldTimesheets();
    
    res.json({
      message: `Archived ${result.modifiedCount} timesheets older than 1 year`,
      archivedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Archive timesheets error:', error);
    res.status(500).json({ 
      message: 'Server error archiving timesheets',
      error: error.message 
    });
  }
};

// ✅ ADDED: Health check endpoint
export const healthCheck = async (req, res) => {
  try {
    const timesheetCount = await Timesheet.countDocuments();
    const pendingCount = await Timesheet.countDocuments({ status: 'pending' });
    const rejectedCount = await Timesheet.countDocuments({ 
      status: 'rejected',
      editableUntil: { $gt: new Date() }
    });
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timesheetCount,
      pendingApprovals: pendingCount,
      editableRejected: rejectedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  editRejectedTimesheet,
  getEditableTimesheets,
  checkSubmissionBlock,
  getMyTimesheets,
  getAllTimesheets,
  getTimesheetById,
  expireEditingPeriods,
  exportTimesheetToCSV,
  exportMultipleTimesheetsToCSV,
  archiveOldTimesheets,
  healthCheck
};