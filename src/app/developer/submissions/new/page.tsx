"use client";

import React, { useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, Plus, X } from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

const CATEGORIES = [
    "Clinical",
    "Billing",
    "Scheduling",
    "Analytics",
    "Communication",
    "Lab Integration",
    "Imaging",
    "Pharmacy",
    "Telehealth",
    "Other",
];

export default function NewSubmissionPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        appSlug: "",
        appName: "",
        submissionType: "new",
        version: "1.0.0",
        description: "",
        category: "",
        iconUrl: "",
        smartLaunchUrl: "",
        fhirScopes: "",
    });
    const [features, setFeatures] = useState<string[]>([""]);
    const [extensionPoints, setExtensionPoints] = useState<string[]>([]);
    const [fhirResources, setFhirResources] = useState<string[]>([]);

    const updateForm = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/submissions`, {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    features: features.filter(Boolean),
                    extensionPoints: extensionPoints.filter(Boolean),
                    fhirResources: fhirResources.filter(Boolean),
                }),
            });
            if (res.ok) {
                router.push("/developer/submissions");
            } else {
                const data = await res.json();
                setError(data.message || "Failed to create submission");
            }
        } catch (err) {
            setError((err as Error).message);
        }
        setSubmitting(false);
    };

    return (
        <AdminLayout>
            <div className="max-w-3xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/developer/submissions"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <Send className="w-7 h-7 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            New App Submission
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Fill out the details to submit your app for review
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <Section title="Basic Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="App Name" required>
                                <input
                                    type="text"
                                    value={form.appName}
                                    onChange={(e) => updateForm("appName", e.target.value)}
                                    placeholder="My Healthcare App"
                                    required
                                    className="input-field"
                                />
                            </Field>
                            <Field label="App Slug" required>
                                <input
                                    type="text"
                                    value={form.appSlug}
                                    onChange={(e) => updateForm("appSlug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                                    placeholder="my-healthcare-app"
                                    required
                                    className="input-field"
                                />
                            </Field>
                            <Field label="Submission Type">
                                <select
                                    value={form.submissionType}
                                    onChange={(e) => updateForm("submissionType", e.target.value)}
                                    className="input-field"
                                >
                                    <option value="new">New App</option>
                                    <option value="update">Update</option>
                                    <option value="version">New Version</option>
                                </select>
                            </Field>
                            <Field label="Version">
                                <input
                                    type="text"
                                    value={form.version}
                                    onChange={(e) => updateForm("version", e.target.value)}
                                    placeholder="1.0.0"
                                    className="input-field"
                                />
                            </Field>
                            <Field label="Category" required>
                                <select
                                    value={form.category}
                                    onChange={(e) => updateForm("category", e.target.value)}
                                    required
                                    className="input-field"
                                >
                                    <option value="">Select a category...</option>
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Icon URL">
                                <input
                                    type="url"
                                    value={form.iconUrl}
                                    onChange={(e) => updateForm("iconUrl", e.target.value)}
                                    placeholder="https://..."
                                    className="input-field"
                                />
                            </Field>
                        </div>
                        <Field label="Description" required>
                            <textarea
                                value={form.description}
                                onChange={(e) => updateForm("description", e.target.value)}
                                rows={4}
                                required
                                placeholder="Describe what your app does..."
                                className="input-field"
                            />
                        </Field>
                    </Section>

                    {/* Features */}
                    <Section title="Features">
                        <ListEditor
                            items={features}
                            onChange={setFeatures}
                            placeholder="e.g., Real-time lab results"
                        />
                    </Section>

                    {/* Integration */}
                    <Section title="Integration">
                        <Field label="SMART Launch URL">
                            <input
                                type="url"
                                value={form.smartLaunchUrl}
                                onChange={(e) => updateForm("smartLaunchUrl", e.target.value)}
                                placeholder="https://myapp.com/launch"
                                className="input-field"
                            />
                        </Field>
                        <Field label="FHIR Scopes">
                            <input
                                type="text"
                                value={form.fhirScopes}
                                onChange={(e) => updateForm("fhirScopes", e.target.value)}
                                placeholder="patient/*.read user/Practitioner.read"
                                className="input-field"
                            />
                        </Field>
                        <Field label="FHIR Resources">
                            <ListEditor
                                items={fhirResources}
                                onChange={setFhirResources}
                                placeholder="e.g., Patient, Observation"
                            />
                        </Field>
                        <Field label="Extension Points">
                            <ListEditor
                                items={extensionPoints}
                                onChange={setExtensionPoints}
                                placeholder="e.g., patient-chart:tab"
                            />
                        </Field>
                    </Section>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save as Draft
                        </button>
                        <Link
                            href="/developer/submissions"
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .input-field {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    background: white;
                    color: #111827;
                }
                @media (prefers-color-scheme: dark) {
                    .input-field {
                        border-color: #475569;
                        background: #1e293b;
                        color: white;
                    }
                }
                .input-field:focus {
                    outline: none;
                    ring: 2px;
                    ring-color: #3b82f6;
                    border-color: #3b82f6;
                }
            `}</style>
        </AdminLayout>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            {children}
        </div>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

function ListEditor({
    items,
    onChange,
    placeholder,
}: {
    items: string[];
    onChange: (items: string[]) => void;
    placeholder: string;
}) {
    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                            const updated = [...items];
                            updated[i] = e.target.value;
                            onChange(updated);
                        }}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                    {items.length > 1 && (
                        <button
                            type="button"
                            onClick={() => onChange(items.filter((_, j) => j !== i))}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={() => onChange([...items, ""])}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
                <Plus className="w-3 h-3" />
                Add item
            </button>
        </div>
    );
}
