import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import StatusPill, { ConditionPill } from "../components/StatusPill";
import EmailStatusPill from "../components/EmailStatusPill";
import SendEmailModal from "../components/SendEmailModal";
import AssetExtras from "../components/AssetExtras";
import ReturnAssetDialog from "../components/ReturnAssetDialog";
import CountUp from "../components/CountUp";
import { useToast } from "../utils/Toast";
import "./Assets.css";

import { API_BASE as API } from "../config";

const ASSET_STATUSES = ["Available","Assigned","Spare","Under Repair","Faulty","Lost","Retired","Disposed"];
const ASSET_CONDITIONS = ["New","Excellent","Good","Fair","Faulty","Damaged"];
const ASSET_TYPES = ["Laptop","Desktop","Monitor","Keyboard","Mouse","Headset","Mobile","Tablet","Printer","Server","Network Device","Other"];
const LOCATIONS = ["Mumbai"];
const COLUMNS_STORAGE_KEY = "haoda_assets_visible_columns_v1";
const DENSITY_STORAGE_KEY = "haoda_assets_density_v1";

const EMPTY_FORM = {
  assetType:"", laptopName:"", brand:"", model:"", serialNumber:"",
  location:"", assetStatus:"Available", assetCondition:"New",
  purchaseDate:"", warrantyExpiry:"", vendor:"", assetCost:"",
  processor:"", ram:"", storage:"", remarks:"",
};

