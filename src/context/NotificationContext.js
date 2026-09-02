import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { API_BASE as API } from "../config";
const NotificationContext = createContext(null);
const POLL_MS = 15_000; // poll every 15 s
const SEEN_KEY = "iam_seen_requests"; // localStorage key for read IDs
const TOKEN_KEY = "iam_token";

function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []); }
  catch { return new Set(); }
}
function saveSeen(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [notifications, setNotifications] = useState([]); // all requests as notifications
  const [unread, setUnread]               = useState(0);
  const [systemNotifications, setSystemNotifications] = useState([]); // legacy warranty/maintenance alerts
  const [systemUnread, setSystemUnread]   = useState(0);

  // ── Enterprise Notification Center (Haoda Pulse) ────────────────────────
  const [pulseNotifications, setPulseNotifications] = useState([]);
  const [pulseUnread, setPulseUnread] = useState(0);
  const [pulseConnected, setPulseConnected] = useState(false);

  const [open, setOpen]                   = useState(false);
  const seenRef                           = useRef(loadSeen());
  const timerRef                          = useRef(null);
  const pulseTimerRef                     = useRef(null);
  const eventSourceRef                    = useRef(null);

  const buildNotifications = useCallback((requests) => {
    return requests
      .filter((r) => r.status === "PENDING")         // only pending ones are "notifications"
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        employeeId:   r.employeeId,
        employeeName: r.employeeName,
        assetType:    r.assetType,
        urgency:      r.urgency,
        requestedAt:  r.requestedAt,
        read: seenRef.current.has(String(r.id)),
      }));
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get(`${API}/api/admin/requests`);
      const notifs = buildNotifications(data);
      setNotifications(notifs);
      setUnread(notifs.filter((n) => !n.read).length);
    } catch {
      // silent — toast errors only on explicit user actions
    }
  }, [isAdmin, buildNotifications]);

  // Legacy system notifications: warranty expiring, maintenance due, etc.
  const fetchSystemNotifications = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get(`${API}/api/admin/notifications`);
      setSystemNotifications(data);
      setSystemUnread(data.filter((n) => !n.read).length);
    } catch {
      // silent — the bell simply shows only asset-request notifications if this fails
    }
  }, [isAdmin]);

  const markSystemRead = useCallback(async (id) => {
    try {
      await axios.put(`${API}/api/admin/notifications/${id}/read`);
      setSystemNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setSystemUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllSystemRead = useCallback(async () => {
    try {
      await axios.put(`${API}/api/admin/notifications/mark-all-read`);
      setSystemNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      setSystemUnread(0);
    } catch { /* ignore */ }
  }, []);

  // ── Pulse (new Enterprise Notification Center) ──────────────────────────

  const fetchPulseNotifications = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get(`${API}/api/admin/pulse/notifications`);
      setPulseNotifications(data);
      setPulseUnread(data.filter((n) => !n.read && n.status !== "Dismissed").length);
    } catch {
      // silent
    }
  }, [isAdmin]);

  const markPulseRead = useCallback(async (id) => {
    try {
      await axios.put(`${API}/api/admin/pulse/notifications/${id}/read`);
      setPulseNotifications((ns) => ns.map((n) => (n.notificationId === id ? { ...n, read: true } : n)));
      setPulseUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllPulseRead = useCallback(async () => {
    try {
      await axios.put(`${API}/api/admin/pulse/notifications/mark-all-read`);
      setPulseNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      setPulseUnread(0);
    } catch { /* ignore */ }
  }, []);

  const snoozePulse = useCallback(async (id, minutes = 60) => {
    try {
      const { data } = await axios.put(`${API}/api/admin/pulse/notifications/${id}/snooze`, { minutes });
      setPulseNotifications((ns) => ns.map((n) => (n.notificationId === id ? data : n)));
      setPulseUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  }, []);

  const completePulse = useCallback(async (id) => {
    try {
      const { data } = await axios.put(`${API}/api/admin/pulse/notifications/${id}/complete`);
      setPulseNotifications((ns) => ns.map((n) => (n.notificationId === id ? data : n)));
      setPulseUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  }, []);

  const clearCompletedPulse = useCallback(async () => {
    try {
      await axios.delete(`${API}/api/admin/pulse/notifications/clear-completed`);
      setPulseNotifications((ns) => ns.filter((n) => n.status !== "Actioned"));
    } catch { /* ignore */ }
  }, []);

  const completeTask = useCallback(async (taskId) => {
    try {
      await axios.put(`${API}/api/admin/pulse/tasks/${taskId}/complete`);
      fetchPulseNotifications();
    } catch { /* ignore */ }
  }, [fetchPulseNotifications]);

  const snoozeTask = useCallback(async () => { /* placeholder — tasks don't snooze directly, their notifications do */ }, []);

  // Real-time stream, falls back to polling automatically if it can't connect.
  useEffect(() => {
    if (!isAdmin) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token || typeof window === "undefined" || typeof window.EventSource === "undefined") return;

    try {
      const es = new window.EventSource(`${API}/api/admin/pulse/notifications/stream?token=${encodeURIComponent(token)}`);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => setPulseConnected(true));
      es.addEventListener("notification", (evt) => {
        try {
          const notif = JSON.parse(evt.data);
          setPulseNotifications((ns) => [notif, ...ns.filter((n) => n.notificationId !== notif.notificationId)]);
          setPulseUnread((u) => u + 1);
        } catch { /* ignore malformed payload */ }
      });
      es.onerror = () => { setPulseConnected(false); };

      return () => { es.close(); eventSourceRef.current = null; };
    } catch {
      setPulseConnected(false);
    }
  }, [isAdmin]);

  // Start polling when admin is logged in
  useEffect(() => {
    if (!isAdmin) {
      setNotifications([]); setUnread(0);
      setSystemNotifications([]); setSystemUnread(0);
      setPulseNotifications([]); setPulseUnread(0);
      return;
    }
    fetchRequests();
    fetchSystemNotifications();
    fetchPulseNotifications();
    timerRef.current = setInterval(() => { fetchRequests(); fetchSystemNotifications(); }, POLL_MS);
    // Pulse notifications poll too (in addition to SSE) as a resilience net.
    pulseTimerRef.current = setInterval(() => { fetchPulseNotifications(); }, POLL_MS);
    return () => { clearInterval(timerRef.current); clearInterval(pulseTimerRef.current); };
  }, [isAdmin, fetchRequests, fetchSystemNotifications, fetchPulseNotifications]);

  // Open / close the dropdown; mark all as read on open
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        // opening — mark everything currently in list as read
        setNotifications((ns) => ns.map((n) => { seenRef.current.add(String(n.id)); return { ...n, read: true }; }));
        saveSeen(seenRef.current);
        setUnread(0);
      }
      return !prev;
    });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Called when the admin visits the Asset Requests page directly (not just
  // via the bell), so the sidebar/bell badge clears the moment they've
  // actually seen the requests — not only when they open the dropdown.
  const markRequestsSeen = useCallback(() => {
    setNotifications((ns) => {
      if (ns.length === 0) return ns;
      ns.forEach((n) => seenRef.current.add(String(n.id)));
      saveSeen(seenRef.current);
      return ns.map((n) => ({ ...n, read: true }));
    });
    setUnread(0);
  }, []);

  // Called after approve/reject so list stays fresh
  const refresh = useCallback(() => fetchRequests(), [fetchRequests]);

  return (
    <NotificationContext.Provider value={{
      notifications, unread, open, toggleOpen, close, refresh, markRequestsSeen,
      systemNotifications, systemUnread, markSystemRead, markAllSystemRead,
      pulseNotifications, pulseUnread, pulseConnected,
      fetchPulseNotifications, markPulseRead, markAllPulseRead,
      snoozePulse, completePulse, clearCompletedPulse, completeTask, snoozeTask,
      totalUnread: unread + systemUnread + pulseUnread,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
