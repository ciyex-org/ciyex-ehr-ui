"use client";

import React, { useState } from "react";
import {
    ShieldCheck, Clock, FileText, DollarSign, Search, RefreshCw,
    CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
    Send, Upload, Filter, Download
} from "lucide-react";

interface AuthRequest {
    id: string;
    service: string;
    cptCode: string;
    payer: string;
    status: string;
    submittedDate: string;
    authNumber: string;
    validFrom: string;
    validTo: string;
    usedUnits: number;
    totalUnits: number;
    daysRemaining: number;
}

const DEMO_AUTHS: AuthRequest[] = [
    { id: "1", service: "MRI Lumbar Spine (CPT 72148)", cptCode: "72148", payer: "Aetna PPO", status: "PENDING", submittedDate: "03/01/2026", authNumber: "Pending", validFrom: "", validTo: "", usedUnits: 0, totalUnits: 1, daysRemaining: 4 },
    { id: "2", service: "PT Evaluation + 12 visits (CPT 97161, 97110)", cptCode: "97161", payer: "UHC", status: "APPROVED", submittedDate: "02/15/2026", authNumber: "UHC-A-789012", validFrom: "02/15/2026", validTo: "05/15/2026", usedUnits: 4, totalUnits: 12, daysRemaining: 72 },
    { id: "3", service: "Colonoscopy (CPT 45378)", cptCode: "45378", payer: "Aetna PPO", status: "APPROVED", submittedDate: "01/20/2026", authNumber: "ATN-A-456789", validFrom: "01/20/2026", validTo: "04/20/2026", usedUnits: 1, totalUnits: 1, daysRemaining: 47 },
    { id: "4", service: "MRI Brain (CPT 70553)", cptCode: "70553", payer: "BCBS", status: "DENIED", submittedDate: "12/10/2025", authNumber: "—", validFrom: "", validTo: "", usedUnits: 0, totalUnits: 1, daysRemaining: 0 },
];

interface BatchResult {
    patient: string;
    payer: string;
    status: string;
    issue: string;
}

const DEMO_BATCH: BatchResult[] = [
    { patient: "John Smith", payer: "Aetna PPO", status: "verified", issue: "" },
    { patient: "Maria Garcia", payer: "BCBS HMO", status: "verified", issue: "" },
    { patient: "Bob Wilson", payer: "UHC", status: "changed", issue: "COB detected" },
    { patient: "Sarah Chen", payer: "Self-pay", status: "discovered", issue: "Medicaid found" },
    { patient: "James Brown", payer: "Cigna", status: "inactive", issue: "Terminated 02/28" },
    { patient: "Lisa Park", payer: "Humana", status: "failed", issue: "Timeout" },
];

