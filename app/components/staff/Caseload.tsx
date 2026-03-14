"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { addStudent, updateStudent } from "../../lib/queries";
import { useState, useEffect, useMemo, useRef } from "react";

function daysSinceLogin(lastLogin: string | null | undefined): number {
  if (!lastLogin || lastLogin === "Never" || lastLogin === "") return Infinity;
  const parsed = new Date(lastLogin);
  if (isNaN(parsed.getTime())) return Infinity;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

interface StaffMember {
  name: string;
  initials: string;
}

interface CaseloadProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
  onNavigate: (view: string) => void;
  onRefresh: () => void;
  isAdmin?: boolean;
}

interface InviteResult {
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export function Caseload({ students, onSelectStudent, onNavigate, onRefresh, isAdmin }: CaseloadProps) {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [sort, setSort] = useState("urgency");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [teamDropdownId, setTeamDropdownId] = useState<number | null>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch staff members for team multiselect
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        const userList = data.users || data || [];
        const staff = (Array.isArray(userList) ? userList : [])
          .filter((u: any) => u.role === "strategist")
          .map((u: any) => ({
            name: u.name || u.email,
            initials: (u.name || "??").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
          }));
        setStaffList(staff);
      })
      .catch(() => setStaffList([]));
  }, []);

  // Close team dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
        setTeamDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTeamToggle = async (studentId: number, memberName: string, currentTeam: string[]) => {
    const newTeam = currentTeam.includes(memberName)
      ? currentTeam.filter((t) => t !== memberName)
      : [...currentTeam, memberName];
    await updateStudent(studentId, { team: newTeam });
    onRefresh();
  };

  const sorted = [...students].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) :
    sort === "engagement" ? a.engagement - b.engagement :
    (b.status === "needs-attention" ? 1 : 0) - (a.status === "needs-attention" ? 1 : 0)
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#252525",
    border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const f = new FormData(e.target as HTMLFormElement);
    const name = f.get("name") as string;
    const email = f.get("email") as string;
    const grade = Number(f.get("grade"));
    const school = f.get("school") as string;
    const gradYear = Number(f.get("gradYear"));

    // Step 1: Add student record to database
    const studentId = await addStudent({ name, email, grade, gpa: null, school, gradYear });

    if (!studentId) {
      setSaving(false);
      setInviteError("Failed to create student record. Please try again.");
      return;
    }

    // Step 2: Create auth account for the student
    try {
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role: "student", studentId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to create student login account.");
        setSaving(false);
        setShowModal(false);
        onRefresh();
        return;
      }

      if (data.tempPassword) {
        // Close the form, show credentials — DON'T refresh yet
        // (refresh happens when user dismisses the credentials modal)
        setSaving(false);
        setShowModal(false);
        setInviteResult({ email, tempPassword: data.tempPassword, loginUrl: data.loginUrl });
        return;
      }
    } catch (err) {
      console.error("Failed to create student account:", err);
      setInviteError("Network error creating student account. The student record was created but they won't be able to log in yet.");
    }

    setSaving(false);
    setShowModal(false);
    onRefresh();
  };

  const handleDismissCredentials = () => {
    setInviteResult(null);
    onRefresh();
  };

  const handleCopy = (type: "email" | "password", value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Students"
        sub={`${students.length} students`}
        right={
          <div className="flex gap-2 items-center">
            <div className="inline-flex gap-0.5 p-0.5 rounded-lg" style={{ background: "#252525", border: "1px solid #333" }}>
              <button onClick={() => setViewMode("table")} className="px-3 py-1.5 rounded-md border-none cursor-pointer text-xs font-semibold"
                style={{ background: viewMode === "table" ? "#5A83F3" : "transparent", color: viewMode === "table" ? "#fff" : "#717171" }}>☰ Table</button>
              <button onClick={() => setViewMode("card")} className="px-3 py-1.5 rounded-md border-none cursor-pointer text-xs font-semibold"
                style={{ background: viewMode === "card" ? "#5A83F3" : "transparent", color: viewMode === "card" ? "#fff" : "#717171" }}>▦ Cards</button>
            </div>
            {viewMode === "card" && (
              <div className="flex gap-1">
                {["urgency", "engagement", "name"].map((s) => (
                  <button key={s} onClick={() => setSort(s)}
                    className="px-3.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold capitalize"
                    style={{ background: sort === s ? "rgba(82,139,255,0.08)" : "#252525", border: `1px solid ${sort === s ? "#5A83F3" : "#333"}`, color: sort === s ? "#7aabff" : "#717171" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <Button primary onClick={() => { setShowModal(true); setInviteResult(null); setInviteError(null); }}>+ Add Student</Button>
          </div>
        }
      />

      <div className="p-6 px-8">
        {/* ── TABLE VIEW ── */}
        {viewMode === "table" && (
          <Card noPadding style={{ overflow: "hidden" }}>
            <div className="px-6 py-4 border-b border-line">
              <h2 className="m-0 text-base font-bold text-heading">Student Overview</h2>
            </div>
            <div className="grid px-6 py-2.5 border-b border-line text-[10px] uppercase tracking-widest font-semibold" style={{ gridTemplateColumns: "2fr 0.8fr 0.8fr 1fr 1.2fr 1.2fr", background: "#252525", color: "#505050" }}>
              <div>Student</div><div>Grade</div><div>GPA</div><div>Overdue</div><div>Last Login</div><div>Team</div>
            </div>
            {sorted.map((s) => {
              const overdue = s.dl.filter((d) => d.status === "overdue").length;
              const loginDays = daysSinceLogin(s.lastLogin);
              const loginLabel = loginDays === Infinity ? "Never" : loginDays === 0 ? "Today" : loginDays === 1 ? "Yesterday" : `${loginDays}d ago`;
              const loginColor = loginDays === Infinity ? "#505050" : loginDays >= 3 ? "#e55b5b" : loginDays >= 1 ? "#e5a83b" : "#4aba6a";
              return (
                <div key={s.id} onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
                  className="grid px-6 py-3 border-b border-line items-center cursor-pointer hover:bg-mist transition-colors"
                  style={{ gridTemplateColumns: "2fr 0.8fr 0.8fr 1fr 1.2fr 1.2fr" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(90,131,243,0.1)", color: "#5A83F3" }}>{s.av}</div>
                    <div><span className="text-sm font-medium text-heading">{s.name}</span><div className="text-xs text-sub">{s.school}</div></div>
                  </div>
                  <div className="text-sm text-body">{s.grade}</div>
                  <div className="text-sm text-body">{s.gpa ?? "—"}</div>
                  <div>{overdue > 0 ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>{overdue}</span> : <span className="text-xs text-sub">0</span>}</div>
                  <div className="text-xs font-semibold" style={{ color: loginColor }}>{loginLabel}</div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <div
                      onClick={() => setTeamDropdownId(teamDropdownId === s.id ? null : s.id)}
                      className="flex items-center gap-1 cursor-pointer rounded-lg px-2 py-1 hover:bg-raised transition-colors min-h-[28px]"
                    >
                      {(s.team && s.team.length > 0) ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {s.team.map((name) => (
                            <span key={name} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(90,131,243,0.1)", color: "#5A83F3" }}>
                              {name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#505050" }}>+ Assign</span>
                      )}
                    </div>
                    {teamDropdownId === s.id && (
                      <div ref={teamDropdownRef} className="absolute z-50 right-0 rounded-xl shadow-lg border border-line overflow-hidden" style={{ background: "#1e1e1e", top: "calc(100% + 4px)", minWidth: 200 }}>
                        <div className="px-3 py-2 border-b border-line">
                          <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "#505050" }}>Assign Team</div>
                        </div>
                        <div className="py-1 max-h-48 overflow-y-auto">
                          {staffList.map((staff) => {
                            const isSelected = (s.team || []).includes(staff.name);
                            return (
                              <button
                                key={staff.name}
                                onClick={() => handleTeamToggle(s.id, staff.name, s.team || [])}
                                className="w-full flex items-center gap-2.5 px-3 py-2 border-none cursor-pointer text-left hover:bg-raised transition-colors"
                                style={{ background: isSelected ? "rgba(90,131,243,0.06)" : "transparent" }}
                              >
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                  style={{ background: isSelected ? "rgba(90,131,243,0.15)" : "#252525", color: isSelected ? "#5A83F3" : "#717171" }}>
                                  {staff.initials}
                                </div>
                                <span className="text-xs flex-1" style={{ color: isSelected ? "#ebebeb" : "#a0a0a0" }}>{staff.name}</span>
                                {isSelected && <span style={{ color: "#5A83F3" }}>✓</span>}
                              </button>
                            );
                          })}
                          {staffList.length === 0 && (
                            <div className="px-3 py-3 text-xs text-center" style={{ color: "#505050" }}>No staff accounts found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {students.length === 0 && <div className="px-6 py-8 text-center text-sm text-sub">No students yet.</div>}
            <div className="px-6 py-2.5 border-t border-line text-xs" style={{ background: "#252525", color: "#505050" }}>{students.length} student{students.length !== 1 ? "s" : ""}</div>
          </Card>
        )}

        {/* ── CARD VIEW ── */}
        {viewMode === "card" && (
          <div className="grid grid-cols-2 gap-3.5">
        {sorted.map((s) => {
          const ov = s.dl.filter((d) => d.status === "overdue").length;
          return (
            <Card
              key={s.id}
              onClick={() => { onSelectStudent(s); onNavigate("detail"); }}
              style={{ borderTop: `3px solid ${s.status === "needs-attention" ? "#e55b5b" : s.engagement > 80 ? "#4aba6a" : "#e5a83b"}`, cursor: "pointer" }}
            >
              <div className="flex justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(82,139,255,0.06)", color: "#7aabff" }}>{s.av}</div>
                  <div>
                    <div className="text-base font-bold text-heading">{s.name}</div>
                    <div className="text-xs text-sub">Gr. {s.grade} · {s.school}</div>
                  </div>
                </div>
                <Tag color={s.status === "needs-attention" ? "#e55b5b" : "#4aba6a"}>
                  {s.status === "needs-attention" ? "Attention" : "On track"}
                </Tag>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([["Schools", s.schools.length, "#ebebeb"], ["Overdue", ov, ov > 0 ? "#e55b5b" : "#ebebeb"], ["Engagement", `${s.engagement}%`, s.engagement > 80 ? "#4aba6a" : "#e5a83b"]] as const).map(([l, v, c]) => (
                  <div key={l} className="p-2 rounded-lg text-center" style={{ background: "#252525" }}>
                    <div className="text-base font-bold" style={{ color: c }}>{v}</div>
                    <div className="text-[11px] text-sub mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <Modal title="Add New Student" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd}>
            <FormField label="Full Name">
              <input required name="name" placeholder="e.g. Jane Smith" style={inputStyle} />
            </FormField>
            <FormField label="Student Email">
              <input required name="email" type="email" placeholder="e.g. jane@email.com" style={inputStyle} />
              <div className="text-xs mt-1.5 px-1" style={{ color: "#717171" }}>
                A temporary password will be generated for the student to log in.
              </div>
            </FormField>
            <FormField label="School">
              <input required name="school" placeholder="e.g. Stuyvesant High School" style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Grade">
                <input required name="grade" type="number" min="9" max="12" placeholder="12" style={inputStyle} />
              </FormField>
              <FormField label="Graduation Year">
                <input required name="gradYear" type="number" placeholder="2026" style={inputStyle} />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 14,
                  background: saving ? "#333" : "#ebebeb",
                  color: saving ? "#505050" : "#111",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Adding..." : "Add Student"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invite Error Banner */}
      {inviteError && !inviteResult && (
        <Modal title="Account Creation Issue" onClose={() => setInviteError(null)}>
          <div style={{ padding: "4px 0" }}>
            <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ background: "rgba(229,91,91,0.08)", border: "1px solid rgba(229,91,91,0.2)", color: "#e55b5b" }}>
              {inviteError}
            </div>
            <p className="text-sm text-sub mb-4">
              The student record was added to your caseload, but their login account could not be created automatically. You may need to set up their account manually in Supabase, or try again.
            </p>
            <button
              onClick={() => setInviteError(null)}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#ebebeb", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              OK
            </button>
          </div>
        </Modal>
      )}

      {/* Credentials Modal */}
      {inviteResult && (
        <Modal title="Student Account Created! 🎉" onClose={handleDismissCredentials}>
          <div style={{ padding: "4px 0" }}>
            <p className="text-sm text-body mb-4">
              Share these login credentials with the student. They can log in at{" "}
              <strong>{inviteResult.loginUrl}</strong> and change their password after signing in.
            </p>

            <div className="flex flex-col gap-3 mb-4">
              {/* Email */}
              <div>
                <div className="text-xs font-semibold text-sub mb-1">Email</div>
                <div className="flex items-center gap-2">
                  <div style={{ flex: 1, padding: "10px 14px", background: "#252525", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, color: "#a0a0a0", fontFamily: "monospace" }}>
                    {inviteResult.email}
                  </div>
                  <button onClick={() => handleCopy("email", inviteResult.email)}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #2a2a2a", background: copied === "email" ? "rgba(74,186,106,0.08)" : "#252525", color: copied === "email" ? "#4aba6a" : "#717171", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    {copied === "email" ? "✓" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Temp Password */}
              <div>
                <div className="text-xs font-semibold text-sub mb-1">Temporary Password</div>
                <div className="flex items-center gap-2">
                  <div style={{ flex: 1, padding: "10px 14px", background: "rgba(229,168,59,0.08)", border: "1px solid rgba(229,168,59,0.2)", borderRadius: 8, fontSize: 15, color: "#e5a83b", fontFamily: "monospace", letterSpacing: "0.05em", fontWeight: 700 }}>
                    {inviteResult.tempPassword}
                  </div>
                  <button onClick={() => handleCopy("password", inviteResult.tempPassword)}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #2a2a2a", background: copied === "password" ? "rgba(74,186,106,0.08)" : "#252525", color: copied === "password" ? "#4aba6a" : "#717171", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    {copied === "password" ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg px-3 py-2.5 text-xs mb-4" style={{ background: "rgba(82,139,255,0.06)", border: "1px solid #bfdbfe", color: "#7aabff" }}>
              💡 Send these credentials to the student via text or email. They can log in and update their password from account settings.
            </div>

            <button
              onClick={handleDismissCredentials}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#ebebeb", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}