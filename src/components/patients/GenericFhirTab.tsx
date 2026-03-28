"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { usePermissions } from "@/context/PermissionContext";
import DynamicFormRenderer, { FieldConfig, FieldConfigFeatures, SectionDef, FieldDef } from "./DynamicFormRenderer";
import { Plus, Pencil, Trash2, X, Save, Send, Loader2, Search, ChevronLeft, ChevronRight, Download, FileText, CheckCircle2 } from "lucide-react";
import { isValidEmail, isValidPhone, isValidFax, isValidUrl, isValidName, isValidUSPhone, isValidSSN, isStringOnly, isValidDriverLicense, isValidMedicaidId, isValidMedicareBeneficiaryId } from "@/utils/validation";
import { toast, confirmDialog } from "@/utils/toast";
import { formatDisplayDate, formatDisplayDateTime, parseLocalDate } from "@/utils/dateUtils";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface GenericFhirTabProps {
    tabKey: string;
    patientId: number;
    patientName?: string;
}

/* ---------- Error Boundary ---------- */
class GenericFhirTabErrorBoundary extends React.Component<
    { tabKey: string; children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[GenericFhirTab/${this.props.tabKey}] Render error:`, error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Something went wrong loading this tab. Please try refreshing the page.</span>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: undefined })}
                        className="mt-3 px-4 py-1.5 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function GenericFhirTabExport(props: GenericFhirTabProps) {
    return (
        <GenericFhirTabErrorBoundary tabKey={props.tabKey}>
            <GenericFhirTabInner {...props} />
        </GenericFhirTabErrorBoundary>
    );
}

export default GenericFhirTabExport;

function GenericFhirTabInner({ tabKey, patientId, patientName }: GenericFhirTabProps) {
    const router = useRouter();
    // Extract base resource type from tabKey (strip subtab suffix like ">Failed" from "claims>Failed")
    const resourceKey = tabKey.includes(">") ? tabKey.split(">")[0] : tabKey;
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [records, setRecords] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const uploadedDocFhirIdRef = useRef<string | null>(null);
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

    // For appointments: derive formatted duration from start/end times at render time
    // so the Duration field always reflects the current values regardless of key names.
    const decoratedFormData = React.useMemo(() => {
        if (tabKey !== "appointments" && tabKey !== "appointment") return formData;
        const isApptStartKey = (k: string) =>
            /^(appointmentStartTime|startTime|start|scheduledStart|startDateTime|appointmentStart)$/i.test(k) ||
            (/start/i.test(k) && /time/i.test(k) && !/end/i.test(k));
        const isApptEndKey = (k: string) =>
            /^(appointmentEndTime|endTime|end|scheduledEnd|endDateTime|appointmentEnd)$/i.test(k) ||
            (/end/i.test(k) && /time/i.test(k) && !/start/i.test(k));
        const durKeys = ["duration", "minutesDuration", "durationMinutes", "appointmentDuration"];
        const parseTime = (v: unknown): [number, number] | null => {
            if (!v || typeof v !== "string") return null;
            const timePart = v.includes("T") ? v.split("T")[1] : v;
            const parts = timePart.split(":");
            const h = Number(parts[0]);
            const m = Number(parts[1]);
            return isNaN(h) || isNaN(m) ? null : [h, m];
        };
        const allKeys = Object.keys(formData);
        const stRaw = allKeys.filter(isApptStartKey).map(k => formData[k]).find(v => v && typeof v === "string" && v.includes(":"));
        const etRaw = allKeys.filter(isApptEndKey).map(k => formData[k]).find(v => v && typeof v === "string" && v.includes(":"));
        const stParts = parseTime(stRaw);
        const etParts = parseTime(etRaw);
        if (stParts && etParts) {
            const diff = (etParts[0] * 60 + etParts[1]) - (stParts[0] * 60 + stParts[1]);
            if (diff > 0) {
                const h = Math.floor(diff / 60);
                const m = diff % 60;
                const formatted = h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m} min`;
                const updated = { ...formData };
                for (const dk of durKeys) { updated[dk] = formatted; }
                for (const k of allKeys) {
                    if (/duration/i.test(k)) updated[k] = formatted;
                }
                return updated;
            }
        }
        return formData;
    }, [formData, tabKey]);

    const [searchTerm, setSearchTerm] = useState("");
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<Record<string, any> | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("");

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
            let cols = marked.length > 0 ? marked.slice(0, 8) : (() => {
                // Fallback: first 6 non-group fields
                const fallback: { key: string; label: string }[] = [];
                for (const section of fieldConfig.sections) {
                    if (!Array.isArray(section?.fields)) continue;
                    for (const field of section.fields) {
                        if (!field) continue;
                        if (field.type === "group" || field.type === "computed" || field.type === "textarea" || field.type === "address" || field.type === "hidden") continue;
                        fallback.push({ key: field.key, label: field.label });
                        if (fallback.length >= 6) return fallback;
                    }
                }
                return fallback;
            })();

            // Allergies: ensure Allergen column is included, remove End Date
            if (tabKey === "allergies" || tabKey === "allergy-intolerances") {
                // Remove end date columns
                cols = cols.filter(c => !/^(endDate|end_date|end|abatement|abatementDate)$/i.test(c.key));
                // Ensure allergen column exists
                const hasAllergen = cols.some(c => /^(allergen|substance)$/i.test(c.key));
                if (!hasAllergen) {
                    // Find allergen field from config
                    for (const section of fieldConfig.sections) {
                        for (const field of section.fields || []) {
                            if (field && (field.key === "allergen" || field.key === "substance")) {
                                // Insert after allergy name (position 1)
                                const insertIdx = Math.min(1, cols.length);
                                cols.splice(insertIdx, 0, { key: field.key, label: field.label || "Allergen" });
                                break;
                            }
                        }
                        if (cols.some(c => /^(allergen|substance)$/i.test(c.key))) break;
                    }
                }
            }

            return cols;
        } catch {
            return [];
        }
    }, [fieldConfig, tabKey]);

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
                // Clinical-alerts: ensure author field is a searchable provider lookup
                if ((tabKey === "clinical-alerts" || tabKey === "alerts" || tabKey === "clinicalalerts" || tabKey === "clinical_alerts") && f.key === "author") {
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
                // Demographics: only the primary patient mobile phone should be mandatory, not other phone fields
                if (tabKey === "demographics" && f.type === "phone") {
                    const lk = f.key.toLowerCase();
                    // Only these keys count as the primary mobile phone
                    const isPrimaryPhone = lk === "phonenumber" || lk === "phone" || lk === "mobilephone" || lk === "mobile" || lk === "cellphone" || lk === "phone_number" || lk === "mobile_phone";
                    if (isPrimaryPhone && !f.required) {
                        // Primary mobile phone MUST be required and show indicator
                        section.fields[i] = { ...f, required: true };
                    } else if (!isPrimaryPhone && f.required) {
                        // All other phone fields (home, work, emergency, guardian, pharmacy, etc.) must not be required
                        section.fields[i] = { ...f, required: false };
                    }
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
                // Ensure lotNumber allows alphanumeric input (not just letters)
                if ((tabKey === "immunizations" || tabKey === "immunization") && /^(lotNumber|lot_number|lot|lotNo|lotNum|batchNumber|batch_number)$/i.test(f.key)) {
                    section.fields[i] = { ...section.fields[i] || f, type: "text", validation: undefined, placeholder: "e.g., AB1234, 12345" } as any;
                }
                // Encounters: keep reasonForVisit as-is (honor backend required flag)
                // Encounters: ensure patient field is a searchable patient lookup
                if ((tabKey === "encounters" || tabKey === "encounter")) {
                    const fkl = f.key.toLowerCase();
                    const isPatientField = f.key === "patient" || f.key === "patientId" || f.key === "patientName" || f.key === "subject" ||
                        f.key === "patientRef" || f.key === "patientReference" || f.key === "participant" || f.key === "participantId" ||
                        (fkl.includes("patient") && !fkl.includes("provider") && !fkl.includes("doctor"));
                    if (isPatientField && (f.type !== "lookup" || !f.lookupConfig?.endpoint)) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/patients", displayField: "fullName", valueField: "id", searchable: true } };
                    }
                }
                // Encounters: ensure provider field is a provider lookup
                if ((tabKey === "encounters" || tabKey === "encounter") && (f.key === "provider" || f.key === "practitioner" || f.key === "providerId")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Appointments: patient field should be readonly (locked to current patient)
                if (tabKey === "appointments" || tabKey === "appointment") {
                    const fkl = f.key.toLowerCase();
                    const isApptPatientField = f.key === "patient" || f.key === "patientId" || f.key === "patientName" ||
                        f.key === "subject" || f.key === "patientRef" ||
                        (fkl.includes("patient") && !fkl.includes("provider") && !fkl.includes("doctor"));
                    if (isApptPatientField) {
                        section.fields[i] = { ...f, type: "text", readOnly: true } as any;
                    }
                }
                // Appointments: duration is auto-calculated — make it read-only
                if ((tabKey === "appointments" || tabKey === "appointment") && (f.key === "duration" || f.key === "durationMinutes" || f.key === "minutesDuration" || f.key === "appointmentDuration")) {
                    section.fields[i] = { ...f, readOnly: true } as any;
                }
                // Appointments: ensure provider/practitioner field is a provider lookup
                if (tabKey === "appointments" && (f.key === "provider" || f.key === "providerId" || f.key === "practitioner" || f.key === "practitionerId")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Appointments: ensure location/room field is a location lookup
                if (tabKey === "appointments" && (f.key === "location" || f.key === "locationId" || f.key === "locationName" || f.key === "room" || f.key === "roomId" || f.key === "roomName")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/fhir-resource/facilities", displayField: "name", valueField: "id", searchable: true, dropdownPosition: "auto" } as any };
                    }
                }
                // Issues/Conditions: ensure onsetDate is a date field
                if ((tabKey === "issues" || tabKey === "conditions" || tabKey === "problems" || tabKey === "medicalproblems" || tabKey === "medical-problems") && (f.key === "onsetDate" || f.key === "onsetDateTime" || f.key === "onset")) {
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
                // Documents: make the file/attachment field mandatory
                if (tabKey === "documents") {
                    const fkl = f.key.toLowerCase();
                    const isDocFileField = f.type === "file" || fkl === "attachment" || fkl === "documenturl" || fkl === "fileurl" || fkl === "file" || fkl === "document";
                    if (isDocFileField && !f.required) {
                        section.fields[i] = { ...f, required: true };
                    }
                }
                // Allergies & Problems: end date must be optional (not required)
                if ((tabKey === "allergies" || tabKey === "allergy-intolerances" || tabKey === "medicalproblems" || tabKey === "medical-problems" || tabKey === "conditions" || tabKey === "problems") &&
                    /^(endDate|end_date|end|abatement|abatementDate|resolvedDate)$/i.test(f.key)) {
                    section.fields[i] = { ...f, required: false };
                }
                // Problems & Allergies: limit clinicalStatus options to Active/Inactive/Resolved
                if ((tabKey === "medicalproblems" || tabKey === "medical-problems" || tabKey === "conditions" || tabKey === "problems" || tabKey === "allergies" || tabKey === "allergy-intolerances") &&
                    (f.key === "clinicalStatus" || f.key === "status")) {
                    section.fields[i] = { ...f, type: "select", options: [
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                        { value: "Resolved", label: "Resolved" },
                    ] };
                }
                // Insurance: memberId must be alphanumeric (not letters-only)
                if ((tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") && (f.key === "memberId" || f.key === "memberNumber" || f.key === "subscriberId" || f.key === "idNo" || f.key === "policyNumber" || f.key === "policyNo")) {
                    section.fields[i] = { ...f, type: "text", validation: undefined, placeholder: "Enter alphanumeric ID (e.g., ABC123)" } as any;
                }
                // Insurance: groupNumber must be alphanumeric
                if ((tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") && (f.key === "groupNumber" || f.key === "group" || f.key === "groupNo" || f.key === "groupId")) {
                    section.fields[i] = { ...f, type: "text", validation: undefined, placeholder: "Enter group number (e.g., GRP001)" } as any;
                }
                // Allergies — label and deduplicate allergy fields
                if (tabKey === "allergies" || tabKey === "allergy-intolerances") {
                    if (f.key === "allergyName" || f.key === "allergy_name") {
                        section.fields[i] = { ...f, label: "Allergy", placeholder: "e.g., Drug Allergy, Food Allergy" };
                    } else if (f.key === "code" || f.key === "codeText") {
                        section.fields[i] = { ...f, label: "Allergy Code" };
                    } else if (f.key === "name") {
                        // Hide 'name' field when 'allergyName' exists to avoid duplicate Allergy fields
                        if (section.fields.some(sf => sf && (sf.key === "allergyName" || sf.key === "allergy_name"))) {
                            section.fields[i] = { ...f, type: "hidden" } as any;
                        } else {
                            section.fields[i] = { ...f, label: "Allergy", placeholder: "e.g., Drug Allergy, Food Allergy" };
                        }
                    } else if (f.key === "allergen" || f.key === "substance") {
                        section.fields[i] = { ...f, label: "Allergen", placeholder: "e.g., Penicillin, Peanuts, Dust" };
                    }
                }
                // Issue 13: Insurance — insurance company dropdown from dedicated API
                if ((tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") && (f.key === "payerName" || f.key === "insurerName" || f.key === "companyName" || f.key === "insurer" || f.key === "payor")) {
                    section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/insurance-companies", displayField: "name", valueField: "name", searchable: true }, required: true };
                }
                // Insurance — planName as free-text (lookup not required)
                if ((tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") && (f.key === "planName" || f.key === "plan" || f.key === "coveragePlan")) {
                    section.fields[i] = { ...f, type: "text", placeholder: "Enter plan name" };
                }
                // Issue 15: Documents — attachment/file field must be required + allow common doc types including CSV
                if ((tabKey === "documents" || tabKey === "document-references") && (f.key === "attachment" || f.key === "file" || f.key === "fileUrl" || f.key === "documentUrl" || f.key === "content")) {
                    const existingTypes = f.fileConfig?.allowedTypes || [];
                    const docTypes = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "dicom", "csv", "xls", "xlsx", "txt"];
                    const mergedTypes = existingTypes.length > 0 ? Array.from(new Set([...existingTypes, "csv", "xls", "xlsx"])) : docTypes;
                    section.fields[i] = {
                        ...f,
                        required: true,
                        fileConfig: {
                            ...(f.fileConfig || {}),
                            allowedTypes: mergedTypes,
                            dragDrop: true,
                            uploadEndpoint: f.fileConfig?.uploadEndpoint || "/api/documents/upload",
                        },
                    };
                }
                // SSN fields — enforce maxLength of 11 (9 digits + 2 dashes) to prevent excess input
                const ssnKeys = ["ssn", "ptssn", "socialSecurityNumber", "guarantorSsn", "guarantor_ssn"];
                if (ssnKeys.includes(f.key) || f.key.toLowerCase().includes("ssn")) {
                    section.fields[i] = { ...section.fields[i] || f, maxLength: 11, placeholder: "XXX-XX-XXXX" };
                }
                // Phone/mobile fields — enforce maxLength of 14 (formatted: (xxx) xxx-xxxx) to prevent excess input
                const flk = f.key.toLowerCase();
                if (flk.includes("phone") || flk.includes("mobile") || flk.includes("cell") || flk.includes("fax")) {
                    section.fields[i] = { ...section.fields[i] || f, maxLength: 14, type: "phone" };
                }
                // Issue 19: Clinical Alerts — author/provider search
                if ((tabKey === "clinical-alerts" || tabKey === "clinicalAlerts" || tabKey === "cds" || tabKey === "alerts") && (f.key === "author" || f.key === "authorName" || f.key === "provider" || f.key === "practitioner")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Issue 23: Medications — prescriber and dosage must be required
                if ((tabKey === "medications" || tabKey === "medication-requests") && (f.key === "prescriber" || f.key === "prescribingDoctor" || f.key === "requester")) {
                    section.fields[i] = { ...f, required: true };
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...section.fields[i], type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                if ((tabKey === "medications" || tabKey === "medication-requests") && (f.key === "dosage" || f.key === "dosageInstruction" || f.key === "dose")) {
                    section.fields[i] = { ...f, required: true };
                }
                // Issue 24: Procedures — performer must be required
                if ((tabKey === "procedures" || tabKey === "procedure") && (f.key === "performer" || f.key === "performerName" || f.key === "practitioner")) {
                    section.fields[i] = { ...f, required: true };
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...section.fields[i], type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true } };
                    }
                }
                // Issue 25: Claims — provider must use Practitioner reference, not Organization
                if ((tabKey === "claims" || tabKey === "claim") && (f.key === "provider" || f.key === "providerId" || f.key === "practitioner")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/providers", displayField: "name", valueField: "fhirId", searchable: true }, required: true };
                    }
                }
                // Issue 26-27: Submissions/Denials — insurer must be an insurance-company dropdown
                if ((tabKey === "submissions" || tabKey === "claim-submissions" || tabKey === "claim-responses" || tabKey === "denials" || tabKey === "remittance") && (f.key === "insurer" || f.key === "insurerName" || f.key === "payerName" || f.key === "payor" || f.key === "payer")) {
                    section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/insurance-companies", displayField: "name", valueField: "name", searchable: true } };
                }
                // ERA/Remittance — paymentType must be a dropdown, not free text
                if ((tabKey === "remittance" || tabKey === "era" || tabKey === "era-remittance" || tabKey === "eob" || tabKey === "payment-posting" || tabKey === "payments") && (f.key === "paymentType" || f.key === "payment_type" || f.key === "paymentMethod" || f.key === "payment_method")) {
                    section.fields[i] = { ...f, type: "select", options: [
                        { value: "insurance", label: "Insurance Payment" },
                        { value: "patient_copay", label: "Patient Copay" },
                        { value: "patient_coinsurance", label: "Patient Coinsurance" },
                        { value: "patient_deductible", label: "Patient Deductible" },
                        { value: "patient_self_pay", label: "Patient Self-Pay" },
                        { value: "cash", label: "Cash" },
                        { value: "check", label: "Check" },
                        { value: "credit_card", label: "Credit Card" },
                        { value: "eft", label: "EFT/ACH" },
                    ] };
                }
                // Issue 29: Transactions — amount must be required
                if ((tabKey === "transactions" || tabKey === "transaction") && (f.key === "amount" || f.key === "totalAmount" || f.key === "paymentAmount")) {
                    section.fields[i] = { ...f, required: true };
                }
                // Issue 30: Issues — issue, status, onsetDate must be required
                if ((tabKey === "issues" || tabKey === "conditions" || tabKey === "medicalproblems" || tabKey === "medical-problems" || tabKey === "problems") && (f.key === "issue" || f.key === "condition" || f.key === "conditionName" || f.key === "name" || f.key === "code" || f.key === "displayText")) {
                    section.fields[i] = { ...f, required: true };
                }
                if ((tabKey === "issues" || tabKey === "conditions" || tabKey === "medicalproblems" || tabKey === "medical-problems" || tabKey === "problems") && (f.key === "status" || f.key === "clinicalStatus")) {
                    section.fields[i] = { ...f, required: true };
                }
                if ((tabKey === "issues" || tabKey === "conditions" || tabKey === "medicalproblems" || tabKey === "medical-problems" || tabKey === "problems") && (f.key === "onsetDate" || f.key === "onset" || f.key === "onsetDateTime")) {
                    section.fields[i] = { ...f, required: true };
                }
                // Messaging: patient field should be read-only in patient context
                if (tabKey === "messaging" && (f.key === "patient" || f.key === "patientId" || f.key === "patientName" || f.key === "to" || f.key === "recipient")) {
                    section.fields[i] = { ...f, readOnly: true };
                }
                // Prior Auth: patient field should be a searchable patient lookup (not locked)
                if ((tabKey === "prior-auth" || tabKey === "prior-authorizations" || tabKey === "priorauth" || tabKey === "prior_authorizations" || tabKey === "prior-authorization") && (f.key === "patient" || f.key === "patientId" || f.key === "patientName" || f.key === "subject" || f.key === "patientRef")) {
                    if (f.type !== "lookup" || !f.lookupConfig?.endpoint) {
                        section.fields[i] = { ...f, type: "lookup", lookupConfig: { endpoint: "/api/patients", displayField: "fullName", valueField: "id", searchable: true } };
                    }
                }
                // Prior Auth: memberId should allow alphanumeric
                if ((tabKey === "prior-auth" || tabKey === "prior-authorizations" || tabKey === "priorauth" || tabKey === "prior_authorizations" || tabKey === "prior-authorization" || tabKey === "authorizations") && (f.key === "memberId" || f.key === "memberNumber" || f.key === "subscriberId" || f.key === "policyNumber")) {
                    section.fields[i] = { ...f, type: "text", validation: undefined, placeholder: "Enter alphanumeric member ID (e.g., MEM123)" } as any;
                }
            }
            // Education: inject URL field if not present in config
            if ((tabKey === "education" || tabKey === "patient-education") && section.fields) {
                const urlKeys = ["url", "externalUrl", "videoUrl", "articleUrl", "link", "resourceUrl"];
                const hasUrl = section.fields.some((f: any) => f && urlKeys.includes(f.key));
                if (!hasUrl) {
                    section.fields.push({ key: "url", label: "URL / Link", type: "text", placeholder: "https://...", colSpan: 2 } as any);
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
        if (!rec || typeof rec !== "object") return {};
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
        // Flatten clinicalStatus / verificationStatus CodeableConcept → plain string (title-case)
        const toTitleCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
        if (r.clinicalStatus != null && typeof r.clinicalStatus === "object") {
            const raw = (r.clinicalStatus as any).text ||
                (r.clinicalStatus as any).coding?.[0]?.display ||
                (r.clinicalStatus as any).coding?.[0]?.code || null;
            r.clinicalStatus = raw ? toTitleCase(String(raw)) : null;
        } else if (typeof r.clinicalStatus === "string" && r.clinicalStatus) {
            r.clinicalStatus = toTitleCase(r.clinicalStatus);
        }
        if (r.verificationStatus != null && typeof r.verificationStatus === "object") {
            const raw = (r.verificationStatus as any).text ||
                (r.verificationStatus as any).coding?.[0]?.display ||
                (r.verificationStatus as any).coding?.[0]?.code || null;
            r.verificationStatus = raw ? toTitleCase(String(raw)) : null;
        } else if (typeof r.verificationStatus === "string" && r.verificationStatus) {
            r.verificationStatus = toTitleCase(r.verificationStatus);
        }

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
        // --- Clinical-alerts: author normalization (provider name fallbacks) ---
        if (tabKey === "clinical-alerts" || tabKey === "alerts" || tabKey === "clinicalalerts" || tabKey === "clinical_alerts") {
            try {
                if (Array.isArray(r.author) && r.author.length > 0) {
                    const first = r.author[0];
                    r.author = (first && typeof first === "object" ? (first.display || first.reference) : String(first)) || null;
                } else if (r.author && typeof r.author === "object" && !Array.isArray(r.author)) {
                    r.author = (r.author as any).display || (r.author as any).reference || String(r.author);
                }
            } catch { r.author = null; }
            if (r.author == null && r.authorName != null) r.author = r.authorName;
            if (r.author == null && r.practitioner != null) r.author = r.practitioner;
            if (r.author == null && r.practitionerName != null) r.author = r.practitionerName;
            if (r.author == null && r.recorder != null) r.author = r.recorder;
            if (r.author == null && r.asserter != null) r.author = r.asserter;
        }

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
        // Medications: flatten FHIR dosageInstruction array to readable string
        if (r.dosageInstruction != null && typeof r.dosageInstruction === "object") {
            if (Array.isArray(r.dosageInstruction)) {
                const texts = r.dosageInstruction.map((di: any) => di?.text || di?.patientInstruction || di?.doseAndRate?.[0]?.doseQuantity?.value || "").filter(Boolean);
                if (texts.length > 0) {
                    if (r.dosage == null) r.dosage = texts.join("; ");
                    if (r.dosageInstruction != null) r.dosageInstruction = texts.join("; ");
                }
            } else if (r.dosageInstruction.text) {
                if (r.dosage == null) r.dosage = r.dosageInstruction.text;
                r.dosageInstruction = r.dosageInstruction.text;
            }
        }
        // Medications: flatten FHIR medicationCodeableConcept to readable name
        if (r.medicationCodeableConcept != null && typeof r.medicationCodeableConcept === "object") {
            const medName = r.medicationCodeableConcept?.coding?.[0]?.display || r.medicationCodeableConcept?.text || r.medicationCodeableConcept?.coding?.[0]?.code;
            if (medName) {
                if (r.medicationName == null) r.medicationName = medName;
                if (r.medication == null) r.medication = medName;
            }
        }
        // Medications: flatten FHIR medicationReference
        if (r.medicationReference != null && typeof r.medicationReference === "object") {
            const medRef = r.medicationReference?.display || r.medicationReference?.reference;
            if (medRef && r.medicationName == null) r.medicationName = medRef;
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
        try {
            if (r.relatedPatientName == null) {
                const nameObj = Array.isArray(r.name) ? r.name[0] : r.name;
                if (nameObj && typeof nameObj === "object") {
                    const given = Array.isArray(nameObj.given) ? nameObj.given[0] : nameObj.given;
                    r.relatedPatientName = nameObj.text || [given, nameObj.family].filter(Boolean).join(" ") || null;
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
                    const coding = Array.isArray(rel.coding) ? rel.coding[0] : null;
                    r.relationshipType = coding?.display || coding?.code || rel.text || null;
                } else if (typeof rel === "string") {
                    r.relationshipType = rel;
                }
            }
            if (r.relationshipType == null && r.relationType != null) r.relationshipType = r.relationType;
            if (r.relationshipType == null && r.type != null && typeof r.type === "string") r.relationshipType = r.type;
        } catch { /* prevent crash from malformed FHIR data */ }

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

        // Insurance: extract planName/groupNumber/memberId from FHIR Coverage class array
        if (Array.isArray(r.class)) {
            for (const cls of r.class) {
                const code = cls?.type?.coding?.[0]?.code || cls?.type?.text || cls?.type || "";
                const val = cls?.value || cls?.name || "";
                if (val) {
                    if (code === "plan" && !r.planName) { r.planName = val; r.plan = val; r.coveragePlan = val; }
                    if (code === "group" && !r.groupNumber) { r.groupNumber = val; r.group = val; r.groupNo = val; }
                }
            }
        }
        // Insurance: reverse subscriberId → memberId/policyNumber
        if (r.memberId == null && r.subscriberId != null) r.memberId = r.subscriberId;
        if (r.policyNumber == null && r.subscriberId != null) r.policyNumber = r.subscriberId;
        if (r.subscriberId == null && r.memberId != null) r.subscriberId = r.memberId;
        // Insurance: reverse planName aliases
        if (r.planName == null && r.plan != null) r.planName = r.plan;
        if (r.planName == null && r.coveragePlan != null) r.planName = r.coveragePlan;
        if (r.plan == null && r.planName != null) r.plan = r.planName;
        if (r.coveragePlan == null && r.planName != null) r.coveragePlan = r.planName;

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
                if (json.success === false) {
                    setError(json.message || "Failed to load records");
                    setRecords([]);
                    setTotalElements(0);
                    setTotalPages(0);
                    return;
                }
                const data = json.data || {};
                const content = (data.content || []).filter((rec: any) => rec != null && typeof rec === "object").map((rec: Record<string, any>) => { try { return normalizeRecord(rec); } catch { return rec; } });
                // Facility/location tabs should always allow multiple records even if backend says singleRecord
                const isFacilityTab = tabKey === "facility" || tabKey === "facilities" || tabKey === "location" || tabKey === "locations" || tabKey === "serviceLocation" || tabKey === "serviceLocations";
                const isSingle = isFacilityTab ? false : data.singleRecord === true;
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
                    // No record yet — but don't reset if a record is already being shown (indexing lag after save)
                    setSelectedRecord(prev => {
                        if (!prev) {
                            setFormData({});
                            setMode("create");
                        }
                        return prev;
                    });
                }
            } else if (res.status === 403) {
                setError("Access Denied: You don't have permission to view this data.");
            } else if (res.status === 404) {
                // Resource not found — show empty state instead of error
                setRecords([]);
                setTotalElements(0);
                setTotalPages(0);
            } else {
                let msg = "Failed to load records";
                try { const j = await res.json(); msg = j.message || j.error || msg; } catch { /* use default */ }
                setError(msg);
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

    const NAME_FIELD_KEYS = new Set(["firstName", "lastName", "middleName", "first_name", "last_name", "middle_name"]);
    // Subscriber name keys (insurance-coverage)
    const SUBSCRIBER_NAME_KEYS = new Set(["subscriberFirstName", "subscriberLastName", "subscriber_first_name", "subscriber_last_name", "subscriberName", "subscriber_name"]);
    // Copay/numeric-only keys (insurance-coverage)
    const COPAY_KEYS = new Set(["copay", "copayAmount", "copay_amount", "coPay", "coPayAmount"]);

    const handleFieldChange = (key: string, value: any) => {
        // Name fields: block digits/invalid chars and show inline error
        if (NAME_FIELD_KEYS.has(key) && typeof value === "string") {
            if (/[^A-Za-z\s\-'.]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Name must contain only letters" }));
                value = value.replace(/[^A-Za-z\s\-'.]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Subscriber name fields: letters only
        if (SUBSCRIBER_NAME_KEYS.has(key) && typeof value === "string") {
            if (/[^A-Za-z\s\-'.]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Name must contain only letters" }));
                value = value.replace(/[^A-Za-z\s\-'.]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Copay: numbers and decimal only (match by set OR key containing "copay")
        if ((COPAY_KEYS.has(key) || key.toLowerCase().includes("copay")) && typeof value === "string") {
            if (/[^0-9.]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Copay amount must be a number" }));
                value = value.replace(/[^0-9.]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Subscriber name: letters only (match by key containing "subscriber" + name)
        if (key.toLowerCase().includes("subscriber") && (key.toLowerCase().includes("name") || key.toLowerCase().includes("first") || key.toLowerCase().includes("last")) && typeof value === "string") {
            if (/[^A-Za-z\s\-'.]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Name must contain only letters" }));
                value = value.replace(/[^A-Za-z\s\-'.]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Problems/Conditions: block special characters in condition name (real-time)
        if ((tabKey === "medicalproblems" || tabKey === "problems" || tabKey === "conditions" || tabKey === "issues") &&
            (key === "condition" || key === "conditionName" || key === "name" || key === "displayText") &&
            typeof value === "string") {
            if (/[^A-Za-z0-9\s\-.,/()':#&+]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Condition contains invalid special characters" }));
                value = value.replace(/[^A-Za-z0-9\s\-.,/()':#&+]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Education topic/title: letters only (no purely numeric input)
        if ((tabKey === "education" || tabKey === "patient-education") &&
            (key === "topic" || key === "title" || key === "subject") &&
            typeof value === "string") {
            if (/[^A-Za-z\s\-'.,!?()&]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Topic/Title must contain only letters" }));
                value = value.replace(/[^A-Za-z\s\-'.,!?()&]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Facility name: letters, numbers, and common punctuation
        if ((tabKey === "facility" || tabKey === "facilities" || tabKey === "location" || tabKey === "locations" || tabKey === "serviceLocation" || tabKey === "serviceLocations") &&
            (key === "name" || key === "facilityName" || key === "facility_name" || key === "locationName") &&
            typeof value === "string") {
            if (/[^A-Za-z0-9\s\-'.,&#()\/]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Facility name contains invalid characters" }));
                value = value.replace(/[^A-Za-z0-9\s\-'.,&#()\/]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Medications: dosage → numeric only (real-time block)
        if ((tabKey === "medications" || tabKey === "medication" || tabKey === "prescriptions" || tabKey === "prescription") &&
            (key === "dosage" || key === "dose" || key === "doseQuantity" || key === "doseAmount") &&
            typeof value === "string") {
            if (/[^0-9.]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Dosage must be a number" }));
                value = value.replace(/[^0-9.]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Appointments: duration → numeric only (real-time block)
        if ((tabKey === "appointments" || tabKey === "appointment") &&
            (key === "duration" || key === "durationMinutes" || key === "appointmentDuration") &&
            typeof value === "string") {
            if (/[^0-9]/.test(value)) {
                setValidationErrors((prev) => ({ ...prev, [key]: "Duration must be a number" }));
                value = value.replace(/[^0-9]/g, "");
            } else {
                setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
        // Immunizations: lot number → alphanumeric+hyphen, dose → numeric (real-time block)
        if (tabKey === "immunizations" || tabKey === "immunization") {
            if (/^(lotNumber|lot_number|lot|lotNo|lotNum|batchNumber|batch_number)$/i.test(key) && typeof value === "string") {
                // Strip characters that are never allowed (anything other than alphanumeric or hyphen)
                const stripped = value.replace(/[^A-Za-z0-9\-]/g, "");
                // Lot number must start and end with an alphanumeric character (no leading/trailing hyphens)
                const isInvalid = stripped !== value || (stripped.length > 0 && !/^[A-Za-z0-9]([A-Za-z0-9\-]*[A-Za-z0-9])?$/.test(stripped));
                if (isInvalid) {
                    setValidationErrors((prev) => ({ ...prev, [key]: "Lot number must be alphanumeric (hyphens allowed only between characters)" }));
                    value = stripped;
                } else {
                    setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
                }
            }
            if ((key === "dose" || key === "doseNumber" || key === "doseQuantity" || key === "doseNumberPositive") && typeof value === "string") {
                if (/[^0-9.]/.test(value)) {
                    setValidationErrors((prev) => ({ ...prev, [key]: "Dose must be a number" }));
                    value = value.replace(/[^0-9.]/g, "");
                } else {
                    setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
                }
            }
        }
        // SSN fields — restrict to digits and hyphens, max 11 chars (xxx-xx-xxxx)
        const ssnFieldKeys = ["ssn", "ptssn", "socialSecurityNumber", "guarantorSsn", "guarantor_ssn"];
        if ((ssnFieldKeys.includes(key) || key.toLowerCase().includes("ssn")) && typeof value === "string") {
            value = value.replace(/[^0-9\-]/g, "").slice(0, 11);
            const digitsOnly = value.replace(/\D/g, "");
            if (digitsOnly.length > 9) {
                value = value.slice(0, value.length - (digitsOnly.length - 9));
            }
        }
        // Insurance: groupNumber and policyNumber/memberId — alphanumeric only (real-time block)
        if ((tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") && typeof value === "string") {
            const kl = key.toLowerCase();
            const isGroupKey = ["groupnumber", "group_number", "groupno", "group", "groupid"].includes(kl) ||
                (kl.includes("group") && (kl.includes("number") || kl.includes("no") || kl.includes("num") || kl.includes("id")));
            const isPolicyKey = ["memberid", "membernumber", "subscriberid", "idno", "policynumber", "policyno", "member_id", "policy_number"].includes(kl) ||
                (kl.includes("policy") && (kl.includes("number") || kl.includes("no") || kl.includes("num") || kl.includes("id"))) ||
                (kl.includes("member") && (kl.includes("id") || kl.includes("number") || kl.includes("no")));
            if (isGroupKey || isPolicyKey) {
                const filtered = value.replace(/[^a-zA-Z0-9]/g, "");
                if (filtered !== value) {
                    setValidationErrors((prev) => ({ ...prev, [key]: "Only letters and numbers are allowed" }));
                }  else {
                    setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
                }
                value = filtered;
            }
        }
        setFormData((prev) => {
            const next = { ...prev, [key]: value };
            // Insurance: plan selection requires company to be selected first
            const isInsuranceTab = tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage";
            const isPlanKey = key === "planName" || key === "plan" || key === "coveragePlan";
            if (isInsuranceTab && isPlanKey) {
                const companyKeys = ["payerName", "insurerName", "companyName", "insurer", "payor"];
                const hasCompany = companyKeys.some(k => next[k] && String(next[k]).trim());
                if (!hasCompany) {
                    setValidationErrors(prev => ({ ...prev, payerName: "Please select an Insurance Company first", insurerName: "Please select an Insurance Company first" }));
                    return prev; // Prevent plan selection without company
                }
            }
            // ERA/Remittance/Submissions: auto-update serviceTo when serviceFrom changes
            const isServiceTab = tabKey === "era" || tabKey === "remittance" || tabKey === "eob" || tabKey === "era-remittance" || tabKey === "submissions" || tabKey === "claim-submissions" || tabKey === "claims";
            const isServiceFromKey = key === "serviceFrom" || key === "serviceFromDate" || key === "serviceDateFrom" || key === "billablePeriodStart";
            const isServiceToKey = key === "serviceTo" || key === "serviceToDate" || key === "serviceDateTo" || key === "billablePeriodEnd";
            if (isServiceTab && isServiceFromKey && value) {
                const toKeys = ["serviceTo", "serviceToDate", "serviceDateTo", "billablePeriodEnd"];
                const currentTo = toKeys.map(k => next[k]).find(v => v);
                if (currentTo && new Date(String(currentTo)) < new Date(String(value))) {
                    for (const tk of toKeys) { if (next[tk] != null) next[tk] = value; }
                    setValidationErrors(prev => { const n = { ...prev }; delete n.serviceTo; delete n.serviceToDate; delete n.serviceDateTo; delete n.billablePeriodEnd; return n; });
                }
            }
            // Block serviceTo from being set before serviceFrom
            if (isServiceTab && isServiceToKey && value) {
                const fromKeys = ["serviceFrom", "serviceFromDate", "serviceDateFrom", "billablePeriodStart"];
                const currentFrom = fromKeys.map(k => next[k]).find(v => v);
                if (currentFrom && new Date(String(value)) < new Date(String(currentFrom))) {
                    const msg = "Service To must be on or after Service From";
                    setValidationErrors(prev => ({ ...prev, [key]: msg }));
                    return prev; // Block the change
                } else {
                    setValidationErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
                }
            }
            // Auto-calculate duration from start/end time for appointments
            if (tabKey === "appointments" || tabKey === "appointment") {
                const isApptStartKey = (k: string) =>
                    /^(appointmentStartTime|startTime|start|scheduledStart|startDateTime|appointmentStart)$/i.test(k) ||
                    (/start/i.test(k) && /time/i.test(k) && !/end/i.test(k));
                const isApptEndKey = (k: string) =>
                    /^(appointmentEndTime|endTime|end|scheduledEnd|endDateTime|appointmentEnd)$/i.test(k) ||
                    (/end/i.test(k) && /time/i.test(k) && !/start/i.test(k));
                const durKeys = ["duration", "minutesDuration", "durationMinutes", "appointmentDuration"];
                const isStartOrEnd = isApptStartKey(key) || isApptEndKey(key);
                if (isStartOrEnd) {
                    // Extract [hours, minutes] from either "HH:mm" or ISO "YYYY-MM-DDTHH:mm:ss"
                    const parseTime = (v: unknown): [number, number] | null => {
                        if (!v || typeof v !== "string") return null;
                        const timePart = v.includes("T") ? v.split("T")[1] : v;
                        const parts = timePart.split(":");
                        const h = Number(parts[0]);
                        const m = Number(parts[1]);
                        return isNaN(h) || isNaN(m) ? null : [h, m];
                    };
                    const allNextKeys = Object.keys(next);

                    // When start time changes, auto-set end time to start + 15 minutes
                    if (isApptStartKey(key)) {
                        const stParts = parseTime(value);
                        if (stParts) {
                            const totalMin = stParts[0] * 60 + stParts[1] + 15;
                            const nh = Math.floor(totalMin / 60) % 24;
                            const nm = totalMin % 60;
                            const newEnd = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
                            // Update all end-time fields
                            for (const k of allNextKeys) {
                                if (isApptEndKey(k)) next[k] = newEnd;
                            }
                            // If no end-time field exists yet, set common ones
                            if (!allNextKeys.some(isApptEndKey)) {
                                next.appointmentEndTime = newEnd;
                                next.endTime = newEnd;
                            }
                            // Also auto-fill end date from start date if not set
                            const startDateKeys = allNextKeys.filter(k => /^(appointmentStartDate|startDate)$/i.test(k));
                            const endDateKeys = allNextKeys.filter(k => /^(appointmentEndDate|endDate)$/i.test(k));
                            if (startDateKeys.length > 0 && endDateKeys.length > 0) {
                                for (const edk of endDateKeys) {
                                    if (!next[edk]) next[edk] = next[startDateKeys[0]];
                                }
                            }
                            // Set duration to 15
                            for (const dk of durKeys) { next[dk] = 15; }
                            for (const k of allNextKeys) {
                                if (/duration/i.test(k) && !durKeys.includes(k)) next[k] = 15;
                            }
                        }
                    } else {
                        // End time changed manually — recalculate duration from start/end
                        const stRaw = allNextKeys.filter(isApptStartKey).map(k => next[k]).find(v => v && typeof v === "string" && v.includes(":"));
                        const etRaw = allNextKeys.filter(isApptEndKey).map(k => next[k]).find(v => v && typeof v === "string" && v.includes(":"));
                        const stParts = parseTime(stRaw);
                        const etParts = parseTime(etRaw);
                        if (stParts && etParts) {
                            const diff = (etParts[0] * 60 + etParts[1]) - (stParts[0] * 60 + stParts[1]);
                            if (diff > 0) {
                                for (const dk of durKeys) { next[dk] = diff; }
                                for (const k of allNextKeys) {
                                    if (/duration/i.test(k) && !durKeys.includes(k)) next[k] = diff;
                                }
                            }
                        }
                    }
                }
            }
            return next;
        });

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
        // For appointments tab: auto-fill patient name (locked to current patient)
        if (tabKey === "appointments" || tabKey === "appointment") {
            const name = patientName || "";
            if (name) {
                // Only set display-name fields to the patient name
                for (const key of ["patientName"]) {
                    if (defaults[key] == null) defaults[key] = name;
                }
                // Set reference/id fields to the numeric patient ID
                for (const key of ["patient", "patientId", "subject", "patientRef"]) {
                    if (defaults[key] == null) defaults[key] = String(patientId);
                }
            }
        }
        // For facility/location tabs: auto-fill status
        if (tabKey === "facility" || tabKey === "facilities" || tabKey === "location" || tabKey === "locations") {
            defaults.status = defaults.status || "active";
            defaults.mode = defaults.mode || "instance";
        }
        // For messaging tab: auto-fill patient (locked to current patient context)
        if (tabKey === "messaging") {
            const displayName = patientName || String(patientId);
            defaults.patientId = defaults.patientId || patientId;
            defaults.patient = defaults.patient || displayName;
            defaults.patientName = defaults.patientName || displayName;
            defaults.to = defaults.to || displayName;
            defaults.recipient = defaults.recipient || displayName;
            // Auto-fill date if not already set
            if (!defaults.date && !defaults.sentDate) {
                defaults.date = new Date().toISOString().slice(0, 10);
                defaults.sentDate = new Date().toISOString().slice(0, 10);
            }
        }
        // For appointments tab: auto-fill patientId
        if (tabKey === "appointments") {
            defaults.patientId = defaults.patientId || patientId;
            defaults.patient = defaults.patient || patientId;
            defaults.patientName = defaults.patientName || patientId;
            defaults.subject = defaults.subject || patientId;
        }
        setFormData(defaults);
        setSelectedRecord(null);
        setValidationErrors({});
        setError(null);
        setMode("create");
    };

    const handleEdit = (record?: Record<string, any>) => {
        const rec = record || selectedRecord;
        if (!rec || typeof rec !== "object") return;
        try {
            setFormData({ ...rec });
            setSelectedRecord(rec);
            setValidationErrors({});
            setError(null);
            setMode("edit");
        } catch (err) {
            console.error("Error editing record:", err);
            setError("Failed to edit record");
        }
    };

    const handleRowClick = (record: Record<string, any>) => {
        if (!record || typeof record !== "object") return;
        try {
            const rowLink = fieldConfig?.features?.rowLink;
            if (rowLink?.urlTemplate) {
                const resourceId = record.id || record.fhirId;
                const url = rowLink.urlTemplate
                    .replace("{patientId}", String(patientId))
                    .replace("{id}", String(resourceId));
                router.push(url);
                return;
            }
            // Ensure all values are safe for form rendering (stringify objects)
            const safeRecord: Record<string, any> = {};
            for (const [k, v] of Object.entries(record)) {
                if (v !== null && typeof v === "object" && !Array.isArray(v)) {
                    safeRecord[k] = (v as any).display || (v as any).text || (v as any).value || JSON.stringify(v);
                } else {
                    safeRecord[k] = v;
                }
            }
            setFormData({ ...safeRecord });
            setSelectedRecord(record);
            setMode("view");
        } catch (err) {
            console.error("Error opening record:", err);
            setError("Failed to open record");
        }
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
        // Prevent double-submit (ref guard for rapid clicks before state updates)
        if (savingRef.current) return;
        savingRef.current = true;
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
            // Format validation for typed fields (applies to ALL tabs)
            for (const section of fieldConfig.sections) {
                if (!Array.isArray(section?.fields)) continue;
                for (const field of section.fields) {
                    if (!field) continue;
                    const val = formData[field.key];
                    if (typeof val === "string" && val.trim()) {
                        const lk = field.key.toLowerCase();
                        // Email: by field.type OR key name containing "email"
                        if ((field.type === "email" || lk.includes("email")) && !isValidEmail(val)) errors[field.key] = "Invalid email format";
                        // Phone/mobile/cell: 10-digit US format
                        if ((field.type === "phone" || lk.includes("phone") || lk.includes("mobile") || lk.includes("cell")) && !lk.includes("fax") && !isValidUSPhone(val)) errors[field.key] = "Mobile number must be exactly 10 digits";
                        if (lk.includes("fax") && !isValidFax(val)) errors[field.key] = "Invalid fax number";
                        if ((lk.includes("website") || lk.includes("url")) && !isValidUrl(val)) errors[field.key] = "Invalid URL (must start with http:// or https://)";
                    }
                }
            }
            // Immunization: dose must be numeric if provided
            if (tabKey === "immunizations" || tabKey === "immunization") {
                // Find which dose field key is actually used in the form config
                const doseFieldKey = fieldConfig?.sections
                    ?.flatMap(s => Array.isArray(s.fields) ? s.fields : [])
                    ?.find(f => f && ["dose", "doseNumber", "doseQuantity", "doseNumberPositive"].includes(f.key))
                    ?.key ?? "dose";
                const doseVal = formData[doseFieldKey] ?? formData.doseNumber ?? formData.dose ?? formData.doseNumberPositive;
                if (doseVal !== undefined && doseVal !== "" && doseVal !== null && isNaN(Number(doseVal))) {
                    // Set on all possible dose keys so the error displays on whichever field the form renders
                    errors.dose = "Dose must be a number";
                    errors.doseNumber = "Dose must be a number";
                    errors.doseQuantity = "Dose must be a number";
                    errors[doseFieldKey] = "Dose must be a number";
                }
                const lotNum = formData.lotNumber ?? formData.lot_number;
                if (typeof lotNum === "string" && lotNum.trim() && !/^[A-Za-z0-9]([A-Za-z0-9\-]*[A-Za-z0-9])?$/.test(lotNum.trim())) {
                    errors.lotNumber = "Lot number must be alphanumeric (hyphens allowed only between characters)";
                    errors.lot_number = "Lot number must be alphanumeric (hyphens allowed only between characters)";
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
                const endRaw = formData.endDate || formData.end || formData.abatementDate || formData.abatement;
                if (onsetRaw && endRaw) {
                    const onsetDt = new Date(String(onsetRaw));
                    const endDt = new Date(String(endRaw));
                    if (!isNaN(onsetDt.getTime()) && !isNaN(endDt.getTime()) && endDt < onsetDt) {
                        const errMsg = "End date cannot be earlier than onset date";
                        // Find which end-date field key the form config actually uses
                        const endFieldKey = fieldConfig?.sections
                            ?.flatMap(s => Array.isArray(s.fields) ? s.fields : [])
                            ?.find(f => f && ["endDate", "end", "abatementDate", "abatement", "resolvedDate"].includes(f.key))?.key || "endDate";
                        errors[endFieldKey] = errMsg;
                        // Also cover common aliases so the error always shows
                        if (formData.endDate !== undefined) errors.endDate = errMsg;
                        if (formData.end !== undefined) errors.end = errMsg;
                    }
                }
            }
            // Encounters: reasonForVisit is required and must contain letters (not purely numeric/special chars)
            if (tabKey === "encounters" || tabKey === "encounter") {
                // Find which field key is actually used in the form config
                const rvField = fieldConfig?.sections
                    ?.flatMap(s => Array.isArray(s.fields) ? s.fields : [])
                    ?.find(f => f && ["reasonForVisit", "reason", "chiefComplaint", "visitReason", "cc_text", "chief_complaint"].includes(f.key));
                const rvFieldKey = rvField?.key ?? "reasonForVisit";
                // Get value: check the found field key first, then common fallbacks
                const rv = formData[rvFieldKey] ?? formData.reason ?? formData.reasonForVisit ?? formData.chiefComplaint;
                // Error key = the actual field key that the form renders, so the error shows on the right field
                const errKey = rvFieldKey;
                if (!rv || (typeof rv === "string" && !rv.trim())) {
                    errors[errKey] = "Reason for Visit is required";
                } else if (typeof rv === "string" && /^\d+$/.test(rv.trim())) {
                    errors[errKey] = "Reason for Visit must contain letters, not just numbers";
                } else if (typeof rv === "string" && /^[^a-zA-Z]+$/.test(rv.trim())) {
                    errors[errKey] = "Reason for Visit must contain at least one letter";
                }
            }
            // Problems/Conditions: condition must contain letters, no special chars
            if (tabKey === "medicalproblems" || tabKey === "problems" || tabKey === "conditions" || tabKey === "issues") {
                for (const key of ["condition", "conditionName", "name", "code", "displayText"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim()) {
                        if (!/[A-Za-z]/.test(val.trim())) {
                            errors[key] = "Condition must contain at least one letter";
                        } else if (!/^[A-Za-z0-9\s\-.,/()':#&+]+$/.test(val.trim())) {
                            errors[key] = "Condition contains invalid special characters";
                        }
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
            // Education: topic/title must contain at least one letter and only valid characters
            if (tabKey === "education" || tabKey === "patient-education") {
                for (const key of ["topic", "title", "subject"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim()) {
                        if (!/[A-Za-z]/.test(val.trim())) {
                            errors[key] = "Topic/Title must contain at least one letter";
                        } else if (!/^[A-Za-z0-9\s\-_/()&.,:'!?@#"+]+$/.test(val.trim())) {
                            errors[key] = "Topic/Title contains invalid characters";
                        }
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
            // Labs: Result Date must not be before Collected Date
            if (tabKey === "labs" || tabKey === "lab" || tabKey === "laboratory") {
                const collected = formData.collectionDate || formData.collectedDate || formData.specimenCollectedDate || formData.effectiveDate || formData.orderDate;
                const result = formData.resultDate || formData.reportDate || formData.issuedDate || formData.issued;
                if (collected && result) {
                    const collectedDt = new Date(String(collected));
                    const resultDt = new Date(String(result));
                    if (!isNaN(collectedDt.getTime()) && !isNaN(resultDt.getTime()) && resultDt < collectedDt) {
                        const msg = "Result Date must be on or after Collected Date";
                        errors.resultDate = msg;
                        errors.reportDate = msg;
                        errors.issuedDate = msg;
                        errors.issued = msg;
                    }
                }
            }
            // Submissions / ERA / Remittance / Claims: Service To date must not be before Service From date
            if (tabKey === "era" || tabKey === "remittance" || tabKey === "eob" || tabKey === "era-remittance" || tabKey === "submissions" || tabKey === "claim-submissions" || tabKey === "claims" || tabKey === "claim") {
                const svcFrom = formData.serviceFrom || formData.serviceDateFrom || formData.serviceFromDate || formData.billablePeriodStart;
                const svcTo = formData.serviceTo || formData.serviceDateTo || formData.serviceToDate || formData.billablePeriodEnd;
                if (svcFrom && svcTo) {
                    const fromDt = new Date(String(svcFrom));
                    const toDt = new Date(String(svcTo));
                    if (!isNaN(fromDt.getTime()) && !isNaN(toDt.getTime()) && toDt < fromDt) {
                        const msg = "Service To must be on or after Service From";
                        errors.serviceTo = msg;
                        errors.serviceToDate = msg;
                        errors.serviceDateTo = msg;
                        errors.billablePeriodEnd = msg;
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
                // SSN — exactly 9 digits (covers any field key containing "ssn")
                for (const key of Object.keys(formData)) {
                    if (!["ssn", "ptssn", "socialSecurityNumber", "guarantorSsn", "guarantor_ssn"].includes(key) && !key.toLowerCase().includes("ssn")) continue;
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isValidSSN(val)) {
                        errors[key] = "SSN must be exactly 9 digits";
                    }
                }
                // Date of birth — must not be a future date
                for (const key of ["dateOfBirth", "dob", "birthDate", "birthdate", "birth_date", "date_of_birth", "ptDob", "patientDob"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim()) {
                        const parsed = new Date(val.includes("T") ? val : val + "T00:00:00");
                        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
                            errors[key] = "Date of birth cannot be a future date";
                        }
                    }
                }
                // All phone/mobile/fax fields — exactly 10 digits
                for (const key of Object.keys(formData)) {
                    const lk = key.toLowerCase();
                    if (lk.includes("phone") || lk.includes("mobile") || lk.includes("cell") || lk.includes("fax")) {
                        const val = formData[key];
                        if (typeof val === "string" && val.trim() && !isValidUSPhone(val)) {
                            errors[key] = "Mobile number must be exactly 10 digits";
                        }
                    }
                }
                // All email fields — must be valid email format
                for (const key of Object.keys(formData)) {
                    const lk = key.toLowerCase();
                    if (lk.includes("email")) {
                        const val = formData[key];
                        if (typeof val === "string" && val.trim() && !isValidEmail(val)) {
                            errors[key] = "Invalid email format";
                        }
                    }
                }
                // Emergency contact: name must be letters only
                for (const key of ["emergencyContactName", "emergency_contact_name", "ecName"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isStringOnly(val)) {
                        errors[key] = "Contact name must contain only letters";
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
                // Employer: occupation, industry, employer name — letters only (no pure numbers)
                for (const key of ["occupation", "industry", "employerName", "employer_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^\d+$/.test(val.trim())) {
                        errors[key] = `${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} must contain letters, not just numbers`;
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
            // Insurance-coverage field validation
            if (tabKey === "insurance-coverage") {
                // Copay amount — must be numeric
                for (const key of ["copay", "copayAmount", "copay_amount", "coPay", "coPayAmount"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && isNaN(Number(val))) {
                        errors[key] = "Copay amount must be a number";
                    }
                }
                // Subscriber name fields — letters only
                for (const key of ["subscriberFirstName", "subscriberLastName", "subscriber_first_name", "subscriber_last_name", "subscriberName", "subscriber_name"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !isValidName(val)) {
                        errors[key] = "Name must contain only letters";
                    }
                }
                // Subscriber phone — exactly 10 digits
                for (const key of Object.keys(formData)) {
                    const lk = key.toLowerCase();
                    if (lk.includes("subscriber") && (lk.includes("phone") || lk.includes("mobile") || lk.includes("cell"))) {
                        const val = formData[key];
                        if (typeof val === "string" && val.trim() && !isValidUSPhone(val)) {
                            errors[key] = "Mobile number must be exactly 10 digits";
                        }
                    }
                }
            }
            // Referrals: referTo and reason must be alphanumeric (not purely numeric/special)
            if (tabKey === "referrals" || tabKey === "referral") {
                for (const key of ["referTo", "referredTo", "referralTo", "refer_to", "referred_to"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^[^a-zA-Z]+$/.test(val.trim())) {
                        errors[key] = "Refer To must contain at least one letter";
                    }
                }
                for (const key of ["reason", "referralReason", "referral_reason", "reasonForReferral"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^[^a-zA-Z]+$/.test(val.trim())) {
                        errors[key] = "Reason must contain at least one letter";
                    }
                }
            }
            // Insurance: end date must not be before effective date
            if (tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") {
                const effKeys = ["effectiveDate", "policyEffectiveDate", "effective_date", "policy_effective_date", "startDate", "start_date", "periodStart", "period_start"];
                const endKeys = ["endDate", "policyEndDate", "end_date", "policy_end_date", "expirationDate", "expiration_date", "periodEnd", "period_end"];
                let effVal: string | undefined;
                let endVal: string | undefined;
                let endKey: string | undefined;
                for (const k of effKeys) { if (formData[k] && String(formData[k]).trim()) { effVal = String(formData[k]).trim(); break; } }
                for (const k of endKeys) { if (formData[k] && String(formData[k]).trim()) { endVal = String(formData[k]).trim(); endKey = k; break; } }
                if (effVal && endVal && endKey && endVal < effVal) {
                    errors[endKey] = "End Date cannot be before Effective Date";
                }
            }
            // Insurance: groupNumber and policyNumber/memberId — alphanumeric only
            if (tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") {
                for (const key of ["groupNumber", "group_number", "groupNo", "group", "groupId"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !/^[A-Za-z0-9]+$/.test(val.trim())) {
                        errors[key] = "Group Number must contain only letters and numbers";
                    }
                }
                for (const key of ["memberId", "memberNumber", "subscriberId", "idNo", "policyNumber", "policyNo", "member_id", "policy_number"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !/^[A-Za-z0-9]+$/.test(val.trim())) {
                        errors[key] = "Policy/Member Number must contain only letters and numbers";
                    }
                }
            }
            // Authorizations: memberId must be alphanumeric
            if (tabKey === "prior-auth" || tabKey === "prior-authorizations" || tabKey === "priorauth" || tabKey === "prior_authorizations" || tabKey === "authorizations") {
                for (const key of ["memberId", "memberNumber", "subscriberId", "policyNumber"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && !/^[A-Za-z0-9\-\s]+$/.test(val.trim())) {
                        errors[key] = "Member ID must be alphanumeric";
                    }
                }
            }
            // Appointments: reason/cancellationReason alphanumeric; duration numeric
            if (tabKey === "appointments" || tabKey === "appointment") {
                for (const key of ["reason", "appointmentReason", "appointment_reason"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^[^a-zA-Z]+$/.test(val.trim())) {
                        errors[key] = "Reason must contain at least one letter";
                    }
                }
                for (const key of ["cancellationReason", "cancellation_reason", "cancelReason", "cancelationReason"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^[^a-zA-Z]+$/.test(val.trim())) {
                        errors[key] = "Cancellation reason must contain at least one letter";
                    }
                }
                for (const key of ["duration", "durationMinutes", "appointmentDuration"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && isNaN(Number(val))) {
                        errors[key] = "Duration must be a number";
                    }
                }
                // Validate End Date >= Start Date
                const startRaw = formData.startDate || formData.start || formData["period.start"];
                const endRaw = formData.endDate || formData.end || formData["period.end"];
                if (startRaw && endRaw) {
                    const s = new Date(startRaw as string);
                    const e = new Date(endRaw as string);
                    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) {
                        const endKey = formData.endDate !== undefined ? "endDate" : formData.end !== undefined ? "end" : "period.end";
                        errors[endKey] = "End date/time cannot be before start date/time";
                    }
                }
            }
            // Medications: name must be alphanumeric; dosage must be numeric
            if (tabKey === "medications" || tabKey === "medication" || tabKey === "prescriptions" || tabKey === "prescription") {
                for (const key of ["medicationName", "medication", "medication_name", "name", "drugName"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^[^a-zA-Z]+$/.test(val.trim())) {
                        errors[key] = "Medication name must contain at least one letter";
                    }
                }
                for (const key of ["dosage", "dose", "doseQuantity", "doseAmount"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && isNaN(Number(val))) {
                        errors[key] = "Dosage must be a number";
                    }
                }
            }
            // Labs: test name must be alphanumeric (not purely numeric)
            if (tabKey === "labs" || tabKey === "lab" || tabKey === "lab-results" || tabKey === "labresults" || tabKey === "lab-orders" || tabKey === "laborders") {
                for (const key of ["testName", "test_name", "labName", "lab_name", "name", "displayText", "observationName"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^[^a-zA-Z]+$/.test(val.trim())) {
                        errors[key] = "Test name must contain at least one letter";
                    }
                }
            }
            // Family history: condition/description must be alphanumeric (not purely numeric)
            if (tabKey === "family-history" || tabKey === "familyhistory" || tabKey === "familyHistory" || tabKey === "history" || tabKey === "medical-history" || tabKey === "familymedicalhistory") {
                for (const key of ["condition", "familyHistory", "family_history", "relationship", "description", "name", "conditionName"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^[^a-zA-Z]+$/.test(val.trim())) {
                        const label = (key === "familyHistory" || key === "family_history") ? "Family history" : key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
                        errors[key] = `${label} must contain at least one letter`;
                    }
                }
            }
            // Facility: name must be letters only, phone must be 10 digits
            if (tabKey === "facility" || tabKey === "facilities" || tabKey === "location" || tabKey === "locations" || tabKey === "serviceLocation" || tabKey === "serviceLocations") {
                for (const key of ["name", "facilityName", "facility_name", "locationName"]) {
                    const val = formData[key];
                    if (typeof val === "string" && val.trim() && /^\d+$/.test(val.trim())) {
                        errors[key] = "Facility name must contain at least one letter";
                    }
                }
                for (const key of Object.keys(formData)) {
                    const lk = key.toLowerCase();
                    if ((lk.includes("phone") || lk.includes("mobile") || lk.includes("cell")) && !lk.includes("fax")) {
                        const val = formData[key];
                        if (typeof val === "string" && val.trim() && !isValidUSPhone(val)) {
                            errors[key] = "Mobile number must be exactly 10 digits";
                        }
                    }
                }
            }
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setError("Please correct the highlighted fields");
                savingRef.current = false;
                return;
            }
        }
        setValidationErrors({});
        setSaving(true);
        setError(null);
        try {
            const isUploadPreCreated = !((mode === "edit") && selectedRecord) && tabKey === "documents" && !!uploadedDocFhirIdRef.current;
            const isEdit = ((mode === "edit") && !!selectedRecord) || isUploadPreCreated;
            const resourceId = isUploadPreCreated
                ? uploadedDocFhirIdRef.current
                : (isEdit && selectedRecord ? (selectedRecord.fhirId || selectedRecord.id) : null);
            if (isUploadPreCreated) uploadedDocFhirIdRef.current = null;

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
            if (tabKey === "insurance-coverage" || tabKey === "insurance" || tabKey === "coverage") {
                // Ensure backend gets period.start/end from policyEffectiveDate/policyEndDate
                if (payload.policyEffectiveDate && !payload.coverageStartDate) payload.coverageStartDate = payload.policyEffectiveDate;
                if (payload.policyEndDate && !payload.coverageEndDate) payload.coverageEndDate = payload.policyEndDate;
                if (payload.effectiveDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.effectiveDate;
                if (payload.endDate && !payload.policyEndDate) payload.policyEndDate = payload.endDate;
                if (payload.startDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.startDate;
                // Ensure planName is mapped to all possible backend field names
                if (payload.planName && !payload.plan) payload.plan = payload.planName;
                if (payload.planName && !payload.coveragePlan) payload.coveragePlan = payload.planName;
                if (payload.plan && !payload.planName) payload.planName = payload.plan;
                if (payload.coveragePlan && !payload.planName) payload.planName = payload.coveragePlan;
            }
            if (tabKey === "documents") {
                if (payload.documentDate && !payload.date) payload.date = payload.documentDate;
                if (payload.date && !payload.documentDate) payload.documentDate = payload.date;
                if (payload.content === "" || payload.content == null) delete payload.content;
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
            if (tabKey === "allergies" || tabKey === "allergy-intolerances") {
                // Validate end date is not before onset date
                const allergyOnset = payload.onsetDate || payload.onsetDateTime || payload.onset;
                const allergyEnd = payload.endDate || payload.end || payload.abatementDate || payload.abatement;
                if (allergyOnset && allergyEnd) {
                    const onsetDt = new Date(String(allergyOnset));
                    const endDt = new Date(String(allergyEnd));
                    if (!isNaN(onsetDt.getTime()) && !isNaN(endDt.getTime()) && endDt < onsetDt) {
                        setValidationErrors({ endDate: "End date must be after onset date" });
                        setError("End date must be after onset date");
                        setSaving(false);
                        return;
                    }
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
                // Check both "reaction" and "manifestation" field keys since form config may use either
                const reactionValue = (typeof payload.reaction === "string" && payload.reaction) ||
                    (typeof payload.manifestation === "string" && payload.manifestation) ||
                    (typeof payload.reactionDisplay === "string" && payload.reactionDisplay);
                if (reactionValue) {
                    payload.reaction = [{ manifestation: [wrapCoding(reactionValue, allergySystem)] }];
                    // Clean up alternate keys so they don't get sent as separate fields
                    delete payload.manifestation;
                    delete payload.reactionDisplay;
                }
                // Ensure verificationStatus and clinicalStatus have proper FHIR coding systems
                if (!payload.verificationStatus) {
                    payload.verificationStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "confirmed" }] };
                } else if (typeof payload.verificationStatus === "string") {
                    payload.verificationStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: payload.verificationStatus.toLowerCase() }] };
                }
                if (!payload.clinicalStatus) {
                    payload.clinicalStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }] };
                } else if (typeof payload.clinicalStatus === "string") {
                    payload.clinicalStatus = { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: payload.clinicalStatus.toLowerCase() }] };
                }
                if (!payload.category) payload.category = ["medication"];
                if (!payload.type) payload.type = "allergy";
                // Ensure patient reference is always included (required for FHIR AllergyIntolerance)
                if (!payload.patient) payload.patient = { reference: `Patient/${patientId}` };
                // Map common field names to FHIR-expected names for edits
                if (payload.allergyName && !payload.code) payload.code = wrapCoding(payload.allergyName, "http://snomed.info/sct");
                if (payload.severity && typeof payload.severity === "string" && !payload.criticality) payload.criticality = payload.severity;
                if (payload.onsetDate && !payload.onsetDateTime) payload.onsetDateTime = payload.onsetDate;
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
                // Map URL fields for video/article links
                if (payload.url && !payload.externalUrl) payload.externalUrl = payload.url;
                if (payload.externalUrl && !payload.url) payload.url = payload.externalUrl;
                if (payload.videoUrl && !payload.externalUrl) payload.externalUrl = payload.videoUrl;
                if (payload.articleUrl && !payload.externalUrl) payload.externalUrl = payload.articleUrl;
                if (payload.link && !payload.externalUrl) payload.externalUrl = payload.link;
            }

            // Issue 9 via generic tab: Appointments — add participant + wrap appointmentType
            if (tabKey === "appointments") {
                if (payload.appointmentType && typeof payload.appointmentType === "string") {
                    payload.appointmentType = wrapCoding(payload.appointmentType, "http://terminology.hl7.org/CodeSystem/v2-0276");
                }
                // Use simple string references — backend converts to FHIR Reference objects.
                // Sending nested {reference:...} objects causes Java Map.toString() serialisation
                // which produces "{reference=Patient/123}" and HAPI rejects it (HAPI-0931).
                const patRef = `Patient/${patientId}`;
                const patDisplay = patientName || String(patientId);
                // Set patient as simple string reference
                payload.patient = patRef;
                // Build participant array with simple string actor references
                const existingParticipants = Array.isArray(payload.participant) ? payload.participant : [];
                // Keep only practitioner/location participants
                const nonPatient = existingParticipants.filter((p: any) => {
                    const ref: string = (typeof p?.actor === "object" ? p.actor?.reference : String(p?.actor || ""));
                    if (!ref || ref.startsWith("Patient/")) return false;
                    if (!ref.includes("/")) return false; // plain name string
                    return true;
                });
                // Flatten any nested actor objects to simple string references
                const cleaned = nonPatient.map((p: any) => ({
                    ...p,
                    actor: typeof p?.actor === "object" ? (p.actor.reference || String(p.actor)) : String(p?.actor || ""),
                }));
                // Add provider participant if set in form fields
                const provId = payload.provider || payload.providerId || payload.practitioner || payload.practitionerId || '';
                const provRef = typeof provId === 'string' && provId.includes('/') ? provId
                    : (provId ? `Practitioner/${provId}` : '');
                const hasProviderParticipant = cleaned.some((p: any) => String(p.actor || '').startsWith('Practitioner/'));
                if (provRef && !hasProviderParticipant) {
                    cleaned.push({ actor: provRef, required: "required", status: "accepted" });
                }
                // Set provider as simple string reference for the backend
                if (provRef) payload.provider = provRef;

                // Add location participant if set in form fields
                const locId = payload.location || payload.locationId || '';
                const locRef = typeof locId === 'string' && locId.includes('/') ? locId
                    : (locId ? `Location/${locId}` : '');
                const hasLocationParticipant = cleaned.some((p: any) => String(p.actor || '').startsWith('Location/'));
                if (locRef && !hasLocationParticipant) {
                    cleaned.push({ actor: locRef, required: "required", status: "accepted" });
                }
                // Set location as simple string reference for the backend
                if (locRef) payload.location = locRef;

                payload.participant = [
                    ...cleaned,
                    { actor: patRef, required: "required", status: "accepted" },
                ];
                // Remove display-name-only patient fields so the backend cannot use them
                delete payload.patientName;
                delete payload.patientRef;
                // Normalise patientId to the numeric prop value
                payload.patientId = patientId;
                // Set subject as simple string reference
                payload.subject = patRef;

                // Combine separate date+time fields into FHIR start/end ISO datetime strings
                // so the appointment appears correctly in the main Appointments table and Calendar.
                const startDateVal = payload.appointmentStartDate || payload.startDate || '';
                const startTimeVal = payload.appointmentStartTime || payload.startTime || '';
                const endDateVal = payload.appointmentEndDate || payload.endDate || startDateVal || '';
                const endTimeVal = payload.appointmentEndTime || payload.endTime || '';
                if (startDateVal && startTimeVal && !payload.start) {
                    const dt = new Date(`${startDateVal}T${startTimeVal}:00`);
                    if (!isNaN(dt.getTime())) {
                        const off = -dt.getTimezoneOffset();
                        const sign = off >= 0 ? '+' : '-';
                        const absOff = Math.abs(off);
                        const oh = String(Math.floor(absOff / 60)).padStart(2, '0');
                        const om = String(absOff % 60).padStart(2, '0');
                        const p2 = (n: number) => String(n).padStart(2, '0');
                        payload.start = `${dt.getFullYear()}-${p2(dt.getMonth()+1)}-${p2(dt.getDate())}T${p2(dt.getHours())}:${p2(dt.getMinutes())}:${p2(dt.getSeconds())}${sign}${oh}:${om}`;
                    }
                }
                if (endDateVal && endTimeVal && !payload.end) {
                    const dt = new Date(`${endDateVal}T${endTimeVal}:00`);
                    if (!isNaN(dt.getTime())) {
                        const off = -dt.getTimezoneOffset();
                        const sign = off >= 0 ? '+' : '-';
                        const absOff = Math.abs(off);
                        const oh = String(Math.floor(absOff / 60)).padStart(2, '0');
                        const om = String(absOff % 60).padStart(2, '0');
                        const p2 = (n: number) => String(n).padStart(2, '0');
                        payload.end = `${dt.getFullYear()}-${p2(dt.getMonth()+1)}-${p2(dt.getDate())}T${p2(dt.getHours())}:${p2(dt.getMinutes())}:${p2(dt.getSeconds())}${sign}${oh}:${om}`;
                    }
                }

                // Ensure status defaults to Scheduled if not set
                if (!payload.status) payload.status = "Scheduled";
            }

            // Issue 4: Insurance Coverage — ensure period/coding structures
            if (tabKey === "insurance-coverage" || tabKey === "insurance") {
                if (payload.policyEffectiveDate && !payload.coverageStartDate) payload.coverageStartDate = payload.policyEffectiveDate;
                if (payload.policyEndDate && !payload.coverageEndDate) payload.coverageEndDate = payload.policyEndDate;
                if (payload.effectiveDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.effectiveDate;
                if (payload.endDate && !payload.policyEndDate) payload.policyEndDate = payload.endDate;
                if (payload.startDate && !payload.policyEffectiveDate) payload.policyEffectiveDate = payload.startDate;
                // Ensure planName is mapped to all possible backend field names
                if (payload.planName) { if (!payload.plan) payload.plan = payload.planName; if (!payload.coveragePlan) payload.coveragePlan = payload.planName; }
                if (payload.plan && !payload.planName) payload.planName = payload.plan;
                if (payload.coveragePlan && !payload.planName) payload.planName = payload.coveragePlan;
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
                if (payload.provider && typeof payload.provider === "object" && typeof payload.provider.reference === "string") {
                    payload.provider = payload.provider.reference.replace(/^(Practitioner\/)+/, "Practitioner/");
                }
                if (payload.provider && typeof payload.provider === "string") {
                    payload.provider = payload.provider.startsWith("Practitioner/") ? payload.provider : `Practitioner/${payload.provider}`;
                    payload.provider = payload.provider.replace(/^(Practitioner\/)+/, "Practitioner/");
                }
                if (!payload.patient) payload.patient = { reference: `Patient/${patientId}` };
                if (!payload.type) payload.type = wrapCoding("professional", "http://terminology.hl7.org/CodeSystem/claim-type");
                if (!payload.use) payload.use = "claim";
                if (!payload.status) payload.status = "active";
                if (!payload.priority) payload.priority = wrapCoding("normal", "http://terminology.hl7.org/CodeSystem/processpriority");
            }

            // Issues 17, 21: Claims & Transactions — add Claim.provider + patient
            if (tabKey === "claims" || tabKey === "transactions") {
                if (payload.provider && typeof payload.provider === "object" && typeof payload.provider.reference === "string") {
                    payload.provider = payload.provider.reference.replace(/^(Practitioner\/)+/, "Practitioner/");
                }
                if (payload.provider && typeof payload.provider === "string") {
                    payload.provider = payload.provider.startsWith("Practitioner/") ? payload.provider : `Practitioner/${payload.provider}`;
                    payload.provider = payload.provider.replace(/^(Practitioner\/)+/, "Practitioner/");
                }
                if (!payload.patient) payload.patient = { reference: `Patient/${patientId}` };
                if (!payload.type) payload.type = wrapCoding("professional", "http://terminology.hl7.org/CodeSystem/claim-type");
                if (!payload.use) payload.use = "claim";
                if (!payload.status) payload.status = "active";
                if (!payload.priority) payload.priority = wrapCoding("normal", "http://terminology.hl7.org/CodeSystem/processpriority");
            }

            // Issue 18: Claim Submissions — add Claim.provider
            if (tabKey === "submissions" || tabKey === "claim-submissions") {
                if (payload.provider && typeof payload.provider === "object" && typeof payload.provider.reference === "string") {
                    payload.provider = payload.provider.reference.replace(/^(Practitioner\/)+/, "Practitioner/");
                }
                if (payload.provider && typeof payload.provider === "string") {
                    payload.provider = payload.provider.startsWith("Practitioner/") ? payload.provider : `Practitioner/${payload.provider}`;
                    payload.provider = payload.provider.replace(/^(Practitioner\/)+/, "Practitioner/");
                }
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

            const primaryUrl = isEdit
                ? `${API_BASE()}/api/fhir-resource/${resourceKey}/patient/${patientId}/${resourceId}`
                : `${API_BASE()}/api/fhir-resource/${resourceKey}/patient/${patientId}`;

            let res = await fetchWithAuth(primaryUrl, {
                method: isEdit ? "PUT" : "POST",
                headers: saveHeaders,
                body: JSON.stringify(payload),
            });

            // Fallback endpoints for billing/claims/transactions if primary PUT fails
            if (!res.ok && isEdit && resourceId && ["billing", "claims", "transactions"].includes(tabKey)) {
                const altUrls = tabKey === "billing"
                    ? [
                        `${API_BASE()}/api/invoices/${resourceId}`,
                        `${API_BASE()}/api/billing/${resourceId}`,
                      ]
                    : [
                        `${API_BASE()}/api/all-claims/${resourceId}`,
                        `${API_BASE()}/api/claims/${resourceId}`,
                      ];
                for (const altUrl of altUrls) {
                    for (const method of ["PATCH", "PUT"] as const) {
                        try {
                            const altRes = await fetchWithAuth(altUrl, { method, headers: saveHeaders, body: JSON.stringify(payload) });
                            if (altRes.ok) { res = altRes; break; }
                        } catch { /* try next */ }
                    }
                    if (res.ok) break;
                }
            }

            if (res.ok) {
                const isMessaging = tabKey === "messaging";
                const label = isMessaging ? "sent" : (isEdit ? "updated" : "saved");
                const json = await res.json();
                const savedData = normalizeRecord(json.data || formData);
                if (singleRecord) {
                    // Stay in view mode for single-record tabs
                    setFormData({ ...savedData });
                    setSelectedRecord(savedData);
                    setMode("view");
                } else {
                    // Optimistic local update for edits — replace the existing record in-place
                    if (isEdit) {
                        setRecords(prev => prev.map(r => (r.id || r.fhirId) === (savedData.id || savedData.fhirId) ? savedData : r));
                    }
                    // For new records, skip optimistic add to avoid duplicates when the
                    // background re-fetch returns the same record from the server.
                    setMode("list");
                    setFormData({});
                    setSelectedRecord(null);
                }
                const successText = isMessaging ? "Message sent successfully" : `Record ${label} successfully`;
                setSuccessMsg(successText);
                toast.success(successText);
                setTimeout(() => setSuccessMsg(null), 5000);
                // Notify appointments page and calendar to refresh
                if (tabKey === "appointments" || tabKey === "appointment") {
                    window.dispatchEvent(new Event("appointments-changed"));
                }
                // Background re-fetch from server after FHIR indexing (non-blocking)
                const refreshDelay = isEdit ? 1000 : 2000;
                setTimeout(async () => {
                    try {
                        setPage(0);
                        await fetchRecords(0);
                    } catch { /* silent — optimistic data already shown */ }
                }, refreshDelay);
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
            savingRef.current = false;
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
        const result = formatDisplayDate(val);
        return result || null;
    };

    const tryFormatDatetime = (val: string): string | null => {
        if (!val) return null;
        const result = formatDisplayDateTime(val);
        return result || null;
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

        // History tab: show smokingStatus instead of generic status badge
        if ((tabKey === "history" || tabKey === "medicalhistory" || tabKey === "medical-history") && colKey === "status" && record) {
            const smokingStatus = record.smokingStatus || record.smoking_status || record.tobaccoStatus || record.socialHistory?.smokingStatus;
            if (smokingStatus && typeof smokingStatus === "string") {
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{smokingStatus}</span>;
            }
            return "-";
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
                    // Array of CodeableConcepts — show ALL items, not just the first
                    if (first.coding || first.text) {
                        const labels: string[] = [];
                        for (const item of value) {
                            const d = item?.coding?.[0]?.display || item?.coding?.[0]?.code || (typeof item?.text === "string" ? item.text : null);
                            if (typeof d === "string") labels.push(d);
                        }
                        if (labels.length > 0) return labels.join(", ");
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
                    return value.join(", ");
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
        // Render image URLs as actual images for photo/avatar fields
        if (typeof colKey === "string" && /photo|image|avatar|picture|pic$|img$|imgurl/i.test(colKey)) {
            if (str.startsWith("http") || str.startsWith("/") || str.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(str)) {
                return <img src={str} alt="Profile" className="w-8 h-8 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
            }
        }
        // Render URL strings as clickable links (for education URLs, website fields, etc.)
        if (typeof colKey === "string" && /^(url|externalUrl|videoUrl|articleUrl|link|resourceUrl|website|websiteUrl|web_url)$/i.test(colKey)) {
            if (str.startsWith("http://") || str.startsWith("https://")) {
                const display = str.length > 60 ? str.substring(0, 60) + "..." : str;
                return <a href={str} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{display}</a>;
            }
        }
        return str.length > 120 ? str.substring(0, 120) + "..." : str;
        } catch { return "-"; }
    };

    // Extract unique statuses for filter dropdown
    const isAllergyTab = tabKey === "allergies" || tabKey === "allergy-intolerances";
    const isMedicalProblemsTab = tabKey === "medicalproblems" || tabKey === "medical-problems" || tabKey === "conditions" || tabKey === "issues" || tabKey === "problems";
    const isStatusTab = isAllergyTab || isMedicalProblemsTab;
    const isDemographicsTab = tabKey === "demographics" || tabKey === "patient-demographics" || tabKey === "portal-demographics";

    // Helper: extract plain string status from a record (CodeableConcepts already flattened by normalizeRecord)
    const getRecordStatus = (r: Record<string, any>): string => {
        const v = isStatusTab
            ? (r.clinicalStatus || r.status || r.verificationStatus || "")
            : (r.status || r.clinicalStatus || r.verificationStatus || "");
        return typeof v === "string" ? v : "";
    };

    // Gather predefined options from the fieldConfig's clinicalStatus / status select field
    const configStatusOptions = React.useMemo(() => {
        // For allergies, always use the standard FHIR clinical status values (title-cased)
        if (isAllergyTab) return ["Active", "Inactive", "Resolved"];
        const isEducationTab = tabKey === "education" || tabKey === "patient-education" || tabKey === "patient_education";
        if (isEducationTab) return ["Completed", "In Progress", "Preparation", "Not Done", "On Hold", "Assigned", "Viewed", "Dismissed"];
        // For medical problems, always use these 3 standard options
        if (isMedicalProblemsTab) return ["Active", "Inactive", "Resolved"];
        if (!fieldConfig) return [] as string[];
        return [] as string[];
    }, [isAllergyTab, isMedicalProblemsTab, fieldConfig]);

    const uniqueStatuses = React.useMemo(() => {
        const seen = new Map<string, string>(); // lowercase -> display value
        // Always include options defined in the field config (so user can filter even if all records share one status)
        for (const opt of configStatusOptions) {
            const key = opt.toLowerCase();
            if (!seen.has(key)) seen.set(key, opt);
        }
        // Add any values actually present in the current records (skip if same value already from config)
        for (const r of records) {
            const s = getRecordStatus(r);
            if (s && !seen.has(s.toLowerCase())) seen.set(s.toLowerCase(), s);
        }
        return Array.from(seen.values()).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records, isStatusTab, configStatusOptions]);

    // Filter records by search term and status
    const filteredRecords = React.useMemo(() => {
        let result = records;
        if (statusFilter) {
            result = result.filter((r) => getRecordStatus(r).toLowerCase() === statusFilter.toLowerCase());
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter((r) =>
                Object.entries(r).some(([, v]) => {
                    if (v == null) return false;
                    if (typeof v === "string") return v.toLowerCase().includes(term);
                    if (typeof v === "number" || typeof v === "boolean") return String(v).toLowerCase().includes(term);
                    if (typeof v === "object" && !Array.isArray(v)) {
                        return Object.values(v).some((nested) =>
                            nested != null && String(nested).toLowerCase().includes(term)
                        );
                    }
                    return String(v).toLowerCase().includes(term);
                })
            );
        }
        return result;
    }, [records, searchTerm, statusFilter]);

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
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-lg disabled:opacity-50 ${tabKey === "messaging" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : tabKey === "messaging" ? <Send className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        {saving ? (tabKey === "messaging" ? "Sending..." : "Saving...") : (tabKey === "messaging" ? "Send" : "Save")}
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
                            formData={decoratedFormData}
                            onChange={handleFieldChange}
                            readOnly={mode === "view"}
                            errors={validationErrors}
                            patientId={patientId}
                            onPreCreatedId={tabKey === "documents" ? (id) => { uploadedDocFhirIdRef.current = id; } : undefined}
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
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-lg disabled:opacity-50 ${tabKey === "messaging" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : tabKey === "messaging" ? <Send className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {saving ? (tabKey === "messaging" ? "Sending..." : "Saving...") : (tabKey === "messaging" ? "Send" : "Save")}
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
                            formData={decoratedFormData}
                            onChange={handleFieldChange}
                            readOnly={mode === "view"}
                            errors={validationErrors}
                            patientId={patientId}
                            onPreCreatedId={tabKey === "documents" ? (id) => { uploadedDocFhirIdRef.current = id; } : undefined}
                        />
                    )}
                    {/* Send channel selector for messaging tab */}
                    {tabKey === "messaging" && mode !== "view" && (
                        <div className="mt-4 p-4 border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Send via</label>
                            <div className="flex gap-3 flex-wrap">
                                {[
                                    { value: "in-app", label: "In-App Message", icon: "💬" },
                                    { value: "email", label: "Email", icon: "✉️" },
                                    { value: "sms", label: "SMS", icon: "📱" },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleFieldChange("sendVia", opt.value)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                                            (formData.sendVia || "in-app") === opt.value
                                                ? "border-blue-500 bg-blue-600 text-white"
                                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-300"
                                        }`}
                                    >
                                        <span>{opt.icon}</span>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* File upload for reports tab only (documents tab uses the form file field) */}
                    {(tabKey === "report" || tabKey === "reports") && mode !== "view" && (
                        <div className="mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Upload Report Document
                            </label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dicom,.csv,.xls,.xlsx,.txt,.zip"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const fd = new FormData();
                                    fd.append("file", file);
                                    fd.append("patientId", String(patientId));
                                    fd.append("category", "report");
                                    try {
                                        const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
                                        // Try multiple upload endpoints with fallbacks
                                        const endpoints = [
                                            `${base}/api/files-proxy/upload`,
                                            `${base}/api/documents/upload`,
                                            `${base}/api/fhir-resource/documents/upload`,
                                            `${base}/api/file/upload`,
                                        ];
                                        let res: Response | null = null;
                                        for (const ep of endpoints) {
                                            try {
                                                const uploadFd = new FormData();
                                                uploadFd.append("file", file);
                                                uploadFd.append("patientId", String(patientId));
                                                uploadFd.append("category", "report");
                                                const attempt = await fetchWithAuth(ep, {
                                                    method: "POST",
                                                    body: uploadFd,
                                                });
                                                if (attempt.ok) { res = attempt; break; }
                                                if (!res || res.status >= 500) res = attempt;
                                            } catch { /* try next endpoint */ }
                                        }
                                        if (res && res.ok) {
                                            const json = await res.json();
                                            const data = json.data || json;
                                            const url = data.url || data.fileUrl || data.fileId || data.id || "";
                                            handleFieldChange("documentUrl", url);
                                            handleFieldChange("fileUrl", url);
                                            handleFieldChange("attachment", url);
                                            handleFieldChange("content", url);
                                            handleFieldChange("fileName", file.name);
                                            setSuccessMsg(`File "${file.name}" uploaded successfully.`);
                                        } else {
                                            const errJson = res ? await res.json().catch(() => ({})) : {};
                                            setError(errJson?.message || `Upload failed${res ? ` (${res.status})` : ""}. Please try again.`);
                                        }
                                    } catch (err) {
                                        console.error("Report file upload error:", err);
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
                            placeholder={(tabKey === "allergies" || tabKey === "allergy-intolerances") ? "Search by Allergy..." : "Search..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
                        />
                    </div>
                    {uniqueStatuses.length > 0 && !isDemographicsTab && !["medications", "medication-requests", "history", "social-history", "socialhistory", "medical-history"].includes(tabKey) && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{isStatusTab ? "All Clinical Statuses" : "All Statuses"}</option>
                            {uniqueStatuses.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    )}
                    <span className="text-xs text-gray-400">{totalElements} records</span>
                </div>
                {canWrite && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        {(tabKey === "report" || tabKey === "reports") ? "Upload Report" : (tabKey === "documents" || tabKey === "document-references") ? "Upload Document" : "Add"}
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
                        <table className="w-full text-sm table-auto">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    {cols.map((col) => (
                                        <th
                                            key={col.key}
                                            className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
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
                                                className="px-4 py-2.5 text-gray-700 dark:text-gray-300 break-words max-w-[300px]"
                                            >
                                                {(() => {
                                                    try {
                                                    const raw = record[col.key];
                                                    const fv = formatValue(raw, col.key, record);
                                                    // Format comma-separated values as a clean list for readability (no bullet symbols)
                                                    if (typeof fv === "string" && fv.includes(",") && fv.length > 30) {
                                                        const items = fv.split(",").map((s: string) => s.trim()).filter(Boolean);
                                                        if (items.length > 1) {
                                                            return <div className="space-y-0.5">{items.map((item: string, i: number) => <div key={i} className="text-sm">{item}</div>)}</div>;
                                                        }
                                                    }
                                                    // Safely stringify non-React objects to prevent render crashes
                                                    if (fv !== null && fv !== undefined && typeof fv === "object") {
                                                        try { if (!("$$typeof" in (fv as object))) return JSON.stringify(fv); } catch { return "-"; }
                                                    }
                                                    if (fv == null) return "-";
                                                    if (typeof fv === "string" || typeof fv === "number" || typeof fv === "boolean") return String(fv);
                                                    return fv;
                                                    } catch { return "-"; }
                                                })()}
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

            {/* Custom delete confirmation dialog */}
            {deleteConfirmRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Record</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                            Are you sure you want to delete this record?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmRecord(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
