"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/* ---------------- Types ---------------- */
export interface HealthcareServiceItem {
    id?: number;
    name?: string;
    description?: string;
    location?: string;
    type?: string;
    hoursOfOperation?: string;
}

interface ApiResponse<T> {
    success?: boolean;
    message?: string;
    data?: T;
}

interface Props {
    patientId: number; // ✅ match other Flats (consistency with your dashboard)
}

/* ---------------- Component ---------------- */
export default function HealthcareServicesFlat({ patientId }: Props) {
    const [items, setItems] = useState<HealthcareServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [form, setForm] = useState<HealthcareServiceItem>({
        name: "",
        description: "",
        location: "",
        type: "",
        hoursOfOperation: "",
    });

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const api = getEnv("NEXT_PUBLIC_API_URL");
    const orgId =
        typeof window !== "undefined"
            ? localStorage.getItem("orgId") || getEnv("NEXT_PUBLIC_ORG_ID") || "1"
            : "1";
    const baseHeaders = { "Content-Type": "application/json", orgId: String(orgId) };

    /* ---------------- Load ---------------- */
    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(`${api}/api/healthcare-services`, {
                headers: baseHeaders,
            });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const json: ApiResponse<HealthcareServiceItem[]> = await res.json();
            setItems(json?.data ?? []);
        } catch (e: unknown) {
            setError(e?.message ?? "Failed to load healthcare services");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]); // ✅ keep patient context consistent

    /* ---------------- Actions ---------------- */
    function openCreate() {
        setEditingId(null);
        setForm({
            name: "",
            description: "",
            location: "",
            type: "",
            hoursOfOperation: "",
        });
        setError(null);
        setSuccessMessage(null);
        setShowForm(true);
    }

    function openEdit(row: HealthcareServiceItem) {
        setEditingId(row.id ?? null);
        setForm(row);
        setError(null);
        setSuccessMessage(null);
        setShowForm(true);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;
        
        // Clear any previous messages
        setError(null);
        setSuccessMessage(null);
        
        // Validate required fields
        if (!form.name?.trim()) {
            setError("Please fill out the Name field");
            return;
        }
        if (!form.type?.trim()) {
            setError("Please fill out the Type field");
            return;
        }
        if (!form.location?.trim()) {
            setError("Please fill out the Location field");
            return;
        }
        if (!form.hoursOfOperation?.trim()) {
            setError("Please fill out the Hours of Operation field");
            return;
        }
        
        setSubmitting(true);
        try {
            const url =
                editingId == null
                    ? `${api}/api/healthcare-services`
                    : `${api}/api/healthcare-services/${editingId}`;
            const method = editingId == null ? "POST" : "PUT";

            const res = await fetchWithAuth(url, {
                method,
                headers: baseHeaders,
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Request failed");
            }
            
            const successMsg = editingId == null ? "Created successfully" : "Updated successfully";
            setSuccessMessage(successMsg);
            
            await load();
            
            // Close form after a brief delay to show success message
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
        if (!confirm("Delete this healthcare service?")) return;
        try {
            const res = await fetchWithAuth(`${api}/api/healthcare-services/${id}`, {
                method: "DELETE",
                headers: baseHeaders,
            });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            setItems((prev) => prev.filter((x) => x.id !== id));
        } catch (e: unknown) {
            alert(e?.message ?? "Delete failed");
        }
    }

    /* ---------------- Render ---------------- */
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Healthcare Services</h4>
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
                <div className="text-sm text-gray-500">No healthcare services</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="px-2 py-2 text-left">Name</th>
                            <th className="px-2 py-2 text-left">Type</th>
                            <th className="px-2 py-2 text-left">Location</th>
                            <th className="px-2 py-2 text-left">Hours</th>
                            <th className="px-2 py-2 text-left">Description</th>
                            <th className="px-2 py-2 text-center w-32">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {items.map((r) => (
                            <tr key={r.id}>
                                <td className="px-2 py-2 text-gray-800">{r.name || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{r.type || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{r.location || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{r.hoursOfOperation || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{r.description || "—"}</td>
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
                                {editingId == null ? "Add Healthcare Service" : "Edit Healthcare Service"}
                            </h5>
                            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {error && (
                                <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}
                            {successMessage && (
                                <div className="sm:col-span-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-600">{successMessage}</p>
                                </div>
                            )}
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={form.name || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Type <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={form.type || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Location <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={form.location || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Hours of Operation <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={form.hoursOfOperation || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, hoursOfOperation: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        title="Please fill out this field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={form.description || ""}
                                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded border hover:bg-gray-50">
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