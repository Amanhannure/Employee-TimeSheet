import express from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  downloadDocument,
  getLeaveStatistics,
  getLeaveRequestById,
  // ✅ ADDED: Leave Balance Functions
  getAllLeaveBalances,
  getEmployeeLeaveBalance,
  updateLeaveBalance,
  updateEmployeeLeaveStatus,
  runMonthlyAccrual
} from '../controllers/leaveController.js';
import { authenticate, authorizeAdmin, authorizeManager } from '../middleware/authMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

// ==================== LEAVE REQUEST ROUTES ====================

// Employee routes
router.post('/', authenticate, upload.single('document'), createLeaveRequest);
router.post('/submit', authenticate, upload.single('document'), createLeaveRequest); // Keep only one of these
router.get('/my-requests', authenticate, getMyLeaveRequests);
router.get('/download/:id', authenticate, downloadDocument);
router.get('/:id', authenticate, getLeaveRequestById);

// Admin/Manager routes - Combine both authorizations
router.get('/', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, getAllLeaveRequests);

router.get('/stats/statistics', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, getLeaveStatistics);

router.patch('/:id/approve', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, approveLeaveRequest);

router.patch('/:id/reject', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, rejectLeaveRequest);

// ==================== ✅ LEAVE BALANCE ROUTES ====================

// Get employee's own leave balance (for employees to view their own balance)
router.get('/balance/my', authenticate, getEmployeeLeaveBalance);

// Admin/Manager routes for managing all leave balances
router.get('/balance/all', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, getAllLeaveBalances);

// Update specific leave balance for an employee
router.put('/balance/:employeeId', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, updateLeaveBalance);

// Update employee's leave status (probation/active/inactive)
router.put('/balance/:employeeId/status', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, updateEmployeeLeaveStatus);

// Run monthly PL accrual for all active employees
router.post('/balance/monthly-accrual', authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied' });
}, runMonthlyAccrual);


export default router;