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
  const { profileId, studentId } = body;
  const now = new Date().toISOString();

  // Update profiles table
  if (profileId) {
    await supabase.from("profiles").update({ last_login: now }).eq("id", profileId);
  }

  // Update students table
  if (studentId) {
    await supabase.from("students").update({ last_login: now }).eq("id", studentId);
  }

  return NextResponse.json({ success: true });
}