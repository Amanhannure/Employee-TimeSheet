import { LeaveRequest, LeaveBalance } from '../models/LeaveRequest.js';
import User from '../models/User.js';
import cron from 'node-cron';

// ✅ IMPLEMENTED: Cron job for automatic PL updates on 5th of each month
cron.schedule('0 0 5 * *', async () => {
  try {
    console.log('🔄 Running automatic PL update for all active employees...');
    
    const activeBalances = await LeaveBalance.find({ employeeStatus: 'active' });
    
    for (const balance of activeBalances) {
      if (balance.updateMonthlyPL()) {
        await balance.save();
        console.log(`✅ Updated PL for employee: ${balance.employee}`);
      }
    }
    
    console.log('✅ Automatic PL update completed');
  } catch (error) {
    console.error('❌ Automatic PL update error:', error);
  }
});

// ✅ ADDED: Get leave balance
export const getLeaveBalance = async (req, res) => {
  try {
    let leaveBalance = await LeaveBalance.findOne({ employee: req.user.id })
      .populate('employee', 'firstName lastName employeeId department joiningDate status');

    if (!leaveBalance) {
      // Create new leave balance
      const user = await User.findById(req.user.id);
      leaveBalance = new LeaveBalance({
        employee: req.user.id,
        joiningDate: user.joiningDate || new Date(),
        employeeStatus: user.status || 'probation',
        sickLeave: 8, // ✅ Excel: 8 SL for 12 months initially
        privilegeLeave: 0
      });

      await leaveBalance.save();
    } else {
      // ✅ IMPLEMENTED: Update monthly PL if needed (5th of month)
      if (leaveBalance.updateMonthlyPL()) {
        await leaveBalance.save();
      }
    }

    res.json(leaveBalance);
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Update employee status with PL calculation (Excel requirement)
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { employeeId, status } = req.body;

    if (!employeeId || !status) {
      return res.status(400).json({ message: 'Employee ID and status are required' });
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      employeeId,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update leave balance
    let leaveBalance = await LeaveBalance.findOne({ employee: employeeId });

    if (!leaveBalance) {
      leaveBalance = new LeaveBalance({
        employee: employeeId,
        joiningDate: user.joiningDate || new Date(),
        employeeStatus: status,
        sickLeave: 8
      });
    } else {
      leaveBalance.employeeStatus = status;
    }

    // ✅ IMPLEMENTED: Calculate PL when status changes to active (1.5 × probation months)
    if (status === 'active') {
      leaveBalance.calculatePLOnActivation();
      
      // Get probation months for response
      const probationMonths = leaveBalance.getProbationMonthsCompleted();
      const calculatedPL = probationMonths * leaveBalance.monthlyPLRate;
      
      await leaveBalance.save();

      res.json({
        message: `Employee status updated to active. PL calculated: ${calculatedPL} (${probationMonths} months × 1.5)`,
        leaveBalance,
        probationMonths,
        calculatedPL
      });
    } else {
      // ✅ IMPLEMENTED: PL = 0 during probation
      leaveBalance.privilegeLeave = 0;
      await leaveBalance.save();

      res.json({
        message: 'Employee status updated to probation. PL set to 0.',
        leaveBalance
      });
    }

  } catch (error) {
    console.error('Update employee status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Manual leave balance adjustment (Excel requirement)
export const updateLeaveBalance = async (req, res) => {
  try {
    const { employeeId, sickLeave, privilegeLeave } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    let leaveBalance = await LeaveBalance.findOne({ employee: employeeId });

    if (!leaveBalance) {
      const user = await User.findById(employeeId);
      leaveBalance = new LeaveBalance({
        employee: employeeId,
        joiningDate: user.joiningDate || new Date(),
        employeeStatus: user.status || 'probation',
        sickLeave: sickLeave !== undefined ? sickLeave : 8,
        privilegeLeave: privilegeLeave !== undefined ? privilegeLeave : 0
      });
    } else {
      if (sickLeave !== undefined) leaveBalance.sickLeave = sickLeave;
      if (privilegeLeave !== undefined) leaveBalance.privilegeLeave = privilegeLeave;
      leaveBalance.lastUpdated = new Date();
    }

    await leaveBalance.save();

    res.json({
      message: 'Leave balance updated successfully',
      leaveBalance
    });
  } catch (error) {
    console.error('Update leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Get all leave balances
export const getAllLeaveBalances = async (req, res) => {
  try {
    const leaveBalances = await LeaveBalance.find()
      .populate('employee', 'firstName lastName employeeId department joiningDate status')
      .sort({ createdAt: -1 });

    res.json(leaveBalances);
  } catch (error) {
    console.error('Get all leave balances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ UPDATED: Create leave request with balance check
export const createLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason } = req.body;
    
    if (!startDate || !endDate || !leaveType || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['sick', 'privilege'].includes(leaveType)) {
      return res.status(400).json({ message: 'Invalid leave type' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    const leaveBalance = await LeaveBalance.findOne({ employee: req.user.id });
    
    if (!leaveBalance) {
      return res.status(400).json({ message: 'Leave balance not found' });
    }

    let deductedSL = 0;
    let deductedPL = 0;

    if (leaveType === 'sick') {
      if (leaveBalance.sickLeave < duration) {
        return res.status(400).json({ 
          message: `Insufficient sick leave balance. Available: ${leaveBalance.sickLeave} days` 
        });
      }
      deductedSL = duration;
    } else if (leaveType === 'privilege') {
      // ✅ IMPLEMENTED: PL avails 0 during probation
      if (!leaveBalance.canAvailPL()) {
        return res.status(400).json({ 
          message: 'Cannot avail privilege leave during probation period. PL = 0' 
        });
      }
      if (leaveBalance.privilegeLeave < duration) {
        return res.status(400).json({ 
          message: `Insufficient privilege leave balance. Available: ${leaveBalance.privilegeLeave.toFixed(1)} days` 
        });
      }
      deductedPL = duration;
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
      deductedSL,
      deductedPL
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

// ✅ UPDATED: Approve leave request with balance deduction
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

    // Get leave balance and deduct leaves
    const leaveBalance = await LeaveBalance.findOne({ employee: leaveRequest.employee });
    
    if (!leaveBalance) {
      return res.status(400).json({ message: 'Leave balance not found for employee' });
    }

    const duration = Math.ceil((leaveRequest.endDate - leaveRequest.startDate) / (1000 * 60 * 60 * 24)) + 1;

    if (leaveRequest.leaveType === 'sick') {
      if (leaveBalance.sickLeave < duration) {
        return res.status(400).json({ 
          message: `Insufficient sick leave balance. Available: ${leaveBalance.sickLeave} days` 
        });
      }
      leaveBalance.sickLeave -= duration;
    } else if (leaveRequest.leaveType === 'privilege') {
      if (!leaveBalance.canAvailPL()) {
        return res.status(400).json({ 
          message: 'Cannot approve privilege leave during probation period' 
        });
      }
      if (leaveBalance.privilegeLeave < duration) {
        return res.status(400).json({ 
          message: `Insufficient privilege leave balance. Available: ${leaveBalance.privilegeLeave.toFixed(1)} days` 
        });
      }
      leaveBalance.privilegeLeave -= duration;
    }

    // Update leave request status
    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.deductedSL = leaveRequest.leaveType === 'sick' ? duration : 0;
    leaveRequest.deductedPL = leaveRequest.leaveType === 'privilege' ? duration : 0;

    await leaveBalance.save();
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