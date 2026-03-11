"use client";

import { Student, Goal, Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Tag } from "../ui/Tag";
import { fetchCounselorEventsForStudent, fetchStudentSessions } from "../../lib/queries";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { useState, useEffect } from "react";

interface StudentDashboardProps {
  student: Student;
  goals: Goal[];
  onToggleGoal: (index: number) => void;
  onNavigate: (view: string) => void;
  onRefresh?: () => void;
  readOnly?: boolean;
  timezone?: string;
  googleEvents?: any[];
}

export function StudentDashboard({
  student,
  goals,
  onToggleGoal,
  onNavigate,
  onRefresh,
  readOnly = false,
  timezone = "America/New_York",
  googleEvents = [],
}: StudentDashboardProps) {
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);
  const [sessionTab, setSessionTab] = useState<"upcoming" | "past">("upcoming");
  const [latestCommit, setLatestCommit] = useState<any>(null);

  useEffect(() => {
    if (student.id) {
      fetchCounselorEventsForStudent(student.id).then((evs) => {
        fetchStudentSessions(student.id).then((sess) => {
          setCounselorEvents([...evs, ...sess]);
        });
      });
      // Fetch latest closing commit
      fetch(`/api/closing-commits?studentId=${student.id}`)
        .then(r => r.json())
        .then(d => { if (d.commits?.length > 0) setLatestCommit(d.commits[0]); })
        .catch(() => {});
    }
  }, [student.id]);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingSessions = counselorEvents.filter((ce) => ce.date >= todayStr).sort((a: any, b: any) => a.date.localeCompare(b.date));
  const pastSessions = counselorEvents.filter((ce) => ce.date < todayStr).sort((a: any, b: any) => b.date.localeCompare(a.date));
  const displaySessions = sessionTab === "upcoming" ? upcomingSessions : pastSessions;

  const activeTasks = student.dl
    .filter((d) => d.status !== "completed")
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);


  const dueColor = (days: number) => {
    if (days <= 1) return "#e55b5b";
    if (days <= 3) return "#e5a83b";
    if (days <= 7) return "#e5d43b";
    return "#717171";
  };

  const quickComplete = async (d: Deadline) => {
    try {
      await fetch("/api/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_task", taskId: d.id }),
      });
      if (onRefresh) onRefresh();
    } catch {}
  };

  return (
    <div>
      <PageHeader
        title={readOnly ? `${student.name.split(" ")[0]}'s Dashboard` : `Welcome, ${student.name.split(" ")[0]}`}
        sub={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: timezone })}
        right={readOnly ? <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span> : null}
      />
      <div className="p-6 px-8">
        {/* 2-column layout: Left (Tasks + Activity) | Right (Sessions + Actions) */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "3fr 2fr", alignItems: "start" }}>
          {/* ── Left column ── */}
          <div className="flex flex-col gap-5">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="m-0 text-base font-bold text-heading">Tasks</h3>
                <button onClick={() => onNavigate("tasks")} className="text-xs font-semibold bg-transparent border-none cursor-pointer" style={{ color: "#5A83F3" }}>View all →</button>
              </div>
              {activeTasks.length === 0 ? (
                <p className="text-sm text-sub py-4 text-center">All tasks completed! 🎉</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeTasks.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#252525" }}>
                      {!readOnly && <input type="checkbox" checked={false} onChange={() => quickComplete(d)} className="flex-shrink-0 cursor-pointer" style={{ accentColor: "#4aba6a", width: 16, height: 16 }} />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-heading truncate">{d.title}</div>
                        <div className="text-xs text-sub mt-0.5">{d.due}</div>
                      </div>
                      <div className="flex-shrink-0"><div className="text-sm font-bold px-2.5 py-1 rounded-lg" style={{ background: `${dueColor(d.days)}15`, color: dueColor(d.days) }}>{d.days <= 0 ? "Due!" : `${d.days}d`}</div></div>
                    </div>
                  ))}
                </div>
              )}
              {latestCommit && (() => {
                let actions: any[] = []; try { actions = JSON.parse(latestCommit.actions || "[]"); } catch {} actions = actions.filter((a: any) => a.title);
                if (actions.length === 0) return null;
                return (<div className="mt-4 pt-4 border-t border-line"><div className="text-[10px] font-bold uppercase tracking-wider text-sub mb-2">📋 Latest Commit Actions</div><div className="flex flex-col gap-1">{actions.slice(0, 3).map((a: any, i: number) => (<div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "#1e1e1e" }}><div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: "rgba(82,139,255,0.1)", color: "#5A83F3" }}>{i + 1}</div><div className="flex-1 min-w-0"><div className="text-sm text-heading truncate">{a.title}</div>{a.due && <div className="text-[10px] text-faint mt-0.5">Due: {a.due}</div>}</div></div>))}</div></div>);
              })()}
            </Card>

            {/* Recent Activity — same column as Tasks */}
            <Card>
              <h3 className="m-0 text-sm font-bold text-heading mb-3">Recent Activity</h3>
              <div className="flex flex-col gap-1.5">
                {student.dl.filter(d => d.status === "completed").slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#1e1e1e" }}>
                    <span className="text-sm" style={{ color: "#4aba6a" }}>✓</span>
                    <div className="flex-1"><div className="text-sm text-body">{d.specialist || "Student"} marked <span className="font-semibold text-heading">&quot;{d.title}&quot;</span> as <span style={{ color: "#4aba6a" }}>Complete</span></div><div className="text-[10px] text-faint mt-0.5">{d.cat} · {d.due}</div></div>
                  </div>
                ))}
                {student.dl.filter(d => d.status === "overdue").slice(0, 3).map((d) => (
                  <div key={`ov-${d.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#1e1e1e" }}>
                    <span className="text-sm" style={{ color: "#e55b5b" }}>!</span>
                    <div className="flex-1"><div className="text-sm text-body"><span className="font-semibold text-heading">&quot;{d.title}&quot;</span> is <span style={{ color: "#e55b5b" }}>overdue</span> by {Math.abs(d.days)} days</div><div className="text-[10px] text-faint mt-0.5">{d.cat} · Due: {d.due}</div></div>
                  </div>
                ))}
                {latestCommit && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#1e1e1e" }}>
                    <span className="text-sm" style={{ color: "#5A83F3" }}>📋</span>
                    <div className="flex-1"><div className="text-sm text-body">Close &amp; Commit saved{latestCommit.specialist ? ` with ${latestCommit.specialist}` : ""}</div><div className="text-[10px] text-faint mt-0.5">{new Date(latestCommit.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div></div>
                  </div>
                )}
                {student.dl.filter(d => d.status === "completed").length === 0 && student.dl.filter(d => d.status === "overdue").length === 0 && !latestCommit && (
                  <p className="text-xs text-faint text-center py-3 m-0">No recent activity yet</p>
                )}
              </div>
            </Card>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center justify-between mb-3"><h3 className="m-0 text-sm font-bold text-heading">Sessions</h3><button onClick={() => onNavigate("prep")} className="text-xs font-semibold bg-transparent border-none cursor-pointer" style={{ color: "#5A83F3" }}>View all →</button></div>
              <div className="flex gap-0.5 mb-3 p-0.5 rounded-full" style={{ background: "#1e1e1e", display: "inline-flex" }}>
                {(["upcoming", "past"] as const).map((tab) => (<button key={tab} onClick={() => setSessionTab(tab)} className="px-3.5 py-1.5 rounded-full border-none cursor-pointer text-[11px] font-semibold" style={{ background: sessionTab === tab ? "#5A83F3" : "transparent", color: sessionTab === tab ? "#fff" : "#717171" }}>{tab === "upcoming" ? "Upcoming" : "Past"}</button>))}
              </div>
              {displaySessions.length === 0 ? <p className="text-xs text-sub py-3 text-center m-0">No {sessionTab} sessions</p> : (
                <div className="flex flex-col gap-1.5">{displaySessions.slice(0, 3).map((ce: any) => (<div key={ce.id} className="p-2.5 rounded-lg cursor-pointer hover:opacity-80" onClick={() => onNavigate("prep")} style={{ background: "#252525", borderLeft: `3px solid ${(ce.status === "completed" || ce.date < todayStr) ? "#4aba6a" : "#5A83F3"}` }}><div className="text-sm font-medium text-heading truncate">{ce.title}</div><div className="text-[10px] text-sub mt-0.5">{new Date(ce.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}{ce.specialist && ` · ${ce.specialist}`}</div></div>))}</div>
              )}
            </Card>
            {!readOnly && (
              <div className="grid grid-cols-2 gap-3">
                <Card style={{ padding: 16 }}><div className="text-center"><div className="text-2xl mb-2">🧠</div><div className="text-sm font-bold text-heading mb-1">Plan Your Day</div><button onClick={() => onNavigate("receptacle")} className="w-full mt-2 py-2 rounded-full border-none cursor-pointer text-xs font-semibold" style={{ background: "#5A83F3", color: "#fff" }}>Open Receptacle</button></div></Card>
                <Card style={{ padding: 16 }}><div className="text-center"><div className="text-2xl mb-2">📋</div><div className="text-sm font-bold text-heading mb-1">Close &amp; Commit</div><button onClick={() => onNavigate("prep")} className="w-full mt-2 py-2 rounded-full cursor-pointer text-xs font-semibold" style={{ background: "transparent", color: "#5A83F3", border: "1.5px solid #5A83F3" }}>Open Notes</button></div></Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
