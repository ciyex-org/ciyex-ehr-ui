"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { Activity, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

// Vital measurement definitions — order matches standard EHR flowsheet
const VITAL_ROWS = [
    { key: "weightKg", label: "Weight", unit: "kg", icon: "⚖️" },
    { key: "heightCm", label: "Height", unit: "cm", icon: "📏" },
    { key: "bmi", label: "BMI", unit: "kg/m²", icon: "📊" },
    { key: "bpSystolic", label: "BP Systolic", unit: "mmHg", icon: "❤️" },
    { key: "bpDiastolic", label: "BP Diastolic", unit: "mmHg", icon: "❤️" },
    { key: "pulse", label: "Pulse", unit: "/min", icon: "💓" },
    { key: "respiration", label: "Respiration", unit: "/min", icon: "🫁" },
    { key: "temperatureC", label: "Temperature", unit: "°C", icon: "🌡️" },
    { key: "oxygenSaturation", label: "O₂ Saturation", unit: "%", icon: "🩸" },
];

// Normal ranges for color coding
const NORMAL_RANGES: Record<string, { low: number; high: number }> = {
    bpSystolic: { low: 90, high: 140 },
    bpDiastolic: { low: 60, high: 90 },
    pulse: { low: 60, high: 100 },
    temperatureC: { low: 36.1, high: 37.2 },
    oxygenSaturation: { low: 95, high: 100 },
    bmi: { low: 18.5, high: 25 },
    respiration: { low: 12, high: 20 },
};

type VitalsRecord = Record<string, unknown>;

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return "—";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return "—";
    }
}

function formatTime(dateStr: string | undefined): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
        return "";
    }
}

function getValueClass(key: string, value: number | undefined): string {
    if (value == null || !NORMAL_RANGES[key]) return "";
    const range = NORMAL_RANGES[key];
    if (value < range.low) return "text-blue-600 font-medium";
    if (value > range.high) return "text-red-600 font-medium";
    return "text-green-700";
}

function getTrendIcon(current: number | undefined, previous: number | undefined) {
    if (current == null || previous == null) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.1) return <Minus className="w-3 h-3 text-gray-400 inline ml-1" />;
    if (diff > 0) return <TrendingUp className="w-3 h-3 text-red-400 inline ml-1" />;
    return <TrendingDown className="w-3 h-3 text-blue-400 inline ml-1" />;
}

