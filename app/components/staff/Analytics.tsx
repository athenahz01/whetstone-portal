"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";

interface AnalyticsProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
}

export function Analytics({ students, onSelectStudent, onNavigate }: AnalyticsProps) {
  const ts = students.reduce((a, s) => a + s.schools.length, 0);
  const sub = students.reduce((a, s) => a + s.schools.filter((x) => x.status === "Submitted").length, 0);

  const avgGpa = (() => {
    const withGpa = students.filter((s) => s.gpaUnweighted || s.gpa);
    if (withGpa.length === 0) return "—";
    return (withGpa.reduce((a, s) => a + (s.gpaUnweighted || s.gpa || 0), 0) / withGpa.length).toFixed(2);
  })();

  return (
    <div>
      <PageHeader title="Analytics" sub="Caseload performance." />
      <div className="p-6 px-8">
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          <MetricCard label="Students" value={students.length} color="#3b82f6" />
          <MetricCard label="Schools Applied" value={`${sub}/${ts}`} color="#16a34a" />
          <MetricCard
            label="Avg Engagement"
            value={students.length > 0 ? `${Math.round(students.reduce((a, s) => a + s.engagement, 0) / students.length)}%` : "—"}
            color="#d97706"
          />
          <MetricCard label="Avg GPA" value={avgGpa} color="#7c3aed" />
        </div>

        <Card noPadding style={{ overflow: "hidden" }}>
          <div className="px-6 py-3 border-b border-line" style={{ background: "#f8f9fb" }}>
            <span className="text-base font-bold text-heading">Student Overview</span>
          </div>
          {/* Header */}
          <div className="grid px-6 py-2.5 border-b border-line" style={{ gridTemplateColumns: "2fr 1fr 1fr 3fr 1fr 1fr 1fr" }}>
            {["Student", "Grade", "GPA", "Engagement", "SAT", "Schools", "Overdue"].map((h) => (
              <div key={h} className="text-xs text-sub uppercase tracking-widest font-semibold">{h}</div>
            ))}
          </div>
          {/* Rows */}
          {students.map((s) => {
            const gpaDisplay = s.gpaUnweighted || s.gpa;
            const satDisplay = s.sat;
            return (
              <div
                key={s.id}
                onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                className="grid px-6 py-2.5 border-b border-line items-center cursor-pointer hover:bg-mist"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 3fr 1fr 1fr 1fr" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{s.av}</div>
                  <span className="text-sm font-medium text-heading">{s.name}</span>
                </div>
                <span className="text-sm text-sub">{s.grade}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-heading">
                    {gpaDisplay ? Number(gpaDisplay).toFixed(2) : "—"}
                  </span>
                  {s.gpaWeighted && (
                    <span className="text-[10px] text-sub">W: {Number(s.gpaWeighted).toFixed(2)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-sm" style={{ background: "#eef0f4" }}>
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${s.engagement}%`,
                        background: s.engagement > 80 ? "#16a34a" : s.engagement > 60 ? "#d97706" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-body" style={{ width: 35 }}>{s.engagement}%</span>
                </div>
                <span className="text-sm text-sub">{satDisplay || "—"}</span>
                <span className="text-sm text-sub">{s.schools.length}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: s.dl.filter((d) => d.status === "overdue").length > 0 ? "#ef4444" : "#16a34a" }}
                >
                  {s.dl.filter((d) => d.status === "overdue").length}
                </span>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}