"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { toast } from "@/utils/toast";

/** ================================
 * Types
 * ================================ */
type CodeRow = {
    id: number | null;       // persisted: number; new row: null
    orgId?: number;
    title: string;
    order: number;
    isDefault: boolean;
    active: boolean;
    notes?: string;
    codes?: string;
};

type ApiEnvelope<T> = { success: boolean; message?: string; data?: T };

function cn(...a: Array<string | false | null | undefined>) {
    return a.filter(Boolean).join(" ");
}

function getOrgId(): number {
    const s =
        (typeof window !== "undefined" && window.localStorage.getItem("orgId")) ||
        "1";
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

async function safeJson<T = any>(res: Response): Promise<T | null> {
    try {
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

/** ================================
 * Component
 * ================================ */
export default function PatientCodesList() {
    const API = `${getEnv("NEXT_PUBLIC_API_URL")}/api/patient-codes`;
    const orgId = getOrgId();

    const [rows, setRows] = useState<CodeRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<number | null>(null);

    /** Load */
    useEffect(() => {
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    async function reload() {
        setLoading(true);
        setError(null);
        try {
            // GET /api/patient-codes (org via header)
            const res = await fetchWithAuth(API, {
                method: "GET",
                headers: {
                    "X-Org-Id": String(orgId),
                    Accept: "application/json",
                },
            });
            const j = await safeJson<ApiEnvelope<CodeRow[]>>(res);
            if (!res.ok || j?.success === false) {
                throw new Error(j?.message || `Load failed: HTTP ${res.status}`);
            }
            const payload = Array.isArray(j?.data) ? j!.data! : [];
            setRows(payload.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        } catch (e: unknown) {
            setError((e as Error).message ||"Failed to load patient code lists");
        } finally {
            setLoading(false);
        }
    }

    /** Local row updates */
    const update = (idx: number, patch: Partial<CodeRow>) =>
        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    const addRow = () =>
        setRows((prev) => {
            const nextOrder =
                (prev.reduce((m, r) => Math.max(m, r.order ?? 0), 0) || 0) + 10;
            return [
                ...prev,
                {
                    id: null,
                    orgId,
                    title: "",
                    order: nextOrder,
                    isDefault: false,
                    active: true,
                    notes: "",
                    codes: "",
                },
            ];
        });

    /** Save (bulk upsert) */
    async function onSave() {
        try {
            setSaving(true);
            // POST /api/patient-codes/bulk
            const res = await fetchWithAuth(`${API}/bulk`, {
                method: "POST",
                headers: {
                    "X-Org-Id": String(orgId),
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(
                    rows.map((r) => ({
                        id: r.id, // null => create, number => update
                        title: r.title,
                        order: r.order,
                        isDefault: r.isDefault,
                        active: r.active,
                        notes: r.notes ?? "",
                        codes: r.codes ?? "",
                    }))
                ),
            });
            const j = await safeJson<ApiEnvelope<CodeRow[]>>(res);
            if (!res.ok || j?.success === false) {
                throw new Error(j?.message || `Save failed: HTTP ${res.status}`);
            }
            const payload = Array.isArray(j?.data) ? j!.data! : [];
            setRows(payload.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
            toast.success("Saved successfully");
        } catch (e: unknown) {
            toast.error((e as Error).message ||"Failed to save");
        } finally {
            setSaving(false);
        }
    }

    /** Delete */
    async function removeRow(idx: number) {
        const row = rows[idx];
        if (row?.id == null) {
            // not persisted yet
            setRows((prev) => prev.filter((_, i) => i !== idx));
            return;
        }
        try {
            setSaving(true);
            // DELETE /api/patient-codes/{id}
            const res = await fetchWithAuth(`${API}/${row.id}`, {
                method: "DELETE",
                headers: {
                    "X-Org-Id": String(orgId),
                    Accept: "application/json",
                },
            });
            const j = await safeJson<ApiEnvelope<null>>(res);
            if (!res.ok || j?.success === false) {
                throw new Error(j?.message || `Delete failed: HTTP ${res.status}`);
            }
            setRows((prev) => prev.filter((_, i) => i !== idx));
        } catch (e: unknown) {
            toast.error((e as Error).message ||"Failed to delete");
        } finally {
            setSaving(false);
        }
    }

    /** Set default (server clears others within org) */
    async function setDefault(idx: number) {
        const row = rows[idx];
        if (row?.id == null) {
            // mark local; true default will be after save
            setRows((prev) => prev.map((r, i) => ({ ...r, isDefault: i === idx })));
            return;
        }
        try {
            setSaving(true);
            // POST /api/patient-codes/{id}/set-default
            const res = await fetchWithAuth(`${API}/${row.id}/set-default`, {
                method: "POST",
                headers: {
                    "X-Org-Id": String(orgId),
                    Accept: "application/json",
                },
            });
            const j = await safeJson<ApiEnvelope<CodeRow[] | CodeRow>>(res);
            if (!res.ok || j?.success === false) {
                throw new Error(j?.message || `Set default failed: HTTP ${res.status}`);
            }
            // Either returns a single row or refreshed list — reload to be safe
            await reload();
        } catch (e: unknown) {
            toast.error((e as Error).message ||"Failed to set default");
        } finally {
            setSaving(false);
        }
    }

    const defaultIndex = useMemo(
        () => rows.findIndex((r) => r.isDefault),
        [rows]
    );

    return (
        <AdminLayout>
            <div className="p-6 lg:p-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">List Editor</h1>
                        <p className="text-sm text-gray-500">
                            Manage Lists → Codes (Patient scope). Add, order, and toggle
                            active/default states.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={addRow}
                            disabled={saving || loading}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-900 dark:border-gray-700"
                        >
                            + New Row
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving || loading}
                            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>

                {/* Status */}
                {loading && (
                    <div className="mb-3 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-600 dark:bg-gray-900 dark:border-gray-800">
                        Loading…
                    </div>
                )}
                {error && (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-900/30">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800">
                    <div className="grid grid-cols-12 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
                        <div className="col-span-1">ID</div>
                        <div className="col-span-2">Title</div>
                        <div className="col-span-1">Order</div>
                        <div className="col-span-1">Default</div>
                        <div className="col-span-1">Active</div>
                        <div className="col-span-4">Notes</div>
                        <div className="col-span-2">Code(s)</div>
                    </div>

                    {rows.map((row, idx) => (
                        <div
                            key={String(row.id ?? `new-${idx}`)}
                            className={cn(
                                "grid grid-cols-12 items-center px-3 py-2 text-sm",
                                idx % 2
                                    ? "bg-white dark:bg-gray-900"
                                    : "bg-gray-50/60 dark:bg-gray-900/60",
                                selected === idx && "ring-2 ring-indigo-500/40"
                            )}
                            onClick={() => setSelected(idx)}
                        >
                            <div className="col-span-1 pr-2">
                                <input
                                    value={row.id ?? ""}
                                    readOnly
                                    placeholder="(new)"
                                    className="w-full cursor-not-allowed rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm outline-none dark:bg-gray-900 dark:border-gray-700"
                                />
                            </div>

                            <div className="col-span-2 pr-2">
                                <input
                                    value={row.title}
                                    onChange={(e) => update(idx, { title: e.target.value })}
                                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700"
                                />
                            </div>

                            <div className="col-span-1 pr-2">
                                <input
                                    type="number"
                                    value={row.order}
                                    onChange={(e) => update(idx, { order: Number(e.target.value) })}
                                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700"
                                />
                            </div>

                            <div className="col-span-1 pr-2 text-center">
                                <input
                                    type="radio"
                                    name="defaultRow"
                                    checked={row.isDefault}
                                    onChange={() => setDefault(idx)}
                                    className="h-4 w-4 accent-indigo-600"
                                    title="Default"
                                />
                            </div>

                            <div className="col-span-1 pr-2 text-center">
                                <input
                                    type="checkbox"
                                    checked={row.active}
                                    onChange={(e) => update(idx, { active: e.target.checked })}
                                    className="h-4 w-4 accent-indigo-600"
                                    title="Active"
                                />
                            </div>

                            <div className="col-span-4 pr-2">
                                <input
                                    value={row.notes ?? ""}
                                    onChange={(e) => update(idx, { notes: e.target.value })}
                                    placeholder="Optional notes"
                                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700"
                                />
                            </div>

                            <div className="col-span-2 flex items-center gap-2">
                                <input
                                    value={row.codes ?? ""}
                                    onChange={(e) => update(idx, { codes: e.target.value })}
                                    placeholder="Comma-separated codes"
                                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void removeRow(idx);
                                    }}
                                    disabled={saving || loading}
                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60 dark:bg-gray-900 dark:border-gray-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    {rows.length === 0 && !loading && (
                        <div className="px-3 py-6 text-center text-sm text-gray-500">
                            No rows yet. Click <b>+ New Row</b> to add your first item.
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
