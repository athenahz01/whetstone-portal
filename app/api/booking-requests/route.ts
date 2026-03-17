import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Dynamically look up strategist email by name from profiles table
async function getStrategistEmail(name: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "strategist")
    .eq("display_name", name)
    .single();
  return data?.email || null;
}

// GET: fetch booking requests for a user (student or strategist)
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const strategistEmail = request.nextUrl.searchParams.get("strategistEmail");

  let query = supabase.from("booking_requests").select("*").order("created_at", { ascending: false });

  if (studentId) {
    query = query.eq("student_id", parseInt(studentId));
  }
  if (strategistEmail) {
    // Match by strategist_email column OR by specialist name (for older records / GCal sync)
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("email", strategistEmail).single();
    const displayName = profile?.display_name;
    if (displayName) {
      query = query.or(`strategist_email.eq.${strategistEmail},specialist.eq.${displayName}`);
    } else {
      query = query.eq("strategist_email", strategistEmail);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}

// POST: create or update booking requests
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    // Student submits a booking request
    case "request": {
      const { studentId, studentName, specialist, date, startTime, sessionName, sessionType, notes } = body;
      const strategistEmail = await getStrategistEmail(specialist);

      const { data, error } = await supabase.from("booking_requests").insert({
        student_id: studentId,
        student_name: studentName,
        specialist,
        strategist_email: strategistEmail,
        date,
        start_time: startTime,
        session_name: sessionName || `Session with ${specialist}`,
        session_type: sessionType || "strategy",
        notes: notes || "",
        status: "pending",   // pending → approved/countered → confirmed
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, request: data });
    }

    // Strategist approves a request → create actual session for both
    case "approve": {
      const { requestId } = body;
      const { data: req } = await supabase.from("booking_requests").select("*").eq("id", requestId).single();
      if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

      // Create session record
      await supabase.from("sessions").insert({
        student_id: req.student_id,
        date: req.date,
        start_time: req.start_time,
        session_name: req.session_name,
        session_type: req.session_type,
        specialist: req.specialist,
        notes: req.notes,
        status: "confirmed",
      });

      // Update request status
      await supabase.from("booking_requests").update({ status: "approved" }).eq("id", requestId);

      // Push to GCal for both participants (fire-and-forget)
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://whetstone-portal.com";
        // Find student's profile
        const { data: studentProfile } = await supabase.from("profiles").select("id").eq("student_id", req.student_id).single();
        // Find specialist's profile by matching email
        const { data: allProfiles } = await supabase.from("profiles").select("id, email").eq("role", "strategist");
        const specialistProfile = (allProfiles || []).find((p: any) =>
          p.email && req.specialist && (p.email.toLowerCase().includes(req.specialist.split(" ")[0].toLowerCase()))
        );

        const title = `${req.session_name} [Whetstone]`;
        const startMinutes = req.start_time ? parseInt(req.start_time.split(":")[0]) * 60 + parseInt(req.start_time.split(":")[1]) : undefined;

        // Push to student's GCal
        if (studentProfile?.id) {
          fetch(`${siteUrl}/api/calendar/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: studentProfile.id, title, date: req.date, description: `${req.session_type} with ${req.specialist}`, startMinutes, durationMinutes: 60 }),
          }).catch(() => {});
        }
        // Push to specialist's GCal
        if (specialistProfile?.id) {
          fetch(`${siteUrl}/api/calendar/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: specialistProfile.id, title, date: req.date, description: `${req.session_type} with ${req.student_name}`, startMinutes, durationMinutes: 60 }),
          }).catch(() => {});
        }
      } catch (e) { console.error("[booking-requests] GCal push error:", e); }

      return NextResponse.json({ success: true });
    }

    // Strategist sends a counter-offer with new date/time
    case "counter": {
      const { requestId, newDate, newStartTime, counterNote } = body;

      await supabase.from("booking_requests").update({
        status: "countered",
        counter_date: newDate,
        counter_start_time: newStartTime,
        counter_note: counterNote || "",
      }).eq("id", requestId);

      return NextResponse.json({ success: true });
    }

    // Student accepts the counter-offer → create actual session
    case "accept_counter": {
      const { requestId } = body;
      const { data: req } = await supabase.from("booking_requests").select("*").eq("id", requestId).single();
      if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

      // Create session with counter date/time
      await supabase.from("sessions").insert({
        student_id: req.student_id,
        date: req.counter_date || req.date,
        start_time: req.counter_start_time || req.start_time,
        session_name: req.session_name,
        session_type: req.session_type,
        specialist: req.specialist,
        notes: req.notes,
        status: "confirmed",
      });

      // Update request status
      await supabase.from("booking_requests").update({ status: "confirmed" }).eq("id", requestId);

      return NextResponse.json({ success: true });
    }

    // Decline a request
    case "decline": {
      const { requestId } = body;
      await supabase.from("booking_requests").update({ status: "declined" }).eq("id", requestId);
      return NextResponse.json({ success: true });
    }

    // Update agenda or session notes
    case "update_notes": {
      const { requestId, agenda, session_notes, student_notes } = body;
      const updateData: any = {};
      if (agenda !== undefined) updateData.agenda = agenda;
      if (session_notes !== undefined) updateData.session_notes = session_notes;
      if (student_notes !== undefined) updateData.student_notes = student_notes;
      const { error } = await supabase.from("booking_requests").update(updateData).eq("id", requestId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}