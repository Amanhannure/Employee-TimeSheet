import express from 'express';
import User from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';
import { hashPassword } from '../utils/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { department, role, status } = req.query;
    
    let filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (Admin only)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      username,
      email,
      phone,
      role,
      department,
      joinDate,
      password
    } = req.body;

    // Validation
    if (!employeeId || !username || !password || !role) {
      return res.status(400).json({ 
        message: 'Employee ID, username, password, and role are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { employeeId }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Employee ID already exists' 
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    const newUser = new User({
      employeeId,
      firstName,
      lastName,
      username,
      email,
      phone,
      role,
      department,
      joinDate: joinDate ? new Date(joinDate) : undefined,
      passwordHash,
      status: 'active'
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        employeeId: newUser.employeeId,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        department: newUser.department,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (Admin only)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      department,
      joinDate,
      status
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName,
        lastName,
        email,
        phone,
        role,
        department,
        joinDate: joinDate ? new Date(joinDate) : undefined,
        status
      },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user password (Admin only)
router.patch('/:id/password', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { passwordHash },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users by department
router.get('/department/:department', authenticate, async (req, res) => {
  try {
    const users = await User.find({ 
      department: req.params.department,
      status: 'active'
    })
    .select('firstName lastName employeeId role department')
    .sort({ firstName: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users by department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const inactiveUsers = await User.countDocuments({ status: 'inactive' });
    
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const usersByDepartment = await User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      usersByDepartment
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;