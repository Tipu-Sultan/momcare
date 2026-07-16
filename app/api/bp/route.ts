import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BPReading from "@/models/BPReading";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    if (global.isMongoOffline) {
      const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
      const readings = [...global.inMemoryDb.bpReadings]
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, limit);
      return NextResponse.json(readings);
    }
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
    const readings = await BPReading.find().sort({ measuredAt: -1 }).limit(limit);
    return NextResponse.json(readings);
  } catch (err) {
    console.warn("BP GET error, falling back:", err);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
    const readings = [...global.inMemoryDb.bpReadings]
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
      .slice(0, limit);
    return NextResponse.json(readings);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectDB();
    if (global.isMongoOffline) {
      const reading = {
        _id: "bp-" + Date.now(),
        ...body,
        createdAt: new Date(),
      };
      global.inMemoryDb.bpReadings.unshift(reading);
      return NextResponse.json(reading, { status: 201 });
    }
    const reading = await BPReading.create(body);
    return NextResponse.json(reading, { status: 201 });
  } catch (err) {
    console.warn("BP POST error, falling back:", err);
    const body = await req.json().catch(() => ({}));
    const reading = {
      _id: "bp-" + Date.now(),
      ...body,
      createdAt: new Date(),
    };
    global.inMemoryDb.bpReadings.unshift(reading);
    return NextResponse.json(reading, { status: 201 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await connectDB();
    if (global.isMongoOffline) {
      global.inMemoryDb.bpReadings = global.inMemoryDb.bpReadings.filter(
        (r) => r._id !== id
      );
      return NextResponse.json({ success: true });
    }
    await BPReading.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("BP DELETE error, falling back:", err);
    return NextResponse.json({ success: true });
  }
}
