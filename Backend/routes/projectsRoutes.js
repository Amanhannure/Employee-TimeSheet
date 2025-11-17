import express from 'express';
import Project from '../models/Project.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ ADDED: Project Manager Authorization Middleware
const authorizeProjectManager = (req, res, next) => {
  console.log('🔐 Checking project manager authorization...');
  console.log('👤 User role:', req.user.role);
  console.log('👤 User ID:', req.user.id);
  
  if (req.user.role !== 'project_manager' && req.user.role !== 'admin') {
    console.log('❌ Access denied - User is not project manager or admin');
    return res.status(403).json({ 
      message: 'Access denied. Project manager or admin role required.' 
    });
  }
  
  console.log('✅ User authorized as project manager or admin');
  next();
};

// Get all projects (Project Manager/Admin only) - ✅ CHANGED AUTHORIZATION
router.get('/', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log('📋 Fetching all projects for project manager/admin');
    
    const projects = await Project.find()
      .populate('assignedEmployees', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${projects.length} projects`);
    res.json(projects);
  } catch (error) {
    console.error('❌ Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get projects for logged-in employee - ✅ UPDATED: Only active projects
router.get('/my-projects', authenticate, async (req, res) => {
  try {
    console.log(`👤 Fetching assigned projects for employee: ${req.user.id}`);
    
    const projects = await Project.find({ 
      assignedEmployees: req.user.id,
      status: 'active' // ✅ ADDED: Only show active projects to employees
    })
    .populate('assignedEmployees', 'firstName lastName employeeId department')
    .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${projects.length} active assigned projects for employee`);
    res.json(projects);
  } catch (error) {
    console.error('❌ Get my projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project - ✅ UPDATED: Enhanced access control
router.get('/:id', authenticate, async (req, res) => {
  try {
    console.log(`🔍 Fetching project details for ID: ${req.params.id}`);
    
    const project = await Project.findById(req.params.id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');
    
    if (!project) {
      console.log('❌ Project not found');
      return res.status(404).json({ message: 'Project not found' });
    }

    // ✅ ENHANCED: Check if user has access to this project
    const isProjectManager = req.user.role === 'project_manager' || req.user.role === 'admin';
    const isAssignedEmployee = project.assignedEmployees.some(emp => 
      emp._id.toString() === req.user.id
    );
    
    const hasAccess = isProjectManager || isAssignedEmployee;
    
    console.log(`🔐 Access check - Project Manager: ${isProjectManager}, Assigned: ${isAssignedEmployee}, Has Access: ${hasAccess}`);
    
    if (!hasAccess) {
      console.log('❌ Access denied to project');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('✅ Project access granted, sending project data');
    res.json(project);
  } catch (error) {
    console.error('❌ Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project (Project Manager/Admin only) - ✅ UPDATED: Include variable hours
router.post('/', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log('📝 Creating new project with data:', req.body);
    
    const {
      projectCode,
      name,
      totalHours,
      departmentHours,
      status,
      assignedEmployees,
      departments,
      startDate,
      endDate
    } = req.body;

    // ✅ UPDATED: Check if projectCode already exists
    const existingProject = await Project.findOne({ projectCode });
    if (existingProject) {
      console.log('❌ Project Code already exists:', projectCode);
      return res.status(400).json({ message: 'Project Code already exists' });
    }

    console.log('✅ Project Code validation passed');

    // ✅ ADDED: Validate department hours allocation
    if (!departmentHours || !Array.isArray(departmentHours) || departmentHours.length === 0) {
      console.log('❌ Department hours allocation required');
      return res.status(400).json({ message: 'Department hours allocation is required' });
    }

    // ✅ UPDATED: Calculate total allocated hours including variable hours
    const totalAllocatedHours = departmentHours.reduce((sum, dept) => 
      sum + dept.allocatedHours + (dept.variableHours || 0), 0
    );
    console.log(`📊 Total allocated + variable hours: ${totalAllocatedHours}, Project total hours: ${totalHours}`);

    if (totalAllocatedHours > totalHours) {
      console.log('❌ Department hours (allocated + variable) exceed total project hours');
      return res.status(400).json({ 
        message: 'Sum of department allocated + variable hours cannot exceed total project hours' 
      });
    }

    // ✅ UPDATED: Create project with variable hours support
    const newProject = new Project({
      projectCode,
      name,
      totalHours: parseInt(totalHours),
      departmentHours: departmentHours.map(dept => ({
        department: dept.department,
        allocatedHours: parseInt(dept.allocatedHours),
        variableHours: parseInt(dept.variableHours) || 0, // ✅ ADDED: Variable hours
        consumedHours: 0
      })),
      status: status || 'active',
      assignedEmployees: assignedEmployees || [],
      departments: departments || [],
      startDate: startDate || null,
      endDate: endDate || null
    });

    console.log('💾 Saving new project to database...');
    await newProject.save();
    
    // Populate the response
    const populatedProject = await Project.findById(newProject._id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');

    console.log('🎉 Project created successfully:', populatedProject._id);

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });

  } catch (error) {
    console.error('❌ Create project error:', error);
    
    // ✅ IMPROVED: Better error handling for duplicate key
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error(`❌ Duplicate ${field}: ${error.keyValue[field]}`);
      return res.status(400).json({ 
        message: `${field} already exists: ${error.keyValue[field]}` 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error creating project',
      error: error.message 
    });
  }
});

// Update project (Project Manager/Admin only) - ✅ UPDATED: Include variable hours
router.put('/:id', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`📝 Updating project ${req.params.id} with data:`, req.body);
    
    // ✅ UPDATED: Include variable hours in update data
    const updateData = {
      projectCode: req.body.projectCode,
      name: req.body.name,
      totalHours: parseInt(req.body.totalHours),
      departmentHours: req.body.departmentHours ? req.body.departmentHours.map(dept => ({
        department: dept.department,
        allocatedHours: parseInt(dept.allocatedHours),
        variableHours: parseInt(dept.variableHours) || 0, // ✅ ADDED: Variable hours
        consumedHours: parseInt(dept.consumedHours) || 0
      })) : undefined,
      status: req.body.status,
      assignedEmployees: req.body.assignedEmployees,
      departments: req.body.departments,
      startDate: req.body.startDate,
      endDate: req.body.endDate
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('📋 Final update data:', updateData);

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedEmployees', 'firstName lastName employeeId department');

    if (!updatedProject) {
      console.log('❌ Project not found for update');
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('✅ Project updated successfully');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('❌ Update project error:', error);
    
    // ✅ ADDED: Handle duplicate key errors in update
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error(`❌ Duplicate ${field}: ${error.keyValue[field]}`);
      return res.status(400).json({ 
        message: `${field} already exists: ${error.keyValue[field]}` 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error updating project',
      error: error.message 
    });
  }
});

// ✅ ADDED: Add variable hours to project (for admin to extend hours)
router.patch('/:id/add-variable-hours', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`➕ Adding variable hours to project ${req.params.id}:`, req.body);
    
    const { department, variableHours } = req.body;
    
    if (!department || !variableHours || variableHours <= 0) {
      console.log('❌ Invalid variable hours data');
      return res.status(400).json({ 
        message: 'Department and positive variable hours are required' 
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      console.log('❌ Project not found');
      return res.status(404).json({ message: 'Project not found' });
    }

    // Add variable hours using the model method
    await project.addVariableHours(department, parseInt(variableHours));
    
    // Get updated project
    const updatedProject = await Project.findById(req.params.id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');

    console.log('✅ Variable hours added successfully');

    res.json({
      message: `Successfully added ${variableHours} variable hours to ${department}`,
      project: updatedProject
    });
  } catch (error) {
    console.error('❌ Add variable hours error:', error);
    res.status(500).json({ 
      message: 'Server error adding variable hours',
      error: error.message 
    });
  }
});

// ✅ ADDED: Export project to Excel
router.get('/:id/export-excel', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`📊 Exporting project ${req.params.id} to Excel`);
    
    const project = await Project.findById(req.params.id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');
    
    if (!project) {
      console.log('❌ Project not found for export');
      return res.status(404).json({ message: 'Project not found' });
    }

    // For now, return a simple CSV as placeholder
    // You can implement proper Excel generation later
    const csvData = generateProjectCSV(project);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}_report.csv"`);
    res.send(csvData);
    
    console.log('✅ Project exported successfully');
  } catch (error) {
    console.error('❌ Export project error:', error);
    res.status(500).json({ 
      message: 'Server error exporting project',
      error: error.message 
    });
  }
});

// ✅ ADDED: Export all projects to Excel
router.get('/export-excel', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log('📊 Exporting all projects to Excel');
    
    const projects = await Project.find()
      .populate('assignedEmployees', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });

    // For now, return a simple CSV as placeholder
    const csvData = generateAllProjectsCSV(projects);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="all_projects_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvData);
    
    console.log(`✅ Exported ${projects.length} projects successfully`);
  } catch (error) {
    console.error('❌ Export all projects error:', error);
    res.status(500).json({ 
      message: 'Server error exporting projects',
      error: error.message 
    });
  }
});

