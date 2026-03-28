"use client";
import { getEnv } from "@/utils/env";
import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessibleTenants, setSelectedTenant } from "@/utils/tenantService";
import { jwtDecode } from "jwt-decode";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
    const processingRef = useRef(false);

    useEffect(() => {
        const handleCallback = async () => {
            // Prevent duplicate processing
            if (processingRef.current) {
                console.log("⏭️ Already processing callback, skipping...");
                return;
            }
            processingRef.current = true;

            // Get authorization code from URL
            const code = searchParams?.get("code") ?? null;
            const errorParam = searchParams?.get("error") ?? null;

            if (errorParam) {
                setError(`Authentication failed: ${errorParam}`);
                processingRef.current = false;
                return;
            }

            if (!code) {
                setError("No authorization code received");
                processingRef.current = false;
                return;
            }

            // Check if this code was already processed
            const processedCode = sessionStorage.getItem('processed_auth_code');
            if (processedCode === code) {
                console.log("✅ Code already processed, redirecting...");
                const existingToken = localStorage.getItem('token');
                if (existingToken) {
                    router.replace("/calendar");
                    return;
                }
            }

            try {
                // Get PKCE code verifier from session storage
                const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
                
                // Exchange code for token with backend
                const response = await fetch(`${apiUrl}/api/auth/keycloak-callback`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code,
                        redirectUri: `${window.location.origin}/callback`,
                        codeVerifier: codeVerifier || undefined,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to exchange authorization code");
                }

                const data = await response.json();

                if (data.success && data.data) {
                    console.log("✅ Callback received data from backend");
                    
                    const {
                        token,
                        refreshToken,
                        email,
                        username,
                        firstName,
                        lastName,
                        groups,
                        userId,
                        practitionerFhirId,
                        patientFhirId,
                    } = data.data;

                    console.log("📦 Extracted data - groups:", groups);

                    // Enforce FHIR link for PROVIDER and PATIENT roles
                    // Staff/admin roles override — they don't need FHIR links
                    const rolesUpper = Array.isArray(groups)
                        ? groups.map((g: string) => g?.toUpperCase())
                        : [];
                    const staffRoles = ["ADMIN", "SUPER_ADMIN", "CIYEX_SUPER_ADMIN", "NURSE", "MA", "FRONT_DESK", "BILLING"];
                    const hasStaffRole = rolesUpper.some((r) => staffRoles.includes(r));
                    const isProvider = rolesUpper.includes("PROVIDER");
                    const isPatient = rolesUpper.includes("PATIENT");

                    if (!hasStaffRole && isProvider && !practitionerFhirId) {
                        setError(
                            "Your account is not linked to a provider record. Please contact your administrator to link your account."
                        );
                        processingRef.current = false;
                        return;
                    }
                    if (!hasStaffRole && isPatient && !patientFhirId) {
                        setError(
                            "Your account is not linked to a patient record. Please contact your administrator to link your account."
                        );
                        processingRef.current = false;
                        return;
                    }

                    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username || "";

                    // Store authentication data
                    localStorage.setItem("token", token);
                    if (refreshToken) {
                        localStorage.setItem("refreshToken", refreshToken);
                        console.log("✅ Stored refresh token");
                    } else {
                        console.warn("⚠️ No refresh token received from backend");
                    }
                    localStorage.setItem("userEmail", email || username || "");
                    localStorage.setItem("userFullName", fullName);
                    localStorage.setItem("userId", String(userId || ""));
                    localStorage.setItem("groups", JSON.stringify(groups || []));
                    localStorage.setItem("authMethod", "keycloak");
                    localStorage.setItem("user", JSON.stringify(data.data));
                    if (practitionerFhirId) localStorage.setItem("practitionerFhirId", practitionerFhirId);
                    if (patientFhirId) localStorage.setItem("patientFhirId", patientFhirId);

                    if (groups && groups.length > 0) {
                        localStorage.setItem("primaryGroup", groups[0]);
                    }

                    // Notify MenuContext that token is available (same-tab storage events don't fire)
                    window.dispatchEvent(new CustomEvent("auth-token-set", { detail: { key: "token" } }));

                    // Mark this code as processed
                    sessionStorage.setItem('processed_auth_code', code);

                    // Clean up PKCE code verifier
                    sessionStorage.removeItem('pkce_code_verifier');

                    // If the user is a PATIENT (without staff role), they should use the portal, not the EHR
                    if (isPatient && !hasStaffRole) {
                        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal-dev.ciyex.org";
                        console.log("👤 Patient user detected — redirecting to portal:", portalUrl);
                        window.location.href = portalUrl;
                        return;
                    }

                    console.log("🔍 About to check if user needs to select practice...");

                    // Always clear any stale tenant from a previous session so a different
                    // user doesn't inherit the wrong practice context.
                    localStorage.removeItem('selectedTenant');

                    // Check if user needs to select practice
                    try {
                        console.log("Checking accessible tenants for user...");
                        const tenantsData = await getAccessibleTenants(token);
                        console.log("Tenants data:", tenantsData);

                        if (tenantsData.requiresSelection && tenantsData.tenants?.length > 1) {
                            // Multi-tenant user — redirect to practice selection
                            console.log("User has multiple tenants, redirecting to practice selection");
                            router.replace("/select-practice");
                        } else if (tenantsData.tenants?.length === 1) {
                            // Single tenant, auto-select and redirect to calendar
                            console.log("User has single tenant, auto-selecting:", tenantsData.tenants[0]);
                            setSelectedTenant(tenantsData.tenants[0]);
                            router.replace("/calendar");
                        } else {
                            // No tenants or full access — extract org from JWT as fallback
                            try {
                                const decoded: any = jwtDecode(token);
                                const org = decoded.organization;
                                let tenant: string | null = null;
                                if (typeof org === "string") tenant = org;
                                else if (Array.isArray(org) && org.length > 0) tenant = String(org[0]);
                                else if (org && typeof org === "object" && org.name) tenant = String(org.name);
                                if (!tenant && decoded.org_alias) tenant = String(decoded.org_alias);
                                if (tenant) setSelectedTenant(tenant);
                            } catch { /* ignore decode errors */ }
                            router.replace("/calendar");
                        }
                    } catch (tenantErr) {
                        console.error("Failed to check tenants:", tenantErr);
                        // Extract org from JWT as fallback so API calls have tenant context
                        try {
                            const decoded: any = jwtDecode(token);
                            const org = decoded.organization;
                            let tenant: string | null = null;
                            if (typeof org === "string") tenant = org;
                            else if (Array.isArray(org) && org.length > 0) tenant = String(org[0]);
                            else if (org && typeof org === "object" && org.name) tenant = String(org.name);
                            if (!tenant && decoded.org_alias) tenant = String(decoded.org_alias);
                            if (tenant) setSelectedTenant(tenant);
                        } catch { /* ignore decode errors */ }
                        router.replace("/calendar");
                    }
                } else {
                    setError(data.message || "Authentication failed");
                    processingRef.current = false;
                }
            } catch (err) {
                console.error("Callback error:", err);
                setError("An error occurred during authentication");
                processingRef.current = false;
            }
        };

        handleCallback();
    }, []);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/signin")}
                        className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
                    >
                        Back to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing authentication...</p>
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
