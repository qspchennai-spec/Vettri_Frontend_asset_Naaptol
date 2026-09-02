import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import "./FileCenter.css";

import { API_BASE as API, COMPANY_DISPLAY } from "../config";
const LOCATIONS = ["Mumbai"];
const PRIORITIES = ["Low", "Normal", "High", "Critical"];

// ── Icons ──────────────────────────────────────────────────────────────
const IconUpload   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconSearch    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconFile      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconEdit      = () => <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
const IconTrash     = () => <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconLayers    = () => <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconClose     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconDownload  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

const CATEGORY_EMOJI = {
  "IT Documents": "🖥️", "HR Documents": "👥", "Software": "💾", "Drivers": "⚙️",
  "Training Material": "🎓", "Policies": "📜", "Network Documents": "🌐",
  "Forms": "📝", "Security": "🔒", "Other": "📦",
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtSize = (bytes) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

function PriorityBadge({ priority }) {
  const cls = { Critical: "fc-badge-crit", High: "fc-badge-high", Normal: "fc-badge-normal", Low: "fc-badge-low" }[priority] || "fc-badge-normal";
  return <span className={`fc-badge ${cls}`}>{priority || "Normal"}</span>;
}

export default function FileCenter() {
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [maxUploadMb, setMaxUploadMb] = useState(100);
  const [employees, setEmployees] = useState([]);

  const [showUpload, setShowUpload] = useState(false);
  const [detailFile, setDetailFile] = useState(null); // SharedFileSummaryDTO row being viewed
  const [editFile, setEditFile] = useState(null);
  const [versionTarget, setVersionTarget] = useState(null);

  const loadFiles = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/admin/filecenter/files`, {
      params: { search: search || undefined, category: categoryFilter || undefined, priority: priorityFilter || undefined },
    })
      .then((r) => setFiles(r.data || []))
      .catch(() => toast?.("Couldn't load File Center.", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, priorityFilter]);

  useEffect(() => { const t = setTimeout(loadFiles, 250); return () => clearTimeout(t); }, [loadFiles]);

  useEffect(() => {
    axios.get(`${API}/api/admin/filecenter/categories`).then((r) => setCategories(r.data || [])).catch(() => {});
    axios.get(`${API}/api/admin/filecenter/config`).then((r) => setMaxUploadMb(r.data?.maxUploadMb || 100)).catch(() => {});
    axios.get(`${API}/api/admin/employees`).then((r) => setEmployees(r.data || [])).catch(() => {});
  }, []);

  const kpis = useMemo(() => ({
    total: files.length,
    sharedTo: files.reduce((s, f) => s + (f.sharedTo || 0), 0),
    downloaded: files.reduce((s, f) => s + (f.downloaded || 0), 0),
    pending: files.reduce((s, f) => s + (f.pending || 0), 0),
  }), [files]);

  const refreshAfterMutation = () => { loadFiles(); };

  return (
    <Layout title={`${COMPANY_DISPLAY} File Center`} subtitle="Securely distribute files to employees without sending them one by one">
      <div className="fc-page">

        <div className="fc-kpi-grid">
          <div className="fc-kpi-card"><div className="fc-kpi-label">Total Files</div><div className="fc-kpi-value">{kpis.total}</div></div>
          <div className="fc-kpi-card"><div className="fc-kpi-label">Total Shares</div><div className="fc-kpi-value">{kpis.sharedTo}</div></div>
          <div className="fc-kpi-card"><div className="fc-kpi-label">Total Downloads</div><div className="fc-kpi-value">{kpis.downloaded}</div></div>
          <div className="fc-kpi-card"><div className="fc-kpi-label">Pending Downloads</div><div className="fc-kpi-value">{kpis.pending}</div></div>
        </div>

        <div className="card fc-toolbar-card">
          <div className="fc-toolbar">
            <div className="fc-search">
              <IconSearch />
              <input className="input" placeholder="Search by title, category, tags, uploader…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input" style={{ width: 180 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: 150 }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <IconUpload /> Upload File
            </button>
          </div>
        </div>

        <div className="card fc-table-card">
          {loading && (
            <div style={{ padding: 20 }}>
              {[1, 2, 3].map((i) => <div className="skeleton skeleton-row" key={i} style={{ marginBottom: 10 }} />)}
            </div>
          )}

          {!loading && files.length === 0 && (
            <div className="empty-state fc-empty">
              <div style={{ fontSize: 34, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 700, color: "var(--gray-800)" }}>No files shared yet</div>
              <div style={{ fontSize: 13, color: "var(--gray-400)", marginTop: 4 }}>Upload a file to start distributing it to employees.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowUpload(true)}><IconUpload /> Upload File</button>
            </div>
          )}

          {!loading && files.length > 0 && (
            <table className="fc-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Priority</th>
                  <th>Shared To</th>
                  <th>Downloaded</th>
                  <th>Unread</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="fc-row" onClick={() => setDetailFile(f)}>
                    <td>
                      <div className="fc-file-cell">
                        <div className="fc-file-icon">{CATEGORY_EMOJI[f.category] || "📦"}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="fc-file-title">{f.title}{f.expired && <span className="fc-badge fc-badge-crit" style={{ marginLeft: 6 }}>Expired</span>}</div>
                          <div className="fc-file-sub">{f.originalFileName} · {fmtSize(f.fileSize)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="fc-tag">{f.category}</span></td>
                    <td><span className="fc-mono">{f.version}</span></td>
                    <td><PriorityBadge priority={f.priority} /></td>
                    <td>{f.sharedTo}</td>
                    <td>{f.downloaded}</td>
                    <td>{f.unread > 0 ? <span className="fc-badge fc-badge-high">{f.unread}</span> : "0"}</td>
                    <td className="fc-file-sub">{fmtDate(f.uploadedAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="fc-row-actions">
                        <button className="fc-icon-btn" title="Replace Version" onClick={() => setVersionTarget(f)}><IconLayers /></button>
                        <button className="fc-icon-btn" title="Edit" onClick={() => setEditFile(f)}><IconEdit /></button>
                        <button className="fc-icon-btn fc-icon-btn-danger" title="Delete" onClick={() => handleDelete(f, toast, refreshAfterMutation)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadDialog
          categories={categories}
          employees={employees}
          maxUploadMb={maxUploadMb}
          onClose={() => setShowUpload(false)}
          onShared={() => { setShowUpload(false); refreshAfterMutation(); }}
          toast={toast}
        />
      )}

      {detailFile && (
        <FileDetailPanel
          fileId={detailFile.id}
          onClose={() => setDetailFile(null)}
          onChanged={refreshAfterMutation}
          toast={toast}
        />
      )}

      {editFile && (
        <EditDialog
          file={editFile}
          categories={categories}
          onClose={() => setEditFile(null)}
          onSaved={() => { setEditFile(null); refreshAfterMutation(); }}
          toast={toast}
        />
      )}

      {versionTarget && (
        <VersionDialog
          file={versionTarget}
          employees={employees}
          maxUploadMb={maxUploadMb}
          onClose={() => setVersionTarget(null)}
          onSaved={() => { setVersionTarget(null); refreshAfterMutation(); }}
          toast={toast}
        />
      )}
    </Layout>
  );
}

function handleDelete(file, toast, onDone) {
  if (!window.confirm(`Delete "${file.title}"? This removes it for every recipient and can't be undone.`)) return;
  axios.delete(`${API}/api/admin/filecenter/files/${file.id}`)
    .then(() => { toast?.("File deleted.", "success"); onDone(); })
    .catch(() => toast?.("Couldn't delete this file.", "error"));
}

function downloadCurrentVersion(fileId, fallbackName, toast) {
  axios.get(`${API}/api/admin/filecenter/files/${fileId}/download`, { responseType: "blob" })
    .then((res) => {
      const filename = (res.headers["content-disposition"] || "").match(/filename="([^"]+)"/)?.[1] || fallbackName || "download";
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    })
    .catch(() => toast?.("Couldn't download this file.", "error"));
}

