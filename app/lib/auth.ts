import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = ["athena@whetstoneadmissions.com", "ren@whetstoneadmissions.com"];

export interface AuthUser {
  id: string;          // profile / auth user id
  email: string;
  role: "student" | "parent" | "strategist";
  studentId: number | null;
}

/**
 * Extract and verify the Supabase session from the request.
 * Checks Authorization header first (Bearer token), then falls back to cookies.
 * Returns the authenticated user's profile or null.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  let accessToken: string | null = null;

  // 1. Check Authorization header (preferred — set by authFetch on client)
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    accessToken = authHeader.slice(7);
  }

  // 2. Fall back to cookies (for cases where cookies are set, e.g. SSR)
  if (!accessToken) {
    const cookies = request.cookies;

    for (const [name, cookie] of cookies) {
      if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
        try {
          let raw = cookie.value;
          try {
            const decoded = Buffer.from(raw, "base64").toString("utf-8");
            if (decoded.startsWith("[") || decoded.startsWith("{")) raw = decoded;
          } catch {}

          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            accessToken = parsed[0];
          } else if (parsed.access_token) {
            accessToken = parsed.access_token;
          }
        } catch {
          continue;
        }
      }
    }

    // Handle chunked cookies (Supabase splits large cookies)
    if (!accessToken) {
      const chunks: string[] = [];
      let i = 0;
      while (true) {
        const chunk = cookies.get(`sb-${getProjectRef()}-auth-token.${i}`);
        if (!chunk) break;
        chunks.push(chunk.value);
        i++;
      }
      if (chunks.length > 0) {
        try {
          let raw = chunks.join("");
          try {
            const decoded = Buffer.from(raw, "base64").toString("utf-8");
            if (decoded.startsWith("[") || decoded.startsWith("{")) raw = decoded;
          } catch {}
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            accessToken = parsed[0];
          } else if (parsed.access_token) {
            accessToken = parsed.access_token;
          }
        } catch {}
      }
    }
  }

  if (!accessToken) return null;

  // Verify the token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;

  // Fetch the profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, student_id, email")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email || profile.email || "",
    role: profile.role,
    studentId: profile.student_id,
  };
}

/** Check if user is an admin (strategist with admin email) */
export function isAdmin(user: AuthUser): boolean {
  return user.role === "strategist" && ADMIN_EMAILS.includes(user.email);
}

/** Check if user is a strategist */
export function isStrategist(user: AuthUser): boolean {
  return user.role === "strategist";
}

/** Check if user can access a specific student's data */
export function canAccessStudent(user: AuthUser, studentId: number): boolean {
  // Strategists can access all students
  if (user.role === "strategist") return true;
  // Students/parents can only access their linked student
  return user.studentId === studentId;
}

/** Return 401 response */
export function unauthorized(message = "Not authenticated") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Return 403 response */
export function forbidden(message = "Access denied") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Extract project ref from the SUPABASE_URL */
function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // URL format: https://<project_ref>.supabase.co
  const match = url.match(/https?:\/\/([^.]+)\./);
  return match?.[1] || "";
}
