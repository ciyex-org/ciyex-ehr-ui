"use client";

import React, { useEffect, useMemo, useState } from "react";

/** Match/extend with your backend DTO as needed */
export type HealthcareServiceDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number | null;
    name: string;
    active?: boolean | null;
    category?: string | null;     // e.g., "Dental", "Behavioral Health"
    type?: string | null;         // e.g., "Consultation", "Surgery"
    specialty?: string | null;    // e.g., "Pediatrics", "Orthodontics"
    location?: string | null;     // text label for location/site
    telecom?: string | null;      // phone/email/URL
    availability?: string | null; // free text or cron-ish "Mon–Fri 9–5"
    description?: string | null;
    notes?: string | null;
};

type Props = {
    orgId?: number;
    apiBase?: string; // default: /api/healthcare-services
    className?: string;
};

export default function HealthcareServiceManager({
                                                     orgId,
                                                     apiBase = "/api/healthcare-services",
                                                     className = "",
                                                 }: Props) {
    const [items, setItems] = useState<HealthcareServiceDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [editing, setEditing] = useState<HealthcareServiceDto | null>(null);
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
            const res = await fetch(apiBase, { headers, cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to load (${res.status})`);
            const json = await res.json();
            const data = Array.isArray(json) ? json : json.data ?? [];
            setItems(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load services");
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiBase, orgId]);

    function startCreate() {
        setEditing({
            name: "",
            active: true,
            category: "",
            type: "",
            specialty: "",
            location: "",
            telecom: "",
            availability: "",
            description: "",
            notes: "",
        });
    }
    function startEdit(it: HealthcareServiceDto) {
        setEditing({ ...it });
    }

    async function save(form: HealthcareServiceDto) {
        setSaving(true);
        setError(null);
        try {
            const method = form.id ? "PUT" : "POST";
            const url = form.id ? `${apiBase}/${form.id}` : apiBase;
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || `Save failed (${res.status})`);
            }
            setEditing(null);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally {
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
            setError(e instanceof Error ? e.message : "Delete failed");
        } finally {
            setSaving(false);
        }

    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) =>
            [
                i.name,
                i.category,
                i.type,
                i.specialty,
                i.location,
                i.telecom,
                i.availability,
                i.description,
                i.notes,
            ]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [items, query]);

    return (
        <section className={`w-full ${className}`}>
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Healthcare Services</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search name, category, specialty…"
                            className="peer w-64 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="pointer-events-none absolute right-3 top-2.5 text-neutral-400 peer-focus:text-blue-500">
              🔎
            </span>
                    </div>
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

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-neutral-500">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">No services found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0">
                            <thead>
                            <tr className="bg-neutral-50 text-left text-sm text-neutral-600">
                                {[
                                    "Name",
                                    "Active",
                                    "Category",
                                    "Type",
                                    "Specialty",
                                    "Location",
                                    "Telecom",
                                    "Availability",
                                    "Description",
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
                                    <td className="px-4 py-3 font-medium">{it.name}</td>
                                    <td className="px-4 py-3">
                      <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                              it.active ? "border-green-300 text-green-700" : "border-neutral-300 text-neutral-600"
                          }`}
                      >
                        {it.active ? "Active" : "Inactive"}
                      </span>
                                    </td>
                                    <td className="px-4 py-3">{it.category || "-"}</td>
                                    <td className="px-4 py-3">{it.type || "-"}</td>
                                    <td className="px-4 py-3">{it.specialty || "-"}</td>
                                    <td className="px-4 py-3">{it.location || "-"}</td>
                                    <td className="px-4 py-3">{it.telecom || "-"}</td>
                                    <td className="px-4 py-3">{it.availability || "-"}</td>
                                    <td className="px-4 py-3 max-w-[300px]">
                      <span className="line-clamp-2 text-neutral-700">
                        {it.description || "-"}
                      </span>
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

            {/* Form Drawer */}
            {editing && (
                <FormDrawer
                    value={editing}
                    saving={saving}
                    onClose={() => setEditing(null)}
                    onSave={save}
                />
            )}

            {/* Confirm Delete */}
            {confirmDeleteId !== null && (
                <ConfirmDialog
                    title="Delete service?"
                    subtitle="This action cannot be undone."
                    loading={saving}
                    onCancel={() => setConfirmDeleteId(null)}
                    onConfirm={() => remove(confirmDeleteId)}
                />
            )}
        </section>
    );
}

/* ---------------- Drawer Form ---------------- */

function FormDrawer({
                        value,
                        onClose,
                        onSave,
                        saving,
                    }: {
    value: HealthcareServiceDto;
    onClose: () => void;
    onSave: (v: HealthcareServiceDto) => void | Promise<void>;
    saving: boolean;
}) {
    const [form, setForm] = useState<HealthcareServiceDto>(value);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => setForm(value), [value]);
    function set<K extends keyof HealthcareServiceDto>(k: K, v: HealthcareServiceDto[K]) {
        setForm((f) => ({ ...f, [k]: v }));
    }

    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = "Name is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function submit() {
        if (!validate()) return;
        await onSave(form);
    }

    return (
        <div className="fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                        {form.id ? "Edit Healthcare Service" : "Add Healthcare Service"}
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
                        label="Name *"
                        value={form.name}
                        onChange={(v) => set("name", v)}
                        placeholder="e.g., Pediatric Consultation"
                        error={errors.name}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Toggle label="Active" checked={!!form.active} onChange={(v) => set("active", v)} />
                        <Field
                            label="Category"
                            value={form.category ?? ""}
                            onChange={(v) => set("category", v)}
                            placeholder="Dental, Behavioral Health…"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Type"
                            value={form.type ?? ""}
                            onChange={(v) => set("type", v)}
                            placeholder="Consultation, Surgery…"
                        />
                        <Field
                            label="Specialty"
                            value={form.specialty ?? ""}
                            onChange={(v) => set("specialty", v)}
                            placeholder="Pediatrics, Orthodontics…"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Location"
                            value={form.location ?? ""}
                            onChange={(v) => set("location", v)}
                            placeholder="Main Clinic – Room 3"
                        />
                        <Field
                            label="Telecom"
                            value={form.telecom ?? ""}
                            onChange={(v) => set("telecom", v)}
                            placeholder="(555) 555-1234, support@site.com"
                        />
                    </div>

                    <Field
                        label="Availability"
                        value={form.availability ?? ""}
                        onChange={(v) => set("availability", v)}
                        placeholder="Mon–Fri 09:00–17:00"
                    />

                    <TextArea
                        label="Description"
                        value={form.description ?? ""}
                        onChange={(v) => set("description", v)}
                        placeholder="Describe the service, prerequisites, and any limitations…"
                    />

                    <TextArea
                        label="Notes"
                        value={form.notes ?? ""}
                        onChange={(v) => set("notes", v)}
                        placeholder="Internal notes…"
                    />

                    <Field
                        label="External ID (optional)"
                        value={form.externalId ?? ""}
                        onChange={(v) => set("externalId", v)}
                        placeholder="FHIR ID / external reference"
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

/* ---------------- Small UI Primitives ---------------- */

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
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type={type}
                placeholder={placeholder}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition
          ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-neutral-300 focus:border-blue-500 focus:ring-blue-100"}
          bg-white focus:ring-2`}
            />
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

function Toggle({
                    label,
                    checked,
                    onChange,
                }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-700">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition
          ${checked ? "bg-green-500" : "bg-neutral-300"}`}
            >
        <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                checked ? "translate-x-5" : "translate-x-1"
            }`}
        />
            </button>
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
