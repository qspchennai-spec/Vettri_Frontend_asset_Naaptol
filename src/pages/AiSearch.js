import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Search, Pin, Clock, TrendingUp, Laptop, Monitor,
  Smartphone, Printer, Keyboard, Mouse, HardDrive, Box, ChevronLeft,
  ChevronRight, PackageSearch, User, Building2, MapPin, Calendar,
  ShieldCheck, Hash, Tag,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import "./AiSearch.css";

import { API_BASE as API, COMPANY_DISPLAY } from "../config";

const SUGGESTION_CHIPS = [
  "Expired Warranty",
  "Unassigned Assets",
  "Dell Laptops",
  "HP Devices",
  "Under Maintenance",
  "Finance Assets",
  "Purchased This Year",
  "Under Repair",
];

const LOADING_STEPS = [
  "Understanding your request...",
  "Searching database...",
  "Finding matching assets...",
];

const CATEGORY_ICON = {
  laptop: Laptop,
  desktop: HardDrive,
  monitor: Monitor,
  mobile: Smartphone,
  phone: Smartphone,
  printer: Printer,
  keyboard: Keyboard,
  mouse: Mouse,
};

function iconForCategory(category) {
  const key = (category || "").toLowerCase();
  for (const k of Object.keys(CATEGORY_ICON)) {
    if (key.includes(k)) return CATEGORY_ICON[k];
  }
  return Box;
}

