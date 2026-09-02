import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, ArrowLeft, AlertTriangle, Boxes,
  Eye, EyeOff, Search, BadgeCheck, PieChart,
  UserCog, Lock, Check, Smartphone, KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GOOGLE_CLIENT_ID, COMPANY_NAME, COMPANY_DISPLAY, PAY_LOGO_PATH, WALLET_ICON_PATH, GROUP_LOGO_PATH } from "../config";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import "../components/ForgotPasswordModal.css";
import "./Login.css";

const REMEMBER_KEY = "haoda_remember_login";

// Feature highlights shown on the branding panel — purely presentational,
// no functional dependency on anything below.
const FEATURES = [
  { icon: Boxes,       label: "Asset Tracking" },
  { icon: UserCog,     label: "Employee Management" },
  { icon: Search,      label: "AI Search" },
  { icon: BadgeCheck,  label: "Warranty Management" },
  { icon: PieChart,    label: "Reports & Analytics" },
  { icon: ShieldCheck, label: "Secure Authentication" },
];

// Brand asset paths are driven by build-time configuration.
const WALLET_ICON = WALLET_ICON_PATH;
const BRAND_LOGO = PAY_LOGO_PATH;
const GROUP_LOGO = GROUP_LOGO_PATH;

function WalletSpinner({ size = 18 }) {
  return (
    <span className="wallet-spinner" style={{ width: size, height: size }}>
      <img src={WALLET_ICON} alt="" />
    </span>
  );
}

