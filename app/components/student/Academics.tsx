"use client";

import { Student, Course } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { supabase } from "../../lib/supabase";
import { useState, useEffect } from "react";

// Inline GPA editor with save indicator
function GpaInput({ label, defaultVal, max, color, studentId, readOnly }: {
  label: string; defaultVal: number | null; max: number; color: string; studentId: number; readOnly?: boolean;
}) {
  const [val, setVal] = useState(defaultVal?.toString() || "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    const num = parseFloat(val);
    if (isNaN(num) || num === defaultVal) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, gpa: num }),
      });
      const result = await res.json();
      if (result.success || result.fallback) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        console.error("GPA save failed:", result.error);
        setStatus("error");
      }
    } catch (err) {
      console.error("GPA save error:", err);
      setStatus("error");
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-sub">{label}</label>
        {status === "saving" && <span className="text-[9px]" style={{ color: "#e5a83b" }}>Saving...</span>}
        {status === "saved" && <span className="text-[9px]" style={{ color: "#4aba6a" }}>✓ Saved</span>}
        {status === "error" && <span className="text-[9px]" style={{ color: "#e55b5b" }}>Failed</span>}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="—"
        disabled={readOnly}
        className="text-2xl font-bold w-full bg-transparent border-none outline-none"
        style={{ color }}
      />
    </Card>
  );
}

interface AcademicsProps {
  student: Student;
  courses: Course[];
  setCourses: (c: Course[]) => void;
  readOnly?: boolean;
  gradStudentMode?: boolean;
}

interface TranscriptFile {
  name: string;
  url: string;
  uploaded_at: string;
}

