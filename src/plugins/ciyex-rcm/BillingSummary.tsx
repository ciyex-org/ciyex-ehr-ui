"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface BillingSummaryProps {
    patientId?: string;
    encounterId?: string;
}

interface SuggestedCode {
    code: string;
    description: string;
    type: "CPT" | "ICD-10";
    charge?: number;
}

export default function BillingSummary({ patientId, encounterId }: BillingSummaryProps) {
    const [expanded, setExpanded] = useState(false);
    const [codes, setCodes] = useState<SuggestedCode[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSuggestions = useCallback(async () => {
        if (!encounterId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await fetchWithAuth(
                `/api/app-proxy/ciyex-rcm/api/billing-suggestions?encounterId=${encounterId}`
            );

            if (res.ok) {
                const json = await res.json();
                // Handle ApiResponse wrapper: {success, message, data: {suggestions: [...]}}
                const raw = json?.data?.suggestions ?? json?.suggestions ?? json?.data ?? json ?? [];
                setCodes(Array.isArray(raw) ? raw : []);
            } else {
                // API not available — show empty state, never hardcoded data
                setCodes([]);
            }
        } catch {
            setCodes([]);
        } finally {
            setLoading(false);
        }
    }, [encounterId]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    const cptCodes = codes.filter((c) => c.type === "CPT");
    const icdCodes = codes.filter((c) => c.type === "ICD-10");
    const totalCharges = cptCodes.reduce((sum, c) => sum + (c.charge || 0), 0);

    if (loading) {
        return (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Loading billing suggestions...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {/* Collapsed summary bar */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Billing Summary
                    </span>
                    <span className="text-xs text-gray-400">
                        {cptCodes.length} CPT · {icdCodes.length} ICD-10
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {totalCharges > 0 && (
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                            ${totalCharges.toFixed(2)}
                        </span>
                    )}
                    {expanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Expanded details */}
            {expanded && (
                <div className="px-4 pb-3 space-y-2">
                    {cptCodes.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                                CPT Codes
                            </p>
                            <div className="space-y-1">
                                {cptCodes.map((c) => (
                                    <div
                                        key={c.code}
                                        className="flex items-center justify-between text-xs py-1 px-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-mono font-medium text-blue-600 dark:text-blue-400 shrink-0">
                                                {c.code}
                                            </span>
                                            <span className="text-gray-600 dark:text-gray-400 truncate">
                                                {c.description}
                                            </span>
                                        </div>
                                        {c.charge != null && (
                                            <span className="text-green-600 dark:text-green-400 font-medium shrink-0 ml-2">
                                                ${c.charge.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {icdCodes.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                                Diagnosis Codes (ICD-10)
                            </p>
                            <div className="space-y-1">
                                {icdCodes.map((c) => (
                                    <div
                                        key={c.code}
                                        className="flex items-center gap-2 text-xs py-1 px-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700"
                                    >
                                        <span className="font-mono font-medium text-purple-600 dark:text-purple-400 shrink-0">
                                            {c.code}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400 truncate">
                                            {c.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] text-gray-400 text-center pt-1">
                        Powered by Ciyex RCM
                    </p>
                </div>
            )}
        </div>
    );
}
