"use client";

import { Student, Session } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { PageHeader } from "../ui/PageHeader";
import { useState, useMemo } from "react";
import { addSession } from "../../lib/queries";

interface SessionPrepProps {
  student: Student;
  onRefresh?: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: "#fff",
  border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

export function SessionPrep({ student, onRefresh }: SessionPrepProps) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [sortBy, setSortBy] = useState<"time">("time");
  const [showBookModal, setShowBookModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState<Session | null>(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();

  const upcoming = useMemo(
    () => student.sess
      .filter((s) => new Date(s.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [student.sess]
  );

  const past = useMemo(
    () => student.sess
      .filter((s) => new Date(s.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [student.sess]
  );

  const sessions = tab === "upcoming" ? upcoming : past;

  // Group sessions by date
  const grouped = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    sessions.forEach((s) => {
      const dateKey = new Date(s.date).toLocaleDateString("en-US", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(s);
    });
    return groups;
  }, [sessions]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    await addSession(student.id, {
      date: f.get("date") as string,
      notes: f.get("title") as string, // Store session title in notes field
      action: "", // Empty = pending
    });
    if (onRefresh) await onRefresh();
    setSaving(false);
    setShowBookModal(false);
  };

  return (
    <div>
      <PageHeader
        title="Sessions"
        sub="Manage your sessions and bookings."
        right={
          <div className="flex gap-2">
            <Button onClick={() => window.open("https://calendar.google.com", "_blank")}>
              ⟳ Calendar Sync
            </Button>
            <Button primary onClick={() => setShowBookModal(true)}>Book a Session</Button>
          </div>
        }
      />

      <div className="p-6 px-8">
        {/* Tabs + Sort */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-0">
            {(["upcoming", "past"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-5 py-2.5 text-sm font-semibold capitalize border-none cursor-pointer transition-colors"
                style={{
                  background: "transparent",
                  color: tab === t ? "#1d4ed8" : "#64748b",
                  borderBottom: tab === t ? "2px solid #3b82f6" : "2px solid transparent",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-sub">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "time")}
              className="text-xs px-2 py-1 rounded-lg border border-line bg-white text-body"
            >
              <option value="time">Time</option>
            </select>
          </div>
        </div>

        {/* Info hint */}
        <div className="flex items-center gap-2 mb-4 text-xs text-sub">
          <span>ℹ️</span>
          <span>Tap the session cards below to view the notes.</span>
        </div>

        {/* Session cards grouped by date */}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12">
            <div className="text-lg text-sub mb-2">No {tab} sessions</div>
            <div className="text-sm text-faint">
              {tab === "upcoming" ? "Book a session to get started." : "Your past sessions will appear here."}
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([dateKey, dateSessions]) => (
          <div key={dateKey} className="mb-6">
            <div className="text-sm font-bold text-heading mb-3">{dateKey}</div>
            <div className="flex flex-col gap-2.5">
              {dateSessions.map((ss) => {
                const d = new Date(ss.date);
                const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                const endTime = new Date(d.getTime() + 60 * 60 * 1000);
                const endStr = endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                const hasAction = !!ss.action;
                // Session title: stored in notes field, or fallback
                const sessionTitle = ss.notes
                  ? ss.notes.split("\n")[0]
                  : `Session with ${student.counselor}`;

                return (
                  <div
                    key={ss.id}
                    onClick={() => setShowNotesModal(ss)}
                    className="bg-white rounded-xl border border-line p-4 cursor-pointer hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-xs text-sub mb-1">{timeStr} — {endStr}</div>
                        <div className="text-base font-bold text-heading mb-2">{sessionTitle}</div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: "#f3e8ff", color: "#7c3aed" }}
                          >
                            {student.counselor.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-sm text-body">{student.counselor}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-3">
                          <span className="text-xs font-semibold text-accent-ink cursor-pointer hover:underline">Agenda</span>
                          <span className="text-xs font-semibold text-accent-ink cursor-pointer hover:underline">Notes</span>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: hasAction ? "#f0fdf4" : "#fff7ed",
                            color: hasAction ? "#16a34a" : "#c2410c",
                            border: `1px solid ${hasAction ? "#bbf7d0" : "#fed7aa"}`,
                          }}
                        >
                          {hasAction ? "Confirmed" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Session Notes Modal */}
      {showNotesModal && (
        <Modal title={showNotesModal.notes?.split("\n")[0] || "Session Details"} onClose={() => setShowNotesModal(null)}>
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest font-bold text-sub mb-1">Date</div>
              <div className="text-sm text-heading">
                {new Date(showNotesModal.date).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest font-bold text-sub mb-1">Mentor</div>
              <div className="text-sm text-heading">{student.counselor}</div>
            </div>
            {showNotesModal.notes && (
              <div>
                <div className="text-xs uppercase tracking-widest font-bold text-sub mb-1">Notes</div>
                <div className="text-sm text-body whitespace-pre-wrap p-3 rounded-lg" style={{ background: "#f8f9fb" }}>
                  {showNotesModal.notes}
                </div>
              </div>
            )}
            {showNotesModal.action && (
              <div>
                <div className="text-xs uppercase tracking-widest font-bold text-sub mb-1">Action Items</div>
                <div className="text-sm text-body whitespace-pre-wrap p-3 rounded-lg" style={{ background: "#f0fdf4" }}>
                  {showNotesModal.action}
                </div>
              </div>
            )}
            {!showNotesModal.action && (
              <div className="p-3 rounded-lg text-sm" style={{ background: "#fffbeb", color: "#92400e" }}>
                No action items recorded yet. Your mentor will add these after your session.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Book Session Modal */}
      {showBookModal && (
        <Modal title="Book a Session" onClose={() => setShowBookModal(false)}>
          <form onSubmit={handleBook}>
            <FormField label="Session Title">
              <input required name="title" placeholder="e.g. Essay Review with Sarah" style={inputStyle} />
            </FormField>
            <FormField label="Date & Time">
              <input required name="date" type="datetime-local" style={inputStyle} />
            </FormField>
            <FormField label="Quick Note (optional)">
              <textarea name="note" rows={3} placeholder="What would you like to discuss?" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </FormField>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => setShowBookModal(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Booking..." : "Book Session"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}