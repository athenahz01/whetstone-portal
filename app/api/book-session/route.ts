import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "../../lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();

  const body = await request.json();
  const { studentId, date, notes, action, session_name, start_time, end_time, session_type, booking_type, specialist, cohort, recurrence } = body;

  if (!studentId || !date) {
    return NextResponse.json({ error: "Missing required fields (studentId, date)" }, { status: 400 });
  }

  // Verify student exists first
  const { data: studentCheck } = await supabase.from("students").select("id").eq("id", studentId).single();
  if (!studentCheck) {
    // studentId might be from profiles, try to find the actual student
    const { data: profileCheck } = await supabase.from("profiles").select("student_id").eq("student_id", studentId).single();
    if (!profileCheck) {
      return NextResponse.json({ error: `Student ID ${studentId} not found in students table. Check the student_id mapping.` }, { status: 400 });
    }
  }

  const insertData: any = {
    student_id: studentId,
    date,
    notes: notes || "",
    action: action || "",
  };

  if (session_name) insertData.session_name = session_name;
  if (start_time) insertData.start_time = start_time;
  if (end_time) insertData.end_time = end_time;
  if (session_type) insertData.session_type = session_type;
  if (booking_type) insertData.booking_type = booking_type;
  if (specialist) insertData.specialist = specialist;
  if (cohort) insertData.cohort = cohort;
  if (recurrence) insertData.recurrence = recurrence;

  const { data, error } = await supabase.from("sessions").insert(insertData).select().single();

  if (error) {
    console.error("[book-session] Insert error:", error.message, "studentId:", studentId);
    // Fallback: try with only core columns
    const fallbackData: any = {
      student_id: studentId,
      date,
      notes: [
        specialist ? `Booked with: ${specialist}` : "",
        session_name ? `Session: ${session_name}` : "",
        start_time ? `Time: ${start_time} - ${end_time || ""}` : "",
        cohort ? `Cohort: ${cohort}` : "",
        notes || "",
      ].filter(Boolean).join("\n"),
      action: action || "",
    };
    const { data: fbData, error: fbError } = await supabase.from("sessions").insert(fallbackData).select().single();
    if (fbError) {
      console.error("[book-session] Fallback error:", fbError.message);
      return NextResponse.json({ error: `Primary: ${error.message}. Fallback: ${fbError.message}. StudentId: ${studentId}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, session: fbData, fallback: true });
  }

  return NextResponse.json({ success: true, session: data });
}