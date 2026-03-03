"use client";

import { Activity } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { ACTIVITY_TYPES, PARTICIPATION_TIMES } from "../../lib/constants";
import { useState } from "react";

interface ActivitiesProps {
  activities: Activity[];
  setActivities: (a: Activity[]) => void;
  readOnly?: boolean;
}

export function Activities({ activities, setActivities, readOnly = false }: ActivitiesProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);

  const toggleGrade = (g: number) =>
    setSelectedGrades((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g].sort()));

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <PageHeader
        title="Activities & Honors"
        sub="As they appear on your Common App."
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>View Only</span>
          ) : (
            <Button primary onClick={() => setShowModal(true)}>+ Add Activity</Button>
          )
        }
      />
      <div className="p-6 px-8 flex flex-col gap-3">
        {activities.map((a, idx) => (
          <Card key={a.id} noPadding style={{ overflow: "hidden" }}>
            <div className="px-6 py-4 border-b border-line flex justify-between" style={{ background: "#f8f9fb" }}>
              <div className="flex gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center text-base text-white font-bold flex-shrink-0">{idx + 1}</div>
                <div>
                  <div className="text-base font-bold text-heading">{a.org}</div>
                  <div className="text-sm font-medium mt-0.5" style={{ color: "#1d4ed8" }}>{a.pos}</div>
                  <div className="flex gap-2 flex-wrap items-center mt-2">
                    <Tag color="#64748b">{a.type}</Tag>
                    <Tag color="#d97706">{a.timing}</Tag>
                    <div className="flex gap-1">
                      {a.gr?.map((g) => (
                        <span key={g} className="w-6 h-6 rounded-md text-xs inline-flex items-center justify-center font-bold" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>{g}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {!readOnly && (
                <button onClick={() => setActivities(activities.filter((x) => x.id !== a.id))} className="bg-white border border-line rounded-lg w-8 h-8 cursor-pointer text-sub text-sm">✕</button>
              )}
            </div>
            <div className="px-6 py-4 grid gap-5" style={{ gridTemplateColumns: "5fr 2fr" }}>
              <div>
                <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1.5">Description</div>
                <p className="m-0 text-sm text-body leading-relaxed p-3 rounded-lg" style={{ background: "#eef0f4" }}>{a.desc}</p>
              </div>
              <div>
                <div className="mb-3.5">
                  <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">Participation</div>
                  <div className="text-sm text-heading font-medium">{a.timing}</div>
                </div>
                <div className="flex gap-7">
                  {[["Hrs/Wk", a.hrs], ["Wks/Yr", a.wks]].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">{l}</div>
                      <div className="text-2xl font-bold text-heading">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <Modal title="Add Activity" onClose={() => { setShowModal(false); setSelectedGrades([]); }}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.target as HTMLFormElement);
            setActivities([...activities, {
              id: Date.now(), org: f.get("org") as string, pos: f.get("pos") as string,
              type: f.get("type") as string, desc: f.get("desc") as string,
              timing: f.get("timing") as string, hrs: f.get("hrs") as string,
              wks: f.get("wks") as string, gr: selectedGrades,
            }]);
            setShowModal(false);
            setSelectedGrades([]);
          }}>
            <FormField label="Organization Name"><input required name="org" style={inputStyle} /></FormField>
            <FormField label="Position / Leadership"><input required name="pos" style={inputStyle} /></FormField>
            <FormField label="Activity Type">
              <select required name="type" style={inputStyle}>
                {ACTIVITY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Participation Grades">
              <div className="flex gap-2 items-center">
                {[9, 10, 11, 12].map((g) => (
                  <button key={g} type="button" onClick={() => toggleGrade(g)}
                    className="w-12 h-10 rounded-lg cursor-pointer text-base font-bold"
                    style={{
                      background: selectedGrades.includes(g) ? "#3b82f6" : "#fff",
                      color: selectedGrades.includes(g) ? "#fff" : "#64748b",
                      border: `2px solid ${selectedGrades.includes(g) ? "#3b82f6" : "#cbd5e1"}`,
                    }}>{g}</button>
                ))}
                <span className="text-sm text-sub ml-1">{selectedGrades.length ? `${selectedGrades.join(", ")} selected` : "Select grades"}</span>
              </div>
            </FormField>
            <FormField label="Time of Participation">
              <select required name="timing" style={inputStyle}>
                {PARTICIPATION_TIMES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Description">
              <textarea required name="desc" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
              <div className="text-xs text-faint mt-1">150 word limit on Common App</div>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Hours / Week"><input required name="hrs" type="number" style={inputStyle} /></FormField>
              <FormField label="Weeks / Year"><input required name="wks" type="number" style={inputStyle} /></FormField>
            </div>
            <div className="flex justify-end mt-2"><Button primary type="submit">Save Activity</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}