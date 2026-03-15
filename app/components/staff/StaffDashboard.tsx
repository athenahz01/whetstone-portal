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
  counselorName = "Mentor",
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

  // Urgent: overdue + due today
  const urgent = allDeadlines.filter((d) =>
    d.status === "overdue" || (d.days === 0 && d.status !== "completed")
  );

  // Next 3 days: due in 1-3 days, not completed/overdue
  const next3Days = allDeadlines.filter((d) =>
    d.days >= 1 && d.days <= 3 && d.status !== "completed" && d.status !== "overdue"
  );

  // At risk: last login ≥36 hours
  const atRiskStudents = useMemo(() => students.filter((s) => hoursSinceLogin(s.lastLogin) >= 36), [students]);

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
          <StatCard label="Urgent" value={urgent.length} sub={urgent.length === 0 ? "All clear" : "Overdue + today"} danger={urgent.length > 0} />
          <StatCard label="Next 3 Days" value={next3Days.length} sub="Due soon" />
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

        {/* ── Main Grid: Urgent + Next 3 Days ── */}
        <div className="grid grid-cols-2 gap-3.5 mb-5">
          {/* Urgent — overdue + due today */}
          <Card style={urgent.length > 0 ? { borderTop: "3px solid #e55b5b" } : {}}>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-base font-bold" style={{ color: urgent.length > 0 ? "#e55b5b" : "#ebebeb" }}>
                Urgent {urgent.length > 0 && `(${urgent.length})`}
              </h2>
              <button onClick={() => onNavigate("master")} className="bg-transparent border-none cursor-pointer text-xs font-semibold" style={{ color: "#7aabff" }}>View all →</button>
            </div>
            {urgent.length === 0 && <p className="text-sm text-sub py-4 text-center">All caught up!</p>}
            {urgent.sort((a, b) => a.days - b.days).map((d, i) => (
              <div key={`${d.id}-${i}`}
                onClick={() => { const s = students.find((s) => s.id === d.sid); if (s) { onSelectStudent(s); onNavigate("detail"); } }}
                className="flex items-center gap-2.5 py-2.5 border-b border-line cursor-pointer rounded px-2 -mx-2 hover:bg-mist">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#e55b5b" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-heading truncate">{d.title}</div>
                  <div className="text-xs text-sub">{d.sn}</div>
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: "#e55b5b" }}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : "Today"}
                </span>
              </div>
            ))}
          </Card>

          {/* Next 3 Days */}
          <Card>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-base font-bold text-heading">Next 3 Days</h2>
              <button onClick={() => onNavigate("master")} className="bg-transparent border-none cursor-pointer text-xs font-semibold" style={{ color: "#7aabff" }}>View all →</button>
            </div>
            {next3Days.length === 0 && <p className="text-sm text-sub py-4 text-center">Nothing due in the next 3 days</p>}
            {next3Days.sort((a, b) => a.days - b.days).map((d, i) => (
              <div key={`${d.id}-${i}`}
                onClick={() => { const s = students.find((s) => s.id === d.sid); if (s) { onSelectStudent(s); onNavigate("detail"); } }}
                className="flex items-center gap-2.5 py-2.5 border-b border-line cursor-pointer rounded px-2 -mx-2 hover:bg-mist">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(d.cat) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-heading truncate">{d.title}</div>
                  <div className="text-xs text-sub">{d.sn}</div>
                </div>
                <span className="text-xs font-medium flex-shrink-0" style={{ color: d.days <= 1 ? "#e5a83b" : "#717171" }}>
                  {d.days}d
                </span>
              </div>
            ))}
          </Card>
        </div>

        {/* ── Upcoming Sessions — Crimson style with bold dates ── */}
        <Card>
          <div className="flex justify-between mb-3.5">
            <h2 className="m-0 text-base font-bold text-heading">Upcoming Sessions</h2>
            <button onClick={() => onNavigate("booking-requests")} className="bg-transparent border-none cursor-pointer text-xs font-semibold" style={{ color: "#7aabff" }}>View all →</button>
          </div>
          {upcomingSessions.length === 0 && <p className="text-sm text-sub py-4 text-center">No upcoming sessions</p>}
          <div className="space-y-3">
            {upcomingSessions.map((ss, i) => {
              const d = new Date(ss.date);
              const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const timeLabel = ss.start_time || "";
              const fmtTime = timeLabel ? (() => {
                const [h, m] = timeLabel.split(":");
                const hr = parseInt(h);
                const ampm = hr >= 12 ? "pm" : "am";
                const hr12 = hr % 12 || 12;
                return `${hr12}:${m} ${ampm}`;
              })() : "";
              return (
                <div key={ss.id || i}
                  onClick={() => { const s = students.find((st) => st.id === ss.studentId); if (s) { onSelectStudent(s); onNavigate("detail"); } }}
                  className="flex items-start gap-4 py-3 border-b border-line cursor-pointer hover:bg-mist rounded px-2 -mx-2">
                  <div className="flex-shrink-0 text-right" style={{ minWidth: 90 }}>
                    <div className="text-sm font-bold text-heading">{dateLabel}</div>
                    {fmtTime && <div className="text-xs" style={{ color: "#717171" }}>{fmtTime}</div>}
                  </div>
                  <div className="flex-1 min-w-0 border-l border-line pl-4">
                    <div className="text-sm font-semibold text-heading mb-1">
                      {ss.notes ? ss.notes.split("\n")[0] : `Session with ${ss.studentName}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "#7c3aed", color: "#fff" }}>{ss.studentAv}</div>
                      <span className="text-xs text-body">{ss.studentName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: ss.action ? "rgba(74,186,106,0.08)" : "rgba(229,168,59,0.08)", color: ss.action ? "#4aba6a" : "#e5a83b" }}>
                    {ss.action ? "Confirmed" : "Pending"}
                  </span>
                </div>
              );
            })}
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