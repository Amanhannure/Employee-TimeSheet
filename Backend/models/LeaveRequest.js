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
  // ✅ UPDATED: Changed leave types to match PL/SL/CL
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'personal', 'emergency', 'other'],
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
  
  // ✅ ADDED: Track leave days deducted
  totalDays: {
    type: Number,
    default: 0
  },
  
  // ✅ ADDED: Track if leaves were deducted
  leavesDeducted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// ✅ ADDED: Calculate total days before saving
leaveRequestSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const timeDiff = end.getTime() - start.getTime();
    this.totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Inclusive of both dates
  }
  next();
});

export default mongoose.model('LeaveRequest', leaveRequestSchema);