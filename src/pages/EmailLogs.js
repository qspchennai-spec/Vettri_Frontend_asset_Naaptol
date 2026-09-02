import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RefreshCw, Mail } from "lucide-react";
import Layout from "../components/Layout";
import EmailStatusPill from "../components/EmailStatusPill";
import { useToast } from "../utils/Toast";

import { API_BASE as API } from "../config";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function EmailLogs() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [resendingId, setResendingId] = useState(null); // assetId currently being resent

  const loadLogs = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/assets/email-logs`)
      .then((r) => { setLogs(r.data); setError(""); })
      .catch(() => { setLogs([]); setError("Couldn't load email logs. Is the API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = useMemo(
    () => logs.filter((l) => statusFilter === "All" || l.status === statusFilter),
    [logs, statusFilter]
  );

  const handleResend = (log) => {
    setResendingId(log.assetId);
    axios.post(`${API}/assets/send-email/${log.assetId}`)
      .then((res) => {
        toast(res.data.message || "Asset assignment email sent successfully.", "success");
        loadLogs();
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Couldn't resend the email. Please try again.", "error");
        loadLogs(); // reflect the new FAILED row that was still logged server-side
      })
      .finally(() => setResendingId(null));
  };

  return (
    <Layout
      title="Email Logs"
      subtitle="History of asset assignment notification emails"
      actions={
        <button className="btn btn-secondary" onClick={loadLogs} style={{ display: "flex", alignItems: "center", gap: 6 }}>
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

      <div className="card" style={{ padding: "16px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)" }}>Status</span>
        {["All", "Sent", "Failed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="btn"
            style={{
              padding: "5px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 20,
              border: statusFilter === s ? "1px solid var(--primary)" : "1px solid var(--gray-200)",
              background: statusFilter === s ? "var(--primary-50)" : "#fff",
              color: statusFilter === s ? "var(--primary-700)" : "var(--gray-600)",
              boxShadow: "none",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gray-400)", fontSize: 13 }}>
            Loading email logs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}><Mail size={28} style={{ opacity: 0.4 }} /></div>
            <div className="empty-title">No email history yet</div>
            <div className="empty-sub">Assignment emails sent from the Assets page will show up here.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Asset</th>
                  <th>Email</th>
                  <th>Sent By</th>
                  <th>Date &amp; Time</th>
                  <th>Status</th>
                  <th style={{ width: 110 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--gray-900)", fontSize: 13.5 }}>
                        {log.employeeName || log.employeeId || "—"}
                      </div>
                      {log.employeeId && (
                        <div style={{ fontSize: 11.5, color: "var(--gray-500)" }}>{log.employeeId}</div>
                      )}
                    </td>
                    <td style={{ color: "var(--gray-700)" }}>{log.assetLabel}</td>
                    <td className="mono" style={{ color: "var(--gray-600)" }}>{log.employeeEmail || "—"}</td>
                    <td style={{ color: "var(--gray-600)" }}>{log.sentByAdmin || "—"}</td>
                    <td style={{ color: "var(--gray-600)", whiteSpace: "nowrap" }}>{formatDateTime(log.sentAt)}</td>
                    <td>
                      <EmailStatusPill status={log.status === "SENT" ? "Sent" : log.status === "FAILED" ? "Failed" : log.status} />
                      {log.status === "FAILED" && log.errorMessage && (
                        <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 3, maxWidth: 220 }}>
                          {log.errorMessage}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="action-edit"
                        onClick={() => handleResend(log)}
                        disabled={resendingId === log.assetId}
                        title="Resend this email"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <RefreshCw size={12} className={resendingId === log.assetId ? "spin-icon" : ""} />
                        {resendingId === log.assetId ? "Sending…" : "Resend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .spin-icon { animation: spin 0.8s linear infinite; }
      `}</style>
    </Layout>
  );
}
