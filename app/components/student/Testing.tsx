"use client";
import { authFetch } from "../../lib/supabase";

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
  studentId?: number;
}

export function Testing({ tests, setTests, readOnly = false, studentId }: TestingProps) {
  const [showModal, setShowModal] = useState(false);
  const [testType, setTestType] = useState("SAT");
  const [mathScore, setMathScore] = useState("");
  const [englishScore, setEnglishScore] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#1e1e1e",
    border: "1.5px solid #333", borderRadius: 10, color: "#ebebeb",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const composite = useMemo(() => {
    const m = parseInt(mathScore);
    const e = parseInt(englishScore);
    if (!isNaN(m) && !isNaN(e)) return m + e;
    return null;
  }, [mathScore, englishScore]);

  // SAT superscore
  const superscore = useMemo(() => {
    const satTests = tests.filter((t) => t.type === "SAT");
    if (satTests.length === 0) return null;
    let bestMath = 0, bestEnglish = 0;
    satTests.forEach((t) => {
      if (t.mathScore && t.mathScore > bestMath) bestMath = t.mathScore;
      if (t.englishScore && t.englishScore > bestEnglish) bestEnglish = t.englishScore;
    });
    if (bestMath === 0 && bestEnglish === 0) return null;
    return { total: bestMath + bestEnglish, math: bestMath, english: bestEnglish };
  }, [tests]);

  // ACT best composite
  const actBest = useMemo(() => {
    const actTests = tests.filter((t) => t.type === "ACT");
    if (actTests.length === 0) return null;
    return actTests.reduce((best, t) => t.total > best.total ? t : best, actTests[0]);
  }, [tests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.target as HTMLFormElement);
    const type = f.get("t") as string;
    const date = f.get("d") as string;

    let total = 0;
    let breakdown = "";
    let math: number | null = null;
    let english: number | null = null;
    let subject: string | null = null;

    if (type === "SAT") {
      math = parseInt(f.get("math") as string) || 0;
      english = parseInt(f.get("english") as string) || 0;
      total = math + english;
      breakdown = `Math: ${math} · ERW: ${english}`;
    } else if (type === "ACT") {
      const eng = parseInt(f.get("actEnglish") as string) || 0;
      const mth = parseInt(f.get("actMath") as string) || 0;
      const rdg = parseInt(f.get("actReading") as string) || 0;
      const sci = parseInt(f.get("actScience") as string) || 0;
      total = Math.round((eng + mth + rdg + sci) / 4);
      breakdown = `E: ${eng} · M: ${mth} · R: ${rdg} · S: ${sci}`;
    } else if (type === "AP") {
      subject = f.get("subject") as string;
      total = parseInt(f.get("apScore") as string) || 0;
      breakdown = subject || "";
    } else {
      total = parseInt(f.get("s") as string) || 0;
      breakdown = (f.get("b") as string) || "N/A";
    }

    if (studentId) {
      try {
        await authFetch("/api/save-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId, type, date, total, breakdown,
            mathScore: type === "SAT" ? math : null,
            englishScore: type === "SAT" ? english : null,
            subject: type === "AP" ? subject : null,
          }),
        });
      } catch (err) { console.error("Failed to save test:", err); }
    }

    setTests([...tests, {
      id: Date.now(), type, date, total,
      bd: breakdown, v: false,
      mathScore: type === "SAT" ? math : null,
      englishScore: type === "SAT" ? english : null,
    }]);
    setShowModal(false);
    setMathScore(""); setEnglishScore(""); setTestType("SAT");
  };

  const handleDelete = async (testId: number) => {
    if (!confirm("Delete this test score?")) return;
    if (studentId) {
      try {
        await authFetch("/api/save-test", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId }),
        });
      } catch {}
    }
    setTests(tests.filter((t) => t.id !== testId));
  };

  // Group tests by type
  const satTests = tests.filter((t) => t.type === "SAT");
  const actTests = tests.filter((t) => t.type === "ACT");
  const apTests = tests.filter((t) => t.type === "AP");
  const otherTests = tests.filter((t) => !["SAT", "ACT", "AP"].includes(t.type));

  return (
    <div>
      <PageHeader
        title="Testing"
        sub="Standardized test scores."
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>View Only</span>
          ) : (
            <Button primary onClick={() => setShowModal(true)}>+ Add Score</Button>
          )
        }
      />
      <div className="p-4 md:p-5 px-4 md:px-6">
        {/* SAT Superscore */}
        {superscore && (
          <Card style={{ marginBottom: 14, borderTop: "3px solid #7c3aed" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">SAT Superscore</div>
                <div className="text-4xl font-bold text-heading">{superscore.total}</div>
                <div className="flex gap-4 mt-2">
                  <div><span className="text-xs text-sub">Math: </span><span className="text-sm font-bold text-heading">{superscore.math}</span></div>
                  <div><span className="text-xs text-sub">ERW: </span><span className="text-sm font-bold text-heading">{superscore.english}</span></div>
                </div>
              </div>
              <div className="text-right">
                <Tag color="#a480f2">Best of {satTests.length} attempt{satTests.length !== 1 ? "s" : ""}</Tag>
                <div className="text-xs text-sub mt-1">Highest Math + Highest ERW</div>
              </div>
            </div>
          </Card>
        )}

        {/* ACT Best */}
        {actBest && (
          <Card style={{ marginBottom: 14, borderTop: "3px solid #5A83F3" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-1">ACT Best Composite</div>
                <div className="text-4xl font-bold text-heading">{actBest.total}</div>
                <div className="text-xs text-sub mt-1">{actBest.bd}</div>
              </div>
              <Tag color="#5A83F3">Best of {actTests.length}</Tag>
            </div>
          </Card>
        )}

        {/* SAT Section */}
        {satTests.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold text-heading mb-3">SAT Scores</h3>
            <div className="grid grid-cols-2 gap-3.5">
              {satTests.map((t) => (
                <Card key={t.id}>
                  <div className="flex justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold text-heading">SAT</div>
                      <div className="text-xs text-sub">{new Date(t.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.v && <Tag color="#4aba6a">Verified</Tag>}
                      {!readOnly && <button onClick={() => handleDelete(t.id)} className="text-[10px] px-2 py-1 rounded border-none cursor-pointer" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>✕</button>}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-heading mb-3">{t.total}</div>
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 rounded-lg" style={{ background: "rgba(82,139,255,0.06)" }}>
                      <div className="text-[10px] text-sub uppercase tracking-widest font-semibold mb-1">Math</div>
                      <div className="text-xl font-bold" style={{ color: "#7aabff" }}>{t.mathScore || "—"}</div>
                    </div>
                    <div className="flex-1 p-3 rounded-lg" style={{ background: "rgba(74,186,106,0.08)" }}>
                      <div className="text-[10px] text-sub uppercase tracking-widest font-semibold mb-1">ERW</div>
                      <div className="text-xl font-bold" style={{ color: "#4aba6a" }}>{t.englishScore || "—"}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ACT Section */}
        {actTests.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold text-heading mb-3">ACT Scores</h3>
            <div className="grid grid-cols-2 gap-3.5">
              {actTests.map((t) => {
                const parts = t.bd?.split("·").map((p: string) => p.trim()) || [];
                return (
                  <Card key={t.id}>
                    <div className="flex justify-between mb-3">
                      <div>
                        <div className="text-lg font-bold text-heading">ACT</div>
                        <div className="text-xs text-sub">{new Date(t.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!readOnly && <button onClick={() => handleDelete(t.id)} className="text-[10px] px-2 py-1 rounded border-none cursor-pointer" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>✕</button>}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-heading mb-3">Composite: {t.total}</div>
                    <div className="grid grid-cols-4 gap-2">
                      {["English", "Math", "Reading", "Science"].map((sec, i) => {
                        const val = parts[i]?.split(":")[1]?.trim() || "—";
                        const colors = ["#5A83F3", "#e5a83b", "#4aba6a", "#a480f2"];
                        return (
                          <div key={sec} className="p-2 rounded-lg text-center" style={{ background: `${colors[i]}10` }}>
                            <div className="text-[9px] text-sub uppercase tracking-widest font-semibold mb-1">{sec.slice(0, 3)}</div>
                            <div className="text-lg font-bold" style={{ color: colors[i] }}>{val}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* AP Section */}
        {apTests.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold text-heading mb-3">AP Scores</h3>
            <div className="grid grid-cols-3 gap-3.5">
              {apTests.map((t) => (
                <Card key={t.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-bold text-heading">{t.bd || "AP"}</div>
                      <div className="text-xs text-sub">{new Date(t.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>
                    </div>
                    {!readOnly && <button onClick={() => handleDelete(t.id)} className="text-[10px] px-1.5 py-0.5 rounded border-none cursor-pointer" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>✕</button>}
                  </div>
                  <div className="text-4xl font-bold text-center py-2" style={{ color: t.total >= 4 ? "#4aba6a" : t.total >= 3 ? "#e5a83b" : "#e55b5b" }}>
                    {t.total}
                  </div>
                  <div className="text-[10px] text-sub text-center">out of 5</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Other Tests */}
        {otherTests.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold text-heading mb-3">Other Tests</h3>
            <div className="grid grid-cols-2 gap-3.5">
              {otherTests.map((t) => (
                <Card key={t.id}>
                  <div className="flex justify-between mb-2">
                    <div className="text-lg font-bold text-heading">{t.type}</div>
                    {!readOnly && <button onClick={() => handleDelete(t.id)} className="text-[10px] px-2 py-1 rounded border-none cursor-pointer" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>✕</button>}
                  </div>
                  <div className="text-sm text-sub mb-2">{new Date(t.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                  <div className="text-3xl font-bold text-heading">{t.total}</div>
                  {t.bd && t.bd !== "N/A" && <div className="text-xs text-sub mt-1">{t.bd}</div>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {tests.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-sm text-sub">No test scores yet. Add your first score above.</div>
            </div>
          </Card>
        )}
      </div>

      {/* Add Score Modal */}
      {showModal && (
        <Modal title="Log Test Score" onClose={() => { setShowModal(false); setMathScore(""); setEnglishScore(""); setTestType("SAT"); }}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

            {testType === "SAT" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Math Score">
                    <input required name="math" type="number" min="200" max="800" placeholder="200–800" style={inputStyle} value={mathScore} onChange={(e) => setMathScore(e.target.value)} />
                  </FormField>
                  <FormField label="ERW (English) Score">
                    <input required name="english" type="number" min="200" max="800" placeholder="200–800" style={inputStyle} value={englishScore} onChange={(e) => setEnglishScore(e.target.value)} />
                  </FormField>
                </div>
                {composite && (
                  <div className="p-3 rounded-lg mb-3 flex items-center justify-between" style={{ background: "rgba(164,128,242,0.08)", border: "1px solid rgba(164,128,242,0.2)" }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#a480f2" }}>Composite</div>
                      <div className="text-2xl font-bold text-heading">{composite}</div>
                    </div>
                    <div className="text-xs text-sub text-right">Math {mathScore} + ERW {englishScore}</div>
                  </div>
                )}
              </>
            )}

            {testType === "ACT" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="English (1-36)">
                  <input required name="actEnglish" type="number" min="1" max="36" placeholder="1–36" style={inputStyle} />
                </FormField>
                <FormField label="Math (1-36)">
                  <input required name="actMath" type="number" min="1" max="36" placeholder="1–36" style={inputStyle} />
                </FormField>
                <FormField label="Reading (1-36)">
                  <input required name="actReading" type="number" min="1" max="36" placeholder="1–36" style={inputStyle} />
                </FormField>
                <FormField label="Science (1-36)">
                  <input required name="actScience" type="number" min="1" max="36" placeholder="1–36" style={inputStyle} />
                </FormField>
              </div>
            )}

            {testType === "AP" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="AP Subject">
                  <select name="subject" required style={inputStyle}>
                    <option value="">Select subject...</option>
                    {["Biology", "Calculus AB", "Calculus BC", "Chemistry", "Computer Science A", "Computer Science Principles",
                      "English Language", "English Literature", "Environmental Science", "European History",
                      "Human Geography", "Macroeconomics", "Microeconomics", "Physics 1", "Physics 2", "Physics C: Mech",
                      "Physics C: E&M", "Psychology", "Spanish Language", "Statistics", "US Government",
                      "US History", "World History"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Score (1-5)">
                  <select name="apScore" required style={inputStyle}>
                    <option value="5">5 — Extremely well qualified</option>
                    <option value="4">4 — Well qualified</option>
                    <option value="3">3 — Qualified</option>
                    <option value="2">2 — Possibly qualified</option>
                    <option value="1">1 — No recommendation</option>
                  </select>
                </FormField>
              </div>
            )}

            {testType === "TOEFL" && (
              <>
                <FormField label="Total Score">
                  <input required name="s" type="number" style={inputStyle} placeholder="e.g. 110" />
                </FormField>
                <FormField label="Breakdown (optional)">
                  <input name="b" style={inputStyle} placeholder="e.g. R:28 L:29 S:26 W:27" />
                </FormField>
              </>
            )}

            <div className="flex justify-end mt-3">
              <Button primary type="submit">Save Score</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}