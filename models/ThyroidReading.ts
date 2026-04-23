import mongoose, { Schema, Document } from "mongoose";

export interface IThyroidReading extends Document {
  tsh: number;
  t3: number;
  t4: number;
  note: string;
  testedAt: Date;
  createdAt: Date;
}

const ThyroidReadingSchema = new Schema<IThyroidReading>(
  {
    tsh: { type: Number, required: true },
    t3: { type: Number, default: 0 },
    t4: { type: Number, default: 0 },
    note: { type: String, default: "" },
    testedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.ThyroidReading ||
  mongoose.model<IThyroidReading>("ThyroidReading", ThyroidReadingSchema);
