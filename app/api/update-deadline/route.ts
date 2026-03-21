import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "../../lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Known columns in the deadlines table
const VALID_COLUMNS = new Set([
  "title", "due", "category", "status", "specialist",
  "google_doc_link", "blocked_by", "priority", "description",
  "days", "student_id", "created_by",
]);

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();

  const body = await request.json();
  const { deadlineId, ...rawUpdates } = body;

  if (!deadlineId) {
    return NextResponse.json({ error: "Missing deadlineId" }, { status: 400 });
  }

  // Only pass valid columns to avoid Supabase errors on unknown columns
  const updates: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawUpdates)) {
    if (VALID_COLUMNS.has(key)) updates[key] = val;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  // First try with all fields
  let { error } = await supabase.from("deadlines").update(updates).eq("id", deadlineId);

  // If error mentions a column doesn't exist, try adding it
  if (error && error.message?.includes("column")) {
    console.error("[update-deadline] Column error, trying to add missing columns:", error.message);

    // Try to add missing columns
    for (const col of ["blocked_by", "priority", "description"]) {
      if (error?.message?.includes(col)) {
        try { await supabase.rpc("exec_sql", { sql: `ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS ${col} text` }); } catch {}
      }
    }

    // Retry the update
    const retry = await supabase.from("deadlines").update(updates).eq("id", deadlineId);
    error = retry.error;
  }

  if (error) {
    console.error("[update-deadline] Error:", error.message);
    // Fallback: strip problematic fields and try again with just core fields
    const safeUpdates: Record<string, any> = {};
    for (const key of ["title", "due", "category", "status", "specialist"]) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }
    if (Object.keys(safeUpdates).length > 0) {
      const fallback = await supabase.from("deadlines").update(safeUpdates).eq("id", deadlineId);
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, note: "Saved core fields only. Run: ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS blocked_by text; ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS priority text; ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS description text;" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
