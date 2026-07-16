import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import MedicineLog from "@/models/MedicineLog";

// GET /api/medicine?type=types              → all prescribed medicines
// GET /api/medicine?type=types&active=true  → active prescribed medicines
// GET /api/medicine?type=logs               → medication dose logs
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const type = req.nextUrl.searchParams.get("type") ?? "types";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");

    if (global.isMongoOffline) {
      if (type === "logs") {
        const logs = [...global.inMemoryDb.medicineLogs]
          .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
          .slice(0, limit);
        return NextResponse.json(logs);
      }
      const onlyActive = req.nextUrl.searchParams.get("active") === "true";
      let list = [...global.inMemoryDb.medicines];
      if (onlyActive) {
        list = list.filter(m => m.active);
      }
      return NextResponse.json(list);
    }

    if (type === "logs") {
      const logs = await MedicineLog.find()
        .sort({ takenAt: -1 })
        .limit(limit);
      return NextResponse.json(logs);
    }

    const onlyActive = req.nextUrl.searchParams.get("active") === "true";
    const filter = onlyActive ? { active: true } : {};
    const list = await Medicine.find(filter).sort({ createdAt: 1 });
    return NextResponse.json(list);
  } catch (err) {
    console.warn("Medicine GET error, falling back:", err);
    const type = req.nextUrl.searchParams.get("type") ?? "types";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");

    if (type === "logs") {
      const logs = [...global.inMemoryDb.medicineLogs]
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
        .slice(0, limit);
      return NextResponse.json(logs);
    }
    const list = [...global.inMemoryDb.medicines];
    return NextResponse.json(list);
  }
}

// POST /api/medicine?type=types             → add/edit prescribed medicine
// POST /api/medicine?type=logs              → record medication dose taken
export async function POST(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? "types";
    const body = await req.json();
    await connectDB();

    if (global.isMongoOffline) {
      if (type === "logs") {
        const log = {
          _id: "ml-" + Date.now(),
          ...body,
          takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
          createdAt: new Date()
        };
        global.inMemoryDb.medicineLogs.unshift(log);
        return NextResponse.json(log, { status: 201 });
      } else {
        const item = {
          _id: "med-" + Date.now(),
          active: true,
          ...body,
          createdAt: new Date()
        };
        global.inMemoryDb.medicines.push(item);
        return NextResponse.json(item, { status: 201 });
      }
    }

    if (type === "logs") {
      const log = await MedicineLog.create({
        ...body,
        takenAt: body.takenAt ? new Date(body.takenAt) : new Date()
      });
      return NextResponse.json(log, { status: 201 });
    } else {
      const item = await Medicine.create(body);
      return NextResponse.json(item, { status: 201 });
    }
  } catch (err) {
    console.warn("Medicine POST error, falling back:", err);
    return NextResponse.json({ error: "DB Error, offline fallback used." }, { status: 201 });
  }
}

// DELETE /api/medicine?type=types           → delete a prescribed medicine
// DELETE /api/medicine?type=logs            → delete a medication dose taken log
export async function DELETE(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? "types";
    const { id } = await req.json();
    await connectDB();

    if (global.isMongoOffline) {
      if (type === "logs") {
        global.inMemoryDb.medicineLogs = global.inMemoryDb.medicineLogs.filter(l => l._id !== id);
      } else {
        global.inMemoryDb.medicines = global.inMemoryDb.medicines.filter(m => m._id !== id);
      }
      return NextResponse.json({ success: true });
    }

    if (type === "logs") {
      await MedicineLog.findByIdAndDelete(id);
    } else {
      await Medicine.findByIdAndDelete(id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Medicine DELETE error, falling back:", err);
    return NextResponse.json({ success: true });
  }
}

// PATCH /api/medicine?type=types            → toggle active state or edit medicine
export async function PATCH(req: NextRequest) {
  try {
    const { id, active, name, dosage, timing, notes } = await req.json();
    await connectDB();

    if (global.isMongoOffline) {
      const med = global.inMemoryDb.medicines.find(m => m._id === id);
      if (med) {
        if (active !== undefined) med.active = active;
        if (name !== undefined) med.name = name;
        if (dosage !== undefined) med.dosage = dosage;
        if (timing !== undefined) med.timing = timing;
        if (notes !== undefined) med.notes = notes;
      }
      return NextResponse.json({ success: true });
    }

    const updates: Record<string, unknown> = {};
    if (active !== undefined) updates.active = active;
    if (name !== undefined) updates.name = name;
    if (dosage !== undefined) updates.dosage = dosage;
    if (timing !== undefined) updates.timing = timing;
    if (notes !== undefined) updates.notes = notes;

    await Medicine.findByIdAndUpdate(id, updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Medicine PATCH error, falling back:", err);
    return NextResponse.json({ success: true });
  }
}
