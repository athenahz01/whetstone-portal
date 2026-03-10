"use client";

import { useState } from "react";
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
  low: "#528bff",
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
  const [sortBy, setSortBy] = useState<SortField>("due");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addingDeadline, setAddingDeadline] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter
  let filtered = [...deadlines];
  if (filterStatus !== "all") {
    filtered = filtered.filter((d) => d.status === filterStatus);
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

  return (
    <div>
      <PageHeader
        title="Roadmap"
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
                className="flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{ background: "#528bff", color: "#fff", border: "none", cursor: "pointer" }}
              >
                + Add Deadline
              </button>
            )}
            {headerRight}
          </div>
        }
      />

      <div className="p-6 px-8">
        {/* Filters bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Status filter pills */}
          <div className="flex gap-1">
            {(["all", "pending", "in-progress", "overdue", "blocked", "completed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none"
                style={{
                  background: filterStatus === s ? "rgba(82,139,255,0.1)" : "#252525",
                  color: filterStatus === s ? "#7aabff" : "#717171",
                  border: filterStatus === s ? "1px solid #528bff" : "1px solid #333",
                }}
              >
                {s === "all" ? "All" : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deadlines..."
            className="flex-1 min-w-[200px]"
            style={{ ...inputStyle, padding: "8px 12px", fontSize: 13, maxWidth: 300 }}
          />
        </div>

        {/* Table header */}
        <div
          className="grid items-center px-3 py-2 rounded-t-lg text-[10px] font-bold uppercase tracking-wider text-sub"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", background: "#252525", borderBottom: "1px solid #333" }}
        >
          {([
            ["title", "Task"],
            ["due", "Due"],
            ["specialist", "Specialist"],
            ["status", "Status"],
            ["priority", "Priority"],
          ] as [SortField, string][]).map(([field, label]) => (
            <button key={field} onClick={() => handleSort(field)}
              className="bg-transparent border-none cursor-pointer text-left text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ color: sortBy === field ? "#7aabff" : "#717171" }}>
              {label}
              {sortBy === field && <span style={{ fontSize: 8 }}>{sortAsc ? "▲" : "▼"}</span>}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="rounded-b-lg overflow-hidden" style={{ border: "1px solid #333", borderTop: "none" }}>
          {filtered.length === 0 && (
            <div className="text-sm text-sub text-center py-8">No deadlines match your filters</div>
          )}
          {nonBlocked.map((d) => {
            const isOwn = d.createdBy === "student";
            const canEdit = !readOnly;
            const isCompleted = d.status === "completed";
            const blocked = blockedItems.filter((b) => b.blockedBy === d.title);

            return (
              <div key={d.id}>
                <div
                  onClick={() => canEdit && setEditingDeadline(d)}
                  className="grid items-center px-3 py-2.5 border-b border-line transition-colors"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                    cursor: canEdit ? "pointer" : "default",
                    opacity: isCompleted ? 0.45 : 1,
                    background: d.status === "overdue" ? "rgba(229,91,91,0.04)" : "transparent",
                  }}
                >
                  {/* Title + description */}
                  <div className="min-w-0 flex items-center gap-2">
                    {!readOnly && (
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => quickStatusUpdate(d, isCompleted ? "pending" : "completed")}
                        className="flex-shrink-0 cursor-pointer"
                        style={{ accentColor: "#4aba6a", width: 14, height: 14 }}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5"
                        style={{ color: isCompleted ? "#505050" : "#ebebeb", textDecoration: isCompleted ? "line-through" : "none" }}>
                        {d.title}
                        {!isOwn && <span className="text-[9px] text-faint">🔒</span>}
                        {d.googleDocLink && (
                          <span className="text-[9px] cursor-pointer" onClick={(e) => { e.stopPropagation(); window.open(d.googleDocLink, "_blank"); }}>📄</span>
                        )}
                      </div>
                      {d.description && <div className="text-[11px] text-sub truncate mt-0.5">{d.description}</div>}
                    </div>
                  </div>

                  {/* Due */}
                  <div>
                    <div className="text-xs" style={{ color: d.days < 0 ? "#e55b5b" : d.days <= 3 ? "#e5a83b" : "#717171" }}>
                      {d.days < 0 ? `${Math.abs(d.days)}d late` : d.days === 0 ? "Today" : `${d.days}d`}
                    </div>
                    <div className="text-[10px] text-faint">{d.due}</div>
                  </div>

                  {/* Specialist */}
                  <div className="text-xs text-sub truncate">{d.specialist || "—"}</div>

                  {/* Status */}
                  <div>
                    <Tag color={getStatusColor(d.status)}>{STATUS_LABELS[d.status] || d.status}</Tag>
                  </div>

                  {/* Priority */}
                  <div>
                    {d.priority ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${PRIORITY_COLORS[d.priority]}15`, color: PRIORITY_COLORS[d.priority] }}>
                        {d.priority}
                      </span>
                    ) : (
                      <span className="text-[10px] text-faint">—</span>
                    )}
                  </div>
                </div>

                {/* Blocked sub-items */}
                {blocked.map((b) => (
                  <div key={b.id}
                    onClick={() => canEdit && setEditingDeadline(b)}
                    className="grid items-center px-3 py-2 border-b border-line"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                      cursor: canEdit ? "pointer" : "default",
                      background: "rgba(229,91,91,0.03)",
                      paddingLeft: 40,
                    }}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[10px] text-faint">↳</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate text-heading">{b.title}</div>
                        <div className="text-[10px]" style={{ color: "#e55b5b" }}>Blocked by: {b.blockedBy}</div>
                      </div>
                    </div>
                    <div className="text-xs text-sub">{b.days < 0 ? `${Math.abs(b.days)}d late` : `${b.days}d`}</div>
                    <div className="text-xs text-sub truncate">{b.specialist || "—"}</div>
                    <div><Tag color="#e55b5b">Blocked</Tag></div>
                    <div>{b.priority ? <span className="text-[10px] font-semibold" style={{ color: PRIORITY_COLORS[b.priority] }}>{b.priority}</span> : <span className="text-[10px] text-faint">—</span>}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add deadline modal */}
      {addingDeadline && (
        <Modal title="Add Deadline" onClose={() => setAddingDeadline(false)}>
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
            <div className="flex gap-2 justify-end mt-3">
              <Button onClick={() => setAddingDeadline(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Adding..." : "Add Deadline"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit deadline modal */}
      {editingDeadline && (
        <Modal title="Edit Deadline" onClose={() => setEditingDeadline(null)}>
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
            <div className="grid grid-cols-2 gap-3">
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
            <h3 className="text-base font-bold text-heading mb-2">Delete Deadline?</h3>
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
