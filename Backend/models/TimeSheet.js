import mongoose from 'mongoose';

const timesheetEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  projectCode: { type: String, required: true },
  location: String,
  normalHours: { type: Number, default: 0, min: 0, max: 24 },
  overtimeHours: { type: Number, default: 0, min: 0, max: 24 },
  activityCode: { type: String, required: true },
  remarks: String
});

const timesheetSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employeeCode: { type: String, required: true },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  entries: [timesheetEntrySchema],
  totalNormalHours: { type: Number, default: 0 },
  totalOvertimeHours: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['draft', 'submitted', 'approved', 'rejected'], 
    default: 'draft' 
  },
  submittedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String
}, { timestamps: true });

// Index for efficient queries
timesheetSchema.index({ employee: 1, weekStartDate: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ employeeCode: 1 });

export default mongoose.model('Timesheet', timesheetSchema);