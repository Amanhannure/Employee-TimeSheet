import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  plNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  totalHours: { type: Number, required: true },
  juniorHours: { type: Number, default: 0 },
  juniorCompleted: { type: Number, default: 0 },
  seniorHours: { type: Number, default: 0 },
  seniorCompleted: { type: Number, default: 0 },
  originalTotalHours: Number,
  variationHours: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['active', 'on-hold', 'completed', 'cancelled'], 
    default: 'active' 
  },
  startDate: Date,
  endDate: Date,
  assignedEmployees: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  departments: [String],
  departmentHours: Map,
  departmentCompleted: Map,
  activities: [{
    name: String,
    startDate: Date,
    endDate: Date,
    consumedHours: String, // "HH:mm" format
    remarks: String
  }]
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);