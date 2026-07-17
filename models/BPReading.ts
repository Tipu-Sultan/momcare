import mongoose, { Schema, Document } from "mongoose";

export interface IBPReading extends Document {
  systolic: number;
  diastolic: number;
  pulse: number;
  note: string;
  measuredAt: Date;
  createdAt: Date;
}

const BPReadingSchema = new Schema<IBPReading>(
  {
    systolic: { type: Number, required: true },
    diastolic: { type: Number, required: true },
    pulse: { type: Number, default: 0 },
    note: { type: String, default: "" },
    measuredAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.BPReading ||
  mongoose.model<IBPReading>("BPReading", BPReadingSchema);
