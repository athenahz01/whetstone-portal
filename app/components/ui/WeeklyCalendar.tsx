"use client";

import { useState } from "react";

interface CalendarEvent {
  id: string | number;
  title: string;
  date: string;
  color?: string;
  borderColor?: string;
  bgColor?: string;
  textColor?: string;
  label?: string;
  description?: string;
  meetingLink?: string;
  location?: string;
  onClick?: () => void;
}

interface CalendarRow {
  id: string | number;
  name: string;
  subtitle?: string;
  avatar?: string;
  avatarBg?: string;
  avatarColor?: string;
  events: CalendarEvent[];
  onClick?: () => void;
}

interface WeeklyCalendarProps {
  rows: CalendarRow[];
  personalRow?: CalendarRow | null;
  startDate?: Date;
}

export function WeeklyCalendar({ rows, personalRow, startDate }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const today = new Date();
  const baseDate = startDate || today;

  const viewStart = new Date(baseDate);
  // Start on Sunday of the current week
  viewStart.setDate(viewStart.getDate() - viewStart.getDay() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(viewStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const getEventsForDay = (events: CalendarEvent[], dayDate: Date) => {
    const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
    return events.filter((e) => e.date?.substring(0, 10) === dateStr);
  };

  const monthLabel = (() => {
    const first = days[0];
    const last = days[6];
    if (first.getMonth() === last.getMonth()) {
      return first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    return first.toLocaleDateString("en-US", { month: "short" }) + " – " + last.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  })();

  const renderRow = (row: CalendarRow) => {
    const maxEventsPerDay = Math.max(
      1,
      ...days.map((d) => getEventsForDay(row.events, d).length)
    );
    const rowHeight = Math.max(52, 16 + maxEventsPerDay * 26);

    return (
      <div key={row.id} className="flex border-b border-line" style={{ minHeight: rowHeight }}>
        <div
          className="flex items-center gap-2 px-3 border-r border-line flex-shrink-0 cursor-pointer hover:bg-mist"
          style={{ width: 140, padding: "6px 8px" }}
          onClick={row.onClick}
        >
          {row.avatar && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: row.avatarBg || "rgba(82,139,255,0.08)", color: row.avatarColor || "#7aabff" }}
            >
              {row.avatar}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-heading truncate">{row.name}</div>
            {row.subtitle && <div className="text-[10px] text-sub truncate">{row.subtitle}</div>}
          </div>
        </div>

        {days.map((d, i) => {
          const dayEvents = getEventsForDay(row.events, d);
          return (
            <div key={i} className="flex-1 border-r border-line p-0.5 flex flex-col gap-0.5" style={{ minWidth: 0 }}>
              {dayEvents.map((evt, idx) => {
                const hasLink = evt.meetingLink && evt.meetingLink.length > 0;
                return (
                  <div
                    key={evt.id + "-" + idx}
                    title={evt.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (evt.onClick) {
                        evt.onClick();
                      } else {
                        setSelectedEvent(evt);
                      }
                    }}
                    className="rounded-md px-1.5 py-0.5 cursor-pointer overflow-hidden hover:opacity-80 transition-opacity mb-0.5"
                    style={{
                      background: evt.bgColor || "rgba(82,139,255,0.08)",
                      borderLeft: "3px solid " + (evt.borderColor || evt.color || "#528bff"),
                      fontSize: 10,
                      fontWeight: 500,
                      color: evt.textColor || evt.color || "#7aabff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: "18px",
                    }}
                  >
                    {hasLink ? "🔗 " : ""}{evt.title?.replace(/\s*\[Whetstone\]\s*/g, "")}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const handleClosePopup = () => {
    setSelectedEvent(null);
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {/* Header with navigation */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line" style={{ background: "#252525" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{
                background: weekOffset === 0 ? "#528bff" : "#252525",
                color: weekOffset === 0 ? "#fff" : "#717171",
                border: "1px solid " + (weekOffset === 0 ? "#528bff" : "#333"),
              }}
            >
              Today
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="w-7 h-7 rounded-lg border border-line bg-white cursor-pointer text-sub text-sm flex items-center justify-center hover:bg-mist"
              >
                ‹
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="w-7 h-7 rounded-lg border border-line bg-white cursor-pointer text-sub text-sm flex items-center justify-center hover:bg-mist"
              >
                ›
              </button>
            </div>
            <span className="text-sm font-bold text-heading">{monthLabel}</span>
          </div>
          <span className="text-[10px] text-sub">Weekly view</span>
        </div>

        {/* Day headers */}
        <div className="flex border-b border-line">
          <div className="flex-shrink-0 border-r border-line" style={{ width: 140 }} />
          {days.map((d, i) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const dateStr = y + "-" + m + "-" + dd;
            const isToday = dateStr === todayStr;
            return (
              <div key={i} className="flex-1 text-center py-1.5 border-r border-line">
                <div
                  className="text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: isToday ? "#528bff" : "#505050" }}
                >
                  {dayNames[d.getDay()]}
                </div>
                <div
                  className="text-sm font-bold mt-0.5 mx-auto flex items-center justify-center"
                  style={{
                    color: isToday ? "#fff" : "#ebebeb",
                    background: isToday ? "#528bff" : "transparent",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                  }}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Personal row */}
        {personalRow && personalRow.events.length > 0 && (
          <div style={{ borderBottom: "2px solid #3b82f6" }}>
            {renderRow(personalRow)}
          </div>
        )}

        {/* Data rows */}
        {rows.map((row) => renderRow(row))}
      </div>

      {/* Event Detail Popup */}
      {selectedEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={handleClosePopup}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#252525",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              padding: 24,
              width: 380,
              maxWidth: "90vw",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    flexShrink: 0,
                    background: selectedEvent.borderColor || selectedEvent.color || "#528bff",
                  }}
                />
                {selectedEvent.label && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 600,
                      background: (selectedEvent.borderColor || "#528bff") + "15",
                      color: selectedEvent.borderColor || "#528bff",
                    }}
                  >
                    {selectedEvent.label}
                  </span>
                )}
              </div>
              <button
                onClick={handleClosePopup}
                style={{
                  background: "#252525",
                  border: "none",
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  color: "#717171",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Title */}
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#ebebeb", marginBottom: 4 }}>
              {selectedEvent.title?.replace(/\s*\[Whetstone\]\s*/g, "")}
            </h3>

            {/* Date */}
            <p style={{ fontSize: 14, color: "#717171", margin: 0, marginBottom: 12 }}>
              📅 {formatEventDate(selectedEvent.date)}
            </p>

            {/* Meeting Link */}
            {selectedEvent.meetingLink && selectedEvent.meetingLink.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <a
                  href={selectedEvent.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    background: "rgba(82,139,255,0.06)",
                    color: "#7aabff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  🔗 Join Meeting
                </a>
              </div>
            )}

            {/* Location */}
            {selectedEvent.location && selectedEvent.location.length > 0 && (
              <p style={{ fontSize: 14, color: "#717171", margin: 0, marginBottom: 8 }}>
                📍 {selectedEvent.location}
              </p>
            )}

            {/* Description */}
            {selectedEvent.description && selectedEvent.description.length > 0 && (
              <p style={{ fontSize: 14, color: "#a0a0a0", margin: 0, marginTop: 8, lineHeight: 1.6 }}>
                {selectedEvent.description}
              </p>
            )}

            {/* Close button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={handleClosePopup}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "#252525",
                  border: "none",
                  color: "#a0a0a0",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}