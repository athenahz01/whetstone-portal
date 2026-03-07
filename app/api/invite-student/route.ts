import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: Request) {
  const { email, name, studentId } = await req.json();

  const tempPassword = generateTempPassword();

  // Create the auth user directly with a temp password
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // skip email confirmation
    user_metadata: {
      role: "student",
      student_id: studentId,
      full_name: name,
    },
  });

  if (error) {
    console.error("[invite-student] createUser error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return temp password to show strategist
  return NextResponse.json({ 
    success: true, 
    tempPassword,
    loginUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
}