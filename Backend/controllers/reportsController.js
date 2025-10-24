import Timesheet from '../models/TimeSheet.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

export const getHoursTracking = async (req, res) => {
  try {
    const { plNo, projectName } = req.query;
    
    let filter = {};
    if (plNo) filter.plNo = new RegExp(plNo, 'i');
    if (projectName) filter.name = new RegExp(projectName, 'i');

    const projects = await Project.find(filter)
      .populate('assignedEmployees', 'firstName lastName employeeId department');

    // Calculate totals
    const totals = projects.reduce((acc, project) => {
      acc.totalHours += project.totalHours || 0;
      acc.consumedHours += (project.juniorCompleted || 0) + (project.seniorCompleted || 0);
      acc.variationHours += project.variationHours || 0;
      return acc;
    }, { totalHours: 0, consumedHours: 0, variationHours: 0 });

    totals.balanceHours = totals.totalHours - totals.consumedHours;

    res.json({
      projects,
      totals,
      count: projects.length
    });
  } catch (error) {
    console.error('Get hours tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEmployeeReport = async (req, res) => {
  try {
    const { employeeId, plNo, name, startDate, endDate } = req.query;
    
    let employee = null;
    let project = null;

    // Find by employee
    if (employeeId) {
      employee = await User.findOne({ employeeId });
    } else if (name) {
      employee = await User.findOne({
        $or: [
          { firstName: new RegExp(name, 'i') },
          { lastName: new RegExp(name, 'i') }
        ]
      });
    }

    // Find by project
    if (plNo) {
      project = await Project.findOne({ plNo });
    } else if (name && !employee) {
      project = await Project.findOne({ name: new RegExp(name, 'i') });
    }

    let result = {};

    if (employee) {
      // Get employee timesheets with date filtering
      let dateFilter = {};
      if (startDate || endDate) {
        dateFilter.weekStartDate = {};
        if (startDate) dateFilter.weekStartDate.$gte = new Date(startDate);
        if (endDate) dateFilter.weekStartDate.$lte = new Date(endDate);
      }

      const timesheets = await Timesheet.find({
        employee: employee._id,
        ...dateFilter
      }).populate('employee', 'firstName lastName employeeId department');

      result = {
        type: 'employee',
        employee,
        timesheets
      };
    } else if (project) {
      result = {
        type: 'project', 
        project,
        assignedEmployees: await User.find({ _id: { $in: project.assignedEmployees } })
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Get employee report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};