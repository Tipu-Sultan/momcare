import mongoose, { Schema, model, models } from "mongoose";

const DoctorSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    specialties: [{ type: String }], // Array of strings to store multiple specialties per doctor
  },
  { timestamps: true }
);

export const Doctor = models.Doctor || model("Doctor", DoctorSchema);