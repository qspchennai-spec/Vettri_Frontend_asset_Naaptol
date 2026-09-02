import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../utils/Toast";
import EmployeeStatusPill, { ClearanceStatusPill } from "./EmployeeStatusPill";
import StatusPill from "./StatusPill";

import { API_BASE as API } from "../config";

const RESIGNATION_REASONS = [
  "Better Opportunity", "Higher Studies", "Relocation", "Personal Reasons",
  "Health Reasons", "Retirement", "Termination", "End of Contract", "Other",
];

const STEPS = ["Active", "Notice Period", "Exit Clearance", "Assets Returned", "Resigned"];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function StatBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gray-900)" }}>{value || "—"}</div>
    </div>
  );
}

// Small horizontal progress tracker for Active → Notice Period → Exit Clearance → Assets Returned → Resigned
function WorkflowTracker({ current }) {
  const idx = Math.max(0, STEPS.indexOf(current || "Active"));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 74 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              background: i <= idx ? "#1a56db" : "#e5e7eb",
              color: i <= idx ? "#fff" : "#9ca3af",
              boxShadow: i === idx ? "0 0 0 4px #1a56db22" : "none",
              transition: "all 0.15s",
            }}>
              {i < idx ? "✓" : i + 1}
            </div>
            <div style={{
              fontSize: 10, fontWeight: i === idx ? 700 : 600,
              color: i === idx ? "var(--gray-900)" : "var(--gray-400)",
              textAlign: "center", lineHeight: 1.2,
            }}>
              {step}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? "#1a56db" : "#e5e7eb", marginTop: -18, minWidth: 16 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function AssetMiniRow({ asset, tone = "warn" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px", borderRadius: 8,
      background: tone === "warn" ? "#fef2f2" : "#f0fdf4",
      border: `1px solid ${tone === "warn" ? "#fecaca" : "#bbf7d0"}`,
    }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gray-900)" }}>{asset.laptopName}</div>
        <div style={{ fontSize: 11, color: "var(--gray-500)" }}>
          {asset.assetType}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
        </div>
      </div>
      {asset.assetStatus && <StatusPill status={asset.assetStatus} />}
    </div>
  );
}

