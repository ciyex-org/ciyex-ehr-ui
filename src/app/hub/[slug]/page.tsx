"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import AppConfigForm from "@/components/hub/AppConfigForm";
import {
    ArrowLeft, Star, Download, Trash2, Loader2,
    CheckCircle2, Shield, ExternalLink, Settings, Play,
} from "lucide-react";
import Link from "next/link";
import { getAppIcon, getAppColorClass } from "@/components/hub/appIcons";
import { toast, confirmDialog } from "@/utils/toast";
import { formatDisplayDate } from "@/utils/dateUtils";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
const MARKETPLACE_BASE = () => (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface AppDetail {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string;
    iconUrl?: string;
    averageRating?: number;
    reviewCount?: number;
    featured?: boolean;
    features?: string[];
    configSchema?: Record<string, any>;
    smartLaunchUrl?: string;
    fhirResources?: string[];
    fhirScopes?: string;
    smartRedirectUrls?: string;
    cdsHooksDiscoveryUrl?: string;
    supportedHooks?: string[];
    extensionPoints?: string[];
    media?: { url: string; type: string; altText?: string }[];
    pricingPlans?: {
        id: string;
        name: string;
        model: string;
        amount?: number;
        perUnit?: number;
        unit?: string;
        currency?: string;
        interval?: string;
        trialDays?: number;
        isDefault?: boolean;
    }[];
    certifications?: { certificationType: string; certifiedDate?: string }[];
    vendor?: { name: string; slug: string };
}

interface Installation {
    id: string;
    appSlug: string;
    status: string;
    config: Record<string, any>;
    installedAt: string;
    installedBy?: string;
}

export default function AppDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [app, setApp] = useState<AppDetail | null>(null);
    const [installation, setInstallation] = useState<Installation | null>(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);
    const [uninstalling, setUninstalling] = useState(false);
    const [launching, setLaunching] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    const loadData = useCallback(async () => {
        if (!slug) return;
        try {
            const [appRes, installRes] = await Promise.all([
                fetch(`${MARKETPLACE_BASE()}/api/v1/apps/${slug}`),
                fetchWithAuth(`${API_BASE()}/api/app-installations/${slug}`),
            ]);

            if (appRes.ok) {
                const data = await appRes.json();
                setApp(data.data || data);
            }

            if (installRes.ok) {
                const data = await installRes.json();
                const inst = data.data || data;
                if (inst && inst.appSlug) {
                    setInstallation(inst);
                }
            }
        } catch (err) {
            console.error("Failed to load app detail:", err);
        }
        setLoading(false);
    }, [slug]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInstall = async () => {
        if (!app) return;
        setInstalling(true);
        try {
            const parseCommaList = (s?: string) =>
                s ? s.split(",").map((v) => v.trim()).filter(Boolean) : [];

            const res = await fetchWithAuth(`${API_BASE()}/api/app-installations`, {
                method: "POST",
                body: JSON.stringify({
                    appId: app.id,
                    appSlug: app.slug,
                    appName: app.name,
                    appIconUrl: app.iconUrl,
                    appCategory: app.category,
                    extensionPoints: app.extensionPoints || [],
                    cdsHooksDiscoveryUrl: app.cdsHooksDiscoveryUrl || null,
                    supportedHooks: app.supportedHooks || [],
                    smartLaunchUrl: app.smartLaunchUrl || null,
                    smartRedirectUris: parseCommaList(app.smartRedirectUrls),
                    fhirScopes: parseCommaList(app.fhirScopes),
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setInstallation(data.data || data);
            }
        } catch (err) {
            console.error("Install failed:", err);
        }
        setInstalling(false);
    };

    const handleUninstall = async () => {
        if (!(await confirmDialog("Are you sure you want to uninstall this app?"))) return;
        setUninstalling(true);
        try {
            const res = await fetchWithAuth(`${API_BASE()}/api/app-installations/${slug}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setInstallation(null);
            }
        } catch (err) {
            console.error("Uninstall failed:", err);
        }
        setUninstalling(false);
    };

    const handleSaveConfig = async (config: Record<string, any>) => {
        await fetchWithAuth(`${API_BASE()}/api/app-installations/${slug}/config`, {
            method: "PUT",
            body: JSON.stringify(config),
        });
        setInstallation((prev) => prev ? { ...prev, config } : prev);
    };

    const handleSmartLaunch = async () => {
        if (!app?.smartLaunchUrl) return;
        setLaunching(true);
        try {
            const res = await fetchWithAuth(`${API_BASE()}/api/smart-launch/${slug}`, {
                method: "POST",
                body: JSON.stringify({
                    smartLaunchUrl: app.smartLaunchUrl,
                    intent: "launch",
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const launchUrl = data.data?.launchUrl;
                if (launchUrl) {
                    window.open(launchUrl, "_blank", "noopener,noreferrer");
                }
            }
        } catch (err) {
            console.error("SMART launch failed:", err);
        }
        setLaunching(false);
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

    if (!app) {
        return (
            <AdminLayout>
                <div className="text-center py-24">
                    <p className="text-gray-500">App not found</p>
                    <Link href="/hub" className="text-blue-600 hover:underline mt-2 inline-block">
                        Back to Hub
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const isInstalled = installation != null && installation.status !== "uninstalled";
    const defaultPlan = app.pricingPlans?.find((p) => p.isDefault) || app.pricingPlans?.[0];

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Back nav */}
                <Link
                    href="/hub"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Hub
                </Link>

                {/* App Header */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-start gap-5">
                        {(() => {
                            const Icon = getAppIcon(app.slug);
                            const colorCls = getAppColorClass(app.slug);
                            return (
                                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${colorCls} flex items-center justify-center shrink-0`}>
                                    <Icon className="w-10 h-10" />
                                </div>
                            );
                        })()}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {app.name}
                                    </h1>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {app.category}
                                        </span>
                                        {app.vendor && (
                                            <span className="text-sm text-gray-400">
                                                by {app.vendor.name}
                                            </span>
                                        )}
                                        {app.averageRating != null && app.averageRating > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                                <span className="text-sm font-medium">{app.averageRating.toFixed(1)}</span>
                                                <span className="text-xs text-gray-400">({app.reviewCount})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {isInstalled ? (
                                        <>
                                            {app.smartLaunchUrl && (
                                                <button
                                                    onClick={handleSmartLaunch}
                                                    disabled={launching}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {launching ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                    Launch
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowConfig(!showConfig)}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Configure
                                            </button>
                                            <button
                                                onClick={handleUninstall}
                                                disabled={uninstalling}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                                            >
                                                {uninstalling ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                Uninstall
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleInstall}
                                            disabled={installing}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            {installing ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            Install
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isInstalled && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Installed {installation.installedAt && `on ${formatDisplayDate(installation.installedAt)}`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Configuration Panel */}
                {isInstalled && showConfig && app.configSchema && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Configuration
                        </h2>
                        <AppConfigForm
                            schema={app.configSchema}
                            currentConfig={installation.config || {}}
                            onSave={handleSaveConfig}
                        />
                    </div>
                )}

                {/* Description */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {app.description}
                    </p>
                </div>

                {/* Features */}
                {app.features && app.features.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Features</h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {app.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Screenshots/Media */}
                {app.media && app.media.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Screenshots</h2>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {app.media.filter((m) => m.type === "SCREENSHOT" || m.type === "IMAGE").map((m, i) => (
                                <img
                                    key={i}
                                    src={m.url}
                                    alt={m.altText || `Screenshot ${i + 1}`}
                                    className="h-48 rounded-lg border border-gray-200 dark:border-slate-600 object-cover shrink-0"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Pricing */}
                {app.pricingPlans && app.pricingPlans.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Pricing</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {app.pricingPlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`p-4 rounded-lg border ${
                                        plan.isDefault
                                            ? "border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10"
                                            : "border-gray-200 dark:border-slate-600"
                                    }`}
                                >
                                    <div className="font-medium text-gray-900 dark:text-white">{plan.name}</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {plan.model === "FREE" ? (
                                            "Free"
                                        ) : plan.model === "PER_UNIT" ? (
                                            <>
                                                ${plan.perUnit}
                                                <span className="text-sm font-normal text-gray-500">
                                                    /{plan.unit}/{plan.interval === "YEARLY" ? "yr" : "mo"}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                ${plan.amount}
                                                <span className="text-sm font-normal text-gray-500">
                                                    /{plan.interval === "YEARLY" ? "yr" : "mo"}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {plan.trialDays != null && plan.trialDays > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {plan.trialDays}-day free trial
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Certifications & Security */}
                {app.certifications && app.certifications.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-500" />
                            Certifications
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {app.certifications.map((cert, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-full"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {cert.certificationType}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Technical Details */}
                {(app.fhirResources || app.smartLaunchUrl || app.cdsHooksDiscoveryUrl || (app.extensionPoints && app.extensionPoints.length > 0)) && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Technical Details
                        </h2>
                        <div className="space-y-3 text-sm">
                            {app.extensionPoints && app.extensionPoints.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Extension Points: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {app.extensionPoints.map((ep) => (
                                            <span
                                                key={ep}
                                                className="px-2 py-0.5 text-xs bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                            >
                                                {ep}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {app.smartLaunchUrl && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">SMART Launch: </span>
                                    <span className="text-gray-500 flex items-center gap-1 inline">
                                        {app.smartLaunchUrl}
                                        <ExternalLink className="w-3 h-3 inline" />
                                    </span>
                                </div>
                            )}
                            {app.fhirResources && app.fhirResources.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">FHIR Resources: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {app.fhirResources.map((r) => (
                                            <span
                                                key={r}
                                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-300"
                                            >
                                                {r}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {app.fhirScopes && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Scopes: </span>
                                    <code className="text-xs text-gray-500 dark:text-gray-400">
                                        {app.fhirScopes}
                                    </code>
                                </div>
                            )}
                            {app.cdsHooksDiscoveryUrl && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">CDS Hooks Discovery: </span>
                                    <span className="text-gray-500 inline-flex items-center gap-1">
                                        {app.cdsHooksDiscoveryUrl}
                                        <ExternalLink className="w-3 h-3" />
                                    </span>
                                </div>
                            )}
                            {app.supportedHooks && app.supportedHooks.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Supported Hooks: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {app.supportedHooks.map((h) => (
                                            <span
                                                key={h}
                                                className="px-2 py-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 rounded text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                            >
                                                {h}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
