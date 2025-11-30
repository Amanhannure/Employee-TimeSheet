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
  getLeaveBalance,
  updateEmployeeStatus,
  updateLeaveBalance,
  getAllLeaveBalances
} from '../controllers/leaveController.js';
import { authenticate, authorizeAdmin, authorizeManager } from '../middleware/authMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

// Employee routes
router.post('/', authenticate, upload.single('document'), createLeaveRequest);
router.get('/my-requests', authenticate, getMyLeaveRequests);
router.get('/download/:id', authenticate, downloadDocument);
router.get('/:id', authenticate, getLeaveRequestById);

// Leave balance routes
router.get('/balance/my-balance', authenticate, getLeaveBalance);
router.get('/balance/all', authenticate, authorizeManager, getAllLeaveBalances);
router.put('/balance/update', authenticate, authorizeAdmin, updateLeaveBalance);
router.put('/employee/status', authenticate, authorizeAdmin, updateEmployeeStatus);

// Admin/Manager routes
router.get('/', authenticate, authorizeManager, getAllLeaveRequests);
router.get('/stats/statistics', authenticate, authorizeManager, getLeaveStatistics);
router.patch('/:id/approve', authenticate, authorizeManager, approveLeaveRequest);
router.patch('/:id/reject', authenticate, authorizeManager, rejectLeaveRequest);

export default router;