export default function Login() {
  const { login, verifyAdminOtp, resendAdminOtp, loginWithGoogle, requestMobileOtp, verifyMobileOtp } = useAuth();
  const navigate   = useNavigate();

  const [tab, setTab]           = useState("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ── "Sign in with" method: password (default) or mobile OTP ──────────
  const [loginMethod, setLoginMethod] = useState("password"); // "password" | "mobile"
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileOtp, setMobileOtp] = useState(["", "", "", "", "", ""]);
  const [mobileStage, setMobileStage] = useState("enter-number"); // "enter-number" | "verify"
  const [mobileResendCooldown, setMobileResendCooldown] = useState(0);
  const [mobileExpirySeconds, setMobileExpirySeconds] = useState(300);
  const mobileOtpRefs = useRef([]);

  // ── Google Sign-In (Google Identity Services) ─────────────────────────
  const googleButtonRef = useRef(null);
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // ── Presentational-only additions (no auth-logic impact) ─────────────
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const [mounted, setMounted]           = useState(false);

  // Restore a remembered identifier/tab (never the password) on first load.
  useEffect(() => {
    setMounted(true);
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null");
      if (saved?.identifier) {
        setIdentifier(saved.identifier);
        setTab(saved.tab === "employee" ? "employee" : "admin");
        setRememberMe(true);
      }
    } catch { /* ignore malformed storage */ }
  }, []);

  // ── Admin 2FA step ─────────────────────────────────────────────────
  const [stage, setStage] = useState("credentials"); // "credentials" | "2fa"
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (stage !== "2fa") return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
      setOtpExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

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

  const backToCredentials = () => {
    setStage("credentials");
    setChallengeToken("");
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await verifyAdminOtp(challengeToken, code);
    setLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    const result = await resendAdminOtp(challengeToken);
    setLoading(false);
    if (result.success) {
      setResendCooldown(result.resendAfterSeconds ?? 30);
      setOtpExpirySeconds(result.expiresInSeconds ?? 300);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } else {
      setError(result.message);
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Google Sign-In: load the GSI script once, then render its button
  // into googleButtonRef. The credential callback reads tabRef.current
  // (not `tab` directly) so it always uses whichever role tab is selected
  // at the moment the user actually completes the Google popup, not
  // whichever tab was active when the script first loaded. ──────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const handleCredential = async (response) => {
      setError("");
      setLoading(true);
      const result = await loginWithGoogle(response.credential, tabRef.current);
      setLoading(false);
      if (!result.success) {
        setError(result.message);
        return;
      }
      if (result.role === "admin") {
        navigate("/dashboard");
      } else if (result.mustChangePassword) {
        navigate("/emp/password", { state: { forced: true } });
      } else {
        navigate("/emp/dashboard");
      }
    };

    const renderButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline", size: "large", width: 320, text: "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }
    const existing = document.getElementById("google-identity-script");
    if (existing) { existing.addEventListener("load", renderButton); return; }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, loginMethod]);

  // ── Mobile OTP login ──────────────────────────────────────────────────
  useEffect(() => {
    if (mobileStage !== "verify") return;
    const t = setInterval(() => {
      setMobileResendCooldown((s) => (s > 0 ? s - 1 : 0));
      setMobileExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [mobileStage]);

  const handleMobileOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...mobileOtp];
    next[idx] = digit;
    setMobileOtp(next);
    if (digit && idx < 5) mobileOtpRefs.current[idx + 1]?.focus();
  };
  const handleMobileOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !mobileOtp[idx] && idx > 0) mobileOtpRefs.current[idx - 1]?.focus();
  };

  const handleSendMobileOtp = async (e) => {
    e.preventDefault();
    if (!mobileNumber.trim()) { setError("Enter your registered mobile number."); return; }
    setError("");
    setLoading(true);
    const result = await requestMobileOtp(mobileNumber.trim(), tab);
    setLoading(false);
    if (!result.success) { setError(result.message); return; }
    setMobileResendCooldown(result.resendAfterSeconds ?? 30);
    setMobileExpirySeconds(result.expiresInSeconds ?? 300);
    setMobileOtp(["", "", "", "", "", ""]);
    setMobileStage("verify");
    setTimeout(() => mobileOtpRefs.current[0]?.focus(), 50);
  };

  const handleResendMobileOtp = async () => {
    setLoading(true);
    setError("");
    const result = await requestMobileOtp(mobileNumber.trim(), tab);
    setLoading(false);
    if (result.success) {
      setMobileResendCooldown(result.resendAfterSeconds ?? 30);
      setMobileExpirySeconds(result.expiresInSeconds ?? 300);
      setMobileOtp(["", "", "", "", "", ""]);
      mobileOtpRefs.current[0]?.focus();
    } else {
      setError(result.message);
    }
  };

  const handleVerifyMobileOtp = async (e) => {
    e.preventDefault();
    const code = mobileOtp.join("");
    if (code.length !== 6) { setError("Enter the 6-digit code."); return; }
    setError("");
    setLoading(true);
    const result = await verifyMobileOtp(mobileNumber.trim(), code, tab);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      setMobileOtp(["", "", "", "", "", ""]);
      mobileOtpRefs.current[0]?.focus();
      return;
    }
    if (result.role === "admin") {
      navigate("/dashboard");
    } else if (result.mustChangePassword) {
      navigate("/emp/password", { state: { forced: true } });
    } else {
      navigate("/emp/dashboard");
    }
  };

  const backToMobileNumber = () => {
    setMobileStage("enter-number");
    setMobileOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    setMobileStage("enter-number");
    setMobileNumber("");
    setMobileOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(identifier.trim(), password, tab);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Invalid credentials. Please try again.");
      return;
    }

    // Presentational-only: remember the identifier + tab, never the password.
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ identifier: identifier.trim(), tab }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch { /* storage may be unavailable — non-critical */ }

    if (result.role === "admin") {
      if (result.twoFactorRequired) {
        setChallengeToken(result.challengeToken);
        setMaskedEmail(result.maskedEmail);
        setResendCooldown(result.resendAfterSeconds ?? 30);
        setOtpExpirySeconds(result.expiresInSeconds ?? 300);
        setOtp(["", "", "", "", "", ""]);
        setStage("2fa");
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      } else {
        navigate("/dashboard");
      }
    } else if (result.mustChangePassword) {
      navigate("/emp/password", { state: { forced: true } });
    } else {
      navigate("/emp/dashboard");
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setIdentifier("");
    setPassword("");
    setError("");
    setShowPassword(false);
    setMobileStage("enter-number");
    setMobileNumber("");
    setMobileOtp(["", "", "", "", "", ""]);
  };

  return (
    <div className={`login-page ${mounted ? "is-mounted" : ""}`}>
      {/* ── Left panel — branding, illustration & feature highlights (60%) ── */}
      <div className="login-left">
        <div className="login-left-grid" />
        <div className="login-left-orb login-left-orb-a" />
        <div className="login-left-orb login-left-orb-b" />

        <div className="login-left-top">
            <div className="login-hero-tag">
            <span className="login-hero-tag-dot" />
            {`Trusted by IT teams across ${COMPANY_NAME}`}
          </div>

          <h1 className="login-hero-title">
            IT Asset Management,
            <br />
            <span>built for the modern</span>
            <br />
            enterprise.
          </h1>
          <p className="login-hero-desc">
            Track, assign, and audit every laptop, license, and device your
            organization owns — with enterprise-grade security built in.
          </p>

          {/* Feature highlights */}
          <ul className="login-features">
            {FEATURES.map(({ icon: Icon, label }, i) => (
              <li className="login-feature" key={label} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="login-feature-check"><Check size={12} strokeWidth={3} /></span>
                <span className="login-feature-icon"><Icon size={15} /></span>
                <span className="login-feature-text">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Illustration — built around the Haoda Pay wallet mark, never the
            full text logo, per brand rules for this surface. */}
        <div className="login-illustration" aria-hidden="true">
          <div className="login-illustration-glow" />
          <div className="login-illustration-card login-illustration-card--main">
            <div className="lic-row">
              <div className="lic-dot" /><div className="lic-dot" /><div className="lic-dot" />
            </div>
            <div className="lic-bar lic-bar--w70" />
            <div className="lic-bar lic-bar--w40" />
            <div className="lic-stats">
              <div className="lic-stat">
                <div className="lic-stat-bar" style={{ height: "62%" }} />
                <div className="lic-stat-bar" style={{ height: "84%" }} />
                <div className="lic-stat-bar" style={{ height: "45%" }} />
                <div className="lic-stat-bar" style={{ height: "70%" }} />
                <div className="lic-stat-bar" style={{ height: "92%" }} />
              </div>
            </div>
          </div>
          <div className="login-illustration-card login-illustration-card--badge">
            <div className="lic-badge-icon">
              <img src={WALLET_ICON} alt="" />
            </div>
            <div>
              <div className="lic-badge-title">Assets Secured</div>
              <div className="lic-badge-sub">Verified &amp; encrypted</div>
            </div>
          </div>
          <div className="login-illustration-card login-illustration-card--float">
            <ShieldCheck size={14} />
            <span>2FA Active</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — sign in card (40%) ────────────────────────────── */}
      <div className="login-right">
        <div className="login-box fade-in">
          {/* Primary branding: Haoda Pay logo (with text) */}
          <div className="login-box-brand">
            <img src={BRAND_LOGO} alt={COMPANY_DISPLAY} className="login-primary-logo" />
          </div>

          {/* Mobile-only compact brand row — wallet mark, not the full logo */}
          <div className="login-box-brand-mobile">
            <div className="login-brand-icon login-brand-icon--sm">
              <img src={WALLET_ICON} alt={COMPANY_DISPLAY} />
            </div>
            <span>{COMPANY_DISPLAY}</span>
          </div>

          <div className="login-box-header">
            <div className="login-box-title">{stage === "2fa" ? "Verify it's you" : "Welcome back"}</div>
              <div className="login-box-sub">
              {stage === "2fa"
                ? `Enter the 6-digit code sent to ${maskedEmail}`
                : `Sign in to your ${COMPANY_DISPLAY} account`}
            </div>
          </div>

          {stage === "credentials" && (
            <>
              {/* Role tabs */}
              <div className="login-tabs" role="tablist" aria-label="Sign in as">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "admin"}
                  className={`login-tab ${tab === "admin" ? "active" : ""}`}
                  onClick={() => switchTab("admin")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Admin
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "employee"}
                  className={`login-tab ${tab === "employee" ? "active" : ""}`}
                  onClick={() => switchTab("employee")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Employee
                </button>
              </div>

              {/* Sign-in method toggle */}
              <div className="login-method-toggle" role="tablist" aria-label="Sign-in method">
                <button
                  type="button"
                  className={`login-method-btn ${loginMethod === "password" ? "active" : ""}`}
                  onClick={() => switchLoginMethod("password")}
                >
                  <KeyRound size={13} /> Password
                </button>
                <button
                  type="button"
                  className={`login-method-btn ${loginMethod === "mobile" ? "active" : ""}`}
                  onClick={() => switchLoginMethod("mobile")}
                >
                  <Smartphone size={13} /> Mobile OTP
                </button>
              </div>

              {loginMethod === "mobile" ? (
                mobileStage === "enter-number" ? (
                  <form className="login-form" onSubmit={handleSendMobileOtp} noValidate>
                    <div className="login-field">
                      <label className="login-label" htmlFor="login-mobile">Registered Mobile Number</label>
                      <input
                        id="login-mobile"
                        className="login-input"
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        autoFocus
                        autoComplete="tel"
                        required
                      />
                    </div>

                    {error && (
                      <div className="login-error" role="alert" aria-live="assertive">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {error}
                      </div>
                    )}

                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? <><WalletSpinner size={17} /> Sending code…</> : "Send Verification Code"}
                    </button>
                  </form>
                ) : (
                  <form className="login-form" onSubmit={handleVerifyMobileOtp}>
                    <div className="login-box-sub" style={{ marginBottom: 4 }}>
                      Enter the 6-digit code sent to your registered mobile number
                    </div>

                    {error && (
                      <div className="fpwd-error" style={{ marginBottom: 4 }} role="alert" aria-live="assertive">
                        <AlertTriangle size={14} /> {error}
                      </div>
                    )}

                    <div className="fpwd-otp-row">
                      {mobileOtp.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => (mobileOtpRefs.current[i] = el)}
                          className="fpwd-otp-box"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleMobileOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleMobileOtpKeyDown(i, e)}
                          aria-label={`Digit ${i + 1} of 6`}
                        />
                      ))}
                    </div>

                    <div className="fpwd-meta-row">
                      <span className={`fpwd-expiry ${mobileExpirySeconds <= 30 ? "is-low" : ""}`}>
                        Code expires in {fmtTime(Math.max(mobileExpirySeconds, 0))}
                      </span>
                      <button
                        type="button"
                        className="fpwd-link-btn"
                        disabled={mobileResendCooldown > 0 || loading}
                        onClick={handleResendMobileOtp}
                      >
                        {mobileResendCooldown > 0 ? `Resend in ${mobileResendCooldown}s` : "Resend code"}
                      </button>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 14 }}>
                      {loading ? <><WalletSpinner size={17} /> Verifying…</> : "Verify & Sign In"}
                    </button>

                    <button type="button" className="fpwd-back-btn" onClick={backToMobileNumber} style={{ margin: "12px auto 0" }}>
                      <ArrowLeft size={13} /> Use a different number
                    </button>
                  </form>
                )
              ) : (
              <form className="login-form" onSubmit={handleLogin} noValidate>
                {tab === "admin" ? (
                  <div className="login-field">
                    <label className="login-label" htmlFor="login-identifier">Username</label>
                    <input
                      id="login-identifier"
                      className="login-input"
                      type="text"
                      placeholder="Enter username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoFocus
                      autoComplete="username"
                      required
                    />
                  </div>
                ) : (
                  <div className="login-field">
                    <label className="login-label" htmlFor="login-identifier">Employee ID</label>
                    <input
                      id="login-identifier"
                      className="login-input"
                      type="text"
                      placeholder="e.g. EMP001"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoFocus
                      autoComplete="username"
                      required
                    />
                  </div>
                )}

                <div className="login-field">
                  <div className="login-label-row">
                    <label className="login-label" htmlFor="login-password">Password</label>
                    {tab === "admin" && (
                      <button
                        type="button"
                        className="login-forgot-link"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="login-input-shell">
                    <input
                      id="login-password"
                      className="login-input login-input--pw"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="login-pw-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((s) => !s)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="login-remember-box" aria-hidden="true" />
                  Remember me on this device
                </label>

                {error && (
                  <div className="login-error" role="alert" aria-live="assertive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading
                    ? <><WalletSpinner size={17} /> Signing in…</>
                    : <>Sign in as {tab === "admin" ? "Admin" : "Employee"}</>}
                </button>
              </form>
              )}

              {GOOGLE_CLIENT_ID && loginMethod === "password" && (
                <>
                  <div className="login-divider"><span>or continue with</span></div>
                  <div ref={googleButtonRef} className="login-google-btn-slot" />
                </>
              )}

              {tab === "admin" && loginMethod === "password" && (
                <div className="login-2fa-note">
                  <ShieldCheck size={13} /> Protected by two-factor email verification
                </div>
              )}
            </>
          )}

          {stage === "2fa" && (
            <form className="login-form" onSubmit={handleVerifyOtp}>
              {error && (
                <div className="fpwd-error" style={{ marginBottom: 4 }} role="alert" aria-live="assertive">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

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
                    aria-label={`Digit ${i + 1} of 6`}
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
                  onClick={handleResendOtp}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>

              <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 14 }}>
                {loading
                  ? <><WalletSpinner size={17} /> Verifying…</>
                  : "Verify & Sign In"}
              </button>

              <button type="button" className="fpwd-back-btn" onClick={backToCredentials} style={{ margin: "12px auto 0" }}>
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </form>
          )}

          {/* Secure login message */}
          <div className="login-secure-msg">
            <Lock size={12} /> Your connection is encrypted and secure
          </div>
        </div>
      </div>

      {/* ── Footer — full width, Haoda Group attribution only ───────────── */}
          <footer className="login-footer">
        <div className="login-footer-brand">
          <span>Powered by</span>
          <img src={GROUP_LOGO} alt={COMPANY_NAME} className="login-footer-logo" />
        </div>
        <div className="login-footer-meta">
          <span>Version 2.0.0</span>
          <span className="login-footer-dot" />
          <span>© 2026 {COMPANY_NAME}. All Rights Reserved.</span>
        </div>
      </footer>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
}
