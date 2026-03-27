"use client";

import React, { useState, useEffect } from "react";
import {
    ShieldCheck, ShieldAlert, RefreshCw, ChevronDown, ChevronUp,
    CheckCircle2, XCircle, AlertTriangle, Search, Printer, DollarSign
} from "lucide-react";
import { formatDisplayDate } from "@/utils/dateUtils";

interface CoverageInfo {
    type: string;
    payerName: string;
    planName: string;
    planType: string;
    memberId: string;
    groupNumber: string;
    status: string;
    effectiveDate: string;
    terminationDate: string;
    inNetwork: boolean;
    networkName: string;
    pcpName: string;
    lastVerified: string;
    deductible: { individual: number; met: number; family: number; familyMet: number };
    oopMax: { individual: number; met: number; family: number; familyMet: number };
    copays: { type: string; amount: string }[];
    alerts: string[];
}

const DEMO_COVERAGES: CoverageInfo[] = [
    {
        type: "PRIMARY", payerName: "Aetna", planName: "Aetna PPO", planType: "PPO",
        memberId: "AET987654321", groupNumber: "ABC123", status: "ACTIVE",
        effectiveDate: "01/01/2026", terminationDate: "12/31/2026",
        inNetwork: true, networkName: "Aetna Open Access", pcpName: "Dr. James Wilson",
        lastVerified: formatDisplayDate(new Date().toISOString()),
        deductible: { individual: 1500, met: 820, family: 3000, familyMet: 1640 },
        oopMax: { individual: 6000, met: 1200, family: 12000, familyMet: 2400 },
        copays: [
            { type: "Office Visit", amount: "$30 copay" },
            { type: "Specialist", amount: "$50 copay" },
            { type: "ER", amount: "$250 copay + 20% coins." },
            { type: "Lab/Imaging", amount: "20% after deductible" },
            { type: "Rx (generic)", amount: "$10 copay" },
            { type: "Rx (brand)", amount: "$35 copay" },
        ],
        alerts: ["Referral required for specialist visits", "Prior auth required for imaging (MRI/CT/PET)"],
    },
    {
        type: "SECONDARY", payerName: "Medicare", planName: "Medicare Part B", planType: "Medicare",
        memberId: "1EG4-TE5-MK72", groupNumber: "—", status: "ACTIVE",
        effectiveDate: "01/01/2020", terminationDate: "—",
        inNetwork: true, networkName: "Medicare", pcpName: "—",
        lastVerified: "03/01/2026",
        deductible: { individual: 257, met: 257, family: 0, familyMet: 0 },
        oopMax: { individual: 0, met: 0, family: 0, familyMet: 0 },
        copays: [{ type: "All services", amount: "20% coinsurance after deductible" }],
        alerts: [],
    },
];

export default function EligibilityPanel({ patientId }: { patientId?: string }) {
    const [coverages, setCoverages] = useState<CoverageInfo[]>([]);
    const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true });
    const [verifying, setVerifying] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCoverages(DEMO_COVERAGES);
            setLoading(false);
        }, 600);
        return () => clearTimeout(timer);
    }, [patientId]);

    const reverify = () => {
        setVerifying(true);
        setTimeout(() => {
            setCoverages(c => c.map((cov, i) => i === 0 ? { ...cov, lastVerified: formatDisplayDate(new Date().toISOString()) } : cov));
            setVerifying(false);
        }, 1500);
    };

    if (loading) return null;
    if (!coverages.length) return null;

    const primary = coverages[0];
    const statusColor = primary.status === "ACTIVE"
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";

    return (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
            <div className="px-4 py-2 flex items-center justify-between border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Insurance Verification</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusColor}`}>
                        {primary.status === "ACTIVE" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {primary.status}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={reverify} disabled={verifying}
                        className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-1">
                        <RefreshCw className={`h-3 w-3 ${verifying ? "animate-spin" : ""}`} /> Re-Verify
                    </button>
                </div>
            </div>

            <div className="p-3 space-y-2">
                {coverages.map((cov, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setExpanded(p => ({ ...p, [idx]: !p[idx] }))}
                            className="w-full px-3 py-2 flex items-center justify-between text-left">
                            <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${cov.type === "PRIMARY" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                                    {cov.type}
                                </span>
                                <span className="text-sm font-medium">{cov.planName}</span>
                                <span className="text-xs text-gray-500">ID: {cov.memberId}</span>
                                {cov.inNetwork && <span className="text-[10px] text-green-600 dark:text-green-400">In-Network</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">Verified: {cov.lastVerified}</span>
                                {expanded[idx] ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                            </div>
                        </button>

                        {expanded[idx] && (
                            <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="text-gray-500">Plan: {cov.planName} ({cov.planType})</p>
                                        <p className="text-gray-500">Group: {cov.groupNumber}</p>
                                        <p className="text-gray-500">Effective: {cov.effectiveDate} — {cov.terminationDate}</p>
                                        {cov.pcpName !== "—" && <p className="text-gray-500">PCP: {cov.pcpName}</p>}
                                    </div>
                                    <div>
                                        <table className="w-full text-[11px]">
                                            <thead>
                                                <tr className="text-gray-400">
                                                    <th className="text-left font-normal">DEDUCTIBLE</th>
                                                    <th className="text-right font-normal">Individual</th>
                                                    <th className="text-right font-normal">Family</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr><td className="text-gray-500">Annual</td><td className="text-right">${cov.deductible.individual.toLocaleString()}</td><td className="text-right">${cov.deductible.family.toLocaleString()}</td></tr>
                                                <tr><td className="text-gray-500">Met</td><td className="text-right">${cov.deductible.met.toLocaleString()}</td><td className="text-right">${cov.deductible.familyMet.toLocaleString()}</td></tr>
                                                <tr className="font-medium"><td className="text-gray-700 dark:text-gray-300">Remaining</td><td className="text-right text-blue-600">${(cov.deductible.individual - cov.deductible.met).toLocaleString()}</td><td className="text-right text-blue-600">${(cov.deductible.family - cov.deductible.familyMet).toLocaleString()}</td></tr>
                                            </tbody>
                                        </table>
                                        {cov.oopMax.individual > 0 && (
                                            <table className="w-full text-[11px] mt-2">
                                                <thead><tr className="text-gray-400"><th className="text-left font-normal">OOP MAX</th><th className="text-right font-normal">Individual</th><th className="text-right font-normal">Family</th></tr></thead>
                                                <tbody>
                                                    <tr><td className="text-gray-500">Annual</td><td className="text-right">${cov.oopMax.individual.toLocaleString()}</td><td className="text-right">${cov.oopMax.family.toLocaleString()}</td></tr>
                                                    <tr><td className="text-gray-500">Remaining</td><td className="text-right text-blue-600">${(cov.oopMax.individual - cov.oopMax.met).toLocaleString()}</td><td className="text-right text-blue-600">${(cov.oopMax.family - cov.oopMax.familyMet).toLocaleString()}</td></tr>
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>

                                {cov.copays.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-medium mb-1">COPAY / COINSURANCE</p>
                                        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[11px]">
                                            {cov.copays.map((c, i) => (
                                                <div key={i} className="flex justify-between">
                                                    <span className="text-gray-500">{c.type}:</span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{c.amount}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {cov.alerts.length > 0 && (
                                    <div className="space-y-1">
                                        {cov.alerts.map((alert, i) => (
                                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                                                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                {alert}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
