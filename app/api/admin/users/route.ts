import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdmin, unauthorized, forbidden } from "../../../lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all users with their profile data and last sign in
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();
  if (!isAdmin(authUser)) return forbidden("Admin access required");

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get all profiles
  const { data: profiles } = await supabase.from("profiles").select("*");
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Get stored passwords
  const { data: storedPws } = await supabase.from("user_passwords").select("*");
  const pwMap = new Map((storedPws || []).map((p: any) => [p.user_id, p.password]));

  const userList = (users || []).map((u: any) => {
    const profile = profileMap.get(u.id) as any;
    return {
      id: u.id,
      email: u.email,
      name: profile?.display_name || u.user_metadata?.name || "—",
      role: profile?.role || "unknown",
      studentId: profile?.student_id || null,
      status: u.banned_until ? "suspended" : u.email_confirmed_at ? "active" : "pending",
      lastSignIn: u.last_sign_in_at || null,
      createdAt: u.created_at,
      password: pwMap.get(u.id) || null,
    };
  });

  return NextResponse.json({ users: userList });
}

// POST: Perform admin actions
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();
  if (!isAdmin(authUser)) return forbidden("Admin access required");

  const body = await request.json();
  const { action, userId, ...params } = body;

  switch (action) {
    case "reset_password": {
      const { password, autoGenerate } = params;
      const newPassword = autoGenerate
        ? Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + "!"
        : password;

      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }

      const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Store password for admin visibility
      await supabase.from("user_passwords").upsert({
        user_id: userId,
        password: newPassword,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return NextResponse.json({ success: true, password: newPassword });
    }

    case "update_user": {
      const { name, email, role } = params;
      const updates: any = {};
      if (email) updates.email = email;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.admin.updateUserById(userId, updates);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Update profile
      const profileUpdates: any = {};
      if (name) profileUpdates.display_name = name;
      if (role) profileUpdates.role = role;
      if (email) profileUpdates.email = email;

      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from("profiles").update(profileUpdates).eq("id", userId);
      }

      return NextResponse.json({ success: true });
    }

    case "delete_user": {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.from("user_passwords").delete().eq("user_id", userId);
      return NextResponse.json({ success: true });
    }

    case "toggle_status": {
      const { suspend } = params;
      if (suspend) {
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // ~100 years
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}