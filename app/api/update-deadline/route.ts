import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deadlineId, ...updates } = body;

  if (!deadlineId) {
    return NextResponse.json({ error: "Missing deadlineId" }, { status: 400 });
  }

  const { error } = await supabase.from("deadlines").update(updates).eq("id", deadlineId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
