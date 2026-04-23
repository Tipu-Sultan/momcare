import mongoose, { Schema, Document } from "mongoose";

export type SugarTiming =
  | "fasting_morning" | "pre_meal_morning" | "post_meal_morning"
  | "pre_meal_noon" | "post_meal_noon"
  | "pre_meal_evening" | "post_meal_evening"
  | "bedtime" | "random"
  | "fasting" | "post_meal"; // legacy

export interface ISugarReading extends Document {
  value: number;
  timing: SugarTiming;
  note: string;
  measuredAt: Date;
  createdAt: Date;
}

const TIMING_VALUES: SugarTiming[] = [
  "fasting_morning","pre_meal_morning","post_meal_morning",
  "pre_meal_noon","post_meal_noon",
  "pre_meal_evening","post_meal_evening",
  "bedtime","random",
  "fasting","post_meal",
];

const SugarReadingSchema = new Schema<ISugarReading>(
  {
    value: { type: Number, required: true },
    timing: { type: String, enum: TIMING_VALUES, default: "fasting_morning" },
    note: { type: String, default: "" },
    measuredAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.SugarReading ||
  mongoose.model<ISugarReading>("SugarReading", SugarReadingSchema);