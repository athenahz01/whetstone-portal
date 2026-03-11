"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PageHeader } from "../ui/PageHeader";
import { pushToGoogleCalendar, pullWhetstoneEventsFromGcal, updateGoogleCalendarEvent } from "../../lib/calendar";
import { fetchReceptacleEvents, addReceptacleEvent, updateReceptacleEvent, deleteReceptacleEvent, addBrainDumpTask, fetchBrainDumpTasks, updateBrainDumpQuadrant, ReceptacleEvent } from "../../lib/queries";

// ── Types ──────────────────────────────────────────────────────────────────

type Quadrant = "do" | "schedule" | "delegate" | "delete" | null;

interface Task {
  id: string;
  text: string;
  minutes: number;
  quadrant: Quadrant;
  isQuick: boolean;
  dbId?: number;
}

interface CalendarEvent {
  taskId: string;
  text: string;
  minutes: number;
  date: string;
  topMinutes: number; // minutes from midnight — allows free positioning
  synced?: boolean;
  dbId?: number; // ID from receptacle_events table
  color?: string; // preset color key
}

// Color presets (Google Calendar style)
const EVENT_COLORS: { key: string; bg: string; border: string; text: string }[] = [
  { key: "blue",   bg: "rgba(82,139,255,0.08)",  border: "#528bff", text: "#7aabff" },
  { key: "green",  bg: "rgba(74,186,106,0.08)",  border: "#4aba6a", text: "#6dd890" },
  { key: "red",    bg: "rgba(229,91,91,0.08)",   border: "#e55b5b", text: "#f08080" },
  { key: "purple", bg: "rgba(164,128,242,0.08)", border: "#a480f2", text: "#c4a8ff" },
  { key: "amber",  bg: "rgba(229,168,59,0.08)",  border: "#e5a83b", text: "#f0c060" },
  { key: "teal",   bg: "rgba(56,189,180,0.08)",  border: "#38bdb4", text: "#5cd6ce" },
  { key: "pink",   bg: "rgba(236,112,160,0.08)", border: "#ec70a0", text: "#f5a0c0" },
  { key: "slate",  bg: "rgba(130,140,160,0.08)", border: "#828ca0", text: "#a0a8b8" },
];
function getEC(key?: string) { return EVENT_COLORS.find((c) => c.key === key) || EVENT_COLORS[0]; }

