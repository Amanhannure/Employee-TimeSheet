import Timesheet from '../models/TimeSheet.js';
import User from '../models/User.js';
import { Parser } from 'json2csv';

export const submitTimesheet = async (req, res) => {
  try {
    const { weekStartDate, weekEndDate, entries } = req.body;
    
    // Validation
    if (!weekStartDate || !weekEndDate || !entries || entries.length === 0) {
      return res.status(400).json({ message: 'Week dates and entries are required' });
    }

    // Check if all days have at least some hours
    const daysWithHours = {};
    entries.forEach(entry => {
      if (entry.normalHours > 0 || entry.overtimeHours > 0) {
        const dateStr = new Date(entry.date).toDateString();
        daysWithHours[dateStr] = true;
      }
    });

    // Check if timesheet already exists for this week
    const existingTimesheet = await Timesheet.findOne({
      employee: req.user.id,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate)
    });

    if (existingTimesheet) {
      return res.status(400).json({ message: 'Timesheet already submitted for this week' });
    }

    const user = await User.findById(req.user.id);
    
    const timesheetData = {
      employee: req.user.id,
      employeeCode: user.employeeId,
      employeeName: `${user.firstName} ${user.lastName}`,
      department: user.department,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      entries: entries,
      status: 'submitted',
      submittedAt: new Date()
    };

    const timesheet = new Timesheet(timesheetData);
    await timesheet.save();

    const populatedTimesheet = await Timesheet.findById(timesheet._id)
      .populate('employee', 'firstName lastName employeeId department');

    res.status(201).json({
      message: 'Timesheet submitted successfully',
      timesheet: populatedTimesheet
    });

  } catch (error) {
    console.error('Submit timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
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