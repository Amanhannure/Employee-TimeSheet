import express from 'express';
import Timesheet from '../models/TimeSheet.js';
import Project from '../models/Project.js';
import { authenticate, authorizeAdmin, authorizeManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// Submit timesheet (Employee)
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { project, weekStartDate, entries } = req.body;

    // Validation
    if (!project || !weekStartDate || !entries || entries.length === 0) {
      return res.status(400).json({ message: 'Project, week start date, and entries are required' });
    }

    // Check if project exists and user is assigned to it
    const projectExists = await Project.findOne({ 
      _id: project,
      assignedEmployees: req.user.id 
    });
    
    if (!projectExists) {
      return res.status(403).json({ message: 'You are not assigned to this project' });
    }

    // Check if timesheet already exists for this week
    const existingTimesheet = await Timesheet.findOne({
      employee: req.user.id,
      project: project,
      weekStartDate: new Date(weekStartDate)
    });

    if (existingTimesheet) {
      return res.status(400).json({ message: 'Timesheet already submitted for this week' });
    }

    const newTimesheet = new Timesheet({
      employee: req.user.id,
      project,
      weekStartDate: new Date(weekStartDate),
      entries,
      status: 'pending'
    });

    await newTimesheet.save();

    const populatedTimesheet = await Timesheet.findById(newTimesheet._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('project', 'name projectCode');

    res.status(201).json({
      message: 'Timesheet submitted successfully',
      timesheet: populatedTimesheet
    });
  } catch (error) {
    console.error('Submit timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee's timesheets
router.get('/my-timesheets', authenticate, async (req, res) => {
  try {
    const timesheets = await Timesheet.find({ employee: req.user.id })
      .populate('project', 'name projectCode department')
      .sort({ weekStartDate: -1, createdAt: -1 });

    res.json(timesheets);
  } catch (error) {
    console.error('Get my timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all timesheets (Admin/Manager)
router.get('/', authenticate, authorizeManager, async (req, res) => {
  try {
    const { status, weekStartDate } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (weekStartDate) filter.weekStartDate = new Date(weekStartDate);

    const timesheets = await Timesheet.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('project', 'name projectCode')
      .populate('approvedBy', 'firstName lastName')
      .sort({ weekStartDate: -1, createdAt: -1 });

    res.json(timesheets);
  } catch (error) {
    console.error('Get all timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve timesheet (Admin/Manager)
router.patch('/:id/approve', authenticate, authorizeManager, async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id);
    
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    if (timesheet.status !== 'pending') {
      return res.status(400).json({ message: 'Timesheet already processed' });
    }

    timesheet.status = 'approved';
    timesheet.approvedBy = req.user.id;
    timesheet.approvedAt = new Date();

    await timesheet.save();

    const populatedTimesheet = await Timesheet.findById(timesheet._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('project', 'name projectCode')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Timesheet approved successfully',
      timesheet: populatedTimesheet
    });
  } catch (error) {
    console.error('Approve timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject timesheet (Admin/Manager)
router.patch('/:id/reject', authenticate, authorizeManager, async (req, res) => {
  try {
    const { remarks } = req.body;
    
    const timesheet = await Timesheet.findById(req.params.id);
    
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }

    if (timesheet.status !== 'pending') {
      return res.status(400).json({ message: 'Timesheet already processed' });
    }

    timesheet.status = 'rejected';
    timesheet.approvedBy = req.user.id;
    timesheet.approvedAt = new Date();

    await timesheet.save();

    const populatedTimesheet = await Timesheet.findById(timesheet._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('project', 'name projectCode')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Timesheet rejected successfully',
      timesheet: populatedTimesheet
    });
  } catch (error) {
    console.error('Reject timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get timesheet by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('project', 'name projectCode')
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
    console.error('Get timesheet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;