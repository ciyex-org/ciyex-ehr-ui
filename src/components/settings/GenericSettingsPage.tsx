"use client";

import React, { useEffect, useState, useCallback } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { usePermissions } from "@/context/PermissionContext";
import AdminLayout from "@/app/(admin)/layout";
import DynamicFormRenderer, { FieldConfig } from "@/components/patients/DynamicFormRenderer";
import {
    Plus, Pencil, Trash2, X, Save, Loader2, Search,
    ChevronLeft, ChevronRight, LayoutGrid,
} from "lucide-react";
import { isValidEmail, isValidPhone, isValidUSPhone, isValidFax, isValidUrl, formatUSPhone } from "@/utils/validation";
import { confirmDialog } from "@/utils/toast";
import { formatDisplayDate, formatDisplayDateTime } from "@/utils/dateUtils";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/** Normalize dates and common fields in settings records */
function normalizeSettingsRecord(r: Record<string, any>): Record<string, any> {
    // Convert Java date arrays [y,m,d,...] to ISO strings
    for (const key of Object.keys(r)) {
        if (Array.isArray(r[key]) && r[key].length >= 3 && typeof r[key][0] === "number" && r[key][0] > 1900) {
            const [y, m, d, hh = 0, mm = 0, ss = 0, ns = 0] = r[key];
            const ms = Math.floor((ns || 0) / 1e6);
            try { r[key] = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, ms).toISOString(); } catch { /* keep original */ }
        }
    }
    // Ensure 'date' field has a value from common fallbacks
    if (r.date == null && r.createdDate != null) r.date = r.createdDate;
    if (r.date == null && r.createdAt != null) r.date = r.createdAt;
    if (r.date == null && r.updatedAt != null) r.date = r.updatedAt;
    if (r.date == null && r._lastUpdated != null) r.date = r._lastUpdated;
    if (r.date == null && r.created != null) r.date = r.created;
    // Clear literal "null" strings
    for (const key of Object.keys(r)) {
        if (r[key] === "null" || r[key] === "undefined") r[key] = null;
    }
    return r;
}

/** Resolve a dot-notation path like "identification.firstName" on a nested object */
const getNestedValue = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    // Try direct key first (flat data)
    if (path in obj) return obj[path];
    // Walk nested path
    return path.split(".").reduce((cur, key) => cur?.[key], obj);
};

/** Flatten a nested object into dot-notation keys: { identification: { firstName: "A" } } → { "identification.firstName": "A" } */
const flattenObject = (obj: any, prefix = ""): Record<string, any> => {
    const result: Record<string, any> = {};
    if (!obj || typeof obj !== "object") return result;
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
            Object.assign(result, flattenObject(value, fullKey));
        } else {
            result[fullKey] = value;
        }
    }
    return result;
};

/** Unflatten dot-notation keys back to nested object: { "identification.firstName": "A" } → { identification: { firstName: "A" } } */
const unflattenObject = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        const parts = key.split(".");
        let cur = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }
    return result;
};

/** Config fetched from backend /api/tab-field-config/{pageKey} */
interface PageConfig {
    tabKey: string;
    label: string;
    icon: string;
    fhirResources: { type: string }[];
    fieldConfig: FieldConfig | Record<string, never>;
}

interface GenericSettingsPageProps {
    pageKey: string;
    /** When true, skip AdminLayout wrapper (used when embedded inside another page) */
    embedded?: boolean;
    /** Override FHIR write check — allow Add/Edit/Delete regardless of SMART scopes */
    forceWritable?: boolean;
}

