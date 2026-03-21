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
  const { studentId, type, date, total, breakdown, mathScore, englishScore, subject } = body;

  if (!studentId || !type || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const insertData: any = {
    student_id: studentId,
    type,
    date,
    total: total || 0,
    breakdown: breakdown || "",
    verified: false,
    math_score: mathScore || null,
    english_score: englishScore || null,
  };

  // For AP tests, store subject in breakdown if not already there
  if (type === "AP" && subject) {
    insertData.breakdown = subject;
  }

  const { data, error } = await supabase.from("tests").insert(insertData).select().single();

  if (error) {
    console.error("[save-test] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // After saving, update students.sat with superscore if this was an SAT test
  if (type === "SAT") {
    try {
      const { data: allSatTests } = await supabase
        .from("tests")
        .select("math_score, english_score")
        .eq("student_id", studentId)
        .eq("type", "SAT");

      if (allSatTests && allSatTests.length > 0) {
        let bestMath = 0;
        let bestEnglish = 0;
        allSatTests.forEach((t: any) => {
          if (t.math_score && t.math_score > bestMath) bestMath = t.math_score;
          if (t.english_score && t.english_score > bestEnglish) bestEnglish = t.english_score;
        });
        const superscore = bestMath + bestEnglish;

        await supabase
          .from("students")
          .update({ sat: superscore })
          .eq("id", studentId);
      }
    } catch (err) {
      console.error("[save-test] Failed to update superscore:", err);
    }
  }

  return NextResponse.json({ success: true, test: data });
}