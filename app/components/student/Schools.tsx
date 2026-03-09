"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";

interface SchoolsProps {
  student: Student;
  readOnly?: boolean;
}

export function Schools({ student, readOnly = false }: SchoolsProps) {
  const tc: Record<string, string> = { reach: "#e55b5b", match: "#e5a83b", safety: "#4aba6a" };

  return (
    <div>
      <PageHeader
        title="My Schools"
        sub={`${student.schools.length} schools`}
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span>
          ) : undefined
        }
      />
      <div className="p-6 px-8 grid grid-cols-2 gap-3.5">
        {student.schools.map((s, i) => (
          <Card key={i} style={{ borderTop: `3px solid ${tc[s.type]}` }}>
            <div className="flex justify-between mb-3.5">
              <h3 className="m-0 text-lg font-bold text-heading">{s.name}</h3>
              <Tag color={tc[s.type]}>{s.type}</Tag>
            </div>
            {[["Status", s.status], ["Essay", s.essay], ["Deadline", s.deadline]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid #e2e8f0" }}>
                <span className="text-sm text-sub">{l}</span>
                <span className="text-sm text-heading">{v}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}