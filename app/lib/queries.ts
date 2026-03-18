import { supabase } from "./supabase";
import { Student, Honor } from "../types";

export async function fetchAllStudents(): Promise<Student[]> {
  const { data: studentsRaw, error } = await supabase
    .from("students")
    .select("*")
    .order("id");

  if (error || !studentsRaw) {
    console.error("Error fetching students:", error);
    return [];
  }

  // Fetch caseload assignments to build team map (student_id → strategist names)
  const { data: caseloadData } = await supabase.from("caseload_assignments").select("student_id, strategist_email");
  const { data: profilesData } = await supabase.from("profiles").select("email, display_name").eq("role", "strategist");
  const emailToName = new Map<string, string>();
  (profilesData || []).forEach((p: any) => { if (p.email && p.display_name) emailToName.set(p.email.toLowerCase(), p.display_name); });
  const teamMap = new Map<number, string[]>();
  (caseloadData || []).forEach((ca: any) => {
    const name = emailToName.get((ca.strategist_email || "").toLowerCase());
    if (name && ca.student_id) {
      if (!teamMap.has(ca.student_id)) teamMap.set(ca.student_id, []);
      teamMap.get(ca.student_id)!.push(name);
    }
  });

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

      // Calculate grade dynamically from graduation year
      // If gradYear is 2027 and it's March 2026, student is in 11th grade
      // Logic: 12 - (gradYear - currentSchoolYear)
      // School year: if current month >= August, school year = current calendar year + 1
      const now = new Date();
      const currentSchoolYear = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
      const calculatedGrade = s.grad_year ? Math.min(12, Math.max(9, 12 - (s.grad_year - currentSchoolYear))) : s.grade;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        grade: calculatedGrade,
        gpa: Number(s.gpa),
        sat: s.sat,
        counselor: s.counselor,
        team: teamMap.get(s.id) || [],
        status: s.status as "on-track" | "needs-attention",
        av: s.avatar,
        school: s.school,
        gradYear: s.grad_year,
        lastLogin: (!s.last_login || s.last_login === "Never") ? null : s.last_login,
        engagement: s.engagement,
        applicationYear: s.application_year || s.grad_year,
        intendedMajors: s.intended_majors || null,
        hookStatement: s.hook_statement || null,
        achievements: s.achievements || null,
        schools: (schoolsRes.data || []).map((sc) => ({
          id: sc.id,
          name: sc.name,
          type: sc.type as "reach" | "match" | "safety",
          status: sc.status,
          deadline: sc.deadline,
          essay: sc.essay,
        })),
        dl: (dlRes.data || []).map((d) => {
          // Calculate days until due dynamically
          const dueDate = d.due ? new Date(d.due + "T00:00:00") : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffDays = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          return {
            id: d.id,
            title: d.title,
            due: d.due,
            cat: d.category,
            status: d.status as "overdue" | "in-progress" | "pending" | "completed" | "blocked",
            days: diffDays,
            specialist: d.specialist || "",
            googleDocLink: d.google_doc_link || "",
            createdBy: (d.created_by || "strategist") as "strategist" | "student",
            priority: d.priority || undefined,
            description: d.description || undefined,
            blockedBy: d.blocked_by || undefined,
            internalOnly: d.internal_only || false,
            studentOnly: d.student_only || false,
            responsible: d.responsible || [],
            actualDeadline: d.actual_deadline || "",
          };
        }),
        tasks: (tasksRes.data || []).map((t) => ({
          id: t.id,
          cat: t.category,
          title: t.title,
          s: t.start_date,
          d: t.due_date,
          st: t.status,
          team: t.team || [],
          specialist: t.specialist || "",
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
          mathScore: t.math_score || null,
          englishScore: t.english_score || null,
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
          id: ss.id,
          date: ss.date,
          notes: ss.notes,
          action: ss.action,
        })),
      };
    })
  );

  return students;
}

