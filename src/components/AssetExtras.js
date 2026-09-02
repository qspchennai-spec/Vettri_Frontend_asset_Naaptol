import React, { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../utils/Toast";
import "./AssetExtras.css";

const DOC_TYPES = ["Invoice", "Warranty Card", "Insurance", "Manual", "Other"];

/**
 * Extra detail-drawer panels for an asset: QR Code, Document Management,
 * Maintenance history, and the unified Asset Timeline. Fetches lazily —
 * each panel only calls its endpoint when the admin expands it, keeping
 * the drawer's initial open fast.
 */
export default function AssetExtras({ asset, apiBase, token, initialPanel = null }) {
  const [openPanel, setOpenPanel] = useState(initialPanel); // 'qr' | 'docs' | 'maintenance' | 'timeline' | null
  const toast = useToast();

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <div className="asset-extras">
      <div className="asset-extras-tabs">
        <button className={`asset-extras-tab ${openPanel === "qr" ? "active" : ""}`} onClick={() => setOpenPanel(openPanel === "qr" ? null : "qr")}>
          🔲 QR Code
        </button>
        <button className={`asset-extras-tab ${openPanel === "docs" ? "active" : ""}`} onClick={() => setOpenPanel(openPanel === "docs" ? null : "docs")}>
          📄 Documents
        </button>
        <button className={`asset-extras-tab ${openPanel === "maintenance" ? "active" : ""}`} onClick={() => setOpenPanel(openPanel === "maintenance" ? null : "maintenance")}>
          🛠 Maintenance
        </button>
        <button className={`asset-extras-tab ${openPanel === "timeline" ? "active" : ""}`} onClick={() => setOpenPanel(openPanel === "timeline" ? null : "timeline")}>
          🕒 Full Timeline
        </button>
      </div>

      {openPanel === "qr" && <QrPanel asset={asset} apiBase={apiBase} authHeaders={authHeaders} />}
      {openPanel === "docs" && <DocumentsPanel asset={asset} apiBase={apiBase} authHeaders={authHeaders} toast={toast} />}
      {openPanel === "maintenance" && <MaintenancePanel asset={asset} apiBase={apiBase} authHeaders={authHeaders} toast={toast} />}
      {openPanel === "timeline" && <TimelinePanel asset={asset} apiBase={apiBase} authHeaders={authHeaders} />}
    </div>
  );
}

function QrPanel({ asset, apiBase, authHeaders }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl;
    setLoading(true);
    axios.get(`${apiBase}/assets/${asset.assetId}/qrcode`, { headers: authHeaders, responseType: "blob" })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setImgUrl(objectUrl);
      })
      .catch(() => setImgUrl(null))
      .finally(() => setLoading(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.assetId]);

  return (
    <div className="asset-extras-panel asset-extras-qr">
      {loading && <div className="asset-extras-loading">Generating QR code…</div>}
      {!loading && imgUrl && (
        <>
          <img src={imgUrl} alt="Asset QR code" className="asset-extras-qr-img" />
          <a className="btn btn-secondary" href={imgUrl} download={`asset-${asset.assetId}-qrcode.png`}>
            ⬇ Download QR Code
          </a>
          <p className="asset-extras-qr-hint">Scan to open this asset's record instantly on any phone.</p>
        </>
      )}
      {!loading && !imgUrl && <div className="asset-extras-empty">Couldn't generate the QR code.</div>}
    </div>
  );
}

