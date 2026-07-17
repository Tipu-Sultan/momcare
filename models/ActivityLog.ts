import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  patientId: string;
  loggedDate: Date;
  heartRateAverage: number;
  spo2Average: number;
  steps: number;
  syncSource: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    patientId: {
      type: String,
      default: "Shakila Khatoon",
      required: true,
    },
    loggedDate: {
      type: Date,
      required: true,
      unique: true, // Unique per day
    },
    heartRateAverage: {
      type: Number,
      required: true,
      default: 0,
    },
    spo2Average: {
      type: Number,
      required: true,
      default: 0,
    },
    steps: {
      type: Number,
      required: true,
      default: 0,
    },
    syncSource: {
      type: String,
      required: true,
      default: "Bluetooth Wearable",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