// ══════════════════════════════════════════════════════════════════════
// Recipient selector — shared by Upload and Replace Version dialogs
// ══════════════════════════════════════════════════════════════════════
function RecipientSelector({ employees, recipientType, setRecipientType, recipientValues, setRecipientValues, preview, hint }) {
  const [empSearch, setEmpSearch] = useState("");
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(), [employees]);
  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => (e.employeeName || "").toLowerCase().includes(q) || (e.employeeId || "").toLowerCase().includes(q));
  }, [employees, empSearch]);

  const toggleValue = (v) => {
    setRecipientValues((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };
  const selectSingle = (v) => setRecipientValues([v]);

  return (
    <div className="fc-recipient-block">
      <div className="fc-info-label">Recipients</div>
      <select className="input" value={recipientType} onChange={(e) => { setRecipientType(e.target.value); setRecipientValues([]); }}>
        <option value="ALL">✓ All Employees</option>
        <option value="DEPARTMENT">✓ Department</option>
        <option value="LOCATION">✓ Location</option>
        <option value="INDIVIDUAL">✓ Individual Employee</option>
        <option value="MULTIPLE">✓ Multiple Employees</option>
        <option value="ASSET_OWNERS">✓ Asset Owners</option>
      </select>

      {recipientType === "DEPARTMENT" && (
        <div className="fc-chip-grid">
          {departments.length === 0 && <div className="fc-muted">No departments on file yet.</div>}
          {departments.map((d) => (
            <label className={`fc-chip ${recipientValues.includes(d) ? "is-selected" : ""}`} key={d}>
              <input type="checkbox" checked={recipientValues.includes(d)} onChange={() => toggleValue(d)} />
              {d}
            </label>
          ))}
        </div>
      )}

      {recipientType === "LOCATION" && (
        <div className="fc-chip-grid">
          {LOCATIONS.map((l) => (
            <label className={`fc-chip ${recipientValues.includes(l) ? "is-selected" : ""}`} key={l}>
              <input type="checkbox" checked={recipientValues.includes(l)} onChange={() => toggleValue(l)} />
              {l}
            </label>
          ))}
        </div>
      )}

      {(recipientType === "INDIVIDUAL" || recipientType === "MULTIPLE") && (
        <div className="fc-emp-picker">
          <input className="input" placeholder="Search employees by name or ID…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} style={{ marginBottom: 8 }} />
          <div className="fc-emp-list">
            {filteredEmployees.slice(0, 60).map((e) => {
              const checked = recipientValues.includes(e.employeeId);
              return (
                <label className={`fc-emp-row ${checked ? "is-selected" : ""}`} key={e.employeeId}>
                  <input
                    type={recipientType === "INDIVIDUAL" ? "radio" : "checkbox"}
                    name="fc-emp-individual"
                    checked={checked}
                    onChange={() => recipientType === "INDIVIDUAL" ? selectSingle(e.employeeId) : toggleValue(e.employeeId)}
                  />
                  <span className="fc-emp-name">{e.employeeName}</span>
                  <span className="fc-emp-meta">{e.employeeId} · {e.department || "—"}</span>
                </label>
              );
            })}
            {filteredEmployees.length === 0 && <div className="fc-muted" style={{ padding: 10 }}>No matching employees.</div>}
          </div>
        </div>
      )}

      {(recipientType === "ALL" || recipientType === "ASSET_OWNERS") && (
        <div className="fc-muted" style={{ marginTop: 6 }}>
          {recipientType === "ALL" ? "Every employee in the system will receive this file." : "Every employee currently assigned at least one asset will receive this file."}
        </div>
      )}

      <div className="fc-recipient-preview">
        {hint || (preview ? `→ ${preview.count} ${preview.count === 1 ? "employee" : "employees"} will receive this file` : "")}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Upload dialog → confirmation modal → actual share
// ══════════════════════════════════════════════════════════════════════
function UploadDialog({ categories, employees, maxUploadMb, onClose, onShared, toast }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0] || "Other");
  const [priority, setPriority] = useState("Normal");
  const [tags, setTags] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [recipientType, setRecipientType] = useState("ALL");
  const [recipientValues, setRecipientValues] = useState([]);
  const [preview, setPreview] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      axios.post(`${API}/api/admin/filecenter/recipients/preview`, { recipientType, recipientValues })
        .then((r) => setPreview(r.data)).catch(() => setPreview(null));
    }, 300);
    return () => clearTimeout(t);
  }, [recipientType, recipientValues]);

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); }
  };

  const canProceed = file && title.trim() && (recipientType === "ALL" || recipientType === "ASSET_OWNERS" || recipientValues.length > 0);

  return (
    <div className="fc-modal-backdrop" onClick={onClose}>
      <div className="fc-modal fc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="fc-modal-header">
          <div className="fc-modal-title"><IconUpload /> Upload File</div>
          <button className="fc-icon-btn" onClick={onClose}><IconClose /></button>
        </div>

        <div className="fc-modal-body">
          <div
            className={`fc-dropzone ${dragOver ? "is-dragover" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); } }}
            />
            {file ? (
              <div className="fc-dropzone-file"><IconFile /><div><div style={{ fontWeight: 700 }}>{file.name}</div><div className="fc-muted">{fmtSize(file.size)}</div></div></div>
            ) : (
              <>
                <IconUpload />
                <div style={{ fontWeight: 700, marginTop: 8 }}>Drag & drop a file here, or click to browse</div>
                <div className="fc-muted">PDF, DOCX, Excel, PowerPoint, ZIP, Images, TXT, .exe/.msi — up to {maxUploadMb}MB</div>
              </>
            )}
          </div>

          <div className="fc-form-grid">
            <div className="fc-field fc-field-full">
              <label>Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. VPN Setup Guide" />
            </div>
            <div className="fc-field fc-field-full">
              <label>Description</label>
              <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this file for?" />
            </div>
            <div className="fc-field">
              <label>Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fc-field">
              <label>Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="fc-field">
              <label>Tags <span className="fc-muted">(comma-separated)</span></label>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vpn, network, remote-access" />
            </div>
            <div className="fc-field">
              <label>Expiry Date <span className="fc-muted">(optional)</span></label>
              <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <RecipientSelector
            employees={employees}
            recipientType={recipientType} setRecipientType={setRecipientType}
            recipientValues={recipientValues} setRecipientValues={setRecipientValues}
            preview={preview}
          />
        </div>

        <div className="fc-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canProceed} onClick={() => setShowConfirm(true)}>Share File</button>
        </div>
      </div>

      {showConfirm && (
        <ShareConfirmModal
          fileName={file?.name}
          preview={preview}
          onCancel={() => setShowConfirm(false)}
          onConfirm={(sendEmail, emailSubject, emailMessage) => {
            const form = new FormData();
            form.append("file", file);
            form.append("title", title);
            if (description) form.append("description", description);
            form.append("category", category);
            form.append("priority", priority);
            if (tags) form.append("tags", tags);
            if (expiryDate) form.append("expiryDate", expiryDate);
            form.append("recipientType", recipientType);
            form.append("recipientValues", recipientValues.join(","));
            form.append("sendEmail", sendEmail);
            if (emailSubject) form.append("emailSubject", emailSubject);
            if (emailMessage) form.append("emailMessage", emailMessage);

            axios.post(`${API}/api/admin/filecenter/files`, form, { headers: { "Content-Type": "multipart/form-data" } })
              .then(() => { toast?.("File shared successfully.", "success"); onShared(); })
              .catch((e) => toast?.(e?.response?.data?.message || "Couldn't share this file.", "error"));
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Share File confirmation modal
// ══════════════════════════════════════════════════════════════════════
function ShareConfirmModal({ fileName, preview, onCancel, onConfirm }) {
  const [sendEmail, setSendEmail] = useState(true);
  const [subject, setSubject] = useState(`New File Available - ${COMPANY_DISPLAY} File Center`);
  const [message, setMessage] = useState(`Hello,\n\nA new file has been shared with you by the IT Team. Please click the button below to securely access the file.\n\nThank you,\n${COMPANY_DISPLAY} IT Team`);

  return (
    <div className="fc-modal-backdrop" style={{ zIndex: 60 }} onClick={onCancel}>
      <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fc-modal-header">
          <div className="fc-modal-title">Share File</div>
          <button className="fc-icon-btn" onClick={onCancel}><IconClose /></button>
        </div>
        <div className="fc-modal-body">
          <div className="fc-confirm-file"><IconFile /> {fileName}</div>
          <div className="fc-confirm-recipients">
            <div className="fc-info-label">Recipients</div>
            <div className="fc-confirm-count">{preview ? `${preview.count} ${preview.count === 1 ? "Employee" : "Employees"}` : "…"}</div>
            {preview?.summary && <div className="fc-muted">{preview.summary}</div>}
          </div>

          <label className="fc-checkbox-row">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Send Email Notification
          </label>

          {sendEmail && (
            <>
              <div className="fc-field fc-field-full">
                <label>Email Subject</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="fc-field fc-field-full">
                <label>Email Message</label>
                <textarea className="input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <div className="fc-modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(sendEmail, subject, message)}>Share File</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Edit metadata dialog
// ══════════════════════════════════════════════════════════════════════
function EditDialog({ file, categories, onClose, onSaved, toast }) {
  const [title, setTitle] = useState(file.title || "");
  const [description, setDescription] = useState(file.description || "");
  const [category, setCategory] = useState(file.category || "Other");
  const [priority, setPriority] = useState(file.priority || "Normal");
  const [tags, setTags] = useState(file.tags || "");
  const [expiryDate, setExpiryDate] = useState(file.expiryDate || "");
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    axios.put(`${API}/api/admin/filecenter/files/${file.id}`, {
      title, description, category, priority, tags, expiryDate: expiryDate || null,
    })
      .then(() => { toast?.("File updated.", "success"); onSaved(); })
      .catch(() => toast?.("Couldn't update this file.", "error"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fc-modal-backdrop" onClick={onClose}>
      <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fc-modal-header">
          <div className="fc-modal-title"><IconEdit /> Edit File</div>
          <button className="fc-icon-btn" onClick={onClose}><IconClose /></button>
        </div>
        <div className="fc-modal-body">
          <div className="fc-form-grid">
            <div className="fc-field fc-field-full"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="fc-field fc-field-full"><label>Description</label><textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="fc-field"><label>Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div className="fc-field"><label>Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <div className="fc-field"><label>Tags</label><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></div>
            <div className="fc-field"><label>Expiry Date</label><input className="input" type="date" value={expiryDate || ""} onChange={(e) => setExpiryDate(e.target.value)} /></div>
          </div>
        </div>
        <div className="fc-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Replace version dialog (reuses the recipient selector to optionally widen the audience)
// ══════════════════════════════════════════════════════════════════════
function VersionDialog({ file, employees, maxUploadMb, onClose, onSaved, toast }) {
  const [newFile, setNewFile] = useState(null);
  const [version, setVersion] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [widenAudience, setWidenAudience] = useState(false);
  const [recipientType, setRecipientType] = useState("DEPARTMENT");
  const [recipientValues, setRecipientValues] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!widenAudience) return;
    const t = setTimeout(() => {
      axios.post(`${API}/api/admin/filecenter/recipients/preview`, { recipientType, recipientValues })
        .then((r) => setPreview(r.data)).catch(() => setPreview(null));
    }, 300);
    return () => clearTimeout(t);
  }, [widenAudience, recipientType, recipientValues]);

  const submit = (sendEmail, emailSubject, emailMessage) => {
    const form = new FormData();
    form.append("file", newFile);
    if (version) form.append("version", version);
    if (changeNotes) form.append("changeNotes", changeNotes);
    if (widenAudience) {
      form.append("recipientType", recipientType);
      form.append("recipientValues", recipientValues.join(","));
    }
    form.append("sendEmail", sendEmail);
    if (emailSubject) form.append("emailSubject", emailSubject);
    if (emailMessage) form.append("emailMessage", emailMessage);

    axios.post(`${API}/api/admin/filecenter/files/${file.id}/versions`, form, { headers: { "Content-Type": "multipart/form-data" } })
      .then(() => { toast?.("New version shared.", "success"); onSaved(); })
      .catch((e) => toast?.(e?.response?.data?.message || "Couldn't replace this file.", "error"));
  };

  return (
    <div className="fc-modal-backdrop" onClick={onClose}>
      <div className="fc-modal fc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="fc-modal-header">
          <div className="fc-modal-title"><IconLayers /> Replace with Newer Version</div>
          <button className="fc-icon-btn" onClick={onClose}><IconClose /></button>
        </div>
        <div className="fc-modal-body">
          <div className="fc-muted" style={{ marginBottom: 12 }}>
            {file.title} — current version <span className="fc-mono">{file.version}</span>. All {file.sharedTo} existing recipient(s) will automatically get the new version.
          </div>

          <div
            className={`fc-dropzone ${newFile ? "has-file" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" hidden onChange={(e) => setNewFile(e.target.files?.[0] || null)} />
            {newFile ? (
              <div className="fc-dropzone-file"><IconFile /><div><div style={{ fontWeight: 700 }}>{newFile.name}</div><div className="fc-muted">{fmtSize(newFile.size)}</div></div></div>
            ) : (
              <><IconUpload /><div style={{ fontWeight: 700, marginTop: 8 }}>Click to choose the new version's file</div><div className="fc-muted">Up to {maxUploadMb}MB</div></>
            )}
          </div>

          <div className="fc-form-grid">
            <div className="fc-field"><label>New Version Label <span className="fc-muted">(optional)</span></label><input className="input" placeholder="e.g. v1.1" value={version} onChange={(e) => setVersion(e.target.value)} /></div>
            <div className="fc-field fc-field-full"><label>What changed <span className="fc-muted">(optional)</span></label><input className="input" value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} /></div>
          </div>

          <label className="fc-checkbox-row">
            <input type="checkbox" checked={widenAudience} onChange={(e) => setWidenAudience(e.target.checked)} />
            Also add new recipients for this version
          </label>

          {widenAudience && (
            <RecipientSelector
              employees={employees}
              recipientType={recipientType} setRecipientType={setRecipientType}
              recipientValues={recipientValues} setRecipientValues={setRecipientValues}
              preview={preview}
              hint={preview ? `→ up to ${preview.count} additional employee(s), plus the ${file.sharedTo} existing recipient(s)` : ""}
            />
          )}
        </div>
        <div className="fc-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!newFile} onClick={() => setShowConfirm(true)}>Share New Version</button>
        </div>
      </div>

      {showConfirm && (
        <ShareConfirmModal
          fileName={newFile?.name}
          preview={{ count: file.sharedTo + (widenAudience && preview ? preview.count : 0), summary: "Existing recipients + any newly added" }}
          onCancel={() => setShowConfirm(false)}
          onConfirm={submit}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// File detail panel — stats, recipients, versions, access log
// ══════════════════════════════════════════════════════════════════════
function FileDetailPanel({ fileId, onClose, onChanged, toast }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("recipients");

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/admin/filecenter/files/${fileId}`)
      .then((r) => setDetail(r.data))
      .catch(() => toast?.("Couldn't load file details.", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  useEffect(() => { load(); }, [load]);

  const f = detail?.file;

  return (
    <div className="fc-modal-backdrop" onClick={onClose}>
      <div className="fc-modal fc-modal-wide fc-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fc-modal-header">
          <div className="fc-modal-title"><IconFile /> {f?.title || "File Details"}</div>
          <button className="fc-icon-btn" onClick={onClose}><IconClose /></button>
        </div>

        {loading && <div className="fc-modal-body"><div className="skeleton skeleton-block" style={{ height: 160 }} /></div>}

        {!loading && f && (
          <div className="fc-modal-body">
            <div className="fc-detail-kpis">
              <div className="fc-detail-kpi"><div className="fc-kpi-label">Shared To</div><div className="fc-kpi-value">{f.sharedTo}</div></div>
              <div className="fc-detail-kpi"><div className="fc-kpi-label">Downloaded</div><div className="fc-kpi-value">{f.downloaded}</div></div>
              <div className="fc-detail-kpi"><div className="fc-kpi-label">Viewed</div><div className="fc-kpi-value">{f.viewed}</div></div>
              <div className="fc-detail-kpi"><div className="fc-kpi-label">Unread</div><div className="fc-kpi-value">{f.unread}</div></div>
              <div className="fc-detail-kpi"><div className="fc-kpi-label">Pending</div><div className="fc-kpi-value">{f.pending}</div></div>
              <div className="fc-detail-kpi"><div className="fc-kpi-label">Last Download</div><div className="fc-kpi-value" style={{ fontSize: 12.5 }}>{f.lastDownload ? fmtDateTime(f.lastDownload) : "—"}</div></div>
            </div>

            <div className="fc-detail-info-grid">
              <div><div className="fc-info-label">Category</div><div>{f.category}</div></div>
              <div><div className="fc-info-label">Priority</div><PriorityBadge priority={f.priority} /></div>
              <div><div className="fc-info-label">Current Version</div><div className="fc-mono">{f.version}</div></div>
              <div><div className="fc-info-label">Uploaded By</div><div>{f.uploadedBy}</div></div>
              <div><div className="fc-info-label">Uploaded</div><div>{fmtDate(f.uploadedAt)}</div></div>
              <div><div className="fc-info-label">Expiry</div><div className={f.expired ? "fc-text-danger" : ""}>{f.expiryDate ? fmtDate(f.expiryDate) : "No expiry"}</div></div>
              <div className="fc-detail-info-full"><div className="fc-info-label">Recipients</div><div>{f.recipientSummary}</div></div>
              {f.description && <div className="fc-detail-info-full"><div className="fc-info-label">Description</div><div>{f.description}</div></div>}
            </div>

            <div className="fc-tabs">
              <button className={`fc-tab ${tab === "recipients" ? "is-active" : ""}`} onClick={() => setTab("recipients")}>Recipients ({detail.recipients.length})</button>
              <button className={`fc-tab ${tab === "versions" ? "is-active" : ""}`} onClick={() => setTab("versions")}>Version History ({detail.versions.length})</button>
              <button className={`fc-tab ${tab === "log" ? "is-active" : ""}`} onClick={() => setTab("log")}>Download History ({detail.accessLog.length})</button>
            </div>

            {tab === "recipients" && (
              detail.recipients.length === 0 ? <div className="empty-state fc-empty">No recipients yet.</div> : (
                <table className="fc-table fc-mini-table">
                  <thead><tr><th>Employee</th><th>Department</th><th>Read</th><th>Email Sent</th><th>Shared</th></tr></thead>
                  <tbody>
                    {detail.recipients.map((r) => (
                      <tr key={r.id}>
                        <td>{r.employeeName} <span className="fc-muted">({r.employeeId})</span></td>
                        <td>{r.department || "—"}</td>
                        <td>{r.read ? <span className="fc-badge fc-badge-good">Read</span> : <span className="fc-badge fc-badge-normal">Unread</span>}</td>
                        <td>{r.emailSent ? "✓" : "—"}</td>
                        <td className="fc-file-sub">{fmtDate(r.sharedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === "versions" && (
              <div className="fc-vlist">
                {detail.versions.map((v) => (
                  <div className="fc-vitem" key={v.id}>
                    <div className="fc-mono fc-vitem-badge">{v.version}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{v.originalFileName} {v.current && <span className="fc-badge fc-badge-good">Current</span>}</div>
                      {v.changeNotes && <div className="fc-muted">{v.changeNotes}</div>}
                      <div className="fc-file-sub">{fmtDateTime(v.uploadedAt)} · {v.uploadedBy} · {fmtSize(v.fileSize)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "log" && (
              detail.accessLog.length === 0 ? <div className="empty-state fc-empty">No activity yet.</div> : (
                <table className="fc-table fc-mini-table">
                  <thead><tr><th>Employee</th><th>Action</th><th>Date &amp; Time</th><th>IP Address</th></tr></thead>
                  <tbody>
                    {detail.accessLog.map((l) => (
                      <tr key={l.id}>
                        <td>{l.employeeName} <span className="fc-muted">({l.employeeId})</span></td>
                        <td>{l.action === "DOWNLOAD" ? <span className="fc-badge fc-badge-good"><IconDownload /> Downloaded</span> : <span className="fc-badge fc-badge-normal">Viewed</span>}</td>
                        <td className="fc-file-sub">{fmtDateTime(l.accessedAt)}</td>
                        <td className="fc-mono fc-file-sub">{l.ipAddress || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        )}

        <div className="fc-modal-footer">
          <button className="btn btn-secondary" onClick={() => downloadCurrentVersion(fileId, f?.originalFileName, toast)}><IconDownload /> Download Current Version</button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
