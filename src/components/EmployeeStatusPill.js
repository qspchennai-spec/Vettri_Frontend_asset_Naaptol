import React from "react";

// Employment status config — mirrors the visual language of StatusPill.js
// (dot + pill) so separation statuses feel native to the rest of the app.
const EMPLOYMENT_STATUS_CONFIG = {
  Active:           { bg: "var(--badge-available-bg)", color: "var(--badge-available-fg)", border: "var(--badge-available-bd)", dot: "var(--badge-available-fg)" },
  "On Leave":       { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc", dot: "#0369a1" },
  "Notice Period":  { bg: "#fef9c3", color: "#a16207", border: "#fde047", dot: "#a16207" },
  "Exit Clearance": { bg: "#ffedd5", color: "#c2410c", border: "#fdba74", dot: "#c2410c" },
  "Assets Returned":{ bg: "#e0e7ff", color: "#4338ca", border: "#c7d2fe", dot: "#4338ca" },
  Resigned:         { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", dot: "#94a3b8" },
  Terminated:       { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5", dot: "#b91c1c" },
};

export default function EmployeeStatusPill({ status }) {
  const cfg = EMPLOYMENT_STATUS_CONFIG[status] || EMPLOYMENT_STATUS_CONFIG.Active;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 11.5, fontWeight: 700, letterSpacing: "0.01em",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: cfg.dot, flexShrink: 0,
      }} />
      {status || "Active"}
    </span>
  );
}

export function ClearanceStatusPill({ status }) {
  const isDone = status === "Completed";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap",
      background: isDone ? "#dcfce7" : "#fef9c3",
      color: isDone ? "#15803d" : "#a16207",
      border: `1px solid ${isDone ? "#86efac" : "#fde047"}`,
      fontSize: 11, fontWeight: 700,
    }}>
      {status || "Pending"}
    </span>
  );
}
