import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: fetch all closing commits for a student
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  const { data, error } = await supabase
    .from("closing_commits")
    .select("*")
    .eq("student_id", parseInt(studentId))
    .order("created_at", { ascending: false });

  if (error) {
    // Table might not exist yet — fallback to empty
    console.error("[closing-commits] GET error:", error.message);
    return NextResponse.json({ commits: [] });
  }

  return NextResponse.json({ commits: data || [] });
}

// POST: save a new closing commit
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, activeRecall, actions, sessionType, specialist } = body;

  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  const { data, error } = await supabase
    .from("closing_commits")
    .insert({
      student_id: studentId,
      active_recall: activeRecall || "",
      actions: JSON.stringify(actions || []),
      session_type: sessionType || "online",
      specialist: specialist || "",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[closing-commits] POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, commit: data });
}

// DELETE
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("closing_commits").delete().eq("id", parseInt(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
