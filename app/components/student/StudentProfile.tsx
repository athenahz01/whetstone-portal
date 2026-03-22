"use client";
import { authFetch } from "../../lib/supabase";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { useState, useEffect } from "react";

interface StudentProfileProps {
  student: Student;
  readOnly?: boolean;
}

export function StudentProfile({ student, readOnly = false }: StudentProfileProps) {
  const [applicationYear, setApplicationYear] = useState(student.applicationYear?.toString() || student.gradYear?.toString() || "");
  const [intendedMajors, setIntendedMajors] = useState(student.intendedMajors || "");
  const [hookStatement, setHookStatement] = useState(student.hookStatement || "");
  const [achievements, setAchievements] = useState(student.achievements || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const save = async (field: string, value: string) => {
    if (readOnly) return;
    setSaveStatus("saving");
    try {
      await authFetch("/api/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, [field]: value }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #333",
    background: "#1e1e1e",
    color: "#ebebeb",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const currentYear = new Date().getFullYear();
  const classOf = applicationYear || student.gradYear;
  const yearsUntil = classOf ? Number(classOf) - currentYear : null;

  return (
    <div>
      <PageHeader
        title="Profile"
        sub="Candidacy overview and student information."
        right={
          <div className="flex items-center gap-3">
            {saveStatus === "saving" && <span className="text-xs" style={{ color: "#e5a83b" }}>Saving...</span>}
            {saveStatus === "saved" && <span className="text-xs" style={{ color: "#4aba6a" }}>✓ Saved</span>}
            {readOnly && (
              <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-5 px-4 md:px-6" style={{ maxWidth: 860 }}>
        {/* Student header card */}
        <Card style={{ padding: 24, marginBottom: 20 }}>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: "rgba(82,139,255,0.1)", color: "#5A83F3" }}>
              {student.av || student.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
            </div>
            <div className="flex-1">
              {readOnly ? (
                <h2 className="m-0 text-xl font-bold text-heading">{student.name}</h2>
              ) : (
                <input
                  defaultValue={student.name}
                  onBlur={(e) => { if (e.target.value !== student.name) save("name", e.target.value); }}
                  className="m-0 text-xl font-bold bg-transparent border-none outline-none w-full"
                  style={{ color: "#ebebeb", padding: 0 }}
                />
              )}
              <div className="flex items-center gap-4 mt-1.5">
                {readOnly ? (
                  <span className="text-sm" style={{ color: "#a0a0a0" }}>{student.school}</span>
                ) : (
                  <input
                    defaultValue={student.school}
                    onBlur={(e) => { if (e.target.value !== student.school) save("school", e.target.value); }}
                    placeholder="School name"
                    className="text-sm bg-transparent border-none outline-none"
                    style={{ color: "#a0a0a0", padding: 0, width: 180 }}
                  />
                )}
                <span className="text-sm" style={{ color: "#717171" }}>·</span>
                <span className="text-sm" style={{ color: "#a0a0a0" }}>Class of {classOf || "—"}</span>
                {yearsUntil !== null && yearsUntil > 0 && (
                  <>
                    <span className="text-sm" style={{ color: "#717171" }}>·</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: "rgba(82,139,255,0.08)", color: "#7aabff" }}>
                      {yearsUntil === 1 ? "Applying this year" : `${yearsUntil} years to application`}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                {((student.team && student.team.length > 0) || student.counselor) && (
                  <span className="text-xs" style={{ color: "#717171" }}>Mentor: {student.team && student.team.length > 0 ? student.team.join(", ") : student.counselor}</span>
                )}
                {student.email && <span className="text-xs" style={{ color: "#717171" }}>{student.email}</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* Two-column grid */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* Left: Key details */}
          <div className="flex flex-col gap-4">
            <Card style={{ padding: 20 }}>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#717171" }}>Application Year</label>
              <select
                value={applicationYear}
                onChange={(e) => { setApplicationYear(e.target.value); save("application_year", e.target.value); }}
                disabled={readOnly}
                style={inputStyle}
              >
                <option value="">Select year...</option>
                {Array.from({ length: 8 }, (_, i) => currentYear + i).map((y) => (
                  <option key={y} value={y}>Class of {y}</option>
                ))}
                <option value="postgrad">Post Grad</option>
              </select>
              <p className="m-0 mt-2 text-xs" style={{ color: "#505050" }}>
                Used instead of grade — no need to update each year.
              </p>
            </Card>

            <Card style={{ padding: 20 }}>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#717171" }}>Intended Majors</label>
              <textarea
                value={intendedMajors}
                onChange={(e) => setIntendedMajors(e.target.value)}
                onBlur={() => save("intended_majors", intendedMajors)}
                placeholder="e.g. Computer Science, Applied Mathematics, Economics..."
                disabled={readOnly}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </Card>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card style={{ padding: 14, textAlign: "center" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#717171" }}>GPA</div>
                <div className="text-lg font-bold" style={{ color: "#4aba6a" }}>{student.gpa || "—"}</div>
              </Card>
              <Card style={{ padding: 14, textAlign: "center" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#717171" }}>SAT</div>
                <div className="text-lg font-bold" style={{ color: "#e5a83b" }}>{student.sat || "—"}</div>
              </Card>
              <Card style={{ padding: 14, textAlign: "center" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#717171" }}>Schools</div>
                <div className="text-lg font-bold" style={{ color: "#5A83F3" }}>{student.schools?.length || 0}</div>
              </Card>
            </div>
          </div>

          {/* Right: Hook & Achievements */}
          <div className="flex flex-col gap-4">
            <Card style={{ padding: 20 }}>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#717171" }}>Hook Statement</label>
              <p className="m-0 mb-2 text-xs" style={{ color: "#505050" }}>
                The defining narrative or unique angle for this student&apos;s application.
              </p>
              <textarea
                value={hookStatement}
                onChange={(e) => setHookStatement(e.target.value)}
                onBlur={() => save("hook_statement", hookStatement)}
                placeholder="What makes this student stand out? Their unique story, perspective, or angle..."
                disabled={readOnly}
                rows={5}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </Card>

            <Card style={{ padding: 20 }}>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#717171" }}>Key Achievements</label>
              <p className="m-0 mb-2 text-xs" style={{ color: "#505050" }}>
                Major accomplishments, awards, leadership positions, or standout moments.
              </p>
              <textarea
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                onBlur={() => save("achievements", achievements)}
                placeholder="• National Science Olympiad finalist&#10;• Published research in XYZ&#10;• Founded campus organization..."
                disabled={readOnly}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}