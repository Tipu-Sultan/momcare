import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getOAuth2Client } from "@/lib/googleCalendar";
import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Doctor } from "@/models/Doctor";

export async function GET() {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("gcal_token");

    const appointments = await Appointment.find({})
      .populate("doctorIds")
      .sort({ appointmentDate: -1 });

    return NextResponse.json({ success: true, appointments, isGoogleLinked: !!tokenCookie });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Fetch appointments failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { doctorIds, customTitle, specialty, appointmentDate, location, notes, syncToGoogle } = body;

    if (!appointmentDate) {
      return NextResponse.json({ success: false, error: "Appointment date is required" }, { status: 400 });
    }

    let generatedGCalId = null;
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("gcal_token");

    if (syncToGoogle && tokenCookie) {
      try {
        const tokens = JSON.parse(tokenCookie.value);
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        let summaryText = customTitle || "Medical Visit";
        let doctorSpecialtyText = "";

        if (doctorIds && doctorIds.length > 0) {
          const docs = await Doctor.find({ _id: { $in: doctorIds } });
          if (docs.length > 0) {
            summaryText = `🏥 Visit: ${docs.map(d => d.name).join(", ")}`;
            doctorSpecialtyText = docs
              .map(d => `${d.name} (${d.specialties?.join(", ") || "General"})`)
              .join(" | ");
          }
        }

        const eventRes = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: `${summaryText} (${specialty})`,
            location: location || "Clinic/Hospital",
            description: `${notes || "MomCare Sync Track"}${doctorSpecialtyText ? `\n\nDoctor Specialties: ${doctorSpecialtyText}` : ""}`,
            start: { dateTime: new Date(appointmentDate).toISOString(), timeZone: "Asia/Kolkata" },
            end: { dateTime: new Date(new Date(appointmentDate).getTime() + 60 * 60 * 1000).toISOString(), timeZone: "Asia/Kolkata" },
          },
        });
        generatedGCalId = eventRes.data.id || null;
      } catch (gCalErr) {
        console.error("GCal Sync Failed, continuing DB insertion:", gCalErr);
      }
    }

    // Direct creation with exact array checks
    const appointment = await Appointment.create({
      doctorIds: Array.isArray(doctorIds) ? doctorIds : [],
      customTitle: customTitle || "",
      specialty,
      appointmentDate: new Date(appointmentDate),
      location: location || "",
      notes: notes || "",
      gCalEventId: generatedGCalId
    });

    return NextResponse.json({ success: true, appointment });
  } catch (err) {
    console.error("Error creating appointment:", err);
    return NextResponse.json({ success: false, error: "DB Save Operation Failed" }, { status: 500 });
  }
}