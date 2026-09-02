import React from "react";

// Asset Status config — covers every possible status value.
// Colors are sourced from the --badge-* design tokens in index.css
// (single source of truth, shared with the .badge-* utility classes)
// where a token exists; a couple of statuses (Spare, Lost, Retired,
// Disposed) don't map to a spec'd badge yet, so they keep their
// existing bespoke values unchanged.
const STATUS_CONFIG = {
  Available:    { bg: "var(--badge-available-bg)", color: "var(--badge-available-fg)", border: "var(--badge-available-bd)", dot: "var(--badge-available-fg)" },
  Assigned:     { bg: "var(--badge-assigned-bg)",  color: "var(--badge-assigned-fg)",  border: "var(--badge-assigned-bd)",  dot: "var(--badge-assigned-fg)" },
  Spare:        { bg: "#fef9c3", color: "#a16207", border: "#fde047", dot: "#a16207" },
  "Under Repair": { bg: "var(--badge-maintenance-bg)", color: "var(--badge-maintenance-fg)", border: "var(--badge-maintenance-bd)", dot: "var(--badge-maintenance-fg)" },
  Faulty:       { bg: "var(--badge-faulty-bg)", color: "var(--badge-faulty-fg)", border: "var(--badge-faulty-bd)", dot: "var(--badge-faulty-fg)" },
  Lost:         { bg: "#1e293b", color: "#e2e8f0", border: "#334155", dot: "#94a3b8" },
  Retired:      { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", dot: "#94a3b8" },
  Disposed:     { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", dot: "#94a3b8" },
  // Legacy
  Maintenance:  { bg: "var(--badge-maintenance-bg)", color: "var(--badge-maintenance-fg)", border: "var(--badge-maintenance-bd)", dot: "var(--badge-maintenance-fg)" },
};

// Asset Condition config
const CONDITION_CONFIG = {
  New:       { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Excellent: { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  Good:      { bg: "#d1fae5", color: "#059669", border: "#6ee7b7" },
  Fair:      { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
  Faulty:    { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
  Damaged:   { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
};

export default function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Available;
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
      {status}
    </span>
  );
}

export function ConditionPill({ condition }) {
  if (!condition) return null;
  const cfg = CONDITION_CONFIG[condition] || CONDITION_CONFIG.Good;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap",
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700,
    }}>
      {condition}
    </span>
  );
}
