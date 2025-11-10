import express from 'express';
import { getHoursTracking, getEmployeeReport } from '../controllers/reportsController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/hours-tracking', authenticate, getHoursTracking);
router.get('/employee-report', authenticate, getEmployeeReport);

export default router;