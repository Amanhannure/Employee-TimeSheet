import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectCode: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  totalHours: { 
    type: Number, 
    required: true 
  },
  
  // ✅ UPDATED: DEPARTMENT HOURS SYSTEM with variable hours
  departmentHours: [{
    department: { type: String, required: true },
    allocatedHours: { type: Number, required: true },
    variableHours: { type: Number, default: 0 }, // ✅ ADDED: Variable hours for extensions
    consumedHours: { type: Number, default: 0 }
  }],
  
  status: { 
    type: String, 
    enum: ['active', 'on-hold', 'completed', 'cancelled'], 
    default: 'active' 
  },
  startDate: Date,
  endDate: Date,
  assignedEmployees: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  departments: [String],
  
  activities: [{
    name: String,
    startDate: Date,
    endDate: Date,
    consumedHours: String,
    remarks: String
  }]
}, { 
  timestamps: true 
});

// ✅ UPDATED: Pre-save middleware to include variable hours in validation
projectSchema.pre('save', function(next) {
  console.log('🔄 Project pre-save middleware triggered');
  console.log('📊 Project:', this.projectCode, '-', this.name);
  console.log('🏢 Departments:', this.departments);
  console.log('⏱️ Department Hours:', this.departmentHours);
  
  // ✅ UPDATED: Validate that department hours (allocated + variable) don't exceed total hours
  if (this.departmentHours && this.departmentHours.length > 0) {
    const totalAllocatedHours = this.departmentHours.reduce((sum, dept) => 
      sum + dept.allocatedHours + dept.variableHours, 0
    );
    console.log(`📈 Total Allocated + Variable Hours: ${totalAllocatedHours}, Project Total Hours: ${this.totalHours}`);
    
    if (totalAllocatedHours > this.totalHours) {
      console.error('❌ Department hours (allocated + variable) exceed total project hours');
      return next(new Error('Sum of department allocated + variable hours cannot exceed total project hours'));
    }
  }
  
  next();
});

// ✅ UPDATED: Check if project should be on hold (include variable hours)
projectSchema.methods.checkAndUpdateStatus = async function() {
  console.log(`🔍 Checking project status for: ${this.projectCode} - ${this.name}`);
  console.log('📊 Current status:', this.status);
  console.log('🏢 Department hours status:', this.departmentHours);
  
  const allDepartmentsConsumed = this.departmentHours.every(dept => {
    const totalAvailable = dept.allocatedHours + dept.variableHours;
    const isConsumed = dept.consumedHours >= totalAvailable;
    console.log(`   ${dept.department}: ${dept.consumedHours}/${totalAvailable} (Allocated: ${dept.allocatedHours}, Variable: ${dept.variableHours}) - ${isConsumed ? 'CONSUMED' : 'AVAILABLE'}`);
    return isConsumed;
  });
  
  console.log(`📊 All departments consumed: ${allDepartmentsConsumed}`);
  
  if (allDepartmentsConsumed && this.status === 'active') {
    console.log('🚫 Project hours fully consumed - setting status to on-hold');
    this.status = 'on-hold';
    await this.save();
    console.log('✅ Project status updated to on-hold');
  } else if (!allDepartmentsConsumed && this.status === 'on-hold') {
    console.log('🔄 Project has available hours - setting status back to active');
    this.status = 'active';
    await this.save();
    console.log('✅ Project status updated to active');
  }
  
  return this;
};

// ✅ UPDATED: Add hours to project (check against allocated + variable hours)
projectSchema.methods.addConsumedHours = async function(department, hoursToAdd) {
  console.log(`➕ Adding ${hoursToAdd} hours to department: ${department} in project: ${this.projectCode}`);
  
  const departmentEntry = this.departmentHours.find(dept => dept.department === department);
  
  if (!departmentEntry) {
    console.error(`❌ Department ${department} not found in project ${this.projectCode}`);
    throw new Error(`Department ${department} not found in project`);
  }
  
  const newConsumedHours = departmentEntry.consumedHours + hoursToAdd;
  const totalAvailable = departmentEntry.allocatedHours + departmentEntry.variableHours;
  
  console.log(`📊 Department ${department}: ${departmentEntry.consumedHours} + ${hoursToAdd} = ${newConsumedHours}/${totalAvailable}`);
  
  if (newConsumedHours > totalAvailable) {
    console.error(`❌ Cannot add ${hoursToAdd} hours - would exceed available hours (${totalAvailable})`);
    throw new Error(`Cannot add ${hoursToAdd} hours to department ${department}. Would exceed available hours.`);
  }
  
  departmentEntry.consumedHours = newConsumedHours;
  console.log(`✅ Successfully updated consumed hours for ${department} to ${newConsumedHours}`);
  
  // Check if project should be put on hold
  await this.checkAndUpdateStatus();
  
  return this.save();
};

// ✅ METHOD: Check if employee is assigned to this project
projectSchema.methods.isEmployeeAssigned = function(employeeId) {
  const isAssigned = this.assignedEmployees.some(emp => 
    emp._id ? emp._id.toString() === employeeId : emp.toString() === employeeId
  );
  console.log(`👤 Employee ${employeeId} assignment check for project ${this.projectCode}: ${isAssigned}`);
  return isAssigned;
};

