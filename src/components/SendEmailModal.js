import React, { useState } from "react";
import axios from "axios";
import "./SendEmailModal.css";

import { API_BASE as API } from "../config";

/**
 * Premium confirmation modal for the "Send Asset Assignment Email" feature.
 * Shows a read-only summary of exactly what will be emailed, then calls
 * POST /assets/send-email/{id} on confirm.
 *
 * props:
 *  - asset: the asset row being emailed about (must be Assigned)
 *  - onClose(): dismiss without sending
 *  - onSent(updatedAsset): called after a successful send so the parent can refresh state/toast
 */
export default function SendEmailModal({ asset, onClose, onSent }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!asset) return null;

  const handleSend = () => {
    setSending(true);
    setError("");
    axios
      .post(`${API}/assets/send-email/${asset.assetId}`)
      .then((res) => {
        onSent(res.data.asset, res.data.message || "Asset assignment email sent successfully.");
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Couldn't send the assignment email. Please try again.";
        setError(msg);
        onSent(null, msg, true);
      })
      .finally(() => setSending(false));
  };

  return (
    <div className="modal-overlay" onClick={sending ? undefined : onClose}>
      <div className="modal-content send-email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header send-email-header">
          <div className="send-email-icon">📧</div>
          <div>
            <h2 className="modal-title">Send Assignment Email</h2>
            <div className="send-email-subtitle">
              Confirm the details below before notifying the employee.
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div className="send-email-section">
            <div className="send-email-section-title">Employee</div>
            <div className="modal-grid">
              <div className="modal-info-group">
                <span className="modal-label">Name</span>
                <span className="modal-value">{asset.employeeName || "—"}</span>
              </div>
              <div className="modal-info-group">
                <span className="modal-label">Employee ID</span>
                <span className="modal-value">{asset.employeeId || "—"}</span>
              </div>
              <div className="modal-info-group" style={{ gridColumn: "1 / -1" }}>
                <span className="modal-label">Email</span>
                <span className="modal-value">{asset.employeeEmail || "—"}</span>
              </div>
            </div>
          </div>

          <div className="send-email-section">
            <div className="send-email-section-title">Asset</div>
            <div className="modal-grid">
              <div className="modal-info-group">
                <span className="modal-label">Asset ID</span>
                <span className="modal-value">#{asset.assetId}</span>
              </div>
              <div className="modal-info-group">
                <span className="modal-label">Asset Name</span>
                <span className="modal-value">{asset.laptopName || "—"}</span>
              </div>
              <div className="modal-info-group">
                <span className="modal-label">Brand</span>
                <span className="modal-value">{asset.brand || "—"}</span>
              </div>
              <div className="modal-info-group">
                <span className="modal-label">Model</span>
                <span className="modal-value">{asset.model || "—"}</span>
              </div>
              <div className="modal-info-group">
                <span className="modal-label">Serial Number</span>
                <span className="modal-value">{asset.serialNumber || "—"}</span>
              </div>
              <div className="modal-info-group">
                <span className="modal-label">Assigned Date</span>
                <span className="modal-value">{asset.assignedDate || "—"}</span>
              </div>
              <div className="modal-info-group" style={{ gridColumn: "1 / -1" }}>
                <span className="modal-label">Location</span>
                <span className="modal-value">{asset.location || "—"}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="send-email-error">⚠ {error}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button className="btn btn-primary send-email-btn" onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <span className="send-email-spinner" /> Sending…
              </>
            ) : (
              <>📧 Send Email</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