export default function EligibilityTab({ patientId }: { patientId?: string }) {
    const [activeView, setActiveView] = useState<"auth" | "batch" | "estimate">("auth");
    const [authFilter, setAuthFilter] = useState("ALL");
    const [searchCpt, setSearchCpt] = useState("");
    const [selectedPayer, setSelectedPayer] = useState("Aetna PPO");
    const [checkResult, setCheckResult] = useState<string | null>(null);

    const filteredAuths = DEMO_AUTHS.filter(a => authFilter === "ALL" || a.status === authFilter);

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            DENIED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
        const icons: Record<string, React.ReactNode> = {
            APPROVED: <CheckCircle2 className="h-3 w-3" />,
            PENDING: <Clock className="h-3 w-3" />,
            DENIED: <XCircle className="h-3 w-3" />,
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
                {icons[status]} {status}
            </span>
        );
    };

    const batchStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            verified: "text-green-600", changed: "text-amber-600", discovered: "text-blue-600",
            inactive: "text-red-600", failed: "text-gray-500",
        };
        const icons: Record<string, React.ReactNode> = {
            verified: <CheckCircle2 className="h-3.5 w-3.5" />,
            changed: <AlertTriangle className="h-3.5 w-3.5" />,
            discovered: <Search className="h-3.5 w-3.5" />,
            inactive: <XCircle className="h-3.5 w-3.5" />,
            failed: <XCircle className="h-3.5 w-3.5" />,
        };
        return <span className={`flex items-center gap-1 ${colors[status]}`}>{icons[status]} {status}</span>;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b dark:border-gray-700">
                {(["auth", "batch", "estimate"] as const).map(v => (
                    <button key={v} onClick={() => setActiveView(v)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeView === v ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                        {v === "auth" ? "Prior Auth" : v === "batch" ? "Batch Verify" : "Cost Estimate"}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {activeView === "auth" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Prior Authorizations</h3>
                            <button className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 flex items-center gap-1.5">
                                <Send className="h-3 w-3" /> New Auth Request
                            </button>
                        </div>

                        <div className="flex gap-1">
                            {["ALL", "PENDING", "APPROVED", "DENIED"].map(f => (
                                <button key={f} onClick={() => setAuthFilter(f)}
                                    className={`px-2.5 py-1 text-[10px] font-medium rounded-full ${authFilter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"}`}>
                                    {f} {f !== "ALL" && `(${DEMO_AUTHS.filter(a => a.status === f).length})`}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {filteredAuths.map(auth => (
                                <div key={auth.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {statusBadge(auth.status)}
                                            <span className="text-sm font-medium">{auth.service}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400">Payer: {auth.payer}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                        <span>Submitted: {auth.submittedDate}</span>
                                        {auth.status === "APPROVED" && (
                                            <span>Auth #: {auth.authNumber} | Valid: {auth.validFrom} — {auth.validTo}</span>
                                        )}
                                        {auth.status === "PENDING" && (
                                            <span className="text-amber-600">Under review (Day {7 - auth.daysRemaining} of 7)</span>
                                        )}
                                    </div>
                                    {auth.status === "APPROVED" && auth.totalUnits > 1 && (
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Used: {auth.usedUnits} of {auth.totalUnits}</span>
                                                <span className="text-amber-600">{auth.totalUnits - auth.usedUnits} remaining — expires in {auth.daysRemaining} days</span>
                                            </div>
                                            <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(auth.usedUnits / auth.totalUnits) * 100}%` }} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-2 flex gap-2">
                                        {auth.status === "PENDING" && <button className="text-[10px] text-blue-600 hover:underline">Check Status</button>}
                                        {auth.status === "PENDING" && <button className="text-[10px] text-blue-600 hover:underline">Upload Docs</button>}
                                        {auth.status === "DENIED" && <button className="text-[10px] text-red-600 hover:underline">Appeal</button>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mt-4">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Check if authorization is required:</p>
                            <div className="flex gap-2">
                                <input type="text" value={searchCpt} onChange={e => setSearchCpt(e.target.value)}
                                    placeholder="Search CPT code..." className="flex-1 text-sm border rounded px-3 py-1.5 dark:bg-gray-800 dark:border-gray-600" />
                                <select value={selectedPayer} onChange={e => setSelectedPayer(e.target.value)}
                                    className="text-sm border rounded px-3 py-1.5 dark:bg-gray-800 dark:border-gray-600">
                                    <option>Aetna PPO</option><option>BCBS HMO</option><option>UHC</option><option>Medicare</option>
                                </select>
                                <button onClick={() => setCheckResult("Auth REQUIRED for CPT " + (searchCpt || "72148") + " with " + selectedPayer + ". Turnaround: Standard 7 days / Urgent 72 hours.")}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Check</button>
                            </div>
                            {checkResult && (
                                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {checkResult}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeView === "batch" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Batch Eligibility Verification</h3>
                            <button className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 flex items-center gap-1.5">
                                <RefreshCw className="h-3 w-3" /> Run Batch Now
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: "Verified", value: "142", pct: "86.7%", color: "text-green-600" },
                                { label: "Failed", value: "8", pct: "4.9%", color: "text-red-600" },
                                { label: "Changed", value: "12", pct: "7.3%", color: "text-amber-600" },
                                { label: "No Coverage", value: "3", pct: "1.8%", color: "text-gray-500" },
                            ].map(s => (
                                <div key={s.label} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 text-center">
                                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                                    <p className="text-[10px] text-gray-500">{s.label} ({s.pct})</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 flex items-center justify-between">
                                <span className="text-xs font-medium">Tomorrow (03/05/2026) — 45 appointments</span>
                                <span className="text-[10px] text-gray-400">Configure Schedule ▼</span>
                            </div>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b dark:border-gray-700 text-gray-500">
                                        <th className="text-left px-3 py-2 font-medium">Patient</th>
                                        <th className="text-left px-3 py-2 font-medium">Payer</th>
                                        <th className="text-left px-3 py-2 font-medium">Status</th>
                                        <th className="text-left px-3 py-2 font-medium">Issue</th>
                                        <th className="text-right px-3 py-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {DEMO_BATCH.map((r, i) => (
                                        <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-3 py-2 font-medium">{r.patient}</td>
                                            <td className="px-3 py-2 text-gray-500">{r.payer}</td>
                                            <td className="px-3 py-2">{batchStatusBadge(r.status)}</td>
                                            <td className="px-3 py-2 text-gray-500">{r.issue || "—"}</td>
                                            <td className="px-3 py-2 text-right">
                                                <button className="text-blue-600 hover:underline text-[10px]">
                                                    {r.status === "verified" ? "View" : r.status === "failed" ? "Retry" : "Review"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Coverage Discovery Results</p>
                            <p className="text-[11px] text-blue-700 dark:text-blue-400">3 of 8 self-pay patients have discoverable coverage:</p>
                            <ul className="mt-1 space-y-0.5 text-[11px] text-blue-700 dark:text-blue-400">
                                <li>Sarah Chen → Medicaid (auto-enrolled)</li>
                                <li>Tom Davis → BCBS through employer</li>
                                <li>Amy White → Tricare (dependent)</li>
                            </ul>
                            <p className="mt-1 text-[11px] font-medium text-blue-800 dark:text-blue-300">Potential recovered revenue: $4,200</p>
                            <button className="mt-2 px-3 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700">Apply Discovered Coverage</button>
                        </div>
                    </div>
                )}

                {activeView === "estimate" && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Patient Cost Estimate</h3>
                        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-xs text-gray-500">Insurance: Aetna PPO (Verified today)</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { cpt: "99214", desc: "Office Visit, Est.", allowed: 165, copay: 30, deductible: 0, coins: 0, patient: 30 },
                                    { cpt: "80053", desc: "CMP Lab", allowed: 42, copay: 0, deductible: 42, coins: 0, patient: 42 },
                                    { cpt: "36415", desc: "Venipuncture", allowed: 12, copay: 0, deductible: 12, coins: 0, patient: 12 },
                                ].map(s => (
                                    <div key={s.cpt} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
                                        <div>
                                            <span className="text-xs font-medium">CPT {s.cpt} — {s.desc}</span>
                                            <p className="text-[10px] text-gray-500">Allowed: ${s.allowed} | Copay: ${s.copay} | Deductible: ${s.deductible}</p>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">${s.patient.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-3 border-t dark:border-gray-700">
                                <div className="flex justify-between text-xs text-gray-500"><span>Copays</span><span>$30.00</span></div>
                                <div className="flex justify-between text-xs text-gray-500"><span>Deductible</span><span>$54.00</span></div>
                                <div className="flex justify-between text-xs text-gray-500"><span>Coinsurance</span><span>$0.00</span></div>
                                <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t dark:border-gray-700">
                                    <span>Estimated Patient Responsibility</span>
                                    <span className="text-blue-600">$84.00</span>
                                </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                                <button className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1">
                                    <Printer className="h-3 w-3" /> Print Estimate
                                </button>
                                <button className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Collect Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
