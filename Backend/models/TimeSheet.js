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
}, { 
  timestamps: true,
  strictPopulate: false
});

// Middleware to calculate totals before saving
timesheetSchema.pre('save', function(next) {
  this.totalNormalHours = this.entries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
  this.totalOvertimeHours = this.entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
  next();
});

// Index for efficient queries
timesheetSchema.index({ employee: 1, weekStartDate: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ employeeCode: 1 });
timesheetSchema.index({ 'entries.projectCode': 1 });

// FIX: Check if model exists before creating
const Timesheet = mongoose.models.Timesheet || mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;