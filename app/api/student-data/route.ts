import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, canAccessStudent, unauthorized, forbidden } from "../../lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/student-data?studentId=123
// Returns full student record with all child data (activities, deadlines, etc.)
// Uses service role key to bypass RLS — caller verified via auth cookie
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const sid = parseInt(studentId);

  // Auth check
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();
  if (!canAccessStudent(authUser, sid)) return forbidden("You can only access your own student data");

  const [studentRes, schoolsRes, dlRes, tasksRes, coursesRes, testsRes, actsRes, goalsRes, sessRes, honorsRes] =
    await Promise.all([
      supabase.from("students").select("*").eq("id", sid).single(),
      supabase.from("schools").select("*").eq("student_id", sid),
      supabase.from("deadlines").select("*").eq("student_id", sid),
      supabase.from("tasks").select("*").eq("student_id", sid),
      supabase.from("courses").select("*").eq("student_id", sid),
      supabase.from("tests").select("*").eq("student_id", sid),
      supabase.from("activities").select("*").eq("student_id", sid),
      supabase.from("goals").select("*").eq("student_id", sid),
      supabase.from("sessions").select("*").eq("student_id", sid),
      supabase.from("honors").select("*").eq("student_id", sid),
    ]);

  if (studentRes.error || !studentRes.data) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const s = studentRes.data;

  // Calculate grade from grad year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const academicYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
  const calculatedGrade = s.grad_year ? 12 - (s.grad_year - academicYear) : s.grade;

  const dueDate = (d: string) => {
    if (!d) return 0;
    const due = new Date(d + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return NextResponse.json({
    student: {
      id: s.id,
      name: s.name,
      email: s.email,
      grade: calculatedGrade,
      gpa: Number(s.gpa),
      sat: s.sat,
      counselor: s.counselor,
      team: s.team || [],
      status: s.status,
      av: s.avatar,
      school: s.school,
      gradYear: s.grad_year,
      lastLogin: s.last_login || null,
      engagement: s.engagement,
      applicationYear: s.application_year || s.grad_year,
      intendedMajors: s.intended_majors || null,
      hookStatement: s.hook_statement || null,
      achievements: s.achievements || null,
      schools: (schoolsRes.data || []).map((sc: any) => ({
        id: sc.id, name: sc.name, type: sc.type, status: sc.status,
        deadline: sc.deadline, essay: sc.essay,
      })),
      dl: (dlRes.data || []).map((d: any) => ({
        id: d.id, title: d.title, due: d.due, cat: d.category,
        status: d.status, days: dueDate(d.due),
        specialist: d.specialist || "", googleDocLink: d.google_doc_link || "",
        createdBy: d.created_by || "strategist",
        priority: d.priority || undefined,
        description: d.description || undefined,
        blockedBy: d.blocked_by || undefined,
        internalOnly: d.internal_only || false,
        responsible: d.responsible || [],
        actualDeadline: d.actual_deadline || "",
      })),
      tasks: (tasksRes.data || []).map((t: any) => ({
        id: t.id, cat: t.category, title: t.title,
        s: t.start_date, d: t.due_date, st: t.status,
        team: t.team || [], specialist: t.specialist || "",
      })),
      courses: (coursesRes.data || []).map((c: any) => ({
        id: c.id, name: c.name, lv: c.level, s1: c.sem1_grade, s2: c.sem2_grade,
      })),
      tests: (testsRes.data || []).map((t: any) => ({
        id: t.id, type: t.type, date: t.date, total: t.total,
        bd: t.breakdown, v: t.verified,
        mathScore: t.math_score || null, englishScore: t.english_score || null,
      })),
      acts: (actsRes.data || []).map((a: any) => ({
        id: a.id, type: a.type, pos: a.position, org: a.organization,
        desc: a.description, gr: a.grades || [], timing: a.timing,
        hrs: a.hours_per_week, wks: a.weeks_per_year,
      })),
      goals: (goalsRes.data || []).map((g: any) => ({
        t: g.title, done: g.done,
      })),
      sess: (sessRes.data || []).map((ss: any) => ({
        id: ss.id, date: ss.date, notes: ss.notes, action: ss.action,
      })),
      honors: (honorsRes.data || []).map((h: any) => ({
        id: h.id, title: h.title, grades: h.grades || [], recognition: h.recognition || [],
      })),
    },
  });
}