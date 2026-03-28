"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Receipt, ChevronDown, ChevronUp, Loader2, CheckCircle, Send } from "lucide-react";
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

interface ExistingClaim {
    id: string;
    claimNumber: string;
    claimStatus: string;
    totalCharges: number;
    payerName: string;
}

export default function BillingSummary({ patientId, encounterId }: BillingSummaryProps) {
    const [expanded, setExpanded] = useState(false);
    const [codes, setCodes] = useState<SuggestedCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [existingClaim, setExistingClaim] = useState<ExistingClaim | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Check if a claim already exists for this encounter
    const checkExistingClaim = useCallback(async () => {
        if (!encounterId) return;
        try {
            const res = await fetchWithAuth(
                `/api/app-proxy/ciyex-rcm/api/rcm/claims/by-encounters`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ encounterIds: [encounterId] }),
                }
            );
            if (res.ok) {
                const json = await res.json();
                const grouped = json?.data ?? json ?? {};
                const claims = grouped[encounterId];
                if (Array.isArray(claims) && claims.length > 0) {
                    setExistingClaim(claims[0] as ExistingClaim);
                }
            }
        } catch {
            // ignore — just means we can't check
        }
    }, [encounterId]);

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
                const raw = json?.data?.suggestions ?? json?.suggestions ?? json?.data ?? json ?? [];
                setCodes(Array.isArray(raw) ? raw : []);
            } else {
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
        checkExistingClaim();
    }, [fetchSuggestions, checkExistingClaim]);

    const handleCreateClaim = async () => {
        if (!encounterId) return;
        setCreating(true);
        setCreateError(null);
        try {
            const res = await fetchWithAuth(
                `/api/app-proxy/ciyex-rcm/api/rcm/claims/from-encounter`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ encounterId }),
                }
            );
            if (res.ok) {
                const json = await res.json();
                const claim = json?.data ?? json;
                setExistingClaim({
                    id: claim.id,
                    claimNumber: claim.claimNumber || "",
                    claimStatus: claim.claimStatus || "DRAFT",
                    totalCharges: claim.totalCharges || 0,
                    payerName: claim.payerName || "",
                });
            } else {
                const json = await res.json().catch(() => null);
                setCreateError(json?.message || "Failed to create claim");
            }
        } catch {
            setCreateError("Network error creating claim");
        } finally {
            setCreating(false);
        }
    };

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
                    {existingClaim && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-medium">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Claim {existingClaim.claimNumber || "created"}
                        </span>
                    )}
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

                    {/* Create Claim button */}
                    {!existingClaim ? (
                        <div className="pt-1">
                            {createError && (
                                <p className="text-[11px] text-red-600 dark:text-red-400 mb-1">{createError}</p>
                            )}
                            <button
                                onClick={handleCreateClaim}
                                disabled={creating}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                {creating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Send className="w-3.5 h-3.5" />
                                )}
                                {creating ? "Creating Claim..." : "Create Claim from Encounter"}
                            </button>
                            <p className="text-[10px] text-gray-400 text-center mt-1">
                                Auto-fills CPT, ICD-10, provider, DOS & insurance from this encounter
                            </p>
                        </div>
                    ) : (
                        <div className="pt-1 flex items-center justify-between text-xs bg-green-50 dark:bg-green-900/20 rounded-md px-3 py-2 border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span className="font-medium">Claim {existingClaim.claimNumber}</span>
                                <span className="text-green-600/70 dark:text-green-500/70">·</span>
                                <span className="text-green-600/70 dark:text-green-500/70">{existingClaim.claimStatus}</span>
                            </div>
                            {existingClaim.totalCharges > 0 && (
                                <span className="font-medium text-green-700 dark:text-green-400">
                                    ${Number(existingClaim.totalCharges).toFixed(2)}
                                </span>
                            )}
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
