import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import StatusPill from "../components/StatusPill";
import EmployeeStatusPill from "../components/EmployeeStatusPill";
import SeparationModal from "../components/SeparationModal";
import ActionMenu from "../components/ActionMenu";
import ReturnAssetDialog from "../components/ReturnAssetDialog";
import "../components/DetailDrawer.css";
import "./Employees.css";

import { API_BASE as API } from "../config";

const EMPTY_FORM = {
  employeeId: "", employeeName: "", email: "",
  department: "", designation: "", location: "", joiningDate: "", manager: "",
};

// The 5-stage lifecycle + "All". "Notice Period" also covers the legacy
// Exit Clearance / Assets Returned sub-stages so nothing in the middle of
// separation falls through the cracks.
const STATUS_TABS = [
  { key: "Active", label: "Active" },
  { key: "On Leave", label: "On Leave" },
  { key: "Notice Period", label: "Notice Period" },
  { key: "Resigned", label: "Resigned" },
  { key: "Terminated", label: "Terminated" },
  { key: "All", label: "All Employees" },
];
const NOTICE_PERIOD_BUCKET = ["Notice Period", "Exit Clearance", "Assets Returned"];

const LOCATIONS = ["Mumbai"];

function avatarBg(name) {
  const colors = ["#1a56db", "#059669", "#7c3aed", "#b45309", "#be185d", "#0284c7"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Premium two-tone gradient avatar (card-only; drawer keeps its
// original solid avatarBg so nothing else visually shifts) ──────────
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#2563eb,#1e3a8a)",
  "linear-gradient(135deg,#059669,#065f46)",
  "linear-gradient(135deg,#7c3aed,#4c1d95)",
  "linear-gradient(135deg,#d97706,#92400e)",
  "linear-gradient(135deg,#db2777,#831843)",
  "linear-gradient(135deg,#0284c7,#0c4a6e)",
  "linear-gradient(135deg,#4f46e5,#312e81)",
  "linear-gradient(135deg,#0d9488,#134e4a)",
];
function avatarGradient(name) {
  return AVATAR_GRADIENTS[(name || "A").charCodeAt(0) % AVATAR_GRADIENTS.length];
}

// ── Compact icon set for the redesigned employee card ────────────────
const IconSearch  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconX        = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconPlus     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconMail     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>;
const IconBuilding = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/></svg>;
const IconBriefcase= () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const IconPin      = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconBox      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
const IconClock    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconEye      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconUserPlus = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>;
const IconEdit     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
const IconTrash    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconUserMinus= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg>;
const IconUsers    = () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconUserCheck= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
const IconPause    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>;
const IconBan      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;

// ─── Assign Asset Modal ────────────────────────────────────────────────────────
function AssignAssetModal({ employee, onClose, onSuccess }) {
  const toast = useToast();
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Permanent vs Temporary assignment — starts unset so the admin must
  // consciously choose one; it can't be skipped by leaving a default in place.
  const [assignmentType, setAssignmentType] = useState("");
  const [temporaryReason, setTemporaryReason] = useState("");
  const [temporaryDurationDays, setTemporaryDurationDays] = useState("2");
  const [customDurationDays, setCustomDurationDays] = useState("");

  // Old asset condition
  const [oldAssetIssues, setOldAssetIssues] = useState("");

  // Post-assignment: "form" while filling in details, "emailChoice" once the
  // asset has been assigned and we're asking whether to email the employee now.
  const [stage, setStage] = useState("form");
  const [assignedAsset, setAssignedAsset] = useState(null); // { assetId, laptopName }
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    setLoadingAssets(true);
    axios.get(`${API}/assets/available`)
      .then((r) => setAvailableAssets(r.data))
      .catch(() => setAvailableAssets([]))
      .finally(() => setLoadingAssets(false));
  }, []);

  const filteredAssets = useMemo(() => {
    const q = assetSearch.toLowerCase();
    return availableAssets.filter((a) =>
      (a.laptopName || "").toLowerCase().includes(q) ||
      (a.assetType || "").toLowerCase().includes(q) ||
      (a.brand || "").toLowerCase().includes(q) ||
      (a.model || "").toLowerCase().includes(q) ||
      (a.serialNumber || "").toLowerCase().includes(q) ||
      (a.location || "").toLowerCase().includes(q)
    );
  }, [availableAssets, assetSearch]);

  const effectiveDurationDays =
    temporaryDurationDays === "custom" ? Number(customDurationDays) : Number(temporaryDurationDays);

  const handleAssign = () => {
    if (!selectedAssetId) {
      toast("Please select an asset to assign.", "error");
      return;
    }
    if (!assignedDate) {
      toast("Assigned date is required.", "error");
      return;
    }
    if (!assignmentType) {
      toast("Please choose whether this is a Permanent or Temporary assignment.", "error");
      return;
    }
    if (assignmentType === "Temporary") {
      if (!temporaryReason.trim()) {
        toast("Please provide a reason for the temporary assignment.", "error");
        return;
      }
      if (!effectiveDurationDays || effectiveDurationDays <= 0) {
        toast("Please select a valid duration for the temporary assignment.", "error");
        return;
      }
    }
    const asset = availableAssets.find((a) => a.assetId === selectedAssetId);
    setAssigning(true);
    axios.put(`${API}/assets/assign/${selectedAssetId}`, {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      employeeRole: employee.role || "EMPLOYEE",
      location: employee.location || "",
      assignedDate,
      remarks,
      assignmentType,
      temporaryReason: assignmentType === "Temporary" ? temporaryReason.trim() : undefined,
      temporaryDurationDays: assignmentType === "Temporary" ? effectiveDurationDays : undefined,
      oldAssetIssues: oldAssetIssues.trim() || undefined,
    })
      .then(() => {
        toast("Asset assigned successfully.", "success");
        setAssignedAsset({ assetId: selectedAssetId, laptopName: asset?.laptopName || "the asset" });
        setStage("emailChoice"); // ask "send the assignment email now, or later?"
        setAssigning(false);
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Failed to assign asset.", "error");
        setAssigning(false);
      });
  };

  const handleSendEmailNow = () => {
    if (!assignedAsset) return;
    setSendingEmail(true);
    axios.post(`${API}/assets/send-email/${assignedAsset.assetId}`)
      .then(() => {
        toast("Assignment email sent.", "success");
        onSuccess();
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Couldn't send the email — you can retry it later from the asset row.", "error");
        onSuccess();
      })
      .finally(() => setSendingEmail(false));
  };

  const handleSendEmailLater = () => {
    toast("You can send the assignment email anytime from the asset's row.", "info");
    onSuccess();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Modal */}
      <div
        className="modal-content"
        style={{ width: "min(780px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h3 className="modal-title">Assign Asset</h3>
            <div className="card-subtitle" style={{ marginTop: 4 }}>
              Select an available asset to assign to this employee
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
        {stage === "form" ? (
          <>

          {/* Employee Info */}
          <div style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
            border: "1px solid #dbeafe",
            borderRadius: 12, padding: "16px 18px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#1d4ed8", marginBottom: 12 }}>
              Employee Information
            </div>
            <div className="kpi-row kpi-row-4 stagger-in">
              {[
                { label: "Employee ID", value: employee.employeeId },
                { label: "Employee Name", value: employee.employeeName },
                { label: "Department", value: employee.department || "—" },
                { label: "Location", value: employee.location || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gray-900)" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Search */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)", marginBottom: 10 }}>
              Available Assets
              {!loadingAssets && (
                <span style={{ fontWeight: 500, color: "var(--gray-400)", fontSize: 12, marginLeft: 8 }}>
                  ({filteredAssets.length} of {availableAssets.length})
                </span>
              )}
            </div>

            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }}
                width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="input"
                style={{ paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
                placeholder="Search by name, type, brand, model, serial, location…"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
              />
              {assetSearch && (
                <button
                  onClick={() => setAssetSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 13 }}
                >✕</button>
              )}
            </div>

            {/* Asset list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
              {loadingAssets ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--gray-400)", fontSize: 13 }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 10px", width: 22, height: 22 }} />
                  Loading available assets…
                </div>
              ) : filteredAssets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📦</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-500)" }}>
                    {assetSearch ? "No assets match your search." : "No available assets in inventory."}
                  </div>
                </div>
              ) : filteredAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.assetId;
                return (
                  <label
                    key={asset.assetId}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      border: isSelected ? "2px solid #1a56db" : "1.5px solid var(--gray-200)",
                      borderRadius: 12, padding: "12px 14px",
                      cursor: "pointer",
                      background: isSelected ? "#eff6ff" : "#fff",
                      boxShadow: isSelected ? "0 0 0 3px #1a56db18" : "none",
                      transition: "all 0.13s",
                    }}
                  >
                    <input
                      type="radio"
                      name="assignAsset"
                      value={asset.assetId}
                      checked={isSelected}
                      onChange={() => setSelectedAssetId(asset.assetId)}
                      style={{ marginTop: 2, accentColor: "#1a56db", flexShrink: 0 }}
                    />
                    <div className="asset-row-grid">
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gray-900)" }}>{asset.laptopName}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Asset Name</div>
                      </div>
                      <div>
                        <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700 }}>
                          {asset.assetType}
                        </span>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 3 }}>Type</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-700)" }}>{asset.brand}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Brand</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-700)" }}>{asset.model || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Model</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, background: "var(--gray-100)", padding: "2px 6px", borderRadius: 4, color: "var(--gray-600)", display: "inline-block" }}>
                          {asset.serialNumber}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 3 }}>Serial No.</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--gray-600)" }}>{asset.location || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Location</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusPill status={asset.assetStatus} />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Assignment Details */}
          <div className="grid-1-2">
            <div className="field">
              <label className="field-label">Assigned Date *</label>
              <input
                className="input"
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Remarks <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(optional)</span></label>
              <input
                className="input"
                placeholder="e.g. Issued for project work, replacement for old device…"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          {/* Assignment Type: Permanent vs Temporary — only shown once an asset is selected */}
          {selectedAssetId && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)", marginBottom: 10 }}>
              Assignment Type *
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {["Permanent", "Temporary"].map((type) => (
                <label
                  key={type}
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", gap: 8,
                    border: assignmentType === type ? "2px solid #1a56db" : "1.5px solid var(--gray-200)",
                    borderRadius: 10, padding: "10px 14px",
                    cursor: "pointer",
                    background: assignmentType === type ? "#eff6ff" : "#fff",
                    fontSize: 13, fontWeight: 700,
                    color: assignmentType === type ? "#1a56db" : "var(--gray-700)",
                  }}
                >
                  <input
                    type="radio"
                    name="assignmentType"
                    value={type}
                    checked={assignmentType === type}
                    onChange={() => setAssignmentType(type)}
                    style={{ accentColor: "#1a56db" }}
                  />
                  {type === "Permanent" ? "🔒 Permanent" : "⏳ Temporary"}
                </label>
              ))}
            </div>

            {assignmentType === "Temporary" && (
              <div style={{
                marginTop: 12, padding: "14px 16px",
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="field-label">Reason for Temporary Assignment *</label>
                  <input
                    className="input"
                    placeholder="e.g. Employee's laptop is under repair"
                    value={temporaryReason}
                    onChange={(e) => setTemporaryReason(e.target.value)}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="field-label">How long will the laptop be assigned? *</label>
                  <select
                    className="form-select"
                    value={temporaryDurationDays}
                    onChange={(e) => setTemporaryDurationDays(e.target.value)}
                  >
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="custom">Custom…</option>
                  </select>
                  {temporaryDurationDays === "custom" && (
                    <input
                      className="input"
                      type="number"
                      min="1"
                      style={{ marginTop: 8 }}
                      placeholder="Number of days"
                      value={customDurationDays}
                      onChange={(e) => setCustomDurationDays(e.target.value)}
                    />
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--gray-500)", marginTop: 6 }}>
                    An email reminder will automatically be sent once this period expires, asking for
                    the laptop to be collected back.
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Old Asset Condition */}
          <div className="field" style={{ margin: 0 }}>
            <label className="field-label">
              Any issues with the old asset? <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(optional)</span>
            </label>
            <textarea
              className="input"
              rows={2}
              style={{ resize: "vertical", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
              placeholder="e.g. Cracked screen, battery not holding charge, missing charger…"
              value={oldAssetIssues}
              onChange={(e) => setOldAssetIssues(e.target.value)}
            />
          </div>
          </>
        ) : (
          /* Email choice — shown right after a successful assignment */
          <div style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gray-900)", marginBottom: 6 }}>
              {assignedAsset?.laptopName} assigned to {employee.employeeName}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--gray-600)", marginBottom: 24, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Do you want to send the assignment notification email to the employee now, or send it later
              from the asset's row?
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={handleSendEmailLater} disabled={sendingEmail}>
                Send Later
              </button>
              <button className="btn btn-primary" onClick={handleSendEmailNow} disabled={sendingEmail} style={{ minWidth: 150 }}>
                {sendingEmail ? "Sending…" : "📧 Send Now"}
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Footer */}
        {stage === "form" && (
          <div style={{
            display: "flex", gap: 10, justifyContent: "flex-end",
            padding: "16px 26px",
            borderTop: "1px solid var(--gray-100)",
            flexShrink: 0,
            background: "#fafafa",
          }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={assigning}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAssign}
              disabled={assigning || !selectedAssetId || !assignmentType}
              style={{ minWidth: 140 }}
            >
              {assigning ? "Assigning…" : "✓ Assign Asset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee Detail Drawer ─────────────────────────────────────────────────
function EmployeeDetailDrawer({ employee, assets, loadingAssets, onClose, onEdit, onDelete, onAssign, onSeparation, onReturn }) {
  const navigate = useNavigate();
  if (!employee) return null;
  const isSeparating = employee.employmentStatus && employee.employmentStatus !== "Active";
  return (
    <div className="detail-drawer-overlay" onClick={onClose}>
      <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>

        {/* Hero */}
        <div className="detail-drawer-hero" style={{ background: `linear-gradient(135deg, ${avatarBg(employee.employeeName)}, #1e293b)` }}>
          <button className="detail-drawer-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="detail-drawer-icon" style={{ fontSize: 20, fontWeight: 700 }}>
            {initials(employee.employeeName)}
          </div>
          <h3 className="detail-drawer-name">{employee.employeeName}</h3>
          <div className="detail-drawer-sub">
            {employee.employeeId}{employee.designation ? ` · ${employee.designation}` : ""}{employee.department ? ` · ${employee.department}` : ""}
          </div>
          <div className="detail-drawer-pills">
            <span className="pill" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
              {employee.employmentStatus || "Active"}
            </span>
            {employee.mustChangePassword && <span className="pill" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>Default password</span>}
          </div>
        </div>

        {/* Body */}
        <div className="detail-drawer-body">
          <div className="detail-drawer-section">
            <div className="detail-drawer-section-title">Profile</div>
            <div className="detail-drawer-grid">
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Email</div>
                <div className="detail-drawer-stat-value">{employee.email || "—"}</div>
              </div>
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Location</div>
                <div className="detail-drawer-stat-value">{employee.location || "—"}</div>
              </div>
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Department</div>
                <div className="detail-drawer-stat-value">{employee.department || "—"}</div>
              </div>
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Role</div>
                <div className="detail-drawer-stat-value">{employee.role || "—"}</div>
              </div>
            </div>
          </div>

          <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
            <div className="detail-drawer-section-title">
              Assigned Assets {assets && assets.length > 0 && `(${assets.length})`}
            </div>
            {loadingAssets ? (
              <div style={{ fontSize: 12.5, color: "var(--gray-400)" }}>Loading assets…</div>
            ) : !assets || assets.length === 0 ? (
              <div className="detail-drawer-empty">
                Not currently assigned any assets.
              </div>
            ) : (
              <table className="detail-drawer-mini-table">
                <thead>
                  <tr><th>Asset</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {assets.map((item) => (
                    <tr key={item.assetId}>
                      <td
                        onClick={() => navigate(`/assets/${item.assetId}`)}
                        style={{ cursor: "pointer" }}
                        title="Click to view full asset details"
                      >
                        <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{item.laptopName}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>
                          {item.assetType}{item.brand ? ` · ${item.brand}` : ""}{item.model ? ` ${item.model}` : ""}
                        </div>
                      </td>
                      <td><StatusPill status={item.assetStatus} /></td>
                      <td>
                        {item.assetStatus === "Assigned" && onReturn && (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Return this asset"
                            onClick={(e) => { e.stopPropagation(); onReturn(item); }}
                          >
                            ↩ Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {isSeparating && (
            <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
              <div className="detail-drawer-section-title">Separation History</div>
              <div className="detail-drawer-grid">
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Notice Start Date</div>
                  <div className="detail-drawer-stat-value">{employee.noticeStartDate || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Last Working Date</div>
                  <div className="detail-drawer-stat-value">{employee.lastWorkingDate || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Resignation Reason</div>
                  <div className="detail-drawer-stat-value">{employee.resignationReason || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Clearance Completion Date</div>
                  <div className="detail-drawer-stat-value">{employee.clearanceCompletionDate || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Final Status</div>
                  <div className="detail-drawer-stat-value">{employee.employmentStatus}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Resigned Date</div>
                  <div className="detail-drawer-stat-value">{employee.resignedDate || "—"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="detail-drawer-footer" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ flex: "1 1 auto" }} onClick={() => onAssign(employee)}>
            ➕ Assign Asset
          </button>
          <button className="btn btn-secondary" onClick={() => onSeparation(employee)}>
            🚪 {isSeparating ? "Manage Separation" : "Start Resignation"}
          </button>
          <button className="btn btn-secondary" onClick={() => onEdit(employee)}>✏ Edit</button>
          <button className="btn btn-danger" onClick={() => onDelete(employee)}>🗑 Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Place On Leave Modal ───────────────────────────────────────────────
function OnLeaveModal({ employee, onClose, onSuccess }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [reasons, setReasons] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/admin/employees/leave/reasons`)
      .then((r) => setReasons(r.data || []))
      .catch(() => setReasons(["Medical Leave", "Personal Leave", "Other"]));
  }, []);

  const submit = () => {
    if (!reason) { toast("Please select a leave reason.", "error"); return; }
    setSaving(true);
    axios.post(`${API}/api/admin/employees/${employee.employeeId}/leave/start`, {
      reason, startDate, endDate: endDate || undefined, remarks: remarks || undefined,
    })
      .then(() => { toast(`${employee.employeeName} placed On Leave.`, "success"); onSuccess(); onClose(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't place employee on leave.", "error"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">Place On Leave</div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 14 }}>
            {employee.employeeName} ({employee.employeeId}) will be marked On Leave. Login stays enabled.
          </p>
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field-label">Leave Reason *</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select reason…</option>
              {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Start Date</label>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Expected End Date</label>
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">Remarks</label>
            <textarea className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Place On Leave"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Terminate Employee Modal ───────────────────────────────────────────
function TerminateModal({ employee, onClose, onSuccess }) {
  const toast = useToast();
  const [reasons, setReasons] = useState([]);
  const [exitReason, setExitReason] = useState("");
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split("T")[0]);
  const [exitRemarks, setExitRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingAssets, setPendingAssets] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/admin/employees/separation/reasons`)
      .then((r) => setReasons(r.data || []))
      .catch(() => setReasons(["Policy Violation", "Performance", "Other"]));
  }, []);

  const submit = () => {
    if (!exitReason) { toast("Please select an exit reason.", "error"); return; }
    if (!terminationDate) { toast("Termination date is required.", "error"); return; }
    setSaving(true);
    setPendingAssets(null);
    axios.post(`${API}/api/admin/employees/${employee.employeeId}/terminate`, {
      terminationDate, exitReason, exitRemarks: exitRemarks || undefined,
    })
      .then(() => { toast(`${employee.employeeName} has been terminated. Login disabled.`, "success"); onSuccess(); onClose(); })
      .catch((err) => {
        if (err.response?.status === 409 && err.response?.data?.details) {
          setPendingAssets(err.response.data.details);
          toast("This employee still has assets assigned. Return them first.", "error");
        } else {
          toast(err.response?.data?.message || "Couldn't terminate employee.", "error");
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">Terminate Employee</div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 14 }}>
            {employee.employeeName} ({employee.employeeId}) will be marked <strong>Terminated</strong>.
            Login access is disabled immediately and the record is preserved permanently.
          </p>
          {pendingAssets && pendingAssets.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12.5, color: "#991b1b" }}>
              <strong>{pendingAssets.length} asset(s) still assigned.</strong> Return them from Assets before terminating:
              <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                {pendingAssets.map((a) => <li key={a.assetId}>{a.laptopName} ({a.serialNumber})</li>)}
              </ul>
            </div>
          )}
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field-label">Exit Reason *</label>
            <select className="input" value={exitReason} onChange={(e) => setExitReason(e.target.value)}>
              <option value="">Select reason…</option>
              {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field-label">Termination Date *</label>
            <input className="input" type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Exit Remarks</label>
            <textarea className="input" rows={2} value={exitRemarks} onChange={(e) => setExitRemarks(e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={submit} disabled={saving}>{saving ? "Terminating…" : "Terminate Employee"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Employees Page ───────────────────────────────────────────────────────
export default function Employees() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [expandedAssets, setExpandedAssets] = useState({});
  const [assetCounts, setAssetCounts] = useState({});
  // Most recent asset-assignment per employee, derived from the same
  // per-employee assets fetch used for assetCounts below — no extra
  // API calls. Used to render a genuine "Last Activity" signal.
  const [lastActivityById, setLastActivityById] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Assign Asset modal state
  const [assignTarget, setAssignTarget] = useState(null);
  // Employee Separation / Resignation modal state
  const [separationTarget, setSeparationTarget] = useState(null);
  // On Leave / Terminate modal state
  const [leaveTarget, setLeaveTarget] = useState(null);
  const [terminateTarget, setTerminateTarget] = useState(null);
  // Return Asset modal state (launched from the detail drawer's Assigned Assets list)
  const [returnTarget, setReturnTarget] = useState(null);
  const [returning, setReturning] = useState(false);

  // ── Lifecycle status tab (Active / On Leave / Notice Period / Resigned / Terminated / All) ──
  const [statusTab, setStatusTab] = useState("Active");
  const [resignedView, setResignedView] = useState([]);
  const [loadingResignedView, setLoadingResignedView] = useState(false);

  // ── Filters (all client-side, presentational only) ─────────────────
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [designationFilter, setDesignationFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [passwordStatusFilter, setPasswordStatusFilter] = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");
  // Row-level "⋮" menu — only one open at a time
  const [openMenuId, setOpenMenuId] = useState(null);

  const loadEmployees = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/admin/employees`)
      .then((r) => {
        const emps = r.data;
        setEmployees(emps);
        setError("");
        // Load asset counts (+ last-activity) for all employees
        Promise.all(
          emps.map((emp) =>
            axios.get(`${API}/api/admin/employees/${emp.employeeId}/assets`)
              .then((res) => ({ id: emp.employeeId, assets: res.data || [] }))
              .catch(() => ({ id: emp.employeeId, assets: [] }))
          )
        ).then((results) => {
          const counts = {};
          const lastActivity = {};
          results.forEach(({ id, assets }) => {
            counts[id] = assets.length;
            const latest = assets.reduce((acc, a) => {
              if (!a.assignedDate) return acc;
              if (!acc || a.assignedDate > acc.assignedDate) return a;
              return acc;
            }, null);
            if (latest) lastActivity[id] = { laptopName: latest.laptopName, assignedDate: latest.assignedDate };
          });
          setAssetCounts(counts);
          setLastActivityById(lastActivity);
        });
      })
      .catch(() => { setEmployees([]); setError("Couldn't load the employee directory. Is the API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  useEffect(() => {
    if (statusTab !== "Resigned") return;
    setLoadingResignedView(true);
    axios.get(`${API}/api/admin/employees/resigned`)
      .then((r) => setResignedView(r.data || []))
      .catch(() => setResignedView([]))
      .finally(() => setLoadingResignedView(false));
  }, [statusTab, employees]);

  const endLeave = (emp) => {
    axios.post(`${API}/api/admin/employees/${emp.employeeId}/leave/end`)
      .then(() => { toast(`${emp.employeeName} restored to Active.`, "success"); loadEmployees(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't end leave.", "error"));
  };

  const reactivateEmployee = (emp) => {
    if (!window.confirm(`Reactivate ${emp.employeeName} (${emp.employeeId})? Their status will be set back to Active and login access restored.`)) return;
    axios.post(`${API}/api/admin/employees/${emp.employeeId}/reactivate`)
      .then(() => { toast(`${emp.employeeName} reactivated.`, "success"); loadEmployees(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't reactivate employee.", "error"));
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const getEmployeeIdentifier = (emp) => emp?.id ?? emp?.employeeId;

  const startCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };

  const startEdit = (emp) => {
    setEditingId(getEmployeeIdentifier(emp));
    setForm({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName || "",
      email: emp.email || "",
      department: emp.department || "",
      designation: emp.designation || "",
      location: emp.location || "",
      joiningDate: emp.joiningDate || "",
      manager: emp.manager || "",
    });
    setShowForm(true);
  };

  const saveEmployee = () => {
    if (!form.employeeName || (!editingId && !form.employeeId)) {
      toast("Employee ID and name are required.", "error");
      return;
    }
    setSaving(true);
    const request = editingId
      ? axios.put(`${API}/api/admin/employees/${encodeURIComponent(editingId)}`, form)
      : axios.post(`${API}/api/admin/employees`, form);

    request
      .then(() => {
         toast(editingId ? "Employee updated." : "Employee created. The employee must change their password on first login.", "success");
        setShowForm(false);
        setForm(EMPTY_FORM);
        setEditingId(null);
        loadEmployees();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't save employee.", "error"))
      .finally(() => setSaving(false));
  };

  const deleteEmployee = (emp) => {
    const employeeIdentifier = getEmployeeIdentifier(emp);
    if (!window.confirm(`Remove ${emp.employeeName} (${emp.employeeId}) from the directory?`)) return;
    axios.delete(`${API}/api/admin/employees/${encodeURIComponent(employeeIdentifier)}`)
      .then(() => { toast("Employee deleted.", "success"); loadEmployees(); })
      .catch(() => toast("Couldn't delete employee.", "error"));
  };

  const openProfile = (emp) => {
    setViewingEmployee(emp);
    const key = emp.employeeId;
    if (!expandedAssets[key]) {
      axios.get(`${API}/api/admin/employees/${key}/assets`)
        .then((r) => setExpandedAssets((prev) => ({ ...prev, [key]: r.data })))
        .catch(() => setExpandedAssets((prev) => ({ ...prev, [key]: [] })));
    }
  };

  const handleAssignSuccess = () => {
    setAssignTarget(null);
    // Refresh employees + clear expanded assets cache so they reload fresh
    setExpandedAssets({});
    loadEmployees();
  };

  const handleReturn = (assetId, { condition, nextStatus, sendReturnEmail }) => {
    const employeeKey = viewingEmployee?.employeeId;
    setReturning(true);
    axios.put(`${API}/assets/return/${assetId}`, { condition, assetStatus: nextStatus, sendReturnEmail: sendReturnEmail ? "true" : "false" })
      .then(() => {
        toast(sendReturnEmail ? "Asset returned and return email sent to the employee." : "Asset returned and inventory updated.", "success");
        setReturnTarget(null);
        // Re-fetch just this employee's assigned assets so the drawer
        // (and the directory's asset-count badge) reflect the return
        // immediately, without a full page reload.
        if (employeeKey) {
          axios.get(`${API}/api/admin/employees/${employeeKey}/assets`)
            .then((r) => {
              setExpandedAssets((prev) => ({ ...prev, [employeeKey]: r.data }));
              setAssetCounts((prev) => ({ ...prev, [employeeKey]: (r.data || []).length }));
            })
            .catch(() => {});
        }
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't process return.", "error"))
      .finally(() => setReturning(false));
  };

  const handleSeparationSuccess = () => {
    // Keep the modal open (workflow spans multiple steps) but refresh the
    // directory in the background so status badges / counts stay live.
    setExpandedAssets({});
    loadEmployees();
  };

  const uniqueLocations = useMemo(() => {
    const fromData = employees.map((e) => e.location).filter(Boolean);
    const combined = Array.from(new Set([...LOCATIONS, ...fromData])).sort();
    return ["All", ...combined];
  }, [employees]);

  const uniqueDepartments = useMemo(() => {
    const fromData = employees.map((e) => e.department).filter(Boolean);
    return ["All", ...Array.from(new Set(fromData)).sort()];
  }, [employees]);

  const uniqueDesignations = useMemo(() => {
    const fromData = employees.map((e) => e.designation).filter(Boolean);
    return ["All", ...Array.from(new Set(fromData)).sort()];
  }, [employees]);

  const uniqueRoles = useMemo(() => {
    const fromData = employees.map((e) => e.role || "EMPLOYEE").filter(Boolean);
    return ["All", ...Array.from(new Set(fromData)).sort()];
  }, [employees]);

  const directory = useMemo(
    () => employees.filter((e) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (e.employeeName || "").toLowerCase().includes(q) ||
        (e.employeeId || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q) ||
        (e.designation || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q);
      const matchesLocation = locationFilter === "All" || e.location === locationFilter;
      const matchesDept = departmentFilter === "All" || e.department === departmentFilter;
      const matchesDesignation = designationFilter === "All" || e.designation === designationFilter;
      const matchesRole = roleFilter === "All" || (e.role || "EMPLOYEE") === roleFilter;
      const matchesPasswordStatus =
        passwordStatusFilter === "All" ||
        (passwordStatusFilter === "Default" ? e.mustChangePassword : !e.mustChangePassword);
      const count = assetCounts[e.employeeId] || 0;
      const matchesAssetFilter =
        assetFilter === "All" || (assetFilter === "Assigned" ? count > 0 : count === 0);
      const status = e.employmentStatus || "Active";
      const matchesStatusTab =
        statusTab === "All" ? true :
        statusTab === "Notice Period" ? NOTICE_PERIOD_BUCKET.includes(status) :
        status === statusTab;
      return matchesSearch && matchesLocation && matchesDept && matchesDesignation &&
        matchesRole && matchesPasswordStatus && matchesAssetFilter && matchesStatusTab;
    }),
    [employees, search, locationFilter, departmentFilter, designationFilter, roleFilter, passwordStatusFilter, assetFilter, assetCounts, statusTab]
  );

  const statusTabCounts = useMemo(() => {
    const counts = { Active: 0, "On Leave": 0, "Notice Period": 0, Resigned: 0, Terminated: 0, All: employees.length };
    employees.forEach((e) => {
      const status = e.employmentStatus || "Active";
      if (NOTICE_PERIOD_BUCKET.includes(status)) counts["Notice Period"] += 1;
      else if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [employees]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (locationFilter !== "All") chips.push({ key: "location", label: `Location: ${locationFilter}`, clear: () => setLocationFilter("All") });
    if (departmentFilter !== "All") chips.push({ key: "department", label: `Dept: ${departmentFilter}`, clear: () => setDepartmentFilter("All") });
    if (designationFilter !== "All") chips.push({ key: "designation", label: `Title: ${designationFilter}`, clear: () => setDesignationFilter("All") });
    if (roleFilter !== "All") chips.push({ key: "role", label: `Role: ${roleFilter === "ADMIN" ? "Admin" : "Employee"}`, clear: () => setRoleFilter("All") });
    if (passwordStatusFilter !== "All") chips.push({ key: "pwd", label: `Password: ${passwordStatusFilter === "Default" ? "Default" : "Changed"}`, clear: () => setPasswordStatusFilter("All") });
    if (assetFilter !== "All") chips.push({ key: "asset", label: `Assets: ${assetFilter}`, clear: () => setAssetFilter("All") });
    return chips;
  }, [locationFilter, departmentFilter, designationFilter, roleFilter, passwordStatusFilter, assetFilter]);

  const resetAllFilters = () => {
    setLocationFilter("All"); setDepartmentFilter("All"); setDesignationFilter("All");
    setRoleFilter("All"); setPasswordStatusFilter("All"); setAssetFilter("All"); setSearch("");
  };

  // ── Summary stats for the toolbar ───────────────────────────────────
  const defaultPasswordCount = useMemo(
    () => employees.filter((e) => e.mustChangePassword).length,
    [employees]
  );
  const assignedCount = useMemo(
    () => employees.filter((e) => (assetCounts[e.employeeId] || 0) > 0).length,
    [employees, assetCounts]
  );

  return (
    <Layout
      title="Employees"
      subtitle="Manage your organization's employee directory"
      actions={
        <button
          className={`btn btn-primary emp-add-btn${showForm ? " is-cancel btn-secondary" : ""}`}
          onClick={showForm ? () => setShowForm(false) : startCreate}
        >
          <span className="emp-add-icon">{showForm ? <IconX size={13} /> : <IconPlus />}</span>
          {showForm ? "Cancel" : "Add Employee"}
        </button>
      }
    >
      <div className="emp-page">
        {error && (
          <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", padding: "12px 18px", fontSize: 13, color: "#991b1b" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Lifecycle Status Tabs ─────────────────────────────────── */}
        <div className="emp-status-tabs" role="tablist" aria-label="Filter employees by status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={statusTab === tab.key}
              className={`emp-status-tab${statusTab === tab.key ? " is-active" : ""}`}
              onClick={() => setStatusTab(tab.key)}
            >
              {tab.label}
              <span className="emp-status-tab-count">{statusTabCounts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? "Edit Employee" : "Add New Employee"}</div>
                <div className="card-subtitle">
                  {editingId
                    ? "Update this employee's profile details"
                     : "New employees must change their password on first login"}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">Employee ID *</label>
                  <input className="input" {...field("employeeId")} placeholder="e.g. EMP006" />
                </div>
                <div className="field">
                  <label className="field-label">Full Name *</label>
                  <input className="input" {...field("employeeName")} placeholder="Jane Doe" />
                </div>
                <div className="field">
                  <label className="field-label">Email</label>
                  <input className="input" type="email" {...field("email")} placeholder="jane.doe@company.com" />
                </div>
                <div className="field">
                  <label className="field-label">Department</label>
                  <input className="input" {...field("department")} placeholder="Engineering" />
                </div>
                <div className="field">
                  <label className="field-label">Designation</label>
                  <input className="input" {...field("designation")} placeholder="Software Engineer" />
                </div>
                <div className="field">
                  <label className="field-label">Location</label>
                  <select className="input" {...field("location")}>
                    <option value="">Select branch…</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Joining Date</label>
                  <input className="input" type="date" {...field("joiningDate")} />
                </div>
                <div className="field">
                  <label className="field-label">Reporting Manager</label>
                  <input className="input" {...field("manager")} placeholder="e.g. Priya Raman" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button className="btn btn-primary" onClick={saveEmployee} disabled={saving}>
                  {saving ? "Saving…" : editingId ? "✓ Save Changes" : "✓ Create Employee"}
                </button>
                <button className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toolbar: stats + search + filters ─────────────────────── */}
        <div className="emp-toolbar">
          <div className="emp-toolbar-top">
            <div className="emp-stats">
              <span className="emp-stats-count">{directory.length}</span>
              <span className="emp-stats-label">
                {directory.length === employees.length ? "employees" : `of ${employees.length} employees`}
              </span>
              {(assignedCount > 0 || defaultPasswordCount > 0) && (
                <>
                  <span className="emp-stats-sep">•</span>
                  <span className="emp-stats-breakdown">
                    <span className="emp-stats-chip">
                      <span className="emp-stats-dot" style={{ background: "var(--badge-success-fg)" }} />
                      {assignedCount} with assets
                    </span>
                    {defaultPasswordCount > 0 && (
                      <span className="emp-stats-chip">
                        <span className="emp-stats-dot" style={{ background: "var(--badge-warning-fg)" }} />
                        {defaultPasswordCount} default password
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>

            <div className="emp-search-wrap">
              <span className="emp-search-icon"><IconSearch /></span>
              <input
                className="emp-search-input"
                placeholder="Search name, ID, dept, title, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search employees"
              />
              {search && (
                <button className="emp-search-clear" onClick={() => setSearch("")} aria-label="Clear search" title="Clear search">
                  <IconX size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="emp-filters-row">
            <div className="emp-filter-select-wrap">
              <select
                className={`emp-filter-select${locationFilter !== "All" ? " is-active" : ""}`}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                aria-label="Filter by location"
              >
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc === "All" ? "All locations" : loc}</option>
                ))}
              </select>
            </div>
            <div className="emp-filter-select-wrap">
              <select
                className={`emp-filter-select${departmentFilter !== "All" ? " is-active" : ""}`}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                aria-label="Filter by department"
              >
                {uniqueDepartments.map((d) => (
                  <option key={d} value={d}>{d === "All" ? "All departments" : d}</option>
                ))}
              </select>
            </div>
            <div className="emp-filter-select-wrap">
              <select
                className={`emp-filter-select${designationFilter !== "All" ? " is-active" : ""}`}
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                aria-label="Filter by designation"
              >
                {uniqueDesignations.map((d) => (
                  <option key={d} value={d}>{d === "All" ? "All designations" : d}</option>
                ))}
              </select>
            </div>
            <div className="emp-filter-select-wrap">
              <select
                className={`emp-filter-select${roleFilter !== "All" ? " is-active" : ""}`}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
              >
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>{r === "All" ? "All roles" : r === "ADMIN" ? "Admin" : "Employee"}</option>
                ))}
              </select>
            </div>

            <div className="emp-filters-divider" />

            <div className="emp-filter-select-wrap">
              <select
                className={`emp-filter-select${passwordStatusFilter !== "All" ? " is-active" : ""}`}
                value={passwordStatusFilter}
                onChange={(e) => setPasswordStatusFilter(e.target.value)}
                aria-label="Filter by password status"
              >
                <option value="All">Any password status</option>
                <option value="Default">Default password</option>
                <option value="Changed">Password changed</option>
              </select>
            </div>
            <div className="emp-filter-select-wrap">
              <select
                className={`emp-filter-select${assetFilter !== "All" ? " is-active" : ""}`}
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
                aria-label="Filter by asset assignment"
              >
                <option value="All">Any asset status</option>
                <option value="Assigned">Has assets</option>
                <option value="Unassigned">No assets</option>
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterChips.length > 0 && (
            <div className="emp-active-filters">
              {activeFilterChips.map((chip) => (
                <span key={chip.key} className="emp-chip">
                  {chip.label}
                  <button className="emp-chip-remove" onClick={chip.clear} aria-label={`Remove filter: ${chip.label}`}>
                    <IconX size={10} />
                  </button>
                </span>
              ))}
              <button className="emp-clear-all-btn" onClick={resetAllFilters}>Clear all</button>
            </div>
          )}
        </div>

        {/* ── Employee Cards / Dedicated Resigned View ─────────────── */}
        {statusTab === "Resigned" ? (
          loadingResignedView ? (
            <div className="emp-empty-state"><div className="emp-empty-sub">Loading resigned employees…</div></div>
          ) : resignedView.length === 0 ? (
            <div className="emp-empty-state">
              <div className="emp-empty-illustration" style={{ color: "var(--gray-300)" }}><IconUsers /></div>
              <div className="emp-empty-title">No resigned employees</div>
              <div className="emp-empty-sub">Employees who resign will appear here permanently, with their full asset and exit history preserved.</div>
            </div>
          ) : (
            <div className="emp-resigned-table-wrap">
              <table className="emp-resigned-table">
                <thead>
                  <tr>
                    <th>Employee</th><th>Department</th><th>Designation</th><th>Manager</th>
                    <th>Joining Date</th><th>Last Working Date</th><th>Resignation Date</th>
                    <th>Exit Reason</th><th>Asset Return Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resignedView
                    .filter((r) => {
                      const q = search.toLowerCase();
                      return !q ||
                        (r.employeeName || "").toLowerCase().includes(q) ||
                        (r.employeeId || "").toLowerCase().includes(q) ||
                        (r.department || "").toLowerCase().includes(q);
                    })
                    .map((r) => (
                      <tr key={r.employeeId}>
                        <td>
                          <div className="emp-rt-name">{r.employeeName}</div>
                          <div className="emp-rt-id">{r.employeeId}</div>
                        </td>
                        <td>{r.department || "—"}</td>
                        <td>{r.designation || "—"}</td>
                        <td>{r.manager || "—"}</td>
                        <td>{r.joiningDate || "—"}</td>
                        <td>{r.lastWorkingDate || "—"}</td>
                        <td>{r.resignationDate || "—"}</td>
                        <td>{r.exitReason || "—"}</td>
                        <td>
                          <span className={`emp-status-pill ${r.assetReturnStatus === "Completed" ? "is-active" : "is-warning"}`}>
                            <span className="emp-status-dot" />{r.assetReturnStatus || "Pending"}
                          </span>
                        </td>
                        <td>
                          <div className="emp-rt-actions">
                            <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }}
                              onClick={() => { const full = employees.find((e) => e.employeeId === r.employeeId); if (full) openProfile(full); }}>
                              <IconEye /> Details
                            </button>
                            <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }}
                              onClick={() => { const full = employees.find((e) => e.employeeId === r.employeeId); if (full) setSeparationTarget(full); }}>
                              Asset History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        ) : loading ? (
          <div className="emp-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="emp-skel-card">
                <div className="emp-skel-top">
                  <div className="skeleton emp-skel-avatar" />
                  <div className="emp-skel-lines">
                    <div className="skeleton skeleton-text short" />
                    <div className="skeleton skeleton-text medium" style={{ height: 9 }} />
                  </div>
                </div>
                <div className="emp-skel-grid">
                  {[1, 2, 3, 4].map((j) => <div key={j} className="skeleton skeleton-text" style={{ height: 22 }} />)}
                </div>
              </div>
            ))}
          </div>
        ) : directory.length === 0 ? (
          <div className="emp-empty-state">
            <div className="emp-empty-illustration" style={{ color: "var(--gray-300)" }}><IconUsers /></div>
            <div className="emp-empty-title">No employees found</div>
            <div className="emp-empty-sub">
              {search || activeFilterChips.length > 0
                ? "Try adjusting your search or clearing a filter to see more results."
                : "Add your first employee to start building your directory."}
            </div>
            {search || activeFilterChips.length > 0 ? (
              <button className="btn btn-secondary emp-empty-cta" onClick={resetAllFilters}>Clear search & filters</button>
            ) : (
              <button className="btn btn-primary emp-empty-cta" onClick={startCreate}>
                <IconPlus /> Add Employee
              </button>
            )}
          </div>
        ) : (
          <div className="emp-grid">
            {directory.map((emp) => {
              const count = assetCounts[emp.employeeId] || 0;
              const isAdminRole = (emp.role || "EMPLOYEE") === "ADMIN";
              const activity = lastActivityById[emp.employeeId];
              const menuOpen = openMenuId === emp.employeeId;

              const status = emp.employmentStatus || "Active";
              const isLeftOrg = status === "Resigned" || status === "Terminated";
              const isOnLeave = status === "On Leave";
              const isSeparating = NOTICE_PERIOD_BUCKET.includes(status);

              const menuItems = [];
              if (!isLeftOrg) {
                menuItems.push({ label: "Edit Employee", icon: <IconEdit />, onClick: () => startEdit(emp) });
              }
              if (status === "Active") {
                menuItems.push({ label: "Place On Leave", icon: <IconPause />, onClick: () => setLeaveTarget(emp) });
              }
              if (isOnLeave) {
                menuItems.push({ label: "End Leave (Restore to Active)", icon: <IconUserCheck />, onClick: () => endLeave(emp) });
              }
              if (!isLeftOrg) {
                menuItems.push({ label: isSeparating ? "Manage Separation" : "Start Resignation", icon: <IconUserMinus />, onClick: () => setSeparationTarget(emp) });
                menuItems.push({ label: "Terminate Employee", icon: <IconBan />, danger: true, onClick: () => setTerminateTarget(emp) });
              }
              if (isLeftOrg) {
                menuItems.push({ label: "View Asset History", icon: <IconEye />, onClick: () => setSeparationTarget(emp) });
                menuItems.push({ label: "Reactivate Employee", icon: <IconUserCheck />, onClick: () => reactivateEmployee(emp) });
              }
              menuItems.push({ divider: true });
              menuItems.push({ label: "Delete Employee", icon: <IconTrash />, danger: true, onClick: () => deleteEmployee(emp) });

              return (
                <div key={emp.employeeId} className="employee-card">
                  <div className="employee-card-top">
                    <div
                      className="emp-avatar"
                      style={{ background: avatarGradient(emp.employeeName) }}
                      onClick={() => openProfile(emp)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${emp.employeeName}'s profile`}
                      onKeyDown={(e) => { if (e.key === "Enter") openProfile(emp); }}
                    >
                      {initials(emp.employeeName)}
                    </div>

                    <div className="employee-card-heading" onClick={() => openProfile(emp)}>
                      <div className="emp-name-row">
                        <span className="emp-name" title={emp.employeeName}>{emp.employeeName}</span>
                      </div>
                      <div className="emp-id-line">
                        <span className="emp-id-code">{emp.employeeId}</span>
                        {emp.designation && <span>· {emp.designation}</span>}
                      </div>
                    </div>

                    <span className={`emp-role-badge ${isAdminRole ? "is-admin" : "is-employee"}`}>
                      {isAdminRole ? "Admin" : "Employee"}
                    </span>

                    <ActionMenu
                      items={menuItems}
                      open={menuOpen}
                      onToggle={() => setOpenMenuId(menuOpen ? null : emp.employeeId)}
                      onClose={() => setOpenMenuId(null)}
                      ariaLabel={`More actions for ${emp.employeeName}`}
                    />
                  </div>

                  <div className="emp-meta-grid">
                    <div className="emp-meta-item">
                      <div className="emp-meta-label"><IconBuilding />Department</div>
                      <div className={`emp-meta-value${!emp.department ? " is-muted" : ""}`}>{emp.department || "—"}</div>
                    </div>
                    <div className="emp-meta-item">
                      <div className="emp-meta-label"><IconPin />Location</div>
                      <div className={`emp-meta-value${!emp.location ? " is-muted" : ""}`}>{emp.location || "—"}</div>
                    </div>
                    <div className="emp-meta-item span-2">
                      <div className="emp-meta-label"><IconMail />Email</div>
                      <div className={`emp-meta-value${!emp.email ? " is-muted" : ""}`} title={emp.email || ""}>{emp.email || "—"}</div>
                    </div>
                    <div className="emp-meta-item">
                      <div className="emp-meta-label"><IconBriefcase />Designation</div>
                      <div className={`emp-meta-value${!emp.designation ? " is-muted" : ""}`}>{emp.designation || "—"}</div>
                    </div>
                    <div className="emp-meta-item">
                      <div className="emp-meta-label"><IconBox />Assets</div>
                      <div className="emp-asset-count-value">
                        <span className="count-num">{count}</span> {count === 1 ? "asset" : "assets"}
                      </div>
                    </div>
                  </div>

                  <div className="emp-status-row">
                    <EmployeeStatusPill status={emp.employmentStatus} />
                    <span className={`emp-status-pill ${emp.mustChangePassword ? "is-warning" : "is-active"}`}>
                      <span className="emp-status-dot" />
                      {emp.mustChangePassword ? "Default Password" : "Password Changed"}
                    </span>
                  </div>

                  <div className="emp-last-activity">
                    <IconClock />
                    {activity
                      ? <span>Last assigned <strong style={{ color: "var(--gray-600)" }}>{activity.laptopName}</strong> on {activity.assignedDate}</span>
                      : <span>No recent asset activity</span>}
                  </div>

                  <div className="employee-card-actions">
                    <button
                      className="emp-btn-view"
                      onClick={() => openProfile(emp)}
                      title="View full profile and assigned assets"
                    >
                      <IconEye /> View
                    </button>
                    {isLeftOrg ? (
                      <button
                        className="emp-btn-assign"
                        onClick={() => setSeparationTarget(emp)}
                        title="View this employee's separation and asset history"
                      >
                        <IconUserMinus /> Exit History
                      </button>
                    ) : (
                      <button
                        className="emp-btn-assign"
                        onClick={() => setAssignTarget(emp)}
                        title="Assign an asset to this employee"
                      >
                        <IconUserPlus /> Assign Asset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Asset Modal */}
      {assignTarget && (
        <AssignAssetModal
          employee={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={handleAssignSuccess}
        />
      )}

      {/* Employee Separation / Resignation Modal */}
      {separationTarget && (
        <SeparationModal
          employee={separationTarget}
          onClose={() => { setSeparationTarget(null); loadEmployees(); }}
          onSuccess={handleSeparationSuccess}
        />
      )}

      {/* Place On Leave Modal */}
      {leaveTarget && (
        <OnLeaveModal
          employee={leaveTarget}
          onClose={() => setLeaveTarget(null)}
          onSuccess={loadEmployees}
        />
      )}

      {/* Terminate Employee Modal */}
      {terminateTarget && (
        <TerminateModal
          employee={terminateTarget}
          onClose={() => setTerminateTarget(null)}
          onSuccess={loadEmployees}
        />
      )}

      <EmployeeDetailDrawer
        employee={viewingEmployee}
        assets={viewingEmployee ? expandedAssets[viewingEmployee.employeeId] : null}
        loadingAssets={viewingEmployee ? !expandedAssets[viewingEmployee.employeeId] : false}
        onClose={() => setViewingEmployee(null)}
        onEdit={(emp) => { setViewingEmployee(null); startEdit(emp); }}
        onDelete={(emp) => { setViewingEmployee(null); deleteEmployee(emp); }}
        onAssign={(emp) => { setViewingEmployee(null); setAssignTarget(emp); }}
        onSeparation={(emp) => { setViewingEmployee(null); setSeparationTarget(emp); }}
        onReturn={(asset) => setReturnTarget(asset)}
      />

      <ReturnAssetDialog asset={returnTarget} onClose={() => setReturnTarget(null)} onConfirm={handleReturn} saving={returning} />
    </Layout>
  );
}
