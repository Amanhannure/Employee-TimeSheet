import express from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  downloadDocument
} from '../controllers/leaveController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

// Employee routes
router.post('/', authenticate, upload.single('document'), createLeaveRequest);
router.get('/my-requests', authenticate, getMyLeaveRequests);
router.get('/download/:id', authenticate, downloadDocument);

// Admin routes
router.get('/', authenticate, authorizeAdmin, getAllLeaveRequests);
router.patch('/:id/approve', authenticate, authorizeAdmin, approveLeaveRequest);
router.patch('/:id/reject', authenticate, authorizeAdmin, rejectLeaveRequest);

export default router;