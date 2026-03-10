"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { addDeadline } from "../../lib/queries";
import { useState } from "react";

interface SessionPrepProps {
  student: Student;
  onRefresh?: () => void;
}

export function SessionPrep({ student, onRefresh }: SessionPrepProps) {
  const [activeRecall, setActiveRecall] = useState("");
  const [actions, setActions] = useState([
    { title: "", due: "", description: "" },
    { title: "", due: "", description: "" },
    { title: "", due: "", description: "" },
  ]);
  const [sessionType, setSessionType] = useState<"online" | "in-person">("online");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#252525",
    border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const updateAction = (i: number, field: string, value: string) => {
    setActions((prev) => prev.map((a, j) => j === i ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async () => {
    setSaving(true);
    // Save actions as deadlines
    for (const action of actions) {
      if (action.title.trim() && action.due) {
        await addDeadline(student.id, {
          title: action.title,
          due: action.due,
          category: "planning",
          status: "pending",
          days: Math.round((new Date(action.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          created_by: "student",
        });
      }
    }
    if (onRefresh) await onRefresh();
    setSaving(false);
    setSaved(true);
  };

  return (
    <div>
      <PageHeader
        title="Closing Commit"
        sub="Wrap up your session with action items."
        right={
          <div className="inline-flex gap-1 bg-white border border-line rounded-full p-1">
            {(["online", "in-person"] as const).map((t) => (
              <button key={t} onClick={() => setSessionType(t)}
                className="px-4 py-1.5 rounded-full border-none cursor-pointer text-xs font-semibold"
                style={{ background: sessionType === t ? "#528bff" : "transparent", color: sessionType === t ? "#fff" : "#717171" }}>
                {t === "online" ? "💻 Online" : "🤝 In-Person"}
              </button>
            ))}
          </div>
        }
      />

      <div className="p-6 px-8" style={{ maxWidth: 720 }}>
        {saved ? (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-heading mb-2">Session Committed!</h2>
              <p className="text-sm text-sub mb-4">Your action items have been added to your deadlines.</p>
              <Button primary onClick={() => { setSaved(false); setActions([{ title: "", due: "", description: "" }, { title: "", due: "", description: "" }, { title: "", due: "", description: "" }]); setActiveRecall(""); }}>
                Start New Session
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Session info */}
            <Card className="mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{sessionType === "online" ? "💻" : "🤝"}</div>
                <div>
                  <div className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: "#528bff" }}>
                    {sessionType === "online" ? "Online Session" : "In-Person Session"}
                  </div>
                  <div className="text-lg font-bold text-heading">with {student.counselor}</div>
                  <div className="text-sm text-sub">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>
            </Card>

            {/* Active Recall */}
            <Card className="mb-4">
              <h3 className="text-base font-bold text-heading mb-1">🧠 Active Recall</h3>
              <p className="text-xs text-sub mb-3">What are the key takeaways from this session? Write from memory — don't look at notes.</p>
              <textarea
                value={activeRecall}
                onChange={(e) => setActiveRecall(e.target.value)}
                placeholder="What did we discuss? What did I learn? What surprised me?"
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
              />
            </Card>

            {/* Three Essential Actions */}
            <Card className="mb-4">
              <h3 className="text-base font-bold text-heading mb-1">📋 Three Essential Actions</h3>
              <p className="text-xs text-sub mb-4">Commit to exactly three things you'll do before the next session. These will be added to your Roadmap deadlines.</p>

              <div className="flex flex-col gap-4">
                {actions.map((a, i) => (
                  <div key={i} className="rounded-lg p-4" style={{ background: "#252525", border: "1px solid #333" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: a.title.trim() ? "rgba(82,139,255,0.1)" : "#333", color: a.title.trim() ? "#528bff" : "#717171" }}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-semibold text-sub uppercase tracking-wider">Action {i + 1}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        value={a.title}
                        onChange={(e) => updateAction(i, "title", e.target.value)}
                        placeholder={`What will you do? ${i === 0 ? "(e.g. Draft Common App essay)" : ""}`}
                        style={inputStyle}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={a.due}
                          onChange={(e) => updateAction(i, "due", e.target.value)}
                          style={inputStyle}
                        />
                        <input
                          value={a.description}
                          onChange={(e) => updateAction(i, "description", e.target.value)}
                          placeholder="Notes (optional)"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button primary onClick={handleSubmit} disabled={saving || actions.every((a) => !a.title.trim())}>
                {saving ? "Saving..." : "Commit Actions →"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}