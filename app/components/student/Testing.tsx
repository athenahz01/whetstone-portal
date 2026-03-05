"use client";

import { Test } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { useState, useMemo } from "react";

interface TestingProps {
  tests: Test[];
  setTests: (t: Test[]) => void;
  readOnly?: boolean;
}

export function Testing({ tests, setTests, readOnly = false }: TestingProps) {
  const [showModal, setShowModal] = useState(false);
  const [mathScore, setMathScore] = useState("");
  const [englishScore, setEnglishScore] = useState("");

  const composite = useMemo(() => {
    const m = parseInt(mathScore);
    const e = parseInt(englishScore);
    if (!isNaN(m) && !isNaN(e)) return m + e;
    return null;
  }, [mathScore, englishScore]);

  // Calculate superscore from all SAT attempts
  const superscore = useMemo(() => {
    const satTests = tests.filter((t) => t.type === "SAT");
    if (satTests.length === 0) return null;

    let bestMath = 0;
    let bestEnglish = 0;

    satTests.forEach((t) => {
      if (t.mathScore && t.mathScore > bestMath) bestMath = t.mathScore;
      if (t.englishScore && t.englishScore > bestEnglish) bestEnglish = t.englishScore;

      // Also try parsing from breakdown string for legacy data
      if (!t.mathScore && t.bd) {
        const mathMatch = t.bd.match(/Math:\s*(\d+)/);
        if (mathMatch) {
          const val = parseInt(mathMatch[1]);
          if (val > bestMath) bestMath = val;
        }
      }
      if (!t.englishScore && t.bd) {
        const erwMatch = t.bd.match(/ERW:\s*(\d+)/);
        if (erwMatch) {
          const val = parseInt(erwMatch[1]);
          if (val > bestEnglish) bestEnglish = val;
        }
      }
    });

    if (bestMath > 0 && bestEnglish > 0) {
      return { math: bestMath, english: bestEnglish, total: bestMath + bestEnglish };
    }
    return null;
  }, [tests]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.target as HTMLFormElement);
    const type = f.get("t") as string;
    const date = f.get("d") as string;
    const math = parseInt(f.get("math") as string) || 0;
    const english = parseInt(f.get("english") as string) || 0;
    const total = type === "SAT" ? math + english : Number(f.get("s") || 0);
    const breakdown = type === "SAT"
      ? `Math: ${math} · ERW: ${english}`
      : (f.get("b") as string) || "N/A";

    setTests([...tests, {
      id: Date.now(),
      type,
      date,
      total,
      bd: breakdown,
      v: false,
      mathScore: type === "SAT" ? math : null,
      englishScore: type === "SAT" ? english : null,
    }]);
    setShowModal(false);
    setMathScore("");
    setEnglishScore("");
  };

  const [testType, setTestType] = useState("SAT");

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
      <div className="p-6 px-8">
        {/* Superscore Card */}
        {superscore && (
          <Card style={{ marginBottom: 14, borderTop: "3px solid #7c3aed" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">SAT Superscore</div>
                <div className="text-4xl font-bold text-heading">{superscore.total}</div>
                <div className="flex gap-4 mt-2">
                  <div>
                    <span className="text-xs text-sub">Math: </span>
                    <span className="text-sm font-bold text-heading">{superscore.math}</span>
                  </div>
                  <div>
                    <span className="text-xs text-sub">ERW: </span>
                    <span className="text-sm font-bold text-heading">{superscore.english}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Tag color="#7c3aed">Best of {tests.filter((t) => t.type === "SAT").length} attempt{tests.filter((t) => t.type === "SAT").length !== 1 ? "s" : ""}</Tag>
                <div className="text-xs text-sub mt-1">Highest Math + Highest ERW</div>
              </div>
            </div>
          </Card>
        )}

        {/* Individual Test Cards */}
        <div className="grid grid-cols-2 gap-3.5">
          {tests.map((t) => (
            <Card key={t.id}>
              <div className="flex justify-between mb-4">
                <div>
                  <div className="text-xl font-bold text-heading">{t.type}</div>
                  <div className="text-sm text-sub mt-0.5">{new Date(t.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                </div>
                {t.v && <Tag color="#16a34a">Verified</Tag>}
              </div>
              <div className="mb-4">
                <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">Composite Score</div>
                <div className="text-4xl font-bold text-heading">{t.total}</div>
              </div>
              {/* Split scores for SAT */}
              {t.type === "SAT" && (t.mathScore || t.englishScore) ? (
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-lg" style={{ background: "#eff6ff" }}>
                    <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">Math</div>
                    <div className="text-2xl font-bold" style={{ color: "#1d4ed8" }}>{t.mathScore || "—"}</div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg" style={{ background: "#f0fdf4" }}>
                    <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">ERW</div>
                    <div className="text-2xl font-bold" style={{ color: "#16a34a" }}>{t.englishScore || "—"}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg" style={{ background: "#eef0f4" }}>
                  <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-0.5">Breakdown</div>
                  <div className="text-sm text-body">{t.bd}</div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Add Score Modal */}
      {showModal && (
        <Modal title="Log Test Score" onClose={() => { setShowModal(false); setMathScore(""); setEnglishScore(""); setTestType("SAT"); }}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Test Type">
                <select name="t" style={inputStyle} value={testType} onChange={(e) => setTestType(e.target.value)}>
                  <option>SAT</option>
                  <option>ACT</option>
                  <option>AP</option>
                  <option>TOEFL</option>
                </select>
              </FormField>
              <FormField label="Test Date">
                <input required name="d" type="date" style={inputStyle} />
              </FormField>
            </div>

            {testType === "SAT" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Math Score">
                    <input
                      required
                      name="math"
                      type="number"
                      min="200"
                      max="800"
                      placeholder="200–800"
                      style={inputStyle}
                      value={mathScore}
                      onChange={(e) => setMathScore(e.target.value)}
                    />
                  </FormField>
                  <FormField label="ERW (English) Score">
                    <input
                      required
                      name="english"
                      type="number"
                      min="200"
                      max="800"
                      placeholder="200–800"
                      style={inputStyle}
                      value={englishScore}
                      onChange={(e) => setEnglishScore(e.target.value)}
                    />
                  </FormField>
                </div>
                {/* Auto-calculated composite */}
                {composite && (
                  <div className="p-3 rounded-lg mb-4 flex items-center justify-between" style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#7c3aed" }}>Composite (auto-calculated)</div>
                      <div className="text-2xl font-bold text-heading">{composite}</div>
                    </div>
                    <div className="text-xs text-sub text-right">
                      Math {mathScore} + ERW {englishScore}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <FormField label="Score">
                  <input required name="s" type="number" style={inputStyle} />
                </FormField>
                <FormField label="Breakdown (optional)">
                  <input name="b" style={inputStyle} placeholder="e.g. Math: 36, English: 34" />
                </FormField>
              </>
            )}

            <div className="flex justify-end mt-2">
              <Button primary type="submit">Save Score</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}