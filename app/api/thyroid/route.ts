import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ThyroidReading from "@/models/ThyroidReading";

export async function GET(req: NextRequest) {
  await connectDB();
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");
  const readings = await ThyroidReading.find().sort({ testedAt: -1 }).limit(limit);
  return NextResponse.json(readings);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const reading = await ThyroidReading.create(body);
  return NextResponse.json(reading, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { id } = await req.json();
  await ThyroidReading.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
