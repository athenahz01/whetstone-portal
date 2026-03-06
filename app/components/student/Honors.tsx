"use client";

import { useState } from "react";
import { PageHeader } from "../ui/PageHeader";
import { supabase } from "../../lib/supabase";

interface Honor {
  id: number;
  title: string;
  grades: number[];
  recognition: string[];
}

interface HonorsProps {
  honors: Honor[];
  setHonors: (h: Honor[]) => void;
  readOnly?: boolean;
  studentId?: number;
}

const GRADE_OPTIONS = [9, 10, 11, 12, "Post-graduate"] as const;
const RECOGNITION_LEVELS = ["School", "State/Regional", "National", "International"];
const TOTAL_SLOTS = 5;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "#fff",
  border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#64748b",
  marginBottom: 4, display: "block",
};

export function Honors({ honors, setHonors, readOnly = false, studentId }: HonorsProps) {
  const [openSlot, setOpenSlot] = useState<number>(-1);
  const [saving, setSaving] = useState(false);

  const slots: (Honor | null)[] = Array.from({ length: TOTAL_SLOTS }, (_, i) =>
    honors[i] ?? null
  );

  const toggleSlot = (i: number) => setOpenSlot(openSlot === i ? -1 : i);

  const handleSave = async (index: number, formData: FormData) => {
    setSaving(true);
    const title = formData.get("title") as string;
    const gradeValues = GRADE_OPTIONS
      .map((g) => formData.get(`grade_${g}`) === "on" ? g : null)
      .filter((g) => g !== null) as number[];
    const recognitionValues = RECOGNITION_LEVELS
      .filter((r) => formData.get(`rec_${r}`) === "on");

    const updated: Honor = {
      id: honors[index]?.id ?? Date.now(),
      title,
      grades: gradeValues,
      recognition: recognitionValues,
    };

    if (studentId) {
      if (honors[index]?.id && honors[index].id < 1e12) {
        await supabase.from("honors").update({
          title: updated.title, grades: updated.grades, recognition: updated.recognition,
        }).eq("id", updated.id);
      } else {
        const { data } = await supabase.from("honors").insert({
          student_id: studentId, title: updated.title,
          grades: updated.grades, recognition: updated.recognition,
        }).select("id").single();
        if (data) updated.id = data.id;
      }
    }

    const newHonors = [...honors];
    if (index < newHonors.length) {
      newHonors[index] = updated;
    } else {
      while (newHonors.length < index) newHonors.push(null as any);
      newHonors[index] = updated;
    }
    setHonors(newHonors.filter(Boolean) as Honor[]);
    setSaving(false);
    setOpenSlot(-1);
  };

  const handleDelete = async (index: number) => {
    const h = honors[index];
    if (h && studentId) {
      await supabase.from("honors").delete().eq("id", h.id);
    }
    const newHonors = [...honors];
    newHonors.splice(index, 1);
    setHonors(newHonors);
    setOpenSlot(-1);
  };

  return (
    <div>
      <PageHeader
        title="Honors"
        sub={`Common App format · ${honors.length}/${TOTAL_SLOTS} filled · 100 characters per title`}
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
              View Only
            </span>
          ) : null
        }
      />

      <div className="p-6 px-8">
        <div className="rounded-xl overflow-hidden border border-line bg-white shadow-sm">
          {slots.map((honor, i) => {
            const isOpen = openSlot === i;
            const isEmpty = !honor;

            return (
              <div key={i} className="border-b border-line last:border-b-0">
                {/* Accordion header */}
                <button
                  onClick={() => toggleSlot(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50"
                  style={{ background: isOpen ? "#f8f9fb" : "white", border: "none", cursor: "pointer" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{
                        background: isEmpty ? "#f1f5f9" : "#dcfce7",
                        color: isEmpty ? "#94a3b8" : "#16a34a",
                        border: isEmpty ? "1.5px dashed #cbd5e1" : "none",
                      }}
                    >
                      {isEmpty ? "" : "✓"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: isEmpty ? "#94a3b8" : "#0f172a" }}>
                        {isEmpty ? `Honors ${i + 1}` : honor.title}
                      </div>
                      {isEmpty && (
                        <div className="text-xs text-sub mt-0.5">[EMPTY]</div>
                      )}
                      {!isEmpty && honor.recognition.length > 0 && (
                        <div className="text-xs text-sub mt-0.5">{honor.recognition.join(", ")}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm font-bold ml-4">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-2" style={{ background: "#fafbfc" }}>
                    {readOnly ? (
                      isEmpty ? (
                        <p className="text-sm text-sub italic py-4 text-center">This slot is empty.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="col-span-2">
                            <span className="font-semibold text-sub text-xs uppercase">Title</span>
                            <p className="mt-1 text-body">{honor.title}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-sub text-xs uppercase">Grade Levels</span>
                            <p className="mt-1 text-body">{(honor.grades || []).join(", ") || "—"}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-sub text-xs uppercase">Level of Recognition</span>
                            <p className="mt-1 text-body">{(honor.recognition || []).join(", ") || "—"}</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <HonorForm
                        honor={honor}
                        index={i}
                        onSave={handleSave}
                        onDelete={isEmpty ? undefined : () => handleDelete(i)}
                        saving={saving}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── HonorForm sub-component ────────────────────────────────────────────────

interface HonorFormProps {
  honor: Honor | null;
  index: number;
  onSave: (index: number, formData: FormData) => void;
  onDelete?: () => void;
  saving: boolean;
}

function HonorForm({ honor, index, onSave, onDelete, saving }: HonorFormProps) {
  const [title, setTitle] = useState(honor?.title ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(index, new FormData(e.target as HTMLFormElement));
      }}
      className="space-y-4"
    >
      {/* Title */}
      <div>
        <label style={labelStyle}>
          Honors {index + 1} title <span style={{ color: "#ef4444" }}>*</span>
          <span style={{ fontWeight: 400 }}> (Max characters: 100)</span>
          <span style={{ fontSize: 11, color: title.length > 100 ? "#ef4444" : "#94a3b8", marginLeft: 4 }}>
            {title.length}/100
          </span>
        </label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          style={{ ...inputStyle, borderColor: title.length > 100 ? "#ef4444" : "#cbd5e1" }}
        />
      </div>

      {/* Grade level */}
      <div>
        <label style={labelStyle}>Grade level</label>
        <div className="flex flex-col gap-1.5 mt-1">
          {GRADE_OPTIONS.map((g) => (
            <label key={g} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                name={`grade_${g}`}
                defaultChecked={(honor?.grades ?? []).includes(g as any)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "#3b82f6" }}
              />
              {g}
            </label>
          ))}
        </div>
      </div>

      {/* Level of recognition */}
      <div>
        <label style={labelStyle}>Level(s) of recognition</label>
        <div className="flex flex-col gap-1.5 mt-1">
          {RECOGNITION_LEVELS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                name={`rec_${r}`}
                defaultChecked={(honor?.recognition ?? []).includes(r)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "#3b82f6" }}
              />
              {r}
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", cursor: "pointer" }}
          >
            Remove Honor
          </button>
        ) : <div />}
        <button
          type="submit"
          disabled={saving}
          style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving..." : honor ? "Save Changes" : "Add Honor"}
        </button>
      </div>
    </form>
  );
}