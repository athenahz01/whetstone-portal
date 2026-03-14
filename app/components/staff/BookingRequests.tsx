"use client";
import { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { PageHeader } from "../ui/PageHeader";

interface BookingRequestsProps {
  strategistEmail: string;
}

export function BookingRequests({ strategistEmail }: BookingRequestsProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterModal, setCounterModal] = useState<any>(null);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [detailModal, setDetailModal] = useState<any>(null);

  const IS: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#1e1e1e", border: "1.5px solid #333", borderRadius: 10, color: "#ebebeb", fontSize: 14, outline: "none", boxSizing: "border-box" };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/booking-requests?strategistEmail=${encodeURIComponent(strategistEmail)}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch { setRequests([]); }
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [strategistEmail]);

  const handleApprove = async (id: number) => {
    setProcessing(true);
    await fetch("/api/booking-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", requestId: id }),
    });
    loadRequests();
    setProcessing(false);
  };

  const handleDecline = async (id: number) => {
    if (!confirm("Decline this booking request?")) return;
    await fetch("/api/booking-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline", requestId: id }),
    });
    loadRequests();
  };

  const handleCounter = async () => {
    if (!counterModal || !counterDate) return;
    setProcessing(true);
    await fetch("/api/booking-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "counter",
        requestId: counterModal.id,
        newDate: counterDate,
        newStartTime: counterTime,
        counterNote,
      }),
    });
    setCounterModal(null);
    setCounterDate("");
    setCounterTime("");
    setCounterNote("");
    loadRequests();
    setProcessing(false);
  };

  const pending = requests.filter(r => r.status === "pending");
  const countered = requests.filter(r => r.status === "countered");
  const resolved = requests.filter(r => ["approved", "confirmed", "declined"].includes(r.status));
  const display = tab === "pending" ? [...pending, ...countered] : requests;

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return { bg: "rgba(82,139,255,0.08)", color: "#5A83F3" };
      case "countered": return { bg: "rgba(229,168,59,0.08)", color: "#e5a83b" };
      case "approved": case "confirmed": return { bg: "rgba(74,186,106,0.08)", color: "#4aba6a" };
      case "declined": return { bg: "rgba(229,91,91,0.08)", color: "#e55b5b" };
      default: return { bg: "#333", color: "#717171" };
    }
  };

  return (
    <div>
      <PageHeader
        title="Booking Requests"
        sub={`${pending.length} pending · ${countered.length} awaiting student response`}
      />
      <div className="p-6 px-8">
        {/* Tabs */}
        <div className="flex gap-0.5 mb-5 p-0.5 rounded-full" style={{ background: "#1e1e1e", display: "inline-flex" }}>
          {([["pending", `Pending (${pending.length + countered.length})`], ["all", "All Requests"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className="px-5 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
              style={{ background: tab === key ? "#5A83F3" : "transparent", color: tab === key ? "#fff" : "#717171" }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-sub text-center py-8">Loading requests...</div>
        ) : display.length === 0 ? (
          <Card><div className="text-center py-10"><div className="text-3xl mb-2">📅</div><p className="text-sm text-sub m-0">No {tab === "pending" ? "pending " : ""}booking requests.</p></div></Card>
        ) : (
          <div className="flex flex-col gap-3">
            {display.map((r: any) => {
              const sc = statusColor(r.status);
              return (
                <div key={r.id} className="p-5 rounded-xl border" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {r.start_time && <div className="text-sm mb-1" style={{ color: "#717171" }}>{r.start_time}{r.start_time ? " — " : ""}{r.end_time || ""}</div>}
                      <div className="text-base font-bold text-heading mb-3">{r.session_name}</div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: "#7c3aed", color: "#fff" }}>
                          {(r.student_name || "?").split(" ").map((w: string) => w[0]).join("").substring(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-heading">{r.student_name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-sub">
                        <span>📅 {r.date}</span>
                        <span>📋 {r.session_type}</span>
                      </div>
                      {r.notes && <div className="text-xs text-body mt-2">{r.notes}</div>}

                      {r.status === "countered" && (
                        <div className="p-3 rounded-lg mt-3" style={{ background: "rgba(229,168,59,0.04)", border: "1px solid rgba(229,168,59,0.15)" }}>
                          <div className="text-xs font-semibold mb-1" style={{ color: "#e5a83b" }}>Your counter-offer:</div>
                          <div className="text-sm text-heading">{r.counter_date} at {r.counter_start_time}</div>
                          {r.counter_note && <div className="text-xs text-sub mt-1">{r.counter_note}</div>}
                          <div className="text-[10px] text-faint mt-1">Waiting for student to accept...</div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold cursor-pointer hover:underline" style={{ color: "#5A83F3" }}
                          onClick={(e) => { e.stopPropagation(); setDetailModal({ ...r, view: "agenda" }); }}>Agenda</span>
                        <span className="text-sm font-semibold cursor-pointer hover:underline" style={{ color: r.notes ? "#5A83F3" : "#505050" }}
                          onClick={(e) => { e.stopPropagation(); setDetailModal({ ...r, view: "notes" }); }}>Notes</span>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: "transparent", border: `1.5px solid ${sc.color}`, color: sc.color }}>
                        {r.status === "pending" ? `Pending (${r.student_name?.split(" ")[0]})` : r.status}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons — only for pending requests */}
                  {r.status === "pending" && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                      <button onClick={() => handleApprove(r.id)} disabled={processing}
                        className="px-4 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
                        style={{ background: "#4aba6a", color: "#fff" }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => { setCounterModal(r); setCounterDate(r.date); setCounterTime(r.start_time || ""); setCounterNote(""); }}
                        className="px-4 py-2 rounded-full cursor-pointer text-xs font-semibold"
                        style={{ background: "transparent", color: "#e5a83b", border: "1.5px solid #e5a83b" }}>
                        ↻ Counter-offer
                      </button>
                      <button onClick={() => handleDecline(r.id)}
                        className="px-4 py-2 rounded-full cursor-pointer text-xs font-semibold"
                        style={{ background: "transparent", color: "#e55b5b", border: "1.5px solid rgba(229,91,91,0.3)" }}>
                        ✕ Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Counter-offer modal */}
      {counterModal && (
        <Modal title={`Counter-offer for ${counterModal.student_name}`} onClose={() => setCounterModal(null)}>
          <div className="mb-3 p-3 rounded-lg" style={{ background: "#1e1e1e" }}>
            <div className="text-xs text-sub mb-1">Original request:</div>
            <div className="text-sm text-heading">{counterModal.date} · {counterModal.start_time}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="New Date">
              <input type="date" value={counterDate} onChange={(e) => setCounterDate(e.target.value)} style={IS} />
            </FormField>
            <FormField label="New Time">
              <select value={counterTime} onChange={(e) => setCounterTime(e.target.value)} style={IS}>
                {(() => {
                  const t: string[] = [];
                  for (let h = 9; h <= 20; h++) for (const m of [0, 30]) {
                    const hr = h > 12 ? h - 12 : h;
                    t.push(`${hr}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`);
                  }
                  return t.map(s => <option key={s} value={s}>{s}</option>);
                })()}
              </select>
            </FormField>
          </div>
          <FormField label="Note (optional)">
            <textarea value={counterNote} onChange={(e) => setCounterNote(e.target.value)}
              placeholder="e.g. I'm not available at that time, how about..."
              rows={2} style={{ ...IS, resize: "vertical" }} />
          </FormField>
          <div className="flex justify-end gap-2 mt-3">
            <Button onClick={() => setCounterModal(null)}>Cancel</Button>
            <Button primary onClick={handleCounter} disabled={processing || !counterDate}>
              {processing ? "Sending..." : "Send Counter-offer"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Session Detail Modal (Agenda/Notes) */}
      {detailModal && (
        <Modal title={detailModal.session_name || "Session Details"} onClose={() => { setDetailModal(null); loadRequests(); }}>
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ background: "#252525", borderLeft: "3px solid #5A83F3" }}>
              <div className="text-sm font-semibold text-heading">{detailModal.session_name}</div>
              <div className="text-xs text-sub mt-1">
                📅 {detailModal.date} {detailModal.start_time && `· 🕐 ${detailModal.start_time}`} · 📋 {detailModal.session_type || "session"}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "#7c3aed", color: "#fff" }}>
                {(detailModal.student_name || "?").split(" ").map((w: string) => w[0]).join("").substring(0, 2)}
              </div>
              <span className="text-sm text-heading">{detailModal.student_name}</span>
            </div>

            {/* Tab toggle */}
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "#252525", display: "inline-flex" }}>
              {(["agenda", "notes"] as const).map((t) => (
                <button key={t} onClick={() => setDetailModal({ ...detailModal, view: t })}
                  className="px-4 py-1.5 rounded-md border-none cursor-pointer text-xs font-semibold capitalize"
                  style={{ background: detailModal.view === t ? "#5A83F3" : "transparent", color: detailModal.view === t ? "#fff" : "#717171" }}>
                  {t === "agenda" ? "Agenda" : "Notes"}
                </button>
              ))}
            </div>

            {detailModal.view === "agenda" && (
              <div>
                <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#505050" }}>Agenda</div>
                <textarea
                  defaultValue={detailModal.agenda || ""}
                  placeholder="Add agenda items for this session..."
                  rows={5}
                  onBlur={async (e) => {
                    const val = e.target.value;
                    await fetch("/api/booking-requests", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "update_notes", requestId: detailModal.id, agenda: val }),
                    });
                    setDetailModal({ ...detailModal, agenda: val });
                  }}
                  style={{ width: "100%", padding: "12px 14px", background: "#252525", border: "1.5px solid #333", borderRadius: 10, color: "#ebebeb", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, minHeight: 120 }}
                />
                <div className="text-[10px] mt-1" style={{ color: "#505050" }}>Auto-saves when you click away</div>
              </div>
            )}

            {detailModal.view === "notes" && (
              <div>
                <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#505050" }}>Session Notes</div>
                <textarea
                  defaultValue={detailModal.session_notes || ""}
                  placeholder="Take notes during or after the session..."
                  rows={5}
                  onBlur={async (e) => {
                    const val = e.target.value;
                    await fetch("/api/booking-requests", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "update_notes", requestId: detailModal.id, session_notes: val }),
                    });
                    setDetailModal({ ...detailModal, session_notes: val });
                  }}
                  style={{ width: "100%", padding: "12px 14px", background: "#252525", border: "1.5px solid #333", borderRadius: 10, color: "#ebebeb", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, minHeight: 120 }}
                />
                <div className="text-[10px] mt-1" style={{ color: "#505050" }}>Auto-saves when you click away</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}