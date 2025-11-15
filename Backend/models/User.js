import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^T\d+$/  // Updated to match T1040, T1049 format
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    },
  },
  phone: {
    type: String,
    default: null
  },
  role: { 
    type: String, 
    enum: ['admin', 'project_manager', 'employee'],  // ✅ CHANGED: 'manager' to 'project_manager'
    default: 'employee' 
  },
  designation: {  // Added new field to store the actual job title from your data
    type: String,
    default: null
  },
  department: {
    type: String,
    default: null
  },
  joinDate: {
    type: Date,
    default: null
  },
  passwordHash: {
    type: String,
    required: true
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'probation', 'on notice period', 'resigned'], 
    default: 'active' 
  },
  
  // PASSWORD RESET FIELDS
  securityQuestion: {
    type: String,
    default: "What was your first car?"
  },
  securityAnswerHash: {
    type: String,
    default: null
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  emailVerificationCode: {
    type: String,
    default: null
  },
  emailCodeExpiry: {
    type: Date,
    default: null
  },
  lastPasswordReset: {
    type: Date,
    default: null
  },
  securitySetupCompleted: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Virtual for plain password (to hash before saving)
userSchema.virtual('password')
  .set(function(password) {
    console.log('🔐 Password virtual setter called');
    // Validate password length (minimum 4 characters)
    if (password && password.length < 4) {
      throw new Error('Password must be at least 4 characters long');
    }
    this._password = password;
    // Force mongoose to recognize password as modified
    this.markModified('password');
  })
  .get(function() {
    return this._password;
  });

// Virtual for security answer
userSchema.virtual('securityAnswer')
  .set(function(answer) {
    console.log('🔒 Security answer virtual setter called');
    this._securityAnswer = answer;
    // Force mongoose to recognize security answer as modified
    this.markModified('securityAnswer');
  })
  .get(function() {
    return this._securityAnswer;
  });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  console.log('🔄 User pre-save middleware triggered');
  console.log('📝 Modified fields:', this.modifiedPaths());
  console.log('👤 User role:', this.role);
  console.log('🔑 _password exists:', !!this._password);
  
  // Check if password is being set via virtual field
  if (this._password) {
    try {
      console.log('🔐 Hashing new password...');
      // Additional validation for password length
      if (this._password.length < 4) {
        throw new Error('Password must be at least 4 characters long');
      }
      
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this._password, salt);
      this._password = undefined; // Clear the temporary password
      this.lastPasswordReset = new Date();
      console.log('✅ Password hashed successfully');
      next();
    } catch (error) {
      console.error('❌ Password hashing error:', error);
      next(error);
    }
  } else {
    console.log('⏭️ Skipping password hashing - no password to hash');
    next();
  }
});

// Pre-save middleware to hash security answer if provided
userSchema.pre('save', async function(next) {
  if (this._securityAnswer) {
    try {
      console.log('🔐 Hashing security answer...');
      const salt = await bcrypt.genSalt(10);
      this.securityAnswerHash = await bcrypt.hash(this._securityAnswer, salt);
      this._securityAnswer = undefined; // Clear the temporary security answer
      this.securitySetupCompleted = true;
      console.log('✅ Security answer hashed successfully');
      next();
    } catch (error) {
      console.error('❌ Security answer hashing error:', error);
      next(error);
    }
  } else {
    next();
  }
});

// Method to verify password
userSchema.methods.verifyPassword = async function(password) {
  console.log('🔐 Verifying password for user:', this.employeeId);
  if (!this.passwordHash) {
    console.log('❌ No password hash found');
    return false;
  }
  const isValid = await bcrypt.compare(password, this.passwordHash);
  console.log('🔐 Password verification result:', isValid);
  return isValid;
};

// Method to hash security answer (for direct use)
userSchema.methods.hashSecurityAnswer = async function(answer) {
  console.log('🔒 Hashing security answer directly');
  const salt = await bcrypt.genSalt(10);
  this.securityAnswerHash = await bcrypt.hash(answer, salt);
  this.securitySetupCompleted = true;
  return this.save();
};

