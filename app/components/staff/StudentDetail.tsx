"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { getCategoryColor, getStatusColor } from "../../lib/colors";

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
}

export function StudentDetail({ student: s, onBack }: StudentDetailProps) {
  const tc: Record<string, string> = { reach: "#ef4444", match: "#d97706", safety: "#16a34a" };

  return (
    <div>
      <PageHeader
        title={s.name}
        sub={`Grade ${s.grade} · ${s.school} · Class of ${s.gradYear}`}
        right={<Button onClick={onBack}>← Back</Button>}
      />
      <div className="p-6 px-8">
        <div className="grid grid-cols-5 gap-3 mb-5">
          <MetricCard label="GPA" value={s.gpa} color="#3b82f6" />
          <MetricCard label="SAT" value={s.sat || "—"} color="#7c3aed" />
          <MetricCard label="Schools" value={s.schools.length} detail={`${s.schools.filter((x) => x.status === "Submitted").length} submitted`} color="#16a34a" />
          <MetricCard label="Engagement" value={`${s.engagement}%`} color={s.engagement > 80 ? "#16a34a" : "#ef4444"} />
          <MetricCard label="Last Login" value={s.lastLogin} color="#d97706" />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Deadlines */}
          <Card>
            <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Deadlines</h3>
            {s.dl.sort((a, b) => a.days - b.days).map((d) => (
              <div key={d.id} className="flex justify-between items-center p-2.5 px-3 rounded-lg mb-1.5"
                style={{
                  background: d.status === "overdue" ? "#fef2f2" : "#eef0f4",
                  borderLeft: `3px solid ${d.status === "overdue" ? "#ef4444" : getCategoryColor(d.cat)}`,
                }}>
                <div>
                  <div className="text-sm font-medium text-heading">{d.title}</div>
                  <span className="text-xs text-sub">{d.cat} · {d.due}</span>
                </div>
                <Tag color={getStatusColor(d.status)}>
                  {d.days < 0 ? `${Math.abs(d.days)}d late` : `${d.days}d`}
                </Tag>
              </div>
            ))}
          </Card>

          {/* Schools */}
          <Card>
            <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Schools</h3>
            {s.schools.map((sc, i) => (
              <div key={i} className="p-2.5 px-3 rounded-lg mb-1.5" style={{ background: "#eef0f4", borderLeft: `3px solid ${tc[sc.type]}` }}>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-heading">{sc.name}</span>
                  <Tag color={tc[sc.type]}>{sc.type}</Tag>
                </div>
                <div className="text-xs text-sub mt-0.5">{sc.status} · Essay: {sc.essay}</div>
              </div>
            ))}
          </Card>
        </div>

        {/* Sessions */}
        <Card className="mt-3.5">
          <h3 className="m-0 mb-3.5 text-lg font-bold text-heading">Sessions</h3>
          {s.sess.map((ss, i) => (
            <div key={i} className="p-3 px-4 rounded-lg mb-1.5" style={{ background: "#eef0f4", borderLeft: "3px solid #3b82f6" }}>
              <div className="text-sm font-bold mb-1.5" style={{ color: "#1d4ed8" }}>{ss.date}</div>
              <p className="m-0 mb-2 text-sm text-body leading-relaxed">{ss.notes}</p>
              <span className="text-xs text-sub">Action: </span>
              <span className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>{ss.action}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}