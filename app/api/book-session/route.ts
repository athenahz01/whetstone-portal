import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, date, notes, action, session_name, start_time, end_time, session_type, booking_type, specialist } = body;

  if (!studentId || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const insertData: any = {
    student_id: studentId,
    date,
    notes: notes || "",
    action: action || "",
  };

  // Add optional fields only if they have values
  if (session_name) insertData.session_name = session_name;
  if (start_time) insertData.start_time = start_time;
  if (end_time) insertData.end_time = end_time;
  if (session_type) insertData.session_type = session_type;
  if (booking_type) insertData.booking_type = booking_type;
  if (specialist) insertData.specialist = specialist;

  const { data, error } = await supabase.from("sessions").insert(insertData).select().single();

  if (error) {
    console.error("[book-session] Insert error:", error.message);
    // Fallback: try with only core columns
    const fallbackData = {
      student_id: studentId,
      date,
      notes: `${specialist ? `Booked with: ${specialist}\n` : ""}${session_name ? `Session: ${session_name}\n` : ""}${start_time ? `Time: ${start_time} - ${end_time}\n` : ""}${notes || ""}`,
      action: action || "",
    };
    const { data: fbData, error: fbError } = await supabase.from("sessions").insert(fallbackData).select().single();
    if (fbError) {
      console.error("[book-session] Fallback error:", fbError.message);
      return NextResponse.json({ error: fbError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, session: fbData });
  }

  return NextResponse.json({ success: true, session: data });
}
