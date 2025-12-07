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
    
    if (start > end) {
      console.log('❌ Invalid date range');
      return res.status(400).json({ message: 'End date must be after start date' });
    }
     const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    if (end < today) {
      console.log('❌ Dates in the past');
      return res.status(400).json({ message: 'Cannot apply for leave in the past' });
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

    // ✅ ADDED: Deduct leave from balance if it's a leave type that affects balance
    if (['sickLeave', 'privilegeLeave', 'maternityLeave', 'halfPayWithPL', 'leaveWithoutPay', 'halfLWP'].includes(leaveRequest.leaveType)) {
      // Calculate number of days
      const start = new Date(leaveRequest.startDate);
      const end = new Date(leaveRequest.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`📅 ${leaveRequest.leaveType} days to deduct: ${days} (${start} to ${end})`);
      
      // Find and update leave balance
      const leaveBalance = await LeaveBalance.findOne({ 
        employee: leaveRequest.employee 
      });
      
      if (leaveBalance) {
        // Get current balance for this leave type
        let currentBalance;
        let leaveTypeField;
        
        switch(leaveRequest.leaveType) {
          case 'sickLeave':
            currentBalance = leaveBalance.sickLeave.current;
            leaveTypeField = 'sickLeave';
            break;
          case 'privilegeLeave':
            currentBalance = leaveBalance.privilegeLeave.current;
            leaveTypeField = 'privilegeLeave';
            break;
          case 'maternityLeave':
            currentBalance = leaveBalance.maternityLeave.current;
            leaveTypeField = 'maternityLeave';
            break;
          case 'halfPayWithPL':
            currentBalance = leaveBalance.halfPayWithPL.current;
            leaveTypeField = 'halfPayWithPL';
            break;
          case 'leaveWithoutPay':
            currentBalance = leaveBalance.leaveWithoutPay.current;
            leaveTypeField = 'leaveWithoutPay';
            break;
          case 'halfLWP':
            currentBalance = leaveBalance.halfLWP.current;
            leaveTypeField = 'halfLWP';
            break;
        }
        
        // Check if enough leave available (skip check for leave without pay types)
        const needsBalanceCheck = !['leaveWithoutPay', 'halfLWP'].includes(leaveRequest.leaveType);
        
        if (needsBalanceCheck && currentBalance < days) {
          console.log(`❌ Insufficient ${leaveRequest.leaveType}: ${currentBalance} available, need ${days}`);
          return res.status(400).json({ 
            message: `Insufficient ${leaveRequest.leaveType} balance. Available: ${currentBalance} days, Requested: ${days} days` 
          });
        }
        
        // Deduct leave (only deduct from types that have balances)
        if (leaveTypeField && !['leaveWithoutPay', 'halfLWP'].includes(leaveRequest.leaveType)) {
          const oldBalance = currentBalance;
          leaveBalance[leaveTypeField].current -= days;
          
          console.log(`✅ ${leaveRequest.leaveType} deducted: ${oldBalance} → ${leaveBalance[leaveTypeField].current} (${days} days)`);
        }
        
        // Add to used leaves history
        leaveBalance.usedLeaves.push({
          leaveRequestId: leaveRequest._id,
          date: new Date(),
          leaveType: leaveRequest.leaveType,
          days: days,
          description: `${leaveRequest.leaveType} approved by ${req.user.firstName} ${req.user.lastName}`
        });
        
        await leaveBalance.save();
        console.log(`✅ Leave balance updated for employee: ${leaveBalance.employeeId}`);
        
      } else {
        console.log('⚠️ No leave balance found for employee');
        return res.status(400).json({ 
          message: 'Employee leave balance not found. Please contact administrator.' 
        });
      }
    }

    // Update leave request status
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

    // ✅ ADDED: Restore leave balance if this was previously approved (in case of undo)
    if (leaveRequest.status === 'approved') {
      // Restore the deducted leave balance
      const leaveBalance = await LeaveBalance.findOne({ 
        employee: leaveRequest.employee 
      });
      
      if (leaveBalance) {
        // Calculate days to restore
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        // Restore based on leave type
        switch(leaveRequest.leaveType) {
          case 'sickLeave':
            leaveBalance.sickLeave.current += days;
            break;
          case 'privilegeLeave':
            leaveBalance.privilegeLeave.current += days;
            break;
          case 'maternityLeave':
            leaveBalance.maternityLeave.current += days;
            break;
          case 'halfPayWithPL':
            leaveBalance.halfPayWithPL.current += days;
            break;
          // leaveWithoutPay and halfLWP don't have balances to restore
        }
        
        await leaveBalance.save();
        console.log(`✅ Restored ${days} days of ${leaveRequest.leaveType} for rejection`);
      }
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
        
        // In getEmployeeLeaveBalance function, when creating new balance:
if (!leaveBalance) {
    console.log(`📝 Leave balance not found, creating new one for user: ${req.user.id}`);
    
    // Create if doesn't exist
    const user = await User.findById(req.user.id);
    if (!user) {
        console.log(`❌ User not found: ${req.user.id}`);
        return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Creating leave balance for: ${user.employeeId} - ${user.firstName} ${user.lastName}`);
    
    // ✅ FIX: Calculate initial PL based on join date
    let initialPL = 0;
    if (user.joinDate) {
        const joinDate = new Date(user.joinDate);
        const today = new Date();
        const monthsWorked = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
                            (today.getMonth() - joinDate.getMonth());
        
        // If not in probation and worked at least 1 month, give accrued PL
        if (user.status !== 'probation' && monthsWorked > 0) {
            initialPL = Math.floor(monthsWorked * 1.5); // 1.5 days per month
        }
    }
    
    // Create a new balance with calculated PL
    const newBalance = new LeaveBalance({
        employee: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department || 'Not Specified',
        designation: user.designation || 'Employee',
        joinDate: user.joinDate || new Date(),
        status: user.status || 'active',
        
        // ✅ FIX: Set initial PL based on calculation
        privilegeLeave: {
            current: initialPL,
            total: initialPL,
            accrualRate: 1.5,
            probationMonths: user.status === 'probation' ? 3 : 0
        }
    });
    
    await newBalance.save();
    console.log(`✅ Created new leave balance: ${newBalance._id}`);
    console.log(`   Initial PL set to: ${initialPL} days`);
    return res.json({ leaveBalance: newBalance });
}
        
        console.log(`✅ Found existing leave balance: ${leaveBalance._id}`);
        console.log(`Balance - SL: ${leaveBalance.sickLeave?.current}, PL: ${leaveBalance.privilegeLeave?.current}`);
        
        res.json({ leaveBalance });
    } catch (error) {
        console.error('❌ Get leave balance error:', error);
        console.error('Full error details:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
// Check if employee has approved leave for specific date


// Get all approved leave dates for a week

// ✅ ADDED: Check if employee has approved leave for specific date
export const checkLeaveForDate = async (req, res) => {
  try {
    console.log(`🔍 Checking leave for date: ${req.params.date}`);
    console.log('User ID:', req.user.id);
    
    const { date } = req.params;
    const employeeId = req.user.id;
    
    if (!date) {
      console.log('❌ Date parameter missing');
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      console.log('❌ Invalid date format:', date);
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    console.log(`🔍 Looking for approved leave on: ${targetDate.toISOString()}`);
    
    // Find approved leave that covers this date
    const approvedLeave = await LeaveRequest.findOne({
      employee: employeeId,
      status: 'approved',
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate }
    });
    
    console.log(`📋 Leave check result:`, approvedLeave ? 'Has leave' : 'No leave');
    
    return res.json({ 
      hasLeave: !!approvedLeave,
      leaveType: approvedLeave?.leaveType,
      leaveTypeDisplay: approvedLeave?.leaveTypeDisplay,
      reason: approvedLeave?.reason,
      date: date
    });
  } catch (error) {
    console.error('❌ Check leave for date error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ✅ ADDED: Get all approved leave dates for a week
export const getApprovedLeavesForWeek = async (req, res) => {
  try {
    console.log(`📅 Getting approved leaves for week: ${req.params.weekStartDate}`);
    console.log('User ID:', req.user.id);
    
    const { weekStartDate } = req.params;
    const employeeId = req.user.id;
    
    if (!weekStartDate) {
      console.log('❌ Week start date parameter missing');
      return res.status(400).json({ message: 'Week start date is required' });
    }
    
    const weekStart = new Date(weekStartDate);
    if (isNaN(weekStart.getTime())) {
      console.log('❌ Invalid week start date format:', weekStartDate);
      return res.status(400).json({ message: 'Invalid week start date format' });
    }
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    console.log(`📅 Week range: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    
    // Find all approved leaves that overlap with this week
    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: 'approved',
      $or: [
        // Leave starts during the week
        { startDate: { $gte: weekStart, $lte: weekEnd } },
        // Leave ends during the week
        { endDate: { $gte: weekStart, $lte: weekEnd } },
        // Leave spans the entire week
        { startDate: { $lte: weekStart }, endDate: { $gte: weekEnd } }
      ]
    }).sort({ startDate: 1 });
    
    console.log(`📋 Found ${approvedLeaves.length} approved leaves for the week`);
    
    // Generate array of all leave dates (excluding weekends)
    const leaveDates = [];
    approvedLeaves.forEach(leave => {
      console.log(`📝 Processing leave: ${leave.startDate} to ${leave.endDate} (${leave.leaveType})`);
      
      let current = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      
      while (current <= end) {
        // Only include dates within the week range
        if (current >= weekStart && current <= weekEnd) {
          const dayOfWeek = current.getDay();
          // Skip Saturday (6) and Sunday (0) - only weekdays
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = current.toISOString().split('T')[0];
            if (!leaveDates.includes(dateStr)) {
              leaveDates.push(dateStr);
            }
          }
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    console.log(`✅ Generated ${leaveDates.length} unique leave dates:`, leaveDates);
    
    return res.json({ 
      success: true,
      weekStartDate: weekStartDate,
      weekEndDate: weekEnd.toISOString().split('T')[0],
      leaveDates: leaveDates,
      totalLeaves: approvedLeaves.length,
      leaveDetails: approvedLeaves.map(leave => ({
        startDate: leave.startDate,
        endDate: leave.endDate,
        leaveType: leave.leaveType,
        leaveTypeDisplay: leave.leaveTypeDisplay,
        daysTaken: leave.daysTaken,
        reason: leave.reason
      }))
    });
  } catch (error) {
    console.error('❌ Get approved leaves for week error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ✅ ADDED: Get leave calendar for employee (all leaves)
export const getLeaveCalendar = async (req, res) => {
  try {
    console.log(`📅 Getting leave calendar for user: ${req.user.id}`);
    
    const employeeId = req.user.id;
    const { startDate, endDate } = req.query;
    
    let query = { employee: employeeId };
    
    if (startDate && endDate) {
      query.$or = [
        // Leave starts in range
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        // Leave ends in range
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        // Leave spans the range
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ];
    }
    
    const leaves = await LeaveRequest.find(query)
      .sort({ startDate: 1 })
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName');
    
    console.log(`📋 Found ${leaves.length} leaves for calendar`);
    
    const calendarEvents = leaves.map(leave => ({
      id: leave._id,
      title: `${leave.leaveTypeDisplay} - ${leave.employee?.firstName || 'Employee'}`,
      start: leave.startDate,
      end: new Date(new Date(leave.endDate).setDate(leave.endDate.getDate() + 1)), // Add 1 day for full calendar display
      status: leave.status,
      leaveType: leave.leaveType,
      color: getLeaveColor(leave.leaveType),
      allDay: true,
      extendedProps: {
        reason: leave.reason,
        employeeName: `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`,
        employeeId: leave.employee?.employeeId,
        approvedBy: leave.approvedBy ? `${leave.approvedBy.firstName} ${leave.approvedBy.lastName}` : null,
        days: leave.daysTaken
      }
    }));
    
    return res.json(calendarEvents);
  } catch (error) {
    console.error('❌ Get leave calendar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ ADDED: Helper function to get color based on leave type
function getLeaveColor(leaveType) {
  const colors = {
    'sickLeave': '#e74c3c', // Red
    'privilegeLeave': '#3498db', // Blue
    'maternityLeave': '#9b59b6', // Purple
    'halfPayWithPL': '#f39c12', // Orange
    'leaveWithoutPay': '#7f8c8d', // Gray
    'halfLWP': '#95a5a6' // Light gray
  };
  return colors[leaveType] || '#3498db';
}