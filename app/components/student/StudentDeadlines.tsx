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
  width: "100%", padding: "10px 14px", background: "#fff",
  border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
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

  const sorted = [...deadlines].sort((a, b) => a.days - b.days);

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
              style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
            >
              + Add My Deadline
            </button>
          )}
        </div>

        {sorted.length === 0 && (
          <p className="text-sm text-sub py-4 text-center">No deadlines yet</p>
        )}

        {sorted.map((d) => {
          const isOwn = d.createdBy === "student";
          const canEdit = !readOnly && isOwn;

          return (
            <div
              key={d.id}
              onClick={() => canEdit && setEditingDeadline(d)}
              className={`flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5 transition-opacity ${canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
              style={{
                background: d.status === "overdue" ? "#fef2f2" : "#eef0f4",
                borderLeft: `3px solid ${d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat)}`,
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-heading flex items-center gap-2">
                  <span className="truncate">{d.title}</span>
                  {/* Lock for strategist-created, subtle indicator */}
                  {!isOwn && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0" title="Added by your strategist">
                      🔒 Strategist
                    </span>
                  )}
                  {isOwn && (
                    <span className="text-[10px] flex-shrink-0" style={{ color: "#7c3aed", background: "#f5f3ff", padding: "1px 5px", borderRadius: 4 }}>
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
                {/* Only show edit icon if student owns it */}
                {canEdit && <span className="text-[10px] text-sub">✏️</span>}
              </div>
            </div>
          );
        })}
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
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", cursor: "pointer" }}
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
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Deadline?</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#ef4444", border: "none", cursor: "pointer" }}
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