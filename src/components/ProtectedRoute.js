import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "admin") return <Navigate to="/emp/dashboard" replace />;
  return children;
}

export function EmployeeRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "employee") return <Navigate to="/dashboard" replace />;

  // Force a first-time-login employee to change their password before
  // reaching any other employee page. We allow the password page itself
  // through to avoid a redirect loop.
  if (user.mustChangePassword && location.pathname !== "/emp/password") {
    return <Navigate to="/emp/password" replace state={{ forced: true }} />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === "admin") return <Navigate to="/dashboard" replace />;
  if (user?.role === "employee") {
    return (
      <Navigate
        to={user.mustChangePassword ? "/emp/password" : "/emp/dashboard"}
        replace
        state={user.mustChangePassword ? { forced: true } : undefined}
      />
    );
  }
  return children;
}
