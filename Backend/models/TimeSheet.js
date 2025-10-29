import mongoose from 'mongoose';

const timesheetEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  projectCode: { type: String, required: true },
  location: String,
  normalHours: { type: Number, default: 0, min: 0, max: 24 },
  overtimeHours: { type: Number, default: 0, min: 0, max: 24 },
  activityCode: { type: String, required: true },
  remarks: String,
  dayOfWeek: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }
});

const timesheetSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  weekNumber: { type: Number }, // ✅ CHANGED: Remove 'required' temporarily
  year: { type: Number }, // ✅ CHANGED: Remove 'required' temporarily
  entries: [timesheetEntrySchema],
  totalNormalHours: { type: Number, default: 0 },
  totalOvertimeHours: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['draft', 'submitted', 'approved', 'rejected'], 
    default: 'draft' 
  },
  submittedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  isArchived: { type: Boolean, default: false },
  archiveDate: Date
}, { 
  timestamps: true,
  strictPopulate: false
});

// ✅ FIXED: Calculate week number and totals - SIMPLIFIED VERSION
timesheetSchema.pre('save', function(next) {
  console.log('🔄 Running pre-save hook for timesheet');
  
  try {
    // Calculate week number
    if (this.weekStartDate) {
      const date = new Date(this.weekStartDate);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
      this.weekNumber = Math.ceil((days + 1) / 7);
      this.year = date.getFullYear();
      console.log(`📅 Calculated: year=${this.year}, week=${this.weekNumber}`);
    }
    
    // Calculate totals
    if (this.entries && this.entries.length > 0) {
      this.totalNormalHours = this.entries.reduce((sum, entry) => sum + (entry.normalHours || 0), 0);
      this.totalOvertimeHours = this.entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
      this.totalHours = this.totalNormalHours + this.totalOvertimeHours;
      console.log(`🧮 Calculated totals: normal=${this.totalNormalHours}, overtime=${this.totalOvertimeHours}, total=${this.totalHours}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in pre-save hook:', error);
    next(error);
  }
});

// Index for efficient queries
timesheetSchema.index({ employee: 1, weekStartDate: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ employeeCode: 1 });
timesheetSchema.index({ weekNumber: 1, year: 1 });
timesheetSchema.index({ createdAt: 1 });
timesheetSchema.index({ isArchived: 1 });

// Static method to archive old timesheets
timesheetSchema.statics.archiveOldTimesheets = async function() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  return await this.updateMany(
    { 
      createdAt: { $lt: oneYearAgo },
      isArchived: false 
    },
    { 
      isArchived: true,
      archiveDate: new Date()
    }
  );
};

// FIX: Check if model exists before creating
const Timesheet = mongoose.models.Timesheet || mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;