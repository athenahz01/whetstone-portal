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
  role: "student" | "strategist" | "parent";
  isAdmin?: boolean;
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
  onSyncCalendar?: () => Promise<void>;
}

export function Sidebar({
  role,
  isAdmin,
  view,
  setView,
  collapsed,
  setCollapsed,
  onSignOut,
  studentName,
  profileId,
  gcalConnected,
  timezone,
  onTimezoneChange,
  onSyncCalendar,
}: SidebarProps) {
  const [showTz, setShowTz] = useState(false);

  const nav =
    role === "strategist"
      ? [
          ["dashboard", "Dashboard"],
          ["master", "Master Timeline"],
          ["caseload", "Caseload"],
          ["analytics", "Analytics"],
          ...(isAdmin ? [["admin", "Admin"]] : []),
        ]
      : [
          ["dashboard", "Dashboard"],
          ["roadmap", "Roadmap"],
          ["academics", "Academics"],
          ["testing", "Testing"],
          ["activities", "Activities"],
          ["honors", "Honors"],
          ["receptacle", "Receptacle"],
          ["schools", "Schools"],
          ...(role === "student" ? [["prep", "Session Prep"]] : []),
        ];

  const name = studentName || "User";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const userInitials =
    role === "strategist"
      ? name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : initials;

  const userName =
    role === "strategist"
      ? name
      : role === "parent"
      ? `Parent of ${name.split(" ")[0]}`
      : name;

  const userRole =
    role === "strategist" ? "Strategist" : role === "parent" ? "Parent" : "Student";

  const currentTzLabel =
    TIMEZONES.find((t) => t.value === timezone)?.label || timezone || "Eastern (ET)";

  return (
    <aside
      className="flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? 56 : 216,
        background: "#141414",
        borderRight: "1px solid #222",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: collapsed ? "20px 12px" : "20px 16px",
        }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
          style={{
            background: "#f0f0f0",
            color: "#141414",
          }}
        >
          W
        </div>

        {!collapsed && (
          <span style={{ color: "#f0f0f0", fontWeight: 600, fontSize: 16, letterSpacing: "-0.02em" }}>
            Whetstone
          </span>
        )}
      </div>

      {/* Role Label */}
      {!collapsed && (
        <div
          className="px-4 pb-1 text-[10px] uppercase tracking-widest"
          style={{ color: "#555", fontWeight: 500 }}
        >
          {role === "student"
            ? "Student"
            : role === "parent"
            ? "Parent"
            : isAdmin
            ? "Admin"
            : "Strategist"}
          {role === "parent" && (
            <span className="ml-1.5 text-[9px] opacity-60 normal-case tracking-normal">
              (view only)
            </span>
          )}
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1" style={{ padding: "4px 8px" }}>
        {nav.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="w-full flex items-center cursor-pointer text-[13px] mb-0.5 border-none transition-all duration-100"
            style={{
              padding: collapsed ? "9px" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 6,
              background: view === id ? "rgba(255,255,255,0.05)" : "transparent",
              color: view === id ? "#e0e0e0" : "#666",
              fontWeight: view === id ? 500 : 400,
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
            <div className="flex flex-col gap-1.5">
              <div
                className="flex items-center gap-2 px-2 py-2 rounded-lg"
                style={{
                  background: "rgba(74,186,106,0.10)",
                  border: "1px solid rgba(76,184,106,0.15)",
                }}
              >
                <span className="text-xs">📅</span>
                <span className="text-xs font-medium" style={{ color: "#4cb86a" }}>
                  Calendar synced
                </span>
              </div>
              <button
                onClick={async () => {
                  if (onSyncCalendar) {
                    await onSyncCalendar();
                  }
                }}
                className="w-full px-2 py-1.5 rounded-lg cursor-pointer text-[10px] font-semibold border-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "#666",
                }}
              >
                🔄 Sync Now
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                window.location.href = getGoogleAuthUrl(profileId);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold border-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#666",
              }}
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
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "#666",
            }}
          >
            <span>🕐 {currentTzLabel}</span>
            <span style={{ fontSize: 10 }}>{showTz ? "▲" : "▼"}</span>
          </button>

          {showTz && (
            <div
              className="mt-1 rounded-lg overflow-hidden"
              style={{
                background: "#1a1a1a",
                border: "1px solid #262626",
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  onClick={() => {
                    onTimezoneChange?.(tz.value);
                    setShowTz(false);
                  }}
                  className="w-full text-left px-3 py-2 border-none cursor-pointer text-xs"
                  style={{
                    background:
                      timezone === tz.value
                        ? "rgba(255,255,255,0.07)"
                        : "transparent",
                    color: timezone === tz.value ? "#e0e0e0" : "#666",
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
      <div
        className="p-3 border-t border-navy-edge"
        style={{ borderTop: "1px solid #222" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1 py-1.5 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#999",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {userInitials}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: "#e0e0e0" }}>
                {userName}
              </div>
              <div className="text-xs" style={{ color: "#666" }}>
                {userRole}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-1.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex-1 py-1.5 border-none rounded-md cursor-pointer text-xs"
            style={{
              background: "#1e1e1e",
              color: "#666",
            }}
          >
            {collapsed ? "→" : "Collapse"}
          </button>

          <button
            onClick={onSignOut}
            className="py-1.5 px-2 bg-transparent rounded-md cursor-pointer text-xs"
            style={{
              flex: collapsed ? undefined : 1,
              border: "1px solid #303030",
              color: "#666",
            }}
          >
            {collapsed ? "×" : "Sign Out"}
          </button>
        </div>
      </div>
    </aside>
  );
}