// ── Condition colour mapping ──────────────────────────────────
const conditionStyles = {
  "New":        { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  "Excellent":  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  "Good":       { bg: "#f3e8ff", border: "#8b5cf6", text: "#5b21b6" },
  "Fair":       { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  "Faulty":     { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  "Damaged":    { bg: "#f3f4f6", border: "#6b7280", text: "#374151" }
};

// Status → hex, used to draw the Fleet Pulse bar (kept distinct from the
// StatusPill token set on purpose — the pulse bar is a data visualization,
// not a badge, so it wants flatter, more saturated fills).
const STATUS_HEX = {
  Available: "#16a34a", Assigned: "#2563eb", Spare: "#ca8a04",
  "Under Repair": "#ea580c", Faulty: "#dc2626", Lost: "#475569",
  Retired: "#94a3b8", Disposed: "#cbd5e1",
};

const HEALTH_META = {
  excellent: { label: "Excellent", color: "#059669", bg: "#d1fae5", border: "#6ee7b7" },
  good:      { label: "Good",      color: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  attention: { label: "Attention", color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  critical:  { label: "Critical",  color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
};

// ── Icon set ─────────────────────────────────────────────────────
//const IconBox     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;//
const IconAlert   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconShield  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconClock   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconSpark   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/></svg>;
const IconDots    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>;
const IconEye     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEdit    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
const IconUserPlus= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>;
const IconReturn  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
const IconMail    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6l-10 7L2 6"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>;
const IconTrash   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconDownload= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconHistory = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 5v4h4"/><polyline points="12 8 12 12 15 14"/></svg>;
const IconSearch  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconTable   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/></svg>;
const IconGrid    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
const IconSliders = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
const IconColumns = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>;
const IconLayers  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconRefresh = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const IconChevronDown = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconCompact = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconCozy    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="19" x2="21" y2="19"/></svg>;
const IconArrowUp = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
const IconArrowDown = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;

// ── Helpers ──────────────────────────────────────────────────────
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
};

// Every asset's status, condition and warranty distance collapse into one
// signal: Health. This is the single indicator an admin scans first — it
// replaces "read three columns and infer risk yourself" with one glance.
function computeHealth(asset) {
  const warrantyDays = daysUntil(asset.warrantyExpiry);
  let score = 100;
  const flags = [];

  if (asset.assetStatus === "Faulty" || asset.assetStatus === "Lost") {
    score -= 55; flags.push(asset.assetStatus === "Lost" ? "Reported lost" : "Marked faulty");
  } else if (asset.assetStatus === "Under Repair") {
    score -= 25; flags.push("Currently under repair");
  }

  if (asset.assetCondition === "Faulty" || asset.assetCondition === "Damaged") {
    score -= 30; flags.push(`${asset.assetCondition} condition`);
  } else if (asset.assetCondition === "Fair") {
    score -= 12; flags.push("Fair condition");
  }

  if (warrantyDays !== null) {
    if (warrantyDays < 0) { score -= 18; flags.push("Warranty expired"); }
    else if (warrantyDays <= 30) { score -= 10; flags.push(`Warranty ends in ${warrantyDays}d`); }
  }

  score = Math.max(0, Math.min(100, score));
  let level = "excellent";
  if (score < 40) level = "critical";
  else if (score < 65) level = "attention";
  else if (score < 90) level = "good";

  return { score, level, flags, warrantyDays };
}

// ── Asset type → icon / gradient (drives grid cards + detail hero) ──
const ASSET_TYPE_VISUALS = {
  "Laptop":        { icon: "💻", gradient: "linear-gradient(135deg,#2563eb,#7c3aed)" },
  "Desktop":       { icon: "🖥️", gradient: "linear-gradient(135deg,#0891b2,#2563eb)" },
  "Monitor":       { icon: "🖥️", gradient: "linear-gradient(135deg,#0891b2,#0e7490)" },
  "Mobile":        { icon: "📱", gradient: "linear-gradient(135deg,#db2777,#7c3aed)" },
  "Tablet":        { icon: "📱", gradient: "linear-gradient(135deg,#db2777,#c026d3)" },
  "Printer":       { icon: "🖨️", gradient: "linear-gradient(135deg,#475569,#1e293b)" },
  "Keyboard":      { icon: "⌨️", gradient: "linear-gradient(135deg,#64748b,#334155)" },
  "Mouse":         { icon: "🖱️", gradient: "linear-gradient(135deg,#64748b,#334155)" },
  "Headset":       { icon: "🎧", gradient: "linear-gradient(135deg,#7c3aed,#c026d3)" },
  "Server":        { icon: "🗄️", gradient: "linear-gradient(135deg,#1e293b,#0f172a)" },
};
const DEFAULT_TYPE_VISUAL = { icon: "📦", gradient: "linear-gradient(135deg,#475569,#1e293b)" };

// ── Saved Views — each is a named lens over the fleet, not a UI filter ──
const VIEW_DEFS = [
  { key: "all",        label: "All Assets",       predicate: () => true },
  { key: "attention",  label: "Needs Attention",  predicate: (a) => ["attention","critical"].includes(computeHealth(a).level) },
  { key: "assigned",   label: "Assigned",         predicate: (a) => a.assetStatus === "Assigned" },
  { key: "unassigned", label: "Unassigned Pool",  predicate: (a) => ["Available","Spare"].includes(a.assetStatus) },
  { key: "warranty",   label: "Warranty Risk",    predicate: (a) => { const d = daysUntil(a.warrantyExpiry); return d !== null && d <= 60; } },
  { key: "recent",     label: "Recently Added",   predicate: (a) => { const d = daysUntil(a.purchaseDate); return d !== null && d >= -30 && d <= 0; } },
];

const OPTIONAL_COLUMNS = [
  { key: "assignee",  label: "Assigned To", defaultOn: true },
  { key: "warranty",  label: "Warranty",    defaultOn: true },
  { key: "vendor",    label: "Vendor",      defaultOn: false },
  { key: "cost",      label: "Cost",        defaultOn: false },
  { key: "purchased", label: "Purchased",   defaultOn: false },
];

const SORTERS = {
  name:      (a) => (a.laptopName || "").toLowerCase(),
  location:  (a) => (a.location || "").toLowerCase(),
  health:    (a) => computeHealth(a).score,
  warranty:  (a) => { const d = daysUntil(a.warrantyExpiry); return d === null ? Infinity : d; },
  status:    (a) => (a.assetStatus || ""),
};

// ══════════════════════════════════════════════════════════════════
// Small presentational pieces
// ══════════════════════════════════════════════════════════════════

const HealthDot = ({ asset, size = 10 }) => {
  const h = computeHealth(asset);
  const meta = HEALTH_META[h.level];
  const title = h.flags.length ? `${meta.label} — ${h.flags.join(", ")}` : `${meta.label} — no issues detected`;
  return (
    <span className="health-dot-wrap" title={title}>
      <span className="health-dot" style={{ width: size, height: size, background: meta.color, boxShadow: `0 0 0 3px ${meta.bg}` }} />
    </span>
  );
};

const WarrantyBar = ({ asset }) => {
  const d = daysUntil(asset.warrantyExpiry);
  if (!asset.warrantyExpiry) return <span className="muted-dash">—</span>;
  if (d === null) return <span className="muted-dash">—</span>;
  const expired = d < 0;
  const soon = d >= 0 && d <= 60;
  // Scale visually against a 730-day (2yr) horizon so the bar reads as
  // "how much runway is left", not a raw number.
  const pct = expired ? 0 : Math.max(4, Math.min(100, (d / 730) * 100));
  const tone = expired ? "#dc2626" : soon ? "#d97706" : "#16a34a";
  return (
    <div className="warranty-bar" title={expired ? `Expired ${formatDate(asset.warrantyExpiry)}` : `${d} day(s) remaining · expires ${formatDate(asset.warrantyExpiry)}`}>
      <div className="warranty-bar-track">
        <div className="warranty-bar-fill" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <span className="warranty-bar-label" style={{ color: tone }}>
        {expired ? "Expired" : `${d}d`}
      </span>
    </div>
  );
};

const PulseStrip = ({ assets, loading, activeStatusFilter, onSegmentClick }) => {
  const total = assets.length;
  const byStatus = useMemo(() => {
    const map = {};
    ASSET_STATUSES.forEach((s) => { map[s] = 0; });
    assets.forEach((a) => { map[a.assetStatus] = (map[a.assetStatus] || 0) + 1; });
    return map;
  }, [assets]);

  return (
    <div className="pulse-strip">
      <div className="pulse-strip-head">
        <div className="pulse-strip-title">Fleet Pulse</div>
        <div className="pulse-strip-total">
          {loading ? <span className="skeleton skeleton-text" style={{ width: 60, height: 14 }} /> : <><CountUp value={total} /> assets tracked</>}
        </div>
      </div>
      <div className="pulse-bar" role="group" aria-label="Assets by status">
        {loading ? (
          <div className="pulse-bar-skeleton" />
        ) : total === 0 ? (
          <div className="pulse-bar-empty">No assets yet</div>
        ) : (
          ASSET_STATUSES.filter((s) => byStatus[s] > 0).map((s) => {
            const pct = (byStatus[s] / total) * 100;
            const active = activeStatusFilter === s;
            return (
              <button
                key={s}
                className={`pulse-segment ${active ? "is-active" : ""}`}
                style={{ width: `${pct}%`, background: STATUS_HEX[s] || "#94a3b8" }}
                onClick={() => onSegmentClick(s)}
                title={`${s}: ${byStatus[s]} (${pct.toFixed(1)}%)`}
              />
            );
          })
        )}
      </div>
      <div className="pulse-legend">
        {ASSET_STATUSES.filter((s) => byStatus[s] > 0 || activeStatusFilter === s).map((s) => (
          <button
            key={s}
            className={`pulse-legend-item ${activeStatusFilter === s ? "is-active" : ""}`}
            onClick={() => onSegmentClick(s)}
          >
            <span className="pulse-legend-dot" style={{ background: STATUS_HEX[s] || "#94a3b8" }} />
            {s} <b>{byStatus[s]}</b>
          </button>
        ))}
      </div>
    </div>
  );
};

const SignalPill = ({ icon, label, count, tone, active, onClick, loading }) => (
  <button className={`signal-pill tone-${tone} ${active ? "is-active" : ""}`} onClick={onClick}>
    <span className="signal-pill-icon">{icon}</span>
    <span className="signal-pill-count">{loading ? <span className="skeleton skeleton-text" style={{ width: 18, height: 14 }} /> : <CountUp value={count} />}</span>
    <span className="signal-pill-label">{label}</span>
  </button>
);

// ── Three-dot row action menu (portal-based, flips to stay on-screen) ──
const ACTION_MENU_WIDTH = 232;
const ACTION_MENU_MARGIN = 8;

const ActionMenu = ({ items, open, onToggle, onClose }) => {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const [coords, setCoords] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const actionableItems = items.filter((it) => it && !it.divider);

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estimatedHeight = menuRef.current?.offsetHeight || actionableItems.length * 38 + 60;

    const spaceBelow = vh - rect.bottom;
    const openUp = spaceBelow < estimatedHeight + ACTION_MENU_MARGIN && rect.top > estimatedHeight;

    let top = openUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
    top = Math.max(ACTION_MENU_MARGIN, Math.min(top, vh - ACTION_MENU_MARGIN));

    let left = rect.right - ACTION_MENU_WIDTH;
    if (left < ACTION_MENU_MARGIN) left = rect.left;
    if (left + ACTION_MENU_WIDTH > vw - ACTION_MENU_MARGIN) left = vw - ACTION_MENU_WIDTH - ACTION_MENU_MARGIN;
    left = Math.max(ACTION_MENU_MARGIN, left);

    setCoords({ top, left, openUp });
  }, [actionableItems.length]);

  useLayoutEffect(() => {
    if (!open) { setCoords(null); return; }
    computePosition();
    const raf = requestAnimationFrame(computePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      onClose();
    };
    const handleKey = (e) => { if (e.key === "Escape") { onClose(); triggerRef.current?.focus(); } };
    const handleReposition = () => computePosition();

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, onClose, computePosition]);

  useEffect(() => {
    if (open) setActiveIndex(0); else setActiveIndex(-1);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) itemRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const handleTriggerKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) onToggle();
    }
  };

  const handleMenuKeyDown = (e) => {
    const count = actionableItems.length;
    if (!count) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActiveIndex((i) => (i + 1) % count); break;
      case "ArrowUp":   e.preventDefault(); setActiveIndex((i) => (i - 1 + count) % count); break;
      case "Home":      e.preventDefault(); setActiveIndex(0); break;
      case "End":       e.preventDefault(); setActiveIndex(count - 1); break;
      case "Tab":       onClose(); break;
      default: break;
    }
  };

  itemRefs.current = [];

  const menu = open && coords && createPortal(
    <div
      ref={menuRef}
      className={`action-menu-dropdown ${coords.openUp ? "opens-up" : "opens-down"}`}
      style={{ top: coords.top, left: coords.left, width: ACTION_MENU_WIDTH, visibility: coords ? "visible" : "hidden" }}
      role="menu"
      aria-label="Asset actions"
      onKeyDown={handleMenuKeyDown}
    >
      {items.filter(Boolean).map((it, i) => {
        if (it.divider) return <div key={`divider-${i}`} className="action-menu-divider" role="separator" />;
        const actionIndex = actionableItems.indexOf(it);
        return (
          <button
            key={it.label}
            ref={(el) => { itemRefs.current[actionIndex] = el; }}
            role="menuitem"
            tabIndex={activeIndex === actionIndex ? 0 : -1}
            className={`action-menu-item${it.danger ? " is-danger" : ""}`}
            onClick={() => { onClose(); it.onClick(); }}
          >
            <span className="action-menu-item-icon">{it.icon}</span>
            <span className="action-menu-item-label">{it.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className="action-menu">
      <button
        ref={triggerRef}
        className={`action-menu-trigger${open ? " is-active" : ""}`}
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
        title="More actions"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconDots />
      </button>
      {menu}
    </div>
  );
};

// ── Generic dismissible popover (Filters / Columns) ──────────────
const Popover = ({ open, onClose, anchorRef, children, width = 280, align = "left" }) => {
  const popRef = useRef(null);
  const [coords, setCoords] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) { setCoords(null); return; }
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = align === "right" ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, vw - width - 8));
    setCoords({ top: rect.bottom + 8, left });
  }, [open, anchorRef, width, align]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (popRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      onClose();
    };
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !coords) return null;
  return createPortal(
    <div ref={popRef} className="popover-panel" style={{ top: coords.top, left: coords.left, width }}>
      {children}
    </div>,
    document.body
  );
};

