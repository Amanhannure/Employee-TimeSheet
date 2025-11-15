import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  plNo: { 
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
  
  // ✅ DEPARTMENT HOURS SYSTEM (replaces junior/senior hours)
  departmentHours: [{
    department: { type: String, required: true },
    allocatedHours: { type: Number, required: true },
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

// ✅ PRE-SAVE MIDDLEWARE: Validate department hours allocation
projectSchema.pre('save', function(next) {
  console.log('🔄 Project pre-save middleware triggered');
  console.log('📊 Project:', this.plNo, '-', this.name);
  console.log('🏢 Departments:', this.departments);
  console.log('⏱️ Department Hours:', this.departmentHours);
  
  // Validate that department hours don't exceed total hours
  if (this.departmentHours && this.departmentHours.length > 0) {
    const totalAllocatedHours = this.departmentHours.reduce((sum, dept) => sum + dept.allocatedHours, 0);
    console.log(`📈 Total Allocated Hours: ${totalAllocatedHours}, Project Total Hours: ${this.totalHours}`);
    
    if (totalAllocatedHours > this.totalHours) {
      console.error('❌ Department hours exceed total project hours');
      return next(new Error('Sum of department allocated hours cannot exceed total project hours'));
    }
  }
  
  next();
});

// ✅ METHOD: Check if project should be on hold
projectSchema.methods.checkAndUpdateStatus = async function() {
  console.log(`🔍 Checking project status for: ${this.plNo} - ${this.name}`);
  console.log('📊 Current status:', this.status);
  console.log('🏢 Department hours status:', this.departmentHours);
  
  const allDepartmentsConsumed = this.departmentHours.every(dept => {
    const isConsumed = dept.consumedHours >= dept.allocatedHours;
    console.log(`   ${dept.department}: ${dept.consumedHours}/${dept.allocatedHours} - ${isConsumed ? 'CONSUMED' : 'AVAILABLE'}`);
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

// ✅ METHOD: Add hours to project (called when timesheet is approved)
projectSchema.methods.addConsumedHours = async function(department, hoursToAdd) {
  console.log(`➕ Adding ${hoursToAdd} hours to department: ${department} in project: ${this.plNo}`);
  
  const departmentEntry = this.departmentHours.find(dept => dept.department === department);
  
  if (!departmentEntry) {
    console.error(`❌ Department ${department} not found in project ${this.plNo}`);
    throw new Error(`Department ${department} not found in project`);
  }
  
  const newConsumedHours = departmentEntry.consumedHours + hoursToAdd;
  console.log(`📊 Department ${department}: ${departmentEntry.consumedHours} + ${hoursToAdd} = ${newConsumedHours}`);
  
  if (newConsumedHours > departmentEntry.allocatedHours) {
    console.error(`❌ Cannot add ${hoursToAdd} hours - would exceed allocated hours (${departmentEntry.allocatedHours})`);
    throw new Error(`Cannot add ${hoursToAdd} hours to department ${department}. Would exceed allocated hours.`);
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
  console.log(`👤 Employee ${employeeId} assignment check for project ${this.plNo}: ${isAssigned}`);
  return isAssigned;
};

// ✅ METHOD: Get available hours for a department
projectSchema.methods.getAvailableHours = function(department) {
  const departmentEntry = this.departmentHours.find(dept => dept.department === department);
  
  if (!departmentEntry) {
    console.log(`❌ Department ${department} not found in project ${this.plNo}`);
    return 0;
  }
  
  const availableHours = departmentEntry.allocatedHours - departmentEntry.consumedHours;
  console.log(`📊 Available hours for ${department} in ${this.plNo}: ${availableHours}`);
  return Math.max(0, availableHours);
};

// ✅ METHOD: Check if project can accept more hours
projectSchema.methods.canAcceptHours = function(department, hoursToAdd = 0) {
  const availableHours = this.getAvailableHours(department);
  const canAccept = availableHours >= hoursToAdd && this.status === 'active';
  
  console.log(`🔍 Project ${this.plNo} can accept ${hoursToAdd} hours for ${department}: ${canAccept}`);
  console.log(`   Available: ${availableHours}, Status: ${this.status}`);
  
  return canAccept;
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

// ✅ STATIC METHOD: Get project by PL No with employee assignment check
projectSchema.statics.findByPLNoForEmployee = async function(plNo, employeeId) {
  console.log(`🔍 Finding project ${plNo} for employee ${employeeId}`);
  
  const project = await this.findOne({
    plNo: plNo,
    assignedEmployees: employeeId,
    status: 'active'
  }).populate('assignedEmployees', 'firstName lastName employeeId department');
  
  if (project) {
    console.log(`✅ Project ${plNo} found and employee ${employeeId} is assigned`);
  } else {
    console.log(`❌ Project ${plNo} not found or employee ${employeeId} is not assigned`);
  }
  
  return project;
};

// ✅ METHOD: Get project summary for dashboard
projectSchema.methods.getProjectSummary = function() {
  const totalAllocated = this.departmentHours.reduce((sum, dept) => sum + dept.allocatedHours, 0);
  const totalConsumed = this.departmentHours.reduce((sum, dept) => sum + dept.consumedHours, 0);
  const progress = totalAllocated > 0 ? (totalConsumed / totalAllocated * 100).toFixed(1) : 0;
  
  const summary = {
    plNo: this.plNo,
    name: this.name,
    status: this.status,
    totalAllocatedHours: totalAllocated,
    totalConsumedHours: totalConsumed,
    progress: progress,
    departmentBreakdown: this.departmentHours.map(dept => ({
      department: dept.department,
      allocated: dept.allocatedHours,
      consumed: dept.consumedHours,
      available: dept.allocatedHours - dept.consumedHours
    }))
  };
  
  console.log(`📊 Project summary for ${this.plNo}:`, summary);
  return summary;
};

export default mongoose.model('Project', projectSchema);