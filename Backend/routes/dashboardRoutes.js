import express from 'express';
import Timesheet from '../models/Timesheet.js';
import User from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'employee' });
    const totalTimesheets = await Timesheet.countDocuments();
    const approvedTimesheets = await Timesheet.countDocuments({ status: 'approved' });
    const pendingTimesheets = await Timesheet.countDocuments({ status: 'pending' });
    const rejectedTimesheets = await Timesheet.countDocuments({ status: 'rejected' });

    // Calculate resubmitted timesheets (timesheets that were rejected and then resubmitted)
    const resubmittedTimesheets = await Timesheet.countDocuments({
      status: 'pending',
      previousStatus: 'rejected'
    });

    // Calculate miscellaneous hours count
    const miscTimesheets = await Timesheet.aggregate([
      {
        $match: {
          'entries.activityCode': 'MISC'
        }
      },
      {
        $project: {
          miscEntriesCount: {
            $size: {
              $filter: {
                input: '$entries',
                as: 'entry',
                cond: { $eq: ['$$entry.activityCode', 'MISC'] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalMiscEntries: { $sum: '$miscEntriesCount' }
        }
      }
    ]);

    const miscHoursCount = miscTimesheets[0]?.totalMiscEntries || 0;

    res.json({
      totalUsers,
      totalTimesheets,
      approvedTimesheets,
      pendingTimesheets,
      rejectedTimesheets,
      resubmittedTimesheets,
      miscHoursCount
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent timesheets for admin dashboard
router.get('/recent-timesheets', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const recentTimesheets = await Timesheet.find()
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(recentTimesheets);
  } catch (error) {
    console.error('Get recent timesheets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search employee miscellaneous hours
router.get('/misc-hours/search', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const miscHoursData = await Timesheet.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      {
        $unwind: '$employeeData'
      },
      {
        $match: {
          $or: [
            { 'employeeData.firstName': { $regex: query, $options: 'i' } },
            { 'employeeData.lastName': { $regex: query, $options: 'i' } },
            { 'employeeData.employeeId': { $regex: query, $options: 'i' } },
            { employeeCode: { $regex: query, $options: 'i' } }
          ],
          'entries.activityCode': 'MISC'
        }
      },
      {
        $project: {
          employeeName: { $concat: ['$employeeData.firstName', ' ', '$employeeData.lastName'] },
          employeeCode: '$employeeData.employeeId',
          weekStartDate: 1,
          weekEndDate: 1,
          miscEntries: {
            $filter: {
              input: '$entries',
              as: 'entry',
              cond: { $eq: ['$$entry.activityCode', 'MISC'] }
            }
          }
        }
      }
    ]);

    const results = miscHoursData.map(timesheet => ({
      employeeName: timesheet.employeeName,
      employeeCode: timesheet.employeeCode,
      week: `${new Date(timesheet.weekStartDate).toLocaleDateString()} - ${new Date(timesheet.weekEndDate).toLocaleDateString()}`,
      hours: timesheet.miscEntries.reduce((sum, entry) => sum + (entry.normalHours || 0) + (entry.overtimeHours || 0), 0)
    }));

    res.json({
      count: results.length,
      details: results
    });
  } catch (error) {
    console.error('Search misc hours error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;