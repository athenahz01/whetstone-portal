"use client";

import { useState } from "react";
import { Activity } from "../../types";
import { PageHeader } from "../ui/PageHeader";
import { supabase } from "../../lib/supabase";

interface ActivitiesProps {
  activities: Activity[];
  setActivities: (a: Activity[]) => void;
  readOnly?: boolean;
  studentId?: number;
}

const ACTIVITY_TYPES = [
  "Academic",
  "Art",
  "Athletics: Club",
  "Athletics: JV/Varsity",
  "Career Oriented",
  "Community Service (Volunteer)",
  "Computer/Technology",
  "Cultural",
  "Dance",
  "Debate/Speech",
  "Environmental",
  "Family Responsibilities",
  "Foreign Exchange",
  "Internship",
  "Journalism/Publication",
  "Junior R.O.T.C.",
  "LGBT",
  "Music: Instrumental",
  "Music: Vocal",
  "Other Club/Activity",
  "Religious",
  "Research",
  "Robotics",
  "School Spirit",
  "Science/Math",
  "Social Justice",
  "Sports: Club",
  "Student Govt./Politics",
  "Theater/Drama",
  "Work (Paid)",
];

const TIMING_OPTIONS = ["During school year", "During school break", "All year"];
const GRADE_OPTIONS = [9, 10, 11, 12, "Post-graduate"] as const;
const TOTAL_SLOTS = 10;

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

function charCount(val: string, max: number) {
  const over = val.length > max;
  return (
    <span style={{ fontSize: 11, color: over ? "#e55b5b" : "#505050", marginLeft: 4, fontWeight: over ? 600 : 400 }}>
      {val.length}/{max}
    </span>
  );
}

export function Activities({ activities, setActivities, readOnly = false, studentId }: ActivitiesProps) {
  const [openSlot, setOpenSlot] = useState<number>(-1);
  const [saving, setSaving] = useState(false);
  const [extraSlots, setExtraSlots] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const totalSlots = Math.max(TOTAL_SLOTS, activities.length) + extraSlots;
  const slots: (Activity | null)[] = Array.from({ length: totalSlots }, (_, i) =>
    activities[i] ?? null
  );

  const toggleSlot = (i: number) => setOpenSlot(openSlot === i ? -1 : i);

  const handleReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const fromAct = activities[fromIdx];
    const toAct = activities[toIdx];
    if (!fromAct) return; // can only drag filled slots
    const newActivities = [...activities];
    // Remove from old position, insert at new
    newActivities.splice(fromIdx, 1);
    const insertAt = toAct ? Math.min(toIdx, newActivities.length) : newActivities.length;
    newActivities.splice(insertAt, 0, fromAct);
    setActivities(newActivities);
    setDragFrom(null);
    setDragOver(null);
  };

  const handleSave = async (index: number, formData: FormData) => {
    setSaving(true);
    const gradeValues = GRADE_OPTIONS.map((g) => formData.get(`grade_${g}`) === "on" ? g : null).filter(Boolean);
    const timingValues = TIMING_OPTIONS.map((t) => formData.get(`timing_${t}`) === "on" ? t : null).filter(Boolean);

    const updated: Activity = {
      id: activities[index]?.id ?? Date.now(),
      type: formData.get("type") as string,
      pos: formData.get("position") as string,
      org: formData.get("org") as string,
      desc: formData.get("description") as string,
      gr: gradeValues as number[],
      timing: timingValues.join(", "),
      hrs: formData.get("hours") as string,
      wks: formData.get("weeks") as string,
    };

    const newActivities = [...activities];
    if (index < newActivities.length) {
      newActivities[index] = updated;
    } else {
      while (newActivities.length < index) newActivities.push(null as any);
      newActivities[index] = updated;
    }

    if (studentId) {
      if (activities[index]?.id && activities[index].id < 1e12) {
        await supabase.from("activities").update({
          type: updated.type, position: updated.pos, organization: updated.org,
          description: updated.desc, grades: updated.gr, timing: updated.timing,
          hours_per_week: updated.hrs, weeks_per_year: updated.wks,
        }).eq("id", updated.id);
      } else {
        const { data } = await supabase.from("activities").insert({
          student_id: studentId, type: updated.type, position: updated.pos,
          organization: updated.org, description: updated.desc, grades: updated.gr,
          timing: updated.timing, hours_per_week: updated.hrs, weeks_per_year: updated.wks,
        }).select("id").single();
        if (data) updated.id = data.id;
      }
    }

    setActivities(newActivities.filter(Boolean) as Activity[]);
    setSaving(false);
    setOpenSlot(-1);
  };

  const handleDelete = async (index: number) => {
    const act = activities[index];
    if (act && studentId) {
      await supabase.from("activities").delete().eq("id", act.id);
    }
    const newActivities = [...activities];
    newActivities.splice(index, 1);
    setActivities(newActivities);
    setOpenSlot(-1);
  };

  return (
    <div>
      <PageHeader
        title="Activities"
        sub={`Common App format · ${activities.length}/${totalSlots} filled`}
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>
              View Only
            </span>
          ) : null
        }
      />

      <div className="p-5 px-6">
        <div className="rounded-xl overflow-hidden border border-line bg-white">
          {slots.map((act, i) => {
            const isOpen = openSlot === i;
            const isEmpty = !act;
            const label = isEmpty ? `Activity ${i + 1}` : (act.pos || act.type);
            const sublabel = isEmpty ? "[EMPTY]" : (act.org || act.type);

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
                    {/* Drag handle — only for filled, non-readonly */}
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
                        {label}
                      </div>
                      {!isEmpty && (
                        <div className="text-xs text-sub mt-0.5">{sublabel}</div>
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
                          <div><span className="font-semibold text-sub text-xs uppercase">Position</span><p className="mt-1 text-body">{act.pos}</p></div>
                          <div><span className="font-semibold text-sub text-xs uppercase">Organization</span><p className="mt-1 text-body">{act.org}</p></div>
                          <div><span className="font-semibold text-sub text-xs uppercase">Activity Type</span><p className="mt-1 text-body">{act.type}</p></div>
                          <div><span className="font-semibold text-sub text-xs uppercase">Timing</span><p className="mt-1 text-body">{act.timing || "—"}</p></div>
                          <div className="col-span-2"><span className="font-semibold text-sub text-xs uppercase">Description</span><p className="mt-1 text-body">{act.desc}</p></div>
                          <div><span className="font-semibold text-sub text-xs uppercase">Grade Levels</span><p className="mt-1 text-body">{(act.gr || []).join(", ") || "—"}</p></div>
                          <div><span className="font-semibold text-sub text-xs uppercase">Hours/Week</span><p className="mt-1 text-body">{act.hrs || "—"}</p></div>
                          <div><span className="font-semibold text-sub text-xs uppercase">Weeks/Year</span><p className="mt-1 text-body">{act.wks || "—"}</p></div>
                        </div>
                      )
                    ) : (
                      <ActivityForm
                        act={act}
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
            + Add Another Activity
          </button>
        )}
      </div>
    </div>
  );
}

