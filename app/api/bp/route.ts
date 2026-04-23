import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BPReading from "@/models/BPReading";

export async function GET(req: NextRequest) {
  await connectDB();
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
  const readings = await BPReading.find().sort({ measuredAt: -1 }).limit(limit);
  return NextResponse.json(readings);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const reading = await BPReading.create(body);
  return NextResponse.json(reading, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { id } = await req.json();
  await BPReading.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
