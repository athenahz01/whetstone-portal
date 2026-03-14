"use client";

import { useState, useEffect, useMemo } from "react";
import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { getCategoryColor, getStatusColor } from "../../lib/colors";

interface StaffDashboardProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  counselorName?: string;
  strategistEmail?: string;
}

function daysSinceLogin(lastLogin: string | null | undefined): number {
  if (!lastLogin || lastLogin === "Never" || lastLogin === "") return Infinity;
  const parsed = new Date(lastLogin);
  if (isNaN(parsed.getTime())) return Infinity;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursSinceLogin(lastLogin: string | null | undefined): number {
  if (!lastLogin || lastLogin === "Never" || lastLogin === "") return Infinity;
  const parsed = new Date(lastLogin);
  if (isNaN(parsed.getTime())) return Infinity;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60));
}

export function StaffDashboard({
  students,
  onSelectStudent,
  onNavigate,
  onRefresh,
  refreshing = false,
  counselorName = "Strategist",
  strategistEmail = "",
}: StaffDashboardProps) {
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch actual pending booking requests from API
  useEffect(() => {
    if (!strategistEmail) return;
    fetch(`/api/booking-requests?strategistEmail=${encodeURIComponent(strategistEmail)}`)
      .then((r) => r.json())
      .then((d) => {
        const pending = (d.requests || []).filter((r: any) => r.status === "pending" || r.status === "countered");
        setPendingCount(pending.length);
      })
      .catch(() => setPendingCount(0));
  }, [strategistEmail]);

  const allDeadlines = students.flatMap((s) => s.dl.map((d) => ({ ...d, sn: s.name, sid: s.id })));

  // Overdue: deadlines where status is "overdue" (past due date, not completed)
  const overdue = allDeadlines.filter((d) => d.status === "overdue");

  // Upcoming ≤48h: deadlines due within 0-2 days that aren't completed or overdue
  const upcoming48h = allDeadlines.filter((d) =>
    d.days >= 0 && d.days <= 2 && d.status !== "completed" && d.status !== "overdue"
  );

  // At risk: last login ≥36 hours
  const atRiskStudents = useMemo(() => students.filter((s) => hoursSinceLogin(s.lastLogin) >= 36), [students]);

  const timelineItems = useMemo(() => {
    return allDeadlines
      .filter((d) => d.status === "pending" || d.status === "in-progress")
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [allDeadlines]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return students
      .flatMap((s) => s.sess.map((ss) => ({ ...ss, studentName: s.name, studentAv: s.av, studentId: s.id })))
      .filter((ss) => new Date(ss.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [students]);

  const recentActivity = useMemo(() => {
    const items: { type: "overdue" | "completed"; title: string; student: string; date: string }[] = [];
    students.forEach((s) => {
      s.dl.forEach((d) => {
        if (d.status === "overdue") items.push({ type: "overdue", title: d.title, student: s.name, date: d.due });
        if (d.status === "completed") items.push({ type: "completed", title: d.title, student: s.name, date: d.due });
      });
    });
    return items.slice(0, 6);
  }, [students]);

  // Stat card helper
  const StatCard = ({ label, value, sub, danger }: { label: string; value: number | string; sub: string; danger?: boolean }) => (
    <div className="rounded-xl p-5 border border-line" style={{ background: "#1e1e1e" }}>
      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#717171" }}>{label}</p>
      <p className="text-3xl font-bold mb-1" style={{ color: danger ? "#e55b5b" : "#ebebeb" }}>{value}</p>
      <p className="text-xs" style={{ color: "#505050" }}>{sub}</p>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        sub={`${counselorName} — ${students.length} active students`}
        right={
          <button onClick={onRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
            style={{ borderColor: "#2a2a2a", background: "#1e1e1e", color: "#717171" }}>
            <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      <div className="p-6 px-8">
        {/* ── Top Row: 5 Stat Cards ── */}
        <div className="grid grid-cols-5 gap-3.5 mb-5">
          <StatCard label="Active Students" value={students.length} sub="Assigned & active" />
          <StatCard label="Overdue" value={overdue.length} sub={overdue.length === 0 ? "All clear" : "Past due"} danger={overdue.length > 0} />
          <StatCard label="Next 48h" value={upcoming48h.length} sub="Due soon" />
          <StatCard label="Pending Sessions" value={pendingCount} sub={pendingCount === 0 ? "All confirmed" : "Not confirmed"} danger={pendingCount > 0} />
          <div
            onClick={() => atRiskStudents.length > 0 && setShowInactiveModal(true)}
            className={`rounded-xl p-5 border border-line transition-all select-none ${atRiskStudents.length > 0 ? "cursor-pointer hover:border-danger" : ""}`}
            style={{ background: "#1e1e1e" }}
          >
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#717171" }}>At Risk</p>
            <p className="text-3xl font-bold mb-1" style={{ color: atRiskStudents.length > 0 ? "#e55b5b" : "#ebebeb" }}>{atRiskStudents.length}</p>
            <p className="text-xs" style={{ color: "#505050" }}>{atRiskStudents.length === 0 ? "All active" : "Login ≥36h ago"}</p>
          </div>
        </div>

        {/* ── Main Grid: Timeline + Upcoming Sessions ── */}
        <div className="grid grid-cols-2 gap-3.5 mb-5">
          <Card>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-base font-bold text-heading">Timeline</h2>
              <button onClick={() => onNavigate("master")} className="bg-transparent border-none cursor-pointer text-xs font-semibold" style={{ color: "#7aabff" }}>View all →</button>
            </div>
            {timelineItems.length === 0 && <p className="text-sm text-sub py-4 text-center">All caught up!</p>}
            {timelineItems.map((d, i) => (
              <div key={`${d.id}-${i}`}
                onClick={() => { const s = students.find((s) => s.id === d.sid); if (s) { onSelectStudent(s); onNavigate("detail"); } }}
                className="flex items-center gap-2.5 py-2.5 border-b border-line cursor-pointer rounded px-2 -mx-2 hover:bg-mist">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(d.cat) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-heading truncate">{d.title}</div>
                  <div className="text-xs text-sub">{d.sn}</div>
                </div>
                <span className="text-xs font-medium flex-shrink-0" style={{ color: d.days <= 1 ? "#e55b5b" : d.days <= 3 ? "#e5a83b" : "#717171" }}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : d.days === 0 ? "Today" : `${d.days}d`}
                </span>
              </div>
            ))}
          </Card>

          <Card>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-base font-bold text-heading">Upcoming Sessions</h2>
              <span className="text-xs" style={{ color: "#505050" }}>Next 3</span>
            </div>
            {upcomingSessions.length === 0 && <p className="text-sm text-sub py-4 text-center">No upcoming sessions</p>}
            {upcomingSessions.map((ss, i) => {
              const d = new Date(ss.date);
              return (
                <div key={ss.id || i}
                  onClick={() => { const s = students.find((st) => st.id === ss.studentId); if (s) { onSelectStudent(s); onNavigate("detail"); } }}
                  className="p-3 rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity border border-line" style={{ background: "#252525" }}>
                  <div className="text-xs mb-1" style={{ color: "#505050" }}>
                    {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="text-sm font-semibold text-heading mb-1.5">
                    {ss.notes ? ss.notes.split("\n")[0] : `Session with ${ss.studentName}`}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(90,131,243,0.1)", color: "#5A83F3" }}>{ss.studentAv}</div>
                      <span className="text-xs text-body">{ss.studentName}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: ss.action ? "rgba(74,186,106,0.08)" : "rgba(229,168,59,0.08)", color: ss.action ? "#4aba6a" : "#e5a83b" }}>
                      {ss.action ? "Confirmed" : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* ── Bottom: Recent Activity ── */}
        <Card>
          <div className="flex justify-between mb-3.5">
            <h2 className="m-0 text-base font-bold text-heading">Recent Activity</h2>
            <span className="text-xs" style={{ color: "#505050" }}>All students</span>
          </div>
          {recentActivity.length === 0 && <p className="text-sm text-sub py-4 text-center">No recent activity</p>}
          <div className="grid grid-cols-2 gap-2">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 px-3 rounded-lg" style={{ background: item.type === "overdue" ? "rgba(229,91,91,0.06)" : "rgba(74,186,106,0.06)" }}>
                <span className="text-sm flex-shrink-0">{item.type === "overdue" ? "⚠️" : "✅"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-heading truncate">{item.title}</div>
                  <div className="text-xs text-sub">{item.student} · {item.date}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── At Risk Modal ── */}
      {showInactiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={(e) => { if (e.target === e.currentTarget) setShowInactiveModal(false); }}>
          <div className="rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-line">
              <div>
                <h2 className="text-base font-bold text-heading m-0">Students at Risk</h2>
                <p className="text-xs mt-0.5" style={{ color: "#505050" }}>Last login ≥36 hours ago</p>
              </div>
              <button onClick={() => setShowInactiveModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full text-lg font-bold bg-transparent border-none cursor-pointer" style={{ color: "#717171" }}>×</button>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
              {atRiskStudents.map((s) => {
                const days = daysSinceLogin(s.lastLogin);
                return (
                  <div key={s.id} onClick={() => { setShowInactiveModal(false); onSelectStudent(s); onNavigate("detail"); }}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "rgba(229,91,91,0.06)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(229,91,91,0.1)", color: "#e55b5b" }}>{s.av}</div>
                      <div>
                        <div className="text-sm font-semibold text-heading">{s.name}</div>
                        <div className="text-xs" style={{ color: "#505050" }}>Gr. {s.grade} · {s.school}</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold" style={{ color: "#e55b5b" }}>{days === Infinity ? "Never" : `${days}d ago`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}