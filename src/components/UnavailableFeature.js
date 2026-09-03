import React from "react";
import { LockKeyhole, Mail, X } from "lucide-react";
import { VETTRI_CONTACT_EMAIL } from "../config";

export default function UnavailableFeature({ featureName, onClose }) {
  const contactVettri = () => {
    window.location.href = `mailto:${VETTRI_CONTACT_EMAIL}?subject=${encodeURIComponent(`Enable ${featureName}`)}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="unavailable-feature-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="unavailable-feature-title" className="modal-title"><LockKeyhole size={18} /> {featureName}</h2>
          {onClose && <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>}
        </div>
        <div className="modal-body">
          <p>This feature is not enabled for your organization.</p>
          <p style={{ marginTop: 8 }}>Please contact Vettri to enable this feature.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={contactVettri}><Mail size={15} /> Contact Vettri</button>
        </div>
      </div>
    </div>
  );
}