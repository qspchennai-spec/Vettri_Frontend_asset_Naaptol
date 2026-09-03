import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { CLIENT_FEATURES } from "../config";
import UnavailableFeature from "./UnavailableFeature";
import "./Sidebar.css";

import { API_BASE as API, COMPANY_NAME, COMPANY_DISPLAY, COMPANY_SUBTITLE } from "../config";

/* ── SVG Icon Set ─────────────────────────────────────────────── */
const Ico = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  assets:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></svg>,
  employees: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  requests:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  reports:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  emailLogs: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>,
  sendAssetEmail: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>,
  settings:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  activity:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  serviceBilling: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  maintenance: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  attendance: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>,
  pulse: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  aiSearch: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>,
  fileCenter: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  myFiles: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  profile:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  request:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  password:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  logout:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

// Each entry's `permission` matches a code from DataSeeder.PERMISSION_DEFS
// on the backend. Sidebar.js filters this list by the signed-in admin's
// resolved permission set (see useAuth().hasPermission) so an admin only
// ever sees the modules their assigned Role actually grants — a System
// Admin (all permissions) sees every row below; an HR Admin, for example,
// would only see Dashboard/AI Search/Employees/Reports/Activity Log.
const ADMIN_NAV = [
  { to: "/dashboard",      label: "Dashboard",      icon: "dashboard",  section: "MAIN", permission: "DASHBOARD_VIEW" },
  { to: "/ai-search",      label: "AI Search",      icon: "aiSearch",   section: "MAIN", permission: "AI_SEARCH_USE" },
  { to: "/assets",         label: "Assets",         icon: "assets",     section: "MAIN", permission: "ASSETS_VIEW" },
  { to: "/employees",      label: "Employees",      icon: "employees",  section: "MAIN", permission: "EMPLOYEES_VIEW" },
  { to: "/asset-requests", label: "Asset Requests", icon: "requests",   section: "MAIN", permission: "ASSET_REQUESTS_VIEW" },
  { to: "/network-credentials", label: "Network Credentials", icon: "networkCredentials", section: "MAIN", permission: "NETWORK_CREDENTIALS_VIEW" },
  { to: "/service-billing", label: "Service Billing", icon: "serviceBilling", section: "MAIN", permission: "SERVICE_BILLING_VIEW" },
  { to: "/maintenance",    label: "Maintenance",    icon: "maintenance", section: "MAIN", permission: "MAINTENANCE_VIEW" },
  { to: "/pulse",          label: `${COMPANY_NAME} Pulse`,    icon: "pulse",      section: "MAIN", permission: "PULSE_VIEW" },
  { to: "/filecenter",     label: "File Center",    icon: "fileCenter", section: "MAIN", permission: "FILE_CENTER_VIEW" },
  { to: "/reports",        label: "Reports",        icon: "reports",    section: "ANALYTICS", permission: "REPORTS_VIEW" },
  { to: "/email-logs",     label: "Email Logs",     icon: "emailLogs",  section: "ANALYTICS", permission: "EMAIL_LOGS_VIEW" },
  { to: "/send-asset-email", label: "Send Asset Email", icon: "sendAssetEmail", section: "ENTERPRISE", permission: "SEND_ASSET_EMAIL" },
  { to: "/asset-email-logs", label: "Asset Email Logs", icon: "emailLogs",      section: "ENTERPRISE", permission: "ASSET_EMAIL_LOGS_VIEW" },
  { to: "/settings",       label: "Settings",       icon: "settings",   section: "SYSTEM", permission: "SETTINGS_MANAGE" },
  { to: "/activity-log",   label: "Activity Log",   icon: "activity",   section: "SYSTEM", permission: "ACTIVITY_LOG_VIEW" },
];

const EMP_NAV = [
  { to: "/emp/dashboard", label: "My Dashboard",    icon: "dashboard", section: "MAIN"    },
  { to: "/emp/ai-search", label: "AI Search",       icon: "aiSearch",  section: "MAIN"    },
  { to: "/emp/assets",    label: "My Assets",       icon: "assets",    section: "MAIN"    },
  { to: "/emp/files",     label: "My Files",        icon: "myFiles",   section: "MAIN"    },
  { to: "/emp/profile",   label: "My Profile",      icon: "profile",   section: "MAIN"    },
  { to: "/emp/request",   label: "Asset Request",   icon: "request",   section: "MAIN"    },
  { to: "/emp/password",  label: "Change Password", icon: "password",  section: "ACCOUNT" },
];