/** Patch field configs for known settings pages to ensure proper field types */
function patchSettingsFieldConfig(pageKey: string, fc: FieldConfig): FieldConfig {
    if (!fc?.sections) return fc;
    const patched = { ...fc, sections: fc.sections.map(s => ({ ...s, fields: [...s.fields] })) };
    for (const section of patched.sections) {
        for (let i = 0; i < section.fields.length; i++) {
            const f = section.fields[i];
            const keyLower = f.key.toLowerCase();
            // Referral PROVIDER settings only: organization/affiliation field → lookup against referral-practices
            // NOTE: do NOT apply this to referral-PRACTICES pages (those fields are the practice's own name)
            if (/referral-provider/i.test(pageKey) && (f.key === "organization" || f.key === "organizationId" || f.key === "affiliation" || f.key === "organizationName" || /organ|affil/i.test(f.key) || /organ|affil/i.test(f.label || ""))) {
                const patchedField: any = {
                    ...f,
                    type: "lookup" as const,
                    readOnly: false,
                    disabled: false,
                    editable: true,
                    lookupConfig: (f as any).lookupConfig?.endpoint ? (f as any).lookupConfig : {
                        endpoint: "/api/fhir-resource/referral-practices",
                        displayField: "name",
                        valueField: "name",
                        searchable: true,
                    },
                };
                delete patchedField.readonly;
                delete patchedField.isReadOnly;
                section.fields[i] = patchedField;
            }
            // Practice settings: make phone number mandatory
            const keySeg = keyLower.split(".").pop() || keyLower;
            if (/^practice$/i.test(pageKey) && (keySeg === "phone" || keySeg === "phonenumber" || keySeg === "phone_number" || keySeg === "contactphone" || (f.label || "").toLowerCase().includes("phone"))) {
                section.fields[i] = { ...f, required: true };
            }
            // Practice name / Insurance company name: must contain at least one letter (no purely numeric names)
            if ((/^practice$/i.test(pageKey) || /insurance/i.test(pageKey)) && (keySeg === "name" || keySeg === "practicename" || keySeg === "practice_name" || keySeg === "companyname" || keySeg === "company_name" || keySeg === "insurancename")) {
                section.fields[i] = { ...section.fields[i] || f, validation: { ...(f as any).validation, pattern: "^(?=.*[A-Za-z]).+$", patternMessage: "Name must contain at least one letter" } };
            }
            // Provider photo/image field: restrict to image types only
            if (/provider/i.test(pageKey) && (keySeg === "photo" || keySeg === "image" || keySeg === "profilephoto" || keySeg === "avatar")) {
                section.fields[i] = {
                    ...f,
                    type: "file" as any,
                    fileConfig: {
                        ...(f as any).fileConfig,
                        allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "jpg", "jpeg", "png", "gif", "webp"],
                        maxSizeMB: 5,
                    },
                } as any;
            }
            // Referral provider specialty: always show as combobox with standard options,
            // regardless of original type (handles hidden, text, select, showWhen-blocked, etc.)
            if (/referral/i.test(pageKey) && (keyLower === "specialty" || keyLower === "speciality" || keyLower === "specialization")) {
                const defaultSpecialtyOptions = [
                    { value: "Cardiology", label: "Cardiology" },
                    { value: "Dermatology", label: "Dermatology" },
                    { value: "Endocrinology", label: "Endocrinology" },
                    { value: "Gastroenterology", label: "Gastroenterology" },
                    { value: "General Surgery", label: "General Surgery" },
                    { value: "Hematology", label: "Hematology" },
                    { value: "Infectious Disease", label: "Infectious Disease" },
                    { value: "Internal Medicine", label: "Internal Medicine" },
                    { value: "Nephrology", label: "Nephrology" },
                    { value: "Neurology", label: "Neurology" },
                    { value: "OB/GYN", label: "OB/GYN" },
                    { value: "Oncology", label: "Oncology" },
                    { value: "Ophthalmology", label: "Ophthalmology" },
                    { value: "Orthopedics", label: "Orthopedics" },
                    { value: "Otolaryngology (ENT)", label: "Otolaryngology (ENT)" },
                    { value: "Pediatrics", label: "Pediatrics" },
                    { value: "Psychiatry", label: "Psychiatry" },
                    { value: "Pulmonology", label: "Pulmonology" },
                    { value: "Radiology", label: "Radiology" },
                    { value: "Rheumatology", label: "Rheumatology" },
                    { value: "Urology", label: "Urology" },
                    { value: "Other", label: "Other" },
                ];
                // Replace entire field config with clean object — avoids backend format issues
                // (wrong options shape, optionsSource endpoint, showWhen conditions, etc.)
                section.fields[i] = {
                    key: f.key,
                    label: f.label || "Specialty",
                    type: "combobox" as any,
                    required: f.required || false,
                    options: defaultSpecialtyOptions,
                } as any;
            }
        }
        // Referral PROVIDERS only: add organization lookup field if it doesn't exist
        // (referral-practices pages should NOT get this injected — they ARE the organization)
        if (/referral-provider/i.test(pageKey)) {
            const hasOrgField = section.fields.some(f => f.key === "organization" || f.key === "organizationId" || f.key === "affiliation" || f.key === "organizationName");
            if (!hasOrgField && section.fields.some(f => f.key === "firstName" || f.key === "name" || f.key === "lastName" || f.key === "npi")) {
                section.fields.push({
                    key: "organization",
                    label: "Organization / Affiliation",
                    type: "lookup" as any,
                    required: false,
                    lookupConfig: {
                        endpoint: "/api/fhir-resource/referral-practices",
                        displayField: "name",
                        valueField: "name",
                        searchable: true,
                    },
                    autoFill: {
                        "phone": "phone",
                        "fax": "fax",
                        "email": "email",
                        "address.line1": "address.line1",
                        "address.city": "address.city",
                        "address.state": "address.state",
                        "address.zip": "address.zip",
                    },
                } as any);
            }
        }
        // Add specialty field if missing — applies to both referral-providers and referral-practices
        if (/referral/i.test(pageKey)) {
            const hasSpecialtyField = section.fields.some(f => ["specialty", "speciality", "specialization"].includes(f.key.toLowerCase()));
            if (!hasSpecialtyField && section.fields.some(f => f.key === "firstName" || f.key === "name" || f.key === "lastName" || f.key === "npi")) {
                section.fields.push({
                    key: "specialty",
                    label: "Specialty",
                    type: "combobox" as any,
                    required: false,
                    options: [
                        { value: "Cardiology", label: "Cardiology" },
                        { value: "Dermatology", label: "Dermatology" },
                        { value: "Endocrinology", label: "Endocrinology" },
                        { value: "Gastroenterology", label: "Gastroenterology" },
                        { value: "General Surgery", label: "General Surgery" },
                        { value: "Hematology", label: "Hematology" },
                        { value: "Infectious Disease", label: "Infectious Disease" },
                        { value: "Internal Medicine", label: "Internal Medicine" },
                        { value: "Nephrology", label: "Nephrology" },
                        { value: "Neurology", label: "Neurology" },
                        { value: "OB/GYN", label: "OB/GYN" },
                        { value: "Oncology", label: "Oncology" },
                        { value: "Ophthalmology", label: "Ophthalmology" },
                        { value: "Orthopedics", label: "Orthopedics" },
                        { value: "Otolaryngology (ENT)", label: "Otolaryngology (ENT)" },
                        { value: "Pediatrics", label: "Pediatrics" },
                        { value: "Psychiatry", label: "Psychiatry" },
                        { value: "Pulmonology", label: "Pulmonology" },
                        { value: "Radiology", label: "Radiology" },
                        { value: "Rheumatology", label: "Rheumatology" },
                        { value: "Urology", label: "Urology" },
                        { value: "Other", label: "Other" },
                    ],
                } as any);
            }
        }
    }
    return patched;
}

