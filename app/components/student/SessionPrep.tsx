"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { PageHeader } from "../ui/PageHeader";
import { addDeadline, fetchCounselorEventsForStudent } from "../../lib/queries";
import { useState, useEffect } from "react";

interface SessionPrepProps {
  student: Student;
  onRefresh?: () => void;
}

export function SessionPrep({ student, onRefresh }: SessionPrepProps) {
  const [viewMode, setViewMode] = useState<"sessions" | "commit">("sessions");
  const [sessionTab, setSessionTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<any[]>([]);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);

  useEffect(() => {
    if (student.id) {
      fetchCounselorEventsForStudent(student.id).then(setEvents);
    }
  }, [student.id]);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcoming = events.filter((e) => e.date >= todayStr).sort((a: any, b: any) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.date < todayStr).sort((a: any, b: any) => b.date.localeCompare(a.date));
  const displayEvents = sessionTab === "upcoming" ? upcoming : past;

  const SPECIALISTS = [
    "Cole Whetstone",
    "Stephanie Whetstone",
    "Eric Newman",
    "Christopher Colby",
    "Brigitte Gemme",
    "Howard Rogatnick",
    "Ren Yu",
    "Athena Huo",
  ];

  const [activeRecall, setActiveRecall] = useState("");
  const [actions, setActions] = useState([
    { title: "", due: "", description: "" },
    { title: "", due: "", description: "" },
    { title: "", due: "", description: "" },
  ]);
  const [sessionType, setSessionType] = useState<"online" | "in-person">("online");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#252525",
    border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const updateAction = (i: number, field: string, value: string) => {
    setActions((prev) => prev.map((a, j) => j === i ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async () => {
    setSaving(true);
    // Save actions as deadlines
    for (const action of actions) {
      if (action.title.trim() && action.due) {
        await addDeadline(student.id, {
          title: action.title,
          due: action.due,
          category: "planning",
          status: "pending",
          days: Math.round((new Date(action.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          created_by: "student",
        });
      }
    }
    if (onRefresh) await onRefresh();
    setSaving(false);
    setSaved(true);
  };

  return (
    <div>
      <PageHeader
        title="Sessions"
        sub={viewMode === "sessions" ? "Your upcoming and past sessions." : "Wrap up your session with action items."}
        right={
          <div className="flex items-center gap-3">
            {viewMode === "sessions" && (
              <button onClick={() => setShowBooking(true)}
                className="px-4 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
                style={{ background: "#528bff", color: "#fff" }}>
                + Book a Session
              </button>
            )}
            <div className="inline-flex gap-0.5 bg-white border border-line rounded-full p-1">
              {(["sessions", "commit"] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className="px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
                  style={{ background: viewMode === m ? "#528bff" : "transparent", color: viewMode === m ? "#fff" : "#717171" }}>
                  {m === "sessions" ? "Sessions" : "Closing Commit"}
                </button>
              ))}
            </div>
            {viewMode === "commit" && (
              <div className="inline-flex gap-0.5 bg-white border border-line rounded-full p-1">
                {(["online", "in-person"] as const).map((t) => (
                  <button key={t} onClick={() => setSessionType(t)}
                    className="px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
                    style={{ background: sessionType === t ? "#528bff" : "transparent", color: sessionType === t ? "#fff" : "#717171" }}>
                    {t === "online" ? "💻 Online" : "🤝 In-Person"}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* ── Sessions List View ── */}
      {viewMode === "sessions" && (
        <div className="p-6 px-8" style={{ maxWidth: 720 }}>
          {/* Upcoming / Past toggle */}
          <div className="flex gap-0.5 mb-5 p-0.5 rounded-full" style={{ background: "#1e1e1e", display: "inline-flex" }}>
            {(["upcoming", "past"] as const).map((tab) => (
              <button key={tab} onClick={() => setSessionTab(tab)}
                className="px-5 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
                style={{ background: sessionTab === tab ? "#528bff" : "transparent", color: sessionTab === tab ? "#fff" : "#717171" }}>
                {tab === "upcoming" ? "Upcoming" : "Past"}
              </button>
            ))}
          </div>

          <p className="text-xs text-sub mb-4">Tap the session cards below to view the notes.</p>

          {displayEvents.length === 0 && (
            <Card>
              <p className="text-sm text-sub text-center py-6">
                {sessionTab === "upcoming" ? "No upcoming sessions scheduled." : "No past sessions found."}
              </p>
            </Card>
          )}

          {/* Group by date */}
          {(() => {
            const byDate: Record<string, any[]> = {};
            for (const ev of displayEvents) {
              const key = ev.date;
              if (!byDate[key]) byDate[key] = [];
              byDate[key].push(ev);
            }
            return Object.entries(byDate).map(([date, evs]) => (
              <div key={date} className="mb-5">
                <div className="text-sm font-bold text-heading mb-2">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="flex flex-col gap-2">
                  {evs.map((ev: any) => (
                    <div key={ev.id} className="p-4 rounded-xl flex items-center justify-between"
                      style={{ background: "#252525", borderLeft: "3px solid #528bff" }}>
                      <div>
                        <div className="text-sm font-semibold text-heading">{ev.title}</div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: "rgba(82,139,255,0.1)", color: "#528bff" }}>
                            {student.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                          </div>
                          <span className="text-xs text-sub">{student.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: ev.date < todayStr ? "rgba(74,186,106,0.08)" : "rgba(229,168,59,0.08)",
                            color: ev.date < todayStr ? "#4aba6a" : "#e5a83b",
                          }}>
                          {ev.date < todayStr ? "Completed" : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── Closing Commit View ── */}
      {viewMode === "commit" && (
      <div className="p-6 px-8" style={{ maxWidth: 720 }}>
        {saved ? (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-heading mb-2">Session Committed!</h2>
              <p className="text-sm text-sub mb-4">Your action items have been added to your deadlines.</p>
              <Button primary onClick={() => { setSaved(false); setActions([{ title: "", due: "", description: "" }, { title: "", due: "", description: "" }, { title: "", due: "", description: "" }]); setActiveRecall(""); }}>
                Start New Session
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Session info */}
            <Card className="mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{sessionType === "online" ? "💻" : "🤝"}</div>
                <div>
                  <div className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: "#528bff" }}>
                    {sessionType === "online" ? "Online Session" : "In-Person Session"}
                  </div>
                  <div className="text-lg font-bold text-heading">with {student.counselor}</div>
                  <div className="text-sm text-sub">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>
            </Card>

            {/* Active Recall */}
            <Card className="mb-4">
              <h3 className="text-base font-bold text-heading mb-1">🧠 Active Recall</h3>
              <p className="text-xs text-sub mb-3">What are the key takeaways from this session? Write from memory — don't look at notes.</p>
              <textarea
                value={activeRecall}
                onChange={(e) => setActiveRecall(e.target.value)}
                placeholder="What did we discuss? What did I learn? What surprised me?"
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
              />
            </Card>

            {/* Three Essential Actions */}
            <Card className="mb-4">
              <h3 className="text-base font-bold text-heading mb-1">📋 Three Essential Actions</h3>
              <p className="text-xs text-sub mb-4">Commit to exactly three things you'll do before the next session. These will be added to your Roadmap deadlines.</p>

              <div className="flex flex-col gap-4">
                {actions.map((a, i) => (
                  <div key={i} className="rounded-lg p-4" style={{ background: "#252525", border: "1px solid #333" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: a.title.trim() ? "rgba(82,139,255,0.1)" : "#333", color: a.title.trim() ? "#528bff" : "#717171" }}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-semibold text-sub uppercase tracking-wider">Action {i + 1}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        value={a.title}
                        onChange={(e) => updateAction(i, "title", e.target.value)}
                        placeholder={`What will you do? ${i === 0 ? "(e.g. Draft Common App essay)" : ""}`}
                        style={inputStyle}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={a.due}
                          onChange={(e) => updateAction(i, "due", e.target.value)}
                          style={inputStyle}
                        />
                        <input
                          value={a.description}
                          onChange={(e) => updateAction(i, "description", e.target.value)}
                          placeholder="Notes (optional)"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button primary onClick={handleSubmit} disabled={saving || actions.every((a) => !a.title.trim())}>
                {saving ? "Saving..." : "Commit Actions →"}
              </Button>
            </div>
          </>
        )}
      </div>
      )}

      {/* ── Book a Session Modal — Cal.com style ── */}
      {showBooking && (
        <Modal title="New Booking Request" onClose={() => setShowBooking(false)}>
          <CalBookingForm
            student={student}
            specialists={SPECIALISTS}
            inputStyle={inputStyle}
            onBook={async (data) => {
              setBookingSaving(true);
              try {
                const res = await fetch("/api/book-session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ studentId: student.id, ...data }),
                });
                const result = await res.json();
                if (result.success) {
                  if (onRefresh) await onRefresh();
                  fetchCounselorEventsForStudent(student.id).then(setEvents);
                  setShowBooking(false);
                } else {
                  alert("Failed to book: " + (result.error || "Unknown error"));
                }
              } catch { alert("Booking failed."); }
              setBookingSaving(false);
            }}
            saving={bookingSaving}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Cal.com-style Booking Form ──
const COHORTS = [
  { id: "harvard-a", name: "Harvard A" },
  { id: "harvard-b", name: "Harvard B" },
];

const TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let h = 9; h <= 20; h++) {
    for (const m of [0, 30]) {
      const hr = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "pm" : "am";
      slots.push(`${hr}:${String(m).padStart(2, "0")} ${ampm}`);
    }
  }
  return slots;
})();

function CalBookingForm({ student, specialists, inputStyle, onBook, saving }: {
  student: any; specialists: string[]; inputStyle: React.CSSProperties;
  onBook: (data: any) => Promise<void>; saving: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1); // 1=date/time, 2=details
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [sessionType, setSessionType] = useState("strategy");
  const [bookingType, setBookingType] = useState<"individual" | "recurring">("individual");
  const [specialist, setSpecialist] = useState(specialists[0] || "");
  const [sessionName, setSessionName] = useState("");
  const [notes, setNotes] = useState("");
  const [cohort, setCohort] = useState("");
  const [duration, setDuration] = useState(30);

  // Calendar generation
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(calMonth.year, calMonth.month, 1).getDay();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthLabel = new Date(calMonth.year, calMonth.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setCalMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setCalMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  const getDateStr = (day: number) => `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedDayOfWeek = selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }) : "";
  const selectedDayNum = selectedDate ? parseInt(selectedDate.split("-")[2]) : 0;

  if (step === 2) {
    return (
      <div>
        <div className="mb-4 p-3 rounded-lg" style={{ background: "#252525", borderLeft: "3px solid #528bff" }}>
          <div className="text-xs text-sub">Selected</div>
          <div className="text-sm font-semibold text-heading">{selectedDate} at {selectedTime}</div>
          <div className="text-xs text-sub mt-0.5">Duration: {duration}m · <button className="bg-transparent border-none cursor-pointer text-xs" style={{ color: "#528bff" }} onClick={() => setStep(1)}>Change</button></div>
        </div>

        <FormField label="Booking with">
          <select value={specialist} onChange={(e) => setSpecialist(e.target.value)} style={inputStyle}>
            {specialists.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>

        <FormField label="Session name">
          <input value={sessionName || `Session with ${specialist}`} onChange={(e) => setSessionName(e.target.value)} style={inputStyle} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <div className="flex gap-3 mt-1">
              {(["individual", "recurring"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={bookingType === t} onChange={() => setBookingType(t)} style={{ accentColor: "#528bff" }} />
                  <span className="text-xs text-body">{t === "individual" ? "Individual" : "Recurring"}</span>
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="Session type">
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} style={inputStyle}>
              <option value="strategy">Strategy Meeting</option>
              <option value="essay_review">Essay Review</option>
              <option value="application_review">Application Review</option>
              <option value="test_prep">Test Prep</option>
              <option value="check_in">Check-in</option>
              <option value="cohort">Cohort Session</option>
            </select>
          </FormField>
        </div>

        {/* Cohort selection */}
        <FormField label="Cohort (optional — for group sessions)">
          <select value={cohort} onChange={(e) => setCohort(e.target.value)} style={inputStyle}>
            <option value="">No cohort (individual)</option>
            {COHORTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>

        {bookingType === "recurring" && (
          <FormField label="Recurrence">
            <select style={inputStyle} name="recurrence" defaultValue="biweekly">
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </FormField>
        )}

        <FormField label="Quick note">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any context..." style={{ ...inputStyle, resize: "vertical" }} />
        </FormField>

        <div className="flex gap-2 justify-end mt-3">
          <button onClick={() => setStep(1)} className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer" style={{ background: "#252525", color: "#717171", border: "1px solid #333" }}>← Back</button>
          <button onClick={() => onBook({
            date: selectedDate, start_time: selectedTime, end_time: "",
            session_name: sessionName || `Session with ${specialist}`,
            session_type: sessionType, booking_type: bookingType,
            specialist, notes, cohort: cohort || undefined,
          })} disabled={saving}
            className="px-5 py-2 rounded-full text-sm font-semibold cursor-pointer border-none"
            style={{ background: "#528bff", color: "#fff" }}>
            {saving ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Cal.com-style date + time picker
  return (
    <div className="flex gap-5" style={{ minHeight: 380 }}>
      {/* Left: Info + Calendar */}
      <div style={{ width: 280 }}>
        <div className="mb-4">
          <div className="text-xs text-sub mb-1">{specialist || "Select specialist"}</div>
          <div className="text-lg font-bold text-heading">{duration} Min Meeting</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-sub">
            <span>🕐 {duration}m</span>
            <span>📹 Zoom Video</span>
          </div>
          <div className="text-xs text-sub mt-1">🌐 America/New_York</div>
        </div>

        {/* Duration selector */}
        <div className="flex gap-1 mb-4">
          {[30, 60, 90].map((d) => (
            <button key={d} onClick={() => setDuration(d)}
              className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border-none"
              style={{ background: duration === d ? "#528bff" : "#252525", color: duration === d ? "#fff" : "#717171" }}>
              {d}m
            </button>
          ))}
        </div>

        {/* Mini calendar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-heading">{monthLabel}</span>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="w-6 h-6 rounded-full bg-transparent border border-line cursor-pointer text-sub text-xs flex items-center justify-center">‹</button>
              <button onClick={nextMonth} className="w-6 h-6 rounded-full bg-transparent border border-line cursor-pointer text-sub text-xs flex items-center justify-center">›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-sub mb-1">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = getDateStr(day);
              const isPast = dateStr < todayStr;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              return (
                <button key={day} onClick={() => !isPast && setSelectedDate(dateStr)}
                  disabled={isPast}
                  className="w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center border-none cursor-pointer"
                  style={{
                    background: isSelected ? "#528bff" : isPast ? "transparent" : "#333",
                    color: isSelected ? "#fff" : isPast ? "#505050" : isToday ? "#528bff" : "#ebebeb",
                    cursor: isPast ? "default" : "pointer",
                  }}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Time slots */}
      <div className="flex-1" style={{ borderLeft: "1px solid #333", paddingLeft: 20 }}>
        {!selectedDate ? (
          <div className="text-sm text-sub text-center py-12">Select a date to see available times</div>
        ) : (
          <>
            <div className="text-sm font-bold text-heading mb-3">{selectedDayOfWeek} {selectedDayNum}</div>
            <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
              {TIME_SLOTS.map((time) => (
                <button key={time} onClick={() => { setSelectedTime(time); setStep(2); }}
                  className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer text-center"
                  style={{
                    background: selectedTime === time ? "#528bff" : "transparent",
                    color: selectedTime === time ? "#fff" : "#ebebeb",
                    border: selectedTime === time ? "1px solid #528bff" : "1px solid #333",
                  }}>
                  {time}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}