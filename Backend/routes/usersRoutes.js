import express from 'express';
import User from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';
import { hashPassword } from '../utils/auth.js';

const router = express.Router();

// ✅ ADDED: Manager or Admin authorization middleware
const authorizeManagerOrAdmin = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'project_manager' || req.user.role === 'manager') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Manager or admin role required.' });
  }
};

// Get all users (Admin and Manager only) - ✅ UPDATED AUTHORIZATION
router.get('/', authenticate, authorizeManagerOrAdmin, async (req, res) => {
  try {
    const { department, role, status } = req.query;
    
    let filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter)
      .select('-passwordHash')
      .populate({
        path: 'teamLeader',
        select: 'employeeId firstName lastName'
      })
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ ADDED: Get team leaders by department
router.get('/team-leaders/:department', authenticate, authorizeManagerOrAdmin, async (req, res) => {
  try {
    const { department } = req.params;
    
    if (!department) {
      return res.status(400).json({ message: 'Department is required' });
    }

    // Get active users from the same department who can be team leaders
    const teamLeaders = await User.find({
      department: department,
      status: 'active',
      $or: [
        { role: 'project_manager' },
        { role: 'admin' },
        { role: 'employee' }
      ]
    })
    .select('employeeId firstName lastName email role department designation')
    .sort({ firstName: 1 });

    res.json(teamLeaders);
  } catch (error) {
    console.error('Get team leaders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (Admin only) - keep as admin only for security
router.get('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate({
        path: 'teamLeader',
        select: 'employeeId firstName lastName email role department'
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (Admin only) - keep as admin only
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
      password,
      teamLeader // ✅ ADDED: Team leader field
    } = req.body;

    // Validation
    if (!employeeId || !username || !password || !role) {
      return res.status(400).json({ 
        message: 'Employee ID, username, password, and role are required' 
      });
    }
    

    if (typeof employeeId !== 'string' || typeof username !== 'string') {
      return res.status(400).json({ message: 'Invalid input format' });
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
    if (password.length < 4) {
      return res.status(400).json({ message: 'Password too short' });
    }

    // ✅ ADDED: Validate team leader if provided
    if (teamLeader) {
      const teamLeaderUser = await User.findById(teamLeader);
      if (!teamLeaderUser) {
        return res.status(400).json({ message: 'Team leader not found' });
      }
      
      // Optional: Check if team leader is in same department
      if (department && teamLeaderUser.department !== department) {
        return res.status(400).json({ 
          message: 'Team leader must be from the same department' 
        });
      }
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
      teamLeader: teamLeader || null, // ✅ ADDED
      joinDate: joinDate ? new Date(joinDate) : undefined,
      passwordHash,
      status: 'active'
    });

    await newUser.save();

    // Populate team leader info in response
    const populatedUser = await User.findById(newUser._id)
      .select('-passwordHash')
      .populate({
        path: 'teamLeader',
        select: 'employeeId firstName lastName'
      });

    res.status(201).json({
      message: 'User created successfully',
      user: populatedUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Employee ID or username already exists' 
      });
    }
    
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update user (Admin only) - keep as admin only
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log('=== UPDATE USER REQUEST ===');
    console.log('User ID:', req.params.id);
    console.log('Request body:', req.body);

    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      department,
      joinDate,
      status,
      employeeId,
      username,
      teamLeader // ✅ ADDED: Team leader field
    } = req.body;

    // Check if user exists
    const existingUser = await User.findById(req.params.id);
    console.log('Existing user:', existingUser);
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare update data
    const updateData = {
      firstName: firstName || existingUser.firstName,
      lastName: lastName || existingUser.lastName,
      email: email || existingUser.email,
      phone: phone || existingUser.phone,
      role: role || existingUser.role,
      department: department || existingUser.department,
      status: status || existingUser.status,
      teamLeader: teamLeader !== undefined ? teamLeader : existingUser.teamLeader // ✅ ADDED
    };

    // Handle joinDate separately
    if (joinDate) {
      updateData.joinDate = new Date(joinDate);
    }

    // ✅ ADDED: Validate team leader if provided
    if (teamLeader !== undefined) {
      if (teamLeader === null || teamLeader === '') {
        updateData.teamLeader = null;
      } else if (teamLeader) {
        const teamLeaderUser = await User.findById(teamLeader);
        if (!teamLeaderUser) {
          return res.status(400).json({ message: 'Team leader not found' });
        }
        
        // Optional: Check if team leader is in same department
        if (updateData.department && teamLeaderUser.department !== updateData.department) {
          return res.status(400).json({ 
            message: 'Team leader must be from the same department' 
          });
        }
        
        // Prevent self-referencing
        if (teamLeader === req.params.id) {
          return res.status(400).json({ 
            message: 'User cannot be their own team leader' 
          });
        }
      }
    }

    // Check if employeeId is being changed
    if (employeeId && employeeId !== existingUser.employeeId) {
      const employeeIdExists = await User.findOne({ 
        employeeId, 
        _id: { $ne: req.params.id } 
      });
      if (employeeIdExists) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
      updateData.employeeId = employeeId;
    }

    // Check if username is being changed
    if (username && username !== existingUser.username) {
      const usernameExists = await User.findOne({ 
        username, 
        _id: { $ne: req.params.id } 
      });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      updateData.username = username;
    }

    console.log('Final update data:', updateData);

    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    )
    .select('-passwordHash')
    .populate({
      path: 'teamLeader',
      select: 'employeeId firstName lastName'
    });

    console.log('Updated user result:', updatedUser);

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field} already exists` 
      });
    }
    
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update user password (Admin only) - keep as admin only
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

// Delete user (Admin only) - keep as admin only
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    // ✅ ADDED: Check if user is a team leader for other users
    const isTeamLeader = await User.findOne({ teamLeader: req.params.id });
    if (isTeamLeader) {
      return res.status(400).json({ 
        message: 'Cannot delete user. This user is a team leader for other employees. Please reassign team members first.' 
      });
    }

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

// Get users by department (Authenticated users only)
router.get('/department/:department', authenticate, async (req, res) => {
  try {
    const users = await User.find({ 
      department: req.params.department,
      status: 'active'
    })
    .select('firstName lastName employeeId role department teamLeader')
    .populate({
      path: 'teamLeader',
      select: 'firstName lastName employeeId'
    })
    .sort({ firstName: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users by department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ ADDED: Get team members for a team leader
router.get('/team-leader/:teamLeaderId/members', authenticate, authorizeManagerOrAdmin, async (req, res) => {
  try {
    const { teamLeaderId } = req.params;
    
    // Check if team leader exists
    const teamLeader = await User.findById(teamLeaderId);
    if (!teamLeader) {
      return res.status(404).json({ message: 'Team leader not found' });
    }

    const teamMembers = await User.find({ 
      teamLeader: teamLeaderId,
      status: 'active'
    })
    .select('employeeId firstName lastName email department designation joinDate')
    .sort({ firstName: 1 });

    res.json({
      teamLeader: {
        id: teamLeader._id,
        name: `${teamLeader.firstName} ${teamLeader.lastName}`,
        employeeId: teamLeader.employeeId,
        department: teamLeader.department
      },
      teamMembers,
      count: teamMembers.length
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics (Admin only) - keep as admin only
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

    // ✅ ADDED: Team leader statistics
    const usersWithTeamLeader = await User.countDocuments({ 
      teamLeader: { $ne: null } 
    });
    
    const teamLeadersCount = await User.aggregate([
      { 
        $group: { 
          _id: '$teamLeader',
          memberCount: { $sum: 1 }
        }
      },
      { 
        $match: { 
          _id: { $ne: null }
        }
      },
      {
        $count: 'totalTeamLeaders'
      }
    ]);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersWithTeamLeader,
      teamLeadersCount: teamLeadersCount[0]?.totalTeamLeaders || 0,
      usersByRole,
      usersByDepartment
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ ADDED: Bulk update team leaders
router.post('/bulk-update-team-leader', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { userIds, teamLeaderId } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    // Check if team leader exists if provided
    if (teamLeaderId) {
      const teamLeader = await User.findById(teamLeaderId);
      if (!teamLeader) {
        return res.status(404).json({ message: 'Team leader not found' });
      }
    }

    // Update all users
    const updateResult = await User.updateMany(
      { _id: { $in: userIds } },
      { teamLeader: teamLeaderId || null }
    );

    res.json({
      message: `Updated team leader for ${updateResult.modifiedCount} users`,
      modifiedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update team leader error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;