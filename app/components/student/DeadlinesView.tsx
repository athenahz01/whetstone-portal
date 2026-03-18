"use client";

import { useState, useEffect } from "react";
import { Deadline } from "../../types";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { addDeadline, updateDeadline, deleteDeadline } from "../../lib/queries";

interface DeadlinesViewProps {
  deadlines: Deadline[];
  studentId: number;
  onRefresh?: () => void;
  readOnly?: boolean;
  headerRight?: React.ReactNode; // extra content in the PageHeader right slot
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: "#252525",
  border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

function calcDaysFromToday(due: string): number {
  const dueDate = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#e55b5b",
  medium: "#e5a83b",
  low: "#5A83F3",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "To Do",
  "in-progress": "In Progress",
  overdue: "Overdue",
  completed: "Complete",
  blocked: "Blocked",
};

type SortField = "due" | "priority" | "title" | "specialist" | "status";
type FilterStatus = "all" | "pending" | "in-progress" | "overdue" | "completed" | "blocked";

export function DeadlinesView({ deadlines, studentId, onRefresh, readOnly = false, headerRight }: DeadlinesViewProps) {
  const [specialists, setSpecialists] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(data => {
        setSpecialists(
          (data.users || [])
            .filter((u: any) => u.role === "strategist" && u.name && u.name !== "—")
            .map((u: any) => u.name)
        );
      })
      .catch(() => {});
  }, []);

  const SPECIALISTS = specialists;
  const [sortBy, setSortBy] = useState<SortField>("due");
  const [sortAsc, setSortAsc] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addingDeadline, setAddingDeadline] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [quickAssign, setQuickAssign] = useState<number | null>(null);
  const [quickStatus, setQuickStatus] = useState<number | null>(null);

  const toggleGroup = (cat: string) => {
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
  };

  // Filter
  let filtered = [...deadlines];
  if (activeFilters.size > 0) {
    filtered = filtered.filter((d) => activeFilters.has(d.status));
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.cat.toLowerCase().includes(q) ||
      (d.specialist || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q)
    );
  }

  // Sort
  const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 };
  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "due": cmp = a.days - b.days; break;
      case "priority": cmp = (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3); break;
      case "title": cmp = a.title.localeCompare(b.title); break;
      case "specialist": cmp = (a.specialist || "").localeCompare(b.specialist || ""); break;
      case "status": cmp = a.status.localeCompare(b.status); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  // Group blocked items under their blocker
  const blockedItems = filtered.filter((d) => d.status === "blocked" && d.blockedBy);
  const nonBlocked = filtered.filter((d) => !(d.status === "blocked" && d.blockedBy));

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const due = f.get("due") as string;
    const days = calcDaysFromToday(due);
    await addDeadline(studentId, {
      title: f.get("title") as string,
      due,
      category: f.get("category") as string,
      status: days < 0 ? "overdue" : "pending",
      days,
      created_by: "student",
      specialist: f.get("specialist") as string || undefined,
      priority: f.get("priority") as string || undefined,
    });
    if (onRefresh) await onRefresh();
    setSaving(false);
    setAddingDeadline(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeadline) return;
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const updates: Record<string, string> = {
      title: f.get("title") as string,
      due: f.get("due") as string,
      category: f.get("category") as string,
      status: f.get("status") as string,
    };
    const priority = f.get("priority") as string;
    if (priority) (updates as any).priority = priority;
    const specialist = f.get("specialist") as string;
    (updates as any).specialist = specialist || "";
    const description = f.get("description") as string;
    if (description !== undefined) (updates as any).description = description;
    const blockedBy = f.get("blocked_by") as string;
    if (updates.status === "blocked") (updates as any).blocked_by = blockedBy || "";

    await updateDeadline(editingDeadline.id, updates);
    if (onRefresh) await onRefresh();
    setSaving(false);
    setEditingDeadline(null);
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    await deleteDeadline(id);
    if (onRefresh) await onRefresh();
    setDeleting(false);
    setConfirmDeleteId(null);
    setEditingDeadline(null);
  };

  const quickStatusUpdate = async (d: Deadline, newStatus: string) => {
    await updateDeadline(d.id, { status: newStatus });
    if (onRefresh) await onRefresh();
  };

  // Stats
  const todoCount = deadlines.filter((d) => d.status === "pending" || d.status === "in-progress").length;
  const overdueCount = deadlines.filter((d) => d.status === "overdue").length;
  const doneCount = deadlines.filter((d) => d.status === "completed").length;
  const blockedCount = deadlines.filter((d) => d.status === "blocked").length;

  // Render a single task row (used in both grouped and flat views)
  const renderTaskRow = (d: Deadline) => {
    const isOwn = d.createdBy === "student";
    const canEdit = !readOnly;
    const isCompleted = d.status === "completed";
    const blocked = blockedItems.filter((b) => b.blockedBy === d.title);
    const mentors = d.specialist ? d.specialist.split(",").map(s => s.trim()).filter(Boolean) : [];
    return (
      <div key={d.id}>
        <div
          onClick={() => canEdit && setEditingDeadline(d)}
          className="grid items-center px-3 py-2.5 border-b border-line transition-colors hover:bg-mist"
          style={{
            gridTemplateColumns: "2.5fr 100px 100px 110px 75px 32px",
            cursor: canEdit ? "pointer" : "default",
            opacity: isCompleted ? 0.45 : 1,
            background: d.status === "overdue" ? "rgba(229,91,91,0.04)" : "transparent",
          }}>
          {/* Title */}
          <div className="min-w-0 flex items-center gap-2">
            {!readOnly && (
              <input type="checkbox" checked={isCompleted}
                onClick={(e) => e.stopPropagation()}
                onChange={() => quickStatusUpdate(d, isCompleted ? "pending" : "completed")}
                className="flex-shrink-0 cursor-pointer"
                style={{ accentColor: "#4aba6a", width: 14, height: 14 }} />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-1.5"
                style={{ color: isCompleted ? "#505050" : "#ebebeb", textDecoration: isCompleted ? "line-through" : "none" }}>
                {d.title}
                {!isOwn && <span className="text-[9px] text-faint">🔒</span>}
                {d.googleDocLink && <span className="text-[9px] cursor-pointer" onClick={(e) => { e.stopPropagation(); window.open(d.googleDocLink, "_blank"); }}>📄</span>}
              </div>
              {d.description && <div className="text-[11px] text-sub truncate mt-0.5">{d.description}</div>}
            </div>
          </div>
          {/* Team avatars + quick assign */}
          <div className="flex items-center gap-0.5 relative" onClick={(e) => e.stopPropagation()}>
            {/* Existing mentor circles (stacked) */}
            {mentors.map((m, mi) => (
              <div key={mi} className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                style={{ background: "rgba(82,139,255,0.12)", color: "#5A83F3", marginLeft: mi > 0 ? -4 : 0, zIndex: mentors.length - mi }}
                title={m}>
                {m.split(" ").map(n => n[0]).join("").substring(0, 2)}
              </div>
            ))}
            {/* + button to add more */}
            {!readOnly && (
              <button onClick={(e) => { e.stopPropagation(); setQuickAssign(d.id === quickAssign ? null : d.id); }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-none cursor-pointer flex-shrink-0"
                style={{ background: "#333", color: "#717171", marginLeft: mentors.length > 0 ? -2 : 0 }}>+</button>
            )}
            {/* Multi-select dropdown */}
            {quickAssign === d.id && (
              <div className="absolute bottom-7 left-0 z-50 rounded-lg shadow-lg py-1.5" style={{ background: "#252525", border: "1px solid #333", width: 180 }}>
                <div className="px-3 py-1 text-[10px] font-bold text-sub uppercase tracking-wider">Select mentors</div>
                {SPECIALISTS.map((s) => {
                  const isSelected = mentors.includes(s);
                  return (
                    <button key={s} onClick={async (e) => {
                      e.stopPropagation();
                      let updated: string[];
                      if (isSelected) {
                        updated = mentors.filter(m => m !== s);
                      } else {
                        updated = [...mentors, s];
                      }
                      await updateDeadline(d.id, { specialist: updated.join(", ") });
                      if (onRefresh) onRefresh();
                    }}
                      className="w-full px-3 py-1.5 text-left text-xs bg-transparent border-none cursor-pointer flex items-center gap-2"
                      style={{ color: isSelected ? "#7aabff" : "#a0a0a0" }}>
                      <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] flex-shrink-0"
                        style={{ background: isSelected ? "rgba(82,139,255,0.15)" : "#333", color: isSelected ? "#5A83F3" : "#505050" }}>
                        {isSelected ? "✓" : ""}
                      </span>
                      {s}
                    </button>
                  );
                })}
                <div className="mt-1 pt-1 border-t border-line px-3">
                  <button onClick={(e) => { e.stopPropagation(); setQuickAssign(null); }}
                    className="w-full py-1 text-[10px] font-semibold bg-transparent border-none cursor-pointer"
                    style={{ color: "#5A83F3" }}>Done</button>
                </div>
              </div>
            )}
          </div>
          {/* Status — clickable dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {!readOnly ? (
              <button onClick={() => setQuickStatus(d.id === quickStatus ? null : d.id)}
                className="border-none bg-transparent cursor-pointer p-0">
                <Tag color={getStatusColor(d.status)}>{STATUS_LABELS[d.status] || d.status}</Tag>
              </button>
            ) : (
              <Tag color={getStatusColor(d.status)}>{STATUS_LABELS[d.status] || d.status}</Tag>
            )}
            {quickStatus === d.id && (
              <div className="absolute bottom-7 left-0 z-50 rounded-lg shadow-lg py-1.5" style={{ background: "#252525", border: "1px solid #333", width: 140 }}>
                {(["pending", "in-progress", "completed", "blocked"] as const).map((s) => (
                  <button key={s} onClick={async (e) => {
                    e.stopPropagation();
                    await updateDeadline(d.id, { status: s });
                    setQuickStatus(null);
                    if (onRefresh) onRefresh();
                  }}
                    className="w-full px-3 py-1.5 text-left text-xs bg-transparent border-none cursor-pointer"
                    style={{ color: d.status === s ? "#5A83F3" : "#a0a0a0" }}>
                    {d.status === s ? "✓ " : ""}{STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Due */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {!readOnly ? (
              <input type="date" value={d.due || ""}
                onChange={async (e) => {
                  await updateDeadline(d.id, { due: e.target.value });
                  if (onRefresh) onRefresh();
                }}
                className="text-xs bg-transparent border-none outline-none cursor-pointer"
                style={{ color: d.days < 0 ? "#e55b5b" : d.days <= 3 ? "#e5a83b" : "#717171", width: 100 }} />
            ) : (
              <div className="text-xs" style={{ color: d.days < 0 ? "#e55b5b" : d.days <= 3 ? "#e5a83b" : "#717171" }}>
                {d.due}
              </div>
            )}
          </div>
          {/* Priority */}
          <div>
            {d.priority ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${PRIORITY_COLORS[d.priority]}15`, color: PRIORITY_COLORS[d.priority] }}>{d.priority}</span>
            ) : <span className="text-[10px] text-faint">—</span>}
          </div>
          {/* Three-dot menu */}
          <div>
            <button onClick={(e) => { e.stopPropagation(); canEdit && setEditingDeadline(d); }}
              className="w-6 h-6 rounded flex items-center justify-center bg-transparent border-none cursor-pointer text-sub hover:text-heading"
              style={{ fontSize: 14 }}>⋯</button>
          </div>
        </div>
        {blocked.map((b) => (
          <div key={b.id} onClick={() => canEdit && setEditingDeadline(b)}
            className="grid items-center px-3 py-2 border-b border-line"
            style={{ gridTemplateColumns: "2.5fr 100px 100px 110px 75px 32px", cursor: canEdit ? "pointer" : "default", background: "rgba(229,91,91,0.03)", paddingLeft: 40 }}>
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-[10px] text-faint">↳</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-heading">{b.title}</div>
                <div className="text-[10px]" style={{ color: "#e55b5b" }}>Blocked by: {b.blockedBy}</div>
              </div>
            </div>
            <div />
            <div><Tag color="#e55b5b">Blocked</Tag></div>
            <div className="text-xs text-sub">{b.due}</div>
            <div>{b.priority ? <span className="text-[10px] font-semibold" style={{ color: PRIORITY_COLORS[b.priority] }}>{b.priority}</span> : <span className="text-[10px] text-faint">—</span>}</div>
            <div />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Tasks"
        sub={`${todoCount} to do · ${overdueCount} overdue · ${doneCount} completed${blockedCount > 0 ? ` · ${blockedCount} blocked` : ""}`}
        right={
          <div className="flex items-center gap-3">
            {readOnly ? (
              <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>
                View Only
              </span>
            ) : (
              <button
                onClick={() => setAddingDeadline(true)}
                className="flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                style={{ background: "#5A83F3", color: "#fff", border: "none", cursor: "pointer" }}
              >
                + Add Task
              </button>
            )}
            {headerRight}
          </div>
        }
      />

      <div className="p-5 px-6">
        {/* Heading */}
        <h2 className="text-lg font-bold text-heading m-0 mb-4">Projects &amp; Tasks</h2>

        {/* Filters bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Status filter toggles — multi-select */}
          <div className="flex gap-1.5">
            {(["pending", "in-progress", "overdue", "blocked", "completed"] as const).map((s) => {
              const isOn = activeFilters.has(s);
              return (
                <button key={s}
                  onClick={() => {
                    setActiveFilters((prev) => {
                      const n = new Set(prev);
                      n.has(s) ? n.delete(s) : n.add(s);
                      return n;
                    });
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
                  style={{
                    background: isOn ? "rgba(82,139,255,0.12)" : "#252525",
                    color: isOn ? "#7aabff" : "#717171",
                    border: isOn ? "1.5px solid #5A83F3" : "1.5px solid #333",
                  }}>
                  {isOn ? "✓ " : ""}{STATUS_LABELS[s] || s}
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button onClick={() => setActiveFilters(new Set())}
                className="px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer"
                style={{ background: "transparent", color: "#505050", border: "1px solid #333" }}>
                Clear
              </button>
            )}
          </div>

          {/* Search */}
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Keyword"
            className="flex-1 min-w-[200px]"
            style={{ ...inputStyle, padding: "8px 12px", fontSize: 13, maxWidth: 280 }}
          />

          {/* Expand All */}
          {groupByCategory && (
            <label className="flex items-center gap-1.5 text-xs text-sub cursor-pointer select-none">
              <input type="checkbox"
                checked={collapsedGroups.size === 0}
                onChange={() => {
                  if (collapsedGroups.size === 0) {
                    const allCats = [...new Set(filtered.map((d) => d.cat))];
                    setCollapsedGroups(new Set(allCats));
                  } else {
                    setCollapsedGroups(new Set());
                  }
                }}
                style={{ accentColor: "#5A83F3" }} />
              Expand All
            </label>
          )}

          {/* Group by toggle */}
          <button
            onClick={() => setGroupByCategory(!groupByCategory)}
            className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
            style={{
              background: groupByCategory ? "rgba(82,139,255,0.1)" : "#252525",
              color: groupByCategory ? "#7aabff" : "#717171",
              border: groupByCategory ? "1px solid #5A83F3" : "1px solid #333",
              marginLeft: "auto",
            }}
          >
            Group by Category
          </button>
        </div>

        {/* Table header */}
        <div
          className="grid items-center px-3 py-2 rounded-t-lg text-[10px] font-bold uppercase tracking-wider text-sub"
          style={{ gridTemplateColumns: "2.5fr 100px 100px 110px 75px 32px", background: "#252525", borderBottom: "1px solid #333" }}
        >
          <button onClick={() => handleSort("title")}
            className="bg-transparent border-none cursor-pointer text-left text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            style={{ color: sortBy === "title" ? "#7aabff" : "#717171" }}>
            Task {sortBy === "title" && <span style={{ fontSize: 8 }}>{sortAsc ? "▲" : "▼"}</span>}
          </button>
          <span>Team</span>
          <button onClick={() => handleSort("status")}
            className="bg-transparent border-none cursor-pointer text-left text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            style={{ color: sortBy === "status" ? "#7aabff" : "#717171" }}>
            Status {sortBy === "status" && <span style={{ fontSize: 8 }}>{sortAsc ? "▲" : "▼"}</span>}
          </button>
          <button onClick={() => handleSort("due")}
            className="bg-transparent border-none cursor-pointer text-left text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            style={{ color: sortBy === "due" ? "#7aabff" : "#717171" }}>
            Due Date {sortBy === "due" && <span style={{ fontSize: 8 }}>{sortAsc ? "▲" : "▼"}</span>}
          </button>
          <button onClick={() => handleSort("priority")}
            className="bg-transparent border-none cursor-pointer text-left text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            style={{ color: sortBy === "priority" ? "#7aabff" : "#717171" }}>
            Priority {sortBy === "priority" && <span style={{ fontSize: 8 }}>{sortAsc ? "▲" : "▼"}</span>}
          </button>
          <span />
        </div>

        {/* Rows */}
        <div className="rounded-b-lg overflow-visible" style={{ border: "1px solid #333", borderTop: "none" }}>
          {filtered.length === 0 && (
            <div className="text-sm text-sub text-center py-8">No tasks match your filters</div>
          )}

          {groupByCategory ? (
            // ── Grouped by Category ──
            (() => {
              const categories = [...new Set(filtered.map((d) => d.cat.toLowerCase()))].sort();
              return categories.map((cat) => {
                const catTasks = filtered.filter((d) => d.cat.toLowerCase() === cat);
                const isCollapsed = collapsedGroups.has(cat);
                const overdueCount = catTasks.filter((d) => d.status === "overdue").length;
                return (
                  <div key={cat}>
                    {/* Category header */}
                    <button onClick={() => toggleGroup(cat)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-line bg-transparent border-none cursor-pointer text-left"
                      style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-xs" style={{ color: "#717171" }}>{isCollapsed ? "▶" : "▼"}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md"
                        style={{ background: `${getCategoryColor(cat)}15`, color: getCategoryColor(cat) }}>
                        {cat}
                      </span>
                      <span className="text-xs text-sub">({catTasks.length} {catTasks.length === 1 ? "task" : "tasks"})</span>
                      {overdueCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,91,91,0.1)", color: "#e55b5b" }}>
                          {overdueCount} overdue
                        </span>
                      )}
                    </button>
                    {/* Category rows */}
                    {!isCollapsed && catTasks.map((d) => renderTaskRow(d))}
                  </div>
                );
              });
            })()
          ) : (
            // ── Flat list ──
            nonBlocked.map((d) => renderTaskRow(d))
          )}
        </div>
      </div>

      {/* Add deadline modal */}
      {addingDeadline && (
        <Modal title="Add Task" onClose={() => setAddingDeadline(false)}>
          <form onSubmit={handleAdd}>
            <FormField label="Title">
              <input required name="title" placeholder="e.g. Review Common App essay" style={inputStyle} />
            </FormField>
            <FormField label="Description (optional)">
              <textarea name="description" placeholder="Details about this task..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date">
                <input required name="due" type="date" style={inputStyle} />
              </FormField>
              <FormField label="Category">
                <select name="category" defaultValue="essays" style={inputStyle}>
                  <option value="essays">Essays</option>
                  <option value="applications">Applications</option>
                  <option value="extracurricular">Extracurricular</option>
                  <option value="Academics">Academics</option>
                  <option value="testing">Testing</option>
                  <option value="planning">Planning</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mentor">
                <select name="specialist" defaultValue="" style={inputStyle}>
                  <option value="">None</option>
                  {SPECIALISTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Priority">
                <select name="priority" defaultValue="" style={inputStyle}>
                  <option value="">None</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </FormField>
            </div>
            <div className="flex gap-2 justify-end mt-3">
              <Button onClick={() => setAddingDeadline(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Adding..." : "Add Task"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit deadline modal */}
      {editingDeadline && (
        <Modal title="Edit Task" onClose={() => setEditingDeadline(null)}>
          <form onSubmit={handleEdit}>
            <FormField label="Title">
              <input required name="title" defaultValue={editingDeadline.title} style={inputStyle} />
            </FormField>
            <FormField label="Description">
              <textarea name="description" defaultValue={editingDeadline.description || ""} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date">
                <input required name="due" type="date" defaultValue={editingDeadline.due} style={inputStyle} />
              </FormField>
              <FormField label="Category">
                <select name="category" defaultValue={editingDeadline.cat} style={inputStyle}>
                  <option value="essays">Essays</option>
                  <option value="applications">Applications</option>
                  <option value="extracurricular">Extracurricular</option>
                  <option value="Academics">Academics</option>
                  <option value="testing">Testing</option>
                  <option value="planning">Planning</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Status">
                <select name="status" defaultValue={editingDeadline.status} style={inputStyle}>
                  <option value="pending">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Complete</option>
                  <option value="blocked">Blocked</option>
                </select>
              </FormField>
              <FormField label="Priority">
                <select name="priority" defaultValue={editingDeadline.priority || ""} style={inputStyle}>
                  <option value="">None</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </FormField>
              <FormField label="Mentor">
                <select name="specialist" defaultValue={editingDeadline.specialist || ""} style={inputStyle}>
                  <option value="">None</option>
                  {SPECIALISTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Blocked by (task name)">
              <input name="blocked_by" defaultValue={editingDeadline.blockedBy || ""} placeholder="Leave blank if not blocked" style={inputStyle} />
            </FormField>
            <div className="flex justify-between mt-3">
              {editingDeadline.createdBy === "student" || !readOnly ? (
                <button type="button" onClick={() => setConfirmDeleteId(editingDeadline.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(229,91,91,0.08)", color: "#e55b5b", border: "1px solid rgba(229,91,91,0.2)", cursor: "pointer" }}>
                  🗑 Delete
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <Button onClick={() => setEditingDeadline(null)}>Cancel</Button>
                <Button primary type="submit">{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl border border-line p-6 w-full max-w-sm mx-4" style={{ background: "#1e1e1e" }}>
            <h3 className="text-base font-bold text-heading mb-2">Delete Task?</h3>
            <p className="text-sm text-sub mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <button onClick={() => handleDelete(confirmDeleteId)} disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#e55b5b", border: "none", cursor: "pointer" }}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}