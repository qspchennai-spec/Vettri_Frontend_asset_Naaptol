import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AssignAssetModal.css";

import { API_BASE as API } from "../config";

export default function AssignAssetModal({
  open,
  request,
  onClose,
  onAssigned,
}) {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  // Starts unset — the admin must explicitly choose Permanent or Temporary,
  // it's never silently defaulted.
  const [assignmentType, setAssignmentType] = useState("");
  const [temporaryReason, setTemporaryReason] = useState("");
  const [temporaryDurationDays, setTemporaryDurationDays] = useState("2");
  const [customDurationDays, setCustomDurationDays] = useState("");
  const [oldAssetIssues, setOldAssetIssues] = useState("");

  // "form" while filling in details, "emailChoice" once assigned, asking
  // whether to send the notification email now or later.
  const [stage, setStage] = useState("form");
  const [assignedAssetName, setAssignedAssetName] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError("");
    setSelectedAsset("");
    setAssignmentType("");
    setTemporaryReason("");
    setTemporaryDurationDays("2");
    setCustomDurationDays("");
    setOldAssetIssues("");
    setStage("form");
    setAssignedAssetName("");

    axios
      .get(`${API}/assets/available`)
      .then((res) => {
        setAssets(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load available assets.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open || !request) return null;

  const effectiveDurationDays =
    temporaryDurationDays === "custom" ? Number(customDurationDays) : Number(temporaryDurationDays);

  const assignAsset = async () => {
    if (!selectedAsset) {
      setError("Please select an asset.");
      return;
    }
    if (!assignmentType) {
      setError("Please choose whether this is a Permanent or Temporary assignment.");
      return;
    }
    if (assignmentType === "Temporary") {
      if (!temporaryReason.trim()) {
        setError("Please provide a reason for the temporary assignment.");
        return;
      }
      if (!effectiveDurationDays || effectiveDurationDays <= 0) {
        setError("Please select a valid duration for the temporary assignment.");
        return;
      }
    }

    setAssigning(true);
    setError("");

    try {
      const asset = assets.find((a) => String(a.assetId) === String(selectedAsset));
      await axios.put(`${API}/assets/assign/${selectedAsset}`, {
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        employeeRole: request.employeeRole,
        location: request.location,
        remarks: request.reason,
        assignmentType,
        temporaryReason: assignmentType === "Temporary" ? temporaryReason.trim() : undefined,
        temporaryDurationDays: assignmentType === "Temporary" ? effectiveDurationDays : undefined,
        oldAssetIssues: oldAssetIssues.trim() || undefined,
      });

      setAssignedAssetName(asset?.laptopName || "The asset");
      setStage("emailChoice"); // ask "send the assignment email now, or later?"
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Unable to assign asset.");
    } finally {
      setAssigning(false);
    }
  };

  const handleSendEmailNow = async () => {
    setSendingEmail(true);
    try {
      await axios.post(`${API}/assets/send-email/${selectedAsset}`);
    } catch (err) {
      console.error(err);
      // Non-fatal: the assignment itself already succeeded; the email can be
      // resent later from the Assets page if this fails.
    } finally {
      setSendingEmail(false);
      onAssigned(selectedAsset);
    }
  };

  const handleSendEmailLater = () => {
    onAssigned(selectedAsset);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Assign Asset</h2>
        </div>

        <div className="modal-body">
        {stage === "form" ? (
          <>
          <div className="modal-grid">
            <div className="modal-info-group">
              <span className="modal-label">Employee</span>
              <span className="modal-value">{request.employeeName}</span>
            </div>
            <div className="modal-info-group">
              <span className="modal-label">Employee ID</span>
              <span className="modal-value">{request.employeeId}</span>
            </div>
            <div className="modal-info-group" style={{ gridColumn: "1 / -1" }}>
              <span className="modal-label">Requested Asset Type</span>
              <span className="modal-value">{request.assetType}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="modal-label" htmlFor="assign-asset-select">
              Select Available Asset
            </label>

            {loading ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div className="empty-title">Loading available assets…</div>
              </div>
            ) : assets.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div className="empty-title">No available assets</div>
                <div className="empty-sub">
                  Add a new asset to inventory or wait for one to be returned.
                </div>
              </div>
            ) : (
              <select
                id="assign-asset-select"
                className="form-select"
                value={selectedAsset}
                onChange={(e) => {
                  setSelectedAsset(e.target.value);
                  setError("");
                }}
              >
                <option value="">Select an asset…</option>
                {assets.map((asset) => (
                  <option key={asset.assetId} value={asset.assetId}>
                    {asset.laptopName} · {asset.brand} · {asset.serialNumber}
                  </option>
                ))}
              </select>
            )}

          </div>

          {selectedAsset && (
          <div className="form-group" style={{ marginTop: 18 }}>
            <span className="modal-label">Assignment Type</span>
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
                    name="assignmentTypeShared"
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
                <div className="form-group">
                  <span className="modal-label">Reason for Temporary Assignment</span>
                  <input
                    className="input"
                    placeholder="e.g. Employee's laptop is under repair"
                    value={temporaryReason}
                    onChange={(e) => setTemporaryReason(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <span className="modal-label">How long will the laptop be assigned?</span>
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

          <div className="form-group" style={{ marginTop: 14 }}>
            <span className="modal-label">Any issues with the old asset? (optional)</span>
            <textarea
              className="input"
              rows={2}
              style={{ resize: "vertical", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
              placeholder="e.g. Cracked screen, battery not holding charge, missing charger…"
              value={oldAssetIssues}
              onChange={(e) => setOldAssetIssues(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 10 }}>
              ⚠ {error}
            </div>
          )}
          </>
        ) : (
          /* Email choice — shown right after a successful assignment */
          <div style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gray-900)", marginBottom: 6 }}>
              {assignedAssetName} assigned to {request.employeeName}
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

        {stage === "form" && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={assigning}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={assignAsset}
              disabled={assigning || loading || assets.length === 0 || !selectedAsset || !assignmentType}
            >
              {assigning ? "Assigning…" : "Assign Asset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
