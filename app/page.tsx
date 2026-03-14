"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { fetchAllStudents, fetchCounselorEvents, fetchHonors } from "./lib/queries";
import { LoginPage } from "./components/layout/LoginPage";
import { Sidebar } from "./components/layout/Sidebar";
import { StudentDashboard } from "./components/student/StudentDashboard";
import { StudentProfile } from "./components/student/StudentProfile";
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
import { BookingRequests as BookingRequestsView } from "./components/staff/BookingRequests";
import { MasterTimeline } from "./components/staff/MasterTimeline";
import { AdminPanel } from "./components/staff/AdminPanel";
import { pullFromGoogleCalendar, syncAllDeadlinesToGoogle, syncAllCounselorEventsToGoogle } from "./lib/calendar";
import { Goal, Task, Course, Test, Activity, Student, Honor } from "./types";
import { Honors } from "./components/student/Honors";
import { Receptacle } from "./components/student/Receptacle";



interface Profile {
  role: "student" | "parent" | "strategist";
  display_name: string;
  student_id: number | null;
  timezone: string;
}

const ADMIN_EMAILS = ["athena@whetstoneadmissions.com", "ren@whetstoneadmissions.com"];

export default function Home() {
  const [session, setSession] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [gcalConnected, setGcalConnected] = useState(false);
  // Persist view in URL hash so refresh stays on the same page
  const [view, setView] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      return hash || "dashboard";
    }
    return "dashboard";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.hash = view;
    }
  }, [view]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [caseloadFilter, setCaseloadFilter] = useState<number[] | null>(null);
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

  // Sync student sub-data (goals, tasks, etc.) from the linked student
  const [studentDataLoaded, setStudentDataLoaded] = useState(false);

  // For students/parents: fetch full data via API (bypasses RLS)
  useEffect(() => {
    if (!profile) return;
    const isStudentOrParent = profile.role === "student" || profile.role === "parent";

    if (isStudentOrParent && profile.student_id) {
      fetch(`/api/student-data?studentId=${profile.student_id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.student) {
            const s = data.student;
            setGoals(s.goals || []);
            setTasks(s.tasks || []);
            setCourses(s.courses || []);
            setTests(s.tests || []);
            setActivities(s.acts || []);
            setHonors(s.honors || []);
            setAllStudents((prev) => {
              const idx = prev.findIndex((p) => p.id === s.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = s;
                return updated;
              }
              return [s, ...prev];
            });
          }
          setStudentDataLoaded(true);
        })
        .catch(() => setStudentDataLoaded(true));
    } else {
      setStudentDataLoaded(true);
    }
  }, [profile?.student_id, profile?.role]);

  // For strategists: sync sub-data from allStudents
  useEffect(() => {
    if (!profile || profile.role === "student" || profile.role === "parent") return;
    const linkedStudent = allStudents[0];
    if (linkedStudent) {
      setGoals(linkedStudent.goals);
      setTasks(linkedStudent.tasks);
      setCourses(linkedStudent.courses);
      setTests(linkedStudent.tests);
      setActivities(linkedStudent.acts);
      if (linkedStudent.id) {
        fetchHonors(linkedStudent.id).then(setHonors);
      }
    }
  }, [allStudents, profile]);

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
      if (s) {
        setUserEmail(s.user.email || null);
        loadProfile(s.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
      if (s) {
        setUserEmail(s.user.email || null);
        loadProfile(s.user.id);
      } else {
        setProfile(null);
        setUserEmail(null);
        setAllStudents([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Google Calendar events for student ──
  useEffect(() => {
    if (!gcalConnected || !profileId || !profile) return;

    pullFromGoogleCalendar(profileId).then((events) => {
      setStudentGoogleEvents(events);
    });
  }, [gcalConnected, profileId, profile]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role, display_name, student_id, timezone, email")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data as Profile);
      setProfileId(userId);

      // Update last_login timestamp via API (bypasses RLS)
      fetch("/api/update-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: userId,
          studentId: data.student_id || null,
        }),
      }).catch(() => {});  // fire-and-forget

      // Load caseload filter for strategists
      if (data.role === "strategist" && data.email) {
        fetch(`/api/caseload?strategistEmail=${encodeURIComponent(data.email)}`)
          .then(r => r.json())
          .then(d => {
            const ids = (d.assignments || []).map((a: any) => a.student_id);
            setCaseloadFilter(ids.length > 0 ? ids : null);
          })
          .catch(() => {});
      }

      loadData();

      const { data: tokenData } = await supabase
        .from("google_tokens")
        .select("id")
        .eq("profile_id", userId)
        .single();
      setGcalConnected(!!tokenData);
    } else {
      // Profile doesn't exist yet — the trigger may not have fired.
      // Wait a moment and retry once (the trigger is async).
      setTimeout(async () => {
        const { data: retryData } = await supabase
          .from("profiles")
          .select("role, display_name, student_id, timezone, email")
          .eq("id", userId)
          .single();

        if (retryData) {
          setProfile(retryData as Profile);
          setProfileId(userId);
          loadData();
        } else {
          // Still no profile — show a fallback
          setProfile({ role: "student", display_name: "Student", student_id: null, timezone: "America/New_York" });
          setProfileId(userId);
          setLoading(false);
        }
      }, 1500);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(false);
    setProfile(null);
    setProfileId(null);
    setUserEmail(null);
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
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold" style={{ background: "#ebebeb", color: "#111" }}>W</div>
          <div className="text-lg font-semibold text-heading">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading || !profile || !studentDataLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold" style={{ background: "#ebebeb", color: "#111" }}>W</div>
          <div className="text-lg font-semibold text-heading">Loading data...</div>
          <div className="text-sm text-sub mt-1">Fetching student records</div>
        </div>
      </div>
    );
  }

  const role = profile.role;
  const isAdmin = role === "strategist" && !!userEmail && ADMIN_EMAILS.includes(userEmail);
  const isParent = role === "parent";
  const isStudentOrParent = role === "student" || role === "parent";
  const visibleStudents = (role === "strategist" && caseloadFilter) ? allStudents.filter(s => caseloadFilter.includes(s.id)) : allStudents;

  // For students & parents, find THEIR linked student record
  // For strategists, me is not used the same way
  const me = isStudentOrParent && profile.student_id
    ? allStudents.find((s) => s.id === profile.student_id) || null
    : visibleStudents[0] || null;

  const renderMain = () => {
    // Unlinked student or parent
    if (isStudentOrParent && !me) {
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
    if (isStudentOrParent && view === "dashboard" && me) {
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
    if (isStudentOrParent && view === "tasks" && me)
      return (
        <Roadmap
          tasks={tasks}
          setTasks={setTasks}
          deadlines={me.dl}
          studentId={me.id}
          onRefresh={handleRefresh}
          readOnly={isParent}
          googleEvents={studentGoogleEvents}
        />
      );
    if (isStudentOrParent && view === "academics" && me) {
      return <Academics student={me} courses={courses} setCourses={setCourses} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "testing") {
      return <Testing tests={tests} setTests={setTests} readOnly={isParent} studentId={me?.id} />;
    }
    if (isStudentOrParent && view === "activities") {
      return <Activities activities={activities} setActivities={setActivities} readOnly={isParent} studentId={me?.id} />;
    }
    if (isStudentOrParent && view === "honors" && me) {
      return (
        <Honors
          honors={honors}
          setHonors={setHonors}
          studentId={me.id}
          readOnly={isParent}
        />
      );
    }
    if (isStudentOrParent && view === "profile" && me) {
      return <StudentProfile student={me} readOnly={isParent} />;
    }
    if (isStudentOrParent && view === "schools" && me) {
      return <Schools student={me} readOnly={isParent} onRefresh={handleRefresh} />;
    }
    if (isStudentOrParent && view === "receptacle" && me) {
      return (
        <Receptacle
          studentId={me.id}
          profileId={profileId}
          gcalConnected={gcalConnected}
          googleEvents={studentGoogleEvents}
          readOnly={isParent}
        />
      );
    }
    if (isStudentOrParent && view === "prep" && me) {
      return <SessionPrep student={me} onRefresh={handleRefresh} readOnly={isParent} />;
    }

    // ── Strategist views ──
    if (role === "strategist" && view === "dashboard") {
      return (
        <StaffDashboard
          students={visibleStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
          onRefresh={handleRefresh}
          counselorName={profile?.display_name || "Strategist"}
          refreshing={refreshing}
          strategistEmail={userEmail || ""}
        />
      );
    }
    if (role === "strategist" && view === "master") {
      return (
        <MasterTimeline
          students={visibleStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
          profileId={profileId}
          onRefresh={handleRefresh}
        />
      );
    }
    if (role === "strategist" && view === "caseload") {
      return (
        <Caseload
          students={visibleStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
          onRefresh={loadData}
          isAdmin={isAdmin}
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
    if (role === "strategist" && view === "booking-requests") {
      return <BookingRequestsView strategistEmail={userEmail || ""} />;
    }
    if (role === "strategist" && view === "analytics") {
      return (
        <Analytics
          students={visibleStudents}
          onSelectStudent={setSelectedStudent}
          onNavigate={setView}
        />
      );
    }
    if (role === "strategist" && view === "admin" && isAdmin) {
      return (
        <AdminPanel
          students={allStudents}
          onRefresh={loadData}
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
        color: "#a0a0a0",
      }}
    >
      <Sidebar
        role={role}
        isAdmin={isAdmin}
        view={view}
        setView={setView}
        collapsed={!sidebarOpen}
        setCollapsed={() => setSidebarOpen(!sidebarOpen)}
        onSignOut={handleSignOut}
        studentName={
          role === "strategist"
            ? profile?.display_name || "Strategist"
            : me?.name || profile?.display_name || "Student"
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