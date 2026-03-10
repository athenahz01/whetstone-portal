import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, type, date, total, breakdown, mathScore, englishScore } = body;

  if (!studentId || !type || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase.from("tests").insert({
    student_id: studentId,
    type,
    date,
    total: total || 0,
    breakdown: breakdown || "",
    verified: false,
    math_score: mathScore || null,
    english_score: englishScore || null,
  }).select().single();

  if (error) {
    console.error("[save-test] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, test: data });
}
