



"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, VitalsDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";

type Props = {
    patientId: number;
    encounterId: number;
    editing?: VitalsDto | null;
    onSaved: (saved: VitalsDto) => void;
    onCancel?: () => void;
};

type UnitSystem = "metric" | "imperial";

// Conversion helpers
const lbsToKg = (lbs: number) => lbs * 0.453592;
const kgToLbs = (kg: number) => kg / 0.453592;
const inToCm = (inches: number) => inches * 2.54;
const cmToIn = (cm: number) => cm / 2.54;
const fToC = (f: number) => (f - 32) * (5 / 9);
const cToF = (c: number) => c * (9 / 5) + 32;

export default function Vitalsform({ patientId, encounterId, editing, onSaved, onCancel }: Props) {
    const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
    const [weightKg, setWeightKg] = useState<string>("");
    const [heightCm, setHeightCm] = useState<string>("");
    const [bpSystolic, setBpSystolic] = useState<string>("");
    const [bpDiastolic, setBpDiastolic] = useState<string>("");
    const [pulse, setPulse] = useState<string>("");
    const [respiration, setRespiration] = useState<string>("");
    const [temperatureC, setTemperatureC] = useState<string>("");
    const [oxygenSaturation, setOxygenSaturation] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    // Display values (in current unit system)
    const [weightDisplay, setWeightDisplay] = useState<string>("");
    const [heightDisplay, setHeightDisplay] = useState<string>("");
    const [tempDisplay, setTempDisplay] = useState<string>("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Auto-calculate BMI from weight and height (derived, always in sync)
    const bmi = useMemo(() => {
        const w = parseFloat(weightKg);
        const h = parseFloat(heightCm);
        if (w > 0 && h > 0) {
            const heightM = h / 100;
            if (heightM > 0) {
                return (w / (heightM * heightM)).toFixed(1);
            }
        }
        return "";
    }, [weightKg, heightCm]);

    function getBmiStatus(bmiValue: string): { label: string; color: string } | null {
        const v = parseFloat(bmiValue);
        if (isNaN(v)) return null;
        if (v < 18.5) return { label: "Underweight", color: "text-blue-600" };
        if (v < 25)   return { label: "Normal",      color: "text-green-600" };
        if (v < 30)   return { label: "Overweight",  color: "text-amber-600" };
        return             { label: "Obese",         color: "text-red-600" };
    }

    // Handle weight input in display units, convert to kg for storage
    function handleWeightChange(displayVal: string) {
        setWeightDisplay(displayVal);
        const num = parseFloat(displayVal);
        if (!isNaN(num) && num > 0) {
            const kg = unitSystem === "imperial" ? lbsToKg(num) : num;
            setWeightKg(kg.toFixed(2));
        } else {
            setWeightKg("");
        }
    }

    // Handle height input in display units, convert to cm for storage
    function handleHeightChange(displayVal: string) {
        setHeightDisplay(displayVal);
        const num = parseFloat(displayVal);
        if (!isNaN(num) && num > 0) {
            const cm = unitSystem === "imperial" ? inToCm(num) : num;
            setHeightCm(cm.toFixed(2));
        } else {
            setHeightCm("");
        }
    }

    // Handle temperature input
    function handleTempChange(displayVal: string) {
        setTempDisplay(displayVal);
        const num = parseFloat(displayVal);
        if (!isNaN(num)) {
            const c = unitSystem === "imperial" ? fToC(num) : num;
            setTemperatureC(c.toFixed(1));
        } else {
            setTemperatureC("");
        }
    }

    // Sync display values when unit system changes
    useEffect(() => {
        const w = parseFloat(weightKg);
        const h = parseFloat(heightCm);
        const t = parseFloat(temperatureC);
        if (!isNaN(w) && w > 0) {
            setWeightDisplay(unitSystem === "imperial" ? kgToLbs(w).toFixed(1) : w.toFixed(1));
        }
        if (!isNaN(h) && h > 0) {
            setHeightDisplay(unitSystem === "imperial" ? cmToIn(h).toFixed(1) : h.toFixed(1));
        }
        if (!isNaN(t)) {
            setTempDisplay(unitSystem === "imperial" ? cToF(t).toFixed(1) : t.toFixed(1));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unitSystem]);

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.vitals && !editing?.id) {
            const data = encounterData.vitals;
            setWeightKg(data.weightKg || "");
            setHeightCm(data.heightCm || "");
            setBpSystolic(data.bpSystolic || "");
            setBpDiastolic(data.bpDiastolic || "");
            setPulse(data.pulse || "");
            setRespiration(data.respiration || "");
            setTemperatureC(data.temperatureC || "");
            setOxygenSaturation(data.oxygenSaturation || "");
            setNotes(data.notes || "");
            // Set display values
            const w = parseFloat(data.weightKg || "");
            const h = parseFloat(data.heightCm || "");
            const t = parseFloat(data.temperatureC || "");
            setWeightDisplay(!isNaN(w) && w > 0 ? (unitSystem === "imperial" ? kgToLbs(w).toFixed(1) : String(w)) : "");
            setHeightDisplay(!isNaN(h) && h > 0 ? (unitSystem === "imperial" ? cmToIn(h).toFixed(1) : String(h)) : "");
            setTempDisplay(!isNaN(t) ? (unitSystem === "imperial" ? cToF(t).toFixed(1) : String(t)) : "");
        } else if (editing?.id) {
            setWeightKg(editing.weightKg?.toString() || "");
            setHeightCm(editing.heightCm?.toString() || "");
            setBpSystolic(editing.bpSystolic?.toString() || "");
            setBpDiastolic(editing.bpDiastolic?.toString() || "");
            setPulse(editing.pulse?.toString() || "");
            setRespiration(editing.respiration?.toString() || "");
            setTemperatureC(editing.temperatureC?.toString() || "");
            setOxygenSaturation(editing.oxygenSaturation?.toString() || "");
            setNotes(editing.notes || "");
            // Set display values
            const w = editing.weightKg;
            const h = editing.heightCm;
            const t = editing.temperatureC;
            setWeightDisplay(w ? (unitSystem === "imperial" ? kgToLbs(w).toFixed(1) : String(w)) : "");
            setHeightDisplay(h ? (unitSystem === "imperial" ? cmToIn(h).toFixed(1) : String(h)) : "");
            setTempDisplay(t ? (unitSystem === "imperial" ? cToF(t).toFixed(1) : String(t)) : "");
        } else {
            setWeightKg("");
            setHeightCm("");
            setBpSystolic("");
            setBpDiastolic("");
            setPulse("");
            setRespiration("");
            setTemperatureC("");
            setOxygenSaturation("");
            setNotes("");
            setWeightDisplay("");
            setHeightDisplay("");
            setTempDisplay("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, patientId, encounterId]);

    useEffect(() => {
        if (weightKg || heightCm || bpSystolic || bpDiastolic || pulse || respiration || temperatureC || oxygenSaturation || notes) {
            setEncounterSection(patientId, encounterId, "vitals", {
                weightKg, heightCm, bpSystolic, bpDiastolic,
                pulse, respiration, temperatureC, oxygenSaturation,
                notes
            });
        }
    }, [weightKg, heightCm, bpSystolic, bpDiastolic, pulse, respiration, temperatureC, oxygenSaturation, notes, patientId, encounterId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);

        try {
            const body: Partial<VitalsDto> = {
                patientId,
                encounterId,
                ...(weightKg ? { weightKg: parseFloat(weightKg) } : {}),
                ...(heightCm ? { heightCm: parseFloat(heightCm) } : {}),
                ...(bpSystolic ? { bpSystolic: parseInt(bpSystolic) } : {}),
                ...(bpDiastolic ? { bpDiastolic: parseInt(bpDiastolic) } : {}),
                ...(pulse ? { pulse: parseInt(pulse) } : {}),
                ...(respiration ? { respiration: parseInt(respiration) } : {}),
                ...(temperatureC ? { temperatureC: parseFloat(temperatureC) } : {}),
                ...(oxygenSaturation ? { oxygenSaturation: parseInt(oxygenSaturation) } : {}),
                ...(bmi ? { bmi: parseFloat(bmi) } : {}),
                ...(notes ? { notes: notes.trim() } : {}),
                ...(editing?.id ? { id: editing.id } : {}),
            };

            const url = editing?.id
                ? `/api/vitals/${patientId}/${encounterId}/${editing.id}`
                : `/api/vitals/${patientId}/${encounterId}`;
            const method = editing?.id ? "PUT" : "POST";

            const res = await fetchWithOrg(url, { method, body: JSON.stringify(body) });
            const json = (await res.json()) as ApiResponse<VitalsDto>;
            if (!res.ok || !json.success) throw new Error(json.message || "Save failed");

            onSaved(json.data!);
            removeEncounterSection(patientId, encounterId, "vitals");

            if (!editing?.id) {
                setWeightKg("");
                setHeightCm("");
                setBpSystolic("");
                setBpDiastolic("");
                setPulse("");
                setRespiration("");
                setTemperatureC("");
                setOxygenSaturation("");
                setNotes("");
                setWeightDisplay("");
                setHeightDisplay("");
                setTempDisplay("");
            }
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    const weightLabel = unitSystem === "imperial" ? "Weight (lbs)" : "Weight (kg)";
    const heightLabel = unitSystem === "imperial" ? "Height (in)" : "Height (cm)";
    const tempLabel = unitSystem === "imperial" ? "Temperature (°F)" : "Temperature (°C)";

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border p-4 shadow-sm bg-white"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                    {editing?.id ? "Edit Vitals" : "Add Vitals"}
                </h3>
                <div className="flex items-center gap-1 rounded-lg border p-0.5 text-xs">
                    <button
                        type="button"
                        onClick={() => setUnitSystem("imperial")}
                        className={`px-2.5 py-1 rounded-md transition-colors ${unitSystem === "imperial" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        Imperial
                    </button>
                    <button
                        type="button"
                        onClick={() => setUnitSystem("metric")}
                        className={`px-2.5 py-1 rounded-md transition-colors ${unitSystem === "metric" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        Metric
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">{weightLabel} <span className="text-red-600">*</span></label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder={weightLabel}
                        value={weightDisplay}
                        onChange={(e) => handleWeightChange(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">{heightLabel} <span className="text-red-600">*</span></label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder={heightLabel}
                        value={heightDisplay}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        required
                    />
                </div>
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Systolic BP"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                />
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Diastolic BP"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                />
                <div>
                    <label className="block text-sm font-medium mb-1">Pulse <span className="text-red-600">*</span></label>
                    <input
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="Pulse"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Respiration <span className="text-red-600">*</span></label>
                    <input
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="Respiration"
                        value={respiration}
                        onChange={(e) => setRespiration(e.target.value)}
                        required
                    />
                </div>
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder={tempLabel}
                    value={tempDisplay}
                    onChange={(e) => handleTempChange(e.target.value)}
                />
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Oxygen Saturation (%)"
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(e.target.value)}
                />
                <div>
                    <label className="block text-sm font-medium mb-1">BMI</label>
                    <div className="flex items-center gap-2">
                        <input
                            className="w-full rounded-lg border px-3 py-2 bg-gray-50"
                            placeholder="Auto-calculated"
                            value={bmi}
                            readOnly
                            title="BMI is automatically calculated from weight and height"
                        />
                        {bmi && (() => {
                            const status = getBmiStatus(bmi);
                            return status ? (
                                <span className={`text-xs font-semibold whitespace-nowrap ${status.color}`}>
                                    {status.label}
                                </span>
                            ) : null;
                        })()}
                    </div>
                </div>
                <textarea
                    className="w-full rounded-lg border px-3 py-2 md:col-span-2"
                    placeholder="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {saving ? "Saving..." : editing?.id ? "Update" : "Save"}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={() => { removeEncounterSection(patientId, encounterId, "vitals"); onCancel(); }}
                        className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
