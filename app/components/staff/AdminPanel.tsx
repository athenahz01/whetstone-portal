"use client";
import { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Student } from "../../types";
import { addStudent } from "../../lib/queries";
import { isMentor } from "../../lib/constants";

interface AdminPanelProps { students: Student[]; onRefresh: () => void; }
interface AdminUser { id: string; email: string; name: string; role: string; studentId: number|null; status: string; lastSignIn: string|null; createdAt: string; password: string|null; }
const RC: Record<string,string> = { strategist:"#a480f2", mentor:"#a480f2", specialist:"#4aba6a", student:"#5A83F3", parent:"#e5a83b", unknown:"#505050" };

export function AdminPanel({ students, onRefresh }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPw, setShowResetPw] = useState<AdminUser|null>(null);
  const [showEditUser, setShowEditUser] = useState<AdminUser|null>(null);
  const [showPw, setShowPw] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<"student"|"parent"|"strategist">("student");
  const [saving, setSaving] = useState(false);
  const [createResult, setCreateResult] = useState<{email:string;password:string;name:string}|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [pwMode, setPwMode] = useState<"auto"|"manual">("auto");
  const [manualPw, setManualPw] = useState("");
  const [resetResult, setResetResult] = useState<string|null>(null);
  const [resetting, setResetting] = useState(false);
  const [showCaseload, setShowCaseload] = useState<AdminUser|null>(null);
  const [caseloadAssignments, setCaseloadAssignments] = useState<Record<string, number[]>>({});
  const [caseloadLoading, setCaseloadLoading] = useState(false);

  const IS: React.CSSProperties = { width:"100%", padding:"10px 14px", background:"#1e1e1e", border:"1.5px solid #333", borderRadius:10, color:"#ebebeb", fontSize:14, outline:"none", boxSizing:"border-box" };

  const loadUsers = async () => { setLoading(true); try { const r = await fetch("/api/admin/users"); const d = await r.json(); setUsers(d.users||[]); } catch { setUsers([]); } setLoading(false); };
  useEffect(() => { loadUsers(); loadAllCaseloads(); }, []);

  const loadAllCaseloads = async () => {
    try {
      const res = await fetch("/api/caseload");
      const data = await res.json();
      const map: Record<string, number[]> = {};
      for (const a of (data.assignments || [])) {
        if (!map[a.strategist_email]) map[a.strategist_email] = [];
        map[a.strategist_email].push(a.student_id);
      }
      setCaseloadAssignments(map);
    } catch {}
  };

  let filtered = users;
  if (filterRole === "mentor") filtered = filtered.filter(u => u.role === "strategist" && isMentor(u.email));
  else if (filterRole === "specialist") filtered = filtered.filter(u => u.role === "strategist" && !isMentor(u.email));
  else if (filterRole !== "all") filtered = filtered.filter(u => u.role === filterRole);
  if (search.trim()) { const q = search.toLowerCase(); filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)); }

  const mentorCount = users.filter(u => u.role === "strategist" && isMentor(u.email)).length;
  const specialistCount = users.filter(u => u.role === "strategist" && !isMentor(u.email)).length;
  const stats = { total:users.length, mentors:mentorCount, specialists:specialistCount, students:users.filter(u=>u.role==="student").length, parents:users.filter(u=>u.role==="parent").length, active:users.filter(u=>u.status==="active").length };

  const timeAgo = (d: string|null) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff/60000); if (m<60) return `${m}m ago`;
    const h = Math.floor(m/60); if (h<24) return `${h}h ago`;
    const dy = Math.floor(h/24); if (dy<7) return `${dy}d ago`;
    if (dy<30) return `${Math.floor(dy/7)}w ago`;
    return `${Math.floor(dy/30)}mo ago`;
  };
  const copy = (t: string) => navigator.clipboard.writeText(t);
  const togglePw = (id: string) => setShowPw(p => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    const f = new FormData(e.target as HTMLFormElement);
    const name = f.get("name") as string, email = f.get("email") as string;
    let studentId: number|null = null;
    if (selectedRole === "student") {
      studentId = await addStudent({ name, email, grade:12, gpa:null, school: f.get("school") as string||"", gradYear: Number(f.get("gradYear")||new Date().getFullYear()+1) });
      if (!studentId) { setError("Failed to create student record."); setSaving(false); return; }
    }
    try {
      const res = await fetch("/api/invite-user", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, name, role:selectedRole, studentId, childEmail:selectedRole==="parent"?(f.get("childEmail") as string):null }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error||"Failed."); setSaving(false); return; }
      if (data.tempPassword) {
        await fetch("/api/admin/users", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"reset_password", userId:data.userId, password:data.tempPassword }) });
        setCreateResult({ email, password:data.tempPassword, name });
      }
    } catch { setError("Network error."); }
    setSaving(false); loadUsers(); onRefresh();
  };

  const handleResetPw = async () => {
    if (!showResetPw) return; setResetting(true);
    const res = await fetch("/api/admin/users", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"reset_password", userId:showResetPw.id, autoGenerate:pwMode==="auto", password:pwMode==="manual"?manualPw:undefined }) });
    const data = await res.json();
    if (data.success) { setResetResult(data.password); loadUsers(); } else setError(data.error||"Failed");
    setResetting(false);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showEditUser) return; setSaving(true);
    const f = new FormData(e.target as HTMLFormElement);
    await fetch("/api/admin/users", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"update_user", userId:showEditUser.id, name:f.get("name") as string, email:f.get("email") as string, role:f.get("role") as string }) });
    setSaving(false); setShowEditUser(null); loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this user?")) return;
    await fetch("/api/admin/users", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"delete_user", userId:id }) });
    loadUsers(); onRefresh();
  };

  const handleToggle = async (u: AdminUser) => {
    await fetch("/api/admin/users", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"toggle_status", userId:u.id, suspend:u.status==="active" }) });
    loadUsers();
  };

  return (
    <div>
      <PageHeader title="User Management" sub={`${stats.total} users · ${stats.active} active`}
        right={<Button primary onClick={() => { setShowCreate(true); setCreateResult(null); setError(null); setSelectedRole("student"); }}>+ Add New User</Button>} />
      <div className="p-6 px-8">
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[{l:"Total",c:stats.total,cl:"#ebebeb"},{l:"Mentors",c:stats.mentors,cl:"#a480f2"},{l:"Specialists",c:stats.specialists,cl:"#4aba6a"},{l:"Students",c:stats.students,cl:"#5A83F3"},{l:"Parents",c:stats.parents,cl:"#e5a83b"}].map(s=>(
            <Card key={s.l} style={{padding:14}}><div className="text-center"><div className="text-2xl font-bold" style={{color:s.cl}}>{s.c}</div><div className="text-xs text-sub mt-0.5">{s.l}</div></div></Card>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            {["all","mentor","specialist","student","parent"].map(r=>(
              <button key={r} onClick={()=>setFilterRole(r)} className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
                style={{background:filterRole===r?"rgba(82,139,255,0.12)":"#252525",color:filterRole===r?"#7aabff":"#717171",border:filterRole===r?"1.5px solid #5A83F3":"1.5px solid #333"}}>
                {r==="all"?"All Users":r==="mentor"?"Mentors":r==="specialist"?"Specialists":r.charAt(0).toUpperCase()+r.slice(1)+"s"}
              </button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..." className="flex-1" style={{...IS,padding:"8px 12px",fontSize:13,maxWidth:300}} />
        </div>

        <Card noPadding>
          <div className="grid items-center px-4 py-2.5" style={{gridTemplateColumns:"2fr 2fr 80px 90px 110px 140px",background:"#252525",borderBottom:"1px solid #333",borderRadius:"12px 12px 0 0"}}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sub">Name</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sub">Email</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sub">Role</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sub">Status</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sub">Last Sign In</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sub">Password</span>
          </div>
          {loading ? <div className="text-sm text-sub text-center py-8">Loading users...</div>
          : filtered.length===0 ? <div className="text-sm text-sub text-center py-8">No users found</div>
          : filtered.map(u=>(
            <div key={u.id} className="grid items-center px-4 py-3 border-b border-line hover:bg-raised group cursor-pointer"
              style={{gridTemplateColumns:"2fr 2fr 80px 90px 110px 140px"}}>
              {(() => {
                const displayRole = u.role === "strategist" ? (isMentor(u.email) ? "mentor" : "specialist") : u.role;
                const roleColor = RC[displayRole] || RC[u.role] || "#505050";
                return (<>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{background:`${roleColor}20`,color:roleColor}}>
                  {u.name.split(" ").map(w=>w[0]).join("").toUpperCase().substring(0,2)}
                </div>
                <button onClick={()=>setShowEditUser(u)} className="text-sm font-medium bg-transparent border-none cursor-pointer p-0 truncate" style={{color:"#7aabff"}}>{u.name}</button>
              </div>
              <div className="text-xs text-body truncate">{u.email}</div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:`${roleColor}15`,color:roleColor}}>{displayRole}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer" onClick={()=>handleToggle(u)}
                style={{background:u.status==="active"?"rgba(74,186,106,0.08)":u.status==="suspended"?"rgba(229,91,91,0.08)":"rgba(229,168,59,0.08)",color:u.status==="active"?"#4aba6a":u.status==="suspended"?"#e55b5b":"#e5a83b"}}>
                {u.status}
              </span>
              <div className="text-xs text-sub">{timeAgo(u.lastSignIn)}</div>
              <div className="flex items-center gap-1.5">
                {u.password ? <>
                  <span className="text-[11px] font-mono" style={{color:"#a0a0a0"}}>{showPw.has(u.id)?u.password:"••••••••"}</span>
                  <button onClick={()=>togglePw(u.id)} className="text-[9px] bg-transparent border-none cursor-pointer" style={{color:"#5A83F3"}}>{showPw.has(u.id)?"hide":"show"}</button>
                  <button onClick={()=>copy(u.password!)} className="text-[9px] bg-transparent border-none cursor-pointer" style={{color:"#a480f2"}}>copy</button>
                </> : <button onClick={()=>{setShowResetPw(u);setResetResult(null);setPwMode("auto");setManualPw("")}} className="text-[9px] bg-transparent border-none cursor-pointer" style={{color:"#e5a83b"}}>set password</button>}
              </div>
              </>);
              })()}
            </div>
          ))}
          {/* Hover row actions */}
        </Card>

        {/* ── Caseload Management ── */}
        <h3 className="text-base font-bold text-heading mt-6 mb-3">Caseload Assignments</h3>
        <p className="text-xs text-sub mb-4 mt-0">Assign which students each mentor can see. Mentors with no assignments see all students.</p>
        <div className="grid grid-cols-2 gap-3">
          {users.filter(u => u.role === "strategist").map(strat => {
            const assigned = caseloadAssignments[strat.email] || [];
            return (
              <Card key={strat.id} style={{ padding: 16 }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "#a480f220", color: "#a480f2" }}>
                      {strat.name.split(" ").map(w => w[0]).join("").substring(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-heading">{strat.name}</div>
                      <div className="text-[10px] text-faint">{assigned.length > 0 ? `${assigned.length} student${assigned.length !== 1 ? "s" : ""}` : "All students (no filter)"}</div>
                    </div>
                  </div>
                  <button onClick={() => {
                    setShowCaseload(strat);
                    // Load assignments for this strategist
                    setCaseloadLoading(true);
                    fetch(`/api/caseload?strategistEmail=${encodeURIComponent(strat.email)}`)
                      .then(r => r.json())
                      .then(d => {
                        const ids = (d.assignments || []).map((a: any) => a.student_id);
                        setCaseloadAssignments(prev => ({ ...prev, [strat.email]: ids }));
                        setCaseloadLoading(false);
                      })
                      .catch(() => setCaseloadLoading(false));
                  }}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                    style={{ background: "rgba(164,128,242,0.08)", color: "#a480f2", border: "1px solid rgba(164,128,242,0.2)" }}>
                    Edit Caseload
                  </button>
                </div>
                {assigned.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assigned.map(sid => {
                      const s = students.find(st => st.id === sid);
                      return s ? <span key={sid} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#252525", color: "#a0a0a0" }}>{s.name}</span> : null;
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {showCreate && <Modal title="Add New User" onClose={()=>setShowCreate(false)}>
        {createResult ? <div>
          <div className="text-center py-3"><div className="text-3xl mb-2">✅</div><h3 className="text-lg font-bold text-heading mb-1">Account Created!</h3><p className="text-sm text-sub mb-3">Share these credentials with {createResult.name}:</p></div>
          <div className="p-4 rounded-lg mb-2" style={{background:"#1e1e1e",border:"1px solid #333"}}><div className="flex justify-between items-center mb-1"><span className="text-xs text-sub">Email</span><button onClick={()=>copy(createResult.email)} className="text-[10px] bg-transparent border-none cursor-pointer" style={{color:"#5A83F3"}}>Copy</button></div><div className="text-sm font-mono text-heading">{createResult.email}</div></div>
          <div className="p-4 rounded-lg mb-3" style={{background:"#1e1e1e",border:"1px solid #333"}}><div className="flex justify-between items-center mb-1"><span className="text-xs text-sub">Password</span><button onClick={()=>copy(createResult.password)} className="text-[10px] bg-transparent border-none cursor-pointer" style={{color:"#5A83F3"}}>Copy</button></div><div className="text-sm font-mono text-heading">{createResult.password}</div></div>
          <p className="text-xs text-faint text-center mb-3">Password saved in admin panel for reference.</p>
          <div className="flex justify-end"><Button primary onClick={()=>{setShowCreate(false);setCreateResult(null)}}>Done</Button></div>
        </div> : <form onSubmit={handleCreate}>
          {error && <div className="mb-3 p-3 rounded-lg text-sm" style={{background:"rgba(229,91,91,0.08)",color:"#e55b5b"}}>{error}</div>}
          <FormField label="Role"><div className="flex gap-2">{(["student","parent","strategist"] as const).map(r=>(
            <button key={r} type="button" onClick={()=>setSelectedRole(r)} className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{background:selectedRole===r?`${RC[r]}15`:"#1e1e1e",color:selectedRole===r?RC[r]:"#717171",border:selectedRole===r?`1.5px solid ${RC[r]}`:"1.5px solid #333"}}>
              {r === "strategist" ? "Mentor" : r.charAt(0).toUpperCase()+r.slice(1)}
            </button>
          ))}</div></FormField>
          <div className="grid grid-cols-2 gap-3"><FormField label="Full Name"><input required name="name" placeholder="John Smith" style={IS}/></FormField><FormField label="Email"><input required name="email" type="email" placeholder="john@example.com" style={IS}/></FormField></div>
          {selectedRole==="student" && <div className="grid grid-cols-2 gap-3"><FormField label="School"><input name="school" placeholder="School name" style={IS}/></FormField><FormField label="Graduation Year"><input name="gradYear" type="number" defaultValue={new Date().getFullYear()+1} style={IS}/></FormField></div>}
          {selectedRole==="parent" && <FormField label="Child's Email"><input name="childEmail" type="email" placeholder="child@example.com" style={IS}/></FormField>}
          <div className="flex justify-end gap-2 mt-3"><Button onClick={()=>setShowCreate(false)}>Cancel</Button><Button primary type="submit">{saving?"Creating...":"Create Account"}</Button></div>
        </form>}
      </Modal>}

      {showResetPw && <Modal title={`Reset Password — ${showResetPw.name}`} onClose={()=>setShowResetPw(null)}>
        {resetResult ? <div>
          <div className="p-4 rounded-lg mb-3" style={{background:"#1e1e1e",border:"1px solid #333"}}><div className="flex justify-between items-center mb-1"><span className="text-xs text-sub">New Password</span><button onClick={()=>copy(resetResult)} className="text-[10px] bg-transparent border-none cursor-pointer" style={{color:"#5A83F3"}}>Copy</button></div><div className="text-sm font-mono text-heading">{resetResult}</div></div>
          <p className="text-xs text-faint mb-3">Password saved and visible in the user table.</p>
          <div className="flex justify-end"><Button primary onClick={()=>setShowResetPw(null)}>Done</Button></div>
        </div> : <>
          <div className="flex flex-col gap-2 mb-4">
            <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{background:pwMode==="auto"?"rgba(82,139,255,0.06)":"#1e1e1e",border:pwMode==="auto"?"1.5px solid #5A83F3":"1.5px solid #333"}}>
              <input type="radio" checked={pwMode==="auto"} onChange={()=>setPwMode("auto")} style={{accentColor:"#5A83F3"}}/>
              <div><div className="text-sm font-semibold text-heading">Automatically generate a password</div><div className="text-xs text-sub">You&apos;ll be able to view and copy the password in the next step</div></div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{background:pwMode==="manual"?"rgba(82,139,255,0.06)":"#1e1e1e",border:pwMode==="manual"?"1.5px solid #5A83F3":"1.5px solid #333"}}>
              <input type="radio" checked={pwMode==="manual"} onChange={()=>setPwMode("manual")} style={{accentColor:"#5A83F3"}}/>
              <div className="flex-1"><div className="text-sm font-semibold text-heading">Create password</div>
                {pwMode==="manual" && <input value={manualPw} onChange={e=>setManualPw(e.target.value)} placeholder="Min 8 characters" className="mt-2" style={IS}/>}
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-2"><Button onClick={()=>setShowResetPw(null)}>Cancel</Button><Button primary onClick={handleResetPw} disabled={resetting||(pwMode==="manual"&&manualPw.length<8)}>{resetting?"Resetting...":"Reset"}</Button></div>
        </>}
      </Modal>}

      {showEditUser && <Modal title={`Edit User — ${showEditUser.name}`} onClose={()=>setShowEditUser(null)}>
        <form onSubmit={handleEditUser}>
          <div className="grid grid-cols-2 gap-3"><FormField label="Name"><input required name="name" defaultValue={showEditUser.name} style={IS}/></FormField><FormField label="Email"><input required name="email" type="email" defaultValue={showEditUser.email} style={IS}/></FormField></div>
          <FormField label="Role"><select name="role" defaultValue={showEditUser.role} style={IS}><option value="student">Student</option><option value="parent">Parent</option><option value="strategist">Mentor</option></select></FormField>
          <div className="flex justify-between mt-3">
            <button type="button" onClick={()=>handleDelete(showEditUser.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={{background:"rgba(229,91,91,0.08)",color:"#e55b5b",border:"1px solid rgba(229,91,91,0.2)"}}>Delete User</button>
            <div className="flex gap-2"><Button onClick={()=>setShowEditUser(null)}>Cancel</Button><Button primary type="submit">{saving?"Updating...":"Update User"}</Button></div>
          </div>
        </form>
      </Modal>}

      {/* ── Caseload Assignment Modal ── */}
      {showCaseload && (
        <Modal title={`Caseload — ${showCaseload.name}`} onClose={() => setShowCaseload(null)}>
          <p className="text-xs text-sub mb-3 mt-0">Select which students {showCaseload.name} can see. Uncheck all to show all students.</p>
          {caseloadLoading ? <div className="text-sm text-sub text-center py-4">Loading...</div> : (
            <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
              {students.map(s => {
                const assigned = (caseloadAssignments[showCaseload.email] || []);
                const isAssigned = assigned.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer"
                    style={{ background: isAssigned ? "rgba(164,128,242,0.06)" : "transparent" }}>
                    <input type="checkbox" checked={isAssigned} onChange={async () => {
                      // Optimistic update
                      const newAssigned = isAssigned ? assigned.filter(id => id !== s.id) : [...assigned, s.id];
                      setCaseloadAssignments(prev => ({ ...prev, [showCaseload!.email]: newAssigned }));
                      await fetch("/api/caseload", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "toggle", strategistEmail: showCaseload!.email, studentId: s.id }),
                      });
                    }} style={{ accentColor: "#a480f2", width: 16, height: 16 }} />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ background: "rgba(90,131,243,0.1)", color: "#5A83F3" }}>
                        {s.av || s.name.split(" ").map(w => w[0]).join("").substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm text-heading">{s.name}</div>
                        <div className="text-[10px] text-faint">Gr. {s.grade} · {s.school}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex justify-between mt-4 pt-3 border-t border-line">
            <button onClick={async () => {
              setCaseloadAssignments(prev => ({ ...prev, [showCaseload!.email]: [] }));
              await fetch("/api/caseload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "set", strategistEmail: showCaseload!.email, studentIds: [] }),
              });
            }}
              className="text-xs font-semibold bg-transparent border-none cursor-pointer" style={{ color: "#e55b5b" }}>
              Clear All (show all students)
            </button>
            <Button primary onClick={() => setShowCaseload(null)}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}