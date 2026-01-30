"use client";
import React, { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/** ---- Types ---- */
export interface MedicalProblemItem {
    id?: number;
    patientId?: number;
    title?: string;
    outcome?: string;
    verificationStatus?: string;
    occurrence?: string;
    note?: string;
}

interface ApiResponse<T> {
    success?: boolean;
    message?: string;
    data?: T;
}

interface MedicalProblemDto {
    id?: number;
    externalId?: string;
    orgId?: number;
    patientId?: number;
    problemsList?: MedicalProblemItem[];
}

interface Props {
    patientId: number;
}

/** ---- Component ---- */
export default function MedicalProblemsFlat({ patientId }: Props) {
    const [items, setItems] = useState<MedicalProblemItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // form state
    const emptyForm: MedicalProblemItem = useMemo(
        () => ({
            patientId,
            title: "",
            outcome: "",
            verificationStatus: "",
            occurrence: "",
            note: "",
        }),
        [patientId]
    );

    const [form, setForm] = useState<MedicalProblemItem>(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // dropdowns
    const [titleOptions, setTitleOptions] = useState<any[]>([]);
    const [outcomeOptions, setOutcomeOptions] = useState<any[]>([]);
    const [verificationOptions, setVerificationOptions] = useState<any[]>([]);
    const [occurrenceOptions, setOccurrenceOptions] = useState<any[]>([]);

    const api = process.env.NEXT_PUBLIC_API_URL;
    const orgId =
        typeof window !== "undefined"
            ? localStorage.getItem("orgId") ||
            process.env.NEXT_PUBLIC_ORG_ID ||
            "1"
            : "1";
    const baseHeaders = {
        "Content-Type": "application/json",
        orgId: String(orgId),
    };

    /** ---- Fetch list options ---- */
    async function fetchOptions(
        listId: string,
        setter: React.Dispatch<React.SetStateAction<any[]>>
    ) {
        try {
            const res = await fetchWithAuth(
                `${api}/api/list-options/list/${listId}`,
                { headers: baseHeaders }
            );

            // ADD DEBUG LOGS HERE:
            console.log("Medical Problems API Response status:", res.status);
            console.log("Medical Problems API Response headers:", Object.fromEntries(res.headers.entries()));

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const json = await res.json();

            // ADD DEBUG LOGS HERE:
            console.log("Medical Problems API Response body:", json);

            // normalize: map activity → active
            setter(
                json
                    .filter((o: any) => o.activity === 1) // only active ones
                    .map((o: any) => ({
                        id: o.id,
                        title: o.title,
                    }))
            );
        } catch (e: unknown) {
            console.error(`Failed to fetch options for ${listId}`, e);
        }
    }

    /** ---- Load patient problems ---- */
    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(
                `${api}/api/medical-problems/${patientId}`,
                { headers: baseHeaders }
            );
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const json: ApiResponse<MedicalProblemDto> = await res.json();
            const list = json?.data?.problemsList ?? [];
            setItems(Array.isArray(list) ? list : []);
        } catch (e: unknown) {
            setError(e?.message ?? "Failed to load medical problems");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // fetch dropdowns
        fetchOptions("Medical_Problems", setTitleOptions);
        fetchOptions("Outcome", setOutcomeOptions);
        fetchOptions("Verification_Status", setVerificationOptions);
        fetchOptions("Occurrence", setOccurrenceOptions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    /** ---- UI actions ---- */
    function openCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setValidationErrors([]);
        setError(null);
        setSuccessMessage(null);
        setShowForm(true);
    }

    function openEdit(row: MedicalProblemItem) {
        setEditingId(row.id ?? null);
        setForm({ ...row, patientId: row.patientId ?? patientId });
        setValidationErrors([]);
        setError(null);
        setSuccessMessage(null);
        setShowForm(true);
    }

    /** ---- Submit ---- */
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;
        
        // Clear previous messages
        setError(null);
        setValidationErrors([]);
        setSuccessMessage(null);
        
        // Validate mandatory fields (all except note)
        const errors: string[] = [];
        if (!form.title?.trim()) errors.push("Please fill out Title field");
        if (!form.outcome?.trim()) errors.push("Please fill out Outcome field");
        if (!form.verificationStatus?.trim()) errors.push("Please fill out Verification Status field");
        if (!form.occurrence?.trim()) errors.push("Please fill out Occurrence field");
        
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }
        
        setSubmitting(true);
        try {
            const payloadCreate = {
                patientId,
                problemsList: [
                    {
                        title: form.title?.trim() || undefined,
                        outcome: form.outcome?.trim() || undefined,
                        verificationStatus: form.verificationStatus?.trim() || undefined,
                        occurrence: form.occurrence?.trim() || undefined,
                        note: form.note?.trim() || undefined,
                    },
                ],
            };

            const patch = {
                title: form.title?.trim() || undefined,
                outcome: form.outcome?.trim() || undefined,
                verificationStatus: form.verificationStatus?.trim() || undefined,
                occurrence: form.occurrence?.trim() || undefined,
                note: form.note?.trim() || undefined,
            };

            const url =
                editingId == null
                    ? `${api}/api/medical-problems`
                    : `${api}/api/medical-problems/${patientId}/${editingId}`;

            const res = await fetchWithAuth(url, {
                method: editingId == null ? "POST" : "PUT",
                headers: baseHeaders,
                body: JSON.stringify(editingId == null ? payloadCreate : patch),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Request failed");
            }
            
            const successMsg = editingId == null ? "Created successfully" : "Updated successfully";
            setSuccessMessage(successMsg);
            
            await load();
            
            // Close form after showing success message
            setTimeout(() => {
                setShowForm(false);
                setSuccessMessage(null);
            }, 1500);
        } catch (e: unknown) {
            setError(e?.message ?? "Save failed");
        } finally {
            setSubmitting(false);
        }
    }

    async function onDelete(id: number) {
        if (!confirm("Delete this medical problem?")) return;
        try {
            const res = await fetchWithAuth(
                `${api}/api/medical-problems/${patientId}/${id}`,
                {
                    method: "DELETE",
                    headers: baseHeaders,
                }
            );
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            setItems((prev) => prev.filter((x) => x.id !== id));
        } catch (e: unknown) {
            alert(e?.message ?? "Delete failed");
        }
    }

    const title = "Medical Problems";

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
                <button
                    onClick={openCreate}
                    className="h-8 px-3 rounded bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white shadow-sm"
                >
                    + Add
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
            ) : error ? (
                <p className="text-sm text-red-600">Error: {error}</p>
            ) : items.length === 0 ? (
                <div className="text-sm text-gray-500">No medical problems</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="px-2 py-2 text-left">Title</th>
                            <th className="px-2 py-2 text-left">Outcome</th>
                            <th className="px-2 py-2 text-left">Verification Status</th>
                            <th className="px-2 py-2 text-left">Occurrence</th>
                            <th className="px-2 py-2 text-left">Note</th>
                            <th className="px-2 py-2 text-center w-32">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {items.map((r) => (
                            <tr key={r.id}>
                                <td className="px-2 py-2 text-gray-800">{r.title || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{r.outcome || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">
                                    {r.verificationStatus || "—"}
                                </td>
                                <td className="px-2 py-2 text-gray-700">
                                    {r.occurrence || "—"}
                                </td>
                                <td className="px-2 py-2 text-gray-700">{r.note || "—"}</td>
                                <td className="px-2 py-2 text-center">
                                    <div className="inline-flex gap-2">
                                        <button
                                            className="text-gray-600 hover:text-blue-700"
                                            onClick={() => openEdit(r)}
                                            title="Edit"
                                        >
                                            ✎
                                        </button>
                                        {r.id != null && (
                                            <button
                                                className="text-gray-600 hover:text-red-700"
                                                onClick={() => onDelete(r.id!)}
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
                                {editingId == null ? "Add Medical Problem" : "Edit Medical Problem"}
                            </h5>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Success Message */}
                        {successMessage && (
                            <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <div className="text-sm text-green-800">{successMessage}</div>
                            </div>
                        )}

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="text-sm text-red-800">
                                    {validationErrors.map((error, index) => (
                                        <div key={index}>• {error}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* API Error */}
                        {error && (
                            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="text-sm text-red-800">Error: {error}</div>
                            </div>
                        )}

                        <form
                            onSubmit={onSubmit}
                            className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <div className="space-y-3">
                                {/* Title dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.title || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    >
                                        <option value="">Select a title</option>
                                        {titleOptions.map((o) => (
                                            <option key={o.id} value={o.title}>
                                                {o.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Outcome dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Outcome <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.outcome || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    >
                                        <option value="">Select an outcome</option>
                                        {outcomeOptions.map((o) => (
                                            <option key={o.id} value={o.title}>
                                                {o.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Verification Status dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Verification Status <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.verificationStatus || ""}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, verificationStatus: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    >
                                        <option value="">Select a status</option>
                                        {verificationOptions.map((o) => (
                                            <option key={o.id} value={o.title}>
                                                {o.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Occurrence dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Occurrence <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.occurrence || ""}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, occurrence: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    >
                                        <option value="">Select an occurrence</option>
                                        {occurrenceOptions.map((o) => (
                                            <option key={o.id} value={o.title}>
                                                {o.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Note free text */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Note
                                    </label>
                                    <textarea
                                        value={form.note || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Free text note"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={submitting}
                                    className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
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