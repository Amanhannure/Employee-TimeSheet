import Timesheet from '../models/TimeSheet.js';
import User from '../models/User.js';
import { Parser } from 'json2csv';

export const submitTimesheet = async (req, res) => {
  try {
    const { weekStartDate, weekEndDate, entries } = req.body;
    
    console.log('📝 Submitting timesheet:', { 
      weekStartDate, 
      weekEndDate, 
      entriesCount: entries?.length 
    });

    // Validation
    if (!weekStartDate || !weekEndDate) {
      return res.status(400).json({ message: 'Week dates are required' });
    }

    if (!entries || entries.length === 0) {
      return res.status(400).json({ message: 'At least one timesheet entry is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if timesheet already exists for this week
    const existingTimesheet = await Timesheet.findOne({
      employee: req.user.id,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate)
    });

    if (existingTimesheet) {
      return res.status(400).json({ 
        message: 'Timesheet already submitted for this week',
        existingTimesheet 
      });
    }

    // ✅ MANUAL CALCULATION of weekNumber and year
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
      weekNumber: weekNumber, // ✅ ADDED MANUALLY
      year: year, // ✅ ADDED MANUALLY
      entries: entries,
      totalNormalHours: totalNormalHours,
      totalOvertimeHours: totalOvertimeHours,
      totalHours: totalNormalHours + totalOvertimeHours,
      status: 'submitted',
      submittedAt: new Date()
    };

    console.log('💾 Saving timesheet data with manual calculations:', {
      weekNumber,
      year,
      totalNormalHours,
      totalOvertimeHours
    });

    const timesheet = new Timesheet(timesheetData);
    await timesheet.save();

    const populatedTimesheet = await Timesheet.findById(timesheet._id)
      .populate('employee', 'firstName lastName employeeId department');

    console.log('✅ Timesheet submitted successfully');

    res.status(201).json({
      message: 'Timesheet submitted successfully',
      timesheet: populatedTimesheet
    });

  } catch (error) {
    console.error('❌ Submit timesheet error:', error);
    res.status(500).json({ 
      message: 'Server error submitting timesheet',
      error: error.message 
    });
  }
};

export const getMyTimesheets = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let filter = { employee: req.user.id };
    
    // Filter by year and month if provided
    if (year) {
      filter.year = parseInt(year);
    }
    
    if (month) {
      const startDate = new Date(year || new Date().getFullYear(), month - 1, 1);
      const endDate = new Date(year || new Date().getFullYear(), month, 0);
      filter.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    const timesheets = await Timesheet.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ weekStartDate: -1 });

    res.json(timesheets);
  } catch (error) {
    console.error('Get my timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllTimesheets = async (req, res) => {
  try {
    const { status, department, year, month, employeeCode } = req.query;
    
    let filter = {};
    
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (employeeCode) filter.employeeCode = { $regex: employeeCode, $options: 'i' };
    if (year) filter.year = parseInt(year);
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    const timesheets = await Timesheet.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ weekStartDate: -1, createdAt: -1 });

    res.json(timesheets);
  } catch (error) {
    console.error('Get all timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Approve timesheet function
export const approveTimesheet = async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    if (timesheet.status !== 'submitted') {
      return res.status(400).json({ message: 'Timesheet is not in submitted status' });
    }

    timesheet.status = 'approved';
    timesheet.approvedBy = req.user.id;
    timesheet.approvedAt = new Date();
    await timesheet.save();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Timesheet approved successfully',
      timesheet: populatedTimesheet
    });

  } catch (error) {
    console.error('Approve timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Reject timesheet function
export const rejectTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    if (timesheet.status !== 'submitted') {
      return res.status(400).json({ message: 'Timesheet is not in submitted status' });
    }

    if (!remarks) {
      return res.status(400).json({ message: 'Rejection remarks are required' });
    }

    timesheet.status = 'rejected';
    timesheet.rejectionReason = remarks;
    await timesheet.save();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Timesheet rejected successfully',
      timesheet: populatedTimesheet
    });

  } catch (error) {
    console.error('Reject timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add this function to your existing timesheetController.js
export const getTimesheetById = async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // Check if user has access to this timesheet
    const hasAccess = req.user.role === 'admin' || 
                     req.user.role === 'manager' ||
                     timesheet.employee._id.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(timesheet);
  } catch (error) {
    console.error('Get timesheet by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const exportTimesheetToCSV = async (req, res) => {
  try {
    const { id } = req.params;
    
    const timesheet = await Timesheet.findById(id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    // Prepare data for CSV
    const csvData = timesheet.entries.map(entry => ({
      'Employee Code': timesheet.employeeCode,
      'Employee Name': timesheet.employeeName,
      'Department': timesheet.department,
      'Date': new Date(entry.date).toLocaleDateString('en-GB'),
      'Day': entry.dayOfWeek,
      'Project Code': entry.projectCode,
      'Location': entry.location,
      'Normal Hours': entry.normalHours,
      'Overtime Hours': entry.overtimeHours,
      'Total Hours': (entry.normalHours + entry.overtimeHours).toFixed(2),
      'Activity Code': entry.activityCode,
      'Remarks': entry.remarks,
      'Status': timesheet.status,
      'Week Start': new Date(timesheet.weekStartDate).toLocaleDateString('en-GB'),
      'Week End': new Date(timesheet.weekEndDate).toLocaleDateString('en-GB')
    }));

    // Add summary row
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
    console.error('Export timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const exportMultipleTimesheetsToCSV = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Timesheet IDs are required' });
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
        'Location': entry.location,
        'Normal Hours': entry.normalHours,
        'Overtime Hours': entry.overtimeHours,
        'Total Hours': (entry.normalHours + entry.overtimeHours).toFixed(2),
        'Activity Code': entry.activityCode,
        'Remarks': entry.remarks,
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
    console.error('Export multiple timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Archive old timesheets (run this periodically)
export const archiveOldTimesheets = async (req, res) => {
  try {
    const result = await Timesheet.archiveOldTimesheets();
    
    res.json({
      message: `Archived ${result.modifiedCount} timesheets older than 1 year`,
      archivedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Archive timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};