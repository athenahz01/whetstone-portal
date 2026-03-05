"use client";

import { Student } from "../../types";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { WeeklyCalendar } from "../ui/WeeklyCalendar";
import { getCategoryColor } from "../../lib/colors";
import { addCounselorEvent, fetchCounselorEvents, deleteCounselorEvent } from "../../lib/queries";
import { pushToGoogleCalendar, pullFromGoogleCalendar } from "../../lib/calendar";
import { useState, useEffect } from "react";

interface MasterTimelineProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  profileId?: string | null;
}

export function MasterTimeline({ students, onSelectStudent, onNavigate, profileId }: MasterTimelineProps) {
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);

  const cats = ["all", ...Array.from(new Set(students.flatMap((s) => s.dl.map((d) => d.cat))))];

  useEffect(() => {
    fetchCounselorEvents().then(setCounselorEvents);
  }, []);

  useEffect(() => {
    if (profileId) {
      pullFromGoogleCalendar(profileId).then(setGoogleEvents);
    }
  }, [profileId]);

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
    const meetingLink = f.get("meetingLink") as string;
    const fullNotes = meetingLink ? `${notes}\n\nMeeting Link: ${meetingLink}` : notes;


    await addCounselorEvent({
      title, date, category, notes: fullNotes,
      createdBy: profileId || "",
      studentIds: selectedStudents,
    });

    if (profileId) {
      const studentNames = students
        .filter((s) => selectedStudents.includes(s.id))
        .map((s) => s.name).join(", ");
      await pushToGoogleCalendar(profileId, title, date, `Students: ${studentNames}\n${fullNotes}`);
    }

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

  // Build calendar rows
  const studentEmails = students.map((s) => s.email?.toLowerCase()).filter(Boolean);

  const myGoogleEvents = googleEvents.filter((ge: any) =>
    !ge.attendees || ge.attendees.length === 0 ||
    !ge.attendees.some((a: string) => studentEmails.includes(a))
  );

  const personalRow = myGoogleEvents.length > 0 ? {
    id: "my-calendar",
    name: "My Calendar",
    subtitle: `${myGoogleEvents.length} events`,
    avatar: "📅",
    avatarBg: "#eff6ff",
    avatarColor: "#1d4ed8",
    events: myGoogleEvents.map((ge: any) => ({
      id: ge.id,
      title: ge.title,
      date: ge.date,
      bgColor: "#eff6ff",
      borderColor: "#3b82f6",
      textColor: "#1d4ed8",
      label: "personal",
      meetingLink: ge.meetingLink || "",
      location: ge.location || "",
    })),
  } : null;

  const calendarRows = students.map((s) => {
    const dl = filter === "all" ? s.dl : s.dl.filter((d) => d.cat === filter);
    const studentCE = counselorEvents.filter((ce: any) => ce.studentIds.includes(s.id));
    const studentGE = googleEvents.filter((ge: any) =>
      ge.attendees && ge.attendees.includes(s.email?.toLowerCase())
    );

    const events = [
      // Student deadlines
      ...dl.filter((d) => d.status !== "completed").map((d) => ({
        id: d.id,
        title: d.title,
        date: d.due,
        bgColor: d.status === "overdue" ? "#fef2f2" : `${getCategoryColor(d.cat)}15`,
        borderColor: d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat),
        textColor: d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat),
        label: d.cat,
      })),
      // Counselor events
      ...studentCE.map((ce: any) => ({
        id: `ce-${ce.id}`,
        title: ce.title,
        date: ce.date,
        bgColor: "#eff6ff",
        borderColor: "#3b82f6",
        textColor: "#1d4ed8",
        label: "counselor",
        onClick: () => {
          if (confirm(`Delete event "${ce.title}"?`)) handleDeleteEvent(ce.id);
        },
      })),
      // Google Calendar events
      ...studentGE.map((ge: any) => ({
        id: `gcal-${ge.id}`,
        title: ge.title,
        date: ge.date,
        bgColor: "#dbeafe",
        borderColor: "#60a5fa",
        textColor: "#1d4ed8",
        label: "google",
        meetingLink: ge.meetingLink || "",
        location: ge.location || "",
      })),
    ];

    return {
      id: s.id,
      name: s.name,
      subtitle: `Gr. ${s.grade}`,
      avatar: s.av,
      avatarBg: "#eff6ff",
      avatarColor: "#1d4ed8",
      events,
      onClick: () => { onSelectStudent(s); onNavigate("detail"); },
    };
  });

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
      <div className="p-4 px-8">
        <WeeklyCalendar
          rows={calendarRows}
          personalRow={personalRow}
        />
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
            <FormField label="Meeting Link (optional)"><input name="meetingLink" type="url" placeholder="https://meet.google.com/..." style={inputStyle} /></FormField>
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