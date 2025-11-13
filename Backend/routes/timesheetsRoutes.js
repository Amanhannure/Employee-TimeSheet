import express from 'express';
import {
  submitTimesheet,
  getMyTimesheets,
  getAllTimesheets,
  getTimesheetById,
  approveTimesheet,
  rejectTimesheet,
  exportTimesheetToCSV,
  exportMultipleTimesheetsToCSV,
  archiveOldTimesheets,
  healthCheck
} from '../controllers/timesheetController.js';
import { authenticate, authorizeAdmin, authorizeManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// Health check endpoint (public)
router.get('/health', healthCheck);

// Employee routes
router.post('/submit', authenticate, submitTimesheet);
router.get('/my-timesheets', authenticate, getMyTimesheets);
router.get('/export/:id', authenticate, exportTimesheetToCSV);
router.get('/:id', authenticate, getTimesheetById);

// Admin/Manager routes
router.get('/', authenticate, authorizeManager, getAllTimesheets);
router.patch('/:id/approve', authenticate, authorizeManager, approveTimesheet);
router.patch('/:id/reject', authenticate, authorizeManager, rejectTimesheet);
router.post('/export-multiple', authenticate, authorizeManager, exportMultipleTimesheetsToCSV);
router.post('/archive-old', authenticate, authorizeAdmin, archiveOldTimesheets);

export default router;