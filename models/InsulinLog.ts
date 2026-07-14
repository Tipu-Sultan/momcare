import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInsulinLog extends Document {
  insulinTypeId: Types.ObjectId; // ref → Insulin (type)
  insulinName:   string;         // snapshot: "Huma Device 8u"
  units:         number;         // snapshot
  takenAt:       Date;
  note:          string;
  createdAt:     Date;
}

const InsulinLogSchema = new Schema<IInsulinLog>(
  {
    insulinTypeId: { type: Schema.Types.ObjectId, ref: "Insulin", required: true },
    insulinName:   { type: String, required: true },
    units:         { type: Number, required: true },
    takenAt:       { type: Date, required: true },
    note:          { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.InsulinLog ||
  mongoose.model<IInsulinLog>("InsulinLog", InsulinLogSchema);