import express from 'express';
import { 
  registerAdmin, 
  login, 
  loginAdmin, 
  getProfile 
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/login-admin', loginAdmin);

// Protected routes
router.get('/profile', authenticate, getProfile);

export default router;