export async function addStudent(data: {
  name: string;
  email: string;
  grade: number;
  gpa: number | null;
  school: string;
  gradYear: number;
}): Promise<number | null> {
  const { data: result, error } = await supabase
    .from("students")
    .insert({
      name: data.name,
      email: data.email,
      grade: data.grade,
      gpa: data.gpa,
      sat: null,
      counselor: "",
      status: "on-track",
      avatar: data.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
      school: data.school,
      grad_year: data.gradYear,
      last_login: null,
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
    team?: string[];
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
  if (data.team !== undefined) updateData.team = data.team;

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
  // Unlink any profiles referencing this student (foreign key constraint)
  await supabase.from("profiles").update({ student_id: null }).eq("student_id", id);

  // Delete all child records (foreign key constraints)
  await supabase.from("receptacle_events").delete().eq("student_id", id);
  await supabase.from("schools").delete().eq("student_id", id);
  await supabase.from("deadlines").delete().eq("student_id", id);
  await supabase.from("tasks").delete().eq("student_id", id);
  await supabase.from("courses").delete().eq("student_id", id);
  await supabase.from("tests").delete().eq("student_id", id);
  await supabase.from("activities").delete().eq("student_id", id);
  await supabase.from("goals").delete().eq("student_id", id);
  await supabase.from("sessions").delete().eq("student_id", id);
  await supabase.from("honors").delete().eq("student_id", id);
  await supabase.from("counselor_event_students").delete().eq("student_id", id);

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) {
    console.error("Error deleting student:", error.message, error.details, error.hint);
    return false;
  }
  return true;
}

// ── Deadlines ──────────────────────────────────────────────────────────────

export async function addDeadline(
  studentId: number,
  data: {
    title: string;
    due: string;
    category: string;
    status: string;
    days: number;
    specialist?: string;
    priority?: string;
    google_doc_link?: string;
    created_by?: "strategist" | "student";
    internal_only?: boolean;
    student_only?: boolean;
    responsible?: string[];
    actual_deadline?: string;
  }
): Promise<boolean> {
  const insertData: any = {
    student_id: studentId,
    title: data.title,
    due: data.due,
    category: data.category,
    status: data.status,
    days: data.days,
    specialist: data.specialist || null,
    google_doc_link: data.google_doc_link || null,
    created_by: data.created_by || "strategist",
  };
  if (data.priority) insertData.priority = data.priority;
  if (data.internal_only) insertData.internal_only = true;
  if (data.student_only) insertData.student_only = true;
  if (data.responsible?.length) insertData.responsible = data.responsible;
  if (data.actual_deadline) insertData.actual_deadline = data.actual_deadline;
  const { error } = await supabase.from("deadlines").insert(insertData);
  if (error) {
    console.error("Error adding deadline:", error);
    return false;
  }
  return true;
}

export async function updateDeadline(
  deadlineId: number,
  data: {
    title?: string;
    due?: string;
    category?: string;
    status?: string;
    specialist?: string;
    google_doc_link?: string;
    blocked_by?: string;
    priority?: string;
    description?: string;
    student_only?: boolean;
    internal_only?: boolean;
  }
): Promise<boolean> {
  try {
    const res = await fetch("/api/update-deadline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadlineId, ...data }),
    });
    const result = await res.json();
    if (!res.ok) {
      console.error("[updateDeadline] API error:", result);
      if (result.note) console.warn("[updateDeadline]", result.note);
    }
    return res.ok;
  } catch (err) {
    console.error("Error updating deadline:", err);
    return false;
  }
}

export async function deleteDeadline(deadlineId: number): Promise<boolean> {
  const { error } = await supabase
    .from("deadlines")
    .delete()
    .eq("id", deadlineId);
  if (error) {
    console.error("Error deleting deadline:", error);
    return false;
  }
  return true;
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function fetchStudentSessions(studentId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: true });
  if (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
  return (data || []).map((s: any) => ({
    id: `sess-${s.id}`,
    title: s.session_name || `Session on ${s.date}`,
    date: s.date,
    category: s.session_type || "session",
    notes: s.notes || "",
    specialist: s.specialist || "",
    start_time: s.start_time || "",
    end_time: s.end_time || "",
    status: s.status || "pending",
    source: "booking",
  }));
}

