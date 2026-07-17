import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WaterLog from "@/models/WaterLog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");

    if (global.isMongoOffline) {
      const logs = [...global.inMemoryDb.waterLogs]
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, limit);
      return NextResponse.json(logs);
    }

    const logs = await WaterLog.find()
      .sort({ measuredAt: -1 })
      .limit(limit);
    return NextResponse.json(logs);
  } catch (err) {
    console.warn("Water GET error, falling back:", err);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
    const logs = [...global.inMemoryDb.waterLogs]
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
      .slice(0, limit);
    return NextResponse.json(logs);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectDB();

    if (global.isMongoOffline) {
      const log = {
        _id: "w-" + Date.now(),
        amount: body.amount,
        note: body.note || "",
        measuredAt: body.measuredAt ? new Date(body.measuredAt) : new Date(),
        createdAt: new Date()
      };
      global.inMemoryDb.waterLogs.unshift(log);
      return NextResponse.json(log, { status: 201 });
    }

    const log = await WaterLog.create({
      amount: body.amount,
      note: body.note || "",
      measuredAt: body.measuredAt ? new Date(body.measuredAt) : new Date()
    });
    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.warn("Water POST error, falling back:", err);
    const body = await req.json().catch(() => ({}));
    const log = {
      _id: "w-" + Date.now(),
      amount: body.amount ?? 250,
      note: body.note || "",
      measuredAt: body.measuredAt ? new Date(body.measuredAt) : new Date(),
      createdAt: new Date()
    };
    global.inMemoryDb.waterLogs.unshift(log);
    return NextResponse.json(log, { status: 201 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await connectDB();

    if (global.isMongoOffline) {
      global.inMemoryDb.waterLogs = global.inMemoryDb.waterLogs.filter(l => l._id !== id);
      return NextResponse.json({ success: true });
    }

    await WaterLog.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Water DELETE error, falling back:", err);
    return NextResponse.json({ success: true });
  }
}
