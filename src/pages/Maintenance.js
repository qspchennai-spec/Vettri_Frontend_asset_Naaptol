import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import "./Maintenance.css";

import { API_BASE as API } from "../config";

const TYPES = ["Preventive", "Corrective", "Inspection", "Upgrade"];
const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];

const EMPTY_FORM = {
  assetId: "", maintenanceType: "Preventive", description: "", status: "Scheduled",
  scheduledDate: "", completedDate: "", vendor: "", cost: "", performedBy: "",
  nextMaintenanceDate: "", remarks: "",
};

const statusColor = {
  "Scheduled":  { bg: "#fef3c7", text: "#92400e" },
  "In Progress":{ bg: "#dbeafe", text: "#1e40af" },
  "Completed":  { bg: "#dcfce7", text: "#166534" },
  "Cancelled":  { bg: "#f3f4f6", text: "#6b7280" },
};

export default function Maintenance() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/api/admin/maintenance`),
      axios.get(`${API}/assets`),
    ])
      .then(([mRes, aRes]) => { setRecords(mRes.data); setAssets(aRes.data); })
      .catch(() => toast("Couldn't load maintenance records.", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const assetById = useMemo(() => {
    const map = {};
    assets.forEach((a) => { map[a.assetId] = a; });
    return map;
  }, [assets]);

  const filtered = useMemo(() => {
    if (statusFilter === "All") return records;
    return records.filter((r) => r.status === statusFilter);
  }, [records, statusFilter]);

  const stats = useMemo(() => ({
    scheduled: records.filter((r) => r.status === "Scheduled").length,
    inProgress: records.filter((r) => r.status === "In Progress").length,
    completed: records.filter((r) => r.status === "Completed").length,
    cancelled: records.filter((r) => r.status === "Cancelled").length,
  }), [records]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };

  const openEdit = (r) => {
    setForm({
      assetId: r.assetId, maintenanceType: r.maintenanceType || "Preventive", description: r.description || "",
      status: r.status || "Scheduled", scheduledDate: r.scheduledDate || "", completedDate: r.completedDate || "",
      vendor: r.vendor || "", cost: r.cost || "", performedBy: r.performedBy || "",
      nextMaintenanceDate: r.nextMaintenanceDate || "", remarks: r.remarks || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const save = () => {
    if (!form.assetId) { toast("Select an asset.", "error"); return; }
    setSaving(true);
    const req = editingId
      ? axios.put(`${API}/api/admin/maintenance/${editingId}`, form)
      : axios.post(`${API}/api/admin/maintenance`, form);
    req
      .then(() => {
        toast(editingId ? "Maintenance record updated." : "Maintenance scheduled.", "success");
        setShowForm(false);
        load();
      })
      .catch((err) => toast(err.response?.data?.message || "Save failed.", "error"))
      .finally(() => setSaving(false));
  };

  const remove = (id) => {
    if (!window.confirm("Delete this maintenance record?")) return;
    axios.delete(`${API}/api/admin/maintenance/${id}`)
      .then(() => { toast("Record deleted.", "success"); load(); })
      .catch(() => toast("Delete failed.", "error"));
  };

  return (
    <Layout title="Maintenance" subtitle="Schedule and track preventive & corrective maintenance across your fleet">
      <div className="maint-kpi-row">
        <div className="maint-kpi" style={{ background: "linear-gradient(135deg,#fbbf24,#d97706)" }}>
          <div className="maint-kpi-value">{stats.scheduled}</div>
          <div className="maint-kpi-label">Scheduled</div>
        </div>
        <div className="maint-kpi" style={{ background: "linear-gradient(135deg,#60a5fa,#2563eb)" }}>
          <div className="maint-kpi-value">{stats.inProgress}</div>
          <div className="maint-kpi-label">In Progress</div>
        </div>
        <div className="maint-kpi" style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}>
          <div className="maint-kpi-value">{stats.completed}</div>
          <div className="maint-kpi-label">Completed</div>
        </div>
        <div className="maint-kpi" style={{ background: "linear-gradient(135deg,#9ca3af,#6b7280)" }}>
          <div className="maint-kpi-value">{stats.cancelled}</div>
          <div className="maint-kpi-label">Cancelled</div>
        </div>
      </div>

      <div className="maint-toolbar">
        <div className="maint-filter-chips">
          {["All", ...STATUSES].map((s) => (
            <button key={s} className={`maint-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Schedule Maintenance</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th><th>Type</th><th>Description</th><th>Status</th>
                <th>Scheduled</th><th>Vendor</th><th>Cost</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 24 }}>Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>No maintenance records found.</td></tr>
              )}
              {!loading && filtered.map((r) => {
                const asset = assetById[r.assetId];
                const sc = statusColor[r.status] || statusColor["Scheduled"];
                return (
                  <tr key={r.id}>
                    <td>{asset ? asset.laptopName : `Asset #${r.assetId}`}</td>
                    <td>{r.maintenanceType}</td>
                    <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</td>
                    <td><span className="maint-status-pill" style={{ background: sc.bg, color: sc.text }}>{r.status}</span></td>
                    <td>{r.scheduledDate || "—"}</td>
                    <td>{r.vendor || "—"}</td>
                    <td>{r.cost ? `₹${r.cost}` : "—"}</td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(r)}>Edit</button>{" "}
                      <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="maint-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="maint-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Maintenance Record" : "Schedule Maintenance"}</h3>
            <div className="maint-modal-grid">
              <label>Asset
                <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} disabled={!!editingId}>
                  <option value="">Select asset…</option>
                  {assets.map((a) => <option key={a.assetId} value={a.assetId}>{a.laptopName} ({a.serialNumber})</option>)}
                </select>
              </label>
              <label>Type
                <select value={form.maintenanceType} onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label>Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>Scheduled Date
                <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
              </label>
              <label>Completed Date
                <input type="date" value={form.completedDate} onChange={(e) => setForm({ ...form, completedDate: e.target.value })} />
              </label>
              <label>Vendor
                <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              </label>
              <label>Cost
                <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </label>
              <label>Performed By
                <input value={form.performedBy} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} />
              </label>
              <label>Next Maintenance Date
                <input type="date" value={form.nextMaintenanceDate} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })} />
              </label>
              <label className="maint-modal-full">Description
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
              <label className="maint-modal-full">Remarks
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </label>
            </div>
            <div className="maint-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
