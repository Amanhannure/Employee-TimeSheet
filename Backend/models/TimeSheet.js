import mongoose from 'mongoose';

const timesheetEntrySchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(date) {
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid date format'
    }
  },
  projectCode: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    validate: {
      validator: async function(projectId) {
        if (!projectId) return true; // Allow empty for MISC, etc.
        const Project = mongoose.model('Project');
        const project = await Project.findById(projectId);
        return !!project;
      },
      message: 'Invalid project reference'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  normalHours: { 
    type: Number, 
    default: 0, 
    min: [0, 'Normal hours cannot be negative'],
    max: [24, 'Normal hours cannot exceed 24 per day'],
    validate: {
      validator: function(hours) {
        return hours % 0.5 === 0; // Only allow 0.5 increments
      },
      message: 'Hours must be in 0.5 increments'
    }
  },
  overtimeHours: { 
    type: Number, 
    default: 0, 
    min: [0, 'Overtime hours cannot be negative'],
    max: [24, 'Overtime hours cannot exceed 24 per day'],
    validate: {
      validator: function(hours) {
        return hours % 0.5 === 0;
      },
      message: 'Hours must be in 0.5 increments'
    }
  },
  activityCode: { 
    type: String, 
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  dayOfWeek: { 
    type: String, 
    enum: {
      values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      message: '{VALUE} is not a valid day of week'
    },
    required: true
  },
  hoursCounted: { 
    type: Boolean, 
    default: false 
  },
  department: {
    type: String,
    trim: true,
    maxlength: 50,
    required: true
  }
}, {
  _id: true,
  timestamps: false
});

const timesheetSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Employee reference is required']
  },
  employeeCode: { 
    type: String, 
    required: [true, 'Employee code is required'],
    trim: true,
    maxlength: 20
  },
  employeeName: { 
    type: String, 
    required: [true, 'Employee name is required'],
    trim: true,
    maxlength: 100
  },
  department: { 
    type: String, 
    required: [true, 'Department is required'],
    trim: true,
    maxlength: 50
  },
  weekStartDate: { 
    type: Date, 
    required: [true, 'Week start date is required'],
    validate: {
      validator: function(date) {
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid week start date'
    }
  },
  weekEndDate: { 
    type: Date, 
    required: [true, 'Week end date is required'],
    validate: {
      validator: function(date) {
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid week end date'
    }
  },
  weekNumber: { 
    type: Number, 
    min: [1, 'Week number must be at least 1'],
    max: [53, 'Week number cannot exceed 53']
  },
  year: { 
    type: Number, 
    min: [2020, 'Year must be 2020 or later'],
    max: [2030, 'Year cannot be beyond 2030']
  },
  entries: {
    type: [timesheetEntrySchema],
    validate: {
      validator: function(entries) {
        if (!entries || entries.length === 0) return true;
        
        const uniqueCombos = new Set();
        for (const entry of entries) {
          const key = `${entry.date}-${entry.projectCode}`;
          if (uniqueCombos.has(key)) {
            return false;
          }
          uniqueCombos.add(key);
        }
        return true;
      },
      message: 'Duplicate date-project combinations are not allowed'
    }
  },
  totalNormalHours: { 
    type: Number, 
    default: 0,
    min: [0, 'Total normal hours cannot be negative']
  },
  totalOvertimeHours: { 
    type: Number, 
    default: 0,
    min: [0, 'Total overtime hours cannot be negative']
  },
  totalHours: { 
    type: Number, 
    default: 0,
    min: [0, 'Total hours cannot be negative']
  },
  status: { 
    type: String, 
    enum: {
      values: ['draft', 'pending', 'approved', 'rejected', 'resubmitted', 'expired'],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft'
  },
  submittedAt: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid submission date'
    }
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approvedAt: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid approval date'
    }
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid rejection date'
    }
  },
  // ✅ FIXED: Rejection tracking
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  rejectionCategory: {
    type: String,
    enum: {
      values: ['incorrect_hours', 'wrong_project', 'missing_info', 'policy_violation', 'other'],
      message: '{VALUE} is not a valid rejection category'
    },
    default: 'other'
  },
  // ✅ FIXED: 15-day editing window fields
  editableUntil: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid editable until date'
    }
  },
  resubmittedAt: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid resubmission date'
    }
  },
  resubmissionCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // ✅ FIXED: Expiration tracking
  isExpired: {
    type: Boolean,
    default: false
  },
  expiredAt: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid expiration date'
    }
  },
  // Edit history for audit trail
  editHistory: [{
    editedAt: {
      type: Date,
      default: Date.now
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    reason: {
      type: String,
      maxlength: 200
    }
  }],
  isArchived: { 
    type: Boolean, 
    default: false
  },
  archiveDate: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid archive date'
    }
  },
  projectHoursCounted: { 
    type: Boolean, 
    default: false
  },
  version: {
    type: Number,
    default: 1
  }
}, { 
  timestamps: true,
  strictPopulate: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ FIXED: Virtual for week range display
timesheetSchema.virtual('weekRange').get(function() {
  if (!this.weekStartDate || !this.weekEndDate) return '';
  const start = this.weekStartDate.toLocaleDateString('en-GB');
  const end = this.weekEndDate.toLocaleDateString('en-GB');
  return `${start} - ${end}`;
});

// ✅ FIXED: Virtual for display status
timesheetSchema.virtual('displayStatus').get(function() {
  if (!this.status) return 'Unknown';
  return this.status.charAt(0).toUpperCase() + this.status.slice(1);
});

// ✅ FIXED: Virtual for days remaining to edit
timesheetSchema.virtual('daysRemaining').get(function() {
  if (this.status !== 'rejected' || !this.editableUntil) return 0;
  
  const now = new Date();
  const remainingMs = this.editableUntil - now;
  return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
});

// ✅ FIXED: Virtual for checking if editable
timesheetSchema.virtual('canEdit').get(function() {
  if (this.status !== 'rejected') return false;
  if (!this.editableUntil) return false;
  if (this.isExpired) return false;
  
  return this.editableUntil > new Date();
});

// ✅ FIXED: Virtual for checking if blocking new submissions
// ✅ FIXED: Virtual for checking if blocking new submissions
timesheetSchema.virtual('isBlocking').get(function() {
  if (this.status !== 'rejected') return false;
  
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  fifteenDaysAgo.setHours(23, 59, 59, 999);
  
  // ✅ FIX: Use rejectedAt instead of submittedAt for blocking calculation
  return this.rejectedAt && this.rejectedAt < fifteenDaysAgo && !this.isExpired;
});

// ✅ FIXED: Pre-save hook WITHOUT the problematic this.previous() call
timesheetSchema.pre('save', async function(next) {
  console.log('🔄 Running pre-save hook for timesheet:', this._id);
  
  try {
    // Skip calculations if this is a partial update (only status changed)
    const modifiedPaths = this.modifiedPaths();
    if (modifiedPaths.length === 1 && modifiedPaths[0] === 'status') {
      console.log('⏭️ Skipping calculations for status-only update');
      return next();
    }

    // ✅ FIXED: Calculate week number safely
    if (this.weekStartDate && (!this.weekNumber || this.isModified('weekStartDate'))) {
      const date = new Date(this.weekStartDate);
      
      if (!(date instanceof Date) || isNaN(date)) {
        throw new Error('Invalid week start date');
      }
      
      // Get the Thursday of the week (ISO week calculation)
      const thursday = new Date(date);
      thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)));
      
      const yearStart = new Date(thursday.getFullYear(), 0, 1);
      const weekNumber = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
      
      this.weekNumber = weekNumber;
      this.year = thursday.getFullYear();
      
      console.log(`📅 Calculated: year=${this.year}, week=${this.weekNumber}`);
    }

    // ✅ FIXED: Handle rejection workflow
    // ✅ FIXED: Handle rejection workflow
if (this.isModified('status') && this.status === 'rejected') {
  console.log('🔄 Setting up 15-day editing window for rejected timesheet');
  
  // ✅ FIXED: Use local timezone for consistent calculations
  const editableUntil = new Date();
  editableUntil.setDate(editableUntil.getDate() + 15);
  editableUntil.setHours(23, 59, 59, 999); // End of day 15 days from now
  
  this.editableUntil = editableUntil;
  this.rejectedAt = new Date();
  this.isExpired = false;
  
  console.log(`⏰ Timesheet can be edited until: ${this.editableUntil}`);
}

    // ✅ FIXED: Handle resubmission
    if (this.isModified('status') && this.status === 'pending') {
      // Check if this was previously rejected by looking at rejection fields
      if (this.rejectedAt && this.rejectionReason) {
        console.log('🔄 Handling timesheet resubmission');
        
        this.resubmittedAt = new Date();
        this.resubmissionCount = (this.resubmissionCount || 0) + 1;
        this.rejectionReason = ''; // Clear rejection reason on resubmission
        this.rejectionCategory = undefined;
        this.editableUntil = null; // Clear editing window
        
        console.log(`📝 Timesheet resubmitted (attempt ${this.resubmissionCount})`);
      }
    }

    // ✅ FIXED: Handle expiration automatically
if (this.status === 'rejected' && this.editableUntil) {
  const now = new Date();
  if (this.editableUntil <= now && !this.isExpired) {
    console.log('⏰ Auto-expiring timesheet editing period');
    this.isExpired = true;
    this.expiredAt = now;
  }
} else if (this.status === 'rejected' && !this.editableUntil) {
  // ✅ ADDED: Set default editableUntil if missing
  console.log('⚠️ Setting default editing period for rejected timesheet');
  this.editableUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
}

    // ✅ FIXED: Calculate totals with validation
    if (this.entries && (this.entries.length > 0 || this.isModified('entries'))) {
      let totalNormal = 0;
      let totalOvertime = 0;
      
      for (const entry of this.entries) {
        const normal = entry.normalHours || 0;
        const overtime = entry.overtimeHours || 0;
        
        if (normal < 0 || overtime < 0) {
          throw new Error('Hours cannot be negative');
        }
        
        if (normal + overtime > 24) {
          throw new Error(`Total hours for ${entry.date} cannot exceed 24`);
        }
        
        totalNormal += normal;
        totalOvertime += overtime;
      }
      
      this.totalNormalHours = parseFloat(totalNormal.toFixed(2));
      this.totalOvertimeHours = parseFloat(totalOvertime.toFixed(2));
      this.totalHours = parseFloat((totalNormal + totalOvertime).toFixed(2));
      
      console.log(`🧮 Calculated totals: normal=${this.totalNormalHours}, overtime=${this.totalOvertimeHours}, total=${this.totalHours}`);
    }

    // Set submittedAt when status changes to pending
    if (this.isModified('status') && this.status === 'pending' && !this.submittedAt) {
      this.submittedAt = new Date();
      console.log('📝 Set submission timestamp');
    }

    // Increment version for optimistic concurrency
    if (this.isModified() && !this.isNew) {
      this.version += 1;
    }

    next();
  } catch (error) {
    console.error('❌ Error in pre-save hook:', error);
    next(error);
  }
});

