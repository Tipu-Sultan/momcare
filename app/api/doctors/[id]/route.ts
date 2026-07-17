import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Doctor } from "@/models/Doctor";
import { Appointment } from "@/models/Appointment";

// 1. UPDATE DOCTOR ENTRY
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // Unwrapping params
    await connectDB();
    const body = await req.json();
    const { name, phone, address, specialties } = body;

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      {
        name,
        phone,
        address,
        specialties: Array.isArray(specialties) ? specialties : [],
      },
      { returnDocument: 'after' } // Updated from deprecated 'new' option
    );

    if (!updatedDoctor) {
      return NextResponse.json({ success: false, error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, doctor: updatedDoctor });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 2. DELETE DOCTOR RECORD
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // Unwrapping params
    await connectDB();
    
    const referencedApp = await Appointment.findOne({ doctorIds: id });
    if (referencedApp) {
      return NextResponse.json({ 
        success: false, 
        error: "Doctor is mapped to an appointment and cannot be deleted." 
      }, { status: 400 });
    }

    await Doctor.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Doctor deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}