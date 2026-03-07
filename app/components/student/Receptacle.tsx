"use client";

import { useState } from "react";
import { PageHeader } from "../ui/PageHeader";
import { pushToGoogleCalendar } from "../../lib/calendar";

// ── Types ──────────────────────────────────────────────────────────────────

type Quadrant = "demand" | "fulfillment" | "delusion" | "distraction" | null;

interface Task {
  id: string;
  text: string;
  minutes: number;
  quadrant: Quadrant;
}

interface CalendarEvent {
  taskId: string;
  text: string;
  minutes: number;
  date: string;
  hour: number;
  synced?: boolean;
}

interface ReceptacleProps {
  studentId?: number;
  profileId?: string | null;
  gcalConnected?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const QUADRANT_CONFIG = {
  fulfillment: {
    label: "Schedule",
    tag: "IMPORTANT · NOT URGENT",
    bg: "rgba(59,130,246,0.07)",
    border: "rgba(59,130,246,0.22)",
    accent: "#3b82f6",
    emoji: "📅",
  },
  delusion: {
    label: "Delegate",
    tag: "URGENT · NOT IMPORTANT",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.22)",
    accent: "#f59e0b",
    emoji: "🤝",
  },
  demand: {
    label: "Do Now",
    tag: "URGENT · IMPORTANT",
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.22)",
    accent: "#ef4444",
    emoji: "🔥",
  },
  distraction: {
    label: "Delete",
    tag: "NOT URGENT · NOT IMPORTANT",
    bg: "rgba(100,116,139,0.07)",
    border: "rgba(100,116,139,0.18)",
    accent: "#64748b",
    emoji: "🗑️",
  },
} as const;

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am–11pm
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function get3Days(offset: number): Date[] {
  const base = new Date();
  base.setDate(base.getDate() + offset);
  return [0, 1, 2].map((i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

function minutesToHeight(min: number) {
  return Math.max(28, (min / 60) * 52);
}

// ── Component ──────────────────────────────────────────────────────────────

export function Receptacle({ studentId, profileId, gcalConnected }: ReceptacleProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputText, setInputText] = useState("");
  const [inputMins, setInputMins] = useState("");

  // Step 2
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Step 3
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [dayOffset, setDayOffset] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const days = get3Days(dayOffset);

  // ── Step 1 ──

  const addTask = () => {
    const text = inputText.trim();
    const mins = parseInt(inputMins);
    if (!text || !mins || mins <= 0) return;
    setTasks((p) => [...p, { id: Date.now().toString(), text, minutes: mins, quadrant: null }]);
    setInputText("");
    setInputMins("");
  };

  // ── Step 2 ──

  const unassigned = tasks.filter((t) => t.quadrant === null);

  const assign = (q: Quadrant) => {
    if (!selectedTask) return;
    setTasks((p) => p.map((t) => t.id === selectedTask ? { ...t, quadrant: q } : t));
    const remaining = tasks.filter((t) => t.quadrant === null && t.id !== selectedTask);
    setSelectedTask(remaining.length > 0 ? remaining[0].id : null);
  };

  const unassign = (id: string) => {
    setTasks((p) => p.map((t) => t.id === id ? { ...t, quadrant: null } : t));
    setSelectedTask(id);
  };

  // ── Step 3 ──

  const scheduledIds = new Set(calEvents.map((e) => e.taskId));
  const tasksInSection = (q: Quadrant) => tasks.filter((t) => t.quadrant === q);

  const dropOnCell = (date: string, hour: number) => {
    if (dragging) {
      const task = tasks.find((t) => t.id === dragging);
      if (!task) return;
      setCalEvents((p) => [
        ...p.filter((e) => e.taskId !== dragging),
        { taskId: dragging, text: task.text, minutes: task.minutes, date, hour, synced: false },
      ]);
      setDragging(null);
    } else if (draggingEvent) {
      setCalEvents((p) => p.map((e) => e.taskId === draggingEvent ? { ...e, date, hour } : e));
      setDraggingEvent(null);
    }
  };

  const removeEvent = (taskId: string) => setCalEvents((p) => p.filter((e) => e.taskId !== taskId));

  const toggleComplete = (id: string) =>
    setCompleted((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const syncToGcal = async () => {
    if (!profileId) return;
    setSyncing(true);
    for (const ev of calEvents.filter((e) => !e.synced)) {
      await pushToGoogleCalendar(profileId, ev.text, ev.date, `Scheduled at ${fmtHour(ev.hour)} · ${ev.minutes}min`);
      setCalEvents((p) => p.map((e) => e.taskId === ev.taskId ? { ...e, synced: true } : e));
    }
    setSyncing(false);
    setSyncDone(true);
  };

  const resetAll = () => {
    setStep(1); setTasks([]); setInputText(""); setInputMins("");
    setSelectedTask(null); setCalEvents([]); setDayOffset(0);
    setCompleted(new Set()); setSyncDone(false);
  };

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20,
  };

  return (
    <div>
      <PageHeader
        title="Receptacle"
        sub="The 3-timer daily planning algorithm. Capture, prioritize, and schedule your work."
      />

      <div className="px-8 pb-8">
        {/* Step tabs */}
        <div className="flex mb-6 bg-white border border-line rounded-xl overflow-hidden">
          {([
            [1, "① Brain Dump"],
            [2, "② Eisenhower Matrix"],
            [3, "③ Calendar Sync"],
          ] as const).map(([n, label]) => {
            const active = step === n;
            const done = step > n;
            return (
              <button key={n} onClick={() => setStep(n)}
                className="flex-1 py-3.5 text-sm font-semibold border-none cursor-pointer"
                style={{
                  background: active ? "#0f172a" : done ? "#f0fdf4" : "#f8f9fb",
                  color: active ? "#fff" : done ? "#16a34a" : "#64748b",
                  borderRight: n < 3 ? "1px solid #e2e8f0" : "none",
                }}
              >
                {done && !active ? "✓ " : ""}{label}
              </button>
            );
          })}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <div style={card}>
              <div className="flex gap-4 mb-5">
                <div className="text-3xl">🧠</div>
                <div>
                  <h2 className="text-xl font-bold text-heading m-0">Timer 1: The Brain Dump</h2>
                  <p className="text-sm text-sub mt-1 m-0">
                    Capture <strong>every</strong> task, commitment and idea. Don't organize — just dump. Be specific and include a time estimate for each.
                  </p>
                </div>
              </div>

              <div className="rounded-lg px-4 py-3 mb-5 text-sm" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                💡 <strong>Tip:</strong> "Write essay" → "Draft intro paragraph for Common App personal statement" · 45 min
              </div>

              {/* Two-field input */}
              <div className="flex gap-2 mb-4 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-sub block mb-1">Task description *</label>
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="e.g. Draft intro paragraph for Common App essay"
                    autoFocus
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", color: "#0f172a", background: "#fff", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ width: 140, flexShrink: 0 }}>
                  <label className="text-xs font-semibold text-sub block mb-1">Time estimate (min) *</label>
                  <input
                    type="number"
                    value={inputMins}
                    onChange={(e) => setInputMins(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="e.g. 45"
                    min={1}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", color: "#0f172a", background: "#fff", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <button
                  onClick={addTask}
                  style={{
                    padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: inputText.trim() && inputMins ? "#0f172a" : "#e2e8f0",
                    color: inputText.trim() && inputMins ? "#fff" : "#94a3b8",
                    fontWeight: 600, fontSize: 13, flexShrink: 0,
                  }}
                >+ Add</button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-10 text-sm text-sub rounded-lg" style={{ border: "2px dashed #e2e8f0" }}>
                  Start adding tasks above — don't think, just capture everything.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-lg group" style={{ background: "#f8f9fb", border: "1px solid #e2e8f0" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#94a3b8" }} />
                        <span className="text-sm text-body truncate">{t.text}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#3b82f6" }}>{t.minutes}m</span>
                        <button onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))} className="text-xs opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer" style={{ color: "#ef4444" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tasks.length > 0 && (
                <div className="mt-3 text-xs text-sub text-right">
                  {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {tasks.reduce((a, t) => a + t.minutes, 0)} min total
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => { if (tasks.length > 0) { setSelectedTask(tasks[0].id); setStep(2); } }}
                disabled={tasks.length === 0}
                style={{ padding: "12px 24px", borderRadius: 12, border: "none", cursor: tasks.length === 0 ? "not-allowed" : "pointer", background: tasks.length === 0 ? "#e2e8f0" : "#0f172a", color: tasks.length === 0 ? "#94a3b8" : "#fff", fontWeight: 600, fontSize: 13 }}
              >Next: Timer 2 →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <div style={card}>
              <div className="flex gap-4 mb-5">
                <div className="text-3xl">⬛</div>
                <div>
                  <h2 className="text-xl font-bold text-heading m-0">Timer 2: Eisenhower Matrix</h2>
                  <p className="text-sm text-sub mt-1 m-0">Select a task on the left, then click a quadrant to assign it.</p>
                </div>
              </div>
              <div className="flex gap-5">
                {/* Unassigned */}
                <div style={{ width: 220, flexShrink: 0 }}>
                  <div className="text-[10px] font-bold text-sub uppercase tracking-widest mb-2">Unassigned ({unassigned.length})</div>
                  <div className="flex flex-col gap-1.5">
                    {unassigned.length === 0 ? (
                      <div className="text-xs text-center text-sub py-4 rounded-lg" style={{ border: "1.5px dashed #e2e8f0" }}>All assigned!</div>
                    ) : unassigned.map((t) => (
                      <button key={t.id} onClick={() => setSelectedTask(t.id)} className="text-left px-3 py-2.5 rounded-lg text-sm border-none cursor-pointer"
                        style={{ background: selectedTask === t.id ? "#0f172a" : "#f8f9fb", color: selectedTask === t.id ? "#fff" : "#334155", border: `1.5px solid ${selectedTask === t.id ? "#0f172a" : "#e2e8f0"}` }}>
                        <div className="font-medium truncate">{t.text}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: selectedTask === t.id ? "rgba(255,255,255,0.55)" : "#94a3b8" }}>{t.minutes} min</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matrix */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {(Object.entries(QUADRANT_CONFIG) as [keyof typeof QUADRANT_CONFIG, typeof QUADRANT_CONFIG[keyof typeof QUADRANT_CONFIG]][]).map(([key, cfg]) => {
                    const placed = tasks.filter((t) => t.quadrant === key);
                    return (
                      <div key={key} onClick={() => assign(key)} className="rounded-xl p-3 cursor-pointer"
                        style={{ background: cfg.bg, border: `1.5px solid ${selectedTask ? cfg.border : "rgba(0,0,0,0.05)"}`, minHeight: 110, opacity: selectedTask ? 1 : 0.72 }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-sm" style={{ color: cfg.accent }}>{cfg.emoji} {cfg.label}</div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${cfg.accent}18`, color: cfg.accent }}>{cfg.tag}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {placed.map((t) => (
                            <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded group"
                              style={{ background: "rgba(255,255,255,0.65)", textDecoration: key === "distraction" ? "line-through" : "none" }}
                              onClick={(e) => e.stopPropagation()}>
                              <span className="text-xs truncate" style={{ color: key === "distraction" ? "#94a3b8" : "#334155" }}>{t.text}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                <span className="text-[9px]" style={{ color: "#94a3b8" }}>{t.minutes}m</span>
                                <button onClick={(e) => { e.stopPropagation(); unassign(t.id); }} className="opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer text-xs" style={{ color: "#94a3b8" }}>↩</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(1)} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #cbd5e1", cursor: "pointer", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13 }}>← Back</button>
              <button onClick={() => setStep(3)} style={{ padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13 }}>Next: Timer 3 →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div>
            {/* Header */}
            <div style={{ ...card, padding: "14px 20px", marginBottom: 14 }}>
              <div className="flex items-center gap-4">
                <div className="text-2xl">📅</div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-heading m-0">Timer 3: Calendar Sync</h2>
                  <p className="text-xs text-sub m-0 mt-0.5">Drag tasks from the right panel onto the calendar. <strong>Do Now</strong> — check off as you go.</p>
                </div>
                {gcalConnected && (
                  <button onClick={syncToGcal} disabled={syncing || syncDone || calEvents.length === 0}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, flexShrink: 0, cursor: (calEvents.length === 0 || syncDone) ? "not-allowed" : "pointer", background: syncDone ? "#dcfce7" : calEvents.length === 0 ? "#f1f5f9" : "#3b82f6", color: syncDone ? "#16a34a" : calEvents.length === 0 ? "#94a3b8" : "#fff" }}>
                    {syncDone ? "✓ Synced!" : syncing ? "Syncing..." : "📅 Sync to Google Cal"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
              {/* ── 3-Day Calendar ── */}
              <div style={{ flex: 1, ...card, padding: 0, overflow: "hidden", minWidth: 0 }}>
                {/* Nav */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-line" style={{ background: "#f8f9fb" }}>
                  <button onClick={() => setDayOffset((o) => o - 3)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: "#fff", color: "#334155", fontWeight: 600 }}>‹</button>
                  <div className="text-sm font-semibold text-heading">
                    {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {days[2].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setDayOffset(0)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 600 }}>Today</button>
                    <button onClick={() => setDayOffset((o) => o + 3)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: "#fff", color: "#334155", fontWeight: 600 }}>›</button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid border-b border-line" style={{ gridTemplateColumns: "52px repeat(3, 1fr)" }}>
                  <div style={{ background: "#f8f9fb" }} />
                  {days.map((d, i) => {
                    const isToday = fmt(d) === fmt(new Date());
                    return (
                      <div key={i} className="text-center py-2 border-l border-line" style={{ background: "#f8f9fb" }}>
                        <div className="text-[10px] font-semibold text-sub uppercase">{DAY_LABELS[d.getDay()]}</div>
                        <div className="text-sm font-bold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                          style={{ background: isToday ? "#3b82f6" : "transparent", color: isToday ? "#fff" : "#0f172a" }}>
                          {d.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time grid */}
                <div style={{ maxHeight: 520, overflowY: "auto" }}>
                  <div className="grid" style={{ gridTemplateColumns: "52px repeat(3, 1fr)" }}>
                    {HOURS.map((hour) => (
                      <>
                        <div key={`lbl-${hour}`} className="text-[10px] text-sub text-right pr-2 border-t border-line"
                          style={{ height: 52, paddingTop: 4, background: "#fafbfc", lineHeight: 1 }}>
                          {fmtHour(hour)}
                        </div>
                        {days.map((d, di) => {
                          const dateStr = fmt(d);
                          const eventsHere = calEvents.filter((e) => e.date === dateStr && e.hour === hour);
                          return (
                            <div key={`cell-${hour}-${di}`} className="border-t border-l border-line relative" style={{ height: 52 }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => dropOnCell(dateStr, hour)}>
                              {eventsHere.map((ev) => (
                                <div key={ev.taskId} draggable
                                  onDragStart={() => setDraggingEvent(ev.taskId)}
                                  onDragEnd={() => setDraggingEvent(null)}
                                  className="absolute inset-x-0.5 rounded-md px-1.5 pt-1 cursor-grab group z-10 overflow-hidden"
                                  style={{ top: 2, height: minutesToHeight(ev.minutes) - 4, background: "#eff6ff", border: "1.5px solid #3b82f6" }}>
                                  <div className="text-[10px] font-semibold leading-tight truncate pr-4" style={{ color: "#1d4ed8" }}>{ev.text}</div>
                                  <div className="text-[9px] mt-0.5" style={{ color: "#60a5fa" }}>{fmtHour(hour)} · {ev.minutes}m{ev.synced ? " · ✓" : ""}</div>
                                  <button onClick={() => removeEvent(ev.taskId)}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded text-[9px] hidden group-hover:flex items-center justify-center border-none cursor-pointer"
                                    style={{ background: "#bfdbfe", color: "#1d4ed8" }}>✕</button>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Task Bar (right) ── */}
              <div style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Schedule */}
                <div style={card}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#3b82f6" }}>
                    📅 Schedule <span className="text-[9px] font-normal text-sub normal-case tracking-normal ml-1">(drag to calendar)</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {tasksInSection("fulfillment").length === 0 && (
                      <div className="text-xs text-sub text-center py-3" style={{ border: "1.5px dashed #e2e8f0", borderRadius: 8 }}>No scheduled tasks</div>
                    )}
                    {tasksInSection("fulfillment").map((t) => {
                      const onCal = scheduledIds.has(t.id);
                      return (
                        <div key={t.id} draggable={!onCal}
                          onDragStart={() => !onCal && setDragging(t.id)}
                          onDragEnd={() => setDragging(null)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg select-none"
                          style={{ background: onCal ? "#f0fdf4" : dragging === t.id ? "#eff6ff" : "#f8f9fb", border: `1.5px solid ${onCal ? "#86efac" : dragging === t.id ? "#3b82f6" : "#e2e8f0"}`, cursor: onCal ? "default" : "grab", opacity: dragging === t.id ? 0.5 : 1 }}>
                          <span className="text-xs font-medium truncate min-w-0" style={{ color: onCal ? "#16a34a" : "#334155" }}>{onCal ? "✓ " : "⠿ "}{t.text}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0" style={{ background: "#eff6ff", color: "#3b82f6" }}>{t.minutes}m</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delegate */}
                <div style={card}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#f59e0b" }}>
                    🤝 Delegate <span className="text-[9px] font-normal text-sub normal-case tracking-normal ml-1">(drag to calendar)</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {tasksInSection("delusion").length === 0 && (
                      <div className="text-xs text-sub text-center py-3" style={{ border: "1.5px dashed #e2e8f0", borderRadius: 8 }}>No delegate tasks</div>
                    )}
                    {tasksInSection("delusion").map((t) => {
                      const onCal = scheduledIds.has(t.id);
                      return (
                        <div key={t.id} draggable={!onCal}
                          onDragStart={() => !onCal && setDragging(t.id)}
                          onDragEnd={() => setDragging(null)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg select-none"
                          style={{ background: onCal ? "#fffbeb" : dragging === t.id ? "#fef3c7" : "#f8f9fb", border: `1.5px solid ${onCal ? "#fde68a" : dragging === t.id ? "#f59e0b" : "#e2e8f0"}`, cursor: onCal ? "default" : "grab", opacity: dragging === t.id ? 0.5 : 1 }}>
                          <span className="text-xs font-medium truncate min-w-0" style={{ color: "#334155" }}>{onCal ? "✓ " : "⠿ "}{t.text}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0" style={{ background: "#fef3c7", color: "#f59e0b" }}>{t.minutes}m</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Do Now */}
                <div style={{ ...card, background: "#fef2f2", border: "1.5px solid #fecaca" }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#ef4444" }}>🔥 Do Now</div>
                  <div className="flex flex-col gap-1.5">
                    {tasksInSection("demand").length === 0 && (
                      <div className="text-xs text-sub text-center py-3" style={{ border: "1.5px dashed #fecaca", borderRadius: 8 }}>No urgent tasks</div>
                    )}
                    {tasksInSection("demand").map((t) => {
                      const done = completed.has(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
                          style={{ background: done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.55)", border: "1px solid rgba(239,68,68,0.15)" }}>
                          <input type="checkbox" checked={done} onChange={() => toggleComplete(t.id)} style={{ accentColor: "#ef4444", width: 14, height: 14, flexShrink: 0 }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: done ? "#94a3b8" : "#7f1d1d", textDecoration: done ? "line-through" : "none" }}>{t.text}</div>
                            <div className="text-[9px] mt-0.5" style={{ color: done ? "#cbd5e1" : "#fca5a5" }}>{t.minutes}m</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-sub">
                {calEvents.length} event{calEvents.length !== 1 ? "s" : ""} scheduled
                {completed.size > 0 && ` · ${completed.size} done`}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #cbd5e1", cursor: "pointer", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13 }}>← Back</button>
                <button onClick={resetAll} style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", background: "#f1f5f9", color: "#334155", fontWeight: 600, fontSize: 13 }}>↺ Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}