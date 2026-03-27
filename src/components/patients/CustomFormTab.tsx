"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Save, Loader2, CheckCircle } from "lucide-react";
import DateInput from "@/components/ui/DateInput";

const METADATA_API_BASE = () => (getEnv("NEXT_PUBLIC_METADATA_URL") || "").replace(/\/$/, "");

interface FormField {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    accept?: string;
    placeholder?: string;
}

interface FormSection {
    title: string;
    fields: FormField[];
}

interface FormSchema {
    title?: string;
    sections?: FormSection[];
    fields?: FormField[]; // flat list if no sections
}

interface CustomFormTabProps {
    tabId: string;
    patientId: string;
    formSchema: FormSchema;
    tabLabel: string;
}

export default function CustomFormTab({ tabId, patientId, formSchema, tabLabel }: CustomFormTabProps) {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [status, setStatus] = useState<string>("DRAFT");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetchWithAuth(
                    `${METADATA_API_BASE()}/api/tab-config/custom-tabs/${tabId}/patients/${patientId}/data`
                );
                if (res.ok && res.status !== 204) {
                    const data = await res.json();
                    if (data.formData) setFormData(data.formData);
                    if (data.status) setStatus(data.status);
                }
            } catch (err) {
                console.warn("Failed to load custom tab data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tabId, patientId]);

    const handleFieldChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        setSaved(false);
    };

    const handleSave = async (newStatus?: string) => {
        setSaving(true);
        try {
            const res = await fetchWithAuth(
                `${METADATA_API_BASE()}/api/tab-config/custom-tabs/${tabId}/patients/${patientId}/data`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        formData,
                        status: newStatus || status,
                    }),
                }
            );
            if (res.ok) {
                if (newStatus) setStatus(newStatus);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (err) {
            console.error("Failed to save custom tab data:", err);
        } finally {
            setSaving(false);
        }
    };

    const renderField = (field: FormField) => {
        const value = formData[field.name] ?? "";
        const baseClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

        switch (field.type) {
            case "text":
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={baseClass}
                    />
                );
            case "number":
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value ? Number(e.target.value) : "")}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        className={baseClass}
                    />
                );
            case "textarea":
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        rows={field.rows || 3}
                        placeholder={field.placeholder}
                        className={baseClass}
                    />
                );
            case "select":
                return (
                    <select
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className={baseClass}
                    >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case "multiselect":
                return (
                    <div className="space-y-1">
                        {field.options?.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={Array.isArray(value) && value.includes(opt)}
                                    onChange={(e) => {
                                        const current = Array.isArray(value) ? value : [];
                                        handleFieldChange(
                                            field.name,
                                            e.target.checked
                                                ? [...current, opt]
                                                : current.filter((v: string) => v !== opt)
                                        );
                                    }}
                                    className="rounded border-gray-300"
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                );
            case "radio":
                return (
                    <div className="space-y-1">
                        {field.options?.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name={field.name}
                                    checked={value === opt}
                                    onChange={() => handleFieldChange(field.name, opt)}
                                    className="border-gray-300"
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                );
            case "checkbox":
            case "boolean":
                return (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        {field.label}
                    </label>
                );
            case "date":
                return (
                    <DateInput
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className={baseClass}
                    />
                );
            case "datetime":
                return (
                    <input
                        type="datetime-local"
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className={baseClass}
                    />
                );
            case "file":
                return (
                    <input
                        type="file"
                        accept={field.accept}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFieldChange(field.name, file.name);
                        }}
                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className={baseClass}
                    />
                );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    const sections = formSchema.sections || [{ title: "", fields: formSchema.fields || [] }];

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{formSchema.title || tabLabel}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                        status === "COMPLETED" ? "bg-green-100 text-green-800" :
                        status === "REVIEWED" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                    }`}>
                        {status}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {saved && (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" /> Saved
                        </span>
                    )}
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSave("COMPLETED")}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        Complete
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {sections.map((section, sIdx) => (
                    <div key={sIdx}>
                        {section.title && (
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                                {section.title}
                            </h4>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.fields.map((field) => (
                                <div
                                    key={field.name}
                                    className={field.type === "textarea" ? "md:col-span-2" : ""}
                                >
                                    {field.type !== "checkbox" && field.type !== "boolean" && (
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                        </label>
                                    )}
                                    {renderField(field)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
