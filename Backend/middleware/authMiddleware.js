import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import User from '../models/User.js';

// ✅ ENHANCED: Authentication middleware with comprehensive error handling
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      message: 'Access denied. No token provided.',
      code: 'NO_TOKEN',
      requiresLogin: true
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'Access denied. Invalid token format.',
      code: 'INVALID_TOKEN_FORMAT',
      requiresLogin: true
    });
  }

  try {
    // Verify token with better error handling
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ✅ ADDED: Comprehensive token payload validation
    if (!decoded.id || !decoded.role) {
      console.warn('Invalid token payload:', decoded);
      return res.status(401).json({ 
        message: 'Invalid token payload',
        code: 'INVALID_TOKEN_PAYLOAD',
        requiresLogin: true
      });
    }

    // ✅ IMPROVED: Fetch fresh user data with better field selection
    const user = await User.findById(decoded.id)
      .select('-passwordHash -securityAnswerHash -resetToken -emailVerificationCode -loginAttempts -lockUntil')
      .lean();
    
    if (!user) {
      console.warn('User not found for token:', decoded.id);
      return res.status(401).json({ 
        message: 'User account not found',
        code: 'USER_NOT_FOUND',
        requiresLogin: true
      });
    }

    // ✅ ENHANCED: User status checking with specific messages
    if (user.status === 'resigned') {
      return res.status(401).json({ 
        message: 'Account is no longer active. Please contact administrator.',
        code: 'ACCOUNT_RESIGNED',
        requiresLogin: true
      });
    }

    if (user.status === 'inactive') {
      return res.status(401).json({ 
        message: 'Account is inactive. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE',
        requiresLogin: true
      });
    }

    if (user.status === 'suspended') {
      return res.status(401).json({ 
        message: 'Account is temporarily suspended. Please contact administrator.',
        code: 'ACCOUNT_SUSPENDED',
        requiresLogin: true
      });
    }

    // ✅ ADDED: Check if user is locked due to failed login attempts
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(401).json({ 
        message: 'Account is temporarily locked due to multiple failed login attempts.',
        code: 'ACCOUNT_LOCKED',
        requiresLogin: true
      });
    }

    // Build user object for request
    req.user = {
      id: user._id.toString(),
      username: user.username,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      status: user.status,
      hasSecurityQuestion: user.securityQuestion && user.securityAnswerHash,
      securitySetupCompleted: user.securitySetupCompleted,
      // ✅ ADDED: Additional useful fields
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      mustChangePassword: user.mustChangePassword,
      // ✅ ADDED: Permissions flags based on role
      isAdmin: user.role === 'admin',
      isManager: user.role === 'manager',
      isProjectManager: user.role === 'project_manager',
      isEmployee: user.role === 'employee'
    };
    
    console.log(`✅ Authenticated user: ${user.employeeId} (${user.role})`);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    // ✅ IMPROVED: Specific error handling for different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED',
        requiresLogin: true
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid session. Please login again.',
        code: 'INVALID_TOKEN',
        requiresLogin: true
      });
    } else if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        message: 'Token not yet active.',
        code: 'TOKEN_NOT_ACTIVE',
        requiresLogin: true
      });
    } else {
      return res.status(500).json({ 
        message: 'Authentication failed.',
        code: 'AUTHENTICATION_FAILED',
        requiresLogin: true
      });
    }
  }
};

// ✅ ENHANCED: Admin authorization middleware
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  if (req.user.role !== 'admin') {
    console.warn(`Admin access denied for user: ${req.user.employeeId} (${req.user.role})`);
    return res.status(403).json({ 
      message: 'Access denied. Administrator privileges required.',
      code: 'ADMIN_ACCESS_REQUIRED',
      userRole: req.user.role,
      requiredRole: 'admin'
    });
  }
  
  console.log(`✅ Admin access granted: ${req.user.employeeId}`);
  next();
};

// ✅ ENHANCED: Project Manager authorization middleware (includes admin)
export const authorizeProjectManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  const allowedRoles = ['admin', 'project_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    console.warn(`Project Manager access denied for user: ${req.user.employeeId} (${req.user.role})`);
    return res.status(403).json({ 
      message: 'Access denied. Project Manager or Administrator privileges required.',
      code: 'PROJECT_MANAGER_ACCESS_REQUIRED',
      userRole: req.user.role,
      requiredRoles: allowedRoles
    });
  }
  
  console.log(`✅ Project Manager access granted: ${req.user.employeeId} (${req.user.role})`);
  next();
};

// ✅ ENHANCED: Manager authorization middleware (includes admin and project_manager)
export const authorizeManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  const allowedRoles = ['admin', 'manager', 'project_manager'];
  if (!allowedRoles.includes(req.user.role)) {
    console.warn(`Manager access denied for user: ${req.user.employeeId} (${req.user.role})`);
    return res.status(403).json({ 
      message: 'Access denied. Manager, Project Manager or Administrator privileges required.',
      code: 'MANAGER_ACCESS_REQUIRED',
      userRole: req.user.role,
      requiredRoles: allowedRoles
    });
  }
  
  console.log(`✅ Manager access granted: ${req.user.employeeId} (${req.user.role})`);
  next();
};

