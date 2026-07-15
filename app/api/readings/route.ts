import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SugarReading from "@/models/SugarReading";
import InsulinLog from "@/models/InsulinLog";

export async function GET(req: NextRequest) {
  await connectDB();
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
  // Populate insulinLogId → and its insulinTypeId for the live insulin name
  const readings = await SugarReading.find()
    .populate({
      path: "insulinLogId",
      populate: { path: "insulinTypeId", select: "name units timing" },
    })
    .sort({ measuredAt: -1 })
    .limit(limit);
  return NextResponse.json(readings);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  // Snapshot from InsulinLog (still keep snapshot in case log deleted later)
  if (body.insulinLogId) {
    const log = await InsulinLog.findById(body.insulinLogId)
      .populate("insulinTypeId", "name units");
    if (log) {
      // Use live name from populated insulinTypeId if available, else snapshot
      const liveName = log.insulinTypeId
        ? `${(log.insulinTypeId as any).name} ${(log.insulinTypeId as any).units}u`
        : log.insulinName;
      body.insulinName    = liveName;
      body.insulinUnits   = log.units;
      body.insulinTakenAt = log.takenAt;
    }
  }

  const created = await SugarReading.create(body);
  const reading = await SugarReading.findById(created._id).populate({
    path: "insulinLogId",
    populate: { path: "insulinTypeId", select: "name units timing" },
  });
  return NextResponse.json(reading, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { id, ...updates } = body;

  if (updates.insulinLogId) {
    const log = await InsulinLog.findById(updates.insulinLogId)
      .populate("insulinTypeId", "name units");
    if (log) {
      const liveName = log.insulinTypeId
        ? `${(log.insulinTypeId as any).name} ${(log.insulinTypeId as any).units}u`
        : log.insulinName;
      updates.insulinName    = liveName;
      updates.insulinUnits   = log.units;
      updates.insulinTakenAt = log.takenAt;
    }
  } else if (updates.insulinLogId === null || updates.insulinLogId === "") {
    updates.insulinLogId    = null;
    updates.insulinName     = "";
    updates.insulinUnits    = 0;
    updates.insulinTakenAt  = null;
  }

  const updated = await SugarReading.findByIdAndUpdate(id, updates, { new: true })
    .populate({
      path: "insulinLogId",
      populate: { path: "insulinTypeId", select: "name units timing" },
    });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { id } = await req.json();
  await SugarReading.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}