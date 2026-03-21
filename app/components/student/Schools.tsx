"use client";
import { authFetch } from "../../lib/supabase";
import { useState, useEffect, useCallback } from "react";
import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";

interface SchoolsProps { student: Student; readOnly?: boolean; onRefresh?: () => void; }
interface SchoolData { id: number; name: string; city: string; state: string; url: string; ownership: number; admissionRate: number|null; satAvg: number|null; satReading: number|null; satMath: number|null; sat25: number|null; sat75: number|null; actAvg: number|null; act25: number|null; act75: number|null; studentSize: number|null; tuitionInState: number|null; tuitionOutState: number|null; avgNetPrice: number|null; medianDebt: number|null; pellGrantRate: number|null; completionRate: number|null; medianEarnings: number|null; demographics: { white: number|null; black: number|null; hispanic: number|null; asian: number|null }; programs: { title: string; count: number }[]; }

const tc: Record<string, string> = { reach: "#e55b5b", match: "#e5a83b", safety: "#4aba6a" };
const ownerLabel = (o: number) => o === 1 ? "Public" : o === 2 ? "Private Nonprofit" : "Private";
const pct = (v: number|null) => v != null ? (v * 100).toFixed(1) + "%" : "\u2014";
const money = (v: number|null) => v != null ? "$" + v.toLocaleString() : "\u2014";
const numFmt = (v: number|null) => v != null ? v.toLocaleString() : "\u2014";

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: "#252525" }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#717171" }}>{label}</div>
      <div className="text-xl font-bold" style={{ color: color || "#ebebeb" }}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: "#717171" }}>{sub}</div>}
    </div>
  );
}

