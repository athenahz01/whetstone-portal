"use client";

import { Student } from "../../types";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { WeeklyCalendar } from "../ui/WeeklyCalendar";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { addCounselorEvent, fetchCounselorEvents, deleteCounselorEvent, addDeadline } from "../../lib/queries";
import { pushToGoogleCalendar, pullFromGoogleCalendar } from "../../lib/calendar";
import { useState, useEffect, useMemo, useRef } from "react";

interface MasterTimelineProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  profileId?: string | null;
  onRefresh?: () => void;
}

type SortField = "due" | "title" | "category" | "student" | "status" | "specialist";
type SortDir = "asc" | "desc";

interface ColumnFilters {
  student: string[];
  category: string[];
  status: string[];
  specialist: string[];
}

// ── Dropdown filter component ──────────────────────────────────────────────
function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  sortField,
  field,
  sortDir,
  onSort,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  sortField: SortField;
  field: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isFiltered = selected.length > 0 && selected.length < options.length;
  const isSorted = sortField === field;

  const toggleAll = () => {
    if (selected.length === options.length) onChange([]);
    else onChange([...options]);
  };

  const toggleOne = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 cursor-pointer select-none group"
        style={{ userSelect: "none" }}
      >
        <span
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: isFiltered || isSorted ? "#5A83F3" : "#717171" }}
        >
          {label}
        </span>
        <span style={{ fontSize: 10, color: isFiltered || isSorted ? "#5A83F3" : "#505050" }}>
          {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "▾"}
        </span>
        {isFiltered && (
          <span
            className="text-[9px] font-bold px-1 rounded"
            style={{ background: "#5A83F3", color: "#fff", lineHeight: "14px" }}
          >
            {selected.length}
          </span>
        )}
      </div>

      {open && (
        <div
          className="absolute z-50 rounded-xl shadow-lg border border-line bg-white"
          style={{ top: "calc(100% + 6px)", left: 0, minWidth: 180, maxHeight: 280, overflowY: "auto" }}
        >
          {/* Sort options */}
          <div className="px-3 py-2 border-b border-line">
            <div className="text-[10px] text-sub uppercase font-bold mb-1.5 tracking-widest">Sort</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => { onSort(field); setOpen(false); }}
                className="flex-1 py-1 rounded text-xs font-semibold border-none cursor-pointer"
                style={{
                  background: isSorted && sortDir === "asc" ? "rgba(82,139,255,0.08)" : "#252525",
                  color: isSorted && sortDir === "asc" ? "#7aabff" : "#717171",
                }}
              >
                ▲ A→Z
              </button>
              <button
                onClick={() => { onSort(field); setOpen(false); }}
                className="flex-1 py-1 rounded text-xs font-semibold border-none cursor-pointer"
                style={{
                  background: isSorted && sortDir === "desc" ? "rgba(82,139,255,0.08)" : "#252525",
                  color: isSorted && sortDir === "desc" ? "#7aabff" : "#717171",
                }}
              >
                ▼ Z→A
              </button>
            </div>
          </div>

          {/* Filter options */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] text-sub uppercase font-bold tracking-widest">Filter</div>
              <button
                onClick={toggleAll}
                className="text-[10px] text-accent-ink cursor-pointer border-none bg-transparent font-semibold"
                style={{ color: "#5A83F3" }}
              >
                {selected.length === options.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggleOne(opt)}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: "#5A83F3" }}
                  />
                  <span className="text-xs text-body capitalize">{opt || "—"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear button */}
          {isFiltered && (
            <div className="px-3 pb-2">
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none"
                style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Simple sort-only header (for Due Date, Title) ──────────────────────────
function SortOnlyHeader({
  field, label, sortField, sortDir, onSort,
}: {
  field: SortField; label: string; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <div
      onClick={() => onSort(field)}
      className="flex items-center gap-1 cursor-pointer select-none"
    >
      <span
        className="text-xs uppercase tracking-widest font-semibold"
        style={{ color: active ? "#5A83F3" : "#717171" }}
      >
        {label}
      </span>
      <span style={{ fontSize: 10, color: active ? "#5A83F3" : "#505050" }}>
        {active ? (sortDir === "asc" ? "▲" : "▼") : "▾"}
      </span>
    </div>
  );
}

export function MasterTimeline({ students, onSelectStudent, onNavigate, profileId, onRefresh }: MasterTimelineProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [showModal, setShowModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [counselorEvents, setCounselorEvents] = useState<any[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [sortField, setSortField] = useState<SortField>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Per-column filters — empty array = show all, populated = only show these
  const [colFilters, setColFilters] = useState<ColumnFilters>({
    student: [],
    category: [],
    status: [],
    specialist: [],
  });

  // Calendar view still uses a single category filter
  const [calFilter, setCalFilter] = useState("all");

  useEffect(() => {
    fetchCounselorEvents().then(setCounselorEvents);
  }, []);

  useEffect(() => {
    if (profileId) {
      pullFromGoogleCalendar(profileId).then(setGoogleEvents);
    }
  }, [profileId]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#252525",
    border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
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

  // ── All deadlines flattened ──
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

  // ── Unique options for each filterable column ──
  const filterOptions = useMemo(() => ({
    student: Array.from(new Set(allDeadlines.map((d) => d.studentName))).sort(),
    category: Array.from(new Set(allDeadlines.map((d) => d.cat))).sort(),
    status: Array.from(new Set(allDeadlines.map((d) => d.status))).sort(),
    specialist: Array.from(new Set(allDeadlines.map((d) => d.specialist || "—"))).sort(),
  }), [allDeadlines]);

  // ── Filtered + sorted deadlines ──
  const filteredDeadlines = useMemo(() => {
    let items = allDeadlines;

    // Hide completed unless toggle is on
    if (!showCompleted)
      items = items.filter((d) => d.status !== "completed");

    if (colFilters.student.length > 0)
      items = items.filter((d) => colFilters.student.includes(d.studentName));
    if (colFilters.category.length > 0)
      items = items.filter((d) => colFilters.category.includes(d.cat));
    if (colFilters.status.length > 0)
      items = items.filter((d) => colFilters.status.includes(d.status));
    if (colFilters.specialist.length > 0)
      items = items.filter((d) => colFilters.specialist.includes(d.specialist || "—"));

    items = [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "due": cmp = a.due.localeCompare(b.due); break;
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "category": cmp = a.cat.localeCompare(b.cat); break;
        case "student": cmp = a.studentName.localeCompare(b.studentName); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "specialist": cmp = (a.specialist || "").localeCompare(b.specialist || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [allDeadlines, colFilters, sortField, sortDir, showCompleted]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const setFilter = (key: keyof ColumnFilters, vals: string[]) =>
    setColFilters((prev) => ({ ...prev, [key]: vals }));

  const activeFilterCount = Object.values(colFilters).filter((v) => v.length > 0).length;

  const clearAllFilters = () =>
    setColFilters({ student: [], category: [], status: [], specialist: [] });

  // ── Calendar view ──
  const cats = ["all", ...Array.from(new Set(students.flatMap((s) => s.dl.map((d) => d.cat))))];
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
    avatarBg: "rgba(82,139,255,0.08)",
    avatarColor: "#7aabff",
    events: myGoogleEvents.map((ge: any) => ({
      id: ge.id, title: ge.title, date: ge.date,
      bgColor: "rgba(82,139,255,0.08)", borderColor: "#5A83F3", textColor: "#7aabff",
      label: "personal", meetingLink: ge.meetingLink || "", location: ge.location || "",
    })),
  } : null;

  const calendarRows = students.map((s) => {
    const dl = calFilter === "all" ? s.dl : s.dl.filter((d) => d.cat === calFilter);
    const studentCE = counselorEvents.filter((ce: any) => ce.studentIds.includes(s.id));
    const studentGE = googleEvents.filter((ge: any) =>
      ge.attendees && ge.attendees.includes(s.email?.toLowerCase())
    );

    const events = [
      ...dl.map((d) => ({
        id: d.id, title: d.title, date: d.due,
        bgColor: d.status === "completed" ? "rgba(74,186,106,0.1)" : "rgba(229,91,91,0.1)",
        borderColor: d.status === "completed" ? "#4aba6a" : "#e55b5b",
        textColor: d.status === "completed" ? "#4aba6a" : "#e55b5b",
        label: d.cat,
      })),
      ...studentCE.map((ce: any) => ({
        id: "ce-" + ce.id, title: ce.title, date: ce.date,
        bgColor: "rgba(82,139,255,0.08)", borderColor: "#5A83F3", textColor: "#7aabff",
        label: "strategist",
        onClick: () => {
          if (confirm('Delete event "' + ce.title + '"?')) handleDeleteEvent(ce.id);
        },
      })),
      ...studentGE.map((ge: any) => ({
        id: "gcal-" + ge.id, title: ge.title, date: ge.date,
        bgColor: "#dbeafe", borderColor: "#60a5fa", textColor: "#7aabff",
        label: "google", meetingLink: ge.meetingLink || "", location: ge.location || "",
      })),
    ];

    return {
      id: s.id, name: s.name, subtitle: "Gr. " + s.grade,
      avatar: s.av, avatarBg: "rgba(82,139,255,0.08)", avatarColor: "#7aabff",
      events,
      onClick: () => { onSelectStudent(s); onNavigate("detail"); },
    };
  });

  return (
    <div>
      <PageHeader
        title="Timeline"
        sub="All deadlines at a glance."
        right={
          <div className="flex gap-2 items-center">
            <Button onClick={() => setShowDeadlineModal(true)}>+ New Deadline</Button>
            <Button primary onClick={() => setShowModal(true)}>+ New Event</Button>
          </div>
        }
      />

      <div className="p-4 px-8">
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex gap-0.5 border border-line rounded-lg p-1" style={{ background: "#252525" }}>
            {([["calendar", "Calendar"], ["table", "Table"]] as const).map(([id, l]) => (
              <button key={id} onClick={() => setViewMode(id)}
                className="px-5 py-2 rounded-lg border-none cursor-pointer text-sm font-semibold"
                style={{ background: viewMode === id ? "#5A83F3" : "transparent", color: viewMode === id ? "#fff" : "#717171" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Calendar filter pills (only in calendar mode) */}
          {viewMode === "calendar" && (
            <div className="flex gap-1 flex-wrap">
              {cats.map((c) => (
                <button key={c} onClick={() => setCalFilter(c)}
                  className="px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold capitalize"
                  style={{
                    background: calFilter === c ? "rgba(82,139,255,0.08)" : "#252525",
                    border: "1px solid " + (calFilter === c ? "#5A83F3" : "#333"),
                    color: calFilter === c ? "#7aabff" : "#717171",
                  }}>
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          )}

          {/* Show Completed toggle + Active filters summary (only in table mode) */}
          {viewMode === "table" && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-9 h-5 rounded-full relative transition-colors cursor-pointer"
                  style={{ background: showCompleted ? "#4aba6a" : "#333" }}
                >
                  <div
                    className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                    style={{ background: "#fff", left: showCompleted ? 18 : 2 }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: showCompleted ? "#4aba6a" : "#717171" }}>
                  Show Completed
                </span>
              </label>
              {activeFilterCount > 0 && (
                <>
                  <span className="text-xs text-sub">
                    {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                    · {filteredDeadlines.length} result{filteredDeadlines.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border-none cursor-pointer"
                    style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {viewMode === "calendar" ? (
          <WeeklyCalendar rows={calendarRows} personalRow={personalRow} />
        ) : (
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {/* Table Header with per-column filters */}
            <div
              className="grid px-5 py-3 border-b border-line"
              style={{ gridTemplateColumns: "110px 2fr 1fr 1.5fr 1fr 1fr 90px", background: "#252525" }}
            >
              {/* Due Date — sort only */}
              <SortOnlyHeader field="due" label="Due Date" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />

              {/* Title — sort only */}
              <SortOnlyHeader field="title" label="Project" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />

              {/* Category — filter + sort */}
              <FilterDropdown
                label="Type"
                field="category"
                options={filterOptions.category}
                selected={colFilters.category.length > 0 ? colFilters.category : filterOptions.category}
                onChange={(v) => setFilter("category", v.length === filterOptions.category.length ? [] : v)}
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />

              {/* Student — filter + sort */}
              <FilterDropdown
                label="Student"
                field="student"
                options={filterOptions.student}
                selected={colFilters.student.length > 0 ? colFilters.student : filterOptions.student}
                onChange={(v) => setFilter("student", v.length === filterOptions.student.length ? [] : v)}
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />

              {/* Specialist — filter + sort */}
              <FilterDropdown
                label="Specialist"
                field="specialist"
                options={filterOptions.specialist}
                selected={colFilters.specialist.length > 0 ? colFilters.specialist : filterOptions.specialist}
                onChange={(v) => setFilter("specialist", v.length === filterOptions.specialist.length ? [] : v)}
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />

              {/* Status — filter + sort */}
              <FilterDropdown
                label="Status"
                field="status"
                options={filterOptions.status}
                selected={colFilters.status.length > 0 ? colFilters.status : filterOptions.status}
                onChange={(v) => setFilter("status", v.length === filterOptions.status.length ? [] : v)}
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />

              <div className="text-xs text-sub uppercase tracking-widest font-semibold">Actions</div>
            </div>

            {/* Table Rows */}
            {filteredDeadlines.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-sub text-sm mb-2">No results match your filters.</div>
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer"
                  style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              filteredDeadlines.map((d, idx) => {
                const isOverdue = d.status === "overdue";
                const isCE = (d as any).isCounselorEvent;
                return (
                  <div
                    key={d.id + "-" + idx}
                    className="grid px-5 py-3 border-b border-line items-center hover:bg-mist cursor-pointer"
                    style={{
                      gridTemplateColumns: "110px 2fr 1fr 1.5fr 1fr 1fr 90px",
                      background: isOverdue ? "rgba(229,91,91,0.06)" : isCE ? "rgba(82,139,255,0.04)" : "#1e1e1e",
                    }}
                    onClick={() => {
                      const student = students.find((s) => s.id === d.studentId);
                      if (student) { onSelectStudent(student); onNavigate("detail"); }
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: isOverdue ? "#e55b5b" : "#ebebeb" }}>
                      {new Date(d.due + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      {isCE && <span className="text-[10px]">📅</span>}
                      {(d as any).internalOnly && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: "rgba(229,168,59,0.08)", color: "#e5a83b", border: "1px solid rgba(229,168,59,0.15)" }}>Internal</span>
                      )}
                      <span className="text-sm font-medium text-heading truncate">{d.title}</span>
                      {(d as any).responsible?.length > 0 && (
                        <span className="text-[10px] flex-shrink-0" style={{ color: "#717171" }}>→ {(d as any).responsible.join(", ")}</span>
                      )}
                    </div>

                    <div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-semibold"
                        style={{ background: getCategoryColor(d.cat) + "15", color: getCategoryColor(d.cat) }}
                      >
                        {d.cat}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}
                      >
                        {d.studentAv}
                      </div>
                      <span className="text-sm text-body truncate">{d.studentName}</span>
                    </div>

                    <div className="text-sm text-sub truncate">{d.specialist || "—"}</div>

                    <Tag color={getStatusColor(d.status)}>
                      {isOverdue ? Math.abs(d.days) + "d late" : d.days === 0 ? "Today" : d.days + "d"}
                    </Tag>

                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {isCE && (
                        <button
                          onClick={() => handleDeleteEvent((d as any).counselorEventId)}
                          className="text-[10px] px-2 py-1 rounded cursor-pointer border-none font-semibold"
                          style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}
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
            <div className="px-5 py-2.5 border-t border-line flex justify-between items-center" style={{ background: "#252525" }}>
              <span className="text-xs text-sub">{filteredDeadlines.length} of {allDeadlines.length} items</span>
              <div className="flex gap-2 text-xs text-sub">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#e55b5b" }} /> Overdue
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#e5a83b" }} /> In Progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#505050" }} /> Planned
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
              <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: "#252525", border: "1px solid #2a2a2a", maxHeight: 160, overflowY: "auto" }}>
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

      {/* Create Deadline Modal */}
      {showDeadlineModal && (
        <Modal title="Create Deadline" onClose={() => setShowDeadlineModal(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            const f = new FormData(e.target as HTMLFormElement);
            const studentId = Number(f.get("student"));
            const due = f.get("due") as string;
            const actualDeadline = f.get("actualDeadline") as string;
            const internalOnly = f.get("internalOnly") === "on";
            const responsibleRaw = f.get("responsible") as string;
            const responsible = responsibleRaw ? responsibleRaw.split(",").map((r: string) => r.trim()).filter(Boolean) : [];
            const dueDate = new Date(due + "T00:00:00");
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            await addDeadline(studentId, {
              title: f.get("title") as string, due,
              category: f.get("category") as string,
              status: days < 0 ? "overdue" : "pending", days,
              specialist: f.get("specialist") as string,
              created_by: "strategist",
              internal_only: internalOnly, responsible,
              actual_deadline: actualDeadline || undefined,
            });
            if (onRefresh) await onRefresh();
            setSaving(false); setShowDeadlineModal(false);
          }}>
            <FormField label="Title"><input required name="title" placeholder="e.g. Send Jing school tour links for Columbia" style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Student">
                <select required name="student" style={inputStyle}>
                  {students.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </FormField>
              <FormField label="Category">
                <select name="category" style={inputStyle}>
                  <option value="planning">Planning</option><option value="essays">Essays</option>
                  <option value="applications">Applications</option><option value="testing">Testing</option>
                  <option value="extracurricular">Extracurricular</option><option value="Academics">Academics</option>
                  <option value="research">Research</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date (Internal)"><input required name="due" type="date" style={inputStyle} /></FormField>
              <FormField label="Actual Deadline (optional)">
                <input name="actualDeadline" type="date" style={inputStyle} />
                <div className="text-[10px] mt-1" style={{ color: "#717171" }}>Set internal due 48h before this date</div>
              </FormField>
            </div>
            <FormField label="Specialist (optional)"><input name="specialist" placeholder="e.g. Stephanie" style={inputStyle} /></FormField>
            <FormField label="Responsible Team Members">
              <input name="responsible" placeholder="e.g. Ren, Cole (comma separated)" style={inputStyle} />
              <div className="text-[10px] mt-1" style={{ color: "#717171" }}>Who on the team owns this task</div>
            </FormField>
            <div className="flex items-center gap-3 mt-3 mb-3 p-3 rounded-lg" style={{ background: "rgba(229,168,59,0.06)", border: "1px solid rgba(229,168,59,0.15)" }}>
              <input type="checkbox" name="internalOnly" id="dlInternal" className="w-4 h-4" style={{ accentColor: "#e5a83b" }} />
              <label htmlFor="dlInternal" className="cursor-pointer">
                <div className="text-sm font-semibold" style={{ color: "#e5a83b" }}>Internal Only</div>
                <div className="text-xs" style={{ color: "#717171" }}>Hidden from the student — only visible to staff</div>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setShowDeadlineModal(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Creating..." : "Create Deadline"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}