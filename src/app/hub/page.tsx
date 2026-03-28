"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import AppGrid from "@/components/hub/AppGrid";
import CategoryFilter from "@/components/hub/CategoryFilter";
import { Store, Search, Loader2, Package, GitCompareArrows, X, Code2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
const MARKETPLACE_BASE = () => (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface MarketplaceApp {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string;
    iconUrl?: string;
    averageRating?: number;
    reviewCount?: number;
    featured?: boolean;
    pricingPlans?: { model: string; amount?: number; perUnit?: number; unit?: string; currency?: string; interval?: string }[];
}

function getPricingLabel(app: MarketplaceApp): string {
    if (!app.pricingPlans || app.pricingPlans.length === 0) return "Free";
    const defaultPlan = app.pricingPlans.find(p => p.model !== "FREE") || app.pricingPlans[0];
    if (defaultPlan.model === "FREE") return "Free";
    const currency = defaultPlan.currency || "USD";
    const symbol = currency === "USD" ? "$" : currency;
    if (defaultPlan.model === "PER_UNIT" && defaultPlan.perUnit) {
        const interval = defaultPlan.interval === "YEARLY" ? "yr" : "mo";
        return `From ${symbol}${defaultPlan.perUnit}/${defaultPlan.unit}/${interval}`;
    }
    if (defaultPlan.interval === "YEARLY") return `${symbol}${defaultPlan.amount}/yr`;
    return `${symbol}${defaultPlan.amount}/mo`;
}

export default function HubBrowsePage() {
    const router = useRouter();
    const [apps, setApps] = useState<MarketplaceApp[]>([]);
    const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [compareSet, setCompareSet] = useState<Set<string>>(new Set());

    const toggleCompare = (slug: string) => {
        setCompareSet((prev) => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
            } else if (next.size < 4) {
                next.add(slug);
            }
            return next;
        });
    };

    useEffect(() => {
        const loadData = async () => {
            // Use AbortController with 10s timeout to avoid infinite spinner
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            try {
                // Fetch apps from marketplace and installed apps from ciyex-api in parallel
                const [appsRes, installedRes] = await Promise.all([
                    fetch(`${MARKETPLACE_BASE()}/api/v1/apps`, { signal: controller.signal }),
                    fetchWithAuth(`${API_BASE()}/api/app-installations`),
                ]);
                clearTimeout(timeoutId);

                if (appsRes.ok) {
                    const appsData = await appsRes.json();
                    setApps(Array.isArray(appsData) ? appsData : appsData.content || appsData.data || []);
                }

                if (installedRes.ok) {
                    const installedData = await installedRes.json();
                    const list = installedData.data || installedData || [];
                    setInstalledSlugs(new Set(list.map((i: any) => i.appSlug)));
                }
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (err?.name !== "AbortError") {
                    console.error("Failed to load hub data:", err);
                }
                // Load installed apps even if marketplace is unavailable
                try {
                    const installedRes = await fetchWithAuth(`${API_BASE()}/api/app-installations`);
                    if (installedRes.ok) {
                        const installedData = await installedRes.json();
                        const list = installedData.data || installedData || [];
                        setInstalledSlugs(new Set(list.map((i: any) => i.appSlug)));
                    }
                } catch { /* ignore */ }
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const categories = useMemo(() => {
        const cats = new Set(apps.map((a) => a.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [apps]);

    const filteredApps = useMemo(() => {
        let result = apps;
        if (selectedCategory) {
            result = result.filter((a) => a.category === selectedCategory);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (a) =>
                    a.name.toLowerCase().includes(q) ||
                    a.description?.toLowerCase().includes(q) ||
                    a.category?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [apps, selectedCategory, search]);

    const featuredApps = useMemo(
        () => filteredApps.filter((a) => a.featured),
        [filteredApps]
    );
    const regularApps = useMemo(
        () => filteredApps.filter((a) => !a.featured),
        [filteredApps]
    );

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Store className="w-7 h-7 text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Ciyex Hub
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Browse and install apps to extend your EHR
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/developer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                        >
                            <Code2 className="w-4 h-4" />
                            Developer Portal
                        </Link>
                        <Link
                            href="/hub/installed"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                            <Package className="w-4 h-4" />
                            Installed Apps ({installedSlugs.size})
                        </Link>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="space-y-3">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search apps..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <CategoryFilter
                        categories={categories}
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                    />
                </div>

                {/* Featured Apps */}
                {featuredApps.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Featured
                        </h2>
                        <AppGrid
                            apps={featuredApps.map((a) => ({
                                slug: a.slug,
                                name: a.name,
                                category: a.category,
                                description: a.description,
                                iconUrl: a.iconUrl,
                                avgRating: a.averageRating,
                                reviewCount: a.reviewCount,
                                installed: installedSlugs.has(a.slug),
                                pricingLabel: getPricingLabel(a),
                            }))}
                            compareSet={compareSet}
                            onToggleCompare={toggleCompare}
                        />
                    </div>
                )}

                {/* All Apps */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        {selectedCategory ? selectedCategory : "All Apps"}
                        <span className="text-sm font-normal text-gray-500 ml-2">
                            ({regularApps.length})
                        </span>
                    </h2>
                    <AppGrid
                        apps={regularApps.map((a) => ({
                            slug: a.slug,
                            name: a.name,
                            category: a.category,
                            description: a.description,
                            iconUrl: a.iconUrl,
                            avgRating: a.averageRating,
                            reviewCount: a.reviewCount,
                            installed: installedSlugs.has(a.slug),
                            pricingLabel: getPricingLabel(a),
                        }))}
                        emptyMessage="No apps match your search"
                        compareSet={compareSet}
                        onToggleCompare={toggleCompare}
                    />
                </div>

                {/* Developer CTA */}
                <div className="border border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            Build for Ciyex Hub
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Create apps and integrations for thousands of healthcare practices.
                        </p>
                    </div>
                    <Link
                        href="/developer/register"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
                    >
                        <Code2 className="w-4 h-4" />
                        Become a Developer
                    </Link>
                </div>

                {/* Floating Compare Bar */}
                {compareSet.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <GitCompareArrows className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {compareSet.size} selected
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {Array.from(compareSet).map((slug) => {
                                const app = apps.find((a) => a.slug === slug);
                                return (
                                    <span
                                        key={slug}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg"
                                    >
                                        {app?.name || slug}
                                        <button
                                            onClick={() => toggleCompare(slug)}
                                            className="hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => router.push(`/hub/compare?apps=${Array.from(compareSet).join(",")}`)}
                            disabled={compareSet.size < 2}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Compare
                        </button>
                        <button
                            onClick={() => setCompareSet(new Set())}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
