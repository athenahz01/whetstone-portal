"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { addStudent } from "../../lib/queries";
import { useState } from "react";

interface CaseloadProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  onRefresh: () => void;
}

export function Caseload({ students, onSelectStudent, onNavigate, onRefresh }: CaseloadProps) {
  const [sort, setSort] = useState("urgency");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const sorted = [...students].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) :
    sort === "engagement" ? a.engagement - b.engagement :
    (b.status === "needs-attention" ? 1 : 0) - (a.status === "needs-attention" ? 1 : 0)
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    await addStudent({
      name: f.get("name") as string,
      grade: Number(f.get("grade")),
      gpa: Number(f.get("gpa")),
      sat: f.get("sat") ? Number(f.get("sat")) : null,
      counselor: "Sarah Mitchell",
      school: f.get("school") as string,
      gradYear: Number(f.get("gradYear")),
    });
    setSaving(false);
    setShowModal(false);
    onRefresh();
  };

  return (
    <div>
      <PageHeader
        title="Caseload"
        sub={`${students.length} students`}
        right={
          <div className="flex gap-2 items-center">
            <div className="flex gap-1">
              {["urgency", "engagement", "name"].map((s) => (
                <button key={s} onClick={() => setSort(s)}
                  className="px-3.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold capitalize"
                  style={{
                    background: sort === s ? "#eff6ff" : "#fff",
                    border: `1px solid ${sort === s ? "#3b82f6" : "#cbd5e1"}`,
                    color: sort === s ? "#1d4ed8" : "#64748b",
                  }}>
                  {s}
                </button>
              ))}
            </div>
            <Button primary onClick={() => setShowModal(true)}>+ Add Student</Button>
          </div>
        }
      />
      <div className="p-6 px-8 grid grid-cols-2 gap-3.5">
        {sorted.map((s) => {
          const ov = s.dl.filter((d) => d.status === "overdue").length;
          return (
            <Card
              key={s.id}
              onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
              style={{ borderTop: `3px solid ${s.status === "needs-attention" ? "#ef4444" : s.engagement > 80 ? "#16a34a" : "#d97706"}`, cursor: "pointer" }}
            >
              <div className="flex justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{s.av}</div>
                  <div>
                    <div className="text-base font-bold text-heading">{s.name}</div>
                    <div className="text-xs text-sub">Gr. {s.grade} · {s.school}</div>
                  </div>
                </div>
                <Tag color={s.status === "needs-attention" ? "#ef4444" : "#16a34a"}>
                  {s.status === "needs-attention" ? "Attention" : "On track"}
                </Tag>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([["Schools", s.schools.length, "#0f172a"], ["Overdue", ov, ov > 0 ? "#ef4444" : "#0f172a"], ["Engagement", `${s.engagement}%`, s.engagement > 80 ? "#16a34a" : "#d97706"]] as const).map(([l, v, c]) => (
                  <div key={l} className="p-2 rounded-lg text-center" style={{ background: "#eef0f4" }}>
                    <div className="text-base font-bold" style={{ color: c }}>{v}</div>
                    <div className="text-[11px] text-sub mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <Modal title="Add New Student" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd}>
            <FormField label="Full Name"><input required name="name" placeholder="e.g. Jane Smith" style={inputStyle} /></FormField>
            <FormField label="School"><input required name="school" placeholder="e.g. Stuyvesant High School" style={inputStyle} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Grade"><input required name="grade" type="number" min="9" max="12" placeholder="12" style={inputStyle} /></FormField>
              <FormField label="Graduation Year"><input required name="gradYear" type="number" placeholder="2026" style={inputStyle} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="GPA"><input required name="gpa" type="number" step="0.01" min="0" max="5" placeholder="3.85" style={inputStyle} /></FormField>
              <FormField label="SAT (optional)"><input name="sat" type="number" placeholder="1500" style={inputStyle} /></FormField>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
              <Button primary type="submit">{saving ? "Adding..." : "Add Student"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}