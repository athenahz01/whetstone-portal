"use client";

import { Student } from "../../types";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { getCategoryColor } from "../../lib/colors";
import { addCounselorEvent, fetchCounselorEvents, deleteCounselorEvent } from "../../lib/queries";
import { pushToGoogleCalendar } from "../../lib/calendar";
import { useState, useEffect } from "react";

interface MasterTimelineProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  profileId?: string | null;
}

export function MasterTimeline({ students, onSelectStudent, onNavigate, profileId }: MasterTimelineProps) {
  const today = new Date();
  const days = 45;
  const dw = 28;
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);

  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const cats = ["all", ...Array.from(new Set(students.flatMap((s) => s.dl.map((d) => d.cat))))];

  useEffect(() => {
    fetchCounselorEvents().then(setCounselorEvents);
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const title = f.get("title") as string;
    const date = f.get("date") as string;
    const category = f.get("category") as string;
    const notes = f.get("notes") as string;
    const selectedStudents = Array.from(f.getAll("students")).map(Number);

    await addCounselorEvent({
      title,
      date,
      category,
      notes,
      createdBy: profileId || "",
      studentIds: selectedStudents,
    });

    // Push to Google Calendar
    if (profileId) {
      const studentNames = students
        .filter((s) => selectedStudents.includes(s.id))
        .map((s) => s.name)
        .join(", ");
      await pushToGoogleCalendar(profileId, title, date, `Students: ${studentNames}\n${notes}`);
    }

    // Refresh events
    const updated = await fetchCounselorEvents();
    setCounselorEvents(updated);
    setSaving(false);
    setShowModal(false);
  };

  const handleDeleteEvent = async (eventId: number) => {
    await deleteCounselorEvent(eventId);
    const updated = await fetchCounselorEvents();
    setCounselorEvents(updated);
  };

  return (
    <div>
      <PageHeader
        title="Master Timeline"
        sub="All deadlines at a glance."
        right={
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {cats.map((c) => (
                <button key={c} onClick={() => setFilter(c)}
                  className="px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold capitalize"
                  style={{
                    background: filter === c ? "#eff6ff" : "#fff",
                    border: `1px solid ${filter === c ? "#3b82f6" : "#cbd5e1"}`,
                    color: filter === c ? "#1d4ed8" : "#64748b",
                  }}>
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
            <Button primary onClick={() => setShowModal(true)}>+ New Event</Button>
          </div>
        }
      />
      <div className="p-4 px-8" style={{ overflow: "auto" }}>
        <div style={{ minWidth: days * dw + 170 }}>
          {/* Date header */}
          <div className="flex" style={{ marginLeft: 160, marginBottom: 4 }}>
            {dates.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} style={{ width: dw, textAlign: "center", flexShrink: 0 }}>
                  {d.getDate() === 1 && (
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#1d4ed8" }}>
                      {d.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  )}
                  <div
                    className="text-[10px]"
                    style={{
                      color: isToday ? "#fff" : "#64748b",
                      background: isToday ? "#3b82f6" : "transparent",
                      borderRadius: 4,
                      padding: "2px 0",
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Student rows */}
          {students.map((s) => {
            const dl = filter === "all" ? s.dl : s.dl.filter((d) => d.cat === filter);
            const studentCounselorEvents = counselorEvents.filter((ce) =>
              ce.studentIds.includes(s.id)
            );

            return (
              <div key={s.id} className="flex items-center bg-white" style={{ borderTop: "1px solid #e2e8f0", minHeight: 50 }}>
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  style={{ width: 160, flexShrink: 0, padding: "8px 10px" }}
                  onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{s.av}</div>
                  <div>
                    <div className="text-[13px] font-medium text-heading">{s.name}</div>
                    <div className="text-[11px] text-sub">Gr. {s.grade}</div>
                  </div>
                </div>
                <div className="flex relative flex-1">
                  {dates.map((d, i) => (
                    <div key={i} style={{ width: dw, height: 50, flexShrink: 0 }} />
                  ))}
                  {/* Student deadlines */}
                  {dl.filter((d) => d.status !== "completed").map((d) => {
                    const due = new Date(d.due);
                    const off = Math.round((due.getTime() - today.getTime()) / 864e5);
                    if (off < -3 || off >= days) return null;
                    return (
                      <div key={d.id} title={d.title}
                        style={{
                          position: "absolute", left: Math.max(0, off) * dw + 2, top: 9,
                          height: 30, minWidth: 100, maxWidth: 170,
                          background: d.status === "overdue" ? "#fef2f2" : `${getCategoryColor(d.cat)}10`,
                          border: `1px solid ${d.status === "overdue" ? "#ef444430" : `${getCategoryColor(d.cat)}25`}`,
                          borderLeft: `3px solid ${d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat)}`,
                          borderRadius: 6, padding: "4px 10px", cursor: "pointer", overflow: "hidden", zIndex: 2,
                        }}>
                        <div className="text-[10px] font-semibold" style={{ color: d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</div>
                        <div className="text-[9px] text-sub">{d.cat}</div>
                      </div>
                    );
                  })}
                  {/* Counselor events */}
                  {studentCounselorEvents.map((ce) => {
                    const eventDate = new Date(ce.date);
                    const off = Math.round((eventDate.getTime() - today.getTime()) / 864e5);
                    if (off < -3 || off >= days) return null;
                    return (
                      <div key={`ce-${ce.id}`} title={`${ce.title} (Counselor event)`}
                        onClick={() => {
                          if (confirm(`Delete event "${ce.title}"?`)) handleDeleteEvent(ce.id);
                        }}
                        style={{
                          position: "absolute", left: Math.max(0, off) * dw + 2, top: 9,
                          height: 30, minWidth: 100, maxWidth: 170,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderLeft: "3px solid #3b82f6",
                          borderRadius: 6, padding: "4px 10px", cursor: "pointer", overflow: "hidden", zIndex: 3,
                        }}>
                        <div className="text-[10px] font-semibold" style={{ color: "#1d4ed8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ce.title}</div>
                        <div className="text-[9px]" style={{ color: "#3b82f6" }}>counselor</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <Modal title="Create Event" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAddEvent}>
            <FormField label="Event Title"><input required name="title" placeholder="e.g. Essay Review Session" style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date"><input required name="date" type="date" style={inputStyle} /></FormField>
              <FormField label="Category">
                <select name="category" style={inputStyle}>
                  <option value="planning">Planning</option>
                  <option value="essays">Essays</option>
                  <option value="applications">Applications</option>
                  <option value="testing">Testing</option>
                  <option value="extracurricular">Extracurricular</option>
                  <option value="Academics">Academics</option>
                </select>
              </FormField>
            </div>
            <FormField label="Assign to Students">
              <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: "#f8f9fb", border: "1px solid #e2e8f0", maxHeight: 160, overflowY: "auto" }}>
                {students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-body">
                    <input type="checkbox" name="students" value={s.id} defaultChecked />
                    {s.name} — Gr. {s.grade}
                  </label>
                ))}
              </div>
              <div className="text-xs text-sub mt-1">Selected students will see this event on their dashboard.</div>
            </FormField>
            <FormField label="Notes (optional)"><textarea name="notes" rows={2} placeholder="Any details for this event..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></FormField>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Creating..." : "Create Event"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}