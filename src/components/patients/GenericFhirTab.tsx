"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { usePermissions } from "@/context/PermissionContext";
import DynamicFormRenderer, { FieldConfig, FieldConfigFeatures, SectionDef, FieldDef } from "./DynamicFormRenderer";
import { Plus, Pencil, Trash2, X, Save, Loader2, Search, ChevronLeft, ChevronRight, Download, FileText, CheckCircle2 } from "lucide-react";
import { isValidEmail, isValidPhone, isValidFax, isValidUrl, isValidName, isValidUSPhone, isValidSSN, isStringOnly, isValidDriverLicense, isValidMedicaidId, isValidMedicareBeneficiaryId } from "@/utils/validation";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface GenericFhirTabProps {
    tabKey: string;
    patientId: number;
}

export default function GenericFhirTab({ tabKey, patientId }: GenericFhirTabProps) {
    const router = useRouter();
    // Extract base resource type from tabKey (strip subtab suffix like ">Failed" from "claims>Failed")
    const resourceKey = tabKey.includes(">") ? tabKey.split(">")[0] : tabKey;
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [records, setRecords] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [singleRecord, setSingleRecord] = useState(false);
    const [fhirResourceType, setFhirResourceType] = useState<string>("");

    // Write permission check based on FHIR resource type
    const { canWriteResource } = usePermissions();
    const canWrite = !fhirResourceType || canWriteResource(fhirResourceType);

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
        try {
            // First: collect fields marked with showInTable
            const marked: { key: string; label: string }[] = [];
            for (const section of fieldConfig.sections) {
                if (!Array.isArray(section?.fields)) continue;
                for (const field of section.fields) {
                    if (!field) continue;
                    if ((field as any).showInTable) {
                        marked.push({ key: field.key, label: field.label });
                    }
                }
            }
            if (marked.length > 0) return marked.slice(0, 8);
            // Fallback: first 6 non-group fields
            const cols: { key: string; label: string }[] = [];
            for (const section of fieldConfig.sections) {
                if (!Array.isArray(section?.fields)) continue;
                for (const field of section.fields) {
                    if (!field) continue;
                    if (field.type === "group" || field.type === "computed" || field.type === "textarea" || field.type === "address" || field.type === "hidden") continue;
                    cols.push({ key: field.key, label: field.label });
                    if (cols.length >= 6) return cols;
                }
            }
            return cols;
        } catch {
            return [];
        }
    }, [fieldConfig]);

    // Patch field config to fix missing lookupConfig / field types that cause search to break
    const patchFieldConfig = useCallback((fc: FieldConfig): FieldConfig => {
        if (!fc?.sections) return fc;
        const patched = { ...fc, sections: fc.sections.map(s => ({ ...s, fields: Array.isArray(s.fields) ? s.fields.map(f => ({ ...f })) : [] })) };
        for (const section of patched.sections) {
            if (!Array.isArray(section.fields)) continue;
            for (let i = 0; i < section.fields.length; i++) {
                const f = section.fields[i];
                if (!f) continue;
                // Messaging: ensure "to" / "recipient" field is a patient lookup
                if (tabKey === "messaging" && (f.key === "to" || f.key === "recipient" || f.key === "toPatient")) {
                    if (f.type !== "lookup" || !f.lookupConfig) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: f.lookupConfig || { endpoint: "/api/patients", displayField: "name", valueField: "id", searchable: true } };
                    }
                }
                // Messaging: ensure "from" / "sender" field is a provider lookup
                if (tabKey === "messaging" && (f.key === "from" || f.key === "sender" || f.key === "fromProvider")) {
                    if (f.type !== "lookup" || !f.lookupConfig) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: f.lookupConfig || { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Relationships: ensure relationshipType is a combobox with common options
                if (tabKey === "relationships" && (f.key === "relationshipType" || f.key === "relationType" || f.key === "type")) {
                    if (!f.options || f.options.length === 0) {
                        section.fields[i] = { ...f, type: "combobox", options: [
                            { value: "parent", label: "Parent" },
                            { value: "child", label: "Child" },
                            { value: "spouse", label: "Spouse" },
                            { value: "sibling", label: "Sibling" },
                            { value: "guardian", label: "Guardian" },
                            { value: "emergency", label: "Emergency Contact" },
                            { value: "caregiver", label: "Caregiver" },
                            { value: "other", label: "Other" },
                        ] };
                    }
                }
                // Labs: ensure performer / provider field is a provider lookup with valid endpoint
                if (tabKey === "labs" && (f.key === "performer" || f.key === "provider" || f.key === "orderedBy")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Procedures: ensure cptCode / procedureCode is a code-lookup
                if (tabKey === "procedures" && (f.key === "cptCode" || f.key === "procedureCode" || f.key === "code")) {
                    if (f.type !== "code-lookup" || !f.codeLookupConfig) {
                        section.fields[i] = { ...f, type: "code-lookup", codeLookupConfig: f.codeLookupConfig || { codeSystem: "CPT", allowMultiple: false, placeholder: "Search CPT codes..." } };
                    }
                }
                // Billing: ensure cptCode is a code-lookup
                if (tabKey === "billing" && (f.key === "cptCode" || f.key === "cptCodes" || f.key === "serviceCode" || f.key === "procedureCodes")) {
                    if (f.type !== "code-lookup" || !f.codeLookupConfig) {
                        section.fields[i] = { ...f, type: "code-lookup", codeLookupConfig: f.codeLookupConfig || { codeSystem: "CPT", allowMultiple: true, placeholder: "Search CPT codes..." } };
                    }
                }
                // Billing: ensure diagnosis / icdCode is a diagnosis-list
                if (tabKey === "billing" && (f.key === "diagnosis" || f.key === "diagnosisCodes" || f.key === "icdCodes" || f.key === "icdCode")) {
                    if (f.type !== "diagnosis-list" || !f.diagnosisConfig) {
                        section.fields[i] = { ...f, type: "diagnosis-list", diagnosisConfig: f.diagnosisConfig || { codeSystem: "ICD10_CM", searchEndpoint: "/api/app-proxy/ciyex-codes/api/codes/ICD10_CM/search", allowMultiple: true } };
                    }
                }
                // Visit-notes: ensure author field is a provider lookup
                if (tabKey === "visit-notes" && f.key === "author") {
                    if (f.type !== "lookup" || !f.lookupConfig) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: f.lookupConfig || { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Visit-notes: ensure type/noteType is a combobox with options
                if (tabKey === "visit-notes" && (f.key === "noteType" || f.key === "type")) {
                    if (!f.options || f.options.length === 0) {
                        section.fields[i] = { ...f, type: "combobox", options: [
                            { value: "progress", label: "Progress Note" },
                            { value: "soap", label: "SOAP Note" },
                            { value: "consult", label: "Consultation Note" },
                            { value: "procedure", label: "Procedure Note" },
                            { value: "discharge", label: "Discharge Summary" },
                            { value: "history", label: "History & Physical" },
                            { value: "followup", label: "Follow-up Note" },
                            { value: "telephone", label: "Telephone Note" },
                            { value: "other", label: "Other" },
                        ] };
                    }
                }
                // Visit-notes: ensure action field works as a combobox with options
                if (tabKey === "visit-notes" && f.key === "action") {
                    if (!f.options || f.options.length === 0) {
                        section.fields[i] = { ...f, type: "combobox", options: [
                            { value: "review", label: "Review" },
                            { value: "sign", label: "Sign" },
                            { value: "cosign", label: "Co-Sign" },
                            { value: "addendum", label: "Addendum" },
                            { value: "amend", label: "Amend" },
                            { value: "complete", label: "Complete" },
                            { value: "archive", label: "Archive" },
                        ] };
                    }
                }
                // Demographics: ensure provider lookup fields (assignedProvider, referringProvider, primaryCarePhysician) are editable lookups
                if (tabKey === "demographics" && (f.key === "assignedProvider" || f.key === "assignedProviderId" || f.key === "provider" || f.key === "providerId")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "id", searchable: true } };
                    }
                }
                if (tabKey === "demographics" && (f.key === "referringProvider" || f.key === "referringPhysician" || f.key === "referringProviderId")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "id", searchable: true } };
                    }
                }
                if (tabKey === "demographics" && (f.key === "primaryCarePhysician" || f.key === "pcp" || f.key === "pcpId")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "id", searchable: true } };
                    }
                }
                // Demographics: phone/mobile fields should be required with asterisk
                if (tabKey === "demographics" && /phone|mobile|cell/i.test(f.key)) {
                    if (!f.required) section.fields[i] = { ...f, required: true };
                    // Ensure phone type for auto-formatting
                    if (f.type === "text") section.fields[i] = { ...(section.fields[i] || f), type: "phone" };
                }
                // Immunizations: vaccineCode as CVX code-lookup; lotNumber and dose optional
                if ((tabKey === "immunizations" || tabKey === "immunization") && (f.key === "vaccineCode" || f.key === "vaccine" || f.key === "vaccineName")) {
                    if (f.type !== "code-lookup" || !f.codeLookupConfig) {
                        section.fields[i] = { ...f, type: "code-lookup", codeLookupConfig: f.codeLookupConfig || { codeSystem: "CVX", allowMultiple: false, placeholder: "Search CVX vaccine codes..." } };
                    }
                }
                if ((tabKey === "immunizations" || tabKey === "immunization") && (f.key === "lotNumber" || f.key === "dose" || f.key === "doseQuantity" || f.key === "doseNumber" || f.key === "doseNumberPositive")) {
                    // These fields are optional in FHIR Immunization — don't block save
                    if (f.required) section.fields[i] = { ...f, required: false };
                }
                // Encounters: keep reasonForVisit as-is (honor backend required flag)
                // Encounters: ensure patient field is a patient lookup
                if ((tabKey === "encounters" || tabKey === "encounter") && (f.key === "patient" || f.key === "patientId" || f.key === "patientName" || f.key === "subject")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/patients", displayField: "name", valueField: "id", searchable: true } };
                    }
                }
                // Encounters: ensure provider field is a provider lookup
                if ((tabKey === "encounters" || tabKey === "encounter") && (f.key === "provider" || f.key === "practitioner" || f.key === "providerId")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Appointments: ensure provider/practitioner field is a provider lookup
                if (tabKey === "appointments" && (f.key === "provider" || f.key === "providerId" || f.key === "practitioner" || f.key === "practitionerId")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Appointments: ensure location field is a location lookup
                if (tabKey === "appointments" && (f.key === "location" || f.key === "locationId" || f.key === "locationName")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/fhir-resource/facilities", displayField: "name", valueField: "id", searchable: true } };
                    }
                }
                // Issues/Conditions: ensure onsetDate is a date field
                if ((tabKey === "issues" || tabKey === "conditions" || tabKey === "problems") && (f.key === "onsetDate" || f.key === "onsetDateTime" || f.key === "onset")) {
                    if (f.type !== "date" && f.type !== "datetime") {
                        section.fields[i] = { ...f, type: "date" };
                    }
                }
                // Referral-provider settings: ensure organization field is an editable lookup
                if ((tabKey === "referral-provider" || tabKey === "referral-providers" || tabKey === "referralProvider") && (f.key === "organization" || f.key === "organizationId" || f.key === "affiliation" || f.key === "organizationName")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/fhir-resource/organization", displayField: "name", valueField: "id", searchable: true } };
                    }
                }
            }
        }
        return patched;
    }, [tabKey]);

    // Fetch field config
    const fetchConfig = useCallback(async () => {
        try {
            let res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${tabKey}`);
            // If the full tabKey (e.g. "claims>Failed") fails, try the base resource key (e.g. "claims")
            if (!res.ok && resourceKey !== tabKey) {
                res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${resourceKey}`);
            }
            if (res.ok) {
                const json = await res.json();
                const config = json.data || json;
                // field_config may be a string (JSON) or object
                const fc = typeof config.fieldConfig === "string"
                    ? JSON.parse(config.fieldConfig)
                    : config.fieldConfig;
                setFieldConfig(patchFieldConfig(fc));
                // Extract primary FHIR resource type for write permission check
                const fhirRes = Array.isArray(config.fhirResources)
                    ? config.fhirResources
                    : typeof config.fhirResources === "string"
                        ? JSON.parse(config.fhirResources)
                        : [];
                if (fhirRes.length > 0) {
                    const first = fhirRes[0];
                    setFhirResourceType(typeof first === "string" ? first : first?.type || "");
                }
            }
        } catch (err) {
            console.error("Error fetching field config", err);
        }
    }, [tabKey, resourceKey]);

    // Convert Java date arrays [year, month, day, h, min, s, ns] to ISO strings
    const mapDateArray = (v: any): string | null => {
        if (!v) return null;
        if (Array.isArray(v) && v.length >= 3 && typeof v[0] === "number" && v[0] > 1900) {
            const [y, m, d, hh = 0, mm = 0, ss = 0, ns = 0] = v;
            const ms = Math.floor((ns || 0) / 1e6);
            return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, ms).toISOString();
        }
        return typeof v === "string" ? v : null;
    };

    // Normalize common FHIR field name mismatches so columns display correctly
    const normalizeRecord = useCallback((rec: Record<string, any>): Record<string, any> => {
        const r = { ...rec };

        // Flatten nested audit dates to top-level for column display
        if (r.audit != null && typeof r.audit === "object") {
            if (r.audit.createdDate != null && r.createdDate == null) r.createdDate = r.audit.createdDate;
            if (r.audit.createdAt != null && r.createdAt == null) r.createdAt = r.audit.createdAt;
            if (r.audit.lastModifiedDate != null && r.lastModifiedDate == null) r.lastModifiedDate = r.audit.lastModifiedDate;
        }

        // Java date array normalization: convert [year, month, day, ...] to ISO strings
        // Also normalize Java Date.toString() format ("Mon Mar 09 15:01:49 UTC 2026") to ISO
        const javaDatePattern = /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{2}:\d{2}:\d{2} \w+ \d{4}$/;
        for (const key of Object.keys(r)) {
            if (Array.isArray(r[key]) && r[key].length >= 3 && typeof r[key][0] === "number" && r[key][0] > 1900) {
                r[key] = mapDateArray(r[key]) || r[key];
            } else if (typeof r[key] === "string" && javaDatePattern.test(r[key])) {
                try { const d = new Date(r[key]); if (!isNaN(d.getTime())) r[key] = d.toISOString(); } catch { /* keep original */ }
            }
        }

        // Clean up literal "null" / "undefined" / empty strings from all fields
        for (const key of Object.keys(r)) {
            if (typeof r[key] === "string" && (r[key] === "null" || r[key] === "undefined" || r[key] === "NULL")) {
                r[key] = null;
            }
        }

        // --- AllergyIntolerance ---
        if (r.severity == null && Array.isArray(r.reaction) && r.reaction[0]?.severity) r.severity = r.reaction[0].severity;
        if (r.criticality != null && r.severity == null) r.severity = r.criticality;
        if (r.severity == null && r.severityLevel != null) r.severity = r.severityLevel;
        // Ensure severity isn't the literal string "null" / "undefined" / empty
        if (r.severity === "null" || r.severity === "undefined" || r.severity === "") r.severity = null;
        // Extract readable reaction text from FHIR manifestation structure
        if (Array.isArray(r.reaction) && r.reaction.length > 0) {
            const reactionTexts: string[] = [];
            for (const rxn of r.reaction) {
                if (rxn && Array.isArray(rxn.manifestation)) {
                    for (const m of rxn.manifestation) {
                        const text = m?.text || m?.coding?.[0]?.display || m?.coding?.[0]?.code;
                        if (text) reactionTexts.push(text);
                    }
                }
                if (typeof rxn?.description === "string" && rxn.description && reactionTexts.length === 0) {
                    reactionTexts.push(rxn.description);
                }
            }
            if (reactionTexts.length > 0) r.reaction = reactionTexts.join(", ");
        }
        // Also clear reaction if it's the literal "null" string
        if (r.reaction === "null" || r.reaction === "undefined") r.reaction = null;
        // Extract reaction display from FHIR manifestation so table shows readable text
        if (r.reactionDisplay == null && Array.isArray(r.reaction) && r.reaction.length > 0) {
            const manifList: string[] = [];
            for (const rx of r.reaction) {
                if (Array.isArray(rx?.manifestation)) {
                    for (const m of rx.manifestation) {
                        const d = m?.coding?.[0]?.display || (typeof m?.text === "string" ? m.text : null) || m?.coding?.[0]?.code || null;
                        if (d) manifList.push(d);
                    }
                } else if (typeof rx?.description === "string") {
                    manifList.push(rx.description);
                } else if (typeof rx?.substance === "object" && rx.substance) {
                    // Fallback: extract from substance if no manifestation/description
                    const sub = rx.substance;
                    const d = sub?.coding?.[0]?.display || (typeof sub?.text === "string" ? sub.text : null) || sub?.coding?.[0]?.code || null;
                    if (d) manifList.push(String(d));
                } else if (typeof rx?.severity === "string") {
                    manifList.push(rx.severity);
                } else if (typeof rx === "string") {
                    manifList.push(rx);
                }
            }
            if (manifList.length > 0) r.reactionDisplay = manifList.join(", ");
        }
        if (typeof r.reaction === "string" && r.reaction !== "null") {
            const raw = r.reaction;
            // Parse Java toString format: [{manifestation=[{coding=[{..., display=X}], text=X}]}]
            if (raw.includes("manifestation=") || raw.includes("coding=") || raw.includes("display=")) {
                const textMatch = raw.match(/\btext=([^,}\]]+)/);
                const displayMatch = raw.match(/\bdisplay=([^,}\]]+)/);
                const extracted = (textMatch?.[1] || displayMatch?.[1] || "").trim();
                // Update both reaction and reactionDisplay so edit form shows readable text
                if (extracted) { r.reaction = extracted; r.reactionDisplay = extracted; }
                else r.reactionDisplay = raw;
            } else if (r.reactionDisplay == null) {
                r.reactionDisplay = raw;
            }
        }
        if (r.onsetDateTime != null && r.onsetDate == null) r.onsetDate = r.onsetDateTime;
        if (r.onset != null && r.onsetDate == null) r.onsetDate = r.onset;

        // --- Encounter: reasonForVisit from reasonCode/reason ---
        if (r.reasonForVisit == null) {
            if (Array.isArray(r.reasonCode) && r.reasonCode.length > 0) {
                const rc = r.reasonCode[0];
                r.reasonForVisit = rc?.coding?.[0]?.display || rc?.coding?.[0]?.code || rc?.text || null;
            } else if (r.reasonCode && typeof r.reasonCode === "object") {
                r.reasonForVisit = r.reasonCode?.coding?.[0]?.display || r.reasonCode?.coding?.[0]?.code || r.reasonCode?.text || null;
            }
            if (r.reasonForVisit == null && r.reason != null) {
                if (typeof r.reason === "string") r.reasonForVisit = r.reason;
                else if (Array.isArray(r.reason)) r.reasonForVisit = r.reason[0]?.coding?.[0]?.display || r.reason[0]?.coding?.[0]?.code || r.reason[0]?.text || null;
            }
        }

        // --- Encounter period ---
        if (r.period != null && typeof r.period === "object") {
            if (r.period.start != null && r.startDate == null) r.startDate = r.period.start;
            if (r.period.end != null && r.endDate == null) r.endDate = r.period.end;
        }
        if (r.actualPeriod != null && typeof r.actualPeriod === "object") {
            if (r.actualPeriod.start != null && r.startDate == null) r.startDate = r.actualPeriod.start;
            if (r.actualPeriod.end != null && r.endDate == null) r.endDate = r.actualPeriod.end;
        }
        if (r.start != null && r.startDate == null) r.startDate = r.start;
        if (r.end != null && r.endDate == null) r.endDate = r.end;

        // --- Appointment start/end time ---
        // Fallback for start/end from alternate field names
        if (r.start == null && r.appointmentStart != null) r.start = r.appointmentStart;
        if (r.start == null && r.appointmentDate != null) r.start = r.appointmentDate;
        if (r.start == null && r.scheduledDate != null) r.start = r.scheduledDate;
        if (r.start == null && r.serviceDate != null) r.start = r.serviceDate;
        if (r.start == null && r.dateTime != null) r.start = r.dateTime;
        if (r.start == null && r.startDate != null) r.start = r.startDate;
        if (r.end == null && r.appointmentEnd != null) r.end = r.appointmentEnd;
        if (r.end == null && r.appointmentEndDate != null) {
            // Combine appointmentEndDate + appointmentEndTime into a datetime string
            r.end = r.appointmentEndTime ? `${r.appointmentEndDate}T${r.appointmentEndTime}` : r.appointmentEndDate;
        }
        if (r.end == null && r.endDate != null) r.end = r.endDate;
        // Calculate end from start + minutesDuration (FHIR standard)
        if (r.end == null && r.start != null && (r.minutesDuration != null || r.duration != null || r.durationMinutes != null)) {
            try {
                const dur = Number(r.minutesDuration ?? r.duration ?? r.durationMinutes);
                if (dur > 0) {
                    const s = new Date(String(r.start));
                    if (!isNaN(s.getTime())) {
                        s.setMinutes(s.getMinutes() + dur);
                        r.end = s.toISOString();
                    }
                }
            } catch { /* skip */ }
        }
        if (r.start != null) {
            const iso = String(r.start);
            if (r.appointmentStartDate == null) r.appointmentStartDate = iso.includes("T") ? iso.split("T")[0] : iso;
            if (iso.includes("T")) {
                const tp = iso.split("T")[1]?.replace(/Z$/, "")?.substring(0, 5);
                if (tp) { if (r.appointmentStartTime == null) r.appointmentStartTime = tp; if (r.startTime == null) r.startTime = tp; }
            }
        }
        if (r.end != null) {
            const iso = String(r.end);
            if (r.appointmentEndDate == null) r.appointmentEndDate = iso.includes("T") ? iso.split("T")[0] : iso;
            if (iso.includes("T")) {
                const tp = iso.split("T")[1]?.replace(/Z$/, "")?.substring(0, 5);
                if (tp) { if (r.appointmentEndTime == null) r.appointmentEndTime = tp; if (r.endTime == null) r.endTime = tp; }
            }
        }

        // --- Appointment: extract display text from appointmentType / serviceType / visitType ---
        // Helper to extract text from a CodeableConcept or Java-toString string
        const extractCcDisplay = (v: any): string | null => {
            if (!v) return null;
            if (typeof v === "string" && v.includes("coding=")) {
                // Java toString format: {coding=[{system=..., code=X, display=X}], text=X}
                const m = v.match(/\bdisplay=([^,}\]]+)/);
                if (m && !m[1].startsWith("{") && !m[1].startsWith("[")) return m[1].trim();
                const t = v.match(/\btext=([^,}\]]+)/);
                if (t && !t[1].startsWith("{") && !t[1].startsWith("[")) return t[1].trim();
                const c = v.match(/\bcode=([^,}\]]+)/);
                if (c && !c[1].startsWith("{") && !c[1].startsWith("[")) return c[1].trim();
                return null;
            }
            if (typeof v === "object") {
                const d0 = Array.isArray(v.coding) ? v.coding[0] : null;
                if (d0) {
                    const disp = typeof d0.display === "string" ? d0.display : extractCcDisplay(d0.display);
                    if (disp) return disp;
                    const code = typeof d0.code === "string" ? d0.code : extractCcDisplay(d0.code);
                    if (code) return code;
                }
                if (typeof v.text === "string") return v.text;
                if (v.text && typeof v.text === "object") return extractCcDisplay(v.text);
            }
            return null;
        };
        if (r.appointmentType != null && r.visitType == null) {
            const d = extractCcDisplay(r.appointmentType);
            if (d) { r.visitType = d; r.appointmentTypeDisplay = d; }
        }
        if (r.serviceType != null && r.visitType == null) {
            const st = Array.isArray(r.serviceType) ? r.serviceType[0] : r.serviceType;
            const d = extractCcDisplay(st);
            if (d) r.visitType = d;
        }
        if (r.visitType != null && typeof r.visitType !== "string") {
            r.visitType = extractCcDisplay(r.visitType) || null;
        }

        // --- Clinical-alerts: identifiedDate ---
        if (r.dateIdentified != null && r.identifiedDate == null) r.identifiedDate = r.dateIdentified;
        if (r.identified != null && r.identifiedDate == null) r.identifiedDate = r.identified;
        if (r.recordedDate != null && r.identifiedDate == null) r.identifiedDate = r.recordedDate;
        if (r.onsetDate != null && r.identifiedDate == null) r.identifiedDate = r.onsetDate;
        if (r.createdDate != null && r.identifiedDate == null) r.identifiedDate = r.createdDate;
        if (r._lastUpdated != null && r.identifiedDate == null) r.identifiedDate = r._lastUpdated;

        // --- Documents: normalize FHIR DocumentReference nested content structure ---
        if (r.content && Array.isArray(r.content) && r.content.length > 0) {
            const att = r.content[0]?.attachment;
            if (att) {
                if (r.title == null && att.title) r.title = att.title;
                if (r.documentTitle == null && att.title) r.documentTitle = att.title;
                if (r.attachment == null) r.attachment = att.url || att.data || null;
                if (r.contentType == null && att.contentType) r.contentType = att.contentType;
            }
        }
        // Author display from FHIR author array
        if (r.author == null && Array.isArray(r.author) === false && r.author === undefined) {
            if (Array.isArray(r.author) && (r.author as any[]).length > 0) {
                r.author = (r.author as any[])[0]?.display || (r.author as any[])[0]?.reference || null;
            }
        }
        if (r.author == null && r.authorName != null) r.author = r.authorName;

        // --- Documents: title fallback, documentTitle, documentDate, category normalization ---
        if (r.title == null && r.description != null) r.title = r.description;
        if (r.title == null && r.noteText != null) r.title = typeof r.noteText === "string" && r.noteText.length > 60 ? r.noteText.substring(0, 60) + "…" : r.noteText;
        if (r.title != null && r.documentTitle == null) r.documentTitle = r.title;
        // Normalize category: convert label format ("Clinical Note") to slug ("clinical-note") for select fields
        if (r.category != null && typeof r.category === "string" && /\s/.test(r.category)) {
            const catLabelToSlug: Record<string, string> = {
                "clinical note": "clinical-note",
                "discharge summary": "discharge-summary",
                "lab report": "lab-report",
                "imaging report": "imaging",
                "consent form": "consent",
                "referral letter": "referral",
                "insurance document": "insurance",
                "identification": "identification",
                "prescription": "prescription",
                "other": "other",
            };
            const slug = catLabelToSlug[r.category.toLowerCase()];
            if (slug) r.category = slug;
        }
        if (r.date != null && r.documentDate == null) r.documentDate = r.date;
        if (r.createdDate != null && r.documentDate == null) r.documentDate = r.createdDate;
        if (r.authored != null && r.documentDate == null) r.documentDate = r.authored;
        if (r.created != null && r.documentDate == null) r.documentDate = r.created;
        if (r.indexed != null && r.documentDate == null) r.documentDate = r.indexed;
        if (r._lastUpdated != null && r.documentDate == null) r.documentDate = r._lastUpdated;

        // --- Education: sent (date provided) fallback ---
        if (r.sent == null && r._lastUpdated != null) r.sent = r._lastUpdated;

        // --- Education: dateProvided ---
        if (r.providedDate != null && r.dateProvided == null) r.dateProvided = r.providedDate;
        if (r.assignedDate != null && r.dateProvided == null) r.dateProvided = r.assignedDate;
        if (r.date != null && r.dateProvided == null) r.dateProvided = r.date;
        if (r.createdDate != null && r.dateProvided == null) r.dateProvided = r.createdDate;
        if (r.createdAt != null && r.dateProvided == null) r.dateProvided = r.createdAt;

        // --- Messaging: from, to, patient, sentDate ---
        if (r.sender != null && r.from == null) r.from = r.sender;
        if (r.senderName != null && r.from == null) r.from = r.senderName;
        if (r.fromName != null && r.from == null) r.from = r.fromName;
        if (r.recipient != null && r.to == null) r.to = r.recipient;
        if (r.recipientName != null && r.to == null) r.to = r.recipientName;
        if (r.toName != null && r.to == null) r.to = r.toName;
        if (r.patientName != null && r.patient == null) r.patient = r.patientName;
        if (r.subject != null && r.patient == null && typeof r.subject === "string") r.patient = r.subject;
        if (r.sent != null && r.sentDate == null) r.sentDate = r.sent;
        if (r.timestamp != null && r.sentDate == null) r.sentDate = r.timestamp;
        if (r.authoredOn != null && r.sentDate == null) r.sentDate = r.authoredOn;
        if (r.createdDate != null && r.sentDate == null) r.sentDate = r.createdDate;
        if (r.createdAt != null && r.sentDate == null) r.sentDate = r.createdAt;

        // --- Visit-notes: date, noteType, author ---
        if (r.noteDate != null && r.date == null) r.date = r.noteDate;
        if (r.encounterDate != null && r.date == null) r.date = r.encounterDate;
        if (r.created != null && r.date == null) r.date = r.created;
        if (r.createdDate != null && r.date == null) r.date = r.createdDate;
        if (r.authored != null && r.date == null) r.date = r.authored;
        if (r.effectiveDateTime != null && r.date == null) r.date = r.effectiveDateTime;
        if (r._lastUpdated != null && r.date == null) r.date = r._lastUpdated;
        if (r.type != null && r.noteType == null && typeof r.type === "string") r.noteType = r.type;
        if (r.category != null && r.noteType == null && typeof r.category === "string") r.noteType = r.category;
        // Handle type when it's a FHIR CodeableConcept object
        if (r.type != null && r.noteType == null && typeof r.type === "object") {
            r.noteType = r.type?.coding?.[0]?.display || r.type?.coding?.[0]?.code || r.type?.text || null;
        }
        if (r.authorName != null && r.author == null) r.author = r.authorName;
        if (r.practitioner != null && r.author == null) r.author = r.practitioner;
        if (r.practitionerName != null && r.author == null) r.author = r.practitionerName;
        if (r.recorder != null && r.author == null) r.author = r.recorder;
        // Visit-notes: action field
        if (r.action == null && r.actionCode != null) r.action = r.actionCode;
        if (r.action == null && r.docStatus != null) r.action = r.docStatus;
        if (r.action == null && r.status != null && typeof r.status === "string") r.action = r.status;

        // --- Medications: prescriber + prescriberDisplay ---
        if (r.prescribingDoctorDisplay != null && r.prescriberDisplay == null) r.prescriberDisplay = r.prescribingDoctorDisplay;
        if (r.prescribingDoctor != null && r.prescriber == null) r.prescriber = r.prescribingDoctor;
        if (r.prescriberName != null && r.prescriber == null) r.prescriber = r.prescriberName;
        if (r.orderedBy != null && r.prescriber == null) r.prescriber = r.orderedBy;
        if (r.requester != null && r.prescriber == null) r.prescriber = r.requester;
        // If prescriber/prescribingDoctor is a FHIR reference (e.g. "Practitioner/123"), prefer Display name
        if (typeof r.prescriber === "string" && r.prescriber.includes("/") && r.prescriberDisplay) {
            r.prescriber = r.prescriberDisplay;
        }
        if (typeof r.prescribingDoctor === "string" && r.prescribingDoctor.includes("/") && r.prescribingDoctorDisplay) {
            r.prescribingDoctor = r.prescribingDoctorDisplay;
        }
        // Medications: dateIssued fallback
        if (r.authoredOn != null && r.dateIssued == null) r.dateIssued = r.authoredOn;
        if (r.effectiveDateTime != null && r.dateIssued == null) r.dateIssued = r.effectiveDateTime;
        if (r._lastUpdated != null && r.dateIssued == null) r.dateIssued = r._lastUpdated;

        // --- Demographics: middleName, maritalStatus ---
        if (r.middle_name != null && r.middleName == null) r.middleName = r.middle_name;
        if (r.marital_status != null && r.maritalStatus == null) r.maritalStatus = r.marital_status;
        if (r.maritalStatusCode != null && r.maritalStatus == null) r.maritalStatus = r.maritalStatusCode;

        // --- Immunization ---
        if (r.occurrenceDateTime != null && r.date == null) r.date = r.occurrenceDateTime;
        if (r.doseQuantity != null && r.dose == null) {
            if (typeof r.doseQuantity === "object") {
                r.dose = r.doseQuantity.value ?? null;
                if (r.doseUnit == null) r.doseUnit = r.doseQuantity.unit || r.doseQuantity.code || null;
            } else if (typeof r.doseQuantity === "number") {
                r.dose = r.doseQuantity;
            }
        }
        if (r.doseNumber != null && r.dose == null) r.dose = r.doseNumber;
        if (r.doseNumberPositive != null && r.dose == null) r.dose = r.doseNumberPositive;
        // vaccineCode display
        if (r.vaccineCode != null && r.vaccineName == null) {
            if (typeof r.vaccineCode === "object") {
                r.vaccineName = r.vaccineCode?.coding?.[0]?.display || r.vaccineCode?.coding?.[0]?.code || r.vaccineCode?.text || null;
            } else if (typeof r.vaccineCode === "string") {
                r.vaccineName = r.vaccineCode;
            }
        }

        // --- Labs ---
        if (r.effectiveDateTime != null && r.collectionDate == null) r.collectionDate = r.effectiveDateTime;
        if (r.effectiveDate != null && r.collectionDate == null) r.collectionDate = r.effectiveDate;
        if (r.effective != null && r.collectionDate == null) r.collectionDate = r.effective;
        if (r.collectedDate != null && r.collectionDate == null) r.collectionDate = r.collectedDate;
        if (r.specimenCollectedDate != null && r.collectionDate == null) r.collectionDate = r.specimenCollectedDate;
        if (r.issued != null && r.collectionDate == null) r.collectionDate = r.issued;
        if (r.orderDate != null && r.collectionDate == null) r.collectionDate = r.orderDate;
        if (r.specimen != null && typeof r.specimen === "object" && (r.specimen.collectedDateTime || r.specimen.collection?.collectedDateTime) && r.collectionDate == null) r.collectionDate = r.specimen.collectedDateTime || r.specimen.collection?.collectedDateTime;
        if (r.date != null && r.collectionDate == null) r.collectionDate = r.date;
        if (r.createdDate != null && r.collectionDate == null) r.collectionDate = r.createdDate;
        // Labs: provider from performer - prefer Display names
        if (r.performerDisplay != null && r.provider == null) r.provider = r.performerDisplay;
        if (r.performer != null && r.provider == null) {
            if (typeof r.performer === "string") {
                // If it's a raw FHIR reference like "Practitioner/123", leave as-is for now (formatValue will resolve)
                r.provider = r.performer;
            } else if (Array.isArray(r.performer)) {
                r.provider = r.performer[0]?.display || r.performer[0]?.name || (typeof r.performer[0] === "string" ? r.performer[0] : null);
            } else if (typeof r.performer === "object") {
                r.provider = r.performer.display || r.performer.name || r.performer.reference || null;
            }
        }
        if (r.orderer != null && r.provider == null) { r.provider = typeof r.orderer === "string" ? r.orderer : (r.orderer?.display || r.orderer?.name || null); }
        if (r.ordererDisplay != null && r.provider == null) r.provider = r.ordererDisplay;
        if (r.providerName != null && r.provider == null) r.provider = r.providerName;
        // If provider is a FHIR reference and we have a Display, prefer Display
        if (typeof r.provider === "string" && r.provider.includes("/") && r.performerDisplay) {
            r.provider = r.performerDisplay;
        }
        if (r.requester != null && r.provider == null) { r.provider = typeof r.requester === "string" ? r.requester : (r.requester?.display || null); }
        if (r.requesterDisplay != null && r.provider == null) r.provider = r.requesterDisplay;
        // Reverse: ensure field-config keys are populated from normalized values
        if (r.collectionDate != null && r.effectiveDate == null) r.effectiveDate = r.collectionDate;
        if (r.effectiveDate != null && r.collectionDate == null) r.collectionDate = r.effectiveDate;
        if (r.provider != null && r.performer == null) r.performer = r.provider;
        // Last-resort date: use _lastUpdated or createdDate
        if (r.effectiveDate == null && r._lastUpdated != null) r.effectiveDate = r._lastUpdated;
        if (r.effectiveDate == null && r.createdDate != null) r.effectiveDate = r.createdDate;

        // --- Procedure ---
        if (r.performedDateTime != null && r.datePerformed == null) r.datePerformed = r.performedDateTime;
        if (r.performedPeriod?.start != null && r.datePerformed == null) r.datePerformed = r.performedPeriod.start;
        if (r.date != null && r.datePerformed == null) r.datePerformed = r.date;
        if (r.performedDate != null && r.datePerformed == null) r.datePerformed = r.performedDate;
        if (r.serviceDate != null && r.datePerformed == null) r.datePerformed = r.serviceDate;
        if (r.createdDate != null && r.datePerformed == null) r.datePerformed = r.createdDate;
        // Only normalize cptCode for procedure-like tabs; don't run on Location/Facility records
        if (tabKey === "procedures" || tabKey === "procedure") {
            if (r.code != null && r.cptCode == null) {
                if (typeof r.code === "string") r.cptCode = r.code;
                else if (r.code?.coding?.[0]?.code) r.cptCode = r.code.coding[0].code;
                else if (r.code?.text) r.cptCode = r.code.text;
            }
            if (r.procedureCode != null && r.cptCode == null) r.cptCode = r.procedureCode;
            if (r.serviceCode != null && r.cptCode == null) r.cptCode = r.serviceCode;
            // Convert cptCode string to code-lookup array so the CodeLookup component can display it in edit mode
            if (r.cptCode && typeof r.cptCode === "string") {
                const rawCode = r.code;
                const desc = (rawCode?.coding?.[0]?.display) || (typeof rawCode?.text === "string" ? rawCode.text : null) || r.cptCode;
                r.cptCode = [{ code: r.cptCode, description: typeof desc === "string" ? desc : r.cptCode, units: 1, modifier: "" }];
            }
        }
        // Reverse: ensure field-config keys are populated
        if (r.datePerformed != null && r.performedDate == null) r.performedDate = r.datePerformed;
        if (r.performedDate != null && r.datePerformed == null) r.datePerformed = r.performedDate;
        // Last-resort date for procedures
        if (r.performedDate == null && r._lastUpdated != null) r.performedDate = r._lastUpdated;
        if (r.performedDate == null && r.createdDate != null) r.performedDate = r.createdDate;

        // --- Claims / Billing ---
        if (r.created != null && r.createdDate == null) r.createdDate = r.created;
        if (r.createdAt != null && r.createdDate == null) r.createdDate = r.createdAt;
        if (r.dateOfService != null && r.createdDate == null) r.createdDate = r.dateOfService;
        if (r._lastUpdated != null && r.createdDate == null) r.createdDate = r._lastUpdated;
        if (r.billablePeriod?.start != null && r.submissionDate == null) r.submissionDate = r.billablePeriod.start;
        if (r.submittedDate != null && r.submissionDate == null) r.submissionDate = r.submittedDate;
        if (r.submittedAt != null && r.submissionDate == null) r.submissionDate = r.submittedAt;
        if (r.created != null && r.submissionDate == null) r.submissionDate = r.created;
        if (r.responseDate == null && r.processedDate != null) r.responseDate = r.processedDate;
        if (r.responseDate == null && r.adjudicationDate != null) r.responseDate = r.adjudicationDate;
        if (r.responseDate == null && r.created) r.responseDate = r.created;
        if (r.responseDate == null && r.createdDate != null) r.responseDate = r.createdDate;
        if (r.responseDate == null && r._lastUpdated != null) r.responseDate = r._lastUpdated;
        if (r.originalClaimReference == null && r.request != null) r.originalClaimReference = typeof r.request === "string" ? r.request : (r.request?.reference || r.request?.display);
        if (r.originalClaimReference == null && r.claimReference != null) r.originalClaimReference = r.claimReference;
        if (r.originalClaimReference == null && r.originalClaimId != null) r.originalClaimReference = r.originalClaimId;
        // Bidirectional: field config may use either spelling
        if (r.originalClaimRef == null && r.originalClaimReference != null) r.originalClaimRef = r.originalClaimReference;
        if (r.originalClaimRef == null && r.originalClaim != null) r.originalClaimRef = typeof r.originalClaim === "string" ? r.originalClaim : (r.originalClaim?.reference || r.originalClaim?.display || String(r.originalClaim));
        if (r.originalClaimRef == null && r.relatedClaim != null) r.originalClaimRef = typeof r.relatedClaim === "string" ? r.relatedClaim : (r.relatedClaim?.reference || r.relatedClaim?.display || String(r.relatedClaim));
        if (r.originalClaimRef == null && Array.isArray(r.related) && r.related.length > 0) {
            const rel = r.related[0];
            r.originalClaimRef = rel?.claim?.reference || rel?.claim?.display || rel?.reference || rel?.id || null;
        }
        if (r.originalClaimReference == null && r.originalClaimRef != null) r.originalClaimReference = r.originalClaimRef;
        // Strip FHIR reference prefix (e.g. "Claim/123" → "123") for cleaner display
        if (r.originalClaimRef && typeof r.originalClaimRef === "string" && /^[A-Z][a-zA-Z]+\//.test(r.originalClaimRef)) {
            r.originalClaimRef = r.originalClaimRef.split("/").pop() || r.originalClaimRef;
        }
        // claimType from FHIR type CodeableConcept (ERA / denial / submissions only)
        const isClaimsTab = tabKey === "era" || tabKey === "denials" || tabKey === "claim-denials"
            || tabKey === "submissions" || tabKey === "claim-submissions" || tabKey === "eob"
            || tabKey === "remittance" || tabKey === "era-remittance" || tabKey === "claims" || tabKey === "transactions";
        if (isClaimsTab && r.claimType == null && r.type != null) {
            if (typeof r.type === "object" && !Array.isArray(r.type) && (r.type.coding || r.type.text)) {
                const d0 = Array.isArray(r.type.coding) ? r.type.coding[0] : null;
                r.claimType = (typeof d0?.display === "string" ? d0.display : null)
                    || (typeof d0?.code === "string" ? d0.code : null)
                    || (typeof r.type.text === "string" ? r.type.text : null) || null;
            } else if (typeof r.type === "string" && r.type.includes("coding=")) {
                const m = r.type.match(/\bdisplay=([^,}\]]+)/);
                if (m && !m[1].startsWith("{")) r.claimType = m[1].trim();
                else {
                    const t = r.type.match(/\bcode=([^,}\]]+)/);
                    if (t && !t[1].startsWith("{")) r.claimType = t[1].trim();
                }
            } else if (typeof r.type === "string" && !r.type.includes("{")) {
                r.claimType = r.type;
            }
        }

        // --- Claims: service from / service to dates ---
        if (r.serviceFrom == null && r.billablePeriodStart != null) r.serviceFrom = r.billablePeriodStart;
        if (r.serviceFrom == null && r.billablePeriod?.start != null) r.serviceFrom = r.billablePeriod.start;
        if (r.serviceFrom == null && r.servicePeriod?.start != null) r.serviceFrom = r.servicePeriod.start;
        if (r.serviceFrom == null && r.serviceDate != null) r.serviceFrom = r.serviceDate;
        if (r.serviceFrom == null && r.dateOfService != null) r.serviceFrom = r.dateOfService;
        if (r.serviceFrom == null && r.startDate != null) r.serviceFrom = r.startDate;
        if (r.serviceFrom == null && r.createdDate != null) r.serviceFrom = r.createdDate;
        if (r.serviceTo == null && r.billablePeriodEnd != null) r.serviceTo = r.billablePeriodEnd;
        if (r.serviceTo == null && r.billablePeriod?.end != null) r.serviceTo = r.billablePeriod.end;
        if (r.serviceTo == null && r.servicePeriod?.end != null) r.serviceTo = r.servicePeriod.end;
        if (r.serviceTo == null && r.serviceEndDate != null) r.serviceTo = r.serviceEndDate;
        if (r.serviceTo == null && r.endDate != null) r.serviceTo = r.endDate;
        if (r.serviceTo == null && r.serviceFrom != null) r.serviceTo = r.serviceFrom;
        // Also map serviceFromDate / serviceToDate alternate keys
        if (r.serviceFromDate != null && r.serviceFrom == null) r.serviceFrom = r.serviceFromDate;
        if (r.serviceToDate != null && r.serviceTo == null) r.serviceTo = r.serviceToDate;
        // Reverse: ensure flat billablePeriod fields are populated for field-config display
        if (r.billablePeriodStart == null && r.serviceFrom != null) r.billablePeriodStart = r.serviceFrom;
        if (r.billablePeriodEnd == null && r.serviceTo != null) r.billablePeriodEnd = r.serviceTo;

        // --- Claim Submissions: tracking number and total charge ---
        if (r.trackingNumber == null && r.submissionNumber != null) r.trackingNumber = r.submissionNumber;
        if (r.trackingNumber == null && r.claimTrackingNumber != null) r.trackingNumber = r.claimTrackingNumber;
        if (r.trackingNumber == null && r.referenceNumber != null) r.trackingNumber = r.referenceNumber;
        if (r.trackingNumber == null && r.confirmationNumber != null) r.trackingNumber = r.confirmationNumber;
        if (r.trackingNumber == null && r.submissionId != null) r.trackingNumber = r.submissionId;
        if (r.trackingNumber == null && r.claimId != null) r.trackingNumber = String(r.claimId);
        if (r.trackingNumber == null && r.id != null) r.trackingNumber = String(r.id);
        if (r.totalCharge == null && r.total != null) r.totalCharge = typeof r.total === "object" ? r.total.value : r.total;
        if (r.totalCharge == null && r.totalAmount != null) r.totalCharge = r.totalAmount;
        if (r.totalCharge == null && r.chargeAmount != null) r.totalCharge = r.chargeAmount;
        if (r.totalCharge == null && r.amount != null) r.totalCharge = r.amount;
        if (r.totalCharge == null && r.billedAmount != null) r.totalCharge = r.billedAmount;
        if (r.totalCharge == null && r.claimTotal != null) r.totalCharge = typeof r.claimTotal === "object" ? r.claimTotal.value : r.claimTotal;
        // Reverse: ensure field-config keys 'total' and 'created' are populated
        if (r.total == null && r.totalCharge != null) r.total = r.totalCharge;
        if (r.total == null && r.totalAmount != null) r.total = r.totalAmount;
        if (r.created == null && r.createdDate != null) r.created = r.createdDate;
        if (r.created == null && r._lastUpdated != null) r.created = r._lastUpdated;

        // --- Transaction ---
        if (r.serviceDate == null && r.created != null) r.serviceDate = r.created;
        if (r.serviceDate == null && r.createdDate != null) r.serviceDate = r.createdDate;
        if (r.serviceDate == null && r.billablePeriodStart != null) r.serviceDate = r.billablePeriodStart;
        if (r.serviceDate == null && r._lastUpdated != null) r.serviceDate = r._lastUpdated;
        if (r.date == null && r.transactionDate != null) r.date = r.transactionDate;
        if (r.date == null && r.paymentDate != null) r.date = r.paymentDate;
        if (r.date == null && r.collectedAt != null) r.date = r.collectedAt;
        if (r.date == null && r.createdAt != null) r.date = r.createdAt;
        if (r.date == null && r.createdDate != null) r.date = r.createdDate;
        if (r.amount == null && r.total != null) r.amount = typeof r.total === "object" ? r.total.value : r.total;
        if (r.amount == null && r.totalAmount != null) r.amount = r.totalAmount;
        if (r.amount == null && r.totalCharge != null) r.amount = r.totalCharge;
        if (r.amount == null && r.value != null) r.amount = r.value;
        if (r.amount == null && r.payment?.amount != null) r.amount = typeof r.payment.amount === "object" ? r.payment.amount.value : r.payment.amount;

        // --- Billing CPT code ---
        if (r.cptCode == null && r.item?.[0]?.productOrService?.coding?.[0]?.code) r.cptCode = r.item[0].productOrService.coding[0].code;
        if (r.cptCode == null && r.serviceCode != null) r.cptCode = r.serviceCode;
        if (r.cptCode == null && r.procedureCodes != null) r.cptCode = Array.isArray(r.procedureCodes) ? r.procedureCodes.map((c: any) => c.code || c).join(", ") : r.procedureCodes;
        // Billing diagnosis code
        if (r.diagnosisCode == null && r.diagnosis != null) {
            r.diagnosisCode = Array.isArray(r.diagnosis) ? r.diagnosis.map((d: any) => d.code || d).join(", ") : (typeof r.diagnosis === "object" ? (r.diagnosis.code || JSON.stringify(r.diagnosis)) : r.diagnosis);
        }
        if (r.diagnosisCode == null && r.diagnosisCodes != null) {
            r.diagnosisCode = Array.isArray(r.diagnosisCodes) ? r.diagnosisCodes.map((d: any) => d.code || d).join(", ") : r.diagnosisCodes;
        }
        if (r.diagnosisCode == null && r.icdCode != null) r.diagnosisCode = r.icdCode;
        if (r.diagnosisCode == null && r.icdCodes != null) r.diagnosisCode = Array.isArray(r.icdCodes) ? r.icdCodes.join(", ") : r.icdCodes;

        // --- Issues / Condition onset ---
        if (r.onsetDateTime != null && r.onsetDate == null) r.onsetDate = r.onsetDateTime;
        if (r.onset != null && r.onsetDate == null) r.onsetDate = r.onset;
        if (r.recordedDate != null && r.onsetDate == null) r.onsetDate = r.recordedDate;
        if (r.dateRecorded != null && r.onsetDate == null) r.onsetDate = r.dateRecorded;
        if (r.identifiedDate != null && r.onsetDate == null) r.onsetDate = r.identifiedDate;
        if (r.createdDate != null && r.onsetDate == null) r.onsetDate = r.createdDate;

        // --- Generic encounter date ---
        if (r.encounterDate == null && r.date != null) r.encounterDate = r.date;
        if (r.encounterDate == null && r.startDate != null) r.encounterDate = r.startDate;

        // --- Insurance Coverage: policyEffectiveDate / policyEndDate ---
        if (r.policyEffectiveDate == null && r.startDate != null) r.policyEffectiveDate = r.startDate;
        if (r.policyEffectiveDate == null && r.period?.start != null) r.policyEffectiveDate = r.period.start;
        if (r.policyEffectiveDate == null && r.coverageStartDate != null) r.policyEffectiveDate = r.coverageStartDate;
        if (r.policyEffectiveDate == null && r.effectiveDate != null) r.policyEffectiveDate = r.effectiveDate;
        if (r.policyEffectiveDate == null && r.start != null) r.policyEffectiveDate = r.start;
        if (r.policyEffectiveDate == null && r.createdDate != null) r.policyEffectiveDate = r.createdDate;
        if (r.policyEndDate == null && r.endDate != null) r.policyEndDate = r.endDate;
        if (r.policyEndDate == null && r.period?.end != null) r.policyEndDate = r.period.end;
        if (r.policyEndDate == null && r.coverageEndDate != null) r.policyEndDate = r.coverageEndDate;
        if (r.policyEndDate == null && r.end != null) r.policyEndDate = r.end;
        if (r.policyEndDate == null && r.expirationDate != null) r.policyEndDate = r.expirationDate;

        // --- Relationship: relatedPatientName / relationshipType ---
        if (r.relatedPatientName == null) {
            const nameObj = Array.isArray(r.name) ? r.name[0] : r.name;
            if (nameObj && typeof nameObj === "object") {
                r.relatedPatientName = nameObj.text || [nameObj.given?.[0], nameObj.family].filter(Boolean).join(" ") || null;
            } else if (typeof nameObj === "string") {
                r.relatedPatientName = nameObj;
            }
        }
        if (r.relatedPatientName == null && r.relatedPersonName != null) r.relatedPatientName = r.relatedPersonName;
        if (r.relatedPatientName == null && r.fullName != null) r.relatedPatientName = r.fullName;
        if (r.relatedPatientName == null && r.displayName != null) r.relatedPatientName = r.displayName;
        if (r.relationshipType == null) {
            const rel = Array.isArray(r.relationship) ? r.relationship[0] : r.relationship;
            if (rel && typeof rel === "object") {
                r.relationshipType = rel.coding?.[0]?.display || rel.coding?.[0]?.code || rel.text || null;
            } else if (typeof rel === "string") {
                r.relationshipType = rel;
            }
        }
        if (r.relationshipType == null && r.relationType != null) r.relationshipType = r.relationType;
        if (r.relationshipType == null && r.type != null && typeof r.type === "string") r.relationshipType = r.type;

        // --- Messaging: ensure from/to resolve provider and patient references ---
        if (r.from == null && r.providerName != null) r.from = r.providerName;
        if (r.from == null && r.provider != null && typeof r.provider === "string") r.from = r.provider;
        if (r.from == null && r.authorName != null) r.from = r.authorName;
        if (r.from == null && r.author != null && typeof r.author === "string") r.from = r.author;
        if (r.to == null && r.patientName != null) r.to = r.patientName;
        if (r.to == null && r.toPatientName != null) r.to = r.toPatientName;

        // --- Facility / Location: flatten FHIR CodeableConcept fields to simple strings ---
        if (tabKey === "facility" || tabKey === "facilities" || tabKey === "location" || tabKey === "locations" || tabKey === "serviceLocation" || tabKey === "serviceLocations") {
            // type: CodeableConcept[] → simple string code
            if (r.type != null && typeof r.type !== "string") {
                if (Array.isArray(r.type)) {
                    const first = r.type[0];
                    r.type = first?.coding?.[0]?.code || first?.coding?.[0]?.display || first?.text || (typeof first === "string" ? first : JSON.stringify(first));
                } else if (typeof r.type === "object") {
                    r.type = r.type?.coding?.[0]?.code || r.type?.coding?.[0]?.display || r.type?.text || "";
                }
            }
            // physicalType: CodeableConcept → simple string code
            if (r.physicalType != null && typeof r.physicalType !== "string") {
                if (typeof r.physicalType === "object" && !Array.isArray(r.physicalType)) {
                    r.physicalType = r.physicalType?.coding?.[0]?.code || r.physicalType?.coding?.[0]?.display || r.physicalType?.text || "";
                }
            }
            // address: FHIR Address object → text string
            if (r.address != null && typeof r.address === "object" && !Array.isArray(r.address)) {
                r.address = r.address.text || [r.address.line?.join(", "), r.address.city, r.address.state, r.address.postalCode].filter(Boolean).join(", ") || "";
            }
            // telecom: extract phone from telecom array
            if (r.phone == null && Array.isArray(r.telecom)) {
                const phoneTelecom = r.telecom.find((t: any) => t.system === "phone") || r.telecom[0];
                if (phoneTelecom?.value) r.phone = phoneTelecom.value;
            }
        }

        // --- Documents: reverse mapping for save (documentDate → date) ---
        if (r.date == null && r.documentDate != null) r.date = r.documentDate;

        // --- Reverse mappings: ensure field-config keys are populated from normalized values ---

        // Insurance: reverse policyEffectiveDate/policyEndDate → effectiveDate/endDate
        if (r.effectiveDate == null && r.policyEffectiveDate != null) r.effectiveDate = r.policyEffectiveDate;
        if (r.endDate == null && r.policyEndDate != null) r.endDate = r.policyEndDate;
        if (r.startDate == null && r.policyEffectiveDate != null) r.startDate = r.policyEffectiveDate;
        if (r.coverageStartDate == null && r.policyEffectiveDate != null) r.coverageStartDate = r.policyEffectiveDate;
        if (r.coverageEndDate == null && r.policyEndDate != null) r.coverageEndDate = r.policyEndDate;

        // Visit-notes: reverse date → noteDateTime/noteDate and note ↔ noteText
        if (r.noteDateTime == null && r.date != null) r.noteDateTime = r.date;
        if (r.noteDate == null && r.date != null) r.noteDate = r.date;
        if (r.noteText == null && r.note != null) r.noteText = r.note;
        if (r.note == null && r.noteText != null) r.note = r.noteText;
        if (r.content == null && r.noteText != null) r.content = r.noteText;

        // Issues/Conditions: reverse onsetDate → onsetDateTime/onset/recordedDate
        if (r.onsetDateTime == null && r.onsetDate != null) r.onsetDateTime = r.onsetDate;
        if (r.onset == null && r.onsetDate != null) r.onset = r.onsetDate;
        if (r.recordedDate == null && r.onsetDate != null) r.recordedDate = r.onsetDate;

        // Messaging: reverse from/to → sender/recipient/providerName/patientName
        if (r.sender == null && r.from != null) r.sender = r.from;
        if (r.senderName == null && r.from != null) r.senderName = r.from;
        if (r.providerName == null && r.from != null) r.providerName = r.from;
        if (r.recipient == null && r.to != null) r.recipient = r.to;
        if (r.recipientName == null && r.to != null) r.recipientName = r.to;
        if (r.toPatientName == null && r.to != null) r.toPatientName = r.to;

        // Relationships: reverse relatedPatientName/relationshipType → name/relationType
        if (r.relatedPersonName == null && r.relatedPatientName != null) r.relatedPersonName = r.relatedPatientName;
        if (r.fullName == null && r.relatedPatientName != null) r.fullName = r.relatedPatientName;
        if (r.displayName == null && r.relatedPatientName != null) r.displayName = r.relatedPatientName;
        if (r.relationType == null && r.relationshipType != null) r.relationType = r.relationshipType;

        // Allergies: reverse severity → criticality/severityLevel
        if (r.criticality == null && r.severity != null) r.criticality = r.severity;
        if (r.severityLevel == null && r.severity != null) r.severityLevel = r.severity;

        // Appointments: reverse provider/location display names
        if (r.providerDisplay == null && r.provider != null && typeof r.provider === "string" && !r.provider.includes("/")) r.providerDisplay = r.provider;
        if (r.locationDisplay == null && r.location != null && typeof r.location === "string" && !r.location.includes("/")) r.locationDisplay = r.location;

        return r;
    }, [tabKey]);

    // Fetch records with pagination
    const fetchRecords = useCallback(async (p = page) => {
        setLoading(true);
        setError(null);
        try {
            const headers: HeadersInit = {};
            if (typeof window !== "undefined") {
                const storedOrgId = localStorage.getItem("orgId");
                if (storedOrgId) headers["orgId"] = storedOrgId;
            }
            const res = await fetchWithAuth(
                `${API_BASE()}/api/fhir-resource/${resourceKey}/patient/${patientId}?page=${p}&size=${pageSize}`,
                { headers }
            );
            if (res.ok) {
                const json = await res.json();
                const data = json.data || {};
                const content = (data.content || []).map((rec: Record<string, any>) => { try { return normalizeRecord(rec); } catch { return rec; } });
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
        // already stored the file. Show a notification but DO NOT auto-close the form
        // so the user can still fill in title, author, date, etc. before saving.
        if (value && fieldConfig?.features?.fileUpload?.uploadEndpoint) {
            const fileField = fieldConfig?.sections
                ?.flatMap((s) => s.fields)
                .find((f) => f.key === key && f.type === "file");
            if (fileField) {
                setSuccessMsg("File uploaded — please complete the remaining fields and click Save.");
                setTimeout(() => setSuccessMsg(null), 5000);
                // Do NOT auto-close; user must click Save explicitly
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
                    // Auto-fill defaultValue from field config
                    if ((field as any).defaultValue != null && defaults[field.key] == null) {
                        defaults[field.key] = (field as any).defaultValue;
                    }
                }
            }
        }
        // For messaging tab: auto-fill patientId so backend can resolve patient name
        if (tabKey === "messaging") {
            defaults.patientId = defaults.patientId || patientId;
            // Auto-fill date if not already set
            if (!defaults.date && !defaults.sentDate) {
                defaults.date = new Date().toISOString().slice(0, 10);
                defaults.sentDate = new Date().toISOString().slice(0, 10);
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
                `${API_BASE()}/api/fhir-resource/${resourceKey}/patient/${patientId}/${resourceId}`,
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
                if (!Array.isArray(section?.fields)) continue;
                for (const field of section.fields) {
                    if (!field) continue;
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
                if (!Array.isArray(section?.fields)) continue;
                for (const field of section.fields) {
                    if (!field) continue;
                    const val = formData[field.key];
                    if (typeof val === "string" && val.trim()) {
                        if (field.type === "email" && !isValidEmail(val)) errors[field.key] = "Invalid email format";
                        if (field.type === "phone" && !isValidPhone(val)) errors[field.key] = "Invalid phone number";
                        if ((field.key.toLowerCase().includes("fax")) && !isValidFax(val)) errors[field.key] = "Invalid fax number";
                        if ((field.key.toLowerCase().includes("website") || field.key.toLowerCase().includes("url")) && !isValidUrl(val)) errors[field.key] = "Invalid URL (must start with http:// or https://)";
                    }
                }
            }
            // Immunization: dose must be numeric if provided
            if (tabKey === "immunizations" || tabKey === "immunization") {
                const doseVal = formData.doseNumber ?? formData.dose ?? formData.doseNumberPositive;
                if (doseVal !== undefined && doseVal !== "" && doseVal !== null && isNaN(Number(doseVal))) {
                    errors.doseNumber = "Dose must be a number";
                }
                const lotNum = formData.lotNumber;
                if (typeof lotNum === "string" && lotNum.trim() && !/^[A-Za-z0-9\-]+$/.test(lotNum.trim())) {
                    errors.lotNumber = "Lot number must be alphanumeric";
                }
            }
            // Procedures: description/name must not be purely numeric
            if (tabKey === "procedures" || tabKey === "procedure") {
                for (const key of ["description", "procedureName", "name", "displayText"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^\d+$/.test(val.trim())) {
                        errors[key] = `${key === "description" ? "Description" : "Procedure name"} must contain letters, not just numbers`;
                    }
                }
            }
            // Allergies: allergyName and reaction must not be purely numeric
            if (tabKey === "allergies" || tabKey === "allergy-intolerances") {
                for (const key of ["allergyName", "allergy_name", "substance", "name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^\d+$/.test(val.trim())) {
                        errors[key] = "Allergy name must contain letters, not just numbers";
                    }
                }
                const reactionVal = formData.reaction || formData.manifestation;
                if (typeof reactionVal === "string" && reactionVal.trim() && /^\d+$/.test(reactionVal.trim())) {
                    errors.reaction = "Reaction must contain letters, not just numbers";
                }
                // End date must not be earlier than onset date
                const onsetRaw = formData.onsetDate || formData.onset || formData.onsetDateTime;
                const endRaw = formData.endDate || formData.end;
                if (onsetRaw && endRaw) {
                    const onsetDt = new Date(String(onsetRaw));
                    const endDt = new Date(String(endRaw));
                    if (!isNaN(onsetDt.getTime()) && !isNaN(endDt.getTime()) && endDt < onsetDt) {
                        errors.endDate = "End date cannot be earlier than onset date";
                    }
                }
            }
            // Encounters: reasonForVisit is required
            const tkLower = tabKey.toLowerCase();
            if (tkLower === "encounters" || tkLower === "encounter" || tkLower.startsWith("encounter")) {
                const rv = formData.reasonForVisit || formData.reason || formData.reasonCode;
                const rvStr = typeof rv === "string" ? rv : (Array.isArray(rv) ? (rv[0]?.coding?.[0]?.display || rv[0]?.text || "") : "");
                if (!rvStr || !rvStr.trim()) {
                    errors.reasonForVisit = "Reason for Visit is required";
                }
            }
            // Problems/Conditions: condition must not be purely numeric + onset/resolved date validation
            if (tabKey === "medicalproblems" || tabKey === "problems" || tabKey === "conditions" || tabKey === "issues") {
                for (const key of ["condition", "conditionName", "name", "code", "displayText"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^\d+$/.test(val.trim())) {
                        errors[key] = "Condition must contain letters, not just numbers";
                    }
                }
                // Resolved/end date must not be before onset date
                const probOnsetRaw = formData.onsetDate || formData.onset || formData.onsetDateTime;
                const probEndRaw = formData.endDate || formData.resolvedDate || formData.abatementDate || formData.end;
                if (probOnsetRaw && probEndRaw) {
                    const probOnsetDt = new Date(String(probOnsetRaw));
                    const probEndDt = new Date(String(probEndRaw));
                    if (!isNaN(probOnsetDt.getTime()) && !isNaN(probEndDt.getTime()) && probEndDt < probOnsetDt) {
                        errors.endDate = "Resolved date cannot be earlier than onset date";
                        errors.resolvedDate = "Resolved date cannot be earlier than onset date";
                        errors.abatementDate = "Resolved date cannot be earlier than onset date";
                    }
                }
            }
            // Clinical alerts: alert field must not be purely numeric
            if (tabKey === "clinical-alerts" || tabKey === "alerts" || tabKey === "clinicalalerts") {
                for (const key of ["alert", "alertText", "alertName", "description", "name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^\d+$/.test(val.trim())) {
                        errors[key] = "Alert must contain letters, not just numbers";
                    }
                }
            }
            // Demographics: comprehensive validation for all sub-sections
            if (tabKey === "demographics") {
                // Personal info: name fields — letters only
                for (const key of ["firstName", "lastName", "middleName", "first_name", "last_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isValidName(val)) {
                        errors[key] = "Name must contain only letters";
                    }
                }
                // Tribal affiliation — string only (no numbers)
                for (const key of ["tribalAffiliation", "tribal_affiliation"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isStringOnly(val)) {
                        errors[key] = "Tribal affiliation must contain only letters";
                    }
                }
                // SSN — exactly 9 digits
                for (const key of ["ssn", "ptssn", "socialSecurityNumber", "guarantorSsn", "guarantor_ssn"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isValidSSN(val)) {
                        errors[key] = "SSN must be exactly 9 digits";
                    }
                }
                // Mobile phone is mandatory
                for (const key of ["phoneNumber", "phone", "mobilePhone", "mobile", "cellPhone", "cell"]) {
                    if (key in formData) {
                        const val = formData[key];
                        if (!val || (typeof val === "string" && !val.trim())) {
                            errors[key] = "Mobile phone is required";
                        }
                    }
                }
                // All phone/mobile/fax fields — exactly 10 digits
                for (const key of Object.keys(formData)) {
                    const lk = key.toLowerCase();
                    if (lk.includes("phone") || lk.includes("mobile") || lk.includes("cell") || lk.includes("fax")) {
                        const val = formData[key];
                        if (typeof val === "string" && val.trim() && !isValidUSPhone(val)) {
                            errors[key] = "Must be exactly 10 digits: (xxx) xxx-xxxx";
                        }
                    }
                }
                // Emergency contact: name must be letters only
                for (const key of ["emergencyContactName", "emergency_contact_name", "ecName", "contactName", "contact_name", "emergencyName", "emergency_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isStringOnly(val)) {
                        errors[key] = "Contact name must contain only letters";
                    }
                }
                // Also catch any field key containing "contact" + "name" dynamically
                for (const key of Object.keys(formData)) {
                    const lk = key.toLowerCase();
                    if ((lk.includes("contact") && lk.includes("name")) || (lk.includes("emergency") && lk.includes("name"))) {
                        const val = formData[key];
                        if (typeof val === "string" && val.trim() && !isStringOnly(val) && !errors[key]) {
                            errors[key] = "Contact name must contain only letters";
                        }
                    }
                }
                // Guardian: name fields must be letters only
                for (const key of ["guardianName", "guardian_name", "motherName", "mother_name", "mothersName", "mothers_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isStringOnly(val)) {
                        errors[key] = "Name must contain only letters";
                    }
                }
                // Guarantor/Billing: first name, last name must be letters only
                for (const key of ["guarantorFirstName", "guarantor_first_name", "guarantorLastName", "guarantor_last_name", "guarantorName", "guarantor_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isStringOnly(val)) {
                        errors[key] = "Name must contain only letters";
                    }
                }
                // Preferred Pharmacy: name must be letters only (no pure numbers)
                for (const key of ["pharmacyName", "pharmacy_name", "preferredPharmacy"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^\d+$/.test(val.trim())) {
                        errors[key] = "Pharmacy name must contain letters, not just numbers";
                    }
                }
                // Advance Directives: Healthcare Proxy / POA Name — letters only (no numbers)
                for (const key of ["healthcareProxyName", "healthcare_proxy_name", "poaName", "poa_name", "healthcareProxy", "healthcare_proxy", "proxyName", "proxy_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isStringOnly(val)) {
                        errors[key] = "Name must contain only letters, not numbers";
                    }
                }
                // Employer: occupation, industry, employer name — letters only (no numbers allowed)
                for (const key of ["occupation", "industry", "employerName", "employer_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isStringOnly(val)) {
                        errors[key] = `${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} must contain only letters`;
                    }
                }
                // Additional Identifiers: driver license
                for (const key of ["driverLicense", "driver_license", "driversLicense", "driverLicenseNumber"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isValidDriverLicense(val)) {
                        errors[key] = "Driver license must be 5-20 alphanumeric characters";
                    }
                }
                // Additional Identifiers: Medicaid ID
                for (const key of ["medicaidId", "medicaid_id", "medicaidID"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isValidMedicaidId(val)) {
                        errors[key] = "Medicaid ID must be 8-12 alphanumeric characters";
                    }
                }
                // Additional Identifiers: Medicare Beneficiary ID
                for (const key of ["medicareBeneficiaryId", "medicare_beneficiary_id", "medicareBeneficiaryID", "medicareId"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isValidMedicareBeneficiaryId(val)) {
                        errors[key] = "Medicare Beneficiary ID must be 11 characters in valid MBI format";
                    }
                }
            }
            // Insurance-specific: ensure at least payer/insurer name is provided
            if (tabKey === "insurance-coverage" && mode === "create") {
                const hasPayerName = ["payerName", "insurerName", "insurer", "companyName", "name"].some(
                    k => typeof formData[k] === "string" && formData[k].trim()
                );
                if (!hasPayerName) {
                    // Find first insurer/payer field from config to attach error
                    const payerField = fieldConfig.sections.flatMap(s => Array.isArray(s.fields) ? s.fields : []).find(
                        f => f && /payer|insurer|company/i.test(f.key)
                    );
                    if (payerField) errors[payerField.key] = `${payerField.label} is required`;
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
            const resourceId = isEdit ? (selectedRecord!.fhirId || selectedRecord!.id) : null;

            // Pre-save: include orgId header for tenant partitioning (fixes issue 22 reports)
            const saveHeaders: HeadersInit = { "Content-Type": "application/json" };
            if (typeof window !== "undefined") {
                const storedOrgId = localStorage.getItem("orgId");
                if (storedOrgId) saveHeaders["orgId"] = storedOrgId;
            }

            // Helper: wrap plain string/code into a FHIR CodeableConcept with system
            const wrapCoding = (value: any, system: string): any => {
                if (!value || typeof value === "object") return value;
                const str = String(value);
                return { coding: [{ system, code: str, display: str }], text: str };
            };

            // Pre-save field mapping: ensure backend receives expected field names
            const payload = { ...formData };
            if (tabKey === "visit-notes") {
                // Backend expects noteDateTime for the date
                if (payload.date && !payload.noteDateTime) payload.noteDateTime = payload.date;
                if (payload.date && !payload.noteDate) payload.noteDate = payload.date;
                // Backend expects noteText for the content
                if (payload.note && !payload.noteText) payload.noteText = payload.note;
                if (payload.content && !payload.noteText) payload.noteText = payload.content;
            }
            if (tabKey === "insurance-coverage") {
                // Ensure backend gets period.start/end from policyEffectiveDate/policyEndDate
                if (payload.policyEffectiveDate && !payload.coverageStartDate) payload.coverageStartDate = payload.policyEffectiveDate;
                if (payload.policyEndDate && !payload.coverageEndDate) payload.coverageEndDate = payload.policyEndDate;
                if (payload.effectiveDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.effectiveDate;
                if (payload.endDate && !payload.policyEndDate) payload.policyEndDate = payload.endDate;
                if (payload.startDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.startDate;
            }
            if (tabKey === "documents") {
                if (payload.documentDate && !payload.date) payload.date = payload.documentDate;
                if (payload.date && !payload.documentDate) payload.documentDate = payload.date;
            }
            if (tabKey === "messaging") {
                if (payload.from && !payload.sender) payload.sender = payload.from;
                if (payload.to && !payload.recipient) payload.recipient = payload.to;
            }
            if (tabKey === "relationships" || tabKey === "related-persons") {
                if (payload.relatedPatientName && !payload.relatedPersonName) payload.relatedPersonName = payload.relatedPatientName;
                if (payload.relationshipType && !payload.relationType) payload.relationType = payload.relationshipType;
                if (payload.relatedPersonName && !payload.relatedPatientName) payload.relatedPatientName = payload.relatedPersonName;
            }
            if (tabKey === "issues" || tabKey === "conditions" || tabKey === "problems" || tabKey === "medicalproblems" || tabKey === "medical-problems") {
                if (payload.onsetDate && !payload.onsetDateTime) payload.onsetDateTime = payload.onsetDate;
                if (payload.onset && !payload.onsetDate) payload.onsetDate = payload.onset;
                // Validate resolved/end date is not before onset date
                const probOnset = payload.onsetDate || payload.onsetDateTime || payload.onset;
                const probEnd = payload.endDate || payload.resolvedDate || payload.abatementDate || payload.end;
                if (probOnset && probEnd && probEnd < probOnset) {
                    setValidationErrors({ endDate: "Resolved date must be after onset date", resolvedDate: "Resolved date must be after onset date" });
                    setError("Resolved date must be after onset date");
                    setSaving(false);
                    return;
                }
                // Ensure code/condition has coding system to prevent 422 "Coding has no system"
                if (payload.code && typeof payload.code === "string") {
                    payload.code = wrapCoding(payload.code, "http://snomed.info/sct");
                }
                if (payload.condition && typeof payload.condition === "string") {
                    payload.condition = wrapCoding(payload.condition, "http://snomed.info/sct");
                }
                if (!payload.clinicalStatus) {
                    payload.clinicalStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active", display: "Active" }] };
                }
                if (!payload.verificationStatus) {
                    payload.verificationStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed", display: "Confirmed" }] };
                }
                if (!payload.category) {
                    payload.category = [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "problem-list-item", display: "Problem List Item" }] }];
                }
            }
            if (tabKey === "allergies") {
                // Validate end date is not before onset date
                const allergyOnset = payload.onsetDate || payload.onsetDateTime || payload.onset;
                const allergyEnd = payload.endDate || payload.end;
                if (allergyOnset && allergyEnd && allergyEnd < allergyOnset) {
                    setValidationErrors({ endDate: "End date must be after onset date" });
                    setError("End date must be after onset date");
                    setSaving(false);
                    return;
                }
                if (payload.severity && !payload.criticality) payload.criticality = payload.severity;
                // Issue 3: wrap allergyName/code in CodeableConcept with system
                const allergySystem = "http://snomed.info/sct";
                const rawAllergyCode = payload.allergyName || payload.substance || payload.code;
                if (rawAllergyCode && typeof rawAllergyCode === "string") {
                    if (!payload.code || typeof payload.code === "string") {
                        payload.code = wrapCoding(rawAllergyCode, allergySystem);
                    }
                    if (!payload.substance || typeof payload.substance === "string") {
                        payload.substance = wrapCoding(rawAllergyCode, allergySystem);
                    }
                }
                // Wrap reaction manifestation coding if present
                if (payload.reaction && typeof payload.reaction === "string") {
                    payload.reaction = [{ manifestation: [wrapCoding(payload.reaction, allergySystem)] }];
                }
                // Ensure verificationStatus and clinicalStatus have systems
                if (!payload.verificationStatus) {
                    payload.verificationStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "confirmed" }] };
                }
                if (!payload.clinicalStatus) {
                    payload.clinicalStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }] };
                }
                if (!payload.category) payload.category = ["medication"];
                if (!payload.type) payload.type = "allergy";
            }

            // Issue 6: Facility / Location — wrap type in CodeableConcept with system
            if (tabKey === "facility" || tabKey === "facilities" || tabKey === "location" || tabKey === "locations" || tabKey === "serviceLocation" || tabKey === "serviceLocations") {
                if (payload.type && typeof payload.type === "string") {
                    payload.type = [wrapCoding(payload.type, "http://terminology.hl7.org/CodeSystem/v3-RoleCode")];
                } else if (Array.isArray(payload.type)) {
                    payload.type = payload.type.map((t: any) =>
                        typeof t === "string" ? wrapCoding(t, "http://terminology.hl7.org/CodeSystem/v3-RoleCode") : t
                    );
                }
                // Wrap physicalType coding
                if (payload.physicalType && typeof payload.physicalType === "string") {
                    payload.physicalType = wrapCoding(payload.physicalType, "http://terminology.hl7.org/CodeSystem/location-physical-type");
                }
                // Ensure all coding arrays have a system field
                const ensureSystem = (obj: any, defaultSystem: string) => {
                    if (!obj || typeof obj !== "object") return obj;
                    if (Array.isArray(obj.coding)) {
                        obj.coding = obj.coding.map((c: any) => (!c.system ? { ...c, system: defaultSystem } : c));
                    }
                    return obj;
                };
                if (payload.type && Array.isArray(payload.type)) {
                    payload.type = payload.type.map((t: any) => ensureSystem(t, "http://terminology.hl7.org/CodeSystem/v3-RoleCode"));
                }
                if (!payload.status) payload.status = "active";
                if (!payload.mode) payload.mode = "instance";
            }

            // Issue 7: Clinical alerts — add system to code and ensure required fields (Flag resource)
            if (tabKey === "clinical-alerts" || tabKey === "alerts" || tabKey === "clinicalalerts") {
                if (payload.code && typeof payload.code === "string") {
                    payload.code = wrapCoding(payload.code, "http://snomed.info/sct");
                }
                if (!payload.status) payload.status = "active";
                // Flag.subject is required (minimum = 1)
                if (!payload.subject) {
                    payload.subject = { reference: `Patient/${patientId}` };
                }
                if (!payload.category) {
                    payload.category = [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/flag-category", code: "clinical", display: "Clinical" }] }];
                }
                // Validate end date is not before start/identified date
                const alertStart = payload.startDate || payload.identifiedDate || payload.dateIdentified;
                if (alertStart && payload.endDate && payload.endDate < alertStart) {
                    setValidationErrors({ endDate: "End date must be after identified/start date" });
                    setError("End date must be after identified/start date");
                    setSaving(false);
                    return;
                }
                if (payload.period) {
                    if (typeof payload.period === "object") {
                        if (!payload.period.start && payload.startDate) payload.period.start = payload.startDate;
                        if (!payload.period.end && payload.endDate) payload.period.end = payload.endDate;
                    }
                } else if (payload.startDate || payload.endDate) {
                    payload.period = { start: payload.startDate, end: payload.endDate };
                }
            }

            // Encounters — ensure required FHIR fields are present
            if (tabKey === "encounters" || tabKey === "encounter") {
                if (!payload.status) payload.status = "finished";
                if (!payload.class) {
                    payload.class = { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" };
                }
                if (!payload.type) {
                    payload.type = [wrapCoding("11429006", "http://snomed.info/sct")];
                }
                // Reason for visit: wrap as reasonCode if provided, otherwise supply a default so backend doesn't reject
                if (!payload.reasonCode) {
                    const rv = payload.reasonForVisit || payload.reason;
                    const rvStr = typeof rv === "string" ? rv.trim() : "";
                    payload.reasonCode = [wrapCoding(rvStr || "General Consultation", "http://snomed.info/sct")];
                }
            }

            // Immunization tab — wrap vaccineCode, format doseQuantity
            if (tabKey === "immunizations" || tabKey === "immunization") {
                if (!payload.status) payload.status = "completed";
                if (!payload.occurrenceDateTime) {
                    payload.occurrenceDateTime = payload.date || payload.occurrenceDate || new Date().toISOString().slice(0, 10);
                }
                // vaccineCode must have a system
                if (payload.vaccineCode && typeof payload.vaccineCode === "string") {
                    payload.vaccineCode = wrapCoding(payload.vaccineCode, "http://hl7.org/fhir/sid/cvx");
                } else if (Array.isArray(payload.vaccineCode) && payload.vaccineCode.length > 0 && payload.vaccineCode[0]?.code) {
                    // code-lookup array → CodeableConcept
                    const vc = payload.vaccineCode[0];
                    payload.vaccineCode = { coding: [{ system: "http://hl7.org/fhir/sid/cvx", code: vc.code, display: vc.description || vc.code }], text: vc.description || vc.code };
                }
                // doseQuantity: wrap plain number as FHIR Quantity
                if (payload.dose !== undefined && payload.dose !== null && payload.dose !== "") {
                    payload.doseQuantity = { value: Number(payload.dose), unit: payload.doseUnit || "mL", system: "http://unitsofmeasure.org", code: payload.doseUnit || "mL" };
                }
                if (!payload.patient) payload.patient = { reference: `Patient/${patientId}` };
            }

            // Referral tab — ServiceRequest.intent is required
            if (tabKey === "referral" || tabKey === "referrals") {
                if (!payload.intent) payload.intent = "order";
                if (!payload.status) payload.status = "active";
                if (!payload.subject) payload.subject = { reference: `Patient/${patientId}` };
                if (payload.code && typeof payload.code === "string") {
                    payload.code = wrapCoding(payload.code, "http://snomed.info/sct");
                }
                if (payload.reasonCode && typeof payload.reasonCode === "string") {
                    payload.reasonCode = [wrapCoding(payload.reasonCode, "http://snomed.info/sct")];
                }
            }

            // Medication tab — MedicationRequest.intent is required
            if (tabKey === "medications" || tabKey === "medication") {
                if (!payload.intent) payload.intent = "order";
                if (!payload.status) payload.status = "active";
                if (!payload.subject) payload.subject = { reference: `Patient/${patientId}` };
                if (payload.medicationCodeableConcept && typeof payload.medicationCodeableConcept === "string") {
                    payload.medicationCodeableConcept = wrapCoding(payload.medicationCodeableConcept, "http://www.nlm.nih.gov/research/umls/rxnorm");
                }
                if (payload.medication_name && typeof payload.medication_name === "string" && !payload.medicationCodeableConcept) {
                    payload.medicationCodeableConcept = wrapCoding(payload.medication_name, "http://www.nlm.nih.gov/research/umls/rxnorm");
                }
            }

            // Education tab — ensure proper structure
            if (tabKey === "education" || tabKey === "patient-education") {
                if (!payload.status) payload.status = "completed";
                if (!payload.subject) payload.subject = { reference: `Patient/${patientId}` };
            }

            // Issue 9 via generic tab: Appointments — add participant + wrap appointmentType
            if (tabKey === "appointments") {
                if (payload.appointmentType && typeof payload.appointmentType === "string") {
                    payload.appointmentType = wrapCoding(payload.appointmentType, "http://terminology.hl7.org/CodeSystem/v2-0276");
                }
                if (!payload.participant) {
                    const patRef = payload.patient || `Patient/${patientId}`;
                    payload.participant = [{ actor: { reference: patRef }, required: "required", status: "accepted" }];
                }
            }

            // Issue 4: Insurance Coverage — ensure period/coding structures
            if (tabKey === "insurance-coverage" || tabKey === "insurance") {
                if (payload.policyEffectiveDate && !payload.coverageStartDate) payload.coverageStartDate = payload.policyEffectiveDate;
                if (payload.policyEndDate && !payload.coverageEndDate) payload.coverageEndDate = payload.policyEndDate;
                if (payload.effectiveDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.effectiveDate;
                if (payload.endDate && !payload.policyEndDate) payload.policyEndDate = payload.endDate;
                if (payload.startDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.startDate;
                if (!payload.status) payload.status = "active";
                // Wrap type in CodeableConcept if it's a plain string
                if (payload.type && typeof payload.type === "string") {
                    payload.type = wrapCoding(payload.type, "http://terminology.hl7.org/CodeSystem/v3-ActCode");
                }
                // Wrap class/planType in CodeableConcept if it's a plain string
                if (payload.class && typeof payload.class === "string") {
                    payload.class = [{ type: wrapCoding("plan", "http://terminology.hl7.org/CodeSystem/coverage-class"), value: payload.class }];
                }
                // Wrap relationship coding
                if (payload.relationship && typeof payload.relationship === "string") {
                    payload.relationship = wrapCoding(payload.relationship, "http://terminology.hl7.org/CodeSystem/subscriber-relationship");
                }
            }

            // Issue 5: Documents — fix title mapping, prevent auto-save confusion
            if (tabKey === "documents") {
                if (payload.documentDate && !payload.date) payload.date = payload.documentDate;
                if (payload.date && !payload.documentDate) payload.documentDate = payload.date;
                if (payload.documentTitle && !payload.title) payload.title = payload.documentTitle;
                if (payload.title && !payload.documentTitle) payload.documentTitle = payload.title;
                if (payload.title && !payload.description) payload.description = payload.title;
                if (!payload.status) payload.status = "current";
                if (!payload.docStatus) payload.docStatus = "final";
            }

            // Procedures — convert code-lookup array back to FHIR Procedure.code
            if (tabKey === "procedures") {
                if (!payload.status) payload.status = "completed";
                const cptArr = Array.isArray(payload.cptCode) ? payload.cptCode : (Array.isArray(payload.procedureCode) ? payload.procedureCode : null);
                if (cptArr && cptArr.length > 0) {
                    const cptItem = cptArr[0];
                    const cptCodeStr = cptItem.code || "";
                    const cptDesc = cptItem.description || cptCodeStr;
                    payload.code = { coding: [{ system: "http://www.ama-assn.org/go/cpt", code: cptCodeStr, display: cptDesc }], text: cptDesc };
                    payload.cptCode = cptCodeStr;
                } else if (typeof payload.cptCode === "string" && payload.cptCode) {
                    payload.code = { coding: [{ system: "http://www.ama-assn.org/go/cpt", code: payload.cptCode, display: payload.cptCode }], text: payload.cptCode };
                }
                if (!payload.subject) payload.subject = { reference: `Patient/${patientId}` };
            }

            // Issue 12: Labs — ensure testName is a string (not long/number)
            if (tabKey === "labs") {
                if (payload.testName != null) payload.testName = String(payload.testName);
                if (payload.code != null && typeof payload.code === "number") payload.code = String(payload.code);
                if (!payload.status) payload.status = "final";
            }

            // Issue 15: History — add QuestionnaireResponse.status
            if (tabKey === "history" || tabKey === "medicalhistory" || tabKey === "medical-history") {
                if (!payload.status) payload.status = "completed";
                if (!payload.questionnaire) payload.questionnaire = "http://example.org/Questionnaire/medical-history";
            }

            // Issue 16: Billing — add diagnosis.sequence and provider
            if (tabKey === "billing") {
                if (payload.diagnosis && Array.isArray(payload.diagnosis)) {
                    payload.diagnosis = payload.diagnosis.map((d: any, i: number) => ({
                        ...d, sequence: d.sequence || (i + 1),
                    }));
                } else if (payload.diagnosisCode || payload.icdCode) {
                    const code = payload.diagnosisCode || payload.icdCode;
                    payload.diagnosis = [{
                        sequence: 1,
                        diagnosisCodeableConcept: wrapCoding(code, "http://hl7.org/fhir/sid/icd-10"),
                    }];
                }
                if (!payload.provider) payload.provider = { reference: `Organization/1` };
                if (!payload.type) payload.type = wrapCoding("professional", "http://terminology.hl7.org/CodeSystem/claim-type");
                if (!payload.use) payload.use = "claim";
                if (!payload.status) payload.status = "active";
                if (!payload.priority) payload.priority = wrapCoding("normal", "http://terminology.hl7.org/CodeSystem/processpriority");
            }

            // Issues 17, 21: Claims & Transactions — add Claim.provider
            if (tabKey === "claims" || tabKey === "transactions") {
                if (!payload.provider) payload.provider = { reference: `Organization/1` };
                if (!payload.type) payload.type = wrapCoding("professional", "http://terminology.hl7.org/CodeSystem/claim-type");
                if (!payload.use) payload.use = "claim";
                if (!payload.status) payload.status = "active";
                if (!payload.priority) payload.priority = wrapCoding("normal", "http://terminology.hl7.org/CodeSystem/processpriority");
            }

            // Issue 18: Claim Submissions — add Claim.provider
            if (tabKey === "submissions" || tabKey === "claim-submissions") {
                if (!payload.provider) payload.provider = { reference: `Organization/1` };
                if (!payload.type) payload.type = wrapCoding("professional", "http://terminology.hl7.org/CodeSystem/claim-type");
                if (!payload.use) payload.use = "claim";
                if (!payload.status) payload.status = "active";
            }

            // Issue 19: Denials — add ClaimResponse.type
            if (tabKey === "denials" || tabKey === "claim-denials") {
                if (!payload.type) payload.type = wrapCoding("professional", "http://terminology.hl7.org/CodeSystem/claim-type");
                if (!payload.status) payload.status = "active";
                if (!payload.outcome) payload.outcome = "queued";
            }

            // Issue 20: ERA/Remittance — add ExplanationOfBenefit.type
            if (tabKey === "era" || tabKey === "remittance" || tabKey === "eob" || tabKey === "era-remittance") {
                if (!payload.type) payload.type = wrapCoding("professional", "http://terminology.hl7.org/CodeSystem/claim-type");
                if (!payload.status) payload.status = "active";
                if (!payload.outcome) payload.outcome = "queued";
                if (!payload.use) payload.use = "claim";
            }

            // Issue 22: Reports — include orgId to fix HAPI partition identification
            if (tabKey === "report" || tabKey === "reports") {
                const storedOrgId2 = typeof window !== "undefined" ? localStorage.getItem("orgId") : null;
                if (storedOrgId2 && !payload.orgId) payload.orgId = storedOrgId2;
                if (!payload.status) payload.status = "final";
            }

            const url = isEdit
                ? `${API_BASE()}/api/fhir-resource/${resourceKey}/patient/${patientId}/${resourceId}`
                : `${API_BASE()}/api/fhir-resource/${resourceKey}/patient/${patientId}`;

            const res = await fetchWithAuth(url, {
                method: isEdit ? "PUT" : "POST",
                headers: saveHeaders,
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const label = isEdit ? "updated" : "saved";
                if (singleRecord) {
                    // Stay in view mode for single-record tabs
                    const json = await res.json();
                    const savedData = normalizeRecord(json.data || formData);
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
                await new Promise(r => setTimeout(r, isEdit ? 1000 : 3000));
                setPage(0);
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
            if (!Array.isArray(section?.fields)) continue;
            const found = section.fields.find((f) => f?.key === key);
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
        // Fallback: try parsing any date string (e.g. "Tue Mar 10 01:53:55 UTC 2026")
        try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            }
        } catch { /* ignore */ }
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
        try {
        // Treat literal "null" / "undefined" strings as missing
        if (value === "null" || value === "undefined") value = null;

        // Handle Java date arrays inline
        if (Array.isArray(value) && value.length >= 3 && typeof value[0] === "number" && value[0] > 1900) {
            const converted = mapDateArray(value);
            if (converted) return tryFormatDatetime(converted) || converted;
        }

        // Reference fields: check {key}Display BEFORE null check (Display may exist even when raw ref is missing)
        if (colKey && record && record[colKey + "Display"]) {
            const dv = record[colKey + "Display"];
            if (typeof dv === "string") return dv;
            // If display is an object (e.g., CodeableConcept), extract text
            if (dv && typeof dv === "object") {
                const extracted = dv.coding?.[0]?.display || dv.coding?.[0]?.code || (typeof dv.text === "string" ? dv.text : null);
                if (extracted) return String(extracted);
            }
        }

        if (value == null) {
            // Try alternate key patterns for common fields
            if (colKey && record) {
                // Common alternate key mappings
                const altKeyMap: Record<string, string[]> = {
                    end: ["endTime", "endDate", "endDateTime", "appointmentEnd", "appointmentEndTime", "appointmentEndDate"],
                    room: ["roomName", "roomNumber", "roomId", "locationRoom", "examRoom"],
                    start: ["startTime", "startDate", "startDateTime", "appointmentStart", "appointmentStartTime", "appointmentStartDate"],
                    provider: ["providerName", "providerDisplay", "practitionerName", "treatingProvider"],
                    patient: ["patientName", "patientDisplay"],
                    location: ["locationName", "locationDisplay"],
                };
                const alts = altKeyMap[colKey] || [];
                // Also try generic suffixes
                alts.push(colKey + "Name", colKey + "Display", colKey + "Value", colKey + "Text");
                for (const alt of alts) {
                    if (record[alt] != null && record[alt] !== "" && record[alt] !== "null") {
                        const altVal = record[alt];
                        if (Array.isArray(altVal) && altVal.length >= 3 && typeof altVal[0] === "number" && altVal[0] > 1900) {
                            const converted = mapDateArray(altVal);
                            if (converted) return tryFormatDatetime(converted) || converted;
                        }
                        return typeof altVal === "object" ? JSON.stringify(altVal) : String(altVal);
                    }
                }
                // For date/datetime fields, try additional fallback patterns
                const fieldDef = findFieldDef(colKey);
                if (fieldDef && (fieldDef.type === "date" || fieldDef.type === "datetime")) {
                    const dateAlts = [
                        colKey + "Date", colKey + "DateTime",
                        colKey?.replace(/Date$/, ""), colKey?.replace(/date$/i, ""),
                    ];
                    for (const alt of dateAlts) {
                        if (alt && record[alt]) {
                            const altVal = record[alt];
                            if (Array.isArray(altVal)) {
                                const converted = mapDateArray(altVal);
                                if (converted) {
                                    const formatted = fieldDef.type === "date"
                                        ? tryFormatDate(converted) : tryFormatDatetime(converted);
                                    if (formatted) return formatted;
                                }
                            } else if (typeof altVal === "string") {
                                const formatted = fieldDef.type === "date"
                                    ? tryFormatDate(altVal)
                                    : tryFormatDatetime(altVal);
                                if (formatted) return formatted;
                            }
                        }
                    }
                }
            }
            return "-";
        }
        if (typeof value === "boolean") return value ? "Yes" : "No";

        const fieldDef = colKey ? findFieldDef(colKey) : undefined;

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
            // Suppress raw FHIR references like "Practitioner/123" — show dash instead
            if (/^[A-Z][a-zA-Z]+\/\d+$/.test(value)) {
                return "-";
            }
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

        // Detect Java toString of FHIR CodeableConcept or reaction array
        // e.g. "{coding=[{system=..., code=X, display=X}], text=X}" or "[{manifestation=[...]}]"
        if (typeof value === "string" && (value.startsWith("{") || value.startsWith("[")) && (value.includes("coding=") || value.includes("manifestation=") || value.includes("display="))) {
            const dMatch = value.match(/\bdisplay=([^,}\]]+)/);
            if (dMatch && !dMatch[1].startsWith("{") && !dMatch[1].startsWith("[")) return dMatch[1].trim();
            const tMatch = value.match(/\btext=([^,}\]]+)/);
            if (tMatch && !tMatch[1].startsWith("{") && !tMatch[1].startsWith("[")) return tMatch[1].trim();
            const cMatch = value.match(/\bcode=([^,}\]]+)/);
            if (cMatch && !cMatch[1].startsWith("{") && !cMatch[1].startsWith("[")) return cMatch[1].trim();
        }

        if (value !== null && typeof value === "object") {
            // Array first (before CodeableConcept check, since arrays are also "object")
            if (Array.isArray(value)) {
                if (value.length === 0) return "-";
                const first = value[0];
                if (first != null && typeof first === "object") {
                    // Array of CodeableConcepts
                    if (first.coding || first.text) {
                        const d = first.coding?.[0]?.display || first.coding?.[0]?.code || (typeof first.text === "string" ? first.text : null);
                        if (typeof d === "string") return d;
                    }
                    // FHIR AllergyIntolerance reaction array [{manifestation, severity, description, substance}]
                    if ("manifestation" in first || "severity" in first || "description" in first) {
                        const parts: string[] = [];
                        for (const rx of value) {
                            if (Array.isArray(rx?.manifestation)) {
                                for (const m of rx.manifestation) {
                                    const d = m?.coding?.[0]?.display || (typeof m?.text === "string" ? m.text : null) || m?.coding?.[0]?.code;
                                    if (d) parts.push(String(d));
                                }
                            } else if (typeof rx?.description === "string") {
                                parts.push(rx.description);
                            } else if (typeof rx?.severity === "string") {
                                parts.push(rx.severity);
                            }
                        }
                        if (parts.length > 0) return parts.join(", ");
                    }
                    // Code-lookup items array: [{code, description, ...}]
                    if (typeof first.code === "string") {
                        return value.map((v: any) => (typeof v?.code === "string" ? v.code : "")).filter(Boolean).join(", ");
                    }
                }
                // Plain string/number array
                if (typeof first === "string" || typeof first === "number") {
                    return value.slice(0, 3).join(", ");
                }
                return JSON.stringify(value);
            }
            // FHIR CodeableConcept: { coding: [...], text: ... }
            if (value.coding || value.text) {
                try {
                    const d0 = Array.isArray(value.coding) ? value.coding[0] : null;
                    if (d0) {
                        const disp = typeof d0.display === "string" ? d0.display
                            : (typeof d0.display === "object" ? (d0.display?.text || d0.display?.coding?.[0]?.display) : null);
                        if (typeof disp === "string") return disp;
                        const code = typeof d0.code === "string" ? d0.code
                            : (typeof d0.code === "object" ? (d0.code?.text || d0.code?.coding?.[0]?.code) : null);
                        if (typeof code === "string") return code;
                    }
                    if (typeof value.text === "string") return value.text;
                } catch { /* fall through to JSON.stringify */ }
            }
            if (value.line1) {
                return [value.line1, value.city, value.state].filter(Boolean).join(", ");
            }
            // FHIR Reference
            if (value.reference && typeof value.reference === "string") {
                const disp = typeof value.display === "string" ? value.display : null;
                return disp || value.reference.split("/").pop() || value.reference;
            }
            return JSON.stringify(value);
        }
        const str = String(value);
        return str.length > 50 ? str.substring(0, 50) + "..." : str;
        } catch { return "-"; }
    };

    // Filter records by search term (flatten nested objects for deep search)
    const filteredRecords = searchTerm
        ? records.filter((r) => {
            const term = searchTerm.toLowerCase();
            return Object.entries(r).some(([, v]) => {
                if (v == null) return false;
                if (typeof v === "string") return v.toLowerCase().includes(term);
                if (typeof v === "number" || typeof v === "boolean") return String(v).toLowerCase().includes(term);
                if (typeof v === "object" && !Array.isArray(v)) {
                    return Object.values(v).some((nested) =>
                        nested != null && String(nested).toLowerCase().includes(term)
                    );
                }
                return String(v).toLowerCase().includes(term);
            });
        })
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
                                {canWrite && (
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
                                    Cancel
                                </button>
                            </>
                        ) : canWrite ? (
                            <button
                                onClick={() => handleEdit()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>
                        ) : null}
                    </div>
                </div>
                <div className="p-4">
                    {successMsg && (
                        <div className="mb-4 flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            {successMsg}
                        </div>
                    )}
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
                        {mode === "view" && selectedRecord && canWrite && (
                            <button
                                onClick={() => handleEdit(selectedRecord)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                        {mode !== "view" && canWrite && (
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
                    {/* File upload for reports tab */}
                    {(tabKey === "report" || tabKey === "reports") && mode !== "view" && (
                        <div className="mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Report Document</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dicom"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const fd = new FormData();
                                    fd.append("file", file);
                                    fd.append("patientId", String(patientId));
                                    fd.append("category", "report");
                                    try {
                                        const { fetchWithAuth: fw } = await import("@/utils/fetchWithAuth");
                                        const { getEnv: ge } = await import("@/utils/env");
                                        const res = await fw(`${(ge("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "")}/api/documents/upload`, {
                                            method: "POST",
                                            body: fd,
                                        });
                                        if (res.ok) {
                                            const json = await res.json();
                                            const url = json.data?.url || json.url || json.data?.fileUrl || "";
                                            handleFieldChange("documentUrl", url);
                                            handleFieldChange("fileName", file.name);
                                            setSuccessMsg(`File "${file.name}" uploaded successfully.`);
                                        } else {
                                            setError("Failed to upload file. Please try again.");
                                        }
                                    } catch {
                                        setError("Failed to upload file. Please try again.");
                                    }
                                }}
                                className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                            />
                            {formData.fileName && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Uploaded: {formData.fileName}</p>
                            )}
                        </div>
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
                {canWrite && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        {(tabKey === "report" || tabKey === "reports") ? "Upload Report" : "Add"}
                    </button>
                )}
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
                    {canWrite && (
                        <button
                            onClick={handleCreate}
                            className="mt-3 text-blue-600 text-sm hover:underline"
                        >
                            Create your first record
                        </button>
                    )}
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
                                                {(() => { const fv = formatValue(record[col.key], col.key, record); return (fv !== null && typeof fv === "object" && !("$$typeof" in (fv as object))) ? JSON.stringify(fv) : fv; })()}
                                            </td>
                                        ))}
                                        <td className="px-4 py-2.5 text-right">
                                            {canWrite && (
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
                                            )}
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
