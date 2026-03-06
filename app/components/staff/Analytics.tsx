"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";

interface AnalyticsProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
}

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

export function Analytics({ students, onSelectStudent, onNavigate }: AnalyticsProps) {
  return (
    <div>
      <PageHeader title="Analytics" sub="Caseload performance." />
      <div className="p-6 px-8">

        {/* ── Student Overview Table ────────────────────────────────────── */}
        <Card noPadding style={{ overflow: "hidden" }}>
          <div className="px-6 py-4 border-b border-line">
            <h2 className="m-0 text-base font-bold text-heading">Student Overview</h2>
          </div>

          {/* Table header */}
          <div
            className="grid px-6 py-2.5 border-b border-line text-xs text-sub uppercase tracking-widest font-semibold"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr", background: "#f8f9fb" }}
          >
            <div>Student</div>
            <div>Grade</div>
            <div>GPA</div>
            <div>Engagement</div>
            <div>SAT</div>
            <div>Schools</div>
            <div>Overdue</div>
            <div>Last Login</div>
          </div>

          {/* Table rows */}
          {students.map((s) => {
            const overdue = s.dl.filter((d) => d.status === "overdue").length;
            const loginDays = daysSinceLogin(s.lastLogin);
            const loginLabel = formatLastLogin(s.lastLogin);
            const loginColor =
              loginDays === Infinity ? "#94a3b8"
              : loginDays >= 3 ? "#ef4444"
              : loginDays >= 1 ? "#d97706"
              : "#16a34a";

            return (
              <div
                key={s.id}
                onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                className="grid px-6 py-3 border-b border-line items-center cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr" }}
              >
                {/* Student name + avatar */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "#eff6ff", color: "#1d4ed8" }}
                  >
                    {s.av}
                  </div>
                  <span className="text-sm font-medium text-heading">{s.name}</span>
                </div>

                {/* Grade */}
                <div className="text-sm text-body">{s.grade}</div>

                {/* GPA */}
                <div className="text-sm text-body">{s.gpa ?? "—"}</div>

                {/* Engagement bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100" style={{ maxWidth: 100 }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.engagement}%`,
                        background: s.engagement > 80 ? "#16a34a" : s.engagement > 50 ? "#d97706" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: s.engagement > 80 ? "#16a34a" : s.engagement > 50 ? "#d97706" : "#ef4444" }}>
                    {s.engagement}%
                  </span>
                </div>

                {/* SAT */}
                <div className="text-sm text-body">{s.sat ?? "—"}</div>

                {/* Schools */}
                <div className="text-sm text-body">{s.schools.length}</div>

                {/* Overdue */}
                <div>
                  {overdue > 0 ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#ef4444" }}>
                      {overdue}
                    </span>
                  ) : (
                    <span className="text-xs text-sub">0</span>
                  )}
                </div>

                {/* Last Login */}
                <div className="text-xs font-semibold" style={{ color: loginColor }}>
                  {loginLabel}
                </div>
              </div>
            );
          })}

          {students.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-sub">No students yet.</div>
          )}
        </Card>
      </div>
    </div>
  );
}