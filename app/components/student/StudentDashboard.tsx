"use client";

import { Student, Goal } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { getCategoryColor, getStatusColor } from "../../lib/colors";

interface StudentDashboardProps {
  student: Student;
  goals: Goal[];
  onToggleGoal: (index: number) => void;
  onNavigate: (view: string) => void;
  readOnly?: boolean;
}

export function StudentDashboard({ student, goals, onToggleGoal, onNavigate, readOnly = false }: StudentDashboardProps) {
  const urgent = student.dl
    .filter((d) => d.status !== "completed")
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);
  const done = goals.filter((g) => g.done).length;

  return (
    <div>
      <PageHeader
        title={readOnly ? `${student.name.split(" ")[0]}'s Dashboard` : `Welcome back, ${student.name.split(" ")[0]}`}
        sub="Tuesday, December 23, 2025"
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
              View Only
            </span>
          ) : (
            <Button primary onClick={() => onNavigate("prep")}>Prep for Session</Button>
          )
        }
      />
      <div className="p-6 px-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          <MetricCard label="Next Deadline" value="5 days" detail="Research Paper" color="#d97706" />
          <MetricCard label="Schools" value={student.schools.length} detail="1 submitted" color="#16a34a" />
          <MetricCard label="Weekly Goals" value={`${done}/${goals.length}`} color="#7c3aed" />
          <MetricCard label="Sessions" value="12" detail="Next: Dec 30" color="#3b82f6" />
        </div>

        <div className="grid gap-3.5" style={{ gridTemplateColumns: "3fr 2fr" }}>
          {/* Coming Up */}
          <Card>
            <div className="flex justify-between mb-4">
              <h2 className="m-0 text-lg font-bold text-heading">Coming Up</h2>
              <button
                onClick={() => onNavigate("roadmap")}
                className="bg-transparent border-none text-accent-ink cursor-pointer text-sm font-semibold"
              >
                View roadmap →
              </button>
            </div>
            {urgent.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center p-3 rounded-lg mb-1.5"
                style={{
                  background: d.status === "overdue" ? "#fef2f2" : "#eef0f4",
                  borderLeft: `3px solid ${d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat)}`,
                }}
              >
                <div>
                  <div className="text-sm font-medium text-heading mb-0.5">{d.title}</div>
                  <span className="text-xs text-sub">
                    {d.cat} · {d.due}
                  </span>
                </div>
                <Tag color={getStatusColor(d.status)}>
                  {d.days < 0 ? `${Math.abs(d.days)}d overdue` : d.days === 0 ? "Today" : `${d.days}d left`}
                </Tag>
              </div>
            ))}
          </Card>

          {/* Weekly Goals */}
          <Card>
            <h2 className="m-0 mb-1 text-lg font-bold text-heading">This Week</h2>
            <p className="m-0 mb-3.5 text-sm text-sub">Goals from counselor · Dec 23–29</p>
            {goals.map((g, i) => (
              <div
                key={i}
                onClick={() => !readOnly && onToggleGoal(i)}
                className={`flex items-center gap-2.5 py-2.5 ${readOnly ? "" : "cursor-pointer"}`}
                style={{ borderBottom: i < goals.length - 1 ? "1px solid #e2e8f0" : "none" }}
              >
                <div
                  className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-white text-xs"
                  style={{
                    border: g.done ? "none" : "2px solid #cbd5e1",
                    background: g.done ? "#3b82f6" : "transparent",
                  }}
                >
                  {g.done && "✓"}
                </div>
                <span
                  className="text-sm"
                  style={{
                    color: g.done ? "#94a3b8" : "#0f172a",
                    textDecoration: g.done ? "line-through" : "none",
                  }}
                >
                  {g.t}
                </span>
              </div>
            ))}
            <div className="mt-3.5">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-sub">Progress</span>
                <span className="text-xs text-accent-ink font-semibold">
                  {Math.round((done / goals.length) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-mist rounded-sm">
                <div
                  className="h-full bg-accent rounded-sm transition-all duration-300"
                  style={{ width: `${(done / goals.length) * 100}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Latest Session */}
        <Card className="mt-3.5">
          <h2 className="m-0 mb-3.5 text-lg font-bold text-heading">Latest Session</h2>
          <div
            className="p-4 rounded-lg"
            style={{ background: "#eef0f4", borderLeft: "3px solid #3b82f6" }}
          >
            <div className="flex justify-between mb-2">
              <span className="text-sm text-accent-ink font-semibold">{student.sess[0].date}</span>
              <span className="text-sm text-sub">with {student.counselor}</span>
            </div>
            <p className="m-0 mb-2.5 text-sm text-body leading-relaxed">{student.sess[0].notes}</p>
            <span className="text-xs text-sub">Action: </span>
            <span className="text-sm text-accent-ink font-semibold">{student.sess[0].action}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}