// ✅ UPDATED: Get available hours for a department (include variable hours)
projectSchema.methods.getAvailableHours = function(department) {
  const departmentEntry = this.departmentHours.find(dept => dept.department === department);
  
  if (!departmentEntry) {
    console.log(`❌ Department ${department} not found in project ${this.projectCode}`);
    return 0;
  }
  
  const totalAvailable = departmentEntry.allocatedHours + departmentEntry.variableHours;
  const availableHours = totalAvailable - departmentEntry.consumedHours;
  console.log(`📊 Available hours for ${department} in ${this.projectCode}: ${availableHours} (Total: ${totalAvailable}, Consumed: ${departmentEntry.consumedHours})`);
  return Math.max(0, availableHours);
};

// ✅ UPDATED: Check if project can accept more hours (include variable hours)
projectSchema.methods.canAcceptHours = function(department, hoursToAdd = 0) {
  const availableHours = this.getAvailableHours(department);
  const canAccept = availableHours >= hoursToAdd && this.status === 'active';
  
  console.log(`🔍 Project ${this.projectCode} can accept ${hoursToAdd} hours for ${department}: ${canAccept}`);
  console.log(`   Available: ${availableHours}, Status: ${this.status}`);
  
  return canAccept;
};

// ✅ ADDED: Method to add variable hours to a department
projectSchema.methods.addVariableHours = async function(department, variableHoursToAdd) {
  console.log(`➕ Adding ${variableHoursToAdd} variable hours to department: ${department} in project: ${this.projectCode}`);
  
  const departmentEntry = this.departmentHours.find(dept => dept.department === department);
  
  if (!departmentEntry) {
    console.error(`❌ Department ${department} not found in project ${this.projectCode}`);
    throw new Error(`Department ${department} not found in project`);
  }
  
  const newTotalHours = departmentEntry.allocatedHours + departmentEntry.variableHours + variableHoursToAdd;
  
  // Check if adding variable hours would exceed total project hours
  const currentTotalAllocated = this.departmentHours.reduce((sum, dept) => 
    sum + dept.allocatedHours + dept.variableHours, 0
  );
  const newProjectTotal = currentTotalAllocated + variableHoursToAdd;
  
  if (newProjectTotal > this.totalHours) {
    console.error(`❌ Cannot add ${variableHoursToAdd} variable hours - would exceed project total hours (${this.totalHours})`);
    throw new Error(`Cannot add ${variableHoursToAdd} variable hours. Would exceed project total hours.`);
  }
  
  departmentEntry.variableHours += variableHoursToAdd;
  console.log(`✅ Successfully added ${variableHoursToAdd} variable hours to ${department}. New variable hours: ${departmentEntry.variableHours}`);
  
  // Check if project should be reactivated
  await this.checkAndUpdateStatus();
  
  return this.save();
};

// ✅ STATIC METHOD: Find active projects for an employee
projectSchema.statics.findActiveProjectsForEmployee = async function(employeeId) {
  console.log(`🔍 Finding active projects for employee: ${employeeId}`);
  
  const projects = await this.find({
    assignedEmployees: employeeId,
    status: 'active'
  }).populate('assignedEmployees', 'firstName lastName employeeId department');
  
  console.log(`📋 Found ${projects.length} active projects for employee ${employeeId}`);
  
  return projects;
};

// ✅ STATIC METHOD: Get project by projectCode with employee assignment check
projectSchema.statics.findByProjectCodeForEmployee = async function(projectCode, employeeId) {
  console.log(`🔍 Finding project ${projectCode} for employee ${employeeId}`);
  
  const project = await this.findOne({
    projectCode: projectCode,
    assignedEmployees: employeeId,
    status: 'active'
  }).populate('assignedEmployees', 'firstName lastName employeeId department');
  
  if (project) {
    console.log(`✅ Project ${projectCode} found and employee ${employeeId} is assigned`);
  } else {
    console.log(`❌ Project ${projectCode} not found or employee ${employeeId} is not assigned`);
  }
  
  return project;
};

// ✅ UPDATED: Get project summary for dashboard (include variable hours)
projectSchema.methods.getProjectSummary = function() {
  const totalAllocated = this.departmentHours.reduce((sum, dept) => sum + dept.allocatedHours, 0);
  const totalVariable = this.departmentHours.reduce((sum, dept) => sum + dept.variableHours, 0);
  const totalConsumed = this.departmentHours.reduce((sum, dept) => sum + dept.consumedHours, 0);
  const totalAvailable = totalAllocated + totalVariable;
  const progress = totalAvailable > 0 ? (totalConsumed / totalAvailable * 100).toFixed(1) : 0;
  
  const summary = {
    projectCode: this.projectCode,
    name: this.name,
    status: this.status,
    totalAllocatedHours: totalAllocated,
    totalVariableHours: totalVariable,
    totalAvailableHours: totalAvailable,
    totalConsumedHours: totalConsumed,
    progress: progress,
    departmentBreakdown: this.departmentHours.map(dept => ({
      department: dept.department,
      allocated: dept.allocatedHours,
      variable: dept.variableHours,
      totalAvailable: dept.allocatedHours + dept.variableHours,
      consumed: dept.consumedHours,
      available: (dept.allocatedHours + dept.variableHours) - dept.consumedHours
    }))
  };
  
  console.log(`📊 Project summary for ${this.projectCode}:`, summary);
  return summary;
};

export default mongoose.model('Project', projectSchema);