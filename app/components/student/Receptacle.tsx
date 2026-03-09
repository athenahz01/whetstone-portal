"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PageHeader } from "../ui/PageHeader";
import { pushToGoogleCalendar } from "../../lib/calendar";
import { fetchReceptacleEvents, addReceptacleEvent, updateReceptacleEvent, deleteReceptacleEvent, ReceptacleEvent } from "../../lib/queries";

// ── Types ──────────────────────────────────────────────────────────────────

type Quadrant = "do" | "schedule" | "delegate" | "delete" | null;
type DoSubType = "quick" | "scheduleDo" | null; // for DO quadrant: <2min vs schedule-and-do

interface Task {
  id: string;
  text: string;
  minutes: number;
  quadrant: Quadrant;
  doSub: DoSubType;
}

interface CalendarEvent {
  taskId: string;
  text: string;
  minutes: number;
  date: string;
  topMinutes: number; // minutes from midnight — allows free positioning
  synced?: boolean;
  dbId?: number; // ID from receptacle_events table
}

interface ReceptacleProps {
  studentId?: number;
  profileId?: string | null;
  gcalConnected?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const QUADRANT_CONFIG = {
  do: {
    label: "Do",
    tag: "URGENT · IMPORTANT",
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.22)",
    accent: "#ef4444",
    emoji: "🔥",
  },
  schedule: {
    label: "Schedule",
    tag: "IMPORTANT · NOT URGENT",
    bg: "rgba(59,130,246,0.07)",
    border: "rgba(59,130,246,0.22)",
    accent: "#3b82f6",
    emoji: "📅",
  },
  delegate: {
    label: "Delegate",
    tag: "URGENT · NOT IMPORTANT",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.22)",
    accent: "#f59e0b",
    emoji: "🤝",
  },
  delete: {
    label: "Delete",
    tag: "NOT URGENT · NOT IMPORTANT",
    bg: "rgba(100,116,139,0.07)",
    border: "rgba(100,116,139,0.18)",
    accent: "#64748b",
    emoji: "🗑️",
  },
} as const;

