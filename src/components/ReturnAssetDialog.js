import { useEffect, useState } from "react";

// ── Return Asset Dialog ─────────────────────────────────────────────
// Shared between the Assets page (return from the asset's own row) and
// the Employee detail drawer (return from the employee's assigned-assets
// list). Both call PUT /assets/return/{assetId} with the same payload
// shape via their own onConfirm handler, so this component only owns the
// form UI, not the API call itself.
const ReturnAssetDialog = ({ asset, onClose, onConfirm, saving }) => {
  const [condition, setCondition] = useState("Good");
  const [nextStatus, setNextStatus] = useState("Available");
  const [stage, setStage] = useState("form");

  useEffect(() => {
    setCondition("Good");
    setNextStatus("Available");
    setStage("form");
  }, [asset]);

  if (!asset) return null;

  const closeAndReset = () => { setStage("form"); onClose(); };

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
          <button className="btn btn-secondary btn-icon" onClick={closeAndReset} aria-label="Close">✕</button>
        </div>

        {stage === "form" ? (
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="field">
              <label className="field-label">Returned Condition</label>
              <div className="selector-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                {["Excellent","Good","Fair","Faulty","Damaged"].map(c => (
                  <button key={c} type="button" className={`btn btn-sm ${condition === c ? "btn-primary" : "btn-secondary"}`} onClick={() => setCondition(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Move Asset To</label>
              <select className="input" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                <option value="Available">Available — Ready to reassign</option>
                <option value="Spare">Spare — Keep in reserve</option>
                <option value="Under Repair">Under Repair — Send for servicing</option>
                <option value="Faulty">Faulty — Flag as defective</option>
                <option value="Retired">Retired — End of life</option>
              </select>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={closeAndReset}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={() => setStage("emailChoice")} disabled={saving}>↩ Confirm Return</button>
            </div>
          </div>
        ) : (
          <div className="modal-body" style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)", marginBottom: 24, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
              Do you want to send an Asset Return email to the employee?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-secondary" onClick={closeAndReset} disabled={saving}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => onConfirm(asset.assetId, { condition, nextStatus, sendReturnEmail: false })} disabled={saving}>No</button>
              <button className="btn btn-primary" onClick={() => onConfirm(asset.assetId, { condition, nextStatus, sendReturnEmail: true })} disabled={saving} style={{ minWidth: 110 }}>
                {saving ? "Sending…" : "Yes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnAssetDialog;
