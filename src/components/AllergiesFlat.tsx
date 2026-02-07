"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

/** ---------- Types ---------- */
type ApiResponse<T> = {
    success: boolean;
    message?: string;
    data?: T;
};

type AllergyItem = {
    id: number;
    allergyName?: string | null;
    reaction?: string | null;
    severity?: string | null;
    status?: string | null;
    patientId: number;
    startDate?: string | null; // yyyy-MM-dd
    endDate?: string | null;   // yyyy-MM-dd
    comments?: string | null;
};

type AllergyDto = {
    externalId?: string | null;
    orgId?: number;
    allergiesList?: AllergyItem[];
    audit?: { createdDate?: string; lastModifiedDate?: string };
};

type Props = {
    patientId: number;
    orgId?: number; // optional override for header
    summaryMode?: boolean;   // 👈 new
};

/** ---------- UI helpers ---------- */
const severityOptions = ["Mild", "Moderate", "Severe"];
const statusOptions = ["Active", "Inactive"];

export default function AllergiesFlat({ patientId, orgId }: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const [items, setItems] = useState<AllergyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);

    // modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<Partial<AllergyItem>>({
        allergyName: "",
        reaction: "",
        severity: "",
        status: "Active",
        startDate: "",
        endDate: "",
        comments: "",
    });

    const apiBase = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

    // Resolve orgId from prop → localStorage → env → fallback 1
    const resolvedOrgId = useMemo(() => {
        if (orgId != null) return orgId;
        if (typeof window !== "undefined") {
            const s = window.localStorage.getItem("orgId");
            if (s && !Number.isNaN(Number(s))) return Number(s);
        }
        if (getEnv("NEXT_PUBLIC_ORG_ID") && !Number.isNaN(Number(getEnv("NEXT_PUBLIC_ORG_ID")))) {
            return Number(getEnv("NEXT_PUBLIC_ORG_ID"));
        }
        return 1;
    }, [orgId]);

    const commonHeaders = useMemo(
        () => ({
            "Content-Type": "application/json",
            orgId: String(resolvedOrgId),
        }),
        [resolvedOrgId]
    );

    const resetMessagesSoon = () =>
        window.setTimeout(() => {
            setError(null);
            setInfo(null);
        }, 2500);

    /** ---------- Data ---------- */
    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(`${apiBase}/api/allergy-intolerances/${patientId}`, {
                headers: commonHeaders,
            });

            // ADD DEBUG LOGS HERE:
            console.log("Allergies API Response status:", res.status);
            console.log("Allergies API Response headers:", Object.fromEntries(res.headers.entries()));

            const body: ApiResponse<AllergyDto> = await res.json().catch(() => ({ success: false } as ApiResponse<AllergyDto>));


            // ADD DEBUG LOGS HERE:
            console.log("Allergies API Response body:", body);


            if (res.ok && body.success && body.data?.allergiesList) {
                setItems(body.data.allergiesList);
            } else {
                setItems([]);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            setError(message || "Failed to load allergies");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (patientId) void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, resolvedOrgId]);

    /** ---------- Modal helpers ---------- */
    const openCreate = () => {
        setEditingId(null);
        setForm({
            allergyName: "",
            reaction: "",
            severity: "",
            status: "Active",
            startDate: "",
            endDate: "",
            comments: "",
        });
        setModalOpen(true);
    };

    const openEdit = (row: AllergyItem) => {
        setEditingId(row.id);
        setForm({
            allergyName: row.allergyName ?? "",
            reaction: row.reaction ?? "",
            severity: row.severity ?? "",
            status: row.status ?? "Active",
            startDate: row.startDate ?? "",
            endDate: row.endDate ?? "",
            comments: row.comments ?? "",
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return; // prevent closing while saving
        setModalOpen(false);
        setEditingId(null);
        setModalError(null);
        setForm({
            allergyName: "",
            reaction: "",
            severity: "",
            status: "Active",
            startDate: "",
            endDate: "",
            comments: "",
        });
    };

    /** ---------- Save / Delete ---------- */
    async function handleSave() {
        if (!form.allergyName || !form.allergyName.trim()) {
            setModalError("Please fill out this field");
            return;
        }
        if (!form.reaction || !form.reaction.trim()) {
            setModalError("Please fill out this field");
            return;
        }
        if (form.startDate && form.endDate && form.endDate < form.startDate) {
            setModalError("End date cannot be before start date");
            return;
        }

        setSaving(true);
        setModalError(null);
        setError(null);
        setInfo(null);
        try {
            if (editingId == null) {
                // CREATE
                const payload = {
                    patientId,
                    allergiesList: [
                        {
                            allergyName: (form.allergyName || "").trim(),
                            reaction: (form.reaction || "").trim() || null,
                            severity: form.severity || null,
                            status: form.status || null,
                            startDate: form.startDate || null,
                            endDate: form.endDate || null,
                            comments: (form.comments || "").trim() || null,
                        },
                    ],
                };
                const res = await fetchWithAuth(`${apiBase}/api/allergy-intolerances`, {
                    method: "POST",
                    headers: commonHeaders,
                    body: JSON.stringify(payload),
                });
                const body: ApiResponse<AllergyDto> = await res.json();
                if (!res.ok || !body.success) throw new Error(body.message || "Create failed");
                setInfo("Allergy added");
            } else {
                // UPDATE
                const payload = {
                    allergiesList: [
                        {
                            allergyName: (form.allergyName || "").trim(),
                            reaction: (form.reaction || "").trim() || null,
                            severity: form.severity || null,
                            status: form.status || null,
                            startDate: form.startDate || null,
                            endDate: form.endDate || null,
                            comments: (form.comments || "").trim() || null,
                        },
                    ],
                };
                const res = await fetchWithAuth(
                    `${apiBase}/api/allergy-intolerances/${patientId}/${editingId}`,
                    { method: "PUT", headers: commonHeaders, body: JSON.stringify(payload) }
                );
                const body: ApiResponse<AllergyItem> = await res.json();
                if (!res.ok || !body.success) throw new Error(body.message || "Update failed");
                setInfo("Allergy updated");
            }
            await load();
            closeModal();
        } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                setModalError(message || "Save failed");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Delete this allergy?")) return;
        setSaving(true);
        setError(null);
        setInfo(null);
        try {
            const res = await fetchWithAuth(
                `${apiBase}/api/allergy-intolerances/${patientId}/${id}`,
                { method: "DELETE", headers: commonHeaders }
            );
            const body: ApiResponse<null> = await res.json();
            if (!res.ok || !body.success) throw new Error(body.message || "Delete failed");
            setInfo("Allergy deleted");
            await load();
        } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                setError(message || "Delete failed");
        } finally {
            setSaving(false);
            resetMessagesSoon();
        }
    }

    const hasItems = items.length > 0;

    /** ---------- Render ---------- */
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-800">Allergies</h4>
                <div className="flex gap-2">
                    <button
                        onClick={openCreate}
                        className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
                    >
                        + Add Allergy
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {error}
                </div>
            )}
            {info && (
                <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    {info}
                </div>
            )}

            {!loading && !hasItems && (
                <div className="flex flex-col items-center justify-center py-14 text-center border rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div className="text-gray-700 font-medium">No data available</div>
                    <div className="text-gray-500 text-sm mt-1">This section is currently empty</div>
                </div>
            )}

            {hasItems && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-2 py-2">Allergy</th>
                            <th className="px-2 py-2">Reaction</th>
                            <th className="px-2 py-2">Severity</th>
                            <th className="px-2 py-2">Status</th>
                            <th className="px-2 py-2">Start</th>
                            <th className="px-2 py-2">End</th>
                            <th className="px-2 py-2">Comments</th>
                            <th className="px-2 py-2 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {items.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-2 py-2">{row.allergyName || "—"}</td>
                                <td className="px-2 py-2">{row.reaction || "—"}</td>
                                <td className="px-2 py-2">{row.severity || "—"}</td>
                                <td className="px-2 py-2">
                  <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                          (row.status || "Active") === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {row.status || "Active"}
                  </span>
                                </td>
                                <td className="px-2 py-2">{row.startDate || "—"}</td>
                                <td className="px-2 py-2">{row.endDate || "—"}</td>
                                <td className="px-2 py-2">
                                    <span className="line-clamp-2 break-words">{row.comments || "—"}</span>
                                </td>
                                <td className="px-2 py-2 text-right">
                                    <button
                                        onClick={() => openEdit(row)}
                                        className="text-blue-600 hover:underline mr-3"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(row.id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* -------- Modal (Add/Edit) -------- */}
            <Dialog open={modalOpen} onOpenChange={(v) => (v ? setModalOpen(true) : closeModal())}>
                <DialogContent className="max-w-xl" onClose={closeModal} showCloseButton>
                    <DialogHeader>
                        <DialogTitle>{editingId == null ? "Add Allergy" : "Edit Allergy"}</DialogTitle>
                        <DialogDescription>
                            {editingId == null
                                ? "Create a new allergy record for this patient."
                                : "Update the selected allergy record."}
                        </DialogDescription>
                    </DialogHeader>

                    {modalError && (
                        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                            {modalError}
                        </div>
                    )}

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleSave();
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">
                                    Allergy <span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={form.allergyName || ""}
                                    onChange={(e) => {
                                        setForm((f) => ({ ...f, allergyName: e.target.value }));
                                        if (modalError) setModalError(null);
                                    }}
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder="e.g., Penicillin"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                    Reaction <span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={form.reaction || ""}
                                    onChange={(e) => {
                                        setForm((f) => ({ ...f, reaction: e.target.value }));
                                        if (modalError) setModalError(null);
                                    }}
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder="e.g., Rash"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Severity</label>
                                <select
                                    value={form.severity || ""}
                                    onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                >
                                    <option value="">Select</option>
                                    {severityOptions.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Status</label>
                                <select
                                    value={form.status || "Active"}
                                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                >
                                    {statusOptions.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Start date</label>
                                <input
                                    type="date"
                                    value={form.startDate || ""}
                                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">End date</label>
                                <input
                                    type="date"
                                    value={form.endDate || ""}
                                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">Comments</label>
                                <textarea
                                    value={form.comments || ""}
                                    onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md min-h-[72px]"
                                    placeholder="Any important details (onset, context, clinician notes…)"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : editingId == null ? "Add" : "Update"}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {loading && <div className="mt-4 text-sm text-gray-500">Loading allergies…</div>}
        </div>
    );
}