// ✅ FIXED: Method to check if timesheet can be resubmitted
timesheetSchema.methods.canBeResubmitted = function() {
  if (this.status !== 'rejected') {
    return { canResubmit: false, reason: 'Only rejected timesheets can be resubmitted' };
  }
  
  if (this.isExpired) {
    return { canResubmit: false, reason: 'Editing period has expired' };
  }
  
  if (!this.editableUntil || this.editableUntil <= new Date()) {
    return { canResubmit: false, reason: 'Editing period has ended' };
  }
  
  return { canResubmit: true, reason: '' };
};

// ✅ FIXED: Method to add edit history entry
timesheetSchema.methods.addEditHistory = function(editedBy, changes, reason = '') {
  const historyEntry = {
    editedAt: new Date(),
    editedBy: editedBy,
    changes: new Map(Object.entries(changes)),
    reason: reason
  };
  
  this.editHistory.push(historyEntry);
  console.log(`📝 Added edit history entry for timesheet ${this._id}`);
};

// ✅ FIXED: Method to get editing deadline info
timesheetSchema.methods.getEditingDeadlineInfo = function() {
  if (this.status !== 'rejected') {
    return { canEdit: false, daysRemaining: 0, deadline: null };
  }
  
  const now = new Date();
  const canEdit = this.editableUntil && this.editableUntil > now && !this.isExpired;
  const daysRemaining = canEdit ? Math.ceil((this.editableUntil - now) / (1000 * 60 * 60 * 24)) : 0;
  
  return {
    canEdit,
    daysRemaining,
    deadline: this.editableUntil,
    isExpired: this.isExpired
  };
};

