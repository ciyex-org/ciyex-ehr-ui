import { jwtDecode } from "jwt-decode";

interface JWTPayload {
  organization?: string;
  [key: string]: any;
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const get = (k: string) =>
    typeof window !== "undefined" ? localStorage.getItem(k) : null;

  const token = get("token") || get("authToken");
  const orgId = get("orgId");
  const facilityId = get("facilityId");
  const role = get("role");

  // Extract tenant name from JWT token or use selectedTenant from localStorage
  let tenantName: string | null = null;
  if (token) {
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      const org = decoded.organization;
      
      console.log('🔍 JWT organization field:', org, 'Type:', typeof org);
      
      // Handle if organization is an object with a name property, or just a string
      if (typeof org === 'string') {
        tenantName = org;
      } else if (org && typeof org === 'object' && 'name' in org) {
        tenantName = String((org as any).name);
      } else if (Array.isArray(org) && org.length > 0) {
        // If it's an array, take the first element
        tenantName = typeof org[0] === 'string' ? org[0] : (org[0]?.name || null);
      }
      
      console.log('✅ Extracted tenantName:', tenantName);
      
      // Store in localStorage for easy access
      if (tenantName && typeof window !== "undefined") {
        localStorage.setItem("tenantName", tenantName);
      }
    } catch (error) {
      console.warn("Failed to decode JWT token:", error);
    }
  }
  
  // Fallback to selectedTenant or tenantName from localStorage if not in JWT
  if (!tenantName) {
    tenantName = get("selectedTenant") || get("tenantName");
  }

  const authHeaders: Record<string, string> = {
    "Accept": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantName && { "X-Tenant-Name": tenantName }),
    ...(orgId && { "X-Org-Id": orgId, "orgId": orgId }), // keep both while migrating
    ...(facilityId && { "X-Facility-Id": facilityId }),
    ...(role && { "X-Role": role }),
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

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
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
