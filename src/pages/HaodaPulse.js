import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { COMPANY_NAME } from "../config";
import { useToast } from "../utils/Toast";
import {
  Plus, X, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  Info, ClipboardList, RefreshCw,
} from "lucide-react";
import "./HaodaPulse.css";

import { API_BASE as API } from "../config";

const CATEGORIES = ["General", "Asset", "Employee", "NetworkCredential", "ServiceBilling", "Maintenance", "Security", "Backup"];
const PRIORITIES = ["Low", "Normal", "High", "Critical"];
const STATUSES = ["Pending", "InProgress", "Completed", "Cancelled"];

const PRIORITY_META = {
  Critical: { color: "#dc2626", bg: "#fef2f2", icon: AlertTriangle },
  High:     { color: "#ea580c", bg: "#fff7ed", icon: AlertCircle },
  Normal:   { color: "#2563eb", bg: "#eff6ff", icon: Info },
  Low:      { color: "#16a34a", bg: "#f0fdf4", icon: CheckCircle2 },
};
const STATUS_META = {
  Pending:     { color: "#475569", bg: "#f1f5f9" },
  InProgress:  { color: "#1d4ed8", bg: "#dbeafe" },
  Completed:   { color: "#166534", bg: "#dcfce7" },
  Cancelled:   { color: "#6b7280", bg: "#f3f4f6" },
};

const EMPTY_FORM = {
  title: "", description: "", category: "General", priority: "Normal",
  assigneeId: "", assigneeName: "", assigneeEmail: "", dueDate: "",
  relatedModule: "", relatedRecordId: "",
};

function daysLabel(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, tone: "overdue" };
  if (days === 0) return { text: "Due today", tone: "today" };
  if (days === 1) return { text: "Due tomorrow", tone: "soon" };
  return { text: `Due in ${days}d`, tone: days <= 3 ? "soon" : "later" };
}

