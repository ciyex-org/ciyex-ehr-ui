



"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import Vitalsform from "./Vitalsform";
import type { ApiResponse, VitalsDto } from "@/utils/types";
import { toast, confirmDialog } from "@/utils/toast";

type Props = {
    patientId: number;
    encounterId: number;
};

export default function Vitalslist({ patientId, encounterId }: Props) {
    const [items, setItems] = useState<VitalsDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<VitalsDto | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithOrg(`/api/vitals/${patientId}/${encounterId}`);
            const json = (await res.json()) as ApiResponse<VitalsDto[]>;
            if (!res.ok || !json.success) throw new Error(json.message || "Load failed");
            setItems(json.data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, encounterId]);

    async function remove(id: number) {
        const confirmed = await confirmDialog("Delete this vitals record?");
        if (!confirmed) return;
        try {
            setBusyId(id);
            const res = await fetchWithOrg(`/api/vitals/${patientId}/${encounterId}/${id}`, {
                method: "DELETE",
            });
            const json = (await res.json()) as ApiResponse<void>;
            if (!res.ok || !json.success) throw new Error(json.message || "Delete failed");
            setItems((prev) => prev.filter((x) => x.id !== id));
            setAlert({ type: "success", msg: "Vitals deleted." });
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3500);
        }
    }

    async function esign(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(`/api/vitals/${patientId}/${encounterId}/${id}/esign`, {
                method: "POST",
            });
            let ok = res.ok;
            try {
                const json = (await res.json()) as ApiResponse<unknown>;
                ok = ok && (json.success ?? true);
            } catch {
                // ignore if backend returns empty
            }
            if (!ok) throw new Error("eSign failed");
            setAlert({ type: "success", msg: "Vitals e-signed." });
            await load();
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3500);
        }
    }

    async function printFromBackend(id: number) {
        try {
            const res = await fetchWithOrg(
                `/api/vitals/${patientId}/${encounterId}/${id}/print`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );
            if (!res.ok) throw new Error("Print failed");
            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty PDF received");
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Unable to print");
        }
    }

    const sorted = useMemo(() => {
        return [...items].sort((a, b) => {
            const d1 = a.lastModifiedDate || a.createdDate || "";
            const d2 = b.lastModifiedDate || b.createdDate || "";
            return d2.localeCompare(d1);
        });
    }, [items]);

    return (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vitals</h2>
            <button
    onClick={() => {
        setEditing(null);
        setShowForm((s) => !s);
    }}
    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
        >
        {showForm ? "Close" : "Add Vitals"}
        </button>
        </div>

    {alert && (
        <div
            className={`rounded-xl border px-4 py-2 text-sm ${
            alert.type === "success"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
        }`}
    >
        {alert.msg}
        </div>
    )}

    {showForm && (
        <Vitalsform
            patientId={patientId}
        encounterId={encounterId}
        editing={editing}
        onSaved={(saved) => {
        if (editing?.id) {
            setItems((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
        } else {
            setItems((prev) => [saved, ...prev]);
        }
        setShowForm(false);
        setEditing(null);
    }}
        onCancel={() => {
        setShowForm(false);
        setEditing(null);
    }}
        />
    )}

    {loading && <div className="text-gray-600">Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && sorted.length === 0 && (
                <div className="rounded-xl border p-4 text-gray-600">No vitals recorded yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((v) => (
                        <li key={v.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                        BP: {v.bpSystolic}/{v.bpDiastolic} · Pulse: {v.pulse} · Temp:{" "}
            {v.temperatureC ? `${v.temperatureC} °C` : ""}
            </p>
            {v.weightKg && <p>Weight: {v.weightKg} kg</p>}
                {v.heightCm && <p>Height: {v.heightCm} cm</p>}
                    {(v.bmi || (v.weightKg && v.heightCm)) && <p>BMI: {v.bmi || (v.weightKg && v.heightCm && v.heightCm > 0 ? (v.weightKg / Math.pow(v.heightCm / 100, 2)).toFixed(1) : "")}</p>}
                        {v.notes && <p className="text-gray-700 whitespace-pre-wrap">{v.notes}</p>}
                            {v.signed && (
                                <p className="text-xs text-gray-500 font-medium">Signed — read only</p>
                            )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                            {!v.signed && (
                            <>
                                <button
                                    onClick={() => {
                            setEditing(v);
                            setShowForm(true);
                        }}
                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                >
                                Edit
                                </button>
                                <button
                            onClick={() => remove(v.id!)}
                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                            disabled={busyId === v.id}
                        >
                            Delete
                            </button>
                            <button
                            onClick={() => esign(v.id!)}
                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                            disabled={busyId === v.id}
                        >
                            eSign
                            </button>
                            </>
                        )}
                            <button
                                onClick={() => printFromBackend(v.id!)}
                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                            disabled={busyId === v.id}
                        >
                            Print
                            </button>
                            </div>
                            </div>
                            </li>
                        ))}
                        </ul>
                        </div>
                    );
                    }
