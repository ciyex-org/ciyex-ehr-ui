"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BadgeCheck, Clock, AlertTriangle, XCircle, Search, ExternalLink, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";

interface Provider {
    id: string;
    name: string;
    npi: string;
    specialty: string;
    status: "active" | "pending" | "expired" | "needs_renewal";
    expirationDate?: string;
    lastVerified?: string;
    credentialTypes: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }> = {
    active: {
        label: "Active",
        color: "text-green-700 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800",
        icon: BadgeCheck,
    },
    pending: {
        label: "Pending",
        color: "text-amber-700 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
        icon: Clock,
    },
    expired: {
        label: "Expired",
        color: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800",
        icon: XCircle,
    },
    needs_renewal: {
        label: "Needs Renewal",
        color: "text-orange-700 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
        icon: AlertTriangle,
    },
};

function formatDate(dateStr: string): string {
    return formatDisplayDate(dateStr) || dateStr;
}

export default function CredentialingPanel() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const fetchProviders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetchWithAuth("/api/app-proxy/ciyex-credentialing/api/providers");

            if (res.ok) {
                const data = await res.json();
                setProviders(data.providers || data || []);
            } else if (res.status === 404) {
                // App not installed or not configured
                setProviders([]);
                setError("Credentialing service is not yet configured. Please contact your administrator.");
            } else {
                // Service unavailable or endpoint not found
                setProviders([]);
                setError("Credentialing service is currently unavailable. Please try again later.");
            }
        } catch {
            setProviders([]);
            setError("Unable to connect to credentialing service.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const filteredProviders = providers.filter((provider) => {
        const matchesSearch =
            !searchQuery ||
            provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            provider.npi.includes(searchQuery) ||
            provider.specialty.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || provider.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const activeCount = providers.filter((p) => p.status === "active").length;
    const pendingCount = providers.filter((p) => p.status === "pending").length;
    const expiredCount = providers.filter((p) => p.status === "expired").length;
    const renewalCount = providers.filter((p) => p.status === "needs_renewal").length;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <div className="text-center py-8 text-gray-400 text-sm">
                        Loading credentialing data...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Error Banner */}
            {error && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Provider Credentialing
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Manage and track provider credentials and certifications
                    </p>
                </div>
                <button
                    onClick={fetchProviders}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                </button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <BadgeCheck className="w-4 h-4 text-green-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Active</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{activeCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Pending</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{pendingCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Needs Renewal</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{renewalCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Expired</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{expiredCount}</p>
                </div>
            </div>

            {/* Provider List */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Filters */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, NPI, or specialty..."
                                className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="needs_renewal">Needs Renewal</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                </div>

                {/* Provider Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredProviders.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <BadgeCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {providers.length === 0
                                    ? "No providers found"
                                    : "No providers match your filters"}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {providers.length === 0
                                    ? "Add providers to begin credentialing."
                                    : "Try adjusting your search or status filter."}
                            </p>
                        </div>
                    ) : (
                        filteredProviders.map((provider) => {
                            const statusCfg = STATUS_CONFIG[provider.status] || STATUS_CONFIG.pending;
                            const StatusIcon = statusCfg.icon;

                            return (
                                <div
                                    key={provider.id}
                                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {provider.name}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusCfg.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                <span>NPI: {provider.npi}</span>
                                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                                <span>{provider.specialty}</span>
                                                {provider.expirationDate && (
                                                    <>
                                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                                        <span>
                                                            Expires: {formatDate(provider.expirationDate)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {provider.credentialTypes.length > 0 && (
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    {provider.credentialTypes.map((cred) => (
                                                        <span
                                                            key={cred}
                                                            className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700"
                                                        >
                                                            {cred}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {provider.lastVerified && (
                                                <p className="text-[11px] text-gray-400 mt-1">
                                                    Last verified: {formatDate(provider.lastVerified)}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium shrink-0 ml-4"
                                            title="Manage Credentials"
                                        >
                                            Manage
                                            <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 text-center">
                        Powered by Ciyex Credentialing
                    </p>
                </div>
            </div>
        </div>
    );
}
