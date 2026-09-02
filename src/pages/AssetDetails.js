import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import StatusPill, { ConditionPill } from "../components/StatusPill";
import { useToast } from "../utils/Toast";
import "./AssetDetails.css";

import { API_BASE as API } from "../config";

const DOC_TYPES = ["Invoice", "Warranty Card", "Insurance", "Manual", "Other"];

// ── Icons (kept local to this page, matching the stroke style used across
//    the app's other icon sets) ──────────────────────────────────────────
const IconBack     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IconEdit      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
const IconUserPlus  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>;
const IconWrench    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconQr        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>;
const IconTrash     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconDownload  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconFile      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

const ASSET_TYPE_VISUALS = {
  "Laptop":  { icon: "💻", gradient: "linear-gradient(135deg,#2563eb,#7c3aed)" },
  "Desktop": { icon: "🖥️", gradient: "linear-gradient(135deg,#0891b2,#2563eb)" },
  "Monitor": { icon: "🖥️", gradient: "linear-gradient(135deg,#0891b2,#0e7490)" },
  "Mobile":  { icon: "📱", gradient: "linear-gradient(135deg,#db2777,#7c3aed)" },
  "Tablet":  { icon: "📱", gradient: "linear-gradient(135deg,#db2777,#c026d3)" },
  "Printer": { icon: "🖨️", gradient: "linear-gradient(135deg,#475569,#1e293b)" },
  "Keyboard":{ icon: "⌨️", gradient: "linear-gradient(135deg,#64748b,#334155)" },
  "Mouse":   { icon: "🖱️", gradient: "linear-gradient(135deg,#64748b,#334155)" },
  "Headset": { icon: "🎧", gradient: "linear-gradient(135deg,#7c3aed,#c026d3)" },
  "Server":  { icon: "🗄️", gradient: "linear-gradient(135deg,#1e293b,#0f172a)" },
};
const DEFAULT_TYPE_VISUAL = { icon: "📦", gradient: "linear-gradient(135deg,#475569,#1e293b)" };

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const formatDateTime = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
};
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
};

// ── Small building blocks ─────────────────────────────────────────────
const InfoCard = ({ label, value, mono }) => (
  <div className="ad-info-card">
    <div className="ad-info-label">{label}</div>
    <div className={`ad-info-value ${mono ? "mono" : ""} ${!value ? "is-empty" : ""}`}>{value || "—"}</div>
  </div>
);

const SectionCard = ({ id, title, actions, children, subtitle }) => (
  <div className="ad-section card" id={id}>
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="ad-section-actions">{actions}</div>}
    </div>
    <div className="card-body">{children}</div>
  </div>
);

const EmptyRow = ({ children }) => <div className="empty-state ad-empty">{children}</div>;

const TIMELINE_ICON = { AUDIT: "📝", EMAIL: "📧", MAINTENANCE: "🛠", DOCUMENT: "📄" };
const TIMELINE_LABEL = {
  AUDIT: "Activity", EMAIL: "Email", MAINTENANCE: "Maintenance", DOCUMENT: "Document",
};

