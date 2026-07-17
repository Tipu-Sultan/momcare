import mongoose, { Schema, Document } from "mongoose";

export interface IMedicine extends Document {
  name: string;        // e.g. "Metformin"
  dosage: string;      // e.g. "500 mg"
  timing: string;      // e.g. "Before Breakfast", "After Dinner", "Morning"
  notes?: string;
  active: boolean;     // show in dosage selection?
  createdAt: Date;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    name:   { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    timing: { type: String, required: true, trim: true },
    notes:  { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Medicine ||
  mongoose.model<IMedicine>("Medicine", MedicineSchema);
