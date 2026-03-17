import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: format date for iCal (YYYYMMDD or YYYYMMDDTHHMMSS)
function icalDate(dateStr: string, timeStr?: string): string {
  const d = dateStr.replace(/-/g, "");
  if (timeStr) {
    const t = timeStr.replace(/:/g, "").padEnd(6, "0");
    return `${d}T${t}`;
  }
  return d;
}

// Helper: add minutes to a time string
function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const nh = Math.floor(totalMin / 60) % 24;
  const nm = totalMin % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

// GET /api/ical-feed?token=PROFILE_ID
// Returns .ics format that Apple Calendar can subscribe to
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token parameter", { status: 400 });
  }

  // Look up profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, student_id, display_name, email")
    .eq("id", token)
    .single();

  if (!profile) {
    return new NextResponse("Invalid token", { status: 404 });
  }

  const events: string[] = [];
  const now = new Date();
  const tzid = "America/New_York";

  if (profile.role === "student" || profile.role === "parent") {
    // Student/parent: get their deadlines, sessions, booking requests
    const studentId = profile.student_id;
    if (studentId) {
      // Deadlines
      const { data: deadlines } = await supabase
        .from("deadlines")
        .select("*")
        .eq("student_id", studentId)
        .gte("due", now.toISOString().split("T")[0]);

      (deadlines || []).forEach((dl: any) => {
        events.push([
          "BEGIN:VEVENT",
          `UID:whetstone-dl-${dl.id}@whetstone-portal.com`,
          `DTSTART;VALUE=DATE:${icalDate(dl.due)}`,
          `DTEND;VALUE=DATE:${icalDate(dl.due)}`,
          `SUMMARY:${(dl.title || "Task").replace(/,/g, "\\,")} [W]`,
          `DESCRIPTION:${dl.category || ""} - ${dl.status || "pending"}`,
          `CATEGORIES:${dl.category || "task"}`,
          "END:VEVENT",
        ].join("\r\n"));
      });

      // Sessions / booking requests
      const { data: brs } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("student_id", studentId)
        .in("status", ["approved", "confirmed"]);

      (brs || []).forEach((br: any) => {
        const startTime = br.start_time || "09:00";
        const endTime = addMinutes(startTime, 60);
        events.push([
          "BEGIN:VEVENT",
          `UID:whetstone-sess-${br.id}@whetstone-portal.com`,
          `DTSTART;TZID=${tzid}:${icalDate(br.date, startTime)}`,
          `DTEND;TZID=${tzid}:${icalDate(br.date, endTime)}`,
          `SUMMARY:${(br.session_name || "Session").replace(/,/g, "\\,")} [W]`,
          `DESCRIPTION:${br.session_type || "session"} with ${br.specialist || "mentor"}`,
          "END:VEVENT",
        ].join("\r\n"));
      });
    }
  } else {
    // Staff: get all their sessions and deadlines across students
    const { data: brs } = await supabase
      .from("booking_requests")
      .select("*")
      .or(`strategist_email.eq.${profile.email},specialist.eq.${profile.display_name}`)
      .in("status", ["approved", "confirmed", "pending"]);

    (brs || []).forEach((br: any) => {
      const startTime = br.start_time || "09:00";
      const endTime = addMinutes(startTime, 60);
      events.push([
        "BEGIN:VEVENT",
        `UID:whetstone-sess-${br.id}@whetstone-portal.com`,
        `DTSTART;TZID=${tzid}:${icalDate(br.date, startTime)}`,
        `DTEND;TZID=${tzid}:${icalDate(br.date, endTime)}`,
        `SUMMARY:${(br.session_name || "Session").replace(/,/g, "\\,")} [W]`,
        `DESCRIPTION:${br.session_type || "session"} with ${br.student_name || "student"}\\nStatus: ${br.status}`,
        "END:VEVENT",
      ].join("\r\n"));
    });
  }

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Whetstone Admissions//Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Whetstone - ${profile.display_name || profile.email}`,
    "X-WR-TIMEZONE:America/New_York",
    // Timezone definition
    "BEGIN:VTIMEZONE",
    "TZID:America/New_York",
    "BEGIN:DAYLIGHT",
    "DTSTART:20260308T020000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "DTSTART:20261101T020000",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="whetstone-${profile.role}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}