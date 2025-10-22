import User from '../models/User.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';

// Register a new admin
export const registerAdmin = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, employeeId } = req.body;

    // Validation
    if (!username || !password || !employeeId) {
      return res.status(400).json({ message: 'Username, password, and employeeId are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { employeeId }] });
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Employee ID already exists' 
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new admin user
    const newUser = new User({ 
      username, 
      email, 
      firstName,
      lastName,
      employeeId,
      passwordHash, 
      role: 'admin',
      status: 'active'
    });

    await newUser.save();

    res.status(201).json({ 
      message: 'Admin registered successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        employeeId: newUser.employeeId,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Register admin error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login for both admin and employee
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const user = await User.findOne({ username, status: 'active' });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await comparePassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Admin-only login (stricter check)
export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username, status: 'active' });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const validPassword = await comparePassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = generateToken(user);

    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};