import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMPANY_DISPLAY } from "../config";
import './LoginAnimated.css';

/**
 * Haoda Asset — Login (animated, video-style)
 *
 * Wired to the real AuthContext (same login()/verifyAdminOtp() used by the
 * full pages/Login.js). Supports Admin + Employee, including admin email
 * 2FA. Not included here (kept out to keep this page simple): Google
 * Sign-In and mobile-OTP login — pages/Login.js still has those if needed.
 *
 * To make this the live login page, swap the import in App.js:
 *   import Login from "./pages/LoginAnimated";
 * (route stays "/", GuestRoute wrapper stays the same).
 */
export default function LoginAnimated() {
  const { login, verifyAdminOtp, resendAdminOtp } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('employee'); // "admin" | "employee"
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  // ── Admin 2FA step ──────────────────────────────────────────────────
  const [stage, setStage] = useState('credentials'); // "credentials" | "2fa"
  const [challengeToken, setChallengeToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);
  const otpRefs = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (stage !== '2fa') return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
      setOtpExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function switchTab(t) {
    setTab(t);
    setIdentifier('');
    setPassword('');
    setError('');
  }

  const handleOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setOtp(text.split('').concat(Array(6).fill('')).slice(0, 6));
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const backToCredentials = () => {
    setStage('credentials');
    setChallengeToken('');
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError(tab === 'admin' ? 'Enter your username and password.' : 'Enter your employee ID and password.');
      return;
    }
    setLoading(true);
    const result = await login(identifier.trim(), password, tab);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Invalid credentials. Please try again.');
      return;
    }

    if (result.role === 'admin') {
      if (result.twoFactorRequired) {
        setChallengeToken(result.challengeToken);
        setMaskedEmail(result.maskedEmail);
        setResendCooldown(result.resendAfterSeconds ?? 30);
        setOtpExpirySeconds(result.expiresInSeconds ?? 300);
        setOtp(['', '', '', '', '', '']);
        setStage('2fa');
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      } else {
        navigate('/dashboard');
      }
    } else if (result.mustChangePassword) {
      navigate('/emp/password', { state: { forced: true } });
    } else {
      navigate('/emp/dashboard');
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await verifyAdminOtp(challengeToken, code);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setError('');
    const result = await resendAdminOtp(challengeToken);
    setLoading(false);
    if (result.success) {
      setResendCooldown(result.resendAfterSeconds ?? 30);
      setOtpExpirySeconds(result.expiresInSeconds ?? 300);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else {
      setError(result.message);
    }
  }

  return (
    <div className={`al-stage ${started ? 'is-in' : ''}`}>
      <div className="al-scene">
        {/* ── Character ─────────────────────────────────────────────── */}
        <svg className="al-char" viewBox="0 0 140 220" width="180" height="280" aria-hidden="true">
          <ellipse className="al-shadow" cx="70" cy="208" rx="34" ry="7" />

          <g className="al-char-walk">
            <g className="al-arm al-arm-back">
              <rect x="-4" y="0" width="12" height="52" rx="6" transform="translate(50 70)" />
            </g>
            <g className="al-leg al-leg-back">
              <rect x="-7" y="0" width="14" height="58" rx="7" transform="translate(62 130)" />
            </g>
            <g className="al-leg al-leg-front">
              <rect x="-7" y="0" width="14" height="58" rx="7" transform="translate(78 130)" />
            </g>
            <rect className="al-torso" x="46" y="62" width="48" height="72" rx="20" />
            <circle className="al-head" cx="70" cy="40" r="24" />
            <path className="al-hair" d="M47 34 Q70 8 93 34 Q88 20 70 18 Q52 20 47 34Z" />
            <g className="al-arm al-arm-front">
              <rect x="-4" y="0" width="12" height="50" rx="6" transform="translate(92 70)" />
            </g>
            <rect className="al-bag" x="96" y="112" width="30" height="24" rx="4" />
            <rect className="al-bag-handle" x="106" y="104" width="10" height="10" rx="4" />
          </g>
        </svg>

        {/* ── Sign-in card ──────────────────────────────────────────── */}
        <div className="al-card">
          <p className="al-eyebrow anim-1">{COMPANY_DISPLAY}</p>
          <h1 className="al-title anim-1">
            {stage === '2fa' ? "Verify it's you" : 'Sign In'}
          </h1>

          {stage === 'credentials' && (
            <>
              <div className="al-tabs anim-1" role="tablist" aria-label="Sign in as">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'admin'}
                  className={`al-tab ${tab === 'admin' ? 'active' : ''}`}
                  onClick={() => switchTab('admin')}
                >
                  Admin
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'employee'}
                  className={`al-tab ${tab === 'employee' ? 'active' : ''}`}
                  onClick={() => switchTab('employee')}
                >
                  Employee
                </button>
              </div>

              {error && (
                <div className="al-error anim-2" role="alert">
                  <AlertCircle size={14} strokeWidth={2.25} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="al-field anim-2">
                  <input
                    type="text"
                    placeholder={tab === 'admin' ? 'Username' : 'Employee ID'}
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="al-field anim-3">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="al-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" className="al-submit anim-4" disabled={loading}>
                  {loading ? <span className="al-spinner" /> : (
                    <>Sign In <ArrowRight size={15} strokeWidth={2.5} /></>
                  )}
                </button>
              </form>
            </>
          )}

          {stage === '2fa' && (
            <form onSubmit={handleVerifyOtp}>
              <p className="al-subtitle anim-1">
                Enter the 6-digit code sent to {maskedEmail}
              </p>

              {error && (
                <div className="al-error anim-1" role="alert">
                  <AlertCircle size={14} strokeWidth={2.25} />
                  {error}
                </div>
              )}

              <div className="al-otp-row anim-2" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    className="al-otp-box"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    aria-label={`Digit ${i + 1} of 6`}
                  />
                ))}
              </div>

              <div className="al-otp-meta anim-3">
                <span className={otpExpirySeconds <= 30 ? 'is-low' : ''}>
                  Code expires in {fmtTime(Math.max(otpExpirySeconds, 0))}
                </span>
                <button
                  type="button"
                  className="al-link-btn"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>

              <button type="submit" className="al-submit anim-4" disabled={loading}>
                {loading ? <span className="al-spinner" /> : 'Verify & Sign In'}
              </button>

              <button type="button" className="al-back-btn anim-4" onClick={backToCredentials}>
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
