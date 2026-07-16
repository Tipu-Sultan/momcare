import mongoose, { Schema, Document } from "mongoose";

export interface IWaterLog extends Document {
  amount: number;       // In ml (e.g., 250, 500)
  measuredAt: Date;     // Intake time
  note?: string;
  createdAt: Date;
}

const WaterLogSchema = new Schema<IWaterLog>(
  {
    amount: { type: Number, required: true },
    measuredAt: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.WaterLog ||
  mongoose.model<IWaterLog>("WaterLog", WaterLogSchema);
