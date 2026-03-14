"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { PageHeader } from "../ui/PageHeader";
import { addDeadline, fetchCounselorEventsForStudent, fetchStudentSessions } from "../../lib/queries";
import { useState, useEffect } from "react";

// Simple rich text formatter: handles paragraph breaks, numbered lists, bullets, bold, italics
function formatRichText(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // escape HTML
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") // **bold**
    .replace(/\*(.+?)\*/g, "<em>$1</em>") // *italic*
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#5A83F3;font-weight:600;flex-shrink:0">$1.</span><span>$2</span></div>') // numbered lists
    .replace(/^[-•]\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#717171">•</span><span>$1</span></div>') // bullet lists
    .replace(/\n\n/g, '<div style="margin-top:12px"></div>') // paragraph breaks
    .replace(/\n/g, "<br/>"); // line breaks
}

interface SessionPrepProps {
  student: Student;
  onRefresh?: () => void;
  readOnly?: boolean;
}

export function SessionPrep({ student, onRefresh, readOnly = false }: SessionPrepProps) {
  const [viewMode, setViewMode] = useState<"sessions" | "commit">("sessions");
  const [sessionTab, setSessionTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<any[]>([]);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);

  const loadBookingRequests = async () => {
    try {
      const res = await fetch(`/api/booking-requests?studentId=${student.id}`);
      const data = await res.json();
      setBookingRequests(data.requests || []);
    } catch { setBookingRequests([]); }
  };
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [editingCommit, setEditingCommit] = useState<any>(null);
  const [commitSpecialist, setCommitSpecialist] = useState("");

  const loadCommits = async () => {
    try {
      const res = await fetch(`/api/closing-commits?studentId=${student.id}`);
      const data = await res.json();
      setCommits(data.commits || []);
    } catch { setCommits([]); }
  };

  useEffect(() => {
    if (student.id) {
      Promise.all([
        fetchCounselorEventsForStudent(student.id),
        fetchStudentSessions(student.id),
      ]).then(([counselorEvs, bookedSessions]) => {
        setEvents([...counselorEvs, ...bookedSessions]);
      });
      loadCommits();
      loadBookingRequests();
    }
  }, [student.id]);

  const todayStr = new Date().toISOString().split("T")[0];

  const reloadEvents = () => {
    Promise.all([
      fetchCounselorEventsForStudent(student.id),
      fetchStudentSessions(student.id),
    ]).then(([counselorEvs, bookedSessions]) => {
      setEvents([...counselorEvs, ...bookedSessions]);
    });
  };

  const upcoming = events.filter((e) => e.date >= todayStr).sort((a: any, b: any) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.date < todayStr).sort((a: any, b: any) => b.date.localeCompare(a.date));
  const displayEvents = sessionTab === "upcoming" ? upcoming : past;

  const [strategists, setStrategists] = useState<{ name: string; email: string }[]>([]);

  // Fetch strategist list dynamically from all user accounts
  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(data => {
        const strats = (data.users || [])
          .filter((u: any) => u.role === "strategist" && u.name && u.name !== "—")
          .map((u: any) => ({ name: u.name, email: u.email }));
        setStrategists(strats);
      })
      .catch(() => {});
  }, []);

  const SPECIALISTS = strategists.map(s => s.name);

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

  const handleCommitSave = async () => {
    setSaving(true);
    try {
      if (editingCommit) {
        // Update existing commit
        await fetch("/api/closing-commits", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCommit.id,
            activeRecall: activeRecall,
            actions: actions,
            sessionType: sessionType,
            specialist: commitSpecialist,
          }),
        });
      } else {
        // Create new commit
        await fetch("/api/closing-commits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.id,
            activeRecall: activeRecall,
            actions: actions,
            sessionType: sessionType,
            specialist: commitSpecialist,
          }),
        });
        // Also save actions as deadlines (only on create)
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
      }
    } catch (err) { console.error("Failed to save commit:", err); }
    if (onRefresh) await onRefresh();
    await loadCommits();
    setSaving(false);
    setSaved(true);
    setEditingCommit(null);
  };

  return (
    <div>
      <PageHeader
        title="Sessions"
        sub={readOnly ? `${student.name.split(" ")[0]}'s sessions` : "Manage your sessions, bookings, and post-session reflections."}
        right={
          readOnly ? <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span> :
          <button onClick={() => setShowBooking(true)}
            className="px-4 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
            style={{ background: "#528bff", color: "#fff" }}>
            + Book a Session
          </button>
        }
      />

      <div className="p-6 px-8" style={{ maxWidth: 860 }}>
        {/* Unified tab row: Upcoming | Past | Close & Commit */}
        <div className="flex gap-0.5 mb-5 p-0.5 rounded-full" style={{ background: "#1e1e1e", display: "inline-flex" }}>
          {([
            ["upcoming", "Upcoming"],
            ["past", "Past"],
            ...(!readOnly ? [["commit", "Close & Commit"]] : []),
          ] as [string, string][]).map(([key, label]) => {
            const isActive = (viewMode === "commit" && key === "commit") || (viewMode === "sessions" && key === sessionTab);
            return (
              <button key={key}
                onClick={() => {
                  if (key === "commit") { setViewMode("commit"); }
                  else { setViewMode("sessions"); setSessionTab(key as "upcoming" | "past"); }
                }}
                className="px-5 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
                style={{ background: isActive ? "#528bff" : "transparent", color: isActive ? "#fff" : "#717171" }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Sessions List (Upcoming or Past) ── */}
        {viewMode === "sessions" && (
          <div>

          {/* Pending booking requests */}
          {bookingRequests.filter(r => r.status === "pending" || r.status === "countered").length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#e5a83b" }}>⏳ Pending Booking Requests</div>
              <div className="flex flex-col gap-2">
                {bookingRequests.filter(r => r.status === "pending" || r.status === "countered").map((r: any) => (
                  <div key={r.id} className="p-4 rounded-xl" style={{ background: "#252525", borderLeft: "3px solid #e5a83b" }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-heading">{r.session_name || `Session with ${r.specialist}`}</div>
                        <div className="text-xs text-sub mt-0.5">{r.date} · {r.start_time} · with {r.specialist}</div>
                        {r.status === "countered" && (
                          <div className="mt-2 p-3 rounded-lg" style={{ background: "#1e1e1e", border: "1px solid rgba(229,168,59,0.2)" }}>
                            <div className="text-xs font-semibold mb-1" style={{ color: "#e5a83b" }}>Counter-offer from {r.specialist}:</div>
                            <div className="text-sm text-heading">{r.counter_date} at {r.counter_start_time}</div>
                            {r.counter_note && <div className="text-xs text-sub mt-1">{r.counter_note}</div>}
                            <button onClick={async () => {
                              await fetch("/api/booking-requests", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "accept_counter", requestId: r.id }),
                              });
                              reloadEvents();
                              loadBookingRequests();
                            }}
                              className="mt-2 px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
                              style={{ background: "#4aba6a", color: "#fff" }}>
                              Accept New Time
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: r.status === "countered" ? "rgba(229,168,59,0.08)" : "rgba(82,139,255,0.08)", color: r.status === "countered" ? "#e5a83b" : "#528bff" }}>
                        {r.status === "countered" ? "Counter-offer" : "Awaiting approval"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <div className="flex flex-col gap-3">
                  {evs.map((ev: any) => {
                    const isBooked = ev.source === "booking";
                    const rawId = isBooked ? ev.id.replace("sess-", "") : null;
                    const isCompleted = ev.status === "completed" || (!isBooked && ev.date < todayStr);
                    const isPending = !isCompleted;

                    const toggleStatus = async () => {
                      if (!isBooked || !rawId) return;
                      const newStatus = isCompleted ? "pending" : "completed";
                      await fetch("/api/session", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: rawId, status: newStatus }),
                      });
                      reloadEvents();
                    };

                    const deleteSession = async () => {
                      if (!isBooked || !rawId) return;
                      if (!confirm("Delete this session?")) return;
                      await fetch(`/api/session?id=${rawId}`, { method: "DELETE" });
                      reloadEvents();
                    };

                    return (
                      <div key={ev.id}>
                        <div className="p-5 rounded-xl group cursor-pointer border"
                          onClick={() => setSelectedSession(selectedSession?.id === ev.id ? null : ev)}
                          style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {ev.start_time && <div className="text-sm mb-1" style={{ color: "#717171" }}>{ev.start_time}{ev.end_time ? ` — ${ev.end_time}` : ""}</div>}
                              <div className="text-base font-bold text-heading mb-3">{ev.title}</div>
                              <div className="flex items-center gap-2.5">
                                {ev.specialist ? (
                                  <>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                                      style={{ background: "#7c3aed", color: "#fff" }}>
                                      {ev.specialist.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                                    </div>
                                    <span className="text-sm text-body">{ev.specialist}</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                                      style={{ background: "#7c3aed", color: "#fff" }}>
                                      {student.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                                    </div>
                                    <span className="text-sm text-body">{student.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold cursor-pointer hover:underline"
                                  style={{ color: "#5A83F3" }}
                                  onClick={() => setSelectedSession(selectedSession?.id === ev.id ? null : ev)}>
                                  Agenda
                                </span>
                                <span className="text-sm font-semibold cursor-pointer hover:underline"
                                  style={{ color: ev.notes ? "#5A83F3" : "#505050" }}
                                  onClick={() => setSelectedSession(selectedSession?.id === ev.id ? null : ev)}>
                                  Notes
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={isBooked ? toggleStatus : undefined}
                                  className="text-xs font-semibold px-3 py-1 rounded-full"
                                  style={{
                                    background: "transparent",
                                    border: isCompleted ? "1.5px solid #4aba6a" : "1.5px solid #e5a83b",
                                    color: isCompleted ? "#4aba6a" : "#e5a83b",
                                    cursor: isBooked ? "pointer" : "default",
                                  }}>
                                  {isCompleted ? "Confirmed" : "Pending"}
                                </button>
                                {isBooked && (
                                  <button onClick={deleteSession}
                                    className="w-6 h-6 rounded-full hidden group-hover:flex items-center justify-center border-none cursor-pointer"
                                    style={{ background: "rgba(229,91,91,0.1)", color: "#e55b5b", fontSize: 11 }}>✕</button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Expanded detail panel */}
                        {selectedSession?.id === ev.id && (
                          <div className="ml-3 p-4 rounded-b-xl" style={{ background: "#1e1e1e", borderLeft: "3px solid #333", marginTop: -4 }}>
                            {ev.notes ? (
                              <div className="mb-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#717171" }}>📝 Session Notes</div>
                                <div className="text-sm leading-relaxed p-3 rounded-lg" style={{ background: "#252525", color: "#d0d0d0" }}>{ev.notes}</div>
                              </div>
                            ) : (
                              <div className="text-xs text-faint py-2">No notes for this session.</div>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-sub">
                              {ev.category && <span>Category: {ev.category}</span>}
                              {ev.specialist && <span>Mentor: {ev.specialist}</span>}
                              <span>Date: {ev.date}</span>
                              {isBooked && <button onClick={() => { setViewMode("commit" as any); }} className="bg-transparent border-none cursor-pointer text-xs font-semibold" style={{ color: "#528bff" }}>Write Close & Commit →</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── Close & Commit Journal ── */}
      {viewMode === "commit" && (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="m-0 text-lg font-bold text-heading">Your Close & Commit Notes</h3>
            <p className="m-0 text-sm text-sub mt-1">A record of your session reflections and action items.</p>
          </div>
          <button onClick={() => { setEditingCommit(null); setShowCommitForm(true); setSaved(false); setActiveRecall(""); setCommitSpecialist(""); setSessionType("online"); setActions([{ title: "", due: "", description: "" }, { title: "", due: "", description: "" }, { title: "", due: "", description: "" }]); }}
            className="px-5 py-2.5 rounded-full border-none cursor-pointer text-sm font-semibold"
            style={{ background: "#528bff", color: "#fff" }}>
            + Add Close & Commit
          </button>
        </div>

        {commits.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-base text-sub m-0">No closing commits yet.</p>
              <p className="text-sm text-faint m-0 mt-1">After a session, add a closing commit to capture key takeaways and action items.</p>
            </div>
          </Card>
        )}

        {/* Cards — single column, half-screen width */}
        <div className="flex flex-col gap-4" style={{ maxWidth: 640 }}>
          {commits.map((c: any) => {
            const cActions = (() => { try { return JSON.parse(c.actions || "[]"); } catch { return []; } })();
            const date = new Date(c.created_at);
            return (
              <Card key={c.id} style={{ padding: 20 }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold" style={{ color: "#ebebeb" }}>
                      {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      <span className="ml-2 font-normal" style={{ color: "#717171" }}>{date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: c.session_type === "in-person" ? "rgba(74,186,106,0.08)" : "rgba(82,139,255,0.08)", color: c.session_type === "in-person" ? "#4aba6a" : "#7aabff" }}>
                        {c.session_type === "in-person" ? "🤝 In-Person" : "💻 Online"}
                      </span>
                      {c.specialist && (
                        <span className="text-xs" style={{ color: "#a0a0a0" }}>with {c.specialist}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Edit button */}
                    <button onClick={() => {
                      setEditingCommit(c);
                      setActiveRecall(c.active_recall || "");
                      setSessionType(c.session_type || "online");
                      setCommitSpecialist(c.specialist || "");
                      setActions(cActions.length > 0 ? cActions : [{ title: "", due: "", description: "" }, { title: "", due: "", description: "" }, { title: "", due: "", description: "" }]);
                      setShowCommitForm(true);
                      setSaved(false);
                    }}
                      className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer"
                      style={{ background: "rgba(82,139,255,0.08)", color: "#7aabff", fontSize: 12 }}>✎</button>
                    {/* Delete button */}
                    <button onClick={async () => {
                      if (!confirm("Delete this commit?")) return;
                      await fetch(`/api/closing-commits?id=${c.id}`, { method: "DELETE" });
                      loadCommits();
                    }}
                      className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer"
                      style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b", fontSize: 11 }}>✕</button>
                  </div>
                </div>

                {/* Active Recall — rendered with formatting */}
                {c.active_recall && (
                  <div className="mb-3">
                    <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#717171" }}>🧠 Active Recall</div>
                    <div className="text-sm leading-relaxed p-4 rounded-lg" style={{ background: "#1e1e1e", color: "#d0d0d0" }}
                      dangerouslySetInnerHTML={{ __html: formatRichText(c.active_recall) }} />
                  </div>
                )}

                {/* Actions */}
                {cActions.length > 0 && cActions.some((a: any) => a.title) && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#717171" }}>📋 Action Items</div>
                    <div className="flex flex-col gap-1.5">
                      {cActions.filter((a: any) => a.title).map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                          style={{ background: "#1e1e1e" }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: "rgba(82,139,255,0.12)", color: "#7aabff" }}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium" style={{ color: "#ebebeb" }}>{a.title}</div>
                            {a.due && <div className="text-xs mt-0.5" style={{ color: "#717171" }}>Due: {a.due}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Add Close & Commit Modal ── */}
      {showCommitForm && (
        <Modal title={editingCommit ? "Edit Close & Commit" : "New Close & Commit"} onClose={() => { setShowCommitForm(false); setEditingCommit(null); }}>
          {saved ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-heading mb-2">Session Committed!</h2>
              <p className="text-sm text-sub mb-4">Your reflection and action items have been saved.</p>
              <Button primary onClick={() => { setShowCommitForm(false); setSaved(false); setEditingCommit(null); }}>Done</Button>
            </div>
          ) : (
            <>
              {/* Session info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <FormField label="Session type">
                  <select value={sessionType} onChange={(e) => setSessionType(e.target.value as any)} style={inputStyle}>
                    <option value="online">💻 Online</option>
                    <option value="in-person">🤝 In-Person</option>
                  </select>
                </FormField>
                <FormField label="Specialist">
                  <select value={commitSpecialist} onChange={(e) => setCommitSpecialist(e.target.value)} style={inputStyle}>
                    <option value="">Select mentor...</option>
                    {SPECIALISTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>

              {/* Active Recall */}
              <FormField label="🧠 Active Recall">
                <p className="text-xs text-sub mb-2 m-0">Write from memory — what did you discuss? What did you learn?</p>
                <textarea
                  value={activeRecall}
                  onChange={(e) => setActiveRecall(e.target.value)}
                  placeholder="What did we discuss? What did I learn? What surprised me?"
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                />
              </FormField>

              {/* Three Essential Actions */}
              <div className="mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-sub">📋 Three Essential Actions</label>
                <p className="text-xs text-sub mb-3 mt-0.5">Commit to three things you&apos;ll do before the next session.</p>
                <div className="flex flex-col gap-3">
                  {actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-2"
                        style={{ background: a.title.trim() ? "rgba(82,139,255,0.1)" : "#333", color: a.title.trim() ? "#528bff" : "#717171" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <input value={a.title} onChange={(e) => updateAction(i, "title", e.target.value)}
                          placeholder={`Action ${i + 1}${i === 0 ? " (e.g. Draft Common App essay)" : ""}`} style={inputStyle} />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input type="date" value={a.due} onChange={(e) => updateAction(i, "due", e.target.value)} style={inputStyle} />
                          <input value={a.description} onChange={(e) => updateAction(i, "description", e.target.value)} placeholder="Notes" style={inputStyle} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button onClick={() => { setShowCommitForm(false); setEditingCommit(null); }}>Cancel</Button>
                <Button primary onClick={handleCommitSave} disabled={saving || (!activeRecall.trim() && actions.every((a) => !a.title.trim()))}>
                  {saving ? "Saving..." : "Save Commit →"}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
      </div>

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
                const res = await fetch("/api/booking-requests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "request",
                    studentId: student.id,
                    studentName: student.name,
                    specialist: data.specialist,
                    date: data.date,
                    startTime: data.start_time,
                    sessionName: data.session_name,
                    sessionType: data.session_type,
                    notes: data.notes,
                  }),
                });
                const result = await res.json();
                if (result.success) {
                  if (onRefresh) await onRefresh();
                  reloadEvents();
                  loadBookingRequests();
                  setShowBooking(false);
                  alert("Booking request sent! Your mentor will review and approve.");
                } else {
                  alert("Failed: " + (result.error || "Unknown error"));
                }
              } catch { alert("Booking request failed."); }
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

        <FormField label="Mentor">
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
          <div className="text-xs text-sub mb-1">{specialist || "Select mentor"}</div>
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