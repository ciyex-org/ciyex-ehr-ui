"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getEnv } from "@/utils/env";
import AdminLayout from "@/app/(admin)/layout";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    Star,
    CheckCircle2,
    XCircle,
    Shield,
    Layers,
    Code,
    DollarSign,
    Minus,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface AppDetail {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string;
    iconUrl?: string;
    averageRating?: number;
    reviewCount?: number;
    features?: string[];
    smartLaunchUrl?: string;
    fhirResources?: string[];
    fhirScopes?: string;
    extensionPoints?: string[];
    pricingPlans?: {
        name: string;
        model: string;
        amount?: number;
        currency?: string;
        interval?: string;
        trialDays?: number;
    }[];
    certifications?: { certificationType: string }[];
    vendor?: { name: string; slug: string };
}

function getPriceDisplay(app: AppDetail): string {
    if (!app.pricingPlans || app.pricingPlans.length === 0) return "Free";
    const plan = app.pricingPlans[0];
    if (plan.model === "FREE" || !plan.amount || plan.amount === 0) return "Free";
    const symbol = (plan.currency || "USD") === "USD" ? "$" : plan.currency;
    if (plan.interval === "YEARLY") return `${symbol}${plan.amount}/yr`;
    return `${symbol}${plan.amount}/mo`;
}

