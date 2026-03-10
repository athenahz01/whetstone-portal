import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, ...fields } = body;

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (fields.gpa !== undefined) updateData.gpa = fields.gpa;
  if (fields.gpa_unweighted !== undefined) updateData.gpa_unweighted = fields.gpa_unweighted;
  if (fields.gpa_weighted !== undefined) updateData.gpa_weighted = fields.gpa_weighted;
  if (fields.sat !== undefined) updateData.sat = fields.sat;
  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.grade !== undefined) updateData.grade = fields.grade;
  if (fields.school !== undefined) updateData.school = fields.school;
  if (fields.application_year !== undefined) updateData.application_year = fields.application_year;
  if (fields.intended_majors !== undefined) updateData.intended_majors = fields.intended_majors;
  if (fields.hook_statement !== undefined) updateData.hook_statement = fields.hook_statement;
  if (fields.achievements !== undefined) updateData.achievements = fields.achievements;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("students").update(updateData).eq("id", studentId);

  if (error) {
    console.error("[update-student] Error:", error.message);
    // If column doesn't exist, retry with only known-safe columns
    const safeData: Record<string, unknown> = {};
    if (fields.gpa !== undefined) safeData.gpa = fields.gpa;
    // Map gpa_unweighted/gpa_weighted to the main gpa field as fallback
    if (fields.gpa_unweighted !== undefined) safeData.gpa = fields.gpa_unweighted;
    if (fields.sat !== undefined) safeData.sat = fields.sat;
    if (fields.name !== undefined) safeData.name = fields.name;
    if (fields.grade !== undefined) safeData.grade = fields.grade;
    if (fields.school !== undefined) safeData.school = fields.school;

    if (Object.keys(safeData).length > 0) {
      const { error: retryError } = await supabase.from("students").update(safeData).eq("id", studentId);
      if (retryError) {
        console.error("[update-student] Retry error:", retryError.message);
        return NextResponse.json({ error: retryError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, fallback: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
