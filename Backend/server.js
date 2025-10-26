import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import session from 'express-session';
import authRoutes from './routes/authRoutes.js';
import projectsRoutes from './routes/projectsRoutes.js';
import timesheetsRoutes from './routes/timesheetsRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import activityCodesRoutes from './routes/activityCodesRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import connectDB from './mongoDB.js';
import { authenticate, authorizeAdmin } from './middleware/authMiddleware.js';
import { securityHeaders } from './security/headers.js';
import { sanitizeMiddleware } from './security/sanitize.js';
import { authLimiter, apiLimiter } from './security/rateLimit.js';
import { auditLogger } from './security/auditLogger.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

const app = express();

// Environment check
console.log('🔧 Environment check:');
console.log('PORT:', process.env.PORT || '5000 (default)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Loaded' : '✗ Missing');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✓ Loaded' : '✗ Missing');

// Connect to MongoDB
connectDB();

// Middleware
app.use(securityHeaders);
app.use(sanitizeMiddleware);
app.use(cors({ 
  origin: true, // Allows all origins in development
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(auditLogger);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
// Archive old timesheets every month
const archiveJob = () => {
  const now = new Date();
  if (now.getDate() === 1) { // Run on 1st of every month
    Timesheet.archiveOldTimesheets();
  }
};

// Run on server start and schedule monthly
setInterval(archiveJob, 24 * 60 * 60 * 1000); // Daily check
archiveJob(); // Run immediately on start

// Static files
app.use('/uploads', express.static('uploads')); 

// Rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login-admin', authLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/timesheets', timesheetsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activity-codes', activityCodesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Timesheet Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});