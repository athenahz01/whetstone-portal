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
          ) : null
        }
      />

      <div className="p-6 px-8">
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr 280px" }}>

          {/* ── Column 1: Sessions ── */}
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
              {displaySessions.slice(0, 5).map((ce: any) => (
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
                  <div className="text-sm font-medium text-heading truncate">{ce.title}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-sub">{ce.specialist || ce.category || ""}</div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
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

          {/* ── Column 2: Student Tasks ── */}
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

            {/* Action Items from Last Session */}
            {student.sess.length > 0 && student.sess[0].action && (
              <div className="mt-4 pt-4 border-t border-line">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sub mb-2">📋 Action Items</div>
                <div className="flex flex-col gap-1">
                  {student.sess[0].action.split("\n").filter(Boolean).slice(0, 3).map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-body"
                      style={{ background: "#252525" }}>
                      <span className="text-[9px] font-bold" style={{ color: "#528bff" }}>{i + 1}</span>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ── Column 3: Quick Actions ── */}
          <div className="flex flex-col gap-4">
            {/* Plan Your Day */}
            {!readOnly && (
              <Card>
                <div className="text-center py-3">
                  <div className="text-3xl mb-3">🧠</div>
                  <h3 className="m-0 text-base font-bold text-heading mb-1">Plan Your Day</h3>
                  <p className="m-0 text-xs text-sub mb-4 leading-relaxed">Brain dump, prioritize, and schedule with the Planning tool.</p>
                  <button onClick={() => onNavigate("receptacle")}
                    className="w-full py-2.5 rounded-full border-none cursor-pointer text-sm font-semibold"
                    style={{ background: "#528bff", color: "#fff" }}>
                    Open Receptacle →
                  </button>
                </div>
              </Card>
            )}

            {/* Closing Commit */}
            {!readOnly && (
              <Card>
                <div className="text-center py-3">
                  <div className="text-3xl mb-3">📋</div>
                  <h3 className="m-0 text-base font-bold text-heading mb-1">Closing Commit</h3>
                  <p className="m-0 text-xs text-sub mb-4 leading-relaxed">Log your active recall and action items after a session.</p>
                  <button onClick={() => onNavigate("prep")}
                    className="w-full py-2.5 rounded-full cursor-pointer text-sm font-semibold"
                    style={{ background: "transparent", color: "#528bff", border: "1.5px solid #528bff" }}>
                    Recall Your Session →
                  </button>
                </div>
              </Card>
            )}

            {/* Book Session shortcut */}
            {!readOnly && (
              <button onClick={() => onNavigate("prep")}
                className="w-full py-3 rounded-xl cursor-pointer text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "#252525", color: "#7aabff", border: "1px solid #333" }}>
                📅 Book a Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}