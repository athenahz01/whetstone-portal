"use client";

import { Student } from "../../types";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { WeeklyCalendar } from "../ui/WeeklyCalendar";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { addCounselorEvent, fetchCounselorEvents, deleteCounselorEvent } from "../../lib/queries";
import { pushToGoogleCalendar, pullFromGoogleCalendar } from "../../lib/calendar";
import { useState, useEffect, useMemo } from "react";

interface MasterTimelineProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  profileId?: string | null;
}

type SortField = "due" | "title" | "category" | "student" | "status" | "specialist";
type SortDir = "asc" | "desc";

export function MasterTimeline({ students, onSelectStudent, onNavigate, profileId }: MasterTimelineProps) {
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [sortField, setSortField] = useState<SortField>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  // ======= TABLE VIEW DATA =======
  const allDeadlines = useMemo(() => {
    const items = students.flatMap((s) =>
      s.dl.map((d) => ({
        ...d,
        studentName: s.name,
        studentId: s.id,
        studentAv: s.av,
        specialist: (d as any).specialist || "",
      }))
    );

    // Add counselor events as deadline-like items
    const ceItems = counselorEvents.map((ce: any) => ({
      id: ce.id,
      title: ce.title,
      due: ce.date,
      cat: ce.category || "planning",
      status: "pending" as const,
      days: Math.round((new Date(ce.date).getTime() - Date.now()) / 864e5),
      studentName: students
        .filter((s) => ce.studentIds?.includes(s.id))
        .map((s) => s.name)
        .join(", ") || "All",
      studentId: 0,
      studentAv: "📅",
      specialist: ce.specialist || "",
      isCounselorEvent: true,
      counselorEventId: ce.id,
    }));

    return [...items, ...ceItems];
  }, [students, counselorEvents]);

  const filteredDeadlines = useMemo(() => {
    let items = allDeadlines;
    if (filter !== "all") {
      items = items.filter((d) => d.cat === filter);
    }
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "due":
          cmp = a.due.localeCompare(b.due);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "category":
          cmp = a.cat.localeCompare(b.cat);
          break;
        case "student":
          cmp = a.studentName.localeCompare(b.studentName);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "specialist":
          cmp = (a.specialist || "").localeCompare(b.specialist || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [allDeadlines, filter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <div
      onClick={() => toggleSort(field)}
      className="text-xs text-sub uppercase tracking-widest font-semibold cursor-pointer hover:text-heading flex items-center gap-1 select-none"
    >
      {label}
      {sortField === field && (
        <span style={{ fontSize: 10, color: "#3b82f6" }}>{sortDir === "asc" ? "▲" : "▼"}</span>
      )}
    </div>
  );

  // ======= CALENDAR VIEW DATA =======
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
      ...dl.filter((d) => d.status !== "completed").map((d) => ({
        id: d.id,
        title: d.title,
        date: d.due,
        bgColor: d.status === "overdue" ? "#fef2f2" : getCategoryColor(d.cat) + "15",
        borderColor: d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat),
        textColor: d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat),
        label: d.cat,
      })),
      ...studentCE.map((ce: any) => ({
        id: "ce-" + ce.id,
        title: ce.title,
        date: ce.date,
        bgColor: "#eff6ff",
        borderColor: "#3b82f6",
        textColor: "#1d4ed8",
        label: "strategist",
        onClick: () => {
          if (confirm('Delete event "' + ce.title + '"?')) handleDeleteEvent(ce.id);
        },
      })),
      ...studentGE.map((ge: any) => ({
        id: "gcal-" + ge.id,
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
      subtitle: "Gr. " + s.grade,
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
                    border: "1px solid " + (filter === c ? "#3b82f6" : "#cbd5e1"),
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
        {/* View Toggle */}
        <div className="inline-flex gap-0.5 bg-white border border-line rounded-lg p-1 mb-4">
          {([["calendar", "Calendar"], ["table", "Table"]] as const).map(([id, l]) => (
            <button key={id} onClick={() => setViewMode(id)}
              className="px-5 py-2 rounded-lg border-none cursor-pointer text-sm font-semibold"
              style={{ background: viewMode === id ? "#3b82f6" : "transparent", color: viewMode === id ? "#fff" : "#64748b" }}>
              {l}
            </button>
          ))}
        </div>

        {viewMode === "calendar" ? (
          <WeeklyCalendar rows={calendarRows} personalRow={personalRow} />
        ) : (
          /* TABLE VIEW */
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {/* Table Header */}
            <div
              className="grid px-5 py-3 border-b border-line"
              style={{ gridTemplateColumns: "100px 2fr 1fr 1.5fr 1fr 1fr 90px", background: "#f8f9fb" }}
            >
              <SortHeader field="due" label="Due Date" />
              <SortHeader field="title" label="Project" />
              <SortHeader field="category" label="Type" />
              <SortHeader field="student" label="Student" />
              <SortHeader field="specialist" label="Specialist" />
              <SortHeader field="status" label="Status" />
              <div className="text-xs text-sub uppercase tracking-widest font-semibold">Actions</div>
            </div>

            {/* Table Rows */}
            {filteredDeadlines.length === 0 ? (
              <div className="p-8 text-center text-sub text-sm">No deadlines found.</div>
            ) : (
              filteredDeadlines.map((d, idx) => {
                const isOverdue = d.status === "overdue";
                const isCE = (d as any).isCounselorEvent;
                return (
                  <div
                    key={d.id + "-" + idx}
                    className="grid px-5 py-3 border-b border-line items-center hover:bg-mist cursor-pointer"
                    style={{
                      gridTemplateColumns: "100px 2fr 1fr 1.5fr 1fr 1fr 90px",
                      background: isOverdue ? "#fef2f2" : isCE ? "#f8faff" : "#fff",
                    }}
                    onClick={() => {
                      const student = students.find((s) => s.id === d.studentId);
                      if (student) { onSelectStudent(student); onNavigate("detail"); }
                    }}
                  >
                    {/* Due Date */}
                    <div className="text-sm font-medium" style={{ color: isOverdue ? "#ef4444" : "#0f172a" }}>
                      {new Date(d.due + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>

                    {/* Project Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      {isCE && <span className="text-[10px]">📅</span>}
                      <span className="text-sm font-medium text-heading truncate">{d.title}</span>
                    </div>

                    {/* Type/Category */}
                    <div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-semibold"
                        style={{
                          background: getCategoryColor(d.cat) + "15",
                          color: getCategoryColor(d.cat),
                        }}
                      >
                        {d.cat}
                      </span>
                    </div>

                    {/* Student */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: "#eff6ff", color: "#1d4ed8" }}
                      >
                        {d.studentAv}
                      </div>
                      <span className="text-sm text-body truncate">{d.studentName}</span>
                    </div>

                    {/* Specialist */}
                    <div className="text-sm text-sub truncate">
                      {d.specialist || "—"}
                    </div>

                    {/* Status */}
                    <Tag color={getStatusColor(d.status)}>
                      {isOverdue ? Math.abs(d.days) + "d late" : d.days === 0 ? "Today" : d.days + "d"}
                    </Tag>

                    {/* Actions */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {isCE && (
                        <button
                          onClick={() => handleDeleteEvent((d as any).counselorEventId)}
                          className="text-[10px] px-2 py-1 rounded cursor-pointer border-none font-semibold"
                          style={{ background: "#fef2f2", color: "#ef4444" }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Table Footer */}
            <div className="px-5 py-2.5 border-t border-line flex justify-between items-center" style={{ background: "#f8f9fb" }}>
              <span className="text-xs text-sub">{filteredDeadlines.length} items</span>
              <div className="flex gap-2 text-xs text-sub">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} /> Overdue
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#d97706" }} /> In Progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#94a3b8" }} /> Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px]">📅</span> Strategist Event
                </span>
              </div>
            </div>
          </div>
        )}
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
            <FormField label="Specialist (optional)"><input name="specialist" placeholder="e.g. Stephanie" style={inputStyle} /></FormField>
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