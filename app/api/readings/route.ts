import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SugarReading from "@/models/SugarReading";
import InsulinLog from "@/models/InsulinLog";
import InsulinType from "@/models/Insulin";
import Insulin from "@/models/Insulin";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const _ensureInsulinModel = Insulin; 
    const _ensureInsulinLogModel = InsulinLog;
    
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");

    if (global.isMongoOffline) {
      const readings = [...global.inMemoryDb.sugarReadings]
        .map(r => {
          // populate insulinLogId
          const log = global.inMemoryDb.insulinLogs.find(l => l._id === r.insulinLogId);
          let populatedLog = null;
          if (log) {
            const type = global.inMemoryDb.insulinTypes.find(t => t._id === log.insulinTypeId);
            populatedLog = {
              ...log,
              insulinTypeId: type ? { name: type.name, units: type.units, timing: type.timing } : null,
            };
          }
          return {
            ...r,
            insulinLogId: populatedLog,
          };
        })
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, limit);
      return NextResponse.json(readings);
    }

    // Populate insulinLogId → and its insulinTypeId for the live insulin name
    const readings = await SugarReading.find()
      .populate({
        path: "insulinLogId",
        populate: { path: "insulinTypeId", select: "name units timing" },
      })
      .sort({ measuredAt: -1 })
      .limit(limit);
    return NextResponse.json(readings);
  } catch (err) {
    console.warn("Readings GET error, falling back:", err);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
    const readings = [...global.inMemoryDb.sugarReadings]
      .map(r => {
        const log = global.inMemoryDb.insulinLogs.find(l => l._id === r.insulinLogId);
        let populatedLog = null;
        if (log) {
          const type = global.inMemoryDb.insulinTypes.find(t => t._id === log.insulinTypeId);
          populatedLog = {
            ...log,
            insulinTypeId: type ? { name: type.name, units: type.units, timing: type.timing } : null,
          };
        }
        return {
          ...r,
          insulinLogId: populatedLog,
        };
      })
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
      .slice(0, limit);
    return NextResponse.json(readings);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (global.isMongoOffline) {
      if (body.insulinLogId) {
        const log = global.inMemoryDb.insulinLogs.find(l => l._id === body.insulinLogId);
        if (log) {
          const insulinType = global.inMemoryDb.insulinTypes.find(t => t._id === log.insulinTypeId);
          const liveName = insulinType
            ? `${insulinType.name} ${insulinType.units}u`
            : log.insulinName;
          body.insulinName    = liveName;
          body.insulinUnits   = log.units;
          body.insulinTakenAt = log.takenAt;
        }
      }
      const reading = {
        _id: "sug-" + Date.now(),
        ...body,
        createdAt: new Date(),
      };
      global.inMemoryDb.sugarReadings.unshift(reading);

      // Populate log for response
      const log = global.inMemoryDb.insulinLogs.find(l => l._id === reading.insulinLogId);
      let populatedLog = null;
      if (log) {
        const type = global.inMemoryDb.insulinTypes.find(t => t._id === log.insulinTypeId);
        populatedLog = {
          ...log,
          insulinTypeId: type ? { name: type.name, units: type.units, timing: type.timing } : null,
        };
      }
      return NextResponse.json({ ...reading, insulinLogId: populatedLog }, { status: 201 });
    }

    // Snapshot from InsulinLog (still keep snapshot in case log deleted later)
    if (body.insulinLogId) {
      const log = await InsulinLog.findById(body.insulinLogId)
        .populate("insulinTypeId", "name units");
      if (log) {
        // Use live name from populated insulinTypeId if available, else snapshot
        const liveType = log.insulinTypeId as unknown as { name: string; units: number };
        const liveName = log.insulinTypeId
          ? `${liveType.name} ${liveType.units}u`
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
  } catch (err) {
    console.warn("Readings POST error, falling back:", err);
    return NextResponse.json({ error: "Service degraded, fallback failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, ...updates } = body;

    if (global.isMongoOffline) {
      const idx = global.inMemoryDb.sugarReadings.findIndex(r => r._id === id);
      if (idx === -1) return NextResponse.json({ error: "Reading not found" }, { status: 404 });
      const existing = global.inMemoryDb.sugarReadings[idx];
      const updated = { ...existing, ...updates };

      if (updates.insulinLogId) {
        const log = global.inMemoryDb.insulinLogs.find(l => l._id === updates.insulinLogId);
        if (log) {
          const insulinType = global.inMemoryDb.insulinTypes.find(t => t._id === log.insulinTypeId);
          const liveName = insulinType
            ? `${insulinType.name} ${insulinType.units}u`
            : log.insulinName;
          updated.insulinName    = liveName;
          updated.insulinUnits   = log.units;
          updated.insulinTakenAt = log.takenAt;
        }
      } else if (updates.insulinLogId === null || updates.insulinLogId === "") {
        updated.insulinLogId    = null;
        updated.insulinName     = "";
        updated.insulinUnits    = 0;
        updated.insulinTakenAt  = null;
      }

      global.inMemoryDb.sugarReadings[idx] = updated;

      // Populate for response
      const log = global.inMemoryDb.insulinLogs.find(l => l._id === updated.insulinLogId);
      let populatedLog = null;
      if (log) {
        const type = global.inMemoryDb.insulinTypes.find(t => t._id === log.insulinTypeId);
        populatedLog = {
          ...log,
          insulinTypeId: type ? { name: type.name, units: type.units, timing: type.timing } : null,
        };
      }
      return NextResponse.json({ ...updated, insulinLogId: populatedLog });
    }

    if (updates.insulinLogId) {
      const log = await InsulinLog.findById(updates.insulinLogId)
        .populate("insulinTypeId", "name units");
      if (log) {
        const liveType = log.insulinTypeId as unknown as { name: string; units: number };
        const liveName = log.insulinTypeId
          ? `${liveType.name} ${liveType.units}u`
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
  } catch (err) {
    console.warn("Readings PATCH error, falling back:", err);
    return NextResponse.json({ error: "Service degraded, fallback failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { id } = await req.json();

    if (global.isMongoOffline) {
      global.inMemoryDb.sugarReadings = global.inMemoryDb.sugarReadings.filter(r => r._id !== id);
      return NextResponse.json({ success: true });
    }

    await SugarReading.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Readings DELETE error, falling back:", err);
    return NextResponse.json({ success: true });
  }
}
