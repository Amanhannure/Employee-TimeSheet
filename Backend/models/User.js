import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, match: /^EMP\d+$/  },
  firstName: String,
  lastName: String,
  username: { type: String, required: true, unique: true },
  email: {
  type: String,
  required: true,
  unique: true,
  validate: {
    validator: function(v) {
      return /^\S+@\S+\.\S+$/.test(v);
    }
  },
  phone: String,
  role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  department: String,
  joinDate: Date,
  passwordHash: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, timestamps: true });

export default mongoose.model('User', userSchema);