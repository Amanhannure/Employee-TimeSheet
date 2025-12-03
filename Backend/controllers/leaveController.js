import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js';
// ✅ ADDED: Import LeaveBalance model
import LeaveBalance from '../models/LeaveBalance.js';

// ✅ ADDED: Get leave request by ID
export const getLeaveRequestById = async (req, res) => {
  try {
    console.log(`🔍 Get leave request by ID: ${req.params.id}`);
    
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    if (!leaveRequest) {
      console.log(`❌ Leave request not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    console.log(`✅ Found leave request: ${leaveRequest._id}`);
    res.json(leaveRequest);
  } catch (error) {
    console.error('❌ Get leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createLeaveRequest = async (req, res) => {
  try {
    console.log('📝 Creating new leave request');
    console.log('Request body:', req.body);
    console.log('File uploaded:', req.file ? req.file.filename : 'No file');
    
    const { startDate, endDate, leaveType, reason } = req.body;
    
    if (!startDate || !endDate || !leaveType || !reason) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      console.log('❌ Invalid date range');
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
    console.log(`✅ Leave request saved: ${leaveRequest._id}`);

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department');

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: populatedRequest
    });

  } catch (error) {
    console.error('❌ Create leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyLeaveRequests = async (req, res) => {
  try {
    console.log(`👤 Getting leave requests for user: ${req.user.id}`);
    
    const leaveRequests = await LeaveRequest.find({ employee: req.user.id })
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${leaveRequests.length} leave requests`);
    res.json(leaveRequests);
  } catch (error) {
    console.error('❌ Get my leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllLeaveRequests = async (req, res) => {
  try {
    console.log('📋 Getting all leave requests');
    console.log('Query params:', req.query);
    
    const { status, employee } = req.query;
    
    let filter = {};
    if (status && status !== 'all') filter.status = status;
    if (employee) {
      console.log(`🔍 Searching for employee: ${employee}`);
      const users = await User.find({
        $or: [
          { firstName: { $regex: employee, $options: 'i' } },
          { lastName: { $regex: employee, $options: 'i' } },
          { employeeId: { $regex: employee, $options: 'i' } }
        ]
      });
      console.log(`Found ${users.length} matching users`);
      filter.employee = { $in: users.map(u => u._id) };
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${leaveRequests.length} leave requests`);
    res.json(leaveRequests);
  } catch (error) {
    console.error('❌ Get all leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveLeaveRequest = async (req, res) => {
  try {
    console.log(`✅ Approving leave request: ${req.params.id}`);
    console.log('Approved by user:', req.user.id);
    
    const { id } = req.params;
    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      console.log(`❌ Leave request not found: ${id}`);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      console.log(`⚠️ Leave request already processed: ${leaveRequest.status}`);
      return res.status(400).json({ message: 'Leave request already processed' });
    }

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();

    await leaveRequest.save();
    console.log(`✅ Leave request approved: ${id}`);

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Leave request approved successfully',
      leaveRequest: populatedRequest
    });
  } catch (error) {
    console.error('❌ Approve leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const rejectLeaveRequest = async (req, res) => {
  try {
    console.log(`❌ Rejecting leave request: ${req.params.id}`);
    console.log('Request body:', req.body);
    
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      console.log(`❌ Leave request not found: ${id}`);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      console.log(`⚠️ Leave request already processed: ${leaveRequest.status}`);
      return res.status(400).json({ message: 'Leave request already processed' });
    }

    if (!rejectionReason) {
      console.log('❌ Rejection reason missing');
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    leaveRequest.status = 'rejected';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.rejectionReason = rejectionReason;

    await leaveRequest.save();
    console.log(`✅ Leave request rejected: ${id}`);

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      message: 'Leave request rejected successfully',
      leaveRequest: populatedRequest
    });
  } catch (error) {
    console.error('❌ Reject leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    console.log(`📄 Downloading document for leave request: ${req.params.id}`);
    console.log('Requesting user:', req.user.id, 'Role:', req.user.role);
    
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    
    if (!leaveRequest || !leaveRequest.supportingDocument) {
      console.log('❌ Document not found');
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to download
    const canDownload = req.user.role === 'admin' || 
                       req.user.role === 'manager' ||
                       leaveRequest.employee.toString() === req.user.id;

    if (!canDownload) {
      console.log('⛔ Access denied for document download');
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = leaveRequest.supportingDocument.path;
    console.log(`📁 File path: ${filePath}`);
    
    // Set proper headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${leaveRequest.supportingDocument.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    console.log('✅ Starting file download');
    res.download(filePath, leaveRequest.supportingDocument.originalName);
  } catch (error) {
    console.error('❌ Download document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Get leave statistics
export const getLeaveStatistics = async (req, res) => {
  try {
    console.log('📊 Getting leave statistics');
    
    const total = await LeaveRequest.countDocuments();
    const pending = await LeaveRequest.countDocuments({ status: 'pending' });
    const approved = await LeaveRequest.countDocuments({ status: 'approved' });
    const rejected = await LeaveRequest.countDocuments({ status: 'rejected' });

    console.log(`📈 Statistics - Total: ${total}, Pending: ${pending}, Approved: ${approved}, Rejected: ${rejected}`);
    
    res.json({
      total,
      pending,
      approved,
      rejected
    });
  } catch (error) {
    console.error('❌ Get leave statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== ✅ LEAVE BALANCE FUNCTIONS ====================

// Get all leave balances (Admin)
export const getAllLeaveBalances = async (req, res) => {
  try {
    console.log('📋 Getting all leave balances');
    console.log('Query params:', req.query);
    
    const { department, status, search } = req.query;
    
    let filter = {};
    
    if (department && department !== 'all') {
      filter.department = department;
      console.log(`Filtering by department: ${department}`);
    }
    
    if (status && status !== 'all') {
      filter.status = status;
      console.log(`Filtering by status: ${status}`);
    }
    
    if (search) {
      filter.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
      console.log(`Searching for: ${search}`);
    }
    
    const leaveBalances = await LeaveBalance.find(filter)
      .populate('employee', 'firstName lastName employeeId department status')
      .sort({ firstName: 1 });

    console.log(`✅ Found ${leaveBalances.length} leave balances`);
    
    // Log first few balances for debugging
    if (leaveBalances.length > 0) {
      console.log('Sample balances:');
      leaveBalances.slice(0, 3).forEach((balance, index) => {
        console.log(`${index + 1}. ${balance.employeeId} - ${balance.firstName} ${balance.lastName}`);
        console.log(`   SL: ${balance.sickLeave?.current}, PL: ${balance.privilegeLeave?.current}`);
      });
    }
    
    res.json(leaveBalances);
  } catch (error) {
    console.error('❌ Get all leave balances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get employee's own leave balance
export const getEmployeeLeaveBalance = async (req, res) => {
  try {
    console.log(`👤 Getting leave balance for user: ${req.user.id}`);
    
    const leaveBalance = await LeaveBalance.findOne({ 
      employee: req.user.id 
    }).populate('employee', 'firstName lastName employeeId department status');
    
    if (!leaveBalance) {
      console.log(`📝 Leave balance not found, creating new one for user: ${req.user.id}`);
      
      // Create if doesn't exist
      const user = await User.findById(req.user.id);
      if (!user) {
        console.log(`❌ User not found: ${req.user.id}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log(`Creating leave balance for: ${user.employeeId} - ${user.firstName} ${user.lastName}`);
      
      const newBalance = new LeaveBalance({
        employee: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        designation: user.designation,
        joinDate: user.joinDate,
        status: user.status || 'probation'
      });
      
      await newBalance.save();
      console.log(`✅ Created new leave balance: ${newBalance._id}`);
      return res.json({ leaveBalance: newBalance });
    }
    
    console.log(`✅ Found existing leave balance: ${leaveBalance._id}`);
    console.log(`Balance - SL: ${leaveBalance.sickLeave?.current}, PL: ${leaveBalance.privilegeLeave?.current}`);
    
    res.json({ leaveBalance });
  } catch (error) {
    console.error('❌ Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update leave balance (Admin)
export const updateLeaveBalance = async (req, res) => {
  try {
    console.log('✏️ Updating leave balance');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    const { employeeId } = req.params;
    const { leaveType, newValue, reason } = req.body;
    
    if (!leaveType || newValue === undefined || !reason) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        message: 'Leave type, new value, and reason are required' 
      });
    }
    
    const validLeaveTypes = ['sickLeave', 'privilegeLeave', 'halfPayWithPL', 
                            'leaveWithoutPay', 'halfLWP', 'maternityLeave'];
    if (!validLeaveTypes.includes(leaveType)) {
      console.log(`❌ Invalid leave type: ${leaveType}`);
      return res.status(400).json({ message: 'Invalid leave type' });
    }
    
    const leaveBalance = await LeaveBalance.findOne({ 
      employeeId: employeeId.toUpperCase() 
    });
    
    if (!leaveBalance) {
      console.log(`❌ Leave balance not found for employee: ${employeeId}`);
      return res.status(404).json({ message: 'Leave balance not found' });
    }
    
    const oldValue = leaveBalance[leaveType].current;
    leaveBalance[leaveType].current = parseFloat(newValue);
    
    leaveBalance.adjustmentHistory.push({
      date: new Date(),
      leaveType: leaveType,
      oldValue: oldValue,
      newValue: parseFloat(newValue),
      reason: reason,
      adjustedBy: req.user.id
    });
    
    await leaveBalance.save();
    
    console.log(`✅ Leave balance updated for ${employeeId}`);
    console.log(`   ${leaveType}: ${oldValue} → ${newValue}`);
    
    res.json({
      message: 'Leave balance updated successfully',
      leaveBalance,
      adjustment: {
        leaveType,
        oldValue,
        newValue: parseFloat(newValue),
        difference: parseFloat(newValue) - oldValue
      }
    });
  } catch (error) {
    console.error('❌ Update leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update employee status
export const updateEmployeeLeaveStatus = async (req, res) => {
  try {
    console.log('🔄 Updating employee leave status');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    const { employeeId } = req.params;
    const { status, probationMonths } = req.body;
    
    if (!status || !['probation', 'active', 'inactive'].includes(status)) {
      console.log(`❌ Invalid status: ${status}`);
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const leaveBalance = await LeaveBalance.findOne({ 
      employeeId: employeeId.toUpperCase() 
    });
    
    if (!leaveBalance) {
      console.log(`❌ Leave balance not found for employee: ${employeeId}`);
      return res.status(404).json({ message: 'Leave balance not found' });
    }
    
    const oldStatus = leaveBalance.status;
    leaveBalance.status = status;
    
    console.log(`Status change: ${oldStatus} → ${status}`);
    
    if (oldStatus === 'probation' && status === 'active' && probationMonths) {
      const plToAdd = probationMonths * leaveBalance.privilegeLeave.accrualRate;
      
      console.log(`Adding ${plToAdd} PL for ${probationMonths} months probation`);
      
      leaveBalance.privilegeLeave.current += plToAdd;
      leaveBalance.privilegeLeave.total += plToAdd;
      leaveBalance.privilegeLeave.probationMonths = probationMonths;
      
      leaveBalance.accrualHistory.push({
        date: new Date(),
        leaveType: 'PL',
        amount: plToAdd,
        reason: `Activated from ${probationMonths} months probation`,
        addedBy: req.user.id
      });
    }
    
    await leaveBalance.save();
    
    console.log(`✅ Employee status updated: ${employeeId} → ${status}`);
    
    res.json({
      message: `Employee status updated to ${status}`,
      leaveBalance
    });
  } catch (error) {
    console.error('❌ Update employee status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Run monthly accrual
export const runMonthlyAccrual = async (req, res) => {
  try {
    console.log('🔄 Running monthly PL accrual');
    
    const today = new Date();
    console.log(`Accrual date: ${today.toISOString()}`);
    
    const employees = await LeaveBalance.find({
      status: 'active',
      'privilegeLeave.nextAccrual': { $lte: today }
    });
    
    console.log(`Found ${employees.length} employees eligible for accrual`);
    
    let updatedCount = 0;
    
    for (const emp of employees) {
      console.log(`Accruing PL for: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
      console.log(`   Current PL: ${emp.privilegeLeave.current}`);
      console.log(`   Accrual rate: ${emp.privilegeLeave.accrualRate}`);
      
      emp.privilegeLeave.current += emp.privilegeLeave.accrualRate;
      emp.privilegeLeave.total += emp.privilegeLeave.accrualRate;
      
      const nextDate = new Date(today);
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(5);
      emp.privilegeLeave.nextAccrual = nextDate;
      
      emp.accrualHistory.push({
        date: today,
        leaveType: 'PL',
        amount: emp.privilegeLeave.accrualRate,
        reason: 'Monthly accrual',
        addedBy: req.user?.id || null
      });
      
      await emp.save();
      updatedCount++;
      
      console.log(`   New PL: ${emp.privilegeLeave.current}`);
      console.log(`   Next accrual: ${nextDate.toISOString()}`);
    }
    
    console.log(`✅ Monthly accrual completed. Updated ${updatedCount} employees.`);
    
    res.json({
      message: `Monthly accrual completed. Updated ${updatedCount} employees.`,
      date: today,
      updatedCount
    });
  } catch (error) {
    console.error('❌ Monthly accrual error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};