export function Schools({ student, readOnly = false, onRefresh }: SchoolsProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolData[]>([]);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<SchoolData|null>(null);
  const [adding, setAdding] = useState(false);
  const [addType, setAddType] = useState<"reach"|"match"|"safety">("match");
  const [schoolCache, setSchoolCache] = useState<Record<string, SchoolData>>({});

  const isOnList = (name: string) => student.schools.some(s => s.name.toLowerCase() === name.toLowerCase());

  const addToList = async (name: string, type: string) => {
    setAdding(true);
    await authFetch("/api/student-schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", studentId: student.id, name, type }),
    });
    setAdding(false);
    if (onRefresh) onRefresh();
  };

  const removeFromList = async (schoolId: number) => {
    await authFetch("/api/student-schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", schoolId }),
    });
    if (onRefresh) onRefresh();
  };

  const updateType = async (schoolId: number, newType: string) => {
    await authFetch("/api/student-schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", schoolId, type: newType }),
    });
    if (onRefresh) onRefresh();
  };

  // Fetch API data for saved schools on mount
  useEffect(() => {
    student.schools.forEach(s => {
      if (!schoolCache[s.name]) {
        authFetch("/api/schools?q=" + encodeURIComponent(s.name))
          .then(r => r.json())
          .then(data => {
            const match = (data.schools || []).find((sc: SchoolData) => sc.name.toLowerCase() === s.name.toLowerCase()) || (data.schools || [])[0];
            if (match) setSchoolCache(prev => ({ ...prev, [s.name]: match }));
          })
          .catch(() => {});
      }
    });
  }, [student.schools]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await authFetch("/api/schools?q=" + encodeURIComponent(q));
      const data = await res.json();
      setResults(data.schools || []);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const openDetail = async (s: SchoolData) => {
    setQuery(""); setResults([]);
    if (s.programs && s.programs.length > 0) { setDetail(s); return; }
    try {
      const res = await authFetch("/api/schools?id=" + s.id);
      const data = await res.json();
      setDetail(data.schools?.[0] || s);
    } catch { setDetail(s); }
  };

  const rateColor = (r: number|null) => r == null ? undefined : r < 0.15 ? "#e55b5b" : r < 0.4 ? "#e5a83b" : "#4aba6a";

  return (
    <div>
      <PageHeader title="Schools" sub={student.schools.length + " schools on your list"} />
      <div className="p-5 px-6">
        <div className="mb-6 relative">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a college or university..."
            style={{ width: "100%", padding: "14px 18px", background: "#252525", border: "1.5px solid #333", borderRadius: 14, color: "#ebebeb", fontSize: 15, outline: "none", boxSizing: "border-box" as const }} />
          {searching && <div className="absolute right-4 top-4 text-xs text-sub">Searching...</div>}
          {results.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-50" style={{ background: "#252525", border: "1px solid #333", maxHeight: 420, overflowY: "auto" as const }}>
              {results.map((s) => (
                <div key={s.id} onClick={() => openDetail(s)}
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer border-b border-line hover:bg-raised">
                  <div>
                    <div className="text-sm font-semibold text-heading">{s.name}</div>
                    <div className="text-xs text-sub">{s.city}, {s.state} &middot; {ownerLabel(s.ownership)}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {s.admissionRate != null && <div className="text-right"><div className="text-sm font-bold" style={{ color: rateColor(s.admissionRate) }}>{pct(s.admissionRate)}</div><div className="text-[9px] text-faint">Accept</div></div>}
                    {s.satAvg != null && <div className="text-right"><div className="text-sm font-bold text-heading">{s.satAvg}</div><div className="text-[9px] text-faint">SAT</div></div>}
                    {!readOnly && (
                      isOnList(s.name) ? (
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(74,186,106,0.08)", color: "#4aba6a" }}>On List</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); addToList(s.name, "match"); }}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full border-none cursor-pointer"
                          style={{ background: "#5A83F3", color: "#fff" }}>
                          + Add
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {query.length >= 2 && !searching && results.length === 0 && <div className="mt-2 text-sm text-sub text-center py-3">No schools found</div>}
        </div>

        {student.schools.length > 0 && (<>
          <h3 className="text-sm font-bold text-heading mb-3">My School List</h3>
          <div className="flex flex-col gap-3 mb-6">
            {student.schools.map((s, i) => {
              const cached = schoolCache[s.name];
              return (
                <Card key={i} style={{ borderLeft: "3px solid " + tc[s.type], padding: 16 }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (cached) setDetail(cached); else { setQuery(s.name); doSearch(s.name); } }}>
                      <div className="text-base font-bold text-heading">{s.name}</div>
                      {cached && <div className="text-xs text-sub mt-0.5">{cached.city}, {cached.state} &middot; {ownerLabel(cached.ownership)}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Clickable type toggle */}
                      {!readOnly && (["reach", "match", "safety"] as const).map(t => (
                        <button key={t} onClick={() => s.id && updateType(s.id, t)}
                          className="text-[10px] font-semibold px-2 py-1 rounded-full cursor-pointer"
                          style={{ background: s.type === t ? tc[t] + "20" : "transparent", color: tc[t], border: s.type === t ? "1.5px solid " + tc[t] : "1.5px solid #333" }}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                      {readOnly && <Tag color={tc[s.type]}>{s.type}</Tag>}
                      {!readOnly && (
                        <button onClick={() => s.id && removeFromList(s.id)}
                          className="text-xs bg-transparent border-none cursor-pointer ml-1" style={{ color: "#e55b5b" }}>✕</button>
                      )}
                    </div>
                  </div>
                  {/* Quick stats row */}
                  {cached && (
                    <div className="flex items-center gap-5 mt-3 pt-3 border-t border-line">
                      {cached.admissionRate != null && (
                        <div><div className="text-[10px] text-faint uppercase">Accept</div><div className="text-sm font-bold" style={{ color: rateColor(cached.admissionRate) }}>{pct(cached.admissionRate)}</div></div>
                      )}
                      {(cached.sat25 || cached.satAvg) && (
                        <div><div className="text-[10px] text-faint uppercase">SAT</div><div className="text-sm font-bold text-heading">{cached.sat25 && cached.sat75 ? `${cached.sat25}–${cached.sat75}` : cached.satAvg}</div></div>
                      )}
                      {(cached.act25 || cached.actAvg) && (
                        <div><div className="text-[10px] text-faint uppercase">ACT</div><div className="text-sm font-bold text-heading">{cached.act25 && cached.act75 ? `${cached.act25}–${cached.act75}` : cached.actAvg}</div></div>
                      )}
                      {cached.studentSize != null && (
                        <div><div className="text-[10px] text-faint uppercase">Size</div><div className="text-sm font-bold text-heading">{numFmt(cached.studentSize)}</div></div>
                      )}
                      <div className="flex-1" />
                      <button onClick={() => { if (cached) setDetail(cached); }}
                        className="text-[10px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: "#5A83F3" }}>View Details →</button>
                    </div>
                  )}
                  {!cached && (
                    <div className="mt-2 text-xs text-faint">Loading stats...</div>
                  )}
                </Card>
              );
            })}
          </div>
        </>)}

        {student.schools.length === 0 && !query && (
          <Card><div className="text-center py-10"><div className="text-4xl mb-3">🎓</div><h3 className="text-lg font-bold text-heading mb-1">Start Building Your School List</h3><p className="text-sm text-sub m-0">Search for colleges above to explore admissions data, costs, and programs.</p></div></Card>
        )}
      </div>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div style={{ maxHeight: "70vh", overflowY: "auto" as const, paddingRight: 4 }}>
            {/* Add to list bar */}
            {!readOnly && (
              <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: "#252525" }}>
                {isOnList(detail.name) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "#4aba6a" }}>✓</span>
                    <span className="text-sm text-heading">On your school list</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-sub">Add as:</span>
                    {(["reach", "match", "safety"] as const).map(t => (
                      <button key={t} onClick={() => setAddType(t)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                        style={{ background: addType === t ? tc[t] + "20" : "transparent", color: tc[t], border: addType === t ? "1.5px solid " + tc[t] : "1.5px solid #333" }}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
                {!isOnList(detail.name) && (
                  <button onClick={() => addToList(detail.name, addType)} disabled={adding}
                    className="text-xs font-semibold px-4 py-2 rounded-full border-none cursor-pointer"
                    style={{ background: "#5A83F3", color: "#fff" }}>
                    {adding ? "Adding..." : "+ Add to My List"}
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-sub">{detail.city}, {detail.state}</span>
              <span className="text-xs text-faint">&middot;</span>
              <span className="text-xs text-sub">{ownerLabel(detail.ownership)}</span>
              {detail.url && <><span className="text-xs text-faint">&middot;</span><a href={"https://" + detail.url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "#5A83F3" }}>{detail.url}</a></>}
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-sub mb-2">Admissions</h4>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <Stat label="Acceptance Rate" value={pct(detail.admissionRate)} color={rateColor(detail.admissionRate)} />
              <Stat label="SAT" value={detail.satAvg ? String(detail.satAvg) : "\u2014"} sub={detail.sat25 && detail.sat75 ? `25th: ${detail.sat25} \u00b7 75th: ${detail.sat75}` : detail.satReading && detail.satMath ? "R: " + detail.satReading + " \u00b7 M: " + detail.satMath : undefined} />
              <Stat label="ACT" value={detail.actAvg ? String(detail.actAvg) : "\u2014"} sub={detail.act25 && detail.act75 ? `25th: ${detail.act25} \u00b7 75th: ${detail.act75}` : undefined} />
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-sub mb-2">Student Body &amp; Outcomes</h4>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <Stat label="Undergrad Size" value={numFmt(detail.studentSize)} />
              <Stat label="Graduation Rate" value={pct(detail.completionRate)} color={detail.completionRate != null && detail.completionRate > 0.8 ? "#4aba6a" : undefined} />
              <Stat label="Median Earnings" value={money(detail.medianEarnings)} sub="10 yrs after entry" />
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-sub mb-2">Cost &amp; Aid</h4>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <Stat label="In-State Tuition" value={money(detail.tuitionInState)} />
              <Stat label="Out-of-State Tuition" value={money(detail.tuitionOutState)} />
              <Stat label="Avg Net Price" value={money(detail.avgNetPrice)} sub="After financial aid" />
              <Stat label="Median Debt" value={money(detail.medianDebt)} sub={detail.pellGrantRate != null ? pct(detail.pellGrantRate) + " receive Pell Grants" : undefined} />
            </div>

            {detail.demographics && (detail.demographics.white || detail.demographics.asian) && (<>
              <h4 className="text-xs font-bold uppercase tracking-wider text-sub mb-2">Demographics</h4>
              <div className="flex gap-1.5 mb-5">
                {[{ l: "White", v: detail.demographics.white, c: "#5A83F3" }, { l: "Black", v: detail.demographics.black, c: "#a480f2" }, { l: "Hispanic", v: detail.demographics.hispanic, c: "#e5a83b" }, { l: "Asian", v: detail.demographics.asian, c: "#4aba6a" }].filter(d => d.v != null && d.v > 0).map(d => (
                  <div key={d.l} className="flex-1 p-3 rounded-lg text-center" style={{ background: "#252525" }}>
                    <div className="text-base font-bold" style={{ color: d.c }}>{pct(d.v)}</div>
                    <div className="text-[10px] text-faint mt-0.5">{d.l}</div>
                  </div>
                ))}
              </div>
            </>)}

            {detail.programs && detail.programs.length > 0 && (<>
              <h4 className="text-xs font-bold uppercase tracking-wider text-sub mb-2">Popular Programs</h4>
              <div className="flex flex-col gap-1">
                {detail.programs.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "#252525" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(90,131,243,0.1)", color: "#5A83F3" }}>{i + 1}</span>
                      <span className="text-sm text-heading">{p.title}</span>
                    </div>
                    {p.count > 0 && <span className="text-[10px] text-faint">{p.count} grads</span>}
                  </div>
                ))}
              </div>
            </>)}
          </div>
        </Modal>
      )}
    </div>
  );
}