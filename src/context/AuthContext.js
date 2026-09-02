import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import { API_BASE as API } from "../config";

const AuthContext = createContext(null);

const STORAGE_KEY = "iam_user";
const TOKEN_KEY = "iam_token";

function loadUser() {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const persist = (userObj, token) => {
    setUser(userObj);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
    sessionStorage.setItem(TOKEN_KEY, token);
    // Attach the token to every future axios call automatically.
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  /**
   * Called right after any successful login (password, Google, or mobile
   * OTP) to load the full profile in one shot: name, email, mobile,
   * employeeId, department, designation, branch, profile photo, and the
   * resolved fine-grained permission set — this is what lets the sidebar
   * show only the modules this specific account is authorized for.
   *
   * Merges onto whatever `persist()` already saved (which always has at
   * least `role`/`name`/`id` from the login response itself) rather than
   * replacing it, so nothing regresses if /me is ever briefly unreachable.
   */
  const fetchMe = async (base) => {
    try {
      const { data } = await axios.get(`${API}/api/auth/me`);
      const merged = {
        ...base,
        name: data.name || base.name,
        email: data.email ?? base.email,
        mobile: data.mobile ?? null,
        dept: data.department ?? base.dept,
        roleTitle: data.designation ?? base.roleTitle,
        location: data.branch ?? base.location,
        profilePhotoUrl: data.profilePhotoUrl ?? null,
        roleName: data.roleName ?? null,
        roleLabel: data.roleLabel ?? null,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      };
      setUser(merged);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      // Non-fatal: the session still works with whatever `persist()` saved
      // from the login response itself, just without the extended profile
      // fields / permission list until the next successful /me call.
      return base;
    }
  };

  /**
   * identifier = admin username OR employee ID, depending on which tab the
   * Login page is on. We try the role implied by isAdminTab first; if that
   * 401s we don't fall through (avoids leaking which role a credential pair
   * is valid for) — the caller (Login.js) controls which endpoint to hit
   * via the `role` argument.
   *
   * Admin login is two-step (email OTP 2FA): this call only verifies the
   * password. If the account has a recovery email on file, the backend
   * returns a "challenge" (no token yet) and the caller must complete the
   * flow with verifyAdminOtp(). If there's no recovery email registered,
   * the backend skips 2FA and a token comes back immediately.
   */
  const login = async (identifier, password, role) => {
    try {
      if (role === "admin") {
        const { data } = await axios.post(`${API}/api/auth/admin/login`, {
          username: identifier,
          password,
        });

        if (data.twoFactorRequired) {
          return {
            success: true,
            role: "admin",
            twoFactorRequired: true,
            challengeToken: data.challengeToken,
            maskedEmail: data.maskedEmail,
            expiresInSeconds: data.expiresInSeconds,
            resendAfterSeconds: data.resendAfterSeconds,
            message: data.message,
          };
        }

        // No recovery email on file — backend already issued a real token.
        const adminUser = { role: "admin", name: data.login.name, id: "ADMIN" };
        persist(adminUser, data.login.token);
        await fetchMe(adminUser);
        return { success: true, role: "admin", twoFactorRequired: false };
      } else {
        const { data } = await axios.post(`${API}/api/auth/employee/login`, {
          employeeId: identifier,
          password,
        });
        const empUser = {
          role: "employee",
          id: data.employeeId,
          name: data.name,
          email: data.email,
          dept: data.department,
          roleTitle: data.designation,
          location: data.location,
          mustChangePassword: data.mustChangePassword,
        };
        persist(empUser, data.token);
        await fetchMe(empUser);
        return {
          success: true,
          role: "employee",
          mustChangePassword: data.mustChangePassword,
        };
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Invalid credentials. Please check and try again.";
      return { success: false, message };
    }
  };

  /** Step 2 of admin login: submits the emailed OTP against the challenge token from login(). */
  const verifyAdminOtp = async (challengeToken, otp) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/admin/verify-login-otp`, {
        challengeToken,
        otp,
      });
      const adminUser = { role: "admin", name: data.name, id: "ADMIN" };
      persist(adminUser, data.token);
      await fetchMe(adminUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Invalid or expired code.";
      return { success: false, message };
    }
  };

  /** Resends the login OTP for a pending 2FA challenge. */
  const resendAdminOtp = async (challengeToken) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/admin/resend-login-otp`, {
        challengeToken,
      });
      return {
        success: true,
        message: data.message,
        expiresInSeconds: data.expiresInSeconds,
        resendAfterSeconds: data.resendAfterSeconds,
      };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't resend the code. Please try again.";
      return { success: false, message };
    }
  };

  /**
   * Google Sign-In. `idToken` is the credential JWT returned by the Google
   * Identity Services JS library after the user picks an account; `role` is
   * "admin" or "employee", same convention as the existing tabs. Unlike
   * password login this is always single-step — the backend intentionally
   * never auto-provisions a new account from a Google login (see
   * AdminService/EmployeeService.loginWithGoogle Javadoc), so a failure here
   * usually means "ask IT/HR to link your Google account first," not "wrong
   * password."
   */
  const loginWithGoogle = async (idToken, role) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/google`, { idToken, loginAs: role });
      if (role === "admin") {
        const adminUser = { role: "admin", name: data.name, id: "ADMIN" };
        persist(adminUser, data.token);
        await fetchMe(adminUser);
        return { success: true, role: "admin" };
      }
      const empUser = {
        role: "employee",
        id: data.employeeId,
        name: data.name,
        email: data.email,
        dept: data.department,
        roleTitle: data.designation,
        location: data.location,
        mustChangePassword: data.mustChangePassword,
      };
      persist(empUser, data.token);
      await fetchMe(empUser);
      return { success: true, role: "employee", mustChangePassword: data.mustChangePassword };
    } catch (err) {
      const message = err.response?.data?.message || "Google sign-in failed. Please try again.";
      return { success: false, message };
    }
  };

  /** Step 1 of "Login with Mobile": sends an OTP to the registered mobile number. */
  const requestMobileOtp = async (mobile, role) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/mobile/request-otp`, { mobile, loginAs: role });
      return {
        success: true,
        message: data.message,
        expiresInSeconds: data.expiresInSeconds,
        resendAfterSeconds: data.resendAfterSeconds,
      };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't send the code. Please try again.";
      return { success: false, message };
    }
  };

  /** Step 2 of "Login with Mobile": verifies the OTP and completes login. */
  const verifyMobileOtp = async (mobile, otp, role) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/mobile/verify-otp`, { mobile, otp, loginAs: role });
      if (role === "admin") {
        const adminUser = { role: "admin", name: data.name, id: "ADMIN" };
        persist(adminUser, data.token);
        await fetchMe(adminUser);
        return { success: true, role: "admin" };
      }
      const empUser = {
        role: "employee",
        id: data.employeeId,
        name: data.name,
        email: data.email,
        dept: data.department,
        roleTitle: data.designation,
        location: data.location,
        mustChangePassword: data.mustChangePassword,
      };
      persist(empUser, data.token);
      await fetchMe(empUser);
      return { success: true, role: "employee", mustChangePassword: data.mustChangePassword };
    } catch (err) {
      const message = err.response?.data?.message || "Invalid or expired code.";
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user || user.role !== "employee") {
      return { success: false, message: "Not logged in as an employee." };
    }
    try {
      await axios.post(`${API}/api/auth/employee/change-password`, {
        employeeId: user.id,
        currentPassword,
        newPassword,
      });
      const updated = { ...user, mustChangePassword: false };
      setUser(updated);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || "Could not change password.";
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common["Authorization"];
  };

  /**
   * Checks whether the signed-in account has a given fine-grained
   * permission code (e.g. "ASSETS_WRITE") — this is what drives which
   * sidebar modules render. IMPORTANT default: if `user.permissions` is
   * entirely absent (an older cached session from before this feature
   * existed, which hasn't hit /me yet), this fails OPEN (returns true) so
   * existing logged-in admins aren't suddenly locked out of modules mid-
   * session. Once every admin has a resolved permission set (i.e. shortly
   * after rollout, once sessions have cycled), flip the fallback below to
   * `false` to fail closed instead — the safer long-term default.
   */
  const hasPermission = (code) => {
    if (!user) return false;
    if (user.role !== "admin") return true; // fine-grained gating below only applies to admin nav for now
    if (!Array.isArray(user.permissions)) return true; // TODO: flip to `false` once all sessions carry permissions
    return user.permissions.includes(code);
  };

  // Re-attach the bearer token on a hard refresh, since axios defaults
  // reset but sessionStorage persists.
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token && !axios.defaults.headers.common["Authorization"]) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  return (
    <AuthContext.Provider value={{
      user, login, verifyAdminOtp, resendAdminOtp, logout, changePassword,
      loginWithGoogle, requestMobileOtp, verifyMobileOtp, hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
