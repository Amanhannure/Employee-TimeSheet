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
  // ✅ IMPROVED: Better tracking for project hours
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
  _id: true, // Ensure each entry has its own ID
  timestamps: false // No timestamps for subdocuments
});

const timesheetSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Employee reference is required'],
    index: true
  },
  employeeCode: { 
    type: String, 
    required: [true, 'Employee code is required'],
    trim: true,
    maxlength: 20,
    index: true
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
    maxlength: 50,
    index: true
  },
  weekStartDate: { 
    type: Date, 
    required: [true, 'Week start date is required'],
    validate: {
      validator: function(date) {
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid week start date'
    },
    index: true
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
    max: [53, 'Week number cannot exceed 53'],
    index: true
  },
  year: { 
    type: Number, 
    min: [2020, 'Year must be 2020 or later'],
    max: [2030, 'Year cannot be beyond 2030'],
    index: true
  },
  entries: {
    type: [timesheetEntrySchema],
    validate: {
      validator: function(entries) {
        // Allow empty arrays for drafts
        if (!entries || entries.length === 0) return true;
        
        // Check for duplicate date-project combinations
        const uniqueCombos = new Set();
        for (const entry of entries) {
          const key = `${entry.date}-${entry.projectCode}`;
          if (uniqueCombos.has(key)) {
            return false; // Duplicate found
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
      values: ['draft', 'pending', 'approved', 'rejected'],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft',
    index: true
  },
  submittedAt: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true; // Allow null for drafts
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
        if (!date) return true; // Allow null for non-approved
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid approval date'
    }
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  isArchived: { 
    type: Boolean, 
    default: false,
    index: true
  },
  archiveDate: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true; // Allow null for non-archived
        return date instanceof Date && !isNaN(date);
      },
      message: 'Invalid archive date'
    }
  },
  // ✅ FIXED: Better project hours tracking
  projectHoursCounted: { 
    type: Boolean, 
    default: false,
    index: true
  },
  // ✅ ADDED: Version for optimistic concurrency control
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

// ✅ FIXED: Improved pre-save hook with better error handling
timesheetSchema.pre('save', async function(next) {
  console.log('🔄 Running pre-save hook for timesheet:', this._id);
  
  try {
    // Skip calculations if this is a partial update
    if (this.isModified('status') && Object.keys(this.getChanges()).length === 1) {
      console.log('⏭️ Skipping calculations for status-only update');
      return next();
    }

    // ✅ FIXED: Calculate week number safely
    if (this.weekStartDate && (!this.weekNumber || this.isModified('weekStartDate'))) {
      const date = new Date(this.weekStartDate);
      
      // Ensure valid date
      if (!(date instanceof Date) || isNaN(date)) {
        throw new Error('Invalid week start date');
      }
      
      // Calculate week number (ISO week)
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + 1) / 7);
      
      this.weekNumber = weekNumber;
      this.year = date.getFullYear();
      
      console.log(`📅 Calculated: year=${this.year}, week=${this.weekNumber}`);
    }

    // ✅ FIXED: Calculate totals with validation
    if (this.entries && (this.entries.length > 0 || this.isModified('entries'))) {
      let totalNormal = 0;
      let totalOvertime = 0;
      
      for (const entry of this.entries) {
        // Validate entry hours
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

    // ✅ FIXED: Set submittedAt when status changes to pending
    if (this.isModified('status') && this.status === 'pending' && !this.submittedAt) {
      this.submittedAt = new Date();
      console.log('📝 Set submission timestamp');
    }

    // ✅ FIXED: Increment version for optimistic concurrency
    if (this.isModified() && !this.isNew) {
      this.version += 1;
    }

    next();
  } catch (error) {
    console.error('❌ Error in pre-save hook:', error);
    next(error);
  }
});

// ✅ REMOVED: Dangerous post-save hook that caused infinite loops
// timesheetSchema.post('save', async function(doc) { ... });

// ✅ ADDED: Pre-remove hook for cleanup
timesheetSchema.pre('remove', async function(next) {
  console.log('🗑️ Removing timesheet:', this._id);
  // Add any cleanup logic here if needed
  next();
});

// ✅ ADDED: Query helpers
timesheetSchema.query.byEmployee = function(employeeId) {
  return this.where({ employee: employeeId });
};

timesheetSchema.query.byStatus = function(status) {
  return this.where({ status: status });
};

timesheetSchema.query.byWeek = function(year, weekNumber) {
  return this.where({ year: year, weekNumber: weekNumber });
};

timesheetSchema.query.pendingApproval = function() {
  return this.where({ status: 'pending' });
};

timesheetSchema.query.recent = function(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.where({ createdAt: { $gte: date } });
};

// ✅ IMPROVED: Instance methods
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
          entries: 0,
          locations: new Set()
        };
      }
      
      projectSummary[entry.projectCode].totalHours += totalHours;
      projectSummary[entry.projectCode].normalHours += (entry.normalHours || 0);
      projectSummary[entry.projectCode].overtimeHours += (entry.overtimeHours || 0);
      projectSummary[entry.projectCode].entries += 1;
      
      if (entry.location) {
        projectSummary[entry.projectCode].locations.add(entry.location);
      }
    }
  });

  // Convert Sets to Arrays
  Object.values(projectSummary).forEach(summary => {
    summary.locations = Array.from(summary.locations);
    // Round hours to 2 decimal places
    summary.totalHours = parseFloat(summary.totalHours.toFixed(2));
    summary.normalHours = parseFloat(summary.normalHours.toFixed(2));
    summary.overtimeHours = parseFloat(summary.overtimeHours.toFixed(2));
  });
  
  console.log('📊 Project hours summary generated:', Object.keys(projectSummary).length, 'projects');
  return projectSummary;
};

