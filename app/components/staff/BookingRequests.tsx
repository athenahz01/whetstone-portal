"use client";
import { authFetch } from "../../lib/supabase";
import { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { PageHeader } from "../ui/PageHeader";

interface BookingRequestsProps {
  strategistEmail: string;
  profileId?: string | null;
}

export function BookingRequests({ strategistEmail, profileId }: BookingRequestsProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterModal, setCounterModal] = useState<any>(null);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<"pending" | "upcoming" | "past">("pending");
  const [detailModal, setDetailModal] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);

  const IS: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#1e1e1e", border: "1.5px solid #333", borderRadius: 10, color: "#ebebeb", fontSize: 14, outline: "none", boxSizing: "border-box" };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/booking-requests?strategistEmail=${encodeURIComponent(strategistEmail)}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch { setRequests([]); }
    setLoading(false);
  };

  // Load students for create modal
  useEffect(() => {
    authFetch("/api/admin/users").then(r => r.json()).then(data => {
      const userList = data.users || data || [];
      const studentUsers = (Array.isArray(userList) ? userList : [])
        .filter((u: any) => u.role === "student" || u.studentId)
        .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      setStudents(studentUsers);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadRequests(); }, [strategistEmail]);

  // Sync GCal meetings into sessions (fire-and-forget on mount)
  useEffect(() => {
    if (profileId) {
      authFetch("/api/gcal-session-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      }).then(() => loadRequests()).catch(() => {});
    }
  }, [profileId]);

  const handleApprove = async (id: number) => {
    setProcessing(true);
    await authFetch("/api/booking-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", requestId: id }) });
    loadRequests(); setProcessing(false);
  };
  const handleDecline = async (id: number) => {
    if (!confirm("Decline this booking request?")) return;
    await authFetch("/api/booking-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline", requestId: id }) });
    loadRequests();
  };
  const handleDeleteSession = async (id: number) => {
    if (!confirm("Delete this session?")) return;
    await authFetch("/api/booking-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", requestId: id }) });
    loadRequests();
  };
  const handleCounter = async () => {
    if (!counterModal || !counterDate) return;
    setProcessing(true);
    await authFetch("/api/booking-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "counter", requestId: counterModal.id, newDate: counterDate, newStartTime: counterTime, counterNote }) });
    setCounterModal(null); setCounterDate(""); setCounterTime(""); setCounterNote("");
    loadRequests(); setProcessing(false);
  };
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const f = new FormData(e.target as HTMLFormElement);
    const studentId = Number(f.get("studentId"));
    const studentUser = students.find((s: any) => s.studentId === studentId || s.id === String(studentId));
    await authFetch("/api/booking-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        studentId,
        studentName: studentUser?.name || f.get("studentName") || "Student",
        specialist: f.get("specialist") || strategistEmail,
        date: f.get("date"),
        startTime: f.get("startTime"),
        sessionName: f.get("sessionName"),
        sessionType: f.get("sessionType"),
        notes: f.get("notes") || "",
      }),
    });
    // Auto-approve since strategist created it
    loadRequests();
    setProcessing(false); setShowCreateModal(false);
  };

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const _2w = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const twoWeeksStr = `${_2w.getFullYear()}-${String(_2w.getMonth() + 1).padStart(2, "0")}-${String(_2w.getDate()).padStart(2, "0")}`;
  const pending = requests.filter(r => r.status === "pending" || r.status === "countered");
  const upcoming = requests.filter(r => (r.status === "approved" || r.status === "confirmed") && r.date >= todayStr && r.date <= twoWeeksStr).sort((a, b) => a.date.localeCompare(b.date));
  const past = requests.filter(r => (r.status === "approved" || r.status === "confirmed") && r.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));
  const display = tab === "pending" ? pending : tab === "upcoming" ? upcoming : past;

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
        title="Sessions"
        sub={`${pending.length} pending · ${upcoming.length} upcoming · ${past.length} past`}
        right={
          <button onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
            style={{ background: "#5A83F3", color: "#fff" }}>
            + Create Session
          </button>
        }
      />
      <div className="p-4 md:p-5 px-4 md:px-6">
        {/* Tabs */}
        <div className="flex gap-0.5 mb-5 p-0.5 rounded-full" style={{ background: "#1e1e1e", display: "inline-flex" }}>
          {([
            ["pending", `Pending (${pending.length})`],
            ["upcoming", `Upcoming (${upcoming.length})`],
            ["past", `Past (${past.length})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className="px-5 py-2 rounded-full border-none cursor-pointer text-xs font-semibold"
              style={{ background: tab === key ? "#5A83F3" : "transparent", color: tab === key ? "#fff" : "#717171" }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-sub text-center py-8">Loading...</div>
        ) : display.length === 0 ? (
          <Card><div className="text-center py-10"><div className="text-3xl mb-2">📅</div><p className="text-sm text-sub m-0">No {tab} sessions.</p></div></Card>
        ) : (
          <div className="flex flex-col gap-3">
            {display.map((r: any) => {
              const sc = statusColor(r.status);
              return (
                <div key={r.id} className="p-5 rounded-xl border" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {r.start_time && <div className="text-sm mb-1" style={{ color: "#717171" }}>{r.start_time}{r.end_time ? ` — ${r.end_time}` : ""}</div>}
                      <div className="text-base font-bold text-heading mb-3">{r.session_name}</div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "#7c3aed", color: "#fff" }}>
                          {(r.student_name || "?").split(" ").map((w: string) => w[0]).join("").substring(0, 2)}
                        </div>
                        <span className="text-sm text-heading">{r.student_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-sub">
                        <span>📅 {r.date}</span>
                        <span>📋 {r.session_type}</span>
                        {tab === "past" && <span>⏱ {r.duration || "1h"}</span>}
                      </div>
                      {r.notes && <div className="text-xs text-body mt-2">{r.notes}</div>}
                      {r.status === "countered" && (
                        <div className="p-3 rounded-lg mt-3" style={{ background: "rgba(229,168,59,0.04)", border: "1px solid rgba(229,168,59,0.15)" }}>
                          <div className="text-xs font-semibold mb-1" style={{ color: "#e5a83b" }}>Your counter-offer:</div>
                          <div className="text-sm text-heading">{r.counter_date} at {r.counter_start_time}</div>
                          {r.counter_note && <div className="text-xs text-sub mt-1">{r.counter_note}</div>}
                        </div>
                      )}
                      {/* Inline notes preview — all 3 types */}
                      {(r.agenda || r.session_notes || r.student_notes) && (
                        <div className="mt-3 pt-3 border-t border-line space-y-2">
                          {r.agenda && (
                            <div className="text-xs"><span className="font-semibold" style={{ color: "#e55b5b" }}>Internal: </span><span className="text-sub">{r.agenda}</span></div>
                          )}
                          {r.session_notes && (
                            <div className="text-xs"><span className="font-semibold" style={{ color: "#5A83F3" }}>Mentor (public): </span><span className="text-body">{r.session_notes}</span></div>
                          )}
                          {r.student_notes && (
                            <div className="text-xs"><span className="font-semibold" style={{ color: "#4aba6a" }}>Student: </span><span className="text-body">{r.student_notes}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-3 ml-4">
                      <span className="text-sm font-semibold cursor-pointer hover:underline" style={{ color: "#5A83F3" }}
                        onClick={() => setDetailModal({ ...r, view: "notes" })}>Add Notes</span>
                      <div className="flex items-center gap-2">
                        {r.gcal_synced && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,180,0.08)", color: "#38bdb4", border: "1px solid rgba(56,189,180,0.2)" }}>📅 GCal</span>}
                        <span className="text-xs font-semibold px-3 py-1 rounded-full"
                          style={{ background: "transparent", border: `1.5px solid ${sc.color}`, color: sc.color }}>
                          {r.status === "pending" ? `Pending (${r.student_name?.split(" ")[0]})` : r.status}
                        </span>
                        {r.date < todayStr && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(r.id); }}
                            className="w-6 h-6 rounded-full flex items-center justify-center border-none cursor-pointer text-[10px]"
                            style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>✕</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {r.status === "pending" && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                      <button onClick={() => handleApprove(r.id)} disabled={processing}
                        className="px-4 py-2 rounded-full border-none cursor-pointer text-xs font-semibold" style={{ background: "#4aba6a", color: "#fff" }}>✓ Approve</button>
                      <button onClick={() => { setCounterModal(r); setCounterDate(r.date); setCounterTime(r.start_time || ""); setCounterNote(""); }}
                        className="px-4 py-2 rounded-full cursor-pointer text-xs font-semibold" style={{ background: "transparent", color: "#e5a83b", border: "1.5px solid #e5a83b" }}>↻ Counter-offer</button>
                      <button onClick={() => handleDecline(r.id)}
                        className="px-4 py-2 rounded-full cursor-pointer text-xs font-semibold" style={{ background: "transparent", color: "#e55b5b", border: "1.5px solid rgba(229,91,91,0.3)" }}>✕ Decline</button>
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
        <Modal title="Counter-offer" onClose={() => setCounterModal(null)}>
          <div className="p-3 rounded-lg mb-4" style={{ background: "#252525", borderLeft: "3px solid #e5a83b" }}>
            <div className="text-sm font-semibold text-heading">{counterModal.session_name}</div>
            <div className="text-xs text-sub mt-1">Original: {counterModal.date} at {counterModal.start_time}</div>
          </div>
          <FormField label="New Date"><input type="date" value={counterDate} onChange={(e) => setCounterDate(e.target.value)} style={IS} /></FormField>
          <FormField label="New Time"><input type="time" value={counterTime} onChange={(e) => setCounterTime(e.target.value)} style={IS} /></FormField>
          <FormField label="Note to student (optional)"><textarea value={counterNote} onChange={(e) => setCounterNote(e.target.value)} rows={2} placeholder="Why the change..." style={{ ...IS, resize: "vertical", lineHeight: 1.6 }} /></FormField>
          <div className="flex justify-end gap-2 mt-3">
            <Button onClick={() => setCounterModal(null)}>Cancel</Button>
            <Button primary onClick={handleCounter} disabled={processing || !counterDate}>{processing ? "Sending..." : "Send Counter-offer"}</Button>
          </div>
        </Modal>
      )}

      {/* Notes Modal — internal + public in one view */}
      {detailModal && (
        <Modal title="Session Notes" onClose={() => { setDetailModal(null); loadRequests(); }}>
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ background: "#252525", borderLeft: "3px solid #5A83F3" }}>
              <div className="text-sm font-semibold text-heading">{detailModal.session_name}</div>
              <div className="text-xs text-sub mt-1">📅 {detailModal.date} {detailModal.start_time && `· 🕐 ${detailModal.start_time}`} · {detailModal.student_name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#e55b5b" }}>Internal Notes <span className="normal-case tracking-normal font-normal">(staff only)</span></div>
              <textarea defaultValue={detailModal.agenda || ""} placeholder="Private notes — only visible to staff..." rows={4}
                onBlur={async (e) => { const v = e.target.value; await authFetch("/api/booking-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_notes", requestId: detailModal.id, agenda: v }) }); setDetailModal({ ...detailModal, agenda: v }); }}
                style={{ ...IS, resize: "vertical", lineHeight: 1.6, minHeight: 100 }} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#5A83F3" }}>Mentor Notes <span className="normal-case tracking-normal font-normal">(visible to student & parent)</span></div>
              <textarea defaultValue={detailModal.session_notes || ""} placeholder="Notes shared with student and parents..." rows={4}
                onBlur={async (e) => { const v = e.target.value; await authFetch("/api/booking-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_notes", requestId: detailModal.id, session_notes: v }) }); setDetailModal({ ...detailModal, session_notes: v }); }}
                style={{ ...IS, resize: "vertical", lineHeight: 1.6, minHeight: 100 }} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#4aba6a" }}>Student Notes <span className="normal-case tracking-normal font-normal">(written by student)</span></div>
              <div className="p-3 rounded-lg text-sm" style={{ ...IS, minHeight: 60, background: "#252525", color: detailModal.student_notes ? "#ebebeb" : "#505050" }}>
                {detailModal.student_notes || "No student notes yet"}
              </div>
            </div>
            <div className="text-[10px]" style={{ color: "#505050" }}>Internal & Mentor notes auto-save when you click away</div>
          </div>
        </Modal>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <Modal title="Create Session" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate}>
            <FormField label="Student">
              <select required name="studentId" style={IS}>
                <option value="">Select student...</option>
                {students.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")).map((s: any) => (
                  <option key={s.id} value={s.studentId || s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Session Name">
              <input required name="sessionName" placeholder="e.g. Essay Review with Jack" style={IS} />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Date"><input required name="date" type="date" style={IS} /></FormField>
              <FormField label="Start Time"><input name="startTime" type="time" style={IS} /></FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Session Type">
                <select name="sessionType" style={IS}>
                  <option value="strategy">Strategy Meeting</option>
                  <option value="essay">Essay Review</option>
                  <option value="tutoring">Tutoring</option>
                  <option value="check-in">Check-in</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
              <FormField label="Specialist">
                <input name="specialist" placeholder="Your name" defaultValue={strategistEmail.split("@")[0]} style={IS} />
              </FormField>
            </div>
            <FormField label="Quick Note (optional)">
              <textarea name="notes" rows={2} placeholder="Any context..." style={{ ...IS, resize: "vertical", lineHeight: 1.6 }} />
            </FormField>
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <button type="submit" disabled={processing}
                className="px-5 py-2 rounded-full border-none cursor-pointer text-sm font-semibold"
                style={{ background: "#5A83F3", color: "#fff", opacity: processing ? 0.5 : 1 }}>
                {processing ? "Creating..." : "Create Session"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}