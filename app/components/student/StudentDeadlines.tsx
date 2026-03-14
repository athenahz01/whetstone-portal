"use client";

import { useState } from "react";
import { Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Button } from "../ui/Button";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { addDeadline, updateDeadline, deleteDeadline } from "../../lib/queries";

interface StudentDeadlinesProps {
  deadlines: Deadline[];
  studentId: number;
  onRefresh?: () => void;
  readOnly?: boolean; // true for parent view
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

export function StudentDeadlines({ deadlines, studentId, onRefresh, readOnly = false }: StudentDeadlinesProps) {
  const [addingDeadline, setAddingDeadline] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const visibleDeadlines = deadlines.filter((d) => !d.internalOnly);
  const active = [...visibleDeadlines].filter((d) => d.status !== "completed").sort((a, b) => a.days - b.days);
  const completedList = [...visibleDeadlines].filter((d) => d.status === "completed").sort((a, b) => a.days - b.days);

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
    await updateDeadline(editingDeadline.id, {
      title: f.get("title") as string,
      due: f.get("due") as string,
      category: f.get("category") as string,
      status: f.get("status") as string,
    });
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

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="m-0 text-lg font-bold text-heading">Deadlines</h3>
          {!readOnly && (
            <button
              onClick={() => setAddingDeadline(true)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff", border: "1px solid #bfdbfe" }}
            >
              + Add My Deadline
            </button>
          )}
        </div>

        {active.length === 0 && completedList.length === 0 && (
          <p className="text-sm text-sub py-4 text-center">No deadlines yet</p>
        )}

        {active.length === 0 && completedList.length > 0 && (
          <p className="text-sm text-sub py-4 text-center">All deadlines completed! 🎉</p>
        )}

        {active.map((d) => {
          const isOwn = d.createdBy === "student";
          const canEdit = !readOnly && isOwn;

          return (
            <div
              key={d.id}
              onClick={() => canEdit && setEditingDeadline(d)}
              className={`flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5 transition-opacity ${canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
              style={{
                background: d.status === "overdue" ? "rgba(229,91,91,0.08)" : "#252525",
                borderLeft: `3px solid ${d.status === "overdue" ? "#e55b5b" : getCategoryColor(d.cat)}`,
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-heading flex items-center gap-2">
                  <span className="truncate">{d.title}</span>
                  {!isOwn && (
                    <span className="text-[10px] text-faint flex-shrink-0" title="Added by your strategist">
                      🔒 Mentor
                    </span>
                  )}
                  {isOwn && (
                    <span className="text-[10px] flex-shrink-0" style={{ color: "#a480f2", background: "rgba(164,128,242,0.08)", padding: "1px 5px", borderRadius: 4 }}>
                      Mine
                    </span>
                  )}
                  {d.googleDocLink && (
                    <span
                      className="text-[10px] flex-shrink-0"
                      title="Has Google Doc"
                      onClick={(e) => { e.stopPropagation(); window.open(d.googleDocLink, "_blank"); }}
                    >
                      📄
                    </span>
                  )}
                </div>
                <div className="text-xs text-sub mt-0.5">{d.cat} · {d.due}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Tag color={getStatusColor(d.status)}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : d.days === 0 ? "Today" : `${d.days}d`}
                </Tag>
                {canEdit && <span className="text-[10px] text-sub">✏️</span>}
              </div>
            </div>
          );
        })}

        {/* Completed section — collapsed by default */}
        {completedList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-line">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs font-semibold cursor-pointer bg-transparent border-none w-full text-left px-1 py-1"
              style={{ color: "#4aba6a" }}
            >
              <span style={{ fontSize: 10 }}>{showCompleted ? "▼" : "▶"}</span>
              ✓ Completed ({completedList.length})
            </button>
            {showCompleted && (
              <div className="mt-2">
                {completedList.map((d) => {
                  const isOwn = d.createdBy === "student";
                  const canEdit = !readOnly && isOwn;
                  return (
                    <div
                      key={d.id}
                      onClick={() => canEdit && setEditingDeadline(d)}
                      className={`flex justify-between items-center p-2 px-3 rounded-lg mb-1 ${canEdit ? "cursor-pointer" : ""}`}
                      style={{ opacity: 0.5, background: "rgba(74,186,106,0.04)", borderLeft: "3px solid rgba(74,186,106,0.3)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-sub flex items-center gap-2" style={{ textDecoration: "line-through" }}>
                          <span className="truncate">{d.title}</span>
                        </div>
                        <div className="text-xs text-faint mt-0.5">{d.cat} · {d.due}</div>
                      </div>
                      <Tag color="#4aba6a">Done</Tag>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Add deadline modal */}
      {addingDeadline && (
        <Modal title="Add My Deadline" onClose={() => setAddingDeadline(false)}>
          <form onSubmit={handleAdd}>
            <FormField label="Title">
              <input required name="title" placeholder="e.g. Review Common App essay" style={inputStyle} />
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

      {/* Edit deadline modal (student-owned only) */}
      {editingDeadline && editingDeadline.createdBy === "student" && (
        <Modal title="Edit My Deadline" onClose={() => setEditingDeadline(null)}>
          <form onSubmit={handleEdit}>
            <FormField label="Title">
              <input required name="title" defaultValue={editingDeadline.title} style={inputStyle} />
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
            <FormField label="Status">
              <select name="status" defaultValue={editingDeadline.status} style={inputStyle}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </FormField>
            <div className="flex justify-between mt-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(editingDeadline.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(229,91,91,0.08)", color: "#e55b5b", border: "1px solid rgba(229,91,91,0.2)", cursor: "pointer" }}
              >
                🗑 Delete
              </button>
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
          <div className="rounded-2xl border border-line p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-heading mb-2">Delete Deadline?</h3>
            <p className="text-sm text-sub mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#e55b5b", border: "none", cursor: "pointer" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}