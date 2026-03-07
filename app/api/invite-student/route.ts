import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  const { email, name, studentId } = await req.json();

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: {
        role: "student",
        student_id: studentId,
        full_name: name,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    console.error("[invite-student] generateLink error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inviteLink = data.properties?.action_link;
  return NextResponse.json({ success: true, inviteLink });
}