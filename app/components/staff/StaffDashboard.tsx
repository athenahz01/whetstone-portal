"use client";
import { authFetch } from "../../lib/supabase";

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
  const [brSessions, setBrSessions] = useState<any[]>([]);

  // Fetch actual booking requests from API — for pending count + upcoming sessions
  useEffect(() => {
    if (!strategistEmail) return;
    authFetch(`/api/booking-requests?strategistEmail=${encodeURIComponent(strategistEmail)}`)
      .then((r) => r.json())
      .then((d) => {
        const reqs = d.requests || [];
        setPendingCount(reqs.filter((r: any) => r.status === "pending" || r.status === "countered").length);
        setBrSessions(reqs.filter((r: any) => r.status === "approved" || r.status === "confirmed"));
      })
      .catch(() => { setPendingCount(0); setBrSessions([]); });
  }, [strategistEmail]);

  const allDeadlines = students.flatMap((s) => s.dl.filter((d: any) => !d.studentOnly).map((d) => ({ ...d, sn: s.name, sid: s.id })));

  // Urgent: overdue + urgent (due today), exclude completed
  const urgent = allDeadlines.filter((d) =>
    d.status !== "completed" && (d.status === "overdue" || d.status === "urgent" || d.days < 0 || d.days === 0)
  );

  // Next 3 days: due in 1-3 days, not completed/overdue/urgent
  const next3Days = allDeadlines.filter((d) =>
    d.days >= 1 && d.days <= 3 && d.status !== "completed" && d.status !== "overdue" && d.status !== "urgent"
  );

  // At risk: last login ≥36 hours
  const atRiskStudents = useMemo(() => students.filter((s) => hoursSinceLogin(s.lastLogin) >= 36), [students]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const _2w = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const twoWeeksStr = `${_2w.getFullYear()}-${String(_2w.getMonth() + 1).padStart(2, "0")}-${String(_2w.getDate()).padStart(2, "0")}`;
    // From sessions table
    const fromSessions = students
      .flatMap((s) => s.sess.map((ss) => ({ ...ss, studentName: s.name, studentAv: s.av, studentId: s.id, source: "session" as const })))
      .filter((ss) => ss.date >= todayStr && ss.date <= twoWeeksStr);
    // From booking requests
    const fromBRs = brSessions
      .filter((br: any) => br.date >= todayStr && br.date <= twoWeeksStr)
      .map((br: any) => ({
        id: `br-${br.id}`, date: br.date, notes: br.session_name,
        start_time: br.start_time, action: br.status,
        studentName: br.student_name || "Student",
        studentAv: (br.student_name || "S").split(" ").map((n: string) => n[0]).join("").substring(0, 2),
        studentId: br.student_id, source: "br" as const,
      }));
    // Merge and dedup by date + studentId — prefer confirmed/approved over pending
    const all = [...fromSessions, ...fromBRs];
    const seen = new Map<string, any>();
    for (const s of all) {
      const key = `${s.date}|${(s as any).studentId || 0}`;
      const existing = seen.get(key);
      if (!existing) { seen.set(key, s); continue; }
      // Prefer confirmed over pending
      const existingStatus = (existing.action || existing.status || "").toLowerCase();
      const newStatus = ((s as any).action || (s as any).status || "").toLowerCase();
      if (newStatus === "confirmed" || newStatus === "approved") seen.set(key, s);
    }
    return Array.from(seen.values())
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || "").localeCompare(b.start_time || ""))
      .slice(0, 5);
  }, [students, brSessions]);

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

      <div className="p-5 px-6">
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

        {/* ── Main Grid: Urgent (left) + Upcoming Sessions (right) ── */}
        <div className="grid grid-cols-2 gap-3.5 mb-5">
          {/* Urgent — overdue + due today, capped at 6 */}
          <Card style={urgent.length > 0 ? { borderTop: "3px solid #e55b5b" } : {}}>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-base font-bold" style={{ color: urgent.length > 0 ? "#e55b5b" : "#ebebeb" }}>
                Urgent {urgent.length > 0 && `(${urgent.length})`}
              </h2>
              <button onClick={() => onNavigate("master")} className="bg-transparent border-none cursor-pointer text-xs font-semibold" style={{ color: "#7aabff" }}>View all →</button>
            </div>
            {urgent.length === 0 && <p className="text-sm text-sub py-4 text-center">All caught up!</p>}
            {urgent.sort((a, b) => a.days - b.days).slice(0, 6).map((d, i) => (
              <div key={`${d.id}-${i}`}
                onClick={() => { const s = students.find((s) => s.id === d.sid); if (s) { onSelectStudent(s); onNavigate("detail"); } }}
                className="flex items-center gap-2.5 py-2.5 border-b border-line cursor-pointer rounded px-2 -mx-2 hover:bg-mist">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#e55b5b" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-heading truncate">{d.title}</div>
                  <div className="text-xs text-sub">{d.sn}</div>
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: "#e55b5b" }}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : d.days === 0 ? "Urgent" : "Today"}
                </span>
              </div>
            ))}
            {urgent.length > 6 && <div className="text-xs text-sub text-center pt-2">+{urgent.length - 6} more</div>}
          </Card>

          {/* Upcoming Sessions — next 3, Crimson style */}
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
                  // If already formatted (contains am/pm), use as-is
                  if (/[ap]m/i.test(timeLabel)) return timeLabel.replace(/\s*(am|pm)/i, (m: string) => m.toLowerCase().trim()).replace(/(\d+:\d+)\s*(am|pm)/i, "$1 $2");
                  const parts = timeLabel.split(":");
                  if (parts.length < 2) return timeLabel;
                  const hr = parseInt(parts[0]);
                  const min = parts[1].substring(0, 2);
                  if (isNaN(hr)) return timeLabel;
                  const ampm = hr >= 12 ? "pm" : "am";
                  const hr12 = hr % 12 || 12;
                  return `${hr12}:${min} ${ampm}`;
                })() : "";
                return (
                  <div key={ss.id || i}
                    onClick={() => { const sid = (ss as any).studentId; const s = sid ? students.find((st) => st.id === sid) : null; if (s) { onSelectStudent(s); onNavigate("detail"); } }}
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

        {/* ── Bottom: Recent Activity — student-style format across all students ── */}
        <Card>
          <div className="flex justify-between mb-3.5">
            <h2 className="m-0 text-base font-bold text-heading">Recent Activity</h2>
            <span className="text-xs" style={{ color: "#505050" }}>All students</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {(() => {
              const items: { type: "completed" | "overdue"; title: string; student: string; cat: string; due: string; days: number; specialist?: string }[] = [];
              students.forEach((s) => {
                s.dl.forEach((d) => {
                  if (d.status === "completed") items.push({ type: "completed", title: d.title, student: s.name, cat: d.cat, due: d.due, days: d.days, specialist: d.specialist });
                  if (d.status === "overdue" || (d.days < 0 && d.status !== "completed")) items.push({ type: "overdue", title: d.title, student: s.name, cat: d.cat, due: d.due, days: d.days });
                });
              });
              // Sort: completed first (by date desc), then overdue
              items.sort((a, b) => {
                if (a.type !== b.type) return a.type === "completed" ? -1 : 1;
                return b.due.localeCompare(a.due);
              });
              if (items.length === 0) return <p className="text-xs text-faint text-center py-3 m-0">No recent activity yet</p>;
              return items.slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#1e1e1e" }}>
                  <span className="text-sm" style={{ color: item.type === "completed" ? "#4aba6a" : "#e55b5b" }}>
                    {item.type === "completed" ? "✓" : "!"}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm text-body">
                      {item.type === "completed"
                        ? <>{item.specialist || item.student.split(" ")[0]} marked <span className="font-semibold text-heading">&quot;{item.title}&quot;</span> as <span style={{ color: "#4aba6a" }}>Complete</span></>
                        : <><span className="font-semibold text-heading">&quot;{item.title}&quot;</span> is <span style={{ color: "#e55b5b" }}>overdue</span> by {Math.abs(item.days)} days</>
                      }
                    </div>
                    <div className="text-[10px] text-faint mt-0.5">{item.student} · {item.cat} · {item.due}</div>
                  </div>
                </div>
              ));
            })()}
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