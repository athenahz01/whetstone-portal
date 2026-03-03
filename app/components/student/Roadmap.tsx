"use client";

import { Task } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { getCategoryColor, getStatusColor } from "../../lib/colors";
import { useState, useMemo } from "react";

interface RoadmapProps {
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  readOnly?: boolean;
}

export function Roadmap({ tasks, setTasks, readOnly = false }: RoadmapProps) {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleTask = (id: number) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, st: t.st === "Completed" ? "In Progress" : "Completed" } : t)));

  const toggleCat = (c: string) => setCollapsed((p) => ({ ...p, [c]: !p[c] }));

  const grouped = useMemo(
    () => tasks.reduce((a, t) => { (a[t.cat] = a[t.cat] || []).push(t); return a; }, {} as Record<string, Task[]>),
    [tasks]
  );

  // Timeline calculations
  const tl = useMemo(() => {
    if (!tasks.length) return null;
    const ds = tasks.flatMap((t) => [new Date(t.s), new Date(t.d)]);
    const mn = new Date(Math.min(...ds.map((d) => d.getTime())));
    const mx = new Date(Math.max(...ds.map((d) => d.getTime())));
    mn.setDate(mn.getDate() - 14);
    mx.setDate(mx.getDate() + 14);
    const ms = mx.getTime() - mn.getTime();
    const mo: Date[] = [];
    const c = new Date(mn);
    while (c <= mx) {
      mo.push(new Date(c));
      c.setMonth(c.getMonth() + 1);
    }
    return { mn, mx, ms, mo };
  }, [tasks]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <PageHeader
        title="Roadmap"
        sub="Track timelines and manage tasks."
        right={
          readOnly ? (
            <span className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "#eff6ff", color: "#1d4ed8" }}>View Only</span>
          ) : (
            <Button primary onClick={() => setShowModal(true)}>+ New Task</Button>
          )
        }
      />
      <div className="p-6 px-8">
        {/* View Toggle */}
        <div className="inline-flex gap-0.5 bg-white border border-line rounded-lg p-1 mb-5">
          {([["list", "List"], ["timeline", "Timeline"]] as const).map(([id, l]) => (
            <button key={id} onClick={() => setViewMode(id)}
              className="px-5 py-2 rounded-lg border-none cursor-pointer text-sm font-semibold"
              style={{ background: viewMode === id ? "#3b82f6" : "transparent", color: viewMode === id ? "#fff" : "#64748b" }}>
              {l}
            </button>
          ))}
        </div>

        {/* LIST VIEW */}
        {viewMode === "list" ? (
          <Card noPadding style={{ overflow: "hidden" }}>
            <div className="grid px-6 py-2.5 border-b border-line" style={{ gridTemplateColumns: "5fr 2fr 2fr 2fr", background: "#f8f9fb" }}>
              {["Task", "Team", "Status", "Due"].map((h) => (
                <div key={h} className="text-xs text-sub uppercase tracking-widest font-semibold" style={{ textAlign: h === "Due" ? "right" : "left" }}>{h}</div>
              ))}
            </div>
            {Object.entries(grouped).map(([cat, ts]) => (
              <div key={cat}>
                <div onClick={() => toggleCat(cat)} className="flex items-center gap-2 px-6 py-2.5 cursor-pointer border-b border-line" style={{ background: `${getCategoryColor(cat)}06` }}>
                  <span className="text-xs text-sub">{collapsed[cat] ? "▸" : "▾"}</span>
                  <span className="text-sm font-bold" style={{ color: getCategoryColor(cat) }}>{cat}</span>
                  <span className="text-xs text-sub">({ts.length})</span>
                </div>
                {!collapsed[cat] && ts.map((t) => (
                  <div key={t.id} className="grid px-6 py-3 border-b border-line items-center" style={{ gridTemplateColumns: "5fr 2fr 2fr 2fr" }}>
                    <div className="flex items-center gap-2.5 pl-4">
                      {!readOnly && (
                        <button onClick={() => toggleTask(t.id)} className="bg-transparent border-none cursor-pointer text-base p-0" style={{ color: t.st === "Completed" ? "#16a34a" : "#94a3b8" }}>
                          {t.st === "Completed" ? "✓" : "○"}
                        </button>
                      )}
                      <span className="text-sm" style={{ color: t.st === "Completed" ? "#94a3b8" : "#0f172a", textDecoration: t.st === "Completed" ? "line-through" : "none" }}>{t.title}</span>
                    </div>
                    <div className="flex gap-1">
                      {t.team?.map((a, i) => (
                        <span key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}>{a[0]}</span>
                      ))}
                    </div>
                    <Tag color={getStatusColor(t.st)}>{t.st}</Tag>
                    <div className="text-sm text-sub text-right">{new Date(t.d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        ) : (
          /* TIMELINE (GANTT) VIEW */
          <Card noPadding style={{ overflow: "hidden", display: "flex" }}>
            {/* Left: Task list */}
            <div className="flex-shrink-0 border-r border-line" style={{ width: 220, background: "#f8f9fb" }}>
              <div className="h-10 border-b border-line px-3.5 flex items-center text-xs text-sub">Tasks</div>
              {Object.entries(grouped).map(([cat, ts]) => (
                <div key={cat}>
                  <div onClick={() => toggleCat(cat)} className="flex items-center gap-1.5 px-3.5 py-2 cursor-pointer border-b border-line text-xs font-bold bg-white" style={{ color: getCategoryColor(cat) }}>
                    <span className="text-[9px]">{collapsed[cat] ? "▸" : "▾"}</span>{cat}
                  </div>
                  {!collapsed[cat] && ts.map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5 px-3.5 border-b border-line bg-white" style={{ paddingLeft: 26, height: 42 }}>
                      {!readOnly && (
                        <button onClick={() => toggleTask(t.id)} className="bg-transparent border-none cursor-pointer text-xs p-0" style={{ color: t.st === "Completed" ? "#16a34a" : "#94a3b8" }}>
                          {t.st === "Completed" ? "✓" : "○"}
                        </button>
                      )}
                      <span className="text-sm overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: t.st === "Completed" ? "#94a3b8" : "#334155", textDecoration: t.st === "Completed" ? "line-through" : "none" }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Right: Gantt bars */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ minWidth: 700 }}>
                {/* Month headers */}
                <div className="flex h-10 border-b border-line">
                  {tl?.mo.map((m, i) => (
                    <div key={i} className="flex-1 border-r border-line flex items-center justify-center text-xs text-sub font-semibold uppercase">
                      {m.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                    </div>
                  ))}
                </div>

                {/* Bars by category */}
                {Object.entries(grouped).map(([cat, ts]) => (
                  <div key={cat}>
                    {/* Spacer for category header */}
                    <div style={{ height: 35 }} />
                    {!collapsed[cat] && ts.map((t) => {
                      if (!tl) return null;
                      const s0 = new Date(t.s);
                      const e0 = new Date(t.d);
                      const l = Math.max(0, ((s0.getTime() - tl.mn.getTime()) / tl.ms) * 100);
                      const w = Math.max(2, ((e0.getTime() - s0.getTime()) / tl.ms) * 100);
                      return (
                        <div key={t.id} className="relative flex items-center" style={{ height: 42 }}>
                          <div
                            className="absolute flex items-center text-xs text-white font-semibold overflow-hidden whitespace-nowrap"
                            style={{
                              left: `${l}%`,
                              width: `${w}%`,
                              height: 26,
                              background: getCategoryColor(cat),
                              borderRadius: 13,
                              opacity: t.st === "Completed" ? 0.3 : 0.85,
                              paddingLeft: 12,
                              minWidth: 20,
                            }}
                          >
                            {t.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <Modal title="New Task" onClose={() => setShowModal(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.target as HTMLFormElement);
            setTasks([...tasks, { id: Date.now(), title: f.get("t") as string, cat: f.get("c") as string, s: f.get("s") as string, d: f.get("d") as string, st: "Planned", team: ["AR"] }]);
            setShowModal(false);
          }}>
            <FormField label="Title"><input required name="t" style={inputStyle} /></FormField>
            <FormField label="Category">
              <select name="c" style={inputStyle}>
                <option>College Applications</option><option>Academics</option><option>Testing</option><option>Extracurriculars</option>
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start"><input required name="s" type="date" style={inputStyle} /></FormField>
              <FormField label="Due"><input required name="d" type="date" style={inputStyle} /></FormField>
            </div>
            <div className="flex justify-end mt-2"><Button primary type="submit">Save Task</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}