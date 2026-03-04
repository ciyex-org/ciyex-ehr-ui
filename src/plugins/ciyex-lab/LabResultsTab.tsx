"use client";

import React, { useState } from "react";
import { FlaskConical, Clock, CheckCircle2, AlertTriangle, TrendingUp, FileText, Eye } from "lucide-react";

interface PendingOrder { tests: string; lab: string; orderedDate: string; status: string; }
interface ResultItem { test: string; value: string; unit: string; refRange: string; flag: string; }
interface ResultPanel { name: string; date: string; signedBy: string; items: ResultItem[]; }

const PENDING: PendingOrder[] = [
    { tests: "CMP + CBC", lab: "Quest", orderedDate: "03/04", status: "In Lab" },
    { tests: "Lipid Panel", lab: "LabCorp", orderedDate: "03/02", status: "Received" },
];

const RESULTS: ResultPanel[] = [
    {
        name: "Lipid Panel", date: "03/02/2026", signedBy: "Dr. Williams",
        items: [
            { test: "Total Cholesterol", value: "242", unit: "mg/dL", refRange: "<200", flag: "HIGH" },
            { test: "LDL Cholesterol", value: "165", unit: "mg/dL", refRange: "<100", flag: "HIGH" },
            { test: "HDL Cholesterol", value: "45", unit: "mg/dL", refRange: ">40", flag: "NORMAL" },
            { test: "Triglycerides", value: "160", unit: "mg/dL", refRange: "<150", flag: "HIGH" },
        ],
    },
    {
        name: "Complete Blood Count", date: "02/20/2026", signedBy: "Dr. Williams",
        items: [
            { test: "WBC", value: "7.2", unit: "K/uL", refRange: "4.5-11.0", flag: "NORMAL" },
            { test: "RBC", value: "4.8", unit: "M/uL", refRange: "4.5-5.5", flag: "NORMAL" },
            { test: "Hemoglobin", value: "14.2", unit: "g/dL", refRange: "13.5-17.5", flag: "NORMAL" },
            { test: "Hematocrit", value: "42.1", unit: "%", refRange: "38-50", flag: "NORMAL" },
            { test: "Platelets", value: "245", unit: "K/uL", refRange: "150-400", flag: "NORMAL" },
        ],
    },
];

export default function LabResultsTab({ patientId }: { patientId?: string }) {
    const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
    const [view, setView] = useState<"results" | "trending">("results");

    const flagColor = (flag: string) => {
        if (flag === "HIGH" || flag === "CRITICAL_HIGH") return "text-red-600 dark:text-red-400 font-medium";
        if (flag === "LOW" || flag === "CRITICAL_LOW") return "text-blue-600 dark:text-blue-400 font-medium";
        return "text-gray-500";
    };

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-teal-600" /> Lab Results
                    {PENDING.length > 0 && <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Pending: {PENDING.length} orders</span>}
                </h3>
                <div className="flex gap-1">
                    {(["results", "trending"] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1 text-[10px] font-medium rounded ${view === v ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                            {v === "results" ? "Results" : "Trending"}
                        </button>
                    ))}
                </div>
            </div>

            {PENDING.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">PENDING ORDERS</p>
                    <div className="space-y-1">
                        {PENDING.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-amber-600" /><span className="text-xs">{p.tests} — {p.lab}</span></div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500"><span>Ordered {p.orderedDate}</span><span className="text-amber-600 font-medium">{p.status}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === "results" && (
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">RECENT RESULTS</p>
                    <div className="space-y-3">
                        {RESULTS.map((panel, pi) => (
                            <div key={pi} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">{panel.name}</span>
                                        <span className="text-[10px] text-gray-500">({panel.date})</span>
                                    </div>
                                    <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Signed by {panel.signedBy}</span>
                                </div>
                                <table className="w-full text-xs">
                                    <thead><tr className="text-gray-400 border-b dark:border-gray-700"><th className="text-left px-3 py-1.5 font-normal">Test</th><th className="text-right px-3 py-1.5 font-normal">Result</th><th className="text-right px-3 py-1.5 font-normal">Ref Range</th><th className="text-right px-3 py-1.5 font-normal">Flag</th></tr></thead>
                                    <tbody>
                                        {panel.items.map((item, ii) => (
                                            <tr key={ii} className="border-b dark:border-gray-700 last:border-0">
                                                <td className="px-3 py-1.5">{item.test}</td>
                                                <td className={`px-3 py-1.5 text-right ${flagColor(item.flag)}`}>{item.value} {item.unit}</td>
                                                <td className="px-3 py-1.5 text-right text-gray-400">{item.refRange}</td>
                                                <td className="px-3 py-1.5 text-right">
                                                    {item.flag !== "NORMAL" && <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600"><AlertTriangle className="h-2.5 w-2.5" /> {item.flag}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === "trending" && (
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
                    <p className="text-xs font-medium mb-3">LDL Cholesterol Trend</p>
                    <div className="h-32 flex items-end gap-3 px-2">
                        {[{ date: "Jan '25", val: 100 }, { date: "Apr '25", val: 130 }, { date: "Jul '25", val: 150 }, { date: "Oct '25", val: 155 }, { date: "Mar '26", val: 165 }].map((p, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300">{p.val}</span>
                                <div className={`w-full rounded-t ${p.val > 100 ? "bg-red-400" : "bg-green-400"}`} style={{ height: `${(p.val / 200) * 100}%` }} />
                                <span className="text-[8px] text-gray-400">{p.date}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded" /> Normal (&lt;100)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" /> High (&gt;100)</span>
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 flex items-center gap-1"><Eye className="h-3 w-3" /> Review & Sign</button>
                <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-200 flex items-center gap-1"><FileText className="h-3 w-3" /> Notify Patient</button>
                <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-200 flex items-center gap-1"><FlaskConical className="h-3 w-3" /> Order Follow-up</button>
            </div>
        </div>
    );
}
