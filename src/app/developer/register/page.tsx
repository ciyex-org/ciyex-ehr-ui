"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { formatDisplayDate } from "@/utils/dateUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Code2, CheckCircle2, Loader2, AlertCircle, ArrowLeft,
    Building2, Globe, FileText,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface RegistrationStatus {
    registered: boolean;
    status?: string;
    vendorSlug?: string;
    vendorName?: string;
    createdAt?: string;
}

export default function DeveloperRegisterPage() {
    const router = useRouter();
    const [status, setStatus] = useState<RegistrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        companyName: "",
        slug: "",
        contactEmail: "",
        websiteUrl: "",
        bio: "",
        tosAccepted: false,
        baaAccepted: false,
    });

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/developer/status`);
                if (res.ok) {
                    setStatus(await res.json());
                }
            } catch {
                // Not registered yet
            }
            setLoading(false);
        })();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // Auto-generate slug from company name
    const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setForm((prev) => ({
            ...prev,
            companyName: name,
            slug: prev.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/developer/register`, {
                method: "POST",
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (res.ok) {
                setStatus({ registered: true, status: "pending", vendorSlug: data.slug, vendorName: data.name });
            } else {
                setError(data.message || data.error || "Registration failed");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    // Already registered — show status
    if (status?.registered) {
        return (
            <AdminLayout>
                <div className="max-w-lg mx-auto py-12">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center space-y-4">
                        {status.status === "active" ? (
                            <>
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    You&apos;re Approved!
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Your developer account <strong>{status.vendorName}</strong> is active.
                                </p>
                                <Link
                                    href="/developer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                >
                                    Go to Developer Dashboard
                                </Link>
                            </>
                        ) : status.status === "pending" ? (
                            <>
                                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Registration Pending
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Your developer account <strong>{status.vendorName}</strong> is pending admin approval.
                                    You&apos;ll be notified once approved.
                                </p>
                                <p className="text-xs text-gray-400">
                                    Registered {status.createdAt && formatDisplayDate(status.createdAt)}
                                </p>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Account {status.status}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Your developer account status is: <strong>{status.status}</strong>.
                                    Contact support for assistance.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    // Registration form
    return (
        <AdminLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                <Link
                    href="/hub"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Hub
                </Link>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <Code2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Become a Developer
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Register to build and publish apps on Ciyex Hub
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Company Name *
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        name="companyName"
                                        value={form.companyName}
                                        onChange={handleCompanyNameChange}
                                        required
                                        placeholder="Acme Health Tech"
                                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Developer Slug *
                                </label>
                                <input
                                    name="slug"
                                    value={form.slug}
                                    onChange={handleChange}
                                    required
                                    pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
                                    placeholder="acme-health"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Lowercase letters, numbers, and hyphens only
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Contact Email *
                            </label>
                            <input
                                name="contactEmail"
                                type="email"
                                value={form.contactEmail}
                                onChange={handleChange}
                                required
                                placeholder="dev@acmehealth.com"
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Website
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    name="websiteUrl"
                                    type="url"
                                    value={form.websiteUrl}
                                    onChange={handleChange}
                                    placeholder="https://acmehealth.com"
                                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                About Your Company
                            </label>
                            <textarea
                                name="bio"
                                value={form.bio}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Tell us about your company and the apps you plan to build..."
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        {/* Agreements */}
                        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    name="tosAccepted"
                                    id="tosAccepted"
                                    checked={form.tosAccepted}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="tosAccepted" className="text-sm text-gray-600 dark:text-gray-300">
                                    I agree to the{" "}
                                    <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer">
                                        Terms of Service
                                    </span>{" "}
                                    and{" "}
                                    <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer">
                                        Developer Agreement
                                    </span>{" "}
                                    *
                                </label>
                            </div>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    name="baaAccepted"
                                    id="baaAccepted"
                                    checked={form.baaAccepted}
                                    onChange={handleChange}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="baaAccepted" className="text-sm text-gray-600 dark:text-gray-300">
                                    <div className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                                        I agree to the{" "}
                                        <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer">
                                            Business Associate Agreement (BAA)
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Required for apps that handle Protected Health Information (PHI)
                                    </p>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !form.tosAccepted}
                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Code2 className="w-4 h-4" />
                            )}
                            Register as Developer
                        </button>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