// ✅ ENHANCED: Department-based authorization for managers
export const authorizeDepartmentManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  // Admin can access all departments
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Managers and Project Managers can only manage their own department
  if (req.user.role === 'manager' || req.user.role === 'project_manager') {
    const targetDepartment = req.params.department || req.body.department || req.query.department;
    
    if (targetDepartment && targetDepartment !== req.user.department) {
      console.warn(`Department access denied: ${req.user.employeeId} tried to access ${targetDepartment} but belongs to ${req.user.department}`);
      return res.status(403).json({ 
        message: 'Access denied. You can only manage resources in your own department.',
        code: 'DEPARTMENT_ACCESS_DENIED',
        userDepartment: req.user.department,
        targetDepartment: targetDepartment
      });
    }
  }
  
  next();
};

// ✅ ENHANCED: Self or higher role authorization
export const authorizeSelfOrHigher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  const requestedUserId = req.params.userId || req.body.userId || req.query.userId;
  
  // Admin can access any user data
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Managers and Project Managers can access any user data in their department
  if (req.user.role === 'manager' || req.user.role === 'project_manager') {
    // Additional department checking would be implemented here
    return next();
  }
  
  // Regular employees can only access their own data
  if (requestedUserId && requestedUserId !== req.user.id) {
    console.warn(`Self-access violation: ${req.user.employeeId} tried to access user ${requestedUserId}`);
    return res.status(403).json({ 
      message: 'Access denied. You can only access your own data.',
      code: 'SELF_ACCESS_ONLY',
      authorizedUserId: req.user.id,
      requestedUserId: requestedUserId
    });
  }
  
  next();
};

// ✅ ENHANCED: Check if user has security setup completed
export const requireSecuritySetup = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  if (!req.user.securitySetupCompleted) {
    return res.status(403).json({ 
      message: 'Security setup required. Please set up your security question first.',
      code: 'SECURITY_SETUP_REQUIRED',
      requiresSecuritySetup: true
    });
  }
  
  next();
};

// ✅ ENHANCED: Check if user is active (not resigned or inactive)
export const requireActiveStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  const inactiveStatuses = ['inactive', 'resigned', 'suspended'];
  if (inactiveStatuses.includes(req.user.status)) {
    return res.status(403).json({ 
      message: `Account is ${req.user.status}. Access denied.`,
      code: 'ACCOUNT_INACTIVE',
      userStatus: req.user.status
    });
  }
  
  next();
};

// ✅ ADDED: Role-based access control with custom roles
export const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles];
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`Role access denied: ${req.user.employeeId} (${req.user.role}) required ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'ROLE_ACCESS_DENIED',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }
    
    next();
  };
};

// ✅ ADDED: Permission-based authorization
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    // Define permissions based on roles
    const rolePermissions = {
      admin: ['*'], // Admin has all permissions
      project_manager: [
        'manage_projects', 'view_timesheets', 'approve_timesheets', 'view_reports'
      ],
      manager: [
        'view_timesheets', 'approve_timesheets', 'view_reports', 'manage_team'
      ],
      employee: [
        'submit_timesheets', 'view_own_timesheets', 'view_own_projects'
      ]
    };
    
    const userPermissions = rolePermissions[req.user.role] || [];
    
    // Check if user has the required permission or wildcard access
    if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
      console.warn(`Permission denied: ${req.user.employeeId} lacks permission '${permission}'`);
      return res.status(403).json({ 
        message: `Access denied. Required permission: ${permission}`,
        code: 'PERMISSION_DENIED',
        requiredPermission: permission,
        userPermissions: userPermissions
      });
    }
    
    next();
  };
};

// ✅ ADDED: Optional authentication middleware
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.id || !decoded.role) {
      return next(); // Continue without user
    }

    const user = await User.findById(decoded.id)
      .select('-passwordHash -securityAnswerHash -resetToken -emailVerificationCode')
      .lean();
    
    if (!user || ['inactive', 'resigned', 'suspended'].includes(user.status)) {
      return next(); // Continue without user
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      status: user.status,
      isAdmin: user.role === 'admin',
      isManager: user.role === 'manager',
      isProjectManager: user.role === 'project_manager',
      isEmployee: user.role === 'employee'
    };
    
    console.log(`✅ Optional auth - user loaded: ${req.user.employeeId}`);
  } catch (error) {
    // For optional auth, we ignore token errors and continue without user
    console.warn('Optional auth token error (ignored):', error.message);
  }
  
  next();
};

// ✅ ADDED: Audit logging middleware
export const auditLog = (action) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.json to capture response data
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      // Log the audit trail
      console.log(`📊 AUDIT: ${action}`, {
        timestamp: new Date().toISOString(),
        user: req.user ? req.user.employeeId : 'anonymous',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      originalJson.call(this, data);
    };
    
    next();
  };
};

export default {
  authenticate,
  authorizeAdmin,
  authorizeProjectManager,
  authorizeManager,
  authorizeDepartmentManager,
  authorizeSelfOrHigher,
  requireSecuritySetup,
  requireActiveStatus,
  requireRoles,
  requirePermission,
  optionalAuth,
  auditLog
};