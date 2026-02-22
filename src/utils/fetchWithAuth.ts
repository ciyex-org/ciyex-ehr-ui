import { getEnv } from "@/utils/env";
import { refreshAccessToken, clearAuth } from "@/utils/authUtils";

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const get = (k: string) =>
    typeof window !== "undefined" ? localStorage.getItem(k) : null;

  const token = get("token") || get("authToken");

  // Org is extracted from JWT on the backend — no need to send headers
  const authHeaders: Record<string, string> = {
    "Accept": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const headers = new Headers(init?.headers || {});
  Object.entries(authHeaders).forEach(([k, v]) => headers.set(k, v));

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (isFormData) {
    headers.delete("Content-Type"); // ← critical for multi-part uploads
  } else if (!headers.has("Content-Type")) {
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
        Object.entries({
          "Accept": "application/json",
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
        }).forEach(([k, v]) => retryHeaders.set(k, v));

        if (isFormData) {
          retryHeaders.delete("Content-Type");
        } else if (!retryHeaders.has("Content-Type")) {
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

    // Refresh failed or retry still got 401 — redirect to sign-in
    console.warn("⚠️ 401 Unauthorized - Session expired, redirecting to sign-in:", input);

    if (typeof window !== "undefined") {
      clearAuth();
      window.location.href = "/signin";
    }
  }
  return res;
}
