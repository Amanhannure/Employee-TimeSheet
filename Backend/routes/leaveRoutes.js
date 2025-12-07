import express from 'express';
import {
  // ✅ LEAVE REQUEST FUNCTIONS
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  downloadDocument,
  getLeaveStatistics,
  getLeaveRequestById,
  
  // ✅ LEAVE BALANCE FUNCTIONS
  getAllLeaveBalances,
  getEmployeeLeaveBalance,
  updateLeaveBalance,
  updateEmployeeLeaveStatus,
  runMonthlyAccrual,
  
  // ✅ NEW: LEAVE CHECKING FUNCTIONS
  checkLeaveForDate,
  getApprovedLeavesForWeek,
  getLeaveCalendar
} from '../controllers/leaveController.js';
import { authenticate, authorizeAdmin, authorizeManager } from '../middleware/authMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

// ==================== ✅ LEAVE REQUEST ROUTES ====================

// ✅ Employee routes (all authenticated employees can access)
router.post('/', authenticate, upload.single('document'), createLeaveRequest);
router.get('/my-requests', authenticate, getMyLeaveRequests);
router.get('/download/:id', authenticate, downloadDocument);
router.get('/:id', authenticate, getLeaveRequestById);

// ✅ New Leave Checking Routes (for timesheet integration)
router.get('/check-date/:date', authenticate, checkLeaveForDate);
router.get('/week/:weekStartDate', authenticate, getApprovedLeavesForWeek);
router.get('/calendar/events', authenticate, getLeaveCalendar);

// ==================== ✅ ADMIN/MANAGER ROUTES ====================

// ✅ Get all leave requests (admin/manager only)
router.get('/', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, getAllLeaveRequests);

// ✅ Get leave statistics (admin/manager only)
router.get('/stats/statistics', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, getLeaveStatistics);

// ✅ Approve leave request (admin/manager only)
router.patch('/:id/approve', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, approveLeaveRequest);

// ✅ Reject leave request (admin/manager only)
router.patch('/:id/reject', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, rejectLeaveRequest);

// ==================== ✅ LEAVE BALANCE ROUTES ====================

// ✅ Get employee's own leave balance (employees can view their own)
router.get('/balance/my', authenticate, getEmployeeLeaveBalance);

// ✅ Get all leave balances (admin/manager only)
router.get('/balance/all', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, getAllLeaveBalances);

// ✅ Update specific leave balance for an employee (admin/manager only)
router.put('/balance/:employeeId', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, updateLeaveBalance);

// ✅ Update employee's leave status (probation/active/inactive) (admin/manager only)
router.put('/balance/:employeeId/status', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, updateEmployeeLeaveStatus);

// ✅ Run monthly PL accrual for all active employees (admin/manager only)
router.post('/balance/monthly-accrual', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, runMonthlyAccrual);

export default router;