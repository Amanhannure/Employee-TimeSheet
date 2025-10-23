import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectCode: { type: String, required: true, unique: true },
  name: String,
  location: String,
  department: String,
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  totalHours: Number,
  status: { type: String, enum: ['active', 'on-hold', 'completed'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);