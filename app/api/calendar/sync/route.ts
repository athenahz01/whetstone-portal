import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "../../../lib/auth";
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
// GCal colorId mapping: https://developers.google.com/calendar/api/v3/reference/colors
const COLOR_KEY_TO_GCAL: Record<string, string> = {
  blue: "9",     // Blueberry
  green: "10",   // Basil  
  red: "11",     // Tomato
  purple: "3",   // Grape
  amber: "5",    // Banana
  teal: "7",     // Peacock
  pink: "4",     // Flamingo
  slate: "8",    // Graphite
};
const GCAL_TO_COLOR_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(COLOR_KEY_TO_GCAL).map(([k, v]) => [v, k])
);

export async function POST(request: NextRequest) {
  const authUserPOST = await getAuthUser(request);
  if (!authUserPOST) return unauthorized();

  const body = await request.json();
  const { profileId, title, date, description, startMinutes, durationMinutes, colorKey } = body;

  console.log("[calendar-sync] POST body:", JSON.stringify({ title, date, startMinutes, durationMinutes }));

  const token = await getValidToken(profileId);
  if (!token) {
    return NextResponse.json({ error: "Not connected to Google Calendar" }, { status: 401 });
  }

  let event;

  if (typeof startMinutes === "number") {
    // Timed event — startMinutes is minutes from midnight (e.g. 480 = 8:00 AM)
    const startHour = Math.floor(startMinutes / 60);
    const startMin = startMinutes % 60;
    const duration = durationMinutes || 30;
    const endTotalMin = startMinutes + duration;
    const endHour = Math.floor(endTotalMin / 60);
    const endMin = endTotalMin % 60;

    const startTime = `${date}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;
    const endTime = `${date}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

    console.log("[calendar-sync] Creating TIMED event:", startTime, "→", endTime);

    event = {
      summary: `${title} [Whetstone]`,
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
      summary: `${title} [Whetstone]`,
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

  // Add color if specified
  const gcalColorId = colorKey ? COLOR_KEY_TO_GCAL[colorKey] : undefined;
  if (gcalColorId) (event as any).colorId = gcalColorId;

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
  const authUserGET = await getAuthUser(request);
  if (!authUserGET) return unauthorized();

  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  }

  const token = await getValidToken(profileId);
  if (!token) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const now = new Date();
  // Start from beginning of today (not current moment) to catch all today's events
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const future = new Date();
  future.setDate(future.getDate() + 60);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${startOfDay.toISOString()}&timeMax=${future.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=100&timeZone=America/New_York`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await res.json();

  const events = (data.items || []).map((e: any) => {
    let date = "";
    let startMinutes: number | null = null;
    let durationMinutes: number | null = null;
    let allDay = false;

    if (e.start?.date) {
      date = e.start.date;
      allDay = true;
    } else if (e.start?.dateTime) {
      // Parse the dateTime properly to handle timezone offsets
      // GCal returns like "2026-03-11T16:55:00-04:00" — we need the LOCAL date, not UTC
      // With timeZone=America/New_York in the request, dateTime should already be in ET
      // But to be safe, parse and extract the date portion before the T
      const dtStr = e.start.dateTime;
      // If it contains a timezone offset (+ or - after time), the date before T is the local date
      date = dtStr.substring(0, 10);
      const startMatch = dtStr.match(/T(\d{2}):(\d{2})/);
      if (startMatch) {
        startMinutes = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
      }
      if (e.end?.dateTime) {
        const endMatch = e.end.dateTime.match(/T(\d{2}):(\d{2})/);
        if (endMatch && startMinutes !== null) {
          const endMin = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);
          durationMinutes = endMin - startMinutes;
          if (durationMinutes <= 0) durationMinutes = 30;
        }
      }
    }

    return {
      id: e.id,
      title: e.summary || "Untitled",
      date,
      source: "google",
      allDay,
      startMinutes,
      durationMinutes,
      colorKey: e.colorId ? GCAL_TO_COLOR_KEY[e.colorId] || null : null,
      attendees: (e.attendees || []).map((a: any) => a.email?.toLowerCase()).filter(Boolean),
      meetingLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri || "",
      location: e.location || "",
    };
  });

  return NextResponse.json({ events });
}

// PATCH: Update an existing Whetstone event in Google Calendar (for repositioning)
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { profileId, title, date, startMinutes, durationMinutes, colorKey } = body;

  const token = await getValidToken(profileId);
  if (!token) {
    return NextResponse.json({ error: "Not connected to Google Calendar" }, { status: 401 });
  }

  // Search for the existing event by title
  const searchTitle = `${title} [Whetstone]`;
  const searchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(searchTitle)}&maxResults=5&singleEvents=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  const existing = (searchData.items || []).find((e: any) => e.summary === searchTitle);

  if (existing) {
    // Update the existing event
    const startHour = Math.floor(startMinutes / 60);
    const startMin = startMinutes % 60;
    const duration = durationMinutes || 30;
    const endTotalMin = startMinutes + duration;
    const endHour = Math.floor(endTotalMin / 60);
    const endMin = endTotalMin % 60;

    const startTime = `${date}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;
    const endTime = `${date}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

    const updateRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing.id}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { dateTime: startTime, timeZone: "America/New_York" },
          end: { dateTime: endTime, timeZone: "America/New_York" },
          ...(colorKey && COLOR_KEY_TO_GCAL[colorKey] ? { colorId: COLOR_KEY_TO_GCAL[colorKey] } : {}),
        }),
      }
    );
    const result = await updateRes.json();
    return NextResponse.json({ updated: true, ...result });
  } else {
    // Fallback: create new event if not found
    return NextResponse.json({ updated: false, message: "Event not found, skipped update" });
  }
}