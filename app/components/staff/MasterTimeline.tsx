"use client";

import { Student } from "../../types";
import { PageHeader } from "../ui/PageHeader";
import { getCategoryColor } from "../../lib/colors";
import { useState } from "react";

interface MasterTimelineProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
}

export function MasterTimeline({ students, onSelectStudent, onNavigate }: MasterTimelineProps) {
  const [filter, setFilter] = useState("all");

  const today = new Date("2025-12-23");
  const days = 45;
  const dw = 28;

  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const cats = ["all", ...Array.from(new Set(students.flatMap((s) => s.dl.map((d) => d.cat))))];

  return (
    <div>
      <PageHeader
        title="Master Timeline"
        sub="All deadlines at a glance."
        right={
          <div className="flex gap-1 flex-wrap">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className="px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold capitalize"
                style={{
                  background: filter === c ? "#eff6ff" : "#fff",
                  border: `1px solid ${filter === c ? "#3b82f6" : "#cbd5e1"}`,
                  color: filter === c ? "#1d4ed8" : "#64748b",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        }
      />
      <div className="p-4 px-8 overflow-auto">
        <div style={{ minWidth: days * dw + 170 }}>
          {/* Date Headers */}
          <div className="flex mb-1" style={{ marginLeft: 160 }}>
            {dates.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} className="text-center flex-shrink-0" style={{ width: dw }}>
                  {d.getDate() === 1 && (
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#1d4ed8" }}>
                      {d.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  )}
                  <div
                    className="text-[10px] py-0.5 rounded"
                    style={{
                      color: isToday ? "#fff" : "#64748b",
                      background: isToday ? "#3b82f6" : "transparent",
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Student Rows */}
          {students.map((s) => {
            const dl = filter === "all" ? s.dl : s.dl.filter((d) => d.cat === filter);
            return (
              <div
                key={s.id}
                className="flex items-center border-t border-line bg-white"
                style={{ minHeight: 50 }}
              >
                {/* Student Name */}
                <div
                  className="flex-shrink-0 p-2 px-2.5 flex items-center gap-2.5 cursor-pointer"
                  style={{ width: 160 }}
                  onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: "#eff6ff", color: "#1d4ed8" }}
                  >
                    {s.av}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-heading">{s.name}</div>
                    <div className="text-xs text-sub">Gr. {s.grade}</div>
                  </div>
                </div>

                {/* Timeline Area */}
                <div className="flex relative flex-1">
                  {/* Grid columns */}
                  {dates.map((_, i) => (
                    <div key={i} className="flex-shrink-0" style={{ width: dw, height: 50 }} />
                  ))}

                  {/* Deadline bars */}
                  {dl.filter((d) => d.status !== "completed").map((d) => {
                    const due = new Date(d.due);
                    const off = Math.round((due.getTime() - today.getTime()) / 86400000);
                    if (off < -3 || off >= days) return null;
                    return (
                      <div
                        key={d.id}
                        title={d.title}
                        className="absolute rounded-md overflow-hidden cursor-pointer"
                        style={{
                          left: Math.max(0, off) * dw + 2,
                          top: 9,
                          height: 30,
                          minWidth: 100,
                          maxWidth: 170,
                          background: d.status === "overdue" ? "#fef2f2" : `${getCategoryColor(d.cat)}10`,
                          border: `1px solid ${d.status === "overdue" ? "rgba(239,68,68,0.18)" : `${getCategoryColor(d.cat)}25`}`,
                          borderLeft: `3px solid ${d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat)}`,
                          padding: "4px 10px",
                          zIndex: 2,
                        }}
                      >
                        <div
                          className="text-[10px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ color: d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat) }}
                        >
                          {d.title}
                        </div>
                        <div className="text-[9px] text-sub">{d.cat}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}