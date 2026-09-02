import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import "./ServiceBilling.css";

import { API_BASE as API } from "../config";

const STATUS_OPTIONS = ["Paid", "Pending", "Overdue"];
const SERVICE_OPTIONS = [
  "Internet / ISP", "AMC - Laptops", "AMC - Printers", "AMC - Servers",
  "Software Subscription", "Cloud Hosting", "Antivirus License",
  "CCTV Maintenance", "Networking Maintenance", "Other",
];

const EMPTY_FORM = {
  service: "", vendor: "",
  billingFromDate: "", billingToDate: "",
  amount: "", paymentDate: "", dueDate: "",
  status: "Pending", remarks: "",
  // Invoice PDF Auto-Fill fields — populated from an uploaded invoice when
  // confidently detected, otherwise left blank for manual entry.
  invoiceNumber: "", invoiceDate: "", gstAmount: "", totalAmount: "",
  currency: "", invoiceReference: "", serviceDetails: "",
};

// Fields that Invoice PDF Auto-Fill is allowed to populate. Any field not
// already filled in by the admin gets overwritten with the extracted value;
// anything the admin already typed is always left alone (Requirement 5).
const AUTOFILL_TARGET_FIELDS = {
  vendorName: "vendor",
  serviceProvider: "service",
  invoiceNumber: "invoiceNumber",
  invoiceDate: "invoiceDate",
  billingFromDate: "billingFromDate",
  billingToDate: "billingToDate",
  amount: "amount",
  gstAmount: "gstAmount",
  totalAmount: "totalAmount",
  currency: "currency",
  dueDate: "dueDate",
  invoiceReference: "invoiceReference",
  description: "serviceDetails",
};

const EMPTY_FILTERS = {
  service: "All", vendor: "All",
  periodFrom: "", periodTo: "", paymentDate: "",
};