export default function CompareAppsPage() {
    const searchParams = useSearchParams();
    const slugs = useMemo(() => {
        const param = searchParams?.get("apps") || "";
        return param.split(",").filter(Boolean).slice(0, 4);
    }, [searchParams]);

    const [apps, setApps] = useState<AppDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slugs.length === 0) {
            setLoading(false);
            return;
        }
        const loadApps = async () => {
            const base = MARKETPLACE_BASE();
            const results = await Promise.allSettled(
                slugs.map((slug) =>
                    fetch(`${base}/api/v1/apps/${slug}`).then(async (res) => {
                        if (!res.ok) return null;
                        const data = await res.json();
                        return (data.data || data) as AppDetail;
                    })
                )
            );
            setApps(
                results
                    .filter((r): r is PromiseFulfilledResult<AppDetail | null> => r.status === "fulfilled")
                    .map((r) => r.value)
                    .filter((a): a is AppDetail => a != null)
            );
            setLoading(false);
        };
        loadApps();
    }, [slugs]);

    // Collect all unique features across apps
    const allFeatures = useMemo(() => {
        const set = new Set<string>();
        apps.forEach((a) => a.features?.forEach((f) => set.add(f)));
        return Array.from(set).sort();
    }, [apps]);

    // Collect all unique FHIR resources
    const allFhirResources = useMemo(() => {
        const set = new Set<string>();
        apps.forEach((a) => a.fhirResources?.forEach((r) => set.add(r)));
        return Array.from(set).sort();
    }, [apps]);

    // Collect all unique extension points
    const allExtensionPoints = useMemo(() => {
        const set = new Set<string>();
        apps.forEach((a) => a.extensionPoints?.forEach((ep) => set.add(ep)));
        return Array.from(set).sort();
    }, [apps]);

    // Collect all unique certifications
    const allCertifications = useMemo(() => {
        const set = new Set<string>();
        apps.forEach((a) => a.certifications?.forEach((c) => set.add(c.certificationType)));
        return Array.from(set).sort();
    }, [apps]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    if (apps.length < 2) {
        return (
            <AdminLayout>
                <div className="text-center py-24 space-y-4">
                    <p className="text-gray-500 dark:text-gray-400">
                        Select at least 2 apps from the Hub to compare.
                    </p>
                    <Link
                        href="/hub"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Hub
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const colWidth = apps.length === 2 ? "w-1/2" : apps.length === 3 ? "w-1/3" : "w-1/4";

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/hub"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Compare Apps
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Side-by-side comparison of {apps.length} apps
                        </p>
                    </div>
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    {/* App Headers */}
                    <div className="flex border-b border-gray-200 dark:border-slate-700">
                        {apps.map((app) => (
                            <div key={app.slug} className={`${colWidth} p-5 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                <Link href={`/hub/${app.slug}`} className="group">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                                        {app.iconUrl ? (
                                            <img src={app.iconUrl} alt={app.name} className="w-10 h-10 object-contain" />
                                        ) : (
                                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {app.name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                        {app.name}
                                    </h3>
                                </Link>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {app.category}
                                </p>
                                {app.vendor && (
                                    <p className="text-xs text-gray-400 mt-0.5">by {app.vendor.name}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Rating Row */}
                    <CompareRow label="Rating" icon={<Star className="w-4 h-4 text-amber-500" />}>
                        {apps.map((app) => (
                            <div key={app.slug} className={`${colWidth} px-5 py-3 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                {app.averageRating != null && app.averageRating > 0 ? (
                                    <div className="flex items-center justify-center gap-1">
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {app.averageRating.toFixed(1)}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            ({app.reviewCount || 0})
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400">No reviews</span>
                                )}
                            </div>
                        ))}
                    </CompareRow>

                    {/* Pricing Row */}
                    <CompareRow label="Pricing" icon={<DollarSign className="w-4 h-4 text-emerald-500" />}>
                        {apps.map((app) => (
                            <div key={app.slug} className={`${colWidth} px-5 py-3 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {getPriceDisplay(app)}
                                </span>
                                {app.pricingPlans && app.pricingPlans.length > 1 && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        +{app.pricingPlans.length - 1} more plans
                                    </div>
                                )}
                            </div>
                        ))}
                    </CompareRow>

                    {/* SMART Launch Row */}
                    <CompareRow label="SMART Launch" icon={<Code className="w-4 h-4 text-blue-500" />}>
                        {apps.map((app) => (
                            <div key={app.slug} className={`${colWidth} px-5 py-3 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                <BoolBadge value={!!app.smartLaunchUrl} />
                            </div>
                        ))}
                    </CompareRow>

                    {/* Features Section */}
                    {allFeatures.length > 0 && (
                        <>
                            <SectionHeader label="Features" icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
                            {allFeatures.map((feature) => (
                                <CompareRow key={feature} label={feature} indent>
                                    {apps.map((app) => (
                                        <div key={app.slug} className={`${colWidth} px-5 py-2 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                            <BoolBadge value={app.features?.includes(feature) ?? false} />
                                        </div>
                                    ))}
                                </CompareRow>
                            ))}
                        </>
                    )}

                    {/* Extension Points Section */}
                    {allExtensionPoints.length > 0 && (
                        <>
                            <SectionHeader label="Extension Points" icon={<Layers className="w-4 h-4 text-indigo-500" />} />
                            {allExtensionPoints.map((ep) => (
                                <CompareRow key={ep} label={ep} indent mono>
                                    {apps.map((app) => (
                                        <div key={app.slug} className={`${colWidth} px-5 py-2 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                            <BoolBadge value={app.extensionPoints?.includes(ep) ?? false} />
                                        </div>
                                    ))}
                                </CompareRow>
                            ))}
                        </>
                    )}

                    {/* FHIR Resources Section */}
                    {allFhirResources.length > 0 && (
                        <>
                            <SectionHeader label="FHIR Resources" icon={<Code className="w-4 h-4 text-blue-500" />} />
                            {allFhirResources.map((res) => (
                                <CompareRow key={res} label={res} indent mono>
                                    {apps.map((app) => (
                                        <div key={app.slug} className={`${colWidth} px-5 py-2 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                            <BoolBadge value={app.fhirResources?.includes(res) ?? false} />
                                        </div>
                                    ))}
                                </CompareRow>
                            ))}
                        </>
                    )}

                    {/* Certifications Section */}
                    {allCertifications.length > 0 && (
                        <>
                            <SectionHeader label="Certifications" icon={<Shield className="w-4 h-4 text-emerald-500" />} />
                            {allCertifications.map((cert) => (
                                <CompareRow key={cert} label={cert} indent>
                                    {apps.map((app) => (
                                        <div key={app.slug} className={`${colWidth} px-5 py-2 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0`}>
                                            <BoolBadge
                                                value={app.certifications?.some((c) => c.certificationType === cert) ?? false}
                                            />
                                        </div>
                                    ))}
                                </CompareRow>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

function CompareRow({
    label,
    icon,
    indent,
    mono,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    indent?: boolean;
    mono?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="flex border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 even:bg-gray-50/50 dark:even:bg-slate-800/30">
            <div className={`w-56 shrink-0 px-5 py-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-slate-700 ${indent ? "pl-10" : ""}`}>
                {icon}
                <span className={mono ? "font-mono text-xs" : ""}>{label}</span>
            </div>
            <div className="flex flex-1">{children}</div>
        </div>
    );
}

function SectionHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 px-5 py-3 bg-gray-100 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
            {icon}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        </div>
    );
}

function BoolBadge({ value }: { value: boolean }) {
    return value ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
    ) : (
        <Minus className="w-4 h-4 text-gray-300 dark:text-slate-600 mx-auto" />
    );
}
