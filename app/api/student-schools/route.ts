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
  const { action } = body;

  if (action === "add") {
    const { studentId, name, type, status, deadline, essay } = body;
    if (!studentId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const { error } = await supabase.from("schools").insert({
      student_id: studentId,
      name,
      type: type || "match",
      status: status || "Researching",
      deadline: deadline || "",
      essay: essay || "",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    const { schoolId } = body;
    if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
    const { error } = await supabase.from("schools").delete().eq("id", schoolId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "update") {
    const { schoolId, ...updates } = body;
    delete updates.action;
    if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
    const { error } = await supabase.from("schools").update(updates).eq("id", schoolId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}