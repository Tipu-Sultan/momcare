import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ThyroidReading from "@/models/ThyroidReading";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    if (global.isMongoOffline) {
      const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");
      const readings = [...global.inMemoryDb.thyroidReadings]
        .sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime())
        .slice(0, limit);
      return NextResponse.json(readings);
    }
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");
    const readings = await ThyroidReading.find().sort({ testedAt: -1 }).limit(limit);
    return NextResponse.json(readings);
  } catch (err) {
    console.warn("Thyroid GET error, falling back:", err);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");
    const readings = [...global.inMemoryDb.thyroidReadings]
      .sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime())
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
        _id: "thy-" + Date.now(),
        ...body,
        createdAt: new Date(),
      };
      global.inMemoryDb.thyroidReadings.unshift(reading);
      return NextResponse.json(reading, { status: 201 });
    }
    const reading = await ThyroidReading.create(body);
    return NextResponse.json(reading, { status: 201 });
  } catch (err) {
    console.warn("Thyroid POST error, falling back:", err);
    const body = await req.json().catch(() => ({}));
    const reading = {
      _id: "thy-" + Date.now(),
      ...body,
      createdAt: new Date(),
    };
    global.inMemoryDb.thyroidReadings.unshift(reading);
    return NextResponse.json(reading, { status: 201 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await connectDB();
    if (global.isMongoOffline) {
      global.inMemoryDb.thyroidReadings = global.inMemoryDb.thyroidReadings.filter(
        (r) => r._id !== id
      );
      return NextResponse.json({ success: true });
    }
    await ThyroidReading.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Thyroid DELETE error, falling back:", err);
    return NextResponse.json({ success: true });
  }
}
