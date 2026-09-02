import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import ActionMenu from "../components/ActionMenu";
import { useToast } from "../utils/Toast";
import { useNotifications } from "../context/NotificationContext";
import AssignAssetModal from "../components/AssignAssetModal";
import CountUp from "../components/CountUp";
import "./AdminAssetRequests.css";

import { API_BASE as API } from "../config";
const SAVED_FILTERS_KEY = "arq-saved-filters";
const RECENT_SEARCH_KEY = "arq-recent-searches";

/* ── Status / priority config ─────────────────────────────────────── */
const STATUS_CFG = {
  PENDING:  { label: "Pending",  bg: "#fffbeb", color: "#d97706", border: "#fde68a", dot: "#f59e0b" },
  APPROVED: { label: "Approved", bg: "#dcfce7", color: "#15803d", border: "#86efac", dot: "#16a34a" },
  REJECTED: { label: "Rejected", bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5", dot: "#dc2626" },
};
const URGENCY_CFG = {
  Critical: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5", rank: 3 },
  Urgent:   { bg: "#ffedd5", color: "#c2410c", border: "#fdba74", rank: 2 },
  Normal:   { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", rank: 1 },
};
const PAGE_SIZES = [10, 25, 50];

/* ── Icons (one stroke family, matches the rest of the app) ─────────── */
const Icon = ({ children, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IconClock         = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconCheck         = (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>;
const IconX              = (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>;
const IconAlert          = (p) => <Icon {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></Icon>;
const IconTrendUp        = (p) => <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>;
const IconTrendDown      = (p) => <Icon {...p}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></Icon>;
const IconMinus          = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const IconInbox          = (p) => <Icon {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></Icon>;
const IconGauge          = (p) => <Icon {...p}><path d="M12 14 15 9"/><circle cx="12" cy="14" r="1"/><path d="M2 12a10 10 0 1 1 4 8"/></Icon>;
const IconSearch         = (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></Icon>;
const IconDownload       = (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Icon>;
const IconRefresh        = (p) => <Icon {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Icon>;
const IconFilterX        = (p) => <Icon {...p}><path d="M2 4h20"/><path d="m18 18-6-7.5V4"/><path d="M4.5 10 8 4"/><path d="m14.5 18 3 3M17.5 18l-3 3"/></Icon>;
const IconChevronUpDown  = (p) => <Icon {...p}><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></Icon>;
const IconChevronDown    = (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>;
const IconEye            = (p) => <Icon {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></Icon>;
const IconUserPlus       = (p) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></Icon>;
const IconBuilding       = (p) => <Icon {...p}><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="7" x2="9" y2="7.01"/><line x1="15" y1="7" x2="15" y2="7.01"/><line x1="9" y1="12" x2="9" y2="12.01"/><line x1="15" y1="12" x2="15" y2="12.01"/><line x1="9" y1="17" x2="15" y2="17"/></Icon>;
const IconMapPin         = (p) => <Icon {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></Icon>;
const IconBox            = (p) => <Icon {...p}><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></Icon>;
const IconCalendar       = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>;
const IconPaperclip      = (p) => <Icon {...p}><path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19l-9.2 9.19a1.83 1.83 0 0 1-2.59-2.59l8.49-8.48"/></Icon>;
const IconSliders        = (p) => <Icon {...p}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></Icon>;
const IconBookmark       = (p) => <Icon {...p}><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></Icon>;
const IconZap            = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;

/* ── Helpers ──────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function durationHuman(ms) {
  if (ms == null || Number.isNaN(ms) || ms < 0) return "—";
  const hours = ms / 3.6e6;
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
function initials(name) { return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2); }
function avatarBg(name) { const c = ["#1a56db", "#059669", "#7c3aed", "#b45309", "#be185d"]; return c[(name || "A").charCodeAt(0) % c.length]; }

// SLA bucket for a single request, based on how long it has been (or was) open.
// Also returns a 0-100 "elapsed" figure against a 72h SLA window, used to
// drive the mini progress bar next to the SLA badge.
function slaBucketFor(req) {
  const start = new Date(req.requestedAt).getTime();
  const end = req.resolvedAt ? new Date(req.resolvedAt).getTime() : Date.now();
  const hours = (end - start) / 3.6e6;
  const resolved = req.status !== "PENDING";
  const pct = Math.max(4, Math.min(100, Math.round((hours / 72) * 100)));
  if (hours <= 24) return { key: "on-track", label: resolved ? "Resolved on time" : "On track", pct };
  if (hours <= 72) return { key: "at-risk", label: resolved ? "Resolved late" : "At risk", pct };
  return { key: "breached", label: resolved ? "SLA breached" : "Breached", pct: 100 };
}

// Highlights the portion of `text` matching `query` (case-insensitive) —
// used by the instant-search experience so matches are easy to scan.
function highlightMatch(text, query) {
  const str = text == null ? "" : String(text);
  const q = (query || "").trim();
  if (!q) return str;
  const idx = str.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return str;
  return (
    <>
      {str.slice(0, idx)}
      <mark className="arq-mark">{str.slice(idx, idx + q.length)}</mark>
      {str.slice(idx + q.length)}
    </>
  );
}

// Buckets requests into the last 7 days (oldest → newest) for the KPI
// sparklines. Purely presentational — no bearing on filtering/sorting.
function last7DaySeries(requests, pred) {
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  return days.map((day) => {
    const next = new Date(day); next.setDate(day.getDate() + 1);
    return requests.filter((r) => {
      const t = new Date(r.requestedAt).getTime();
      return t >= day.getTime() && t < next.getTime() && (!pred || pred(r));
    }).length;
  });
}

/* ── Small presentational pieces ─────────────────────────────────── */
function Sparkline({ data, color = "var(--primary)" }) {
  const w = 64, h = 24, pad = 2;
  const max = Math.max(1, ...data);
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="arq-sparkline" aria-hidden="true">
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}
function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.PENDING;
  const IconCmp = status === "APPROVED" ? IconCheck : status === "REJECTED" ? IconX : IconClock;
  return (
    <span className="arq-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      <IconCmp size={11} />{s.label}
    </span>
  );
}
function UrgencyBadge({ urgency }) {
  const u = URGENCY_CFG[urgency] || URGENCY_CFG.Normal;
  return (
    <span className="arq-badge arq-badge-sm" style={{ background: u.bg, color: u.color, borderColor: u.border }}>
      <IconAlert size={10} />{urgency}
    </span>
  );
}
function SlaBadge({ request }) {
  const b = slaBucketFor(request);
  const cls = request.status !== "PENDING" && b.key !== "breached" ? "done" : b.key;
  return (
    <div className="arq-sla-wrap">
      <span className={`sla-badge ${cls}`}>{b.label}</span>
      <div className="arq-sla-bar" aria-hidden="true"><div className={`arq-sla-bar-fill ${cls}`} style={{ width: `${b.pct}%` }} /></div>
    </div>
  );
}
function TrendPill({ pct }) {
  const flat = pct === 0;
  const up = pct > 0;
  return (
    <span className={`arq-kpi-trend ${flat ? "flat" : up ? "up" : "down"}`}>
      {flat ? <IconMinus size={10} /> : up ? <IconTrendUp size={10} /> : <IconTrendDown size={10} />}
      {flat ? "0%" : `${up ? "+" : ""}${pct}%`}
    </span>
  );
}
function SortHeader({ label, sortKey, active, dir, onSort }) {
  const isActive = active === sortKey;
  return (
    <button type="button" className={`arq-th-sort ${isActive ? "is-active" : ""} ${isActive && dir === "desc" ? "is-desc" : ""}`} onClick={() => onSort(sortKey)}>
      {label}<IconChevronUpDown size={12} />
    </button>
  );
}

/* ── Approval timeline (drawer) ───────────────────────────────────── */
function ApprovalTimeline({ request }) {
  const rejected = request.status === "REJECTED";
  const approved = request.status === "APPROVED";
  const steps = [
    { key: "submitted", title: "Submitted", meta: formatDate(request.requestedAt), state: "done" },
    { key: "review",    title: "Manager & IT Review", meta: request.status === "PENDING" ? "In progress" : "Reviewed", state: request.status === "PENDING" ? "active" : "done" },
    { key: "decision",  title: rejected ? "Rejected" : "Approved", meta: request.resolvedAt ? formatDate(request.resolvedAt) : "Awaiting decision", state: rejected ? "rejected" : approved ? "done" : "" },
    { key: "assigned",  title: "Asset Assigned", meta: approved ? "Asset linked to employee" : rejected ? "Skipped" : "Pending approval", state: approved ? "done" : "" },
    { key: "completed", title: "Completed", meta: approved ? "Request closed" : rejected ? "Request closed" : "Not yet closed", state: approved || rejected ? "done" : "" },
  ];
  return (
    <div className="arq-timeline">
      {steps.map((s, i) => (
        <div key={s.key} className={`arq-tl-step ${s.state}`}>
          <div className="arq-tl-dot">
            {s.state === "done" ? <IconCheck size={12} /> : s.state === "rejected" ? <IconX size={12} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}
          </div>
          <div className="arq-tl-body">
            <div className="arq-tl-title">{s.title}</div>
            <div className="arq-tl-meta">{s.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Detail Drawer ─────────────────────────────────────────────────── */
function DetailDrawer({ request, onClose, onApprove, onReject, saving }) {
  const [assignedAssets, setAssignedAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!request) return;
    setComments([]);
    setDraft("");
    setLoadingAssets(true);
    axios.get(`${API}/api/admin/employees/${request.employeeId}/assets`)
      .then((r) => setAssignedAssets(r.data || []))
      .catch(() => setAssignedAssets([]))
      .finally(() => setLoadingAssets(false));
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, onClose]);

  if (!request) return null;

  const addComment = () => {
    if (!draft.trim()) return;
    setComments((prev) => [...prev, { text: draft.trim(), at: new Date().toISOString() }]);
    setDraft("");
  };

  return (
    <>
      <div onClick={onClose} className="arq-drawer-scrim" />
      <div className="side-drawer arq-drawer" role="dialog" aria-modal="true" aria-label={`Request #${request.id} details`}>
        {/* Header */}
        <div className="arq-drawer-header">
          <div className="arq-drawer-header-id">
            <div className="arq-drawer-avatar" style={{ background: avatarBg(request.employeeName) }}>
              {initials(request.employeeName)}
            </div>
            <div>
              <div className="arq-drawer-title">Request #{request.id}</div>
              <div className="arq-drawer-subtitle">{timeAgo(request.requestedAt)}</div>
            </div>
          </div>
          <button onClick={onClose} className="arq-drawer-close" aria-label="Close details">✕</button>
        </div>

        {/* Body */}
        <div className="arq-drawer-body">
          <div className="arq-drawer-badges">
            <StatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
            <SlaBadge request={request} />
          </div>

          <div className="arq-drawer-section">
            <div className="arq-drawer-section-title"><IconUserPlus size={12} />Employee Information</div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Full Name</span><span className="arq-drawer-row-value">{request.employeeName}</span></div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Employee ID</span><span className="arq-drawer-row-value">{request.employeeId}</span></div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Department</span><span className="arq-drawer-row-value">{request.department || "—"}</span></div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Location</span><span className="arq-drawer-row-value">{request.location || "—"}</span></div>
          </div>

          <div className="arq-drawer-section">
            <div className="arq-drawer-section-title"><IconBox size={12} />Requested Asset</div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Asset Type</span><span className="arq-drawer-row-value">{request.assetType}</span></div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Priority</span><span className="arq-drawer-row-value">{request.urgency}</span></div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Submitted</span><span className="arq-drawer-row-value">{request.requestedAt ? new Date(request.requestedAt).toLocaleString("en-IN") : "—"}</span></div>
            <div className="arq-drawer-row"><span className="arq-drawer-row-label">Resolved</span><span className="arq-drawer-row-value">{request.resolvedAt ? new Date(request.resolvedAt).toLocaleString("en-IN") : "Pending"}</span></div>
          </div>

          <div className="arq-drawer-section">
            <div className="arq-drawer-section-title"><IconBuilding size={12} />Reason / Justification</div>
            <div className="arq-drawer-reason">{request.reason || "No reason provided."}</div>
          </div>

          <div className="arq-drawer-section">
            <div className="arq-drawer-section-title"><IconMapPin size={12} />Current Assigned Assets</div>
            {loadingAssets ? (
              <div style={{ padding: 16 }}>
                <div className="skeleton skeleton-text medium" />
                <div className="skeleton skeleton-text short" />
              </div>
            ) : assignedAssets.length === 0 ? (
              <div className="arq-comment-empty">No assets currently assigned to this employee.</div>
            ) : (
              assignedAssets.map((a) => (
                <div key={a.assetId} className="arq-asset-mini">
                  <div className="arq-asset-mini-icon"><IconBox size={13} /></div>
                  <div>
                    <div className="arq-asset-mini-name">{a.laptopName || a.assetType}</div>
                    <div className="arq-asset-mini-sub">{a.serialNumber} · {a.assetStatus}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="arq-drawer-section">
            <div className="arq-drawer-section-title"><IconGauge size={12} />Approval Timeline / Activity History</div>
            <ApprovalTimeline request={request} />
          </div>

          <div className="arq-drawer-section">
            <div className="arq-drawer-section-title"><IconPaperclip size={12} />Attachments</div>
            <div className="arq-comment-empty">No attachments for this request.</div>
          </div>

          <div className="arq-drawer-section">
            <div className="arq-drawer-section-title">Comments</div>
            {comments.length === 0 ? (
              <div className="arq-comment-empty">No comments yet.</div>
            ) : (
              <div className="arq-comment-list">
                {comments.map((c, i) => (
                  <div key={i} className="arq-comment">
                    {c.text}
                    <div className="arq-comment-meta">{new Date(c.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="arq-comment-composer">
              <textarea className="input" placeholder="Add a note…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }} />
              <button className="btn btn-secondary btn-sm" onClick={addComment}>Add</button>
            </div>
            <div className="arq-comment-hint">Notes are kept for this session only and aren't saved to the server yet.</div>
          </div>
        </div>

        {/* Footer Actions */}
        {request.status === "PENDING" && (
          <div className="arq-drawer-footer">
            <button className="btn btn-success" style={{ flex: 1, height: 42, fontSize: 14 }} onClick={() => onApprove(request.id)} disabled={saving}>
              {saving === "APPROVED" ? "Approving…" : "✓ Approve & Assign Asset"}
            </button>
            <button className="btn btn-danger" style={{ flex: 1, height: 42, fontSize: 14 }} onClick={() => onReject(request.id)} disabled={saving}>
              {saving === "REJECTED" ? "Rejecting…" : "✕ Reject Request"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */
export default function AdminAssetRequests() {
  const toast = useToast();
  const { refresh: refreshNotifications, markRequestsSeen } = useNotifications();

  // Visiting this page counts as having seen the pending requests, so the
  // sidebar/bell badge should clear even if the admin never opens the bell.
  useEffect(() => { markRequestsSeen?.(); }, [markRequestsSeen]);

  const [requests, setRequests] = useState([]);
  const [employeesById, setEmployeesById] = useState({}); // employeeId -> { department, location }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [, forceTick] = useState(0); // re-renders the "last updated Xm ago" label

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [assetTypeFilter, setAssetTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Quick filter chips (additive, presentation-layer only)
  const [qHighPriority, setQHighPriority] = useState(false);
  const [qSlaBreached, setQSlaBreached] = useState(false);
  const [qThisWeek, setQThisWeek] = useState(false);

  // Filter UX chrome
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY)) || []; } catch { return []; }
  });
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY)) || []; } catch { return []; }
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Sorting / pagination
  const [sortKey, setSortKey] = useState("requestedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection / drawer / actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/admin/requests`)
      .then((r) => { setRequests(r.data); setError(""); setLastLoadedAt(Date.now()); })
      .catch(() => setError("Couldn't load asset requests. Is the API running on :8080?"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Ticks once a minute purely so the "Updated Xm ago" chip stays fresh.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    axios.get(`${API}/api/admin/employees`)
      .then((r) => {
        const map = {};
        (r.data || []).forEach((e) => { map[e.employeeId] = { department: e.department, location: e.location }; });
        setEmployeesById(map);
      })
      .catch(() => { /* department/location columns simply stay blank if this fails */ });
  }, []);

  const updateStatus = useCallback(async (id, status) => {
    setSaving(status);
    try {
      await axios.put(`${API}/api/admin/requests/${id}/status`, { status });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status, resolvedAt: new Date().toISOString() } : r)));
      toast(`Request #${id} ${status.toLowerCase()} successfully.`, "success");
      setSelectedId(null);
      refreshNotifications();
    } catch (err) {
      toast(err.response?.data?.message || `Couldn't ${status.toLowerCase()} request.`, "error");
    } finally {
      setSaving(null);
    }
  }, [toast, refreshNotifications]);

  const approve = (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) { toast("Request not found.", "error"); return; }
    setSelectedRequest(req);
    setShowAssignModal(true);
  };

  const handleAssigned = async () => {
    if (!selectedRequest) return;
    try {
      await updateStatus(selectedRequest.id, "APPROVED");
      toast(`Asset assigned successfully to ${selectedRequest.employeeName}`, "success");
      setShowAssignModal(false);
      setSelectedRequest(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const reject = (id) => updateStatus(id, "REJECTED");

  /* ── Enrich requests with department/location ─────────────────── */
  const enriched = useMemo(() => requests.map((r) => ({
    ...r,
    department: employeesById[r.employeeId]?.department || "",
    location: employeesById[r.employeeId]?.location || "",
  })), [requests, employeesById]);

  /* ── Executive KPI computations (all derived from real timestamps) ── */
  const kpis = useMemo(() => {
    const now = Date.now();
    const days = (d) => (now - new Date(d).getTime()) / 86400000;
    const last7 = requests.filter((r) => days(r.requestedAt) <= 7).length;
    const prev7 = requests.filter((r) => days(r.requestedAt) > 7 && days(r.requestedAt) <= 14).length;
    const growthPct = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

    const pending = requests.filter((r) => r.status === "PENDING");
    const pendingHigh = pending.filter((r) => r.urgency === "Urgent" || r.urgency === "Critical").length;
    const avgWaitMs = pending.length ? pending.reduce((s, r) => s + (now - new Date(r.requestedAt).getTime()), 0) / pending.length : 0;

    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    const resolvedTotal = approved + rejected;
    const approvalRate = resolvedTotal ? Math.round((approved / resolvedTotal) * 100) : 0;
    const rejectionRate = resolvedTotal ? Math.round((rejected / resolvedTotal) * 100) : 0;

    const resolved = requests.filter((r) => r.resolvedAt);
    const avgResolutionMs = resolved.length
      ? resolved.reduce((s, r) => s + (new Date(r.resolvedAt).getTime() - new Date(r.requestedAt).getTime()), 0) / resolved.length
      : 0;
    const resHours = avgResolutionMs / 3.6e6;
    const slaHealth = !resolved.length ? "good" : resHours <= 24 ? "excellent" : resHours <= 48 ? "good" : resHours <= 96 ? "at-risk" : "breached";
    const slaHealthLabel = { excellent: "Excellent", good: "Healthy", "at-risk": "At Risk", breached: "Breached" }[slaHealth];

    return {
      total: requests.length, growthPct,
      pendingCount: pending.length, pendingHigh, avgWaitMs,
      approved, approvalRate, rejected, rejectionRate,
      avgResolutionMs, slaHealth, slaHealthLabel,
      urgentOpen: pending.filter((r) => r.urgency === "Urgent" || r.urgency === "Critical").length,
      slaBreachedOpen: pending.filter((r) => slaBucketFor(r).key === "breached").length,
    };
  }, [requests]);

  /* ── 7-day sparkline series for the KPI cards ───────────────────── */
  const sparkTotal = useMemo(() => last7DaySeries(requests), [requests]);
  const sparkPending = useMemo(() => last7DaySeries(requests, (r) => r.status === "PENDING"), [requests]);
  const sparkApproved = useMemo(() => last7DaySeries(requests, (r) => r.status === "APPROVED"), [requests]);
  const sparkRejected = useMemo(() => last7DaySeries(requests, (r) => r.status === "REJECTED"), [requests]);

  /* ── Filter option lists ──────────────────────────────────────── */
  const departments = useMemo(() => ["ALL", ...new Set(enriched.map((r) => r.department).filter(Boolean))], [enriched]);
  const locations = useMemo(() => ["ALL", ...new Set(enriched.map((r) => r.location).filter(Boolean))], [enriched]);
  const assetTypes = useMemo(() => ["ALL", ...new Set(enriched.map((r) => r.assetType).filter(Boolean))], [enriched]);

  const anyFilterActive = !!(search || statusFilter !== "ALL" || urgencyFilter !== "ALL" || departmentFilter !== "ALL" || locationFilter !== "ALL" || assetTypeFilter !== "ALL" || dateFrom || dateTo || qHighPriority || qSlaBreached || qThisWeek);
  const advancedFilterCount = [departmentFilter !== "ALL", locationFilter !== "ALL", assetTypeFilter !== "ALL", !!dateFrom, !!dateTo].filter(Boolean).length;

  const resetFilters = () => {
    setSearch(""); setStatusFilter("ALL"); setUrgencyFilter("ALL");
    setDepartmentFilter("ALL"); setLocationFilter("ALL"); setAssetTypeFilter("ALL");
    setDateFrom(""); setDateTo("");
    setQHighPriority(false); setQSlaBreached(false); setQThisWeek(false);
  };

  const commitSearch = () => {
    const q = search.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveCurrentFilter = () => {
    const name = window.prompt("Name this filter view (e.g. \"Urgent — Bengaluru\"):");
    if (!name || !name.trim()) return;
    const snapshot = { search, statusFilter, urgencyFilter, departmentFilter, locationFilter, assetTypeFilter, dateFrom, dateTo, qHighPriority, qSlaBreached, qThisWeek };
    setSavedFilters((prev) => {
      const next = [...prev.filter((f) => f.name !== name.trim()), { name: name.trim(), snapshot }];
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(next));
      return next;
    });
    toast(`Saved filter view "${name.trim()}"`, "success");
  };
  const applySavedFilter = (f) => {
    const s = f.snapshot;
    setSearch(s.search || ""); setStatusFilter(s.statusFilter || "ALL"); setUrgencyFilter(s.urgencyFilter || "ALL");
    setDepartmentFilter(s.departmentFilter || "ALL"); setLocationFilter(s.locationFilter || "ALL"); setAssetTypeFilter(s.assetTypeFilter || "ALL");
    setDateFrom(s.dateFrom || ""); setDateTo(s.dateTo || "");
    setQHighPriority(!!s.qHighPriority); setQSlaBreached(!!s.qSlaBreached); setQThisWeek(!!s.qThisWeek);
  };
  const deleteSavedFilter = (name) => {
    setSavedFilters((prev) => {
      const next = prev.filter((f) => f.name !== name);
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(next));
      return next;
    });
  };

  /* ── Filter + sort ────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return enriched
      .filter((r) => statusFilter === "ALL" || r.status === statusFilter)
      .filter((r) => urgencyFilter === "ALL" || r.urgency === urgencyFilter)
      .filter((r) => departmentFilter === "ALL" || r.department === departmentFilter)
      .filter((r) => locationFilter === "ALL" || r.location === locationFilter)
      .filter((r) => assetTypeFilter === "ALL" || r.assetType === assetTypeFilter)
      .filter((r) => !dateFrom || new Date(r.requestedAt) >= new Date(dateFrom))
      .filter((r) => !dateTo || new Date(r.requestedAt) <= new Date(`${dateTo}T23:59:59`))
      .filter((r) => !qHighPriority || r.urgency === "Urgent" || r.urgency === "Critical")
      .filter((r) => !qSlaBreached || slaBucketFor(r).key === "breached")
      .filter((r) => !qThisWeek || (now - new Date(r.requestedAt).getTime()) / 86400000 <= 7)
      .filter((r) => !q || [r.employeeId, r.employeeName, r.assetType, r.reason, r.department, r.location].some((v) => (v || "").toLowerCase().includes(q)));
  }, [enriched, search, statusFilter, urgencyFilter, departmentFilter, locationFilter, assetTypeFilter, dateFrom, dateTo, qHighPriority, qSlaBreached, qThisWeek]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case "employeeName": av = a.employeeName || ""; bv = b.employeeName || ""; return av.localeCompare(bv) * dir;
        case "department":   av = a.department || ""; bv = b.department || ""; return av.localeCompare(bv) * dir;
        case "location":     av = a.location || ""; bv = b.location || ""; return av.localeCompare(bv) * dir;
        case "assetType":    av = a.assetType || ""; bv = b.assetType || ""; return av.localeCompare(bv) * dir;
        case "urgency":      av = URGENCY_CFG[a.urgency]?.rank || 0; bv = URGENCY_CFG[b.urgency]?.rank || 0; return (av - bv) * dir;
        case "status":       av = a.status || ""; bv = b.status || ""; return av.localeCompare(bv) * dir;
        case "age":          av = Date.now() - new Date(a.requestedAt).getTime(); bv = Date.now() - new Date(b.requestedAt).getTime(); return (av - bv) * dir;
        case "requestedAt":
        default:              av = new Date(a.requestedAt).getTime(); bv = new Date(b.requestedAt).getTime(); return (av - bv) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "employeeName" || key === "department" || key === "location" || key === "assetType" ? "asc" : "desc"); }
  };

  // Reset to page 1 whenever the result set changes shape
  useEffect(() => { setPage(1); }, [search, statusFilter, urgencyFilter, departmentFilter, locationFilter, assetTypeFilter, dateFrom, dateTo, qHighPriority, qSlaBreached, qThisWeek, pageSize]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const paged = sorted.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const selected = selectedId != null ? enriched.find((r) => r.id === selectedId) || null : null;

  /* ── Selection helpers ────────────────────────────────────────── */
  const toggleOne = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAllOnPage = (checked) => setSelectedIds(checked ? new Set(paged.map((r) => r.id)) : new Set());
  const clearSelection = () => setSelectedIds(new Set());

  /* ── CSV export ───────────────────────────────────────────────── */
  const exportCSV = (rows, filename) => {
    const cols = ["id", "employeeName", "employeeId", "department", "location", "assetType", "reason", "urgency", "status", "requestedAt", "resolvedAt"];
    const csv = [cols.join(",")].concat(
      rows.map((r) => cols.map((c) => `"${(r[c] ?? "").toString().replace(/"/g, '""')}"`).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  };

  /* ── Bulk actions ─────────────────────────────────────────────── */
  const bulkReject = async () => {
    const ids = [...selectedIds].filter((id) => requests.find((r) => r.id === id)?.status === "PENDING");
    if (!ids.length) { toast("No pending requests selected.", "error"); return; }
    if (!window.confirm(`Reject ${ids.length} selected request(s)?`)) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(ids.map((id) => axios.put(`${API}/api/admin/requests/${id}/status`, { status: "REJECTED" })));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    toast(`Rejected ${ok} of ${ids.length} request(s).`, ok === ids.length ? "success" : "error");
    setBulkBusy(false); clearSelection(); load(); refreshNotifications();
  };

  const bulkApprove = async () => {
    const ids = [...selectedIds].filter((id) => requests.find((r) => r.id === id)?.status === "PENDING");
    if (!ids.length) { toast("No pending requests selected.", "error"); return; }
    if (!window.confirm(`Approve ${ids.length} selected request(s)? No specific asset will be assigned in bulk mode — assign assets individually afterward if needed.`)) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(ids.map((id) => axios.put(`${API}/api/admin/requests/${id}/status`, { status: "APPROVED" })));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    toast(`Approved ${ok} of ${ids.length} request(s).`, ok === ids.length ? "success" : "error");
    setBulkBusy(false); clearSelection(); load(); refreshNotifications();
  };

  const bulkExport = () => {
    const rows = enriched.filter((r) => selectedIds.has(r.id));
    exportCSV(rows, "asset-requests-selected.csv");
    toast(`Exported ${rows.length} request(s) to CSV.`, "success");
  };

  const exportAllFiltered = () => {
    exportCSV(filtered, "asset-requests-export.csv");
    toast(`Exported ${filtered.length} request(s) to CSV.`, "success");
  };

  /* ── Quick filter chip config ────────────────────────────────── */
  const quickChips = [
    { key: "pending", active: statusFilter === "PENDING", label: "Pending", count: kpis.pendingCount, icon: <IconClock size={12} />, onToggle: () => setStatusFilter((s) => (s === "PENDING" ? "ALL" : "PENDING")) },
    { key: "highPriority", active: qHighPriority, label: "High priority", count: kpis.pendingHigh, icon: <IconAlert size={12} />, onToggle: () => setQHighPriority((v) => !v) },
    { key: "slaBreached", active: qSlaBreached, label: "SLA breached", count: kpis.slaBreachedOpen, icon: <IconGauge size={12} />, onToggle: () => setQSlaBreached((v) => !v) },
    { key: "thisWeek", active: qThisWeek, label: "This week", icon: <IconCalendar size={12} />, onToggle: () => setQThisWeek((v) => !v) },
  ];

  /* ── Removable "active filter" badges ────────────────────────── */
  const activeChips = [];
  if (search) activeChips.push({ key: "search", label: `Search: "${search}"`, onRemove: () => setSearch("") });
  if (statusFilter !== "ALL") activeChips.push({ key: "status", label: `Status: ${STATUS_CFG[statusFilter]?.label || statusFilter}`, onRemove: () => setStatusFilter("ALL") });
  if (urgencyFilter !== "ALL") activeChips.push({ key: "urgency", label: `Priority: ${urgencyFilter}`, onRemove: () => setUrgencyFilter("ALL") });
  if (departmentFilter !== "ALL") activeChips.push({ key: "dept", label: `Dept: ${departmentFilter}`, onRemove: () => setDepartmentFilter("ALL") });
  if (locationFilter !== "ALL") activeChips.push({ key: "loc", label: `Location: ${locationFilter}`, onRemove: () => setLocationFilter("ALL") });
  if (assetTypeFilter !== "ALL") activeChips.push({ key: "asset", label: `Asset: ${assetTypeFilter}`, onRemove: () => setAssetTypeFilter("ALL") });
  if (dateFrom || dateTo) activeChips.push({ key: "date", label: `Date: ${dateFrom || "…"} → ${dateTo || "…"}`, onRemove: () => { setDateFrom(""); setDateTo(""); } });
  if (qHighPriority) activeChips.push({ key: "qhp", label: "High priority", onRemove: () => setQHighPriority(false) });
  if (qSlaBreached) activeChips.push({ key: "qsb", label: "SLA breached", onRemove: () => setQSlaBreached(false) });
  if (qThisWeek) activeChips.push({ key: "qtw", label: "This week", onRemove: () => setQThisWeek(false) });

  const exportMenuItems = [
    { label: `Export ${filtered.length} filtered (CSV)`, icon: <IconDownload size={13} />, onClick: exportAllFiltered },
    selectedIds.size > 0 && { label: `Export ${selectedIds.size} selected (CSV)`, icon: <IconDownload size={13} />, onClick: bulkExport },
  ];

  return (
    <Layout
      title="Asset Requests"
      subtitle="Review, approve, and track employee equipment requests"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><IconRefresh size={13} /> {loading ? "Loading…" : "Refresh"}</button>
          <ExportMenu items={exportMenuItems} />
        </div>
      }
    >
      {error && (
        <div style={{ marginBottom: 20, borderRadius: 10, padding: "12px 18px", background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Page meta strip: freshness + active-filter indicator ── */}
      <div className="arq-meta-strip">
        <span className="arq-meta-item">
          <span className={`arq-live-dot ${loading ? "is-loading" : ""}`} />
          {loading ? "Refreshing…" : lastLoadedAt ? `Updated ${timeAgo(new Date(lastLoadedAt).toISOString())}` : "Not loaded yet"}
        </span>
        <span className="arq-meta-sep">·</span>
        <span className="arq-meta-item">{filtered.length} of {requests.length} requests shown</span>
        {anyFilterActive && (
          <>
            <span className="arq-meta-sep">·</span>
            <span className="arq-meta-item arq-meta-filters"><IconSliders size={11} /> {activeChips.length} filter{activeChips.length !== 1 ? "s" : ""} active</span>
          </>
        )}
      </div>

      {/* ── Executive KPI section ── */}
      <div className="arq-kpi-grid">
        <div className="arq-kpi-card accent-blue">
          <div className="arq-kpi-top"><div className="arq-kpi-icon"><IconInbox size={16} /></div><TrendPill pct={loading ? 0 : kpis.growthPct} /></div>
          <div className="arq-kpi-value">{loading ? "—" : <CountUp value={kpis.total} />}</div>
          <div className="arq-kpi-label-row"><div className="arq-kpi-label">Total Requests</div><Sparkline data={sparkTotal} color="#2563eb" /></div>
          <div className="arq-kpi-meta"><div className="arq-kpi-meta-row"><span>vs previous 7 days</span><strong>{kpis.growthPct >= 0 ? "+" : ""}{kpis.growthPct}%</strong></div></div>
        </div>

        <div className="arq-kpi-card accent-amber">
          <div className="arq-kpi-top"><div className="arq-kpi-icon"><IconClock size={16} /></div>{kpis.pendingHigh > 0 && <span className="arq-kpi-trend down">{kpis.pendingHigh} high-pri</span>}</div>
          <div className="arq-kpi-value">{loading ? "—" : <CountUp value={kpis.pendingCount} />}</div>
          <div className="arq-kpi-label-row"><div className="arq-kpi-label">Pending</div><Sparkline data={sparkPending} color="#d97706" /></div>
          <div className="arq-kpi-meta">
            <div className="arq-kpi-meta-row"><span>High priority</span><strong>{kpis.pendingHigh}</strong></div>
            <div className="arq-kpi-meta-row"><span>Avg waiting time</span><strong>{durationHuman(kpis.avgWaitMs)}</strong></div>
          </div>
        </div>

        <div className="arq-kpi-card accent-green">
          <div className="arq-kpi-top"><div className="arq-kpi-icon"><IconCheck size={16} /></div></div>
          <div className="arq-kpi-value">{loading ? "—" : <CountUp value={kpis.approved} />}</div>
          <div className="arq-kpi-label-row"><div className="arq-kpi-label">Approved</div><Sparkline data={sparkApproved} color="#15803d" /></div>
          <div className="arq-kpi-meta"><div className="arq-kpi-meta-row"><span>Approval rate</span><strong>{kpis.approvalRate}%</strong></div></div>
        </div>

        <div className="arq-kpi-card accent-red">
          <div className="arq-kpi-top"><div className="arq-kpi-icon"><IconX size={16} /></div></div>
          <div className="arq-kpi-value">{loading ? "—" : <CountUp value={kpis.rejected} />}</div>
          <div className="arq-kpi-label-row"><div className="arq-kpi-label">Rejected</div><Sparkline data={sparkRejected} color="#b91c1c" /></div>
          <div className="arq-kpi-meta"><div className="arq-kpi-meta-row"><span>Rejection rate</span><strong>{kpis.rejectionRate}%</strong></div></div>
        </div>

        <div className="arq-kpi-card accent-purple">
          <div className="arq-kpi-top"><div className="arq-kpi-icon"><IconGauge size={16} /></div></div>
          <div className="arq-kpi-value">{loading ? "—" : durationHuman(kpis.avgResolutionMs)}</div>
          <div className="arq-kpi-label">Average SLA</div>
          <div className="arq-kpi-meta">
            <div className="arq-kpi-meta-row">
              <span>SLA health</span>
              <span className={`arq-kpi-health ${kpis.slaHealth}`}><span className="arq-kpi-health-dot" />{kpis.slaHealthLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter experience: search + quick chips + collapsible advanced ── */}
      <div className="arq-toolbar-card">
        <div className="arq-toolbar-row">
          <div className="arq-toolbar-search">
            <IconSearch className="search-icon" size={14} />
            <input
              ref={searchRef}
              className="input"
              placeholder="Search employee, ID, asset, department, reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={(e) => { if (e.key === "Enter") commitSearch(); }}
            />
            {search && <button className="clear-btn" onClick={() => setSearch("")} aria-label="Clear search"><IconX size={11} /></button>}
            {searchFocused && recentSearches.length > 0 && !search && (
              <div className="arq-search-suggest">
                <div className="arq-search-suggest-label">Recent searches</div>
                {recentSearches.map((s) => (
                  <button key={s} className="arq-search-suggest-item" onMouseDown={() => setSearch(s)}>
                    <IconSearch size={11} />{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className={`arq-advanced-toggle ${advancedOpen ? "is-open" : ""}`} onClick={() => setAdvancedOpen((v) => !v)}>
            <IconSliders size={13} /> Advanced filters
            {advancedFilterCount > 0 && <span className="arq-advanced-count">{advancedFilterCount}</span>}
            <IconChevronDown size={12} />
          </button>

          <button type="button" className="arq-save-btn" onClick={saveCurrentFilter} disabled={!anyFilterActive} title="Save current filters as a view">
            <IconBookmark size={13} /> Save view
          </button>

          {anyFilterActive && (
            <button className="btn btn-secondary btn-sm arq-reset-btn" onClick={resetFilters}><IconFilterX size={12} /> Reset</button>
          )}
        </div>

        {/* Quick filter chips */}
        <div className="arq-chip-row">
          <IconZap size={12} className="arq-chip-row-icon" />
          {quickChips.map((c) => (
            <button key={c.key} type="button" className={`arq-chip ${c.active ? "is-active" : ""}`} onClick={c.onToggle}>
              {c.icon}{c.label}{typeof c.count === "number" && <span className="arq-chip-count">{c.count}</span>}
            </button>
          ))}
          {savedFilters.length > 0 && (
            <>
              <span className="arq-chip-divider" />
              {savedFilters.map((f) => (
                <span key={f.name} className="arq-chip arq-chip-saved">
                  <button type="button" className="arq-chip-saved-btn" onClick={() => applySavedFilter(f)}><IconBookmark size={11} />{f.name}</button>
                  <button type="button" className="arq-chip-saved-x" onClick={() => deleteSavedFilter(f.name)} aria-label={`Delete saved view ${f.name}`}><IconX size={9} /></button>
                </span>
              ))}
            </>
          )}
        </div>

        {/* Active filter badges */}
        {activeChips.length > 0 && (
          <div className="arq-active-filters">
            {activeChips.map((c) => (
              <span key={c.key} className="arq-filter-pill">
                {c.label}
                <button type="button" onClick={c.onRemove} aria-label={`Remove filter ${c.label}`}><IconX size={9} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Advanced filters — collapsed by default */}
        <div className={`arq-advanced-panel ${advancedOpen ? "is-open" : ""}`}>
          <div className="arq-advanced-grid">
            <label className="arq-advanced-field">
              <span>Status</span>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label className="arq-advanced-field">
              <span>Priority</span>
              <select className="input" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
                <option value="ALL">All priorities</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </label>
            <label className="arq-advanced-field">
              <span>Department</span>
              <select className="input" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                {departments.map((d) => <option key={d} value={d}>{d === "ALL" ? "All departments" : d}</option>)}
              </select>
            </label>
            <label className="arq-advanced-field">
              <span>Location</span>
              <select className="input" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                {locations.map((l) => <option key={l} value={l}>{l === "ALL" ? "All locations" : l}</option>)}
              </select>
            </label>
            <label className="arq-advanced-field">
              <span>Asset type</span>
              <select className="input" value={assetTypeFilter} onChange={(e) => setAssetTypeFilter(e.target.value)}>
                {assetTypes.map((t) => <option key={t} value={t}>{t === "ALL" ? "All asset types" : t}</option>)}
              </select>
            </label>
            <label className="arq-advanced-field arq-advanced-field-date">
              <span>Date range</span>
              <div className="arq-date-range">
                <IconCalendar size={13} />
                <input type="date" className="input" aria-label="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <span className="arq-date-range-sep">–</span>
                <input type="date" className="input" aria-label="To date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </label>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="arq-bulk-bar">
            <span className="arq-bulk-count">{selectedIds.size} selected</span>
            <button className="btn btn-sm btn-success" onClick={bulkApprove} disabled={bulkBusy}>✓ Bulk Approve</button>
            <button className="btn btn-sm btn-danger" onClick={bulkReject} disabled={bulkBusy}>✕ Bulk Reject</button>
            <button className="btn btn-sm btn-secondary" onClick={bulkExport} disabled={bulkBusy}><IconDownload size={12} /> Export Selected</button>
            <button className="btn btn-sm btn-ghost" onClick={clearSelection}>Clear selection</button>
          </div>
        )}
      </div>

      {/* ── Request table ── */}
      <div className="card arq-table-card">
        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th style={{ width: 36 }} /><th>Employee</th><th>Requested Asset</th><th>Priority</th><th>SLA</th><th>Age</th><th>Status</th><th style={{ width: 90 }}>Actions</th></tr></thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td><div className="skeleton skeleton-circle" style={{ width: 16, height: 16 }} /></td>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="skeleton skeleton-circle" /><div style={{ flex: 1 }}><div className="skeleton skeleton-text medium" /><div className="skeleton skeleton-text short" /></div></div></td>
                    <td><div className="skeleton skeleton-text short" /></td>
                    <td><div className="skeleton" style={{ width: 70, height: 20, borderRadius: 20 }} /></td>
                    <td><div className="skeleton" style={{ width: 70, height: 20, borderRadius: 20 }} /></td>
                    <td><div className="skeleton skeleton-text short" /></td>
                    <td><div className="skeleton" style={{ width: 70, height: 20, borderRadius: 20 }} /></td>
                    <td><div className="skeleton skeleton-text short" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="arq-empty-state">
            <div className="arq-empty-icon">📭</div>
            <div className="arq-empty-title">No requests found</div>
            <div className="arq-empty-sub">
              {anyFilterActive ? "Try changing the filters or clearing your search." : "When employees raise equipment requests, they'll appear here."}
            </div>
            {anyFilterActive && <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={resetFilters}>Reset Filters</button>}
          </div>
        ) : (
          <>
            <div className="table-wrap arq-table-wrap">
              <table className="data-table arq-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" className="row-checkbox" checked={paged.length > 0 && paged.every((r) => selectedIds.has(r.id))} onChange={(e) => toggleAllOnPage(e.target.checked)} title="Select all on page" />
                    </th>
                    <th><SortHeader label="Employee" sortKey="employeeName" active={sortKey} dir={sortDir} onSort={onSort} /></th>
                    <th><SortHeader label="Location" sortKey="location" active={sortKey} dir={sortDir} onSort={onSort} /></th>
                    <th><SortHeader label="Requested Asset" sortKey="assetType" active={sortKey} dir={sortDir} onSort={onSort} /></th>
                    <th>Reason</th>
                    <th><SortHeader label="Priority" sortKey="urgency" active={sortKey} dir={sortDir} onSort={onSort} /></th>
                    <th>SLA</th>
                    <th><SortHeader label="Age" sortKey="age" active={sortKey} dir={sortDir} onSort={onSort} /></th>
                    <th>Submitted</th>
                    <th><SortHeader label="Status" sortKey="status" active={sortKey} dir={sortDir} onSort={onSort} /></th>
                    <th className="arq-th-sticky" style={{ width: 60 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => {
                    const isSelected = selectedIds.has(r.id);
                    const menuItems = [
                      { label: "View Details", icon: <IconEye size={13} />, onClick: () => setSelectedId(r.id) },
                      r.status === "PENDING" && { label: "Approve & Assign", icon: <IconCheck size={13} />, onClick: () => approve(r.id) },
                      r.status === "PENDING" && { label: "Reject Request", icon: <IconX size={13} />, danger: true, onClick: () => reject(r.id) },
                    ];
                    return (
                      <tr key={r.id} className={`arq-row ${isSelected ? "is-selected" : ""}`} style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }} onClick={() => setSelectedId(r.id)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="row-checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} />
                        </td>
                        <td>
                          <div className="arq-emp-cell">
                            <div className="arq-emp-avatar" style={{ background: avatarBg(r.employeeName) }}>{initials(r.employeeName)}</div>
                            <div className="arq-emp-info">
                              <div className="arq-emp-name">{highlightMatch(r.employeeName, search)}</div>
                              <div className="arq-emp-meta">
                                <span className="arq-emp-id">{highlightMatch(r.employeeId, search)}</span>
                                {r.department && <span className="arq-emp-dept">{highlightMatch(r.department, search)}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5, color: "var(--gray-600)" }}>{r.location || "—"}</td>
                        <td><span className="arq-asset-chip">{highlightMatch(r.assetType, search)}</span></td>
                        <td style={{ maxWidth: 160 }}><span className="arq-reason-clamp">{highlightMatch(r.reason || "—", search)}</span></td>
                        <td><UrgencyBadge urgency={r.urgency} /></td>
                        <td><SlaBadge request={r} /></td>
                        <td style={{ fontSize: 12.5, color: "var(--gray-500)", whiteSpace: "nowrap" }}>{durationHuman(Date.now() - new Date(r.requestedAt).getTime())}</td>
                        <td style={{ fontSize: 12.5, color: "var(--gray-400)", whiteSpace: "nowrap" }}>{formatDate(r.requestedAt)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="arq-td-sticky" onClick={(e) => e.stopPropagation()}>
                          <RowActionMenu items={menuItems} ariaLabel={`Actions for request #${r.id}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="arq-pagination">
              <div className="arq-pagination-info">
                Showing {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, sorted.length)} of {sorted.length}
              </div>
              <div className="arq-pagination-controls">
                <div className="arq-page-size">
                  <select className="input" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
                  </select>
                </div>
                <button className="arq-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}>‹</button>
                <span style={{ fontSize: 12, color: "var(--gray-500)", minWidth: 60, textAlign: "center" }}>{pageSafe} / {pageCount}</span>
                <button className="arq-page-btn" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={pageSafe >= pageCount}>›</button>
              </div>
            </div>
          </>
        )}
      </div>

      <DetailDrawer request={selected} onClose={() => setSelectedId(null)} onApprove={approve} onReject={reject} saving={saving} />
      <AssignAssetModal
        open={showAssignModal}
        request={selectedRequest}
        onClose={() => { setShowAssignModal(false); setSelectedRequest(null); }}
        onAssigned={handleAssigned}
      />
    </Layout>
  );
}

/* ── Row action menu wrapper ──────────────────────────────────────
   Owns its own open/close state so each row's menu is independent,
   while still rendering through the single shared ActionMenu
   component (never a duplicate dropdown implementation). ── */
function RowActionMenu({ items, ariaLabel }) {
  const [open, setOpen] = useState(false);
  return (
    <ActionMenu
      items={items}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      onClose={() => setOpen(false)}
      ariaLabel={ariaLabel}
    />
  );
}

/* ── Header export dropdown — reuses the shared ActionMenu so there's
   still only one dropdown implementation in the codebase. ── */
function ExportMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <ActionMenu
      items={items}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      onClose={() => setOpen(false)}
      ariaLabel="Export options"
      renderTrigger={(triggerProps) => (
        <button type="button" className={`btn btn-secondary ${open ? "is-active" : ""}`} {...triggerProps}>
          <IconDownload size={13} /> Export <IconChevronDown size={11} />
        </button>
      )}
    />
  );
}
