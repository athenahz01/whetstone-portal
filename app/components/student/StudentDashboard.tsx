"use client";

import { Student, Goal, Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Tag } from "../ui/Tag";
import { fetchCounselorEventsForStudent } from "../../lib/queries";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
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
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);
  const [sessionTab, setSessionTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (student.id) {
      fetchCounselorEventsForStudent(student.id).then(setCounselorEvents);
    }
  }, [student.id]);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingSessions = counselorEvents.filter((ce) => ce.date >= todayStr).sort((a: any, b: any) => a.date.localeCompare(b.date));
  const pastSessions = counselorEvents.filter((ce) => ce.date < todayStr).sort((a: any, b: any) => b.date.localeCompare(a.date));
  const displaySessions = sessionTab === "upcoming" ? upcomingSessions : pastSessions;

  const activeTasks = student.dl
    .filter((d) => d.status !== "completed")
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title={readOnly ? `${student.name.split(" ")[0]}'s Dashboard` : `Welcome back, ${student.name.split(" ")[0]}`}
        sub={new Date().toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: timezone,
        })}
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>
              View Only
            </span>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => onNavigate("receptacle")}>🧠 Plan Day</Button>
              <Button primary onClick={() => onNavigate("prep")}>Closing Commit</Button>
            </div>
          )
        }
      />

      <div className="p-6 px-8">
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* ── Upcoming Sessions ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="m-0 text-base font-bold text-heading">Sessions</h3>
              <button onClick={() => onNavigate("prep")}
                className="text-xs font-semibold bg-transparent border-none cursor-pointer"
                style={{ color: "#528bff" }}>View all →</button>
            </div>
            <div className="flex gap-0.5 mb-4 p-0.5 rounded-full" style={{ background: "#1e1e1e", display: "inline-flex" }}>
              {(["upcoming", "past"] as const).map((tab) => (
                <button key={tab} onClick={() => setSessionTab(tab)}
                  className="px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
                  style={{ background: sessionTab === tab ? "#528bff" : "transparent", color: sessionTab === tab ? "#fff" : "#717171" }}>
                  {tab === "upcoming" ? "Upcoming" : "Past"}
                </button>
              ))}
            </div>

            {displaySessions.length === 0 && (
              <p className="text-sm text-sub py-4 text-center">
                {sessionTab === "upcoming" ? "No upcoming sessions" : "No past sessions"}
              </p>
            )}

            <div className="flex flex-col gap-2">
              {displaySessions.slice(0, 4).map((ce: any) => (
                <div key={ce.id} className="p-3 rounded-lg" style={{ background: "#252525", borderLeft: "3px solid #528bff" }}>
                  <div className="text-[10px] font-semibold text-sub mb-1">
                    {new Date(ce.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="text-sm font-medium text-heading">{ce.title}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="text-xs text-sub">{ce.category}</div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: ce.date < todayStr ? "rgba(74,186,106,0.08)" : "rgba(82,139,255,0.08)",
                        color: ce.date < todayStr ? "#4aba6a" : "#528bff"
                      }}>
                      {ce.date < todayStr ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Student Tasks ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="m-0 text-base font-bold text-heading">Student Tasks</h3>
              <button onClick={() => onNavigate("tasks")}
                className="text-xs font-semibold bg-transparent border-none cursor-pointer"
                style={{ color: "#528bff" }}>View all →</button>
            </div>

            {activeTasks.length === 0 && (
              <p className="text-sm text-sub py-4 text-center">All tasks completed! 🎉</p>
            )}

            <div className="flex flex-col gap-1.5">
              {activeTasks.map((d) => (
                <div key={d.id} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                  style={{ background: "#252525" }}>
                  <input type="checkbox" checked={false} readOnly
                    className="mt-0.5 flex-shrink-0"
                    style={{ accentColor: "#4aba6a", width: 14, height: 14 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color: getCategoryColor(d.cat) }}>{d.cat}</div>
                    <div className="text-sm font-medium text-heading truncate">{d.title}</div>
                    <div className="text-xs text-sub mt-0.5">{d.due}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Receptacle CTA ── */}
        {!readOnly && (
          <div className="mt-5 rounded-xl p-5 flex items-center justify-between"
            style={{ background: "#252525", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center gap-4">
              <div className="text-3xl">🧠</div>
              <div>
                <h3 className="m-0 text-base font-bold text-heading">Plan Your Day</h3>
                <p className="m-0 text-sm text-sub mt-0.5">Brain dump, prioritize, and schedule with the Receptacle.</p>
              </div>
            </div>
            <button onClick={() => onNavigate("receptacle")}
              className="px-5 py-2.5 rounded-full border-none cursor-pointer text-sm font-semibold"
              style={{ background: "#528bff", color: "#fff" }}>
              Open Receptacle →
            </button>
          </div>
        )}

        {/* ── Latest Session Notes ── */}
        {student.sess.length > 0 && (
          <Card className="mt-5">
            <h3 className="m-0 mb-3 text-base font-bold text-heading">Latest Session Notes</h3>
            <div className="p-4 rounded-lg" style={{ background: "#252525", borderLeft: "3px solid #528bff" }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: "#7aabff" }}>{student.sess[0].date}</span>
                <span className="text-xs text-sub">with {student.counselor}</span>
              </div>
              <p className="m-0 mb-2 text-sm text-body leading-relaxed">{student.sess[0].notes}</p>
              {student.sess[0].action && (
                <div className="mt-2 pt-2 border-t border-line">
                  <span className="text-xs text-sub">Action: </span>
                  <span className="text-sm font-semibold" style={{ color: "#7aabff" }}>{student.sess[0].action}</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
