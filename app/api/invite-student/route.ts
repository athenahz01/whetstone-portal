import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role key — never expose this client-side
);

export async function POST(req: Request) {
  const { email, firstName, lastName, studentId } = await req.json();

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: "student",
      student_id: studentId,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}