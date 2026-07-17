import { NextResponse } from "next/server";
import { getOAuth2Client, CALENDAR_SCOPES } from "@/lib/googleCalendar";

export async function GET() {
  const oauth2Client = getOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Offline zaroori hai refreshtoken ke liye
    scope: CALENDAR_SCOPES,
    prompt: "consent"
  });

  return NextResponse.redirect(authUrl);
}