// Stable wrapper components (defined outside render to keep React identity stable)
const PassThrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default function GenericSettingsPage({ pageKey, embedded = false, forceWritable = false }: GenericSettingsPageProps) {
    const Wrapper = embedded ? PassThrough : AdminLayout;

    const [config, setConfig] = useState<PageConfig | null>(null);
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [records, setRecords] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [configLoading, setConfigLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedOk, setSavedOk] = useState(false);

    const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
    const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<Record<string, any> | null>(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [pageSize] = useState(20);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Write permission check based on FHIR resource type
    const { canWriteResource } = usePermissions();
    const primaryResource = config?.fhirResources?.[0]?.type || "";
    const canWrite = forceWritable || !primaryResource || canWriteResource(primaryResource);

    // Reset view state when page changes
    useEffect(() => {
        setMode("list");
        setSelectedRecord(null);
        setFormData({});
        setSearchTerm("");
        setPage(0);
    }, [pageKey]);

    // Fetch page config from backend tab-field-config API
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setConfigLoading(true);
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${pageKey}`);
                if (!res.ok || cancelled) {
                    if (!cancelled) setConfigLoading(false);
                    return;
                }
                const json = await res.json();
                if (cancelled) return;

                // Handle both wrapped {data: {...}} and unwrapped response formats
                const config = json.data || json;

                const fc = typeof config.fieldConfig === "string"
                    ? JSON.parse(config.fieldConfig)
                    : config.fieldConfig;

                const fhirRes = Array.isArray(config.fhirResources)
                    ? config.fhirResources
                    : typeof config.fhirResources === "string"
                        ? JSON.parse(config.fhirResources)
                        : [];

                const cfg: PageConfig = {
                    tabKey: config.tabKey || pageKey,
                    label: config.label || pageKey.replace(/-/g, " ").replace(/^./, (s: string) => s.toUpperCase()),
                    icon: config.icon || "FileText",
                    fhirResources: fhirRes,
                    fieldConfig: fc || {},
                };

                setConfig(cfg);

                // Set field config if it has sections (i.e. it's a real FieldConfig)
                if (fc?.sections?.length) {
                    // Patch specific field types for known settings pages
                    const patched = patchSettingsFieldConfig(pageKey, fc);
                    setFieldConfig(patched);
                }
            } catch (err) {
                console.error("Failed to load page config:", err);
            } finally {
                if (!cancelled) setConfigLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [pageKey]);

    // Derive table columns from field config or auto-detect from data
    const listColumns = useCallback((): { key: string; label: string }[] => {
        if (fieldConfig?.sections?.length) {
            const cols: { key: string; label: string }[] = [];
            // Check if any field has showInTable — if so, only show those
            const hasShowInTable = fieldConfig.sections.some(s => s.fields.some((f: any) => f.showInTable));
            for (const section of fieldConfig.sections) {
                for (const field of section.fields) {
                    if (field.type === "group" || field.type === "computed" || field.type === "textarea" || field.type === "address") continue;
                    if (hasShowInTable && !(field as any).showInTable) continue;
                    cols.push({ key: field.key, label: field.label });
                    if (cols.length >= 7) return cols;
                }
            }
            return cols;
        }
        // Auto-detect from first record
        if (records.length > 0) {
            const first = records[0];
            const skip = new Set(["id", "fhirId", "orgAlias", "createdAt", "updatedAt", "createdBy", "updatedBy"]);
            return Object.keys(first)
                .filter(k => !skip.has(k) && typeof first[k] !== "object")
                .slice(0, 7)
                .map(k => ({
                    key: k,
                    label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()).trim(),
                }));
        }
        return [];
    }, [fieldConfig, records]);

    /** Build the FHIR resource API URL for this tab */
    const fhirUrl = useCallback((suffix = "") => {
        return `${API_BASE()}/api/fhir-resource/${config?.tabKey || pageKey}${suffix}`;
    }, [config, pageKey]);

    // Fetch records via generic FHIR resource endpoint
    const fetchRecords = useCallback(async (p = page) => {
        if (!config) return;
        setLoading(true);
        setError(null);
        try {
            const url = `${fhirUrl()}?page=${p}&size=${pageSize}`;
            const res = await fetchWithAuth(url);
            if (res.ok) {
                const json = await res.json();
                // Generic FHIR endpoint wraps in ApiResponse { data: { content, totalElements, ... } }
                const payload = json.data || json;
                if (payload.content) {
                    // Merge flattened values so nested fields (e.g. systemAccess.email) are accessible by dot-notation keys
                    const enriched = payload.content.map((r: Record<string, any>) => normalizeSettingsRecord({ ...r, ...flattenObject(r) }));
                    setRecords(enriched);
                    setTotalElements(payload.totalElements || payload.content.length);
                    setTotalPages(payload.totalPages || 1);
                } else if (Array.isArray(payload)) {
                    const enriched = payload.map((r: Record<string, any>) => normalizeSettingsRecord({ ...r, ...flattenObject(r) }));
                    setRecords(enriched);
                    setTotalElements(payload.length);
                    setTotalPages(1);
                } else {
                    setRecords([]);
                    setTotalElements(0);
                    setTotalPages(0);
                }
            } else if (res.status === 403) {
                setError("Access Denied: You don't have permission to view this page.");
            } else {
                setError("Failed to load records");
            }
        } catch (err) {
            console.error("Error fetching records:", err);
            setError("Failed to load records");
        } finally {
            setLoading(false);
        }
    }, [config, pageSize, fhirUrl]);

    const isSingleton = fieldConfig?.singleton === true;

    useEffect(() => {
        if (config && config.fhirResources.length > 0) {
            fetchRecords(page);
        } else if (config) {
            // Config loaded but no FHIR resources configured — stop loading
            setLoading(false);
        }
    }, [config, page, fetchRecords]);

    // Singleton mode: auto-open first record in edit mode (or create if none)
    useEffect(() => {
        if (!isSingleton || loading || mode !== "list") return;
        if (records.length > 0) {
            handleEdit(records[0]);
        } else {
            handleCreate();
        }
    }, [isSingleton, loading, records, mode]);

    const handleFieldChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleCreate = () => {
        setFormData({});
        setSelectedRecord(null);
        setMode("create");
    };

    const handleEdit = async (record: Record<string, any>) => {
        // Start with list data immediately so the form opens fast
        setFormData({ ...record, ...flattenObject(record) });
        setSelectedRecord(record);
        setMode("edit");
        // Then fetch the full individual record (includes extension-stored fields
        // like systemAccess.email/role that are not in the list response)
        const resourceId = record.id || record.fhirId;
        if (resourceId) {
            try {
                const res = await fetchWithAuth(fhirUrl(`/${resourceId}`));
                if (res.ok) {
                    const json = await res.json();
                    const full = json.data || json;
                    setFormData({ ...full, ...flattenObject(full) });
                    setSelectedRecord(full);
                }
            } catch { /* list data is already loaded as fallback */ }
        }
    };

    const handleView = (record: Record<string, any>) => {
        setFormData({ ...record, ...flattenObject(record) });
        setSelectedRecord(record);
        setMode("view");
    };

    const handleDelete = (record: Record<string, any>) => {
        if (!(record.id || record.fhirId)) return;
        setDeleteConfirmRecord(record);
    };

    const confirmDelete = async () => {
        const record = deleteConfirmRecord;
        setDeleteConfirmRecord(null);
        if (!record) return;
        const resourceId = record.id || record.fhirId;
        if (!resourceId) return;

        try {
            const res = await fetchWithAuth(fhirUrl(`/${resourceId}`), { method: "DELETE" });
            const json = await res.json().catch(() => null);
            if (res.ok && json?.success !== false) {
                await fetchRecords(page);
            } else {
                const msg = json?.message || "Failed to delete record";
                setError(msg);
            }
        } catch (err) {
            console.error("Error deleting record:", err);
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
            // Format validation for typed fields and key-based validation
            // Uses last segment of dot-notation key (e.g. "address.city" → "city")
            for (const section of fieldConfig.sections) {
                for (const field of section.fields) {
                    const val = formData[field.key];
                    if (typeof val === "string" && val.trim()) {
                        const keyLower = field.key.toLowerCase();
                        const keySeg = keyLower.split(".").pop() || keyLower; // last segment
                        const labelLower = (field.label || "").toLowerCase();
                        // Email
                        if ((field.type === "email" || keySeg === "email" || keySeg.includes("email")) && !isValidEmail(val)) errors[field.key] = "Invalid email format";
                        // Phone
                        if ((field.type === "phone" || keySeg === "phone" || keySeg === "phonenumber" || keySeg === "mobilenumber" || keySeg === "contactphone" || keySeg === "workphone" || labelLower.includes("phone")) && !isValidUSPhone(val)) errors[field.key] = "Enter a valid 10-digit US phone number";
                        // Fax
                        if ((keySeg === "fax" || keySeg === "faxnumber" || keyLower.includes("fax")) && !isValidFax(val)) errors[field.key] = "Invalid fax number";
                        // URL
                        if ((keySeg === "website" || keySeg.includes("url") || keyLower.includes("website")) && !isValidUrl(val)) errors[field.key] = "Invalid URL (must start with http:// or https://)";
                        // Zip code
                        if ((keySeg === "zip" || keySeg === "zipcode" || keySeg === "postalcode" || labelLower.includes("zip")) && !/^\d{5}(-\d{4})?$/.test(val.trim())) errors[field.key] = "Invalid zip code (must be 5 digits or 5+4 format)";
                        // City (letters, spaces, hyphens, apostrophes only)
                        if ((keySeg === "city" || labelLower === "city") && !/^[A-Za-z\s\-'.]+$/.test(val.trim())) errors[field.key] = "City must contain only letters, spaces, hyphens, or apostrophes";
                        // State (letters only, 2-50 chars)
                        if ((keySeg === "state" || labelLower === "state") && !/^[A-Za-z\s\-'.]{2,50}$/.test(val.trim())) errors[field.key] = "Invalid state value";
                        // First/Last name (no numbers)
                        if ((keySeg === "firstname" || keySeg === "lastname" || keySeg === "first_name" || keySeg === "last_name") && !/^[A-Za-z\s\-'.]+$/.test(val.trim())) errors[field.key] = `${field.label} must contain only letters, spaces, hyphens, or apostrophes`;
                        // Provider identifier fields — must allow alphanumeric (UPIN, Taxonomy, Tax ID, Medicare/Medicaid)
                        const isProviderIdentifier = /^(upin|taxonomy|taxId|tax_id|taxid|medicareId|medicare_id|medicaidId|medicaid_id|medicareBeneficiaryId|deaNumber|dea_number|stateLicenseNumber|state_license_number)$/i.test(keySeg);
                        // Custom pattern validation — skip for provider identifier fields that should accept alphanumeric
                        const fieldValidation = (field as any).validation;
                        if (fieldValidation?.pattern && !isProviderIdentifier && !new RegExp(fieldValidation.pattern).test(val.trim())) {
                            errors[field.key] = fieldValidation.patternMessage || `${field.label} has an invalid format`;
                        }
                        // Provider identifiers — validate alphanumeric format (allow letters, numbers, hyphens)
                        if (isProviderIdentifier && !/^[A-Za-z0-9\s\-./]+$/.test(val.trim())) {
                            errors[field.key] = `${field.label} must contain only letters, numbers, hyphens, or periods`;
                        }
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
            const isEdit = mode === "edit" && selectedRecord;
            const resourceId = isEdit ? (selectedRecord!.id || selectedRecord!.fhirId) : null;
            const url = isEdit ? fhirUrl(`/${resourceId}`) : fhirUrl();

            const res = await fetchWithAuth(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setSavedOk(true);
                setTimeout(() => setSavedOk(false), 3000);
                const saved = await res.json().catch(() => null);
                if (isSingleton) {
                    // Stay in edit mode — refresh with the saved record
                    const savedId = saved?.data?.id || saved?.data?.fhirId || resourceId;
                    if (savedId) {
                        const refreshed = await fetchWithAuth(fhirUrl(`/${savedId}`));
                        if (refreshed.ok) {
                            const json = await refreshed.json();
                            const rec = json.data || json;
                            setFormData({ ...rec, ...flattenObject(rec) });
                            setSelectedRecord(rec);
                            // Update records so singleton effect doesn't re-trigger handleCreate
                            setRecords(prev => prev.length > 0 ? prev.map(r => (r.id || r.fhirId) === (rec.id || rec.fhirId) ? rec : r) : [rec]);
                        }
                    } else {
                        // Fallback: re-fetch list
                        const refreshed = await fetchWithAuth(fhirUrl(`?page=0&size=1`));
                        if (refreshed.ok) {
                            const json = await refreshed.json();
                            const payload = json.data || json;
                            const items = payload.content || (Array.isArray(payload) ? payload : []);
                            if (items.length > 0) {
                                const rec = items[0];
                                setFormData({ ...rec, ...flattenObject(rec) });
                                setSelectedRecord(rec);
                            }
                        }
                    }
                } else {
                    setMode("list");
                    setFormData({});
                    setSelectedRecord(null);
                    setSearchTerm("");
                    if (mode === "create") {
                        // Brief delay for FHIR server search indexing after create
                        await new Promise(r => setTimeout(r, 3000));
                        setPage(0);
                        await fetchRecords(0);
                    } else {
                        await fetchRecords(page);
                    }
                }
            } else {
                const err = await res.json().catch(() => null);
                setError(err?.message || "Failed to save");
            }
        } catch (err) {
            console.error("Error saving record:", err);
            setError("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setMode("list");
        setFormData({});
        setSelectedRecord(null);
        setError(null);
    };

    const formatValue = (value: any): React.ReactNode => {
        if (value == null) return "-";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        // Handle Java date arrays
        if (Array.isArray(value) && value.length >= 3 && typeof value[0] === "number" && value[0] > 1900) {
            const result = formatDisplayDate(value);
            if (result) return result;
        }
        if (typeof value === "object") {
            if (value.line1) return [value.line1, value.city, value.state].filter(Boolean).join(", ");
            return JSON.stringify(value);
        }
        // Auto-detect date-like strings
        const str = String(value);
        if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
            const result = formatDisplayDateTime(str);
            if (result) return result;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const result = formatDisplayDate(str);
            if (result) return result;
        }
        return str.length > 60 ? str.substring(0, 60) + "..." : str;
    };

    const filteredRecords = searchTerm
        ? records.filter(r => {
            const flat = flattenObject(r);
            return Object.values(flat).some(v =>
                v != null && String(v).toLowerCase().includes(searchTerm.toLowerCase())
            );
        })
        : records;

    const displayLabel = config?.label || pageKey.replace(/-/g, " ").replace(/^./, (s: string) => s.toUpperCase());

    // Still loading config from backend
    if (configLoading) {
        return (
            <Wrapper>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </Wrapper>
        );
    }

    // Config loaded but no FHIR resources configured
    if (!config?.fhirResources?.length) {
        return (
            <Wrapper>
                <div className="flex flex-col items-center justify-center py-24">
                    <LayoutGrid className="w-12 h-12 text-gray-300 mb-4" />
                    <h2 className="text-lg font-medium text-gray-600">Page not configured</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        No FHIR resources configured for &quot;{pageKey}&quot;.
                        Configure it in Settings &gt; Chart &gt; Field Configuration.
                    </p>
                </div>
            </Wrapper>
        );
    }

    // Create / Edit / View mode
    if (mode !== "list") {
        return (
            <Wrapper>
                <div className="max-w-4xl mx-auto p-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700">
                                {mode === "create" ? `New ${displayLabel.replace(/s$/, "")}` : mode === "edit" ? `Edit ${displayLabel.replace(/s$/, "")}` : `View ${displayLabel.replace(/s$/, "")}`}
                            </h2>
                            <div className="flex items-center gap-2">
                                {savedOk && (
                                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                        ✓ Saved
                                    </span>
                                )}
                                {mode !== "view" && canWrite && (
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save
                                    </button>
                                )}
                                {mode === "view" && canWrite && (
                                    <button
                                        onClick={() => handleEdit(selectedRecord!)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Edit
                                    </button>
                                )}
                                {!isSingleton && (
                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                                    >
                                        <X className="w-4 h-4" />
                                        {mode === "view" ? "Close" : "Cancel"}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-5">
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
                            )}
                            {fieldConfig ? (
                                <DynamicFormRenderer
                                    fieldConfig={fieldConfig}
                                    formData={formData}
                                    onChange={handleFieldChange}
                                    readOnly={mode === "view"}
                                    errors={validationErrors}
                                />
                            ) : (
                                /* Auto-generate form from record keys */
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.keys(formData).filter(k => !["id", "fhirId", "orgAlias", "createdAt", "updatedAt", "createdBy", "updatedBy"].includes(k)).map(key => (
                                        <div key={key}>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                {key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()).trim()}
                                            </label>
                                            {mode === "view" ? (
                                                <p className="text-sm text-gray-900">{formatValue(formData[key])}</p>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={formData[key] ?? ""}
                                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                                                />
                                            )}
                                        </div>
                                    ))}
                                    {mode === "create" && Object.keys(formData).length === 0 && (
                                        <p className="text-sm text-gray-400 col-span-2">
                                            No field configuration found. Configure fields in Chart &gt; Field Configuration.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Wrapper>
        );
    }

    // List mode
    const cols = listColumns();

    return (
        <Wrapper>
            <div className="max-w-7xl mx-auto p-6">
                <div className="mb-5">
                    <h1 className="text-xl font-bold text-gray-900">{displayLabel}</h1>
                    {config.fhirResources.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                            {config.fhirResources.map((r, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {r.type}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
                                />
                            </div>
                            <span className="text-xs text-gray-400">{totalElements} records</span>
                        </div>
                        {canWrite && (
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        )}
                    </div>

                    {/* Loading */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-500 text-sm">{error}</div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-gray-400 text-sm">No records found</p>
                            {canWrite && (
                                <button onClick={handleCreate} className="mt-3 text-blue-600 text-sm hover:underline">
                                    Create your first record
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            {cols.map(col => (
                                                <th key={col.key} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {col.label}
                                                </th>
                                            ))}
                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRecords.map((record, idx) => (
                                            <tr
                                                key={record.id || record.fhirId || idx}
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => canWrite ? handleEdit(record) : handleView(record)}
                                            >
                                                {cols.map(col => (
                                                    <td key={col.key} className="px-4 py-2.5 text-gray-700">
                                                        {record[col.key + "Display"] || formatValue(getNestedValue(record, col.key))}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2.5 text-right">
                                                    {canWrite && (
                                                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
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
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                                    <span className="text-xs text-gray-500">
                                        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs text-gray-600 px-2">Page {page + 1} of {totalPages}</span>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={page >= totalPages - 1}
                                            className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <ConfirmDialog
                open={!!deleteConfirmRecord}
                title="Delete Record"
                message="Are you sure you want to delete this record?"
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmRecord(null)}
            />
        </Wrapper>
    );
}
