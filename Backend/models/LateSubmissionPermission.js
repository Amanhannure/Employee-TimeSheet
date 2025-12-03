import mongoose from 'mongoose';

const lateSubmissionPermissionSchema = new mongoose.Schema({
  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeCode: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  
  // Permission details
  allowedWeekStart: {
    type: Date,
    required: true
  },
  allowedWeekEnd: {
    type: Date,
    required: true
  },
  
  // Permission validity
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  
  // Metadata
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  grantedByEmail: {
    type: String,
    required: true
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: ''
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked', 'used'],
    default: 'active'
  },
  
  // Counter
  timesheetSubmitted: {
    type: Boolean,
    default: false
  }
});

// Index for faster queries
lateSubmissionPermissionSchema.index({ employeeId: 1, status: 1 });
lateSubmissionPermissionSchema.index({ expiresAt: 1 });
lateSubmissionPermissionSchema.index({ allowedWeekStart: 1, allowedWeekEnd: 1 });

// Virtual method to check if permission is valid
lateSubmissionPermissionSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.status === 'active' && this.expiresAt > now;
});

// Method to mark as used
lateSubmissionPermissionSchema.methods.markAsUsed = function() {
  this.timesheetSubmitted = true;
  return this.save();
};

// Method to revoke
lateSubmissionPermissionSchema.methods.revoke = function() {
  this.status = 'revoked';
  return this.save();
};

// Static method to clean expired permissions
lateSubmissionPermissionSchema.statics.cleanExpired = async function() {
  const expiredDate = new Date();
  return this.updateMany(
    { 
      status: 'active', 
      expiresAt: { $lt: expiredDate } 
    },
    { 
      status: 'expired' 
    }
  );
};

const LateSubmissionPermission = mongoose.model('LateSubmissionPermission', lateSubmissionPermissionSchema);

export default LateSubmissionPermission;