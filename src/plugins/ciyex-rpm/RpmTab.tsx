"use client";

import React, { useState } from "react";
import { Activity, Heart, Droplets, Scale, Wind, AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface Reading {
    type: string;
    icon: React.ElementType;
    value: string;
    unit: string;
    time: string;
    status: string;
    trend: string;
}

interface Alert {
    id: string;
    type: string;
    severity: string;
    message: string;
    time: string;
    acknowledged: boolean;
}

const READINGS: Reading[] = [
    { type: "Blood Pressure", icon: Heart, value: "138/88", unit: "mmHg", time: "8:30 AM today", status: "borderline", trend: "↑" },
    { type: "Blood Glucose", icon: Droplets, value: "142", unit: "mg/dL", time: "7:00 AM today", status: "high", trend: "↑" },
    { type: "Weight", icon: Scale, value: "185.4", unit: "lbs", time: "6:45 AM today", status: "normal", trend: "→" },
    { type: "SpO2", icon: Wind, value: "97", unit: "%", time: "8:30 AM today", status: "normal", trend: "→" },
];

const ALERTS: Alert[] = [
    { id: "1", type: "Glucose", severity: "WARNING", message: "Blood glucose 142 mg/dL exceeds threshold (140)", time: "7:00 AM today", acknowledged: false },
    { id: "2", type: "BP", severity: "WARNING", message: "Systolic 138 mmHg approaching threshold (140)", time: "8:30 AM today", acknowledged: false },
];

const BP_HISTORY = [
    { date: "03/04", systolic: 138, diastolic: 88 },
    { date: "03/03", systolic: 132, diastolic: 84 },
    { date: "03/02", systolic: 145, diastolic: 92 },
    { date: "03/01", systolic: 128, diastolic: 82 },
    { date: "02/28", systolic: 135, diastolic: 86 },
    { date: "02/27", systolic: 130, diastolic: 84 },
    { date: "02/26", systolic: 142, diastolic: 90 },
];

export default function RpmTab({ patientId }: { patientId?: string }) {
    const [view, setView] = useState<"readings" | "alerts" | "billing">("readings");
    const [ackAlerts, setAckAlerts] = useState<Set<string>>(new Set());

    const statusColor = (s: string) => {
        if (s === "high" || s === "critical") return "text-red-600 dark:text-red-400";
        if (s === "borderline") return "text-amber-600 dark:text-amber-400";
        return "text-green-600 dark:text-green-400";
    };

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-rose-600" /> Remote Patient Monitoring</h3>
                <div className="flex gap-1">
                    {(["readings", "alerts", "billing"] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1 text-[10px] font-medium rounded ${view === v ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                            {v === "readings" ? "Readings" : v === "alerts" ? `Alerts (${ALERTS.filter(a => !ackAlerts.has(a.id)).length})` : "Billing"}
                        </button>
                    ))}
                </div>
            </div>

            {view === "readings" && (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        {READINGS.map((r, i) => {
                            const Icon = r.icon;
                            return (
                                <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${statusColor(r.status)}`} /><span className="text-xs font-medium">{r.type}</span></div>
                                        <span className="text-[9px] text-gray-400">{r.time}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-bold ${statusColor(r.status)}`}>{r.value}</span>
                                        <span className="text-xs text-gray-500">{r.unit}</span>
                                        <span className="text-sm ml-1">{r.trend}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
                        <p className="text-xs font-medium mb-3">Blood Pressure Trend (7 days)</p>
                        <div className="h-24 flex items-end gap-2">
                            {BP_HISTORY.map((p, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                    <span className="text-[8px] text-gray-500">{p.systolic}/{p.diastolic}</span>
                                    <div className="w-full flex flex-col gap-0.5">
                                        <div className={`w-full rounded-t ${p.systolic >= 140 ? "bg-red-400" : p.systolic >= 130 ? "bg-amber-400" : "bg-green-400"}`} style={{ height: `${(p.systolic / 160) * 60}px` }} />
                                    </div>
                                    <span className="text-[7px] text-gray-400">{p.date}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 h-[1px] bg-red-300 relative"><span className="absolute right-0 text-[7px] text-red-400 -top-2">140 (threshold)</span></div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Device Status</p>
                        <div className="mt-2 space-y-1 text-xs">
                            {[{ d: "BP Monitor", s: "Connected", bat: "82%" }, { d: "Glucose Meter", s: "Connected", bat: "64%" }, { d: "Weight Scale", s: "Connected", bat: "91%" }, { d: "Pulse Oximeter", s: "Connected", bat: "73%" }].map(d => (
                                <div key={d.d} className="flex items-center justify-between">
                                    <span className="text-gray-500">{d.d}</span>
                                    <div className="flex items-center gap-3"><span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{d.s}</span><span className="text-gray-400">Battery: {d.bat}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {view === "alerts" && (
                <div className="space-y-2">
                    {ALERTS.map(a => (
                        <div key={a.id} className={`border rounded-lg p-3 ${ackAlerts.has(a.id) ? "border-gray-200 dark:border-gray-700 opacity-60" : a.severity === "CRITICAL" ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className={`h-4 w-4 ${a.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"}`} />
                                    <span className="text-xs font-medium">{a.message}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">{a.time}</span>
                            </div>
                            {!ackAlerts.has(a.id) && (
                                <button onClick={() => setAckAlerts(p => new Set(p).add(a.id))} className="mt-2 px-3 py-1 bg-white dark:bg-gray-800 border text-xs rounded hover:bg-gray-50">Acknowledge</button>
                            )}
                        </div>
                    ))}
                    {ALERTS.length === 0 && <div className="text-center py-8 text-xs text-gray-500">No active alerts</div>}
                </div>
            )}

            {view === "billing" && (
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-medium">RPM Billing Summary — March 2026</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded"><p className="text-gray-500">Monitoring days</p><p className="text-lg font-bold">4 <span className="text-xs text-gray-400 font-normal">of 16 required</span></p></div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded"><p className="text-gray-500">Interactive minutes</p><p className="text-lg font-bold">12 <span className="text-xs text-gray-400 font-normal">of 20 required</span></p></div>
                    </div>
                    <div className="space-y-1 text-xs">
                        {[
                            { cpt: "99453", desc: "Device setup & education", status: "Billed", billable: true },
                            { cpt: "99454", desc: "Device supply (16+ days)", status: "4/16 days", billable: false },
                            { cpt: "99457", desc: "First 20 min clinical time", status: "12/20 min", billable: false },
                            { cpt: "99458", desc: "Each additional 20 min", status: "Not yet", billable: false },
                        ].map(c => (
                            <div key={c.cpt} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <div><span className="font-medium">CPT {c.cpt}</span><span className="text-gray-500 ml-2">{c.desc}</span></div>
                                <span className={c.billable ? "text-green-600 font-medium" : "text-gray-400"}>{c.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
