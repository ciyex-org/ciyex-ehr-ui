"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Link from "next/link";
import {
    BarChart3,
    ArrowLeft,
    Loader2,
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    Star,
    Package,
    Activity,
    Zap,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface AnalyticsSummary {
    totalApps: number;
    activeApps: number;
    totalSubscribers: number;
    activeSubscribers: number;
    totalRevenue: number;
    totalPlatformFees: number;
    netRevenue: number;
    totalPayouts: number;
    averageRating: number;
    totalReviews: number;
}

interface TimeSeriesPoint {
    date: string;
    count: number;
    amount?: number;
}

interface AppPerformance {
    appSlug: string;
    appName: string;
    subscribers: number;
    revenue: number;
    averageRating: number | null;
}

interface AnalyticsTrends {
    revenueTrend: TimeSeriesPoint[];
    subscriberTrend: TimeSeriesPoint[];
    appPerformance: AppPerformance[];
}

interface UsageRow {
    appSlug: string;
    eventType: string;
    totalCount: number;
}

interface AppUsageSummary {
    appSlug: string;
    totalEvents: number;
    breakdown: Record<string, number>;
}

export default function AnalyticsPage() {
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
    const [usageData, setUsageData] = useState<AppUsageSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    const loadAnalytics = async (period: number) => {
        setLoading(true);
        try {
            const base = MARKETPLACE_BASE();
            const [summaryRes, trendsRes, usageRes] = await Promise.all([
                fetchWithAuth(`${base}/api/v1/vendors/me/analytics`),
                fetchWithAuth(`${base}/api/v1/vendors/me/analytics/trends?days=${period}`),
                fetchWithAuth(`${base}/api/v1/vendors/me/usage?days=${period}`),
            ]);

            if (summaryRes.ok) setSummary(await summaryRes.json());
            if (trendsRes.ok) setTrends(await trendsRes.json());
            if (usageRes.ok) {
                const rows: UsageRow[] = await usageRes.json();
                // Group by appSlug
                const grouped = new Map<string, { total: number; breakdown: Record<string, number> }>();
                for (const row of rows) {
                    const existing = grouped.get(row.appSlug) || { total: 0, breakdown: {} };
                    existing.total += row.totalCount;
                    existing.breakdown[row.eventType] = (existing.breakdown[row.eventType] || 0) + row.totalCount;
                    grouped.set(row.appSlug, existing);
                }
                setUsageData(
                    Array.from(grouped.entries())
                        .map(([appSlug, data]) => ({ appSlug, totalEvents: data.total, breakdown: data.breakdown }))
                        .sort((a, b) => b.totalEvents - a.totalEvents)
                );
            }
        } catch (err) {
            console.error("Failed to load analytics:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAnalytics(days);
    }, [days]);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/developer"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <BarChart3 className="w-7 h-7 text-emerald-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Analytics
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Track your app performance and revenue
                            </p>
                        </div>
                    </div>

                    {/* Period selector */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                        {[7, 30, 90].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                    days === d
                                        ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm font-medium"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        {summary && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                <MetricCard
                                    label="Active Apps"
                                    value={summary.activeApps}
                                    total={summary.totalApps}
                                    icon={Package}
                                    color="text-blue-600"
                                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                                />
                                <MetricCard
                                    label="Subscribers"
                                    value={summary.activeSubscribers}
                                    total={summary.totalSubscribers}
                                    icon={Users}
                                    color="text-purple-600"
                                    bgColor="bg-purple-50 dark:bg-purple-900/20"
                                />
                                <MetricCard
                                    label="Net Revenue"
                                    value={`$${(summary.netRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    icon={DollarSign}
                                    color="text-emerald-600"
                                    bgColor="bg-emerald-50 dark:bg-emerald-900/20"
                                />
                                <MetricCard
                                    label="Avg Rating"
                                    value={summary.averageRating ? summary.averageRating.toFixed(1) : "—"}
                                    subtitle={`${summary.totalReviews || 0} reviews`}
                                    icon={Star}
                                    color="text-amber-600"
                                    bgColor="bg-amber-50 dark:bg-amber-900/20"
                                />
                                <MetricCard
                                    label="Payouts"
                                    value={summary.totalPayouts || 0}
                                    icon={Activity}
                                    color="text-rose-600"
                                    bgColor="bg-rose-50 dark:bg-rose-900/20"
                                />
                            </div>
                        )}

                        {/* Trend Charts */}
                        {trends && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Subscriber Trend */}
                                <TrendCard
                                    title="Subscriber Growth"
                                    data={trends.subscriberTrend}
                                    valueKey="count"
                                    color="purple"
                                />
                                {/* Revenue Trend */}
                                <TrendCard
                                    title="Revenue Events"
                                    data={trends.revenueTrend}
                                    valueKey="count"
                                    color="emerald"
                                />
                            </div>
                        )}

                        {/* Usage Metering */}
                        {usageData.length > 0 && (
                            <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                                <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-cyan-600" />
                                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                            Usage Metering
                                        </h2>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Last {days} days
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {usageData.map((app) => (
                                        <div key={app.appSlug} className="px-5 py-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {app.appSlug}
                                                </span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                                                    {app.totalEvents.toLocaleString()} events
                                                </span>
                                            </div>
                                            {/* Stacked bar + breakdown */}
                                            <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden flex mb-2">
                                                {Object.entries(app.breakdown).map(([type, count]) => {
                                                    const pct = app.totalEvents > 0 ? (count / app.totalEvents) * 100 : 0;
                                                    return (
                                                        <div
                                                            key={type}
                                                            className={`${USAGE_COLORS[type] || "bg-gray-400"} transition-all`}
                                                            style={{ width: `${pct}%` }}
                                                            title={`${USAGE_LABELS[type] || type}: ${count.toLocaleString()}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                {Object.entries(app.breakdown).map(([type, count]) => (
                                                    <span key={type} className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className={`w-2 h-2 rounded-full ${USAGE_COLORS[type] || "bg-gray-400"}`} />
                                                        {USAGE_LABELS[type] || type}: {count.toLocaleString()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Per-App Performance */}
                        {trends && trends.appPerformance.length > 0 && (
                            <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                                <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                        App Performance
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="px-5 py-3 text-left font-medium text-gray-600 dark:text-gray-400">App</th>
                                                <th className="px-5 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Subscribers</th>
                                                <th className="px-5 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Revenue</th>
                                                <th className="px-5 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                            {trends.appPerformance.map((app) => (
                                                <tr key={app.appSlug} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-5 py-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{app.appName}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{app.appSlug}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                                                        {app.subscribers}
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                                                        ${(app.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        {app.averageRating != null ? (
                                                            <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                                                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                                {app.averageRating.toFixed(1)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {trends && trends.appPerformance.length === 0 && (
                            <div className="text-center py-12 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">
                                <BarChart3 className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    No app data yet. Submit and publish your first app to see analytics.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}

const USAGE_LABELS: Record<string, string> = {
    app_launch: "App Launches",
    smart_launch: "SMART Launches",
    plugin_render: "Plugin Renders",
    cds_hook_invocation: "CDS Hook Invocations",
    api_call: "API Calls",
};

const USAGE_COLORS: Record<string, string> = {
    app_launch: "bg-blue-500",
    smart_launch: "bg-purple-500",
    plugin_render: "bg-green-500",
    cds_hook_invocation: "bg-amber-500",
    api_call: "bg-cyan-500",
};

function MetricCard({
    label,
    value,
    total,
    subtitle,
    icon: Icon,
    color,
    bgColor,
}: {
    label: string;
    value: string | number;
    total?: number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}) {
    return (
        <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {label}
                {total != null && <span className="ml-1">/ {total} total</span>}
                {subtitle && <span className="ml-1">{subtitle}</span>}
            </p>
        </div>
    );
}

function TrendCard({
    title,
    data,
    valueKey,
    color,
}: {
    title: string;
    data: TimeSeriesPoint[];
    valueKey: "count" | "amount";
    color: string;
}) {
    if (!data || data.length === 0) {
        return (
            <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
                <p className="text-sm text-gray-400 text-center py-8">No data for this period</p>
            </div>
        );
    }

    const maxVal = Math.max(...data.map((d) => (valueKey === "amount" ? Number(d.amount || 0) : d.count)), 1);
    const total = data.reduce((sum, d) => sum + (valueKey === "amount" ? Number(d.amount || 0) : d.count), 0);

    const colorMap: Record<string, { bar: string; text: string }> = {
        purple: { bar: "bg-purple-500", text: "text-purple-600" },
        emerald: { bar: "bg-emerald-500", text: "text-emerald-600" },
        blue: { bar: "bg-blue-500", text: "text-blue-600" },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                <span className={`text-sm font-medium ${c.text}`}>
                    {total} total
                </span>
            </div>
            {/* Simple bar chart */}
            <div className="flex items-end gap-1 h-32">
                {data.map((point, i) => {
                    const val = valueKey === "amount" ? Number(point.amount || 0) : point.count;
                    const height = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                                className={`w-full rounded-t ${c.bar} opacity-80 hover:opacity-100 transition-opacity min-h-[2px]`}
                                style={{ height: `${Math.max(height, 2)}%` }}
                                title={`${point.date}: ${val}`}
                            />
                        </div>
                    );
                })}
            </div>
            {/* X-axis labels — show first, middle, last */}
            <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>{data[0]?.date?.slice(5)}</span>
                {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>}
                <span>{data[data.length - 1]?.date?.slice(5)}</span>
            </div>
        </div>
    );
}
