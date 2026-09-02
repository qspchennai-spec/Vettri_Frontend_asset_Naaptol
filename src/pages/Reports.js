import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { AssetTypeBarChart } from "../components/DashboardChart";
import CountUp from "../components/CountUp";
import { useToast } from "../utils/Toast";

import { API_BASE as API } from "../config";

export default function Reports() {
  const toast = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [exitPdfDownloading, setExitPdfDownloading] = useState(false);
  const [exitExcelDownloading, setExitExcelDownloading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    axios.get(`${API}/assets`)
      .then((r) => { setAssets(r.data); setError(""); })
      .catch(() => { setAssets([]); setError("Couldn't load report data. Is the API running?"); })
      .finally(() => setLoading(false));

    axios.get(`${API}/api/admin/reports/analytics`)
      .then((r) => setAnalytics(r.data))
      .catch(() => { /* Analytics section simply stays hidden if this fails */ });
  }, []);

  const totalAssets    = assets.length;
  const assignedAssets = assets.filter((a) => a.assetStatus === "Assigned").length;
  const availableAssets= assets.filter((a) => a.assetStatus === "Available").length;
  const utilization    = totalAssets ? Math.round((assignedAssets / totalAssets) * 100) : 0;

  // Breakdown by type
  const typeData = useMemo(() => {
    const counts = {};
    assets.forEach((a) => { const t = a.assetType || "Other"; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  // Breakdown by department (derived from employee names for now — ideal: join with employee table)
  const deptData = useMemo(() => {
    const counts = {};
    assets.forEach((a) => {
      const dept = a.employeeRole || "Unassigned";
      if (!counts[dept]) counts[dept] = { dept, total: 0, assigned: 0, available: 0 };
      counts[dept].total++;
      if (a.assetStatus === "Assigned")  counts[dept].assigned++;
      if (a.assetStatus === "Available") counts[dept].available++;
    });
    return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [assets]);

  const exportCSV = () => {
    if (!assets.length) return;
    const headers = ["Asset ID","Employee","Role","Location","Type","Asset Name","Brand","Model","Serial No","Status","Assigned Date"];
    const rows = assets.map((a) => [
      a.assetId, a.employeeName||"", a.employeeRole||"", a.location||"",
      a.assetType, a.laptopName, a.brand, a.model||"", a.serialNumber,
      a.assetStatus, a.assignedDate||"",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "asset-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEmployeePdf = async () => {
    setPdfDownloading(true);
    try {
      const token = sessionStorage.getItem("iam_token");
      const response = await axios.get(`${API}/api/admin/reports/employee-asset-report/pdf`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `employee-asset-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't generate the PDF report. Please try again.", "error");
    } finally {
      setPdfDownloading(false);
    }
  };

  const downloadExitReport = async (format) => {
    const isPdf = format === "pdf";
    const setDownloading = isPdf ? setExitPdfDownloading : setExitExcelDownloading;
    setDownloading(true);
    try {
      const token = sessionStorage.getItem("iam_token");
      const response = await axios.get(`${API}/api/admin/reports/employee-exit-report/${format}`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
      const mime = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `employee-exit-report-${new Date().toISOString().split("T")[0]}.${isPdf ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.response?.data?.message || `Couldn't generate the exit report ${format.toUpperCase()}. Please try again.`, "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout title="Reports" subtitle="Real-time asset analytics from PostgreSQL">
      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2", padding: "12px 18px", fontSize: 13, color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="kpi-row kpi-row-4 stagger-in" style={{ marginBottom: 24 }}>
        {[
          { label: "Total Assets",  value: loading ? "—" : totalAssets,     gradient: "linear-gradient(135deg,#60a5fa,#1d4ed8)", glow: "#1d4ed840", icon: "📦" },
          { label: "Assigned",      value: loading ? "—" : assignedAssets,  gradient: "linear-gradient(135deg,#fbbf24,#d97706)", glow: "#d9770640", icon: "🔗" },
          { label: "Available",     value: loading ? "—" : availableAssets, gradient: "linear-gradient(135deg,#34d399,#059669)", glow: "#10b98140", icon: "✅" },
          { label: "Utilization",   value: loading ? "—" : `${utilization}%`,gradient: "linear-gradient(135deg,#a78bfa,#7c3aed)", glow: "#7c3aed40", icon: "📊" },
        ].map((s) => (
          <div key={s.label} className="kpi-card-vivid" style={{ background: s.gradient, boxShadow: `0 8px 24px ${s.glow}` }}>
            <div className="kpi-vivid-icon">{s.icon}</div>
            <div className="kpi-vivid-value">{typeof s.value === "number" ? <CountUp value={s.value} /> : s.value}</div>
            <div className="kpi-vivid-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Bar Chart by Asset Type */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Assets by Type</div>
            <div className="card-subtitle">Live from asset inventory</div>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
                <div className="skeleton skeleton-block" style={{ height: 180 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div className="skeleton skeleton-text short" />
                  <div className="skeleton skeleton-text short" />
                  <div className="skeleton skeleton-text short" />
                </div>
              </div>
            ) : (
              <AssetTypeBarChart data={typeData} />
            )}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">By Role / Team</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3,4].map((i) => <div key={i} className="skeleton skeleton-row" />)}
              </div>
            ) : deptData.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <div className="empty-title">No data yet</div>
                <div className="empty-sub">Add assets to see the breakdown.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Role / Team</th><th>Total</th><th>Assigned</th><th>Available</th><th>Utilization</th></tr>
                </thead>
                <tbody>
                  {deptData.map((d) => (
                    <tr key={d.dept}>
                      <td style={{ fontWeight: 600 }}>{d.dept}</td>
                      <td>{d.total}</td>
                      <td><span style={{ color: "#d97706", fontWeight: 600 }}>{d.assigned}</span></td>
                      <td><span style={{ color: "#059669", fontWeight: 600 }}>{d.available}</span></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 10 }}>
                            <div style={{ height: "100%", borderRadius: 10, background: "#1a56db", width: `${d.total ? Math.round((d.assigned / d.total) * 100) : 0}%` }} />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-500)", minWidth: 30 }}>
                            {d.total ? Math.round((d.assigned / d.total) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      {analytics && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Warranty Watchlist</div>
              <div className="card-subtitle">Expiring in the next 30 days · {analytics.warrantyExpired || 0} already expired</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {(analytics.warrantyExpiringSoon || []).length === 0 ? (
                <div className="empty-state" style={{ padding: "24px 0" }}>
                  <div className="empty-title">All clear</div>
                  <div className="empty-sub">No warranties expiring in the next 30 days.</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Asset</th><th>Serial</th><th>Expires</th><th>Days Left</th></tr></thead>
                  <tbody>
                    {analytics.warrantyExpiringSoon.map((w) => (
                      <tr key={w.assetId}>
                        <td style={{ fontWeight: 600 }}>{w.laptopName}</td>
                        <td>{w.serialNumber}</td>
                        <td>{w.warrantyExpiry}</td>
                        <td><span style={{ color: w.daysLeft <= 7 ? "#dc2626" : "#d97706", fontWeight: 700 }}>{w.daysLeft}d</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Fleet Age Distribution</div>
              <div className="card-subtitle">Total asset value: ₹{Math.round(analytics.totalAssetValue || 0).toLocaleString()}</div>
            </div>
            <div className="card-body">
              {Object.entries(analytics.byAgeBracket || {}).map(([bracket, count]) => (
                <div key={bracket} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)" }}>{bracket}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 10 }}>
                    <div style={{
                      height: "100%", borderRadius: 10, background: "#7c3aed",
                      width: `${totalAssets ? Math.round((count / totalAssets) * 100) : 0}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Export Reports</div>
          <div className="card-subtitle">Download real PostgreSQL data</div>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={exportCSV} disabled={!assets.length}>
              📥 Full Asset Report (CSV)
            </button>
            <button className="btn btn-secondary" onClick={downloadEmployeePdf} disabled={pdfDownloading}>
              {pdfDownloading ? "Generating…" : "📄 Employee Asset Report (PDF)"}
            </button>
            <button className="btn btn-secondary" onClick={() => downloadExitReport("pdf")} disabled={exitPdfDownloading}>
              {exitPdfDownloading ? "Generating…" : "🚪 Employee Exit Report (PDF)"}
            </button>
            <button className="btn btn-secondary" onClick={() => downloadExitReport("excel")} disabled={exitExcelDownloading}>
              {exitExcelDownloading ? "Generating…" : "📊 Employee Exit Report (Excel)"}
            </button>
          </div>
          {!assets.length && !loading && (
            <div style={{ fontSize: 12.5, color: "var(--gray-400)", marginTop: 10 }}>
              No data to export yet. Add some assets first.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
