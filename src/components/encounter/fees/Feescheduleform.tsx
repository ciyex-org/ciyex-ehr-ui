"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, FeeScheduleDto, FeeScheduleEntryDto } from "@/utils/types";

type Props = {
    patientId: number;
    encounterId: number;
    value?: FeeScheduleDto | null;
    readOnly?: boolean;
    onSaved: (saved: FeeScheduleDto) => void;
};

type FeeSchedulePayload = {
    name: string;
    payer?: string;
    currency: string;
    effectiveFrom?: string;
    status: string;
    notes?: string;
};

type FeeScheduleEntryPayload = {
    codeType: string;
    code?: string;
    modifier?: string;
    description?: string;
    unit: string;
    currency: string;
    amount: number;
    active: boolean;
    notes?: string;
};

// ---- helpers ----
function money(n?: number) {
    const x = typeof n === "number" ? n : 0;
    return x.toFixed(2);
}

async function safeJson<T>(res: Response): Promise<T | null> {
    const t = await res.text().catch(() => "");
    if (!t) return null;
    try {
        return JSON.parse(t) as T;
    } catch {
        return null;
    }
}

export default function Feescheduleform({
                                            patientId,
                                            encounterId,
                                            value,
                                            readOnly,
                                            onSaved,
                                        }: Props) {
    const [effectiveDate, setEffectiveDate] = useState("");
    const [payer, setPayer] = useState("");
    const [remarks, setRemarks] = useState("");
    const [entries, setEntries] = useState<FeeScheduleEntryDto[]>([
        { code: "", description: "", units: 1, unitPrice: 0, modifiers: "", notes: "" },
    ]);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // init from value
    useEffect(() => {
        if (value?.id) {
            setEffectiveDate(value.effectiveDate?.slice(0, 10) || value.effectiveDate || "");
            setPayer(value.payer || "");
            setRemarks(value.remarks || "");
            setEntries(
                value.entries?.length
                    ? value.entries.map((e) => ({
                        id: e.id,
                        code: e.code || "",
                        description: e.description || "",
                        modifiers: e.modifiers || "",
                        units: typeof e.units === "number" ? e.units : 1,
                        unitPrice: typeof e.unitPrice === "number" ? e.unitPrice : 0,
                        lineTotal: e.lineTotal,
                        notes: e.notes || "",
                    }))
                    : [{ code: "", description: "", units: 1, unitPrice: 0, modifiers: "", notes: "" }]
            );
        } else {
            setEffectiveDate(new Date().toISOString().slice(0, 10));
            setPayer("");
            setRemarks("");
            setEntries([{ code: "", description: "", units: 1, unitPrice: 0, modifiers: "", notes: "" }]);
        }
    }, [value]);

    function setEntry(i: number, patch: Partial<FeeScheduleEntryDto>) {
        if (readOnly) return;
        setEntries((prev) => {
            const copy = [...prev];
            copy[i] = { ...copy[i], ...patch };
            return copy;
        });
    }

    function addRow() {
        if (readOnly) return;
        setEntries((prev) => [
            ...prev,
            { code: "", description: "", units: 1, unitPrice: 0, modifiers: "", notes: "" },
        ]);
    }

    function removeRow(i: number) {
        if (readOnly) return;
        setEntries((prev) => prev.filter((_, idx) => idx !== i));
    }

    const computed = useMemo(() => {
        const lines = entries.map((e) => {
            const u = typeof e.units === "number" ? e.units : Number(e.units || 0);
            const p = typeof e.unitPrice === "number" ? e.unitPrice : Number(e.unitPrice || 0);
            const total = Math.max(0, u) * Math.max(0, p);
            return { ...e, _lineTotal: total };
        });
        return { lines };
    }, [entries]);

    // --- SAVE: schedule first, then upsert entries, then delete removed entries ---
    async function save() {
        if (readOnly) return;
        setSaving(true);
        setErr(null);
        try {
            // 1) CREATE or UPDATE schedule (backend fields)
            const schedulePayload: FeeSchedulePayload = {
                name: "Encounter Fee Schedule",
                payer: payer?.trim() || undefined,
                currency: "USD",
                effectiveFrom: effectiveDate || undefined,
                status: "active",
                notes: remarks?.trim() || undefined,
            };

            const isUpdate = !!value?.id;
            const scheduleUrl = isUpdate
                ? `/api/fee-schedules/${patientId}/${encounterId}/${value!.id}`
                : `/api/fee-schedules/${patientId}/${encounterId}`;
            const scheduleMethod = isUpdate ? "PUT" : "POST";

            let schId = value?.id ?? 0;
            {
                const res = await fetchWithOrg(scheduleUrl, {
                    method: scheduleMethod,
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify(schedulePayload),
                });
                const json = await safeJson<ApiResponse<{ id: number }>>(res);
                if (!res.ok || !json?.success) throw new Error(json?.message || "Schedule save failed");
                schId = json.data?.id ?? schId;
            }

            // 2) UPSERT entries
            const originalIds = (value?.entries || []).map((e) => e.id).filter(Boolean) as number[];
            const nowIds: number[] = [];

            for (const e of computed.lines) {
                const entryPayload: FeeScheduleEntryPayload = {
                    codeType: "CPT4",
                    code: e.code?.trim() || undefined,
                    modifier: e.modifiers?.trim() || undefined,
                    description: e.description?.trim() || undefined,
                    unit: "visit",
                    currency: "USD",
                    amount: typeof e.unitPrice === "number" ? e.unitPrice : Number(e.unitPrice || 0),
                    active: true,
                    notes: e.notes?.trim() || undefined,
                };

                if (e.id) {
                    // PUT
                    const res = await fetchWithOrg(
                        `/api/fee-schedules/${patientId}/${encounterId}/${schId}/entries/${e.id}`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            body: JSON.stringify(entryPayload),
                        }
                    );
                    const json = await safeJson<ApiResponse<{ id: number }>>(res);
                    if (!res.ok || !json?.success) throw new Error(json?.message || "Entry update failed");
                    nowIds.push(e.id);
                } else {
                    // POST
                    const res = await fetchWithOrg(
                        `/api/fee-schedules/${patientId}/${encounterId}/${schId}/entries`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            body: JSON.stringify(entryPayload),
                        }
                    );
                    const json = await safeJson<ApiResponse<{ id: number }>>(res);
                    if (!res.ok || !json?.success) throw new Error(json?.message || "Entry create failed");
                    const newId = json.data?.id;
                    if (!newId) throw new Error("Entry create failed: missing ID");
                    nowIds.push(newId);
                    e.id = newId; // reflect in UI
                }
            }

            // 3) DELETE removed entries
            const toDelete = originalIds.filter((id) => !nowIds.includes(id));
            for (const id of toDelete) {
                await fetchWithOrg(
                    `/api/fee-schedules/${patientId}/${encounterId}/${schId}/entries/${id}`,
                    { method: "DELETE", headers: { Accept: "application/json" } }
                ).catch(() => {});
            }

            // 4) return a fresh UI dto to parent (so card flips to read-only)
            const saved: FeeScheduleDto = {
                id: schId,
                patientId,
                encounterId,
                effectiveDate,
                payer,
                remarks,
                entries: entries.map((e) => ({
                    ...e,
                    lineTotal:
                        (typeof e.units === "number" ? e.units : Number(e.units || 0)) *
                        (typeof e.unitPrice === "number" ? e.unitPrice : Number(e.unitPrice || 0)),
                })),
                audit: value?.audit,
            };
            onSaved(saved);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    // CSV export
    function exportCSV() {
        const header = ["Code", "Description", "Modifiers", "Units", "Unit Price", "Line Total", "Notes"];
        const lines = computed.lines.map((e) => [
            e.code ?? "",
            (e.description ?? "").replaceAll('"', '""'),
            e.modifiers ?? "",
            String(e.units ?? 0),
            String(e.unitPrice ?? 0),
            money(e._lineTotal),
            (e.notes ?? "").replaceAll('"', '""'),
        ]);
        const rows = [header, ...lines]
            .map((cols) => cols.map((c) => `"${c}"`).join(","))
            .join("\r\n");
        const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fee_schedule_${patientId}_${encounterId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-4 rounded-2xl border p-4 shadow-sm bg-white">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{value?.id ? "Edit Fee Schedule" : ""}</h3>
                <div className="flex flex-wrap items-center gap-2">
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {saving ? "Saving..." : value?.id ? "Update" : "Save"}
                        </button>
                    )}
                    <button type="button" onClick={exportCSV} className="rounded-xl border px-3 py-1.5 hover:bg-gray-50">
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Effective Date</label>
                    <input
                        type="date"
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        disabled={readOnly}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Payer / Plan</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={payer}
                        onChange={(e) => setPayer(e.target.value)}
                        placeholder="e.g., Blue Cross PPO"
                        disabled={readOnly}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Remarks</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Optional"
                        disabled={readOnly}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-y-2">
                    <thead className="text-left text-gray-600">
                    <tr>
                        <th className="px-2">Code</th>
                        <th className="px-2">Description</th>
                        <th className="px-2">Mods</th>
                        <th className="px-2 w-24">Units</th>
                        <th className="px-2 w-32">Unit Price</th>
                        <th className="px-2 w-32 text-right">Line Total</th>
                        <th className="px-2">Notes</th>
                        {!readOnly && <th className="px-2"></th>}
                    </tr>
                    </thead>
                    <tbody>
                    {entries.map((e, i) => {
                        const u = typeof e.units === "number" ? e.units : Number(e.units || 0);
                        const p = typeof e.unitPrice === "number" ? e.unitPrice : Number(e.unitPrice || 0);
                        const line = Math.max(0, u) * Math.max(0, p);
                        return (
                            <tr key={i} className="bg-white rounded-xl shadow-sm">
                                <td className="px-2 py-2 align-top">
                                    <input
                                        className="w-28 rounded-lg border px-2 py-1 focus:ring"
                                        value={e.code || ""}
                                        onChange={(x) => setEntry(i, { code: x.target.value })}
                                        placeholder="99214"
                                        disabled={readOnly}
                                    />
                                </td>
                                <td className="px-2 py-2 align-top">
                                    <input
                                        className="w-full rounded-lg border px-2 py-1 focus:ring"
                                        value={e.description || ""}
                                        onChange={(x) => setEntry(i, { description: x.target.value })}
                                        placeholder="Office/outpatient visit..."
                                        disabled={readOnly}
                                    />
                                </td>
                                <td className="px-2 py-2 align-top">
                                    <input
                                        className="w-20 rounded-lg border px-2 py-1 focus:ring"
                                        value={e.modifiers || ""}
                                        onChange={(x) => setEntry(i, { modifiers: x.target.value })}
                                        placeholder="25,59"
                                        disabled={readOnly}
                                    />
                                </td>
                                <td className="px-2 py-2 align-top">
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-20 rounded-lg border px-2 py-1 focus:ring"
                                        value={e.units ?? 0}
                                        onChange={(x) => setEntry(i, { units: x.target.value === "" ? 0 : Number(x.target.value) })}
                                        disabled={readOnly}
                                    />
                                </td>
                                <td className="px-2 py-2 align-top">
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-28 rounded-lg border px-2 py-1 focus:ring"
                                        value={e.unitPrice ?? 0}
                                        onChange={(x) =>
                                            setEntry(i, { unitPrice: x.target.value === "" ? 0 : Number(x.target.value) })
                                        }
                                        disabled={readOnly}
                                    />
                                </td>
                                <td className="px-2 py-2 align-top text-right align-middle">₹{money(line)}</td>
                                <td className="px-2 py-2 align-top">
                                    <input
                                        className="w-full rounded-lg border px-2 py-1 focus:ring"
                                        value={e.notes || ""}
                                        onChange={(x) => setEntry(i, { notes: x.target.value })}
                                        placeholder="Optional"
                                        disabled={readOnly}
                                    />
                                </td>
                                {!readOnly && (
                                    <td className="px-2 py-2 align-top">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(i)}
                                            className="rounded-lg border px-2 py-1 hover:bg-gray-50"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                {!readOnly && (
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={addRow}
                            className="rounded-xl border px-3 py-1.5 hover:bg-gray-50"
                        >
                            + Add Line
                        </button>
                    </div>
                )}
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
    );
}
