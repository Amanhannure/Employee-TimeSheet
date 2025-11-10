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
router.post('/forgot-password', initiatePasswordReset);
router.post('/verify-security-answer', verifySecurityAnswer);
router.post('/send-email-code', sendEmailCode);
router.post('/verify-email-code', verifyEmailCode);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/setup-security-question', authenticate, setupSecurityQuestion);
router.get('/check-security-setup', authenticate, checkSecuritySetup);

// Admin only routes
router.post('/register', authenticate, authorizeAdmin, registerUser);
router.post('/bulk-register', authenticate, authorizeAdmin, bulkRegister);
router.get('/users', authenticate, authorizeAdmin, getUsers);
router.put('/users/:userId/status', authenticate, authorizeAdmin, updateUserStatus);
router.put('/users/:userId/role', authenticate, authorizeAdmin, updateUserRole);

// Manager and Admin routes (extended permissions)
router.get('/team-users', authenticate, authorizeManager, getUsers); // Managers can view their team

export default router;