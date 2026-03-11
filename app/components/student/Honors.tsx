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
  width: "100%",
  padding: "10px 12px",
  background: "#252525",
  border: "1px solid #333",
  borderRadius: 8,
  color: "#ebebeb",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#717171",
  marginBottom: 4, display: "block",
};

export function Honors({ honors, setHonors, readOnly = false, studentId }: HonorsProps) {
  const [openSlot, setOpenSlot] = useState<number>(-1);
  const [saving, setSaving] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const [extraSlots, setExtraSlots] = useState(0);
  const totalSlots = Math.max(TOTAL_SLOTS, honors.length) + extraSlots;
  const slots: (Honor | null)[] = Array.from({ length: totalSlots }, (_, i) =>
    honors[i] ?? null
  );

  const toggleSlot = (i: number) => setOpenSlot(openSlot === i ? -1 : i);

  const handleReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const fromHonor = honors[fromIdx];
    if (!fromHonor) return;
    const newHonors = [...honors];
    newHonors.splice(fromIdx, 1);
    const insertAt = Math.min(toIdx, newHonors.length);
    newHonors.splice(insertAt, 0, fromHonor);
    setHonors(newHonors);
    setDragFrom(null);
    setDragOver(null);
  };

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
        sub={`Common App format · ${honors.length}/${totalSlots} filled · 100 characters per title`}
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>
              View Only
            </span>
          ) : null
        }
      />

      <div className="p-6 px-8">
        <div className="rounded-xl overflow-hidden border border-line bg-white">
          {slots.map((honor, i) => {
            const isOpen = openSlot === i;
            const isEmpty = !honor;

            return (
              <div key={i}
                className="border-b border-line last:border-b-0"
                draggable={!readOnly && !isEmpty && !isOpen}
                onDragStart={() => !readOnly && !isEmpty && setDragFrom(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => { if (dragFrom !== null) handleReorder(dragFrom, i); }}
                onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                style={{ background: dragOver === i && dragFrom !== null && dragFrom !== i ? "rgba(82,139,255,0.06)" : "transparent" }}
              >
                {/* Accordion header */}
                <button
                  onClick={() => toggleSlot(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-mist"
                  style={{
                    background: isOpen ? "rgba(255,255,255,0.04)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {!readOnly && !isEmpty && (
                      <span className="text-faint text-xs cursor-grab select-none flex-shrink-0" title="Drag to reorder">⠿</span>
                    )}
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{
                        background: isEmpty ? "#333" : "rgba(74,186,106,0.1)",
                        color: isEmpty ? "#505050" : "#4aba6a",
                        border: isEmpty ? "1.5px dashed #505050" : "none",
                      }}
                    >
                      {isEmpty ? "" : "✓"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: isEmpty ? "#505050" : "#ebebeb" }}>
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
                  <span className="text-faint text-sm font-bold ml-4">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-2" style={{ background: "#252525" }}>
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

        {!readOnly && (
          <button
            onClick={() => {
              setExtraSlots((n) => n + 1);
              setOpenSlot(totalSlots);
            }}
            className="mt-3 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-dashed"
            style={{
              color: "#93c5fd",
              borderColor: "rgba(96,165,250,0.28)",
              background: "rgba(59,130,246,0.10)",
              cursor: "pointer",
            }}
          >
            + Add Another Honor
          </button>
        )}
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
          Honors {index + 1} title <span style={{ color: "#e55b5b" }}>*</span>
          <span style={{ fontWeight: 400 }}> (Max characters: 100)</span>
          <span style={{ fontSize: 11, color: title.length > 100 ? "#e55b5b" : "#505050", marginLeft: 4, fontWeight: title.length > 100 ? 600 : 400 }}>
            {title.length}/100
          </span>
        </label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ ...inputStyle, borderColor: title.length > 100 ? "#e55b5b" : "#333", color: title.length > 100 ? "#e55b5b" : "#ebebeb" }}
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
                style={{ accentColor: "#5A83F3" }}
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
                style={{ accentColor: "#5A83F3" }}
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
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(229,91,91,0.08)", color: "#e55b5b", border: "1px solid rgba(229,91,91,0.2)", cursor: "pointer" }}
          >
            Remove Honor
          </button>
        ) : <div />}
        <button
          type="submit"
          disabled={saving}
          style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#5A83F3", color: "#fff", border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving..." : honor ? "Save Changes" : "Add Honor"}
        </button>
      </div>
    </form>
  );
}