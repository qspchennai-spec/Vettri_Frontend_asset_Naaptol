import React, { useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import { useGet } from "../hooks/useEmployeeApi";
import "./MyFiles.css";

import { API_BASE as API } from "../config";
const EMPLOYEE_API = `${API}/api/employee`;

const IconEye      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconSearch   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

const CATEGORY_EMOJI = {
  "IT Documents": "🖥️", "HR Documents": "👥", "Software": "💾", "Drivers": "⚙️",
  "Training Material": "🎓", "Policies": "📜", "Network Documents": "🌐",
  "Forms": "📝", "Security": "🔒", "Other": "📦",
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtSize = (bytes) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

function PriorityBadge({ priority }) {
  const cls = { Critical: "mf-badge-crit", High: "mf-badge-high", Normal: "mf-badge-normal", Low: "mf-badge-low" }[priority] || "mf-badge-normal";
  return <span className={`mf-badge ${cls}`}>{priority || "Normal"}</span>;
}

export default function MyFiles() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("fileId");
  const { data: files, loading, error, reload } = useGet("/filecenter/my-files");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const list = (files || [])
    .filter((f) => !categoryFilter || f.category === categoryFilter)
    .filter((f) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (f.title || "").toLowerCase().includes(q) || (f.category || "").toLowerCase().includes(q)
        || (f.tags || "").toLowerCase().includes(q) || (f.uploadedBy || "").toLowerCase().includes(q);
    });

  const categories = [...new Set((files || []).map((f) => f.category).filter(Boolean))].sort();
  const unreadCount = (files || []).filter((f) => !f.read).length;

  const markRead = (fileId) => {
    axios.put(`${EMPLOYEE_API}/filecenter/files/${fileId}/read`)
      .then(() => reload())
      .catch(() => toast?.("Couldn't mark this as read.", "error"));
  };

  const openBlob = (fileId, action) => {
    const url = `${EMPLOYEE_API}/filecenter/files/${fileId}/${action}`;
    const win = action === "view" ? window.open("", "_blank") : null;
    axios.get(url, { responseType: "blob" })
      .then((res) => {
        const blobUrl = URL.createObjectURL(res.data);
        if (action === "view") {
          if (win) win.location.href = blobUrl; else window.open(blobUrl, "_blank");
        } else {
          const filename = (res.headers["content-disposition"] || "").match(/filename="([^"]+)"/)?.[1] || "download";
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        reload();
      })
      .catch(() => {
        win?.close();
        toast?.(`Couldn't ${action === "view" ? "open" : "download"} this file.`, "error");
      });
  };

  const view = (fileId) => openBlob(fileId, "view");
  const download = (fileId) => openBlob(fileId, "download");

  return (
    <Layout title="My Files" subtitle="Files shared with you by the IT team">
      <div className="mf-page">

        <div className="card mf-toolbar-card">
          <div className="mf-toolbar">
            <div className="mf-search">
              <IconSearch />
              <input className="input" placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input" style={{ width: 190 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {unreadCount > 0 && <span className="mf-unread-pill">{unreadCount} unread</span>}
          </div>
        </div>

        {loading && (
          <div className="card">
            <div className="card-body">
              {[1, 2, 3].map((i) => <div className="skeleton skeleton-row" key={i} style={{ marginBottom: 10 }} />)}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="card"><div className="card-body"><div className="empty-state mf-empty">{error}</div></div></div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className="card">
            <div className="card-body">
              <div className="empty-state mf-empty">
                <div style={{ fontSize: 34, marginBottom: 8 }}>📂</div>
                <div style={{ fontWeight: 700, color: "var(--gray-800)" }}>{files?.length ? "No files match your search" : "No files shared with you yet"}</div>
                <div style={{ fontSize: 13, color: "var(--gray-400)", marginTop: 4 }}>Files the IT team shares with you will show up here.</div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="mf-grid">
            {list.map((f) => (
              <div className={`mf-card ${f.fileId === Number(highlightId) ? "is-highlighted" : ""} ${!f.read ? "is-unread" : ""}`} key={f.fileId}>
                <div className="mf-card-top">
                  <div className="mf-card-icon">{CATEGORY_EMOJI[f.category] || "📦"}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mf-card-title">{f.title}</div>
                    <div className="mf-card-sub">{f.originalFileName} · {fmtSize(f.fileSize)}</div>
                  </div>
                  {!f.read && <span className="mf-dot" title="Unread" />}
                </div>

                {f.description && <div className="mf-card-desc">{f.description}</div>}

                <div className="mf-card-badges">
                  <span className="mf-tag">{f.category}</span>
                  <PriorityBadge priority={f.priority} />
                  <span className="mf-mono">{f.version}</span>
                  {f.expired && <span className="mf-badge mf-badge-crit">Expired</span>}
                  {f.read ? <span className="mf-badge mf-badge-good"><IconCheck /> Read</span> : <span className="mf-badge mf-badge-normal">Unread</span>}
                </div>

                <div className="mf-card-meta">
                  Shared by <strong>{f.uploadedBy || "IT Administrator"}</strong> · {fmtDate(f.sharedAt)}
                </div>

                <div className="mf-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => view(f.fileId)}><IconEye /> View</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => download(f.fileId)}><IconDownload /> Download</button>
                  {!f.read && <button className="btn btn-primary btn-sm" onClick={() => markRead(f.fileId)}><IconCheck /> Mark as Read</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
