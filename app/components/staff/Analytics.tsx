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
            style={{ gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr", background: "#252525" }}
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
              loginDays === Infinity ? "#505050"
              : loginDays >= 3 ? "#e55b5b"
              : loginDays >= 1 ? "#e5a83b"
              : "#4aba6a";

            return (
              <div
                key={s.id}
                onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                className="grid px-6 py-3 border-b border-line items-center cursor-pointer hover:bg-mist transition-colors"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr" }}
              >
                {/* Student name + avatar */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}
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
                  <div className="flex-1 h-1.5 rounded-full bg-raised" style={{ maxWidth: 100 }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.engagement}%`,
                        background: s.engagement > 80 ? "#4aba6a" : s.engagement > 50 ? "#e5a83b" : "#e55b5b",
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: s.engagement > 80 ? "#4aba6a" : s.engagement > 50 ? "#e5a83b" : "#e55b5b" }}>
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
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>
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