// ── Skeletons ────────────────────────────────────────────────────
const SkeletonRow = ({ columns }) => (
  <tr className="skeleton-row">
    <td><div className="skeleton skeleton-box" style={{ width: 16, height: 16 }} /></td>
    <td><div className="skeleton skeleton-box" style={{ width: 10, height: 10, borderRadius: "50%" }} /></td>
    <td>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="skeleton skeleton-box" style={{ width: 34, height: 34 }} />
        <div>
          <div className="skeleton skeleton-text" style={{ width: 140, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: 90, height: 9 }} />
        </div>
      </div>
    </td>
    {columns.includes("assignee") && <td><div className="skeleton skeleton-text" style={{ width: 100 }} /></td>}
    <td><div className="skeleton skeleton-text" style={{ width: 90 }} /></td>
    {columns.includes("warranty") && <td><div className="skeleton skeleton-text" style={{ width: 70 }} /></td>}
    <td><div className="skeleton skeleton-text" style={{ width: 80 }} /></td>
    <td><div className="skeleton skeleton-box" style={{ width: 24, height: 24 }} /></td>
  </tr>
);

const SkeletonCard = () => (
  <div className="asset-grid-card skeleton-card">
    <div className="skeleton skeleton-box" style={{ width: 44, height: 44, marginBottom: 12 }} />
    <div className="skeleton skeleton-text" style={{ width: "70%", marginBottom: 8 }} />
    <div className="skeleton skeleton-text" style={{ width: "45%", height: 9 }} />
  </div>
);

// (ReturnDialog moved to components/ReturnAssetDialog.js so it can be
// reused from the Employee detail drawer too — see the import above.)

