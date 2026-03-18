"use client";

import { getGoogleAuthUrl } from "../../lib/calendar";
import { isMentor } from "../../lib/constants";
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
  userEmail?: string;
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
  userEmail,
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
          ["master", "Timeline"],
          ["caseload", "Students"],
          ["booking-requests", "Sessions"],
          ["analytics", "Analytics"],
          ...(isAdmin ? [["admin", "Admin"]] : []),
        ]
      : [
          ["dashboard", "Dashboard"],
          ["receptacle", "Receptacle"],
          ...((role === "student" || role === "parent") ? [["prep", "Sessions"]] : []),
          ["tasks", "Tasks"],
          ["profile", "Profile"],
          ["academics", "Academics"],
          ["testing", "Testing"],
          ["activities", "Activities"],
          ["honors", "Honors"],
          ["schools", "Schools"],
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
    role === "strategist"
      ? (isMentor(userEmail || "") ? "Mentor" : "Specialist")
      : role === "parent" ? "Parent" : "Student";

  const currentTzLabel =
    TIMEZONES.find((t) => t.value === timezone)?.label || timezone || "Eastern (ET)";

  return (
    <aside
      className="bg-navy flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? 60 : 220,
        borderRight: "1px solid rgba(148,163,184,0.12)",
        background: "linear-gradient(180deg, #0b1120 0%, #0f172a 100%)",
      }}
    >
      {/* Logo */}
      <div
        className="border-b border-navy-edge flex items-center gap-3"
        style={{
          padding: collapsed ? "20px 14px" : "20px 16px",
          borderBottom: "1px solid rgba(148,163,184,0.12)",
        }}
      >
        {collapsed ? (
          <img src="/whetstone-logo.svg" alt="W" style={{ width: 36, height: 36, objectFit: "contain" }} />
        ) : (
          <img src="/whetstone-logo.svg" alt="Whetstone" style={{ height: 32, objectFit: "contain" }} />
        )}
      </div>

      {/* Role Label */}
      {!collapsed && (
        <div
          className="px-4 pt-3.5 pb-1 text-[10px] uppercase tracking-widest font-bold"
          style={{ color: "#94a3b8" }}
        >
          {role === "student"
            ? "Student"
            : role === "parent"
            ? "Parent"
            : isAdmin
            ? "Admin"
            : isMentor(userEmail || "")
            ? "Mentor"
            : "Specialist"}
          {role === "parent" && (
            <span className="ml-1.5 text-[9px] opacity-60 normal-case tracking-normal">
              (view only)
            </span>
          )}
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1" style={{ padding: "6px 8px" }}>
        {nav.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="w-full flex items-center rounded-xl cursor-pointer text-sm mb-1 border transition-all duration-100"
            style={{
              padding: collapsed ? "10px" : "10px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              background:
                view === id ? "rgba(255,255,255,0.07)" : "transparent",
              borderColor:
                view === id ? "rgba(148,163,184,0.16)" : "transparent",
              color: view === id ? "#f8fafc" : "#94a3b8",
              fontWeight: view === id ? 600 : 500,
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
                  border: "1px solid rgba(74,186,106,0.18)",
                }}
              >
                <span className="text-xs">📅</span>
                <span className="text-xs font-medium" style={{ color: "#4ade80" }}>
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
                  color: "#cbd5e1",
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
                color: "#cbd5e1",
              }}
            >
              📅 Connect Google Calendar
            </button>
          )}

          {/* Apple Calendar Subscribe */}
          <button
            onClick={() => {
              const feedUrl = `${window.location.origin}/api/ical-feed?token=${profileId}`;
              const webcalUrl = feedUrl.replace("https://", "webcal://").replace("http://", "webcal://");
              window.open(webcalUrl, "_self");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold border-none mt-1.5"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "#cbd5e1",
            }}
          >
            🍎 Subscribe via Apple Calendar
          </button>
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
              color: "#cbd5e1",
            }}
          >
            <span>🕐 {currentTzLabel}</span>
            <span style={{ fontSize: 10 }}>{showTz ? "▲" : "▼"}</span>
          </button>

          {showTz && (
            <div
              className="mt-1 rounded-lg overflow-hidden"
              style={{
                background: "#111827",
                border: "1px solid rgba(148,163,184,0.12)",
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
                    color: timezone === tz.value ? "#f8fafc" : "#94a3b8",
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
        style={{ borderTop: "1px solid rgba(148,163,184,0.12)" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1 py-1.5 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {userInitials}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: "#f8fafc" }}>
                {userName}
              </div>
              <div className="text-xs" style={{ color: "#94a3b8" }}>
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
              background: "#1e293b",
              color: "#cbd5e1",
            }}
          >
            {collapsed ? "→" : "Collapse"}
          </button>

          <button
            onClick={onSignOut}
            className="py-1.5 px-2 bg-transparent rounded-md cursor-pointer text-xs"
            style={{
              flex: collapsed ? undefined : 1,
              border: "1px solid rgba(148,163,184,0.18)",
              color: "#94a3b8",
            }}
          >
            {collapsed ? "×" : "Sign Out"}
          </button>
        </div>
      </div>
    </aside>
  );
}