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

//change student
export async function addStudent(data: {
  name: string;
  grade: number;
  gpa: number;
  sat: number | null;
  counselor: string;
  school: string;
  gradYear: number;
}): Promise<number | null> {
  const { data: result, error } = await supabase
    .from("students")
    .insert({
      name: data.name,
      grade: data.grade,
      gpa: data.gpa,
      sat: data.sat,
      counselor: data.counselor,
      status: "on-track",
      avatar: data.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
      school: data.school,
      grad_year: data.gradYear,
      last_login: "Never",
      engagement: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error adding student:", error);
    return null;
  }
  return result.id;
}

export async function updateStudent(
  id: number,
  data: {
    name?: string;
    grade?: number;
    gpa?: number;
    sat?: number | null;
    school?: string;
    gradYear?: number;
    status?: string;
    engagement?: number;
  }
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.grade !== undefined) updateData.grade = data.grade;
  if (data.gpa !== undefined) updateData.gpa = data.gpa;
  if (data.sat !== undefined) updateData.sat = data.sat;
  if (data.school !== undefined) updateData.school = data.school;
  if (data.gradYear !== undefined) updateData.grad_year = data.gradYear;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.engagement !== undefined) updateData.engagement = data.engagement;

  // Update avatar if name changed
  if (data.name) {
    updateData.avatar = data.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }

  const { error } = await supabase.from("students").update(updateData).eq("id", id);
  if (error) {
    console.error("Error updating student:", error);
    return false;
  }
  return true;
}

export async function deleteStudent(id: number): Promise<boolean> {
  // Cascade delete handles child records automatically
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) {
    console.error("Error deleting student:", error);
    return false;
  }
  return true;
}

export async function addDeadline(studentId: number, data: {
  title: string; due: string; category: string; status: string; days: number;
}): Promise<boolean> {
  const { error } = await supabase.from("deadlines").insert({
    student_id: studentId, title: data.title, due: data.due,
    category: data.category, status: data.status, days: data.days,
  });
  if (error) { console.error("Error adding deadline:", error); return false; }
  return true;
}

export async function addSession(studentId: number, data: {
  date: string; notes: string; action: string;
}): Promise<boolean> {
  const { error } = await supabase.from("sessions").insert({
    student_id: studentId, date: data.date, notes: data.notes, action: data.action,
  });
  if (error) { console.error("Error adding session:", error); return false; }
  return true;
}