export default function AiSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const [showSuggest, setShowSuggest] = useState(false);
  const [recent, setRecent] = useState([]);
  const [popular, setPopular] = useState([]);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const loadingTimerRef = useRef(null);

  const loadHistory = useCallback(() => {
    axios.get(`${API}/api/ai/search/history?limit=8`).then(({ data }) => setRecent(data)).catch(() => {});
    axios.get(`${API}/api/ai/search/popular?limit=6`).then(({ data }) => setPopular(data)).catch(() => {});
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Close the smart-suggestions dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowSuggest(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const runSearch = useCallback(async (q, pageOverride = 0) => {
    const trimmed = (q || "").trim();
    if (!trimmed) return;

    setShowSuggest(false);
    setError("");
    setStatus("loading");
    setLoadingStepIdx(0);

    clearInterval(loadingTimerRef.current);
    loadingTimerRef.current = setInterval(() => {
      setLoadingStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 550);

    try {
      const { data } = await axios.post(`${API}/api/ai/search`, {
        query: trimmed,
        page: pageOverride,
        size: 12,
      });
      setResponse(data);
      setPage(pageOverride);
      loadHistory();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong while searching. Please try again.");
      setResponse(null);
    } finally {
      clearInterval(loadingTimerRef.current);
      setStatus("done");
    }
  }, [loadHistory]);

  useEffect(() => () => clearInterval(loadingTimerRef.current), []);

  const handleSearchClick = () => runSearch(query, 0);
  const handleChipClick = (label) => { setQuery(label); runSearch(label, 0); };
  const handleClear = () => {
    setQuery("");
    setResponse(null);
    setStatus("idle");
    setError("");
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") runSearch(query, 0);
    if (e.key === "Escape") setShowSuggest(false);
  };

  const togglePin = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.put(`${API}/api/ai/search/history/${id}/pin`);
      loadHistory();
    } catch { /* ignore */ }
  };

  const goToPage = (p) => {
    if (!response) return;
    if (p < 0 || p >= response.totalPages) return;
    runSearch(query, p);
  };

  const pinned = recent.filter((r) => r.pinned);
  const unpinned = recent.filter((r) => !r.pinned);

  return (
    <Layout
      title="AI Search Assistant"
      subtitle="Ask questions in plain English and get structured, filtered results."
    >
      <div className="ai-search-hero">
        <div className="ai-search-hero-head">
          <div className="ai-search-icon-badge"><Sparkles size={22} /></div>
          <div>
            <div className="ai-search-hero-title">{`Ask ${COMPANY_DISPLAY} AI`}</div>
            <div className="ai-search-hero-subtitle">Search your IT assets using natural language.</div>
          </div>
        </div>

        <div className="ai-search-box-wrap" ref={boxRef}>
          <div className="ai-search-input-row">
            <div className="ai-search-input-shell">
              <Search size={17} />
              <input
                ref={inputRef}
                className="ai-search-input"
                placeholder="Example: Show Dell laptops assigned to Finance"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggest(true)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button className="ai-search-btn" onClick={handleSearchClick} disabled={!query.trim() || status === "loading"}>
              <Search size={16} /> Search
            </button>
            {(query || response) && (
              <button className="ai-search-clear-btn" onClick={handleClear}>Clear</button>
            )}

            {showSuggest && (recent.length > 0 || popular.length > 0) && (
              <div className="ai-suggest-panel">
                {pinned.length > 0 && (
                  <>
                    <div className="ai-suggest-section-label">Pinned Searches</div>
                    {pinned.map((h) => (
                      <div key={h.id} className="ai-suggest-row" onClick={() => { setQuery(h.query); runSearch(h.query, 0); }}>
                        <div className="ai-suggest-row-left"><Pin size={13} /><span>{h.query}</span></div>
                        <button className="ai-suggest-pin-btn active" onClick={(e) => togglePin(h.id, e)}><Pin size={13} fill="currentColor" /></button>
                      </div>
                    ))}
                  </>
                )}
                {unpinned.length > 0 && (
                  <>
                    <div className="ai-suggest-section-label">Recent Searches</div>
                    {unpinned.slice(0, 5).map((h) => (
                      <div key={h.id} className="ai-suggest-row" onClick={() => { setQuery(h.query); runSearch(h.query, 0); }}>
                        <div className="ai-suggest-row-left"><Clock size={13} /><span>{h.query}</span></div>
                        <button className="ai-suggest-pin-btn" onClick={(e) => togglePin(h.id, e)}><Pin size={13} /></button>
                      </div>
                    ))}
                  </>
                )}
                {popular.length > 0 && (
                  <>
                    <div className="ai-suggest-section-label">Popular Searches</div>
                    {popular.map((p, i) => (
                      <div key={i} className="ai-suggest-row" onClick={() => { setQuery(p.query); runSearch(p.query, 0); }}>
                        <div className="ai-suggest-row-left"><TrendingUp size={13} /><span>{p.query}</span></div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="ai-search-chips">
            {SUGGESTION_CHIPS.map((chip) => (
              <button key={chip} className="ai-chip" onClick={() => handleChipClick(chip)}>{chip}</button>
            ))}
          </div>
        </div>
      </div>

      {status === "loading" && (
        <div className="ai-loading-wrap">
          <div className="ai-loading-orb"><Sparkles size={24} /></div>
          <div className="ai-loading-step">{LOADING_STEPS[loadingStepIdx]}</div>
          <div className="ai-results-grid" style={{ width: "100%", marginTop: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="ai-skeleton-card">
                <div className="ai-skeleton-line" style={{ width: "60%", height: 16 }} />
                <div className="ai-skeleton-line" style={{ width: "40%" }} />
                <div className="ai-skeleton-line" style={{ width: "80%" }} />
                <div className="ai-skeleton-line" style={{ width: "50%" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && status === "done" && (
        <div className="ai-summary-card" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
          <div className="ai-summary-text" style={{ color: "#b91c1c" }}>{error}</div>
        </div>
      )}

      {status === "done" && !error && response && (
        <>
          <div className="ai-summary-card">
            <div className="ai-summary-icon"><Sparkles size={17} /></div>
            <div>
              <div className="ai-summary-text">{response.summary}</div>
              {response.matchedTerms?.length > 0 && (
                <div className="ai-matched-terms">
                  {response.matchedTerms.map((t, i) => (
                    <span key={i} className="ai-matched-term">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {response.results?.length > 0 ? (
            <>
              <div className="ai-results-toolbar">
                <div className="ai-results-count">
                  {response.resultCount} asset{response.resultCount === 1 ? "" : "s"} found
                </div>
              </div>

              <div className="ai-results-grid">
                {response.results.map((asset, idx) => {
                  const Icon = iconForCategory(asset.assetType);
                  return (
                    <div
                      key={asset.assetId}
                      className="ai-asset-card"
                      style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                      onClick={() => navigate(isAdmin ? `/assets/${asset.assetId}` : `/emp/dashboard`)}
                    >
                      <div className="ai-asset-card-head">
                        <div className="ai-asset-thumb"><Icon size={20} /></div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="ai-asset-name">{asset.laptopName || asset.model || asset.assetType || "Asset"}</div>
                          <div className="ai-asset-sub">{asset.brand} {asset.model}</div>
                        </div>
                      </div>

                      <div className="ai-asset-body">
                        <div>
                          <div className="ai-asset-field-label"><Hash size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Asset ID</div>
                          <div className="ai-asset-field-value">{asset.assetId}</div>
                        </div>
                        <div>
                          <div className="ai-asset-field-label"><Tag size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Category</div>
                          <div className="ai-asset-field-value">{asset.assetType || "—"}</div>
                        </div>
                        <div>
                          <div className="ai-asset-field-label">Serial No.</div>
                          <div className="ai-asset-field-value">{asset.serialNumber || "—"}</div>
                        </div>
                        <div>
                          <div className="ai-asset-field-label"><User size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Assigned To</div>
                          <div className="ai-asset-field-value">{asset.employeeName || "Unassigned"}</div>
                        </div>
                        <div>
                          <div className="ai-asset-field-label"><Building2 size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Branch</div>
                          <div className="ai-asset-field-value">{asset.location || "—"}</div>
                        </div>
                        <div>
                          <div className="ai-asset-field-label"><Calendar size={10} style={{ marginRight: 3, verticalAlign: -1 }} />Purchased</div>
                          <div className="ai-asset-field-value">{asset.purchaseDate || "—"}</div>
                        </div>
                      </div>

                      <div className="ai-asset-footer">
                        <StatusPill status={asset.assetStatus} />
                        <div className="ai-asset-field-value" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <ShieldCheck size={12} />
                          {asset.warrantyExpiry || "No warranty"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {response.totalPages > 1 && (
                <div className="ai-pagination">
                  <button className="ai-page-btn" onClick={() => goToPage(page - 1)} disabled={page === 0}>
                    <ChevronLeft size={15} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-600)" }}>
                    Page {page + 1} of {response.totalPages}
                  </span>
                  <button className="ai-page-btn" onClick={() => goToPage(page + 1)} disabled={page + 1 >= response.totalPages}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="ai-empty-state">
              <div className="ai-empty-icon"><PackageSearch size={32} /></div>
              <div className="ai-empty-title">No matching assets found.</div>
              <div className="ai-empty-sub">Try adjusting your search — here are a few ideas:</div>
              <div className="ai-empty-suggestions">
                {["Remove one filter", "Try another department", "Search by asset ID", "Search by employee name"].map((s) => (
                  <span key={s} className="ai-matched-term">{s}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {status === "idle" && (
        <div className="ai-empty-state">
          <div className="ai-empty-icon"><MapPin size={32} /></div>
          <div className="ai-empty-title">{`Ask ${COMPANY_DISPLAY} AI anything about your assets`}</div>
          <div className="ai-empty-sub">Try a suggestion chip above, or type your own question — like "Show HP laptops with 16GB RAM".</div>
        </div>
      )}
    </Layout>
  );
}
