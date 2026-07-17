import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import dayjs from "dayjs";

// Global window/node object ko safely dynamic any types mein cast karein
// Isse redeclaration ke saare TypeScript conflicts permanent khatam ho jayenge.
const globalAny = global as any;

// Ensure in-memory fallback list is ready
if (globalAny.inMemoryDb && !globalAny.inMemoryDb.activityLogs) {
  globalAny.inMemoryDb.activityLogs = [
    {
      _id: "act-init-1",
      patientId: "Shakila Khatoon",
      loggedDate: dayjs().subtract(1, "day").startOf("day").toDate(),
      heartRateAverage: 76,
      spo2Average: 98,
      steps: 4120,
      syncSource: "Bluetooth Wearable Simulator",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    }
  ];
}

// GET /api/sync-sensor-data -> Retrieve all activity logs or today's logs
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    if (globalAny.isMongoOffline) {
      const logs = globalAny.inMemoryDb?.activityLogs || [];
      // Sort descending by date
      const sorted = [...logs].sort((a: any, b: any) => b.loggedDate.getTime() - a.loggedDate.getTime());
      return NextResponse.json({ success: true, logs: sorted }, { status: 200 });
    }

    const logs = await ActivityLog.find({ patientId: "Shakila Khatoon" })
      .sort({ loggedDate: -1 })
      .limit(10);

    return NextResponse.json({ success: true, logs }, { status: 200 });
  } catch (err: any) {
    console.error("GET ActivityLog error:", err);
    const logs = globalAny.inMemoryDb?.activityLogs || [];
    return NextResponse.json({ success: true, logs, error: err.message }, { status: 200 });
  }
}

// POST /api/sync-sensor-data -> Sync/Upsert daily wearable telemetry
export async function POST(req: NextRequest) {
  try {
    const { heartRate, spo2, steps } = await req.json();

    if (typeof heartRate !== "number" || typeof spo2 !== "number" || typeof steps !== "number") {
      return NextResponse.json(
        { error: "Invalid sensor payload. heartRate, spo2, and steps must be numbers." },
        { status: 400 }
      );
    }

    await connectDB();
    const todayStart = dayjs().startOf("day").toDate();

    // 1. Handlers for offline / in-memory sandbox environments
    if (globalAny.isMongoOffline) {
      if (!globalAny.inMemoryDb.activityLogs) {
        globalAny.inMemoryDb.activityLogs = [];
      }

      const existingIndex = globalAny.inMemoryDb.activityLogs.findIndex(
        (log: any) => dayjs(log.loggedDate).isSame(dayjs(), "day")
      );

      let logRecord;
      if (existingIndex > -1) {
        const existing = globalAny.inMemoryDb.activityLogs[existingIndex];
        // Smart average calculation
        const hrAvg = Math.round((existing.heartRateAverage + heartRate) / 2);
        const o2Avg = Math.round((existing.spo2Average + spo2) / 2);

        logRecord = {
          ...existing,
          heartRateAverage: hrAvg,
          spo2Average: o2Avg,
          steps: Math.max(existing.steps, steps), // take maximum steps counted today
          syncSource: "Bluetooth Emulator (Offline fallback)",
          updatedAt: new Date(),
        };
        globalAny.inMemoryDb.activityLogs[existingIndex] = logRecord;
      } else {
        logRecord = {
          _id: "act-" + Date.now(),
          patientId: "Shakila Khatoon",
          loggedDate: todayStart,
          heartRateAverage: heartRate,
          spo2Average: spo2,
          steps,
          syncSource: "Bluetooth Emulator (Offline fallback)",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        globalAny.inMemoryDb.activityLogs.unshift(logRecord);
      }

      return NextResponse.json(
        { success: true, source: "memory", data: logRecord },
        { status: 201 }
      );
    }

    // 2. Database Connected Handler
    // Find today's existing log for Shakila Khatoon
    const todayLog = await ActivityLog.findOne({
      patientId: "Shakila Khatoon",
      loggedDate: todayStart,
    });

    let finalLog;
    if (todayLog) {
      // Calculate running average for biosensors and update steps to maximum today
      const newHrAvg = Math.round((todayLog.heartRateAverage + heartRate) / 2);
      const newSpo2Avg = Math.round((todayLog.spo2Average + spo2) / 2);

      finalLog = await ActivityLog.findOneAndUpdate(
        { patientId: "Shakila Khatoon", loggedDate: todayStart },
        {
          $set: {
            heartRateAverage: newHrAvg,
            spo2Average: newSpo2Avg,
            steps: Math.max(todayLog.steps, steps),
            syncSource: "Wearable Device Tracker",
          },
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new activity log for today
      finalLog = await ActivityLog.create({
        patientId: "Shakila Khatoon",
        loggedDate: todayStart,
        heartRateAverage: heartRate,
        spo2Average: spo2,
        steps,
        syncSource: "Wearable Device Tracker",
      });
    }

    return NextResponse.json(
      { success: true, source: "mongodb", data: finalLog },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST sync-sensor-data failure:", err);
    return NextResponse.json(
      { error: "Internal Server Error occurred during sync", message: err.message },
      { status: 500 }
    );
  }
}