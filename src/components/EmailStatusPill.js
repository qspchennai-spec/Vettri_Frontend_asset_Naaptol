import React from "react";

// Email Status config — Not Sent (grey), Sent (green), Failed (red)
const EMAIL_STATUS_CONFIG = {
  "Not Sent": { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", dot: "#94a3b8" },
  Sent:       { bg: "#dcfce7", color: "#16a34a", border: "#86efac", dot: "#16a34a" },
  Failed:     { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5", dot: "#b91c1c" },
};

export default function EmailStatusPill({ status }) {
  const cfg = EMAIL_STATUS_CONFIG[status] || EMAIL_STATUS_CONFIG["Not Sent"];
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
      {status || "Not Sent"}
    </span>
  );
}
