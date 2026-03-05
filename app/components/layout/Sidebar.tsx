"use client";

import { getGoogleAuthUrl } from "../../lib/calendar";
import { useState } from "react";

const TIMEZONES = [
  { label: "Eastern (ET)", value: "America/New_York" },
  { label: "Central (CT)", value: "America/Chicago" },
  { label: "Mountain (MT)", value: "America/Denver" },
  { label: "Pacific (PT)", value: "America/Los_Angeles" },
  { label: "Alaska (AKT)", value: "America/Anchorage" },
  { label: "Hawaii (HT)", value: "America/Honolulu" },
  { label: "China (CST)", value: "Asia/Shanghai" },
  { label: "Japan (JST)", value: "Asia/Tokyo" },
  { label: "UK (GMT/BST)", value: "Europe/London" },
  { label: "Central EU (CET)", value: "Europe/Berlin" },
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "Australia (AEST)", value: "Australia/Sydney" },
];

interface SidebarProps {
  role: "student" | "staff" | "parent";
  view: string;
  setView: (v: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onSignOut: () => void;
  studentName?: string;
  profileId?: string | null;
  gcalConnected?: boolean;
  timezone?: string;
  onTimezoneChange?: (tz: string) => void;
}

export function Sidebar({ role, view, setView, collapsed, setCollapsed, onSignOut, studentName, profileId, gcalConnected, timezone, onTimezoneChange }: SidebarProps) {
  const [showTz, setShowTz] = useState(false);

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
  const userInitials = role === "staff" ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : initials;
  const userName = role === "staff" ? name : role === "parent" ? `Parent of ${name.split(" ")[0]}` : name;
  const userRole = role === "staff" ? "Counselor" : role === "parent" ? "Parent" : "Student";

  const currentTzLabel = TIMEZONES.find((t) => t.value === timezone)?.label || timezone || "Eastern (ET)";

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
          {role === "student" ? "Student" : role === "parent" ? "Parent" : "Staff"}
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

      {/* Google Calendar */}
      {!collapsed && profileId && (
        <div className="px-3 mb-2">
          {gcalConnected ? (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: "rgba(22,163,98,0.1)" }}>
              <span className="text-xs">📅</span>
              <span className="text-xs font-medium" style={{ color: "#16a34a" }}>Calendar synced</span>
            </div>
          ) : (
            <button
              onClick={() => {
                window.location.href = getGoogleAuthUrl(profileId);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold border-none"
              style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}
            >
              📅 Connect Google Calendar
            </button>
          )}
        </div>
      )}

      {/* Timezone Selector */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <button
            onClick={() => setShowTz(!showTz)}
            className="w-full flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer text-xs border-none"
            style={{ background: "rgba(96,165,250,0.06)", color: "#94a3b8" }}
          >
            <span>🕐 {currentTzLabel}</span>
            <span style={{ fontSize: 10 }}>{showTz ? "▲" : "▼"}</span>
          </button>
          {showTz && (
            <div className="mt-1 rounded-lg overflow-hidden" style={{ background: "#1e293b", maxHeight: 200, overflowY: "auto" }}>
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  onClick={() => {
                    onTimezoneChange?.(tz.value);
                    setShowTz(false);
                  }}
                  className="w-full text-left px-3 py-2 border-none cursor-pointer text-xs"
                  style={{
                    background: timezone === tz.value ? "rgba(96,165,250,0.15)" : "transparent",
                    color: timezone === tz.value ? "#60a5fa" : "#94a3b8",
                  }}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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