interface ReceptacleProps {
  studentId?: number;
  profileId?: string | null;
  gcalConnected?: boolean;
  googleEvents?: any[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const QUADRANT_CONFIG = {
  do: {
    label: "Do",
    tag: "URGENT · IMPORTANT",
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.22)",
    accent: "#e55b5b",
    emoji: "🔥",
  },
  schedule: {
    label: "Schedule",
    tag: "IMPORTANT · NOT URGENT",
    bg: "rgba(59,130,246,0.07)",
    border: "rgba(59,130,246,0.22)",
    accent: "#528bff",
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
    accent: "#717171",
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

export function Receptacle({ studentId, profileId, gcalConnected, googleEvents = [] }: ReceptacleProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(1); // 0 = daily review

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

  // Daily review
  const [reviewItems, setReviewItems] = useState<CalendarEvent[]>([]);
  const [reviewChecked, setReviewChecked] = useState<Set<string>>(new Set());

  // Drag ghost preview
  const [ghostPreview, setGhostPreview] = useState<{ date: string; topMinutes: number; minutes: number; text: string; colIndex: number } | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const calRef = useRef<HTMLDivElement>(null);
  const days = get3Days(dayOffset);

  // ── Load persisted brain dump tasks on mount ──
  useEffect(() => {
    if (!studentId) return;
    fetchBrainDumpTasks(studentId).then((events) => {
      const loaded: Task[] = events.map((e) => ({
        id: `db-${e.id}`,
        text: e.task_text,
        minutes: e.minutes,
        quadrant: (e.quadrant as Quadrant) || null,
        isQuick: false,
        dbId: e.id,
      }));
      setTasks((prev) => {
        const dbIds = new Set(loaded.map((t) => t.dbId));
        const nonDb = prev.filter((t) => !t.dbId && !dbIds.has(t.dbId));
        return [...nonDb, ...loaded];
      });
    });
  }, [studentId]);

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
        color: e.quadrant?.startsWith("color:") ? e.quadrant.replace("color:", "") : undefined,
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

      // Check for yesterday's uncompleted tasks → trigger daily review
      const todayStr = fmt(new Date());
      const yesterdayEvents = loaded.filter((e) => e.date < todayStr && !completedIds.has(e.taskId));
      if (yesterdayEvents.length > 0) {
        setReviewItems(yesterdayEvents);
        setStep(0);
      }

      // Sync back from GCal: detect if user moved/changed Whetstone events in GCal
      if (profileId && gcalConnected && events.length > 0) {
        pullWhetstoneEventsFromGcal(profileId).then((gcalEvents) => {
          if (!gcalEvents.length) return;
          let anyUpdated = false;
          for (const gce of gcalEvents) {
            if (gce.startMinutes == null || !gce.date) continue;
            // Match by title (strip whitespace for fuzzy match)
            const cleanTitle = gce.title.trim().toLowerCase();
            const match = events.find((e) =>
              e.task_text.trim().toLowerCase() === cleanTitle
            );
            if (match && (match.date !== gce.date || match.top_minutes !== gce.startMinutes || match.minutes !== gce.durationMinutes)) {
              const updates: any = {};
              if (match.date !== gce.date) updates.date = gce.date;
              if (match.top_minutes !== gce.startMinutes) updates.top_minutes = gce.startMinutes;
              if (gce.durationMinutes && match.minutes !== gce.durationMinutes) updates.minutes = gce.durationMinutes;
              updateReceptacleEvent(match.id, updates);
              setCalEvents((prev) => prev.map((ev) =>
                ev.dbId === match.id
                  ? { ...ev, date: gce.date, topMinutes: gce.startMinutes!, ...(gce.durationMinutes ? { minutes: gce.durationMinutes } : {}) }
                  : ev
              ));
              anyUpdated = true;
            }
          }
          if (anyUpdated) console.log("[GCal sync-back] Updated events from GCal changes");
        });
      }
    });
  }, [studentId, profileId, gcalConnected]);

  // ── Step 1 ──

  const addTask = async () => {
    const text = inputText.trim();
    const mins = parseInt(inputMins);
    if (!text || !mins || mins <= 0) return;

    const tempId = Date.now().toString();
    const newTask: Task = { id: tempId, text, minutes: mins, quadrant: null, isQuick: false };

    // Persist to DB if we have a studentId
    if (studentId) {
      const result = await addBrainDumpTask(studentId, { task_text: text, minutes: mins });
      if (result) {
        newTask.id = `db-${result.id}`;
        newTask.dbId = result.id;
      }
    }

    setTasks((p) => [...p, newTask]);
    setInputText("");
    setInputMins("");
  };

  // ── Step 2 ──

  const unassigned = tasks.filter((t) => t.quadrant === null);

  const assign = (q: Quadrant) => {
    if (!selectedTask) return;
    const task = tasks.find((t) => t.id === selectedTask);
    if (task?.dbId) {
      updateBrainDumpQuadrant(task.dbId, q);
    }
    setTasks((p) => p.map((t) => t.id === selectedTask ? { ...t, quadrant: q, isQuick: false } : t));
    const remaining = tasks.filter((t) => t.quadrant === null && t.id !== selectedTask);
    setSelectedTask(remaining.length > 0 ? remaining[0].id : null);
  };

  const unassign = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task?.dbId) {
      updateBrainDumpQuadrant(task.dbId, null);
    }
    setTasks((p) => p.map((t) => t.id === id ? { ...t, quadrant: null, isQuick: false } : t));
    setSelectedTask(id);
  };

  // DO sub-assignment
  // Go to step 3 — show quick tasks popup if there are DO tasks
  // ── Step 3 ──

  const scheduledIds = new Set(calEvents.map((e) => e.taskId));
  const tasksInSection = (q: Quadrant) => tasks.filter((t) => t.quadrant === q);

  // Find the calendar event for a given task (to show scheduled time in sidebar)
  const getCalEvent = (taskId: string) => calEvents.find((e) => e.taskId === taskId);

  // Calculate time from mouse Y position on calendar
  const getMinutesFromMouseY = useCallback((e: React.DragEvent): number | null => {
    const calEl = calRef.current;
    if (!calEl) return null;
    const scrollContainer = calEl.querySelector("[data-cal-scroll]") as HTMLElement;
    if (!scrollContainer) return null;
    const rect = scrollContainer.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop;
    const yInGrid = e.clientY - rect.top + scrollTop;
    const minutesFromTop = (yInGrid / HOUR_HEIGHT) * 60;
    const totalMinutes = Math.round((420 + minutesFromTop) / 5) * 5; // snap to 5-min
    return Math.max(420, Math.min(totalMinutes, 23 * 60));
  }, []);

  // Get which day column the mouse is over (0, 1, 2)
  const getDayColumnFromMouseX = useCallback((e: React.DragEvent): number => {
    const calEl = calRef.current;
    if (!calEl) return 0;
    const scrollContainer = calEl.querySelector("[data-cal-scroll]") as HTMLElement;
    if (!scrollContainer) return 0;
    const rect = scrollContainer.getBoundingClientRect();
    const xInGrid = e.clientX - rect.left - 52; // subtract hour label width
    const colWidth = (rect.width - 52) / 3;
    return Math.max(0, Math.min(2, Math.floor(xInGrid / colWidth)));
  }, []);

  // Track drag position for ghost preview
  const handleCalDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (!dragging && !draggingEvent) return;

    const mins = getMinutesFromMouseY(e);
    if (mins === null) return;
    const colIdx = getDayColumnFromMouseX(e);

    const task = dragging
      ? tasks.find((t) => t.id === dragging)
      : null;
    const existingEv = draggingEvent
      ? calEvents.find((ev) => ev.taskId === draggingEvent)
      : null;

    const taskMinutes = task?.minutes || existingEv?.minutes || 30;
    const taskText = task?.text || existingEv?.text || "";

    setGhostPreview({
      date: dateStr,
      topMinutes: mins,
      minutes: taskMinutes,
      text: taskText,
      colIndex: colIdx,
    });
  }, [dragging, draggingEvent, tasks, calEvents, getMinutesFromMouseY, getDayColumnFromMouseX]);

  // Clear ghost on drag leave
  const handleCalDragLeave = useCallback(() => {
    setGhostPreview(null);
  }, []);

  // Free-form drop: use ghost position or calculate from mouse
  const handleCalDrop = useCallback(async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const clampedMinutes = ghostPreview?.topMinutes ?? getMinutesFromMouseY(e) ?? 480;
    setGhostPreview(null);

    if (dragging) {
      const task = tasks.find((t) => t.id === dragging);
      if (!task) return;

      // If this task already has a DB record (from brain dump), update it instead of creating new
      let dbId: number | undefined = task.dbId;
      if (studentId) {
        if (dbId) {
          // Update existing brain dump record to be a calendar event
          await updateReceptacleEvent(dbId, {
            date: dateStr,
            top_minutes: clampedMinutes,
          });
        } else {
          const saved = await addReceptacleEvent(studentId, {
            task_text: task.text,
            minutes: task.minutes,
            date: dateStr,
            top_minutes: clampedMinutes,
            quadrant: task.quadrant || undefined,
          });
          if (saved) dbId = saved.id;
        }
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

      // Re-sync to Google Calendar if connected (update existing event, don't create duplicate)
      if (profileId && gcalConnected && existingEvent) {
        updateGoogleCalendarEvent(profileId, existingEvent.text, dateStr, clampedMinutes, existingEvent.minutes);
      }
    }
  }, [dragging, draggingEvent, tasks, studentId, profileId, gcalConnected, calEvents, ghostPreview, getMinutesFromMouseY]);

  const removeEvent = (taskId: string) => {
    const ev = calEvents.find((e) => e.taskId === taskId);
    if (ev?.dbId) {
      deleteReceptacleEvent(ev.dbId);
    }
    setCalEvents((p) => p.filter((e) => e.taskId !== taskId));
  };

  const changeEventColor = (taskId: string, colorKey: string) => {
    setCalEvents((p) => p.map((ev) => ev.taskId === taskId ? { ...ev, color: colorKey } : ev));
    setColorPickerFor(null);
    const ev = calEvents.find((e) => e.taskId === taskId);
    if (ev?.dbId) {
      updateReceptacleEvent(ev.dbId, { quadrant: `color:${colorKey}` } as any);
    }
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

  const resetAll = async () => {
    // Delete all brain dump tasks from DB
    if (studentId) {
      for (const t of tasks) {
        if (t.dbId) await deleteReceptacleEvent(t.dbId);
      }
      for (const e of calEvents) {
        if (e.dbId) await deleteReceptacleEvent(e.dbId);
      }
    }
    setStep(1); setTasks([]); setInputText(""); setInputMins("");
    setSelectedTask(null); setCalEvents([]); setDayOffset(0);
    setCompleted(new Set()); setSyncDone(false);
  };

  const card: React.CSSProperties = {
    background: "#252525", border: "1px solid #2a2a2a", borderRadius: 16, padding: 20,
  };

  // Derived: DO tasks split by sub-type
  const doTasks = tasksInSection("do");
  const doQuickTasks = doTasks.filter((t) => t.isQuick);
  const doScheduleTasks = doTasks.filter((t) => !t.isQuick);

  return (
    <div>
      <PageHeader
        title="Planning"
        sub="The 3-timer daily planning algorithm. Capture, prioritize, and schedule your work."
      />

      <div className="px-8 pb-8">
        {/* Step tabs — hidden during daily review */}
        {step !== 0 && (
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
                  background: active ? "#528bff" : done ? "rgba(74,186,106,0.08)" : "#252525",
                  color: active ? "#fff" : done ? "#4aba6a" : "#717171",
                  borderRight: n < 3 ? "1px solid #e2e8f0" : "none",
                }}>
                {done ? "✓ " : ""}{label}
              </button>
            );
          })}
        </div>
        )}

        {/* ── STEP 0: DAILY REVIEW ── */}
        {step === 0 && reviewItems.length > 0 && (
          <div>
            <div style={{ ...card, border: "1.5px solid rgba(229,168,59,0.2)", background: "rgba(229,168,59,0.03)" }}>
              <div className="flex gap-4 mb-4">
                <div className="text-3xl">🌅</div>
                <div>
                  <h2 className="text-xl font-bold text-heading m-0">Daily Review</h2>
                  <p className="text-sm text-sub m-0 mt-1">
                    You have <strong>{reviewItems.length} unfinished task{reviewItems.length !== 1 ? "s" : ""}</strong> from previous days. Check off what you completed, the rest will carry over.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-5">
                {reviewItems.map((ev) => {
                  const checked = reviewChecked.has(ev.taskId);
                  return (
                    <label key={ev.taskId}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: checked ? "rgba(74,186,106,0.06)" : "#252525",
                        border: checked ? "1px solid rgba(74,186,106,0.2)" : "1px solid #333",
                        opacity: checked ? 0.6 : 1,
                      }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setReviewChecked((prev) => {
                            const n = new Set(prev);
                            checked ? n.delete(ev.taskId) : n.add(ev.taskId);
                            return n;
                          });
                        }}
                        className="flex-shrink-0 cursor-pointer"
                        style={{ accentColor: "#4aba6a", width: 16, height: 16 }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: checked ? "#4aba6a" : "#ebebeb", textDecoration: checked ? "line-through" : "none" }}>
                          {ev.text}
                        </div>
                        <div className="text-xs text-sub mt-0.5">
                          {ev.date} at {fmtMinutes(ev.topMinutes)} · {ev.minutes}m
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: checked ? "rgba(74,186,106,0.1)" : "rgba(229,168,59,0.1)", color: checked ? "#4aba6a" : "#e5a83b" }}>
                        {checked ? "Done" : "Carry over"}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-sub">
                  {reviewChecked.size} of {reviewItems.length} completed
                </div>
                <button
                  onClick={() => {
                    // Mark checked items as completed in DB
                    for (const ev of reviewItems) {
                      if (reviewChecked.has(ev.taskId)) {
                        setCompleted((p) => { const n = new Set(p); n.add(ev.taskId); return n; });
                        if (ev.dbId) updateReceptacleEvent(ev.dbId, { completed: true });
                      }
                      // Unchecked items stay as-is (backlog)
                    }
                    setStep(1);
                    setReviewItems([]);
                    setReviewChecked(new Set());
                  }}
                  className="px-5 py-2.5 rounded-full border-none cursor-pointer text-sm font-semibold"
                  style={{ background: "#528bff", color: "#fff" }}
                >
                  Continue to Brain Dump →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <div style={card}>
              <div className="flex gap-4 mb-4">
                <div className="text-3xl">🧠</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-heading m-0">Planning</h2>
                    <button onClick={() => setShowHelp(!showHelp)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer border-none"
                      style={{ background: "rgba(82,139,255,0.1)", color: "#528bff" }}>?</button>
                  </div>
                  <p className="text-sm text-sub mt-1 m-0">Write down everything on your mind. Be specific!</p>
                </div>
              </div>

              {/* Help/instructions panel */}
              {showHelp && (
                <div className="mb-4 p-4 rounded-lg" style={{ background: "rgba(82,139,255,0.04)", border: "1px solid rgba(82,139,255,0.15)" }}>
                  <p className="text-sm text-body m-0 mb-2">
                    <em style={{ color: "#a480f2" }}>Try to define the exact task, scope, and output format for each task. For example, &quot;write history paper draft&quot; becomes:</em>
                  </p>
                  <ul className="m-0 pl-5 text-sm" style={{ color: "#a0a0a0" }}>
                    <li className="mb-1"><em>Find 3 primary sources on &quot;Was the Treaty of Versailles a cause of WWII?&quot; (45m)</em></li>
                    <li className="mb-1"><em>Write three iterations of a project thesis (30m)</em></li>
                    <li><em>Write first 5 pages of draft v1 (90m)</em></li>
                  </ul>
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <input value={inputText} onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="What's on your mind?"
                  className="flex-1 px-4 py-3 rounded-lg text-sm"
                  style={{ border: "1.5px solid #e2e8f0", outline: "none", color: "#ebebeb" }} />
                <input value={inputMins} onChange={(e) => setInputMins(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="min"
                  className="w-16 px-3 py-3 rounded-lg text-sm text-center"
                  style={{ border: "1.5px solid #e2e8f0", outline: "none", color: "#ebebeb" }} />
                <button onClick={addTask}
                  style={{ padding: "0 18px", borderRadius: 10, border: "none", background: "#ebebeb", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >+ Add</button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-10 text-sm text-sub rounded-lg" style={{ border: "2px dashed #e2e8f0" }}>
                  Start adding tasks above — don&apos;t think, just capture everything.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-lg group" style={{ background: "#252525", border: "1px solid #2a2a2a" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#505050" }} />
                        <span className="text-sm text-body truncate">{t.text}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(82,139,255,0.06)", color: "#528bff" }}>{t.minutes}m</span>
                        <button onClick={() => { if (t.dbId) deleteReceptacleEvent(t.dbId); setTasks((p) => p.filter((x) => x.id !== t.id)); }} className="text-xs opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer" style={{ color: "#e55b5b" }}>✕</button>
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
                style={{ padding: "12px 24px", borderRadius: 12, border: "none", cursor: tasks.length === 0 ? "not-allowed" : "pointer", background: tasks.length === 0 ? "#333" : "#ebebeb", color: tasks.length === 0 ? "#505050" : "#111", fontWeight: 600, fontSize: 13 }}
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
                        style={{ background: selectedTask === t.id ? "#528bff" : "#252525", color: selectedTask === t.id ? "#fff" : "#a0a0a0", border: `1.5px solid ${selectedTask === t.id ? "#528bff" : "#333"}` }}>
                        <div className="font-medium truncate">{t.text}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: selectedTask === t.id ? "rgba(255,255,255,0.55)" : "#505050" }}>{t.minutes} min</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matrix - 2x2 grid: DO(tl) SCHEDULE(tr) DELEGATE(bl) DELETE(br) */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {QUADRANT_ORDER.map((key) => {
                    const cfg = QUADRANT_CONFIG[key];
                    const placed = tasks.filter((t) => t.quadrant === key);

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
                              <span className="text-xs truncate" style={{ color: key === "delete" ? "#505050" : "#a0a0a0" }}>{t.text}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                <span className="text-[9px]" style={{ color: "#505050" }}>{t.minutes}m</span>
                                <button onClick={(e) => { e.stopPropagation(); unassign(t.id); }} className="opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer text-xs" style={{ color: "#505050" }}>↩</button>
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
              <button onClick={() => setStep(1)} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #333", cursor: "pointer", background: "#252525", color: "#717171", fontWeight: 600, fontSize: 13 }}>← Back</button>
              <button onClick={() => setStep(3)} style={{ padding: "12px 24px", borderRadius: 15, border: "none", cursor: "pointer", background: "#528bff", color: "#fff", fontWeight: 600, fontSize: 13 }}>Next: Calendar Sync →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div onClick={() => setColorPickerFor(null)}>
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
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, flexShrink: 0, cursor: (calEvents.length === 0 || syncDone) ? "not-allowed" : "pointer", background: syncDone ? "rgba(74,186,106,0.1)" : calEvents.length === 0 ? "#333" : "#528bff", color: syncDone ? "#4aba6a" : calEvents.length === 0 ? "#505050" : "#fff" }}>
                    {syncDone ? "✓ Synced!" : syncing ? "Syncing..." : "📅 Sync to Google Cal"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
              {/* ── 3-Day Calendar (free-form positioning) ── */}
              <div ref={calRef} style={{ flex: 1, ...card, padding: 0, overflow: "hidden", minWidth: 0 }}>
                {/* Nav */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-line" style={{ background: "#252525" }}>
                  <button onClick={() => setDayOffset((o) => o - 3)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a", cursor: "pointer", background: "#252525", color: "#a0a0a0", fontWeight: 600 }}>‹</button>
                  <div className="text-sm font-semibold text-heading">
                    {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {days[2].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setDayOffset(0)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #2a2a2a", cursor: "pointer", background: "#252525", color: "#a0a0a0", fontSize: 12, fontWeight: 600 }}>Today</button>
                    <button onClick={() => setDayOffset((o) => o + 3)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a", cursor: "pointer", background: "#252525", color: "#a0a0a0", fontWeight: 600 }}>›</button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid border-b border-line" style={{ gridTemplateColumns: "52px repeat(3, 1fr)" }}>
                  <div style={{ background: "#252525" }} />
                  {days.map((d, i) => {
                    const isToday = fmt(d) === fmt(new Date());
                    return (
                      <div key={i} className="text-center py-2 border-l border-line" style={{ background: "#252525" }}>
                        <div className="text-[10px] font-semibold text-sub uppercase">{DAY_LABELS[d.getDay()]}</div>
                        <div className="text-sm font-bold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                          style={{ background: isToday ? "#528bff" : "transparent", color: isToday ? "#fff" : "#ebebeb" }}>
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
                          style={{ height: HOUR_HEIGHT, paddingTop: 4, background: "#1e1e1e", lineHeight: 1 }}>
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
                              onDragOver={(e) => handleCalDragOver(e, dateStr)}
                              onDragLeave={handleCalDragLeave}
                              onDrop={(e) => handleCalDrop(e, dateStr)}>
                              {/* Ghost preview */}
                              {ghostPreview && ghostPreview.date === dateStr && ghostPreview.topMinutes >= cellStartMin && ghostPreview.topMinutes < cellEndMin && (
                                <>
                                  {/* Ghost block on calendar */}
                                  <div className="absolute left-0.5 right-0.5 rounded-md z-20 overflow-visible pointer-events-none"
                                    style={{
                                      top: ((ghostPreview.topMinutes - cellStartMin) / 60) * HOUR_HEIGHT,
                                      height: Math.max(minutesToHeight(ghostPreview.minutes), 36),
                                      background: "rgba(82,139,255,0.10)",
                                      border: "2px dashed #528bff",
                                      transition: "top 0.06s ease-out",
                                    }}>
                                    <div className="px-1.5 pt-1">
                                      <div className="text-[10px] font-semibold truncate" style={{ color: "#7aabff" }}>{ghostPreview.text}</div>
                                    </div>
                                  </div>
                                  {/* Floating time badge - anchored to left edge */}
                                  <div className="absolute z-30 pointer-events-none"
                                    style={{
                                      top: ((ghostPreview.topMinutes - cellStartMin) / 60) * HOUR_HEIGHT - 2,
                                      left: -54,
                                      width: 52,
                                    }}>
                                    <div className="rounded-md px-1 py-0.5 text-right"
                                      style={{ background: "#528bff", fontSize: 9, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                                      {fmtMinutes(ghostPreview.topMinutes)}
                                    </div>
                                    <div className="text-right mt-0.5" style={{ fontSize: 8, color: "#528bff", fontWeight: 600 }}>
                                      {ghostPreview.minutes}m
                                    </div>
                                  </div>
                                </>
                              )}
                              {/* Google Calendar events (background, non-interactive) */}
                              {googleEvents
                                .filter((ge: any) => ge.date === dateStr && ge.startMinutes != null && ge.startMinutes >= cellStartMin && ge.startMinutes < cellEndMin)
                                .map((ge: any) => {
                                  const offsetMin = ge.startMinutes - cellStartMin;
                                  const topPx = (offsetMin / 60) * HOUR_HEIGHT;
                                  const dur = ge.durationMinutes || 30;
                                  return (
                                    <div key={`gcal-${ge.id}`}
                                      className="absolute left-0.5 right-0.5 rounded-md px-1.5 pt-1 z-0 overflow-hidden pointer-events-none"
                                      style={{ top: topPx, height: minutesToHeight(dur), background: "rgba(74,186,106,0.06)", border: "1px dashed rgba(74,186,106,0.25)" }}>
                                      <div className="text-[9px] font-medium leading-tight truncate" style={{ color: "#4aba6a" }}>{ge.title}</div>
                                      <div className="text-[8px] mt-0.5" style={{ color: "rgba(74,186,106,0.5)" }}>{fmtMinutes(ge.startMinutes)} · {dur}m</div>
                                    </div>
                                  );
                                })}
                              {/* Whetstone events */}
                              {eventsHere.map((ev) => {
                                const offsetMin = ev.topMinutes - cellStartMin;
                                const topPx = (offsetMin / 60) * HOUR_HEIGHT;
                                const isDone = completed.has(ev.taskId);
                                const ec = isDone ? { bg: "rgba(74,186,106,0.06)", border: "rgba(74,186,106,0.4)", text: "#4aba6a" } : getEC(ev.color);
                                return (
                                  <div key={ev.taskId} draggable={!isDone}
                                    onDragStart={() => !isDone && setDraggingEvent(ev.taskId)}
                                    onDragEnd={() => { setDraggingEvent(null); setGhostPreview(null); }}
                                    className="absolute left-0.5 right-0.5 rounded-md px-1.5 pt-1 group z-10 overflow-visible"
                                    style={{
                                      top: topPx,
                                      height: minutesToHeight(ev.minutes),
                                      background: ec.bg,
                                      borderLeft: `3px solid ${ec.border}`,
                                      opacity: isDone ? 0.4 : 1,
                                      cursor: isDone ? "default" : "grab",
                                    }}>
                                    <div className="text-[10px] font-semibold leading-tight truncate pr-8"
                                      style={{ color: ec.text, textDecoration: isDone ? "line-through" : "none" }}>{ev.text}</div>
                                    <div className="text-[9px] mt-0.5" style={{ color: ec.border, opacity: 0.7 }}>
                                      {fmtMinutes(ev.topMinutes)} · {ev.minutes}m{ev.synced ? " · synced" : ""}
                                    </div>
                                    {/* Hover actions */}
                                    <div className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5">
                                      {!isDone && (
                                        <button onClick={(e) => { e.stopPropagation(); setColorPickerFor(colorPickerFor === ev.taskId ? null : ev.taskId); }}
                                          className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center border-none cursor-pointer"
                                          style={{ background: ec.border }}>
                                          <span style={{ color: "#fff" }}>●</span>
                                        </button>
                                      )}
                                      <button onClick={() => removeEvent(ev.taskId)}
                                        className="w-4 h-4 rounded text-[9px] flex items-center justify-center border-none cursor-pointer"
                                        style={{ background: "rgba(229,91,91,0.2)", color: "#e55b5b" }}>✕</button>
                                    </div>
                                    {/* Color picker */}
                                    {colorPickerFor === ev.taskId && (
                                      <div className="absolute top-full right-0 mt-1 z-50 rounded-lg p-1.5 flex gap-1 flex-wrap"
                                        style={{ background: "#1e1e1e", border: "1px solid #333", width: 92, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                                        onClick={(e) => e.stopPropagation()}>
                                        {EVENT_COLORS.map((c) => (
                                          <button key={c.key}
                                            onClick={() => changeEventColor(ev.taskId, c.key)}
                                            className="w-5 h-5 rounded-full border-none cursor-pointer"
                                            style={{ background: c.border, outline: ev.color === c.key ? "2px solid #fff" : "none", outlineOffset: 1 }}
                                          />
                                        ))}
                                      </div>
                                    )}
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

              {/* ── Task Bar (right) — Sunsama-style todo list ── */}
              <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 640 }}>

                {/* Quick DO tasks — selected via popup */}
                {doQuickTasks.length > 0 && (
                  <div style={{ ...card, background: "rgba(229,91,91,0.05)", border: "1px solid rgba(229,91,91,0.15)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#e55b5b" }}>⚡ PLEASE DO NOW</div>
                    <div className="flex flex-col gap-1">
                      {doQuickTasks.map((t) => {
                        const done = completed.has(t.id);
                        return (
                          <label key={t.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer"
                            style={{ background: done ? "transparent" : "rgba(255,255,255,0.03)" }}>
                            <input type="checkbox" checked={done} onChange={() => toggleComplete(t.id)}
                              style={{ accentColor: "#4aba6a", width: 14, height: 14, flexShrink: 0 }} />
                            <span className="text-xs font-medium truncate" style={{ color: done ? "#505050" : "#ebebeb", textDecoration: done ? "line-through" : "none" }}>{t.text}</span>
                            <span className="text-[9px] ml-auto pl-2 flex-shrink-0" style={{ color: "#717171" }}>{t.minutes}m</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Schedule & Do (from DO quadrant) */}
                {doScheduleTasks.length > 0 && (
                  <div style={card}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#e55b5b" }}>
                      🔥 Do
                    </div>
                    <div className="flex flex-col gap-1">
                      {doScheduleTasks.map((t) => {
                        const onCal = scheduledIds.has(t.id);
                        const done = completed.has(t.id);
                        const ce = getCalEvent(t.id);
                        return (
                          <div key={t.id}
                            draggable={!onCal && !done}
                            onDragStart={() => !onCal && !done && setDragging(t.id)}
                            onDragEnd={() => { setDragging(null); setGhostPreview(null); }}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg select-none"
                            style={{ background: done ? "transparent" : onCal ? "rgba(255,255,255,0.02)" : "#252525", border: `1px solid ${done ? "transparent" : onCal ? "#2a2a2a" : "#333"}`, cursor: done ? "default" : onCal ? "default" : "grab", opacity: done ? 0.4 : onCal ? 0.55 : 1 }}>
                            <input type="checkbox" checked={done} onChange={() => toggleComplete(t.id)}
                              className="flex-shrink-0 cursor-pointer" style={{ accentColor: "#4aba6a", width: 14, height: 14 }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate" style={{ color: done ? "#505050" : "#ebebeb", textDecoration: done ? "line-through" : "none" }}>{t.text}</div>
                              {onCal && ce && <div className="text-[9px]" style={{ color: "#717171" }}>{fmtMinutes(ce.topMinutes)} · {ce.date}</div>}
                            </div>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>{t.minutes}m</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Schedule (blue) */}
                <div style={card}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#528bff" }}>
                    📅 Schedule
                  </div>
                  <div className="flex flex-col gap-1">
                    {tasksInSection("schedule").length === 0 && (
                      <div className="text-xs text-sub text-center py-3" style={{ border: "1px dashed #333", borderRadius: 8 }}>No scheduled tasks</div>
                    )}
                    {tasksInSection("schedule").map((t) => {
                      const onCal = scheduledIds.has(t.id);
                      const done = completed.has(t.id);
                      const ce = getCalEvent(t.id);
                      return (
                        <div key={t.id}
                          draggable={!onCal && !done}
                          onDragStart={() => !onCal && !done && setDragging(t.id)}
                          onDragEnd={() => { setDragging(null); setGhostPreview(null); }}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg select-none"
                          style={{ background: done ? "transparent" : onCal ? "rgba(255,255,255,0.02)" : "#252525", border: `1px solid ${done ? "transparent" : onCal ? "#2a2a2a" : "#333"}`, cursor: done ? "default" : onCal ? "default" : "grab", opacity: done ? 0.4 : onCal ? 0.55 : 1 }}>
                          <input type="checkbox" checked={done} onChange={() => toggleComplete(t.id)}
                            className="flex-shrink-0 cursor-pointer" style={{ accentColor: "#4aba6a", width: 14, height: 14 }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: done ? "#505050" : "#ebebeb", textDecoration: done ? "line-through" : "none" }}>{t.text}</div>
                            {onCal && ce && <div className="text-[9px]" style={{ color: "#717171" }}>{fmtMinutes(ce.topMinutes)} · {ce.date}</div>}
                          </div>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(82,139,255,0.06)", color: "#528bff" }}>{t.minutes}m</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delegate (amber) */}
                <div style={card}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#e5a83b" }}>
                    🤝 Delegate
                  </div>
                  <div className="flex flex-col gap-1">
                    {tasksInSection("delegate").length === 0 && (
                      <div className="text-xs text-sub text-center py-3" style={{ border: "1px dashed #333", borderRadius: 8 }}>No delegate tasks</div>
                    )}
                    {tasksInSection("delegate").map((t) => {
                      const onCal = scheduledIds.has(t.id);
                      const done = completed.has(t.id);
                      const ce = getCalEvent(t.id);
                      return (
                        <div key={t.id}
                          draggable={!onCal && !done}
                          onDragStart={() => !onCal && !done && setDragging(t.id)}
                          onDragEnd={() => { setDragging(null); setGhostPreview(null); }}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg select-none"
                          style={{ background: done ? "transparent" : onCal ? "rgba(255,255,255,0.02)" : "#252525", border: `1px solid ${done ? "transparent" : onCal ? "#2a2a2a" : "#333"}`, cursor: done ? "default" : onCal ? "default" : "grab", opacity: done ? 0.4 : onCal ? 0.55 : 1 }}>
                          <input type="checkbox" checked={done} onChange={() => toggleComplete(t.id)}
                            className="flex-shrink-0 cursor-pointer" style={{ accentColor: "#4aba6a", width: 14, height: 14 }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: done ? "#505050" : "#ebebeb", textDecoration: done ? "line-through" : "none" }}>{t.text}</div>
                            {onCal && ce && <div className="text-[9px]" style={{ color: "#717171" }}>{fmtMinutes(ce.topMinutes)} · {ce.date}</div>}
                          </div>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(229,168,59,0.08)", color: "#e5a83b" }}>{t.minutes}m</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* ── Backlog: uncompleted tasks from past days ── */}
            {(() => {
              const todayStr = fmt(new Date());
              const backlogEvents = calEvents.filter((ev) =>
                ev.date < todayStr && !completed.has(ev.taskId)
              );
              if (backlogEvents.length === 0) return null;
              return (
                <div className="mt-3.5" style={{ ...card, border: "1.5px solid rgba(229,168,59,0.2)", background: "rgba(229,168,59,0.04)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">📋</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#e5a83b" }}>
                        Backlog
                        <span className="ml-1.5 font-semibold normal-case tracking-normal" style={{ color: "#a0a0a0" }}>
                          ({backlogEvents.length} unfinished task{backlogEvents.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="text-[10px] text-sub mt-0.5">Drag onto the calendar to reschedule, or check off to complete.</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {backlogEvents.map((ev) => (
                      <div key={`bl-${ev.taskId}`}
                        draggable
                        onDragStart={() => setDraggingEvent(ev.taskId)}
                        onDragEnd={() => { setDraggingEvent(null); setGhostPreview(null); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg select-none"
                        style={{ background: "#252525", border: "1.5px solid #333", cursor: "grab" }}>
                        <input type="checkbox" checked={false}
                          onChange={() => toggleComplete(ev.taskId)}
                          className="flex-shrink-0 cursor-pointer"
                          style={{ accentColor: "#4aba6a", width: 14, height: 14 }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: "#ebebeb" }}>{ev.text}</div>
                          <div className="text-[10px]" style={{ color: "#717171" }}>
                            Was: {ev.date} at {fmtMinutes(ev.topMinutes)} · {ev.minutes}m
                          </div>
                        </div>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "rgba(229,168,59,0.15)", color: "#e5a83b" }}>
                          {ev.minutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-sub">
                {calEvents.length} event{calEvents.length !== 1 ? "s" : ""} scheduled
                {completed.size > 0 && ` · ${completed.size} done`}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #333", cursor: "pointer", background: "#252525", color: "#717171", fontWeight: 600, fontSize: 13 }}>← Back</button>
                <button onClick={resetAll} style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", background: "#333", color: "#a0a0a0", fontWeight: 600, fontSize: 13 }}>↺ Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick tasks popup removed — handled via doSub assignment in step 2 */}
    </div>
  );
}