import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^EMP\d+$/  
  },
  firstName: String,
  lastName: String,
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
  phone: String,
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'employee'], 
    default: 'employee' 
  },
  department: String,
  joinDate: Date,
  passwordHash: String,
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  }
}, { 
  timestamps: true 
}); // Fixed: timestamps should be in an options object

export default mongoose.model('User', userSchema);