import Timesheet from '../models/TimeSheet.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';
import { Parser } from 'json2csv';

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

// ✅ FIXED: Submit timesheet with proper status
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

    // Validation
    if (!weekStartDate || !weekEndDate) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Week dates are required' });
    }

    if (!entries || entries.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'At least one timesheet entry is required' });
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
      status: 'pending', // ✅ FIXED: Consistent status
      submittedAt: new Date(),
      projectHoursCounted: false // ✅ ADDED: Track project counting
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

// ✅ FIXED: Approve timesheet with transaction and project counting
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

    // ✅ FIXED: Check for 'pending' status consistently
    if (timesheet.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Timesheet is not in pending status. Current status: ${timesheet.status}` 
      });
    }

    // ✅ FIXED: Count project hours BEFORE status change (atomic operation)
    const { projectHours, updates } = await countProjectHours(timesheet, session);

    // Update timesheet status
    timesheet.status = 'approved';
    timesheet.approvedBy = req.user.id;
    timesheet.approvedAt = new Date();
    timesheet.projectHoursCounted = true; // ✅ ADDED: Mark as counted
    
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
      projectHours: projectHours, // ✅ ADDED: Return project hours data
      updates: updates // ✅ ADDED: Return update details
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

// ✅ FIXED: Reject timesheet with proper status checking
export const rejectTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    // ✅ ADDED: Input sanitization
    const sanitizedRemarks = remarks ? remarks.trim().substring(0, 500) : '';

    const timesheet = await Timesheet.findById(id).session(session);
    if (!timesheet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // ✅ FIXED: Check for 'pending' status
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

    timesheet.status = 'rejected';
    timesheet.rejectionReason = sanitizedRemarks;
    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Timesheet rejected successfully',
      timesheet: populatedTimesheet
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

// ✅ IMPROVED: Get user timesheets with better error handling
export const getMyTimesheets = async (req, res) => {
  try {
    const { year, month, status } = req.query;
    
    let filter = { employee: req.user.id };
    
    // Filter by year and month if provided
    if (year && !isNaN(year)) {
      filter.year = parseInt(year);
    }
    
    if (month && !isNaN(month)) {
      const startDate = new Date(year || new Date().getFullYear(), month - 1, 1);
      const endDate = new Date(year || new Date().getFullYear(), month, 0);
      filter.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    // ✅ ADDED: Status filter
    if (status && ['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const timesheets = await Timesheet.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ weekStartDate: -1 })
      .limit(100); // ✅ ADDED: Limit for safety

    res.json(timesheets);
  } catch (error) {
    console.error('❌ Get my timesheets error:', error);
    res.status(500).json({ 
      message: 'Server error loading timesheets',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Get all timesheets with validation
export const getAllTimesheets = async (req, res) => {
  try {
    const { status, department, year, month, employeeCode, page = 1, limit = 50 } = req.query;
    
    let filter = {};
    
    // ✅ ADDED: Input validation
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
    const limitNum = Math.min(parseInt(limit), 100); // ✅ ADDED: Max limit
    const skip = (pageNum - 1) * limitNum;

    const timesheets = await Timesheet.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
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

// ✅ IMPROVED: Get timesheet by ID with access control
export const getTimesheetById = async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // ✅ IMPROVED: Access control with role checking
    const hasAccess = req.user.role === 'admin' || 
                     req.user.role === 'manager' ||
                     timesheet.employee._id.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Access denied to this timesheet',
        requiredRole: 'admin, manager, or timesheet owner'
      });
    }

    res.json(timesheet);
  } catch (error) {
    console.error('❌ Get timesheet by ID error:', error);
    res.status(500).json({ 
      message: 'Server error loading timesheet',
      error: error.message 
    });
  }
};

// ✅ IMPROVED: Export to CSV with error handling
export const exportTimesheetToCSV = async (req, res) => {
  try {
    const { id } = req.params;
    
    const timesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // ✅ ADDED: Access control
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
      'Week End': new Date(timesheet.weekEndDate).toLocaleDateString('en-GB')
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
        'Week End': ''
      });
    }

    const fields = [
      'Employee Code', 'Employee Name', 'Department', 'Date', 'Day', 
      'Project Code', 'Location', 'Normal Hours', 'Overtime Hours', 
      'Total Hours', 'Activity Code', 'Remarks', 'Status', 
      'Week Start', 'Week End'
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

    // ✅ ADDED: Limit for safety
    if (ids.length > 50) {
      return res.status(400).json({ message: 'Maximum 50 timesheets can be exported at once' });
    }

    const timesheets = await Timesheet.find({ _id: { $in: ids } })
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
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
        'Approved At': timesheet.approvedAt ? new Date(timesheet.approvedAt).toLocaleDateString('en-GB') : ''
      }));
      
      allEntries = allEntries.concat(weekEntries);
    });

    const fields = [
      'Employee Code', 'Employee Name', 'Department', 'Date', 'Day', 
      'Project Code', 'Location', 'Normal Hours', 'Overtime Hours', 
      'Total Hours', 'Activity Code', 'Remarks', 'Status', 
      'Week Start', 'Week End', 'Approved By', 'Approved At'
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
    // ✅ ADDED: Only allow admins
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
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timesheetCount,
      pendingApprovals: pendingCount,
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