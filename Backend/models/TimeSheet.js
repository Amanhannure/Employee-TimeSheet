import mongoose from 'mongoose';

const timesheetEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  projectCode: { type: String, required: true },
  project: {  // ✅ ADDED: Reference to Project model for tracking
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  location: String,
  normalHours: { type: Number, default: 0, min: 0, max: 24 },
  overtimeHours: { type: Number, default: 0, min: 0, max: 24 },
  activityCode: { type: String, required: true },
  remarks: String,
  dayOfWeek: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
  // ✅ ADDED: Track if hours are counted towards project consumption
  hoursCounted: { type: Boolean, default: false },
  // ✅ ADDED: Track which department these hours belong to
  department: String
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
  weekNumber: { type: Number },
  year: { type: Number },
  entries: [timesheetEntrySchema],
  totalNormalHours: { type: Number, default: 0 },
  totalOvertimeHours: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft' 
  },
  submittedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  isArchived: { type: Boolean, default: false },
  archiveDate: Date,
  // ✅ ADDED: Track project hours that have been counted
  projectHoursCounted: { type: Boolean, default: false }
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

// ✅ ADDED: Post-save hook to count project hours when timesheet is approved
timesheetSchema.post('save', async function(doc) {
  console.log('🔄 Timesheet post-save hook triggered');
  console.log(`📊 Timesheet status: ${doc.status}, Project hours counted: ${doc.projectHoursCounted}`);
  
  // Only count project hours if timesheet is approved and not already counted
  if (doc.status === 'approved' && !doc.projectHoursCounted) {
    try {
      console.log('🏗️ Counting project hours for approved timesheet...');
      await countProjectHours(doc);
      doc.projectHoursCounted = true;
      await doc.save();
      console.log('✅ Project hours counted successfully');
    } catch (error) {
      console.error('❌ Error counting project hours:', error);
    }
  }
});

// ✅ ADDED: Method to count project hours towards project consumption
async function countProjectHours(timesheet) {
  console.log('📊 Starting project hours counting for timesheet:', timesheet._id);
  
  const Project = mongoose.model('Project');
  let totalHoursCounted = 0;
  
  for (const entry of timesheet.entries) {
    // Only count hours for entries that have projects and haven't been counted
    if (entry.project && !entry.hoursCounted) {
      try {
        console.log(`🔍 Processing entry for project: ${entry.project}`);
        
        const project = await Project.findById(entry.project);
        if (!project) {
          console.warn(`⚠️ Project not found: ${entry.project}`);
          continue;
        }
        
        const totalEntryHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
        console.log(`⏱️ Entry hours: ${totalEntryHours} for department: ${entry.department || timesheet.department}`);
        
        if (totalEntryHours > 0) {
          // Find the department in project's departmentHours
          const departmentHours = project.departmentHours.find(
            dept => dept.department === (entry.department || timesheet.department)
          );
          
          if (departmentHours) {
            const newConsumedHours = departmentHours.consumedHours + totalEntryHours;
            console.log(`📈 Updating department ${departmentHours.department}: ${departmentHours.consumedHours} -> ${newConsumedHours}`);
            
            departmentHours.consumedHours = newConsumedHours;
            entry.hoursCounted = true;
            totalHoursCounted += totalEntryHours;
            
            // Check if project should be put on hold
            if (newConsumedHours >= departmentHours.allocatedHours) {
              console.log(`🚨 Department ${departmentHours.department} reached allocated hours!`);
              if (project.status === 'active') {
                project.status = 'on-hold';
                console.log('🛑 Project status changed to: on-hold');
              }
            }
            
            await project.save();
            console.log(`✅ Updated project ${project.name} department hours`);
          } else {
            console.warn(`⚠️ Department ${entry.department || timesheet.department} not found in project ${project.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing entry for project ${entry.project}:`, error);
      }
    }
  }
  
  console.log(`🎯 Total hours counted across all projects: ${totalHoursCounted}`);
  return totalHoursCounted;
}

// ✅ ADDED: Method to get project hours summary
timesheetSchema.methods.getProjectHoursSummary = function() {
  console.log('📋 Generating project hours summary for timesheet:', this._id);
  
  const projectSummary = {};
  
  this.entries.forEach(entry => {
    if (entry.projectCode && (entry.normalHours > 0 || entry.overtimeHours > 0)) {
      const totalHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
      
      if (!projectSummary[entry.projectCode]) {
        projectSummary[entry.projectCode] = {
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
  
  console.log('📊 Project hours summary:', projectSummary);
  return projectSummary;
};

// ✅ ADDED: Method to check if timesheet has project entries
timesheetSchema.methods.hasProjectEntries = function() {
  const hasProjects = this.entries.some(entry => entry.projectCode && entry.projectCode !== '');
  console.log(`🔍 Timesheet ${this._id} has project entries:`, hasProjects);
  return hasProjects;
};

// ✅ ADDED: Method to validate project assignments
timesheetSchema.methods.validateProjectAssignments = async function() {
  console.log('🔐 Validating project assignments for timesheet:', this._id);
  
  const Project = mongoose.model('Project');
  const invalidEntries = [];
  
  for (const entry of this.entries) {
    if (entry.project) {
      try {
        const project = await Project.findById(entry.project)
          .populate('assignedEmployees', 'employeeId');
        
        if (!project) {
          console.warn(`⚠️ Project not found: ${entry.project}`);
          invalidEntries.push({
            date: entry.date,
            projectCode: entry.projectCode,
            reason: 'Project not found'
          });
          continue;
        }
        
        // Check if employee is assigned to this project
        const isAssigned = project.assignedEmployees.some(
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
        
      } catch (error) {
        console.error(`❌ Error validating project ${entry.project}:`, error);
        invalidEntries.push({
          date: entry.date,
          projectCode: entry.projectCode,
          reason: 'Validation error'
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

// Index for efficient queries
timesheetSchema.index({ employee: 1, weekStartDate: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ employeeCode: 1 });
timesheetSchema.index({ weekNumber: 1, year: 1 });
timesheetSchema.index({ createdAt: 1 });
timesheetSchema.index({ isArchived: 1 });
// ✅ ADDED: Index for project-related queries
timesheetSchema.index({ 'entries.project': 1 });
timesheetSchema.index({ 'entries.projectCode': 1 });
timesheetSchema.index({ projectHoursCounted: 1 });

// Static method to archive old timesheets
timesheetSchema.statics.archiveOldTimesheets = async function() {
  console.log('🗄️ Archiving old timesheets...');
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const result = await this.updateMany(
    { 
      createdAt: { $lt: oneYearAgo },
      isArchived: false 
    },
    { 
      isArchived: true,
      archiveDate: new Date()
    }
  );
  
  console.log(`✅ Archived ${result.modifiedCount} timesheets`);
  return result;
};

// ✅ ADDED: Static method to recount project hours (for data repair)
timesheetSchema.statics.recountAllProjectHours = async function() {
  console.log('🔄 Recounting all project hours...');
  
  const approvedTimesheets = await this.find({
    status: 'approved',
    projectHoursCounted: true
  });
  
  let totalRecounted = 0;
  
  for (const timesheet of approvedTimesheets) {
    try {
      // Reset the flag and recount
      timesheet.projectHoursCounted = false;
      await timesheet.save();
      totalRecounted++;
    } catch (error) {
      console.error(`❌ Error recounting timesheet ${timesheet._id}:`, error);
    }
  }
  
  console.log(`✅ Recounted project hours for ${totalRecounted} timesheets`);
  return totalRecounted;
};

// FIX: Check if model exists before creating
const Timesheet = mongoose.models.Timesheet || mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;