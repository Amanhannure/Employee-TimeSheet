
import mongoose from 'mongoose';
const activityCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: String,
}, { timestamps: true });


export default mongoose.model('ActivityCode', activityCodeSchema);
