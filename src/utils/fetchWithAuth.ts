import { getEnv } from "@/utils/env";
import { refreshAccessToken, clearAuth } from "@/utils/authUtils";
import { jwtDecode } from "jwt-decode";

// Prevent concurrent 401 redirects — only the first one wins
let _redirecting = false;

/** Extract tenant/org from JWT token and cache in localStorage */
function resolveTenant(token: string | null): string | null {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem("selectedTenant");
  if (cached) return cached;
  // Fallback: extract org from JWT
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      const org = decoded.organization;
      let tenant: string | null = null;
      if (typeof org === "string") tenant = org;
      else if (Array.isArray(org) && org.length > 0) tenant = String(org[0]);
      else if (org && typeof org === "object" && org.name) tenant = String(org.name);
      // Also check org_alias claim
      if (!tenant && decoded.org_alias) tenant = String(decoded.org_alias);
      if (tenant) {
        localStorage.setItem("selectedTenant", tenant);
        return tenant;
      }
    } catch { /* ignore decode errors */ }
  }
  return null;
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const get = (k: string) =>
    typeof window !== "undefined" ? localStorage.getItem(k) : null;

  const token = get("token") || get("authToken");

  const selectedTenant = resolveTenant(token);

  const authHeaders: Record<string, string> = {
    "Accept": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(selectedTenant && { "X-Tenant-Name": selectedTenant }),
  };

  const headers = new Headers(init?.headers || {});
  Object.entries(authHeaders).forEach(([k, v]) => headers.set(k, v));

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (isFormData) {
    headers.delete("Content-Type"); // ← critical for multi-part uploads
  } else if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const base = getEnv("NEXT_PUBLIC_API_URL");
  const url = typeof input === 'string' && input.startsWith('/') ? `${base}${input}` : input;

  const res = await fetch(url, {
    credentials: init?.credentials ?? "include",
    ...init,
    headers,
  });

  if (res.status === 401) {
    // Try to refresh the token before giving up.
    // refreshAccessToken() has its own singleton guard, so concurrent
    // 401s from multiple in-flight requests won't cause duplicate refreshes.
    try {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request with the new token
        const newToken = get("token") || get("authToken");
        const retryHeaders = new Headers(init?.headers || {});
        const retryTenant = get("selectedTenant");
        Object.entries({
          "Accept": "application/json",
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
          ...(retryTenant && { "X-Tenant-Name": retryTenant }),
        }).forEach(([k, v]) => retryHeaders.set(k, v));

        if (isFormData) {
          retryHeaders.delete("Content-Type");
        } else if (init?.body && !retryHeaders.has("Content-Type")) {
          retryHeaders.set("Content-Type", "application/json");
        }

        const retryRes = await fetch(url, {
          credentials: init?.credentials ?? "include",
          ...init,
          headers: retryHeaders,
        });

        if (retryRes.status !== 401) {
          return retryRes; // Retry succeeded
        }
      }
    } catch {
      // refresh threw — fall through to sign-out
    }

    // Refresh failed or retry still got 401 — redirect to sign-in (once only)
    console.warn("⚠️ 401 Unauthorized - Session expired, redirecting to sign-in:", input);

    if (typeof window !== "undefined" && !_redirecting) {
      _redirecting = true;
      clearAuth();
      window.location.href = "/signin";
    }
  }
  return res;
}
