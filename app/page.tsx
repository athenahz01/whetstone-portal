"use client";

import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { fetchAllStudents } from "./lib/queries";
import { LoginPage } from "./components/layout/LoginPage";
import { Sidebar } from "./components/layout/Sidebar";
import { StudentDashboard } from "./components/student/StudentDashboard";
import { Roadmap } from "./components/student/Roadmap";
import { Academics } from "./components/student/Academics";
import { Testing } from "./components/student/Testing";
import { Activities } from "./components/student/Activities";
import { Schools } from "./components/student/Schools";
import { SessionPrep } from "./components/student/SessionPrep";
import { StaffDashboard } from "./components/staff/StaffDashboard";
import { Caseload } from "./components/staff/Caseload";
import { StudentDetail } from "./components/staff/StudentDetail";
import { Analytics } from "./components/staff/Analytics";
import { MasterTimeline } from "./components/staff/MasterTimeline";
import { Goal, Task, Course, Test, Activity, Student } from "./types";

interface Profile {
  role: "student" | "parent" | "staff";
  display_name: string;
  student_id: number | null;
}

export default function Home() {
  const [session, setSession] = useState<boolean | null>(null); // null = loading
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(!!s);
      if (s) loadProfile(s.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setAllStudents([]); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role, display_name, student_id")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data as Profile);
      loadData();
    }
  };

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAllStudents();
    setAllStudents(data);
    if (data.length > 0) {
      const me = data[0];
      setGoals(me.goals);
      setTasks(me.tasks);
      setCourses(me.courses);
      setTests(me.tests);
      setActivities(me.acts);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(false);
    setProfile(null);
    setView("dashboard");
    setSelectedStudent(null);
  };

  const handleLogin = () => {
    // Auth state change listener will handle the rest
  };

  const toggleGoal = (i: number) =>
    setGoals((prev) => prev.map((g, j) => (j === i ? { ...g, done: !g.done } : g)));

  // Loading auth state
  if (session === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center mx-auto mb-4 text-2xl text-white font-bold">W</div>
          <div className="text-lg font-semibold text-heading">Loading...</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Logged in but loading data
  if (loading || !profile || allStudents.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center mx-auto mb-4 text-2xl text-white font-bold">W</div>
          <div className="text-lg font-semibold text-heading">Loading data...</div>
          <div className="text-sm text-sub mt-1">Fetching student records</div>
        </div>
      </div>
    );
  }

  const role = profile.role;
  const me = allStudents[0]; // For student/parent, this will be their linked student
  const isParent = role === "parent";
  const isStudentOrParent = role === "student" || role === "parent";

  const renderMain = () => {
    if (isStudentOrParent && view === "dashboard") {
      return <StudentDashboard student={me} goals={goals} onToggleGoal={toggleGoal} onNavigate={setView} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "roadmap") {
      return <Roadmap tasks={tasks} setTasks={setTasks} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "academics") {
      return <Academics student={me} courses={courses} setCourses={setCourses} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "testing") {
      return <Testing tests={tests} setTests={setTests} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "activities") {
      return <Activities activities={activities} setActivities={setActivities} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "schools") {
      return <Schools student={me} readOnly={isParent} />;
    }
    if (role === "student" && view === "prep") {
      return <SessionPrep student={me} />;
    }
    if (role === "staff" && view === "dashboard") {
      return <StaffDashboard students={allStudents} onSelectStudent={setSelectedStudent} onNavigate={setView} />;
    }
    if (role === "staff" && view === "master") {
      return <MasterTimeline students={allStudents} onSelectStudent={setSelectedStudent} onNavigate={setView} />;
    }
    if (role === "staff" && view === "caseload") {
      return <Caseload students={allStudents} onSelectStudent={setSelectedStudent} onNavigate={setView} />;
    }
    if (role === "staff" && view === "detail" && selectedStudent) {
      return <StudentDetail student={selectedStudent} onBack={() => setView("caseload")} />;
    }
    if (role === "staff" && view === "analytics") {
      return <Analytics students={allStudents} onSelectStudent={setSelectedStudent} onNavigate={setView} />;
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-heading mb-2">{view.charAt(0).toUpperCase() + view.slice(1)}</h1>
        <p className="text-sub">This view is coming soon.</p>
      </div>
    );
  };

  return (
    <div className="flex h-screen text-sm" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#334155" }}>
      <Sidebar
        role={role}
        view={view}
        setView={setView}
        collapsed={!sidebarOpen}
        setCollapsed={() => setSidebarOpen(!sidebarOpen)}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 overflow-auto bg-bg">{renderMain()}</main>
    </div>
  );
}