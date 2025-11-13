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

// Create new project (Project Manager/Admin only) - ✅ CHANGED AUTHORIZATION & UPDATED LOGIC
router.post('/', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log('📝 Creating new project with data:', req.body);
    
    const {
      plNo,           // ✅ CHANGED: from projectCode to plNo
      name,
      totalHours,
      departmentHours, // ✅ ADDED: Department hours allocation
      status,
      assignedEmployees,
      departments,
      startDate,
      endDate
    } = req.body;

    // ✅ UPDATED: Check if PL No already exists
    const existingProject = await Project.findOne({ plNo });
    if (existingProject) {
      console.log('❌ PL Number already exists:', plNo);
      return res.status(400).json({ message: 'PL Number already exists' });
    }

    console.log('✅ PL Number validation passed');

    // ✅ ADDED: Validate department hours allocation
    if (!departmentHours || !Array.isArray(departmentHours) || departmentHours.length === 0) {
      console.log('❌ Department hours allocation required');
      return res.status(400).json({ message: 'Department hours allocation is required' });
    }

    const totalAllocatedHours = departmentHours.reduce((sum, dept) => sum + dept.allocatedHours, 0);
    console.log(`📊 Total allocated hours: ${totalAllocatedHours}, Project total hours: ${totalHours}`);

    if (totalAllocatedHours > totalHours) {
      console.log('❌ Department hours exceed total project hours');
      return res.status(400).json({ 
        message: 'Sum of department allocated hours cannot exceed total project hours' 
      });
    }

    // ✅ UPDATED: Create project with new schema
    const newProject = new Project({
      plNo,
      name,
      totalHours: parseInt(totalHours),
      departmentHours: departmentHours.map(dept => ({
        department: dept.department,
        allocatedHours: parseInt(dept.allocatedHours),
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
    res.status(500).json({ 
      message: 'Server error creating project',
      error: error.message 
    });
  }
});

// Update project (Project Manager/Admin only) - ✅ CHANGED AUTHORIZATION & UPDATED LOGIC
router.put('/:id', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`📝 Updating project ${req.params.id} with data:`, req.body);
    
    // ✅ UPDATED: Only allow specific fields to be updated
    const updateData = {
      plNo: req.body.plNo,
      name: req.body.name,
      totalHours: parseInt(req.body.totalHours),
      departmentHours: req.body.departmentHours ? req.body.departmentHours.map(dept => ({
        department: dept.department,
        allocatedHours: parseInt(dept.allocatedHours),
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
    res.status(500).json({ 
      message: 'Server error updating project',
      error: error.message 
    });
  }
});

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