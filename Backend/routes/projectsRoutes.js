import express from 'express';
import Project from '../models/Project.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all projects (Admin/Manager only)
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('assignedEmployees', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get projects for logged-in employee
router.get('/my-projects', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({ 
      assignedEmployees: req.user.id 
    })
    .populate('assignedEmployees', 'firstName lastName employeeId department')
    .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = req.user.role === 'admin' || 
                     project.assignedEmployees.some(emp => emp._id.toString() === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project (Admin only)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      projectCode,
      name,
      location,
      department,
      assignedEmployees,
      totalHours,
      status
    } = req.body;

    // Check if project code already exists
    const existingProject = await Project.findOne({ projectCode });
    if (existingProject) {
      return res.status(400).json({ message: 'Project code already exists' });
    }

    const newProject = new Project({
      projectCode,
      name,
      location,
      department,
      assignedEmployees,
      totalHours,
      status
    });

    await newProject.save();
    
    // Populate the response
    const populatedProject = await Project.findById(newProject._id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project (Admin only)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedEmployees', 'firstName lastName employeeId department');

    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project (Admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;