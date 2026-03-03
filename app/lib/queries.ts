import { supabase } from "./supabase";
import { Student } from "../types";

export async function fetchAllStudents(): Promise<Student[]> {
  // Fetch students
  const { data: studentsRaw, error } = await supabase
    .from("students")
    .select("*")
    .order("id");

  if (error || !studentsRaw) {
    console.error("Error fetching students:", error);
    return [];
  }

  // For each student, fetch all related data
  const students: Student[] = await Promise.all(
    studentsRaw.map(async (s) => {
      const [schoolsRes, dlRes, tasksRes, coursesRes, testsRes, actsRes, goalsRes, sessRes] =
        await Promise.all([
          supabase.from("schools").select("*").eq("student_id", s.id),
          supabase.from("deadlines").select("*").eq("student_id", s.id),
          supabase.from("tasks").select("*").eq("student_id", s.id),
          supabase.from("courses").select("*").eq("student_id", s.id),
          supabase.from("tests").select("*").eq("student_id", s.id),
          supabase.from("activities").select("*").eq("student_id", s.id),
          supabase.from("goals").select("*").eq("student_id", s.id),
          supabase.from("sessions").select("*").eq("student_id", s.id),
        ]);

      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        gpa: Number(s.gpa),
        sat: s.sat,
        counselor: s.counselor,
        status: s.status as "on-track" | "needs-attention",
        av: s.avatar,
        school: s.school,
        gradYear: s.grad_year,
        lastLogin: s.last_login,
        engagement: s.engagement,
        schools: (schoolsRes.data || []).map((sc) => ({
          name: sc.name,
          type: sc.type as "reach" | "match" | "safety",
          status: sc.status,
          deadline: sc.deadline,
          essay: sc.essay,
        })),
        dl: (dlRes.data || []).map((d) => ({
          id: d.id,
          title: d.title,
          due: d.due,
          cat: d.category,
          status: d.status as "overdue" | "in-progress" | "pending" | "completed",
          days: d.days,
        })),
        tasks: (tasksRes.data || []).map((t) => ({
          id: t.id,
          cat: t.category,
          title: t.title,
          s: t.start_date,
          d: t.due_date,
          st: t.status,
          team: t.team || [],
        })),
        courses: (coursesRes.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          lv: c.level,
          s1: c.sem1_grade,
          s2: c.sem2_grade,
        })),
        tests: (testsRes.data || []).map((t) => ({
          id: t.id,
          type: t.type,
          date: t.date,
          total: t.total,
          bd: t.breakdown,
          v: t.verified,
        })),
        acts: (actsRes.data || []).map((a) => ({
          id: a.id,
          type: a.type,
          pos: a.position,
          org: a.organization,
          desc: a.description,
          gr: a.grades || [],
          timing: a.timing,
          hrs: a.hours_per_week,
          wks: a.weeks_per_year,
        })),
        goals: (goalsRes.data || []).map((g) => ({
          t: g.title,
          done: g.done,
        })),
        sess: (sessRes.data || []).map((ss) => ({
          date: ss.date,
          notes: ss.notes,
          action: ss.action,
        })),
      };
    })
  );

  return students;
}