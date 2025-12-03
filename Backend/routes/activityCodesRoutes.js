import express from 'express';
import ActivityCode from '../models/ActivityCode.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all activity codes
router.get('/', authenticate, async (req, res) => {
  try {
    const { department } = req.query;
    
    let filter = {};
    if (department) filter.department = department;

    const activityCodes = await ActivityCode.find(filter).sort({ department: 1, code: 1 });

    res.json(activityCodes);
  } catch (error) {
    console.error('Get activity codes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get activity codes by department
router.get('/department/:department', authenticate, async (req, res) => {
  try {
    const activityCodes = await ActivityCode.find({ 
      department: req.params.department 
    }).sort({ code: 1 });

    res.json(activityCodes);
  } catch (error) {
    console.error('Get activity codes by department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single activity code
router.get('/:id', authenticate, async (req, res) => {
  try {
    const activityCode = await ActivityCode.findById(req.params.id);
    
    if (!activityCode) {
      return res.status(404).json({ message: 'Activity code not found' });
    }

    res.json(activityCode);
  } catch (error) {
    console.error('Get activity code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create activity code (Admin only)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { code, name, description, department } = req.body;

    // Validation
    if (!code || !name || !department) {
      return res.status(400).json({ message: 'Code, name, and department are required' });
    }

    // Check if activity code already exists in the SAME department
    // Same code numbers are allowed in DIFFERENT departments
    const existingCode = await ActivityCode.findOne({ code, department });
    if (existingCode) {
      return res.status(400).json({ 
        message: 'Activity code already exists for this department.' 
      });
    }

    const newActivityCode = new ActivityCode({
      code,
      name,
      description,
      department
    });

    await newActivityCode.save();

    res.status(201).json({
      message: 'Activity code created successfully',
      activityCode: newActivityCode
    });
  } catch (error) {
    console.error('Create activity code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update activity code (Admin only)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { code, name, description, department } = req.body;

    // Check if code already exists in the SAME department (excluding current one)
    // Same code numbers are allowed in DIFFERENT departments
    if (code && department) {
      const existingCode = await ActivityCode.findOne({ 
        code, 
        department,
        _id: { $ne: req.params.id }
      });
      
      if (existingCode) {
        return res.status(400).json({ 
          message: 'Activity code already exists for this department.' 
        });
      }
    }

    const updatedActivityCode = await ActivityCode.findByIdAndUpdate(
      req.params.id,
      { code, name, description, department },
      { new: true, runValidators: true }
    );

    if (!updatedActivityCode) {
      return res.status(404).json({ message: 'Activity code not found' });
    }

    res.json({
      message: 'Activity code updated successfully',
      activityCode: updatedActivityCode
    });
  } catch (error) {
    console.error('Update activity code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete activity code (Admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const activityCode = await ActivityCode.findByIdAndDelete(req.params.id);
    
    if (!activityCode) {
      return res.status(404).json({ message: 'Activity code not found' });
    }

    res.json({ message: 'Activity code deleted successfully' });
  } catch (error) {
    console.error('Delete activity code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk create activity codes (Admin only) - for initial setup
router.post('/bulk', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { activityCodes } = req.body;

    if (!activityCodes || !Array.isArray(activityCodes)) {
      return res.status(400).json({ message: 'Activity codes array is required' });
    }

    // Validate each activity code
    for (const code of activityCodes) {
      if (!code.code || !code.name || !code.department) {
        return res.status(400).json({ 
          message: 'Each activity code must have code, name, and department' 
        });
      }
    }

    // Check for duplicates in the request (same code + same department)
    const codeMap = new Map();
    for (const code of activityCodes) {
      const key = `${code.code}-${code.department}`;
      if (codeMap.has(key)) {
        return res.status(400).json({ 
          message: `Duplicate activity code: ${code.code} for department ${code.department}.` 
        });
      }
      codeMap.set(key, true);
    }

    // Check for existing codes in database (same code + same department)
    const existingCodes = await ActivityCode.find({
      $or: activityCodes.map(code => ({
        code: code.code,
        department: code.department
      }))
    });

    if (existingCodes.length > 0) {
      const existingList = existingCodes.map(ec => `${ec.code} (${ec.department})`).join(', ');
      return res.status(400).json({ 
        message: `Some activity codes already exist in their respective departments: ${existingList}. ` 
      });
    }

    const createdCodes = await ActivityCode.insertMany(activityCodes);

    res.status(201).json({
      message: `${createdCodes.length} activity codes created successfully`,
      activityCodes: createdCodes
    });
  } catch (error) {
    console.error('Bulk create activity codes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get departments with activity codes
router.get('/departments/list', authenticate, async (req, res) => {
  try {
    const departments = await ActivityCode.distinct('department');
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all activity codes grouped by department
router.get('/grouped/departments', authenticate, async (req, res) => {
  try {
    const activityCodes = await ActivityCode.find().sort({ department: 1, code: 1 });
    
    // Group by department to demonstrate same codes can exist in different departments
    const groupedByDepartment = activityCodes.reduce((acc, code) => {
      if (!acc[code.department]) {
        acc[code.department] = [];
      }
      acc[code.department].push(code);
      return acc;
    }, {});

    res.json(groupedByDepartment);
  } catch (error) {
    console.error('Get grouped activity codes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;