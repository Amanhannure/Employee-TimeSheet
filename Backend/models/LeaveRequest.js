import mongoose from 'mongoose';

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
    // ✅ UPDATED: Only the 6 required leave types
    enum: [
      'sickLeave',           // Sick Leave (SL)
      'privilegeLeave',      // Privilege Leave (PL)
      'maternityLeave',      // Maternity Leave (ML)
      'halfPayWithPL',       // Half Pay with PL
      'leaveWithoutPay',     // Leave Without Pay
      'halfLWP'             // Half LWP
    ],
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
  
  // ✅ ADDED: Track leave days deducted from balance
  daysTaken: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ✅ ADDED: Balance status tracking
  balanceDeducted: {
    type: Boolean,
    default: false
  },
  
  // ✅ ADDED: Leave balance snapshot at time of request
  balanceSnapshot: {
    sickLeave: Number,
    privilegeLeave: Number,
    maternityLeave: Number,
    halfPayWithPL: Number,
    leaveWithoutPay: Number,
    halfLWP: Number
  }
}, { timestamps: true });

// ✅ ADDED: Calculate days taken before saving
leaveRequestSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    // Calculate business days (excluding weekends)
    let days = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    this.daysTaken = days;
  }
  next();
});

// ✅ ADDED: Virtual for leave type display name
leaveRequestSchema.virtual('leaveTypeDisplay').get(function() {
  const displayNames = {
    'sickLeave': 'Sick Leave (SL)',
    'privilegeLeave': 'Privilege Leave (PL)',
    'maternityLeave': 'Maternity Leave (ML)',
    'halfPayWithPL': 'Half Pay with PL',
    'leaveWithoutPay': 'Leave Without Pay',
    'halfLWP': 'Half LWP'
  };
  return displayNames[this.leaveType] || this.leaveType;
});

// ✅ ADDED: Method to get friendly status
leaveRequestSchema.methods.getFriendlyStatus = function() {
  const statusMap = {
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected'
  };
  return statusMap[this.status] || this.status;
};

// ✅ ADDED: Method to check if leave can be approved based on balance
leaveRequestSchema.methods.canBeApproved = async function(leaveBalance) {
  if (!leaveBalance) return false;
  
  const balanceField = this.leaveType; // e.g., 'sickLeave'
  const availableDays = leaveBalance[balanceField]?.current || 0;
  
  return availableDays >= this.daysTaken;
};

// ✅ ADDED: Ensure virtuals are included in JSON output
leaveRequestSchema.set('toJSON', { virtuals: true });
leaveRequestSchema.set('toObject', { virtuals: true });

export default mongoose.model('LeaveRequest', leaveRequestSchema);