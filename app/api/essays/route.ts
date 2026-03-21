import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "../../lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();

  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  const { data, error } = await supabase
    .from("essays")
    .select("*")
    .eq("student_id", parseInt(studentId))
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ essays: [] });
  return NextResponse.json({ essays: data || [] });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "create": {
      const { studentId, title, school, prompt, wordLimit } = body;
      const { data, error } = await supabase.from("essays").insert({
        student_id: studentId,
        title,
        school: school || "",
        prompt: prompt || "",
        content: "",
        status: "draft",
        word_limit: wordLimit || null,
        mentor_feedback: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, essay: data });
    }

    case "update": {
      const { essayId, title, school, prompt, content, status, wordLimit, mentorFeedback } = body;
      const updateData: any = { updated_at: new Date().toISOString() };
      if (title !== undefined) updateData.title = title;
      if (school !== undefined) updateData.school = school;
      if (prompt !== undefined) updateData.prompt = prompt;
      if (content !== undefined) updateData.content = content;
      if (status !== undefined) updateData.status = status;
      if (wordLimit !== undefined) updateData.word_limit = wordLimit;
      if (mentorFeedback !== undefined) updateData.mentor_feedback = mentorFeedback;
      const { error } = await supabase.from("essays").update(updateData).eq("id", essayId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "delete": {
      const { essayId } = body;
      await supabase.from("essays").delete().eq("id", essayId);
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}