import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdmin, unauthorized, forbidden } from "../../lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();
  if (!isAdmin(authUser)) return forbidden("Admin access required");

  try {
    const { email, name, role, studentId, childEmail } = await req.json();

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "Email, name, and role are required" },
        { status: 400 }
      );
    }

    if (!["student", "parent", "strategist"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be student, parent, or strategist" },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();

    // Create the auth user with a temp password
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role,
        full_name: name,
        student_id: studentId || null,
        child_email: childEmail || null,
      },
    });

    if (error) {
      if (
        error.message?.includes("already been registered") ||
        error.message?.includes("already exists")
      ) {
        return NextResponse.json(
          {
            error:
              "A user with this email already exists. You can reset their password from Supabase.",
          },
          { status: 409 }
        );
      }
      console.error("[invite-user] createUser error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create the profile directly
    if (data?.user?.id) {
      const userId = data.user.id;

      // Small delay to avoid conflict with handle_new_user trigger
      await new Promise((r) => setTimeout(r, 300));

      // Determine student_id for the profile
      let profileStudentId: number | null = studentId || null;

      // For parents, look up the child's student record by email
      if (role === "parent" && childEmail) {
        const { data: childStudent } = await supabaseAdmin
          .from("students")
          .select("id")
          .eq("email", childEmail)
          .single();

        if (childStudent) {
          profileStudentId = childStudent.id;
        }
      }

      const { error: upsertErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: email,
          role: role,
          display_name: name,
          student_id: profileStudentId,
        });

      if (upsertErr) {
        console.error("[invite-user] profile upsert error:", upsertErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      tempPassword,
      loginUrl:
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://whetstone-portal.vercel.app",
    });
  } catch (err) {
    console.error("[invite-user] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}