// Method to verify security answer
userSchema.methods.verifySecurityAnswer = async function(answer) {
  console.log('🔒 Verifying security answer for user:', this.employeeId);
  if (!this.securityAnswerHash) {
    console.log('❌ No security answer hash found');
    return false;
  }
  const isValid = await bcrypt.compare(answer, this.securityAnswerHash);
  console.log('🔒 Security answer verification result:', isValid);
  return isValid;
};

// Method to generate reset token
userSchema.methods.generateResetToken = function() {
  console.log('🔄 Generating reset token for user:', this.employeeId);
  this.resetToken = crypto.randomBytes(32).toString('hex');
  this.resetTokenExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  console.log('✅ Reset token generated, expires at:', new Date(this.resetTokenExpiry));
  return this.resetToken;
};

// Method to generate email verification code
userSchema.methods.generateEmailCode = function() {
  console.log('📧 Generating email verification code for user:', this.employeeId);
  this.emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailCodeExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  console.log('✅ Email code generated:', this.emailVerificationCode);
  return this.emailVerificationCode;
};

// Method to check if reset token is valid
userSchema.methods.isResetTokenValid = function() {
  const isValid = this.resetToken && this.resetTokenExpiry && this.resetTokenExpiry > Date.now();
  console.log('🔄 Reset token validity check:', isValid);
  return isValid;
};

// Method to check if email code is valid
userSchema.methods.isEmailCodeValid = function() {
  const isValid = this.emailVerificationCode && this.emailCodeExpiry && this.emailCodeExpiry > Date.now();
  console.log('📧 Email code validity check:', isValid);
  return isValid;
};

// Method to clear reset tokens
userSchema.methods.clearResetTokens = function() {
  console.log('🧹 Clearing reset tokens for user:', this.employeeId);
  this.resetToken = null;
  this.resetTokenExpiry = null;
  this.emailVerificationCode = null;
  this.emailCodeExpiry = null;
};

// Check if user has security question setup
userSchema.methods.hasSecurityQuestion = function() {
  const hasSetup = !!(this.securityQuestion && this.securityAnswerHash);
  console.log('🔒 Security question setup check:', hasSetup);
  return hasSetup;
};

// Check if user can reset password via email
userSchema.methods.canResetViaEmail = function() {
  const canReset = !!this.email;
  console.log('📧 Email reset capability check:', canReset);
  return canReset;
};

// Static method to validate password length
userSchema.statics.validatePasswordLength = function(password) {
  const isValid = password && password.length >= 4;
  console.log('🔐 Password length validation:', isValid);
  return isValid;
};

// Method to set password directly (alternative method)
userSchema.methods.setPassword = async function(newPassword) {
  console.log('🔐 Setting password directly for user:', this.employeeId);
  
  if (!newPassword || newPassword.length < 4) {
    console.error('❌ Password validation failed - too short');
    throw new Error('Password must be at least 4 characters long');
  }
  
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(newPassword, salt);
  this.lastPasswordReset = new Date();
  console.log('✅ Password set successfully');
  return this.save();
};

// ✅ ADDED: Method to check if user is project manager
userSchema.methods.isProjectManager = function() {
  const isPM = this.role === 'project_manager' || this.role === 'admin';
  console.log(`👤 Project Manager check for ${this.employeeId}:`, isPM);
  return isPM;
};

// ✅ ADDED: Method to check if user can access project management
userSchema.methods.canAccessProjectManagement = function() {
  const canAccess = this.role === 'project_manager' || this.role === 'admin';
  console.log(`🔐 Project Management access check for ${this.employeeId}:`, canAccess);
  return canAccess;
};

// ✅ ADDED: Method to check if user can be assigned to projects
userSchema.methods.canBeAssignedToProjects = function() {
  const canBeAssigned = this.role === 'employee' && this.status === 'active';
  console.log(`📋 Project assignment eligibility for ${this.employeeId}:`, canBeAssigned);
  return canBeAssigned;
};

export default mongoose.model('User', userSchema);