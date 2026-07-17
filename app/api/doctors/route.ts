import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Doctor } from "@/models/Doctor";

export async function GET() {
  try {
    await connectDB();
    const doctors = await Doctor.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, doctors });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Doctors fetch error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, phone, address } = await req.json();
    if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });

    const newDoctor = await Doctor.create({ name, phone, address });
    return NextResponse.json({ success: true, doctor: newDoctor });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Doctor creation error" }, { status: 500 });
  }
}