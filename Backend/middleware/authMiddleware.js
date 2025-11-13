import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import User from '../models/User.js';

// Middleware to verify JWT token
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Fetch fresh user data from database
    const user = await User.findById(decoded.id)
      .select('-passwordHash -securityAnswerHash -resetToken -emailVerificationCode');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is resigned
    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Account is no longer active' });
    }

    // Check if user is inactive
    if (user.status === 'inactive') {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    req.user = {
      id: user._id,
      username: user.username,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      status: user.status,
      hasSecurityQuestion: user.hasSecurityQuestion(),
      securitySetupCompleted: user.securitySetupCompleted
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else {
      return res.status(401).json({ message: 'Token verification failed' });
    }
  }
};

// Admin authorization middleware
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// ✅ ADDED: Project Manager authorization middleware (includes admin)
export const authorizeProjectManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const allowedRoles = ['admin', 'project_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Access denied. Project Manager or Admin privileges required.' 
    });
  }
  next();
};

// Manager authorization middleware (includes admin and project_manager)
export const authorizeManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const allowedRoles = ['admin', 'manager', 'project_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Access denied. Manager, Project Manager or Admin privileges required.' 
    });
  }
  next();
};

// Department-based authorization for managers
export const authorizeDepartmentManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Admin can access all departments
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Managers can only manage their own department
  if (req.user.role === 'manager') {
    const targetDepartment = req.params.department || req.body.department;
    
    if (targetDepartment && targetDepartment !== req.user.department) {
      return res.status(403).json({ 
        message: 'Access denied. You can only manage users in your own department.' 
      });
    }
  }
  
  next();
};

// Self or higher role authorization (user can access their own data or admin/manager can access)
export const authorizeSelfOrHigher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const requestedUserId = req.params.userId || req.body.userId;
  
  // Admin can access any user data
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Managers and Project Managers can access any user data in their department
  if (req.user.role === 'manager' || req.user.role === 'project_manager') {
    // This would require additional department checking logic
    return next();
  }
  
  // Regular employees can only access their own data
  if (requestedUserId && requestedUserId !== req.user.id) {
    return res.status(403).json({ 
      message: 'Access denied. You can only access your own data.' 
    });
  }
  
  next();
};

// Check if user has security setup completed
export const requireSecuritySetup = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!req.user.securitySetupCompleted) {
    return res.status(403).json({ 
      message: 'Security setup required. Please set up your security question first.',
      requiresSecuritySetup: true
    });
  }
  
  next();
};

// Check if user is active (not resigned or inactive)
export const requireActiveStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const inactiveStatuses = ['inactive', 'resigned'];
  if (inactiveStatuses.includes(req.user.status)) {
    return res.status(403).json({ 
      message: `Account is ${req.user.status}. Access denied.` 
    });
  }
  
  next();
};