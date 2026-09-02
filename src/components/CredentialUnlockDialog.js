import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { ShieldCheck, RefreshCw, AlertTriangle, X } from "lucide-react";
import "./CredentialUnlockDialog.css";

import { API_BASE as API } from "../config";

export default function CredentialUnlockDialog({ onUnlocked, onClose }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(300);
  const [otpSent, setOtpSent] = useState(false);

  const otpRefs = useRef([]);

  const requestOtp = useCallback(async (isResend = false) => {
    setSending(true);
    setError("");
    setOtpSent(false);

    try {
      const { data } = await axios.post(
        `${API}/api/network/credential-access/request-otp`
      );

      setOtpSent(true);
      setResendCooldown(data.resendAfterSeconds ?? 30);
      setExpirySeconds(data.expiresInSeconds ?? 300);
      setOtp(["", "", "", "", "", ""]);

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't send the verification code."
      );

      setOtpSent(false);

      setTimeout(() => {
        onClose();
      }, 2000);
    } finally {
      setSending(false);
    }
  }, [onClose]);

  useEffect(() => {
    requestOtp(false);
  }, [requestOtp]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
      setExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (idx, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const next = [...otp];
    next[idx] = digit;
    setOtp(next);

    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }

    if (digit && idx === 5 && next.every((d) => d)) {
      verify(next.join(""));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!text) return;

    e.preventDefault();

    const arr = text.split("").concat(Array(6).fill("")).slice(0, 6);

    setOtp(arr);

    if (text.length === 6) {
      verify(text);
    } else {
      otpRefs.current[Math.min(text.length, 5)]?.focus();
    }
  };

  const verify = async (code) => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const { data } = await axios.post(
        `${API}/api/network/credential-access/verify-otp`,
        {
          otp: code,
        }
      );

      onUnlocked(data.secondsRemaining ?? 60);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");

      setOtp(["", "", "", "", "", ""]);

      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const fmtTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      className="cud-backdrop"
      onMouseDown={(e) =>
        e.target === e.currentTarget && onClose()
      }
    >
      <div className="cud-modal fade-in">
        <button
          className="cud-close"
          onClick={onClose}
          type="button"
          title="Cancel"
        >
          <X size={16} />
        </button>

        <div className="cud-header">
          <div className="cud-icon">
            <ShieldCheck size={20} />
          </div>

          <div>
            <div className="cud-title">Verify it's you</div>

            <div className="cud-subtitle">
              {sending
                ? "Sending a verification code to your email…"
                : "Enter the 6-digit code sent to your registered email"}
            </div>
          </div>
        </div>

        <div className="cud-body">
          {error && (
            <div className="cud-error">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="cud-otp-row" onPaste={handlePaste}>
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => (otpRefs.current[i] = el)}
                className="cud-otp-box"
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={sending || verifying || !otpSent}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>

          <div className="cud-meta-row">
            <span
              className={`cud-expiry ${
                expirySeconds <= 30 ? "is-low" : ""
              }`}
            >
              {sending
                ? "—"
                : `Expires in ${fmtTime(Math.max(expirySeconds, 0))}`}
            </span>

            <button
              type="button"
              className="cud-link-btn"
              disabled={resendCooldown > 0 || sending}
              onClick={() => requestOtp(true)}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
            </button>
          </div>

          <button
            className="cud-btn-primary"
            disabled={
              sending ||
              verifying ||
              !otpSent ||
              otp.some((d) => !d)
            }
            onClick={() => verify(otp.join(""))}
          >
            {verifying ? (
              <>
                <RefreshCw
                  size={15}
                  className="cud-spin"
                />
                &nbsp;Verifying...
              </>
            ) : (
              "Verify & unlock"
            )}
          </button>

          <div className="cud-footnote">
            Access stays unlocked for 60 seconds, then locks automatically.
          </div>
        </div>
      </div>
    </div>
  );
}