export default function AssetDetails() {
  const { assetId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);

  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docType, setDocType] = useState("Invoice");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [maintRecords, setMaintRecords] = useState([]);
  const [maintLoading, setMaintLoading] = useState(true);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintForm, setMaintForm] = useState({ maintenanceType: "Preventive", description: "", scheduledDate: "", vendor: "", cost: "" });

  const [qrUrl, setQrUrl] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const maintenanceRef = useRef(null);
  const timelineRef = useRef(null);

  // ── Load the asset itself ──────────────────────────────────────────
  const loadAsset = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/assets/${assetId}`)
      .then((r) => { setAsset(r.data); setError(""); })
      .catch((err) => {
        setAsset(null);
        setError(err.response?.status === 404
          ? "This asset doesn't exist, or may have been deleted."
          : "Couldn't load this asset. Is the API running?");
      })
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  // ── Load the full timeline ──────────────────────────────────────────
  const loadTimeline = useCallback(() => {
    setTimelineLoading(true);
    axios.get(`${API}/assets/${assetId}/timeline`)
      .then((r) => setTimeline(r.data || []))
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, [assetId]);

  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  // ── Load documents ───────────────────────────────────────────────────
  const loadDocs = useCallback(() => {
    setDocsLoading(true);
    axios.get(`${API}/api/admin/assets/${assetId}/documents`)
      .then((r) => setDocs(r.data || []))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, [assetId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ── Load maintenance records ─────────────────────────────────────────
  const loadMaint = useCallback(() => {
    setMaintLoading(true);
    axios.get(`${API}/api/admin/maintenance/asset/${assetId}`)
      .then((r) => setMaintRecords(r.data || []))
      .catch(() => setMaintRecords([]))
      .finally(() => setMaintLoading(false));
  }, [assetId]);

  useEffect(() => { loadMaint(); }, [loadMaint]);

  // ── Jump to a section when linked with ?tab= ─────────────────────────
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!loading && tab === "timeline") {
      requestAnimationFrame(() => timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    if (!loading && tab === "maintenance") {
      requestAnimationFrame(() => maintenanceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  // ── Derived data ──────────────────────────────────────────────────────
  const auditEvents = useMemo(() => timeline.filter((e) => e.source === "AUDIT"), [timeline]);
  const createdEvent = auditEvents[0] || null;
  const updatedEvent = auditEvents.length > 0 ? auditEvents[auditEvents.length - 1] : null;

  const warrantyDays = daysUntil(asset?.warrantyExpiry);
  const warrantyStatus = !asset?.warrantyExpiry
    ? null
    : warrantyDays < 0 ? "Expired"
    : warrantyDays <= 60 ? "Expiring Soon"
    : "Active";

  const faultCount = maintRecords.filter((r) => r.maintenanceType === "Corrective").length;
  const lastService = maintRecords
    .filter((r) => r.status === "Completed" && r.completedDate)
    .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))[0];
  const nextService = maintRecords
    .filter((r) => r.status !== "Completed" && r.status !== "Cancelled" && r.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];

  const visual = asset ? (ASSET_TYPE_VISUALS[asset.assetType] || DEFAULT_TYPE_VISUAL) : DEFAULT_TYPE_VISUAL;

  // ── Actions ────────────────────────────────────────────────────────────
  const handlePrintQr = async () => {
    const win = window.open("", "_blank");
    try {
      const res = await axios.get(`${API}/assets/${assetId}/qrcode`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      setQrUrl(url);
      if (win) {
        win.document.write(`<title>QR — ${asset?.laptopName || "Asset"}</title><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${url}" style="max-width:90vw;max-height:90vh" onload="window.print()" /></body>`);
      }
    } catch {
      win?.close();
      toast?.("Couldn't generate the QR code.", "error");
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    if (!window.confirm(`Delete "${asset.laptopName}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/assets/${assetId}`);
      toast?.("Asset deleted.", "success");
      navigate("/assets");
    } catch {
      toast?.("Couldn't delete this asset.", "error");
      setDeleting(false);
    }
  };

  const handleUploadDoc = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentType", docType);
      await axios.post(`${API}/api/admin/assets/${assetId}/documents`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast?.("Document uploaded.", "success");
      setFile(null);
      loadDocs();
    } catch (e) {
      toast?.(e?.response?.data?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await axios.delete(`${API}/api/admin/assets/${assetId}/documents/${id}`);
      loadDocs();
    } catch {
      toast?.("Failed to delete document.", "error");
    }
  };

  const handleScheduleMaintenance = async () => {
    try {
      await axios.post(`${API}/api/admin/maintenance`, { ...maintForm, assetId });
      toast?.("Maintenance scheduled.", "success");
      setShowMaintForm(false);
      setMaintForm({ maintenanceType: "Preventive", description: "", scheduledDate: "", vendor: "", cost: "" });
      loadMaint();
      loadTimeline();
    } catch (e) {
      toast?.(e?.response?.data?.message || "Couldn't schedule maintenance.", "error");
    }
  };

  const handleMaintStatusChange = async (record, status) => {
    try {
      await axios.put(`${API}/api/admin/maintenance/${record.id}`, { ...record, status });
      loadMaint();
      loadTimeline();
    } catch {
      toast?.("Failed to update status.", "error");
    }
  };

  useEffect(() => () => { if (qrUrl) URL.revokeObjectURL(qrUrl); }, [qrUrl]);

  // ── Loading / error states ──────────────────────────────────────────
  if (loading) {
    return (
      <Layout title="Asset Details" subtitle="Loading…">
        <div className="ad-skel-header card">
          <div className="skeleton skeleton-circle" style={{ width: 56, height: 56 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-title" style={{ width: "40%" }} />
            <div className="skeleton skeleton-text short" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div className="card ad-section" key={i}>
            <div className="card-body">
              <div className="skeleton skeleton-block" style={{ height: 90 }} />
            </div>
          </div>
        ))}
      </Layout>
    );
  }

  if (error || !asset) {
    return (
      <Layout title="Asset Details">
        <div className="card">
          <div className="card-body">
            <EmptyRow>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 700, color: "var(--gray-800)", marginBottom: 4 }}>{error || "Asset not found"}</div>
              <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate("/assets")}>
                <IconBack /> Back to Assets
              </button>
            </EmptyRow>
          </div>
        </div>
      </Layout>
    );
  }

  const specs = [asset.processor, asset.ram, asset.storage].filter(Boolean);

  return (
    <Layout title={asset.laptopName} subtitle={`${asset.assetType}${asset.brand ? ` · ${asset.brand}` : ""}${asset.model ? ` ${asset.model}` : ""}`}>
      <div className="ad-page">

        {/* ── Back link ── */}
        <button className="ad-back-link" onClick={() => navigate("/assets")}>
          <IconBack /> Back to Assets
        </button>

        {/* ── Header ── */}
        <div className="ad-header card">
          <div className="ad-header-main">
            <div className="ad-header-icon" style={{ background: visual.gradient }}>{visual.icon}</div>
            <div className="ad-header-text">
              <div className="ad-header-name-row">
                <h1 className="ad-header-name">{asset.laptopName}</h1>
              </div>
              <div className="ad-header-id">Asset ID: <span className="mono">#{asset.assetId}</span></div>
              <div className="ad-header-badges">
                <StatusPill status={asset.assetStatus} />
                <ConditionPill condition={asset.assetCondition} />
                {warrantyStatus && (
                  <span className={`ad-badge ad-badge-${warrantyStatus === "Active" ? "good" : warrantyStatus === "Expired" ? "bad" : "warn"}`}>
                    {warrantyStatus === "Active" ? "🛡 Warranty Active" : warrantyStatus === "Expired" ? "🛡 Warranty Expired" : "🛡 Warranty Expiring Soon"}
                  </span>
                )}
                <span className="ad-badge ad-badge-neutral">{asset.assetType}</span>
              </div>
            </div>
          </div>

          <div className="ad-header-actions">
            <button className="btn btn-secondary" onClick={() => navigate(`/assets?edit=${asset.assetId}`)}>
              <IconEdit /> Edit Asset
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                toast?.("Opening Employees to assign or transfer this asset…", "info");
                navigate("/employees");
              }}
            >
              <IconUserPlus /> Assign / Transfer
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowMaintForm(true); requestAnimationFrame(() => maintenanceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }}
            >
              <IconWrench /> Maintenance
            </button>
            <button className="btn btn-secondary" onClick={handlePrintQr}>
              <IconQr /> Print QR
            </button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              <IconTrash /> {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>

        {/* ── Section 1: Overview ── */}
        <SectionCard title="Overview">
          <div className="ad-info-grid">
            <InfoCard label="Asset Name" value={asset.laptopName} />
            <InfoCard label="Asset ID" value={`#${asset.assetId}`} mono />
            <InfoCard label="Category" value={asset.assetType} />
            <InfoCard label="Brand" value={asset.brand} />
            <InfoCard label="Model" value={asset.model} />
            <InfoCard label="Serial Number" value={asset.serialNumber} mono />
            <InfoCard label="Condition" value={asset.assetCondition} />
            <InfoCard label="Current Status" value={asset.assetStatus} />
            <InfoCard label="Location" value={asset.location} />
            <InfoCard label="Created Date" value={createdEvent ? formatDate(createdEvent.timestamp) : null} />
            <InfoCard label="Updated Date" value={updatedEvent ? formatDate(updatedEvent.timestamp) : null} />
          </div>
        </SectionCard>

        {/* ── Section 2: Assignment ── */}
        <SectionCard title="Assignment Information">
          {asset.employeeName ? (
            <>
              <div className="ad-assignee">
                <div className="ad-assignee-avatar">{getInitials(asset.employeeName)}</div>
                <div>
                  <div className="ad-assignee-name">{asset.employeeName}</div>
                  <div className="ad-assignee-meta">
                    {asset.employeeRole || "Employee"}{asset.employeeId ? ` · ${asset.employeeId}` : ""}
                  </div>
                </div>
              </div>
              <div className="ad-info-grid" style={{ marginTop: 16 }}>
                <InfoCard label="Employee ID" value={asset.employeeId} mono />
                <InfoCard label="Role" value={asset.employeeRole} />
                <InfoCard label="Location" value={asset.location} />
                <InfoCard label="Assignment Type" value={asset.assignmentType} />
                <InfoCard label="Assigned Date" value={formatDate(asset.assignedDate)} />
                {asset.assignmentType === "Temporary" && (
                  <InfoCard label="Expected Return Date" value={formatDate(asset.temporaryExpiryDate)} />
                )}
              </div>
              {(asset.oldAssetIssues || asset.remarks) && (
                <div className="ad-notes">
                  <div className="ad-info-label">Notes</div>
                  <div className="ad-notes-text">{asset.oldAssetIssues || asset.remarks}</div>
                </div>
              )}
            </>
          ) : (
            <EmptyRow>Currently not assigned</EmptyRow>
          )}
        </SectionCard>

        {/* ── Section 3: Hardware Specifications ── */}
        <SectionCard title="Hardware Specifications" subtitle={specs.length === 0 ? "No hardware specs recorded for this asset" : undefined}>
          {specs.length === 0 ? (
            <EmptyRow>No hardware specifications on file for this asset.</EmptyRow>
          ) : (
            <div className="ad-info-grid">
              <InfoCard label="Processor" value={asset.processor} />
              <InfoCard label="RAM" value={asset.ram} />
              <InfoCard label="Storage" value={asset.storage} />
            </div>
          )}
        </SectionCard>

        {/* ── Section 4: Purchase & Warranty ── */}
        <SectionCard title="Purchase & Warranty">
          <div className="ad-info-grid">
            <InfoCard label="Vendor" value={asset.vendor} />
            <InfoCard label="Purchase Date" value={formatDate(asset.purchaseDate)} />
            <InfoCard label="Purchase Cost" value={asset.assetCost ? `₹${asset.assetCost}` : null} />
            <InfoCard label="Warranty End" value={formatDate(asset.warrantyExpiry)} />
            <InfoCard
              label="Warranty Status"
              value={warrantyStatus ? (warrantyStatus === "Expired" ? "Expired" : warrantyStatus === "Active" ? `Active${warrantyDays != null ? ` (${warrantyDays}d left)` : ""}` : `Expiring in ${warrantyDays}d`) : null}
            />
          </div>
        </SectionCard>

        {/* ── Section 5: Maintenance ── */}
        <div ref={maintenanceRef}>
          <SectionCard
            title="Maintenance"
            actions={
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMaintForm((s) => !s)}>
                {showMaintForm ? "Cancel" : "+ Schedule Maintenance"}
              </button>
            }
          >
            <div className="ad-info-grid" style={{ marginBottom: 16 }}>
              <InfoCard label="Current Condition" value={asset.assetCondition} />
              <InfoCard label="Last Service" value={lastService ? formatDate(lastService.completedDate) : null} />
              <InfoCard label="Next Service" value={nextService ? formatDate(nextService.scheduledDate) : null} />
              <InfoCard label="Fault Count" value={String(faultCount)} />
            </div>

            {showMaintForm && (
              <div className="ad-maint-form">
                <select className="input" value={maintForm.maintenanceType} onChange={(e) => setMaintForm({ ...maintForm, maintenanceType: e.target.value })}>
                  {["Preventive", "Corrective", "Inspection", "Upgrade"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input className="input" placeholder="Description" value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} />
                <input className="input" type="date" value={maintForm.scheduledDate} onChange={(e) => setMaintForm({ ...maintForm, scheduledDate: e.target.value })} />
                <input className="input" placeholder="Vendor" value={maintForm.vendor} onChange={(e) => setMaintForm({ ...maintForm, vendor: e.target.value })} />
                <input className="input" placeholder="Cost" value={maintForm.cost} onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })} />
                <button className="btn btn-primary" onClick={handleScheduleMaintenance}>Save</button>
              </div>
            )}

            <div className="ad-info-label" style={{ marginTop: 4, marginBottom: 8 }}>Repair History</div>
            {maintLoading && <div className="skeleton skeleton-row" />}
            {!maintLoading && maintRecords.length === 0 && <EmptyRow>No maintenance recorded yet.</EmptyRow>}
            {!maintLoading && maintRecords.length > 0 && (
              <ul className="ad-maint-list">
                {maintRecords.map((r) => (
                  <li key={r.id} className="ad-maint-item">
                    <div className="ad-maint-top">
                      <span className="ad-badge ad-badge-neutral">{r.maintenanceType}</span>
                      <select className="input" style={{ height: 28, fontSize: 12 }} value={r.status} onChange={(e) => handleMaintStatusChange(r, e.target.value)}>
                        {["Scheduled", "In Progress", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    {r.description && <div className="ad-maint-desc">{r.description}</div>}
                    <div className="ad-maint-meta">
                      {r.scheduledDate && `Scheduled: ${formatDate(r.scheduledDate)}`}
                      {r.vendor && ` · ${r.vendor}`}
                      {r.cost && ` · ₹${r.cost}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* ── Section 6: Asset Timeline ── */}
        <div ref={timelineRef}>
          <SectionCard title="Asset Timeline" subtitle="Everything recorded against this asset, oldest to newest">
            {timelineLoading && <div className="skeleton skeleton-block" style={{ height: 120 }} />}
            {!timelineLoading && timeline.length === 0 && <EmptyRow>No history recorded yet.</EmptyRow>}
            {!timelineLoading && timeline.length > 0 && (
              <div className="ad-vtimeline">
                {timeline.slice().reverse().map((e, i) => (
                  <div className="ad-vtimeline-item" key={i}>
                    <div className="ad-vtimeline-dot">{TIMELINE_ICON[e.source] || "•"}</div>
                    <div className="ad-vtimeline-content">
                      <div className="ad-vtimeline-title">{TIMELINE_LABEL[e.source] || e.source}{e.action ? ` · ${e.action}` : ""}</div>
                      <div className="ad-vtimeline-desc">{e.description}</div>
                      <div className="ad-vtimeline-meta">
                        {formatDateTime(e.timestamp)}{e.performedBy ? ` · ${e.performedBy}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Section 7: Documents ── */}
        <SectionCard title="Documents">
          <div className="ad-doc-upload-row">
            <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="btn btn-primary" disabled={!file || uploading} onClick={handleUploadDoc}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>

          {docsLoading && <div className="skeleton skeleton-row" style={{ marginTop: 12 }} />}
          {!docsLoading && docs.length === 0 && <EmptyRow>No documents uploaded yet — invoices, warranty cards, and manuals will appear here.</EmptyRow>}
          {!docsLoading && docs.length > 0 && (
            <div className="ad-doc-grid">
              {docs.map((d) => (
                <div className="ad-doc-card" key={d.id}>
                  <div className="ad-doc-icon"><IconFile /></div>
                  <div className="ad-doc-info">
                    <div className="ad-doc-name" title={d.originalFileName}>{d.originalFileName}</div>
                    <div className="ad-doc-meta">{d.documentType} · {new Date(d.uploadedAt).toLocaleDateString()}</div>
                  </div>
                  <a className="ad-doc-action" href={`${API}/api/admin/assets/${assetId}/documents/${d.id}/download`} target="_blank" rel="noreferrer" title="Download">
                    <IconDownload />
                  </a>
                  <button className="ad-doc-action ad-doc-del" onClick={() => handleDeleteDoc(d.id)} title="Delete">✕</button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Section 8: Audit Information ── */}
        <SectionCard title="Audit Information">
          <div className="ad-info-grid">
            <InfoCard label="Created By" value={createdEvent?.performedBy} />
            <InfoCard label="Created On" value={createdEvent ? formatDateTime(createdEvent.timestamp) : null} />
            <InfoCard label="Updated By" value={updatedEvent?.performedBy} />
            <InfoCard label="Updated On" value={updatedEvent ? formatDateTime(updatedEvent.timestamp) : null} />
          </div>
        </SectionCard>

      </div>
    </Layout>
  );
}
