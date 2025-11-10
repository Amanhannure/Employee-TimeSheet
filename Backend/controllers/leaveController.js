import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js';

// ✅ ADDED: Get user leave balance
export const getLeaveBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('leaveBalance maxLeaves firstName lastName employeeId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      casualLeave: {
        available: user.leaveBalance.casualLeave,
        max: user.maxLeaves.casualLeave,
        used: user.maxLeaves.casualLeave - user.leaveBalance.casualLeave
      },
      sickLeave: {
        available: user.leaveBalance.sickLeave,
        max: user.maxLeaves.sickLeave,
        used: user.maxLeaves.sickLeave - user.leaveBalance.sickLeave
      },
      personalLeave: {
        available: user.leaveBalance.personalLeave,
        max: user.maxLeaves.personalLeave,
        used: user.maxLeaves.personalLeave - user.leaveBalance.personalLeave
      }
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason } = req.body;
    
    if (!startDate || !endDate || !leaveType || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // ✅ ADDED: Check leave balance before creating request
    const user = await User.findById(req.user.id);
    const totalDays = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
    
    if (user.leaveBalance[leaveType] < totalDays) {
      return res.status(400).json({ 
        message: `Insufficient ${leaveType} leave balance. Available: ${user.leaveBalance[leaveType]} days, Required: ${totalDays} days` 
      });
    }

    const supportingDocument = req.file ? {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    } : null;

    const leaveRequest = new LeaveRequest({
      employee: req.user.id,
      startDate: start,
      endDate: end,
      leaveType,
      reason,
      supportingDocument,
      status: 'pending',
      totalDays
    });

    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department');

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: populatedRequest
    });

  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Backend/controllers/leaveController.js - UPDATE approveLeaveRequest function

export const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 DEBUG: Approving leave request ID:', id);
    
    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      console.log('❌ ERROR: Leave request not found for ID:', id);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    console.log('🔍 DEBUG: Found leave request:', {
      id: leaveRequest._id,
      employee: leaveRequest.employee,
      status: leaveRequest.status,
      leaveType: leaveRequest.leaveType,
      totalDays: leaveRequest.totalDays
    });

    if (leaveRequest.status !== 'pending') {
      console.log('❌ ERROR: Leave request already processed, status:', leaveRequest.status);
      return res.status(400).json({ message: 'Leave request already processed' });
    }

    // ✅ FIXED: Add better user lookup with error handling
    const user = await User.findById(leaveRequest.employee);
    console.log('🔍 DEBUG: Looking up user ID:', leaveRequest.employee);
    
    if (!user) {
      console.log('❌ ERROR: User not found for ID:', leaveRequest.employee);
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('🔍 DEBUG: Found user:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      currentBalance: user.leaveBalance[leaveRequest.leaveType]
    });

    // ✅ FIXED: Check if deductLeaves method exists
    if (!user.deductLeaves) {
      console.log('❌ ERROR: deductLeaves method not found on user object');
      return res.status(500).json({ message: 'User method error' });
    }

    if (!user.deductLeaves(leaveRequest.leaveType, leaveRequest.totalDays)) {
      console.log('❌ ERROR: Insufficient leave balance for approval');
      return res.status(400).json({ 
        message: `Insufficient ${leaveRequest.leaveType} leave balance for approval` 
      });
    }

    await user.save();
    console.log('✅ DEBUG: Leaves deducted successfully. New balance:', user.leaveBalance[leaveRequest.leaveType]);

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.leavesDeducted = true;

    await leaveRequest.save();
    console.log('✅ DEBUG: Leave request approved successfully');

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Leave request approved successfully',
      leaveRequest: populatedRequest
    });
  } catch (error) {
    console.error('❌ Approve leave request error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

export const rejectLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request already processed' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    leaveRequest.status = 'rejected';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.rejectionReason = rejectionReason;

    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Leave request rejected successfully',
      leaveRequest: populatedRequest
    });
  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ employee: req.user.id })
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employee } = req.query;
    
    let filter = {};
    if (status && status !== 'all') filter.status = status;
    if (employee) {
      const users = await User.find({
        $or: [
          { firstName: { $regex: employee, $options: 'i' } },
          { lastName: { $regex: employee, $options: 'i' } },
          { employeeId: { $regex: employee, $options: 'i' } }
        ]
      });
      filter.employee = { $in: users.map(u => u._id) };
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get all leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    
    if (!leaveRequest || !leaveRequest.supportingDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to download
    const canDownload = req.user.role === 'admin' || 
                       req.user.role === 'manager' ||
                       leaveRequest.employee.toString() === req.user.id;

    if (!canDownload) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = leaveRequest.supportingDocument.path;
    
    // Set proper headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${leaveRequest.supportingDocument.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    res.download(filePath, leaveRequest.supportingDocument.originalName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Get leave request by ID
export const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json(leaveRequest);
  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Get leave statistics
export const getLeaveStatistics = async (req, res) => {
  try {
    const total = await LeaveRequest.countDocuments();
    const pending = await LeaveRequest.countDocuments({ status: 'pending' });
    const approved = await LeaveRequest.countDocuments({ status: 'approved' });
    const rejected = await LeaveRequest.countDocuments({ status: 'rejected' });

    res.json({
      total,
      pending,
      approved,
      rejected
    });
  } catch (error) {
    console.error('Get leave statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};