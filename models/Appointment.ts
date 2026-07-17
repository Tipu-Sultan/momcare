import mongoose, { Schema, model, models } from "mongoose";

const AppointmentSchema = new Schema(
  {
    // Yahan se purana doctorName hatayein ya optional karein taaki validation pass ho jaye
    doctorIds: [{ type: Schema.Types.ObjectId, ref: "Doctor" }], 
    customTitle: { type: String, default: "" },
    specialty: { type: String, default: "" }, // Doctor model se auto-fetch hoga, par safety ke liye check rakhein
    appointmentDate: { type: Date, required: true },
    location: { type: String, default: "" },
    notes: { type: String, default: "" },
    gCalEventId: { type: String, default: null },
  },
  { timestamps: true }
);

export const Appointment = models.Appointment || model("Appointment", AppointmentSchema);