"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { Activity, Plus, TrendingUp, TrendingDown, Minus, Save, X, Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { formatDisplayDate } from "@/utils/dateUtils";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

// Vital measurement definitions — order matches standard EHR flowsheet
const VITAL_ROWS = [
    { key: "weightKg", label: "Weight", unit: "kg", icon: "⚖️" },
    { key: "heightCm", label: "Height", unit: "cm", icon: "📏" },
    { key: "bmi", label: "BMI", unit: "kg/m²", icon: "📊" },
    { key: "bpSystolic", label: "BP Systolic", unit: "mmHg", icon: "❤️" },
    { key: "bpDiastolic", label: "BP Diastolic", unit: "mmHg", icon: "❤️" },
    { key: "pulse", label: "Pulse", unit: "/min", icon: "💓" },
    { key: "respiration", label: "Respiration", unit: "breaths/min", icon: "💨" },
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
    return formatDisplayDate(dateStr) || "—";
}

function formatTime(dateStr: string | undefined): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
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
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addForm, setAddForm] = useState<Record<string, string>>({});
    const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">("imperial");
    const [weightDisplay, setWeightDisplay] = useState("");
    const [heightDisplay, setHeightDisplay] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [sortAsc, setSortAsc] = useState(false);
    const PAGE_SIZE = 5;

    function handleWeightChange(val: string) {
        setWeightDisplay(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            const kg = unitSystem === "imperial" ? num * 0.453592 : num;
            setAddForm(prev => ({ ...prev, weightKg: kg.toFixed(2) }));
        } else {
            setAddForm(prev => ({ ...prev, weightKg: "" }));
        }
    }

    function handleHeightChange(val: string) {
        setHeightDisplay(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            const cm = unitSystem === "imperial" ? num * 2.54 : num;
            setAddForm(prev => ({ ...prev, heightCm: cm.toFixed(2) }));
        } else {
            setAddForm(prev => ({ ...prev, heightCm: "" }));
        }
    }

    // Sync display values when unit system is toggled
    useEffect(() => {
        const wKg = parseFloat(addForm.weightKg || "");
        const hCm = parseFloat(addForm.heightCm || "");
        if (!isNaN(wKg) && wKg > 0) {
            setWeightDisplay(unitSystem === "imperial" ? (wKg / 0.453592).toFixed(1) : wKg.toFixed(1));
        }
        if (!isNaN(hCm) && hCm > 0) {
            setHeightDisplay(unitSystem === "imperial" ? (hCm / 2.54).toFixed(1) : hCm.toFixed(1));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unitSystem]);

    const loadVitals = async () => {
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
    };

    useEffect(() => { loadVitals(); }, [patientId]);

    // Auto-calculate BMI when weight or height changes
    useEffect(() => {
        const w = parseFloat(addForm.weightKg || "");
        const h = parseFloat(addForm.heightCm || "");
        if (w > 0 && h > 0) {
            const heightM = h / 100;
            if (heightM > 0) {
                const calculated = (w / (heightM * heightM)).toFixed(1);
                if (addForm.bmi !== calculated) {
                    setAddForm(prev => ({ ...prev, bmi: calculated }));
                }
            }
        } else if (addForm.bmi) {
            setAddForm(prev => ({ ...prev, bmi: "" }));
        }
    }, [addForm.weightKg, addForm.heightCm]);

    const handleAddVitals = async () => {
        setSaving(true);
        try {
            const payload: Record<string, any> = { recordedAt: new Date().toISOString() };
            for (const row of VITAL_ROWS) {
                if (row.key === "bmi") continue; // calculated below
                if (addForm[row.key]) payload[row.key] = parseFloat(addForm[row.key]);
            }
            // Always calculate BMI inline to avoid stale-state race condition
            const w = parseFloat(addForm.weightKg || "");
            const h = parseFloat(addForm.heightCm || "");
            if (w > 0 && h > 0) {
                const heightM = h / 100;
                if (heightM > 0) payload.bmi = parseFloat((w / (heightM * heightM)).toFixed(1));
            }
            if (addForm.notes) payload.notes = addForm.notes;
            const res = await fetchWithAuth(
                `${API_BASE()}/api/fhir-resource/vitals/patient/${patientId}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
            );
            if (res.ok) {
                setShowAddForm(false);
                setAddForm({});
                setWeightDisplay("");
                setHeightDisplay("");
                await new Promise(r => setTimeout(r, 2000));
                await loadVitals();
            } else {
                setError("Failed to save vitals");
            }
        } catch (err) {
            console.error("Failed to save vitals:", err);
            setError("Failed to save vitals");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleSign = async (record: VitalsRecord) => {
        const id = record.id || record.fhirId;
        if (!id) return;
        const isSigned = record.signed === true || record.signed === "true" || record.signed === "final";
        try {
            const res = await fetchWithAuth(
                `${API_BASE()}/api/fhir-resource/vitals/patient/${patientId}/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...record, signed: isSigned ? false : "final" }),
                }
            );
            if (res.ok) {
                await new Promise(r => setTimeout(r, 1500));
                await loadVitals();
            }
        } catch (err) {
            console.error("Failed to toggle sign:", err);
        }
    };

    // Deduplicate by date — group records that share the same date, take latest per date
    const allColumns = useMemo(() => {
        if (!records.length) return [];
        const sorted = [...records].sort((a, b) => {
            const da = new Date(String(a.recordedAt || "")).getTime() || 0;
            const db = new Date(String(b.recordedAt || "")).getTime() || 0;
            return sortAsc ? da - db : db - da;
        });
        return sorted.filter(r =>
            VITAL_ROWS.some(v => r[v.key] != null && r[v.key] !== "" && r[v.key] !== undefined)
        );
    }, [records, sortAsc]);

    const totalPages = Math.max(1, Math.ceil(allColumns.length / PAGE_SIZE));
    const columns = useMemo(() => {
        const start = currentPage * PAGE_SIZE;
        return allColumns.slice(start, start + PAGE_SIZE);
    }, [allColumns, currentPage]);

    // Also count records with NO values (broken data)
    const emptyCount = records.length - allColumns.length;

    if (loading) {
        return (
            <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-8 flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span>Loading vitals...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-8 flex items-center justify-center text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header — always fully visible, never clipped */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2 flex-wrap">
                    <Activity className="w-5 h-5 text-indigo-600 shrink-0" />
                    <h3 className="text-base font-semibold text-gray-800">Vitals Flowsheet</h3>
                    {allColumns.length > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {allColumns.length} recording{allColumns.length !== 1 ? "s" : ""}
                        </span>
                    )}
                    <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded" title="Toggle sort order">
                        <ArrowUpDown className="w-3 h-3" />
                        {sortAsc ? "Oldest first" : "Newest first"}
                    </button>
                    {emptyCount > 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {emptyCount} empty record{emptyCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 shrink-0 ml-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Vitals
                </button>
            </div>

            {/* Add Vitals Form */}
            {showAddForm && (
                <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h4 className="text-sm font-semibold text-gray-700">New Vital Signs</h4>
                            <div className="flex items-center gap-0.5 bg-gray-200 rounded-md p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setUnitSystem("imperial")}
                                    className={`px-2 py-0.5 rounded transition-colors ${unitSystem === "imperial" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                                >Imperial</button>
                                <button
                                    type="button"
                                    onClick={() => setUnitSystem("metric")}
                                    className={`px-2 py-0.5 rounded transition-colors ${unitSystem === "metric" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                                >Metric</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddVitals}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setAddForm({}); setWeightDisplay(""); setHeightDisplay(""); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {VITAL_ROWS.map((row) => {
                            const isWeight = row.key === "weightKg";
                            const isHeight = row.key === "heightCm";
                            const displayLabel = isWeight
                                ? `Weight (${unitSystem === "imperial" ? "lbs" : "kg"})`
                                : isHeight
                                ? `Height (${unitSystem === "imperial" ? "in" : "cm"})`
                                : `${row.label} (${row.unit})`;
                            const inputValue = isWeight
                                ? weightDisplay
                                : isHeight
                                ? heightDisplay
                                : (addForm[row.key] || "");
                            const handleChange = isWeight
                                ? (e: React.ChangeEvent<HTMLInputElement>) => handleWeightChange(e.target.value)
                                : isHeight
                                ? (e: React.ChangeEvent<HTMLInputElement>) => handleHeightChange(e.target.value)
                                : (e: React.ChangeEvent<HTMLInputElement>) => setAddForm(prev => ({ ...prev, [row.key]: e.target.value }));
                            return (
                                <div key={row.key}>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {row.icon} {displayLabel}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={inputValue}
                                        onChange={handleChange}
                                        readOnly={row.key === "bmi"}
                                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${row.key === "bmi" ? "bg-gray-50" : ""}`}
                                        placeholder={row.key === "bmi" ? "Auto" : "—"}
                                        title={row.key === "bmi" ? "Auto-calculated from weight and height" : undefined}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        <input
                            type="text"
                            value={addForm.notes || ""}
                            onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Optional notes"
                        />
                    </div>
                </div>
            )}

            {columns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Activity className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="text-sm">No vitals recorded yet</p>
                    <p className="text-xs mt-1">Vitals are recorded during encounters</p>
                </div>
            ) : (<>
                <div className="flex-1 overflow-x-auto overflow-y-hidden border rounded-lg bg-white">
                    <table className="text-sm border-collapse w-full" style={{ minWidth: `${160 + columns.length * 130}px` }}>
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50 border-b">
                                {/* Row label column (sticky left, fixed width) */}
                                <th className="sticky left-0 z-20 bg-gray-50 text-left px-4 py-2.5 font-semibold text-gray-700 border-r" style={{ width: 160, minWidth: 160 }}>
                                    Measurement
                                </th>
                                {/* Date columns — newest first, flexible */}
                                {columns.map((col, i) => (
                                    <th
                                        key={String(col.id || i)}
                                        className={`text-center px-4 py-2.5 font-medium border-r ${
                                            i === 0 ? "bg-indigo-50 text-indigo-800" : "bg-gray-50 text-gray-600"
                                        }`}
                                        style={{ minWidth: 130 }}
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
                                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-r" style={{ width: 160, minWidth: 160 }}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{row.icon}</span>
                                            <div>
                                                <div className="font-medium text-gray-700 text-xs leading-relaxed">{row.label}</div>
                                                <div className="text-[10px] text-gray-400">{row.unit}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Value cells */}
                                    {columns.map((col, ci) => {
                                        let raw = col[row.key];
                                        // Auto-calculate BMI client-side if not stored but weight and height are available
                                        if (row.key === "bmi" && (raw == null || raw === "") && col.weightKg && col.heightCm) {
                                            const w = Number(col.weightKg);
                                            const h = Number(col.heightCm);
                                            if (w > 0 && h > 0) {
                                                const heightM = h / 100;
                                                raw = (w / (heightM * heightM)).toFixed(1);
                                            }
                                        }
                                        const val = raw != null && raw !== "" ? Number(raw) : undefined;
                                        const prevCol = columns[ci + 1];
                                        const prevRaw = prevCol?.[row.key];
                                        const prevVal = prevRaw != null && prevRaw !== "" ? Number(prevRaw) : undefined;
                                        const displayVal = val != null && !isNaN(val) ? val : null;

                                        return (
                                            <td
                                                key={String(col.id || ci)}
                                                className={`text-center px-4 py-2.5 border-r ${
                                                    ci === 0 ? "bg-indigo-50/30" : ""
                                                }`}
                                                style={{ minWidth: 130 }}
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
                            {/* Signed row with sign/unsign toggle */}
                            <tr className="bg-gray-50/50 hover:bg-blue-50/30">
                                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-r">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">✍️</span>
                                        <div className="font-medium text-gray-700 text-xs">Signed</div>
                                    </div>
                                </td>
                                {columns.map((col, ci) => {
                                    const isSigned = col.signed === true || col.signed === "true" || col.signed === "final";
                                    return (
                                        <td
                                            key={String(col.id || ci)}
                                            className={`text-center px-2 py-1.5 border-r ${ci === 0 ? "bg-indigo-50/30" : ""}`}
                                        >
                                            <button
                                                onClick={() => handleToggleSign(col)}
                                                className={`text-xs px-2 py-0.5 rounded ${
                                                    isSigned
                                                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                                                        : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                                                }`}
                                                title={isSigned ? "Click to unsign" : "Click to sign"}
                                            >
                                                {isSigned ? "Signed ✓" : "Sign"}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-2 shrink-0 px-1">
                        <span className="text-xs text-gray-500">
                            Page {currentPage + 1} of {totalPages} ({allColumns.length} records)
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage >= totalPages - 1}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </>)}
        </div>
    );
}