export async function addSession(studentId: number, data: {
  date: string; notes: string; action: string;
  session_name?: string; start_time?: string; end_time?: string;
  session_type?: string; booking_type?: string; specialist?: string;
}): Promise<boolean> {
  // Try with all fields first
  const insertData: any = {
    student_id: studentId, date: data.date, notes: data.notes || "", action: data.action || "",
  };
  if (data.session_name) insertData.session_name = data.session_name;
  if (data.start_time) insertData.start_time = data.start_time;
  if (data.end_time) insertData.end_time = data.end_time;
  if (data.session_type) insertData.session_type = data.session_type;
  if (data.booking_type) insertData.booking_type = data.booking_type;
  if (data.specialist) insertData.specialist = data.specialist;

  const { error } = await supabase.from("sessions").insert(insertData);
  if (error) {
    console.error("Error adding session (full):", error.message);
    // Fallback: insert with only core fields (columns that definitely exist)
    const { error: fallbackError } = await supabase.from("sessions").insert({
      student_id: studentId,
      date: data.date,
      notes: `${data.specialist ? `Booked with: ${data.specialist}\n` : ""}${data.session_name ? `Session: ${data.session_name}\n` : ""}${data.start_time ? `Time: ${data.start_time} - ${data.end_time}\n` : ""}${data.notes || ""}`,
      action: data.action || "",
    });
    if (fallbackError) {
      console.error("Error adding session (fallback):", fallbackError.message);
      return false;
    }
  }
  return true;
}

export async function updateSession(sessionId: number, data: {
  date?: string; notes?: string; action?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("sessions").update(data).eq("id", sessionId);
  if (error) { console.error("Error updating session:", error); return false; }
  return true;
}

export async function deleteSession(sessionId: number): Promise<boolean> {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) { console.error("Error deleting session:", error); return false; }
  return true;
}

// ── Schools ───────────────────────────────────────────────────────────────

export async function addSchool(studentId: number, data: {
  name: string; type: string; status: string; deadline: string; essay: string;
}): Promise<boolean> {
  const { error } = await supabase.from("schools").insert({
    student_id: studentId, name: data.name, type: data.type, status: data.status, deadline: data.deadline, essay: data.essay,
  });
  if (error) { console.error("Error adding school:", error); return false; }
  return true;
}

