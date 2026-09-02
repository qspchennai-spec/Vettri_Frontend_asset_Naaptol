import React, { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import MarkdownLite from "./MarkdownLite";

export default function ConfirmActionCard({ description, onDecide }) {
  const [resolved, setResolved] = useState(null); // null | "approved" | "declined"

  const decide = (approve) => {
    setResolved(approve ? "approved" : "declined");
    onDecide(approve);
  };

  return (
    <div className="ai-confirm-card">
      <div className="ai-confirm-icon"><AlertTriangle size={16} /></div>
      <div className="ai-confirm-body">
        <div className="ai-confirm-text"><MarkdownLite text={description} /></div>
        {resolved === null ? (
          <div className="ai-confirm-actions">
            <button className="ai-confirm-btn ai-confirm-btn-danger" onClick={() => decide(true)}>
              <Check size={13} /> Confirm
            </button>
            <button className="ai-confirm-btn ai-confirm-btn-cancel" onClick={() => decide(false)}>
              <X size={13} /> Cancel
            </button>
          </div>
        ) : (
          <div className="ai-confirm-resolved">
            {resolved === "approved" ? "Confirmed — proceeding…" : "Cancelled."}
          </div>
        )}
      </div>
    </div>
  );
}
