"use client";

import { Task, Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { WeeklyCalendar } from "../ui/WeeklyCalendar";
import { StudentDeadlines } from "./StudentDeadlines";
import { fetchCounselorEventsForStudent } from "../../lib/queries";
import { useState, useEffect } from "react";

interface RoadmapProps {
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  deadlines?: Deadline[];
  studentId?: number;
  onRefresh?: () => void;
  readOnly?: boolean;
}

export function Roadmap({ tasks, setTasks, deadlines = [], studentId, onRefresh, readOnly }: RoadmapProps) {
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
          avatarBg: "#fef2f2",
          avatarColor: "#ef4444",
          events: deadlines.map((d) => ({
            id: d.id,
            title: d.title,
            date: d.due,
            bgColor: d.status === "overdue" ? "#fef2f2" : d.createdBy === "student" ? "#f5f3ff" : "#fefce8",
            borderColor: d.status === "overdue" ? "#ef4444" : d.createdBy === "student" ? "#7c3aed" : "#d97706",
            textColor: d.status === "overdue" ? "#ef4444" : d.createdBy === "student" ? "#7c3aed" : "#d97706",
          })),
        }]
      : []),
    ...(counselorEvents.length > 0
      ? [{
          id: "strategist",
          name: "From Strategist",
          subtitle: `${counselorEvents.length} event${counselorEvents.length !== 1 ? "s" : ""}`,
          avatar: "📅",
          avatarBg: "#eff6ff",
          avatarColor: "#1d4ed8",
          events: counselorEvents.map((ce: any) => ({
            id: ce.id,
            title: ce.title,
            date: ce.date,
            bgColor: "#eff6ff",
            borderColor: "#3b82f6",
            textColor: "#1d4ed8",
          })),
        }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Roadmap"
        sub="Track your deadlines and schedule."
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
              View Only
            </span>
          ) : null
        }
      />

      <div className="p-6 px-8">
        <div className="inline-flex gap-0.5 bg-white border border-line rounded-lg p-1 mb-5">
          {(["list", "calendar"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className="px-5 py-2 rounded-lg border-none cursor-pointer text-sm font-semibold"
              style={{
                background: viewMode === id ? "#3b82f6" : "transparent",
                color: viewMode === id ? "#fff" : "#64748b",
              }}
            >
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>

        {viewMode === "list" && (
          <StudentDeadlines
            deadlines={deadlines}
            studentId={studentId || 0}
            onRefresh={onRefresh}
            readOnly={readOnly}
          />
        )}

        {viewMode === "calendar" && (
          <WeeklyCalendar rows={calendarRows} />
        )}
      </div>
    </div>
  );
}