// ══════════════════════════════════════════════════════════════════
// Asset Detail Panel — tabbed side sheet
// ══════════════════════════════════════════════════════════════════
const AssetPanel = ({ asset, onClose, onEdit, focusPanel }) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    setTab(focusPanel === "timeline" ? "files" : "overview");
  }, [asset, focusPanel]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    if (asset) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [asset, onClose]);

  if (!asset) return null;

  const visual = ASSET_TYPE_VISUALS[asset.assetType] || DEFAULT_TYPE_VISUAL;
  const style = conditionStyles[asset.assetCondition] || conditionStyles["New"];
  const specs = [asset.processor, asset.ram, asset.storage].filter(Boolean).join(" · ");
  const health = computeHealth(asset);
  const healthMeta = HEALTH_META[health.level];

  const copySerial = async () => {
    if (!asset.serialNumber) return;
    try {
      await navigator.clipboard.writeText(asset.serialNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch { /* clipboard permission denied — ignore */ }
  };

  const timeline = [];
  if (asset.purchaseDate) timeline.push({ label: "Purchased", date: formatDate(asset.purchaseDate), state: "done" });
  if (asset.warrantyExpiry) {
    const expired = health.warrantyDays !== null && health.warrantyDays < 0;
    const soon = health.warrantyDays !== null && health.warrantyDays >= 0 && health.warrantyDays <= 60;
    timeline.push({
      label: "Warranty", date: formatDate(asset.warrantyExpiry),
      state: expired ? "danger" : soon ? "warn" : "done",
      badge: expired ? "Expired" : soon ? `${health.warrantyDays}d left` : null,
      badgeStyle: expired ? { background: "var(--danger-bg)", color: "var(--danger)" } : { background: "var(--warning-bg)", color: "var(--warning)" },
    });
  }
  if (asset.assignedDate) timeline.push({ label: `Assigned${asset.employeeName ? ` to ${asset.employeeName}` : ""}`, date: formatDate(asset.assignedDate), state: "done" });
  if (asset.returnedStatus === "Yes" && asset.returnDate) timeline.push({ label: "Returned", date: formatDate(asset.returnDate), state: "done" });
  if (asset.relievedStatus === "Yes" && asset.relievedDate) timeline.push({ label: "Employee relieved", date: formatDate(asset.relievedDate), state: "warn" });

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "assignment", label: "Assignment" },
    { key: "lifecycle", label: "Lifecycle" },
    { key: "files", label: "Files & History" },
  ];

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-hero" style={{ background: visual.gradient }}>
          <button className="side-panel-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="side-panel-icon">{visual.icon}</div>
          <h3 className="side-panel-name">{asset.laptopName}</h3>
          <div className="side-panel-sub">{asset.assetType}{asset.brand ? ` · ${asset.brand}` : ""}{asset.model ? ` ${asset.model}` : ""}</div>
          <div className="side-panel-pills">
            <StatusPill status={asset.assetStatus} />
            <span className="pill" style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>{asset.assetCondition}</span>
            <span className="pill" style={{ background: healthMeta.bg, color: healthMeta.color, border: `1px solid ${healthMeta.border}` }}>
              ● {healthMeta.label}
            </span>
          </div>
        </div>

        <div className="side-panel-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`side-panel-tab ${tab === t.key ? "is-active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="side-panel-body">
          {tab === "overview" && (
            <>
              {health.flags.length > 0 && (
                <div className={`health-callout tone-${health.level}`}>
                  <div className="health-callout-score">{health.score}</div>
                  <div>
                    <div className="health-callout-title">{healthMeta.label} health</div>
                    <div className="health-callout-flags">{health.flags.join(" · ")}</div>
                  </div>
                </div>
              )}
              <div className="side-panel-section">
                <div className="side-panel-section-title">Serial Number</div>
                <div className="side-panel-serial">
                  <span>{asset.serialNumber || "—"}</span>
                  {asset.serialNumber && (
                    <button className={`side-panel-copy-btn${copied ? " is-copied" : ""}`} onClick={copySerial}>
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
              <div className="side-panel-section">
                <div className="side-panel-section-title">Overview</div>
                <div className="side-panel-grid">
                  <div className="side-panel-stat"><div className="side-panel-stat-label">Location</div><div className="side-panel-stat-value">{asset.location || "—"}</div></div>
                  <div className="side-panel-stat"><div className="side-panel-stat-label">Vendor</div><div className="side-panel-stat-value">{asset.vendor || "—"}</div></div>
                  <div className="side-panel-stat"><div className="side-panel-stat-label">Cost</div><div className="side-panel-stat-value">{asset.assetCost ? `₹${asset.assetCost}` : "—"}</div></div>
                  <div className="side-panel-stat"><div className="side-panel-stat-label">Email Status</div><div className="side-panel-stat-value"><EmailStatusPill status={asset.emailStatus} /></div></div>
                </div>
                {specs && (
                  <div className="side-panel-stat" style={{ marginTop: 12 }}>
                    <div className="side-panel-stat-label">Specifications</div>
                    <div className="side-panel-stat-value">{specs}</div>
                  </div>
                )}
              </div>
              {asset.remarks && (
                <div className="side-panel-section">
                  <div className="side-panel-section-title">Remarks</div>
                  <div className="side-panel-notes">{asset.remarks}</div>
                </div>
              )}
            </>
          )}

          {tab === "assignment" && (
            <div className="side-panel-section">
              {asset.employeeName ? (
                <>
                  <div className="side-panel-assignee">
                    <div className="side-panel-avatar">{getInitials(asset.employeeName)}</div>
                    <div>
                      <div className="side-panel-assignee-name">{asset.employeeName}</div>
                      <div className="side-panel-assignee-meta">{asset.employeeRole || "Employee"}{asset.employeeId ? ` · ${asset.employeeId}` : ""}</div>
                    </div>
                  </div>
                  <div className="side-panel-stat" style={{ marginTop: 14 }}>
                    <div className="side-panel-stat-label">Assignment Type</div>
                    <div className="side-panel-stat-value">{asset.assignmentType === "Temporary" ? "⏳ Temporary" : "🔒 Permanent"}</div>
                  </div>
                  {asset.assignmentType === "Temporary" && (
                    <>
                      <div className="side-panel-stat" style={{ marginTop: 10 }}>
                        <div className="side-panel-stat-label">Reason</div>
                        <div className="side-panel-stat-value">{asset.temporaryReason || "—"}</div>
                      </div>
                      <div className="side-panel-stat" style={{ marginTop: 10 }}>
                        <div className="side-panel-stat-label">Duration / Return By</div>
                        <div className="side-panel-stat-value">
                          {asset.temporaryDurationDays ? `${asset.temporaryDurationDays} day(s)` : "—"}
                          {asset.temporaryExpiryDate ? ` · due ${formatDate(asset.temporaryExpiryDate)}` : ""}
                          {asset.temporaryReturnReminderSent === "Yes" && (
                            <span className="side-panel-tl-badge" style={{ marginLeft: 8, background: "#fee2e2", color: "#b91c1c" }}>Expired — reminder sent</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {asset.oldAssetIssues && (
                    <div className="side-panel-stat" style={{ marginTop: 10 }}>
                      <div className="side-panel-stat-label">Issues Noted with Old Asset</div>
                      <div className="side-panel-stat-value">{asset.oldAssetIssues}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="side-panel-empty">Not currently assigned to anyone.</div>
              )}
            </div>
          )}

          {tab === "lifecycle" && (
            <div className="side-panel-section">
              {timeline.length > 0 ? (
                <div className="side-panel-timeline">
                  {timeline.map((t, i) => (
                    <div key={i} className={`side-panel-tl-item is-${t.state}`}>
                      <div className="side-panel-tl-dot" />
                      <div className="side-panel-tl-label">{t.label}{t.badge && <span className="side-panel-tl-badge" style={t.badgeStyle}>{t.badge}</span>}</div>
                      <div className="side-panel-tl-date">{t.date}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="side-panel-empty">No lifecycle events recorded yet.</div>
              )}
            </div>
          )}

          {tab === "files" && (
            <div className="side-panel-section">
              <AssetExtras key={`${asset.assetId}-${focusPanel || "default"}`} asset={asset} apiBase={API} initialPanel={focusPanel || null} />
            </div>
          )}
        </div>

        <div className="side-panel-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onEdit(asset)}>✏️ Edit Asset</button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Add / Edit sheet
// ══════════════════════════════════════════════════════════════════
const AssetFormSheet = ({ open, editingAsset, form, field, saving, onSave, onCancel }) => {
  if (!open) return null;
  return (
    <div className="side-panel-overlay" onClick={onCancel}>
      <div className="side-panel form-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="form-sheet-header">
          <div>
            <h3 className="side-panel-name" style={{ color: "var(--gray-900)" }}>{editingAsset ? "Edit Asset" : "Register New Asset"}</h3>
            <div className="card-subtitle">{editingAsset ? `${editingAsset.laptopName} · ${editingAsset.serialNumber}` : "Add a device to the fleet"}</div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className="side-panel-body">
          <div className="form-section-label">Required Information</div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Asset Type *</label>
              <select className="input" {...field("assetType")}>
                <option value="">Select type…</option>
                {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Asset Name *</label>
              <input className="input" {...field("laptopName")} placeholder="e.g. MacBook Pro 14" />
            </div>
            <div className="field">
              <label className="field-label">Brand *</label>
              <input className="input" {...field("brand")} placeholder="e.g. Apple" />
            </div>
            <div className="field">
              <label className="field-label">Model *</label>
              <input className="input" {...field("model")} placeholder="e.g. M3 Pro" />
            </div>
            <div className="field">
              <label className="field-label">Serial Number *</label>
              <input className="input" {...field("serialNumber")} placeholder="Unique serial" />
            </div>
            <div className="field">
              <label className="field-label">Location *</label>
              <select className="input" {...field("location")}>
                <option value="">Select branch…</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="form-section-label" style={{ marginTop:20 }}>Hardware Specifications</div>
          <div className="form-grid">
            <div className="field" style={{ gridColumn:"span 2" }}>
              <label className="field-label">Processor</label>
              <input className="input" {...field("processor")} placeholder="e.g. Intel Core i7-10510U @1.90GHz" />
            </div>
            <div className="field">
              <label className="field-label">RAM</label>
              <input className="input" {...field("ram")} placeholder="e.g. 16GB" />
            </div>
            <div className="field">
              <label className="field-label">Storage</label>
              <input className="input" {...field("storage")} placeholder="e.g. 512GB SSD" />
            </div>
          </div>

          <div className="form-section-label" style={{ marginTop:20 }}>Optional Details</div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Purchase Date</label>
              <input className="input" type="date" {...field("purchaseDate")} />
            </div>
            <div className="field">
              <label className="field-label">Warranty Expiry</label>
              <input className="input" type="date" {...field("warrantyExpiry")} />
            </div>
            <div className="field">
              <label className="field-label">Vendor</label>
              <input className="input" {...field("vendor")} placeholder="e.g. Ingram Micro" />
            </div>
            <div className="field">
              <label className="field-label">Cost (₹)</label>
              <input className="input" type="number" min="0" {...field("assetCost")} placeholder="85000" />
            </div>
            <div className="field" style={{ gridColumn:"span 2" }}>
              <label className="field-label">Remarks</label>
              <input className="input" {...field("remarks")} placeholder="Any additional notes" />
            </div>
          </div>
        </div>

        <div className="side-panel-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : editingAsset ? "✓ Save Changes" : "✓ Add to Inventory"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Keyboard shortcuts reference modal ───────────────────────────
const ShortcutsModal = ({ open, onClose }) => {
  if (!open) return null;
  const rows = [
    ["/", "Focus search"],
    ["N", "Register a new asset"],
    ["G", "Toggle Grid / Table view"],
    ["Esc", "Close panel or menu"],
    ["?", "Show this shortcut list"],
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 className="modal-title">Keyboard Shortcuts</h3>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {rows.map(([key, desc]) => (
            <div key={key} className="shortcut-row">
              <kbd className="shortcut-key">{key}</kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════
export default function Assets() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [activeView, setActiveView] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [conditionFilter, setConditionFilter] = useState("All");
  const [groupBy, setGroupBy] = useState("none");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [viewMode, setViewMode] = useState("table"); // table | grid
  const [density, setDensity] = useState(() => localStorage.getItem(DENSITY_STORAGE_KEY) || "comfortable");

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COLUMNS_STORAGE_KEY));
      if (Array.isArray(stored)) return stored;
    } catch { /* fall through to defaults */ }
    return OPTIONAL_COLUMNS.filter(c => c.defaultOn).map(c => c.key);
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const filtersBtnRef = useRef(null);
  const columnsBtnRef = useRef(null);
  const searchInputRef = useRef(null);

  const [returnTarget, setReturnTarget] = useState(null);
  const [returning, setReturning] = useState(false);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [viewingFocusPanel, setViewingFocusPanel] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);
  const [updating, setUpdating] = useState(new Set());
  const [employeeEmailById, setEmployeeEmailById] = useState({});

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingConditionId, setEditingConditionId] = useState(null);

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/assets`)
      .then((r) => { setAssets(r.data); setError(""); })
      .catch(() => { setAssets([]); setError("Couldn't load assets. Is the Spring Boot API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const qId = searchParams.get("assetId");
    if (qId && assets.length > 0) {
      const match = assets.find((a) => String(a.assetId) === String(qId));
      if (match) setViewingAsset(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && assets.length > 0) {
      const match = assets.find((a) => String(a.assetId) === String(editId));
      if (match) openEdit(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  useEffect(() => {
    axios.get(`${API}/api/admin/employees`)
      .then((r) => {
        const map = {};
        (r.data || []).forEach((e) => { map[e.employeeId] = e.email; });
        setEmployeeEmailById(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns)); }, [visibleColumns]);
  useEffect(() => { localStorage.setItem(DENSITY_STORAGE_KEY, density); }, [density]);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;
      if (e.key === "Escape") {
        if (viewingAsset) { setViewingAsset(null); setViewingFocusPanel(null); return; }
        if (showForm) { cancelForm(); return; }
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
      }
      if (typing) return;
      if (e.key === "/") { e.preventDefault(); searchInputRef.current?.focus(); }
      else if (e.key === "n" || e.key === "N") { setEditingAsset(null); setForm(EMPTY_FORM); setShowForm(true); }
      else if (e.key === "g" || e.key === "G") { setViewMode((v) => (v === "table" ? "grid" : "table")); }
      else if (e.key === "?") { setShortcutsOpen((s) => !s); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingAsset, showForm, shortcutsOpen]);

  // ── Form helpers ──────────────────────────────────────────────
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const saveAsset = () => {
    const required = [["assetType","Asset Type"],["laptopName","Asset Name"],["brand","Brand"],["model","Model"],["serialNumber","Serial Number"],["location","Location"]];
    for (const [k, label] of required) {
      if (!form[k]?.trim()) { toast(`${label} is required.`, "error"); return; }
    }
    setSaving(true);
    axios.post(`${API}/assets`, form)
      .then(() => { toast("Asset added to inventory.", "success"); setForm(EMPTY_FORM); setShowForm(false); loadData(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't save asset.", "error"))
      .finally(() => setSaving(false));
  };

  const openEdit = (asset) => {
    setEditingAsset(asset);
    setForm({
      assetType: asset.assetType || "", laptopName: asset.laptopName || "", brand: asset.brand || "",
      model: asset.model || "", serialNumber: asset.serialNumber || "", location: asset.location || "",
      assetStatus: asset.assetStatus || "Available", assetCondition: asset.assetCondition || "Good",
      purchaseDate: asset.purchaseDate || "", warrantyExpiry: asset.warrantyExpiry || "", vendor: asset.vendor || "",
      assetCost: asset.assetCost || "", processor: asset.processor || "", ram: asset.ram || "",
      storage: asset.storage || "", remarks: asset.remarks || "",
    });
    setViewingAsset(null);
    setViewingFocusPanel(null);
    setShowForm(true);
  };

  const saveEdit = () => {
    const required = [["assetType","Asset Type"],["laptopName","Asset Name"],["brand","Brand"],["model","Model"],["serialNumber","Serial Number"],["location","Location"]];
    for (const [k, label] of required) {
      if (!form[k]?.trim()) { toast(`${label} is required.`, "error"); return; }
    }
    setSaving(true);
    axios.put(`${API}/assets/${editingAsset.assetId}`, form)
      .then(() => { toast("Asset updated successfully.", "success"); setShowForm(false); setEditingAsset(null); setForm(EMPTY_FORM); loadData(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't update asset.", "error"))
      .finally(() => setSaving(false));
  };

  const cancelForm = () => { setShowForm(false); setEditingAsset(null); setForm(EMPTY_FORM); };

  const handleReturn = (assetId, { condition, nextStatus, sendReturnEmail }) => {
    setReturning(true);
    axios.put(`${API}/assets/return/${assetId}`, { condition, assetStatus: nextStatus, sendReturnEmail: sendReturnEmail ? "true" : "false" })
      .then(() => {
        toast(sendReturnEmail ? "Asset returned and return email sent to the employee." : "Asset returned and inventory updated.", "success");
        setReturnTarget(null);
        loadData();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't process return.", "error"))
      .finally(() => setReturning(false));
  };

  const handleEmailSent = (updatedAsset, message, isError = false) => {
    if (isError) {
      toast(message, "error");
      setAssets((prev) => prev.map((a) => (a.assetId === emailTarget?.assetId ? { ...a, emailStatus: "Failed" } : a)));
      return;
    }
    toast(message, "success");
    setEmailTarget(null);
    if (updatedAsset) setAssets((prev) => prev.map((a) => (a.assetId === updatedAsset.assetId ? updatedAsset : a)));
    else loadData();
  };

  const deleteAsset = (id) => {
    if (!window.confirm("Permanently delete this asset? This cannot be undone.")) return;
    axios.delete(`${API}/assets/${id}`)
      .then(() => { toast("Asset deleted.", "success"); loadData(); })
      .catch(() => toast("Couldn't delete asset.", "error"));
  };

  const updateAsset = (assetId, fieldName, newValue) => {
    if (updating.has(assetId)) return;
    const currentAsset = assets.find(a => a.assetId === assetId);
    if (!currentAsset) return;
    const updatedAsset = { ...currentAsset, [fieldName]: newValue };
    setAssets(prev => prev.map(a => (a.assetId === assetId ? updatedAsset : a)));
    setUpdating(prev => new Set(prev).add(assetId));
    axios.put(`${API}/assets/${assetId}`, updatedAsset)
      .then(() => toast("Asset updated successfully.", "success"))
      .catch((err) => { toast(err.response?.data?.message || "Failed to update asset.", "error"); loadData(); })
      .finally(() => setUpdating(prev => { const next = new Set(prev); next.delete(assetId); return next; }));
  };

  // ── Derived data ──────────────────────────────────────────────
  const uniqueTypes = useMemo(() => ["All", ...new Set(assets.map(a => a.assetType).filter(Boolean))], [assets]);

  const activeViewDef = VIEW_DEFS.find(v => v.key === activeView) || VIEW_DEFS[0];

  const searchFiltered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(a => [
      a.laptopName, a.assetId, a.serialNumber, a.brand, a.model,
      a.vendor, a.location, a.assetType, a.employeeName, a.employeeId,
    ].some(v => (v ?? "").toString().toLowerCase().includes(q)));
  }, [assets, searchText]);

  const filtered = useMemo(() => {
    return searchFiltered
      .filter(a => statusFilter === "All" || a.assetStatus === statusFilter)
      .filter(a => typeFilter === "All" || a.assetType === typeFilter)
      .filter(a => locationFilter === "All" || (a.location || "") === locationFilter)
      .filter(a => conditionFilter === "All" || a.assetCondition === conditionFilter)
      .filter(activeViewDef.predicate);
  }, [searchFiltered, statusFilter, typeFilter, locationFilter, conditionFilter, activeViewDef]);

  const sorted = useMemo(() => {
    const getter = SORTERS[sortKey] || SORTERS.name;
    const arr = [...filtered].sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: null, label: null, rows: sorted }];
    const map = new Map();
    sorted.forEach((a) => {
      const key = groupBy === "status" ? (a.assetStatus || "Unknown")
                : groupBy === "location" ? (a.location || "Unspecified")
                : (a.assetType || "Other");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return [...map.entries()].map(([key, rows]) => ({ key, label: key, rows }));
  }, [sorted, groupBy]);

  const anyFilterActive = !!(searchText || statusFilter !== "All" || typeFilter !== "All" || locationFilter !== "All" || conditionFilter !== "All" || activeView !== "all");
  const advancedFilterCount = [statusFilter, typeFilter, locationFilter, conditionFilter].filter(v => v !== "All").length;

  const clearAllFilters = () => {
    setSearchText(""); setStatusFilter("All"); setTypeFilter("All"); setLocationFilter("All"); setConditionFilter("All"); setActiveView("all");
  };

  const viewCounts = useMemo(() => {
    const map = {};
    VIEW_DEFS.forEach(v => { map[v.key] = searchFiltered.filter(v.predicate).length; });
    return map;
  }, [searchFiltered]);

  const healthCounts = useMemo(() => {
    const map = { critical: 0, attention: 0, good: 0, excellent: 0 };
    assets.forEach(a => { map[computeHealth(a).level]++; });
    return map;
  }, [assets]);

  const warrantyRiskCount = useMemo(() => assets.filter(a => { const d = daysUntil(a.warrantyExpiry); return d !== null && d >= 0 && d <= 30; }).length, [assets]);
  const recentCount = useMemo(() => assets.filter(a => { const d = daysUntil(a.purchaseDate); return d !== null && d >= -30 && d <= 0; }).length, [assets]);

  const insightText = useMemo(() => {
    if (!assets.length) return null;
    const parts = [];
    if (healthCounts.critical) parts.push(`${healthCounts.critical} asset${healthCounts.critical > 1 ? "s" : ""} in critical health`);
    if (warrantyRiskCount) parts.push(`${warrantyRiskCount} warrant${warrantyRiskCount > 1 ? "ies" : "y"} expiring within 30 days`);
    const unassignedSpares = assets.filter(a => a.assetStatus === "Spare").length;
    if (unassignedSpares >= 3) parts.push(`${unassignedSpares} spare devices sitting idle`);
    if (!parts.length) return "Fleet is healthy — no urgent issues detected across your inventory.";
    return parts.join(" · ") + ".";
  }, [assets, healthCounts, warrantyRiskCount]);

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ sortk, label, ...rest }) => (
    <th className="sort-th" onClick={() => toggleSort(sortk)} {...rest}>
      <span>{label}</span>
      {sortKey === sortk && (sortDir === "asc" ? <IconArrowUp/> : <IconArrowDown/>)}
    </th>
  );

  const allColumns = OPTIONAL_COLUMNS;
  const colSpan = 6 + allColumns.filter(c => visibleColumns.includes(c.key)).length;

  // ── Render ────────────────────────────────────────────────────
  return (
    <Layout
      title="Assets"
      subtitle="Command center for your IT fleet"
      actions={
        <button className="btn btn-primary" onClick={() => { setEditingAsset(null); setForm(EMPTY_FORM); setShowForm(true); }}>
          + New Asset <kbd className="btn-kbd">N</kbd>
        </button>
      }
    >
      {error && (
        <div className="card" style={{ marginBottom:20, borderColor:"#fecaca", background:"#fef2f2", padding:"12px 18px", fontSize:13, color:"#991b1b", display:"flex", gap:8, alignItems:"center" }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Fleet Pulse + Signals ── */}
      <div className="command-deck">
        <PulseStrip
          assets={assets}
          loading={loading}
          activeStatusFilter={statusFilter !== "All" ? statusFilter : null}
          onSegmentClick={(s) => setStatusFilter(prev => prev === s ? "All" : s)}
        />
        <div className="signal-row">
          <SignalPill icon={<IconAlert/>} label="Needs Attention" count={healthCounts.critical + healthCounts.attention} tone="danger" loading={loading} active={activeView === "attention"} onClick={() => setActiveView(v => v === "attention" ? "all" : "attention")} />
          <SignalPill icon={<IconShield/>} label="Warranty Risk" count={warrantyRiskCount} tone="warning" loading={loading} active={activeView === "warranty"} onClick={() => setActiveView(v => v === "warranty" ? "all" : "warranty")} />
          <SignalPill icon={<IconClock/>} label="Recently Added" count={recentCount} tone="info" loading={loading} active={activeView === "recent"} onClick={() => setActiveView(v => v === "recent" ? "all" : "recent")} />
        </div>
        {insightText && !loading && (
          <div className="insight-banner">
            <span className="insight-banner-icon"><IconSpark/></span>
            <span><b>Smart Insight —</b> {insightText}</span>
          </div>
        )}
      </div>

      {/* ── Saved Views ── */}
      <div className="view-tabs" role="tablist" aria-label="Saved views">
        {VIEW_DEFS.map(v => (
          <button key={v.key} className={`view-tab ${activeView === v.key ? "is-active" : ""}`} onClick={() => setActiveView(v.key)}>
            {v.label} <span className="view-tab-count">{loading ? "…" : viewCounts[v.key]}</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="card asset-toolbar-card">
        <div className="asset-toolbar-row">
          <div className="search-command">
            <IconSearch />
            <input
              ref={searchInputRef}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search assets, serials, employees, vendors… (press / to focus)"
            />
            {searchText && <button className="asset-global-search-clear" onClick={() => setSearchText("")} aria-label="Clear search">✕</button>}
          </div>

          <div className="toolbar-actions">
            <select className="group-select" value={groupBy} onChange={e => setGroupBy(e.target.value)} title="Group by">
              <option value="none"><IconLayers/> No grouping</option>
              <option value="status">Group: Status</option>
              <option value="location">Group: Location</option>
              <option value="type">Group: Type</option>
            </select>

            <button ref={filtersBtnRef} className={`btn btn-secondary toolbar-btn ${advancedFilterCount ? "has-badge" : ""}`} onClick={() => setFiltersOpen(o => !o)}>
              <IconSliders/> Filters {advancedFilterCount > 0 && <span className="toolbar-badge">{advancedFilterCount}</span>} <IconChevronDown/>
            </button>

            {viewMode === "table" && (
              <button ref={columnsBtnRef} className="btn btn-secondary toolbar-btn" onClick={() => setColumnsOpen(o => !o)}>
                <IconColumns/> Columns <IconChevronDown/>
              </button>
            )}

            <div className="segmented">
              <button className={`segmented-btn ${density === "comfortable" ? "is-active" : ""}`} onClick={() => setDensity("comfortable")} title="Comfortable row height"><IconCozy/></button>
              <button className={`segmented-btn ${density === "compact" ? "is-active" : ""}`} onClick={() => setDensity("compact")} title="Compact row height"><IconCompact/></button>
            </div>

            <div className="segmented">
              <button className={`segmented-btn ${viewMode === "table" ? "is-active" : ""}`} onClick={() => setViewMode("table")} title="Table view"><IconTable/></button>
              <button className={`segmented-btn ${viewMode === "grid" ? "is-active" : ""}`} onClick={() => setViewMode("grid")} title="Grid view (G)"><IconGrid/></button>
            </div>

            <button className="btn btn-secondary btn-icon" onClick={loadData} disabled={loading} title="Refresh"><IconRefresh/></button>
          </div>
        </div>

        <div className="asset-toolbar-meta">
          {loading ? "Loading…" : `${sorted.length} of ${assets.length} assets`}
          {anyFilterActive && !loading && (
            <button className="filter-chip-clear-inline" onClick={clearAllFilters}>✕ Clear all filters</button>
          )}
        </div>

        <Popover open={filtersOpen} onClose={() => setFiltersOpen(false)} anchorRef={filtersBtnRef} width={300}>
          <div className="popover-title">Advanced Filters</div>
          <div className="popover-field">
            <label>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              {ASSET_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="popover-field">
            <label>Type</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              {uniqueTypes.map(t => <option key={t} value={t}>{t === "All" ? "All types" : t}</option>)}
            </select>
          </div>
          <div className="popover-field">
            <label>Location</label>
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
              <option value="All">All locations</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="popover-field">
            <label>Condition</label>
            <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}>
              <option value="All">All conditions</option>
              {ASSET_CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width:"100%", marginTop:6 }} onClick={() => { setStatusFilter("All"); setTypeFilter("All"); setLocationFilter("All"); setConditionFilter("All"); }}>
            Reset filters
          </button>
        </Popover>

        <Popover open={columnsOpen} onClose={() => setColumnsOpen(false)} anchorRef={columnsBtnRef} width={220} align="right">
          <div className="popover-title">Visible Columns</div>
          {allColumns.map(c => (
            <label key={c.key} className="popover-checkbox">
              <input type="checkbox" checked={visibleColumns.includes(c.key)} onChange={() => toggleColumn(c.key)} />
              {c.label}
            </label>
          ))}
        </Popover>
      </div>

      {/* ── Bulk float bar ── */}
      {selectedIds.size > 0 && (
        <div className="bulk-float-bar">
          <span className="bulk-bar-count">{selectedIds.size} selected</span>
          <select
            className="btn btn-sm btn-secondary"
            defaultValue=""
            onChange={(e) => {
              const status = e.target.value;
              if (!status) return;
              axios.put(`${API}/assets/bulk-update`, { assetIds: [...selectedIds], assetStatus: status })
                .then(() => { toast(`Updated status for ${selectedIds.size} asset(s).`, "success"); setSelectedIds(new Set()); loadData(); })
                .catch(() => toast("Bulk status update failed.", "error"));
              e.target.value = "";
            }}
          >
            <option value="">Set status…</option>
            {ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              const rows = sorted.filter(a => selectedIds.has(a.assetId));
              const cols = ["assetId","laptopName","assetType","brand","model","serialNumber","location","assetStatus","assetCondition","employeeName","vendor","purchaseDate","warrantyExpiry"];
              const csv = [cols.join(",")].concat(rows.map(a => cols.map(c => `"${(a[c] ?? "").toString().replace(/"/g,'""')}"`).join(","))).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url; link.download = "assets-export.csv"; link.click();
              URL.revokeObjectURL(url);
              toast(`Exported ${rows.length} asset(s) to CSV.`, "success");
            }}
          >
            <IconDownload /> Export CSV
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (!window.confirm(`Permanently delete ${selectedIds.size} selected asset(s)? This cannot be undone.`)) return;
              Promise.allSettled([...selectedIds].map(id => axios.delete(`${API}/assets/${id}`)))
                .then(() => { toast("Selected assets deleted.", "success"); setSelectedIds(new Set()); loadData(); });
            }}
          >
            <IconTrash /> Delete
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedIds(new Set())}>Clear</button>
        </div>
      )}

      {/* ── Content: Grid or Table ── */}
      <div className="card">
        {viewMode === "grid" ? (
          loading ? (
            <div className="asset-grid">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : sorted.length === 0 ? (
            <EmptyState anyFilterActive={anyFilterActive} onClear={clearAllFilters} onAdd={() => setShowForm(true)} />
          ) : (
            <div className="asset-grid">
              {sorted.map((asset) => {
                const visual = ASSET_TYPE_VISUALS[asset.assetType] || DEFAULT_TYPE_VISUAL;
                const health = computeHealth(asset);
                const meta = HEALTH_META[health.level];
                const isSelected = selectedIds.has(asset.assetId);
                return (
                  <div key={asset.assetId} className={`asset-grid-card ${isSelected ? "is-selected" : ""}`} onClick={() => setViewingAsset(asset)}>
                    <div className="asset-grid-card-top">
                      <div className="asset-grid-icon" style={{ background: visual.gradient }}>{visual.icon}</div>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          setSelectedIds(prev => { const next = new Set(prev); if (e.target.checked) next.add(asset.assetId); else next.delete(asset.assetId); return next; });
                        }}
                      />
                    </div>
                    <div className="asset-grid-name">{asset.laptopName}</div>
                    <div className="asset-grid-meta">{asset.assetType}{asset.brand ? ` · ${asset.brand}` : ""}</div>
                    <div className="asset-grid-footer">
                      <StatusPill status={asset.assetStatus} />
                      <span className="pill" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontSize: 10.5 }}>● {meta.label}</span>
                    </div>
                    {asset.employeeName && <div className="asset-grid-assignee">→ {asset.employeeName}</div>}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className={`table-wrap density-${density}`}>
            <table className="data-table asset-data-table">
              <thead>
                <tr>
                  <th style={{ width:36 }}>
                    <input
                      type="checkbox"
                      className="row-checkbox"
                      checked={sorted.length > 0 && sorted.every(a => selectedIds.has(a.assetId))}
                      onChange={(e) => setSelectedIds(e.target.checked ? new Set(sorted.map(a => a.assetId)) : new Set())}
                      title="Select all"
                    />
                  </th>
                  <th style={{ width:34 }} title="Health">●</th>
                  <SortHeader sortk="name" label="Asset" />
                  {visibleColumns.includes("assignee") && <th>Assigned To</th>}
                  <SortHeader sortk="location" label="Location" />
                  {visibleColumns.includes("warranty") && <SortHeader sortk="warranty" label="Warranty" />}
                  {visibleColumns.includes("vendor") && <th>Vendor</th>}
                  {visibleColumns.includes("cost") && <th>Cost</th>}
                  {visibleColumns.includes("purchased") && <th>Purchased</th>}
                  <th style={{ minWidth:110 }}>Condition</th>
                  <SortHeader sortk="status" label="Status" />
                  <th style={{ width:60 }}>Actions</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} columns={visibleColumns} />)}</tbody>
              ) : sorted.length === 0 ? (
                <tbody><tr><td colSpan={colSpan}><EmptyState anyFilterActive={anyFilterActive} onClear={clearAllFilters} onAdd={() => setShowForm(true)} /></td></tr></tbody>
              ) : (
                grouped.map((group) => (
                  <tbody key={group.key || "flat"}>
                    {group.label && (
                      <tr className="group-header-row">
                        <td colSpan={colSpan}>{group.label} <span className="group-header-count">{group.rows.length}</span></td>
                      </tr>
                    )}
                    {group.rows.map((asset) => {
                      const isUpdating = updating.has(asset.assetId);
                      const style = conditionStyles[asset.assetCondition] || conditionStyles["New"];
                      const employeeEmail = asset.employeeId ? employeeEmailById[asset.employeeId] : null;
                      const canSendEmail = asset.assetStatus === "Assigned" && !!asset.employeeId && !!employeeEmail;
                      const visual = ASSET_TYPE_VISUALS[asset.assetType] || DEFAULT_TYPE_VISUAL;
                      const isSelected = selectedIds.has(asset.assetId);
                      const isEditingCondition = editingConditionId === asset.assetId;

                      const menuItems = [
                        { label: "View Details", icon: <IconEye/>, onClick: () => setViewingAsset(asset) },
                        { label: "Edit Asset",   icon: <IconEdit/>, onClick: () => openEdit(asset) },
                        asset.assetStatus === "Available" && { label: "Assign Asset", icon: <IconUserPlus/>, onClick: () => { toast("Opening Employees to assign this asset…", "info"); navigate("/employees"); } },
                        asset.assetStatus === "Assigned" && { label: "Return Asset", icon: <IconReturn/>, onClick: () => setReturnTarget(asset) },
                        canSendEmail && { label: "Send Email", icon: <IconMail/>, onClick: () => setEmailTarget({ ...asset, employeeEmail }) },
                        { label: "Asset History", icon: <IconHistory/>, onClick: () => { setViewingAsset(asset); setViewingFocusPanel("timeline"); } },
                        { divider: true },
                        { label: "Delete Asset", icon: <IconTrash/>, danger: true, onClick: () => deleteAsset(asset.assetId) },
                      ];

                      return (
                        <tr key={asset.assetId} className={`asset-row ${isSelected ? "is-selected" : ""}`}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="row-checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedIds(prev => { const next = new Set(prev); if (e.target.checked) next.add(asset.assetId); else next.delete(asset.assetId); return next; });
                              }}
                            />
                          </td>
                          <td><HealthDot asset={asset} /></td>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div className="asset-row-icon" style={{ background: visual.gradient }}>{visual.icon}</div>
                              <div style={{ minWidth:0 }}>
                                <div className="asset-row-name" onClick={() => setViewingAsset(asset)} title="Click to view full details">
                                  {asset.laptopName}
                                </div>
                                <div className="asset-row-sub">
                                  <span className="tag tag-blue" style={{ padding:"1px 7px", fontSize:10.5 }}>{asset.assetType}</span>
                                  {asset.brand && <span>{asset.brand}{asset.model ? ` · ${asset.model}` : ""}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          {visibleColumns.includes("assignee") && (
                            <td style={{ color:"var(--gray-600)" }}>{asset.employeeName || <span className="muted-dash">Unassigned</span>}</td>
                          )}
                          <td style={{ color:"var(--gray-600)" }}>{asset.location || "—"}</td>
                          {visibleColumns.includes("warranty") && <td><WarrantyBar asset={asset} /></td>}
                          {visibleColumns.includes("vendor") && <td style={{ color:"var(--gray-600)" }}>{asset.vendor || "—"}</td>}
                          {visibleColumns.includes("cost") && <td style={{ color:"var(--gray-600)" }}>{asset.assetCost ? `₹${asset.assetCost}` : "—"}</td>}
                          {visibleColumns.includes("purchased") && <td style={{ color:"var(--gray-600)" }}>{formatDate(asset.purchaseDate) || "—"}</td>}
                          <td>
                            {isEditingCondition ? (
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <select
                                  className="condition-select"
                                  autoFocus
                                  value={asset.assetCondition}
                                  onChange={(e) => updateAsset(asset.assetId, 'assetCondition', e.target.value)}
                                  onBlur={() => setEditingConditionId(null)}
                                  disabled={isUpdating}
                                  style={{ background: style.bg, borderColor: style.border, color: style.text, fontWeight:600 }}
                                >
                                  {ASSET_CONDITIONS.map(c => {
                                    const s = conditionStyles[c] || conditionStyles["New"];
                                    return <option key={c} value={c} style={{ background:s.bg, color:s.text, fontWeight:600 }}>{c}</option>;
                                  })}
                                </select>
                                {isUpdating && <span style={{ fontSize:11, color:"var(--gray-400)" }}>⏳</span>}
                              </div>
                            ) : (
                              <button className="condition-badge-btn" onClick={() => setEditingConditionId(asset.assetId)} title="Click to change condition">
                                <ConditionPill condition={asset.assetCondition} />
                                <IconEdit/>
                              </button>
                            )}
                          </td>
                          <td><StatusPill status={asset.assetStatus} /></td>
                          <td>
                            <div className="row-hover-actions">
                              <button className="row-quick-btn" title="View" onClick={() => setViewingAsset(asset)}><IconEye/></button>
                              <button className="row-quick-btn" title="Edit" onClick={() => openEdit(asset)}><IconEdit/></button>
                              <ActionMenu
                                items={menuItems}
                                open={openMenuId === asset.assetId}
                                onToggle={() => setOpenMenuId(openMenuId === asset.assetId ? null : asset.assetId)}
                                onClose={() => setOpenMenuId(null)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))
              )}
            </table>
          </div>
        )}
      </div>

      <ReturnAssetDialog asset={returnTarget} onClose={() => setReturnTarget(null)} onConfirm={handleReturn} saving={returning} />

      <AssetPanel
        asset={viewingAsset}
        focusPanel={viewingFocusPanel}
        onClose={() => { setViewingAsset(null); setViewingFocusPanel(null); }}
        onEdit={(asset) => openEdit(asset)}
      />

      <AssetFormSheet
        open={showForm}
        editingAsset={editingAsset}
        form={form}
        field={field}
        saving={saving}
        onSave={editingAsset ? saveEdit : saveAsset}
        onCancel={cancelForm}
      />

      <SendEmailModal asset={emailTarget} onClose={() => setEmailTarget(null)} onSent={handleEmailSent} />

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </Layout>
  );
}

// ── Empty state ──────────────────────────────────────────────────
const EmptyState = ({ anyFilterActive, onClear, onAdd }) => (
  <div className="empty-state-v2">
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="empty-state-illustration">
      {anyFilterActive ? (
        <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/></>
      ) : (
        <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>
      )}
    </svg>
    <div className="empty-title">{anyFilterActive ? "No matching assets" : "Your fleet is empty"}</div>
    <div className="empty-sub">
      {anyFilterActive ? "Try a different view, or clear filters to see everything." : "Register your first device to start building your inventory."}
    </div>
    {anyFilterActive ? (
      <button className="btn btn-secondary" style={{ marginTop:14 }} onClick={onClear}>Clear Filters</button>
    ) : (
      <button className="btn btn-primary" style={{ marginTop:14 }} onClick={onAdd}>+ Register First Asset</button>
    )}
  </div>
);
