import { getEnv } from "@/utils/env";
import { jwtDecode } from "jwt-decode";
// export function apiBase() {
//     return getEnv("NEXT_PUBLIC_API_BASE") || "http://localhost:8080";
// }
//
// export async function fetchWithOrg(input: string, init: RequestInit = {}) {
//     const headers = new Headers(init.headers || {});
//     const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : null;
//     const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
//
//     headers.set("Content-Type", "application/json");
//     if (orgId) headers.set("orgId", String(orgId));          // 👈 EXACT header name
//     if (token) headers.set("Authorization", `Bearer ${token}`);
//
//     const url = input.startsWith("http") ? input : `${apiBase()}${input}`;
//     return fetch(url, { ...init, headers, cache: "no-store" });
// }








// utils/fetchWithOrg.ts
export async function fetchWithOrg(input: RequestInfo, init: RequestInit = {}) {
    const base = getEnv("NEXT_PUBLIC_API_URL");

    // Build the final URL only if input is relative
    const url =
        typeof input === "string" && !/^https?:\/\//i.test(input)
            ? `${base}${input.startsWith("/") ? "" : "/"}${input}`
            : (input as string);

    const headers = new Headers(init.headers || {});
    headers.set("Accept", "application/json");
    // only set Content-Type for requests with a body
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    // Authorization header — only if the token looks valid (JWT format)
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // X-Tenant-Name header (NEW - replaces orgId)
    let selectedTenant = typeof window !== "undefined" ? localStorage.getItem("selectedTenant") : null;
    // Fallback: extract org from JWT if selectedTenant is missing
    if (!selectedTenant && token) {
        try {
            const decoded: any = jwtDecode(token);
            const org = decoded.organization;
            if (typeof org === "string") selectedTenant = org;
            else if (Array.isArray(org) && org.length > 0) selectedTenant = String(org[0]);
            else if (org && typeof org === "object" && org.name) selectedTenant = String(org.name);
            if (!selectedTenant && decoded.org_alias) selectedTenant = String(decoded.org_alias);
            if (selectedTenant && typeof window !== "undefined") localStorage.setItem("selectedTenant", selectedTenant);
        } catch { /* ignore */ }
    }
    if (selectedTenant) {
        headers.set("X-Tenant-Name", selectedTenant);
    }

    // orgId header (DEPRECATED - kept for backward compatibility)
    const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : null;
    if (orgId) headers.set("orgId", String(orgId));
    if (token && /\S+\.\S+\.\S+/.test(token)) {
        headers.set("Authorization", `Bearer ${token}`);
    } else {
        headers.delete("Authorization");
    }

    const res = await fetch(url, {
        ...init,
        headers,
        cache: "no-store",
        credentials: "include", // safe if your API ever uses cookies
    });

    // Handle 401 Unauthorized - token expired
    if (res.status === 401) {
        console.warn("⚠️ 401 Unauthorized - Token expired, redirecting to sign-in:", url);
        
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
            sessionStorage.removeItem("token");
            
            // Redirect to sign-in page
            window.location.href = "/signin";
        }
    }

    return res;
}





