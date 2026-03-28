"use client";

import React, { useState } from "react";
import { Pill, CheckCircle2, Clock, RefreshCw, AlertTriangle, Filter, XCircle } from "lucide-react";

interface Medication {
    name: string;
    dose: string;
    freq: string;
    prescriber: string;
    pharmacy: string;
    status: string;
    lastFilled: string;
}

interface RefillRequest {
    id: string;
    drug: string;
    refillNum: number;
    requestedBy: string;
}

interface RxHistory {
    date: string;
    drug: string;
    status: string;
    pharmacy: string;
}

const ACTIVE_MEDS: Medication[] = [
    { name: "Metformin 500mg", dose: "BID", freq: "Twice daily", prescriber: "Dr. Williams", pharmacy: "CVS #1234", status: "Filled", lastFilled: "03/01/2026" },
    { name: "Lisinopril 10mg", dose: "QD", freq: "Once daily", prescriber: "Dr. Williams", pharmacy: "CVS #1234", status: "Filled", lastFilled: "02/15/2026" },
    { name: "Atorvastatin 20mg", dose: "QHS", freq: "At bedtime", prescriber: "Dr. Chen", pharmacy: "Walgreens", status: "Sent", lastFilled: "03/04/2026" },
];

const REFILL_REQUESTS: RefillRequest[] = [
    { id: "1", drug: "Metformin 500mg", refillNum: 2, requestedBy: "CVS" },
];

const RX_HISTORY: RxHistory[] = [
    { date: "03/01/2026", drug: "Metformin 500mg", status: "Filled", pharmacy: "CVS #1234" },
    { date: "02/15/2026", drug: "Amoxicillin 500mg", status: "Filled", pharmacy: "Walgreens" },
    { date: "01/20/2026", drug: "Prednisone 10mg", status: "Filled", pharmacy: "CVS #1234" },
    { date: "12/05/2025", drug: "Azithromycin 250mg", status: "Filled", pharmacy: "CVS #1234" },
    { date: "11/10/2025", drug: "Ibuprofen 600mg", status: "Cancelled", pharmacy: "—" },
];

export default function RxHistoryTab({ patientId }: { patientId?: string }) {
    const [filter, setFilter] = useState("all");

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-600" /> Medications & Prescriptions
                </h3>
            </div>

            <div>
                <p className="text-xs font-medium text-gray-500 mb-2">ACTIVE MEDICATIONS</p>
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500">
                                <th className="text-left px-3 py-2 font-medium">Medication</th>
                                <th className="text-left px-3 py-2 font-medium">Dose</th>
                                <th className="text-left px-3 py-2 font-medium">Prescriber</th>
                                <th className="text-left px-3 py-2 font-medium">Pharmacy</th>
                                <th className="text-left px-3 py-2 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ACTIVE_MEDS.map((m, i) => (
                                <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-3 py-2 font-medium">{m.name}</td>
                                    <td className="px-3 py-2 text-gray-500">{m.dose}</td>
                                    <td className="px-3 py-2 text-gray-500">{m.prescriber}</td>
                                    <td className="px-3 py-2 text-gray-500">{m.pharmacy}</td>
                                    <td className="px-3 py-2">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${m.status === "Filled" ? "text-green-600" : "text-blue-600"}`}>
                                            {m.status === "Filled" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {m.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {REFILL_REQUESTS.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">REFILL REQUESTS</p>
                    {REFILL_REQUESTS.map(r => (
                        <div key={r.id} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-amber-600" />
                                <span className="text-sm">{r.drug} — refill #{r.refillNum} requested by {r.requestedBy}</span>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 bg-green-600 text-white text-[10px] rounded hover:bg-green-700">Approve</button>
                                <button className="px-3 py-1 bg-red-100 text-red-700 text-[10px] rounded hover:bg-red-200">Deny</button>
                                <button className="px-3 py-1 bg-gray-100 text-gray-700 text-[10px] rounded hover:bg-gray-200">Change</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div>
                <p className="text-xs font-medium text-gray-500 mb-2">PRESCRIPTION HISTORY</p>
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500">
                                <th className="text-left px-3 py-2 font-medium">Date</th>
                                <th className="text-left px-3 py-2 font-medium">Drug</th>
                                <th className="text-left px-3 py-2 font-medium">Status</th>
                                <th className="text-left px-3 py-2 font-medium">Pharmacy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RX_HISTORY.map((rx, i) => (
                                <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-3 py-2 text-gray-500">{rx.date}</td>
                                    <td className="px-3 py-2 font-medium">{rx.drug}</td>
                                    <td className="px-3 py-2">
                                        <span className={`text-[10px] font-medium ${rx.status === "Filled" ? "text-green-600" : "text-red-500"}`}>
                                            {rx.status === "Filled" ? "Filled" : "Cancelled"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500">{rx.pharmacy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">PDMP Summary (last query: today)</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> No controlled substance prescriptions found in past 12 months.
                </p>
            </div>
        </div>
    );
}
