import { getEnv } from "@/utils/env";

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

  const base = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";
  const url = typeof input === 'string' && input.startsWith('/') ? `${base}${input}` : input;

  const res = await fetch(url, {
    credentials: init?.credentials ?? "include",
    ...init,
    headers,
  });

  if (res.status === 401) {
    console.warn("⚠️ 401 Unauthorized - Token expired, redirecting to sign-in:", input);

    // Clear all auth data
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userFullName");
      localStorage.removeItem("authMethod");
      localStorage.removeItem("orgId");
      localStorage.removeItem("orgIds");
      localStorage.removeItem("facilityId");
      localStorage.removeItem("role");
      localStorage.removeItem("groups");
      localStorage.removeItem("userId");
      localStorage.removeItem("primaryGroup");
      localStorage.removeItem("selectedTenant");
      localStorage.removeItem("tenantName");

      // Redirect to sign-in page
      window.location.href = "/signin";
    }
  }
  return res;
}