export default function SeparationModal({ employee, onClose, onSuccess }) {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAssetsWarning, setPendingAssetsWarning] = useState(null);

  // Initiate-separation form fields
  const [noticeStartDate, setNoticeStartDate] = useState(todayISO());
  const [lastWorkingDate, setLastWorkingDate] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [resignationReason, setResignationReason] = useState("");
  const [remarks, setRemarks] = useState("");

  const employeeId = employee?.employeeId;

  const load = useCallback(() => {
    if (!employeeId) return;
    setLoading(true);
    axios.get(`${API}/api/admin/employees/${employeeId}/separation`)
      .then((r) => setDetail(r.data))
      .catch(() => toast("Couldn't load separation details.", "error"))
      .finally(() => setLoading(false));
  }, [employeeId, toast]);

  useEffect(() => { load(); }, [load]);

  const status = detail?.employmentStatus || "Active";

  const handleInitiate = () => {
    if (!lastWorkingDate) { toast("Please provide the last working date.", "error"); return; }
    if (!resignationReason) { toast("Please select a resignation reason.", "error"); return; }
    setSubmitting(true);
    setPendingAssetsWarning(null);
    axios.post(`${API}/api/admin/employees/${employeeId}/separation/initiate`, {
      noticeStartDate,
      lastWorkingDate,
      noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : undefined,
      resignationReason,
      remarks,
    })
      .then((r) => { setDetail(r.data); toast("Resignation process started. HR has been notified.", "success"); onSuccess?.(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't start separation.", "error"))
      .finally(() => setSubmitting(false));
  };

  const handleExitClearance = () => {
    setSubmitting(true);
    setPendingAssetsWarning(null);
    axios.post(`${API}/api/admin/employees/${employeeId}/separation/exit-clearance`, { remarks })
      .then((r) => { setDetail(r.data); toast("Moved to Exit Clearance. IT has been notified to collect assets.", "success"); onSuccess?.(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't move to exit clearance.", "error"))
      .finally(() => setSubmitting(false));
  };

  const handleComplete = () => {
    setSubmitting(true);
    setPendingAssetsWarning(null);
    axios.post(`${API}/api/admin/employees/${employeeId}/separation/complete`, { remarks })
      .then((r) => { setDetail(r.data); toast("Resignation finalized. Employee marked Resigned.", "success"); onSuccess?.(); })
      .catch((err) => {
        if (err.response?.status === 409 && err.response?.data?.details) {
          setPendingAssetsWarning(err.response.data.details);
          toast("Resignation blocked — assets are still assigned.", "error");
        } else {
          toast(err.response?.data?.message || "Couldn't complete resignation.", "error");
        }
      })
      .finally(() => setSubmitting(false));
  };

  const handleCancel = () => {
    if (!window.confirm("Cancel this separation and restore the employee to Active?")) return;
    setSubmitting(true);
    axios.post(`${API}/api/admin/employees/${employeeId}/separation/cancel`, { remarks })
      .then((r) => { setDetail(r.data); toast("Separation cancelled. Employee restored to Active.", "success"); onSuccess?.(); })
      .catch((err) => toast(err.response?.data?.message || "Couldn't cancel separation.", "error"))
      .finally(() => setSubmitting(false));
  };

  const assignedAssets = detail?.assignedAssets || [];
  const returnedAssets = detail?.returnedAssets || [];

  const canCancel = status !== "Active" && status !== "Resigned";

  if (!employee) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: "min(820px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h3 className="modal-title">Employee Separation</h3>
            <div className="card-subtitle" style={{ marginTop: 4 }}>
              Manage the resignation / exit workflow for {employee.employeeName}
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--gray-400)" }}>
              <div className="loading-spinner" style={{ margin: "0 auto 10px", width: 22, height: 22 }} />
              Loading separation details…
            </div>
          ) : (
            <>
              {/* Employee Info */}
              <div style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
                border: "1px solid #dbeafe", borderRadius: 12, padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#1d4ed8" }}>
                    Employee Information
                  </div>
                  <EmployeeStatusPill status={status} />
                </div>
                <div className="kpi-row kpi-row-4 stagger-in">
                  <StatBlock label="Employee ID" value={detail?.employeeId} />
                  <StatBlock label="Department" value={detail?.department} />
                  <StatBlock label="Designation" value={detail?.designation} />
                  <StatBlock label="Joining Date" value={detail?.joiningDate} />
                </div>
              </div>

              {/* Workflow tracker */}
              <div style={{ padding: "4px 8px" }}>
                <WorkflowTracker current={status} />
              </div>

              {/* Pending assets blocking resignation */}
              {pendingAssetsWarning && pendingAssetsWarning.length > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>
                    ⚠ Cannot complete resignation — {pendingAssetsWarning.length} asset(s) still assigned
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {pendingAssetsWarning.map((a) => (
                      <div key={a.assetId} style={{ fontSize: 12, color: "#7f1d1d" }}>
                        • {a.laptopName} ({a.assetType}{a.serialNumber ? `, SN: ${a.serialNumber}` : ""})
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#991b1b", marginTop: 8 }}>
                    Return these assets from the Assets page first, then complete the resignation.
                  </div>
                </div>
              )}

              {/* ── Stage-specific content ─────────────────────────────── */}

              {status === "Active" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)", marginBottom: 10 }}>
                    Start Resignation Process
                  </div>
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label className="field-label">Notice Start Date</label>
                      <input type="date" className="input" style={{ width: "100%", boxSizing: "border-box" }}
                        value={noticeStartDate} onChange={(e) => setNoticeStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Last Working Date *</label>
                      <input type="date" className="input" style={{ width: "100%", boxSizing: "border-box" }}
                        value={lastWorkingDate} onChange={(e) => setLastWorkingDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Notice Period (days)</label>
                      <input type="number" min="0" className="input" style={{ width: "100%", boxSizing: "border-box" }}
                        value={noticePeriodDays} onChange={(e) => setNoticePeriodDays(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Resignation Reason *</label>
                      <select className="input" style={{ width: "100%", boxSizing: "border-box" }}
                        value={resignationReason} onChange={(e) => setResignationReason(e.target.value)}>
                        <option value="">Select a reason…</option>
                        {RESIGNATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="field-label">Remarks</label>
                      <textarea className="input" rows={3} style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                        placeholder="Optional notes for HR/records…"
                        value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {status !== "Active" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)", marginBottom: 10 }}>
                    Separation Details
                  </div>
                  <div className="kpi-row kpi-row-4 stagger-in" style={{ marginBottom: 16 }}>
                    <StatBlock label="Notice Start Date" value={detail?.noticeStartDate} />
                    <StatBlock label="Last Working Date" value={detail?.lastWorkingDate} />
                    <StatBlock label="Resignation Reason" value={detail?.resignationReason} />
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                        Clearance Status
                      </div>
                      <ClearanceStatusPill status={detail?.exitClearanceStatus} />
                    </div>
                  </div>

                  {status !== "Resigned" && (
                    <div style={{ marginBottom: 16 }}>
                      <label className="field-label">Remarks</label>
                      <textarea className="input" rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                        placeholder="Add or update remarks…"
                        value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </div>
                  )}

                  {/* Assigned / Returned assets */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-700)", marginBottom: 8 }}>
                        Assigned Assets {assignedAssets.length > 0 && `(${assignedAssets.length})`}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                        {assignedAssets.length === 0 ? (
                          <div style={{ fontSize: 12, color: "var(--gray-400)" }}>All assets returned ✓</div>
                        ) : assignedAssets.map((a) => <AssetMiniRow key={a.assetId} asset={a} tone="warn" />)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-700)", marginBottom: 8 }}>
                        Returned Assets {returnedAssets.length > 0 && `(${returnedAssets.length})`}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                        {returnedAssets.length === 0 ? (
                          <div style={{ fontSize: 12, color: "var(--gray-400)" }}>No returned assets on record.</div>
                        ) : returnedAssets.map((a) => <AssetMiniRow key={a.assetId} asset={a} tone="ok" />)}
                      </div>
                    </div>
                  </div>

                  {status === "Resigned" && (
                    <div style={{ marginTop: 16, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-700)", marginBottom: 6 }}>Separation History</div>
                      <div style={{ fontSize: 12, color: "var(--gray-600)", lineHeight: 1.7 }}>
                        Clearance completed: <strong>{detail?.clearanceCompletionDate || "—"}</strong><br />
                        Resigned on: <strong>{detail?.resignedDate || "—"}</strong><br />
                        Final status: <strong>Resigned</strong> — employment history preserved.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="modal-footer" style={{ display: "flex", gap: 10, flexWrap: "wrap", flexShrink: 0, padding: "16px 24px", borderTop: "1px solid var(--gray-100)" }}>
            {status === "Active" && (
              <button className="btn btn-primary" style={{ flex: "1 1 auto" }} disabled={submitting} onClick={handleInitiate}>
                {submitting ? "Starting…" : "Start Resignation Process"}
              </button>
            )}
            {status === "Notice Period" && (
              <button className="btn btn-primary" style={{ flex: "1 1 auto" }} disabled={submitting} onClick={handleExitClearance}>
                {submitting ? "Moving…" : "Move to Exit Clearance"}
              </button>
            )}
            {(status === "Exit Clearance" || status === "Assets Returned") && (
              <button className="btn btn-primary" style={{ flex: "1 1 auto" }} disabled={submitting} onClick={handleComplete}>
                {submitting ? "Finalizing…" : "Complete Resignation"}
              </button>
            )}
            {canCancel && (
              <button className="btn btn-secondary" disabled={submitting} onClick={handleCancel}>
                Cancel Separation
              </button>
            )}
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
