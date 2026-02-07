"use client";
import { getEnv } from "@/utils/env";
import Button from "@/components/ui/button/Button";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

export default function SignInForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const keycloakEnabled = getEnv("NEXT_PUBLIC_KEYCLOAK_ENABLED") === 'true';
    const keycloakUrl = getEnv("NEXT_PUBLIC_KEYCLOAK_URL");
    const keycloakRealm = getEnv("NEXT_PUBLIC_KEYCLOAK_REALM");
    const keycloakClientId = getEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded: { exp: number } = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    router.push("/calendar");
                }
            } catch {
                // Invalid token, proceed to login
            }
        }
    }, [router]);

    const generateCodeVerifier = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    const generateCodeChallenge = async (verifier: string) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hash)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    const handleKeycloakSignIn = async () => {
        if (!keycloakEnabled || !keycloakUrl || !keycloakRealm || !keycloakClientId) {
            console.error("Keycloak is not properly configured");
            return;
        }

        setLoading(true);

        try {
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            sessionStorage.setItem('pkce_code_verifier', codeVerifier);

            const redirectUri = window.location.origin + "/callback";
            const authUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth`;
            
            const params = new URLSearchParams({
                client_id: keycloakClientId,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: "openid profile email organization",
                code_challenge: codeChallenge,
                code_challenge_method: "S256",
            });

            window.location.href = `${authUrl}?${params.toString()}`;
        } catch (error) {
            console.error("Error during Keycloak sign-in:", error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 dark:bg-gray-900">
            {/* Left Column: Branding */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-black opacity-20"></div>
                <div className="z-10 flex flex-col items-center">
                    <div className="mb-8">
                        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-bold mb-4 text-center tracking-tight">
                        Ciyex EHR
                    </h1>
                    <p className="text-lg text-blue-100 max-w-md text-center font-light">
                        A new era of secure, efficient, and intelligent electronic health record management.
                    </p>
                </div>
            </div>

            {/* Right Column: Sign-In Form */}
            <div className="flex items-center justify-center p-6 sm:p-12 w-full bg-gray-50 dark:bg-gray-900">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden text-center mb-10">
                         <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ciyex EHR</h1>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
                                Secure Sign-In
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Use your Aran account to continue.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Button 
                                className="w-full flex items-center justify-center gap-3 py-3 text-base font-medium shadow-lg bg-blue-600 hover:bg-blue-700 text-white rounded-lg hover:shadow-xl transition-all duration-200" 
                                size="md" 
                                onClick={handleKeycloakSignIn}
                                disabled={loading || !keycloakEnabled}
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Redirecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                                        </svg>
                                        <span>Sign in with Aran</span>
                                    </>
                                )}
                            </Button>

                            {!keycloakEnabled && (
                                <div className="text-sm text-center text-amber-700 dark:text-amber-500 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>Keycloak is not configured.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                            By signing in, you agree to our{' '}
                            <a href="#" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                Terms
                            </a> & <a href="#" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                Privacy Policy
                            </a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
