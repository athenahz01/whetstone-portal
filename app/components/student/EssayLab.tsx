"use client";

import { useState } from "react";
import { Deadline, Student } from "../../types";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { getStatusColor } from "../../lib/colors";
import { Tag } from "../ui/Tag";
import { addDeadline, updateDeadline, deleteDeadline } from "../../lib/queries";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "#252525",
  border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
  fontSize: 13, outline: "none", boxSizing: "border-box" as const,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Not Started", "in-progress": "In Progress",
  urgent: "Urgent", overdue: "Overdue", completed: "Completed",
};

interface EssayLabProps { student: Student; readOnly?: boolean; onRefresh?: () => void; }

export function EssayLab({ student, readOnly = false, onRefresh }: EssayLabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set(["General"]));
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const essays = student.dl.filter(d => d.cat.toLowerCase() === "essays" && !d.internalOnly);
  const bySchool = new Map<string, Deadline[]>();
  essays.forEach(e => { const s = e.schoolName || "General"; if (!bySchool.has(s)) bySchool.set(s, []); bySchool.get(s)!.push(e); });
  const schoolOrder = Array.from(bySchool.keys()).sort((a, b) => a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b));
  const toggleSchool = (s: string) => setExpandedSchools(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const totalEssays = essays.length;
  const completed = essays.filter(e => e.status === "completed").length;
  const inProgress = essays.filter(e => e.status === "in-progress").length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    await addDeadline(student.id, {
      title: f.get("title") as string, due: f.get("due") as string, category: "essays",
      status: "pending", days: 0,
      google_doc_link: f.get("googleDocLink") as string || undefined,
      school_name: f.get("schoolName") as string || undefined,
    });
    setSaving(false); setShowCreate(false); if (onRefresh) onRefresh();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return; setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    await updateDeadline(editing.id, {
      title: f.get("title") as string, due: f.get("due") as string,
      status: f.get("status") as string,
      google_doc_link: f.get("googleDocLink") as string || "",
      school_name: f.get("schoolName") as string || "",
      description: f.get("description") as string || "",
    });
    setSaving(false); setEditing(null); if (onRefresh) onRefresh();
  };

  const handleDelete = async (id: number) => { await deleteDeadline(id); setConfirmDeleteId(null); setEditing(null); if (onRefresh) onRefresh(); };

  return (
    <div>
      <PageHeader title="Essay Lab"
        sub={`${totalEssays} essays · ${completed} completed · ${inProgress} in progress · ${schoolOrder.length} schools`}
        right={!readOnly && (<button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-full border-none cursor-pointer text-xs font-semibold" style={{ background: "#5A83F3", color: "#fff" }}>+ Add Essay</button>)} />
      <div className="p-5 px-6">
        {totalEssays === 0 ? (
          <Card><p className="text-sm text-sub text-center py-8">No essays yet.{!readOnly && " Click \"+ Add Essay\" to create your first essay task."}</p></Card>
        ) : (
          <div className="flex flex-col gap-3">
            {schoolOrder.map(school => {
              const schoolEssays = bySchool.get(school) || [];
              const isExpanded = expandedSchools.has(school);
              const schoolCompleted = schoolEssays.filter(e => e.status === "completed").length;
              return (
                <Card key={school} noPadding>
                  <button onClick={() => toggleSchool(school)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer text-left"
                    style={{ borderBottom: isExpanded ? "1px solid #333" : "none" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: isExpanded ? "#5A83F3" : "#505050" }}>{isExpanded ? "▼" : "▶"}</span>
                      <span className="text-sm font-bold text-heading">{school}</span>
                      <span className="text-xs text-sub">{schoolEssays.length} {schoolEssays.length === 1 ? "essay" : "essays"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {schoolCompleted === schoolEssays.length && schoolEssays.length > 0
                        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(74,186,106,0.08)", color: "#4aba6a" }}>All complete</span>
                        : <span className="text-[10px] text-sub">{schoolCompleted}/{schoolEssays.length} done</span>}
                    </div>
                  </button>
                  {isExpanded && (<div>
                    {schoolEssays.sort((a, b) => a.due.localeCompare(b.due)).map(essay => (
                      <div key={essay.id} onClick={() => !readOnly && setEditing(essay)}
                        className="flex items-center justify-between px-5 py-3 border-b border-line hover:bg-mist transition-colors"
                        style={{ cursor: readOnly ? "default" : "pointer" }}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input type="checkbox" checked={essay.status === "completed"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={async () => { if (readOnly) return; await updateDeadline(essay.id, { status: essay.status === "completed" ? "pending" : "completed" }); if (onRefresh) onRefresh(); }}
                            className="flex-shrink-0 cursor-pointer" style={{ accentColor: "#4aba6a", width: 14, height: 14 }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate" style={{ color: essay.status === "completed" ? "#505050" : "#ebebeb", textDecoration: essay.status === "completed" ? "line-through" : "none" }}>{essay.title}</div>
                            {essay.description && <div className="text-[11px] text-sub truncate mt-0.5">{essay.description}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          {essay.googleDocLink && (
                            <button onClick={(e) => { e.stopPropagation(); window.open(essay.googleDocLink, "_blank"); }}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border-none cursor-pointer"
                              style={{ background: "rgba(90,131,243,0.08)", color: "#5A83F3" }}>📄 Open Doc</button>
                          )}
                          <Tag color={getStatusColor(essay.status)}>{STATUS_LABELS[essay.status] || essay.status}</Tag>
                          <span className="text-xs text-sub" style={{ minWidth: 65, textAlign: "right" }}>
                            {essay.status === "completed" ? "Done" : essay.days < 0 ? `${Math.abs(essay.days)}d late` : essay.days === 0 ? "Today" : `${essay.days}d`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>)}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Add Essay" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <FormField label="Essay Name"><input required name="title" placeholder="e.g. Common App Essay - Draft 1" style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="School">
                <input name="schoolName" placeholder="e.g. Stanford University" style={inputStyle} list="school-suggestions" />
                <datalist id="school-suggestions">
                  {student.schools.map(s => <option key={s.name} value={s.name} />)}
                  <option value="General" /><option value="Common App" /><option value="Coalition App" />
                </datalist>
              </FormField>
              <FormField label="Due Date"><input required name="due" type="date" style={inputStyle} /></FormField>
            </div>
            <FormField label="Google Doc Link (optional)"><input name="googleDocLink" type="url" placeholder="https://docs.google.com/document/d/..." style={inputStyle} /></FormField>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Creating..." : "Add Essay"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Essay" onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit}>
            <FormField label="Essay Name"><input required name="title" defaultValue={editing.title} style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="School">
                <input name="schoolName" defaultValue={editing.schoolName || ""} style={inputStyle} list="school-suggestions-edit" />
                <datalist id="school-suggestions-edit">
                  {student.schools.map(s => <option key={s.name} value={s.name} />)}
                  <option value="General" /><option value="Common App" /><option value="Coalition App" />
                </datalist>
              </FormField>
              <FormField label="Due Date"><input required name="due" type="date" defaultValue={editing.due} style={inputStyle} /></FormField>
            </div>
            <FormField label="Google Doc Link"><input name="googleDocLink" type="url" defaultValue={editing.googleDocLink || ""} placeholder="https://docs.google.com/document/d/..." style={inputStyle} /></FormField>
            <FormField label="Notes / Prompt"><textarea name="description" rows={2} defaultValue={editing.description || ""} placeholder="Prompt, notes, etc." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></FormField>
            <FormField label="Status">
              <select name="status" defaultValue={editing.status} style={inputStyle}>
                <option value="pending">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
              </select>
            </FormField>
            <div className="flex justify-between mt-3">
              <button type="button" onClick={() => setConfirmDeleteId(editing.id)} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(229,91,91,0.08)", color: "#e55b5b", border: "1px solid rgba(229,91,91,0.2)", cursor: "pointer" }}>🗑 Delete</button>
              <div className="flex gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><Button primary type="submit">{saving ? "Saving..." : "Save"}</Button></div>
            </div>
          </form>
        </Modal>
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl border border-line p-6 w-full max-w-sm mx-4" style={{ background: "#1e1e1e" }}>
            <p className="text-sm text-heading font-semibold mb-3">Delete this essay?</p>
            <p className="text-xs text-sub mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <button onClick={() => handleDelete(confirmDeleteId)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#e55b5b", color: "#fff", border: "none", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}