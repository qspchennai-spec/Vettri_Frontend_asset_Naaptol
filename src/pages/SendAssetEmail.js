import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Search, Mail, Send, X, Building2, Briefcase, MapPin, User, CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";

import { API_BASE as API } from "../config";

function avatarBg(name) {
  const colors = ["#1a56db", "#059669", "#7c3aed", "#b45309", "#be185d", "#0284c7"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function SendAssetEmail() {
  const toast = useToast();
  const navigate = useNavigate();

  // ── Search state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  // ── Selected employee + assets state ────────────────────────────────────
  const [employee, setEmployee] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Send state ───────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null); // { count, employeeName } after a successful send

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      axios.get(`${API}/api/admin/employees/search`, { params: { q } })
        .then((r) => setResults(r.data))
        .catch(() => setResults([]))
        .finally(() => { setSearching(false); setSearched(true); });
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const loadEmployee = useCallback((employeeId) => {
    setLoadingEmployee(true);
    setLastSent(null);
    axios.get(`${API}/api/admin/asset-email/employee/${encodeURIComponent(employeeId)}`)
      .then((r) => {
        setEmployee(r.data.employee);
        setAssets(r.data.assets || []);
        setSelectedIds(new Set((r.data.assets || []).map((a) => a.assetId)));
        setResults([]);
        setQuery("");
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Couldn't load that employee's details.", "error");
      })
      .finally(() => setLoadingEmployee(false));
  }, [toast]);

  const handleChangeEmployee = () => {
    setEmployee(null);
    setAssets([]);
    setSelectedIds(new Set());
    setLastSent(null);
  };

  const toggleAsset = (assetId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId); else next.add(assetId);
      return next;
    });
  };

  const allSelected = assets.length > 0 && selectedIds.size === assets.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(assets.map((a) => a.assetId)));
  };

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const hasEmail = !!(employee && employee.email && employee.email.trim());

  const handleSend = () => {
    if (!employee) return;
    if (selectedIds.size === 0) {
      toast("Select at least one asset to include in the email.", "error");
      return;
    }
    if (!hasEmail) {
      toast("This employee has no email address on file.", "error");
      return;
    }

    setSending(true);
    setLastSent(null);
    axios.post(`${API}/api/admin/asset-email/send`, {
      employeeId: employee.employeeId,
      assetIds: Array.from(selectedIds),
    })
      .then((res) => {
        toast(res.data.message || "Asset email sent successfully.", "success");
        setLastSent({ count: selectedIds.size, employeeName: employee.employeeName });
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Couldn't send the email. Please try again.", "error");
      })
      .finally(() => setSending(false));
  };

  const showDropdown = query.trim().length > 0 && !employee;

  return (
    <Layout
      title="Send Asset Email"
      subtitle="Search an employee, review their assigned assets, and email a summary"
    >
      {/* ── Search box ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "18px 20px", marginBottom: 18, position: "relative" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gray-700)", marginBottom: 10 }}>
          Search Employee
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}>
            <Search size={15} />
          </span>
          <input
            className="input"
            style={{ width: "100%", paddingLeft: 36, boxSizing: "border-box", height: 42, fontSize: 14 }}
            placeholder="Search by Employee ID, Employee Name, or Email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)",
                display: "flex", padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {showDropdown && (
          <div style={{
            position: "absolute", left: 20, right: 20, top: "100%", marginTop: 4,
            background: "#fff", border: "1px solid var(--gray-200)", borderRadius: 12,
            boxShadow: "0 12px 32px rgba(15,23,42,0.14)", zIndex: 50,
            maxHeight: 340, overflowY: "auto",
          }}>
            {searching ? (
              <div style={{ padding: 18, fontSize: 12.5, color: "var(--gray-400)", textAlign: "center" }}>
                Searching…
              </div>
            ) : results.length === 0 ? (
              searched && (
                <div style={{ padding: 18, fontSize: 12.5, color: "var(--gray-400)", textAlign: "center" }}>
                  No employees found for “{query}”.
                </div>
              )
            ) : (
              results.map((r) => (
                <div
                  key={r.employeeId}
                  onClick={() => loadEmployee(r.employeeId)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", cursor: "pointer",
                    borderBottom: "1px solid var(--gray-50)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gray-50)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: avatarBg(r.employeeName),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff",
                  }}>
                    {initials(r.employeeName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gray-900)" }}>
                      {r.employeeName}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.employeeId} · {r.designation || "—"} · {r.department || "—"}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-400)", flexShrink: 0 }}>
                    {r.email || "No email"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Loading employee ─────────────────────────────────────────── */}
      {loadingEmployee && (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--gray-400)", fontSize: 13, marginBottom: 18 }}>
          Loading employee details…
        </div>
      )}

      {/* ── Empty state before any search ───────────────────────────── */}
      {!employee && !loadingEmployee && !query && (
        <div className="empty-state">
          <div className="empty-icon"><Mail size={30} /></div>
          <div className="empty-title">Search for an employee to get started</div>
          <div className="empty-sub">Find them by Employee ID, name, or email, then pick which of their assigned assets to include in the email.</div>
        </div>
      )}

      {/* ── Selected employee detail + assets ───────────────────────── */}
      {employee && !loadingEmployee && (
        <>
          <div className="card" style={{ padding: 0, marginBottom: 18, overflow: "hidden" }}>
            <div style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
              borderBottom: "1px solid var(--gray-100)",
              padding: "18px 22px",
              display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: avatarBg(employee.employeeName),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 19, fontWeight: 700, color: "#fff",
              }}>
                {initials(employee.employeeName)}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--gray-900)" }}>
                  {employee.employeeName}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--gray-500)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><User size={12} /> {employee.employeeId}</span>
                  <span>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={12} /> {employee.email || "No email on file"}</span>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleChangeEmployee}>
                Change Employee
              </button>
            </div>

            <div className="kpi-row kpi-row-3" style={{ padding: "18px 22px", gap: 18 }}>
              {[
                { label: "Employee Name", value: employee.employeeName || "—", icon: <User size={13} /> },
                { label: "Employee ID", value: employee.employeeId || "—", icon: <User size={13} /> },
                { label: "Email", value: employee.email || "—", icon: <Mail size={13} /> },
                { label: "Department", value: employee.department || "—", icon: <Building2 size={13} /> },
                { label: "Designation", value: employee.designation || "—", icon: <Briefcase size={13} /> },
                { label: "Location", value: employee.location || "—", icon: <MapPin size={13} /> },
              ].map(({ label, value, icon }) => (
                <div key={label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gray-900)", wordBreak: "break-word" }}>{value}</div>
                </div>
              ))}
            </div>

            {!hasEmail && (
              <div style={{
                margin: "0 22px 18px", padding: "10px 14px", borderRadius: 8,
                background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
                fontSize: 12.5, display: "flex", alignItems: "center", gap: 8,
              }}>
                ⚠️ This employee has no email address on file, so an asset email can't be sent yet.
              </div>
            )}
          </div>

          {/* Assets table */}
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
            <div className="card-header" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="card-title">Assigned Assets</div>
                <div className="card-subtitle">
                  {assets.length === 0 ? "No assets currently assigned" : `${selectedIds.size} of ${assets.length} selected`}
                </div>
              </div>
            </div>

            {assets.length === 0 ? (
              <div className="empty-state" style={{ padding: "40px 24px" }}>
                <div className="empty-icon">📦</div>
                <div className="empty-title">No assets assigned to this employee</div>
                <div className="empty-sub">There's nothing to email right now. Assign an asset from the Employees page first.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all assets"
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--primary)" }}
                        />
                      </th>
                      <th>Asset ID</th>
                      <th>Asset Type</th>
                      <th>Brand</th>
                      <th>Model</th>
                      <th>Serial Number</th>
                      <th>Location</th>
                      <th>Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => (
                      <tr
                        key={a.assetId}
                        onClick={() => toggleAsset(a.assetId)}
                        style={{ cursor: "pointer", background: selectedIds.has(a.assetId) ? "#f0f7ff" : undefined }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(a.assetId)}
                            onChange={() => toggleAsset(a.assetId)}
                            aria-label={`Select ${a.laptopName}`}
                            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--primary)" }}
                          />
                        </td>
                        <td className="mono">#{a.assetId}</td>
                        <td><span className="tag tag-blue">{a.assetType}</span></td>
                        <td style={{ fontWeight: 500 }}>{a.brand || "—"}</td>
                        <td style={{ color: "var(--gray-600)" }}>{a.model || "—"}</td>
                        <td>
                          <span style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, background: "var(--gray-100)", padding: "2px 6px", borderRadius: 4, color: "var(--gray-600)" }}>
                            {a.serialNumber || "—"}
                          </span>
                        </td>
                        <td style={{ color: "var(--gray-600)" }}>{a.location || "—"}</td>
                        <td style={{ color: "var(--gray-500)", fontSize: 13 }}>{a.assignedDate || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Success banner */}
          {lastSent && (
            <div className="card" style={{
              padding: "14px 20px", marginBottom: 18,
              borderColor: "#86efac", background: "#f0fdf4",
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            }}>
              <CheckCircle2 size={18} color="#16a34a" />
              <div style={{ fontSize: 13, color: "#166534", flex: 1 }}>
                Email with {lastSent.count} asset{lastSent.count === 1 ? "" : "s"} sent to <strong>{lastSent.employeeName}</strong>.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate("/asset-email-logs")}>
                View in Email Logs
              </button>
            </div>
          )}

          {/* Send button */}
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={handleSend}
            disabled={sending || assets.length === 0 || selectedIds.size === 0 || !hasEmail}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 700 }}
          >
            {sending ? (
              <>Sending Email…</>
            ) : (
              <><Send size={17} /> Send Email {selectedIds.size > 0 ? `(${selectedIds.size} asset${selectedIds.size === 1 ? "" : "s"})` : ""}</>
            )}
          </button>
        </>
      )}
    </Layout>
  );
}
