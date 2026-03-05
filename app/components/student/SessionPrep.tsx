"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { useState } from "react";

interface SessionPrepProps {
  student: Student;
}

export function SessionPrep({ student }: SessionPrepProps) {
  const [prep, setPrep] = useState({ did: "", need: "" });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    minHeight: 90, resize: "vertical", lineHeight: 1.7,
  };

  return (
    <div>
      <PageHeader title="Session Prep" sub="Fill out before your meeting." />
      <div className="p-6 px-8" style={{ maxWidth: 680 }}>
        <Card className="mb-3.5">
          <div className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: "#1d4ed8" }}>Next Session</div>
          <div className="text-2xl font-bold text-heading">{new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — 4:00 PM</div>
          <div className="text-sm text-sub mt-0.5">with {student.counselor}</div>
        </Card>
        {[["What did you accomplish since last session?", "did"], ["What do you need help with?", "need"]].map(([label, key]) => (
          <Card key={key} className="mb-3.5">
            <label className="block text-base font-bold text-heading mb-2">{label}</label>
            <textarea
              value={prep[key as keyof typeof prep]}
              onChange={(e) => setPrep((p) => ({ ...p, [key]: e.target.value }))}
              style={inputStyle}
            />
          </Card>
        ))}
        <Button primary>Save & Send</Button>
      </div>
    </div>
  );
}