"use client";

import { Student, Goal } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { StudentDeadlines } from "./StudentDeadlines";
import { fetchCounselorEventsForStudent } from "../../lib/queries";
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
  const done = goals.filter((g) => g.done).length;
  const nextDeadline = student.dl
    .filter((d) => d.status !== "completed")
    .sort((a, b) => a.days - b.days)[0];

  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);

  useEffect(() => {
    if (student.id) {
      fetchCounselorEventsForStudent(student.id).then(setCounselorEvents);
    }
  }, [student.id]);

  return (
    <div>
      <PageHeader
        title={readOnly ? `${student.name.split(" ")[0]}'s Dashboard` : `Welcome back, ${student.name.split(" ")[0]}`}
        sub={new Date().toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: timezone,
        })}
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>
              View Only
            </span>
          ) : (
            <Button primary onClick={() => onNavigate("prep")}>Prep for Session</Button>
          )
        }
      />

      <div className="p-6 px-8">
        {/* ── Metric Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          <MetricCard
            label="Next Deadline"
            value={nextDeadline ? `${nextDeadline.days}d` : "—"}
            detail={nextDeadline ? nextDeadline.title : "No deadlines"}
            color="#e5a83b"
          />
          <MetricCard
            label="Schools"
            value={student.schools.length}
            detail={`${student.schools.filter((s) => s.status === "Submitted").length} submitted`}
            color="#4aba6a"
          />
          <MetricCard
            label="Weekly Goals"
            value={`${done}/${goals.length}`}
            color="#a480f2"
          />
          <MetricCard
            label="Sessions"
            value={student.sess.length}
            detail={student.sess.length > 0 ? `Latest: ${student.sess[0].date}` : "None yet"}
            color="#528bff"
          />
        </div>

        <div className="grid gap-3.5" style={{ gridTemplateColumns: "3fr 2fr" }}>
          {/* ── Deadlines (replaces old Coming Up card) ───────────────── */}
          {/*
            StudentDeadlines handles:
            - Showing ALL deadlines (strategist + student-created)
            - Students can add their own deadlines
            - Students can edit/delete only their own (createdBy === "student")
            - Strategist-created deadlines show 🔒 and are not clickable
            - readOnly=true for parent view disables add/edit/delete
          */}
          <StudentDeadlines
            deadlines={student.dl}
            studentId={student.id}
            onRefresh={onRefresh}
            readOnly={readOnly}
          />

          {/* ── Right column ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3.5">
            {/* From Strategist */}
            {counselorEvents.length > 0 && (
              <Card>
                <h2 className="m-0 mb-3.5 text-lg font-bold text-heading">From Your Strategist</h2>
                {counselorEvents.map((ce) => (
                  <div
                    key={ce.id}
                    className="flex justify-between items-start p-3 rounded-lg mb-1.5"
                    style={{ background: "rgba(82,139,255,0.06)", borderLeft: "3px solid #528bff" }}
                  >
                    <div>
                      <div className="text-sm font-medium text-heading">{ce.title}</div>
                      <span className="text-xs" style={{ color: "#528bff" }}>
                        {ce.category} · {new Date(ce.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {ce.notes && <p className="text-xs text-sub mt-1 m-0">{ce.notes}</p>}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {/* Receptacle CTA */}
            <Card>
              <div
                onClick={() => !readOnly && onNavigate("receptacle")}
                className={readOnly ? "" : "cursor-pointer"}
                style={{ textAlign: "center", padding: "12px 0" }}
              >
                <div className="text-3xl mb-3">🧠</div>
                <h2 className="m-0 mb-1.5 text-lg font-bold text-heading">Plan Your Day</h2>
                <p className="m-0 mb-4 text-sm text-sub leading-relaxed">
                  Use the Receptacle to brain dump, prioritize with the Eisenhower Matrix, and schedule your tasks.
                </p>
                {!readOnly && (
                  <button
                    onClick={() => onNavigate("receptacle")}
                    style={{
                      padding: "10px 24px", borderRadius: 10, border: "none",
                      background: "#ebebeb", color: "#fff", fontWeight: 600,
                      fontSize: 13, cursor: "pointer",
                    }}
                  >
                    Open Receptacle →
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Latest Session ───────────────────────────────────────────── */}
        <Card className="mt-3.5">
          <h2 className="m-0 mb-3.5 text-lg font-bold text-heading">Latest Session</h2>
          {student.sess.length > 0 ? (
            <div className="p-4 rounded-lg" style={{ background: "#252525", borderLeft: "3px solid #528bff" }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-accent-ink font-semibold">{student.sess[0].date}</span>
                <span className="text-sm text-sub">with {student.counselor}</span>
              </div>
              <p className="m-0 mb-2.5 text-sm text-body leading-relaxed">{student.sess[0].notes}</p>
              <span className="text-xs text-sub">Action: </span>
              <span className="text-sm text-accent-ink font-semibold">{student.sess[0].action}</span>
            </div>
          ) : (
            <p className="text-sm text-sub">
              No sessions yet. Your strategist will schedule your first meeting soon.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function getWeekRange(): string {
  const now = new Date();
  const sun = new Date(now);
  sun.setDate(now.getDate() - now.getDay());
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  return `${sun.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${sat.toLocaleDateString("en-US", { day: "numeric" })}`;
}