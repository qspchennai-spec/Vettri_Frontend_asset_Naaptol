import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import { API_BASE as BASE } from "../config";

// All employee self-service routes live under /api/employee/** on the
// backend (see EmployeeSelfController). Previously this hook called paths
// like `${BASE}/dashboard` directly, missing this prefix entirely — every
// employee page (dashboard, assets, profile, request history) was 404ing
// against the real API. Centralizing the prefix here means callers keep
// passing short paths ("/dashboard", "/assets", etc.) and only this one
// constant needs to be correct.
const EMPLOYEE_API = `${BASE}/api/employee`;

/**
 * Tiny wrapper around axios for employee self-service endpoints.
 * The Authorization header is already set by AuthContext on login.
 *
 * Usage:
 *   const { data, loading, error, reload } = useGet("/dashboard");
 */
export function useGet(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cancelRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    cancelRef.current = controller;

    axios
      .get(`${EMPLOYEE_API}${path}`, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((err) => {
        if (axios.isCancel(err)) return;
        setError(
          err.response?.data?.message ||
            "Couldn't reach the API. Is the Spring Boot server running on :8080?"
        );
      })
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    load();
    return () => cancelRef.current?.abort();
  }, [load]);

  return { data, loading, error, reload: load };
}

export async function postRequest(body) {
  const { data } = await axios.post(`${EMPLOYEE_API}/request`, body);
  return data;
}

export default BASE;
