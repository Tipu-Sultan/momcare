import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getOAuth2Client } from "@/lib/googleCalendar";
import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/models/Appointment";
import { Doctor } from "@/models/Doctor";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const appointment = await Appointment.findById(id);
    if (!appointment) return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });

    if (appointment.gCalEventId) {
      const cookieStore = await cookies();
      const tokenCookie = cookieStore.get("gcal_token");
      if (tokenCookie) {
        try {
          const oauth2Client = getOAuth2Client();
          oauth2Client.setCredentials(JSON.parse(tokenCookie.value));
          const calendar = google.calendar({ version: "v3", auth: oauth2Client });
          await calendar.events.delete({ calendarId: "primary", eventId: appointment.gCalEventId });
        } catch (e) { console.error(e); }
      }
    }

    await Appointment.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ success: false }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { doctorIds, customTitle, specialty, appointmentDate, location, notes } = body;

    const appointment = await Appointment.findById(id);
    if (!appointment) return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });

    if (appointment.gCalEventId) {
      const cookieStore = await cookies();
      const tokenCookie = cookieStore.get("gcal_token");
      if (tokenCookie) {
        try {
          const oauth2Client = getOAuth2Client();
          oauth2Client.setCredentials(JSON.parse(tokenCookie.value));
          const calendar = google.calendar({ version: "v3", auth: oauth2Client });

          let summaryText = customTitle || "Medical Visit";
          let doctorSpecialtyText = "";

          if (doctorIds && doctorIds.length > 0) {
            const docs = await Doctor.find({ _id: { $in: doctorIds } });
            summaryText = `🏥 Visit: ${docs.map(d => d.name).join(", ")}`;
            doctorSpecialtyText = docs
              .map(d => `${d.name} (${d.specialties?.join(", ") || "General"})`)
              .join(" | ");
          }

          await calendar.events.update({
            calendarId: "primary",
            eventId: appointment.gCalEventId,
            requestBody: {
              summary: `${summaryText} (${specialty})`,
              location,
              description: `${notes || ""}${doctorSpecialtyText ? `\n\nDoctor Specialties: ${doctorSpecialtyText}` : ""}`,
              start: { dateTime: new Date(appointmentDate).toISOString(), timeZone: "Asia/Kolkata" },
              end: { dateTime: new Date(new Date(appointmentDate).getTime() + 60 * 60 * 1000).toISOString(), timeZone: "Asia/Kolkata" },
            }
          });
        } catch (e) { console.error(e); }
      }
    }

    appointment.doctorIds = doctorIds;
    appointment.customTitle = customTitle;
    appointment.specialty = specialty;
    appointment.appointmentDate = appointmentDate;
    appointment.location = location;
    appointment.notes = notes;
    await appointment.save();

    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ success: false }, { status: 500 }); }
}