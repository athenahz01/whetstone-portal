import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getValidToken(profileId: string) {
  const { data: tokenData, error: fetchErr } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (fetchErr) {
    console.error("[calendar-sync] Error fetching token:", fetchErr.message);
    return null;
  }

  if (!tokenData) {
    console.error("[calendar-sync] No token found for profile:", profileId);
    return null;
  }

  // Check if token is expired
  if (new Date(tokenData.expires_at) < new Date()) {
    // Refresh the token
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const newTokens = await res.json();
    if (!newTokens.access_token) return null;

    const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

    await supabase
      .from("google_tokens")
      .update({ access_token: newTokens.access_token, expires_at: expiresAt })
      .eq("profile_id", profileId);

    return newTokens.access_token;
  }

  return tokenData.access_token;
}

// PUSH: Add a deadline or timed event to Google Calendar
export async function POST(request: NextRequest) {
  const { profileId, title, date, description, startMinutes, durationMinutes } = await request.json();

  const token = await getValidToken(profileId);
  if (!token) {
    return NextResponse.json({ error: "Not connected to Google Calendar" }, { status: 401 });
  }

  let event;

  if (startMinutes !== undefined && startMinutes !== null) {
    // Timed event — startMinutes is minutes from midnight (e.g. 480 = 8:00 AM)
    const startHour = Math.floor(startMinutes / 60);
    const startMin = startMinutes % 60;
    const duration = durationMinutes || 30;
    const endTotalMin = startMinutes + duration;
    const endHour = Math.floor(endTotalMin / 60);
    const endMin = endTotalMin % 60;

    const startTime = `${date}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;
    const endTime = `${date}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

    event = {
      summary: `[Whetstone] ${title}`,
      description: description || "",
      start: { dateTime: startTime, timeZone: "America/New_York" },
      end: { dateTime: endTime, timeZone: "America/New_York" },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 15 },
        ],
      },
    };
  } else {
    // All-day event (deadlines)
    event = {
      summary: `[Whetstone] ${title}`,
      description: description || "",
      start: { date },
      end: { date },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 1440 },
          { method: "popup", minutes: 60 },
        ],
      },
    };
  }

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  const result = await res.json();
  
  if (!res.ok) {
    console.error("[calendar-sync] Google API error:", res.status, JSON.stringify(result));
  }
  
  return NextResponse.json(result);
}

// PULL: Get events from Google Calendar
export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  }

  const token = await getValidToken(profileId);
  if (!token) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 60);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${now.toISOString()}&timeMax=${future.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await res.json();

  const events = (data.items || []).map((e: any) => {
    let date = "";
    if (e.start?.date) {
      // All-day event
      date = e.start.date;
    } else if (e.start?.dateTime) {
      // Timed event - extract date from the ISO string directly
      // e.start.dateTime looks like "2026-03-06T10:00:00-05:00"
      // Take the first 10 characters to get the local date
      date = e.start.dateTime.substring(0, 10);
    }

    return {
      id: e.id,
      title: e.summary || "Untitled",
      date,
      source: "google",
      attendees: (e.attendees || []).map((a: any) => a.email?.toLowerCase()).filter(Boolean),
      meetingLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri || "",
      location: e.location || "",
    };
  });

  return NextResponse.json({ events });
}