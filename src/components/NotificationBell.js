import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import {
  Bell, X, CheckCheck, Trash2, Settings, AlertTriangle, AlertCircle,
  Info, CheckCircle2, Laptop, ShieldAlert, Receipt, UserPlus,
  ClipboardList, ArrowUpRight, Moon, RotateCcw, Wifi, WifiOff,
} from "lucide-react";
import "./NotificationBell.css";

/* ── Category → icon + module route ─────────────────────────────────── */
const CATEGORY_META = {
  Task:     { icon: ClipboardList, route: "/pulse" },
  Asset:    { icon: Laptop,        route: "/assets" },
  Billing:  { icon: Receipt,       route: "/service-billing" },
  Security: { icon: ShieldAlert,   route: "/network-credentials" },
  System:   { icon: Info,          route: null },
  Request:  { icon: UserPlus,      route: "/asset-requests" },
};

const PRIORITY_META = {
  Critical: { label: "Critical", icon: AlertTriangle, className: "hz-p-critical" },
  High:     { label: "High",     icon: AlertCircle,   className: "hz-p-high" },
  Normal:   { label: "Normal",   icon: Info,           className: "hz-p-normal" },
  Low:      { label: "Low",      icon: CheckCircle2,   className: "hz-p-low" },
};

const TYPE_LABEL = {
  UPCOMING_TASK: "Upcoming Task", DUE_TODAY: "Due Today", OVERDUE_TASK: "Overdue Task",
  HIGH_PRIORITY_TASK: "High Priority", TASK_ASSIGNED: "Task Assigned", TASK_COMPLETED: "Task Completed",
  ASSET_RETURN_REMINDER: "Asset Return", WARRANTY_EXPIRY: "Warranty Expiry", LICENSE_EXPIRY: "License Expiry",
  SERVICE_BILLING_DUE: "Billing Due", NETWORK_CREDENTIAL_ROTATION: "Credential Rotation",
  FIRMWARE_UPDATE_REMINDER: "Firmware Update", SECURITY_ALERT: "Security Alert", BACKUP_REMINDER: "Backup Reminder",
};

/* How long the slide-out / fade-out animation runs before we actually
   unmount the drawer — keep in sync with the CSS transition duration. */
const CLOSE_ANIM_MS = 260;

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function timeRemaining(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "overdue" };
  if (days === 0) return { text: "Due today", tone: "today" };
  if (days === 1) return { text: "Due tomorrow", tone: "soon" };
  return { text: `Due in ${days}d`, tone: days <= 3 ? "soon" : "later" };
}

function dayBucket(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOf = (x) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c.getTime(); };
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier";
}

