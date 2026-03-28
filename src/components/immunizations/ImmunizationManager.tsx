"use client";

import React, { useEffect, useMemo, useState } from "react";
import DateInput from "@/components/ui/DateInput";

type ImmunizationDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number | null;
    patientId: number | string;
    vaccineName: string;
    manufacturer?: string | null;
    lotNumber?: string | null;
    dose?: number | null;
    doseUnit?: string | null;
    route?: string | null;
    site?: string | null;
    administeredBy?: string | null;
    administeredDate?: string | null; // yyyy-MM-dd
    status?: "completed" | "entered-in-error" | "not-done" | "in-progress" | string | null;
    notes?: string | null;
};

type Props = {
    patientId: number | string;
    orgId?: number;
    apiBase?: string; // defaults to /api/immunizations
    className?: string;
};

export default function ImmunizationManager({
                                                patientId,
                                                orgId,
                                                apiBase = "/api/immunizations",
                                                className = "",
                                            }: Props) {
    const [items, setItems] = useState<ImmunizationDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | "completed" | "entered-in-error" | "not-done">("");
    const [editing, setEditing] = useState<ImmunizationDto | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const headers = useMemo(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (orgId !== undefined) h["orgId"] = String(orgId);
        return h;
    }, [orgId]);

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const url = new URL(apiBase, globalThis.location?.origin ?? "http://localhost");
            url.searchParams.set("patientId", String(patientId));
            const res = await fetch(url.toString(), { headers, cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to load (${res.status})`);
            const json = await res.json();
            // Accept either raw array or ApiResponse-like {data: [...]}
            const data = Array.isArray(json) ? json : json.data ?? [];
            setItems(data);
        } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load immunizations");
    } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, apiBase, orgId]);

    function blankForm(): ImmunizationDto {
        return {
            patientId,
            vaccineName: "",
            manufacturer: "",
            lotNumber: "",
            dose: undefined,
            doseUnit: "",
            route: "",
            site: "",
            administeredBy: "",
            administeredDate: new Date().toISOString().slice(0, 10), // yyyy-MM-dd
            status: "completed",
            notes: "",
        };
    }

    function startCreate() {
        setEditing(blankForm());
    }

    function startEdit(it: ImmunizationDto) {
        setEditing({ ...it });
    }

    async function save(form: ImmunizationDto) {
        setSaving(true);
        setError(null);
        try {
            const method = form.id ? "PUT" : "POST";
            const url = form.id ? `${apiBase}/${form.id}` : apiBase;
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || `Save failed (${res.status})`);
            }
            setEditing(null);
            await load();
        }  catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load immunizations");
    }
finally {
            setSaving(false);
        }
    }

    async function remove(id: number) {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/${id}`, { method: "DELETE", headers });
            if (!res.ok) throw new Error(`Delete failed (${res.status})`);
            setConfirmDeleteId(null);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load immunizations");
        }
        finally {
            setSaving(false);
        }
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter((i) => {
            if (statusFilter && i.status !== statusFilter) return false;
            if (!q) return true;
            return [
                i.vaccineName,
                i.manufacturer,
                i.lotNumber,
                i.status,
                i.site,
                i.route,
                i.administeredBy,
                i.notes,
            ]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
    }, [items, query, statusFilter]);

    return (
        <section className={`w-full ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold tracking-tight">Immunizations</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search vaccine, lot, status…"
                            className="peer w-64 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="pointer-events-none absolute right-3 top-2.5 text-neutral-400 peer-focus:text-blue-500">
              🔍
            </span>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                        className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="entered-in-error">Entered in Error</option>
                        <option value="not-done">Not Done</option>
                    </select>
                    <button
                        onClick={startCreate}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 active:scale-[0.99]"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Table / Empty / Loading */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-neutral-500">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">No immunizations found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0">
                            <thead>
                            <tr className="bg-neutral-50 text-left text-sm text-neutral-600">
                                {[
                                    "Date",
                                    "Vaccine",
                                    "Manufacturer",
                                    "Lot #",
                                    "Dose",
                                    "Route",
                                    "Site",
                                    "Administered By",
                                    "Status",
                                    "Notes",
                                    "",
                                ].map((h, i) => (
                                    <th key={i} className="px-4 py-3 font-medium">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((it, idx) => (
                                <tr
                                    key={it.id ?? `row-${idx}`}
                                    className="border-t border-neutral-200 text-sm hover:bg-neutral-50"
                                >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {it.administeredDate || "-"}
                                    </td>
                                    <td className="px-4 py-3">{it.vaccineName}</td>
                                    <td className="px-4 py-3">{it.manufacturer || "-"}</td>
                                    <td className="px-4 py-3">{it.lotNumber || "-"}</td>
                                    <td className="px-4 py-3">
                                        {it.dose ? `${it.dose} ${it.doseUnit ?? ""}`.trim() : "-"}
                                    </td>
                                    <td className="px-4 py-3">{it.route || "-"}</td>
                                    <td className="px-4 py-3">{it.site || "-"}</td>
                                    <td className="px-4 py-3">{it.administeredBy || "-"}</td>
                                    <td className="px-4 py-3">
                      <select
                        value={it.status || ""}
                        onChange={async (e) => {
                          const newStatus = e.target.value as ImmunizationDto["status"];
                          if (it.id && newStatus !== it.status) {
                            await save({ ...it, status: newStatus });
                          }
                        }}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs cursor-pointer bg-transparent outline-none ${
                          it.status === "completed" ? "border-green-300 text-green-700" :
                          it.status === "entered-in-error" ? "border-red-300 text-red-700" :
                          it.status === "not-done" ? "border-amber-300 text-amber-700" :
                          "border-neutral-300 text-neutral-700"
                        }`}
                      >
                        <option value="completed">Completed</option>
                        <option value="entered-in-error">Entered in Error</option>
                        <option value="not-done">Not Done</option>
                        <option value="in-progress">In Progress</option>
                      </select>
                                    </td>
                                    <td className="px-4 py-3 max-w-[280px]">
                                        <span className="line-clamp-2 text-neutral-700">{it.notes || "-"}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(it)}
                                                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs hover:bg-neutral-100"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(it.id!)}
                                                className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                                                disabled={!it.id}
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

            {/* Edit/Create Drawer */}
            {editing && (
                <FormDrawer
                    saving={saving}
                    value={editing}
                    onClose={() => setEditing(null)}
                    onSave={save}
                />
            )}

            {/* Confirm Delete */}
            {confirmDeleteId !== null && (
                <ConfirmDialog
                    title="Delete immunization?"
                    subtitle="This action cannot be undone."
                    loading={saving}
                    onCancel={() => setConfirmDeleteId(null)}
                    onConfirm={() => remove(confirmDeleteId)}
                />
            )}
        </section>
    );
}

