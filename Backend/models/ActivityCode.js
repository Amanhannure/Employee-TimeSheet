import mongoose from 'mongoose';

const activityCodeSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  description: String
}, { timestamps: true });

activityCodeSchema.index({ code: 1, department: 1 }, { unique: true });

export default mongoose.model('ActivityCode', activityCodeSchema);