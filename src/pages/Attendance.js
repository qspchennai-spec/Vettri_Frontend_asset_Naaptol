import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import "./Attendance.css";

import { API_BASE as API } from "../config";

const TOKEN_KEY = "iam_token";

const EMPTY_MAPPING_FORM = { devicePin: "", employeeId: "" };

function formatPunchTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function PunchTypeBadge({ type }) {
  const normalized = (type || "UNKNOWN").toUpperCase();
  const cls = normalized === "IN" ? "att-badge att-badge-in" : normalized === "OUT" ? "att-badge att-badge-out" : "att-badge att-badge-unknown";
  return <span className={cls}>{normalized}</span>;
}

function StatusBadge({ status }) {
  const cls = status === "UNMAPPED" ? "att-badge att-badge-warn" : "att-badge att-badge-neutral";
  return <span className={cls}>{status || "RECEIVED"}</span>;
}

export default function Attendance() {
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState("connecting"); // connecting | live | disconnected
  const [tab, setTab] = useState("feed"); // feed | devices | mappings

  const [showMappingForm, setShowMappingForm] = useState(false);
  const [mappingForm, setMappingForm] = useState(EMPTY_MAPPING_FORM);
  const [editingMappingId, setEditingMappingId] = useState(null);
  const [savingMapping, setSavingMapping] = useState(false);

  const eventSourceRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/api/admin/attendance`),
      axios.get(`${API}/api/admin/attendance/stats`),
      axios.get(`${API}/api/admin/attendance/devices`),
      axios.get(`${API}/api/admin/attendance/mappings`),
      axios.get(`${API}/api/admin/employees`).catch(() => ({ data: [] })),
    ])
      .then(([recRes, statsRes, devRes, mapRes, empRes]) => {
        setRecords(recRes.data);
        setStats(statsRes.data);
        setDevices(devRes.data);
        setMappings(mapRes.data);
        setEmployees(empRes.data || []);
      })
      .catch(() => toast("Couldn't load attendance data.", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live feed via SSE — falls back gracefully to the initial list-only view if it can't connect.
  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token || typeof window === "undefined" || typeof window.EventSource === "undefined") return;

    const es = new window.EventSource(`${API}/api/admin/attendance/stream?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => setConnectionState("live"));
    es.addEventListener("attendance", (evt) => {
      try {
        const newRecord = JSON.parse(evt.data);
        setRecords((prev) => (prev.some((r) => r.id === newRecord.id) ? prev : [newRecord, ...prev]));
      } catch { /* ignore malformed payload */ }
    });
    es.onerror = () => setConnectionState("disconnected");

    return () => { es.close(); eventSourceRef.current = null; };
  }, []);
  const openCreateMapping = () => { setMappingForm(EMPTY_MAPPING_FORM); setEditingMappingId(null); setShowMappingForm(true); };
  const openEditMapping = (m) => { setMappingForm({ devicePin: m.devicePin, employeeId: m.employeeId }); setEditingMappingId(m.id); setShowMappingForm(true); };

  const saveMapping = () => {
    if (!mappingForm.devicePin.trim() || !mappingForm.employeeId.trim()) {
      toast("Device PIN and Employee are both required.", "error");
      return;
    }
    setSavingMapping(true);
    const req = editingMappingId
      ? axios.put(`${API}/api/admin/attendance/mappings/${editingMappingId}`, mappingForm)
      : axios.post(`${API}/api/admin/attendance/mappings`, mappingForm);
    req
      .then(() => {
        toast(editingMappingId ? "Mapping updated." : "Device PIN mapped to employee.", "success");
        setShowMappingForm(false);
        load();
      })
      .catch((err) => toast(err.response?.data?.error || err.response?.data?.message || "Save failed.", "error"))
      .finally(() => setSavingMapping(false));
  };

  const removeMapping = (id) => {
    if (!window.confirm("Remove this device PIN mapping?")) return;
    axios.delete(`${API}/api/admin/attendance/mappings/${id}`)
      .then(() => { toast("Mapping removed.", "success"); load(); })
      .catch(() => toast("Delete failed.", "error"));
  };

  const renameDevice = (device) => {
    const name = window.prompt("Device name", device.deviceName);
    if (name === null) return;
    const location = window.prompt("Location (optional)", device.location || "") || "";
    axios.put(`${API}/api/admin/attendance/devices/${device.id}`, { deviceName: name, location })
      .then(() => { toast("Device updated.", "success"); load(); })
      .catch(() => toast("Update failed.", "error"));
  };

  return (
    <Layout title="Attendance Management" subtitle="eSSL biometric attendance — live punches, devices, and employee mapping">
      <div className="att-kpi-row">
        <div className="att-kpi" style={{ background: "linear-gradient(135deg,#60a5fa,#2563eb)" }}>
          <div className="att-kpi-value">{stats?.totalPunchesToday ?? "—"}</div>
          <div className="att-kpi-label">Punches Today</div>
        </div>
        <div className="att-kpi" style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}>
          <div className="att-kpi-value">{stats?.employeesPresentToday ?? "—"}</div>
          <div className="att-kpi-label">Employees Present</div>
        </div>
        <div className="att-kpi" style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>
          <div className="att-kpi-value">{stats ? `${stats.devicesOnline}/${stats.devicesTotal}` : "—"}</div>
          <div className="att-kpi-label">Devices Online</div>
        </div>
        <div className="att-kpi" style={{ background: "linear-gradient(135deg,#fbbf24,#d97706)" }}>
          <div className="att-kpi-value">{stats?.unmappedDevicePins ?? "—"}</div>
          <div className="att-kpi-label">Unmapped Punches</div>
        </div>
      </div>

      <div className="att-toolbar">
        <div className="att-tabs">
          <button className={`att-tab ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}>Live Feed</button>
          <button className={`att-tab ${tab === "devices" ? "active" : ""}`} onClick={() => setTab("devices")}>Devices ({devices.length})</button>
          <button className={`att-tab ${tab === "mappings" ? "active" : ""}`} onClick={() => setTab("mappings")}>Employee Mapping ({mappings.length})</button>
        </div>
        <div className={`att-connection-pill att-connection-${connectionState}`}>
          <span className="att-connection-dot" />
          {connectionState === "live" && "Live"}
          {connectionState === "connecting" && "Connecting…"}
          {connectionState === "disconnected" && "Reconnecting…"}
        </div>
      </div>

      {tab === "feed" && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th><th>Employee Name</th><th>Department</th>
                  <th>Punch Time</th><th>Type</th><th>Verify</th><th>Device</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 24 }}>Loading…</td></tr>}
                {!loading && records.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                    No attendance punches received yet. Scan a fingerprint on the device to see it appear here.
                  </td></tr>
                )}
                {!loading && records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.employeeId}</td>
                    <td>{r.employeeName}</td>
                    <td>{r.department || "—"}</td>
                    <td>{formatPunchTime(r.punchTime)}</td>
                    <td><PunchTypeBadge type={r.punchType} /></td>
                    <td>{r.verifyMode || "—"}</td>
                    <td>{r.deviceName}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "devices" && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Device Name</th><th>Serial Number</th><th>Location</th><th>Last IP</th><th>Last Seen</th><th></th></tr>
              </thead>
              <tbody>
                {devices.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                    No devices have checked in yet. Point the eSSL device's ADMS "Server Address" at this backend.
                  </td></tr>
                )}
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td>{d.deviceName}</td>
                    <td>{d.serialNumber}</td>
                    <td>{d.location || "—"}</td>
                    <td>{d.lastIpAddress || "—"}</td>
                    <td>{formatPunchTime(d.lastSeenAt)}</td>
                    <td><button className="btn btn-sm btn-secondary" onClick={() => renameDevice(d)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "mappings" && (
        <>
          <div className="att-toolbar" style={{ marginTop: 0 }}>
            <div />
            <button className="btn btn-primary" onClick={openCreateMapping}>+ Map Device PIN</button>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Device PIN</th><th>Employee ID</th><th>Employee Name</th><th>Department</th><th></th></tr>
                </thead>
                <tbody>
                  {mappings.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                      No device PINs mapped yet. Enroll a fingerprint on the device (it will show up as "Unmapped" in the Live Feed), then map its PIN to an employee here.
                    </td></tr>
                  )}
                  {mappings.map((m) => (
                    <tr key={m.id}>
                      <td>{m.devicePin}</td>
                      <td>{m.employeeId}</td>
                      <td>{m.employeeFound ? m.employeeName : <span style={{ color: "#dc2626" }}>{m.employeeName}</span>}</td>
                      <td>{m.department || "—"}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEditMapping(m)}>Edit</button>{" "}
                        <button className="btn btn-sm btn-danger" onClick={() => removeMapping(m.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showMappingForm && (
        <div className="att-modal-overlay" onClick={() => setShowMappingForm(false)}>
          <div className="att-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingMappingId ? "Edit Device Mapping" : "Map Device PIN to Employee"}</h3>
            <div className="att-modal-grid">
              <label>Device PIN
                <input
                  value={mappingForm.devicePin}
                  onChange={(e) => setMappingForm({ ...mappingForm, devicePin: e.target.value })}
                  disabled={!!editingMappingId}
                  placeholder="e.g. 1007"
                />
              </label>
              <label>Employee
                <select
                  value={mappingForm.employeeId}
                  onChange={(e) => setMappingForm({ ...mappingForm, employeeId: e.target.value })}
                >
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>{e.employeeName} ({e.employeeId})</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="att-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowMappingForm(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={savingMapping} onClick={saveMapping}>{savingMapping ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
