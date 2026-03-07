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
  try {
    const { email, name, studentId } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    const tempPassword = generateTempPassword();

    // Create the auth user directly with a temp password
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // skip email confirmation
      user_metadata: {
        role: "student",
        student_id: studentId || null,
        full_name: name,
      },
    });

    if (error) {
      // If user already exists, that's OK — just note it
      if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
        return NextResponse.json({ 
          error: "A user with this email already exists. The student can log in with their existing credentials, or you can reset their password from Supabase.",
        }, { status: 409 });
      }
      console.error("[invite-student] createUser error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If we have both a new auth user and a student record, link them via the profiles table
    if (data?.user?.id && studentId) {
      const userId = data.user.id;

      // The handle_new_user trigger creates the profile row async.
      // We need to wait for it, then update with student_id.
      let linked = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        // Wait a bit for the trigger to complete
        await new Promise((r) => setTimeout(r, 500));

        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .single();

        if (existing) {
          // Profile exists — update it with student_id
          const { error: updateErr } = await supabaseAdmin
            .from("profiles")
            .update({ student_id: studentId, role: "student", display_name: name })
            .eq("id", userId);

          if (!updateErr) {
            linked = true;
            break;
          }
          console.error("[invite-student] profile update error:", updateErr.message);
        }
      }

      // If trigger never created the profile, insert it directly
      if (!linked) {
        const { error: upsertErr } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: userId,
            student_id: studentId,
            role: "student",
            display_name: name,
          });

        if (upsertErr) {
          console.error("[invite-student] profile upsert fallback error:", upsertErr.message);
        }
      }
    }

    // Return temp password to show strategist
    return NextResponse.json({ 
      success: true, 
      tempPassword,
      loginUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://whetstone-portal.vercel.app",
    });
  } catch (err) {
    console.error("[invite-student] unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}