timesheetSchema.methods.hasProjectEntries = function() {
  const hasProjects = this.entries.some(entry => 
    entry.projectCode && 
    entry.projectCode !== '' && 
    !['MISC', 'HOLIDAY', 'LEAVE'].includes(entry.projectCode)
  );
  console.log(`🔍 Timesheet ${this._id} has project entries:`, hasProjects);
  return hasProjects;
};

// ✅ IMPROVED: Project assignment validation with better performance
timesheetSchema.methods.validateProjectAssignments = async function() {
  console.log('🔐 Validating project assignments for timesheet:', this._id);
  
  const Project = mongoose.model('Project');
  const invalidEntries = [];
  
  // Get all unique project IDs first
  const projectIds = [...new Set(this.entries
    .filter(entry => entry.project)
    .map(entry => entry.project.toString())
  )];
  
  if (projectIds.length === 0) {
    console.log('✅ No project assignments to validate');
    return { isValid: true, invalidEntries: [] };
  }
  
  // Single query for all projects
  const projects = await Project.find({ _id: { $in: projectIds } })
    .populate('assignedEmployees', 'employeeId')
    .lean();
  
  const projectMap = new Map();
  projects.forEach(project => {
    projectMap.set(project._id.toString(), project);
  });
  
  // Validate each entry
  for (const entry of this.entries) {
    if (entry.project) {
      const projectId = entry.project.toString();
      const project = projectMap.get(projectId);
      
      if (!project) {
        console.warn(`⚠️ Project not found: ${projectId}`);
        invalidEntries.push({
          date: entry.date,
          projectCode: entry.projectCode,
          reason: 'Project not found or inaccessible'
        });
        continue;
      }
      
      // Check if employee is assigned to this project
      const isAssigned = project.assignedEmployees?.some(
        emp => emp.employeeId === this.employeeCode
      );
      
      if (!isAssigned) {
        console.warn(`⚠️ Employee ${this.employeeCode} not assigned to project ${project.name}`);
        invalidEntries.push({
          date: entry.date,
          projectCode: entry.projectCode,
          reason: 'Employee not assigned to project'
        });
      }
      
      // Check if project is active
      if (project.status !== 'active') {
        console.warn(`⚠️ Project ${project.name} is not active: ${project.status}`);
        invalidEntries.push({
          date: entry.date,
          projectCode: entry.projectCode,
          reason: `Project is ${project.status}`
        });
      }
    }
  }
  
  console.log(`🔍 Project validation result: ${invalidEntries.length} invalid entries`);
  return {
    isValid: invalidEntries.length === 0,
    invalidEntries: invalidEntries
  };
};