export default function NotificationBell() {
  const ctx = useNotifications();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const bellBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread | task | asset | security | billing
  const [ring, setRing] = useState(false);
  const prevPulseCountRef = useRef(0);

  const {
    pulseNotifications = [], pulseConnected,
    markPulseRead, markAllPulseRead, snoozePulse, completePulse, clearCompletedPulse, completeTask,
    notifications = [],
    systemNotifications = [], markSystemRead, markAllSystemRead,
    totalUnread = 0,
  } = ctx || {};

  // Ring the bell when a brand-new pulse notification streams in.
  useEffect(() => {
    if (pulseNotifications.length > prevPulseCountRef.current && prevPulseCountRef.current !== 0) {
      setRing(true);
      const t = setTimeout(() => setRing(false), 900);
      return () => clearTimeout(t);
    }
    prevPulseCountRef.current = pulseNotifications.length;
  }, [pulseNotifications.length]);

  const openDrawer = () => { setDrawerOpen(true); setIsClosing(false); };

  // Animate out, then unmount — and return focus to the bell for keyboard users.
  const closeDrawer = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      setDrawerOpen(false);
      setIsClosing(false);
      bellBtnRef.current?.focus();
    }, CLOSE_ANIM_MS);
  };

  // Escape closes the drawer; focus the close button when it opens.
  useEffect(() => {
    if (!drawerOpen) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 30);
    const onKey = (e) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // Normalize every source into one shape the drawer can render uniformly.
  const merged = useMemo(() => {
    const fromPulse = pulseNotifications
      .filter((n) => n.status !== "Dismissed")
      .map((n) => ({
        uid: `pulse-${n.notificationId}`,
        source: "pulse",
        raw: n,
        title: n.title,
        description: n.description,
        category: n.category || "System",
        notificationType: n.notificationType,
        priority: n.priority || "Normal",
        relatedModule: n.relatedModule,
        relatedRecordId: n.relatedRecordId,
        dueDate: n.dueDate,
        createdAt: n.createdAt,
        read: n.isRead ?? n.read,
        status: n.status,
      }));

    const fromSystem = systemNotifications.map((n) => ({
      uid: `system-${n.id}`,
      source: "system",
      raw: n,
      title: n.title,
      description: n.message,
      category: "System",
      notificationType: n.type || "SYSTEM",
      priority: n.severity === "critical" ? "Critical" : n.severity === "warning" ? "High" : "Normal",
      relatedModule: null,
      relatedRecordId: null,
      dueDate: null,
      createdAt: n.createdAt,
      read: n.read,
      status: n.read ? "Actioned" : "Pending",
    }));

    const fromRequests = notifications.map((n) => ({
      uid: `request-${n.id}`,
      source: "request",
      raw: n,
      title: "New asset request",
      description: `${n.employeeName || n.employeeId} requested ${n.assetType || "an asset"}`,
      category: "Request",
      notificationType: "ASSET_REQUEST",
      priority: n.urgency === "Critical" ? "Critical" : n.urgency === "Urgent" ? "High" : "Normal",
      relatedModule: "ASSET_REQUEST",
      relatedRecordId: n.id,
      dueDate: null,
      createdAt: n.requestedAt,
      read: n.read,
      status: n.read ? "Actioned" : "Pending",
    }));

    return [...fromPulse, ...fromSystem, ...fromRequests]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [pulseNotifications, systemNotifications, notifications]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread":   return merged.filter((n) => !n.read);
      case "task":     return merged.filter((n) => n.category === "Task");
      case "asset":    return merged.filter((n) => n.category === "Asset");
      case "security": return merged.filter((n) => n.category === "Security");
      case "billing":  return merged.filter((n) => n.category === "Billing");
      default:         return merged;
    }
  }, [merged, filter]);

  const grouped = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    filtered.forEach((n) => groups[dayBucket(n.createdAt)].push(n));
    return groups;
  }, [filtered]);

  const handleMarkRead = (item) => {
    if (item.source === "pulse") markPulseRead?.(item.raw.notificationId);
    else if (item.source === "system") markSystemRead?.(item.raw.id);
    // asset-request read state is local-only (handled by ctx.toggleOpen elsewhere)
  };

  const handleMarkAllRead = () => {
    markAllPulseRead?.();
    markAllSystemRead?.();
  };

  const handleView = (item) => {
    const meta = CATEGORY_META[item.category];
    if (item.category === "Task" && item.relatedRecordId) {
      navigate(`/pulse?task=${item.relatedRecordId}`);
    } else if (meta?.route) {
      navigate(meta.route);
    }
    closeDrawer();
  };

  const handleComplete = (item) => {
    // Completing a task-linked notification does two things: finish the
    // underlying task (stops future day-based reminders for it) AND mark
    // *this* notification as Actioned — otherwise it never becomes
    // eligible for "Clear completed", which only sweeps Actioned items.
    if (item.category === "Task" && item.relatedRecordId) completeTask?.(item.relatedRecordId);
    completePulse?.(item.raw.notificationId);
  };

  const totalCount = totalUnread;
  const badgeText = totalCount > 99 ? "99+" : String(totalCount);

  if (!ctx) return null;

  return (
    <div className="hz-notif-root" ref={rootRef}>
      <button
        ref={bellBtnRef}
        className={`hz-bell-btn ${ring ? "hz-bell-ring" : ""}`}
        onClick={openDrawer}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
      >
        <Bell size={19} strokeWidth={2} />
        {totalCount > 0 && <span className="hz-bell-badge">{badgeText}</span>}
      </button>

      {drawerOpen && createPortal(
        /* Re-declare the design-token scope here: this subtree is a portal
           into document.body, so it's no longer a DOM descendant of the
           .hz-notif-root above — CSS custom properties don't travel with
           React's virtual tree, only the real DOM tree. */
        <div className={`hz-notif-root hz-portal-layer ${isClosing ? "hz-portal-closing" : ""}`}>
          <div className="hz-drawer-overlay" onClick={closeDrawer} />
          <aside
            className="hz-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Notification Center"
          >
            <header className="hz-drawer-header">
              <div className="hz-drawer-heading">
                <div className="hz-drawer-title-row">
                  <h2>Notifications</h2>
                  <span className={`hz-live-dot ${pulseConnected ? "hz-live-on" : "hz-live-off"}`} title={pulseConnected ? "Live" : "Polling"}>
                    {pulseConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                    {pulseConnected ? "Live" : "Polling"}
                  </span>
                </div>
                <p className="hz-drawer-subtitle">
                  {totalCount === 0 ? "You're all caught up" : `${totalCount} unread · ${merged.length} total`}
                </p>
              </div>
              <button ref={closeBtnRef} className="hz-icon-btn" onClick={closeDrawer} aria-label="Close notifications">
                <X size={17} />
              </button>
            </header>

            <div className="hz-drawer-toolbar">
              <div className="hz-filter-pills">
                {[
                  ["all", "All"], ["unread", "Unread"], ["task", "Tasks"],
                  ["asset", "Assets"], ["security", "Security"], ["billing", "Billing"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={`hz-pill ${filter === key ? "hz-pill-active" : ""}`}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="hz-toolbar-actions">
                <button className="hz-text-btn" onClick={handleMarkAllRead} title="Mark all as read">
                  <CheckCheck size={13} /> Mark all read
                </button>
                <button className="hz-text-btn" onClick={clearCompletedPulse} title="Clear completed notifications">
                  <Trash2 size={13} /> Clear completed
                </button>
                <button className="hz-icon-btn hz-icon-btn-sm" onClick={() => { navigate("/settings"); closeDrawer(); }} title="Notification settings">
                  <Settings size={14} />
                </button>
              </div>
            </div>

            <div className="hz-drawer-body">
              {filtered.length === 0 ? (
                <div className="hz-empty-state">
                  <div className="hz-empty-icon"><Bell size={24} /></div>
                  <p>No notifications here.</p>
                  <span>New reminders will appear the moment they're triggered.</span>
                </div>
              ) : (
                ["Today", "Yesterday", "Earlier"].map((bucket) =>
                  grouped[bucket].length === 0 ? null : (
                    <section className="hz-group" key={bucket}>
                      <h3 className="hz-group-label">{bucket}</h3>
                      <div className="hz-card-list">
                        {grouped[bucket].map((item) => (
                          <NotificationCard
                            key={item.uid}
                            item={item}
                            onView={() => handleView(item)}
                            onComplete={() => handleComplete(item)}
                            onSnooze={() => item.source === "pulse" && snoozePulse(item.raw.notificationId, 60)}
                            onMarkRead={() => handleMarkRead(item)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                )
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
}

function NotificationCard({ item, onView, onComplete, onSnooze, onMarkRead }) {
  const catMeta = CATEGORY_META[item.category] || CATEGORY_META.System;
  const CatIcon = catMeta.icon;
  const prio = PRIORITY_META[item.priority] || PRIORITY_META.Normal;
  const PrioIcon = prio.icon;
  const remaining = timeRemaining(item.dueDate);
  const isTask = item.category === "Task";
  const isActionable = item.source === "pulse" && item.status !== "Actioned" && item.status !== "Snoozed";
  const canView = isTask || !!catMeta.route;

  return (
    <article className={`hz-card ${!item.read ? "hz-card-unread" : ""}`}>
      <div className={`hz-card-rail ${prio.className}`} />
      <span className={`hz-cat-icon ${prio.className}`} title={item.category}><CatIcon size={13} /></span>

      <div className="hz-card-main">
        <div className="hz-card-row1">
          <h4 className="hz-card-title">{item.title}</h4>
          <span className="hz-time-ago">{timeAgo(item.createdAt)}</span>
        </div>

        {item.description && <p className="hz-card-desc">{item.description}</p>}

        <div className="hz-card-row3">
          <div className="hz-card-tags">
            <span className={`hz-prio-chip ${prio.className}`} title={prio.label}><PrioIcon size={10} /></span>
            <span className="hz-type-chip">{TYPE_LABEL[item.notificationType] || item.category}</span>
            {remaining && <span className={`hz-tag hz-remaining-${remaining.tone}`}>{remaining.text}</span>}
            {item.status === "Snoozed" && <span className="hz-tag hz-snoozed"><Moon size={10} /> Snoozed</span>}
            {!item.read && <span className="hz-unread-dot" aria-label="Unread" />}
          </div>

          <div className="hz-card-actions">
            {canView && (
              <button className="hz-icon-action" onClick={onView} title={isTask ? "View Task" : "View"}>
                <ArrowUpRight size={13} />
              </button>
            )}
            {isActionable && (
              <button className="hz-icon-action" onClick={onComplete} title="Mark Complete">
                <CheckCircle2 size={13} />
              </button>
            )}
            {isActionable && (
              <button className="hz-icon-action" onClick={onSnooze} title="Snooze 1h">
                <RotateCcw size={13} />
              </button>
            )}
            {!item.read && (
              <button className="hz-icon-action" onClick={onMarkRead} title="Mark as Read">
                <CheckCheck size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
