import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Scan a staff member's GCal for meetings with students and create session records
export async function POST(request: NextRequest) {
  const { profileId } = await request.json();
  if (!profileId) return NextResponse.json({ error: "Missing profileId" }, { status: 400 });

  // Get all student emails
  const { data: profiles } = await supabase.from("profiles").select("id, email, student_id, role, display_name");
  const studentProfiles = (profiles || []).filter((p: any) => p.role === "student" && p.email && p.student_id);
  const studentEmailMap = new Map<string, any>();
  studentProfiles.forEach((p: any) => studentEmailMap.set(p.email.toLowerCase(), p));

  // Get staff profile email
  const staffProfile = (profiles || []).find((p: any) => p.id === profileId);
  if (!staffProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Pull events from GCal
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://whetstone-portal.com";
  const gcalRes = await fetch(`${siteUrl}/api/calendar/sync?profileId=${profileId}`);
  if (!gcalRes.ok) return NextResponse.json({ error: "Failed to fetch GCal events" }, { status: 500 });
  const gcalData = await gcalRes.json();
  const events = gcalData.events || [];

  // Get existing booking requests to avoid duplicates
  const { data: existingBRs } = await supabase.from("booking_requests").select("session_name, date").eq("specialist", staffProfile.display_name || staffProfile.email);
  const existingSet = new Set((existingBRs || []).map((br: any) => `${br.session_name}|${br.date}`));

  // Also get existing sessions
  const { data: existingSessions } = await supabase.from("sessions").select("session_name, date");
  (existingSessions || []).forEach((s: any) => existingSet.add(`${s.session_name}|${s.date}`));

  const synced: any[] = [];

  for (const evt of events) {
    // Skip Whetstone events (already managed)
    if (evt.title?.includes("[Whetstone]")) continue;
    if (!evt.attendees || evt.attendees.length === 0) continue;
    if (!evt.date) continue;

    // Check if any attendee is a student
    for (const email of evt.attendees) {
      const studentProfile = studentEmailMap.get(email);
      if (!studentProfile) continue;

      // Get student name
      const { data: studentData } = await supabase.from("students").select("id, name").eq("id", studentProfile.student_id).single();
      if (!studentData) continue;

      const sessionName = evt.title?.replace(/\s*\[Whetstone\]\s*/g, "") || "GCal Session";
      const key = `${sessionName}|${evt.date}`;
      if (existingSet.has(key)) continue; // Skip duplicates

      // Create a booking request marked as confirmed + gcal-synced
      const { data: br, error } = await supabase.from("booking_requests").insert({
        student_id: studentData.id,
        student_name: studentData.name,
        specialist: staffProfile.display_name || staffProfile.email,
        strategist_email: staffProfile.email,
        date: evt.date,
        start_time: evt.startMinutes != null ? `${String(Math.floor(evt.startMinutes / 60)).padStart(2, "0")}:${String(evt.startMinutes % 60).padStart(2, "0")}` : null,
        session_name: sessionName,
        session_type: "gcal-sync",
        status: "confirmed",
        notes: evt.location ? `📍 ${evt.location}` : "",
        gcal_synced: true,
      }).select().single();

      if (!error && br) {
        synced.push({ id: br.id, title: sessionName, student: studentData.name, date: evt.date });
        existingSet.add(key);
      }
    }
  }

  return NextResponse.json({ success: true, synced, count: synced.length });
}