export default function HaodaPulse() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Active");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/api/admin/pulse/tasks`),
      axios.get(`${API}/api/admin/employees`),
    ])
      .then(([tRes, eRes]) => { setTasks(tRes.data); setEmployees(eRes.data); })
      .catch(() => toast(`Couldn't load ${COMPANY_NAME} Pulse tasks.`, "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deep-link from a notification: /pulse?task=42 opens that task for editing.
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId && tasks.length > 0) {
      const t = tasks.find((x) => String(x.id) === String(taskId));
      if (t) openEdit(t);
      searchParams.delete("task");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (statusFilter === "Active") list = list.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
    else if (statusFilter !== "All") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "All") list = list.filter((t) => t.priority === priorityFilter);
    return list;
  }, [tasks, statusFilter, priorityFilter]);

  const counts = useMemo(() => ({
    total: tasks.length,
    overdue: tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate && new Date(t.dueDate) < new Date().setHours(0, 0, 0, 0)).length,
    dueToday: tasks.filter((t) => t.dueDate === new Date().toISOString().slice(0, 10) && t.status !== "Completed").length,
    completed: tasks.filter((t) => t.status === "Completed").length,
  }), [tasks]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (t) => {
    setForm({
      title: t.title || "", description: t.description || "", category: t.category || "General",
      priority: t.priority || "Normal", assigneeId: t.assigneeId || "", assigneeName: t.assigneeName || "",
      assigneeEmail: t.assigneeEmail || "", dueDate: t.dueDate || "",
      relatedModule: t.relatedModule || "", relatedRecordId: t.relatedRecordId || "",
    });
    setEditingId(t.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleAssigneeChange = (employeeId) => {
    const emp = employees.find((e) => e.employeeId === employeeId);
    setForm((f) => ({
      ...f, assigneeId: employeeId,
      assigneeName: emp ? emp.employeeName : "",
      assigneeEmail: emp ? emp.email : "",
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast("Title is required.", "error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || null };
      if (editingId) {
        await axios.put(`${API}/api/admin/pulse/tasks/${editingId}`, payload);
        toast("Task updated.", "success");
      } else {
        await axios.post(`${API}/api/admin/pulse/tasks`, payload);
        toast("Task created — notifications sent.", "success");
      }
      closeForm();
      load();
    } catch (err) {
      toast(err?.response?.data?.message || "Couldn't save the task.", "error");
    } finally {
      setSaving(false);
    }
  };

  const complete = async (id) => {
    try {
      await axios.put(`${API}/api/admin/pulse/tasks/${id}/complete`);
      toast("Task marked complete.", "success");
      load();
    } catch { toast("Couldn't complete the task.", "error"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/api/admin/pulse/tasks/${id}`);
      toast("Task deleted.", "success");
      load();
    } catch { toast("Couldn't delete the task.", "error"); }
  };

  const runScan = async () => {
    try {
      await axios.post(`${API}/api/admin/pulse/notifications/run-scan`);
      toast("Reminder scan complete.", "success");
    } catch { toast("Scan failed.", "error"); }
  };

  return (
    <Layout>
      <div className="pulse-header">
        <div>
          <h1 className="pulse-title"><ClipboardList size={22} /> {COMPANY_NAME} Pulse</h1>
          <p className="pulse-subtitle">Task tracking that powers the Enterprise Notification Center.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={runScan}><RefreshCw size={15} /> Run Reminder Scan</button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Task</button>
        </div>
      </div>

      <div className="pulse-kpis">
        <div className="pulse-kpi"><span className="pulse-kpi-value">{counts.total}</span><span className="pulse-kpi-label">Total Tasks</span></div>
        <div className="pulse-kpi pulse-kpi-danger"><span className="pulse-kpi-value">{counts.overdue}</span><span className="pulse-kpi-label">Overdue</span></div>
        <div className="pulse-kpi pulse-kpi-warn"><span className="pulse-kpi-value">{counts.dueToday}</span><span className="pulse-kpi-label">Due Today</span></div>
        <div className="pulse-kpi pulse-kpi-success"><span className="pulse-kpi-value">{counts.completed}</span><span className="pulse-kpi-label">Completed</span></div>
      </div>

      <div className="pulse-filters">
        <div className="pulse-filter-group">
          {["Active", "All", ...STATUSES].filter((v, i, a) => a.indexOf(v) === i).map((s) => (
            <button key={s} className={`pulse-chip ${statusFilter === s ? "pulse-chip-active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
          ))}
        </div>
        <select className="pulse-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="All">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="pulse-list">
        {loading ? (
          <div className="pulse-empty">Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div className="pulse-empty">
            <ClipboardList size={26} />
            <p>No tasks match this view.</p>
          </div>
        ) : (
          filtered.map((t) => {
            const prio = PRIORITY_META[t.priority] || PRIORITY_META.Normal;
            const PrioIcon = prio.icon;
            const st = STATUS_META[t.status] || STATUS_META.Pending;
            const due = daysLabel(t.dueDate);
            return (
              <div key={t.id} className="pulse-row">
                <div className="pulse-row-rail" style={{ background: prio.color }} />
                <div className="pulse-row-main">
                  <div className="pulse-row-top">
                    <span className="pulse-prio-icon" style={{ background: prio.bg, color: prio.color }}><PrioIcon size={14} /></span>
                    <div className="pulse-row-title-block">
                      <div className="pulse-row-title">{t.title}</div>
                      {t.description && <div className="pulse-row-desc">{t.description}</div>}
                    </div>
                    <span className="pulse-status-chip" style={{ background: st.bg, color: st.color }}>{t.status}</span>
                  </div>
                  <div className="pulse-row-tags">
                    <span className="pulse-tag">{t.category}</span>
                    {t.assigneeName && <span className="pulse-tag">Assigned: {t.assigneeName}</span>}
                    {t.dueDate && <span className="pulse-tag"><Clock size={11} /> {t.dueDate}</span>}
                    {due && <span className={`pulse-tag pulse-due-${due.tone}`}>{due.text}</span>}
                  </div>
                  <div className="pulse-row-actions">
                    {t.status !== "Completed" && t.status !== "Cancelled" && (
                      <button className="pulse-action-btn" onClick={() => complete(t.id)}><CheckCircle2 size={13} /> Mark Complete</button>
                    )}
                    <button className="pulse-action-btn" onClick={() => openEdit(t)}><Pencil size={13} /> Edit</button>
                    <button className="pulse-action-btn pulse-action-danger" onClick={() => remove(t.id)}><Trash2 size={13} /> Delete</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="pulse-modal-overlay" onClick={closeForm}>
          <div className="pulse-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pulse-modal-header">
              <h3>{editingId ? "Edit Task" : "New Task"}</h3>
              <button className="pulse-modal-close" onClick={closeForm}><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="pulse-form">
              <label>Title *
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Renew server SSL certificate" required />
              </label>
              <label>Description
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details…" />
              </label>
              <div className="pulse-form-row">
                <label>Category
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>Priority
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              <div className="pulse-form-row">
                <label>Due Date
                  <input type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </label>
                <label>Assignee
                  <select value={form.assigneeId} onChange={(e) => handleAssigneeChange(e.target.value)}>
                    <option value="">Unassigned</option>
                    {employees.map((emp) => <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName}</option>)}
                  </select>
                </label>
              </div>
              <div className="pulse-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Create Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
