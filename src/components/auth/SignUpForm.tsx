"use client";
import { getEnv } from "@/utils/env";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAccessibleTenants, setSelectedTenant } from "@/utils/tenantService";

type Step = "org" | "admin" | "submitting";

export default function SignUpForm() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("org");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Org fields
    const [orgName, setOrgName] = useState("");
    const [orgAlias, setOrgAlias] = useState("");
    const [specialty, setSpecialty] = useState("");

    // Admin fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "";

    const generateAlias = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    };

    const handleOrgNameChange = (value: string) => {
        setOrgName(value);
        setOrgAlias(generateAlias(value));
    };

    const handleOrgSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim() || !orgAlias.trim()) return;
        setError("");
        setStep("admin");
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) return;

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${apiUrl}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgName: orgName.trim(),
                    orgAlias: orgAlias.trim(),
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: email.trim(),
                    password,
                    specialty: specialty.trim(),
                }),
            });

            const data = await res.json();

            if (data.success && data.data?.token) {
                // Store auth data (same as callback flow)
                const d = data.data;
                const fullName = `${d.firstName || ""} ${d.lastName || ""}`.trim();

                localStorage.setItem("token", d.token);
                if (d.refreshToken) localStorage.setItem("refreshToken", d.refreshToken);
                localStorage.setItem("userEmail", d.email || "");
                localStorage.setItem("userFullName", fullName);
                localStorage.setItem("userId", String(d.userId || ""));
                localStorage.setItem("groups", JSON.stringify(d.groups || []));
                localStorage.setItem("authMethod", "keycloak");
                localStorage.setItem("user", JSON.stringify(d));
                if (d.groups?.length > 0) localStorage.setItem("primaryGroup", d.groups[0]);

                // Handle tenant selection
                try {
                    const tenantsData = await getAccessibleTenants(d.token);
                    if (tenantsData.tenants?.length === 1) {
                        setSelectedTenant(tenantsData.tenants[0]);
                    }
                } catch {
                    // If org just created, tenant API may not have it yet — set manually
                    if (d.orgAlias) {
                        setSelectedTenant(d.orgAlias);
                    }
                }

                router.replace("/calendar");
            } else if (data.requiresLogin) {
                // Account created but auto-login failed
                router.replace("/signin");
            } else {
                setError(data.error || "Signup failed. Please try again.");
                setLoading(false);
            }
        } catch {
            setError("Unable to connect to the server. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 dark:bg-gray-900">
            {/* Left Column: Branding */}
            <div className="hidden lg:flex flex-col items-center justify-center p-12 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #465FFF 0%, #3449e3 50%, #2a3bc7 100%)" }}>
                <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                <div className="z-10 flex flex-col items-center max-w-lg">
                    <img src="/images/ciyex-logo-no-text.png" alt="Ciyex" className="w-20 h-20 mb-6 drop-shadow-lg" />
                    <h1 className="text-4xl font-bold mb-3 text-center tracking-tight">Ciyex EHR</h1>
                    <p className="text-base text-white/80 text-center font-light mb-8">
                        Get started in minutes. Set up your practice and start managing patients right away.
                    </p>
                    <div className="space-y-3 w-full">
                        {[
                            { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Go live in under 10 minutes" },
                            { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "Multi-provider, multi-location support" },
                            { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "HIPAA-compliant from day one" },
                            { icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4", label: "FHIR R4 data standard built-in" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm">
                                <svg className="w-5 h-5 text-white/90 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                </svg>
                                <span className="text-sm text-white/90">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Sign-Up Form */}
            <div className="flex items-center justify-center p-6 sm:p-12 w-full bg-gray-50 dark:bg-gray-900">
                <div className="w-full max-w-md">
                    <div className="lg:hidden text-center mb-8">
                        <img src="/images/ciyex-logo-no-text.png" alt="Ciyex" className="w-14 h-14 mx-auto mb-3" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ciyex EHR</h1>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mb-6">
                            <div className={`flex-1 h-1 rounded-full ${step === "org" || step === "admin" ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}`} />
                            <div className={`flex-1 h-1 rounded-full ${step === "admin" ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}`} />
                        </div>

                        {step === "org" && (
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Create your practice</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Step 1 of 2 — Practice information
                                    </p>
                                </div>

                                <form onSubmit={handleOrgSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Practice Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Sunrise Family Medicine"
                                            value={orgName}
                                            onChange={(e) => handleOrgNameChange(e.target.value)}
                                            autoFocus
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Organization ID <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="sunrise-family-medicine"
                                            value={orgAlias}
                                            onChange={(e) => setOrgAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">This will be your unique identifier</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Specialty
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Family Medicine, Cardiology"
                                            value={specialty}
                                            onChange={(e) => setSpecialty(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!orgName.trim() || !orgAlias.trim()}
                                        className="w-full py-2.5 text-sm font-semibold shadow-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-all duration-200"
                                    >
                                        Continue
                                    </button>
                                </form>
                            </>
                        )}

                        {step === "admin" && (
                            <>
                                <div className="mb-6">
                                    <button
                                        onClick={() => { setStep("org"); setError(""); }}
                                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back
                                    </button>
                                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Admin account</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Step 2 of 2 — Your admin credentials for <span className="font-medium text-gray-700 dark:text-gray-300">{orgName}</span>
                                    </p>
                                </div>

                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                First Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                autoFocus
                                                required
                                                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Last Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Doe"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                required
                                                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="john@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="At least 8 characters"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Confirm Password <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Confirm your password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                    </div>

                                    {error && (
                                        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-all duration-200"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Creating your practice...
                                            </>
                                        ) : (
                                            "Create Account"
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Already have an account?{" "}
                            <Link href="/signin" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
