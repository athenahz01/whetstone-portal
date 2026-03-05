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
import { updateDeadline } from "../../lib/queries";
import { pushToGoogleCalendar } from "../../lib/calendar";
import { useState } from "react";

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  onRefresh?: () => void;
  profileId?: string | null;
}

export function StudentDetail({ student: s, onBack, onRefresh, profileId }: StudentDetailProps) {
  const tc: Record<string, string> = { reach: "#ef4444", match: "#d97706", safety: "#16a34a" };
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [saving, setSaving] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeadline) return;
    setSaving(true);

    const f = new FormData(e.target as HTMLFormElement);
    const updates = {
      title: f.get("title") as string,
      due: f.get("due") as string,
      category: f.get("category") as string,
      status: f.get("status") as string,
      specialist: f.get("specialist") as string,
      google_doc_link: f.get("google_doc_link") as string,
    };

    const success = await updateDeadline(editingDeadline.id, updates);
    if (success && onRefresh) {
      await onRefresh();
    }

    setSaving(false);
    setEditingDeadline(null);
  };

  return (
    <div>
      <PageHeader
        title={s.name}
        sub={`Grade ${s.grade} · ${s.school} · Class of ${s.gradYear}${s.email ? ` · ${s.email}` : ""}`}
        right={
          <div className="flex gap-2">
            <Button onClick={onBack}>← Back</Button>
          </div>
        }
      />
      <div className="p-6 px-8">
        <div className="grid grid-cols-5 gap-3 mb-5">
          <MetricCard label="GPA" value={
              s.gpaUnweighted && s.gpaWeighted
                ? `UW: ${s.gpaUnweighted}`
                : s.gpaUnweighted
                ? s.gpaUnweighted
                : s.gpaWeighted
                ? s.gpaWeighted
                : s.gpa || "—"
            } color="#3b82f6" />
          <MetricCard label="SAT" value={s.sat || "—"} color="#7c3aed" />
          <MetricCard label="Schools" value={s.schools.length} detail={`${s.schools.filter((x) => x.status === "Submitted").length} submitted`} color="#16a34a" />
          <MetricCard label="Engagement" value={`${s.engagement}%`} color={s.engagement > 80 ? "#16a34a" : "#ef4444"} />
          <MetricCard label="Last Login" value={s.lastLogin} color="#d97706" />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Deadlines */}
          <Card>
            <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Deadlines</h3>
            {s.dl.sort((a, b) => a.days - b.days).map((d) => (
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
                    {(d as any).googleDocLink && (
                      <span
                        className="text-[10px] flex-shrink-0"
                        title="Has Google Doc"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open((d as any).googleDocLink, "_blank");
                        }}
                      >
                        📄
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-sub">{d.cat} · {d.due}</span>
                    {(d as any).specialist && (
                      <span className="text-[10px] px-1.5 py-0 rounded font-semibold" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                        {(d as any).specialist}
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
            ))}
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
          </Card>
        </div>

        {/* Sessions */}
        <Card className="mt-3.5">
          <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Sessions</h3>
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

      {/* Edit Deadline Modal */}
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
                <input name="specialist" defaultValue={(editingDeadline as any).specialist || ""} placeholder="e.g. Stephanie" style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Google Doc Link">
              <input name="google_doc_link" type="url" defaultValue={(editingDeadline as any).googleDocLink || ""} placeholder="https://docs.google.com/..." style={inputStyle} />
            </FormField>
            <div className="flex justify-between mt-3">
              {(editingDeadline as any).googleDocLink && (
                <a
                  href={(editingDeadline as any).googleDocLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 12px", borderRadius: 8, fontSize: 13,
                    fontWeight: 600, textDecoration: "none",
                    background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
                  }}
                >
                  📄 Open Doc
                </a>
              )}
              <div className="flex gap-2 ml-auto">
                <Button onClick={() => setEditingDeadline(null)}>Cancel</Button>
                <Button primary type="submit">{saving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}