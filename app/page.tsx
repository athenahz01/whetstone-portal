"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { fetchAllStudents, fetchCounselorEvents, fetchHonors } from "./lib/queries";
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
import { pullFromGoogleCalendar, syncAllDeadlinesToGoogle, syncAllCounselorEventsToGoogle } from "./lib/calendar";
import { Goal, Task, Course, Test, Activity, Student, Honor } from "./types";
import { Honors } from "./components/student/Honors";


interface Profile {
  role: "student" | "parent" | "strategist";
  display_name: string;
  student_id: number | null;
  timezone: string;
}

export default function Home() {
  const [session, setSession] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [honors, setHonors] = useState<Honor[]>([]);
  const [studentGoogleEvents, setStudentGoogleEvents] = useState<any[]>([]);

  // ── Core data loader — wrapped in useCallback so it's stable as a dep ──
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const data = await fetchAllStudents();
    setAllStudents(data);

    if (data.length > 0) {
      const me = data[0];
      setGoals(me.goals);
      setTasks(me.tasks);
      setCourses(me.courses);
      setTests(me.tests);
      setActivities(me.acts);

      // Fetch honors for the linked student
      if (me.id) {
        const honorsData = await fetchHonors(me.id);
        setHonors(honorsData);
      }
    }

    if (!silent) setLoading(false);
    else setRefreshing(false);
  }, []);

  // ── Manual refresh: re-fetch and keep selectedStudent in sync ──
  const handleRefresh = useCallback(async () => {
    await loadData(true);
    // If a student detail is open, refresh that student too
    setSelectedStudent((prev) => {
      if (!prev) return prev;
      // Will be updated naturally when allStudents refreshes below
      return prev;
    });
  }, [loadData]);

  // Keep selectedStudent in sync when allStudents refreshes
  useEffect(() => {
    if (selectedStudent) {
      const updated = allStudents.find((s) => s.id === selectedStudent.id);
      if (updated) setSelectedStudent(updated);
    }
  }, [allStudents]);

  // ── Auto-refresh every 60s so last_login stays live ──
  useEffect(() => {
    if (!session || loading) return;
    const interval = setInterval(() => loadData(true), 60_000);
    return () => clearInterval(interval);
  }, [session, loading, loadData]);

  // ── Auth state ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(!!s);
      if (s) loadProfile(s.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
      if (s) loadProfile(s.user.id);
      else {
        setProfile(null);
        setAllStudents([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Google Calendar events for student ──
  useEffect(() => {
    if (gcalConnected && profileId && allStudents.length > 0 && allStudents[0]?.email) {
      pullFromGoogleCalendar(profileId).then((events) => {
        const studentEmail = allStudents[0].email?.toLowerCase();
        const forStudent = events.filter((e: any) =>
          e.attendees && e.attendees.includes(studentEmail)
        );
        setStudentGoogleEvents(forStudent);
      });
    }
  }, [gcalConnected, profileId, allStudents]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role, display_name, student_id, timezone")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data as Profile);
      setProfileId(userId);
      loadData();

      const { data: tokenData } = await supabase
        .from("google_tokens")
        .select("id")
        .eq("profile_id", userId)
        .single();
      setGcalConnected(!!tokenData);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(false);
    setProfile(null);
    setProfileId(null);
    setGcalConnected(false);
    setView("dashboard");
    setSelectedStudent(null);
  };

  const handleLogin = () => {
    // Auth state change listener handles the rest
  };

  const toggleGoal = (i: number) =>
    setGoals((prev) => prev.map((g, j) => (j === i ? { ...g, done: !g.done } : g)));

  // ── Loading states ──
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

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading || !profile) {
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
  const me = allStudents[0];
  const isParent = role === "parent";
  const isStudentOrParent = role === "student" || role === "parent";

  const renderMain = () => {
    // Unlinked student or parent
    if (isStudentOrParent && allStudents.length === 0) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-heading mb-2">Welcome!</h1>
          <p className="text-sub">
            Your account hasn&apos;t been linked to a student profile yet.
            Please ask your strategist to connect your account.
          </p>
        </div>
      );
    }

    // ── Student & Parent views ──
    if (isStudentOrParent && view === "dashboard") {
      return (
        <StudentDashboard
          student={me}
          goals={goals}
          onToggleGoal={toggleGoal}
          onNavigate={setView}
          readOnly={isParent}
          timezone={profile?.timezone || "America/New_York"}
          googleEvents={studentGoogleEvents}
        />
      );
    }
    if (isStudentOrParent && view === "roadmap")
      return (
        <Roadmap
          tasks={tasks}
          setTasks={setTasks}
          deadlines={me?.dl}
          studentId={me?.id}
          onRefresh={handleRefresh}
          readOnly={isParent}
        />
      );
    if (isStudentOrParent && view === "academics") {
      return <Academics student={me} courses={courses} setCourses={setCourses} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "testing") {
      return <Testing tests={tests} setTests={setTests} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "activities") {
      return <Activities activities={activities} setActivities={setActivities} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "honors") {
      return (
        <Honors
          honors={honors}
          setHonors={setHonors}
          studentId={me?.id}
          readOnly={isParent}
        />
      );
    }
    if (isStudentOrParent && view === "schools") {
      return <Schools student={me} readOnly={isParent} />;
    }
    if (role === "student" && view === "prep") {
      return <SessionPrep student={me} />;
    }

    // ── Strategist views ──
    if (role === "strategist" && view === "dashboard") {
      return (
        <StaffDashboard
          students={allStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
          onRefresh={handleRefresh}
          counselorName={profile?.display_name || "Strategist"}
          refreshing={refreshing}
        />
      );
    }
    if (role === "strategist" && view === "master") {
      return (
        <MasterTimeline
          students={allStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
          profileId={profileId}
        />
      );
    }
    if (role === "strategist" && view === "caseload") {
      return (
        <Caseload
          students={allStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
          onRefresh={loadData}
        />
      );
    }
    if (role === "strategist" && view === "detail" && selectedStudent) {
      return (
        <StudentDetail
          student={selectedStudent}
          onBack={() => setView("caseload")}
          onRefresh={handleRefresh}
          profileId={profileId}
        />
      );
    }
    if (role === "strategist" && view === "analytics") {
      return (
        <Analytics
          students={allStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
        />
      );
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-heading mb-2">
          {view.charAt(0).toUpperCase() + view.slice(1)}
        </h1>
        <p className="text-sub">This view is coming soon.</p>
      </div>
    );
  };

  return (
    <div
      className="flex h-screen text-sm"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#334155",
      }}
    >
      <Sidebar
        role={role}
        view={view}
        setView={setView}
        collapsed={!sidebarOpen}
        setCollapsed={() => setSidebarOpen(!sidebarOpen)}
        onSignOut={handleSignOut}
        studentName={
          role === "strategist"
            ? profile?.display_name || "Strategist"
            : me?.name
        }
        profileId={profileId}
        gcalConnected={gcalConnected}
        timezone={profile?.timezone || "America/New_York"}
        onTimezoneChange={async (tz: string) => {
          if (profileId) {
            await supabase.from("profiles").update({ timezone: tz }).eq("id", profileId);
            setProfile((prev) => (prev ? { ...prev, timezone: tz } : prev));
          }
        }}
        onSyncCalendar={async () => {
          if (!profileId) return;
          alert("Syncing to Google Calendar...");
          await syncAllDeadlinesToGoogle(profileId, allStudents);
          const events = await fetchCounselorEvents();
          await syncAllCounselorEventsToGoogle(profileId, events, allStudents);
          alert("Sync complete! Check your Google Calendar.");
        }}
      />
      <main className="flex-1 overflow-auto bg-bg">{renderMain()}</main>
    </div>
  );
}