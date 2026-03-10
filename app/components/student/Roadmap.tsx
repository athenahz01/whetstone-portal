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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
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

  return (
    <div>
      {viewMode === "list" ? (
        <>
          {/* DeadlinesView provides its own PageHeader */}
          <DeadlinesView
            deadlines={deadlines}
            studentId={studentId || 0}
            onRefresh={onRefresh}
            readOnly={readOnly}
            headerRight={
              <div className="inline-flex gap-0.5 bg-white border border-line rounded-full p-1">
                {(["list", "calendar"] as const).map((id) => (
                  <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    className="px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
                    style={{
                      background: viewMode === id ? "#528bff" : "transparent",
                      color: viewMode === id ? "#fff" : "#717171",
                    }}
                  >
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </button>
                ))}
              </div>
            }
          />
        </>
      ) : (
        <>
          <PageHeader
            title="Tasks"
            sub="Track your deadlines and schedule."
            right={
              <div className="flex items-center gap-3">
                {readOnly && (
                  <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>
                    View Only
                  </span>
                )}
                <div className="inline-flex gap-0.5 bg-white border border-line rounded-full p-1">
                  {(["list", "calendar"] as const).map((id) => (
                    <button
                      key={id}
                      onClick={() => setViewMode(id)}
                      className="px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
                      style={{
                        background: viewMode === id ? "#528bff" : "transparent",
                        color: viewMode === id ? "#fff" : "#717171",
                      }}
                    >
                      {id.charAt(0).toUpperCase() + id.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
          <div className="p-6 px-8">
            <WeeklyCalendar rows={calendarRows} />
          </div>
        </>
      )}
    </div>
  );
}