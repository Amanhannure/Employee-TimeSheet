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
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

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
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const user = await User.findOne({ username: username.toString(), status: 'active' });

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
    res.status(500).json({ message: 'Server error' });
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
/*
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { mockUsers } from '../mockData.js';

// Check if we're using mock database
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

// Mock database simulation
class MockUserDB {
  constructor() {
    this.users = [...mockUsers];
  }

  findUser(query) {
    return this.users.find(user => 
      user.username === query.username || 
      user.employeeId === query.employeeId
    );
  }

  findUserById(id) {
    return this.users.find(user => user._id === id);
  }

  createUser(userData) {
    const newUser = {
      _id: (this.users.length + 1).toString(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }
}

const mockUserDB = new MockUserDB();

// Register a new admin
export const registerAdmin = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, employeeId } = req.body;

    // Validation
    if (!username || !password || !employeeId) {
      return res.status(400).json({ message: 'Username, password, and employeeId are required' });
    }

    let existingUser;
    
    if (USE_MOCK_DB) {
      // Check in mock database
      existingUser = mockUserDB.findUser({ username });
    } else {
      // Check in real MongoDB (commented out for now)
      // existingUser = await User.findOne({ $or: [{ username }, { employeeId }] });
    }

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Employee ID already exists' 
      });
    }

    let newUser;

    if (USE_MOCK_DB) {
      // Create in mock database
      const passwordHash = await hashPassword(password);
      newUser = mockUserDB.createUser({ 
        username, 
        email, 
        firstName,
        lastName,
        employeeId,
        passwordHash, 
        role: 'admin',
        status: 'active'
      });
    } else {
      // Create in real MongoDB (commented out for now)
      // const passwordHash = await hashPassword(password);
      // newUser = new User({ ... });
      // await newUser.save();
    }

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

    let user;

    if (USE_MOCK_DB) {
      // Use mock database
      console.log(`🔐 Login attempt for username: ${username}`);
      user = mockUserDB.findUser({ username });
      
      // For mock mode, accept any password for testing
      if (user) {
        console.log(`✅ User found: ${user.firstName} ${user.lastName} (${user.role})`);
        // In real app: const validPassword = await comparePassword(password, user.passwordHash);
        const validPassword = true; // Always true for mock mode
        
        if (!validPassword) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
      } else {
        console.log(`❌ User not found: ${username}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      // Use real MongoDB (commented out for now)
      // user = await User.findOne({ username, status: 'active' });
      // if (!user) {
      //   return res.status(401).json({ message: 'Invalid credentials' });
      // }
      // const validPassword = await comparePassword(password, user.passwordHash);
      // if (!validPassword) {
      //   return res.status(401).json({ message: 'Invalid credentials' });
      // }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    console.log(`🎉 Login successful for: ${user.firstName} ${user.lastName}`);

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

    let user;

    if (USE_MOCK_DB) {
      user = mockUserDB.findUser({ username });

      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }

      // For mock mode, accept any password
      const validPassword = true;
      
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }
    } else {
      // Real MongoDB logic (commented out)
      // user = await User.findOne({ username, status: 'active' });
      // if (!user || user.role !== 'admin') {
      //   return res.status(401).json({ message: 'Invalid admin credentials' });
      // }
      // const validPassword = await comparePassword(password, user.passwordHash);
      // if (!validPassword) {
      //   return res.status(401).json({ message: 'Invalid admin credentials' });
      // }
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
    let user;

    if (USE_MOCK_DB) {
      user = mockUserDB.findUserById(req.user.id);
    } else {
      // Real MongoDB logic
      // user = await User.findById(req.user.id).select('-passwordHash');
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};*/