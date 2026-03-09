"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import DynamicFormRenderer, { FieldConfig, FieldConfigFeatures, SectionDef, FieldDef } from "./DynamicFormRenderer";
import { Plus, Pencil, Trash2, X, Save, Loader2, Search, ChevronLeft, ChevronRight, Download, FileText, CheckCircle2 } from "lucide-react";
import { isValidEmail, isValidPhone, isValidFax, isValidUrl } from "@/utils/validation";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface GenericFhirTabProps {
    tabKey: string;
    patientId: number;
}

export default function GenericFhirTab({ tabKey, patientId }: GenericFhirTabProps) {
    const router = useRouter();
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [records, setRecords] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [singleRecord, setSingleRecord] = useState(false);

    // View state: "list" | "create" | "edit" | "view"
    const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
    const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Pagination
    const [page, setPage] = useState(0);
    const [pageSize] = useState(20);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Reset view state when tab changes
    useEffect(() => {
        setMode("list");
        setSelectedRecord(null);
        setFormData({});
        setSearchTerm("");
        setPage(0);
    }, [tabKey]);

    // Derive list columns from field config: use showInTable fields first, then fallback to first non-group fields
    const listColumns = useCallback((): { key: string; label: string }[] => {
        if (!fieldConfig?.sections?.length) return [];
        // First: collect fields marked with showInTable
        const marked: { key: string; label: string }[] = [];
        for (const section of fieldConfig.sections) {
            for (const field of section.fields) {
                if ((field as any).showInTable) {
                    marked.push({ key: field.key, label: field.label });
                }
            }
        }
        if (marked.length > 0) return marked.slice(0, 8);
        // Fallback: first 6 non-group fields
        const cols: { key: string; label: string }[] = [];
        for (const section of fieldConfig.sections) {
            for (const field of section.fields) {
                if (field.type === "group" || field.type === "computed" || field.type === "textarea" || field.type === "address" || field.type === "hidden") continue;
                cols.push({ key: field.key, label: field.label });
                if (cols.length >= 6) return cols;
            }
        }
        return cols;
    }, [fieldConfig]);

    // Fetch field config
    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${tabKey}`);
            if (res.ok) {
                const json = await res.json();
                const config = json.data || json;
                // field_config may be a string (JSON) or object
                const fc = typeof config.fieldConfig === "string"
                    ? JSON.parse(config.fieldConfig)
                    : config.fieldConfig;
                setFieldConfig(fc);
            }
        } catch (err) {
            console.error("Error fetching field config", err);
        }
    }, [tabKey]);

    // Normalize common FHIR field name mismatches so columns display correctly
    const normalizeRecord = useCallback((rec: Record<string, any>): Record<string, any> => {
        const r = { ...rec };
        // AllergyIntolerance: FHIR uses "criticality", config may use "severity"
        if (r.criticality != null && r.severity == null) r.severity = r.criticality;
        // AllergyIntolerance onset
        if (r.onsetDateTime != null && r.onsetDate == null) r.onsetDate = r.onsetDateTime;
        if (r.onset != null && r.onsetDate == null) r.onsetDate = r.onset;
        // Encounter period
        if (r.period != null) {
            if (r.period.start != null && r.startDate == null) r.startDate = r.period.start;
            if (r.period.end != null && r.endDate == null) r.endDate = r.period.end;
        }
        if (r.actualPeriod != null) {
            if (r.actualPeriod.start != null && r.startDate == null) r.startDate = r.actualPeriod.start;
            if (r.actualPeriod.end != null && r.endDate == null) r.endDate = r.actualPeriod.end;
        }
        if (r.start != null && r.startDate == null) r.startDate = r.start;
        if (r.end != null && r.endDate == null) r.endDate = r.end;
        return r;
    }, []);

    // Fetch records with pagination
    const fetchRecords = useCallback(async (p = page) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(
                `${API_BASE()}/api/fhir-resource/${tabKey}/patient/${patientId}?page=${p}&size=${pageSize}`
            );
            if (res.ok) {
                const json = await res.json();
                const data = json.data || {};
                const content = (data.content || []).map(normalizeRecord);
                const isSingle = data.singleRecord === true;
                setSingleRecord(isSingle);
                setRecords(content);
                setTotalElements(data.totalElements || 0);
                setTotalPages(data.totalPages || 0);

                // Single-record mode: auto-open in view or create mode
                if (isSingle && content.length > 0) {
                    setFormData({ ...content[0] });
                    setSelectedRecord(content[0]);
                    setMode("view");
                } else if (isSingle && content.length === 0) {
                    // No record yet — auto-open create form
                    setFormData({});
                    setSelectedRecord(null);
                    setMode("create");
                }
            } else if (res.status === 403) {
                setError("Access Denied: You don't have permission to view this data.");
            } else {
                setError("Failed to load records");
            }
        } catch (err) {
            console.error("Error fetching records", err);
            setError("Failed to load records");
        } finally {
            setLoading(false);
        }
    }, [tabKey, patientId, pageSize, normalizeRecord]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    useEffect(() => {
        fetchRecords(page);
    }, [fetchRecords, page]);

    // Resolve reference Display fields (e.g. Practitioner names) if missing
    useEffect(() => {
        if (!fieldConfig || Object.keys(formData).length === 0) return;
        const refFields: { key: string; endpoint: string; value: string }[] = [];
        for (const section of fieldConfig.sections || []) {
            for (const field of section.fields || []) {
                if (field.fhirMapping?.type === "reference" || field.type === "lookup") {
                    const val = formData[field.key];
                    const displayKey = field.key + "Display";
                    if (val && !formData[displayKey]) {
                        const endpoint = field.lookupConfig?.endpoint || (
                            field.fhirMapping?.resource === "Practitioner" ? "/api/providers" : ""
                        );
                        if (endpoint) {
                            refFields.push({ key: field.key, endpoint, value: String(val) });
                        }
                    }
                }
            }
        }
        if (refFields.length === 0) return;
        // Resolve references
        (async () => {
            const updates: Record<string, string> = {};
            for (const ref of refFields) {
                try {
                    const rawId = ref.value.includes("/") ? ref.value.split("/").pop() : ref.value;
                    const res = await fetchWithAuth(`${API_BASE()}${ref.endpoint}/${rawId}`);
                    if (res.ok) {
                        const json = await res.json();
                        const data = json.data || json;
                        const name = data.name || data.display ||
                            [data.firstName, data.lastName].filter(Boolean).join(" ") ||
                            [data.identification?.firstName, data.identification?.lastName].filter(Boolean).join(" ") ||
                            data.fullName || "";
                        if (name) updates[ref.key + "Display"] = name;
                    }
                } catch { /* silent */ }
            }
            if (Object.keys(updates).length > 0) {
                setFormData((prev) => ({ ...prev, ...updates }));
            }
        })();
    }, [fieldConfig, formData.id]); // only re-run when record changes (by id)

    const handleFieldChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));

        // If a file field with uploadEndpoint received a value, the upload endpoint
        // already created the record (e.g., DocumentController creates the FHIR resource).
        // Auto-complete to avoid a duplicate POST from handleSave.
        if (value && fieldConfig?.features?.fileUpload?.uploadEndpoint) {
            const fileField = fieldConfig?.sections
                ?.flatMap((s) => s.fields)
                .find((f) => f.key === key && f.type === "file");
            if (fileField) {
                setSuccessMsg("Document uploaded successfully");
                setTimeout(() => setSuccessMsg(null), 3000);
                setTimeout(async () => {
                    await fetchRecords(0);
                    setMode("list");
                    setFormData({});
                    setSelectedRecord(null);
                }, 2000);
            }
        }
    };

    const handleCreate = () => {
        // Pre-fill date fields that have defaultToday: true
        const defaults: Record<string, any> = {};
        if (fieldConfig?.sections) {
            const today = new Date().toISOString().slice(0, 10);
            for (const section of fieldConfig.sections) {
                for (const field of section.fields || []) {
                    if (field.type === "date" && (field as any).defaultToday) {
                        defaults[field.key] = today;
                    }
                }
            }
        }
        setFormData(defaults);
        setSelectedRecord(null);
        setValidationErrors({});
        setError(null);
        setMode("create");
    };

    const handleEdit = (record?: Record<string, any>) => {
        const rec = record || selectedRecord;
        if (!rec) return;
        setFormData({ ...rec });
        setSelectedRecord(rec);
        setValidationErrors({});
        setError(null);
        setMode("edit");
    };

    const handleRowClick = (record: Record<string, any>) => {
        const rowLink = fieldConfig?.features?.rowLink;
        if (rowLink?.urlTemplate) {
            const resourceId = record.id || record.fhirId;
            const url = rowLink.urlTemplate
                .replace("{patientId}", String(patientId))
                .replace("{id}", String(resourceId));
            router.push(url);
            return;
        }
        setFormData({ ...record });
        setSelectedRecord(record);
        setMode("view");
    };

    const handleDelete = async (record: Record<string, any>) => {
        const resourceId = record.id || record.fhirId;
        if (!resourceId) return;
        if (!confirm("Are you sure you want to delete this record?")) return;

        try {
            const res = await fetchWithAuth(
                `${API_BASE()}/api/fhir-resource/${tabKey}/patient/${patientId}/${resourceId}`,
                { method: "DELETE" }
            );
            if (res.ok) {
                setRecords((prev) => prev.filter((r) => (r.id || r.fhirId) !== resourceId));
                setTotalElements((prev) => Math.max(0, prev - 1));
                setSuccessMsg("Record deleted successfully");
                setTimeout(() => setSuccessMsg(null), 3000);
                // Brief delay for FHIR server search indexing after delete
                await new Promise(r => setTimeout(r, 2000));
                await fetchRecords(page);
            } else {
                const err = await res.json().catch(() => null);
                setError(err?.message || "Failed to delete record");
            }
        } catch (err) {
            console.error("Error deleting record", err);
            setError("Failed to delete record");
        }
    };

    const handleSave = async () => {
        // Validate required fields
        if (fieldConfig?.sections) {
            const errors: Record<string, string> = {};
            for (const section of fieldConfig.sections) {
                for (const field of section.fields) {
                    if (field.required) {
                        const val = formData[field.key];
                        if (val == null || (typeof val === "string" && val.trim() === "") || (Array.isArray(val) && val.length === 0)) {
                            errors[field.key] = `${field.label} is required`;
                        }
                    }
                }
            }
            // Format validation for typed fields
            for (const section of fieldConfig.sections) {
                for (const field of section.fields) {
                    const val = formData[field.key];
                    if (typeof val === "string" && val.trim()) {
                        if (field.type === "email" && !isValidEmail(val)) errors[field.key] = "Invalid email format";
                        if (field.type === "phone" && !isValidPhone(val)) errors[field.key] = "Invalid phone number";
                        if ((field.key.toLowerCase().includes("fax")) && !isValidFax(val)) errors[field.key] = "Invalid fax number";
                        if ((field.key.toLowerCase().includes("website") || field.key.toLowerCase().includes("url")) && !isValidUrl(val)) errors[field.key] = "Invalid URL (must start with http:// or https://)";
                    }
                }
            }
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setError("Please correct the highlighted fields");
                return;
            }
        }
        setValidationErrors({});
        setSaving(true);
        setError(null);
        try {
            const isEdit = (mode === "edit") && selectedRecord;
            const resourceId = isEdit ? (selectedRecord!.id || selectedRecord!.fhirId) : null;

            const url = isEdit
                ? `${API_BASE()}/api/fhir-resource/${tabKey}/patient/${patientId}/${resourceId}`
                : `${API_BASE()}/api/fhir-resource/${tabKey}/patient/${patientId}`;

            const res = await fetchWithAuth(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const label = isEdit ? "updated" : "saved";
                if (singleRecord) {
                    // Stay in view mode for single-record tabs
                    const json = await res.json();
                    const savedData = json.data || formData;
                    setFormData({ ...savedData });
                    setSelectedRecord(savedData);
                    setMode("view");
                } else {
                    setMode("list");
                    setFormData({});
                    setSelectedRecord(null);
                }
                setSuccessMsg(`Record ${label} successfully`);
                setTimeout(() => setSuccessMsg(null), 3000);
                // Brief delay for FHIR server search indexing after create/update
                if (!isEdit) await new Promise(r => setTimeout(r, 3000));
                await fetchRecords(0);
            } else {
                const err = await res.json().catch(() => null);
                const errMsg = err?.message
                    || err?.issue?.[0]?.diagnostics
                    || err?.text?.div?.replace(/<[^>]+>/g, "")
                    || err?.error
                    || `Failed to save (${res.status})`;
                setError(errMsg);
            }
        } catch (err) {
            console.error("Error saving record", err);
            setError("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (singleRecord && records.length > 0) {
            // Return to view mode for single-record tabs
            setFormData({ ...records[0] });
            setSelectedRecord(records[0]);
            setMode("view");
            setError(null);
        } else {
            setMode("list");
            setFormData({});
            setSelectedRecord(null);
            setError(null);
        }
    };

    // Find field definition by key
    const findFieldDef = (key: string): FieldDef | undefined => {
        if (!fieldConfig?.sections) return undefined;
        for (const section of fieldConfig.sections) {
            const found = section.fields.find((f) => f.key === key);
            if (found) return found;
        }
        return undefined;
    };

    // Try to format a raw string as a readable date
    const tryFormatDate = (val: string): string | null => {
        if (!val) return null;
        // Already a date-like string: 2026-03-09, 2026-03-09T10:00:00Z, etc.
        const dateOnly = val.includes("T") ? val.split("T")[0] : val;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            try {
                const d = new Date(dateOnly + "T00:00:00");
                if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }
            } catch { /* ignore */ }
        }
        return null;
    };

    const tryFormatDatetime = (val: string): string | null => {
        if (!val) return null;
        try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
            }
        } catch { /* ignore */ }
        return val.replace(/(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/, "").replace("T", " ");
    };

    // Format display value for list table
    const formatValue = (value: any, colKey?: string, record?: Record<string, any>): React.ReactNode => {
        if (value == null) {
            // For date/datetime fields, try fallback to _lastUpdated for "created date" columns
            const fieldDef = colKey ? findFieldDef(colKey) : undefined;
            if (fieldDef && (fieldDef.type === "date" || fieldDef.type === "datetime") && record) {
                // Check common alternate key patterns: camelCase, snake_case, etc.
                const altKeys = [
                    colKey + "Date", colKey + "DateTime",
                    colKey?.replace(/Date$/, ""), colKey?.replace(/date$/i, ""),
                ];
                for (const alt of altKeys) {
                    if (alt && record[alt] && typeof record[alt] === "string") {
                        const formatted = fieldDef.type === "date"
                            ? tryFormatDate(record[alt])
                            : tryFormatDatetime(record[alt]);
                        if (formatted) return formatted;
                    }
                }
            }
            return "-";
        }
        if (typeof value === "boolean") return value ? "Yes" : "No";

        const fieldDef = colKey ? findFieldDef(colKey) : undefined;

        // Reference fields: use {key}Display if available
        if (colKey && record && record[colKey + "Display"]) {
            return record[colKey + "Display"];
        }

        // Status badge rendering
        if (fieldDef?.badgeColors && typeof value === "string") {
            const colorClass = fieldDef.badgeColors[value] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
            return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{value}</span>;
        }

        // Select/coded fields: show label instead of value
        if (fieldDef && (fieldDef.type === "select" || fieldDef.type === "coded") && fieldDef.options) {
            const opt = fieldDef.options.find((o: any) =>
                typeof o === "string" ? o === value : o.value === value
            );
            if (opt) return typeof opt === "string" ? opt : opt.label;
        }

        // Date fields: format as readable date
        if (fieldDef?.type === "date" && typeof value === "string") {
            return tryFormatDate(value) || value;
        }

        // Datetime fields: format as readable datetime
        if (fieldDef?.type === "datetime" && typeof value === "string") {
            return tryFormatDatetime(value) || value;
        }

        // Auto-detect date-like strings even without field def
        if (typeof value === "string") {
            if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
                return tryFormatDatetime(value) || value;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return tryFormatDate(value) || value;
            }
        }

        // File field: show file icon
        if (fieldDef?.type === "file" && value) {
            return (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <FileText className="w-3.5 h-3.5" />
                    {typeof value === "string" ? value.split("/").pop() : "File"}
                </span>
            );
        }

        if (typeof value === "object") {
            if (value.line1) {
                return [value.line1, value.city, value.state].filter(Boolean).join(", ");
            }
            return JSON.stringify(value);
        }
        const str = String(value);
        return str.length > 50 ? str.substring(0, 50) + "..." : str;
    };

    // Filter records by search term
    const filteredRecords = searchTerm
        ? records.filter((r) =>
            Object.values(r).some((v) =>
                v != null && String(v).toLowerCase().includes(searchTerm.toLowerCase())
            )
        )
        : records;

    // ---- Loading ----
    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    // ---- Single-Record Detail Mode (e.g., Demographics) ----
    if (singleRecord && (mode === "view" || mode === "edit")) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {fieldConfig?.sections?.[0]?.title || tabKey}
                    </h4>
                    <div className="flex items-center gap-2">
                        {mode === "edit" ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleEdit()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                    </div>
                </div>
                <div className="p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}
                    {fieldConfig && (
                        <DynamicFormRenderer
                            fieldConfig={fieldConfig}
                            formData={formData}
                            onChange={handleFieldChange}
                            readOnly={mode === "view"}
                            errors={validationErrors}
                            patientId={patientId}
                        />
                    )}
                </div>
            </div>
        );
    }

    // ---- Create / Edit / View Mode (multi-record) ----
    if (mode !== "list") {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {mode === "create" ? "New Record" : mode === "edit" ? "Edit Record" : "View Record"}
                    </h4>
                    <div className="flex items-center gap-2">
                        {mode === "view" && selectedRecord && (
                            <button
                                onClick={() => handleEdit(selectedRecord)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                        {mode !== "view" && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        )}
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            <X className="w-4 h-4" />
                            {mode === "view" ? "Close" : "Cancel"}
                        </button>
                    </div>
                </div>
                <div className="p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}
                    {fieldConfig && (
                        <DynamicFormRenderer
                            fieldConfig={fieldConfig}
                            formData={formData}
                            onChange={handleFieldChange}
                            readOnly={mode === "view"}
                            errors={validationErrors}
                            patientId={patientId}
                        />
                    )}
                </div>
            </div>
        );
    }

    // ---- List Mode ----
    const cols = listColumns();

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
                        />
                    </div>
                    <span className="text-xs text-gray-400">{totalElements} records</span>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Add
                </button>
            </div>

            {/* Success / Error flash */}
            {successMsg && (
                <div className="mx-4 mt-3 flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {successMsg}
                </div>
            )}

            {/* Table */}
            {error ? (
                <div className="p-6 text-center text-red-500 text-sm">{error}</div>
            ) : filteredRecords.length === 0 ? (
                <div className="p-6 text-center">
                    {tabKey === "insurance-coverage" ? (
                        <>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg mb-3">
                                <span className="text-lg font-semibold">Self Pay</span>
                            </div>
                            <p className="text-gray-400 text-sm">No insurance on file. Patient is currently self-pay.</p>
                        </>
                    ) : (
                        <p className="text-gray-400 text-sm">No records found</p>
                    )}
                    <button
                        onClick={handleCreate}
                        className="mt-3 text-blue-600 text-sm hover:underline"
                    >
                        Create your first record
                    </button>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    {cols.map((col) => (
                                        <th
                                            key={col.key}
                                            className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredRecords.map((record, idx) => (
                                    <tr
                                        key={record.id || record.fhirId || idx}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                        onClick={() => handleRowClick(record)}
                                    >
                                        {cols.map((col) => (
                                            <td
                                                key={col.key}
                                                className="px-4 py-2.5 text-gray-700 dark:text-gray-300"
                                            >
                                                {formatValue(record[col.key], col.key, record)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-500">
                                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                                    Page {page + 1} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