function avatarColor(name) {
  const c = [
    "linear-gradient(135deg,#2563eb,#60a5fa)",
    "linear-gradient(135deg,#16a34a,#4ade80)",
    "linear-gradient(135deg,#7c3aed,#a78bfa)",
    "linear-gradient(135deg,#d97706,#fbbf24)",
    "linear-gradient(135deg,#be185d,#f472b6)",
  ];
  return c[(name || "A").charCodeAt(0) % c.length];
}

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Sidebar({ open = false, onClose, collapsed = false, onToggleCollapse }) {
  const { user, logout, hasPermission } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const notifCtx  = useNotifications();
  const requestsUnread = notifCtx?.unread ?? 0; // asset-request notifications only, not the combined bell total

  const [myFilesUnread, setMyFilesUnread] = useState(0);
  const [unavailableFeature, setUnavailableFeature] = useState(null);
  useEffect(() => {
    if (user?.role === "admin") return;
    let cancelled = false;
    const load = () => {
      axios.get(`${API}/api/employee/filecenter/unread-count`)
        .then((r) => { if (!cancelled) setMyFilesUnread(r.data?.unread || 0); })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.role]);

  // Only the modules this specific admin's assigned Role grants — see the
  // `permission` field on each ADMIN_NAV entry above and useAuth().hasPermission.
  // Employee nav is unchanged (self-service surface, not yet permission-gated).
  const nav = user?.role === "admin"
    ? ADMIN_NAV.filter((item) => hasPermission(item.permission))
    : EMP_NAV;

  const handleLogout  = () => { logout(); navigate("/"); };
  const restrictedFeatures = {
    "/service-billing": { name: "Service Billing", enabled: CLIENT_FEATURES.serviceBilling },
    "/filecenter": { name: "File Center", enabled: CLIENT_FEATURES.fileCenter },
    "/pulse": { name: `${COMPANY_NAME} Pulse`, enabled: CLIENT_FEATURES.pulse },
  };

  const handleNavClick = (event, item) => {
    const feature = restrictedFeatures[item.to];
    if (feature && !feature.enabled) {
      event.preventDefault();
      setUnavailableFeature(feature.name);
      return;
    }
    if (onClose) onClose();
  };

  const sections = [...new Set(nav.map((n) => n.section))];

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`} aria-label="Main navigation">
        <div className="sidebar-logo">
    <div className="sidebar-logo-icon"
    style={{
      background: "#ffffff",
      padding: 5,
      overflow: "hidden",
    }}
  >
    <img
      src="/vettri-pay-logo.png"
      alt={COMPANY_NAME}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  </div>

  {!collapsed && (
      <div className="sidebar-logo-text">
      <div className="sidebar-logo-name">{COMPANY_DISPLAY}</div>
      <div className="sidebar-logo-sub">{COMPANY_SUBTITLE}</div>
    </div>
  )}

  {onToggleCollapse && (
    <button
      type="button"
      className="sidebar-collapse-btn"
      onClick={onToggleCollapse}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )}
</div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <React.Fragment key={section}>
              {!collapsed && <div className="sidebar-section-label">{section}</div>}
              {collapsed && <div className="sidebar-section-divider" aria-hidden="true" />}
              {nav.filter((n) => n.section === section).map((item) => {
                const active =
                  location.pathname === item.to ||
                  (item.to !== "/dashboard" && item.to !== "/emp/dashboard" &&
                   location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar-item ${active ? "active" : ""}`}
                    onClick={(event) => handleNavClick(event, item)}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    data-tooltip={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar-item-icon" aria-hidden="true">
                      {item.icon === "networkCredentials"
                        ? <ShieldCheck size={16} strokeWidth={1.9} />
                        : Ico[item.icon]}
                    </span>
                    {!collapsed && item.label}
                    {restrictedFeatures[item.to] && !restrictedFeatures[item.to].enabled && (
                      <LockKeyhole size={13} className="sidebar-item-lock" aria-label="Feature unavailable" />
                    )}
                    {item.to === "/asset-requests" && requestsUnread > 0 && (
                      <span className="sidebar-item-badge">{collapsed ? "" : (requestsUnread > 9 ? "9+" : requestsUnread)}</span>
                    )}
                    {item.to === "/emp/files" && myFilesUnread > 0 && (
                      <span className="sidebar-item-badge">{collapsed ? "" : (myFilesUnread > 9 ? "9+" : myFilesUnread)}</span>
                    )}
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" aria-label={collapsed ? (user?.name || "User") : undefined} data-tooltip={collapsed ? (user?.name || "User") : undefined}>
            <div className="sidebar-avatar" style={{ background: avatarColor(user?.name) }}>
              {initials(user?.name)}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name || "User"}</div>
                <div className="sidebar-user-role">{user?.role === "admin" ? (user?.roleLabel || "Administrator") : user?.id || "Employee"}</div>
              </div>
            )}
          </div>
          <button className="sidebar-logout" onClick={handleLogout} aria-label={collapsed ? "Sign Out" : undefined} data-tooltip={collapsed ? "Sign Out" : undefined}>
            <span aria-hidden="true">{Ico.logout}</span> {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      <div className={`sidebar-scrim ${open ? "visible" : ""}`} onClick={onClose} aria-hidden="true" />
      {unavailableFeature && (
        <UnavailableFeature featureName={unavailableFeature} onClose={() => setUnavailableFeature(null)} />
      )}
    </>
  );
}