// ── ActivityForm sub-component ─────────────────────────────────────────────

interface ActivityFormProps {
  act: Activity | null;
  index: number;
  onSave: (index: number, formData: FormData) => void;
  onDelete?: () => void;
  saving: boolean;
}

function ActivityForm({ act, index, onSave, onDelete, saving }: ActivityFormProps) {
  const [position, setPosition] = useState(act?.pos ?? "");
  const [org, setOrg] = useState(act?.org ?? "");
  const [desc, setDesc] = useState(act?.desc ?? "");

  const selectedGrades = act?.gr ?? [];
  const selectedTiming = (act?.timing ?? "").split(", ").filter(Boolean);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(index, new FormData(e.target as HTMLFormElement));
      }}
      className="space-y-4"
    >
      {/* Position / Leadership — now first */}
      <div>
        <label style={labelStyle}>
          Position/Leadership description
          <span style={{ color: "#e55b5b" }}> *</span>
          <span style={{ fontWeight: 400 }}> (Max characters: 50)</span>
          {charCount(position, 50)}
        </label>
        <input
          name="position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          required
          style={{ ...inputStyle, borderColor: position.length > 50 ? "#e55b5b" : "#333", color: position.length > 50 ? "#e55b5b" : "#ebebeb" }}
        />
      </div>

      {/* Organization Name — second */}
      <div>
        <label style={labelStyle}>
          Organization Name
          <span style={{ fontWeight: 400 }}> (Max characters: 100)</span>
          {charCount(org, 100)}
        </label>
        <input
          name="org"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          style={{ ...inputStyle, borderColor: org.length > 100 ? "#e55b5b" : "#333", color: org.length > 100 ? "#e55b5b" : "#ebebeb" }}
        />
      </div>

      {/* Activity Type — third */}
      <div>
        <label style={labelStyle}>
          Activity type <span style={{ color: "#e55b5b" }}>*</span>
        </label>
        <select name="type" defaultValue={act?.type ?? ""} required style={inputStyle}>
          <option value="" disabled>Select type...</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>
          Please describe this activity, including what you accomplished and any recognition you received, etc.
          <span style={{ color: "#e55b5b" }}> *</span>
          <span style={{ fontWeight: 400 }}> (Max characters: 150)</span>
          {charCount(desc, 150)}
        </label>
        <textarea
          name="description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          required
          rows={3}
          style={{ ...inputStyle, resize: "vertical", borderColor: desc.length > 150 ? "#e55b5b" : "#333", color: desc.length > 150 ? "#e55b5b" : "#ebebeb" }}
        />
      </div>

      {/* Grade Levels */}
      <div>
        <label style={labelStyle}>
          Participation grade levels <span style={{ color: "#e55b5b" }}>*</span>
        </label>
        <div className="flex flex-col gap-1.5 mt-1">
          {GRADE_OPTIONS.map((g) => (
            <label key={g} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                name={`grade_${g}`}
                defaultChecked={selectedGrades.includes(g as any)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "#5A83F3" }}
              />
              {g}
            </label>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div>
        <label style={labelStyle}>
          Timing of participation <span style={{ color: "#e55b5b" }}>*</span>
        </label>
        <div className="flex flex-col gap-1.5 mt-1">
          {TIMING_OPTIONS.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                name={`timing_${t}`}
                defaultChecked={selectedTiming.includes(t)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "#5A83F3" }}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* Hours & Weeks */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>
            Hours spent per week <span style={{ color: "#e55b5b" }}>*</span>
          </label>
          <input
            name="hours"
            type="number"
            min={0}
            max={168}
            defaultValue={act?.hrs ?? ""}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Weeks spent per year <span style={{ color: "#e55b5b" }}>*</span>
          </label>
          <input
            name="weeks"
            type="number"
            min={0}
            max={52}
            defaultValue={act?.wks ?? ""}
            required
            style={inputStyle}
          />
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
            Remove Activity
          </button>
        ) : <div />}
        <button
          type="submit"
          disabled={saving}
          style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#5A83F3", color: "#fff", border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving..." : act ? "Save Changes" : "Add Activity"}
        </button>
      </div>
    </form>
  );
}