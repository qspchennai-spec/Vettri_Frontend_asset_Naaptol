import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { StatusPieChart, AssetTypeBarChart } from "../components/DashboardChart";
import StatusPill from "../components/StatusPill";
import CountUp from "../components/CountUp";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { ClipboardList, Laptop, Receipt, ShieldAlert, Info, ArrowUpRight, CheckCircle2 } from "lucide-react";
import "./Dashboard.css";

import { API_BASE as API, CLIENT_FEATURES } from "../config";

/* ── SVG Icons ─────────────────────────────────────────────────── */
const IconBox      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
const IconCheck    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconLink     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconArchive  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const IconWrench   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconAlert    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconUsers    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDoc      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconPlus     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconBell     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconMonitor  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></svg>;
const IconUserCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
const IconUserX = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>;

/* ── KPI Card ──────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, gradient, glow, onClick, badge }) {
  return (
    <div
      className={`kpi-card-vivid ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      style={{ background: gradient, boxShadow: `0 3px 10px ${glow}` }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="kpi-vivid-icon">{icon}</div>
        {badge && (
          <span className="kpi-vivid-active-badge" style={{ marginTop: 0 }}>{badge}</span>
        )}
      </div>
      {value === null || value === undefined
        ? <div className="kpi-vivid-value-skeleton" />
        : <div className="kpi-vivid-value"><CountUp value={value} /></div>}
      <div className="kpi-vivid-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Progress Bar ──────────────────────────────────────────────── */
function pct(count, stats) {
  if (!stats) return 0;
  const total = (stats.scheduled || 0) + (stats.inProgress || 0) + (stats.completed || 0) + (stats.cancelled || 0);
  if (!total) return 0;
  return Math.round(((count || 0) / total) * 100);
}
function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)" }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color, fontFamily: "var(--font-data)" }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 10,
          background: `linear-gradient(90deg, ${color}bb, ${color})`,
          width: `${value}%`,
          transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>
    </div>
  );
}

