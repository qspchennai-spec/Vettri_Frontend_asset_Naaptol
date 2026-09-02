import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Router, Network, Shield, Wifi, Server, HardDrive, Printer, Lock,
  Plus, X, Search, RefreshCw, Eye, EyeOff, Copy, Pencil, Trash2,
  Check, AlertTriangle, MoreVertical,
  ShieldCheck, Unlock, TimerReset, Download,
  ArrowUpDown, CheckSquare, Square,
  ShieldAlert, KeyRound, RotateCw, Activity,
  Cable, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle,
  Filter
} from "lucide-react";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import CredentialUnlockDialog from "../components/CredentialUnlockDialog";
import CountUp from "../components/CountUp";
import "./NetworkCredentials.css";

import { API_BASE as API } from "../config";

const DEVICE_TYPES = [
  "Router", "Switch", "Firewall", "Access Point", "Server", "NAS",
  "Printer", "VPN Gateway", "Other",
];
const DEVICE_STATUSES = ["Active", "Inactive", "Maintenance"];
const LOCATIONS = [
  "Mumbai",
];

const DEVICE_TYPE_ICON = {
  Router, Switch: Network, Firewall: Shield, "Access Point": Wifi,
  Server, NAS: HardDrive, Printer, "VPN Gateway": Lock, Other: Network,
};

const EMPTY_FORM = {
  deviceName: "", deviceType: "", brand: "", model: "", ipAddress: "",
  hostname: "", username: "", password: "", enablePassword: "",
  sshPort: "", webPort: "", location: "", vlan: "", isp: "", notes: "",
  deviceStatus: "Active",
};

// ── Helpers ──────────────────────────────────────────────────────
const ROTATION_HEALTHY_DAYS = 90;
const ROTATION_DUE_DAYS = 180;

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function rotationStatus(cred) {
  const age = daysSince(cred.updatedAt || cred.createdAt);
  if (age === null) return { cls: "unknown", label: "Unknown", age: null };
  if (age <= ROTATION_HEALTHY_DAYS) return { cls: "healthy", label: "Healthy", age };
  if (age <= ROTATION_DUE_DAYS) return { cls: "due", label: "Due Soon", age };
  return { cls: "overdue", label: "Overdue", age };
}

