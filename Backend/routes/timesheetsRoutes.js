import express from 'express';
import {
  submitTimesheet,
  getMyTimesheets,
  getAllTimesheets,
  approveTimesheet,
  rejectTimesheet,
  exportTimesheetToCSV,
  exportMultipleTimesheetsToCSV,
  archiveOldTimesheets
} from '../controllers/timesheetController.js';
import { authenticate, authorizeAdmin, authorizeManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// Employee routes
router.post('/submit', authenticate, submitTimesheet);
router.get('/my-timesheets', authenticate, getMyTimesheets);
router.get('/export/:id', authenticate, exportTimesheetToCSV);

// Admin/Manager routes
router.get('/', authenticate, authorizeManager, getAllTimesheets);
router.patch('/:id/approve', authenticate, authorizeManager, approveTimesheet);
router.patch('/:id/reject', authenticate, authorizeManager, rejectTimesheet);
router.post('/export-multiple', authenticate, authorizeManager, exportMultipleTimesheetsToCSV);
router.post('/archive-old', authenticate, authorizeAdmin, archiveOldTimesheets);

export default router;