// ✅ ADDED: Method to check if timesheet can be submitted
timesheetSchema.methods.canBeSubmitted = function() {
  const errors = [];
  
  if (!this.weekStartDate || !this.weekEndDate) {
    errors.push('Week dates are required');
  }
  
  if (!this.entries || this.entries.length === 0) {
    errors.push('At least one timesheet entry is required');
  }
  
  if (this.entries) {
    const hasValidEntries = this.entries.some(entry => 
      (entry.normalHours > 0 || entry.overtimeHours > 0) && 
      entry.projectCode && 
      entry.activityCode
    );
    
    if (!hasValidEntries) {
      errors.push('At least one entry with hours, project, and activity code is required');
    }
    
    // Check for daily hour limits
    const dailyTotals = {};
    this.entries.forEach(entry => {
      const dateStr = entry.date.toISOString().split('T')[0];
      if (!dailyTotals[dateStr]) {
        dailyTotals[dateStr] = 0;
      }
      dailyTotals[dateStr] += (entry.normalHours || 0) + (entry.overtimeHours || 0);
    });
    
    Object.entries(dailyTotals).forEach(([date, total]) => {
      if (total > 24) {
        errors.push(`Total hours for ${date} exceed 24 hours (${total}h)`);
      }
    });
  }
  
  return {
    canSubmit: errors.length === 0,
    errors: errors
  };
};

// ✅ IMPROVED: Indexes for better performance
timesheetSchema.index({ employee: 1, weekStartDate: 1 }, { unique: true });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ employeeCode: 1 });
timesheetSchema.index({ weekNumber: 1, year: 1 });
timesheetSchema.index({ createdAt: 1 });
timesheetSchema.index({ isArchived: 1 });
timesheetSchema.index({ 'entries.project': 1 });
timesheetSchema.index({ 'entries.projectCode': 1 });
timesheetSchema.index({ projectHoursCounted: 1 });
timesheetSchema.index({ department: 1, status: 1 });
timesheetSchema.index({ submittedAt: -1 });
timesheetSchema.index({ employee: 1, status: 1, weekStartDate: -1 }); // Compound index for common queries

// ✅ IMPROVED: Static methods
timesheetSchema.statics.archiveOldTimesheets = async function() {
  console.log('🗄️ Archiving old timesheets...');
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const result = await this.updateMany(
    { 
      createdAt: { $lt: oneYearAgo },
      isArchived: false,
      status: { $in: ['approved', 'rejected'] } // Only archive finalized timesheets
    },
    { 
      isArchived: true,
      archiveDate: new Date()
    }
  );
  
  console.log(`✅ Archived ${result.modifiedCount} timesheets`);
  return result;
};

timesheetSchema.statics.getPendingCount = async function(department = null) {
  const filter = { status: 'pending' };
  if (department) {
    filter.department = department;
  }
  
  return await this.countDocuments(filter);
};

timesheetSchema.statics.getEmployeeTimesheets = async function(employeeId, options = {}) {
  const { limit = 50, page = 1, status, year } = options;
  const skip = (page - 1) * limit;
  
  const filter = { employee: employeeId };
  if (status) filter.status = status;
  if (year) filter.year = year;
  
  return await this.find(filter)
    .sort({ weekStartDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('approvedBy', 'firstName lastName');
};

// ✅ ADDED: Middleware for optimistic concurrency
timesheetSchema.pre('findOneAndUpdate', function(next) {
  this.set({ version: this.getUpdate().version + 1 });
  next();
});

// FIX: Check if model exists before creating
const Timesheet = mongoose.models.Timesheet || mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;