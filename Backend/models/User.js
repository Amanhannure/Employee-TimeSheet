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
    enum: ['admin', 'manager', 'employee'], 
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
    this._securityAnswer = answer;
    // Force mongoose to recognize security answer as modified
    this.markModified('securityAnswer');
  })
  .get(function() {
    return this._securityAnswer;
  });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  console.log('🔄 Pre-save middleware triggered');
  console.log('📝 Modified fields:', this.modifiedPaths());
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
  if (!this.passwordHash) return false;
  return await bcrypt.compare(password, this.passwordHash);
};

// Method to hash security answer (for direct use)
userSchema.methods.hashSecurityAnswer = async function(answer) {
  const salt = await bcrypt.genSalt(10);
  this.securityAnswerHash = await bcrypt.hash(answer, salt);
  this.securitySetupCompleted = true;
  return this.save();
};

// Method to verify security answer
userSchema.methods.verifySecurityAnswer = async function(answer) {
  if (!this.securityAnswerHash) return false;
  return await bcrypt.compare(answer, this.securityAnswerHash);
};

// Method to generate reset token
userSchema.methods.generateResetToken = function() {
  this.resetToken = crypto.randomBytes(32).toString('hex');
  this.resetTokenExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  return this.resetToken;
};

// Method to generate email verification code
userSchema.methods.generateEmailCode = function() {
  this.emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailCodeExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  return this.emailVerificationCode;
};

// Method to check if reset token is valid
userSchema.methods.isResetTokenValid = function() {
  return this.resetToken && this.resetTokenExpiry && this.resetTokenExpiry > Date.now();
};

// Method to check if email code is valid
userSchema.methods.isEmailCodeValid = function() {
  return this.emailVerificationCode && this.emailCodeExpiry && this.emailCodeExpiry > Date.now();
};

// Method to clear reset tokens
userSchema.methods.clearResetTokens = function() {
  this.resetToken = null;
  this.resetTokenExpiry = null;
  this.emailVerificationCode = null;
  this.emailCodeExpiry = null;
};

// Check if user has security question setup
userSchema.methods.hasSecurityQuestion = function() {
  return !!(this.securityQuestion && this.securityAnswerHash);
};

// Check if user can reset password via email
userSchema.methods.canResetViaEmail = function() {
  return !!this.email;
};

// Static method to validate password length
userSchema.statics.validatePasswordLength = function(password) {
  return password && password.length >= 4;
};

// Method to set password directly (alternative method)
userSchema.methods.setPassword = async function(newPassword) {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }
  
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(newPassword, salt);
  this.lastPasswordReset = new Date();
  return this.save();
};

export default mongoose.model('User', userSchema);