function DocumentsPanel({ asset, apiBase, authHeaders, toast }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState("Invoice");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    axios.get(`${apiBase}/api/admin/assets/${asset.assetId}/documents`, { headers: authHeaders })
      .then((res) => setDocs(res.data))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [asset.assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentType", docType);
      await axios.post(`${apiBase}/api/admin/assets/${asset.assetId}/documents`, form, {
        headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
      });
      toast?.("Document uploaded.", "success");
      setFile(null);
      load();
    } catch (e) {
      toast?.(e?.response?.data?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await axios.delete(`${apiBase}/api/admin/assets/${asset.assetId}/documents/${id}`, { headers: authHeaders });
      load();
    } catch { toast?.("Failed to delete document.", "error"); }
  };

  return (
    <div className="asset-extras-panel">
      <div className="asset-extras-upload-row">
        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="btn btn-primary" disabled={!file || uploading} onClick={handleUpload}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {loading && <div className="asset-extras-loading">Loading documents…</div>}
      {!loading && docs.length === 0 && <div className="asset-extras-empty">No documents uploaded yet.</div>}
      {!loading && docs.length > 0 && (
        <ul className="asset-extras-doc-list">
          {docs.map((d) => (
            <li key={d.id}>
              <span className="asset-extras-doc-type">{d.documentType}</span>
              <a href={`${apiBase}/api/admin/assets/${asset.assetId}/documents/${d.id}/download`} target="_blank" rel="noreferrer">
                {d.originalFileName}
              </a>
              <span className="asset-extras-doc-meta">{new Date(d.uploadedAt).toLocaleDateString()}</span>
              <button className="asset-extras-doc-del" onClick={() => handleDelete(d.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MaintenancePanel({ asset, apiBase, authHeaders, toast }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ maintenanceType: "Preventive", description: "", scheduledDate: "", vendor: "", cost: "" });

  const load = () => {
    setLoading(true);
    axios.get(`${apiBase}/api/admin/maintenance/asset/${asset.assetId}`, { headers: authHeaders })
      .then((res) => setRecords(res.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [asset.assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    try {
      await axios.post(`${apiBase}/api/admin/maintenance`, { ...form, assetId: asset.assetId }, { headers: authHeaders });
      toast?.("Maintenance scheduled.", "success");
      setShowForm(false);
      setForm({ maintenanceType: "Preventive", description: "", scheduledDate: "", vendor: "", cost: "" });
      load();
    } catch (e) {
      toast?.(e?.response?.data?.message || "Failed to schedule maintenance.", "error");
    }
  };

  const handleStatusChange = async (record, status) => {
    try {
      await axios.put(`${apiBase}/api/admin/maintenance/${record.id}`, { ...record, status }, { headers: authHeaders });
      load();
    } catch { toast?.("Failed to update status.", "error"); }
  };

  return (
    <div className="asset-extras-panel">
      <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "+ Schedule Maintenance"}
      </button>

      {showForm && (
        <div className="asset-extras-maint-form">
          <select value={form.maintenanceType} onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}>
            {["Preventive", "Corrective", "Inspection", "Upgrade"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          <input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          <input placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <button className="btn btn-primary" onClick={handleCreate}>Save</button>
        </div>
      )}

      {loading && <div className="asset-extras-loading">Loading maintenance history…</div>}
      {!loading && records.length === 0 && <div className="asset-extras-empty">No maintenance recorded yet.</div>}
      {!loading && records.length > 0 && (
        <ul className="asset-extras-maint-list">
          {records.map((r) => (
            <li key={r.id}>
              <div className="asset-extras-maint-top">
                <span className="asset-extras-maint-type">{r.maintenanceType}</span>
                <select value={r.status} onChange={(e) => handleStatusChange(r, e.target.value)}>
                  {["Scheduled", "In Progress", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="asset-extras-maint-desc">{r.description}</div>
              <div className="asset-extras-maint-meta">
                {r.scheduledDate && `Scheduled: ${r.scheduledDate}`} {r.vendor && `· ${r.vendor}`} {r.cost && `· ₹${r.cost}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TimelinePanel({ asset, apiBase, authHeaders }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${apiBase}/assets/${asset.assetId}/timeline`, { headers: authHeaders })
      .then((res) => setEvents(res.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.assetId]);

  const sourceIcon = { AUDIT: "📝", EMAIL: "📧", MAINTENANCE: "🛠", DOCUMENT: "📄" };

  return (
    <div className="asset-extras-panel">
      {loading && <div className="asset-extras-loading">Loading full timeline…</div>}
      {!loading && events.length === 0 && <div className="asset-extras-empty">No history recorded yet.</div>}
      {!loading && events.length > 0 && (
        <ul className="asset-extras-full-timeline">
          {events.slice().reverse().map((e, i) => (
            <li key={i}>
              <span className="asset-extras-tl-icon">{sourceIcon[e.source] || "•"}</span>
              <div>
                <div className="asset-extras-tl-desc">{e.description}</div>
                <div className="asset-extras-tl-meta">
                  {new Date(e.timestamp).toLocaleString()} {e.performedBy && `· ${e.performedBy}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
