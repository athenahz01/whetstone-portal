"use client";

import { Task, Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { WeeklyCalendar } from "../ui/WeeklyCalendar";
import { StudentDeadlines } from "./StudentDeadlines";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { fetchCounselorEventsForStudent } from "../../lib/queries";
import { useState, useMemo, useEffect } from "react";

interface RoadmapProps {
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  deadlines?: Deadline[];
  studentId?: number;
  onRefresh?: () => void;
  readOnly?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: "#fff",
  border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

export function Roadmap({ tasks, setTasks, deadlines = [], studentId, onRefresh, readOnly }: RoadmapProps) {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "calendar">("list");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchCounselorEventsForStudent(studentId).then(setCounselorEvents);
    }
  }, [studentId]);

  const toggleTask = (id: number) =>
    setTasks(tasks.map((t) =>
      t.id === id ? { ...t, st: t.st === "Completed" ? "In Progress" : "Completed" } : t
    ));

  const toggleCat = (c: string) =>
    setCollapsed((p) => ({ ...p, [c]: !p[c] }));

  const grouped = useMemo(
    () => tasks.reduce((a, t) => {
      (a[t.cat] = a[t.cat] || []).push(t);
      return a;
    }, {} as Record<string, Task[]>),
    [tasks]
  );

  // ── Timeline date range: tasks + deadlines + counselor events ─────────────
  // Requires at least tasks OR deadlines to have data (not just counselor events alone,
  // since those are point-in-time and showed the confusing FEB26/MAR26 when alone)
  const tl = useMemo(() => {
    const hasContent = tasks.length > 0 || deadlines.length > 0;
    if (!hasContent) return null;

    const taskDates = tasks.flatMap((t) => [new Date(t.s), new Date(t.d)]).filter((d) => !isNaN(d.getTime()));
    const dlDates = deadlines.map((d) => new Date(d.due)).filter((d) => !isNaN(d.getTime()));
    const eventDates = counselorEvents.map((ce: any) => new Date(ce.date)).filter((d) => !isNaN(d.getTime()));
    const allDates = [...taskDates, ...dlDates, ...eventDates];
    if (!allDates.length) return null;

    const mn = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const mx = new Date(Math.max(...allDates.map((d) => d.getTime())));
    mn.setDate(mn.getDate() - 14);
    mx.setDate(mx.getDate() + 14);
    const ms = mx.getTime() - mn.getTime();
    if (ms <= 0) return null;

    const mo: Date[] = [];
    const c = new Date(mn.getFullYear(), mn.getMonth(), 1);
    while (c <= mx) {
      mo.push(new Date(c));
      c.setMonth(c.getMonth() + 1);
    }
    return { mn, mx, ms, mo };
  }, [tasks, deadlines, counselorEvents]);

  // ── Calendar rows: tasks + deadlines + counselor events ───────────────────
  const calendarRows = [
    {
      id: "tasks",
      name: "My Tasks",
      subtitle: `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`,
      avatar: "📋",
      avatarBg: "#f8f9fb",
      avatarColor: "#334155",
      events: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        date: t.d,
        bgColor: t.st === "Completed" ? "#f0fdf4" : `${getCategoryColor(t.cat)}15`,
        borderColor: t.st === "Completed" ? "#16a34a" : getCategoryColor(t.cat),
        textColor: t.st === "Completed" ? "#16a34a" : getCategoryColor(t.cat),
      })),
    },
    // ── Deadlines row ──────────────────────────────────────────────────────
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
    // ── Counselor events row ───────────────────────────────────────────────
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
        sub="Track timelines, tasks, and deadlines."
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
              View Only
            </span>
          ) : (
            <Button primary onClick={() => setShowModal(true)}>+ New Task</Button>
          )
        }
      />

      <div className="p-6 px-8">
        {/* View Toggle */}
        <div className="inline-flex gap-0.5 bg-white border border-line rounded-lg p-1 mb-5">
          {(["list", "timeline", "calendar"] as const).map((id) => (
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

        {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
        {viewMode === "list" && (
          <div className="flex flex-col gap-3.5">
            {tasks.length === 0 ? (
              <Card>
                <p className="text-sm text-sub py-4 text-center">
                  No tasks yet.{!readOnly && " Click \"+ New Task\" to add one."}
                </p>
              </Card>
            ) : (
              <Card noPadding style={{ overflow: "hidden" }}>
                <div
                  className="grid px-6 py-2.5 border-b border-line"
                  style={{ gridTemplateColumns: "5fr 2fr 2fr 2fr", background: "#f8f9fb" }}
                >
                  {["Task", "Team", "Status", "Due"].map((h) => (
                    <div
                      key={h}
                      className="text-xs text-sub uppercase tracking-widest font-semibold"
                      style={{ textAlign: h === "Due" ? "right" : "left" }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
                {Object.entries(grouped).map(([cat, ts]) => (
                  <div key={cat}>
                    <div
                      onClick={() => toggleCat(cat)}
                      className="flex items-center gap-2 px-6 py-2.5 cursor-pointer border-b border-line"
                      style={{ background: `${getCategoryColor(cat)}06` }}
                    >
                      <span className="text-xs text-sub">{collapsed[cat] ? "▸" : "▾"}</span>
                      <span className="text-sm font-bold" style={{ color: getCategoryColor(cat) }}>{cat}</span>
                      <span className="text-xs text-sub">({ts.length})</span>
                    </div>
                    {!collapsed[cat] && ts.map((t) => (
                      <div
                        key={t.id}
                        className="grid px-6 py-3 border-b border-line items-center"
                        style={{ gridTemplateColumns: "5fr 2fr 2fr 2fr" }}
                      >
                        <div className="flex items-center gap-2.5 pl-4">
                          {!readOnly && (
                            <button
                              onClick={() => toggleTask(t.id)}
                              className="bg-transparent border-none cursor-pointer text-base p-0"
                              style={{ color: t.st === "Completed" ? "#16a34a" : "#94a3b8" }}
                            >
                              {t.st === "Completed" ? "✓" : "○"}
                            </button>
                          )}
                          <span
                            className="text-sm"
                            style={{
                              color: t.st === "Completed" ? "#94a3b8" : "#0f172a",
                              textDecoration: t.st === "Completed" ? "line-through" : "none",
                            }}
                          >
                            {t.title}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {t.team?.map((a, i) => (
                            <span
                              key={i}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}
                            >
                              {a[0]}
                            </span>
                          ))}
                        </div>
                        <Tag color={getStatusColor(t.st)}>{t.st}</Tag>
                        <div className="text-sm text-sub text-right">
                          {new Date(t.d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </Card>
            )}

            {/* Deadlines — full add/edit/delete for student-owned ones */}
            <StudentDeadlines
              deadlines={deadlines}
              studentId={studentId ?? 0}
              onRefresh={onRefresh}
              readOnly={readOnly}
            />

            {/* Counselor events */}
            {counselorEvents.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                <h3 className="m-0 mb-3 text-sm font-bold" style={{ color: "#1d4ed8" }}>
                  From Your Strategist
                </h3>
                {counselorEvents.map((ce: any) => (
                  <div
                    key={ce.id}
                    className="flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5 bg-white"
                    style={{ borderLeft: "3px solid #3b82f6" }}
                  >
                    <div>
                      <div className="text-sm font-medium text-heading">{ce.title}</div>
                      <span className="text-xs" style={{ color: "#3b82f6" }}>
                        {ce.category} · {new Date(ce.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {ce.notes && <p className="text-xs text-sub mt-1 m-0">{ce.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TIMELINE (GANTT) VIEW ─────────────────────────────────────── */}
        {viewMode === "timeline" && (
          <>
            {!tl ? (
              <Card>
                <p className="text-sm text-sub py-8 text-center">
                  No tasks or deadlines yet — add some to see the timeline.
                </p>
              </Card>
            ) : (
              <Card noPadding style={{ overflow: "hidden", display: "flex" }}>
                {/* Left: labels */}
                <div className="flex-shrink-0 border-r border-line" style={{ width: 220, background: "#f8f9fb" }}>
                  <div className="h-10 border-b border-line px-3.5 flex items-center text-xs text-sub font-semibold">
                    Items
                  </div>

                  {/* Task category groups */}
                  {Object.entries(grouped).map(([cat, ts]) => (
                    <div key={cat}>
                      <div
                        onClick={() => toggleCat(cat)}
                        className="flex items-center gap-1.5 px-3.5 py-2 cursor-pointer border-b border-line text-xs font-bold bg-white"
                        style={{ color: getCategoryColor(cat) }}
                      >
                        <span className="text-[9px]">{collapsed[cat] ? "▸" : "▾"}</span>
                        {cat}
                      </div>
                      {!collapsed[cat] && ts.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-1.5 border-b border-line bg-white"
                          style={{ paddingLeft: 26, height: 42 }}
                        >
                          {!readOnly && (
                            <button
                              onClick={() => toggleTask(t.id)}
                              className="bg-transparent border-none cursor-pointer text-xs p-0"
                              style={{ color: t.st === "Completed" ? "#16a34a" : "#94a3b8" }}
                            >
                              {t.st === "Completed" ? "✓" : "○"}
                            </button>
                          )}
                          <span
                            className="text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{
                              color: t.st === "Completed" ? "#94a3b8" : "#334155",
                              textDecoration: t.st === "Completed" ? "line-through" : "none",
                            }}
                          >
                            {t.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Deadlines group */}
                  {deadlines.length > 0 && (
                    <>
                      <div
                        className="flex items-center gap-1.5 px-3.5 py-2 border-b border-line text-xs font-bold"
                        style={{ color: "#d97706", background: "#fefce8" }}
                      >
                        ⏰ Deadlines
                      </div>
                      {deadlines.sort((a, b) => a.days - b.days).map((d) => (
                        <div
                          key={`dl-side-${d.id}`}
                          className="flex items-center gap-1.5 border-b border-line"
                          style={{ paddingLeft: 14, height: 42, background: "#fffbeb" }}
                        >
                          <span className="text-xs flex-shrink-0" style={{ color: d.createdBy === "student" ? "#7c3aed" : "#94a3b8" }}>
                            {d.createdBy === "student" ? "●" : "🔒"}
                          </span>
                          <span
                            className="text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{ color: d.status === "overdue" ? "#ef4444" : "#92400e" }}
                          >
                            {d.title}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Counselor events group */}
                  {counselorEvents.length > 0 && (
                    <>
                      <div
                        className="flex items-center gap-1.5 px-3.5 py-2 border-b border-line text-xs font-bold"
                        style={{ color: "#1d4ed8", background: "#eff6ff" }}
                      >
                        📅 Counselor Events
                      </div>
                      {counselorEvents.map((ce: any) => (
                        <div
                          key={`ce-side-${ce.id}`}
                          className="flex items-center gap-1.5 border-b border-line"
                          style={{ paddingLeft: 26, height: 42, background: "#f8faff" }}
                        >
                          <span className="text-sm overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: "#1d4ed8" }}>
                            {ce.title}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Right: Gantt bars */}
                <div className="flex-1 overflow-x-auto">
                  <div style={{ minWidth: 700 }}>
                    {/* Month headers */}
                    <div className="flex h-10 border-b border-line">
                      {tl.mo.map((m, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r border-line flex items-center justify-center text-xs text-sub font-semibold uppercase"
                        >
                          {m.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                        </div>
                      ))}
                    </div>

                    {/* Task bars */}
                    {Object.entries(grouped).map(([cat, ts]) => (
                      <div key={cat}>
                        <div style={{ height: 35 }} />
                        {!collapsed[cat] && ts.map((t) => {
                          const s0 = new Date(t.s);
                          const e0 = new Date(t.d);
                          if (isNaN(s0.getTime()) || isNaN(e0.getTime())) return null;
                          const l = Math.max(0, ((s0.getTime() - tl.mn.getTime()) / tl.ms) * 100);
                          const w = Math.max(1, ((e0.getTime() - s0.getTime()) / tl.ms) * 100);
                          return (
                            <div key={t.id} className="relative flex items-center" style={{ height: 42 }}>
                              <div
                                className="absolute flex items-center text-xs text-white font-semibold overflow-hidden whitespace-nowrap"
                                style={{
                                  left: `${l}%`, width: `${w}%`, height: 26,
                                  background: getCategoryColor(cat),
                                  borderRadius: 13, opacity: t.st === "Completed" ? 0.3 : 0.85,
                                  paddingLeft: 12, minWidth: 20,
                                }}
                              >
                                {t.title}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Deadline bars — point-in-time markers */}
                    {deadlines.length > 0 && (
                      <div>
                        <div style={{ height: 35 }} />
                        {deadlines.sort((a, b) => a.days - b.days).map((d) => {
                          const due = new Date(d.due);
                          if (isNaN(due.getTime())) return null;
                          // Position: center the marker on the due date
                          const l = Math.max(0, ((due.getTime() - tl.mn.getTime()) / tl.ms) * 100);
                          // Width: 3 days wide so it's visible
                          const threeDayMs = 1000 * 60 * 60 * 24 * 3;
                          const w = Math.max(2, (threeDayMs / tl.ms) * 100);
                          const color = d.status === "overdue"
                            ? "#ef4444"
                            : d.createdBy === "student"
                            ? "#7c3aed"
                            : "#d97706";
                          return (
                            <div key={`dl-bar-${d.id}`} className="relative flex items-center" style={{ height: 42 }}>
                              <div
                                className="absolute flex items-center text-xs text-white font-semibold overflow-hidden whitespace-nowrap"
                                style={{
                                  left: `${l}%`, width: `${w}%`, height: 26,
                                  background: color,
                                  borderRadius: 13, opacity: 0.9,
                                  paddingLeft: 8, minWidth: 60,
                                }}
                              >
                                ⏰ {d.title}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Counselor event bars */}
                    {counselorEvents.length > 0 && (
                      <div>
                        <div style={{ height: 35 }} />
                        {counselorEvents.map((ce: any) => {
                          const s0 = new Date(ce.date);
                          if (isNaN(s0.getTime())) return null;
                          const e0 = new Date(s0);
                          e0.setDate(e0.getDate() + 1);
                          const l = Math.max(0, ((s0.getTime() - tl.mn.getTime()) / tl.ms) * 100);
                          const w = Math.max(1, ((e0.getTime() - s0.getTime()) / tl.ms) * 100);
                          return (
                            <div key={`ce-bar-${ce.id}`} className="relative flex items-center" style={{ height: 42 }}>
                              <div
                                className="absolute flex items-center text-xs text-white font-semibold overflow-hidden whitespace-nowrap"
                                style={{
                                  left: `${l}%`, width: `${w}%`, height: 26,
                                  background: "#3b82f6", borderRadius: 13, opacity: 0.85,
                                  paddingLeft: 12, minWidth: 20,
                                }}
                              >
                                📅 {ce.title}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── CALENDAR (WEEKLY) VIEW ────────────────────────────────────── */}
        {viewMode === "calendar" && (
          <WeeklyCalendar rows={calendarRows} />
        )}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <Modal title="New Task" onClose={() => setShowModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.target as HTMLFormElement);
              setTasks([
                ...tasks,
                {
                  id: Date.now(),
                  title: f.get("t") as string,
                  cat: f.get("c") as string,
                  s: f.get("s") as string,
                  d: f.get("d") as string,
                  st: "Planned",
                  team: [],
                },
              ]);
              setShowModal(false);
            }}
          >
            <FormField label="Title">
              <input required name="t" style={inputStyle} />
            </FormField>
            <FormField label="Category">
              <select name="c" style={inputStyle}>
                <option>College Applications</option>
                <option>Academics</option>
                <option>Testing</option>
                <option>Extracurriculars</option>
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start">
                <input required name="s" type="date" style={inputStyle} />
              </FormField>
              <FormField label="Due">
                <input required name="d" type="date" style={inputStyle} />
              </FormField>
            </div>
            <div className="flex justify-end mt-2">
              <Button primary type="submit">Save Task</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}