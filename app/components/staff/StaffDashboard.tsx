"use client";

import { useState, useEffect, useMemo } from "react";
import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { getCategoryColor } from "../../lib/colors";

interface StaffDashboardProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  counselorName?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysSinceLogin(lastLogin: string | null | undefined): number {
  if (!lastLogin || lastLogin === "Never" || lastLogin === "") return Infinity;
  const parsed = new Date(lastLogin);
  if (isNaN(parsed.getTime())) return Infinity;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function formatLastLogin(lastLogin: string | null | undefined): string {
  const days = daysSinceLogin(lastLogin);
  if (days === Infinity) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function StaffDashboard({
  students,
  onSelectStudent,
  onNavigate,
  onRefresh,
  refreshing = false,
  counselorName = "Strategist",
}: StaffDashboardProps) {
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [authLogins, setAuthLogins] = useState<Record<string, string | null>>({});

  // Fetch real last_sign_in from Supabase Auth via admin API
  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string | null> = {};
        for (const u of (data.users || [])) {
          if (u.studentId) map[u.studentId] = u.lastSignIn;
          // Also try matching by email
          if (u.email) map[`email:${u.email}`] = u.lastSignIn;
        }
        setAuthLogins(map);
      })
      .catch(() => {});
  }, []);

  // Get the real last login for a student (prefer auth data over students table)
  const getRealLastLogin = (s: Student): string | null => {
    return authLogins[s.id] || authLogins[`email:${s.email}`] || s.lastLogin || null;
  };

  const all = students.flatMap((s) => s.dl.map((d) => ({ ...d, sn: s.name })));
  const ov = all.filter((d) => d.status === "overdue");
  const wk = all.filter((d) => d.days >= 0 && d.days <= 7 && d.status !== "completed");
  const att = students.filter((s) => s.status === "needs-attention");

  const inactiveStudents = useMemo(
    () => students.filter((s) => daysSinceLogin(getRealLastLogin(s)) >= 3),
    [students, authLogins]
  );

  const avgEngagement =
    students.length > 0
      ? Math.round(students.reduce((a, s) => a + s.engagement, 0) / students.length)
      : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        sub={`${counselorName} — ${students.length} active students`}
        right={
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-line bg-mist hover:bg-raised transition-colors disabled:opacity-50"
            style={{ color: "#717171" }}
          >
            <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      <div className="p-6 px-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-5 gap-3.5 mb-5">
          <MetricCard label="Students" value={students.length} color="#528bff" />
          <MetricCard label="Overdue" value={ov.length} color="#e55b5b" />
          <MetricCard label="This Week" value={wk.length} color="#e5a83b" />
          <MetricCard label="Avg Engagement" value={`${avgEngagement}%`} color="#4aba6a" />

          {/* Login Warning */}
          <div
            onClick={() => inactiveStudents.length > 0 && setShowInactiveModal(true)}
            className={`rounded-xl p-5 border-t-4 transition-all select-none bg-white border border-line
              ${inactiveStudents.length > 0
                ? "border-t-red-500 cursor-pointer hover:shadow-md hover:bg-red-50"
                : "border-t-green-500"
              }`}
          >
            <p className="text-xs font-semibold tracking-widest text-faint uppercase mb-2">
              Login Warning
            </p>
            <p className={`text-4xl font-bold mb-1 ${inactiveStudents.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {inactiveStudents.length}
            </p>
            <p className="text-xs text-sub leading-tight">
              {inactiveStudents.length === 0
                ? "All students active"
                : inactiveStudents.length === 1
                ? "1 student inactive 3+ days"
                : `${inactiveStudents.length} students inactive 3+ days`}
            </p>
          </div>
        </div>

        {/* Attention Banner */}
        {att.length > 0 && (
          <div
            className="rounded-lg p-3 px-4 mb-4 flex items-center gap-3"
            style={{ background: "rgba(229,91,91,0.08)", border: "1px solid rgba(239,68,68,0.12)" }}
          >
            <span className="text-base">⚠</span>
            <div>
              <div className="text-sm font-bold" style={{ color: "#e55b5b" }}>
                {att.length} student{att.length > 1 ? "s" : ""} need{att.length === 1 ? "s" : ""} attention
              </div>
              <div className="text-sm text-sub">{att.map((s) => s.name).join(", ")}</div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Students list */}
          <Card>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-lg font-bold text-heading">Students</h2>
              <button
                onClick={() => onNavigate("caseload")}
                className="bg-transparent border-none text-accent-ink cursor-pointer text-sm font-semibold"
              >
                View all →
              </button>
            </div>
            {students.map((s) => {
              const days = daysSinceLogin(getRealLastLogin(s));
              const loginWarning = days >= 3;
              return (
                <div
                  key={s.id}
                  onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                  className="flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5 cursor-pointer"
                  style={{
                    background: "#252525",
                    borderLeft: `3px solid ${
                      s.status === "needs-attention" ? "#e55b5b"
                      : s.engagement > 80 ? "#4aba6a"
                      : "#e5a83b"
                    }`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}
                    >
                      {s.av}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-heading">{s.name}</div>
                      <div className="text-xs text-sub">Gr. {s.grade} · {s.school}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-sm font-bold"
                      style={{ color: s.engagement > 80 ? "#4aba6a" : s.engagement > 60 ? "#e5a83b" : "#e55b5b" }}
                    >
                      {s.engagement}%
                    </div>
                    <div className="text-xs" style={{ color: loginWarning ? "#e55b5b" : "#505050" }}>
                      {formatLastLogin(getRealLastLogin(s))}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* This Week */}
          <Card>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-lg font-bold text-heading">This Week</h2>
              <button
                onClick={() => onNavigate("master")}
                className="bg-transparent border-none text-accent-ink cursor-pointer text-sm font-semibold"
              >
                Timeline →
              </button>
            </div>
            {[...ov, ...wk].sort((a, b) => a.days - b.days).slice(0, 8).map((d, i) => (
              <div key={`${d.id}-${i}`} className="flex items-center gap-2.5 py-2 border-b border-line">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: d.status === "overdue" ? "#e55b5b" : getCategoryColor(d.cat) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-heading whitespace-nowrap overflow-hidden text-ellipsis">
                    {d.title}
                  </div>
                  <div className="text-xs text-sub">{d.sn}</div>
                </div>
                <Tag color={d.status === "overdue" ? "#e55b5b" : "#505050"}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : d.days === 0 ? "Today" : `${d.days}d`}
                </Tag>
              </div>
            ))}
            {[...ov, ...wk].length === 0 && (
              <p className="text-sm text-sub py-4 text-center">All caught up this week 🎉</p>
            )}
          </Card>
        </div>
      </div>

      {/* Login Warning Modal */}
      {showInactiveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInactiveModal(false); }}
        >
          <div className="rounded-2xl border border-line w-full max-w-md mx-4 overflow-hidden"
            style={{ background: "#191919" }}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-line">
              <div>
                <h2 className="text-base font-bold text-heading m-0">Login Warning</h2>
                <p className="text-xs text-faint mt-0.5">Students inactive for 3+ days</p>
              </div>
              <button
                onClick={() => setShowInactiveModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-faint hover:bg-raised hover:text-body transition-colors text-lg font-bold bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
              {inactiveStudents.map((s) => {
                const days = daysSinceLogin(getRealLastLogin(s));
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setShowInactiveModal(false);
                      onSelectStudent(s);
                      onNavigate("detail");
                    }}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                    style={{ background: "rgba(229,91,91,0.08)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "#fee2e2", color: "#b91c1c" }}
                      >
                        {s.av}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-heading">{s.name}</div>
                        <div className="text-xs text-faint">Gr. {s.grade} · {s.school}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-xs font-semibold text-red-500">
                        {days === Infinity ? "Never" : `${days}d ago`}
                      </div>
                      <div className="text-xs text-faint">{formatLastLogin(getRealLastLogin(s))}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-3 border-t border-line" style={{ background: "#252525" }}>
              <p className="text-xs text-faint text-center">Click a student to view their profile</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}