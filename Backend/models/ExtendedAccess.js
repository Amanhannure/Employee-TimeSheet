import mongoose from "mongoose";

const ExtendedAccessSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeCode: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
      enum: [7, 14, 30, 60, 90, 365],
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["active", "expired", "revoked"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire when date passes
ExtendedAccessSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ExtendedAccessSchema.index({ employeeId: 1, status: 1 });

export default mongoose.model("ExtendedAccess", ExtendedAccessSchema);