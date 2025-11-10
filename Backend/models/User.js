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
  
  // ✅ ADDED: PL/SL/CL LEAVE BALANCE FIELDS
  leaveBalance: {
    casualLeave: { 
      type: Number, 
      default: 8,      // CL = 2/8
      min: 0
    },
    sickLeave: { 
      type: Number, 
      default: 8,      // SL = 8
      min: 0
    },
    personalLeave: { 
      type: Number, 
      default: 22,     // PL = 22
      min: 0
    }
  },
  maxLeaves: {
    casualLeave: { type: Number, default: 8 },
    sickLeave: { type: Number, default: 8 },
    personalLeave: { type: Number, default: 22 }
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
    this._password = password;
  })
  .get(function() {
    return this._password;
  });

// Virtual for security answer
userSchema.virtual('securityAnswer')
  .set(function(answer) {
    this._securityAnswer = answer;
  })
  .get(function() {
    return this._securityAnswer;
  });

// ✅ ADDED: Method to get available leave balance
userSchema.methods.getAvailableLeaves = function(leaveType) {
  return this.leaveBalance[leaveType] || 0;
};

// ✅ ADDED: Method to deduct leaves
userSchema.methods.deductLeaves = function(leaveType, days) {
  if (this.leaveBalance[leaveType] >= days) {
    this.leaveBalance[leaveType] -= days;
    return true;
  }
  return false;
};

// ✅ ADDED: Method to add leaves (for admin)
userSchema.methods.addLeaves = function(leaveType, days) {
  const maxLeaves = this.maxLeaves[leaveType] || 0;
  this.leaveBalance[leaveType] = Math.min(
    (this.leaveBalance[leaveType] || 0) + days, 
    maxLeaves
  );
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to hash security answer if provided
userSchema.pre('save', async function(next) {
  if (this.isModified('securityAnswer') && this.securityAnswer) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.securityAnswerHash = await bcrypt.hash(this.securityAnswer, salt);
      this.securitySetupCompleted = true;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Method to verify password
userSchema.methods.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Method to hash security answer
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

export default mongoose.model('User', userSchema);