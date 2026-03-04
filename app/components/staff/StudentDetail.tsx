"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { updateStudent, deleteStudent, addDeadline, addSession } from "../../lib/queries";
import { pushToGoogleCalendar } from "../../lib/calendar";
import { useState } from "react";

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  onRefresh: () => void;
  profileId?: string | null;
}

export function StudentDetail({ student: s, onBack, onRefresh, profileId }: StudentDetailProps) {
  const [modal, setModal] = useState<"edit" | "deadline" | "session" | "delete" | null>(null);
  const [saving, setSaving] = useState(false);
  const tc: Record<string, string> = { reach: "#ef4444", match: "#d97706", safety: "#16a34a" };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    await updateStudent(s.id, {
      name: f.get("name") as string,
      grade: Number(f.get("grade")),
      gpa: Number(f.get("gpa")),
      sat: f.get("sat") ? Number(f.get("sat")) : null,
      school: f.get("school") as string,
      gradYear: Number(f.get("gradYear")),
      status: f.get("status") as string,
    });
    setSaving(false);
    setModal(null);
    onRefresh();
  };

  const handleDelete = async () => {
    setSaving(true);
    await deleteStudent(s.id);
    setSaving(false);
    setModal(null);
    onRefresh();
    onBack();
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const due = f.get("due") as string;
    const title = f.get("title") as string;
    const category = f.get("category") as string;
    const today = new Date();
    const dueDate = new Date(due);
    const days = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    await addDeadline(s.id, {
      title,
      due,
      category,
      status: days < 0 ? "overdue" : "pending",
      days,
    });

    // Push to Google Calendar if connected
    if (profileId) {
      await pushToGoogleCalendar(profileId, title, due, `Student: ${s.name} · Category: ${category}`);
    }

    setSaving(false);
    setModal(null);
    onRefresh();
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    await addSession(s.id, {
      date: f.get("date") as string,
      notes: f.get("notes") as string,
      action: f.get("action") as string,
    });

    // Push session to Google Calendar if connected
    if (profileId) {
      const sessionDate = f.get("date") as string;
      // Try to parse the date for Google Calendar
      const parsed = new Date(sessionDate);
      if (!isNaN(parsed.getTime())) {
        const isoDate = parsed.toISOString().split("T")[0];
        await pushToGoogleCalendar(
          profileId,
          `Session: ${s.name}`,
          isoDate,
          `Notes: ${f.get("notes")}\nAction: ${f.get("action")}`
        );
      }
    }

    setSaving(false);
    setModal(null);
    onRefresh();
  };

  return (
    <div>
      <PageHeader
        title={s.name}
        sub={`Grade ${s.grade} · ${s.school} · Class of ${s.gradYear}${s.email ? ` · ${s.email}` : ""}`}
        right={
          <div className="flex gap-2">
            <Button onClick={() => setModal("edit")}>Edit Student</Button>
            <Button onClick={() => setModal("delete")}>Delete</Button>
            <Button onClick={onBack}>← Back</Button>
          </div>
        }
      />
      <div className="p-6 px-8">
        <div className="grid grid-cols-5 gap-3 mb-5">
          <MetricCard label="GPA" value={s.gpa} color="#3b82f6" />
          <MetricCard label="SAT" value={s.sat || "—"} color="#7c3aed" />
          <MetricCard label="Schools" value={s.schools.length} detail={`${s.schools.filter((x) => x.status === "Submitted").length} submitted`} color="#16a34a" />
          <MetricCard label="Engagement" value={`${s.engagement}%`} color={s.engagement > 80 ? "#16a34a" : "#ef4444"} />
          <MetricCard label="Last Login" value={s.lastLogin} color="#d97706" />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Deadlines */}
          <Card>
            <div className="flex justify-between items-center mb-3.5">
              <h3 className="m-0 text-lg font-bold text-heading">Deadlines</h3>
              <Button primary onClick={() => setModal("deadline")}>+ Add</Button>
            </div>
            {s.dl.sort((a, b) => a.days - b.days).map((d) => (
              <div key={d.id} className="flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5"
                style={{
                  background: d.status === "overdue" ? "#fef2f2" : "#eef0f4",
                  borderLeft: `3px solid ${d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat)}`,
                }}>
                <div>
                  <div className="text-sm font-medium text-heading">{d.title}</div>
                  <span className="text-xs text-sub">{d.cat} · {d.due}</span>
                </div>
                <Tag color={getStatusColor(d.status)}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : `${d.days}d`}
                </Tag>
              </div>
            ))}
            {s.dl.length === 0 && <p className="text-sm text-sub">No deadlines yet.</p>}
          </Card>

          {/* Schools */}
          <Card>
            <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Schools</h3>
            {s.schools.map((sc, i) => (
              <div key={i} className="p-2.5 px-3 rounded-lg mb-1.5" style={{ background: "#eef0f4", borderLeft: `3px solid ${tc[sc.type]}` }}>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-heading">{sc.name}</span>
                  <Tag color={tc[sc.type]}>{sc.type}</Tag>
                </div>
                <div className="text-xs text-sub mt-0.5">{sc.status} · Essay: {sc.essay}</div>
              </div>
            ))}
            {s.schools.length === 0 && <p className="text-sm text-sub">No schools added yet.</p>}
          </Card>
        </div>

        {/* Sessions */}
        <Card className="mt-3.5">
          <div className="flex justify-between items-center mb-3.5">
            <h3 className="m-0 text-lg font-bold text-heading">Sessions</h3>
            <Button primary onClick={() => setModal("session")}>+ Add Session</Button>
          </div>
          {s.sess.map((ss, i) => (
            <div key={i} className="p-3 px-4 rounded-lg mb-1.5" style={{ background: "#eef0f4", borderLeft: "3px solid #3b82f6" }}>
              <div className="text-sm font-bold mb-1.5" style={{ color: "#1d4ed8" }}>{ss.date}</div>
              <p className="m-0 mb-2 text-sm text-body leading-relaxed">{ss.notes}</p>
              <span className="text-xs text-sub">Action: </span>
              <span className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>{ss.action}</span>
            </div>
          ))}
          {s.sess.length === 0 && <p className="text-sm text-sub">No sessions logged yet.</p>}
        </Card>
      </div>

      {/* Edit Student Modal */}
      {modal === "edit" && (
        <Modal title="Edit Student" onClose={() => setModal(null)}>
          <form onSubmit={handleEdit}>
            <FormField label="Full Name"><input required name="name" defaultValue={s.name} style={inputStyle} /></FormField>
            <FormField label="Student Email">
              <input name="email" type="email" defaultValue={s.email || ""} style={inputStyle} />
              <div className="text-xs text-sub mt-1">Used for account matching on signup.</div>
            </FormField>
            <FormField label="School"><input required name="school" defaultValue={s.school} style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Grade"><input required name="grade" type="number" defaultValue={s.grade} style={inputStyle} /></FormField>
              <FormField label="Graduation Year"><input required name="gradYear" type="number" defaultValue={s.gradYear} style={inputStyle} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="GPA"><input required name="gpa" type="number" step="0.01" defaultValue={s.gpa} style={inputStyle} /></FormField>
              <FormField label="SAT"><input name="sat" type="number" defaultValue={s.sat || ""} style={inputStyle} /></FormField>
            </div>
            <FormField label="Status">
              <select name="status" defaultValue={s.status} style={inputStyle}>
                <option value="on-track">On Track</option>
                <option value="needs-attention">Needs Attention</option>
              </select>
            </FormField>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setModal(null)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Deadline Modal */}
      {modal === "deadline" && (
        <Modal title="Add Deadline" onClose={() => setModal(null)}>
          <form onSubmit={handleAddDeadline}>
            <FormField label="Title"><input required name="title" style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date"><input required name="due" type="date" style={inputStyle} /></FormField>
              <FormField label="Category">
                <select name="category" style={inputStyle}>
                  <option>essays</option><option>applications</option><option>testing</option>
                  <option>extracurricular</option><option>planning</option><option>Academics</option>
                </select>
              </FormField>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setModal(null)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Saving..." : "Add Deadline"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Session Modal */}
      {modal === "session" && (
        <Modal title="Add Session Note" onClose={() => setModal(null)}>
          <form onSubmit={handleAddSession}>
            <FormField label="Date"><input required name="date" defaultValue={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} style={inputStyle} /></FormField>
            <FormField label="Notes"><textarea required name="notes" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></FormField>
            <FormField label="Action Item"><input required name="action" style={inputStyle} /></FormField>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setModal(null)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Saving..." : "Add Session"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {modal === "delete" && (
        <Modal title="Delete Student" onClose={() => setModal(null)}>
          <p className="text-sm text-body leading-relaxed mb-2">
            Are you sure you want to delete <strong>{s.name}</strong>? This will permanently remove all their data including schools, deadlines, tasks, courses, test scores, activities, goals, and session notes.
          </p>
          <p className="text-sm font-semibold mb-6" style={{ color: "#ef4444" }}>This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none text-white"
              style={{ background: saving ? "#94a3b8" : "#ef4444" }}
            >
              {saving ? "Deleting..." : "Yes, Delete Student"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}