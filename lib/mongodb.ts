import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://teepukhan729:XcAg7Q6LZwFp2jOE@friendfy.vk41i.mongodb.net/momcare?retryWrites=true&w=majority&appName=peopulse";

export interface SugarReadingType {
  _id: string;
  value: number;
  timing: string;
  note?: string;
  insulinLogId?: string | null;
  insulinName?: string;
  insulinUnits?: number;
  insulinTakenAt?: Date | null;
  measuredAt: Date;
  createdAt?: Date;
}

export interface BPReadingType {
  _id: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  note?: string;
  measuredAt: Date;
  createdAt?: Date;
}

export interface InsulinType {
  _id: string;
  name: string;
  units: number;
  timing: string;
  notes?: string;
  active: boolean;
  createdAt?: Date;
}

export interface InsulinLogType {
  _id: string;
  insulinTypeId: string;
  insulinName: string;
  units: number;
  takenAt: Date;
  note?: string;
  createdAt?: Date;
}

export interface ThyroidReadingType {
  _id: string;
  tsh: number;
  t3?: number;
  t4?: number;
  note?: string;
  testedAt: Date;
  createdAt?: Date;
}

export interface MedicineType {
  _id: string;
  name: string;
  dosage: string;
  timing: string;
  notes?: string;
  active: boolean;
  createdAt?: Date;
}

export interface MedicineLogType {
  _id: string;
  medicineId?: string | null;
  medicineName: string;
  dosage: string;
  takenAt: Date;
  note?: string;
  createdAt?: Date;
}

export interface WaterLogType {
  _id: string;
  amount: number;
  measuredAt: Date;
  note?: string;
  createdAt?: Date;
}

declare global {
  var mongoose: { conn: typeof import("mongoose") | null; promise: Promise<typeof import("mongoose")> | null };
  var isMongoOffline: boolean;
  var inMemoryDb: {
    sugarReadings: SugarReadingType[];
    bpReadings: BPReadingType[];
    insulinTypes: InsulinType[];
    insulinLogs: InsulinLogType[];
    thyroidReadings: ThyroidReadingType[];
    medicines: MedicineType[];
    medicineLogs: MedicineLogType[];
    waterLogs: WaterLogType[];
  };
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

if (!global.inMemoryDb) {
  global.inMemoryDb = {
    sugarReadings: [
      {
        _id: "sug-init-1",
        value: 125,
        timing: "fasting_morning",
        note: "Normal fasting sugar",
        measuredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      {
        _id: "sug-init-2",
        value: 168,
        timing: "post_meal_morning",
        note: "Post-breakfast reading",
        measuredAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
        createdAt: new Date(),
      }
    ],
    bpReadings: [
      {
        _id: "bp-init-1",
        systolic: 124,
        diastolic: 82,
        pulse: 72,
        note: "Resting reading",
        measuredAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        createdAt: new Date(),
      }
    ],
    insulinTypes: [
      { _id: "ins-1", name: "Lantus", units: 10, timing: "night_1", notes: "Default Lantus", active: true, createdAt: new Date() },
      { _id: "ins-2", name: "NovoRapid", units: 6, timing: "morning_1", notes: "Default NovoRapid", active: true, createdAt: new Date() }
    ],
    insulinLogs: [
      {
        _id: "log-init-1",
        insulinTypeId: "ins-1",
        insulinName: "Lantus 10u",
        units: 10,
        takenAt: new Date(Date.now() - 15 * 60 * 60 * 1000),
        note: "Regular night dose",
        createdAt: new Date(),
      }
    ],
    thyroidReadings: [
      {
        _id: "thy-init-1",
        tsh: 3.2,
        t3: 1.1,
        t4: 7.8,
        note: "Regular quarterly checkup",
        testedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }
    ],
    medicines: [
      { _id: "med-1", name: "Metformin", dosage: "500 mg", timing: "After Breakfast", notes: "For Blood Sugar control", active: true, createdAt: new Date() },
      { _id: "med-2", name: "Thyronorm", dosage: "75 mcg", timing: "Before Breakfast", notes: "Thyroid hormone support", active: true, createdAt: new Date() },
      { _id: "med-3", name: "Amlodipine", dosage: "5 mg", timing: "After Dinner", notes: "For Blood Pressure control", active: true, createdAt: new Date() }
    ],
    medicineLogs: [
      { _id: "ml-1", medicineId: "med-1", medicineName: "Metformin", dosage: "500 mg", takenAt: new Date(Date.now() - 4 * 60 * 60 * 1000), note: "Taken on time", createdAt: new Date() },
      { _id: "ml-2", medicineId: "med-2", medicineName: "Thyronorm", dosage: "75 mcg", takenAt: new Date(Date.now() - 22 * 60 * 60 * 1000), note: "Taken fasting", createdAt: new Date() }
    ],
    waterLogs: [
      { _id: "w-1", amount: 250, measuredAt: new Date(Date.now() - 3 * 60 * 60 * 1000), note: "Glass of warm water", createdAt: new Date() },
      { _id: "w-2", amount: 500, measuredAt: new Date(Date.now() - 1 * 60 * 60 * 1000), note: "Copper bottle water", createdAt: new Date() }
    ]
  };
}

export async function connectDB() {
  if (global.isMongoOffline) {
    return null;
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    mongoose.set("bufferCommands", false);
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    }).then((m) => {
      console.log("MongoDB connected successfully");
      global.isMongoOffline = false;
      return m;
    }).catch(err => {
      console.warn("MongoDB connection failed, falling back to in-memory DB:", err.message);
      global.isMongoOffline = true;
      throw err;
    });
  }
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch {
    cached.promise = null; // Let it retry or remain offline
    global.isMongoOffline = true;
    return null;
  }
}
