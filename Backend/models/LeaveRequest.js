import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sickLeave: {
    type: Number,
    default: 8
  },
  privilegeLeave: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  probationPeriod: {
    type: Number,
    default: 6 // months
  },
  joiningDate: {
    type: Date,
    required: true
  },
  employeeStatus: {
    type: String,
    enum: ['probation', 'active'],
    default: 'probation'
  },
  monthlyPLRate: {
    type: Number,
    default: 1.5
  },
  // Track if PL was already calculated when status changed to active
  plCalculatedOnActivation: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const leaveRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  leaveType: {
    type: String,
    enum: ['sick', 'privilege'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  supportingDocument: {
    filename: String,
    originalName: String,
    path: String,
    size: Number
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  deductedSL: {
    type: Number,
    default: 0
  },
  deductedPL: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// ✅ IMPLEMENTED: Auto-update PL on the 5th of each month (Excel requirement)
leaveBalanceSchema.methods.updateMonthlyPL = function() {
  const today = new Date();
  const lastUpdate = new Date(this.lastUpdated);
  
  // Check if today is 5th and we haven't updated this month
  if (today.getDate() === 5 && 
      (lastUpdate.getMonth() !== today.getMonth() || 
       lastUpdate.getFullYear() !== today.getFullYear())) {
    
    if (this.employeeStatus === 'active') {
      this.privilegeLeave += this.monthlyPLRate;
      this.lastUpdated = today;
      return true;
    }
  }
  return false;
};

// ✅ IMPLEMENTED: Calculate PL when status changes to active (Excel requirement)
leaveBalanceSchema.methods.calculatePLOnActivation = function() {
  if (this.employeeStatus !== 'active' || this.plCalculatedOnActivation) {
    return;
  }

  const today = new Date();
  const joinDate = new Date(this.joiningDate);
  
  // Calculate months from joining date to today
  let totalMonths = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
                   (today.getMonth() - joinDate.getMonth());
  
  // ✅ IMPLEMENTED: Joining date rule - if joined after 15th, don't count first month
  if (joinDate.getDate() > 15) {
    totalMonths = Math.max(0, totalMonths - 1);
  }
  
  // ✅ IMPLEMENTED: Cap at probation period (6 months) for initial calculation
  const eligibleMonths = Math.min(totalMonths, this.probationPeriod);
  
  this.privilegeLeave = eligibleMonths * this.monthlyPLRate;
  this.plCalculatedOnActivation = true;
  this.lastUpdated = today;
};

// ✅ IMPLEMENTED: Calculate ongoing PL based on joining date rules
leaveBalanceSchema.methods.calculateCurrentPL = function() {
  if (this.employeeStatus === 'probation') {
    this.privilegeLeave = 0; // ✅ Excel: PL avails 0 during probation
    return;
  }

  const today = new Date();
  const joinDate = new Date(this.joiningDate);
  
  let totalMonths = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
                   (today.getMonth() - joinDate.getMonth());
  
  // ✅ IMPLEMENTED: Joining date rule - if joined after 15th, don't count first month
  if (joinDate.getDate() > 15) {
    totalMonths = Math.max(0, totalMonths - 1);
  }
  
  this.privilegeLeave = totalMonths * this.monthlyPLRate;
  this.lastUpdated = today;
};

// ✅ IMPLEMENTED: Check if employee can avail PL based on probation
leaveBalanceSchema.methods.canAvailPL = function() {
  return this.employeeStatus === 'active' && this.privilegeLeave > 0;
};

// ✅ IMPLEMENTED: Get probation months completed
leaveBalanceSchema.methods.getProbationMonthsCompleted = function() {
  const today = new Date();
  const joinDate = new Date(this.joiningDate);
  
  let months = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
               (today.getMonth() - joinDate.getMonth());
  
  if (joinDate.getDate() > 15) {
    months = Math.max(0, months - 1);
  }
  
  return Math.min(months, this.probationPeriod);
};

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

export { LeaveBalance, LeaveRequest };
export default LeaveRequest;