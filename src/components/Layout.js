import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import AiChatWidget from "./AiChatWidget";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useGet } from "../hooks/useEmployeeApi";
import "./Layout.css";

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function avatarBg(name) {
  const colors = ["#2563eb", "#16a34a", "#7c3aed", "#b45309", "#be185d"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}

/* ── SVG Icons ──────────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const MenuIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Help Popover ─────────────────────────────────────────────── */
function HelpPopover({ onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="help-popover" role="dialog" aria-label="Help">
      <div className="help-popover-title">Need a hand?</div>
      <ul className="help-popover-list">
        <li><strong>Assets:</strong> add, assign, return, or retire devices from the Assets page.</li>
        <li><strong>Requests:</strong> employees raise requests; admins approve from Asset Requests.</li>
        <li><strong>Password reset:</strong> admins can reset via the Employees page.</li>
      </ul>
      <div className="help-popover-footer">
        Still stuck? Reach out to your IT administrator directly.
      </div>
    </div>
  );
}

/* ── Employee Notification ─────────────────────────────────────── */
function EmployeeNotificationButton() {
  const navigate = useNavigate();
  const { data } = useGet("/dashboard");
  const pending  = data?.pendingRequests ?? 0;

  return (
    <button
      className="topbar-btn"
      title={pending > 0 ? `${pending} pending request${pending !== 1 ? "s" : ""}` : "No pending requests"}
      aria-label={pending > 0 ? `${pending} pending requests` : "Notifications"}
      onClick={() => navigate("/emp/request")}
      style={{ position: "relative" }}
    >
      <BellIcon />
      {pending > 0 && <span className="notif-badge-icon">{pending > 9 ? "9+" : pending}</span>}
    </button>
  );
}

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);

/* ── Layout ───────────────────────────────────────────────────── */
export default function Layout({ title, subtitle, children, actions }) {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchText, setSearchText]       = useState("");
  const [helpOpen, setHelpOpen]           = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("sidebarCollapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;
    navigate(`${isAdmin ? "/assets" : "/emp/assets"}?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className={`app-shell ${collapsed ? "app-shell-collapsed" : ""}`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <div className="app-main">
        <header className="topbar">
          {/* Mobile toggle */}
          <button
            className="menu-toggle-btn"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <div className="topbar-title">
            <div className="breadcrumb" aria-label="Breadcrumb">
              <span className="breadcrumb-item">{isAdmin ? "Admin" : "My Workspace"}</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-item breadcrumb-current">{title}</span>
            </div>
            <div className="topbar-page">{title}</div>
            {subtitle && <div className="topbar-sub">{subtitle}</div>}
          </div>

          <div className="topbar-actions">
            {/* Search */}
            <form
              onSubmit={handleSearchSubmit}
              style={{ position: "relative", display: "flex", alignItems: "center" }}
              className="topbar-search"
            >
              <span style={{ position: "absolute", left: 10, color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                className="topbar-search-input"
                placeholder={isAdmin ? "Search assets…" : "Search my assets…"}
                aria-label="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  height: 32, paddingLeft: 32, paddingRight: 10,
                  border: "1.5px solid var(--gray-200)", borderRadius: 8,
                  background: "var(--gray-50)", fontSize: 13,
                  color: "var(--gray-800)", outline: "none",
                  width: 200, transition: "all 0.15s",
                  fontFamily: "var(--font)",
                }}
                onFocus={(e) => { e.target.style.width = "240px"; e.target.style.borderColor = "var(--primary-500)"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.09)"; }}
                onBlur={(e) => { e.target.style.width = "200px"; e.target.style.borderColor = "var(--gray-200)"; e.target.style.background = "var(--gray-50)"; e.target.style.boxShadow = "none"; }}
              />
            </form>

            {/* Notifications */}
            {isAdmin ? <NotificationBell /> : <EmployeeNotificationButton />}

            {/* Help */}
            <div style={{ position: "relative" }}>
              <button
                className="topbar-btn"
                title="Help"
                aria-label="Help"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((v) => !v)}
              >
                <HelpIcon />
              </button>
              {helpOpen && <HelpPopover onClose={() => setHelpOpen(false)} />}
            </div>

            {/* Dark mode toggle (UI only) */}
            <button
              className="topbar-btn"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle dark mode"
              aria-pressed={darkMode}
              onClick={() => setDarkMode((v) => !v)}
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Avatar + role */}
            <button
              type="button"
              className="topbar-user"
              title={`${greeting}, ${user?.name}`}
              aria-label="Open profile"
              onClick={() => navigate(isAdmin ? "/settings" : "/emp/profile")}
            >
              <div className="topbar-avatar" style={{ background: avatarBg(user?.name) }}>
                {initials(user?.name)}
              </div>
              <div className="topbar-user-info">
                <div className="topbar-user-name">{user?.name || "User"}</div>
                <div className="topbar-user-role">{isAdmin ? "Administrator" : "Employee"}</div>
              </div>
            </button>
          </div>
        </header>

        <main id="main-content" className="page-content fade-in">
          {actions && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}
