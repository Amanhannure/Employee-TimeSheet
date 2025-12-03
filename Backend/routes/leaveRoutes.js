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
router.get('/my-requests', authenticate, getMyLeaveRequests);
router.get('/download/:id', authenticate, downloadDocument);
router.get('/:id', authenticate, getLeaveRequestById);

// Admin/Manager routes
router.get('/', authenticate, authorizeManager, getAllLeaveRequests);
router.get('/stats/statistics', authenticate, authorizeManager, getLeaveStatistics);
router.patch('/:id/approve', authenticate, authorizeManager, approveLeaveRequest);
router.patch('/:id/reject', authenticate, authorizeManager, rejectLeaveRequest);

// ==================== ✅ LEAVE BALANCE ROUTES ====================

// Get employee's own leave balance (for employees to view their own balance)
router.get('/balance/my', authenticate, getEmployeeLeaveBalance);

// Admin/Manager routes for managing all leave balances
router.get('/balance/all', authenticate, authorizeManager, getAllLeaveBalances);

// Update specific leave balance for an employee
router.put('/balance/:employeeId', authenticate, authorizeManager, updateLeaveBalance);

// Update employee's leave status (probation/active/inactive)
router.put('/balance/:employeeId/status', authenticate, authorizeManager, updateEmployeeLeaveStatus);

// Run monthly PL accrual for all active employees
router.post('/balance/monthly-accrual', authenticate, authorizeManager, runMonthlyAccrual);

export default router;