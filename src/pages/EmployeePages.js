import React, { useState, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { COMPANY_DISPLAY } from "../config";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../utils/Toast";
import StatusPill from "../components/StatusPill";
import { useGet, postRequest } from "../hooks/useEmployeeApi";

// ─────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────
function avatarBg(name) {
  const c = ["#1a56db","#059669","#7c3aed","#b45309","#be185d","#0284c7"];
  return c[(name || "A").charCodeAt(0) % c.length];
}
function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function Spinner() {
  return (
    <div className="empty-state" style={{ padding: "56px 0" }}>
      <div className="loading-spinner" style={{ margin: "0 auto 14px" }} />
      <div className="empty-title">Loading…</div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="card" style={{
      marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2",
      padding: "12px 18px", fontSize: 13, color: "#991b1b"
    }}>
      ⚠️ {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// My Profile Page
// ─────────────────────────────────────────────────────────────────
export function EmployeeProfile() {
  const { data: profile, loading, error } = useGet("/profile");

  return (
    <Layout title="My Profile" subtitle="Your account information from the system">
      <ErrorBanner message={error} />

      {loading ? <Spinner /> : !profile ? null : (
        <div style={{ maxWidth: 720 }}>
          {/* Profile Header Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body profile-card-body" style={{ display: "flex", alignItems: "center", gap: 24, padding: "28px 28px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18, flexShrink: 0,
                background: avatarBg(profile.employeeName),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#fff",
                boxShadow: "0 8px 24px rgba(26,86,219,0.18)",
              }}>
                {initials(profile.employeeName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--gray-900)", marginBottom: 4 }}>
                  {profile.employeeName}
                </div>
                <div style={{ fontSize: 14, color: "var(--gray-500)", marginBottom: 10 }}>
                  {profile.designation || "—"} · {profile.department || "—"}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="tag tag-blue">{profile.employeeId}</span>
                  {profile.location && <span className="tag tag-green">{profile.location}</span>}
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 999,
                    background: "#ecfdf5", color: "#059669",
                    fontSize: 11.5, fontWeight: 700,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Profile Details</div>
            </div>
            <div className="card-body">
              <div className="grid-2" style={{ gap: 20 }}>
                {[
                  { label: "Employee ID",  value: profile.employeeId  },
                  { label: "Full Name",    value: profile.employeeName },
                  { label: "Email",        value: profile.email        },
                  { label: "Department",   value: profile.department   },
                  { label: "Designation",  value: profile.designation  },
                  { label: "Location",     value: profile.location     },
                  { label: "System Role",  value: profile.role         },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "14px 0", borderBottom: "1px solid var(--gray-100)" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gray-400)", marginBottom: 5 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--gray-800)" }}>
                      {value || <span style={{ color: "var(--gray-300)", fontWeight: 400 }}>Not set</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────
// My Assets Page
// ─────────────────────────────────────────────────────────────────
export function EmployeeAssets() {
 const { data: assets, loading, error } = useGet("/assets");
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => {
    const src = assets || [];
    return src
      .filter((a) =>
        (a.laptopName || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.assetType  || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.serialNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.brand || "").toLowerCase().includes(search.toLowerCase())
      )
      .filter((a) => statusFilter === "All" || a.assetStatus === statusFilter);
  }, [assets, search, statusFilter]);

  return (
    <Layout title="My Assets" subtitle="All devices currently assigned to you">
      <ErrorBanner message={error} />

      {/* Stat Row */}
      {!loading && (assets || []).length > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total",     value: assets.length,     color: "#1a56db", bg: "#eff6ff" },
            { label: "Assigned",  value: assets.filter((a) => a.assetStatus === "Assigned").length,  color: "#d97706", bg: "#fffbeb" },
            { label: "Available", value: assets.filter((a) => a.assetStatus === "Available").length, color: "#059669", bg: "#ecfdf5" },
          ].map((s) => (
            <div key={s.label} className="card" style={{
              flex: 1, minWidth: 140, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 14, borderLeft: `3px solid ${s.color}`
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Assigned Assets</div>
            <div className="card-subtitle">
              {loading ? "Loading…" : `${filtered.length} of ${(assets||[]).length} assets`}
            </div>
          </div>
          {!loading && (assets||[]).length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <select
                className="input"
                style={{ width: 140 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Assigned">Assigned</option>
                <option value="Available">Available</option>
                <option value="Maintenance">Maintenance</option>
              </select>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }}>🔍</span>
                <input
                  className="input"
                  style={{ paddingLeft: 32, width: 210 }}
                  placeholder="Search assets…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : (assets || []).length === 0 ? (
          <div className="empty-state" style={{ padding: "56px 20px" }}>
            <div style={{ fontSize: 46 }}>📭</div>
            <div className="empty-title">No assets assigned to you</div>
            <div className="empty-sub">
              When IT assigns you a device, it will appear here.
              <br />You can also raise a request if you need equipment.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div style={{ fontSize: 32 }}>🔍</div>
            <div className="empty-title">No assets match your filter</div>
            <div className="empty-sub">Try changing the search or status filter.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Asset Name</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Serial No.</th>
                  <th>Assigned On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.assetId}>
                    <td className="mono muted" style={{ fontSize: 12 }}>{i + 1}</td>
                    <td><span className="tag tag-blue">{a.assetType}</span></td>
                    <td style={{ fontWeight: 600, color: "var(--gray-800)" }}>{a.laptopName}</td>
                    <td>{a.brand}</td>
                    <td style={{ color: "var(--gray-500)" }}>{a.model || "—"}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{a.serialNumber}</td>
                    <td style={{ color: "var(--gray-500)" }}>{a.assignedDate || "—"}</td>
                    <td><StatusPill status={a.assetStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────
// Asset Request Page
// ─────────────────────────────────────────────────────────────────
const ASSET_TYPES = ["Laptop", "Monitor", "Mouse", "Keyboard", "Headset", "Mobile", "Tablet", "Other"];
const PRIORITIES  = ["Normal", "Urgent", "Critical"];

const PRIORITY_COLORS = {
  Normal:   { bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd" },
  Urgent:   { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  Critical: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

const STATUS_COLORS = {
  PENDING:  { bg: "#fffbeb", color: "#d97706" },
  APPROVED: { bg: "#ecfdf5", color: "#059669" },
  REJECTED: { bg: "#fef2f2", color: "#dc2626" },
};

function RequestHistoryTable({ data, loading }) {
  if (loading) return <Spinner />;
  if (!data || data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "32px 0" }}>
        <div style={{ fontSize: 32 }}>📭</div>
        <div className="empty-title">No requests yet</div>
        <div className="empty-sub">Submit your first request above.</div>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Asset Type</th>
            <th>Priority</th>
            <th>Reason</th>
            <th>Submitted On</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.PENDING;
            const pc = PRIORITY_COLORS[r.urgency] || PRIORITY_COLORS.Normal;
            return (
              <tr key={r.id}>
                <td className="mono muted" style={{ fontSize: 12 }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{r.assetType}</td>
                <td>
                  <span style={{
                    padding: "3px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
                  }}>
                    {r.urgency}
                  </span>
                </td>
                <td style={{ maxWidth: 200, color: "var(--gray-600)" }}>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {r.reason}
                  </span>
                </td>
                <td style={{ color: "var(--gray-500)", fontSize: 12.5 }}>
                  {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </td>
                <td>
                  <span style={{
                    padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    background: sc.bg, color: sc.color,
                  }}>
                    ● {r.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeRequest() {
  const toast    = useToast();
  const { data: history, loading: hLoading, reload } = useGet("/requests");

  const [assetType, setAssetType] = useState("");
  const [priority,  setPriority]  = useState("Normal");
  const [reason,    setReason]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const handleSubmit = async () => {
    if (!assetType) { toast("Please select an asset type.", "error"); return; }
    if (!reason.trim()) { toast("Please provide a reason for your request.", "error"); return; }

    setSubmitting(true);
    try {
      await postRequest({ assetType, urgency: priority, reason: reason.trim() });
      toast("Asset request submitted successfully!", "success");
      setSubmitted(true);
      setAssetType("");
      setPriority("Normal");
      setReason("");
      reload();
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't submit request. Is the API running?", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const pc = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Normal;

  return (
    <Layout title="Asset Request" subtitle="Request new equipment from your IT team">
      <div className="grid-2" style={{ alignItems: "start", gap: 24 }}>
        {/* ── Request Form ── */}
        <div>
          {submitted && (
            <div className="card" style={{ marginBottom: 20, background: "#ecfdf5", borderColor: "#a7f3d0" }}>
              <div className="card-body" style={{ textAlign: "center", padding: "28px" }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>
                  Request Submitted!
                </div>
                <div style={{ color: "#059669", fontSize: 13.5, marginBottom: 16 }}>
                  Your IT team will review and respond within 24 hours.
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => setSubmitted(false)}
                >
                  ➕ Submit Another Request
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">New Asset Request</div>
                <div className="card-subtitle">All fields are required</div>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Asset Type */}
              <div className="field">
                <label className="field-label">Asset Type *</label>
                <div className="selector-grid">
                  {ASSET_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAssetType(t)}
                      style={{
                        padding: "9px 6px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                        border: assetType === t ? "2px solid #1a56db" : "1.5px solid var(--gray-200)",
                        background: assetType === t ? "#eff6ff" : "#fff",
                        color: assetType === t ? "#1a56db" : "var(--gray-600)",
                        cursor: "pointer", transition: "all 0.13s",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="field">
                <label className="field-label">Priority</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {PRIORITIES.map((p) => {
                    const c2 = PRIORITY_COLORS[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        style={{
                          flex: 1, padding: "9px 10px", borderRadius: 9, fontSize: 12.5, fontWeight: 700,
                          border: priority === p ? `2px solid ${c2.color}` : `1.5px solid ${c2.border}`,
                          background: priority === p ? c2.bg : "#fff",
                          color: c2.color, cursor: "pointer", transition: "all 0.13s",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                {priority && (
                  <div style={{
                    marginTop: 8, padding: "7px 12px", borderRadius: 8, fontSize: 12,
                    background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
                  }}>
                    {priority === "Normal"   && "✓ Standard timeline — IT will respond within 2 business days."}
                    {priority === "Urgent"   && "⚡ Expedited — IT will respond within 4 hours."}
                    {priority === "Critical" && "🚨 Critical — IT will respond within 1 hour. Use only when blocking work."}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="field">
                <label className="field-label">Reason / Justification *</label>
                <textarea
                  className="input"
                  style={{ height: 110, padding: "10px 12px", resize: "vertical" }}
                  placeholder="Explain why you need this asset (e.g. current laptop is 5 years old and impacting productivity)…"
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 4 }}>
                  {reason.length}/500 characters
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ alignSelf: "flex-start", minWidth: 180 }}
              >
                {submitting ? "Submitting…" : "Submit Request →"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Request History ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Request History</div>
              <div className="card-subtitle">
                {hLoading ? "Loading…" : `${(history||[]).length} request${(history||[]).length !== 1 ? "s" : ""} submitted`}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={reload}>↻ Refresh</button>
          </div>
          <RequestHistoryTable data={history} loading={hLoading} />
        </div>
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────
// Change Password Page
// ─────────────────────────────────────────────────────────────────
export function EmployeePassword() {
  const toast = useToast();
  const { changePassword } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const forced    = location.state?.forced === true;

  const [form,   setForm]   = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  const f = (k) => ({
    value: form[k],
    onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
  });
  const toggle = (k) => setShowPwd((p) => ({ ...p, [k]: !p[k] }));

  const strength = (pwd) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8)  s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#dc2626", "#d97706", "#0284c7", "#059669"];
  const s = strength(form.next);

  const save = async () => {
    if (!form.current || !form.next || !form.confirm) {
      toast("All fields are required.", "error"); return;
    }
    if (form.next !== form.confirm) {
      toast("New passwords do not match.", "error"); return;
    }
    if (form.next.length < 8) {
      toast("Password must be at least 8 characters.", "error"); return;
    }
    setSaving(true);
    const result = await changePassword(form.current, form.next);
    setSaving(false);
    if (result.success) {
      toast("Password changed successfully!", "success");
      setForm({ current: "", next: "", confirm: "" });
      if (forced) navigate("/emp/dashboard");
    } else {
      toast(result.message || "Could not change password.", "error");
    }
  };

  return (
    <Layout title="Change Password" subtitle="Update your account security credentials">
      {forced && (
        <div className="card" style={{
          marginBottom: 20, background: "#eff6ff", borderColor: "#bfdbfe",
          padding: "14px 20px", fontSize: 13.5, color: "#1a40a0",
          display: "flex", gap: 10, alignItems: "center"
        }}>
          <span style={{ fontSize: 20 }}>🔐</span>
          <span>
            <strong>Security reminder:</strong> You're using the default password. Please set a personal
            password before continuing to use {COMPANY_DISPLAY}.
          </span>
        </div>
      )}

      <div style={{ maxWidth: 460 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Set New Password</div></div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Current Password */}
            <div className="field">
              <label className="field-label">Current Password</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPwd.current ? "text" : "password"} placeholder="Your current password" {...f("current")} />
                <button
                  type="button"
                  onClick={() => toggle("current")}
                  aria-label={showPwd.current ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 16 }}
                >
                  {showPwd.current ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--gray-100)" }} />

            {/* New Password */}
            <div className="field">
              <label className="field-label">New Password</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPwd.next ? "text" : "password"} placeholder="Minimum 8 characters" {...f("next")} />
                <button type="button" onClick={() => toggle("next")} aria-label={showPwd.next ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 16 }}>
                  {showPwd.next ? "🙈" : "👁"}
                </button>
              </div>
              {/* Strength meter */}
              {form.next.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                    {[1,2,3,4].map((n) => (
                      <div key={n} style={{
                        flex: 1, height: 4, borderRadius: 4,
                        background: n <= s ? strengthColor[s] : "var(--gray-200)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: strengthColor[s] }}>
                    {strengthLabel[s]}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 6 }}>
                Use 8+ characters with uppercase, numbers & symbols for a strong password.
              </div>
            </div>

            {/* Confirm Password */}
            <div className="field">
              <label className="field-label">Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPwd.confirm ? "text" : "password"} placeholder="Repeat your new password" {...f("confirm")} />
                <button type="button" onClick={() => toggle("confirm")} aria-label={showPwd.confirm ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 16 }}>
                  {showPwd.confirm ? "🙈" : "👁"}
                </button>
              </div>
              {form.confirm && form.next !== form.confirm && (
                <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>⚠ Passwords do not match</div>
              )}
              {form.confirm && form.next === form.confirm && (
                <div style={{ fontSize: 12, color: "#059669", marginTop: 5 }}>✓ Passwords match</div>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
              style={{ marginTop: 4 }}
            >
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>

        {/* Security Tips */}
        <div className="card" style={{ marginTop: 16, background: "#f8fafc", borderColor: "var(--gray-200)" }}>
          <div className="card-body" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray-400)", marginBottom: 10 }}>
              Password Security Tips
            </div>
            {[
              "Never share your password with anyone, including IT staff",
              "Use a unique password that you don't use elsewhere",
              "Consider using a passphrase: 3 random words + numbers",
              "Change your password if you suspect it has been compromised",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12.5, color: "var(--gray-500)" }}>
                <span style={{ color: "#059669", fontWeight: 700, flexShrink: 0 }}>✓</span>
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
