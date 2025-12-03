import LateSubmissionPermission from '../models/LateSubmissionPermission.js';
import User from '../models/User.js';

// Check if employee has permission for a specific date
export const checkPermission = async (req, res) => {
  try {
    const { employeeId, date } = req.query;
    
    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and date are required'
      });
    }
    
    const queryDate = new Date(date);
    
    // Find active permission that covers this date
    const permission = await LateSubmissionPermission.findOne({
      employeeId,
      status: 'active',
      allowedWeekStart: { $lte: queryDate },
      allowedWeekEnd: { $gte: queryDate },
      expiresAt: { $gt: new Date() }
    });
    
    if (permission) {
      return res.json({
        success: true,
        allowed: true,
        permission: {
          id: permission._id,
          allowedWeekStart: permission.allowedWeekStart,
          allowedWeekEnd: permission.allowedWeekEnd,
          expiresAt: permission.expiresAt,
          reason: permission.reason
        }
      });
    }
    
    res.json({
      success: true,
      allowed: false,
      message: 'No permission found for this date'
    });
    
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking permission'
    });
  }
};

// Grant new permission (admin only)
export const grantPermission = async (req, res) => {
  try {
    const { 
      employeeId, 
      employeeCode, 
      employeeName, 
      allowedWeekStart, 
      allowedWeekEnd, 
      expiresAt, 
      reason 
    } = req.body;
    
    // Validation
    if (!employeeId || !employeeCode || !employeeName || !allowedWeekStart || !allowedWeekEnd) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Convert dates
    const startDate = new Date(allowedWeekStart);
    const endDate = new Date(allowedWeekEnd);
    const expiryDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Validate dates
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Week start date must be before week end date'
      });
    }
    
    if (expiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be in the future'
      });
    }
    
    // Check for overlapping permissions
    const existingPermission = await LateSubmissionPermission.findOne({
      employeeId,
      status: 'active',
      $or: [
        {
          allowedWeekStart: { $lte: endDate },
          allowedWeekEnd: { $gte: startDate }
        }
      ]
    });
    
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Overlapping permission already exists for this employee',
        existingPermission
      });
    }
    
    // Create new permission
    const permission = new LateSubmissionPermission({
      employeeId,
      employeeCode,
      employeeName,
      allowedWeekStart: startDate,
      allowedWeekEnd: endDate,
      expiresAt: expiryDate,
      grantedBy: req.user.id,
      grantedByEmail: req.user.email,
      reason: reason || ''
    });
    
    await permission.save();
    
    res.status(201).json({
      success: true,
      message: 'Permission granted successfully',
      permission
    });
    
  } catch (error) {
    console.error('Error granting permission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error granting permission'
    });
  }
};

// Get all permissions (admin only)
export const getAllPermissions = async (req, res) => {
  try {
    const { status, employeeCode, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    // Apply filters
    if (status) query.status = status;
    if (employeeCode) query.employeeCode = employeeCode;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get permissions with pagination
    const permissions = await LateSubmissionPermission.find(query)
      .sort({ grantedAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Get total count
    const total = await LateSubmissionPermission.countDocuments(query);
    
    res.json({
      success: true,
      permissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching permissions'
    });
  }
};

// Get permissions for a specific employee
export const getEmployeePermissions = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const permissions = await LateSubmissionPermission.find({
      employeeId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).sort({ allowedWeekStart: 1 });
    
    res.json({
      success: true,
      permissions
    });
    
  } catch (error) {
    console.error('Error fetching employee permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching permissions'
    });
  }
};

// Revoke permission (admin only)
export const revokePermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    
    const permission = await LateSubmissionPermission.findById(permissionId);
    
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }
    
    permission.status = 'revoked';
    await permission.save();
    
    res.json({
      success: true,
      message: 'Permission revoked successfully'
    });
    
  } catch (error) {
    console.error('Error revoking permission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error revoking permission'
    });
  }
};

// Mark permission as used (when timesheet is submitted)
export const markAsUsed = async (req, res) => {
  try {
    const { permissionId } = req.params;
    
    const permission = await LateSubmissionPermission.findById(permissionId);
    
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }
    
    if (permission.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Permission is not active'
      });
    }
    
    permission.timesheetSubmitted = true;
    await permission.save();
    
    res.json({
      success: true,
      message: 'Permission marked as used'
    });
    
  } catch (error) {
    console.error('Error marking permission as used:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating permission'
    });
  }
};

// Get dashboard stats (admin)
export const getPermissionStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get active permissions count
    const activeCount = await LateSubmissionPermission.countDocuments({
      status: 'active',
      expiresAt: { $gt: now }
    });
    
    // Get expiring soon (within 2 days)
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const expiringSoonCount = await LateSubmissionPermission.countDocuments({
      status: 'active',
      expiresAt: { $gt: now, $lt: twoDaysFromNow }
    });
    
    // Get granted in last 30 days
    const recentCount = await LateSubmissionPermission.countDocuments({
      grantedAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      stats: {
        activePermissions: activeCount,
        expiringSoon: expiringSoonCount,
        recentlyGranted: recentCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching permission stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats'
    });
  }
};

// Export all functions as default object (for backward compatibility)
export default {
  checkPermission,
  grantPermission,
  getAllPermissions,
  getEmployeePermissions,
  revokePermission,
  markAsUsed,
  getPermissionStats
};