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

// Bundle individual UC campuses into one folder
const UC_CAMPUSES = [
  "university of california-berkeley", "university of california-los angeles",
  "university of california-san diego", "university of california-davis",
  "university of california-irvine", "university of california-santa barbara",
  "university of california-santa cruz", "university of california-riverside",
  "university of california-merced",
  "uc berkeley", "uc los angeles", "ucla", "uc san diego", "ucsd",
  "uc davis", "uc irvine", "uc santa barbara", "ucsb", "uc santa cruz",
  "ucsc", "uc riverside", "ucr", "uc merced",
];
const UC_FOLDER = "University of California Applications";

function normalizeSchoolFolder(name: string): string {
  if (!name) return "General";
  if (name === UC_FOLDER) return UC_FOLDER;
  if (UC_CAMPUSES.includes(name.toLowerCase().trim())) return UC_FOLDER;
  return name;
}

// Default folders that always appear in the creation list
const SYSTEM_FOLDERS = ["General", "Common App", "Coalition App", UC_FOLDER, "UCAS Application (UK)"];

interface EssayLabProps { student: Student; readOnly?: boolean; onRefresh?: () => void; }

export function EssayLab({ student, readOnly = false, onRefresh }: EssayLabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set(["General"]));
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [addToFolder, setAddToFolder] = useState<string | null>(null);

  const essays = student.dl.filter(d => d.cat.toLowerCase() === "essays" && !d.internalOnly);

  // Group essays into folders (normalizing UC campuses)
  const byFolder = new Map<string, Deadline[]>();
  essays.forEach(e => {
    const folder = normalizeSchoolFolder(e.schoolName || "General");
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(e);
  });

  // Build folder order: General first, then alphabetical
  const activeFolders = Array.from(byFolder.keys()).sort((a, b) =>
    a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b)
  );

  // Collect all unique school names from the student's school list (for suggestions)
  const studentSchoolNames = student.schools.map(s => s.name);
  // Build available folders: active + system + student schools (deduped)
  const allFolderOptions = Array.from(new Set([
    ...activeFolders,
    ...SYSTEM_FOLDERS,
    ...studentSchoolNames.map(n => normalizeSchoolFolder(n)),
  ])).sort((a, b) => a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b));

  const toggleSchool = (s: string) => setExpandedSchools(prev => {
    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n;
  });

  const totalEssays = essays.length;
  const completed = essays.filter(e => e.status === "completed").length;
  const inProgress = essays.filter(e => e.status === "in-progress").length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const folder = addToFolder || f.get("schoolName") as string || "General";
    await addDeadline(student.id, {
      title: f.get("title") as string, due: f.get("due") as string, category: "essays",
      status: "pending", days: 0,
      google_doc_link: f.get("googleDocLink") as string || undefined,
      school_name: folder,
    });
    setSaving(false); setShowCreate(false); setAddToFolder(null);
    setExpandedSchools(prev => new Set([...prev, folder]));
    if (onRefresh) onRefresh();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return; setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    const rawSchool = f.get("schoolName") as string || "";
    await updateDeadline(editing.id, {
      title: f.get("title") as string, due: f.get("due") as string,
      status: f.get("status") as string,
      google_doc_link: f.get("googleDocLink") as string || "",
      school_name: normalizeSchoolFolder(rawSchool) || "General",
      description: f.get("description") as string || "",
    });
    setSaving(false); setEditing(null); if (onRefresh) onRefresh();
  };

  const handleDelete = async (id: number) => {
    await deleteDeadline(id); setConfirmDeleteId(null); setEditing(null); if (onRefresh) onRefresh();
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder = normalizeSchoolFolder(newFolderName.trim()) || newFolderName.trim();
    setExpandedSchools(prev => new Set([...prev, folder]));
    setShowAddFolder(false);
    setAddToFolder(folder);
    setShowCreate(true);
    setNewFolderName("");
  };

  return (
    <div>
      <PageHeader title="Essay Lab"
        sub={`${totalEssays} essays · ${completed} completed · ${inProgress} in progress · ${activeFolders.length} folders`}
        right={!readOnly && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddFolder(true)}
              className="px-4 py-2 rounded-full cursor-pointer text-xs font-semibold"
              style={{ background: "transparent", color: "#5A83F3", border: "1.5px solid #5A83F3" }}>+ New Folder</button>
            <button onClick={() => { setAddToFolder(null); setShowCreate(true); }}
              className="px-4 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
              style={{ background: "#5A83F3", color: "#fff" }}>+ Add Essay</button>
          </div>
        )} />
      <div className="p-4 md:p-5 px-4 md:px-6">
        {totalEssays === 0 && activeFolders.length === 0 ? (
          <Card><p className="text-sm text-sub text-center py-8">No essays yet.{!readOnly && " Create a folder or click \"+ Add Essay\" to get started."}</p></Card>
        ) : (
          <div className="flex flex-col gap-3">
            {activeFolders.map(folder => {
              const folderEssays = byFolder.get(folder) || [];
              const isExpanded = expandedSchools.has(folder);
              const folderCompleted = folderEssays.filter(e => e.status === "completed").length;
              // Surface shared doc link at folder level
              const docLinks = folderEssays.filter(e => e.googleDocLink).map(e => e.googleDocLink!);
              const sharedDoc = docLinks.length > 0 ? docLinks[0] : null;

              return (
                <Card key={folder} noPadding>
                  <button onClick={() => toggleSchool(folder)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer text-left"
                    style={{ borderBottom: isExpanded ? "1px solid #333" : "none" }}>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 16, color: isExpanded ? "#5A83F3" : "#505050" }}>
                        {isExpanded ? "📂" : "📁"}
                      </span>
                      <span className="text-sm font-bold text-heading">{folder}</span>
                      <span className="text-xs text-sub">{folderEssays.length} {folderEssays.length === 1 ? "essay" : "essays"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {sharedDoc && (
                        <button onClick={(e) => { e.stopPropagation(); window.open(sharedDoc, "_blank"); }}
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg border-none cursor-pointer"
                          style={{ background: "rgba(90,131,243,0.08)", color: "#5A83F3" }}>📄 Open Doc</button>
                      )}
                      {folderCompleted === folderEssays.length && folderEssays.length > 0
                        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(74,186,106,0.08)", color: "#4aba6a" }}>All complete</span>
                        : folderEssays.length > 0
                          ? <span className="text-[10px] text-sub">{folderCompleted}/{folderEssays.length} done</span>
                          : <span className="text-[10px] text-faint">Empty</span>}
                    </div>
                  </button>
                  {isExpanded && (<div>
                    {folderEssays.sort((a, b) => a.due.localeCompare(b.due)).map(essay => (
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
                              style={{ background: "rgba(90,131,243,0.08)", color: "#5A83F3" }}>📄 Doc</button>
                          )}
                          <Tag color={getStatusColor(essay.status)}>{STATUS_LABELS[essay.status] || essay.status}</Tag>
                          <span className="text-xs text-sub" style={{ minWidth: 65, textAlign: "right" }}>
                            {essay.status === "completed" ? "Done" : essay.days < 0 ? `${Math.abs(essay.days)}d late` : essay.days === 0 ? "Today" : `${essay.days}d`}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Inline add button at bottom of folder */}
                    {!readOnly && (
                      <button
                        onClick={() => { setAddToFolder(folder); setShowCreate(true); }}
                        className="w-full flex items-center gap-2 px-5 py-2.5 bg-transparent border-none cursor-pointer text-left hover:bg-mist transition-colors"
                        style={{ color: "#505050" }}>
                        <span style={{ fontSize: 13 }}>+</span>
                        <span className="text-xs">Add essay to {folder}</span>
                      </button>
                    )}
                  </div>)}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Essay Modal */}
      {showCreate && (
        <Modal title={addToFolder ? `Add Essay to ${addToFolder}` : "Add Essay"} onClose={() => { setShowCreate(false); setAddToFolder(null); }}>
          <form onSubmit={handleCreate}>
            <FormField label="Essay Name"><input required name="title" placeholder="e.g. Common App Essay - Draft 1" style={inputStyle} /></FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Folder">
                {addToFolder ? (
                  <div className="flex items-center gap-2">
                    <div style={{ ...inputStyle, background: "#1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>📁</span>
                      <span>{addToFolder}</span>
                    </div>
                    <input type="hidden" name="schoolName" value={addToFolder} />
                  </div>
                ) : (
                  <select name="schoolName" defaultValue="General" style={inputStyle}>
                    {allFolderOptions.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                )}
              </FormField>
              <FormField label="Due Date"><input required name="due" type="date" style={inputStyle} /></FormField>
            </div>
            <FormField label="Google Doc Link (optional)">
              <input name="googleDocLink" type="url" placeholder="https://docs.google.com/document/d/..." style={inputStyle} />
            </FormField>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => { setShowCreate(false); setAddToFolder(null); }}>Cancel</Button>
              <Button primary type="submit">{saving ? "Creating..." : "Add Essay"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Essay Modal */}
      {editing && (
        <Modal title="Edit Essay" onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit}>
            <FormField label="Essay Name"><input required name="title" defaultValue={editing.title} style={inputStyle} /></FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Folder">
                <select name="schoolName" defaultValue={normalizeSchoolFolder(editing.schoolName || "General")} style={inputStyle}>
                  {allFolderOptions.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
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

      {/* New Folder Modal */}
      {showAddFolder && (
        <Modal title="New Folder" onClose={() => { setShowAddFolder(false); setNewFolderName(""); }}>
          <FormField label="Folder Name">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. MIT, Stanford, UC Applications..."
              style={inputStyle}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateFolder(); } }}
              autoFocus
            />
          </FormField>
          <p className="text-[11px] text-sub mt-1 mb-3" style={{ lineHeight: 1.5 }}>
            Quick picks:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SYSTEM_FOLDERS.filter(f => !activeFolders.includes(f)).map(f => (
              <button key={f} onClick={() => setNewFolderName(f)}
                className="px-3 py-1.5 rounded-full border cursor-pointer text-[11px] font-medium"
                style={{
                  background: newFolderName === f ? "rgba(90,131,243,0.1)" : "transparent",
                  borderColor: newFolderName === f ? "#5A83F3" : "#333",
                  color: newFolderName === f ? "#5A83F3" : "#a0a0a0",
                }}>
                {f}
              </button>
            ))}
            {studentSchoolNames.filter(n => !activeFolders.includes(normalizeSchoolFolder(n)) && !SYSTEM_FOLDERS.includes(normalizeSchoolFolder(n))).slice(0, 6).map(n => (
              <button key={n} onClick={() => setNewFolderName(n)}
                className="px-3 py-1.5 rounded-full border cursor-pointer text-[11px] font-medium"
                style={{
                  background: newFolderName === n ? "rgba(90,131,243,0.1)" : "transparent",
                  borderColor: newFolderName === n ? "#5A83F3" : "#333",
                  color: newFolderName === n ? "#5A83F3" : "#a0a0a0",
                }}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setShowAddFolder(false); setNewFolderName(""); }}>Cancel</Button>
            <Button primary onClick={handleCreateFolder}>Create Folder</Button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
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