// ✅ ADDED: Helper function to generate CSV for single project
function generateProjectCSV(project) {
  const headers = ['Project Code', 'Project Name', 'Status', 'Total Hours', 'Allocated Hours', 'Variable Hours', 'Consumed Hours', 'Balance Hours', 'Departments', 'Assigned Employees'];
  
  const totalAllocated = project.departmentHours.reduce((sum, dept) => sum + dept.allocatedHours, 0);
  const totalVariable = project.departmentHours.reduce((sum, dept) => sum + dept.variableHours, 0);
  const totalConsumed = project.departmentHours.reduce((sum, dept) => sum + dept.consumedHours, 0);
  const totalAvailable = totalAllocated + totalVariable;
  const balanceHours = Math.max(0, totalAvailable - totalConsumed);
  
  const departments = project.departments.join(', ');
  const assignedEmployees = project.assignedEmployees.map(emp => 
    `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
  ).join(', ');
  
  const row = [
    project.projectCode,
    project.name,
    project.status,
    project.totalHours,
    totalAllocated,
    totalVariable,
    totalConsumed,
    balanceHours,
    departments,
    assignedEmployees
  ];
  
  return [headers, row].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

// ✅ ADDED: Helper function to generate CSV for all projects
function generateAllProjectsCSV(projects) {
  const headers = ['Project Code', 'Project Name', 'Status', 'Total Hours', 'Allocated Hours', 'Variable Hours', 'Consumed Hours', 'Balance Hours', 'Progress %', 'Departments', 'Employee Count'];
  
  const rows = projects.map(project => {
    const totalAllocated = project.departmentHours.reduce((sum, dept) => sum + dept.allocatedHours, 0);
    const totalVariable = project.departmentHours.reduce((sum, dept) => sum + dept.variableHours, 0);
    const totalConsumed = project.departmentHours.reduce((sum, dept) => sum + dept.consumedHours, 0);
    const totalAvailable = totalAllocated + totalVariable;
    const balanceHours = Math.max(0, totalAvailable - totalConsumed);
    const progress = totalAvailable > 0 ? ((totalConsumed / totalAvailable) * 100).toFixed(1) : 0;
    
    const departments = project.departments.join(', ');
    const employeeCount = project.assignedEmployees.length;
    
    return [
      project.projectCode,
      project.name,
      project.status,
      project.totalHours,
      totalAllocated,
      totalVariable,
      totalConsumed,
      balanceHours,
      progress,
      departments,
      employeeCount
    ];
  });
  
  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

// Delete project (Project Manager/Admin only) - ✅ CHANGED AUTHORIZATION
router.delete('/:id', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`🗑️ Deleting project: ${req.params.id}`);
    
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      console.log('❌ Project not found for deletion');
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('✅ Project deleted successfully');
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;