/* ---------- Drawer Form ---------- */

function FormDrawer({
                        value,
                        onClose,
                        onSave,
                        saving,
                    }: {
    value: ImmunizationDto;
    onClose: () => void;
    onSave: (v: ImmunizationDto) => void | Promise<void>;
    saving: boolean;
}) {
    const [form, setForm] = useState<ImmunizationDto>(value);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => setForm(value), [value]);

    function set<K extends keyof ImmunizationDto>(key: K, v: ImmunizationDto[K]) {
        setForm((f) => ({ ...f, [key]: v }));
    }

    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!form.vaccineName?.trim()) {
            e.vaccineName = "Vaccine name is required";
        } else if (!/[A-Za-z]/.test(form.vaccineName.trim())) {
            e.vaccineName = "Vaccine name must contain at least one letter";
        } else if (!/^[A-Za-z0-9\s\-.,/()']+$/.test(form.vaccineName.trim())) {
            e.vaccineName = "Vaccine name contains invalid characters";
        }
        if (!form.administeredDate?.trim()) e.administeredDate = "Date is required";
        if (!form.administeredBy?.trim()) e.administeredBy = "Administered By is required";
        // Lot number: alphanumeric with hyphens allowed between characters
        if (form.lotNumber && form.lotNumber.trim() && !/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/.test(form.lotNumber.trim())) {
            e.lotNumber = "Lot number must be alphanumeric (hyphens allowed between characters)";
        }
        // Dose: must be a positive number if provided
        if (form.dose !== undefined && form.dose !== null) {
            if (isNaN(Number(form.dose)) || Number(form.dose) <= 0) {
                e.dose = "Dose must be a positive number";
            }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function submit() {
        if (!validate()) return;
        await onSave(form);
    }

    return (
        <div className="fixed inset-0 z-40 flex">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            {/* panel */}
            <div className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                        {form.id ? "Edit Immunization" : "Add Immunization"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                    >
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Field
                        label="Vaccine Name *"
                        error={errors.vaccineName}
                        value={form.vaccineName}
                        onChange={(v) => set("vaccineName", v)}
                        placeholder="e.g., Influenza, MMR, COVID-19"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Administered Date *"
                            type="date"
                            error={errors.administeredDate}
                            value={form.administeredDate ?? ""}
                            onChange={(v) => set("administeredDate", v)}
                        />
                        <Select
                            label="Status"
                            value={form.status ?? ""}
                            onChange={(v) => set("status", v === "" ? null : (v as ImmunizationDto["status"]))}
                            options={[
                                { value: "completed", label: "Completed" },
                                { value: "in-progress", label: "In Progress" },
                                { value: "not-done", label: "Not Done" },
                                { value: "entered-in-error", label: "Entered in Error" },
                            ]}
                        />

                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Manufacturer"
                            value={form.manufacturer ?? ""}
                            onChange={(v) => set("manufacturer", v)}
                            placeholder="Pfizer, Moderna…"
                        />
                        <Field
                            label="Lot Number"
                            value={form.lotNumber ?? ""}
                            onChange={(v) => {
                                // Allow alphanumeric and hyphens; strip other characters
                                const filtered = v.replace(/[^A-Za-z0-9-]/g, "");
                                set("lotNumber", filtered);
                                if (filtered && !/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/.test(filtered)) {
                                    setErrors(prev => ({ ...prev, lotNumber: "Lot number must be alphanumeric (hyphens allowed between characters)" }));
                                } else {
                                    setErrors(prev => { const n = { ...prev }; delete n.lotNumber; return n; });
                                }
                            }}
                            placeholder="e.g., LOT123456"
                            error={errors.lotNumber}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Field
                            label="Dose"
                            type="number"
                            value={form.dose?.toString() ?? ""}
                            onChange={(v) => set("dose", v ? Number(v) : undefined)}
                            placeholder="e.g., 0.5"
                            error={errors.dose}
                        />
                        <Field
                            label="Dose Unit"
                            value={form.doseUnit ?? ""}
                            onChange={(v) => set("doseUnit", v)}
                            placeholder="mL, mg…"
                        />
                        <Field
                            label="Route"
                            value={form.route ?? ""}
                            onChange={(v) => set("route", v)}
                            placeholder="IM, SC, PO…"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Site"
                            value={form.site ?? ""}
                            onChange={(v) => set("site", v)}
                            placeholder="Left deltoid, Right thigh…"
                        />
                        <Field
                            label="Administered By *"
                            value={form.administeredBy ?? ""}
                            onChange={(v) => set("administeredBy", v)}
                            placeholder="Provider name…"
                            error={errors.administeredBy}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="External ID (optional)"
                            value={form.externalId ?? ""}
                            onChange={(v) => set("externalId", v)}
                            placeholder="FHIR ID"
                        />
                    </div>

                    <TextArea
                        label="Notes"
                        value={form.notes ?? ""}
                        onChange={(v) => set("notes", v)}
                        placeholder="Any observations or remarks…"
                    />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? "Saving…" : form.id ? "Save Changes" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------- Small UI Primitives ---------- */

function Field({
                   label,
                   value,
                   onChange,
                   placeholder,
                   type = "text",
                   error,
               }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: "text" | "date" | "number";
    error?: string;
}) {
    const cls = `w-full rounded-xl border px-3 py-2 text-sm outline-none transition
          ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-neutral-300 focus:border-blue-500 focus:ring-blue-100"}
          bg-white focus:ring-2`;
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
            {type === "date" ? (
                <DateInput
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cls}
                />
            ) : (
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    type={type}
                    placeholder={placeholder}
                    className={cls}
                />
            )}
            {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
        </label>
    );
}

function TextArea({
                      label,
                      value,
                      onChange,
                      placeholder,
                  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="min-h-[96px] w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
        </label>
    );
}

function Select({
                    label,
                    value,
                    onChange,
                    options,
                }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: (string | { value: string; label: string })[];
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
                <option value="" disabled>
                    Select…
                </option>
                {options.map((o) => {
                    const val = typeof o === "string" ? o : o.value;
                    const lbl = typeof o === "string" ? o : o.label;
                    return (
                        <option key={val} value={val}>
                            {lbl}
                        </option>
                    );
                })}
            </select>
        </label>
    );
}

function ConfirmDialog({
                           title,
                           subtitle,
                           onCancel,
                           onConfirm,
                           loading,
                       }: {
    title: string;
    subtitle?: string;
    onCancel: () => void;
    onConfirm: () => void;
    loading?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                <h4 className="text-base font-semibold">{title}</h4>
                {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? "Deleting…" : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
