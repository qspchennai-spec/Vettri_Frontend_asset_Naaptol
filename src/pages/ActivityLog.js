import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RefreshCw, Activity } from "lucide-react";
import Layout from "../components/Layout";

import { API_BASE as API } from "../config";

const ENTITY_FILTERS = ["All", "ASSET", "EMPLOYEE", "NETWORK_CREDENTIAL", "ASSET_REQUEST"];
const ENTITY_LABELS = {
  ASSET: "Asset",
  EMPLOYEE: "Employee",
  NETWORK_CREDENTIAL: "Network Credential",
  ASSET_REQUEST: "Asset Request",
};

const ACTION_STYLES = {
  CREATED:            { bg: "#f0fdf4", color: "#15803d" },
  UPDATED:            { bg: "#eff6ff", color: "#1d4ed8" },
  ASSIGNED:           { bg: "#f5f3ff", color: "#6d28d9" },
  RETURNED:           { bg: "#fff7ed", color: "#c2410c" },
  RELIEVED:           { bg: "#fff7ed", color: "#c2410c" },
  DELETED:            { bg: "#fef2f2", color: "#b91c1c" },
  REPAIRED:           { bg: "#f0fdf4", color: "#15803d" },
  PASSWORD_RESET:     { bg: "#fffbeb", color: "#b45309" },
  PASSWORD_CHANGED:   { bg: "#fffbeb", color: "#b45309" },
  PASSWORD_REVEALED:  { bg: "#fef2f2", color: "#b91c1c" },
  APPROVED:           { bg: "#f0fdf4", color: "#15803d" },
  REJECTED:           { bg: "#fef2f2", color: "#b91c1c" },
};
const DEFAULT_ACTION_STYLE = { bg: "var(--gray-100)", color: "var(--gray-600)" };

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const getInitials = (name) => {
  if (!name) return "?";
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = clean.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || clean[0]?.toUpperCase() || "?";
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [search, setSearch] = useState("");

  const loadLogs = useCallback((filter) => {
    setLoading(true);
    const params = filter && filter !== "All" ? { entityType: filter } : {};
    axios.get(`${API}/api/admin/audit-logs`, { params })
      .then((r) => { setLogs(r.data); setError(""); })
      .catch(() => { setLogs([]); setError("Couldn't load the activity log. Is the API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLogs(entityFilter); }, [loadLogs, entityFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.trim().toLowerCase();
    return logs.filter((l) =>
      (l.description || "").toLowerCase().includes(q) ||
      (l.performedBy || "").toLowerCase().includes(q) ||
      (l.action || "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <Layout
      title="Activity Log"
      subtitle="Who changed what, and when — across assets, employees, network credentials, and requests"
      actions={
        <button className="btn btn-secondary" onClick={() => loadLogs(entityFilter)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {error && (
        <div className="card" style={{
          marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2",
          padding: "12px 18px", fontSize: 13, color: "#991b1b",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="card" style={{ padding: "16px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)" }}>Type</span>
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setEntityFilter(f)}
            className="btn"
            style={{
              padding: "5px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 20,
              border: entityFilter === f ? "1px solid var(--primary)" : "1px solid var(--gray-200)",
              background: entityFilter === f ? "var(--primary-50)" : "#fff",
              color: entityFilter === f ? "var(--primary-700)" : "var(--gray-600)",
              boxShadow: "none",
            }}
          >
            {f === "All" ? "All" : ENTITY_LABELS[f]}
          </button>
        ))}
        <input
          className="input"
          placeholder="Search description or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: "auto", maxWidth: 260 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gray-400)", fontSize: 13 }}>
            Loading activity…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}><Activity size={28} style={{ opacity: 0.4 }} /></div>
            <div className="empty-title">No activity yet</div>
            <div className="empty-sub">Actions like creating, editing, or deleting records will show up here.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 160 }}>When</th>
                  <th style={{ width: 130 }}>Action</th>
                  <th style={{ width: 150 }}>Type</th>
                  <th>Description</th>
                  <th style={{ width: 180 }}>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const actionStyle = ACTION_STYLES[entry.action] || DEFAULT_ACTION_STYLE;
                  return (
                    <tr key={entry.id}>
                      <td style={{ color: "var(--gray-500)", fontSize: 12.5, whiteSpace: "nowrap" }}>
                        {formatDateTime(entry.timestamp)}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 20,
                          fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
                          background: actionStyle.bg, color: actionStyle.color,
                        }}>
                          {entry.action?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className="tag tag-blue">{ENTITY_LABELS[entry.entityType] || entry.entityType}</span>
                      </td>
                      <td style={{ color: "var(--gray-700)", fontSize: 13 }}>{entry.description || "—"}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                            background: "linear-gradient(135deg, var(--primary), var(--accent-purple))",
                            color: "#fff", fontSize: 10.5, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {getInitials(entry.performedBy)}
                          </div>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-800)" }}>
                              {entry.performedBy || "system"}
                            </div>
                            {entry.performedByRole && (
                              <div style={{ fontSize: 10.5, color: "var(--gray-400)" }}>
                                {entry.performedByRole.replace(/^ROLE_/, "")}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
