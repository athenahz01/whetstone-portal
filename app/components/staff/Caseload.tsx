"use client";

import { Student } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { addStudent } from "../../lib/queries";
import { useState } from "react";

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
  const [sort, setSort] = useState("urgency");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

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
        title="Caseload"
        sub={`${students.length} students`}
        right={
          <div className="flex gap-2 items-center">
            <div className="flex gap-1">
              {["urgency", "engagement", "name"].map((s) => (
                <button key={s} onClick={() => setSort(s)}
                  className="px-3.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold capitalize"
                  style={{
                    background: sort === s ? "rgba(82,139,255,0.08)" : "#252525",
                    border: `1px solid ${sort === s ? "#528bff" : "#333"}`,
                    color: sort === s ? "#7aabff" : "#717171",
                  }}>
                  {s}
                </button>
              ))}
            </div>
            <Button primary onClick={() => { setShowModal(true); setInviteResult(null); setInviteError(null); }}>+ Add Student</Button>
          </div>
        }
      />

      <div className="p-6 px-8 grid grid-cols-2 gap-3.5">
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