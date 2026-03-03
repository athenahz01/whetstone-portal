"use client";

interface SidebarProps {
  role: "student" | "staff" | "parent";
  view: string;
  setView: (v: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onSignOut: () => void;
  studentName?: string;
}

export function Sidebar({ role, view, setView, collapsed, setCollapsed, onSignOut, studentName }: SidebarProps) {
  const nav =
    role === "staff"
      ? [
          ["dashboard", "Dashboard"],
          ["master", "Master Timeline"],
          ["caseload", "Caseload"],
          ["analytics", "Analytics"],
        ]
      : [
          ["dashboard", "Dashboard"],
          ["roadmap", "Roadmap"],
          ["academics", "Academics"],
          ["testing", "Testing"],
          ["activities", "Activities"],
          ["schools", "Schools"],
          ...(role === "student" ? [["prep", "Session Prep"]] : []),
        ];

  const name = studentName || "User";
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const roleLabel = role === "student" ? "Student" : role === "parent" ? "Parent" : "Staff";
  const userInitials = role === "staff" ? "SM" : initials;
  const userName = role === "staff" ? "Sarah Mitchell" : role === "parent" ? `Parent of ${name.split(" ")[0]}` : name;
  const userRole = role === "staff" ? "Counselor" : role === "parent" ? "Parent" : "Student";

  return (
    <aside
      className="bg-navy flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200"
      style={{ width: collapsed ? 60 : 220 }}
    >
      {/* Logo */}
      <div
        className="border-b border-navy-edge flex items-center gap-2.5"
        style={{ padding: collapsed ? "20px 14px" : "20px 16px" }}
      >
        <div className="w-8 h-8 rounded-lg bg-navy-hi flex items-center justify-center text-base text-white font-bold flex-shrink-0">
          W
        </div>
        {!collapsed && <span className="text-lg font-bold text-white">Whetstone</span>}
      </div>

      {/* Role Label */}
      {!collapsed && (
        <div className="px-4 pt-3.5 pb-1 text-[10px] text-navy-hi uppercase tracking-widest font-bold">
          {roleLabel}
          {role === "parent" && (
            <span className="ml-1.5 text-[9px] opacity-60 normal-case tracking-normal">(view only)</span>
          )}
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 p-1" style={{ padding: "4px 8px" }}>
        {nav.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="w-full flex items-center rounded-lg cursor-pointer text-sm mb-0.5 border transition-all duration-100"
            style={{
              padding: collapsed ? "10px" : "10px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              background: view === id ? "rgba(96,165,250,0.12)" : "transparent",
              borderColor: view === id ? "rgba(96,165,250,0.18)" : "transparent",
              color: view === id ? "#ffffff" : "#94a3b8",
              fontWeight: view === id ? 600 : 400,
            }}
          >
            {collapsed ? label[0] : label}
          </button>
        ))}
      </nav>

      {/* Bottom User Area */}
      <div className="p-3 border-t border-navy-edge">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1 py-1.5 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "rgba(96,165,250,0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(96,165,250,0.18)",
              }}
            >
              {userInitials}
            </div>
            <div>
              <div className="text-sm text-white font-medium">{userName}</div>
              <div className="text-xs text-navy-txt">{userRole}</div>
            </div>
          </div>
        )}
        <div className="flex gap-1.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex-1 py-1.5 bg-navy-mid border-none rounded-md text-navy-txt cursor-pointer text-xs"
          >
            {collapsed ? "→" : "Collapse"}
          </button>
          <button
            onClick={onSignOut}
            className="py-1.5 px-2 bg-transparent border border-navy-edge rounded-md text-navy-txt cursor-pointer text-xs"
            style={{ flex: collapsed ? undefined : 1 }}
          >
            {collapsed ? "×" : "Sign Out"}
          </button>
        </div>
      </div>
    </aside>
  );
}