import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Mail, ShieldCheck, KeyRound, Lock, Eye, EyeOff, RefreshCw, CheckCircle2, ArrowLeft, X, AlertTriangle } from "lucide-react";
import { useToast } from "../utils/Toast";
import "./ForgotPasswordModal.css";

import { API_BASE as API } from "../config";

// ── Password strength helper ──────────────────────────────────────────
function scorePassword(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}
const STRENGTH_LABEL = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
const STRENGTH_COLOR = ["#dc2626", "#f97316", "#f59e0b", "#22c55e", "#16a34a"];

export default function ForgotPasswordModal({ onClose }) {
  const toast = useToast();

  // step: "email" | "otp" | "reset" | "done"
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);

  const otpRefs = useRef([]);

  // Countdown ticking for both resend cooldown and OTP expiry.
  useEffect(() => {
    if (step !== "otp") return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
      setOtpExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  const closeOnBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Step 1: request OTP ──────────────────────────────────────────
  const requestOtp = async (isResend = false) => {
    if (!isResend && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/api/auth/admin/forgot-password`, { email: email.trim() });
      setResendCooldown(data.resendAfterSeconds ?? 30);
      setOtpExpirySeconds(data.expiresInSeconds ?? 300);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      toast(isResend ? "A new code has been sent." : "Verification code sent to your email.", "success");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handling ───────────────────────────────────────────
  const handleOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setOtp(text.split("").concat(Array(6).fill("")).slice(0, 6));
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  // ── Step 2: verify OTP ───────────────────────────────────────────
  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/api/auth/admin/verify-reset-otp`, { email: email.trim(), otp: code });
      setResetToken(data.resetToken);
      setStep("reset");
      toast("Code verified.", "success");
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired code.";
      setError(msg);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: reset password ───────────────────────────────────────
  const strength = scorePassword(newPassword);

  const resetPassword = async () => {
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/api/auth/admin/reset-password`, { resetToken, newPassword });
      setStep("done");
      toast("Password reset successfully.", "success");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fpwd-backdrop" onMouseDown={closeOnBackdrop}>
      <div className="fpwd-modal fade-in">
        <button className="fpwd-close" onClick={onClose} title="Close" type="button">
          <X size={16} />
        </button>

        {/* ── Header ── */}
        <div className="fpwd-header">
          <div className={`fpwd-icon ${step === "done" ? "is-success" : ""}`}>
            {step === "email" && <Mail size={20} />}
            {step === "otp" && <ShieldCheck size={20} />}
            {step === "reset" && <Lock size={20} />}
            {step === "done" && <CheckCircle2 size={20} />}
          </div>
          <div>
            <div className="fpwd-title">
              {step === "email" && "Reset your password"}
              {step === "otp" && "Enter verification code"}
              {step === "reset" && "Create a new password"}
              {step === "done" && "Password reset"}
            </div>
            <div className="fpwd-subtitle">
              {step === "email" && "We'll email a 6-digit code to your registered admin address."}
              {step === "otp" && `Code sent to ${email}`}
              {step === "reset" && "Choose a strong password you haven't used before."}
              {step === "done" && "You can now sign in with your new password."}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="fpwd-body">
          {error && (
            <div className="fpwd-error">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {step === "email" && (
            <>
              <div className="fpwd-field">
                <label className="fpwd-label">Registered admin email</label>
                <input
                  className="fpwd-input"
                  type="email"
                  placeholder="admin@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && requestOtp(false)}
                />
              </div>
              <button className="fpwd-btn-primary" disabled={loading} onClick={() => requestOtp(false)}>
                {loading ? <><RefreshCw size={15} className="fpwd-spin" /> Sending code…</> : "Send verification code"}
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="fpwd-otp-row" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    className="fpwd-otp-box"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>

              <div className="fpwd-meta-row">
                <span className={`fpwd-expiry ${otpExpirySeconds <= 30 ? "is-low" : ""}`}>
                  Code expires in {fmtTime(Math.max(otpExpirySeconds, 0))}
                </span>
                <button
                  type="button"
                  className="fpwd-link-btn"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => requestOtp(true)}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>

              <button className="fpwd-btn-primary" disabled={loading} onClick={verifyOtp} style={{ marginTop: 14 }}>
                {loading ? <><RefreshCw size={15} className="fpwd-spin" /> Verifying…</> : "Verify code"}
              </button>

              <button type="button" className="fpwd-back-btn" onClick={() => { setStep("email"); setError(""); }}>
                <ArrowLeft size={13} /> Use a different email
              </button>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="fpwd-field">
                <label className="fpwd-label">New password</label>
                <div className="fpwd-input-wrap">
                  <input
                    className="fpwd-input"
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <button type="button" className="fpwd-eye-btn" onClick={() => setShowPwd((v) => !v)}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {newPassword && (
                  <div className="fpwd-strength">
                    <div className="fpwd-strength-bar">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="fpwd-strength-seg"
                          style={{ background: i < strength ? STRENGTH_COLOR[strength] : "#e2e8f0" }}
                        />
                      ))}
                    </div>
                    <span className="fpwd-strength-label" style={{ color: STRENGTH_COLOR[strength] }}>
                      {STRENGTH_LABEL[strength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="fpwd-field">
                <label className="fpwd-label">Confirm new password</label>
                <div className="fpwd-input-wrap">
                  <input
                    className="fpwd-input"
                    type={showConfirmPwd ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && resetPassword()}
                  />
                  <button type="button" className="fpwd-eye-btn" onClick={() => setShowConfirmPwd((v) => !v)}>
                    {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <div className="fpwd-field-hint is-bad">Passwords don't match</div>
                )}
              </div>

              <button className="fpwd-btn-primary" disabled={loading} onClick={resetPassword}>
                {loading ? <><RefreshCw size={15} className="fpwd-spin" /> Updating…</> : <><KeyRound size={15} /> Reset password</>}
              </button>
            </>
          )}

          {step === "done" && (
            <button className="fpwd-btn-primary" onClick={onClose}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
