import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import StatusPill, { ConditionPill } from "../components/StatusPill";
import EmailStatusPill from "../components/EmailStatusPill";
import SendEmailModal from "../components/SendEmailModal";
import AssetExtras from "../components/AssetExtras";
import CountUp from "../components/CountUp";
import { useToast } from "../utils/Toast";
import "./Assets.css";

import { API_BASE as API } from "./config";

const ASSET_STATUSES = ["Available","Assigned","Spare","Under Repair","Faulty","Lost","Retired","Disposed"];
const ASSET_CONDITIONS = ["New","Excellent","Good","Fair","Faulty","Damaged"];
const ASSET_TYPES = ["Laptop","Desktop","Monitor","Keyboard","Mouse","Headset","Mobile","Tablet","Printer","Server","Network Device","Other"];
 const LOCATIONS = ["Mumbai"];

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

// ── Icon set (KPI cards + action menu) ─────────────────────────
const IconBox     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
const IconLink    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconCheck   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconAlert   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconArchive = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const IconWrench  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconClock   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconShield  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconDots    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>;
const IconEye     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEdit    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
const IconUserPlus= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>;
const IconReturn  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
const IconMail    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" opacity="0"/><path d="M22 6l-10 7L2 6"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>;
const IconTrash   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconDownload= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconHistory = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 5v4h4"/><polyline points="12 8 12 12 15 14"/></svg>;

// ── Compact summary widget (supports the table; doesn't compete with it) ──
// Small colored icon chip + tight value/label pair. No full-bleed gradient,
// no oversized shadow — these are secondary at-a-glance metrics, and the
// Asset Inventory table below remains the visual focus of the page.
const KpiCard = ({ icon, label, value, sub, gradient, onClick, active }) => (
  <div
    className={`kpi-compact ${onClick ? "clickable" : ""} ${active ? "is-active" : ""}`}
    onClick={onClick}
    title={sub ? `${label} · ${sub}` : label}
  >
    <div className="kpi-compact-icon" style={{ background: gradient }}>{icon}</div>
    <div className="kpi-compact-body">
      {value === null || value === undefined
        ? <div className="kpi-compact-value-skeleton" />
        : <div className="kpi-compact-value"><CountUp value={value} /></div>}
      <div className="kpi-compact-label">{label}</div>
    </div>
    {active && <span className="kpi-compact-active-dot" aria-label="Filter active" />}
  </div>
);

// ── Three-dot row action menu ──────────────────────────────────────
// Enterprise-grade dropdown: renders into a portal (so it's never clipped
// by the table's overflow/scroll), measures available viewport space to
// flip up/left as needed, and supports full keyboard navigation.
const ACTION_MENU_WIDTH = 232;
const ACTION_MENU_MARGIN = 8;

