import React, { useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";

import { API_BASE as API, COMPANY_DISPLAY } from "../config";

// ── Step constants ────────────────────────────────────────────────
const STEP_FORM  = "form";   // enter current + new password
const STEP_OTP   = "otp";    // enter the OTP that was emailed
const STEP_DONE  = "done";   // success screen

export default function Settings() {
  const toast = useToast();

  // ── Organisation (session-only) ──────────────────────────────────
  const [orgName, setOrgName] = useState(COMPANY_DISPLAY || "Vettri Asset");

  const saveOrg = () => {
    if (!orgName.trim()) { toast("Organization name can't be empty.", "error"); return; }
    toast("Preferences saved for this session.", "success");
  };

  // ── Password change state ─────────────────────────────────────────
  const [step, setStep]         = useState(STEP_FORM);
  const [pwd, setPwd]           = useState({ current: "", next: "", confirm: "" });
  const [otp, setOtp]           = useState("");
  const [otpInfo, setOtpInfo]   = useState(null);   // message from server
  const [loading, setLoading]   = useState(false);

  const pf = (key) => (e) => setPwd((p) => ({ ...p, [key]: e.target.value }));

  // Step 1 → send OTP
  const requestOtp = async () => {
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      toast("All password fields are required.", "error"); return;
    }
    if (pwd.next.length < 8) {
      toast("New password must be at least 8 characters.", "error"); return;
    }
    if (pwd.next !== pwd.confirm) {
      toast("New passwords do not match.", "error"); return;
    }
    setLoading(true);
    try {
    const token = sessionStorage.getItem("iam_token");
      const { data } = await axios.post(
        `${API}/api/admin/change-password/request-otp`,
        { currentPassword: pwd.current, newPassword: pwd.next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOtpInfo(data.message);
      setStep(STEP_OTP);
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || "Request failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → confirm OTP and save
  const confirmChange = async () => {
    if (!otp.trim()) { toast("Please enter the verification code.", "error"); return; }
    setLoading(true);
    try {
      const token = sessionStorage.getItem("iam_token");
      await axios.post(
        `${API}/api/admin/change-password/confirm`,
        { currentPassword: pwd.current, newPassword: pwd.next, otp: otp.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStep(STEP_DONE);
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || "Invalid or expired code.", "error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPwd({ current: "", next: "", confirm: "" });
    setOtp("");
    setOtpInfo(null);
    setStep(STEP_FORM);
  };

  return (
    <Layout title="Settings" subtitle="System configuration and preferences">
      <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Organisation ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Organization</div>
              <div className="card-subtitle">Display preferences for this session</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label className="field-label">Organization Name</label>
              <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">API Endpoint</label>
              <input
                className="input" value={`${API}`} disabled
                style={{ background: "var(--gray-50)", color: "var(--gray-500)", cursor: "not-allowed" }}
              />
              <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 4 }}>
                Set via build configuration — not editable here.
              </div>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={saveOrg}>
              Save Changes
            </button>
          </div>
        </div>

        {/* ── Security / Change Password ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Security</div>
              <div className="card-subtitle">Administrator account password</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Step 1: password fields ── */}
            {step === STEP_FORM && (
              <>
                <div className="field">
                  <label className="field-label">Current Password</label>
                  <input className="input" type="password" placeholder="••••••••"
                    value={pwd.current} onChange={pf("current")} />
                </div>
                <div className="field">
                  <label className="field-label">New Password</label>
                  <input className="input" type="password" placeholder="Minimum 8 characters"
                    value={pwd.next} onChange={pf("next")} />
                </div>
                <div className="field">
                  <label className="field-label">Confirm New Password</label>
                  <input className="input" type="password" placeholder="••••••••"
                    value={pwd.confirm} onChange={pf("confirm")} />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ alignSelf: "flex-start" }}
                  onClick={requestOtp}
                  disabled={loading}
                >
                  {loading ? "Sending OTP…" : "Update Password"}
                </button>
              </>
            )}

            {/* ── Step 2: OTP entry ── */}
            {step === STEP_OTP && (
              <>
                <div style={{
                  background: "#eff6ff", border: "1px solid #bfdbfe",
                  borderRadius: 10, padding: "14px 18px",
                  fontSize: 13.5, color: "#1e40af", display: "flex", gap: 10, alignItems: "flex-start"
                }}>
                  <span style={{ fontSize: 18 }}>📧</span>
                  <span>{otpInfo}</span>
                </div>
                <div className="field">
                  <label className="field-label">Verification Code</label>
                  <input
                    className="input"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    style={{ letterSpacing: 8, fontSize: 20, fontWeight: 700, textAlign: "center" }}
                    autoFocus
                  />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={confirmChange}
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? "Verifying…" : "✓ Confirm Change"}
                  </button>
                  <button className="btn btn-secondary" onClick={reset} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3: success ── */}
            {step === STEP_DONE && (
              <>
                <div style={{
                  background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 10, padding: "16px 20px",
                  fontSize: 14, color: "#166534", display: "flex", gap: 10, alignItems: "center"
                }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <span>Password changed successfully. Use your new password on next login.</span>
                </div>
                <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={reset}>
                  Change Again
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
