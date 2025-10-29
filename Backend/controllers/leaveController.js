import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js';

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
      status: 'pending'
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

export const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request already processed' });
    }

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();

    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Leave request approved successfully',
      leaveRequest: populatedRequest
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ message: 'Server error' });
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