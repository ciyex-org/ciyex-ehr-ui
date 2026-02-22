"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Link from "next/link";
import {
    Code2,
    Key,
    Send,
    Server,
    Users,
    Webhook,
    Loader2,
    ArrowRight,
    Plus,
    ShieldCheck,
    BarChart3,
    Store,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface DashboardStats {
    apiKeys: number;
    submissions: { total: number; pending: number; approved: number };
    sandboxes: number;
    teamMembers: number;
    webhookLogs: number;
}

const NAV_ITEMS = [
    {
        href: "/developer/api-keys",
        label: "API Keys",
        description: "Manage API keys for authenticating your apps",
        icon: Key,
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
        href: "/developer/submissions",
        label: "App Submissions",
        description: "Submit new apps or updates for review",
        icon: Send,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
        href: "/developer/sandboxes",
        label: "Sandboxes",
        description: "FHIR sandbox environments for testing",
        icon: Server,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
        href: "/developer/team",
        label: "Team",
        description: "Manage your vendor team members",
        icon: Users,
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
        href: "/developer/analytics",
        label: "Analytics",
        description: "Track app performance, revenue, and subscriber trends",
        icon: BarChart3,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
        href: "/developer/webhook-logs",
        label: "Webhook Logs",
        description: "View webhook delivery history and debug issues",
        icon: Webhook,
        color: "text-rose-600",
        bgColor: "bg-rose-50 dark:bg-rose-900/20",
    },
    {
        href: "/developer/admin",
        label: "Review Queue",
        description: "Admin: review and approve app submissions",
        icon: ShieldCheck,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    },
];

export default function DeveloperPortalPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const base = MARKETPLACE_BASE();
                const [keysRes, subsRes, sandboxRes, teamRes] = await Promise.all([
                    fetchWithAuth(`${base}/api/v1/vendors/me/api-keys`),
                    fetchWithAuth(`${base}/api/v1/vendors/me/submissions?page=0&size=1`),
                    fetchWithAuth(`${base}/api/v1/vendors/me/sandboxes`),
                    fetchWithAuth(`${base}/api/v1/vendors/me/team`),
                ]);

                const keys = keysRes.ok ? await keysRes.json() : [];
                const subs = subsRes.ok ? await subsRes.json() : { totalElements: 0, content: [] };
                const sandboxes = sandboxRes.ok ? await sandboxRes.json() : [];
                const team = teamRes.ok ? await teamRes.json() : [];

                setStats({
                    apiKeys: Array.isArray(keys) ? keys.length : 0,
                    submissions: {
                        total: subs.totalElements || 0,
                        pending: 0,
                        approved: 0,
                    },
                    sandboxes: Array.isArray(sandboxes) ? sandboxes.length : 0,
                    teamMembers: Array.isArray(team) ? team.length : 0,
                    webhookLogs: 0,
                });
            } catch (err) {
                console.error("Failed to load developer stats:", err);
            }
            setLoading(false);
        };
        loadStats();
    }, []);

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
                        <Code2 className="w-7 h-7 text-indigo-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Developer Portal
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Build and manage your Ciyex Hub apps
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/hub"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                        >
                            <Store className="w-4 h-4" />
                            Browse Hub
                        </Link>
                        <Link
                            href="/developer/submissions/new"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Submission
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="API Keys" value={stats.apiKeys} />
                        <StatCard label="Submissions" value={stats.submissions.total} />
                        <StatCard label="Sandboxes" value={stats.sandboxes} />
                        <StatCard label="Team Members" value={stats.teamMembers} />
                    </div>
                )}

                {/* Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className={`p-2.5 rounded-lg ${item.bgColor}`}>
                                    <item.icon className={`w-5 h-5 ${item.color}`} />
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                                {item.label}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {item.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {value}
            </p>
        </div>
    );
}
