import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOAuth2Client } from "@/lib/googleCalendar";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Cookie standard locker layer inside system mapping
    const cookieStore = await cookies();
    cookieStore.set("gcal_token", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 1 Week access window
    });

    // Authentication final hone par sidhe dashboard/appointments page par wapas bhejenge
    const targetOrigin = process.env.GOOGLE_REDIRECT_URI ? new URL(process.env.GOOGLE_REDIRECT_URI).origin : "http://localhost:3000";
    return NextResponse.redirect(`${targetOrigin}/?tab=appointments`);
  } catch (err) {
    console.error("OAuth token generation breakdown error:", err);
    return NextResponse.json({ error: "Failed token exchange runtime" }, { status: 500 });
  }
}