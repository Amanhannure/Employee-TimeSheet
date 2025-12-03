import express from 'express';
import { getHoursTracking, getEmployeeReport, exportEmployeeReportToExcel } from '../controllers/reportsController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/hours-tracking', authenticate, getHoursTracking);
router.get('/employee-report', authenticate, getEmployeeReport);
router.post('/export-employee-excel', authenticate, exportEmployeeReportToExcel);

export default router;