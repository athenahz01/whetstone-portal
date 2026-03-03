"use client";

import { Test } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { useState } from "react";

interface TestingProps {
  tests: Test[];
  setTests: (t: Test[]) => void;
  readOnly?: boolean;
}

export function Testing({ tests, setTests, readOnly = false }: TestingProps) {
  const [showModal, setShowModal] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <PageHeader
        title="Testing"
        sub="Standardized test scores."
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>View Only</span>
          ) : (
            <Button primary onClick={() => setShowModal(true)}>+ Add Score</Button>
          )
        }
      />
      <div className="p-6 px-8 grid grid-cols-2 gap-3.5">
        {tests.map((t) => (
          <Card key={t.id}>
            <div className="flex justify-between mb-4">
              <div>
                <div className="text-xl font-bold text-heading">{t.type}</div>
                <div className="text-sm text-sub mt-0.5">{new Date(t.date).toLocaleDateString()}</div>
              </div>
              {t.v && <Tag color="#16a34a">Verified</Tag>}
            </div>
            <div className="mb-4">
              <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">Score</div>
              <div className="text-4xl font-bold text-heading">{t.total}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "#eef0f4" }}>
              <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-0.5">Breakdown</div>
              <div className="text-sm text-body">{t.bd}</div>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <Modal title="Log Test Score" onClose={() => setShowModal(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.target as HTMLFormElement);
            setTests([...tests, { id: Date.now(), type: f.get("t") as string, date: f.get("d") as string, total: Number(f.get("s")), bd: (f.get("b") as string) || "N/A", v: false }]);
            setShowModal(false);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Test">
                <select name="t" style={inputStyle}>
                  <option>SAT</option><option>ACT</option><option>AP</option><option>TOEFL</option>
                </select>
              </FormField>
              <FormField label="Date"><input required name="d" type="date" style={inputStyle} /></FormField>
            </div>
            <FormField label="Score"><input required name="s" style={inputStyle} /></FormField>
            <FormField label="Breakdown"><input name="b" style={inputStyle} placeholder="Math: 780, ERW: 740" /></FormField>
            <div className="flex justify-end mt-2"><Button primary type="submit">Save</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}