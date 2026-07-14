import mongoose, { Schema, Document } from "mongoose";

// An "Insulin Type" defined by the user (e.g. "Lantus 10u", "NovoRapid 8u")
export interface IInsulin extends Document {
  name: string;         // e.g. "Lantus"
  units: number;        // e.g. 10
  timing: string;       // morning | noon | night
  notes: string;
  active: boolean;      // show in sugar dropdown?
  createdAt: Date;
}

const InsulinSchema = new Schema<IInsulin>(
  {
    name:   { type: String, required: true, trim: true },
    units:  { type: Number, required: true },
    timing: {
      type: String,
      enum: ["morning", "noon", "night", "as_needed"],
      default: "morning",
    },
    notes:  { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Insulin ||
  mongoose.model<IInsulin>("Insulin", InsulinSchema);