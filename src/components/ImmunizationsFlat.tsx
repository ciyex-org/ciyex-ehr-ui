"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type CompletionStatus =
    | "completed"
    | "not-done"
    | "partially-completed"
    | "entered-in-error"
    | "unknown"
    | string;

type InformationSource =
    | "provider"
    | "record"
    | "recall"
    | "parental-recall"
    | "school-record"
    | "public-agency"
    | "other"
    | string;

export interface ImmunizationItem {
    id?: number;
    externalId?: string;
    patientId?: number;
    cvxCode?: string;
    dateTimeAdministered?: string;
    amountAdministered?: string;
    expirationDate?: string;
    manufacturer?: string;
    lotNumber?: string;
    administratorName?: string;
    administratorTitle?: string;
    dateVisGiven?: string;
    dateVisStatement?: string;
    route?: string;
    administrationSite?: string;
    notes?: string;
    informationSource?: InformationSource;
    completionStatus?: CompletionStatus;
    substanceRefusalReason?: string;
    reasonCode?: string;
    orderingProvider?: string;
}

interface ImmunizationDto {
    patientId: number;
    orgId?: number;
    audit?: { createdDate?: string; lastModifiedDate?: string };
    immunizations: ImmunizationItem[];
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

type Props = {
    patientId: number;
    /** Optional override; if not given, we resolve from localStorage or env */
    orgId?: number;
};

function resolveOrgId(explicit?: number): number {
    if (explicit) return explicit;
    if (typeof window !== "undefined") {
        const ls = window.localStorage.getItem("orgId");
        if (ls && !Number.isNaN(Number(ls))) return Number(ls);
    }
    if (
        getEnv("NEXT_PUBLIC_ORG_ID") &&
        !Number.isNaN(Number(getEnv("NEXT_PUBLIC_ORG_ID")))
    ) {
        return Number(getEnv("NEXT_PUBLIC_ORG_ID"));
    }
    return 1;
}

/** Factory avoids “used before declaration/assignment” */
function createEmptyForm(): ImmunizationItem {
    return {
        cvxCode: "",
        dateTimeAdministered: "",
        manufacturer: "",
        lotNumber: "",
        route: "",
        administrationSite: "",
        notes: "",
        informationSource: "",
        completionStatus: "",
        amountAdministered: "",
        expirationDate: "",
        administratorName: "",
        administratorTitle: "",
        dateVisGiven: "",
        dateVisStatement: "",
        substanceRefusalReason: "",
        reasonCode: "",
        orderingProvider: "",
    };
}

export default function ImmunizationsFlat({ patientId, orgId }: Props) {
    const effectiveOrgId = useMemo(() => resolveOrgId(orgId), [orgId]);

    const [items, setItems] = useState<ImmunizationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [isOpen, setIsOpen] = useState(false); // add/edit modal
    const [isEdit, setIsEdit] = useState(false);
    const [form, setForm] = useState<ImmunizationItem>(() => createEmptyForm());
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [showErrorPopup, setShowErrorPopup] = useState(false);

    // Helpers
    const apiBase = getEnv("NEXT_PUBLIC_API_URL") || "";
    const formatDT = (s?: string) => (s ? new Date(s).toLocaleString() : "—");

    // Fetch list
    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetchWithAuth(
                `${apiBase}/api/immunizations/${patientId}`,
                { headers: { orgId: String(effectiveOrgId) } }
            );
            const body = (await res.json()) as ApiResponse<ImmunizationDto>;
            if (!res.ok || !body.success) {
                throw new Error(body.message || `Failed to load immunizations`);
            }
            setItems(body.data?.immunizations ?? []);
        } catch (e: unknown) {
            setErr(e.message || "Failed to load immunizations");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (patientId) void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, effectiveOrgId]);

    // Open add
    function openAdd() {
        setIsEdit(false);
        setForm(createEmptyForm());
        setValidationErrors({});
        setErr(null);
        setIsOpen(true);
    }

    // Open edit
    function openEdit(row: ImmunizationItem) {
        setIsEdit(true);
        setForm({ ...row });
        setValidationErrors({});
        setErr(null);
        setIsOpen(true);
    }

    // Validate mandatory fields
    function validateForm(): boolean {
        const errors: Record<string, string> = {};
        
        if (!form.cvxCode?.trim()) {
            errors.cvxCode = "Please fill out this field";
        }
        if (!form.dateTimeAdministered?.trim()) {
            errors.dateTimeAdministered = "Please fill out this field";
        }
        if (!form.manufacturer?.trim()) {
            errors.manufacturer = "Please fill out this field";
        }
        if (!form.administratorName?.trim()) {
            errors.administratorName = "Please fill out this field";
        }
        if (!form.amountAdministered?.trim()) {
            errors.amountAdministered = "Please fill out this field";
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }

    // Save (create or update)
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;
        
        if (!validateForm()) {
            return;
        }
        
        setSubmitting(true);
        setErr(null);
        setShowErrorPopup(false);

        try {
            if (isEdit && form.id) {
                // item-level PUT
                const res = await fetchWithAuth(
                    `${apiBase}/api/immunizations/${patientId}/${form.id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            orgId: String(effectiveOrgId),
                        },
                        body: JSON.stringify(form),
                    }
                );
                const body = (await res.json()) as ApiResponse<ImmunizationItem>;
                if (!res.ok || !body.success) {
                    throw new Error(body.message || "Failed to update immunization");
                }
            } else {
                // create patient-level (expects dto with immunizations[0])
                const dto: ImmunizationDto = {
                    patientId,
                    orgId: effectiveOrgId,
                    immunizations: [{ ...form }],
                };
                const res = await fetchWithAuth(`${apiBase}/api/immunizations`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        orgId: String(effectiveOrgId),
                    },
                    body: JSON.stringify(dto),
                });
                const body = (await res.json()) as ApiResponse<ImmunizationDto>;
                if (!res.ok || !body.success) {
                    throw new Error(body.message || "Failed to create immunization");
                }
            }
            setIsOpen(false);
            setForm(createEmptyForm());
            setValidationErrors({});
            await load();
        } catch (e: unknown) {
            setErr(e.message || "Save failed");
            setShowErrorPopup(true);
        } finally {
            setSubmitting(false);
        }
    }

    // Delete
    async function onDeleteConfirmed() {
        if (!confirmDeleteId) return;
        try {
            const res = await fetchWithAuth(
                `${apiBase}/api/immunizations/${patientId}/${confirmDeleteId}`,
                { method: "DELETE", headers: { orgId: String(effectiveOrgId) } }
            );
            const body = (await res.json()) as ApiResponse<void>;
            if (!res.ok || !body.success) throw new Error(body.message || "Delete failed");
            setConfirmDeleteId(null);
            await load();
        } catch (e: unknown) {
            setErr(e.message || "Delete failed");
        }
    }

    // Render
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-base font-semibold text-gray-800">Immunizations</h3>
                <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    + Add Immunization
                </button>
            </div>

            {/* Body */}
            <div className="px-4 pb-4">
                {loading ? (
                    <div className="py-8 text-sm text-gray-500">Loading…</div>
                ) : err ? (
                    <div className="py-4 text-sm text-red-600">{err}</div>
                ) : items.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">
                        No immunizations found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-3 py-2 text-left">Date/Time</th>
                                <th className="px-3 py-2 text-left">CVX</th>
                                <th className="px-3 py-2 text-left">Manufacturer</th>
                                <th className="px-3 py-2 text-left">Lot</th>
                                <th className="px-3 py-2 text-left">Route</th>
                                <th className="px-3 py-2 text-left">Site</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Notes</th>
                                <th className="px-3 py-2 text-center">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {items.map((it) => (
                                <tr key={it.id}>
                                    <td className="px-3 py-2">{formatDT(it.dateTimeAdministered)}</td>
                                    <td className="px-3 py-2 font-medium text-gray-700">
                                        {it.cvxCode || "—"}
                                    </td>
                                    <td className="px-3 py-2">{it.manufacturer || "—"}</td>
                                    <td className="px-3 py-2">{it.lotNumber || "—"}</td>
                                    <td className="px-3 py-2">{it.route || "—"}</td>
                                    <td className="px-3 py-2">{it.administrationSite || "—"}</td>
                                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        {it.completionStatus || "—"}
                      </span>
                                    </td>
                                    <td className="px-3 py-2 max-w-[260px] truncate" title={it.notes}>
                                        {it.notes || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                                                onClick={() => openEdit(it)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                                onClick={() => setConfirmDeleteId(it.id!)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
                        {/* Header */}
                        <div className="border-b px-4 py-3 shrink-0">
                            <h4 className="text-sm font-semibold">
                                {isEdit ? "Edit Immunization" : "Add Immunization"}
                            </h4>
                        </div>

                        {/* Scrollable body */}
                        <div className="overflow-y-auto px-4 py-4 grow">
                            <form onSubmit={onSubmit} className="space-y-4" id="immunization-form">
                                {/* Basic row */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            CVX Code <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className={`w-full rounded-md border px-3 py-2 text-sm ${
                                                validationErrors.cvxCode ? 'border-red-500' : ''
                                            }`}
                                            placeholder="e.g. 207"
                                            value={form.cvxCode || ""}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, cvxCode: e.target.value }));
                                                if (validationErrors.cvxCode) {
                                                    setValidationErrors(prev => ({ ...prev, cvxCode: '' }));
                                                }
                                            }}
                                        />
                                        {validationErrors.cvxCode && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.cvxCode}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Date/Time Administered <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className={`w-full rounded-md border px-3 py-2 text-sm ${
                                                validationErrors.dateTimeAdministered ? 'border-red-500' : ''
                                            }`}
                                            value={
                                                form.dateTimeAdministered
                                                    ? new Date(form.dateTimeAdministered)
                                                        .toISOString()
                                                        .slice(0, 16)
                                                    : ""
                                            }
                                            onChange={(e) => {
                                                setForm((p) => ({
                                                    ...p,
                                                    dateTimeAdministered: new Date(
                                                        e.target.value
                                                    ).toISOString(),
                                                }));
                                                if (validationErrors.dateTimeAdministered) {
                                                    setValidationErrors(prev => ({ ...prev, dateTimeAdministered: '' }));
                                                }
                                            }}
                                        />
                                        {validationErrors.dateTimeAdministered && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.dateTimeAdministered}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Manufacturer <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className={`w-full rounded-md border px-3 py-2 text-sm ${
                                                validationErrors.manufacturer ? 'border-red-500' : ''
                                            }`}
                                            value={form.manufacturer || ""}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, manufacturer: e.target.value }));
                                                if (validationErrors.manufacturer) {
                                                    setValidationErrors(prev => ({ ...prev, manufacturer: '' }));
                                                }
                                            }}
                                            placeholder="Pfizer, Moderna…"
                                        />
                                        {validationErrors.manufacturer && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.manufacturer}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Lot Number
                                        </label>
                                        <input
                                            className="w-full rounded-md border px-3 py-2 text-sm"
                                            value={form.lotNumber || ""}
                                            onChange={(e) =>
                                                setForm((p) => ({ ...p, lotNumber: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Route
                                        </label>
                                        <input
                                            className="w-full rounded-md border px-3 py-2 text-sm"
                                            placeholder="IM / SC / PO …"
                                            value={form.route || ""}
                                            onChange={(e) =>
                                                setForm((p) => ({ ...p, route: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Administration Site
                                        </label>
                                        <input
                                            className="w-full rounded-md border px-3 py-2 text-sm"
                                            placeholder="Left deltoid, Right thigh…"
                                            value={form.administrationSite || ""}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    administrationSite: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Administrator Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className={`w-full rounded-md border px-3 py-2 text-sm ${
                                                validationErrors.administratorName ? 'border-red-500' : ''
                                            }`}
                                            value={form.administratorName || ""}
                                            onChange={(e) => {
                                                setForm((p) => ({
                                                    ...p,
                                                    administratorName: e.target.value,
                                                }));
                                                if (validationErrors.administratorName) {
                                                    setValidationErrors(prev => ({ ...prev, administratorName: '' }));
                                                }
                                            }}
                                        />
                                        {validationErrors.administratorName && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.administratorName}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Amount Administered <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className={`w-full rounded-md border px-3 py-2 text-sm ${
                                                validationErrors.amountAdministered ? 'border-red-500' : ''
                                            }`}
                                            value={form.amountAdministered || ""}
                                            onChange={(e) => {
                                                setForm((p) => ({
                                                    ...p,
                                                    amountAdministered: e.target.value,
                                                }));
                                                if (validationErrors.amountAdministered) {
                                                    setValidationErrors(prev => ({ ...prev, amountAdministered: '' }));
                                                }
                                            }}
                                            placeholder="e.g. 0.5 mL"
                                        />
                                        {validationErrors.amountAdministered && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.amountAdministered}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Information Source
                                        </label>
                                        <input
                                            className="w-full rounded-md border px-3 py-2 text-sm"
                                            value={form.informationSource || ""}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    informationSource: e.target.value as InformationSource,
                                                }))
                                            }
                                            placeholder="provider / record / recall …"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Completion Status
                                        </label>
                                        <input
                                            className="w-full rounded-md border px-3 py-2 text-sm"
                                            value={form.completionStatus || ""}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    completionStatus: e.target.value as CompletionStatus,
                                                }))
                                            }
                                            placeholder="completed / not-done …"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Notes
                                    </label>
                                    <textarea
                                        className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                                        value={form.notes || ""}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, notes: e.target.value }))
                                        }
                                    />
                                </div>

                                {/* Optional extras row */}
                                <details className="rounded-md border bg-gray-50 p-3 text-sm">
                                    <summary className="cursor-pointer select-none font-medium">
                                        More fields (optional)
                                    </summary>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                                Expiration Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full rounded-md border px-3 py-2 text-sm"
                                                value={form.expirationDate || ""}
                                                onChange={(e) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        expirationDate: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                                VIS Given Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full rounded-md border px-3 py-2 text-sm"
                                                value={form.dateVisGiven || ""}
                                                onChange={(e) =>
                                                    setForm((p) => ({ ...p, dateVisGiven: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                                VIS Statement Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full rounded-md border px-3 py-2 text-sm"
                                                value={form.dateVisStatement || ""}
                                                onChange={(e) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        dateVisStatement: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                                Administrator Title
                                            </label>
                                            <input
                                                className="w-full rounded-md border px-3 py-2 text-sm"
                                                value={form.administratorTitle || ""}
                                                onChange={(e) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        administratorTitle: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                                Ordering Provider
                                            </label>
                                            <input
                                                className="w-full rounded-md border px-3 py-2 text-sm"
                                                value={form.orderingProvider || ""}
                                                onChange={(e) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        orderingProvider: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                                Reason Code
                                            </label>
                                            <input
                                                className="w-full rounded-md border px-3 py-2 text-sm"
                                                value={form.reasonCode || ""}
                                                onChange={(e) =>
                                                    setForm((p) => ({ ...p, reasonCode: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                                Substance Refusal Reason
                                            </label>
                                            <input
                                                className="w-full rounded-md border px-3 py-2 text-sm"
                                                value={form.substanceRefusalReason || ""}
                                                onChange={(e) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        substanceRefusalReason: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                </details>
                            </form>
                        </div>

                        {/* Footer stays visible */}
                        <div className="border-t px-4 py-3 shrink-0 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setForm(createEmptyForm());
                                    setValidationErrors({});
                                    setErr(null);
                                }}
                                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="immunization-form"
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                disabled={submitting}
                            >
                                {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {confirmDeleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <h4 className="text-sm font-semibold">Delete immunization?</h4>
                        <p className="mt-2 text-sm text-gray-600">
                            This action cannot be undone.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                onClick={onDeleteConfirmed}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Popup */}
            {showErrorPopup && err && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900">Error</h4>
                                <p className="mt-1 text-sm text-gray-600">{err}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                onClick={() => {
                                    setShowErrorPopup(false);
                                    setErr(null);
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
