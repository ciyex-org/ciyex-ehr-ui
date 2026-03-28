"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import AppGrid from "@/components/hub/AppGrid";
import { Package, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDisplayDate } from "@/utils/dateUtils";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface InstalledApp {
    id: string;
    appSlug: string;
    appName: string;
    appIconUrl?: string;
    appCategory?: string;
    status: string;
    installedBy?: string;
    installedAt: string;
}

export default function InstalledAppsPage() {
    const [apps, setApps] = useState<InstalledApp[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/app-installations`);
                if (res.ok) {
                    const data = await res.json();
                    setApps(data.data || data || []);
                }
            } catch (err) {
                console.error("Failed to load installed apps:", err);
            }
            setLoading(false);
        })();
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
                        <Link
                            href="/hub"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <Package className="w-7 h-7 text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Installed Apps
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {apps.length} app{apps.length !== 1 ? "s" : ""} installed
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/hub"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Browse More Apps
                    </Link>
                </div>

                {/* Installed Apps Grid */}
                <AppGrid
                    apps={apps.map((a) => ({
                        slug: a.appSlug,
                        name: a.appName,
                        category: a.appCategory || "",
                        description: `Installed by ${a.installedBy || "system"} on ${formatDisplayDate(a.installedAt)}`,
                        iconUrl: a.appIconUrl,
                        installed: true,
                        pricingLabel: a.status === "active" ? "Active" : a.status,
                    }))}
                    emptyMessage="No apps installed yet. Browse the Ciyex Hub to find apps for your practice."
                />
            </div>
        </AdminLayout>
    );
}