export async function updateSchool(schoolId: number, data: {
  name?: string; type?: string; status?: string; deadline?: string; essay?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("schools").update(data).eq("id", schoolId);
  if (error) { console.error("Error updating school:", error); return false; }
  return true;
}

export async function deleteSchool(schoolId: number): Promise<boolean> {
  const { error } = await supabase.from("schools").delete().eq("id", schoolId);
  if (error) { console.error("Error deleting school:", error); return false; }
  return true;
}

// ── Counselor Events ───────────────────────────────────────────────────────

export async function addCounselorEvent(data: {
  title: string;
  date: string;
  category: string;
  notes: string;
  createdBy: string;
  studentIds: number[];
}): Promise<boolean> {
  const { data: event, error } = await supabase
    .from("counselor_events")
    .insert({
      title: data.title,
      date: data.date,
      category: data.category,
      notes: data.notes,
      created_by: data.createdBy,
    })
    .select("id")
    .single();

  if (error || !event) {
    console.error("Error creating counselor event:", error);
    return false;
  }

  const links = data.studentIds.map((sid) => ({
    event_id: event.id,
    student_id: sid,
  }));

  const { error: linkError } = await supabase
    .from("counselor_event_students")
    .insert(links);

  if (linkError) {
    console.error("Error linking students:", linkError);
    return false;
  }

  return true;
}

export async function fetchCounselorEvents(): Promise<any[]> {
  const { data: events, error } = await supabase
    .from("counselor_events")
    .select("*")
    .order("date", { ascending: true });

  if (error || !events) return [];

  const eventIds = events.map((e) => e.id);
  const { data: links } = await supabase
    .from("counselor_event_students")
    .select("event_id, student_id")
    .in("event_id", eventIds);

  return events.map((e) => ({
    ...e,
    studentIds: (links || []).filter((l) => l.event_id === e.id).map((l) => l.student_id),
  }));
}

export async function fetchCounselorEventsForStudent(studentId: number): Promise<any[]> {
  const { data: links } = await supabase
    .from("counselor_event_students")
    .select("event_id")
    .eq("student_id", studentId);

  if (!links || links.length === 0) return [];

  const eventIds = links.map((l) => l.event_id);
  const { data: events } = await supabase
    .from("counselor_events")
    .select("*")
    .in("id", eventIds)
    .order("date", { ascending: true });

  return events || [];
}

export async function deleteCounselorEvent(eventId: number): Promise<boolean> {
  const { error } = await supabase
    .from("counselor_events")
    .delete()
    .eq("id", eventId);
  if (error) {
    console.error("Error deleting event:", error);
    return false;
  }
  return true;
}

// ── Honors ─────────────────────────────────────────────────────────────────

export async function fetchHonors(studentId: number): Promise<Honor[]> {
  const { data, error } = await supabase
    .from("honors")
    .select("*")
    .eq("student_id", studentId)
    .order("id", { ascending: true });

  if (error || !data) {
    console.error("Error fetching honors:", error);
    return [];
  }

  return data.map((h) => ({
    id: h.id,
    title: h.title,
    grades: h.grades || [],
    recognition: h.recognition || [],
  }));
}
// ── Receptacle Events ─────────────────────────────────────────────────────

export interface ReceptacleEvent {
  id: number;
  student_id: number;
  task_text: string;
  minutes: number;
  date: string;
  top_minutes: number;
  quadrant: string | null;
  synced: boolean;
  completed: boolean;
}

export async function fetchReceptacleEvents(studentId: number): Promise<ReceptacleEvent[]> {
  const { data, error } = await supabase
    .from("receptacle_events")
    .select("*")
    .eq("student_id", studentId)
    .neq("date", "braindump")
    .order("date", { ascending: true });

  if (error || !data) {
    console.error("Error fetching receptacle events:", error);
    return [];
  }
  return data as ReceptacleEvent[];
}

export async function addReceptacleEvent(studentId: number, data: {
  task_text: string;
  minutes: number;
  date: string;
  top_minutes: number;
  quadrant?: string;
}): Promise<ReceptacleEvent | null> {
  const { data: result, error } = await supabase
    .from("receptacle_events")
    .insert({
      student_id: studentId,
      task_text: data.task_text,
      minutes: data.minutes,
      date: data.date,
      top_minutes: data.top_minutes,
      quadrant: data.quadrant || null,
      synced: false,
      completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding receptacle event:", error);
    return null;
  }
  return result as ReceptacleEvent;
}

export async function updateReceptacleEvent(id: number, data: {
  date?: string;
  top_minutes?: number;
  synced?: boolean;
  completed?: boolean;
}): Promise<boolean> {
  const { error } = await supabase
    .from("receptacle_events")
    .update(data)
    .eq("id", id);
  if (error) {
    console.error("Error updating receptacle event:", error);
    return false;
  }
  return true;
}

export async function deleteReceptacleEvent(id: number): Promise<boolean> {
  const { error } = await supabase
    .from("receptacle_events")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting receptacle event:", error);
    return false;
  }
  return true;
}

// ── Brain dump task persistence (step 1) ──────────────────────────────────

export async function addBrainDumpTask(studentId: number, data: {
  task_text: string;
  minutes: number;
  quadrant?: string;
}): Promise<ReceptacleEvent | null> {
  const { data: result, error } = await supabase
    .from("receptacle_events")
    .insert({
      student_id: studentId,
      task_text: data.task_text,
      minutes: data.minutes,
      date: "braindump",
      top_minutes: 0,
      quadrant: data.quadrant || null,
      synced: false,
      completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding brain dump task:", error);
    return null;
  }
  return result as ReceptacleEvent;
}

export async function fetchBrainDumpTasks(studentId: number): Promise<ReceptacleEvent[]> {
  const { data, error } = await supabase
    .from("receptacle_events")
    .select("*")
    .eq("student_id", studentId)
    .eq("date", "braindump")
    .order("id", { ascending: true });

  if (error || !data) {
    console.error("Error fetching brain dump tasks:", error);
    return [];
  }
  return data as ReceptacleEvent[];
}

export async function updateBrainDumpQuadrant(id: number, quadrant: string | null): Promise<boolean> {
  const { error } = await supabase
    .from("receptacle_events")
    .update({ quadrant })
    .eq("id", id);
  if (error) {
    console.error("Error updating brain dump quadrant:", error);
    return false;
  }
  return true;
}