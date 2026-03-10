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

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("students").update(updateData).eq("id", studentId);

  if (error) {
    console.error("[update-student] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
