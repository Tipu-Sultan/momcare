import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SugarReading from "@/models/SugarReading";
import InsulinLog from "@/models/InsulinLog";

export async function GET(req: NextRequest) {
  await connectDB();
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
  const readings = await SugarReading.find().sort({ measuredAt: -1 }).limit(limit);
  return NextResponse.json(readings);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  // Snapshot from the InsulinLog (actual dose taken)
  if (body.insulinLogId) {
    const log = await InsulinLog.findById(body.insulinLogId);
    if (log) {
      body.insulinName    = log.insulinName;
      body.insulinUnits   = log.units;
      body.insulinTakenAt = log.takenAt;
    }
  }

  const reading = await SugarReading.create(body);
  return NextResponse.json(reading, { status: 201 });
}

// PATCH /api/readings → edit a reading
export async function PATCH(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { id, ...updates } = body;

  // Re-snapshot insulin if log changed
  if (updates.insulinLogId) {
    const log = await InsulinLog.findById(updates.insulinLogId);
    if (log) {
      updates.insulinName    = log.insulinName;
      updates.insulinUnits   = log.units;
      updates.insulinTakenAt = log.takenAt;
    }
  } else if (updates.insulinLogId === null || updates.insulinLogId === "") {
    updates.insulinLogId    = null;
    updates.insulinName     = "";
    updates.insulinUnits    = 0;
    updates.insulinTakenAt  = null;
  }

  const updated = await SugarReading.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { id } = await req.json();
  await SugarReading.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}