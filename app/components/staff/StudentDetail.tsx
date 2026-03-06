"use client";

import { Student, Deadline } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { updateDeadline, addDeadline, deleteDeadline } from "../../lib/queries";
import { useState } from "react";

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  onRefresh?: () => void;
  profileId?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatLastLogin(lastLogin: string | null | undefined): string {
  if (!lastLogin || lastLogin === "Never" || lastLogin === "") return "Never";
  const parsed = new Date(lastLogin);
  if (isNaN(parsed.getTime())) return "Never";
  const diffMs = Date.now() - parsed.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysSinceLogin(lastLogin: string | null | undefined): number {
  if (!lastLogin || lastLogin === "Never" || lastLogin === "") return Infinity;
  const parsed = new Date(lastLogin);
  if (isNaN(parsed.getTime())) return Infinity;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function formatSAT(student: Student): string {
  const s = student as any;
  if (s.satMath && s.satEnglish) return String(Number(s.satMath) + Number(s.satEnglish));
  if (s.sat_math && s.sat_english) return String(Number(s.sat_math) + Number(s.sat_english));
  return student.sat != null ? String(student.sat) : "—";
}

function formatSATDetail(student: Student): string {
  const s = student as any;
  if (s.satMath && s.satEnglish) return `M: ${s.satMath} · E: ${s.satEnglish}`;
  if (s.sat_math && s.sat_english) return `M: ${s.sat_math} · E: ${s.sat_english}`;
  return "";
}

// Calculate days from today to a due date string
function calcDaysFromToday(due: string): number {
  const dueDate = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: "#fff",
  border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function StudentDetail({ student: s, onBack, onRefresh, profileId }: StudentDetailProps) {
  const tc: Record<string, string> = { reach: "#ef4444", match: "#d97706", safety: "#16a34a" };

  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [addingDeadline, setAddingDeadline] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loginDays = daysSinceLogin(s.lastLogin);
  const loginLabel = formatLastLogin(s.lastLogin);
  const loginColor =
    loginDays === Infinity ? "#94a3b8"
    : loginDays >= 3 ? "#ef4444"
    : loginDays >= 1 ? "#d97706"
    : "#16a34a";

  const satDetail = formatSATDetail(s);

  // ── Edit existing deadline ────────────────────────────────────────────────
  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeadline) return;
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const due = f.get("due") as string;
    const updates = {
      title: f.get("title") as string,
      due,
      category: f.get("category") as string,
      status: f.get("status") as string,
      specialist: f.get("specialist") as string,
      google_doc_link: f.get("google_doc_link") as string,
    };
    const success = await updateDeadline(editingDeadline.id, updates);
    if (success && onRefresh) await onRefresh();
    setSaving(false);
    setEditingDeadline(null);
  };

  // ── Add new deadline (strategist) ────────────────────────────────────────
  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const due = f.get("due") as string;
    const days = calcDaysFromToday(due);
    const status = days < 0 ? "overdue" : "pending";

    const success = await addDeadline(s.id, {
      title: f.get("title") as string,
      due,
      category: f.get("category") as string,
      status,
      days,
      specialist: f.get("specialist") as string || undefined,
      google_doc_link: f.get("google_doc_link") as string || undefined,
      created_by: "strategist",
    });
    if (success && onRefresh) await onRefresh();
    setSaving(false);
    setAddingDeadline(false);
  };

  // ── Delete deadline ───────────────────────────────────────────────────────
  const handleDeleteDeadline = async (id: number) => {
    setDeleting(true);
    const success = await deleteDeadline(id);
    if (success && onRefresh) await onRefresh();
    setDeleting(false);
    setConfirmDeleteId(null);
    setEditingDeadline(null);
  };

  return (
    <div>
      <PageHeader
        title={s.name}
        sub={`Grade ${s.grade} · ${s.school} · Class of ${s.gradYear}${s.email ? ` · ${s.email}` : ""}`}
        right={<Button onClick={onBack}>← Back</Button>}
      />
      <div className="p-6 px-8">
        {/* ── Metric Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          <MetricCard
            label="Schools"
            value={s.schools.length}
            detail={`${s.schools.filter((x) => x.status === "Submitted").length} submitted`}
            color="#16a34a"
          />
          <MetricCard
            label="Engagement"
            value={`${s.engagement}%`}
            color={s.engagement > 80 ? "#16a34a" : "#ef4444"}
          />

          {/* Last Login */}
          <div className="rounded-xl p-5 border-t-4 shadow-sm bg-white" style={{ borderTopColor: loginColor }}>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Last Login</p>
            <p className="text-2xl font-bold leading-tight" style={{ color: loginColor }}>{loginLabel}</p>
            {loginDays >= 3 && loginDays !== Infinity && (
              <p className="text-xs mt-1" style={{ color: "#ef4444" }}>⚠ Inactive {loginDays} days</p>
            )}
            {loginDays === Infinity && (
              <p className="text-xs mt-1 text-gray-400">Has not logged in yet</p>
            )}
          </div>

          <MetricCard
            label="GPA"
            value={
              s.gpaUnweighted && s.gpaWeighted ? `UW: ${s.gpaUnweighted}`
              : s.gpaUnweighted ? s.gpaUnweighted
              : s.gpaWeighted ? s.gpaWeighted
              : s.gpa || "—"
            }
            detail={s.gpaUnweighted && s.gpaWeighted ? `W: ${s.gpaWeighted}` : undefined}
            color="#3b82f6"
          />
          <MetricCard
            label="SAT"
            value={formatSAT(s)}
            detail={satDetail || undefined}
            color="#7c3aed"
          />
        </div>

        {/* ── Main Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Deadlines */}
          <Card>
            <div className="flex justify-between items-center mb-3.5">
              <h3 className="m-0 text-lg font-bold text-heading">Deadlines</h3>
              <button
                onClick={() => setAddingDeadline(true)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
              >
                + Add Deadline
              </button>
            </div>
            {s.dl.length === 0 && (
              <p className="text-sm text-sub py-4 text-center">No deadlines yet</p>
            )}
            {s.dl.sort((a, b) => a.days - b.days).map((d) => {
              const isStrategistCreated = !d.createdBy || d.createdBy === "strategist";
              return (
                <div
                  key={d.id}
                  onClick={() => setEditingDeadline(d)}
                  className="flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: d.status === "overdue" ? "#fef2f2" : "#eef0f4",
                    borderLeft: `3px solid ${d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat)}`,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-heading flex items-center gap-2">
                      <span className="truncate">{d.title}</span>
                      {/* Lock icon for strategist-created deadlines */}
                      {isStrategistCreated && (
                        <span className="text-[10px] flex-shrink-0 text-gray-400" title="Added by strategist">🔒</span>
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-sub">{d.cat} · {d.due}</span>
                      {d.specialist && (
                        <span className="text-[10px] px-1.5 py-0 rounded font-semibold" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                          {d.specialist}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Tag color={getStatusColor(d.status)}>
                      {d.days < 0 ? `${Math.abs(d.days)}d late` : `${d.days}d`}
                    </Tag>
                    <span className="text-[10px] text-sub">✏️</span>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Schools */}
          <Card>
            <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Schools</h3>
            {s.schools.length === 0 && (
              <p className="text-sm text-sub py-4 text-center">No schools added yet</p>
            )}
            {s.schools.map((sc, i) => (
              <div key={i} className="p-2.5 px-3 rounded-lg mb-1.5" style={{ background: "#eef0f4", borderLeft: `3px solid ${tc[sc.type]}` }}>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-heading">{sc.name}</span>
                  <Tag color={tc[sc.type]}>{sc.type}</Tag>
                </div>
                <div className="text-xs text-sub mt-0.5">{sc.status} · Essay: {sc.essay}</div>
              </div>
            ))}
          </Card>
        </div>

        {/* Sessions */}
        <Card className="mt-3.5">
          <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Sessions</h3>
          {s.sess.length === 0 && (
            <p className="text-sm text-sub py-4 text-center">No sessions yet</p>
          )}
          {s.sess.map((ss, i) => (
            <div key={i} className="p-3 px-4 rounded-lg mb-1.5" style={{ background: "#eef0f4", borderLeft: "3px solid #3b82f6" }}>
              <div className="text-sm font-bold mb-1.5" style={{ color: "#1d4ed8" }}>{ss.date}</div>
              <p className="m-0 mb-2 text-sm text-body leading-relaxed">{ss.notes}</p>
              <span className="text-xs text-sub">Action: </span>
              <span className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>{ss.action}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Add Deadline Modal (strategist) ──────────────────────────────── */}
      {addingDeadline && (
        <Modal title="Add Deadline" onClose={() => setAddingDeadline(false)}>
          <form onSubmit={handleAddDeadline}>
            <FormField label="Title">
              <input required name="title" placeholder="e.g. Common App Essay Draft" style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date">
                <input required name="due" type="date" style={inputStyle} />
              </FormField>
              <FormField label="Category">
                <select name="category" style={inputStyle} defaultValue="essays">
                  <option value="Academics">Academics</option>
                  <option value="applications">Applications</option>
                  <option value="essays">Essays</option>
                  <option value="testing">Testing</option>
                  <option value="extracurricular">Extracurricular</option>
                  <option value="planning">Planning</option>
                </select>
              </FormField>
            </div>
            <FormField label="Specialist (optional)">
              <input name="specialist" placeholder="e.g. Stephanie" style={inputStyle} />
            </FormField>
            <FormField label="Google Doc Link (optional)">
              <input name="google_doc_link" type="url" placeholder="https://docs.google.com/..." style={inputStyle} />
            </FormField>
            <div className="flex gap-2 justify-end mt-3">
              <Button onClick={() => setAddingDeadline(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Adding..." : "Add Deadline"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Deadline Modal (strategist — all deadlines editable) ────── */}
      {editingDeadline && (
        <Modal title="Edit Deadline" onClose={() => setEditingDeadline(null)}>
          <form onSubmit={handleSaveDeadline}>
            <FormField label="Title">
              <input required name="title" defaultValue={editingDeadline.title} style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date">
                <input required name="due" type="date" defaultValue={editingDeadline.due} style={inputStyle} />
              </FormField>
              <FormField label="Category">
                <select name="category" defaultValue={editingDeadline.cat} style={inputStyle}>
                  <option value="Academics">Academics</option>
                  <option value="applications">Applications</option>
                  <option value="essays">Essays</option>
                  <option value="testing">Testing</option>
                  <option value="extracurricular">Extracurricular</option>
                  <option value="planning">Planning</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Status">
                <select name="status" defaultValue={editingDeadline.status} style={inputStyle}>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </FormField>
              <FormField label="Specialist">
                <input name="specialist" defaultValue={editingDeadline.specialist || ""} placeholder="e.g. Stephanie" style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Google Doc Link">
              <input name="google_doc_link" type="url" defaultValue={editingDeadline.googleDocLink || ""} placeholder="https://docs.google.com/..." style={inputStyle} />
            </FormField>
            <div className="flex justify-between mt-3">
              <div className="flex gap-2">
                {editingDeadline.googleDocLink && (
                  <a
                    href={editingDeadline.googleDocLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                  >
                    📄 Open Doc
                  </a>
                )}
                {/* Strategists can delete any deadline */}
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(editingDeadline.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", cursor: "pointer" }}
                >
                  🗑 Delete
                </button>
              </div>
              <div className="flex gap-2 ml-auto">
                <Button onClick={() => setEditingDeadline(null)}>Cancel</Button>
                <Button primary type="submit">{saving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Deadline?</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <button
                onClick={() => handleDeleteDeadline(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: "#ef4444", border: "none", cursor: "pointer" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}