
import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  username: { type: String, required: true, unique: true },
  email: String,
  phone: String,
  role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  department: String,
  joinDate: Date,
  passwordHash: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });




export default mongoose.model('User', userSchema);
