import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMedicineLog extends Document {
  medicineId: Types.ObjectId;
  medicineName: string;
  dosage: string;
  takenAt: Date;
  note: string;
  createdAt: Date;
}

const MedicineLogSchema = new Schema<IMedicineLog>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: false, default: null },
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true },
    takenAt: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.MedicineLog ||
  mongoose.model<IMedicineLog>("MedicineLog", MedicineLogSchema);
