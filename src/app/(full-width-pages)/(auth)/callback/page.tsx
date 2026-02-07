"use client";
import { getEnv } from "@/utils/env";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessibleTenants, setSelectedTenant } from "@/utils/tenantService";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");

    useEffect(() => {
        const handleCallback = async () => {
            // Get authorization code from URL
            const code = searchParams.get("code");
            const errorParam = searchParams.get("error");

            if (errorParam) {
                setError(`Authentication failed: ${errorParam}`);
                return;
            }

            if (!code) {
                setError("No authorization code received");
                return;
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
                    } = data.data;

                    console.log("📦 Extracted data - groups:", groups);

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

                    if (groups && groups.length > 0) {
                        localStorage.setItem("primaryGroup", groups[0]);
                    }

                    // Clean up PKCE code verifier
                    sessionStorage.removeItem('pkce_code_verifier');

                    console.log("🔍 About to check if user needs to select practice...");
                    
                    // Check if user already has a selected practice in localStorage
                    const existingTenant = localStorage.getItem('selectedTenant');
                    
                    // Check if user needs to select practice
                    try {
                        console.log("Checking accessible tenants for user...");
                        const tenantsData = await getAccessibleTenants(token);
                        console.log("Tenants data:", tenantsData);
                        
                        // If user already has a selected practice, skip selection and go to calendar
                        if (existingTenant) {
                            console.log("User already has selected practice:", existingTenant);
                            console.log("Skipping practice selection, going to calendar");
                            router.push("/calendar");
                        } else if (tenantsData.requiresSelection && tenantsData.tenants?.length > 1) {
                            // Multi-tenant user without selected practice, redirect to practice selection
                            console.log("User has multiple tenants, redirecting to practice selection");
                            router.push("/select-practice");
                        } else if (tenantsData.tenants?.length === 1) {
                            // Single tenant, auto-select and redirect to calendar
                            console.log("User has single tenant, auto-selecting:", tenantsData.tenants[0]);
                            setSelectedTenant(tenantsData.tenants[0]);
                            router.push("/calendar");
                        } else {
                            // No tenants or full access, redirect to calendar
                            console.log("User has full access or no tenants, redirecting to calendar");
                            router.push("/calendar");
                        }
                    } catch (tenantErr) {
                        console.error("Failed to check tenants:", tenantErr);
                        // Fallback to calendar - don't block login
                        console.log("Continuing to calendar despite tenant check failure");
                        router.push("/calendar");
                    }
                } else {
                    setError(data.message || "Authentication failed");
                }
            } catch (err) {
                console.error("Callback error:", err);
                setError("An error occurred during authentication");
            }
        };

        handleCallback();
    }, [searchParams, router, apiUrl]);

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
