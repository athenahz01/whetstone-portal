import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: fetch caseload assignments
export async function GET(request: NextRequest) {
  const strategistEmail = request.nextUrl.searchParams.get("strategistEmail");

  // Try to fetch from caseload_assignments table
  let query = supabase.from("caseload_assignments").select("*");
  if (strategistEmail) {
    query = query.eq("strategist_email", strategistEmail);
  }

  const { data, error } = await query;

  // If table doesn't exist, return empty (all students visible)
  if (error) {
    console.error("[caseload] Error:", error.message);
    return NextResponse.json({ assignments: [], tableExists: false });
  }

  return NextResponse.json({ assignments: data || [], tableExists: true });
}

// POST: update caseload assignments
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, strategistEmail, studentIds } = body;

  if (action === "set") {
    // Replace all assignments for this strategist
    // First delete existing
    await supabase.from("caseload_assignments").delete().eq("strategist_email", strategistEmail);

    // Insert new assignments
    if (studentIds && studentIds.length > 0) {
      const rows = studentIds.map((sid: number) => ({
        strategist_email: strategistEmail,
        student_id: sid,
      }));
      const { error } = await supabase.from("caseload_assignments").insert(rows);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  }

  if (action === "toggle") {
    const { studentId } = body;
    // Check if assignment exists
    const { data: existing } = await supabase
      .from("caseload_assignments")
      .select("id")
      .eq("strategist_email", strategistEmail)
      .eq("student_id", studentId)
      .single();

    if (existing) {
      // Remove
      await supabase.from("caseload_assignments").delete().eq("id", existing.id);
    } else {
      // Add
      await supabase.from("caseload_assignments").insert({ strategist_email: strategistEmail, student_id: studentId });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
