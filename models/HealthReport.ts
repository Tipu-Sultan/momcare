import mongoose, { Schema, model, models } from "mongoose";

const HealthReportSchema = new Schema(
  {
    patientId: {
      type: String,
      default: "Shakila Khatoon",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["Prescription", "Blood Test", "Lab Report", "Scan/X-Ray", "Other"],
      default: "Prescription",
    },
    reportDate: {
      type: Date,
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      required: [true, "File upload URL is required"],
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true, // pdf, jpeg, jpg, png
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default models.HealthReport || model("HealthReport", HealthReportSchema);