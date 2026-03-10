"use client";

import { Task, Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { WeeklyCalendar } from "../ui/WeeklyCalendar";
import { DeadlinesView } from "./DeadlinesView";
import { fetchCounselorEventsForStudent } from "../../lib/queries";
import { useState, useEffect } from "react";

interface RoadmapProps {
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  deadlines?: Deadline[];
  studentId?: number;
  onRefresh?: () => void;
  readOnly?: boolean;
  googleEvents?: any[];
}

export function Roadmap({ tasks, setTasks, deadlines = [], studentId, onRefresh, readOnly, googleEvents = [] }: RoadmapProps) {
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "calendar">("list");
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchCounselorEventsForStudent(studentId).then(setCounselorEvents);
    }
  }, [studentId]);

  const calendarRows = [
    ...(deadlines.length > 0
      ? [{
          id: "deadlines",
          name: "Deadlines",
          subtitle: `${deadlines.length} deadline${deadlines.length !== 1 ? "s" : ""}`,
          avatar: "⏰",
          avatarBg: "rgba(229,91,91,0.08)",
          avatarColor: "#e55b5b",
          events: deadlines.map((d) => ({
            id: d.id,
            title: d.title,
            date: d.due,
            bgColor: d.status === "overdue" ? "rgba(229,91,91,0.08)" : d.createdBy === "student" ? "#f5f3ff" : "#fefce8",
            borderColor: d.status === "overdue" ? "#e55b5b" : d.createdBy === "student" ? "#a480f2" : "#e5a83b",
            textColor: d.status === "overdue" ? "#e55b5b" : d.createdBy === "student" ? "#a480f2" : "#e5a83b",
          })),
        }]
      : []),
    ...(counselorEvents.length > 0
      ? [{
          id: "strategist",
          name: "From Strategist",
          subtitle: `${counselorEvents.length} event${counselorEvents.length !== 1 ? "s" : ""}`,
          avatar: "📅",
          avatarBg: "rgba(82,139,255,0.08)",
          avatarColor: "#7aabff",
          events: counselorEvents.map((ce: any) => ({
            id: ce.id,
            title: ce.title,
            date: ce.date,
            bgColor: "rgba(82,139,255,0.08)",
            borderColor: "#528bff",
            textColor: "#7aabff",
          })),
        }]
      : []),
    ...(googleEvents.length > 0
      ? [{
          id: "gcal",
          name: "Google Calendar",
          subtitle: `${googleEvents.length} event${googleEvents.length !== 1 ? "s" : ""}`,
          avatar: "📆",
          avatarBg: "rgba(74,186,106,0.08)",
          avatarColor: "#4aba6a",
          events: googleEvents.map((ge: any) => ({
            id: ge.id,
            title: ge.title,
            date: ge.date,
            bgColor: "rgba(74,186,106,0.08)",
            borderColor: "#4aba6a",
            textColor: "#4aba6a",
          })),
        }]
      : []),
  ];

  const viewToggle = (
    <div className="inline-flex gap-0.5 bg-white border border-line rounded-full p-1">
      {([
        ["list", "📋 List View"],
        ["timeline", "📊 Timeline"],
        ["calendar", "📅 Calendar"],
      ] as const).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setViewMode(id)}
          className="px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
          style={{
            background: viewMode === id ? "#528bff" : "transparent",
            color: viewMode === id ? "#fff" : "#717171",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Timeline: group deadlines by month for a Gantt-like view
  const timelineMonths = (() => {
    const months: Record<string, typeof deadlines> = {};
    for (const d of deadlines) {
      const key = d.due.substring(0, 7); // YYYY-MM
      if (!months[key]) months[key] = [];
      months[key].push(d);
    }
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <div>
      {viewMode === "list" ? (
        <>
          <DeadlinesView
            deadlines={deadlines}
            studentId={studentId || 0}
            onRefresh={onRefresh}
            readOnly={readOnly}
            headerRight={viewToggle}
          />
        </>
      ) : viewMode === "timeline" ? (
        <>
          <PageHeader title="Tasks" sub="Timeline view — tasks by month."
            right={<div className="flex items-center gap-3">{readOnly && <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span>}{viewToggle}</div>}
          />
          <div className="p-6 px-8">
            {timelineMonths.length === 0 ? (
              <div className="text-sm text-sub text-center py-12">No tasks to show on timeline.</div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[100px] top-0 bottom-0 w-px" style={{ background: "#333" }} />
                {timelineMonths.map(([monthKey, tasks]) => {
                  const d = new Date(monthKey + "-15");
                  const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                  const CATEGORY_COLORS: Record<string, string> = {
                    essays: "#a480f2", applications: "#4aba6a", testing: "#e5a83b", planning: "#528bff",
                    extracurricular: "#ec70a0", Academics: "#4aba6a", Testing: "#e5a83b",
                  };
                  return (
                    <div key={monthKey} className="mb-6">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-[100px] text-right text-sm font-bold text-heading">{monthLabel}</div>
                        <div className="w-3 h-3 rounded-full" style={{ background: "#528bff", marginLeft: -6 }} />
                      </div>
                      <div className="ml-[120px] flex flex-col gap-1.5">
                        {tasks.sort((a, b) => a.due.localeCompare(b.due)).map((t) => {
                          const color = CATEGORY_COLORS[t.cat] || "#528bff";
                          return (
                            <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                              style={{ background: "#252525", borderLeft: `3px solid ${color}`, opacity: t.status === "completed" ? 0.4 : 1 }}>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate" style={{ color: t.status === "completed" ? "#505050" : "#ebebeb", textDecoration: t.status === "completed" ? "line-through" : "none" }}>{t.title}</div>
                                <div className="text-[10px] text-sub">{t.cat} · {t.due}</div>
                              </div>
                              {t.specialist && (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                                  style={{ background: `${color}20`, color }}>
                                  {t.specialist.split(" ").map(n => n[0]).join("").substring(0, 2)}
                                </div>
                              )}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: t.status === "completed" ? "rgba(74,186,106,0.08)" : t.status === "overdue" ? "rgba(229,91,91,0.08)" : "rgba(82,139,255,0.08)", color: t.status === "completed" ? "#4aba6a" : t.status === "overdue" ? "#e55b5b" : "#528bff" }}>
                                {t.status === "pending" ? "To Do" : t.status === "in-progress" ? "In Progress" : t.status === "completed" ? "Complete" : t.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <PageHeader title="Tasks" sub="Track your deadlines and schedule."
            right={<div className="flex items-center gap-3">{readOnly && <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span>}{viewToggle}</div>}
          />
          <div className="p-6 px-8">
            <WeeklyCalendar rows={calendarRows} />
          </div>
        </>
      )}
    </div>
  );
}