const ActionMenu = ({ items, open, onToggle, onClose }) => {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const [coords, setCoords] = useState(null); // { top, left, openUp }
  const [activeIndex, setActiveIndex] = useState(-1);

  const actionableItems = items.filter((it) => it && !it.divider);

  // ── Position the menu relative to the trigger, flipping to stay on-screen ──
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
    top = Math.max(ACTION_MENU_MARGIN, Math.min(top, vh - ACTION_MENU_MARGIN - (openUp ? 0 : 0)));

    // Prefer aligning the menu's right edge with the trigger's right edge;
    // fall back to the left edge if that would overflow off-screen.
    let left = rect.right - ACTION_MENU_WIDTH;
    if (left < ACTION_MENU_MARGIN) left = rect.left;
    if (left + ACTION_MENU_WIDTH > vw - ACTION_MENU_MARGIN) left = vw - ACTION_MENU_WIDTH - ACTION_MENU_MARGIN;
    left = Math.max(ACTION_MENU_MARGIN, left);

    setCoords({ top, left, openUp });
  }, [actionableItems.length]);

  useLayoutEffect(() => {
    if (!open) { setCoords(null); return; }
    computePosition();
    // Menu isn't in the DOM yet on the very first pass (height was estimated),
    // so measure again on the next frame once it has actually rendered.
    const raf = requestAnimationFrame(computePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, computePosition]);

  // Close on outside click, Escape, scroll, or resize; keep position fresh.
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

  // Focus management: land on the first item when opened via keyboard/mouse.
  useEffect(() => {
    if (open) setActiveIndex(0);
    else setActiveIndex(-1);
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
// ── Skeleton loader ──────────────────────────────────────────────
const SkeletonRow = () => {
  const cell = (w = 80) => (
    <td>
      <div className="skeleton skeleton-text" style={{ width: w, margin: 0 }} />
    </td>
  );
  return <tr><td></td>{cell(30)}{cell(160)}{cell(140)}{cell(110)}{cell(90)}{cell(30)}</tr>;
};

// ── Return Dialog (Modal) ────────────────────────────────────────
const ReturnDialog = ({ asset, onClose, onConfirm, saving }) => {
  const [condition, setCondition] = useState("Good");
  const [nextStatus, setNextStatus] = useState("Available");
  // "form" while choosing condition/status, "emailChoice" once the admin
  // clicks Confirm Return, asking whether to send the return email.
  const [stage, setStage] = useState("form");

  // Reset local state whenever a new asset is opened into this dialog.
  useEffect(() => {
    setCondition("Good");
    setNextStatus("Available");
    setStage("form");
  }, [asset]);

  if (!asset) return null;

  const closeAndReset = () => {
    setStage("form");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={closeAndReset}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 className="modal-title">Return Asset</h3>
            <div className="card-subtitle" style={{ marginTop: 4 }}>
              {asset.laptopName} · SN: {asset.serialNumber}
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={closeAndReset} aria-label="Close">
            ✕
          </button>
        </div>

        {stage === "form" ? (
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="field">
              <label className="field-label">Returned Condition</label>
              <div className="selector-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                {["Excellent","Good","Fair","Faulty","Damaged"].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`btn btn-sm ${condition === c ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setCondition(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field-label">Move Asset To</label>
              <select
                className="input"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
              >
                <option value="Available">Available — Ready to reassign</option>
                <option value="Spare">Spare — Keep in reserve</option>
                <option value="Under Repair">Under Repair — Send for servicing</option>
                <option value="Faulty">Faulty — Flag as defective</option>
                <option value="Retired">Retired — End of life</option>
              </select>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={closeAndReset}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex:1 }}
                onClick={() => setStage("emailChoice")}
                disabled={saving}
              >
                ↩ Confirm Return
              </button>
            </div>
          </div>
        ) : (
          /* Email choice — Yes sends the return email then completes the return,
             No completes the return without emailing, Cancel closes without
             returning the asset at all. */
          <div className="modal-body" style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)", marginBottom: 24, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
              Do you want to send an Asset Return email to the employee?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-secondary" onClick={closeAndReset} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => onConfirm(asset.assetId, { condition, nextStatus, sendReturnEmail: false })}
                disabled={saving}
              >
                No
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onConfirm(asset.assetId, { condition, nextStatus, sendReturnEmail: true })}
                disabled={saving}
                style={{ minWidth: 110 }}
              >
                {saving ? "Sending…" : "Yes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Asset type → icon / gradient (drives the drawer hero) ──────────
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

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
};

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

// ── Asset Detail Drawer ─────────────────────────────────────────
const AssetDetailDrawer = ({ asset, onClose, onEdit, focusPanel }) => {
  const [copied, setCopied] = useState(false);
  if (!asset) return null;

  const visual = ASSET_TYPE_VISUALS[asset.assetType] || DEFAULT_TYPE_VISUAL;
  const style = conditionStyles[asset.assetCondition] || conditionStyles["New"];
  const specs = [asset.processor, asset.ram, asset.storage].filter(Boolean).join(" · ");

  const copySerial = async () => {
    if (!asset.serialNumber) return;
    try {
      await navigator.clipboard.writeText(asset.serialNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch { /* clipboard permission denied — silently ignore */ }
  };

  const warrantyDays = daysUntil(asset.warrantyExpiry);

  // Build the lifecycle timeline from whichever dates actually exist.
  const timeline = [];
  if (asset.purchaseDate) {
    timeline.push({ label: "Purchased", date: formatDate(asset.purchaseDate), state: "done" });
  }
  if (asset.warrantyExpiry) {
    const expired = warrantyDays !== null && warrantyDays < 0;
    const soon = warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 60;
    timeline.push({
      label: "Warranty",
      date: formatDate(asset.warrantyExpiry),
      state: expired ? "danger" : soon ? "warn" : "done",
      badge: expired ? "Expired" : soon ? `${warrantyDays}d left` : null,
      badgeStyle: expired
        ? { background: "var(--danger-bg)", color: "var(--danger)" }
        : { background: "var(--warning-bg)", color: "var(--warning)" },
    });
  }
  if (asset.assignedDate) {
    timeline.push({ label: `Assigned${asset.employeeName ? ` to ${asset.employeeName}` : ""}`, date: formatDate(asset.assignedDate), state: "done" });
  }
  if (asset.returnedStatus === "Yes" && asset.returnDate) {
    timeline.push({ label: "Returned", date: formatDate(asset.returnDate), state: "done" });
  }
  if (asset.relievedStatus === "Yes" && asset.relievedDate) {
    timeline.push({ label: "Employee relieved", date: formatDate(asset.relievedDate), state: "warn" });
  }

  return (
    <div className="asset-drawer-overlay" onClick={onClose}>
      <div className="asset-drawer" onClick={(e) => e.stopPropagation()}>

        {/* ── Hero ── */}
        <div className="asset-drawer-hero" style={{ background: visual.gradient }}>
          <button className="asset-drawer-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="asset-drawer-icon">{visual.icon}</div>
          <h3 className="asset-drawer-name">{asset.laptopName}</h3>
          <div className="asset-drawer-sub">{asset.assetType}{asset.brand ? ` · ${asset.brand}` : ""}{asset.model ? ` ${asset.model}` : ""}</div>
          <div className="asset-drawer-pills">
            <StatusPill status={asset.assetStatus} />
            <span className="pill" style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
              {asset.assetCondition}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="asset-drawer-body">

          <div className="asset-drawer-section">
            <div className="asset-drawer-section-title">Serial Number</div>
            <div className="asset-drawer-serial">
              <span>{asset.serialNumber || "—"}</span>
              {asset.serialNumber && (
                <button className={`asset-drawer-copy-btn${copied ? " is-copied" : ""}`} onClick={copySerial}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>

          <div className="asset-drawer-section">
            <div className="asset-drawer-section-title">Overview</div>
            <div className="asset-drawer-grid">
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Location</div>
                <div className="asset-drawer-stat-value">{asset.location || "—"}</div>
              </div>
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Vendor</div>
                <div className="asset-drawer-stat-value">{asset.vendor || "—"}</div>
              </div>
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Cost</div>
                <div className="asset-drawer-stat-value">{asset.assetCost ? `₹${asset.assetCost}` : "—"}</div>
              </div>
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Email Status</div>
                <div className="asset-drawer-stat-value"><EmailStatusPill status={asset.emailStatus} /></div>
              </div>
            </div>
            {specs && (
              <div className="asset-drawer-stat" style={{ marginTop: 12 }}>
                <div className="asset-drawer-stat-label">Specifications</div>
                <div className="asset-drawer-stat-value">{specs}</div>
              </div>
            )}
          </div>

          <div className="asset-drawer-section">
            <div className="asset-drawer-section-title">Assignment</div>
            {asset.employeeName ? (
              <>
                <div className="asset-drawer-assignee">
                  <div className="asset-drawer-avatar">{getInitials(asset.employeeName)}</div>
                  <div>
                    <div className="asset-drawer-assignee-name">{asset.employeeName}</div>
                    <div className="asset-drawer-assignee-meta">
                      {asset.employeeRole || "Employee"}{asset.employeeId ? ` · ${asset.employeeId}` : ""}
                    </div>
                  </div>
                </div>
                <div className="asset-drawer-stat" style={{ marginTop: 12 }}>
                  <div className="asset-drawer-stat-label">Assignment Type</div>
                  <div className="asset-drawer-stat-value">
                    {asset.assignmentType === "Temporary" ? "⏳ Temporary" : "🔒 Permanent"}
                  </div>
                </div>
                {asset.assignmentType === "Temporary" && (
                  <>
                    <div className="asset-drawer-stat" style={{ marginTop: 8 }}>
                      <div className="asset-drawer-stat-label">Reason</div>
                      <div className="asset-drawer-stat-value">{asset.temporaryReason || "—"}</div>
                    </div>
                    <div className="asset-drawer-stat" style={{ marginTop: 8 }}>
                      <div className="asset-drawer-stat-label">Duration / Return By</div>
                      <div className="asset-drawer-stat-value">
                        {asset.temporaryDurationDays ? `${asset.temporaryDurationDays} day(s)` : "—"}
                        {asset.temporaryExpiryDate ? ` · due ${formatDate(asset.temporaryExpiryDate)}` : ""}
                        {asset.temporaryReturnReminderSent === "Yes" && (
                          <span className="asset-drawer-tl-badge" style={{ marginLeft: 8, background: "#fee2e2", color: "#b91c1c" }}>
                            Expired — reminder sent
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {asset.oldAssetIssues && (
                  <div className="asset-drawer-stat" style={{ marginTop: 8 }}>
                    <div className="asset-drawer-stat-label">Issues Noted with Old Asset</div>
                    <div className="asset-drawer-stat-value">{asset.oldAssetIssues}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="asset-drawer-empty">Not currently assigned to anyone.</div>
            )}
          </div>

          {timeline.length > 0 && (
            <div className="asset-drawer-section">
              <div className="asset-drawer-section-title">Lifecycle</div>
              <div className="asset-drawer-timeline">
                {timeline.map((t, i) => (
                  <div key={i} className={`asset-drawer-tl-item is-${t.state}`}>
                    <div className="asset-drawer-tl-dot" />
                    <div className="asset-drawer-tl-label">
                      {t.label}
                      {t.badge && <span className="asset-drawer-tl-badge" style={t.badgeStyle}>{t.badge}</span>}
                    </div>
                    <div className="asset-drawer-tl-date">{t.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.remarks && (
            <div className="asset-drawer-section">
              <div className="asset-drawer-section-title">Remarks</div>
              <div className="asset-drawer-notes">{asset.remarks}</div>
            </div>
          )}

          <div className="asset-drawer-section">
            <div className="asset-drawer-section-title">More</div>
            <AssetExtras key={`${asset.assetId}-${focusPanel || "default"}`} asset={asset} apiBase={API} initialPanel={focusPanel || null} />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="asset-drawer-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onEdit(asset)}>✏️ Edit Asset</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────
export default function Assets() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [returnTarget, setReturnTarget] = useState(null);
  const [returning, setReturning] = useState(false);
  const [viewingAsset, setViewingAsset] = useState(null); // asset currently shown in the detail drawer
  const [viewingFocusPanel, setViewingFocusPanel] = useState(null); // which AssetExtras tab to auto-open (e.g. "timeline" for Asset History)
  const [emailTarget, setEmailTarget] = useState(null); // asset currently in the Send Email modal
  const [updating, setUpdating] = useState(new Set());
  const [editingAsset, setEditingAsset] = useState(null); // null = add mode, asset obj = edit mode
  const [employeeEmailById, setEmployeeEmailById] = useState({}); // employeeId -> email, for the Send Email gate/modal
  const navigate = useNavigate();

  // Premium UI state
  const [selectedIds, setSelectedIds] = useState(new Set());   // bulk-select checkboxes
  const [openMenuId, setOpenMenuId] = useState(null);           // which row's ⋯ menu is open
  const [editingConditionId, setEditingConditionId] = useState(null); // which row's condition is in "edit" mode
  const [quickFilter, setQuickFilter] = useState(null);         // "recent" | "warranty" | null — from KPI cards

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/assets`)
      .then((r) => { setAssets(r.data); setError(""); })
      .catch(() => { setAssets([]); setError("Couldn't load assets. Is the Spring Boot API running on :8080?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Deep-link support: scanning an asset's QR code opens ?assetId=<id>,
  // so once assets are loaded, pop that asset straight into the drawer.
  useEffect(() => {
    const qId = searchParams.get("assetId");
    if (qId && assets.length > 0) {
      const match = assets.find((a) => String(a.assetId) === String(qId));
      if (match) setViewingAsset(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  // Deep-link support: the Asset Details page's "Edit Asset" button links
  // back here with ?edit=<id>, so once assets are loaded, open that asset
  // straight into the existing edit form and scroll it into view.
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && assets.length > 0) {
      const match = assets.find((a) => String(a.assetId) === String(editId));
      if (match) {
        openEdit(match);
        requestAnimationFrame(() => {
          document.getElementById("asset-edit-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  // Employee emails, used to gate/populate the "Send Email" action
  useEffect(() => {
    axios.get(`${API}/api/admin/employees`)
      .then((r) => {
        const map = {};
        (r.data || []).forEach((e) => { map[e.employeeId] = e.email; });
        setEmployeeEmailById(map);
      })
      .catch(() => { /* Send Email button simply stays hidden if this fails */ });
  }, []);

  // ── Form helpers ──────────────────────────────────────────────
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  // ── Save asset ──────────────────────────────────────────────────
  const saveAsset = () => {
    const required = [
      ["assetType", "Asset Type"],
      ["laptopName", "Asset Name"],
      ["brand", "Brand"],
      ["model", "Model"],
      ["serialNumber", "Serial Number"],
      ["location", "Location"],
    ];
    for (const [k, label] of required) {
      if (!form[k]?.trim()) {
        toast(`${label} is required.`, "error");
        return;
      }
    }
    setSaving(true);
    axios.post(`${API}/assets`, form)
      .then(() => {
        toast("Asset added to inventory.", "success");
        setForm(EMPTY_FORM);
        setShowForm(false);
        loadData();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't save asset.", "error"))
      .finally(() => setSaving(false));
  };

  // ── Open edit form ──────────────────────────────────────────────
  const openEdit = (asset) => {
    setEditingAsset(asset);
    setForm({
      assetType:      asset.assetType      || "",
      laptopName:     asset.laptopName     || "",
      brand:          asset.brand          || "",
      model:          asset.model          || "",
      serialNumber:   asset.serialNumber   || "",
      location:       asset.location       || "",
      assetStatus:    asset.assetStatus    || "Available",
      assetCondition: asset.assetCondition || "Good",
      purchaseDate:   asset.purchaseDate   || "",
      warrantyExpiry: asset.warrantyExpiry || "",
      vendor:         asset.vendor         || "",
      assetCost:      asset.assetCost      || "",
      processor:      asset.processor      || "",
      ram:            asset.ram            || "",
      storage:        asset.storage        || "",
      remarks:        asset.remarks        || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Save edited asset ───────────────────────────────────────────
  const saveEdit = () => {
    const required = [
      ["assetType",    "Asset Type"],
      ["laptopName",   "Asset Name"],
      ["brand",        "Brand"],
      ["model",        "Model"],
      ["serialNumber", "Serial Number"],
      ["location",     "Location"],
    ];
    for (const [k, label] of required) {
      if (!form[k]?.trim()) { toast(`${label} is required.`, "error"); return; }
    }
    setSaving(true);
    axios.put(`${API}/assets/${editingAsset.assetId}`, form)
      .then(() => {
        toast("Asset updated successfully.", "success");
        setShowForm(false);
        setEditingAsset(null);
        setForm(EMPTY_FORM);
        loadData();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't update asset.", "error"))
      .finally(() => setSaving(false));
  };

  // ── Cancel form ─────────────────────────────────────────────────
  const cancelForm = () => {
    setShowForm(false);
    setEditingAsset(null);
    setForm(EMPTY_FORM);
  };

  // ── Return asset ──────────────────────────────────────────────
  const handleReturn = (assetId, { condition, nextStatus, sendReturnEmail }) => {
    setReturning(true);
    axios.put(`${API}/assets/return/${assetId}`, {
      condition,
      assetStatus: nextStatus,
      sendReturnEmail: sendReturnEmail ? "true" : "false",
    })
      .then(() => {
        toast(
          sendReturnEmail
            ? "Asset returned and return email sent to the employee."
            : "Asset returned and inventory updated.",
          "success"
        );
        setReturnTarget(null);
        loadData();
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Couldn't process return. Is the API running?", "error");
      })
      .finally(() => setReturning(false));
  };

  // ── Send assignment email ───────────────────────────────────────
  const handleEmailSent = (updatedAsset, message, isError = false) => {
    if (isError) {
      toast(message, "error");
      // Reflect the failure immediately without a full reload
      setAssets((prev) => prev.map((a) =>
        a.assetId === emailTarget?.assetId ? { ...a, emailStatus: "Failed" } : a
      ));
      return;
    }
    toast(message, "success");
    setEmailTarget(null);
    if (updatedAsset) {
      setAssets((prev) => prev.map((a) => (a.assetId === updatedAsset.assetId ? updatedAsset : a)));
    } else {
      loadData();
    }
  };

  // ── Delete asset ──────────────────────────────────────────────
  const deleteAsset = (id) => {
    if (!window.confirm("Permanently delete this asset? This cannot be undone.")) return;
    axios.delete(`${API}/assets/${id}`)
      .then(() => { toast("Asset deleted.", "success"); loadData(); })
      .catch(() => toast("Couldn't delete asset.", "error"));
  };

  // ── Update condition (send full object) ──────────────────────
  const updateAsset = (assetId, fieldName, newValue) => {
    if (updating.has(assetId)) return;

    // Find current asset
    const currentAsset = assets.find(a => a.assetId === assetId);
    if (!currentAsset) return;

    // Build updated full object
    const updatedAsset = {
      ...currentAsset,
      [fieldName]: newValue
    };

    // Optimistic UI
    setAssets(prev =>
      prev.map(a =>
        a.assetId === assetId ? updatedAsset : a
      )
    );

    setUpdating(prev => new Set(prev).add(assetId));

    // Send full object
    axios.put(`${API}/assets/${assetId}`, updatedAsset)
      .then(() => {
        toast("Asset updated successfully.", "success");
      })
      .catch((err) => {
        // Log detailed error for debugging
        console.error("Update error:", err.response?.data || err.message);
        toast(err.response?.data?.message || "Failed to update asset.", "error");
        loadData(); // revert
      })
      .finally(() => {
        setUpdating(prev => {
          const next = new Set(prev);
          next.delete(assetId);
          return next;
        });
      });
  };

  // ── Derived data ──────────────────────────────────────────────
  const uniqueTypes = useMemo(
    () => ["All", ...new Set(assets.map(a => a.assetType).filter(Boolean))],
    [assets]
  );

  // Global search now spans every field a helpdesk admin would actually search by.
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return assets
      .filter(a => {
        if (!q) return true;
        return [
          a.laptopName, a.assetId, a.serialNumber, a.brand, a.model,
          a.vendor, a.location, a.assetType, a.employeeName, a.employeeId,
        ].some(v => (v ?? "").toString().toLowerCase().includes(q));
      })
      .filter(a => statusFilter === "All" || a.assetStatus === statusFilter)
      .filter(a => typeFilter === "All" || a.assetType === typeFilter)
      .filter(a => locationFilter === "All" || (a.location || "") === locationFilter)
      .filter(a => {
        if (quickFilter === "recent") {
          const d = daysUntil(a.purchaseDate);
          return d !== null && d >= -30 && d <= 0;
        }
        if (quickFilter === "warranty") {
          const d = daysUntil(a.warrantyExpiry);
          return d !== null && d >= 0 && d <= 60;
        }
        return true;
      });
  }, [assets, searchText, statusFilter, typeFilter, locationFilter, quickFilter]);

  const anyFilterActive = !!(searchText || statusFilter !== "All" || typeFilter !== "All" || locationFilter !== "All" || quickFilter);
  const clearAllFilters = () => {
    setSearchText(""); setStatusFilter("All"); setTypeFilter("All"); setLocationFilter("All"); setQuickFilter(null);
  };

  const counts = useMemo(() => ({
    total: assets.length,
    available: assets.filter(a => a.assetStatus === "Available").length,
    assigned: assets.filter(a => a.assetStatus === "Assigned").length,
    spare: assets.filter(a => a.assetStatus === "Spare").length,
    underRepair: assets.filter(a => a.assetStatus === "Under Repair").length,
    faulty: assets.filter(a => a.assetStatus === "Faulty").length,
    recentlyAdded: assets.filter(a => { const d = daysUntil(a.purchaseDate); return d !== null && d >= -30 && d <= 0; }).length,
    warrantyExpiring: assets.filter(a => { const d = daysUntil(a.warrantyExpiry); return d !== null && d >= 0 && d <= 60; }).length,
  }), [assets]);

  const kpis = [
    { key: "Total",        label: "Total Assets",       value: counts.total,            sub: "All locations",           icon: <IconBox/>,      gradient: "linear-gradient(135deg,#60a5fa,#2563eb)", glow: "#2563eb40" },
    { key: "Assigned",     label: "Assigned",           value: counts.assigned,         sub: "In active use",           icon: <IconLink/>,     gradient: "linear-gradient(135deg,#60a5fa,#1d4ed8)", glow: "#1d4ed840" },
    { key: "Available",    label: "Available",          value: counts.available,        sub: "Ready to assign",         icon: <IconCheck/>,    gradient: "linear-gradient(135deg,#34d399,#059669)", glow: "#10b98140" },
    { key: "Faulty",       label: "Faulty",              value: counts.faulty,           sub: "Defective",               icon: <IconAlert/>,    gradient: "linear-gradient(135deg,#f87171,#dc2626)", glow: "#dc262640" },
    { key: "Spare",        label: "Spare",               value: counts.spare,            sub: "In reserve",              icon: <IconArchive/>,  gradient: "linear-gradient(135deg,#fbbf24,#ca8a04)", glow: "#d9770640" },
    { key: "Under Repair", label: "Under Maintenance",   value: counts.underRepair,      sub: "At service",              icon: <IconWrench/>,   gradient: "linear-gradient(135deg,#fb923c,#ea580c)", glow: "#ea580c40" },
    { key: "__recent",     label: "Recently Added",      value: counts.recentlyAdded,    sub: "Purchased last 30 days",  icon: <IconClock/>,    gradient: "linear-gradient(135deg,#a78bfa,#7c3aed)", glow: "#7c3aed40", quick: "recent" },
    { key: "__warranty",   label: "Warranty Expiring",   value: counts.warrantyExpiring, sub: "Within 60 days",           icon: <IconShield/>,   gradient: "linear-gradient(135deg,#fb7185,#e11d48)", glow: "#e11d4840", quick: "warranty" },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <Layout
      title="Assets"
      subtitle="Manage your IT asset inventory"
      actions={
        <button
          className="btn btn-primary"
          onClick={() => { if (showForm) { cancelForm(); } else { setEditingAsset(null); setForm(EMPTY_FORM); setShowForm(true); } }}
          style={{ display:"flex", alignItems:"center", gap:6 }}
        >
          {showForm ? "✕ Cancel" : "+ Add Asset"}
        </button>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="card" style={{
          marginBottom:20,
          borderColor:"#fecaca",
          background:"#fef2f2",
          padding:"12px 18px",
          fontSize:13,
          color:"#991b1b",
          display:"flex", gap:8, alignItems:"center",
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="asset-kpi-grid">
        {kpis.map(s => {
          const active = s.quick ? quickFilter === s.quick : statusFilter === s.key;
          const toggle = () => {
            if (s.quick) { setQuickFilter(active ? null : s.quick); }
            else { setStatusFilter(active ? "All" : s.key); }
          };
          return (
            <KpiCard
              key={s.key}
              icon={s.icon}
              label={s.label}
              value={loading ? null : s.value}
              sub={s.sub}
              gradient={s.gradient}
              glow={s.glow}
              onClick={toggle}
              active={active}
            />
          );
        })}
      </div>

      {/* ── Add Asset Form ── */}
      {showForm && (
        <div id="asset-edit-form" className="card" style={{ marginBottom:28, animation:"fadeIn 0.2s ease" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{editingAsset ? "Edit Asset" : "Register New Asset"}</div>
              <div className="card-subtitle">{editingAsset ? `Editing: ${editingAsset.laptopName} · ${editingAsset.serialNumber}` : "Fill in the details below to add a device to inventory"}</div>
            </div>
          </div>
          <div className="card-body">
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

            <div style={{ display:"flex", gap:12, marginTop:24, paddingTop:20, borderTop:"1px solid var(--gray-100)" }}>
              <button className="btn btn-primary" onClick={editingAsset ? saveEdit : saveAsset} disabled={saving}>
                {saving ? "Saving…" : editingAsset ? "✓ Save Changes" : "✓ Add to Inventory"}
              </button>
              <button className="btn btn-secondary" onClick={cancelForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Asset Table ── */}
      <div className="card">
        <div className="asset-toolbar">
          <div className="asset-toolbar-top">
            <div>
              <div className="card-title">Asset Inventory</div>
              <div className="card-subtitle">
                {loading ? "Loading…" : `${filtered.length} of ${assets.length} assets`}
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={loadData} disabled={loading} title="Refresh">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
          </div>

          {/* Large global search */}
          <div className="asset-global-search">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by asset name, ID, serial number, employee, vendor, model, or location…"
            />
            {searchText && (
              <button className="asset-global-search-clear" onClick={() => setSearchText("")} aria-label="Clear search">✕</button>
            )}
          </div>

          {/* Filter chips */}
          <div className="asset-filter-chips">
            <label className={`filter-chip ${typeFilter !== "All" ? "is-set" : ""}`}>
              <span>Type</span>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                {uniqueTypes.map(t => <option key={t} value={t}>{t === "All" ? "All types" : t}</option>)}
              </select>
            </label>
            <label className={`filter-chip ${statusFilter !== "All" ? "is-set" : ""}`}>
              <span>Status</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All statuses</option>
                {ASSET_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className={`filter-chip ${locationFilter !== "All" ? "is-set" : ""}`}>
              <span>Location</span>
              <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
                <option value="All">All locations</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className={`filter-chip ${quickFilter === "warranty" ? "is-set" : ""}`}>
              <span>Warranty</span>
              <select
                value={quickFilter === "warranty" ? "expiring" : "any"}
                onChange={e => setQuickFilter(e.target.value === "expiring" ? "warranty" : null)}
              >
                <option value="any">Any</option>
                <option value="expiring">Expiring in 60 days</option>
              </select>
            </label>
            {anyFilterActive && (
              <button className="filter-chip filter-chip-clear" onClick={clearAllFilters}>
                ✕ Clear Filters
              </button>
            )}
          </div>

          {/* Bulk action bar — appears once rows are selected */}
          {selectedIds.size > 0 && (
            <div className="bulk-bar">
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
                  const rows = filtered.filter(a => selectedIds.has(a.assetId));
                  const cols = ["assetId","laptopName","assetType","brand","model","serialNumber","location","assetStatus","assetCondition","employeeName","vendor","purchaseDate","warrantyExpiry"];
                  const csv = [cols.join(",")].concat(
                    rows.map(a => cols.map(c => `"${(a[c] ?? "").toString().replace(/"/g,'""')}"`).join(","))
                  ).join("\n");
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
              <button className="btn btn-sm btn-ghost" onClick={() => setSelectedIds(new Set())}>Clear selection</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width:36 }}></th>
                  <th style={{ width:40, textAlign:"center" }}>#</th>
                  <th>Asset</th>
                  <th>Location</th>
                  <th style={{ minWidth:120 }}>Condition</th>
                  <th>Status</th>
                  <th style={{ width:60 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length:6 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ opacity:0.3 }}>
              {anyFilterActive ? "🔍" : "📦"}
            </div>
            <div className="empty-title">
              {anyFilterActive ? "No matching assets" : "Inventory is empty"}
            </div>
            <div className="empty-sub">
              {anyFilterActive
                ? "Try adjusting your filters or search terms"
                : "Click 'Add Asset' to begin building your inventory"}
            </div>
            {anyFilterActive && (
              <button className="btn btn-secondary" style={{ marginTop:12 }} onClick={clearAllFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width:36 }}>
                    <input
                      type="checkbox"
                      className="row-checkbox"
                      checked={filtered.length > 0 && filtered.every(a => selectedIds.has(a.assetId))}
                      onChange={(e) => {
                        setSelectedIds(e.target.checked ? new Set(filtered.map(a => a.assetId)) : new Set());
                      }}
                      title="Select all"
                    />
                  </th>
                  <th style={{ width:40, textAlign:"center" }}>#</th>
                  <th>Asset</th>
                  <th>Location</th>
                  <th style={{ minWidth:120 }}>Condition</th>
                  <th>Status</th>
                  <th style={{ width:60 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset, index) => {
                  const isUpdating = updating.has(asset.assetId);
                  const style = conditionStyles[asset.assetCondition] || conditionStyles["New"];
                  const employeeEmail = asset.employeeId ? employeeEmailById[asset.employeeId] : null;
                  const canSendEmail = asset.assetStatus === "Assigned" && !!asset.employeeId && !!employeeEmail;
                  const visual = ASSET_TYPE_VISUALS[asset.assetType] || DEFAULT_TYPE_VISUAL;

                  const isSelected = selectedIds.has(asset.assetId);
                  const isEditingCondition = editingConditionId === asset.assetId;

                  const menuItems = [
                    { label: "View Details", icon: <IconEye/>, onClick: () => navigate(`/assets/${asset.assetId}`) },
                    { label: "Edit Asset",   icon: <IconEdit/>, onClick: () => openEdit(asset) },
                    asset.assetStatus === "Available" && {
                      label: "Assign Asset", icon: <IconUserPlus/>,
                      onClick: () => { toast("Opening Employees to assign this asset…", "info"); navigate("/employees"); },
                    },
                    asset.assetStatus === "Assigned" && {
                      label: "Return Asset", icon: <IconReturn/>, onClick: () => setReturnTarget(asset),
                    },
                    canSendEmail && {
                      label: "Send Email", icon: <IconMail/>,
                      onClick: () => setEmailTarget({ ...asset, employeeEmail }),
                    },
                    { label: "Asset History", icon: <IconHistory/>, onClick: () => navigate(`/assets/${asset.assetId}?tab=timeline`) },
                    { divider: true },
                    { label: "Delete Asset", icon: <IconTrash/>, danger: true, onClick: () => deleteAsset(asset.assetId) },
                  ];

                  return (
                    <tr key={asset.assetId} className={`asset-row ${isSelected ? "is-selected" : ""}`}>
                      <td>
                        <input
                          type="checkbox"
                          className="row-checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(asset.assetId); else next.delete(asset.assetId);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td style={{ textAlign:"center", fontWeight:600, color:"var(--gray-400)", fontSize:12 }}>
                        {index + 1}
                      </td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{
                            width:34, height:34, borderRadius:9, flexShrink:0,
                            background: visual.gradient,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:16,
                          }}>
                            {visual.icon}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div
                              style={{ fontWeight:600, color:"var(--gray-900)", fontSize:13.5, cursor:"pointer" }}
                              onClick={() => navigate(`/assets/${asset.assetId}`)}
                              title="Click to view full details"
                            >
                              {asset.laptopName}
                            </div>
                            <div style={{ fontSize:11.5, color:"var(--gray-500)", marginTop:1, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <span className="tag tag-blue" style={{ padding:"1px 7px", fontSize:10.5 }}>{asset.assetType}</span>
                              {asset.brand && <span>{asset.brand}{asset.model ? ` · ${asset.model}` : ""}</span>}
                              {asset.employeeName && <span>→ {asset.employeeName}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color:"var(--gray-600)" }}>{asset.location || "—"}</td>
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
                          <button
                            className="condition-badge-btn"
                            onClick={() => setEditingConditionId(asset.assetId)}
                            title="Click to change condition"
                          >
                            <ConditionPill condition={asset.assetCondition} />
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                          </button>
                        )}
                      </td>
                      <td><StatusPill status={asset.assetStatus} /></td>
                      <td>
                        <ActionMenu
                          items={menuItems}
                          open={openMenuId === asset.assetId}
                          onToggle={() => setOpenMenuId(openMenuId === asset.assetId ? null : asset.assetId)}
                          onClose={() => setOpenMenuId(null)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReturnDialog
        asset={returnTarget}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleReturn}
        saving={returning}
      />

      <AssetDetailDrawer
        asset={viewingAsset}
        focusPanel={viewingFocusPanel}
        onClose={() => { setViewingAsset(null); setViewingFocusPanel(null); }}
        onEdit={(asset) => { setViewingAsset(null); setViewingFocusPanel(null); openEdit(asset); }}
      />

      <SendEmailModal
        asset={emailTarget}
        onClose={() => setEmailTarget(null)}
        onSent={handleEmailSent}
      />

      {/* Inline styles for component-specific classes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .asset-row td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--gray-100);
          font-size: 13px;
        }
        .asset-row:hover td {
          background: var(--gray-50);
        }
        .asset-row:nth-child(even) td {
          background: #fafcfd;
        }
        .asset-row:nth-child(even):hover td {
          background: var(--gray-50);
        }
        .condition-select {
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid var(--gray-200);
          font-size: 12px;
          background: #fff;
          width: 100%;
          min-width: 110px;
          transition: 0.15s;
          cursor: pointer;
        }
        .condition-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
          outline: none;
        }
        .condition-select:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .asset-row.is-selected td {
          background: var(--primary-50);
        }
      `}</style>
    </Layout>
  );
} 