// Quadrant layout order: top-left, top-right, bottom-left, bottom-right
const QUADRANT_ORDER: (keyof typeof QUADRANT_CONFIG)[] = ["do", "schedule", "delegate", "delete"];

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am–11pm
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_HEIGHT = 60; // px per hour for calendar

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function fmtMinutes(totalMins: number) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${displayH} ${period}` : `${displayH}:${String(m).padStart(2, "0")} ${period}`;
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
  return Math.max(24, (min / 60) * HOUR_HEIGHT);
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

  const calRef = useRef<HTMLDivElement>(null);
  const days = get3Days(dayOffset);

  // ── Load persisted calendar events on mount ──
  useEffect(() => {
    if (!studentId) return;
    fetchReceptacleEvents(studentId).then((events) => {
      const loaded: CalendarEvent[] = events.map((e) => ({
        taskId: `db-${e.id}`,
        text: e.task_text,
        minutes: e.minutes,
        date: e.date,
        topMinutes: e.top_minutes,
        synced: e.synced,
        dbId: e.id,
      }));
      setCalEvents((prev) => {
        // Merge: keep in-memory events that aren't yet persisted, add DB events
        const dbIds = new Set(loaded.map((e) => e.dbId));
        const nonDb = prev.filter((e) => !e.dbId && !dbIds.has(e.dbId));
        return [...nonDb, ...loaded];
      });
      // Load completed state
      const completedIds = new Set(events.filter((e) => e.completed).map((e) => `db-${e.id}`));
      setCompleted(completedIds);
    });
  }, [studentId]);

  // ── Step 1 ──

  const addTask = () => {
    const text = inputText.trim();
    const mins = parseInt(inputMins);
    if (!text || !mins || mins <= 0) return;
    setTasks((p) => [...p, { id: Date.now().toString(), text, minutes: mins, quadrant: null, doSub: null }]);
    setInputText("");
    setInputMins("");
  };

  // ── Step 2 ──

  const unassigned = tasks.filter((t) => t.quadrant === null);

  const assign = (q: Quadrant) => {
    if (!selectedTask) return;
    setTasks((p) => p.map((t) => t.id === selectedTask ? { ...t, quadrant: q, doSub: null } : t));
    const remaining = tasks.filter((t) => t.quadrant === null && t.id !== selectedTask);
    setSelectedTask(remaining.length > 0 ? remaining[0].id : null);
  };

  const unassign = (id: string) => {
    setTasks((p) => p.map((t) => t.id === id ? { ...t, quadrant: null, doSub: null } : t));
    setSelectedTask(id);
  };

  // DO sub-assignment
  const assignDoSub = (id: string, sub: DoSubType) => {
    setTasks((p) => p.map((t) => t.id === id ? { ...t, doSub: sub } : t));
  };

  // ── Step 3 ──

  const scheduledIds = new Set(calEvents.map((e) => e.taskId));
  const tasksInSection = (q: Quadrant) => tasks.filter((t) => t.quadrant === q);

  // Free-form drop: calculate minute offset from mouse position
  const handleCalDrop = useCallback(async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const calEl = calRef.current;
    if (!calEl) return;

    const scrollContainer = calEl.querySelector("[data-cal-scroll]") as HTMLElement;
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop;
    const yInGrid = e.clientY - rect.top + scrollTop;

    // Convert pixel position to minutes from start hour (7am = 420 min)
    const minutesFromTop = (yInGrid / HOUR_HEIGHT) * 60;
    const totalMinutes = Math.round((420 + minutesFromTop) / 5) * 5; // snap to 5-min intervals
    const clampedMinutes = Math.max(420, Math.min(totalMinutes, 23 * 60));

    if (dragging) {
      const task = tasks.find((t) => t.id === dragging);
      if (!task) return;

      // Save to DB
      let dbId: number | undefined;
      if (studentId) {
        const saved = await addReceptacleEvent(studentId, {
          task_text: task.text,
          minutes: task.minutes,
          date: dateStr,
          top_minutes: clampedMinutes,
          quadrant: task.quadrant || undefined,
        });
        if (saved) dbId = saved.id;
      }

      const newEvent: CalendarEvent = {
        taskId: dbId ? `db-${dbId}` : dragging,
        text: task.text,
        minutes: task.minutes,
        date: dateStr,
        topMinutes: clampedMinutes,
        synced: false,
        dbId,
      };

      setCalEvents((p) => [
        ...p.filter((ev) => ev.taskId !== dragging),
        newEvent,
      ]);
      setDragging(null);

      // Auto-sync to Google Calendar
      if (profileId && gcalConnected) {
        pushToGoogleCalendar(profileId, task.text, dateStr, `${task.minutes}min task`, clampedMinutes, task.minutes).then(() => {
          if (dbId) {
            updateReceptacleEvent(dbId, { synced: true });
          }
          setCalEvents((p) => p.map((ev) => ev.dbId === dbId ? { ...ev, synced: true } : ev));
        });
      }
    } else if (draggingEvent) {
      // Moving an existing event
      const existingEvent = calEvents.find((ev) => ev.taskId === draggingEvent);
      setCalEvents((p) => p.map((ev) => ev.taskId === draggingEvent ? { ...ev, date: dateStr, topMinutes: clampedMinutes } : ev));
      setDraggingEvent(null);

      // Update in DB
      if (existingEvent?.dbId) {
        updateReceptacleEvent(existingEvent.dbId, { date: dateStr, top_minutes: clampedMinutes });
      }
    }
  }, [dragging, draggingEvent, tasks, studentId, profileId, gcalConnected, calEvents]);

  const removeEvent = (taskId: string) => {
    const ev = calEvents.find((e) => e.taskId === taskId);
    if (ev?.dbId) {
      deleteReceptacleEvent(ev.dbId);
    }
    setCalEvents((p) => p.filter((e) => e.taskId !== taskId));
  };

  const toggleComplete = (id: string) => {
    setCompleted((p) => {
      const n = new Set(p);
      const nowComplete = !n.has(id);
      nowComplete ? n.add(id) : n.delete(id);

      // Persist to DB
      const ev = calEvents.find((e) => e.taskId === id);
      if (ev?.dbId) {
        updateReceptacleEvent(ev.dbId, { completed: nowComplete });
      }

      return n;
    });
  };

  const syncToGcal = async () => {
    if (!profileId) {
      console.error("[Receptacle] No profileId, cannot sync");
      return;
    }
    const unsyncedEvents = calEvents.filter((e) => !e.synced);
    console.log("[Receptacle] Starting sync, unsynced events:", unsyncedEvents.length, "total:", calEvents.length);
    
    if (unsyncedEvents.length === 0) {
      setSyncDone(true);
      return;
    }

    setSyncing(true);
    setSyncDone(false);
    for (const ev of unsyncedEvents) {
      console.log("[Receptacle] Syncing event:", ev.text, ev.date, ev.topMinutes);
      const result = await pushToGoogleCalendar(profileId, ev.text, ev.date, `${ev.minutes}min task`, ev.topMinutes, ev.minutes);
      console.log("[Receptacle] Sync result:", result);
      if (ev.dbId) {
        await updateReceptacleEvent(ev.dbId, { synced: true });
      }
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

  // Derived: DO tasks split by sub-type
  const doTasks = tasksInSection("do");
  const doQuickTasks = doTasks.filter((t) => t.doSub === "quick");
  const doScheduleTasks = doTasks.filter((t) => t.doSub === "scheduleDo");
  const doUnassigned = doTasks.filter((t) => t.doSub === null);

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
                }}>
                {done ? "✓ " : ""}{label}
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
                  <h2 className="text-xl font-bold text-heading m-0">Timer 1: Brain Dump</h2>
                  <p className="text-sm text-sub mt-1 m-0">Write down everything on your mind. Set the timer for 5 minutes. Don&apos;t filter — just dump.</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <input value={inputText} onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="What's on your mind?"
                  className="flex-1 px-4 py-3 rounded-lg text-sm"
                  style={{ border: "1.5px solid #e2e8f0", outline: "none", color: "#0f172a" }} />
                <input value={inputMins} onChange={(e) => setInputMins(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="min"
                  className="w-16 px-3 py-3 rounded-lg text-sm text-center"
                  style={{ border: "1.5px solid #e2e8f0", outline: "none", color: "#0f172a" }} />
                <button onClick={addTask}
                  style={{ padding: "0 18px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >+ Add</button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-10 text-sm text-sub rounded-lg" style={{ border: "2px dashed #e2e8f0" }}>
                  Start adding tasks above — don&apos;t think, just capture everything.
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

                {/* Matrix - 2x2 grid: DO(tl) SCHEDULE(tr) DELEGATE(bl) DELETE(br) */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {QUADRANT_ORDER.map((key) => {
                    const cfg = QUADRANT_CONFIG[key];
                    const placed = tasks.filter((t) => t.quadrant === key);

                    // DO quadrant has sub-sections
                    if (key === "do") {
                      const quickTasks = placed.filter((t) => t.doSub === "quick");
                      const schedDoTasks = placed.filter((t) => t.doSub === "scheduleDo");
                      const unsubbed = placed.filter((t) => t.doSub === null);

                      return (
                        <div key={key} onClick={() => assign(key)} className="rounded-xl p-3 cursor-pointer"
                          style={{ background: cfg.bg, border: `1.5px solid ${selectedTask ? cfg.border : "rgba(0,0,0,0.05)"}`, minHeight: 130, opacity: selectedTask ? 1 : 0.72 }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-sm" style={{ color: cfg.accent }}>{cfg.emoji} {cfg.label}</div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${cfg.accent}18`, color: cfg.accent }}>{cfg.tag}</span>
                          </div>

                          {/* Unsubbed tasks — click to assign sub-type */}
                          {unsubbed.map((t) => (
                            <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded mb-1 group"
                              style={{ background: "rgba(255,255,255,0.65)" }}
                              onClick={(e) => e.stopPropagation()}>
                              <span className="text-xs truncate" style={{ color: "#334155" }}>{t.text}</span>
                              <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                <button onClick={(e) => { e.stopPropagation(); assignDoSub(t.id, "quick"); }}
                                  className="text-[8px] px-1.5 py-0.5 rounded border-none cursor-pointer font-bold"
                                  style={{ background: "#fef2f2", color: "#ef4444" }} title="Under 2 minutes — do immediately">⚡ &lt;2m</button>
                                <button onClick={(e) => { e.stopPropagation(); assignDoSub(t.id, "scheduleDo"); }}
                                  className="text-[8px] px-1.5 py-0.5 rounded border-none cursor-pointer font-bold"
                                  style={{ background: "#fef2f2", color: "#b91c1c" }} title="Schedule and do">📅</button>
                                <button onClick={(e) => { e.stopPropagation(); unassign(t.id); }}
                                  className="text-[9px] opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer" style={{ color: "#94a3b8" }}>↩</button>
                              </div>
                            </div>
                          ))}

                          {/* <2min section */}
                          {quickTasks.length > 0 && (
                            <div className="mt-1.5">
                              <div className="text-[8px] font-bold uppercase tracking-wider mb-1 px-1" style={{ color: "#dc2626" }}>⚡ &lt;2min do now!</div>
                              {quickTasks.map((t) => (
                                <div key={t.id} className="flex items-center justify-between px-2 py-1 rounded mb-0.5 group"
                                  style={{ background: "rgba(239,68,68,0.08)" }}
                                  onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[11px] truncate" style={{ color: "#7f1d1d" }}>{t.text}</span>
                                  <button onClick={(e) => { e.stopPropagation(); unassign(t.id); }}
                                    className="text-[9px] opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer" style={{ color: "#94a3b8" }}>↩</button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Schedule & do section */}
                          {schedDoTasks.length > 0 && (
                            <div className="mt-1.5">
                              <div className="text-[8px] font-bold uppercase tracking-wider mb-1 px-1" style={{ color: "#b91c1c" }}>📅 Schedule & Do</div>
                              {schedDoTasks.map((t) => (
                                <div key={t.id} className="flex items-center justify-between px-2 py-1 rounded mb-0.5 group"
                                  style={{ background: "rgba(255,255,255,0.5)" }}
                                  onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[11px] truncate" style={{ color: "#334155" }}>{t.text}</span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-[9px]" style={{ color: "#94a3b8" }}>{t.minutes}m</span>
                                    <button onClick={(e) => { e.stopPropagation(); unassign(t.id); }}
                                      className="text-[9px] opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer" style={{ color: "#94a3b8" }}>↩</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Other quadrants — same as before
                    return (
                      <div key={key} onClick={() => assign(key)} className="rounded-xl p-3 cursor-pointer"
                        style={{ background: cfg.bg, border: `1.5px solid ${selectedTask ? cfg.border : "rgba(0,0,0,0.05)"}`, minHeight: 130, opacity: selectedTask ? 1 : 0.72 }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-sm" style={{ color: cfg.accent }}>{cfg.emoji} {cfg.label}</div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${cfg.accent}18`, color: cfg.accent }}>{cfg.tag}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {placed.map((t) => (
                            <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded group"
                              style={{ background: "rgba(255,255,255,0.65)", textDecoration: key === "delete" ? "line-through" : "none" }}
                              onClick={(e) => e.stopPropagation()}>
                              <span className="text-xs truncate" style={{ color: key === "delete" ? "#94a3b8" : "#334155" }}>{t.text}</span>
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
                  <p className="text-xs text-sub m-0 mt-0.5">Drag tasks from the right panel onto the calendar. <strong>&lt;2min tasks</strong> — check off as you go.</p>
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
              {/* ── 3-Day Calendar (free-form positioning) ── */}
              <div ref={calRef} style={{ flex: 1, ...card, padding: 0, overflow: "hidden", minWidth: 0 }}>
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

                {/* Time grid — free-form positioning */}
                <div data-cal-scroll style={{ maxHeight: 540, overflowY: "auto" }}>
                  <div className="grid" style={{ gridTemplateColumns: "52px repeat(3, 1fr)" }}>
                    {/* Hour labels column + day columns with events */}
                    {HOURS.map((hour) => (
                      <div key={`row-${hour}`} style={{ display: "contents" }}>
                        <div className="text-[10px] text-sub text-right pr-2 border-t border-line"
                          style={{ height: HOUR_HEIGHT, paddingTop: 4, background: "#fafbfc", lineHeight: 1 }}>
                          {fmtHour(hour)}
                        </div>
                        {days.map((d, di) => {
                          const dateStr = fmt(d);
                          // Events in this hour cell (for rendering)
                          const cellStartMin = hour * 60;
                          const cellEndMin = (hour + 1) * 60;
                          const eventsHere = calEvents.filter((e) => e.date === dateStr && e.topMinutes >= cellStartMin && e.topMinutes < cellEndMin);

                          return (
                            <div key={`cell-${hour}-${di}`}
                              className="border-t border-l border-line relative"
                              style={{ height: HOUR_HEIGHT }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleCalDrop(e, dateStr)}>
                              {eventsHere.map((ev) => {
                                const offsetMin = ev.topMinutes - cellStartMin;
                                const topPx = (offsetMin / 60) * HOUR_HEIGHT;
                                return (
                                  <div key={ev.taskId} draggable
                                    onDragStart={() => setDraggingEvent(ev.taskId)}
                                    onDragEnd={() => setDraggingEvent(null)}
                                    className="absolute left-0.5 right-0.5 rounded-md px-1.5 pt-1 cursor-grab group z-10 overflow-hidden"
                                    style={{ top: topPx, height: minutesToHeight(ev.minutes), background: "#eff6ff", border: "1.5px solid #3b82f6" }}>
                                    <div className="text-[10px] font-semibold leading-tight truncate pr-4" style={{ color: "#1d4ed8" }}>{ev.text}</div>
                                    <div className="text-[9px] mt-0.5" style={{ color: "#60a5fa" }}>{fmtMinutes(ev.topMinutes)} · {ev.minutes}m{ev.synced ? " · ✓" : ""}</div>
                                    <button onClick={() => removeEvent(ev.taskId)}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded text-[9px] hidden group-hover:flex items-center justify-center border-none cursor-pointer"
                                      style={{ background: "#bfdbfe", color: "#1d4ed8" }}>✕</button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Task Bar (right) ── */}
              <div style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>

                {/* <2min Do Now! — todo checklist */}
                {doQuickTasks.length > 0 && (
                  <div style={{ ...card, background: "#fef2f2", border: "1.5px solid #fecaca" }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#ef4444" }}>⚡ &lt;2min Do Now!</div>
                    <div className="flex flex-col gap-1.5">
                      {doQuickTasks.map((t) => {
                        const done = completed.has(t.id);
                        return (
                          <label key={t.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
                            style={{ background: done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.55)", border: "1px solid rgba(239,68,68,0.15)" }}>
                            <input type="checkbox" checked={done} onChange={() => toggleComplete(t.id)} style={{ accentColor: "#ef4444", width: 14, height: 14, flexShrink: 0 }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate" style={{ color: done ? "#94a3b8" : "#7f1d1d", textDecoration: done ? "line-through" : "none" }}>{t.text}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Schedule & Do (from DO quadrant) — draggable */}
                {doScheduleTasks.length > 0 && (
                  <div style={card}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#ef4444" }}>
                      🔥 Do: Schedule & Do <span className="text-[9px] font-normal text-sub normal-case tracking-normal ml-1">(drag to calendar)</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {doScheduleTasks.map((t) => {
                        const onCal = scheduledIds.has(t.id);
                        return (
                          <div key={t.id} draggable={!onCal}
                            onDragStart={() => !onCal && setDragging(t.id)}
                            onDragEnd={() => setDragging(null)}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg select-none"
                            style={{ background: onCal ? "#f0fdf4" : dragging === t.id ? "#fef2f2" : "#f8f9fb", border: `1.5px solid ${onCal ? "#86efac" : dragging === t.id ? "#ef4444" : "#e2e8f0"}`, cursor: onCal ? "default" : "grab", opacity: dragging === t.id ? 0.5 : 1 }}>
                            <span className="text-xs font-medium truncate min-w-0" style={{ color: onCal ? "#16a34a" : "#334155" }}>{onCal ? "✓ " : "⠿ "}{t.text}</span>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0" style={{ background: "#fef2f2", color: "#ef4444" }}>{t.minutes}m</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Schedule (blue) */}
                <div style={card}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#3b82f6" }}>
                    📅 Schedule <span className="text-[9px] font-normal text-sub normal-case tracking-normal ml-1">(drag to calendar)</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {tasksInSection("schedule").length === 0 && (
                      <div className="text-xs text-sub text-center py-3" style={{ border: "1.5px dashed #e2e8f0", borderRadius: 8 }}>No scheduled tasks</div>
                    )}
                    {tasksInSection("schedule").map((t) => {
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

                {/* Delegate (yellow) */}
                <div style={card}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#f59e0b" }}>
                    🤝 Delegate <span className="text-[9px] font-normal text-sub normal-case tracking-normal ml-1">(drag to calendar)</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {tasksInSection("delegate").length === 0 && (
                      <div className="text-xs text-sub text-center py-3" style={{ border: "1.5px dashed #e2e8f0", borderRadius: 8 }}>No delegate tasks</div>
                    )}
                    {tasksInSection("delegate").map((t) => {
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