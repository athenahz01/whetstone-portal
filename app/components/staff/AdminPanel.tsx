"use client";

import { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Student } from "../../types";
import { addStudent } from "../../lib/queries";
import { supabase } from "../../lib/supabase";

interface AdminPanelProps {
  students: Student[];
  onRefresh: () => void;
}

interface InviteResult {
  email: string;
  tempPassword: string;
  loginUrl: string;
  role: string;
  name: string;
}

interface ProfileRow {
  id: string;
  email: string;
  role: string;
  display_name: string;
  student_id: number | null;
}

export function AdminPanel({ students, onRefresh }: AdminPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [selectedRole, setSelectedRole] = useState<"student" | "parent" | "strategist">("student");
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Load all profiles
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, display_name, student_id")
      .order("display_name");
    if (!error && data) {
      setAllProfiles(data as ProfileRow[]);
    }
    setLoadingProfiles(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "#252525",
    border: "1px solid #333", borderRadius: 8, color: "#ebebeb",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setInviteError(null);

    const f = new FormData(e.target as HTMLFormElement);
    const name = f.get("name") as string;
    const email = f.get("email") as string;

    let studentId: number | null = null;
    const childEmail = f.get("childEmail") as string || "";

    // For students, create a student record first
    if (selectedRole === "student") {
      const grade = Number(f.get("grade") || 12);
      const school = f.get("school") as string || "";
      const gradYear = Number(f.get("gradYear") || new Date().getFullYear() + 1);

      studentId = await addStudent({ name, email, grade, gpa: null, school, gradYear });

      if (!studentId) {
        setSaving(false);
        setInviteError("Failed to create student record. Please try again.");
        return;
      }
    }

    // Create auth user + profile
    try {
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          role: selectedRole,
          studentId,
          childEmail: selectedRole === "parent" ? childEmail : null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to create account.");
        setSaving(false);
        setShowModal(false);
        if (selectedRole === "student") onRefresh();
        return;
      }

      if (data.tempPassword) {
        setSaving(false);
        setShowModal(false);
        setInviteResult({
          email,
          tempPassword: data.tempPassword,
          loginUrl: data.loginUrl,
          role: selectedRole,
          name,
        });
        return;
      }
    } catch (err) {
      console.error("Failed to create account:", err);
      setInviteError("Network error. Please try again.");
    }

    setSaving(false);
    setShowModal(false);
    onRefresh();
    loadProfiles();
  };

  const handleDismissCredentials = () => {
    setInviteResult(null);
    onRefresh();
    loadProfiles();
  };

  const handleCopy = (type: "email" | "password", value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const roleColors: Record<string, string> = {
    strategist: "#a480f2",
    student: "#528bff",
    parent: "#e5a83b",
  };

  const strategists = allProfiles.filter((p) => p.role === "strategist");
  const studentProfiles = allProfiles.filter((p) => p.role === "student");
  const parentProfiles = allProfiles.filter((p) => p.role === "parent");

  return (
    <div>
      <PageHeader
        title="Admin"
        sub="Manage all user accounts"
        right={
          <Button primary onClick={() => { setShowModal(true); setInviteResult(null); setInviteError(null); setSelectedRole("student"); }}>
            + Create Account
          </Button>
        }
      />

      <div className="p-6 px-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          {[
            { label: "Strategists", count: strategists.length, color: "#a480f2" },
            { label: "Students", count: studentProfiles.length, color: "#528bff" },
            { label: "Parents", count: parentProfiles.length, color: "#e5a83b" },
          ].map((s) => (
            <Card key={s.label}>
              <div className="text-center py-2">
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-xs text-sub mt-1">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* All Users Table */}
        <Card>
          <h3 className="m-0 mb-4 text-lg font-bold text-heading">All Accounts</h3>
          {loadingProfiles ? (
            <p className="text-sm text-sub text-center py-4">Loading...</p>
          ) : allProfiles.length === 0 ? (
            <p className="text-sm text-sub text-center py-4">No accounts yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {allProfiles.map((p) => {
                const linkedStudent = p.student_id
                  ? students.find((s) => s.id === p.student_id)
                  : null;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#252525", border: "1px solid #2a2a2a" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: roleColors[p.role] || "#505050" }}
                      >
                        {(p.display_name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-heading">{p.display_name}</div>
                        <div className="text-xs text-sub">{p.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {linkedStudent && (
                        <span className="text-xs text-sub">
                          → {linkedStudent.name}
                        </span>
                      )}
                      <Tag color={roleColors[p.role] || "#505050"}>
                        {p.role}
                      </Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Create Account Modal */}
      {showModal && (
        <Modal title="Create Account" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            {/* Role Selector */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-sub mb-2">Account Type</label>
              <div className="flex gap-2">
                {(["student", "parent", "strategist"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className="flex-1 py-2.5 rounded-lg cursor-pointer text-sm font-semibold capitalize"
                    style={{
                      background: selectedRole === r ? `${roleColors[r]}15` : "#252525",
                      border: `2px solid ${selectedRole === r ? roleColors[r] : "#333"}`,
                      color: selectedRole === r ? roleColors[r] : "#717171",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <FormField label="Full Name">
              <input required name="name" placeholder="e.g. Jane Smith" style={inputStyle} />
            </FormField>
            <FormField label="Email">
              <input required name="email" type="email" placeholder="e.g. jane@email.com" style={inputStyle} />
            </FormField>

            {/* Student-specific fields */}
            {selectedRole === "student" && (
              <>
                <FormField label="School">
                  <input name="school" placeholder="e.g. Stuyvesant High School" style={inputStyle} />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Grade">
                    <input name="grade" type="number" min="9" max="12" placeholder="12" style={inputStyle} />
                  </FormField>
                  <FormField label="Graduation Year">
                    <input name="gradYear" type="number" placeholder="2026" style={inputStyle} />
                  </FormField>
                </div>
              </>
            )}

            {/* Parent-specific fields */}
            {selectedRole === "parent" && (
              <div
                className="p-4 rounded-xl mb-3"
                style={{ background: "rgba(229,168,59,0.08)", border: "1px solid rgba(229,168,59,0.2)" }}
              >
                <FormField label="Child's Email (must match a student's email)">
                  <input
                    name="childEmail"
                    type="email"
                    placeholder="child@email.com"
                    style={inputStyle}
                  />
                </FormField>
                <p className="text-xs m-0 mt-1" style={{ color: "#e5a83b" }}>
                  This links the parent to the correct student profile. The student must be added first.
                </p>
              </div>
            )}

            <div className="rounded-lg px-3 py-2.5 text-xs mb-4" style={{ background: "rgba(74,186,106,0.08)", border: "1px solid #4aba6a", color: "#4aba6a" }}>
              A temporary password will be generated. Share it with the user — they can change it after logging in.
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 14,
                  background: saving ? "#333" : roleColors[selectedRole],
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Creating..." : `Create ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Error Modal */}
      {inviteError && !inviteResult && (
        <Modal title="Account Creation Issue" onClose={() => setInviteError(null)}>
          <div style={{ padding: "4px 0" }}>
            <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ background: "rgba(229,91,91,0.08)", border: "1px solid rgba(229,91,91,0.2)", color: "#e55b5b" }}>
              {inviteError}
            </div>
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
        <Modal title="Account Created! 🎉" onClose={handleDismissCredentials}>
          <div style={{ padding: "4px 0" }}>
            <div className="flex items-center gap-2 mb-4">
              <Tag color={roleColors[inviteResult.role] || "#505050"}>
                {inviteResult.role}
              </Tag>
              <span className="text-sm font-medium text-heading">{inviteResult.name}</span>
            </div>

            <p className="text-sm text-body mb-4">
              Share these login credentials with the user. They can log in at{" "}
              <strong>{inviteResult.loginUrl}</strong> and change their password after signing in.
            </p>

            <div className="flex flex-col gap-3 mb-4">
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