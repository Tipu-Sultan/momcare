import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Insulin from "@/models/Insulin";
import InsulinLog from "@/models/InsulinLog";

// GET /api/insulin?type=types              → all insulin types
// GET /api/insulin?type=types&active=true  → only active types
// GET /api/insulin?type=logs               → recent logs (default 50)
// GET /api/insulin?type=logs&hours=24      → logs within last N hours (for sugar dropdown)
export async function GET(req: NextRequest) {
  await connectDB();
  const type  = req.nextUrl.searchParams.get("type")  ?? "types";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
  const hours = parseInt(req.nextUrl.searchParams.get("hours") ?? "0");

  if (type === "logs") {
    const filter: Record<string, unknown> = {};
    if (hours > 0) {
      filter.takenAt = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
    }
    const logs = await InsulinLog.find(filter).sort({ takenAt: -1 }).limit(limit);
    return NextResponse.json(logs);
  }

  const onlyActive = req.nextUrl.searchParams.get("active") === "true";
  const filter = onlyActive ? { active: true } : {};
  const list = await Insulin.find(filter).sort({ createdAt: 1 });
  return NextResponse.json(list);
}

// POST /api/insulin?type=types  → create insulin type
// POST /api/insulin?type=log    → log a dose taken
export async function POST(req: NextRequest) {
  await connectDB();
  const type = req.nextUrl.searchParams.get("type") ?? "types";
  const body = await req.json();

  if (type === "log") {
    const insulin = await Insulin.findById(body.insulinTypeId);
    if (!insulin) return NextResponse.json({ error: "Insulin type not found" }, { status: 404 });
    const log = await InsulinLog.create({
      insulinTypeId: insulin._id,
      insulinName:   `${insulin.name} ${insulin.units}u`,
      units:         insulin.units,
      takenAt:       body.takenAt,
      note:          body.note ?? "",
    });
    return NextResponse.json(log, { status: 201 });
  }

  const insulin = await Insulin.create(body);
  return NextResponse.json(insulin, { status: 201 });
}

// PATCH /api/insulin?type=types → edit insulin type
// PATCH /api/insulin?type=log   → edit log entry
export async function PATCH(req: NextRequest) {
  await connectDB();
  const type = req.nextUrl.searchParams.get("type") ?? "types";
  const body = await req.json();
  const { id, ...updates } = body;

  if (type === "log") {
    // If takenAt or note edited — update snapshot name too if insulinTypeId changed
    if (updates.insulinTypeId) {
      const insulin = await Insulin.findById(updates.insulinTypeId);
      if (insulin) {
        updates.insulinName = `${insulin.name} ${insulin.units}u`;
        updates.units = insulin.units;
      }
    }
    const updated = await InsulinLog.findByIdAndUpdate(id, updates, { new: true });
    return NextResponse.json(updated);
  }

  const updated = await Insulin.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json(updated);
}

// DELETE /api/insulin?type=types or log
export async function DELETE(req: NextRequest) {
  await connectDB();
  const type = req.nextUrl.searchParams.get("type") ?? "types";
  const { id } = await req.json();
  if (type === "log") {
    await InsulinLog.findByIdAndDelete(id);
  } else {
    await Insulin.findByIdAndDelete(id);
  }
  return NextResponse.json({ success: true });
}