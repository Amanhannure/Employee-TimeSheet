// Create this NEW file in your models folder
import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  designation: {
    type: String
  },
  joinDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['probation', 'active', 'inactive'],
    default: 'probation'
  },
  
  // ✅ 6 LEAVE TYPES
  sickLeave: {
    current: { type: Number, default: 8 },
    total: { type: Number, default: 8 },
    lastReset: { type: Date, default: Date.now }
  },
  
  privilegeLeave: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    accrualRate: { type: Number, default: 1.5 },
    nextAccrual: { type: Date },
    probationMonths: { type: Number, default: 0 }
  },
  
  halfPayWithPL: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  leaveWithoutPay: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  halfLWP: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  maternityLeave: {
    current: { type: Number, default: 182 },
    total: { type: Number, default: 182 },
    eligibilityDate: { type: Date }
  },
  
  // History arrays
  accrualHistory: [{
    date: Date,
    leaveType: String,
    amount: Number,
    reason: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  adjustmentHistory: [{
    date: Date,
    leaveType: String,
    oldValue: Number,
    newValue: Number,
    reason: String,
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  usedLeaves: [{
    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest'
    },
    date: Date,
    leaveType: String,
    days: Number,
    description: String
  }],
  
  notes: String,
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save middleware
leaveBalanceSchema.pre('save', function(next) {
  if (!this.privilegeLeave.nextAccrual && this.joinDate) {
    const joinDate = new Date(this.joinDate);
    let nextAccrual = new Date(joinDate);
    
    if (joinDate.getDate() > 15) {
      nextAccrual.setMonth(nextAccrual.getMonth() + 1);
    }
    
    nextAccrual.setDate(5);
    
    const today = new Date();
    if (today.getDate() > 5) {
      nextAccrual.setMonth(nextAccrual.getMonth() + 1);
    }
    
    this.privilegeLeave.nextAccrual = nextAccrual;
  }
  
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model('LeaveBalance', leaveBalanceSchema);