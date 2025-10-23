import express from 'express';

// Load environment variables at the VERY TOP
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectsRoutes from './routes/projectsRoutes.js';
import timesheetsRoutes from './routes/timesheetsRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import activityCodesRoutes from './routes/activityCodesRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import connectDB from './mongoDB.js';
import { authenticate, authorizeAdmin } from './middleware/authMiddleware.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test if environment variables are loading
console.log('🔧 Environment check:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('MONGO_URI loaded:', !!process.env.MONGO_URI);

// Use the new MongoDB connection file
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/timesheets', timesheetsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activity-codes', activityCodesRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Timesheet Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// Example protected route (accessible by any authenticated user)
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ 
    message: `Welcome ${req.user.username}`,
    user: req.user
  });
});

// Example admin-only route
app.get('/api/admin-only', authenticate, authorizeAdmin, (req, res) => {
  res.json({ 
    message: `Welcome Admin ${req.user.username}`,
    adminAccess: true
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📊 Available API Routes:');
  console.log('   - /api/auth/* (Authentication)');
  console.log('   - /api/projects/* (Project Management)');
  console.log('   - /api/timesheets/* (Timesheet Management)');
  console.log('   - /api/users/* (User Management)');
  console.log('   - /api/activity-codes/* (Activity Codes)');
  console.log('   - /api/health (Health Check)');
});
/*
// Load environment variables at the VERY TOP
import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Environment check:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('MONGO_URI loaded:', !!process.env.MONGO_URI);
console.log('USE_MOCK_DB:', process.env.USE_MOCK_DB);

import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from './routes/authRoutes.js';
import projectsRoutes from './routes/projectsRoutes.js';
import timesheetsRoutes from './routes/timesheetsRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import activityCodesRoutes from './routes/activityCodesRoutes.js';

// Import mock data
import { mockUsers, mockProjects, mockActivityCodes } from './mockData.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check if we should use mock database
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

if (!USE_MOCK_DB) {
  // Try to connect to real MongoDB
  try {
    import('./mongoDB.js').then(module => {
      module.default();
    });
    console.log('🔗 Attempting to connect to MongoDB...');
  } catch (error) {
    console.log('❌ MongoDB connection failed, but continuing with mock data...');
  }
} else {
  console.log('✅ Using MOCK database for testing');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/timesheets', timesheetsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activity-codes', activityCodesRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Timesheet Management System API is running',
    mode: USE_MOCK_DB ? 'MOCK_DB' : 'REAL_DB',
    timestamp: new Date().toISOString()
  });
});

// Mock data test endpoint
app.get('/api/mock-test', (req, res) => {
  res.json({
    message: 'Mock database is working!',
    users: mockUsers.length,
    projects: mockProjects.length,
    activityCodes: mockActivityCodes.length,
    availableUsers: mockUsers.map(user => ({
      username: user.username,
      password: 'anypassword', // For testing
      role: user.role
    }))
  });
});

// Quick setup endpoint - creates initial data
app.get('/api/setup', (req, res) => {
  res.json({
    message: 'System is ready for testing!',
    testCredentials: [
      {
        username: 'admin',
        password: 'anypassword',
        role: 'admin'
      },
      {
        username: 'keshav.mane', 
        password: 'anypassword',
        role: 'employee'
      },
      {
        username: 'jane.smith',
        password: 'anypassword',
        role: 'manager'
      }
    ],
    endpoints: [
      'POST /api/auth/login - Login with any username/password',
      'GET /api/users - Get all users (requires admin token)',
      'GET /api/projects - Get all projects',
      'GET /api/activity-codes - Get activity codes'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${USE_MOCK_DB ? 'MOCK' : 'REAL'}`);
  console.log('🔗 Test URLs:');
  console.log(`   http://localhost:${PORT}/api/health`);
  console.log(`   http://localhost:${PORT}/api/mock-test`);
  console.log(`   http://localhost:${PORT}/api/setup`);
  console.log('');
  console.log('🔐 Test Credentials:');
  console.log('   Username: admin, Password: anypassword (Admin)');
  console.log('   Username: keshav.mane, Password: anypassword (Employee)');
  console.log('   Username: jane.smith, Password: anypassword (Manager)');
});*/