function authHeader() {
  const token = sessionStorage.getItem("iam_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatPeriod(from, to) {
  if (!from && !to) return "—";
  return `${formatDate(from)} - ${formatDate(to)}`;
}

// ── Status badge ─────────────────────────────────────────────────
function BillingStatusBadge({ status }) {
  const cfg = {
    Paid:    { bg: "var(--success-bg)", color: "var(--success)", border: "var(--success-border)" },
    Pending: { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)" },
    Overdue: { bg: "var(--danger-bg)",  color: "var(--danger)",  border: "var(--danger-border)"  },
  }[status] || { bg: "var(--gray-100)", color: "var(--gray-600)", border: "var(--gray-200)" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: 11.5, fontWeight: 700, letterSpacing: "0.01em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Skeleton row ───────────────────────────────────────────────────
const SkeletonRow = () => {
  const cell = (w = 80) => (
    <td><div className="skeleton skeleton-text" style={{ width: w, margin: 0 }} /></td>
  );
  return <tr>{cell(140)}{cell(120)}{cell(150)}{cell(90)}{cell(100)}{cell(80)}{cell(120)}{cell(160)}</tr>;
};

export default function ServiceBilling() {
  const toast = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState({
    totalPayments: null, paidServices: null, pendingServices: null,
    overdueServices: null, totalInvoicesUploaded: null,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = add/re-add mode
  const [reAddMode, setReAddMode] = useState(false); // true = service/vendor locked, new billing record
  const [form, setForm] = useState(EMPTY_FORM);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [extractingInvoice, setExtractingInvoice] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortDir, setSortDir] = useState("desc"); // sort by payment date
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [viewingPayment, setViewingPayment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Billing History modal
  const [historyTarget, setHistoryTarget] = useState(null); // { service, vendor }
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [exporting, setExporting] = useState(null); // "pdf" | "excel" | null

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/admin/service-billing`)
      .then((r) => { setPayments(r.data); setError(""); })
      .catch(() => { setPayments([]); setError("Couldn't load billing records. Is the API running?"); })
      .finally(() => setLoading(false));
  }, []);

  const loadDashboard = useCallback(() => {
    axios.get(`${API}/api/admin/service-billing/dashboard`)
      .then((r) => setDashboard(r.data))
      .catch(() => { /* KPI cards simply show 0 if this fails */ });
  }, []);

  useEffect(() => { loadData(); loadDashboard(); }, [loadData, loadDashboard]);

  // Distinct services/vendors already on file, for the filter dropdowns.
  const serviceOptionsInData = useMemo(
    () => Array.from(new Set(payments.map((p) => p.service).filter(Boolean))).sort(),
    [payments]
  );
  const vendorOptionsInData = useMemo(
    () => Array.from(new Set(payments.map((p) => p.vendor).filter(Boolean))).sort(),
    [payments]
  );

  // ── Form helpers ──────────────────────────────────────────────
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setInvoiceFile(null);
    setEditingId(null);
    setReAddMode(false);
  };

  const openAddForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (payment) => {
    setEditingId(payment.id);
    setReAddMode(false);
    setForm({
      service: payment.service || "",
      vendor: payment.vendor || "",
      billingFromDate: payment.billingFromDate || "",
      billingToDate: payment.billingToDate || "",
      amount: payment.amount != null ? String(payment.amount) : "",
      paymentDate: payment.paymentDate || "",
      dueDate: payment.dueDate || "",
      status: payment.status || "Pending",
      remarks: payment.remarks || "",
      invoiceNumber: payment.invoiceNumber || "",
      invoiceDate: payment.invoiceDate || "",
      gstAmount: payment.gstAmount != null ? String(payment.gstAmount) : "",
      totalAmount: payment.totalAmount != null ? String(payment.totalAmount) : "",
      currency: payment.currency || "",
      invoiceReference: payment.invoiceReference || "",
      serviceDetails: payment.serviceDetails || "",
    });
    setInvoiceFile(null);
    setShowForm(true);
  };

  // "Re-Add Billing" — auto-fills Service + Vendor (locked) for a fresh
  // billing period; everything else starts blank so the admin only enters
  // this month's details, and Save always creates a brand-new record.
  const openReAddForm = (payment) => {
    setEditingId(null);
    setReAddMode(true);
    setForm({
      ...EMPTY_FORM,
      service: payment.service || "",
      vendor: payment.vendor || "",
    });
    setInvoiceFile(null);
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); resetForm(); };

  // ── Invoice PDF Auto-Fill ────────────────────────────────────────
  // Reads the uploaded invoice via the backend and fills in only the
  // fields it could confidently identify — fields it can't read stay
  // blank for manual entry, and anything the admin already typed is
  // never touched. Also attaches the file as this record's invoice.
  const handleInvoiceUpload = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast("Only PDF files are allowed for the invoice.", "error");
      return;
    }
    setInvoiceFile(file);

    const data = new FormData();
    data.append("invoiceFile", file);
    setExtractingInvoice(true);
    axios
      .post(`${API}/api/admin/service-billing/extract-invoice`, data, { headers: authHeader() })
      .then((r) => {
        const extracted = r.data || {};
        setForm((f) => {
          const next = { ...f };
          for (const [sourceKey, targetKey] of Object.entries(AUTOFILL_TARGET_FIELDS)) {
            const value = extracted[sourceKey];
            const hasValue = value !== null && value !== undefined && String(value).trim() !== "";
            const fieldIsEmpty = !String(next[targetKey] ?? "").trim();
            // Never overwrite a value the admin already entered manually.
            if (hasValue && fieldIsEmpty) {
              next[targetKey] = String(value);
            }
          }
          return next;
        });
        if (extracted.ocrUsed) {
          toast("Scanned invoice detected — read using OCR. Please double-check the auto-filled values.", "info");
        } else {
          toast("Invoice details auto-filled where available. Please review before saving.", "success");
        }
      })
      .catch((err) => {
        // Extraction failing should never break the form — the admin can
        // just fill everything in manually, and the file stays attached.
        toast(
          err.response?.data?.message ||
            "Couldn't auto-read this invoice. You can still fill in the details manually.",
          "error"
        );
      })
      .finally(() => setExtractingInvoice(false));
  };

  // ── Save (create or update) ─────────────────────────────────────
  const savePayment = () => {
    const required = [
      ["service", "Service"],
      ["vendor", "Vendor"],
      ["billingFromDate", "Billing From Date"],
      ["billingToDate", "Billing To Date"],
      ["amount", "Amount"],
      ["paymentDate", "Payment Date"],
      ["status", "Status"],
    ];
    for (const [k, label] of required) {
      if (!String(form[k] ?? "").trim()) {
        toast(`${label} is required.`, "error");
        return;
      }
    }
    if (new Date(form.billingToDate) < new Date(form.billingFromDate)) {
      toast("Billing To Date cannot be before Billing From Date.", "error");
      return;
    }
    if (Number(form.amount) < 0 || Number.isNaN(Number(form.amount))) {
      toast("Amount must be a valid positive number.", "error");
      return;
    }
    if (invoiceFile && invoiceFile.type !== "application/pdf") {
      toast("Only PDF files are allowed for the invoice.", "error");
      return;
    }

    // Instant client-side duplicate check (Requirement 7) — the server
    // enforces this too, but catching it here avoids a round trip.
    const clash = payments.some((p) =>
      (editingId ? p.id !== editingId : true) &&
      (p.service || "").toLowerCase() === form.service.trim().toLowerCase() &&
      (p.vendor || "").toLowerCase() === form.vendor.trim().toLowerCase() &&
      p.billingFromDate === form.billingFromDate &&
      p.billingToDate === form.billingToDate
    );
    if (clash) {
      toast("Billing for this period already exists.", "error");
      return;
    }

    const data = new FormData();
    data.append("service", form.service.trim());
    data.append("vendor", form.vendor.trim());
    data.append("billingFromDate", form.billingFromDate);
    data.append("billingToDate", form.billingToDate);
    data.append("amount", form.amount);
    data.append("paymentDate", form.paymentDate);
    if (form.dueDate) data.append("dueDate", form.dueDate);
    data.append("status", form.status);
    data.append("remarks", form.remarks || "");
    if (invoiceFile) data.append("invoiceFile", invoiceFile);
    // Invoice PDF Auto-Fill fields — all optional, only sent when present.
    if (form.invoiceNumber) data.append("invoiceNumber", form.invoiceNumber.trim());
    if (form.invoiceDate) data.append("invoiceDate", form.invoiceDate);
    if (form.gstAmount !== "") data.append("gstAmount", form.gstAmount);
    if (form.totalAmount !== "") data.append("totalAmount", form.totalAmount);
    if (form.currency) data.append("currency", form.currency.trim());
    if (form.invoiceReference) data.append("invoiceReference", form.invoiceReference.trim());
    if (form.serviceDetails) data.append("serviceDetails", form.serviceDetails.trim());

    setSaving(true);
    const req = editingId
      ? axios.put(`${API}/api/admin/service-billing/${editingId}`, data, { headers: authHeader() })
      : axios.post(`${API}/api/admin/service-billing`, data, { headers: authHeader() });

    req
      .then(() => {
        toast(editingId ? "Billing record updated." : "Billing record saved.", "success");
        setShowForm(false);
        resetForm();
        loadData();
        loadDashboard();
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Failed to save the billing record.", "error");
      })
      .finally(() => setSaving(false));
  };

  // ── Delete ────────────────────────────────────────────────────
  const deletePayment = (payment) => {
    if (!window.confirm(`Permanently delete this billing record for "${payment.service}" (${payment.vendor}), period ${formatPeriod(payment.billingFromDate, payment.billingToDate)}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(payment.id);
    axios.delete(`${API}/api/admin/service-billing/${payment.id}`, { headers: authHeader() })
      .then(() => {
        toast("Billing record deleted.", "success");
        loadData();
        loadDashboard();
      })
      .catch((err) => toast(err.response?.data?.message || "Failed to delete the billing record.", "error"))
      .finally(() => setDeletingId(null));
  };

  // ── Invoice view / download ──────────────────────────────────────
  const openInvoice = async (payment, mode) => {
    try {
      const response = await axios.get(
        `${API}/api/admin/service-billing/${payment.id}/invoice/${mode}`,
        { responseType: "blob", headers: authHeader() }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (mode === "view") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${payment.service || "invoice"}-${payment.vendor || ""}-${payment.billingFromDate || ""}.pdf`.replace(/\s+/g, "_");
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't open the invoice.", "error");
    }
  };

  // ── Billing History (Requirement 6) ─────────────────────────────
  const openHistory = (payment) => {
    setHistoryTarget({ service: payment.service, vendor: payment.vendor });
    setHistoryLoading(true);
    setHistoryRecords([]);
    axios.get(`${API}/api/admin/service-billing/history`, {
      params: { service: payment.service, vendor: payment.vendor },
    })
      .then((r) => setHistoryRecords(r.data))
      .catch(() => toast("Couldn't load billing history.", "error"))
      .finally(() => setHistoryLoading(false));
  };
  const closeHistory = () => { setHistoryTarget(null); setHistoryRecords([]); };

  // ── Export (Requirement 10) ─────────────────────────────────────
  const buildExportParams = () => {
    const params = {};
    if (statusFilter !== "All") params.status = statusFilter;
    if (filters.service !== "All") params.service = filters.service;
    if (filters.vendor !== "All") params.vendor = filters.vendor;
    if (filters.periodFrom) params.periodFrom = filters.periodFrom;
    if (filters.periodTo) params.periodTo = filters.periodTo;
    if (filters.paymentDate) params.paymentDate = filters.paymentDate;
    return params;
  };

  const exportReport = async (kind) => {
    setExporting(kind);
    try {
      const response = await axios.get(`${API}/api/admin/service-billing/export/${kind}`, {
        params: buildExportParams(),
        responseType: "blob",
        headers: authHeader(),
      });
      const mime = kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `service-billing-report.${kind === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast(err.response?.data?.message || `Failed to export ${kind.toUpperCase()} report.`, "error");
    } finally {
      setExporting(null);
    }
  };

  // ── Derived data ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    return payments
      .filter((p) =>
        (p.service || "").toLowerCase().includes(q) ||
        (p.vendor || "").toLowerCase().includes(q)
      )
      .filter((p) => statusFilter === "All" || p.status === statusFilter)
      .filter((p) => filters.service === "All" || p.service === filters.service)
      .filter((p) => filters.vendor === "All" || p.vendor === filters.vendor)
      .filter((p) => !filters.periodFrom || (p.billingToDate && p.billingToDate >= filters.periodFrom))
      .filter((p) => !filters.periodTo || (p.billingFromDate && p.billingFromDate <= filters.periodTo))
      .filter((p) => !filters.paymentDate || p.paymentDate === filters.paymentDate)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.paymentDate).getTime() || 0;
        const db = new Date(b.paymentDate).getTime() || 0;
        return sortDir === "asc" ? da - db : db - da;
      });
  }, [payments, searchText, statusFilter, filters, sortDir]);

  const activeFilterCount = [
    filters.service !== "All", filters.vendor !== "All",
    !!filters.periodFrom, !!filters.periodTo, !!filters.paymentDate,
  ].filter(Boolean).length;

  const kpis = [
    { label: "Total Billing Records", value: dashboard.totalPayments,        icon: "🧾", color: "var(--primary)", filterStatus: "All" },
    { label: "Paid",                  value: dashboard.paidServices,         icon: "✅", color: "var(--success)", filterStatus: "Paid" },
    { label: "Pending",               value: dashboard.pendingServices,      icon: "⏳", color: "var(--warning)", filterStatus: "Pending" },
    { label: "Overdue",               value: dashboard.overdueServices,      icon: "⚠️", color: "var(--danger)",  filterStatus: "Overdue" },
    { label: "Invoices Uploaded",     value: dashboard.totalInvoicesUploaded,icon: "📎", color: "#7c3aed",        filterStatus: null },
  ];

  return (
    <Layout
      title="Service Billing"
      subtitle="Recurring vendor billing, invoices, and payment history"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" disabled={exporting === "pdf"} onClick={() => exportReport("pdf")}>
            {exporting === "pdf" ? "Exporting…" : "⬇ PDF"}
          </button>
          <button className="btn btn-secondary" disabled={exporting === "excel"} onClick={() => exportReport("excel")}>
            {exporting === "excel" ? "Exporting…" : "⬇ Excel"}
          </button>
          <button className="btn btn-primary" onClick={() => (showForm ? cancelForm() : openAddForm())} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {showForm ? "✕ Cancel" : "+ Add Service Payment"}
          </button>
        </div>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="card" style={{
          marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2",
          padding: "12px 18px", fontSize: 13, color: "#991b1b",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="service-billing-kpi-row" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        {kpis.map((k) => {
          const active = k.filterStatus !== null && statusFilter === k.filterStatus;
          return (
            <div
              key={k.label}
              onClick={() => { if (k.filterStatus !== null) setStatusFilter(active ? "All" : k.filterStatus); }}
              style={{
                background: "#fff", borderRadius: 12, padding: "16px 18px",
                borderLeft: `4px solid ${k.color}`,
                boxShadow: active ? `0 0 0 2px ${k.color}30, var(--shadow-sm)` : "var(--shadow-xs)",
                cursor: k.filterStatus !== null ? "pointer" : "default",
                transition: "all 0.15s ease",
                transform: active ? "translateY(-2px)" : "none",
                border: active ? `1px solid ${k.color}40` : "1px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: loading ? "var(--gray-300)" : k.color, lineHeight: 1.2 }}>
                    {loading || k.value == null ? "—" : k.value}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-400)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {k.label}
                  </div>
                </div>
                <div style={{ fontSize: 24, opacity: 0.5 }}>{k.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit / Re-Add Billing Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 28, animation: "fadeIn 0.2s ease" }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                {reAddMode ? "Re-Add Billing" : editingId ? "Edit Billing Record" : "Add Service Payment"}
              </div>
              <div className="card-subtitle">
                {reAddMode
                  ? `New billing period for ${form.service} · ${form.vendor} — this creates a new record, existing history is kept`
                  : editingId
                    ? "Update the billing record details below"
                    : "Fill in the details below to record a service payment"}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-section-label">Invoice Upload (Auto-Fill)</div>
            <div
              className="field"
              style={{
                marginBottom: 18, padding: "14px 16px", borderRadius: 10,
                border: "1px dashed var(--gray-200)", background: "var(--gray-50, #fafafa)",
              }}
            >
              <label className="field-label">Upload Invoice PDF</label>
              <input
                className="input"
                type="file"
                accept="application/pdf"
                disabled={extractingInvoice}
                onChange={(e) => handleInvoiceUpload(e.target.files?.[0] || null)}
              />
              {extractingInvoice && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--gray-500)", marginTop: 6 }}>
                  <span style={{
                    width: 13, height: 13, borderRadius: "50%",
                    border: "2px solid var(--gray-200)", borderTopColor: "var(--primary, #2563eb)",
                    animation: "spin 0.8s linear infinite", display: "inline-block",
                  }} />
                  Reading invoice and auto-filling fields…
                </span>
              )}
              {!extractingInvoice && invoiceFile && (
                <span style={{ fontSize: 11.5, color: "var(--gray-400)", display: "block", marginTop: 6 }}>
                  {invoiceFile.name} — fields below were auto-filled where possible. Please review everything before saving.
                </span>
              )}
              {!extractingInvoice && !invoiceFile && editingId && (
                <span style={{ fontSize: 11.5, color: "var(--gray-400)", display: "block", marginTop: 6 }}>
                  Leave empty to keep the existing invoice. Supports text-based and scanned (OCR) PDFs.
                </span>
              )}
            </div>

            <div className="form-section-label">Service Details</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Service / Service Provider *</label>
                <input
                  className="input" list="service-billing-services" {...field("service")}
                  placeholder="e.g. Internet / ISP" disabled={reAddMode}
                />
                <datalist id="service-billing-services">
                  {SERVICE_OPTIONS.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="field">
                <label className="field-label">Vendor Name *</label>
                <input className="input" {...field("vendor")} placeholder="e.g. Airtel Business" disabled={reAddMode} />
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 18 }}>Billing Period</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Billing From Date *</label>
                <input className="input" type="date" {...field("billingFromDate")} />
              </div>
              <div className="field">
                <label className="field-label">Billing To Date *</label>
                <input className="input" type="date" {...field("billingToDate")} />
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 18 }}>Invoice Details (optional — auto-filled where possible)</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Invoice Number</label>
                <input className="input" {...field("invoiceNumber")} placeholder="e.g. INV-2026-0451" />
              </div>
              <div className="field">
                <label className="field-label">Invoice Date</label>
                <input className="input" type="date" {...field("invoiceDate")} />
              </div>
              <div className="field">
                <label className="field-label">Invoice Reference</label>
                <input className="input" {...field("invoiceReference")} placeholder="e.g. PO-2026-118" />
              </div>
              <div className="field">
                <label className="field-label">Currency</label>
                <input className="input" {...field("currency")} placeholder="e.g. INR" />
              </div>
              <div className="field">
                <label className="field-label">GST Amount</label>
                <input className="input" type="number" min="0" step="0.01" {...field("gstAmount")} placeholder="0.00" />
              </div>
              <div className="field">
                <label className="field-label">Total Amount (incl. GST)</label>
                <input className="input" type="number" min="0" step="0.01" {...field("totalAmount")} placeholder="0.00" />
              </div>
              <div className="field" style={{ gridColumn: "span 3" }}>
                <label className="field-label">Description / Service Details</label>
                <input className="input" {...field("serviceDetails")} placeholder="What this invoice covers" />
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 18 }}>Payment Details</div>

            <div className="form-grid">
              <div className="field">
                <label className="field-label">Amount (₹) *</label>
                <input className="input" type="number" min="0" step="0.01" {...field("amount")} placeholder="15000" />
              </div>
              <div className="field">
                <label className="field-label">Payment Date *</label>
                <input className="input" type="date" {...field("paymentDate")} />
              </div>
              <div className="field">
                <label className="field-label">Due Date (optional)</label>
                <input className="input" type="date" {...field("dueDate")} />
              </div>
              <div className="field">
                <label className="field-label">Status *</label>
                <select className="input" {...field("status")}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label className="field-label">Remarks (optional)</label>
                <input className="input" {...field("remarks")} placeholder="Any additional notes" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--gray-100)" }}>
              <button className="btn btn-primary" onClick={savePayment} disabled={saving}>
                {saving ? "Saving…" : reAddMode ? "✓ Save New Billing" : editingId ? "✓ Save Changes" : "✓ Save Payment"}
              </button>
              <button className="btn btn-secondary" onClick={cancelForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing Records Table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="card-title">Billing Records</div>
            <div className="card-subtitle">
              {loading ? "Loading…" : `${filtered.length} of ${payments.length} records`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select className="input" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="input" style={{ width: 170 }} value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Payment Date: Newest First</option>
              <option value="asc">Payment Date: Oldest First</option>
            </select>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters((v) => !v)}
              style={{ position: "relative" }}
            >
              ⚙ Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }}
                width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="input"
                style={{ paddingLeft: 34, width: 210 }}
                placeholder="Search service or vendor…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 14 }}
                >✕</button>
              )}
            </div>
            <button className="btn btn-secondary btn-icon" onClick={() => { loadData(); loadDashboard(); }} disabled={loading} style={{ fontSize: 16 }}>
              ↻
            </button>
          </div>
        </div>

        {/* ── Filters by Service / Vendor / Billing Period / Payment Date ── */}
        {showFilters && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end",
            padding: "14px 24px", borderBottom: "1px solid var(--gray-100)", background: "var(--gray-50)",
          }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Service</label>
              <select className="input" style={{ width: 170 }} value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}>
                <option value="All">All services</option>
                {serviceOptionsInData.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Vendor</label>
              <select className="input" style={{ width: 170 }} value={filters.vendor} onChange={(e) => setFilters((f) => ({ ...f, vendor: e.target.value }))}>
                <option value="All">All vendors</option>
                {vendorOptionsInData.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Billing Period From</label>
              <input className="input" type="date" style={{ width: 160 }} value={filters.periodFrom} onChange={(e) => setFilters((f) => ({ ...f, periodFrom: e.target.value }))} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Billing Period To</label>
              <input className="input" type="date" style={{ width: 160 }} value={filters.periodTo} onChange={(e) => setFilters((f) => ({ ...f, periodTo: e.target.value }))} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Payment Date</label>
              <input className="input" type="date" style={{ width: 160 }} value={filters.paymentDate} onChange={(e) => setFilters((f) => ({ ...f, paymentDate: e.target.value }))} />
            </div>
            {activeFilterCount > 0 && (
              <button className="btn btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
            )}
          </div>
        )}

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th><th>Vendor</th><th>Billing Period</th><th>Amount</th><th>Payment Date</th>
                  <th>Status</th><th>Invoice</th><th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>{[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🧾</div>
            <div className="empty-title">
              {searchText || statusFilter !== "All" || activeFilterCount > 0 ? "No records match your filters" : "No billing records yet"}
            </div>
            <div className="empty-sub">
              {searchText || statusFilter !== "All" || activeFilterCount > 0
                ? "Try adjusting your search or filters."
                : "Click 'Add Service Payment' to record your first vendor billing."}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th><th>Vendor</th><th>Billing Period</th><th>Amount</th><th>Payment Date</th>
                  <th>Status</th><th>Invoice</th><th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: "var(--gray-900)" }}>{p.service}</td>
                    <td style={{ color: "var(--gray-700)" }}>{p.vendor}</td>
                    <td style={{ color: "var(--gray-600)", whiteSpace: "nowrap", fontSize: 12.5 }}>
                      {formatPeriod(p.billingFromDate, p.billingToDate)}
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--gray-800)" }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: "var(--gray-600)", whiteSpace: "nowrap" }}>{formatDate(p.paymentDate)}</td>
                    <td><BillingStatusBadge status={p.status} /></td>
                    <td>
                      {p.invoicePath ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="action-view" onClick={() => openInvoice(p, "view")} title="View PDF invoice">
                            👁 View
                          </button>
                          <button className="action-view" onClick={() => openInvoice(p, "download")} title="Download PDF invoice">
                            ⬇ Download
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--gray-300)", fontSize: 12 }}>No invoice</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <button className="action-view" onClick={() => setViewingPayment(p)} title="View billing details">
                          👁
                        </button>
                        <button className="action-readd" onClick={() => openReAddForm(p)} title="Re-Add Billing (new billing period)">
                          ＋ Re-Add
                        </button>
                        <button className="action-history" onClick={() => openHistory(p)} title="View Billing History">
                          🕘 History
                        </button>
                        <button className="action-edit" onClick={() => openEditForm(p)} title="Edit this record">
                          ✏️
                        </button>
                        <button
                          className="action-delete"
                          onClick={() => deletePayment(p)}
                          disabled={deletingId === p.id}
                          title="Delete record"
                        >
                          {deletingId === p.id ? "⏳" : "🗑"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View Billing Detail Modal ── */}
      {viewingPayment && (
        <div className="modal-overlay" onClick={() => setViewingPayment(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 className="modal-title">Billing Record Details</h3>
                <div className="card-subtitle" style={{ marginTop: 4 }}>
                  {viewingPayment.service} · {viewingPayment.vendor}
                  {viewingPayment.billingId && <> · {viewingPayment.billingId}</>}
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setViewingPayment(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div>
                  <div className="field-label">Service</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{viewingPayment.service}</div>
                </div>
                <div>
                  <div className="field-label">Vendor</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{viewingPayment.vendor}</div>
                </div>
                <div>
                  <div className="field-label">Billing Period</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>
                    {formatPeriod(viewingPayment.billingFromDate, viewingPayment.billingToDate)}
                  </div>
                </div>
                <div>
                  <div className="field-label">Amount</div>
                  <div style={{ fontWeight: 700, color: "var(--gray-900)" }}>{formatCurrency(viewingPayment.amount)}</div>
                </div>
                <div>
                  <div className="field-label">Payment Date</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{formatDate(viewingPayment.paymentDate)}</div>
                </div>
                <div>
                  <div className="field-label">Due Date</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{formatDate(viewingPayment.dueDate)}</div>
                </div>
                <div>
                  <div className="field-label">Status</div>
                  <div style={{ marginTop: 4 }}><BillingStatusBadge status={viewingPayment.status} /></div>
                </div>
                <div>
                  <div className="field-label">Invoice</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>
                    {viewingPayment.invoicePath ? "Uploaded" : "Not uploaded"}
                  </div>
                </div>
                {viewingPayment.invoiceNumber && (
                  <div>
                    <div className="field-label">Invoice Number</div>
                    <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{viewingPayment.invoiceNumber}</div>
                  </div>
                )}
                {viewingPayment.invoiceDate && (
                  <div>
                    <div className="field-label">Invoice Date</div>
                    <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{formatDate(viewingPayment.invoiceDate)}</div>
                  </div>
                )}
                {viewingPayment.invoiceReference && (
                  <div>
                    <div className="field-label">Invoice Reference</div>
                    <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{viewingPayment.invoiceReference}</div>
                  </div>
                )}
                {viewingPayment.gstAmount != null && (
                  <div>
                    <div className="field-label">GST Amount</div>
                    <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{formatCurrency(viewingPayment.gstAmount)}</div>
                  </div>
                )}
                {viewingPayment.totalAmount != null && (
                  <div>
                    <div className="field-label">Total Amount</div>
                    <div style={{ fontWeight: 700, color: "var(--gray-900)" }}>{formatCurrency(viewingPayment.totalAmount)}</div>
                  </div>
                )}
                {viewingPayment.currency && (
                  <div>
                    <div className="field-label">Currency</div>
                    <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{viewingPayment.currency}</div>
                  </div>
                )}
              </div>
              {viewingPayment.serviceDetails && (
                <div>
                  <div className="field-label">Description / Service Details</div>
                  <div style={{ color: "var(--gray-700)", marginTop: 4 }}>{viewingPayment.serviceDetails}</div>
                </div>
              )}
              {viewingPayment.remarks && (
                <div>
                  <div className="field-label">Remarks</div>
                  <div style={{ color: "var(--gray-700)", marginTop: 4 }}>{viewingPayment.remarks}</div>
                </div>
              )}
              {viewingPayment.invoicePath && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openInvoice(viewingPayment, "view")}>👁 View Invoice</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openInvoice(viewingPayment, "download")}>⬇ Download</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { const p = viewingPayment; setViewingPayment(null); openHistory(p); }}>🕘 Billing History</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setViewingPayment(null)}>Close</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { const p = viewingPayment; setViewingPayment(null); openEditForm(p); }}>✏️ Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing History Modal (Requirement 6) ── */}
      {historyTarget && (
        <div className="modal-overlay" onClick={closeHistory}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 className="modal-title">Billing History</h3>
                <div className="card-subtitle" style={{ marginTop: 4 }}>
                  {historyTarget.service} · {historyTarget.vendor} — latest billing period first
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={closeHistory} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              {historyLoading ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--gray-400)" }}>Loading history…</div>
              ) : historyRecords.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--gray-400)" }}>No billing history found.</div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Billing Period</th><th>Amount</th><th>Payment Date</th>
                        <th>Due Date</th><th>Status</th><th>Invoice</th><th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRecords.map((r) => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: "var(--gray-900)" }}>
                            {formatPeriod(r.billingFromDate, r.billingToDate)}
                          </td>
                          <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.paymentDate)}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.dueDate)}</td>
                          <td><BillingStatusBadge status={r.status} /></td>
                          <td>
                            {r.invoicePath ? (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="action-view" onClick={() => openInvoice(r, "view")} title="View invoice">👁</button>
                                <button className="action-view" onClick={() => openInvoice(r, "download")} title="Download invoice">⬇</button>
                              </div>
                            ) : (
                              <span style={{ color: "var(--gray-300)", fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td style={{ color: "var(--gray-500)", fontSize: 12.5, maxWidth: 160 }}>{r.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .action-view {
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          color: var(--primary-700);
          border-radius: 7px;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex; align-items: center; gap: 4px;
          white-space: nowrap;
        }
        .action-view:hover { background: var(--primary-100); transform: translateY(-1px); }
        .action-edit {
          background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;
          border-radius: 7px; padding: 5px 10px; font-size: 13px; cursor: pointer;
          transition: all 0.15s ease; display: flex; align-items: center; gap: 4px;
        }
        .action-edit:hover { background: #dbeafe; border-color: #93c5fd; transform: translateY(-1px); }
        .action-readd {
          background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857;
          border-radius: 7px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
        }
        .action-readd:hover { background: #d1fae5; border-color: #6ee7b7; transform: translateY(-1px); }
        .action-history {
          background: #fdf4ff; border: 1px solid #f0abfc; color: #a21caf;
          border-radius: 7px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
        }
        .action-history:hover { background: #fae8ff; border-color: #e879f9; transform: translateY(-1px); }
        .action-delete {
          background: transparent; border: none; color: var(--gray-400);
          cursor: pointer; font-size: 18px; padding: 4px 6px; border-radius: 6px; transition: 0.15s;
        }
        .action-delete:hover { background: #fee2e2; color: #ef4444; }
        .action-delete:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </Layout>
  );
}
