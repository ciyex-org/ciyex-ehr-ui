"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, FileText, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";

interface BillingTabProps {
    patientId: string;
}

interface Claim {
    id: string;
    claimNumber: string;
    encounterDate: string;
    provider: string;
    totalCharge: number;
    status: "submitted" | "pending" | "paid" | "denied" | "partial";
    payer: string;
    cptCodes: string[];
    icdCodes: string[];
    paidAmount?: number;
    denialReason?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }> = {
    submitted: { label: "Submitted", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800", icon: Clock },
    pending: { label: "Pending", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800", icon: AlertCircle },
    paid: { label: "Paid", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800", icon: CheckCircle },
    denied: { label: "Denied", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800", icon: XCircle },
    partial: { label: "Partial", color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800", icon: AlertCircle },
};

function formatDate(dateStr: string): string {
    return formatDisplayDate(dateStr) || dateStr;
}

export default function BillingTab({ patientId }: BillingTabProps) {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const fetchClaims = useCallback(async () => {
        if (!patientId) return;

        try {
            setLoading(true);
            setError(null);

            const res = await fetchWithAuth(
                `/api/app-proxy/ciyex-rcm/api/rcm/claims/patient/${patientId}`
            );

            if (res.ok) {
                const data = await res.json();
                // RCM returns ApiResponse with data field containing a Page object
                const pageData = data.data || data;
                const content = pageData.content || pageData.claims || (Array.isArray(pageData) ? pageData : []);
                setClaims(content);
            } else {
                // No claims data available yet or service not configured
                setClaims([]);
            }
        } catch {
            setClaims([]);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchClaims();
    }, [fetchClaims]);

    const filteredClaims = claims.filter((claim) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            !searchQuery ||
            (claim.claimNumber ?? "").toLowerCase().includes(q) ||
            (claim.provider ?? "").toLowerCase().includes(q) ||
            (claim.payer ?? "").toLowerCase().includes(q) ||
            (claim.cptCodes ?? []).some((c) => c.includes(searchQuery)) ||
            (claim.icdCodes ?? []).some((c) => c.includes(searchQuery));

        const matchesStatus = statusFilter === "all" || claim.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalCharges = claims.reduce((sum, c) => sum + c.totalCharge, 0);
    const totalPaid = claims.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const pendingCount = claims.filter((c) => c.status === "pending" || c.status === "submitted").length;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <div className="text-center py-8 text-gray-400 text-sm">
                        Loading billing data...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total Charges</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        ${totalCharges.toFixed(2)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total Paid</span>
                    </div>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        ${totalPaid.toFixed(2)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Pending Claims</span>
                    </div>
                    <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                        {pendingCount}
                    </p>
                </div>
            </div>

            {/* Claims List */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Header & Filters */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            Claims History
                        </h3>
                        <span className="text-xs text-gray-400">
                            {claims.length} claim{claims.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search claims, codes, payers..."
                                className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
                        >
                            <option value="all">All Statuses</option>
                            <option value="submitted">Submitted</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="denied">Denied</option>
                            <option value="partial">Partial</option>
                        </select>
                    </div>
                </div>

                {/* Claims */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredClaims.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {claims.length === 0
                                    ? "No billing records found"
                                    : "No claims match your filters"}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {claims.length === 0
                                    ? "Claims will appear here once encounters are billed."
                                    : "Try adjusting your search or status filter."}
                            </p>
                        </div>
                    ) : (
                        filteredClaims.map((claim) => {
                            const statusCfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
                            const StatusIcon = statusCfg.icon;

                            return (
                                <div
                                    key={claim.id}
                                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {claim.claimNumber}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 shrink-0">
                                            ${claim.totalCharge.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{formatDate(claim.encounterDate)}</span>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <span>{claim.provider}</span>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <span>{claim.payer}</span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1.5">
                                        {claim.cptCodes.map((code) => (
                                            <span
                                                key={code}
                                                className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded font-mono"
                                            >
                                                {code}
                                            </span>
                                        ))}
                                        {claim.icdCodes.map((code) => (
                                            <span
                                                key={code}
                                                className="text-[10px] px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded font-mono"
                                            >
                                                {code}
                                            </span>
                                        ))}
                                    </div>

                                    {claim.status === "paid" && claim.paidAmount != null && (
                                        <p className="text-[11px] text-green-600 dark:text-green-400 mt-1">
                                            Paid: ${claim.paidAmount.toFixed(2)}
                                        </p>
                                    )}

                                    {claim.status === "denied" && claim.denialReason && (
                                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                                            Reason: {claim.denialReason}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 text-center">
                        Powered by Ciyex RCM
                    </p>
                </div>
            </div>
        </div>
    );
}
