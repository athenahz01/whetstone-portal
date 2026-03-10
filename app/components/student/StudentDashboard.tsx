"use client";

import { Student, Goal, Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Tag } from "../ui/Tag";
import { fetchCounselorEventsForStudent, fetchStudentSessions } from "../../lib/queries";
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
      fetchCounselorEventsForStudent(student.id).then((evs) => {
        fetchStudentSessions(student.id).then((sess) => {
          setCounselorEvents([...evs, ...sess]);
        });
      });
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
              <Button primary onClick={() => onNavigate("prep")}>📅 Book Session</Button>
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
                <div key={ce.id} className="p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onNavigate("prep")}
                  style={{
                    background: "#252525",
                    borderLeft: `3px solid ${(ce.status === "completed" || ce.date < todayStr) ? "#4aba6a" : "#528bff"}`,
                  }}>
                  <div className="text-[10px] font-semibold text-sub mb-1">
                    {new Date(ce.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {ce.start_time && ` · ${ce.start_time}`}
                  </div>
                  <div className="text-sm font-medium text-heading">{ce.title}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="text-xs text-sub">{ce.specialist || ce.category || ""}</div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: (ce.status === "completed" || ce.date < todayStr) ? "rgba(74,186,106,0.08)" : "rgba(229,168,59,0.08)",
                        color: (ce.status === "completed" || ce.date < todayStr) ? "#4aba6a" : "#e5a83b",
                      }}>
                      {(ce.status === "completed" || ce.date < todayStr) ? "✓ Done" : "Pending"}
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

        {/* ── Quick Actions Row ── */}
        {!readOnly && (
          <div className="grid gap-3.5 mt-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {/* Plan Day CTA */}
            <div className="rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onNavigate("receptacle")}
              style={{ background: "#252525", border: "1px solid #2a2a2a" }}>
              <div className="text-2xl">🧠</div>
              <div>
                <div className="text-sm font-bold text-heading">Plan Your Day</div>
                <div className="text-xs text-sub">Brain dump, prioritize, and schedule.</div>
              </div>
            </div>
            {/* Closing Commit CTA — navigates to Sessions > Closing Commit tab */}
            <div className="rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onNavigate("prep")}
              style={{ background: "#252525", border: "1px solid #2a2a2a" }}>
              <div className="text-2xl">📋</div>
              <div>
                <div className="text-sm font-bold text-heading">Closing Commit</div>
                <div className="text-xs text-sub">Log active recall & action items.</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Latest Session Action Items ── */}
        {student.sess.length > 0 && student.sess[0].action && (
          <Card className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="m-0 text-sm font-bold text-heading">📋 Action Items from Last Session</h3>
              <span className="text-xs text-sub">{student.sess[0].date}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {student.sess[0].action.split("\n").filter(Boolean).map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{ background: "#252525" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: "rgba(82,139,255,0.1)", color: "#528bff" }}>{i + 1}</div>
                  <span className="text-sm text-body">{item}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}