export function Academics({ student, courses, setCourses, readOnly = false, gradStudentMode = false }: AcademicsProps) {
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptFile[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [transcriptLabel, setTranscriptLabel] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#252525",
    border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  // Load existing transcripts
  useEffect(() => {
    loadTranscripts();
  }, [student.id]);

  const loadTranscripts = async () => {
    const { data, error } = await supabase.storage
      .from("transcripts")
      .list(`student-${student.id}/`, { limit: 20, sortBy: { column: "created_at", order: "desc" } });

    if (!error && data) {
      const files: TranscriptFile[] = data
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => ({
          name: f.name,
          url: supabase.storage.from("transcripts").getPublicUrl(`student-${student.id}/${f.name}`).data.publicUrl,
          uploaded_at: f.created_at || "",
        }));
      setTranscripts(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setTranscriptLabel("");
    e.target.value = "";
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile) return;
    setUploading(true);
    const label = transcriptLabel.trim() || pendingFile.name;
    const ext = pendingFile.name.split(".").pop() || "pdf";
    const safeName = label.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
    const fileName = `${Date.now()}-${safeName}.${ext}`;
    const path = `student-${student.id}/${fileName}`;

    const { error } = await supabase.storage
      .from("transcripts")
      .upload(path, pendingFile);

    if (error) {
      console.error("Upload error:", error.message);
      alert("Failed to upload transcript. Make sure the 'transcripts' storage bucket exists in Supabase.");
    } else {
      await loadTranscripts();
    }
    setUploading(false);
    setPendingFile(null);
    setTranscriptLabel("");
  };

  return (
    <div>
      <PageHeader
        title="Academics"
        sub={gradStudentMode ? "Upload your transcripts." : "Coursework and academic progress."}
        right={
          readOnly || gradStudentMode ? (
            readOnly ? <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span> : null
          ) : (
            <div className="flex gap-2">
              <Button primary onClick={() => setShowModal(true)}>+ Add Course</Button>
            </div>
          )
        }
      />
      <div className="p-5 px-6">
        {!gradStudentMode && (
          <>
        {/* GPA Metrics — editable */}
        <div className="grid grid-cols-2 gap-3.5 mb-5">
          <GpaInput
            label="GPA (Unweighted)"
            defaultVal={student.gpaUnweighted || student.gpa || null}
            max={4.0}
            color="#4aba6a"
            studentId={student.id}
            readOnly={readOnly}
          />
          <GpaInput
            label="GPA (Weighted)"
            defaultVal={student.gpaWeighted || student.gpa || null}
            max={5.0}
            color="#5A83F3"
            studentId={student.id}
            readOnly={readOnly}
          />
        </div>

        {/* Coursework Table */}
        <Card noPadding style={{ overflow: "hidden" }}>
          <div className="px-6 py-3 border-b border-line flex justify-between items-center" style={{ background: "#252525" }}>
            <span className="text-base font-bold text-heading">Coursework</span>
            {!readOnly && <Button onClick={() => setShowModal(true)}>+ Add Course</Button>}
          </div>
          {courses.length === 0 ? (
            <p className="text-sm text-sub py-6 text-center">
              No courses added yet.{!readOnly && " Add courses manually or upload a transcript below."}
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {["Course", "Level", "Sem 1", "Sem 2"].map((h) => (
                    <th key={h} style={{ padding: "10px 24px", textAlign: h.includes("Sem") ? "center" : "left", fontSize: 11, color: "#717171", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px 24px", fontSize: 14, fontWeight: 500, color: "#ebebeb" }}>{c.name}</td>
                    <td style={{ padding: "12px 24px", fontSize: 13, color: "#717171" }}>{c.lv}</td>
                    <td style={{ padding: "12px 24px", textAlign: "center", fontSize: 14, color: "#4aba6a", fontWeight: 700 }}>{c.s1}</td>
                    <td style={{ padding: "12px 24px", textAlign: "center", fontSize: 13, color: "#505050" }}>{c.s2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        </>
        )}

        {/* Transcript Upload Section */}
        {!readOnly && (
          <Card className="mt-3.5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="m-0 text-lg font-bold text-heading">Transcript</h3>
                <p className="m-0 text-xs text-sub mt-0.5">Upload your transcript instead of entering courses manually.</p>
              </div>
              <label
                className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
                style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff", border: "1px solid #bfdbfe" }}
              >
                📎 Upload File
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* Label prompt for uploaded file */}
            {pendingFile && (
              <div className="mb-4 p-4 rounded-lg" style={{ background: "rgba(82,139,255,0.04)", border: "1px solid rgba(82,139,255,0.15)" }}>
                <div className="text-sm font-semibold text-heading mb-2">Name this transcript</div>
                <p className="text-xs text-sub mb-3 m-0">
                  Give it a meaningful label (e.g. &quot;10th grade quarter 2&quot;, &quot;Junior year final&quot;)
                </p>
                <input
                  value={transcriptLabel}
                  onChange={(e) => setTranscriptLabel(e.target.value)}
                  placeholder={pendingFile.name.replace(/\.[^.]+$/, "")}
                  className="w-full px-3 py-2 rounded-lg text-sm mb-3"
                  style={{ background: "#252525", border: "1px solid #333", color: "#ebebeb", outline: "none" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleUploadConfirm()}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setPendingFile(null); setTranscriptLabel(""); }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                    style={{ background: "#252525", color: "#717171", border: "1px solid #333" }}>Cancel</button>
                  <button onClick={handleUploadConfirm}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                    style={{ background: "#5A83F3", color: "#fff", border: "none" }}>
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            )}

            {transcripts.length === 0 ? (
              <div
                className="rounded-lg py-8 text-center"
                style={{ background: "#252525", border: "2px dashed #e2e8f0" }}
              >
                <p className="text-sm text-sub m-0">No transcript uploaded yet.</p>
                <p className="text-xs text-sub m-0 mt-1">Accepted formats: PDF, PNG, JPG, DOC, DOCX</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {transcripts.map((t) => (
                  <a
                    key={t.name}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg no-underline"
                    style={{ background: "#252525", border: "1px solid #2a2a2a" }}
                  >
                    <span className="text-lg">📄</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-heading truncate">{t.name.replace(/^\d+-/, "")}</div>
                      {t.uploaded_at && (
                        <div className="text-xs text-sub">
                          Uploaded {new Date(t.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#5A83F3" }}>View ↗</span>
                  </a>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Read-only transcript display */}
        {readOnly && transcripts.length > 0 && (
          <Card className="mt-3.5">
            <h3 className="m-0 mb-3 text-lg font-bold text-heading">Transcript</h3>
            <div className="flex flex-col gap-2">
              {transcripts.map((t) => (
                <a
                  key={t.name}
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg no-underline"
                  style={{ background: "#252525", border: "1px solid #2a2a2a" }}
                >
                  <span className="text-lg">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-heading truncate">{t.name.replace(/^\d+-/, "")}</div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "#5A83F3" }}>View ↗</span>
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>

      {showModal && (
        <Modal title="Add Course" onClose={() => setShowModal(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.target as HTMLFormElement);
            setCourses([...courses, { id: Date.now(), name: f.get("n") as string, lv: f.get("l") as string, s1: f.get("g") as string, s2: "In Progress" }]);
            setShowModal(false);
          }}>
            <FormField label="Course Name"><input required name="n" style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Level">
                <select name="l" style={inputStyle}>
                  <option>Regular</option><option>Honors</option><option>Advanced Placement</option><option>IB</option>
                </select>
              </FormField>
              <FormField label="Sem 1 Grade"><input required name="g" style={inputStyle} /></FormField>
            </div>
            <div className="flex justify-end mt-2"><Button primary type="submit">Save</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}