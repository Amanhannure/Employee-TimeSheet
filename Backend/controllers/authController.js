import User from '../models/User.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import crypto from 'crypto';

// Generate random code for email verification
const generateRandomCode = (length = 6) => {
  return crypto.randomInt(0, Math.pow(10, length) - 1)
    .toString()
    .padStart(length, '0');
};

// Helper function to determine role from designation
const determineRoleFromDesignation = (designation) => {
  if (!designation) return 'employee';
  
  const lowerDesignation = designation.toLowerCase();
  
  // Manager roles
  if (lowerDesignation.includes('manager') || 
      lowerDesignation.includes('head') ||
      lowerDesignation.includes('lead') ||
      lowerDesignation.includes('director')) {
    return 'manager';
  }
  
  // Admin roles (you can customize this based on your needs)
  if (lowerDesignation.includes('admin') || 
      lowerDesignation.includes('administrator') ||
      lowerDesignation.includes('system admin')) {
    return 'admin';
  }
  
  return 'employee';
};

// Register a new admin
export const registerAdmin = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, employeeId, designation, department, securityQuestion, securityAnswer } = req.body;

    // Validation
    if (!username || !password || !employeeId || !firstName || !lastName) {
      return res.status(400).json({ message: 'Username, password, employeeId, firstName, and lastName are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { employeeId }, { email }] });
    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.username === username) message = 'Username already exists';
      else if (existingUser.employeeId === employeeId) message = 'Employee ID already exists';
      else if (existingUser.email === email) message = 'Email already exists';
      
      return res.status(400).json({ message });
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
      designation,
      department,
      passwordHash, 
      role: 'admin',
      status: 'active'
    });

    // Set security question if provided
    if (securityQuestion && securityAnswer) {
      newUser.securityQuestion = securityQuestion;
      await newUser.hashSecurityAnswer(securityAnswer);
    }

    await newUser.save();

    res.status(201).json({ 
      message: 'Admin registered successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        employeeId: newUser.employeeId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        designation: newUser.designation,
        department: newUser.department,
        hasSecurityQuestion: newUser.hasSecurityQuestion()
      }
    });
  } catch (error) {
    console.error('Register admin error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Bulk register users from JSON data (Admin only)
export const bulkRegister = async (req, res) => {
  try {
    const { users } = req.body;

    // Validation
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Users array is required and must not be empty' });
    }

    if (users.length > 100) {
      return res.status(400).json({ message: 'Cannot register more than 100 users at once' });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each user
    for (const userData of users) {
      try {
        const { username, password, email, firstName, lastName, employeeId, role, designation, department, securityQuestion = "What was your first car?", securityAnswer = "Honda" } = userData;

        // Validate required fields
        if (!username || !password || !employeeId || !firstName || !lastName || !email) {
          results.failed.push({
            username: username || 'unknown',
            employeeId: employeeId || 'unknown',
            error: 'Missing required fields: username, password, employeeId, firstName, lastName, or email'
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { employeeId }, { email }] });
        if (existingUser) {
          let error = 'User already exists';
          if (existingUser.username === username) error = 'Username already exists';
          else if (existingUser.employeeId === employeeId) error = 'Employee ID already exists';
          else if (existingUser.email === email) error = 'Email already exists';

          results.failed.push({
            username,
            employeeId,
            error
          });
          continue;
        }

        // Determine role if not provided
        let userRole = role;
        if (!userRole && designation) {
          userRole = determineRoleFromDesignation(designation);
        }
        userRole = userRole || 'employee';

        // Prevent creating admins via bulk unless explicitly allowed
        if (userRole === 'admin') {
          userRole = 'employee'; // Demote to employee for bulk registration
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create new user
        const newUser = new User({
          username,
          email,
          firstName,
          lastName,
          employeeId,
          passwordHash,
          role: userRole,
          designation,
          department,
          status: 'active',
          securityQuestion
        });

        // Set security answer
        await newUser.hashSecurityAnswer(securityAnswer);

        await newUser.save();

        results.successful.push({
          id: newUser._id,
          username: newUser.username,
          employeeId: newUser.employeeId,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          designation: newUser.designation,
          department: newUser.department,
          hasSecurityQuestion: newUser.hasSecurityQuestion()
        });

      } catch (error) {
        console.error(`Error creating user ${userData.username}:`, error);
        results.failed.push({
          username: userData.username || 'unknown',
          employeeId: userData.employeeId || 'unknown',
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: `Bulk registration completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Bulk register error:', error);
    res.status(500).json({ message: 'Server error during bulk registration' });
  }
};

// Register single user (Admin only)
export const registerUser = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, employeeId, role = 'employee', designation, department, securityQuestion, securityAnswer } = req.body;

    // Validation
    if (!username || !password || !employeeId || !firstName || !lastName || !email) {
      return res.status(400).json({ message: 'Username, password, employeeId, firstName, lastName, and email are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { employeeId }, { email }] });
    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.username === username) message = 'Username already exists';
      else if (existingUser.employeeId === employeeId) message = 'Employee ID already exists';
      else if (existingUser.email === email) message = 'Email already exists';
      
      return res.status(400).json({ message });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user (prevent creating admins via this route unless super admin)
    let userRole = role;
    if (userRole === 'admin' && req.user.role !== 'admin') {
      userRole = 'employee';
    }
    
    // Determine role from designation if not provided
    if (!userRole && designation) {
      userRole = determineRoleFromDesignation(designation);
    }

    const newUser = new User({ 
      username, 
      email, 
      firstName,
      lastName,
      employeeId,
      passwordHash, 
      role: userRole,
      designation,
      department,
      status: 'active'
    });

    // Set security question if provided
    if (securityQuestion && securityAnswer) {
      newUser.securityQuestion = securityQuestion;
      await newUser.hashSecurityAnswer(securityAnswer);
    }

    await newUser.save();

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        employeeId: newUser.employeeId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        designation: newUser.designation,
        department: newUser.department,
        hasSecurityQuestion: newUser.hasSecurityQuestion()
      }
    });
  } catch (error) {
    console.error('Register user error:', error);
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

    // Find user - check all statuses except resigned
    const user = await User.findOne({ 
      username: username.toString(), 
      status: { $in: ['active', 'inactive', 'probation', 'on notice period'] } 
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is resigned
    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Account is no longer active' });
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
        designation: user.designation,
        department: user.department,
        status: user.status,
        hasSecurityQuestion: user.hasSecurityQuestion(),
        securitySetupCompleted: user.securitySetupCompleted
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

    const user = await User.findOne({ 
      username, 
      status: { $in: ['active', 'inactive', 'probation', 'on notice period'] } 
    });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Check if admin is resigned
    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Admin account is no longer active' });
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
        role: user.role,
        designation: user.designation,
        department: user.department,
        status: user.status,
        hasSecurityQuestion: user.hasSecurityQuestion()
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
    const user = await User.findById(req.user.id)
      .select('-passwordHash -securityAnswerHash -resetToken -emailVerificationCode');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, department, designation } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (designation) user.designation = designation;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        designation: user.designation,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const validPassword = await comparePassword(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    user.password = newPassword; // This will trigger the pre-save middleware
    user.lastPasswordReset = new Date();
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
};

// PASSWORD RESET CONTROLLERS - UPDATED

// Initiate password reset - handles existing users gracefully
export const initiatePasswordReset = async (req, res) => {
  try {
    const { employeeCode, username, email } = req.body;

    // Accept multiple identifiers for flexibility
    const identifier = employeeCode || username || email;
    
    if (!identifier) {
      return res.status(400).json({ message: 'Employee code, username, or email is required' });
    }

    // Find user by multiple identifiers - allow all statuses except resigned
    const user = await User.findOne({ 
      $or: [
        { employeeId: identifier },
        { username: identifier },
        { email: identifier }
      ],
      status: { $in: ['active', 'inactive', 'probation', 'on notice period'] } 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is resigned
    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Account is no longer active' });
    }

    // Check available reset methods for existing users
    const availableMethods = [];
    
    if (user.hasSecurityQuestion()) {
      availableMethods.push('security_question');
    }
    
    if (user.canResetViaEmail()) {
      availableMethods.push('email');
    }

    // Handle users with no reset methods
    if (availableMethods.length === 0) {
      return res.status(400).json({ 
        message: 'No password reset methods available. Please contact administrator.',
        contactAdmin: true,
        availableMethods: []
      });
    }

    // For single method, auto-proceed
    if (availableMethods.length === 1) {
      const method = availableMethods[0];
      const response = {
        message: 'Reset method available',
        autoProceed: true,
        method: method,
        availableMethods: availableMethods,
        user: {
          id: user._id,
          employeeId: user.employeeId,
          firstName: user.firstName,
          lastName: user.lastName,
          hasSecurityQuestion: user.hasSecurityQuestion(),
          securityQuestion: user.securityQuestion,
          maskedEmail: user.email ? user.email.replace(/(.{2})(.*)(?=@)/, 
            (match, start, middle) => start + '*'.repeat(middle.length)) : null
        }
      };

      // Auto-send email code if that's the only method
      if (method === 'email') {
        const emailCode = user.generateEmailCode();
        await user.save();
        
        // TODO: Implement actual email service
        console.log(`📧 Email verification code for ${user.email}: ${emailCode}`);
        
        response.message = 'Verification code sent to your email';
        response.emailCode = emailCode; // For development only
      }

      return res.json(response);
    }

    // Multiple methods available
    res.json({
      message: 'Reset methods available',
      availableMethods,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        hasSecurityQuestion: user.hasSecurityQuestion(),
        securityQuestion: user.securityQuestion,
        maskedEmail: user.email ? user.email.replace(/(.{2})(.*)(?=@)/, 
          (match, start, middle) => start + '*'.repeat(middle.length)) : null
      }
    });

  } catch (error) {
    console.error('Initiate password reset error:', error);
    res.status(500).json({ message: 'Server error during password reset initiation' });
  }
};

// Verify security answer
export const verifySecurityAnswer = async (req, res) => {
  try {
    const { employeeCode, securityAnswer } = req.body;

    if (!employeeCode || !securityAnswer) {
      return res.status(400).json({ message: 'Employee code and security answer are required' });
    }

    const user = await User.findOne({ 
      employeeId: employeeCode, 
      status: { $in: ['active', 'inactive', 'probation', 'on notice period'] } 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Account is no longer active' });
    }

    if (!user.hasSecurityQuestion()) {
      return res.status(400).json({ message: 'Security question not set up for this user' });
    }

    // Verify security answer
    const isValidAnswer = await user.verifySecurityAnswer(securityAnswer);
    
    if (!isValidAnswer) {
      return res.status(401).json({ message: 'Incorrect security answer' });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save();

    res.json({
      message: 'Security answer verified successfully',
      resetToken,
      resetMethod: 'security_question'
    });

  } catch (error) {
    console.error('Verify security answer error:', error);
    res.status(500).json({ message: 'Server error during security verification' });
  }
};

// Send email verification code
export const sendEmailCode = async (req, res) => {
  try {
    const { employeeCode } = req.body;

    if (!employeeCode) {
      return res.status(400).json({ message: 'Employee code is required' });
    }

    const user = await User.findOne({ 
      employeeId: employeeCode, 
      status: { $in: ['active', 'inactive', 'probation', 'on notice period'] } 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Account is no longer active' });
    }

    if (!user.canResetViaEmail()) {
      return res.status(400).json({ message: 'No email associated with this account' });
    }

    // Generate email verification code
    const emailCode = user.generateEmailCode();
    await user.save();

    // TODO: Integrate with your email service
    console.log(`📧 Email verification code for ${user.email}: ${emailCode}`);
    
    // In production, send actual email:
    // await emailService.sendVerificationCode(user.email, emailCode, user.employeeId);

    res.json({
      message: 'Verification code sent to your email',
      maskedEmail: user.email.replace(/(.{2})(.*)(?=@)/, 
        (match, start, middle) => start + '*'.repeat(middle.length)),
      resetMethod: 'email',
      emailCode: emailCode // For development only - remove in production
    });

  } catch (error) {
    console.error('Send email code error:', error);
    res.status(500).json({ message: 'Server error sending verification code' });
  }
};

// Verify email code
export const verifyEmailCode = async (req, res) => {
  try {
    const { employeeCode, emailCode } = req.body;

    if (!employeeCode || !emailCode) {
      return res.status(400).json({ message: 'Employee code and verification code are required' });
    }

    const user = await User.findOne({ 
      employeeId: employeeCode, 
      status: { $in: ['active', 'inactive', 'probation', 'on notice period'] } 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Account is no longer active' });
    }

    // Check if code is valid and not expired
    if (!user.isEmailCodeValid()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (user.emailVerificationCode !== emailCode) {
      return res.status(401).json({ message: 'Invalid verification code' });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    user.emailVerificationCode = null;
    user.emailCodeExpiry = null;
    await user.save();

    res.json({
      message: 'Email verification successful',
      resetToken,
      resetMethod: 'email'
    });

  } catch (error) {
    console.error('Verify email code error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

// Reset password with valid reset token
export const resetPassword = async (req, res) => {
  try {
    const { employeeCode, resetToken, newPassword } = req.body;

    if (!employeeCode || !resetToken || !newPassword) {
      return res.status(400).json({ 
        message: 'Employee code, reset token, and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findOne({ 
      employeeId: employeeCode, 
      status: { $in: ['active', 'inactive', 'probation', 'on notice period'] } 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === 'resigned') {
      return res.status(401).json({ message: 'Account is no longer active' });
    }

    // Verify reset token
    if (!user.isResetTokenValid() || user.resetToken !== resetToken) {
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password (pre-save middleware will hash it)
    user.password = newPassword;
    user.lastPasswordReset = new Date();
    user.clearResetTokens();
    await user.save();

    // TODO: Send success email
    // await emailService.sendPasswordResetSuccess(user.email, user.employeeId);

    res.json({
      message: 'Password reset successfully',
      reset: true
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// Setup security question (for existing users)
export const setupSecurityQuestion = async (req, res) => {
  try {
    const { securityQuestion, securityAnswer } = req.body;
    const userId = req.user.id;

    if (!securityQuestion || !securityAnswer) {
      return res.status(400).json({ 
        message: 'Security question and answer are required' 
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set security question and hash the answer
    user.securityQuestion = securityQuestion;
    await user.hashSecurityAnswer(securityAnswer);
    await user.save();

    res.json({
      message: 'Security question set up successfully',
      securityQuestionSet: true
    });

  } catch (error) {
    console.error('Setup security question error:', error);
    res.status(500).json({ message: 'Server error setting up security question' });
  }
};

// Check if user needs security setup
export const checkSecuritySetup = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      needsSecuritySetup: !user.securitySetupCompleted,
      hasSecurityQuestion: user.hasSecurityQuestion(),
      hasEmail: user.canResetViaEmail(),
      securityQuestion: user.securityQuestion
    });

  } catch (error) {
    console.error('Security setup check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (Admin only)
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    const query = {};
    
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash -securityAnswerHash -resetToken -emailVerificationCode')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalUsers: total
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// Update user status (Admin only)
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'probation', 'on notice period', 'resigned'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Valid status (${validStatuses.join('/')}) is required` });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({
      message: `User status updated to ${status}`,
      user: {
        id: user._id,
        username: user.username,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        designation: user.designation,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
};

// Update user role and designation (Admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, designation } = req.body;

    if (!role || !['admin', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (admin/manager/employee) is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    if (designation) user.designation = designation;
    
    await user.save();

    res.json({
      message: `User role updated to ${role}`,
      user: {
        id: user._id,
        username: user.username,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        designation: user.designation,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
};