export default function VitalsFlowsheet({ patientId }: { patientId: number }) {
    const [records, setRecords] = useState<VitalsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const res = await fetchWithAuth(
                    `${API_BASE()}/api/fhir-resource/vitals/patient/${patientId}?page=0&size=50`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const body = await res.json();
                const content = body.data?.content || [];
                setRecords(content);
            } catch (err) {
                console.error("Failed to load vitals:", err);
                setError("Failed to load vitals");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [patientId]);

    // Deduplicate by date — group records that share the same date, take latest per date
    const columns = useMemo(() => {
        if (!records.length) return [];
        // Sort newest first
        const sorted = [...records].sort((a, b) => {
            const da = new Date(String(a.recordedAt || "")).getTime() || 0;
            const db = new Date(String(b.recordedAt || "")).getTime() || 0;
            return db - da;
        });
        // Deduplicate: keep only records that have at least one vital value
        return sorted.filter(r =>
            VITAL_ROWS.some(v => r[v.key] != null && r[v.key] !== "" && r[v.key] !== undefined)
        ).slice(0, 10); // Show up to 10 most recent encounters
    }, [records]);

    // Also count records with NO values (broken data)
    const emptyCount = records.length - columns.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-gray-500">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span>Loading vitals...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-semibold text-gray-800">Vitals Flowsheet</h3>
                    {columns.length > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {columns.length} recording{columns.length !== 1 ? "s" : ""}
                        </span>
                    )}
                    {emptyCount > 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {emptyCount} empty record{emptyCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                {/* Add button placeholder — creates via GenericFhirTab add flow */}
            </div>

            {columns.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                    <Activity className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="text-sm">No vitals recorded yet</p>
                    <p className="text-xs mt-1">Vitals are recorded during encounters</p>
                </div>
            ) : (
                <div className="flex-1 overflow-auto border rounded-lg bg-white">
                    <table className="text-sm border-collapse" style={{ minWidth: "100%" }}>
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50 border-b">
                                {/* Row label column (sticky left, fixed width) */}
                                <th className="sticky left-0 z-20 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-700 border-r w-40 min-w-40 max-w-40">
                                    Measurement
                                </th>
                                {/* Date columns — newest first, flexible */}
                                {columns.map((col, i) => (
                                    <th
                                        key={String(col.id || i)}
                                        className={`text-center px-3 py-2 font-medium border-r min-w-[110px] ${
                                            i === 0 ? "bg-indigo-50 text-indigo-800" : "bg-gray-50 text-gray-600"
                                        }`}
                                    >
                                        <div className="text-xs">{formatDate(String(col.recordedAt || ""))}</div>
                                        <div className="text-[10px] text-gray-400">{formatTime(String(col.recordedAt || ""))}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {VITAL_ROWS.map((row, ri) => (
                                <tr
                                    key={row.key}
                                    className={`border-b ${ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50/30`}
                                >
                                    {/* Row label */}
                                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-r w-40 min-w-40 max-w-40">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">{row.icon}</span>
                                            <div>
                                                <div className="font-medium text-gray-700 text-xs">{row.label}</div>
                                                <div className="text-[10px] text-gray-400">{row.unit}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Value cells */}
                                    {columns.map((col, ci) => {
                                        const raw = col[row.key];
                                        const val = raw != null && raw !== "" ? Number(raw) : undefined;
                                        const prevCol = columns[ci + 1];
                                        const prevRaw = prevCol?.[row.key];
                                        const prevVal = prevRaw != null && prevRaw !== "" ? Number(prevRaw) : undefined;
                                        const displayVal = val != null && !isNaN(val) ? val : null;

                                        return (
                                            <td
                                                key={String(col.id || ci)}
                                                className={`text-center px-3 py-2 border-r ${
                                                    ci === 0 ? "bg-indigo-50/30" : ""
                                                }`}
                                            >
                                                {displayVal != null ? (
                                                    <span className={getValueClass(row.key, displayVal)}>
                                                        {displayVal % 1 === 0 ? displayVal : displayVal.toFixed(1)}
                                                        {getTrendIcon(displayVal, prevVal)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {/* Notes row */}
                            <tr className="border-b bg-white hover:bg-blue-50/30">
                                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-r">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">📝</span>
                                        <div className="font-medium text-gray-700 text-xs">Notes</div>
                                    </div>
                                </td>
                                {columns.map((col, ci) => (
                                    <td
                                        key={String(col.id || ci)}
                                        className={`text-center px-2 py-2 border-r text-[10px] text-gray-500 max-w-[120px] truncate ${
                                            ci === 0 ? "bg-indigo-50/30" : ""
                                        }`}
                                        title={String(col.notes || "")}
                                    >
                                        {col.notes ? String(col.notes).substring(0, 30) : "—"}
                                    </td>
                                ))}
                            </tr>
                            {/* Signed row */}
                            <tr className="bg-gray-50/50 hover:bg-blue-50/30">
                                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-r">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">✍️</span>
                                        <div className="font-medium text-gray-700 text-xs">Signed</div>
                                    </div>
                                </td>
                                {columns.map((col, ci) => (
                                    <td
                                        key={String(col.id || ci)}
                                        className={`text-center px-3 py-2 border-r ${
                                            ci === 0 ? "bg-indigo-50/30" : ""
                                        }`}
                                    >
                                        {col.signed === true || col.signed === "true" || col.signed === "final" ? (
                                            <span className="text-green-600 text-xs">✓</span>
                                        ) : (
                                            <span className="text-gray-300 text-xs">—</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
