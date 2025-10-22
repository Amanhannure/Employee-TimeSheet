import mongoose from 'mongoose';

const timesheetSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  weekStartDate: { type: Date, required: true },
  entries: [
    {
      day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      hours: { type: Number, min: 0, max: 24 },
      activityCode: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityCode' },
      remarks: String
    }
  ],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date
}, { timestamps: true });

export default mongoose.model('Timesheet', timesheetSchema);