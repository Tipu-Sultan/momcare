import { google } from "googleapis";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Scopes required to interact with calendars
export const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];