function credentialHealth(cred) {
  const rot = rotationStatus(cred);
  if (cred.deviceStatus === "Inactive" || rot.cls === "overdue")
    return { cls: "critical", label: "Critical" };
  if (cred.deviceStatus === "Maintenance" || rot.cls === "due")
    return { cls: "risk", label: "At Risk" };
  if (rot.cls === "unknown") return { cls: "unknown", label: "Unknown" };
  return { cls: "good", label: "Good" };
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const DEVICE_TYPE_GRADIENT = {
  Router:        "linear-gradient(135deg,#2563eb,#1d4ed8)",
  Switch:        "linear-gradient(135deg,#7c3aed,#5b21b6)",
  Firewall:      "linear-gradient(135deg,#dc2626,#991b1b)",
  "Access Point":"linear-gradient(135deg,#d97706,#b45309)",
  Server:        "linear-gradient(135deg,#059669,#065f46)",
  NAS:           "linear-gradient(135deg,#0891b2,#0e7490)",
  Printer:       "linear-gradient(135deg,#475569,#1e293b)",
  "VPN Gateway": "linear-gradient(135deg,#334155,#0f172a)",
  Other:         "linear-gradient(135deg,#64748b,#334155)",
};

// ── Sub‑components ──────────────────────────────────────────────

const DeviceStatusPill = ({ status }) => {
  const cls = { Active: "active", Inactive: "inactive", Maintenance: "maintenance" }[status] || "inactive";
  return (
    <span className={`nc-status-pill ${cls}`}>
      <span className="dot" />
      {status}
    </span>
  );
};

const DeviceTypeIcon = ({ type, size = 14 }) => {
  const Icon = DEVICE_TYPE_ICON[type] || Network;
  return <Icon size={size} />;
};

const RotationBadge = ({ cred }) => {
  const rot = rotationStatus(cred);
  const text = rot.age === null ? rot.label : `${rot.label} · ${rot.age}d`;
  return <span className={`nc-rotation-badge ${rot.cls}`}>{text}</span>;
};

const HealthBadge = ({ cred }) => {
  const h = credentialHealth(cred);
  return (
    <span className={`nc-health-badge ${h.cls}`}>
      {h.cls === "critical" && <AlertTriangle size={10} />}
      {h.cls === "risk" && <AlertCircle size={10} />}
      {h.cls === "good" && <CheckCircle size={10} />}
      {h.label}
    </span>
  );
};

const SkeletonCard = () => (
  <div className="nc-skeleton-card">
    <div className="nc-skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
    <div className="nc-skeleton" style={{ width: "70%", height: 16, marginTop: 12 }} />
    <div className="nc-skeleton" style={{ width: "50%", height: 12, marginTop: 6 }} />
    <div className="nc-skeleton" style={{ width: "80%", height: 12, marginTop: 6 }} />
    <div className="nc-skeleton" style={{ width: "40%", height: 12, marginTop: 6 }} />
  </div>
);

// ── Device Card ──────────────────────────────────────────────────
const DeviceCard = ({
  cred,
  isSelected,
  onSelect,
  onViewDetail,
  onOpenMenu,
  isMenuOpen,
  menuPos,
  onCloseMenu,
  onEdit,
  onDelete,
  onCopyIp,
  onRotatePassword,
  onDownload,
}) => {
  const gradient = DEVICE_TYPE_GRADIENT[cred.deviceType] || DEVICE_TYPE_GRADIENT.Other;

  return (
    <div
      className={`nc-card ${isSelected ? "is-selected" : ""}`}
      onClick={() => onViewDetail(cred)}
    >
      <div className="nc-card-header">
        <div className="nc-card-icon" style={{ background: gradient }}>
          <DeviceTypeIcon type={cred.deviceType} size={20} />
        </div>
        <div className="nc-card-select">
          <button
            className="nc-checkbox-btn"
            onClick={(e) => { e.stopPropagation(); onSelect(cred.id); }}
          >
            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
          <button
            className="nc-card-menu-btn"
            onClick={(e) => { e.stopPropagation(); onOpenMenu(e, cred.id); }}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
      <div className="nc-card-body">
        <div className="nc-card-name">{cred.deviceName || "Unnamed"}</div>
        <div className="nc-card-type">
          <DeviceTypeIcon type={cred.deviceType} size={11} />
          <span>{cred.deviceType || "Unknown"}</span>
          <DeviceStatusPill status={cred.deviceStatus} />
        </div>
        <div className="nc-card-meta">
          {cred.ipAddress && <span className="nc-card-ip">{cred.ipAddress}</span>}
          {cred.location && <span className="nc-card-location">{cred.location}</span>}
        </div>
        <div className="nc-card-badges">
          <HealthBadge cred={cred} />
          <RotationBadge cred={cred} />
        </div>
        <div className="nc-card-updated">
          Updated {formatDate(cred.updatedAt)}
        </div>
      </div>
      {isMenuOpen && menuPos && createPortal(
        <div className="nc-card-menu" style={{ top: menuPos.top, left: menuPos.left }}>
          <button className="nc-menu-item" onClick={() => { onViewDetail(cred); onCloseMenu(); }}>
            <Eye size={14} /> View Details
          </button>
          <button className="nc-menu-item" onClick={() => { onEdit(cred); onCloseMenu(); }}>
            <Pencil size={14} /> Edit
          </button>
          <button className="nc-menu-item" onClick={() => { onCopyIp(cred); onCloseMenu(); }}>
            <Copy size={14} /> Copy IP
          </button>
          <button className="nc-menu-item" onClick={() => { onRotatePassword(cred); onCloseMenu(); }}>
            <KeyRound size={14} /> Rotate Password
          </button>
          <button className="nc-menu-item" onClick={() => { onDownload(cred); onCloseMenu(); }}>
            <Download size={14} /> Download
          </button>
          <div className="nc-menu-divider" />
          <button className="nc-menu-item danger" onClick={() => { onDelete(cred); onCloseMenu(); }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── Detail Modal ─────────────────────────────────────────────────
const DetailModal = ({
  cred,
  onClose,
  onEdit,
  onDelete,
  unlocked,
  revealed,
  revealingId,
  copiedKey,
  onTogglePassword,
  onCopyUsername,
  onCopyPassword,
}) => {
  const [tab, setTab] = useState("overview");
  useEffect(() => { setTab("overview"); }, [cred]);
  if (!cred) return null;

  const gradient = DEVICE_TYPE_GRADIENT[cred.deviceType] || DEVICE_TYPE_GRADIENT.Other;
  const rev = revealed[cred.id] || {};
  const isRevealing = revealingId === cred.id;
  const rot = rotationStatus(cred);

  const tabs = [
    { key: "overview", label: "Overview", icon: ShieldCheck },
    { key: "credentials", label: "Credentials", icon: Lock },
    { key: "connection", label: "Connection", icon: Cable },
    { key: "security", label: "Security", icon: ShieldAlert },
    { key: "timeline", label: "Timeline", icon: Activity },
  ];

  return createPortal(
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nc-detail-modal-header" style={{ background: gradient }}>
          <div className="nc-detail-modal-identity">
            <div className="nc-detail-modal-icon">
              <DeviceTypeIcon type={cred.deviceType} size={28} />
            </div>
            <div>
              <div className="nc-detail-modal-name">{cred.deviceName}</div>
              <div className="nc-detail-modal-sub">
                {cred.deviceType}{cred.brand ? ` · ${cred.brand}` : ""}{cred.model ? ` ${cred.model}` : ""}
              </div>
            </div>
          </div>
          <button className="nc-detail-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
          <div className="nc-detail-modal-status">
            <DeviceStatusPill status={cred.deviceStatus} />
          </div>
        </div>

        <div className="nc-detail-modal-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`nc-detail-tab ${tab === t.key ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="nc-detail-modal-body">
          {tab === "overview" && (
            <>
              <div className="nc-detail-section">
                <h4>Device Summary</h4>
                <div className="nc-detail-grid">
                  <div><label>Type</label><div>{cred.deviceType || "—"}</div></div>
                  <div><label>Vendor</label><div>{cred.brand || "—"}{cred.model ? ` · ${cred.model}` : ""}</div></div>
                  <div><label>Location</label><div>{cred.location || "—"}</div></div>
                  <div><label>Status</label><div><DeviceStatusPill status={cred.deviceStatus} /></div></div>
                </div>
              </div>
              <div className="nc-detail-section">
                <h4>Credential Health</h4>
                <div className="nc-detail-grid">
                  <div><label>Overall</label><div><HealthBadge cred={cred} /></div></div>
                  <div><label>Rotation</label><div><RotationBadge cred={cred} /></div></div>
                </div>
              </div>
              {cred.notes && (
                <div className="nc-detail-section">
                  <h4>Notes</h4>
                  <div className="nc-detail-notes">{cred.notes}</div>
                </div>
              )}
            </>
          )}

          {tab === "credentials" && (
            <div className="nc-detail-section">
              <h4><Lock size={14} /> Access Credentials</h4>
              <div className="nc-detail-secret">
                <span className="nc-detail-secret-label">Username</span>
                <span className="nc-detail-secret-value">
                  {unlocked ? cred.username : "••••••••"}
                </span>
                <div className="nc-detail-secret-actions">
                  <button
                    className={`nc-icon-btn ${copiedKey === `user-${cred.id}` ? "is-copied" : ""}`}
                    onClick={() => onCopyUsername(cred)}
                  >
                    {copiedKey === `user-${cred.id}` ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div className="nc-detail-secret">
                <span className="nc-detail-secret-label">Password</span>
                <span className="nc-detail-secret-value">
                  {isRevealing ? "Decrypting…" : rev.visible ? rev.password : "••••••••"}
                </span>
                <div className="nc-detail-secret-actions">
                  <button
                    className="nc-icon-btn"
                    onClick={() => onTogglePassword(cred)}
                    disabled={isRevealing}
                  >
                    {rev.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    className={`nc-icon-btn ${copiedKey === `pwd-${cred.id}` ? "is-copied" : ""}`}
                    onClick={() => onCopyPassword(cred)}
                    disabled={isRevealing}
                  >
                    {copiedKey === `pwd-${cred.id}` ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              {!unlocked && (
                <div className="nc-detail-lock-hint">
                  <Lock size={12} /> Verify identity to reveal or copy credentials
                </div>
              )}
            </div>
          )}

          {tab === "connection" && (
            <div className="nc-detail-section">
              <h4>Network Details</h4>
              <div className="nc-detail-grid">
                <div><label>IP Address</label><div>{cred.ipAddress || "—"}</div></div>
                <div><label>Hostname</label><div>{cred.hostname || "—"}</div></div>
                <div><label>VLAN</label><div>{cred.vlan || "—"}</div></div>
                <div><label>ISP</label><div>{cred.isp || "—"}</div></div>
                <div><label>SSH Port</label><div>{cred.sshPort || "—"}</div></div>
                <div><label>Web Port</label><div>{cred.webPort || "—"}</div></div>
              </div>
            </div>
          )}

          {tab === "security" && (
            <>
              <div className="nc-detail-section">
                <h4><RotateCw size={14} /> Password Rotation</h4>
                <div className="nc-detail-grid">
                  <div><label>Health</label><div><RotationBadge cred={cred} /></div></div>
                  <div><label>Age</label><div>{rot.age === null ? "—" : `${rot.age} days`}</div></div>
                </div>
              </div>
              <div className="nc-detail-section">
                <h4><ShieldCheck size={14} /> Vault</h4>
                <div className="nc-detail-grid">
                  <div><label>Encryption</label><div>AES-256</div></div>
                  <div><label>Access</label><div>{unlocked ? "Unlocked" : "Locked"}</div></div>
                </div>
              </div>
            </>
          )}

          {tab === "timeline" && (
            <div className="nc-detail-section">
              <h4><Activity size={14} /> Timeline</h4>
              <div className="nc-timeline">
                <div className="nc-timeline-item">
                  <span className="nc-timeline-dot" />
                  <div>
                    <div className="nc-timeline-label">Credential Created</div>
                    <div className="nc-timeline-time">
                      {formatDateTime(cred.createdAt)}{cred.createdBy ? ` · ${cred.createdBy}` : ""}
                    </div>
                  </div>
                </div>
                <div className="nc-timeline-item">
                  <span className="nc-timeline-dot" />
                  <div>
                    <div className="nc-timeline-label">Last Updated</div>
                    <div className="nc-timeline-time">{formatDateTime(cred.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="nc-detail-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => onEdit(cred)}>
            <Pencil size={14} style={{ marginRight: 6 }} /> Edit
          </button>
          <button className="btn btn-danger" onClick={() => onDelete(cred)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Add/Edit Modal ──────────────────────────────────────────────
const CredentialFormModal = ({
  isOpen,
  onClose,
  editingId,
  form,
  setForm,
  formErrors,
  setFormErrors,
  saving,
  onSave,
}) => {
  if (!isOpen) return null;

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (formErrors[key]) setFormErrors((f) => ({ ...f, [key]: undefined }));
    },
  });

  return createPortal(
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nc-modal-header">
          <h3>{editingId ? "Edit Credential" : "Add Network Credential"}</h3>
          <button className="nc-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="nc-modal-body">
          <div className="nc-form-section">Device Information</div>
          <div className="nc-form-grid">
            <div className="field">
              <label>Device Name *</label>
              <input {...field("deviceName")} placeholder="e.g. HQ-Core-Switch-01" />
              {formErrors.deviceName && <span className="field-error">{formErrors.deviceName}</span>}
            </div>
            <div className="field">
              <label>Device Type *</label>
              <select {...field("deviceType")}>
                <option value="">Select type…</option>
                {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              {formErrors.deviceType && <span className="field-error">{formErrors.deviceType}</span>}
            </div>
            <div className="field">
              <label>Brand</label>
              <input {...field("brand")} placeholder="e.g. Cisco" />
            </div>
            <div className="field">
              <label>Model</label>
              <input {...field("model")} placeholder="e.g. Catalyst 2960" />
            </div>
            <div className="field">
              <label>IP Address</label>
              <input {...field("ipAddress")} placeholder="192.168.1.1" />
              {formErrors.ipAddress && <span className="field-error">{formErrors.ipAddress}</span>}
            </div>
            <div className="field">
              <label>Hostname</label>
              <input {...field("hostname")} placeholder="hq-sw-01.lan" />
            </div>
          </div>

          <div className="nc-form-section">Access Credentials</div>
          <div className="nc-form-grid">
            <div className="field">
              <label>Username *</label>
              <input {...field("username")} autoComplete="off" placeholder="admin" />
              {formErrors.username && <span className="field-error">{formErrors.username}</span>}
            </div>
            <div className="field">
              <label>Password {editingId ? "" : "*"}</label>
              <input {...field("password")} type="password" autoComplete="new-password"
                placeholder={editingId ? "Leave blank to keep current" : "Enter password"} />
              {formErrors.password && <span className="field-error">{formErrors.password}</span>}
            </div>
            <div className="field">
              <label>Enable Password</label>
              <input {...field("enablePassword")} type="password" autoComplete="new-password"
                placeholder="Optional privileged-mode password" />
            </div>
            <div className="field">
              <label>SSH Port</label>
              <input {...field("sshPort")} type="number" min="1" max="65535" placeholder="22" />
              {formErrors.sshPort && <span className="field-error">{formErrors.sshPort}</span>}
            </div>
            <div className="field">
              <label>Web Port</label>
              <input {...field("webPort")} type="number" min="1" max="65535" placeholder="443" />
              {formErrors.webPort && <span className="field-error">{formErrors.webPort}</span>}
            </div>
            <div className="field">
              <label>Status</label>
              <select {...field("deviceStatus")}>
                {DEVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="nc-form-section">Location & Network</div>
          <div className="nc-form-grid">
            <div className="field">
              <label>Location</label>
              <select {...field("location")}>
                <option value="">Select Location</option>
                {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div className="field">
              <label>VLAN</label>
              <input {...field("vlan")} placeholder="VLAN 10" />
            </div>
            <div className="field">
              <label>ISP</label>
              <input {...field("isp")} placeholder="Airtel Business" />
            </div>
            <div className="field" style={{ gridColumn: "span 3" }}>
              <label>Notes</label>
              <input {...field("notes")} placeholder="Any additional notes" />
            </div>
          </div>
        </div>
        <div className="nc-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <RefreshCw size={16} className="spinning" /> : editingId ? <Check size={16} /> : <Plus size={16} />}
            {saving ? "Saving…" : editingId ? "Save Changes" : "Add Credential"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Main Component ──────────────────────────────────────────────
export default function NetworkCredentials() {
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────────
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [rotationFilter, setRotationFilter] = useState("All");

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const [revealed, setRevealed] = useState({});
  const [revealingId, setRevealingId] = useState(null);
  const [viewingCred, setViewingCred] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const [unlocked, setUnlocked] = useState(false);
  const [unlockSecondsLeft, setUnlockSecondsLeft] = useState(0);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ── Restore unlock state ──
  useEffect(() => {
    axios.get(`${API}/api/network/credential-access/status`)
      .then((r) => {
        if (r.data?.unlocked) {
          setUnlocked(true);
          setUnlockSecondsLeft(r.data.secondsRemaining || 0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const t = setInterval(() => {
      setUnlockSecondsLeft((s) => {
        if (s <= 1) {
          setUnlocked(false);
          setRevealed({});
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [unlocked]);

  const requireUnlock = useCallback((action) => {
    if (unlocked) { action(); return; }
    setPendingAction(() => action);
    setShowUnlockDialog(true);
  }, [unlocked]);

  const handleUnlocked = (secondsRemaining) => {
    setUnlocked(true);
    setUnlockSecondsLeft(secondsRemaining || 60);
    setShowUnlockDialog(false);
    toast("Verified — credentials unlocked for 60 seconds.", "success");
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

  const closeUnlockDialog = () => {
    setShowUnlockDialog(false);
    setPendingAction(null);
  };

  const flashCopied = (key) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 900);
  };

  // ── Data ──
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/network`)
      .then((r) => { setCredentials(r.data); setError(""); })
      .catch(() => { setCredentials([]); setError("Couldn't load network credentials. Is the Spring Boot API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    document.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openMenuId]);

  // ── Form ──
  const openCreateForm = () => {
    setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); setShowForm(true);
  };
  const openEditForm = (cred) => {
    setEditingId(cred.id);
    setForm({
      deviceName: cred.deviceName || "", deviceType: cred.deviceType || "",
      brand: cred.brand || "", model: cred.model || "",
      ipAddress: cred.ipAddress || "", hostname: cred.hostname || "",
      username: cred.username || "", password: "", enablePassword: "",
      sshPort: cred.sshPort ?? "", webPort: cred.webPort ?? "",
      location: cred.location || "", vlan: cred.vlan || "",
      isp: cred.isp || "", notes: cred.notes || "",
      deviceStatus: cred.deviceStatus || "Active",
    });
    setFormErrors({}); setShowForm(true); setOpenMenuId(null);
  };
  const closeForm = () => {
    setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!form.deviceName.trim()) errs.deviceName = "Device name is required";
    if (!form.deviceType.trim()) errs.deviceType = "Device type is required";
    if (!form.username.trim()) errs.username = "Username is required";
    if (!editingId && !form.password.trim()) errs.password = "Password is required";
    if (form.ipAddress.trim()) {
      const ipv4 = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipv4.test(form.ipAddress.trim())) errs.ipAddress = "Enter a valid IPv4 address";
    }
    if (form.sshPort && (form.sshPort < 1 || form.sshPort > 65535)) errs.sshPort = "Port must be 1–65535";
    if (form.webPort && (form.webPort < 1 || form.webPort > 65535)) errs.webPort = "Port must be 1–65535";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveCredential = () => {
    if (!validate()) { toast("Please fix the highlighted fields.", "error"); return; }
    const payload = {
      ...form,
      sshPort: form.sshPort === "" ? null : Number(form.sshPort),
      webPort: form.webPort === "" ? null : Number(form.webPort),
    };
    if (!payload.password) delete payload.password;
    if (!payload.enablePassword) delete payload.enablePassword;
    setSaving(true);
    const req = editingId
      ? axios.put(`${API}/api/network/${editingId}`, payload)
      : axios.post(`${API}/api/network`, payload);
    req
      .then(() => { toast(editingId ? "Credential updated." : "Credential added.", "success"); closeForm(); loadData(); })
      .catch((e) => toast(e.response?.data?.message || "Couldn't save credential.", "error"))
      .finally(() => setSaving(false));
  };

  // ── Delete ──
  const deleteCredential = (cred) => {
    setOpenMenuId(null);
    if (!window.confirm(`Permanently delete "${cred.deviceName}"? This cannot be undone.`)) return;
    axios.delete(`${API}/api/network/${cred.id}`)
      .then(() => {
        toast("Credential deleted.", "success");
        setRevealed((r) => { const n = { ...r }; delete n[cred.id]; return n; });
        if (viewingCred?.id === cred.id) setViewingCred(null);
        loadData();
      })
      .catch(() => toast("Couldn't delete credential.", "error"));
  };

  // ── Reveal password ──
  const togglePasswordVisible = (cred) => {
    setOpenMenuId(null);
    const cur = revealed[cred.id];
    if (cur?.visible) { setRevealed((r) => ({ ...r, [cred.id]: { ...cur, visible: false } })); return; }
    requireUnlock(() => {
      if (cur?.password !== undefined) { setRevealed((r) => ({ ...r, [cred.id]: { ...cur, visible: true } })); return; }
      setRevealingId(cred.id);
      axios.get(`${API}/api/network/${cred.id}/reveal-password`)
        .then((r) => setRevealed((rv) => ({ ...rv, [cred.id]: { password: r.data.value, visible: true } })))
        .catch((e) => toast(e.response?.data?.message || "Couldn't decrypt password.", "error"))
        .finally(() => setRevealingId(null));
    });
  };

  const copyUsername = (cred) => {
    setOpenMenuId(null);
    requireUnlock(async () => {
      try { await navigator.clipboard.writeText(cred.username || ""); flashCopied(`user-${cred.id}`); toast("Username copied.", "success"); }
      catch { toast("Couldn't copy to clipboard.", "error"); }
    });
  };

  const copyPassword = (cred) => {
    setOpenMenuId(null);
    requireUnlock(async () => {
      try {
        let pwd = revealed[cred.id]?.password;
        if (pwd === undefined) {
          setRevealingId(cred.id);
          const r = await axios.get(`${API}/api/network/${cred.id}/reveal-password`);
          pwd = r.data.value;
          setRevealed((rv) => ({ ...rv, [cred.id]: { password: pwd, visible: rv[cred.id]?.visible || false } }));
        }
        await navigator.clipboard.writeText(pwd || "");
        flashCopied(`pwd-${cred.id}`);
        toast("Password copied.", "success");
      } catch (e) { toast(e.response?.data?.message || "Couldn't copy password.", "error"); }
      finally { setRevealingId(null); }
    });
  };

  // ── Derived data ──
  const uniqueBrands = useMemo(() => ["All", ...new Set(credentials.map((c) => c.brand).filter(Boolean))], [credentials]);
  const uniqueLocations = useMemo(() => ["All", ...new Set(credentials.map((c) => c.location).filter(Boolean))], [credentials]);

  const filtered = useMemo(() =>
    credentials
      .filter((c) => {
        const q = searchText.toLowerCase();
        if (!q) return true;
        return (
          (c.deviceName || "").toLowerCase().includes(q) ||
          (c.ipAddress || "").toLowerCase().includes(q) ||
          (c.hostname || "").toLowerCase().includes(q) ||
          (c.brand || "").toLowerCase().includes(q) ||
          (c.model || "").toLowerCase().includes(q) ||
          (c.location || "").toLowerCase().includes(q) ||
          (c.username || "").toLowerCase().includes(q)
        );
      })
      .filter((c) => typeFilter === "All" || c.deviceType === typeFilter)
      .filter((c) => brandFilter === "All" || c.brand === brandFilter)
      .filter((c) => locationFilter === "All" || c.location === locationFilter)
      .filter((c) => statusFilter === "All" || c.deviceStatus === statusFilter)
      .filter((c) => rotationFilter === "All" || rotationStatus(c).cls === rotationFilter),
    [credentials, searchText, typeFilter, brandFilter, locationFilter, statusFilter, rotationFilter]
  );

  const sorted = useMemo(() => {
    const SORT_ACCESSORS = {
      device:   (c) => (c.deviceName || "").toLowerCase(),
      vendor:   (c) => (c.brand || "").toLowerCase(),
      ip:       (c) => (c.ipAddress || ""),
      location: (c) => (c.location || "").toLowerCase(),
      rotation: (c) => rotationStatus(c).age ?? -1,
      updated:  (c) => new Date(c.updatedAt || c.createdAt || 0).getTime(),
    };
    if (!sortKey) return filtered;
    const acc = SORT_ACCESSORS[sortKey];
    const arr = [...filtered].sort((a, b) => {
      const av = acc(a), bv = acc(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortKey(null); setSortDir("asc");
  };

  useEffect(() => { setPage(1); }, [searchText, typeFilter, brandFilter, locationFilter, statusFilter, rotationFilter, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  const counts = useMemo(() => ({
    total: credentials.length,
    active: credentials.filter((c) => c.deviceStatus === "Active").length,
    unhealthy: credentials.filter((c) => credentialHealth(c).cls === "critical" || credentialHealth(c).cls === "risk").length,
    overdueRotation: credentials.filter((c) => rotationStatus(c).cls === "overdue").length,
  }), [credentials]);

  const rotationBuckets = useMemo(() => {
    const b = { healthy: 0, due: 0, overdue: 0, unknown: 0 };
    credentials.forEach((c) => { b[rotationStatus(c).cls]++; });
    return b;
  }, [credentials]);

  const activeFilterCount = [typeFilter, brandFilter, locationFilter, statusFilter, rotationFilter].filter((v) => v !== "All").length;
  const clearAllFilters = () => {
    setTypeFilter("All");
    setBrandFilter("All");
    setLocationFilter("All");
    setStatusFilter("All");
    setRotationFilter("All");
  };

  // Build active filter tags for display
  const activeFilterTags = useMemo(() => {
    const tags = [];
    if (typeFilter !== "All") tags.push({ label: "Type", value: typeFilter, key: "type" });
    if (brandFilter !== "All") tags.push({ label: "Brand", value: brandFilter, key: "brand" });
    if (locationFilter !== "All") tags.push({ label: "Location", value: locationFilter, key: "location" });
    if (statusFilter !== "All") tags.push({ label: "Status", value: statusFilter, key: "status" });
    if (rotationFilter !== "All") tags.push({ label: "Rotation", value: rotationFilter, key: "rotation" });
    return tags;
  }, [typeFilter, brandFilter, locationFilter, statusFilter, rotationFilter]);

  const removeFilterTag = (key) => {
    switch (key) {
      case "type": setTypeFilter("All"); break;
      case "brand": setBrandFilter("All"); break;
      case "location": setLocationFilter("All"); break;
      case "status": setStatusFilter("All"); break;
      case "rotation": setRotationFilter("All"); break;
      default: break;
    }
  };

  // Selection
  const toggleSelectOne = (id) => {
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const allVisibleSelected = paged.length > 0 && paged.every((c) => selectedIds.has(c.id));
  const toggleSelectAll = () => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (allVisibleSelected) { paged.forEach((c) => n.delete(c.id)); return n; }
      paged.forEach((c) => n.add(c.id));
      return n;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkDeleteSelected = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected credential${ids.length > 1 ? "s" : ""}?`)) return;
    setBulkDeleting(true);
    Promise.allSettled(ids.map((id) => axios.delete(`${API}/api/network/${id}`)))
      .then((results) => {
        const okCount = results.filter((r) => r.status === "fulfilled").length;
        toast(`${okCount} of ${ids.length} credential(s) deleted.`, okCount === ids.length ? "success" : "error");
        clearSelection();
        if (viewingCred && ids.includes(viewingCred.id)) setViewingCred(null);
        loadData();
      })
      .finally(() => setBulkDeleting(false));
  };

  const exportCSV = () => {
    const cols = ["deviceName", "deviceType", "brand", "model", "ipAddress", "hostname",
      "location", "vlan", "isp", "deviceStatus", "username", "createdAt", "updatedAt"];
    const rows = [cols.join(",")];
    sorted.forEach((c) => {
      rows.push(cols.map((k) => {
        const v = c[k] == null ? "" : String(c[k]).replace(/"/g, '""');
        return /[",\n]/.test(v) ? `"${v}"` : v;
      }).join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Exported CSV (credentials/secrets excluded).", "success");
  };

  const downloadCredential = (cred) => {
    setOpenMenuId(null);
    const { password, enablePassword, ...safe } = cred;
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(cred.deviceName || "device").replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const copyIp = async (cred) => {
    setOpenMenuId(null);
    if (!cred.ipAddress) { toast("No IP address on record.", "error"); return; }
    try { await navigator.clipboard.writeText(cred.ipAddress); toast("IP address copied.", "success"); }
    catch { toast("Couldn't copy to clipboard.", "error"); }
  };

  const rotatePassword = (cred) => {
    setOpenMenuId(null);
    openEditForm(cred);
    toast("Enter and save a new password below to complete the rotation.", "success");
  };

  const handleOpenMenu = (e, id) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight && spaceAbove > menuHeight;
    setMenuPos({
      top: openUp ? rect.top - menuHeight - 8 : rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
    setOpenMenuId(id);
  };

  // ── Render ──
  return (
    <>
      <Layout
        title={
          <span className="nc-layout-title">
            <ShieldCheck size={18} />
            <span>Network Credentials</span>
          </span>
        }
        subtitle="Securely manage encrypted infrastructure credentials"
        actions={
          <div className="nc-header-actions">
            <button className="nc-header-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spinning" : ""} />
            </button>
            <button className="nc-header-btn" onClick={exportCSV} disabled={loading || sorted.length === 0}>
              <Download size={16} />
            </button>
            <button className="btn btn-primary nc-header-add" onClick={openCreateForm}>
              <Plus size={16} /> Add Device
            </button>
          </div>
        }
      >
        <div className="nc-page">
          {/* ── Stats Row ── */}
          <div className="nc-stats-row">
            <div className="nc-stat-item">
              <span className="nc-stat-number"><CountUp value={counts.total} /></span>
              <span className="nc-stat-label">Devices</span>
            </div>
            <div className="nc-stat-divider" />
            <div className="nc-stat-item">
              <span className="nc-stat-number"><CountUp value={counts.active} /></span>
              <span className="nc-stat-label">Active</span>
            </div>
            <div className="nc-stat-divider" />
            <div className="nc-stat-item nc-stat-warning">
              <span className="nc-stat-number"><CountUp value={rotationBuckets.overdue} /></span>
              <span className="nc-stat-label">Overdue Rotation</span>
            </div>
            <div className="nc-stat-divider" />
            <div className="nc-stat-item nc-stat-danger">
              <span className="nc-stat-number"><CountUp value={counts.unhealthy} /></span>
              <span className="nc-stat-label">Unhealthy</span>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="nc-filter-bar">
            <div className="nc-filter-bar-main">
              <div className="nc-filter-icon">
                <Filter size={14} />
                {activeFilterCount > 0 && <span className="nc-filter-badge">{activeFilterCount}</span>}
              </div>
              <select
                className="nc-filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select
                className="nc-filter-select"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                {uniqueBrands.map((b) => <option key={b} value={b}>{b === "All" ? "All Brands" : b}</option>)}
              </select>
              <select
                className="nc-filter-select"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                {uniqueLocations.map((l) => <option key={l} value={l}>{l === "All" ? "All Locations" : l}</option>)}
              </select>
              <select
                className="nc-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                {DEVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select
                className="nc-filter-select"
                value={rotationFilter}
                onChange={(e) => setRotationFilter(e.target.value)}
              >
                <option value="All">All Rotation</option>
                <option value="healthy">Healthy</option>
                <option value="due">Due Soon</option>
                <option value="overdue">Overdue</option>
              </select>
              <button
                className="nc-filter-reset-btn"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
              >
                <RefreshCw size={12} /> Reset
              </button>
            </div>
            {activeFilterTags.length > 0 && (
              <div className="nc-filter-tags">
                {activeFilterTags.map((tag) => (
                  <span key={tag.key} className="nc-filter-tag">
                    {tag.label}: {tag.value}
                    <button className="nc-filter-tag-remove" onClick={() => removeFilterTag(tag.key)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Main Content ── */}
          <div className="nc-main-content">
            <div className="nc-toolbar">
              <div className="nc-search">
                <Search size={16} className="nc-search-icon" />
                <input
                  className="nc-search-input"
                  placeholder="Search devices, IPs, hosts…"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText && (
                  <button className="nc-search-clear" onClick={() => setSearchText("")}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="nc-toolbar-actions">
                <span className="nc-result-count">{sorted.length} devices</span>
                <button
                  className="nc-sort-btn"
                  onClick={() => toggleSort("device")}
                  title="Sort by device name"
                >
                  <ArrowUpDown size={14} />
                </button>
                <button
                  className="nc-select-all-btn"
                  onClick={toggleSelectAll}
                  title={allVisibleSelected ? "Deselect all" : "Select all visible"}
                >
                  {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="nc-error-banner">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {unlocked && (
              <div className="nc-unlock-banner">
                <Unlock size={14} />
                <span>Credentials unlocked — auto‑locks in {unlockSecondsLeft}s</span>
                <button
                  className="nc-unlock-lock-btn"
                  onClick={() => { setUnlocked(false); setRevealed({}); axios.post(`${API}/api/network/credential-access/lock`).catch(() => {}); }}
                >
                  <TimerReset size={12} /> Lock now
                </button>
              </div>
            )}

            <div className="nc-card-grid">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : paged.length === 0 ? (
                <div className="nc-empty-state">
                  <div className="nc-empty-icon"><Network size={48} /></div>
                  <h3>{searchText || activeFilterCount > 0 ? "No matching devices" : "No devices yet"}</h3>
                  <p>
                    {searchText || activeFilterCount > 0
                      ? "Try adjusting your search or clearing your filters"
                      : "Click 'Add Device' to register your first credential"}
                  </p>
                  {(searchText || activeFilterCount > 0) && (
                    <button className="btn btn-secondary" onClick={clearAllFilters}>Clear Filters</button>
                  )}
                </div>
              ) : (
                paged.map((cred) => (
                  <DeviceCard
                    key={cred.id}
                    cred={cred}
                    isSelected={selectedIds.has(cred.id)}
                    onSelect={toggleSelectOne}
                    onViewDetail={setViewingCred}
                    onOpenMenu={handleOpenMenu}
                    isMenuOpen={openMenuId === cred.id}
                    menuPos={menuPos}
                    onCloseMenu={() => { setOpenMenuId(null); setMenuPos(null); }}
                    onEdit={openEditForm}
                    onDelete={deleteCredential}
                    onCopyIp={copyIp}
                    onRotatePassword={rotatePassword}
                    onDownload={downloadCredential}
                  />
                ))
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="nc-bulk-bar">
                <span><CheckSquare size={16} /> {selectedIds.size} selected</span>
                <div>
                  <button className="btn btn-secondary btn-sm" onClick={clearSelection}>Clear</button>
                  <button className="btn btn-danger btn-sm" onClick={bulkDeleteSelected} disabled={bulkDeleting}>
                    <Trash2 size={14} /> {bulkDeleting ? "Deleting…" : "Delete Selected"}
                  </button>
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="nc-pagination">
                <span>Page {currentPage} of {totalPages}</span>
                <div>
                  <button
                    className="nc-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="nc-page-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>

      {/* ── Detail Modal ── */}
      {viewingCred && (
        <DetailModal
          cred={viewingCred}
          onClose={() => setViewingCred(null)}
          onEdit={(cred) => { setViewingCred(null); openEditForm(cred); }}
          onDelete={(cred) => { setViewingCred(null); deleteCredential(cred); }}
          unlocked={unlocked}
          revealed={revealed}
          revealingId={revealingId}
          copiedKey={copiedKey}
          onTogglePassword={togglePasswordVisible}
          onCopyUsername={copyUsername}
          onCopyPassword={copyPassword}
        />
      )}

      {/* ── Add/Edit Modal ── */}
      <CredentialFormModal
        isOpen={showForm}
        onClose={closeForm}
        editingId={editingId}
        form={form}
        setForm={setForm}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        saving={saving}
        onSave={saveCredential}
      />

      {/* ── OTP Unlock Dialog – MUST be LAST for highest z-index ── */}
      {showUnlockDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ pointerEvents: 'auto', zIndex: 999999, position: 'relative' }}>
            <CredentialUnlockDialog onUnlocked={handleUnlocked} onClose={closeUnlockDialog} />
          </div>
        </div>
      )}
    </>
  );
}