/* ── Quick Action ──────────────────────────────────────────────── */
function QuickAction({ label, icon, color, bg, link }) {
  return (
    <Link
      to={link}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, padding: "12px 8px", borderRadius: 10,
        background: bg, border: `1.5px solid ${color}18`,
        cursor: "pointer", textDecoration: "none",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 6px 18px ${color}1a`;
        e.currentTarget.style.borderColor = `${color}35`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = `${color}18`;
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color, textAlign: "center" }}>{label}</span>
    </Link>
  );
}

/* ── Activity Row Icon ─────────────────────────────────────────── */
function activityIcon(type) {
  if (type === "assign") return { bg: "#eff6ff", el: <IconMonitor /> };
  return { bg: "#f0fdf4", el: <span style={{ fontSize: 14 }}>↩</span> };
}

/* ── Recent Notifications widget / Enterprise Notification Center ─────────────── */
const RN_CATEGORY_ICON = { Task: ClipboardList, Asset: Laptop, Billing: Receipt, Security: ShieldAlert, System: Info };
const RN_PRIORITY_COLOR = { Critical: "#dc2626", High: "#ea580c", Normal: "#2563eb", Low: "#16a34a" };

function RecentNotificationsWidget() {
  const navigate = useNavigate();
  const ctx = useNotifications();
  const items = (ctx?.pulseNotifications || []).filter((n) => n.status !== "Dismissed").slice(0, 6);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Recent Notifications</div>
          <div className="card-subtitle">Latest reminders from the Enterprise Notification Center</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/pulse")}>View All</button>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 0" }}>
            <div className="empty-icon">🔔</div>
            <div className="empty-title">No notifications yet</div>
            <div className="empty-sub">Task and module reminders will show up here as they're triggered.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Notification</th>
                  <th>Module</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => {
                  const Icon = RN_CATEGORY_ICON[n.category] || Info;
                  const color = RN_PRIORITY_COLOR[n.priority] || "#2563eb";
                  return (
                    <tr key={n.notificationId}>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color, fontWeight: 700, fontSize: 12 }}>
                          <Icon size={14} /> {n.priority}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{n.title}</div>
                      </td>
                      <td className="muted">{n.relatedModule ? n.relatedModule.replace(/_/g, " ") : "—"}</td>
                      <td className="muted">{new Date(n.createdAt).toLocaleString()}</td>
                      <td><StatusPill status={n.isRead ? "Read" : "Unread"} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/pulse")} title="View">
                            <ArrowUpRight size={13} />
                          </button>
                          {!n.isRead && (
                            <button className="btn btn-secondary btn-sm" onClick={() => ctx?.markPulseRead(n.notificationId)} title="Mark as read">
                              <CheckCircle2 size={13} />
                            </button>
                          )}
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
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [dashboard, setDashboard]       = useState({ totalAssets:null,availableAssets:null,assignedAssets:null,totalEmployees:null });
  const [pendingRequests, setPendingRequests] = useState(null);
  const [assets, setAssets]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [billing, setBilling] = useState({
    totalPayments: null, paidServices: null, pendingServices: null,
    overdueServices: null, totalInvoicesUploaded: null,
  });
  const [analytics, setAnalytics] = useState(null);
  const [lifecycleStats, setLifecycleStats] = useState(null);

  const now      = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/assets/dashboard`),
      axios.get(`${API}/assets`),
      axios.get(`${API}/api/admin/requests`),
    ])
    .then(([dashRes, assetsRes, reqRes]) => {
      setDashboard(dashRes.data);
      setAssets(assetsRes.data);
      setPendingRequests((reqRes.data || []).filter((r) => r.status === "PENDING").length);
      setError("");
    })
    .catch(() => setError("Couldn't reach the API. Is the Spring Boot server running?"))
    .finally(() => setLoading(false));

    // Service Billing KPIs load independently — a failure here shouldn't
    // block the rest of the dashboard from rendering.
    if (CLIENT_FEATURES.serviceBilling) {
      axios.get(`${API}/api/admin/service-billing/dashboard`)
        .then((r) => setBilling(r.data))
        .catch(() => { /* card simply shows placeholders if this fails */ });
    }

    // Warranty & Maintenance widgets — a failure here shouldn't block the rest of the dashboard.
    axios.get(`${API}/api/admin/reports/analytics`)
      .then((r) => setAnalytics(r.data))
      .catch(() => { /* widgets simply stay hidden if this fails */ });

    // Employee Lifecycle widgets (Active / On Leave / Notice Period / Resigned /
    // Terminated / Pending Returns / Joined & Left This Month).
    axios.get(`${API}/api/admin/employees/dashboard/lifecycle-stats`)
      .then((r) => setLifecycleStats(r.data))
      .catch(() => { /* widgets simply stay hidden if this fails */ });
  }, []);

  const derivedCounts = useMemo(() => ({
    spare:       assets.filter((a) => a.assetStatus === "Spare").length,
    underRepair: assets.filter((a) => a.assetStatus === "Under Repair").length,
    faulty:      assets.filter((a) => a.assetStatus === "Faulty").length,
  }), [assets]);

  const branchStats = useMemo(() => {
    const branches = [
      { key: "mumbai",  label: "Mumbai",            location: "Mumbai",             color: "#059669", glow: "#059669", icon: "🌆" },
    ];
    return branches.map(b => {
      const branchAssets = assets.filter(a => (a.location || "") === b.location);
      return {
        ...b,
        total:     branchAssets.length,
        assigned:  branchAssets.filter(a => a.assetStatus === "Assigned").length,
        available: branchAssets.filter(a => a.assetStatus === "Available").length,
        spare:     branchAssets.filter(a => a.assetStatus === "Spare").length,
        faulty:    branchAssets.filter(a => a.assetStatus === "Faulty" || a.assetStatus === "Disposed" || a.assetStatus === "Under Repair").length,
      };
    });
  }, [assets]);

  const pieData = useMemo(() => [
    { name: "Available", value: dashboard.availableAssets || 0 },
    { name: "Assigned",  value: dashboard.assignedAssets  || 0 },
    { name: "Spare",     value: derivedCounts.spare },
    { name: "Repair",    value: derivedCounts.underRepair },
    { name: "Faulty",    value: derivedCounts.faulty },
  ], [dashboard, derivedCounts]);

  const typeData = useMemo(() => {
    const counts = {};
    assets.forEach((a) => { const t = a.assetType || "Other"; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const recentActivity = useMemo(() => {
    const events = [];
    assets.forEach((a) => {
      if (a.assignedDate) events.push({ id: `assign-${a.assetId}`, type: "assign", action: "Asset Assigned", detail: `${a.laptopName || a.assetType} → ${a.employeeName || "employee"}`, date: a.assignedDate });
      if (a.returnedStatus === "Yes" && a.returnDate) events.push({ id: `return-${a.assetId}`, type: "return", action: "Asset Returned", detail: `${a.laptopName || a.assetType} returned`, date: a.returnDate });
    });
    return events.filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  }, [assets]);

  const recentlyAssigned = useMemo(() => {
    return assets
      .filter((a) => a.assignedDate)
      .slice()
      .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate))
      .slice(0, 6);
  }, [assets]);

  const utilizationRate  = dashboard.totalAssets ? Math.round((dashboard.assignedAssets  / dashboard.totalAssets) * 100) : 0;
  const availabilityRate = dashboard.totalAssets ? Math.round((dashboard.availableAssets / dashboard.totalAssets) * 100) : 0;

  const V = (v) => loading ? null : (v ?? 0);

  return (
    <Layout title="Dashboard" subtitle="Live overview of your IT inventory">

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 18, borderRadius: 10, padding: "11px 16px",
          background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
          fontSize: 12.5, color: "var(--danger)",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <IconAlert />{error}
        </div>
      )}

      {/* Welcome */}
      <div className="welcome-banner" style={{ marginBottom: 16 }}>
        <div className="welcome-banner-text">
          <div className="welcome-banner-greeting">{greeting},</div>
          <div className="welcome-banner-title">{user?.name || "Administrator"} 👋</div>
          <div className="welcome-banner-sub">
            {loading
              ? "Loading inventory…"
              : `${dashboard.availableAssets ?? 0} assets ready to assign · ${pendingRequests ?? 0} pending requests`}
          </div>
        </div>
        <div className="welcome-banner-icon">🖥️</div>
      </div>

      {/* 6-KPI Row */}
      <div className="kpi-row kpi-row-6 stagger-in" style={{ marginBottom: 16 }}>
        <KpiCard icon={<IconBox />}     label="Total Assets"   value={V(dashboard.totalAssets)}     sub="All departments"   gradient="linear-gradient(135deg,#60a5fa,#2563eb)" glow="#2563eb40" />
        <KpiCard icon={<IconCheck />}   label="Available"      value={V(dashboard.availableAssets)} sub="Ready to assign"   gradient="linear-gradient(135deg,#34d399,#059669)" glow="#10b98140" />
        <KpiCard icon={<IconLink />}    label="Assigned"       value={V(dashboard.assignedAssets)}  sub="In active use"     gradient="linear-gradient(135deg,#60a5fa,#1d4ed8)" glow="#1d4ed840"
          badge={utilizationRate > 0 ? `${utilizationRate}%` : undefined} />
        <KpiCard icon={<IconArchive />} label="Spare"          value={V(derivedCounts.spare)}       sub="In reserve"        gradient="linear-gradient(135deg,#fbbf24,#ca8a04)" glow="#d9770640" />
        <KpiCard icon={<IconWrench />}  label="Under Repair"   value={V(derivedCounts.underRepair)} sub="At service"        gradient="linear-gradient(135deg,#fb923c,#ea580c)" glow="#ea580c40" />
        <KpiCard icon={<IconAlert />}   label="Faulty"         value={V(derivedCounts.faulty)}      sub="Defective"         gradient="linear-gradient(135deg,#f87171,#dc2626)" glow="#dc262640" />
      </div>

      {/* 2-KPI Row */}
      <div className="kpi-row kpi-row-2 stagger-in" style={{ marginBottom: 16 }}>
        <KpiCard icon={<IconUsers />} label="Total Employees"  value={V(dashboard.totalEmployees)} sub="Active directory"        gradient="linear-gradient(135deg,#a78bfa,#7c3aed)" glow="#7c3aed40" />
        <KpiCard icon={<IconDoc />}   label="Pending Requests" value={V(pendingRequests)}          sub="Awaiting your review"    gradient="linear-gradient(135deg,#f87171,#dc2626)" glow="#dc262640"
          badge={pendingRequests > 0 ? "Action needed" : undefined}
          onClick={() => navigate("/asset-requests")} />
      </div>

      {/* Branch Overview */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-800)" }}>Branch Overview</span>
          <span style={{ fontSize: 12, color: "var(--gray-400)", background: "var(--gray-100)", padding: "2px 10px", borderRadius: 999, fontWeight: 600 }}>
            Assets by location
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
          {branchStats.map(b => (
            <div key={b.key} style={{
              background: "#fff",
              border: `1px solid ${b.color}20`,
              borderRadius: 14,
              padding: "16px 18px",
              boxShadow: "var(--shadow-card)",
              transition: "box-shadow 0.2s",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: `linear-gradient(135deg, ${b.color}22, ${b.color}44)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>{b.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-900)" }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Branch inventory</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800, color: b.color,
                  background: `${b.color}11`, borderRadius: 10,
                  padding: "4px 12px", fontFamily: "var(--font-data)",
                }}>
                  {loading ? "—" : b.total}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 5, borderRadius: 99, background: "var(--gray-100)", marginBottom: 14, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: `linear-gradient(90deg, ${b.color}88, ${b.color})`,
                  width: loading || b.total === 0 ? "0%" : `${Math.round((b.assigned / b.total) * 100)}%`,
                  transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
                }} />
              </div>

              {/* 4-stat mini grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Assigned",  value: b.assigned,  dot: "#2563eb" },
                  { label: "Available", value: b.available, dot: "#059669" },
                  { label: "Spare",     value: b.spare,     dot: "#d97706" },
                  { label: "Faulty/Other", value: b.faulty, dot: "#dc2626" },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: "var(--gray-50)", borderRadius: 8,
                    padding: "8px 10px", display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: stat.dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gray-800)", lineHeight: 1 }}>
                        {loading ? "—" : stat.value}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--gray-400)", marginTop: 2 }}>{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Billing Overview */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-800)" }}>Service Billing</span>
            <span style={{ fontSize: 12, color: "var(--gray-400)", background: "var(--gray-100)", padding: "2px 10px", borderRadius: 999, fontWeight: 600 }}>
              Vendor payments &amp; invoices
            </span>
          </div>
          <Link to="/service-billing" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>
            View all →
          </Link>
        </div>
        <div className="kpi-row billing-kpi-row stagger-in">
          <KpiCard label="Total Payments"        value={billing.totalPayments === null ? null : (billing.totalPayments ?? 0)}         gradient="linear-gradient(135deg,#93c5fd,#2563eb)" glow="#2563eb40" icon={<IconDoc />} />
          <KpiCard label="Paid Services"          value={billing.paidServices === null ? null : (billing.paidServices ?? 0)}           gradient="linear-gradient(135deg,#34d399,#059669)" glow="#10b98140" icon={<IconCheck />} />
          <KpiCard label="Pending Services"       value={billing.pendingServices === null ? null : (billing.pendingServices ?? 0)}     gradient="linear-gradient(135deg,#fbbf24,#d97706)" glow="#d9770640" icon={<IconArchive />} />
          <KpiCard label="Overdue Services"       value={billing.overdueServices === null ? null : (billing.overdueServices ?? 0)}     gradient="linear-gradient(135deg,#f87171,#dc2626)" glow="#dc262640" icon={<IconAlert />}
            badge={billing.overdueServices > 0 ? "Action needed" : undefined}
            onClick={() => navigate("/service-billing")} />
          <KpiCard label="Invoices Uploaded"      value={billing.totalInvoicesUploaded === null ? null : (billing.totalInvoicesUploaded ?? 0)} gradient="linear-gradient(135deg,#a78bfa,#7c3aed)" glow="#7c3aed40" icon={<IconArchive />} />
        </div>
      </div>

      {/* Employee Lifecycle Overview */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-800)" }}>Employee Lifecycle</span>
            <span style={{ fontSize: 12, color: "var(--gray-400)", background: "var(--gray-100)", padding: "2px 10px", borderRadius: 999, fontWeight: 600 }}>
              Active · On Leave · Notice Period · Resigned · Terminated
            </span>
          </div>
          <Link to="/employees" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>
            Manage employees →
          </Link>
        </div>
        <div className="kpi-row kpi-row-4 stagger-in" style={{ marginBottom: 12 }}>
          <KpiCard icon={<IconUserCheck />} label="Active Employees"    value={lifecycleStats === null ? null : (lifecycleStats.active ?? 0)}       sub="Currently working"     gradient="linear-gradient(135deg,#4ade80,#16a34a)" glow="#16a34a40" onClick={() => navigate("/employees")} />
          <KpiCard icon={<IconAlert />}     label="On Leave"            value={lifecycleStats === null ? null : (lifecycleStats.onLeave ?? 0)}      sub="Temporarily away"      gradient="linear-gradient(135deg,#38bdf8,#0284c7)" glow="#0284c740" onClick={() => navigate("/employees")} />
          <KpiCard icon={<IconUsers />}     label="Notice Period"       value={lifecycleStats === null ? null : (lifecycleStats.noticePeriod ?? 0)} sub="Serving notice"        gradient="linear-gradient(135deg,#fde047,#ca8a04)" glow="#ca8a0440" onClick={() => navigate("/employees")} />
          <KpiCard icon={<IconArchive />}   label="Resigned"            value={lifecycleStats === null ? null : (lifecycleStats.resigned ?? 0)}     sub="Left voluntarily"      gradient="linear-gradient(135deg,#94a3b8,#475569)" glow="#47556940" onClick={() => navigate("/employees")} />
        </div>
        <div className="kpi-row kpi-row-4 stagger-in">
          <KpiCard icon={<IconUserX />}     label="Terminated"          value={lifecycleStats === null ? null : (lifecycleStats.terminated ?? 0)}   sub="Involuntary exits"     gradient="linear-gradient(135deg,#f87171,#b91c1c)" glow="#b91c1c40" onClick={() => navigate("/employees")} />
          <KpiCard icon={<IconBox />}       label="Pending Asset Returns" value={lifecycleStats === null ? null : (lifecycleStats.pendingAssetReturns ?? 0)} sub="Across separating staff" gradient="linear-gradient(135deg,#fb923c,#ea580c)" glow="#ea580c40"
            badge={lifecycleStats && lifecycleStats.pendingAssetReturns > 0 ? "Action needed" : undefined}
            onClick={() => navigate("/employees")} />
          <KpiCard icon={<IconPlus />}      label="Joined This Month"   value={lifecycleStats === null ? null : (lifecycleStats.joinedThisMonth ?? 0)} sub="New hires"            gradient="linear-gradient(135deg,#a78bfa,#7c3aed)" glow="#7c3aed40" onClick={() => navigate("/employees")} />
          <KpiCard icon={<IconArchive />}   label="Left This Month"     value={lifecycleStats === null ? null : (lifecycleStats.leftThisMonth ?? 0)} sub="Resigned + terminated" gradient="linear-gradient(135deg,#f472b6,#be185d)" glow="#be185d40" onClick={() => navigate("/employees")} />
        </div>
      </div>

      {/* Warranty & Maintenance Alerts */}
      {analytics && (
        <div className="grid-2-1" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Warranty Watchlist</div>
                <div className="card-subtitle">Expiring within 30 days</div>
              </div>
              <Link to="/reports" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>View report →</Link>
            </div>
            <div className="card-body">
              {(analytics.warrantyExpiringSoon || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--gray-400)", padding: "8px 0" }}>No warranties expiring soon. 🎉</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {analytics.warrantyExpiringSoon.slice(0, 5).map((w) => (
                    <div key={w.assetId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--gray-50)", borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-800)" }}>{w.laptopName}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)" }}>{w.serialNumber}</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                        background: w.daysLeft <= 7 ? "var(--danger-bg)" : "var(--warning-bg)",
                        color: w.daysLeft <= 7 ? "var(--danger)" : "var(--warning)",
                      }}>{w.daysLeft}d left</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Maintenance Status</div>
                <div className="card-subtitle">Across all open work</div>
              </div>
              <Link to="/maintenance" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>Manage →</Link>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ProgressBar label="Scheduled"   value={pct(analytics.maintenanceStats?.scheduled, analytics.maintenanceStats)} color="#d97706" />
              <ProgressBar label="In Progress" value={pct(analytics.maintenanceStats?.inProgress, analytics.maintenanceStats)} color="#2563eb" />
              <ProgressBar label="Completed"   value={pct(analytics.maintenanceStats?.completed, analytics.maintenanceStats)} color="#059669" />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid-2-1" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Assets by Type</div>
              <div className="card-subtitle">Live inventory breakdown</div>
            </div>
          </div>
          <div className="card-body"><AssetTypeBarChart data={typeData} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Status Distribution</div>
              <div className="card-subtitle">Inventory by current status</div>
            </div>
          </div>
          <div className="card-body"><StatusPieChart data={pieData} /></div>
        </div>
      </div>

      {/* Recently Assigned Assets */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Recently Assigned Assets</div>
            <div className="card-subtitle">Latest assignments across the fleet</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/assets")}>View All</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1, 2].map((i) => <div key={i} className="skeleton skeleton-row" />)}
            </div>
          ) : recentlyAssigned.length === 0 ? (
            <div className="empty-state" style={{ padding: "28px 0" }}>
              <div className="empty-icon">📋</div>
              <div className="empty-title">No assignments yet</div>
              <div className="empty-sub">Assigned assets will show up here once you assign them.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Asset</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyAssigned.map((a) => (
                    <tr key={a.assetId}>
                      <td>{a.employeeName || "—"}</td>
                      <td>{a.laptopName || a.assetType || "—"}</td>
                      <td className="muted">{a.assignedDate}</td>
                      <td><StatusPill status={a.assetStatus} /></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/assets")}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <RecentNotificationsWidget />

      {/* Bottom row */}
      <div className="grid-2">
        {/* Activity */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest asset events</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/assets")}>View All</button>
          </div>
          <div className="card-body activity-timeline" style={{ padding: "6px 20px" }}>
            {recentActivity.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 0" }}>
                <div className="empty-title">No activity yet</div>
                <div className="empty-sub">Assign or return assets to see events here.</div>
              </div>
            ) : (
              recentActivity.map((item) => {
                const { bg, el } = activityIcon(item.type);
                return (
                  <div key={item.id} className="activity-item">
                    <div className="activity-icon" style={{ background: bg, color: item.type === "assign" ? "#2563eb" : "#16a34a" }}>{el}</div>
                    <div className="activity-text">
                      <div className="activity-main"><strong>{item.action}</strong> — {item.detail}</div>
                      <div className="activity-meta">{item.date}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body">
              <div className="action-grid">
                <QuickAction label="Add Asset"   icon={<IconPlus />}    color="#2563eb" bg="#eff6ff" link="/assets" />
                <QuickAction label="View Assets" icon={<IconMonitor />} color="#16a34a" bg="#f0fdf4" link="/assets" />
                <QuickAction label="Employees"   icon={<IconUsers />}   color="#7c3aed" bg="#f5f3ff" link="/employees" />
                <QuickAction label="Requests"    icon={<IconBell />}    color="#d97706" bg="#fffbeb" link="/asset-requests" />
              </div>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="card">
            <div className="card-header"><div className="card-title">Inventory Health</div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ProgressBar label="Utilization"  value={utilizationRate}  color="#2563eb" />
              <ProgressBar label="Availability" value={availabilityRate} color="#16a34a" />
              {dashboard.totalAssets > 0 && (
                <div style={{ marginTop: 2, padding: "9px 12px", background: "var(--gray-50)", borderRadius: 8, fontSize: 12, color: "var(--gray-500)", display: "flex", justifyContent: "space-between" }}>
                  <span>Fleet health</span>
                  <span style={{ fontWeight: 700, color: availabilityRate > 40 ? "#16a34a" : availabilityRate > 20 ? "#d97706" : "#dc2626" }}>
                    {availabilityRate > 40 ? "Good ✓" : availabilityRate > 20 ? "Fair" : "Low"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
