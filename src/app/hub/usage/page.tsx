"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import AdminLayout from "@/app/(admin)/layout";
import { BarChart3, Activity, Zap, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface UsageSummary {
    appSlug: string;
    periodDays: number;
    totalEvents: number;
    eventBreakdown: Record<string, number>;
}

interface TrendPoint {
    date: string;
    eventType: string;
    count: number;
}

export default function AppUsageDashboard() {
    const [summaries, setSummaries] = useState<UsageSummary[]>([]);
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [trend, setTrend] = useState<TrendPoint[]>([]);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSummary() {
            setLoading(true);
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/app-usage/summary?days=${days}`);
                if (res.ok) {
                    setSummaries(await res.json());
                }
            } catch (err) {
                console.error("Failed to fetch usage summary:", err);
            }
            setLoading(false);
        }
        fetchSummary();
    }, [days]);

    useEffect(() => {
        if (!selectedApp) {
            setTrend([]);
            return;
        }
        async function fetchTrend() {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/app-usage/trend/${selectedApp}?days=${days}`);
                if (res.ok) {
                    setTrend(await res.json());
                }
            } catch (err) {
                console.error("Failed to fetch usage trend:", err);
            }
        }
        fetchTrend();
    }, [selectedApp, days]);

    const totalEvents = summaries.reduce((sum, s) => sum + s.totalEvents, 0);
    const totalApps = summaries.length;

    const EVENT_LABELS: Record<string, string> = {
        app_launch: "App Launches",
        smart_launch: "SMART Launches",
        plugin_render: "Plugin Renders",
        cds_hook_invocation: "CDS Hook Invocations",
        api_call: "API Calls",
    };

    const EVENT_COLORS: Record<string, string> = {
        app_launch: "bg-blue-500",
        smart_launch: "bg-purple-500",
        plugin_render: "bg-green-500",
        cds_hook_invocation: "bg-amber-500",
        api_call: "bg-cyan-500",
    };

    // Aggregate trends by date
    const trendByDate = trend.reduce<Record<string, number>>((acc, t) => {
        acc[t.date] = (acc[t.date] || 0) + t.count;
        return acc;
    }, {});
    const trendDates = Object.keys(trendByDate).sort();
    const maxTrendValue = Math.max(...Object.values(trendByDate), 1);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/hub/installed"
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">App Usage</h1>
                            <p className="text-sm text-gray-500">Track how your installed apps are being used</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                        {[7, 30, 90].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    days === d
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                        label="Total Events"
                        value={totalEvents.toLocaleString()}
                        subtitle={`Last ${days} days`}
                        icon={Activity}
                        color="text-blue-600"
                        bgColor="bg-blue-50"
                    />
                    <MetricCard
                        label="Active Apps"
                        value={totalApps.toString()}
                        subtitle="With usage events"
                        icon={Zap}
                        color="text-green-600"
                        bgColor="bg-green-50"
                    />
                    <MetricCard
                        label="Avg Events/App"
                        value={totalApps > 0 ? Math.round(totalEvents / totalApps).toLocaleString() : "0"}
                        subtitle={`Last ${days} days`}
                        icon={TrendingUp}
                        color="text-purple-600"
                        bgColor="bg-purple-50"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading usage data...</div>
                ) : summaries.length === 0 ? (
                    <div className="text-center py-12">
                        <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">No usage data yet</p>
                        <p className="text-xs text-gray-400 mt-1">Usage events will appear as apps are used</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Per-App Usage Table */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800">Usage by App</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {summaries
                                    .sort((a, b) => b.totalEvents - a.totalEvents)
                                    .map((summary) => (
                                        <button
                                            key={summary.appSlug}
                                            onClick={() => setSelectedApp(summary.appSlug === selectedApp ? null : summary.appSlug)}
                                            className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left ${
                                                selectedApp === summary.appSlug ? "bg-blue-50" : ""
                                            }`}
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{summary.appSlug}</p>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {Object.entries(summary.eventBreakdown).map(([type, count]) => (
                                                        <span
                                                            key={type}
                                                            className="inline-flex items-center gap-1 text-[10px] text-gray-500"
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[type] || "bg-gray-400"}`} />
                                                            {EVENT_LABELS[type] || type}: {count}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-lg font-semibold text-gray-900 tabular-nums">
                                                {summary.totalEvents.toLocaleString()}
                                            </span>
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Trend Chart */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800">
                                    {selectedApp ? `Daily Trend: ${selectedApp}` : "Select an app to view trend"}
                                </h3>
                            </div>
                            {selectedApp && trendDates.length > 0 ? (
                                <div className="p-4">
                                    <div className="flex items-end gap-1 h-40">
                                        {trendDates.map((date) => {
                                            const value = trendByDate[date] || 0;
                                            const height = (value / maxTrendValue) * 100;
                                            return (
                                                <div
                                                    key={date}
                                                    className="flex-1 flex flex-col items-center gap-1"
                                                    title={`${date}: ${value} events`}
                                                >
                                                    <span className="text-[9px] text-gray-400 tabular-nums">{value}</span>
                                                    <div
                                                        className="w-full bg-blue-500 rounded-t-sm min-h-[2px]"
                                                        style={{ height: `${Math.max(height, 2)}%` }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <span className="text-[10px] text-gray-400">{trendDates[0]}</span>
                                        <span className="text-[10px] text-gray-400">{trendDates[trendDates.length - 1]}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                                    {selectedApp ? "No trend data" : "Click an app on the left"}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {Object.entries(EVENT_LABELS).map(([type, label]) => (
                        <span key={type} className="inline-flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${EVENT_COLORS[type]}`} />
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}

function MetricCard({ label, value, subtitle, icon: Icon, color, bgColor }: {
    label: string; value: string; subtitle: string;
    icon: React.ComponentType<any>; color: string; bgColor: string;
}) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-4">
            <div className={`${bgColor} rounded-lg p-2.5`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-[10px] text-gray-400">{subtitle}</p>
            </div>
        </div>
    );
}
