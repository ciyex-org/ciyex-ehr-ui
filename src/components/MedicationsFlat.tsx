"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type Status = "active" | "on-hold" | "completed" | "entered-in-error" | "stopped" | "draft" | "unknown";

export interface MedicationRequest {
    id?: number;
    patientId?: number;
    encounterId?: number | null;
    medicationName: string;
    dosage?: string;
    instructions?: string;
    dateIssued?: string;           // yyyy-MM-dd
    prescribingDoctor?: string;
    status?: Status;
    audit?: { createdDate?: string; lastModifiedDate?: string };
}

interface Props {
    patientId: number;
    encounterId?: number;
}

export default function MedicationsFlat({ patientId, encounterId }: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const [items, setItems] = useState<MedicationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // form state
    const emptyForm: MedicationRequest = useMemo(
        () => ({
            patientId,
            // backend requires an encounterId; fall back to patientId when none provided
            encounterId: encounterId ?? patientId,
            medicationName: "",
            dosage: "",
            instructions: "",
            dateIssued: new Date().toISOString().slice(0, 10),
            prescribingDoctor: "",
            status: "active",
        }),
        [patientId, encounterId]
    );

    const [form, setForm] = useState<MedicationRequest>(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const api = process.env.NEXT_PUBLIC_API_URL;

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams();
            qs.set("patientId", String(patientId));
            if (encounterId) qs.set("encounterId", String(encounterId));
            const res = await fetchWithAuth(`${api}/api/medication-requests?${qs.toString()}`);
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const data = await res.json();
            setItems(Array.isArray(data) ? data : data.data ?? []); // supports both bare list and {data:[]}
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            setError(message ?? "Failed to load medications");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, [patientId, encounterId]);

    function openCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(true);
    }

    function openEdit(row: MedicationRequest) {
        setEditingId(row.id ?? null);
        setForm({
            ...row,
            patientId: row.patientId ?? patientId,
            encounterId: row.encounterId ?? encounterId ?? null,
        });
        setShowForm(true);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const url =
                editingId == null
                    ? `${api}/api/medication-requests`
                    : `${api}/api/medication-requests/${editingId}`;

            // ensure payload includes patientId and encounterId (backend expects encounterId)
            const payload = {
                ...form,
                patientId: form.patientId ?? patientId,
                encounterId: form.encounterId ?? encounterId ?? patientId,
            };

            const res = await fetchWithAuth(url, {
                method: editingId == null ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            // Backend uses ApiResponse wrapper and returns 200 even on logical failures.
            // Parse JSON and check success flag to surface errors to the user.
            let json: unknown = null;
            try {
                json = await res.json();
            } catch (parseErr) {
                // If response is not JSON, treat non-OK status as error
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || "Request failed");
                }
            }

            if (json && json.success === false) {
                throw new Error(json.message || "Save failed");
            }
            await load();
            setShowForm(false);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            setError(message ?? "Save failed");
        } finally {
            setSubmitting(false);
        }
    }

    async function onDelete(id: number) {
        if (!confirm("Delete this medication?")) return;
        try {
            const res = await fetchWithAuth(`${api}/api/medication-requests/${id}`, { method: "DELETE" });
            let json: unknown = null;
            try {
                json = await res.json();
            } catch {
                // ignore parse error
            }
            if (json && json.success === false) {
                throw new Error(json.message || "Delete failed");
            }

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

            setItems((prev) => prev.filter((m) => m.id !== id));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            alert(message ?? "Delete failed");
        }
    }

    const title = "Medications";

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
                <div className="flex gap-2">
                    <button
                        onClick={openCreate}
                        className="h-8 px-3 rounded bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white shadow-sm"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
            ) : error ? (
                <p className="text-sm text-red-600">Error: {error}</p>
            ) : items.length === 0 ? (
                <div className="text-sm text-gray-500">No medications</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="px-2 py-2 text-left">Name</th>
                            <th className="px-2 py-2 text-left">Dosage</th>
                            <th className="px-2 py-2 text-left">Instructions</th>
                            <th className="px-2 py-2 text-left">Date Issued</th>
                            <th className="px-2 py-2 text-left">Doctor</th>
                            <th className="px-2 py-2 text-left">Status</th>
                            <th className="px-2 py-2 text-center w-32">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {items.map((m) => (
                            <tr key={m.id}>
                                <td className="px-2 py-2 font-medium text-gray-800">{m.medicationName}</td>
                                <td className="px-2 py-2 text-gray-700">{m.dosage || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{m.instructions || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{m.dateIssued || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{m.prescribingDoctor || "—"}</td>
                                <td className="px-2 py-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-semibold">
                    {m.status || "unknown"}
                  </span>
                                </td>
                                <td className="px-2 py-2 text-center">
                                    <div className="inline-flex gap-2">
                                        <button
                                            className="text-gray-600 hover:text-blue-700"
                                            onClick={() => openEdit(m)}
                                            title="Edit"
                                        >
                                            ✎
                                        </button>
                                        {m.id != null && (
                                            <button
                                                className="text-gray-600 hover:text-red-700"
                                                onClick={() => onDelete(m.id!)}
                                                title="Delete"
                                            >
                                                🗑
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Drawer / Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
                    <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-lg">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <h5 className="text-sm font-semibold">
                                {editingId == null ? "Add Medication" : "Edit Medication"}
                            </h5>
                            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <form onSubmit={onSubmit} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* left */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Medication Name *</label>
                                    <input
                                        required
                                        value={form.medicationName}
                                        onChange={(e) => setForm((p) => ({ ...p, medicationName: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="e.g., Amoxicillin 500 mg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Dosage</label>
                                    <input
                                        value={form.dosage || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="1 tab BID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                                    <textarea
                                        value={form.instructions || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md"
                                        rows={3}
                                        placeholder="Take with food…"
                                    />
                                </div>
                            </div>

                            {/* right */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date Issued</label>
                                    <input
                                        type="date"
                                        value={form.dateIssued || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, dateIssued: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Prescribing Doctor</label>
                                    <input
                                        value={form.prescribingDoctor || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, prescribingDoctor: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={form.status || "active"}
                                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Status }))}
                                        className="w-full px-3 py-2 border rounded-md bg-white"
                                    >
                                        <option value="active">active</option>
                                        <option value="on-hold">on-hold</option>
                                        <option value="completed">completed</option>
                                        <option value="stopped">stopped</option>
                                        <option value="draft">draft</option>
                                        <option value="entered-in-error">entered-in-error</option>
                                        <option value="unknown">unknown</option>
                                    </select>
                                </div>
                            </div>

                            {/* footer */}
                            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-3 py-1.5 rounded border"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={submitting}
                                    className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
                                >
                                    {submitting ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
