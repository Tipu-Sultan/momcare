import mongoose, { Schema, Document, Types } from "mongoose";

export type SugarTiming =
  | "fasting_morning" | "pre_meal_morning" | "post_meal_morning"
  | "pre_meal_noon"   | "post_meal_noon"
  | "pre_meal_evening"| "post_meal_evening"
  | "bedtime"         | "random"
  | "fasting"         | "post_meal"; // legacy

export interface ISugarReading extends Document {
  value:         number;
  timing:        SugarTiming;
  // Link to the actual dose log (not the type)
  insulinLogId?:  Types.ObjectId;
  insulinName?:   string;    // snapshot "Huma Device 8u"
  insulinUnits?:  number;    // snapshot
  insulinTakenAt?: Date;     // snapshot — when was the dose taken
  note:          string;
  measuredAt:    Date;
  createdAt:     Date;
}

const TIMING_VALUES: SugarTiming[] = [
  "fasting_morning","pre_meal_morning","post_meal_morning",
  "pre_meal_noon","post_meal_noon",
  "pre_meal_evening","post_meal_evening",
  "bedtime","random","fasting","post_meal",
];

const SugarReadingSchema = new Schema<ISugarReading>(
  {
    value:          { type: Number, required: true },
    timing:         { type: String, enum: TIMING_VALUES, default: "fasting_morning" },
    insulinLogId:   { type: Schema.Types.ObjectId, ref: "InsulinLog", default: null },
    insulinName:    { type: String,  default: "" },
    insulinUnits:   { type: Number,  default: 0 },
    insulinTakenAt: { type: Date,    default: null },
    note:           { type: String,  default: "" },
    measuredAt:     { type: Date,    required: true },
  },
  { timestamps: true }
);

export default mongoose.models.SugarReading ||
  mongoose.model<ISugarReading>("SugarReading", SugarReadingSchema);