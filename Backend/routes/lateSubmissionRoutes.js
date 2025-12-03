import express from 'express';
import lateSubmissionController from '../controllers/lateSubmissionController.js';
import { authenticate as protect, requireRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (for employee dashboard)
router.get('/check', lateSubmissionController.checkPermission);
router.get('/employee/:employeeId', protect, lateSubmissionController.getEmployeePermissions);

// Admin/Manager routes
router.post('/grant', protect, requireRoles(['admin', 'manager']), lateSubmissionController.grantPermission);
router.get('/admin/all', protect, requireRoles(['admin', 'manager']), lateSubmissionController.getAllPermissions);
router.get('/admin/stats', protect, requireRoles(['admin', 'manager']), lateSubmissionController.getPermissionStats);
router.put('/admin/revoke/:permissionId', protect, requireRoles(['admin', 'manager']), lateSubmissionController.revokePermission);
router.put('/mark-used/:permissionId', protect, lateSubmissionController.markAsUsed);

export default router;