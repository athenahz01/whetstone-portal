"use client";

import { Student, Course } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { useState } from "react";

interface AcademicsProps {
  student: Student;
  courses: Course[];
  setCourses: (c: Course[]) => void;
  readOnly?: boolean;
}

export function Academics({ student, courses, setCourses, readOnly = false }: AcademicsProps) {
  const [showModal, setShowModal] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <PageHeader
        title="Academics"
        sub="Coursework and academic progress."
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>View Only</span>
          ) : (
            <div className="flex gap-2">
              <Button>Transcript</Button>
              <Button primary onClick={() => setShowModal(true)}>+ Add Course</Button>
            </div>
          )
        }
      />
      <div className="p-6 px-8">
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          <MetricCard label="GPA" value={student.gpa} color="#16a34a" />
          <MetricCard label="Class Rank" value="Top 5%" color="#3b82f6" />
          <MetricCard label="AP Courses" value={courses.length} color="#7c3aed" />
        </div>
        <Card noPadding style={{ overflow: "hidden" }}>
          <div className="px-6 py-3 border-b border-line flex justify-between items-center" style={{ background: "#f8f9fb" }}>
            <span className="text-base font-bold text-heading">{student.grade}th Grade Coursework</span>
            <Tag color="#16a34a">Current</Tag>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Course", "Level", "Sem 1", "Sem 2"].map((h) => (
                  <th key={h} style={{ padding: "10px 24px", textAlign: h.includes("Sem") ? "center" : "left", fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 24px", fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{c.name}</td>
                  <td style={{ padding: "12px 24px", fontSize: 13, color: "#64748b" }}>{c.lv}</td>
                  <td style={{ padding: "12px 24px", textAlign: "center", fontSize: 14, color: "#16a34a", fontWeight: 700 }}>{c.s1}</td>
                  <td style={{ padding: "12px 24px", textAlign: "center", fontSize: 13, color: "#94a3b8" }}>{c.s2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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