// ✅ FIXED: Project hours summary
timesheetSchema.methods.getProjectHoursSummary = function() {
  console.log('📋 Generating project hours summary for timesheet:', this._id);
  
  const projectSummary = {};
  
  this.entries.forEach(entry => {
    if (entry.projectCode && (entry.normalHours > 0 || entry.overtimeHours > 0)) {
      const totalHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
      
      if (!projectSummary[entry.projectCode]) {
        projectSummary[entry.projectCode] = {
          projectCode: entry.projectCode,
          totalHours: 0,
          normalHours: 0,
          overtimeHours: 0,
          entries: 0
        };
      }
      
      projectSummary[entry.projectCode].totalHours += totalHours;
      projectSummary[entry.projectCode].normalHours += (entry.normalHours || 0);
      projectSummary[entry.projectCode].overtimeHours += (entry.overtimeHours || 0);
      projectSummary[entry.projectCode].entries += 1;
    }
  });

  // Convert to proper numbers
  Object.values(projectSummary).forEach(summary => {
    summary.totalHours = parseFloat(summary.totalHours.toFixed(2));
    summary.normalHours = parseFloat(summary.normalHours.toFixed(2));
    summary.overtimeHours = parseFloat(summary.overtimeHours.toFixed(2));
  });
  
  console.log('📊 Project hours summary generated:', Object.keys(projectSummary).length, 'projects');
  return projectSummary;
};

// ✅ FIXED: Static method to find blocking timesheets
// ✅ FIXED: Static method to find blocking timesheets
timesheetSchema.statics.findBlockingTimesheets = async function(employeeId) {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  fifteenDaysAgo.setHours(23, 59, 59, 999); // End of the day
  
  return await this.find({
    employee: employeeId,
    status: 'rejected',
    submittedAt: { $lt: fifteenDaysAgo }, // ✅ FIX: Use $lt
    isExpired: false
  }).sort({ submittedAt: 1 }); // Oldest first
};
// ✅ FIXED: Static method to auto-expire old rejected timesheets
timesheetSchema.statics.autoExpireRejectedTimesheets = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      status: 'rejected',
      editableUntil: { $lte: now },
      isExpired: { $ne: true }
    },
    {
      $set: {
        isExpired: true,
        expiredAt: now
      }
    }
  );
  
  console.log(`⏰ Auto-expired ${result.modifiedCount} rejected timesheets`);
  return result;
};

// ✅ FIXED: Indexes without duplicates
timesheetSchema.index({ employee: 1, weekStartDate: 1 }, { unique: true });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ employeeCode: 1 });
timesheetSchema.index({ weekNumber: 1, year: 1 });
timesheetSchema.index({ createdAt: 1 });
timesheetSchema.index({ isArchived: 1 });
timesheetSchema.index({ department: 1, status: 1 });
timesheetSchema.index({ submittedAt: -1 });
timesheetSchema.index({ employee: 1, status: 1, weekStartDate: -1 });
timesheetSchema.index({ editableUntil: 1 });
timesheetSchema.index({ isExpired: 1 });
timesheetSchema.index({ status: 1, editableUntil: 1 });
timesheetSchema.index({ employee: 1, status: 1, isExpired: 1 });
timesheetSchema.index({ rejectedAt: -1 });
timesheetSchema.index({ resubmittedAt: -1 });

// ✅ FIXED: Model creation
const Timesheet = mongoose.models.Timesheet || mongoose.model('Timesheet', timesheetSchema);

export default Timesheet; Timesheet.js