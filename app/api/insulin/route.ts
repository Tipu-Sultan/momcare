import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Insulin from "@/models/Insulin";
import InsulinLog from "@/models/InsulinLog";

// GET /api/insulin?type=types              → all insulin types
// GET /api/insulin?type=types&active=true  → only active types
// GET /api/insulin?type=logs               → recent logs (default 50)
// GET /api/insulin?type=logs&hours=24      → logs within last N hours (for sugar dropdown)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const type  = req.nextUrl.searchParams.get("type")  ?? "types";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
    const hours = parseInt(req.nextUrl.searchParams.get("hours") ?? "0");

    if (global.isMongoOffline) {
      if (type === "logs") {
        let logs = [...global.inMemoryDb.insulinLogs];
        if (hours > 0) {
          const cutOff = Date.now() - hours * 60 * 60 * 1000;
          logs = logs.filter(l => new Date(l.takenAt).getTime() >= cutOff);
        }
        logs.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
        return NextResponse.json(logs.slice(0, limit));
      }

      const onlyActive = req.nextUrl.searchParams.get("active") === "true";
      let list = [...global.inMemoryDb.insulinTypes];
      if (onlyActive) {
        list = list.filter(t => t.active);
      }
      list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
      return NextResponse.json(list);
    }

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
  } catch (err) {
    console.warn("Insulin GET error, falling back:", err);
    const type  = req.nextUrl.searchParams.get("type")  ?? "types";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
    const hours = parseInt(req.nextUrl.searchParams.get("hours") ?? "0");

    if (type === "logs") {
      let logs = [...global.inMemoryDb.insulinLogs];
      if (hours > 0) {
        const cutOff = Date.now() - hours * 60 * 60 * 1000;
        logs = logs.filter(l => new Date(l.takenAt).getTime() >= cutOff);
      }
      logs.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
      return NextResponse.json(logs.slice(0, limit));
    }

    const onlyActive = req.nextUrl.searchParams.get("active") === "true";
    let list = [...global.inMemoryDb.insulinTypes];
    if (onlyActive) {
      list = list.filter(t => t.active);
    }
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    return NextResponse.json(list);
  }
}

// POST /api/insulin?type=types  → create insulin type
// POST /api/insulin?type=log    → log a dose taken
export async function POST(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? "types";
    const body = await req.json();
    await connectDB();

    if (global.isMongoOffline) {
      if (type === "log") {
        const insulin = global.inMemoryDb.insulinTypes.find(t => t._id === body.insulinTypeId);
        if (!insulin) return NextResponse.json({ error: "Insulin type not found" }, { status: 404 });
        const log = {
          _id: "log-" + Date.now(),
          insulinTypeId: insulin._id,
          insulinName: `${insulin.name} ${insulin.units}u`,
          units: insulin.units,
          takenAt: body.takenAt,
          note: body.note ?? "",
          createdAt: new Date(),
        };
        global.inMemoryDb.insulinLogs.unshift(log);
        return NextResponse.json(log, { status: 201 });
      }

      const insulin = {
        _id: "ins-" + Date.now(),
        ...body,
        createdAt: new Date(),
      };
      global.inMemoryDb.insulinTypes.push(insulin);
      return NextResponse.json(insulin, { status: 201 });
    }

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
  } catch (err) {
    console.warn("Insulin POST error, falling back:", err);
    return NextResponse.json({ error: "Service degraded, fallback failed" }, { status: 500 });
  }
}

// PATCH /api/insulin?type=types → edit insulin type
// PATCH /api/insulin?type=log   → edit log entry
export async function PATCH(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? "types";
    const body = await req.json();
    const { id, ...updates } = body;
    await connectDB();

    if (global.isMongoOffline) {
      if (type === "log") {
        const idx = global.inMemoryDb.insulinLogs.findIndex(l => l._id === id);
        if (idx === -1) return NextResponse.json({ error: "Log not found" }, { status: 404 });
        const existing = global.inMemoryDb.insulinLogs[idx];
        const updated = { ...existing, ...updates };

        if (updates.insulinTypeId) {
          const insulin = global.inMemoryDb.insulinTypes.find(t => t._id === updates.insulinTypeId);
          if (insulin) {
            updated.insulinName = `${insulin.name} ${insulin.units}u`;
            updated.units = insulin.units;
          }
        }
        global.inMemoryDb.insulinLogs[idx] = updated;
        return NextResponse.json(updated);
      }

      const idx = global.inMemoryDb.insulinTypes.findIndex(t => t._id === id);
      if (idx === -1) return NextResponse.json({ error: "Insulin type not found" }, { status: 404 });
      const existing = global.inMemoryDb.insulinTypes[idx];
      const updated = { ...existing, ...updates };
      global.inMemoryDb.insulinTypes[idx] = updated;
      return NextResponse.json(updated);
    }

    if (type === "log") {
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
  } catch (err) {
    console.warn("Insulin PATCH error, falling back:", err);
    return NextResponse.json({ error: "Service degraded, fallback failed" }, { status: 500 });
  }
}

// DELETE /api/insulin?type=types or log
export async function DELETE(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? "types";
    const { id } = await req.json();
    await connectDB();

    if (global.isMongoOffline) {
      if (type === "log") {
        global.inMemoryDb.insulinLogs = global.inMemoryDb.insulinLogs.filter(l => l._id !== id);
      } else {
        global.inMemoryDb.insulinTypes = global.inMemoryDb.insulinTypes.filter(t => t._id !== id);
      }
      return NextResponse.json({ success: true });
    }

    if (type === "log") {
      await InsulinLog.findByIdAndDelete(id);
    } else {
      await Insulin.findByIdAndDelete(id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Insulin DELETE error, falling back:", err);
    return NextResponse.json({ success: true });
  }
}
