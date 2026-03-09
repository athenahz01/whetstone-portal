"use client";

import { Student, Deadline, School, Session } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { updateDeadline, addDeadline, deleteDeadline, updateStudent, deleteStudent, addSchool, updateSchool, deleteSchool, addSession, updateSession, deleteSession } from "../../lib/queries";
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
  width: "100%", padding: "10px 14px", background: "#252525",
  border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function StudentDetail({ student: s, onBack, onRefresh, profileId }: StudentDetailProps) {
  const tc: Record<string, string> = { reach: "#e55b5b", match: "#e5a83b", safety: "#4aba6a" };

  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [addingDeadline, setAddingDeadline] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Student edit/delete state
  const [editingStudent, setEditingStudent] = useState(false);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  // School state
  const [addingSchool, setAddingSchool] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [confirmDeleteSchoolId, setConfirmDeleteSchoolId] = useState<number | null>(null);

  // Session state
  const [addingSession, setAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<number | null>(null);

  const loginDays = daysSinceLogin(s.lastLogin);
  const loginLabel = formatLastLogin(s.lastLogin);
  const loginColor =
    loginDays === Infinity ? "#505050"
    : loginDays >= 3 ? "#e55b5b"
    : loginDays >= 1 ? "#e5a83b"
    : "#4aba6a";

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

  // ── Edit student info ───────────────────────────────────────────────────
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const success = await updateStudent(s.id, {
      name: f.get("name") as string,
      grade: Number(f.get("grade")),
      school: f.get("school") as string,
      gradYear: Number(f.get("gradYear")),
      gpa: f.get("gpa") ? Number(f.get("gpa")) : undefined,
      sat: f.get("sat") ? Number(f.get("sat")) : null,
      status: f.get("status") as string,
      engagement: f.get("engagement") ? Number(f.get("engagement")) : undefined,
    });
    if (success && onRefresh) await onRefresh();
    setSaving(false);
    setEditingStudent(false);
  };

  // ── Delete student ──────────────────────────────────────────────────────
  const handleDeleteStudent = async () => {
    setDeletingStudent(true);
    const success = await deleteStudent(s.id);
    if (success) {
      onBack();
      if (onRefresh) await onRefresh();
    }
    setDeletingStudent(false);
    setConfirmDeleteStudent(false);
  };

  // ── School handlers ───────────────────────────────────────────────────
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const success = await addSchool(s.id, {
      name: f.get("name") as string,
      type: f.get("type") as string,
      status: f.get("status") as string,
      deadline: f.get("deadline") as string,
      essay: f.get("essay") as string,
    });
    if (success && onRefresh) await onRefresh();
    setSaving(false);
    setAddingSchool(false);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const success = await updateSchool(editingSchool.id!, {
      name: f.get("name") as string,
      type: f.get("type") as string,
      status: f.get("status") as string,
      deadline: f.get("deadline") as string,
      essay: f.get("essay") as string,
    });
    if (success && onRefresh) await onRefresh();
    setSaving(false);
    setEditingSchool(null);
  };

  const handleDeleteSchool = async (id: number) => {
    setDeleting(true);
    const success = await deleteSchool(id);
    if (success && onRefresh) await onRefresh();
    setDeleting(false);
    setConfirmDeleteSchoolId(null);
    setEditingSchool(null);
  };

  // ── Session handlers ──────────────────────────────────────────────────
  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const success = await addSession(s.id, {
      date: f.get("date") as string,
      notes: f.get("notes") as string,
      action: f.get("action") as string,
    });
    if (success && onRefresh) await onRefresh();
    setSaving(false);
    setAddingSession(false);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const success = await updateSession(editingSession.id!, {
      date: f.get("date") as string,
      notes: f.get("notes") as string,
      action: f.get("action") as string,
    });
    if (success && onRefresh) await onRefresh();
    setSaving(false);
    setEditingSession(null);
  };

  const handleDeleteSession = async (id: number) => {
    setDeleting(true);
    const success = await deleteSession(id);
    if (success && onRefresh) await onRefresh();
    setDeleting(false);
    setConfirmDeleteSessionId(null);
    setEditingSession(null);
  };

  return (
    <div>
      <PageHeader
        title={s.name}
        sub={`Grade ${s.grade} · ${s.school} · Class of ${s.gradYear}${s.email ? ` · ${s.email}` : ""}`}
        right={
          <div className="flex gap-2">
            <button
              onClick={() => setEditingStudent(true)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #333", background: "#252525", color: "#a0a0a0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => setConfirmDeleteStudent(true)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(229,91,91,0.2)", background: "#252525", color: "#e55b5b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              🗑 Delete
            </button>
            <Button onClick={onBack}>← Back</Button>
          </div>
        }
      />
      <div className="p-6 px-8">
        {/* ── Metric Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          <MetricCard
            label="Schools"
            value={s.schools.length}
            detail={`${s.schools.filter((x) => x.status === "Submitted").length} submitted`}
            color="#4aba6a"
          />
          <MetricCard
            label="Engagement"
            value={`${s.engagement}%`}
            color={s.engagement > 80 ? "#4aba6a" : "#e55b5b"}
          />

          {/* Last Login */}
          <div className="rounded-xl p-5 border-t-4 shadow-sm bg-white" style={{ borderTopColor: loginColor }}>
            <p className="text-xs font-semibold tracking-widest text-faint uppercase mb-2">Last Login</p>
            <p className="text-2xl font-bold leading-tight" style={{ color: loginColor }}>{loginLabel}</p>
            {loginDays >= 3 && loginDays !== Infinity && (
              <p className="text-xs mt-1" style={{ color: "#e55b5b" }}>⚠ Inactive {loginDays} days</p>
            )}
            {loginDays === Infinity && (
              <p className="text-xs mt-1 text-faint">Has not logged in yet</p>
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
            color="#528bff"
          />
          <MetricCard
            label="SAT"
            value={formatSAT(s)}
            detail={satDetail || undefined}
            color="#a480f2"
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
                style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff", border: "1px solid #bfdbfe" }}
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
                    background: d.status === "overdue" ? "rgba(229,91,91,0.08)" : "#252525",
                    borderLeft: `3px solid ${d.status === "overdue" ? "#e55b5b" : getCategoryColor(d.cat)}`,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-heading flex items-center gap-2">
                      <span className="truncate">{d.title}</span>
                      {/* Lock icon for strategist-created deadlines */}
                      {isStrategistCreated && (
                        <span className="text-[10px] flex-shrink-0 text-faint" title="Added by strategist">🔒</span>
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
                        <span className="text-[10px] px-1.5 py-0 rounded font-semibold" style={{ background: "rgba(164,128,242,0.08)", color: "#a480f2" }}>
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
            <div className="flex justify-between items-center mb-3.5">
              <h3 className="m-0 text-lg font-bold text-heading">Schools</h3>
              <button
                onClick={() => setAddingSchool(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff", border: "1px solid #bfdbfe" }}
              >
                + Add School
              </button>
            </div>
            {s.schools.length === 0 && (
              <p className="text-sm text-sub py-4 text-center">No schools added yet</p>
            )}
            {s.schools.map((sc) => (
              <div
                key={sc.id}
                onClick={() => setEditingSchool(sc)}
                className="p-2.5 px-3 rounded-lg mb-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "#252525", borderLeft: `3px solid ${tc[sc.type]}` }}
              >
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-heading">{sc.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Tag color={tc[sc.type]}>{sc.type}</Tag>
                    <span className="text-[10px] text-sub">✏️</span>
                  </div>
                </div>
                <div className="text-xs text-sub mt-0.5">{sc.status} · Essay: {sc.essay}</div>
              </div>
            ))}
          </Card>
        </div>

        {/* Sessions */}
        <Card className="mt-3.5">
          <div className="flex justify-between items-center mb-3.5">
            <h3 className="m-0 text-lg font-bold text-heading">Sessions</h3>
            <button
              onClick={() => setAddingSession(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff", border: "1px solid #bfdbfe" }}
            >
              + Add Session
            </button>
          </div>
          {s.sess.length === 0 && (
            <p className="text-sm text-sub py-4 text-center">No sessions yet</p>
          )}
          {s.sess.map((ss) => (
            <div
              key={ss.id}
              onClick={() => setEditingSession(ss)}
              className="p-3 px-4 rounded-lg mb-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: "#252525", borderLeft: "3px solid #528bff" }}
            >
              <div className="flex justify-between mb-1.5">
                <div className="text-sm font-bold" style={{ color: "#7aabff" }}>{ss.date}</div>
                <span className="text-[10px] text-sub">✏️</span>
              </div>
              <p className="m-0 mb-2 text-sm text-body leading-relaxed">{ss.notes}</p>
              <span className="text-xs text-sub">Action: </span>
              <span className="text-sm font-semibold" style={{ color: "#7aabff" }}>{ss.action}</span>
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
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "rgba(82,139,255,0.06)", color: "#7aabff", border: "1px solid #bfdbfe" }}
                  >
                    📄 Open Doc
                  </a>
                )}
                {/* Strategists can delete any deadline */}
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(editingDeadline.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(229,91,91,0.08)", color: "#e55b5b", border: "1px solid rgba(229,91,91,0.2)", cursor: "pointer" }}
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

      {/* ── Delete Deadline Confirmation ─────────────────────────────────── */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl border border-line p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-heading mb-2">Delete Deadline?</h3>
            <p className="text-sm text-sub mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <button
                onClick={() => handleDeleteDeadline(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: "#e55b5b", border: "none", cursor: "pointer" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Student Modal ─────────────────────────────────────────────── */}
      {editingStudent && (
        <Modal title="Edit Student" onClose={() => setEditingStudent(false)}>
          <form onSubmit={handleSaveStudent}>
            <FormField label="Full Name">
              <input required name="name" defaultValue={s.name} style={inputStyle} />
            </FormField>
            <FormField label="School">
              <input required name="school" defaultValue={s.school} style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Grade">
                <input required name="grade" type="number" min="9" max="12" defaultValue={s.grade} style={inputStyle} />
              </FormField>
              <FormField label="Graduation Year">
                <input required name="gradYear" type="number" defaultValue={s.gradYear} style={inputStyle} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="GPA">
                <input name="gpa" type="number" step="0.01" min="0" max="5" defaultValue={s.gpa ?? ""} placeholder="e.g. 3.85" style={inputStyle} />
              </FormField>
              <FormField label="SAT">
                <input name="sat" type="number" min="400" max="1600" defaultValue={s.sat ?? ""} placeholder="e.g. 1480" style={inputStyle} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Status">
                <select name="status" defaultValue={s.status} style={inputStyle}>
                  <option value="on-track">On Track</option>
                  <option value="needs-attention">Needs Attention</option>
                </select>
              </FormField>
              <FormField label="Engagement %">
                <input name="engagement" type="number" min="0" max="100" defaultValue={s.engagement} style={inputStyle} />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => setEditingStudent(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Student Confirmation ────────────────────────────────────── */}
      {confirmDeleteStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl border border-line p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-heading mb-2">Delete {s.name}?</h3>
            <p className="text-sm text-sub mb-4">
              This will permanently remove this student and all their data (deadlines, schools, sessions, etc.). This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteStudent(false)}>Cancel</Button>
              <button
                onClick={handleDeleteStudent}
                disabled={deletingStudent}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: "#e55b5b", border: "none", cursor: "pointer" }}
              >
                {deletingStudent ? "Deleting..." : "Delete Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add School Modal ───────────────────────────────────────────────── */}
      {addingSchool && (
        <Modal title="Add School" onClose={() => setAddingSchool(false)}>
          <form onSubmit={handleAddSchool}>
            <FormField label="School Name">
              <input required name="name" placeholder="e.g. Stanford University" style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Type">
                <select required name="type" style={inputStyle} defaultValue="reach">
                  <option value="reach">Reach</option>
                  <option value="match">Match</option>
                  <option value="safety">Safety</option>
                </select>
              </FormField>
              <FormField label="Application Status">
                <select name="status" style={inputStyle} defaultValue="Not started">
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Waitlisted">Waitlisted</option>
                  <option value="Deferred">Deferred</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Deadline">
                <input name="deadline" type="date" style={inputStyle} />
              </FormField>
              <FormField label="Essay Status">
                <select name="essay" style={inputStyle} defaultValue="Not started">
                  <option value="Not started">Not started</option>
                  <option value="Drafting">Drafting</option>
                  <option value="Reviewing">Reviewing</option>
                  <option value="Final">Final</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </FormField>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => setAddingSchool(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Adding..." : "Add School"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit School Modal ──────────────────────────────────────────────── */}
      {editingSchool && (
        <Modal title="Edit School" onClose={() => setEditingSchool(null)}>
          <form onSubmit={handleSaveSchool}>
            <FormField label="School Name">
              <input required name="name" defaultValue={editingSchool.name} style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Type">
                <select required name="type" defaultValue={editingSchool.type} style={inputStyle}>
                  <option value="reach">Reach</option>
                  <option value="match">Match</option>
                  <option value="safety">Safety</option>
                </select>
              </FormField>
              <FormField label="Application Status">
                <select name="status" defaultValue={editingSchool.status} style={inputStyle}>
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Waitlisted">Waitlisted</option>
                  <option value="Deferred">Deferred</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Deadline">
                <input name="deadline" type="date" defaultValue={editingSchool.deadline} style={inputStyle} />
              </FormField>
              <FormField label="Essay Status">
                <select name="essay" defaultValue={editingSchool.essay} style={inputStyle}>
                  <option value="Not started">Not started</option>
                  <option value="Drafting">Drafting</option>
                  <option value="Reviewing">Reviewing</option>
                  <option value="Final">Final</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </FormField>
            </div>
            <div className="flex justify-between mt-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteSchoolId(editingSchool.id!)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(229,91,91,0.08)", color: "#e55b5b", border: "1px solid rgba(229,91,91,0.2)", cursor: "pointer" }}
              >
                🗑 Delete
              </button>
              <div className="flex gap-2">
                <Button onClick={() => setEditingSchool(null)}>Cancel</Button>
                <Button primary type="submit">{saving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete School Confirmation ─────────────────────────────────────── */}
      {confirmDeleteSchoolId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl border border-line p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-heading mb-2">Delete School?</h3>
            <p className="text-sm text-sub mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteSchoolId(null)}>Cancel</Button>
              <button
                onClick={() => handleDeleteSchool(confirmDeleteSchoolId)}
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

      {/* ── Add Session Modal ──────────────────────────────────────────────── */}
      {addingSession && (
        <Modal title="Add Session" onClose={() => setAddingSession(false)}>
          <form onSubmit={handleAddSession}>
            <FormField label="Date">
              <input required name="date" type="date" style={inputStyle} />
            </FormField>
            <FormField label="Notes">
              <textarea required name="notes" rows={4} placeholder="Session notes..." style={{ ...inputStyle, resize: "vertical" }} />
            </FormField>
            <FormField label="Action Items">
              <input required name="action" placeholder="e.g. Complete Common App essay draft" style={inputStyle} />
            </FormField>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => setAddingSession(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Adding..." : "Add Session"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Session Modal ─────────────────────────────────────────────── */}
      {editingSession && (
        <Modal title="Edit Session" onClose={() => setEditingSession(null)}>
          <form onSubmit={handleSaveSession}>
            <FormField label="Date">
              <input required name="date" type="date" defaultValue={editingSession.date} style={inputStyle} />
            </FormField>
            <FormField label="Notes">
              <textarea required name="notes" rows={4} defaultValue={editingSession.notes} style={{ ...inputStyle, resize: "vertical" }} />
            </FormField>
            <FormField label="Action Items">
              <input required name="action" defaultValue={editingSession.action} style={inputStyle} />
            </FormField>
            <div className="flex justify-between mt-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteSessionId(editingSession.id!)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(229,91,91,0.08)", color: "#e55b5b", border: "1px solid rgba(229,91,91,0.2)", cursor: "pointer" }}
              >
                🗑 Delete
              </button>
              <div className="flex gap-2">
                <Button onClick={() => setEditingSession(null)}>Cancel</Button>
                <Button primary type="submit">{saving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Session Confirmation ────────────────────────────────────── */}
      {confirmDeleteSessionId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl border border-line p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-heading mb-2">Delete Session?</h3>
            <p className="text-sm text-sub mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDeleteSessionId(null)}>Cancel</Button>
              <button
                onClick={() => handleDeleteSession(confirmDeleteSessionId)}
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
    </div>
  );
}