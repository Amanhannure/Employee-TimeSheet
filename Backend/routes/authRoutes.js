import express from 'express';
import {
  registerAdmin,
  registerUser,
  bulkRegister,
  login,
  loginAdmin,
  getProfile,
  updateProfile,
  changePassword,
  initiatePasswordReset,
  verifySecurityAnswer,
  sendEmailCode,
  verifyEmailCode,
  resetPassword,
  setupSecurityQuestion,
  checkSecuritySetup,
  getUsers,
  updateUserStatus,
  updateUserRole
} from '../controllers/authController.js';
import { authenticate, authorizeAdmin, authorizeManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/login-admin', loginAdmin);

// Password reset routes (public) - UPDATED TO MATCH FRONTEND
router.post('/password/forgot', initiatePasswordReset); // Changed from /forgot-password
router.post('/password/verify-security', verifySecurityAnswer); // Changed from /verify-security-answer
router.post('/password/send-code', sendEmailCode); // Changed from /send-email-code
router.post('/password/verify-code', verifyEmailCode); // Changed from /verify-email-code
router.post('/password/reset', resetPassword); // Changed from /reset-password

// Protected routes (require authentication)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password/change', authenticate, changePassword); // Changed from /change-password
router.post('/security/setup', authenticate, setupSecurityQuestion); // Changed from /setup-security-question
router.get('/security/check', authenticate, checkSecuritySetup); // Changed from /check-security-setup

// Admin only routes
router.post('/admin/register', authenticate, authorizeAdmin, registerUser); // Changed from /register
router.post('/admin/bulk-register', authenticate, authorizeAdmin, bulkRegister); // Changed from /bulk-register
router.get('/admin/users', authenticate, authorizeAdmin, getUsers); // Changed from /users
router.put('/admin/users/:userId/status', authenticate, authorizeAdmin, updateUserStatus);
router.put('/admin/users/:userId/role', authenticate, authorizeAdmin, updateUserRole);

// Manager and Admin routes (extended permissions)
router.get('/team/users', authenticate, authorizeManager, getUsers); // Changed from /team-users

export default router;