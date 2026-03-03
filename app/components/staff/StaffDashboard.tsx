"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { getCategoryColor, getStatusColor } from "../../lib/colors";

interface StaffDashboardProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
}

export function StaffDashboard({ students, onSelectStudent, onNavigate }: StaffDashboardProps) {
  const all = students.flatMap((s) => s.dl.map((d) => ({ ...d, sn: s.name })));
  const ov = all.filter((d) => d.status === "overdue");
  const wk = all.filter((d) => d.days >= 0 && d.days <= 7 && d.status !== "completed");
  const att = students.filter((s) => s.status === "needs-attention");

  return (
    <div>
      <PageHeader title="Dashboard" sub="Sarah Mitchell — 4 active students" />
      <div className="p-6 px-8">
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          <MetricCard label="Students" value={students.length} color="#3b82f6" />
          <MetricCard label="Overdue" value={ov.length} color="#ef4444" />
          <MetricCard label="This Week" value={wk.length} color="#d97706" />
          <MetricCard label="Avg Engagement" value={`${Math.round(students.reduce((a, s) => a + s.engagement, 0) / students.length)}%`} color="#16a34a" />
        </div>

        {att.length > 0 && (
          <div className="rounded-lg p-3 px-4 mb-4 flex items-center gap-3" style={{ background: "#fef2f2", border: "1px solid rgba(239,68,68,0.12)" }}>
            <span className="text-base">⚠</span>
            <div>
              <div className="text-sm font-bold" style={{ color: "#ef4444" }}>{att.length} student needs attention</div>
              <div className="text-sm text-sub">{att.map((s) => s.name).join(", ")}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          {/* Students */}
          <Card>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-lg font-bold text-heading">Students</h2>
              <button onClick={() => onNavigate("caseload")} className="bg-transparent border-none text-accent-ink cursor-pointer text-sm font-semibold">View all →</button>
            </div>
            {students.map((s) => (
              <div
                key={s.id}
                onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                className="flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5 cursor-pointer"
                style={{
                  background: "#eef0f4",
                  borderLeft: `3px solid ${s.status === "needs-attention" ? "#ef4444" : s.engagement > 80 ? "#16a34a" : "#d97706"}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{s.av}</div>
                  <div>
                    <div className="text-sm font-medium text-heading">{s.name}</div>
                    <div className="text-xs text-sub">Gr. {s.grade} · {s.school}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: s.engagement > 80 ? "#16a34a" : s.engagement > 60 ? "#d97706" : "#ef4444" }}>{s.engagement}%</div>
                  <div className="text-xs text-faint">{s.lastLogin}</div>
                </div>
              </div>
            ))}
          </Card>

          {/* This Week */}
          <Card>
            <div className="flex justify-between mb-3.5">
              <h2 className="m-0 text-lg font-bold text-heading">This Week</h2>
              <button onClick={() => onNavigate("master")} className="bg-transparent border-none text-accent-ink cursor-pointer text-sm font-semibold">Timeline →</button>
            </div>
            {[...ov, ...wk].sort((a, b) => a.days - b.days).slice(0, 8).map((d, i) => (
              <div key={`${d.id}-${i}`} className="flex items-center gap-2.5 py-2 border-b border-line">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-heading whitespace-nowrap overflow-hidden text-ellipsis">{d.title}</div>
                  <div className="text-xs text-sub">{d.sn}</div>
                </div>
                <Tag color={d.status === "overdue" ? "#ef4444" : "#94a3b8"}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : d.days === 0 ? "Today" : `${d.days}d`}
                </Tag>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}