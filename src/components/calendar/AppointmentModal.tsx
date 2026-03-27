
"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";
import { usePermissions } from "@/context/PermissionContext";
import DateInput from "@/components/ui/DateInput";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

/* =========================
 * Types
 * ======================= */
type Priority = "Routine" | "Urgent";

interface StatusOption {
    value: string;
    label: string;
    color?: string;
    order?: number;
}

const FALLBACK_STATUS_OPTIONS: StatusOption[] = [
    { value: 'Scheduled',     label: 'Scheduled' },
    { value: 'Confirmed',     label: 'Confirmed' },
    { value: 'Checked-in',    label: 'Checked-in' },
    { value: 'Completed',     label: 'Completed' },
    { value: 'Re-Scheduled',  label: 'Re-Scheduled' },
    { value: 'No Show',       label: 'No Show' },
    { value: 'Cancelled',     label: 'Cancelled' },
];

type Option<T extends string = string> = { value: T; label: string };

interface Patient {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    identification?: { firstName?: string | null; lastName?: string | null } | null;
    dateOfBirth?: string | null;
}

interface Provider {
    id: number;
    identification?: { firstName?: string; lastName?: string } | null;
    systemAccess?: { status?: string } | null;
}

interface Location {
    id: number;
    name: string;
    address?: string;
}

interface VisitType {
    activity: number;
    seq: number;
    title: string;
}

/* Schedules from backend */
type ScheduleRecurrence = {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    interval: number;
    byWeekday?: string[];
    startDate: string; // yyyy-MM-dd
    endDate?: string;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    locationId?: string;
};

type Schedule = {
    id: number;
    providerId: number;
    status: string; // 'active' | ...
    start?: string; // ISO (one-time)
    end?: string; // ISO (one-time)
    recurrence?: ScheduleRecurrence | null;
    actorReferences?: string[];
};

/* =========================
 * Helpers
 * ======================= */
const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const getPatientFullName = (p: Patient) => {
    const first = (p.firstName ?? p.identification?.firstName ?? "")?.trim();
    const last = (p.lastName ?? p.identification?.lastName ?? "")?.trim();
    return `${first} ${last}`.trim();
};

const formatInputToMMDDYYYY = (val: string): string => {
    const digits = val.replace(/\D/g, "");
    let res = "";
    if (digits.length > 0) res += digits.substring(0, 2);
    if (digits.length >= 3) res += "/" + digits.substring(2, 4);
    if (digits.length >= 5) res += "/" + digits.substring(4, 8);
    return res;
};


const toISODateFromMMDDYYYY = (val: string): string => {
    const parts = val.split("/");
    if (parts.length === 3) {
        const [mm, dd, yyyy] = parts;
        if (mm && dd && yyyy) return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return "";
};

/// join yyyy-mm-dd + HH:mm into local string
const combineLocal = (ymd: string, hm: string) => (ymd && hm ? `${ymd}T${hm}` : "");

// Format local datetime string as ISO with timezone offset (e.g. "2026-03-17T10:00:00+05:30")
// Prevents backend from misinterpreting local time as UTC
const toLocalISOWithOffset = (localDT: string): string => {
    const d = new Date(`${localDT}:00`);
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const absOff = Math.abs(off);
    const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
    const mm = String(absOff % 60).padStart(2, '0');
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${hh}:${mm}`;
};

const addMinutes = (hm: string, mins: number): string => {
    const [h, m] = hm.split(":").map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
};

// math helpers
const daysBetween = (aYmd: string, bYmd: string) => {
    const a = new Date(`${aYmd}T00:00:00`);
    const b = new Date(`${bYmd}T00:00:00`);
    return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
};
const monthsBetween = (startYmd: string, targetYmd: string) => {
    const s = new Date(`${startYmd}T00:00:00`);
    const t = new Date(`${targetYmd}T00:00:00`);
    return (t.getFullYear() - s.getFullYear()) * 12 + (t.getMonth() - s.getMonth());
};
const hmToMinutes = (hm: string) => {
    const [h, m] = hm.split(":").map((n) => parseInt(n || "0", 10));
    return (h || 0) * 60 + (m || 0);
};
const toDateOnly = (isoOrYmd: string) => (isoOrYmd.includes("T") ? isoOrYmd.slice(0, 10) : isoOrYmd);

const hasOccurrenceOnDate = (sched: Schedule, dateYmd: string) => {
    if (!sched.recurrence && sched.start) {
        return toDateOnly(sched.start) === dateYmd;
    }
    const r = sched.recurrence;
    if (!r) return false;
    if (dateYmd < r.startDate) return false;
    if (r.endDate && dateYmd > r.endDate) return false;
    const diffDays = daysBetween(r.startDate, dateYmd);
    if (diffDays < 0) return false;

    switch (r.frequency) {
        case "DAILY":
            return diffDays % Math.max(1, r.interval) === 0;
        case "WEEKLY": {
            const weeks = Math.floor(diffDays / 7);
            const dayCode = WEEKDAY_CODES[new Date(`${dateYmd}T00:00:00`).getDay()];
            const inBy = !r.byWeekday || r.byWeekday.includes(dayCode);
            return inBy && weeks % Math.max(1, r.interval) === 0;
        }
        case "MONTHLY": {
            const months = monthsBetween(r.startDate, dateYmd);
            const startDay = new Date(`${r.startDate}T00:00:00`).getDate();
            const targetDay = new Date(`${dateYmd}T00:00:00`).getDate();
            const sameDay = startDay === targetDay;
            return months >= 0 && sameDay && months % Math.max(1, r.interval) === 0;
        }
    }
};

const hasOccurrenceCoveringSlot = (sched: Schedule, startYmdTHM: string, endYmdTHM: string) => {
    if (!startYmdTHM || !endYmdTHM) return false;
    const start = new Date(startYmdTHM);
    const end = new Date(endYmdTHM);
    const dateYmd = startYmdTHM.slice(0, 10);

    // One-time
    if (!sched.recurrence && sched.start && sched.end) {
        const s = new Date(sched.start);
        const e = new Date(sched.end);
        return s <= start && e >= end;
    }

    const r = sched.recurrence;
    if (!r) return false;
    if (!hasOccurrenceOnDate(sched, dateYmd)) return false;

    const apptStartHM = startYmdTHM.slice(11, 16);
    const apptEndHM = endYmdTHM.slice(11, 16);
    return hmToMinutes(apptStartHM) >= hmToMinutes(r.startTime) && hmToMinutes(apptEndHM) <= hmToMinutes(r.endTime);
};

const getLocationIdFromSchedule = (sched: Schedule): string | null => {
    // Check recurrence locationId first
    const rid = sched?.recurrence?.locationId;
    if (rid) return String(rid);

    // Check actorReferences for Location/ID format
    const refs = Array.isArray(sched?.actorReferences) ? sched.actorReferences : [];
    const locRef = refs.find((r) => String(r).startsWith("Location/"));
    if (locRef) {
        const parts = String(locRef).split("/");
        return parts[1] || null;
    }

    return null;
};

/* =========================
 * Component
 * ======================= */
const AppointmentModal: React.FC = () => {
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") as string;
    const { canWriteResource } = usePermissions();
    const canWriteAppointment = canWriteResource("Appointment");

    const [open, setOpen] = useState(false);

    // Form fields
    const [visitType, setVisitType] = useState("Consultation");
    const [visitTypeOptions, setVisitTypeOptions] = useState<string[]>([]);

    const [patientQuery, setPatientQuery] = useState("");
    const [patientResults, setPatientResults] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [selectedPatientName, setSelectedPatientName] = useState("");
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    const [startDateInput, setStartDateInput] = useState("");
    const [endDateInput, setEndDateInput] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("00:00");
    const [endTime, setEndTime] = useState("00:00");

    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);
    const fpStartRef = useRef<flatpickr.Instance | null>(null);
    const fpEndRef = useRef<flatpickr.Instance | null>(null);

    const [priority, setPriority] = useState<Priority>("Routine");
    const [status, setStatus] = useState<string>("Scheduled");
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>(FALLBACK_STATUS_OPTIONS);

    // Providers & locations
    const [allProviders, setAllProviders] = useState<Option<string>[]>([]);
    const [providersForDate, setProvidersForDate] = useState<Option<string>[]>([]);
    const [loadingProvidersForDate, setLoadingProvidersForDate] = useState(false);
    const [providerId, setProviderId] = useState("");

    const [allLocations, setAllLocations] = useState<Option<string>[]>([]);
    const [providerLocationOptions, setProviderLocationOptions] = useState<Option<string>[]>([]);
    const [locationId, setLocationId] = useState("");

    const [notes, setNotes] = useState("");

    // 🔥 FIX: place your alert state here
    const [alertData, setAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (alertData) {
            const t = setTimeout(() => setAlertData(null), 4000);
            return () => clearTimeout(t);
        }
    }, [alertData]);


    // (flatpickr replaced by datetime-local inputs)

    const combinedStart = useMemo(() => combineLocal(startDate, startTime), [startDate, startTime]);
    const combinedEnd = useMemo(() => combineLocal(endDate, endTime), [endDate, endTime]);

    /* =========================
     * Open on global event
     * ======================= */
    useEffect(() => {
        const handler = () => {
            resetForm();
            setOpen(true);
        };
        window.addEventListener("open-appointment-modal", handler);
        return () => window.removeEventListener("open-appointment-modal", handler);
    }, []);

    /* =========================
     * Initial data
     * ======================= */
    // Visit Types — load from appointments field config (tab_field_config)
    useEffect(() => {
        if (!apiUrl) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/tab-field-config/appointments`);
                if (!res.ok) return;
                const json = await res.json();
                const fc = typeof json.fieldConfig === "string" ? JSON.parse(json.fieldConfig) : json.fieldConfig;
                const sections: Array<{ fields?: Array<{ key: string; options?: unknown[] }> }> = fc?.sections || [];
                for (const section of sections) {
                    for (const field of (section?.fields || [])) {
                        if (field.key === "appointmentType" && Array.isArray(field.options)) {
                            const strings: string[] = [];
                            for (let i = 0; i < field.options.length; i++) {
                                const item = field.options[i];
                                const str = typeof item === "string" ? item : String((item as Record<string, unknown>)?.value ?? (item as Record<string, unknown>)?.label ?? "");
                                if (str) strings.push(str);
                            }
                            if (!cancelled && strings.length > 0) {
                                setVisitTypeOptions(strings);
                            }
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch visit types", err);
            }
        })();
        return () => { cancelled = true; };
    }, [apiUrl]);

    // All ACTIVE providers
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/providers?status=ACTIVE`);
                const json = await res.json();
                const providerData = json?.data?.content || json?.data || json?.content || [];
                const list: Provider[] = Array.isArray(providerData) ? providerData : [];
                const opts = list.map((p: any) => {
                    const firstName = p.identification?.firstName || p['identification.firstName'] || p.firstName || '';
                    const lastName = p.identification?.lastName || p['identification.lastName'] || p.lastName || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    return {
                        value: String(p.id || p.fhirId || ""),
                        label: fullName || p.name || p.displayName || p.fullName || `Provider #${p.id || p.fhirId || ""}`,
                    };
                }).filter((o) => o.value);
                setAllProviders(opts);
            } catch (e) {
                console.error("Failed to fetch providers", e);
            }
        })();
    }, [apiUrl]);

    // All locations — try /api/locations first, fallback to /api/fhir-resource/facilities
    useEffect(() => {
        (async () => {
            const tryParse = async (res: Response): Promise<Location[]> => {
                const json = await res.json();
                const locationData = json?.data?.content || json?.data || json?.content || (Array.isArray(json) ? json : []);
                return Array.isArray(locationData) ? locationData : [];
            };
            try {
                let list: Location[] = [];
                const res = await fetchWithAuth(`${apiUrl}/api/locations?page=0&size=1000`);
                if (res.ok) list = await tryParse(res);
                // Fallback: try generic FHIR facilities endpoint
                if (list.length === 0) {
                    const res2 = await fetchWithAuth(`${apiUrl}/api/fhir-resource/facilities?size=100`);
                    if (res2.ok) list = await tryParse(res2);
                }
                const opts = list
                    .filter((l) => l.id)
                    .map((l) => ({
                        value: String(l.id),
                        label: `${l.name || ""}${l.address ? ` - ${l.address}` : ""}`.trim() || `Location #${l.id}`,
                    }));
                setAllLocations(opts);
            } catch (err) {
                console.error("Failed to fetch locations", err);
            }
        })();
    }, [apiUrl]);

    // Fetch status options from API
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/appointments/status-options`);
                if (res.ok) {
                    const data = await res.json();
                    const opts: StatusOption[] = (data.data || []).map((o: any) =>
                        typeof o === "string" ? { value: o, label: o } : o
                    ).sort((a: StatusOption, b: StatusOption) => (a.order ?? 0) - (b.order ?? 0));
                    if (opts.length > 0) setStatusOptions(opts);
                }
            } catch (e) {
                // keep fallback
            }
        })();
    }, [apiUrl]);

    /* =========================
     * Patient search (debounced)
     * ======================= */
    useEffect(() => {
        if (!patientQuery.trim()) return;
        const t = setTimeout(async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/patients?search=${encodeURIComponent(patientQuery)}`);
                const json = await res.json();
                let list: Patient[] = [];
                if (Array.isArray(json?.data)) list = json.data;
                else if (Array.isArray(json?.data?.content)) list = json.data.content;
                setPatientResults(list);
                setShowPatientDropdown(true);
            } catch (err) {
                console.error("Patient search failed", err);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [patientQuery, apiUrl]);

    /* =========================
     * Provider availability — always show all active providers.
     * Schedule coverage is validated as a warning at save time (handleSave).
     * ======================= */
    useEffect(() => {
        if (!open) {
            setProvidersForDate([]);
            return;
        }
        setProvidersForDate(allProviders);
    }, [open, allProviders]);

    /* =========================
     * Always show all locations in the dropdown
     * ======================= */
    useEffect(() => {
        setProviderLocationOptions(allLocations);
    }, [allLocations]);


    /* =========================
     * Actions
     * ======================= */
    const resetForm = () => {
        setVisitType("Consultation");
        setSelectedPatientId("");
        setSelectedPatientName("");
        setPatientQuery("");
        setPatientResults([]);
        setShowPatientDropdown(false);

        setStartDateInput("");
        setEndDateInput("");
        setStartDate("");
        setEndDate("");
        setStartTime("");
        setEndTime("");

        setPriority("Routine");
        setStatus("Scheduled");
        setProviderId("");
        setProvidersForDate([]);
        setLocationId("");

        setNotes("");
    };

    const choosePatient = (p: Patient) => {
        setSelectedPatientId(String(p.id));
        setSelectedPatientName(getPatientFullName(p));
        setPatientQuery("");
        setShowPatientDropdown(false);
    };

    const handleSave = async () => {
        if (!selectedPatientId) {
            setAlertData({
                variant: "warning",
                title: "Missing Patient",
                message: "Please select a patient before saving the appointment.",
            });
            return;
        }

        // Ensure patient ID is numeric (not a name accidentally stored as ID)
        if (!/^\d+$/.test(selectedPatientId)) {
            setAlertData({
                variant: "error",
                title: "Invalid Patient",
                message: "Please search and select a patient from the dropdown list.",
            });
            setSelectedPatientId("");
            setSelectedPatientName("");
            return;
        }

        if (!startDate || !endDate || !startTime || !endTime) {
            setAlertData({
                variant: "warning",
                title: "Missing Date/Time",
                message: "Please choose start and end date/time.",
            });
            return;
        }

        // Block appointments in the past
        const now = new Date();
        const apptStart = new Date(`${startDate}T${startTime}:00`);
        if (apptStart < now) {
            setAlertData({
                variant: "error",
                title: "Invalid Time",
                message: "Cannot create appointments in the past. Please select a future time slot.",
            });
            return;
        }

        if (endDate < startDate) {
            setAlertData({
                variant: "error",
                title: "Invalid Date Range",
                message: "End date cannot be before start date.",
            });
            return;
        }

        if (new Date(combinedEnd).getTime() <= new Date(combinedStart).getTime()) {
            setAlertData({
                variant: "error",
                title: "Invalid Time Range",
                message: "End time must be after start time.",
            });
            return;
        }

        if (!providerId) {
            setAlertData({
                variant: "warning",
                title: "Missing Provider",
                message: "Please select a provider before saving the appointment.",
            });
            return;
        }

        if (!locationId) {
            setAlertData({
                variant: "warning",
                title: "Missing Location",
                message: "Please select a location before saving the appointment.",
            });
            return;
        }

        // Validate Reason / Chief Complaint field: restrict special characters
        if (notes.trim()) {
            if (!/^[A-Za-z0-9\s\-.,;:'/()]+$/.test(notes.trim())) {
                setAlertData({
                    variant: "error",
                    title: "Invalid Characters",
                    message: "Reason / Chief Complaint contains invalid special characters. Only letters, numbers, spaces, and basic punctuation (- . , ; : ' / ( )) are allowed.",
                });
                return;
            }
            if (!/[A-Za-z]/.test(notes.trim())) {
                setAlertData({
                    variant: "error",
                    title: "Invalid Input",
                    message: "Reason / Chief Complaint must contain at least one letter.",
                });
                return;
            }
        }

        // ✅ Validate provider schedule covers the slot (warning only — don't block creation)
        try {
            const res = await fetchWithAuth(
                `${apiUrl}/api/schedules?status=active&providerId=${providerId}`
            );
            const json = await res.json();
            let schedules: Schedule[] = [];
            if (json?.success && json?.data) {
                schedules = Array.isArray(json.data) ? json.data : (Array.isArray(json.data.content) ? json.data.content : []);
            } else if (Array.isArray(json?.data)) {
                schedules = json.data;
            }
            const covers = schedules.some((s) =>
                hasOccurrenceCoveringSlot(s, combinedStart, combinedEnd)
            );
            if (!covers) {
                // Show a warning but do NOT block appointment creation
                setAlertData({
                    variant: "warning",
                    title: "No Schedule Found",
                    message:
                        "Note: This provider has no schedule for the selected time slot, but the appointment will be created anyway.",
                });
                // Continue saving — do not return here
            }
        } catch (err) {
            console.error("Failed to validate provider schedule", err);
            // Non-fatal — continue saving
        }

        const dto: Record<string, unknown> = {
            // Wrap appointmentType in FHIR CodeableConcept with system (fixes Coding has no system)
            appointmentType: {
                coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/v2-0276",
                    code: visitType,
                    display: visitType,
                }],
                text: visitType,
            },
            status,
            priority,
            start: combinedStart ? toLocalISOWithOffset(combinedStart) : null,
            end: combinedEnd ? toLocalISOWithOffset(combinedEnd) : null,
            reason: notes || null,
            patient: `Patient/${selectedPatientId}`,
            provider: `Practitioner/${providerId}`,
            // Add participant array with status (fixes Appointment.participant.status required)
            participant: [
                {
                    actor: { reference: `Patient/${selectedPatientId}` },
                    required: "required",
                    status: "accepted",
                },
                {
                    actor: { reference: `Practitioner/${providerId}` },
                    required: "required",
                    status: "accepted",
                },
            ],
        };
        if (locationId) {
            dto.location = `Location/${locationId}`;
            // Also add location as participant
            (dto.participant as any[]).push({
                actor: { reference: `Location/${locationId}` },
                required: "required",
                status: "accepted",
            });
        }

        try {
            const res = await fetchWithAuth(`${apiUrl}/api/fhir-resource/appointments/patient/${selectedPatientId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dto),
            });
            let json;
            try { json = await res.json(); } catch { json = {}; }
            if (res.ok && json.success !== false) {
                setOpen(false);
                resetForm();

                // dispatch alert event with details so parent (e.g., Calendar) can show it
                window.dispatchEvent(
                    new CustomEvent("show-alert", {
                        detail: {
                            variant: "success",
                            title: "Created",
                            message: "Appointment created successfully!",
                        },
                    })
                );

                // still notify parent to refresh appointments
                window.dispatchEvent(new Event("appointments-changed"));
            }
            else {
                const msg = json.message || "Failed to save appointment.";
                const isPatientNotFound = msg.toLowerCase().includes("patient not found") || msg.toLowerCase().includes("patient") && res.status === 400;
                setAlertData({
                    variant: "error",
                    title: isPatientNotFound ? "Patient Not Found" : "Error",
                    message: isPatientNotFound
                        ? "The selected patient could not be found. Please search and select the patient again."
                        : msg,
                });
                if (isPatientNotFound) {
                    setSelectedPatientId("");
                    setSelectedPatientName("");
                }
            }
        } catch (err) {
            console.error("Save failed", err);
            setAlertData({
                variant: "error",
                title: "Network Error",
                message: "Could not save the appointment. Please try again.",
            });
        }
    };

    /* =========================
     * Render
     * ======================= */
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onClose={() => setOpen(false)}>
                {/* ✅ Banner appears above form */}
                {alertData && (
                    <div className="mb-4">
                        <Alert
                            variant={alertData.variant}
                            title={alertData.title}
                            message={alertData.message}
                        />
                    </div>
                )}
                <DialogHeader>
                    <DialogTitle className="mb-1 text-xl font-semibold">Add Appointment</DialogTitle>
                    <DialogDescription>Schedule or edit an appointment to stay on track</DialogDescription>
                </DialogHeader>

                {/* Video Call Section - Show for existing appointments */}
                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Visit Type */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">Visit Type</label>
                        <select
                            value={visitType}
                            onChange={(e) => setVisitType(e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                        >
                            {visitTypeOptions.length === 0 && (
                                <option value="">Loading...</option>
                            )}
                            {visitTypeOptions.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Patient */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Patient{" "}
                            <span className="ml-2 rounded-md bg-red-100 px-2 py-[2px] text-xs font-medium text-red-700">required</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search patient by name..."
                                value={selectedPatientName || patientQuery}
                                onChange={(e) => {
                                    setSelectedPatientId("");
                                    setSelectedPatientName("");
                                    setPatientQuery(e.target.value);
                                }}
                                onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
                                className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                            />
                            {showPatientDropdown && (patientResults.length > 0) && (
                                <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-900">
                                    <ul className="max-h-56 overflow-auto py-1">
                                        {patientResults.map((p) => (
                                            <li
                                                key={p.id}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => choosePatient(p)}
                                                className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
                                            >
                                                <div className="font-medium text-gray-800 dark:text-gray-100">{getPatientFullName(p)}</div>
                                                {p.dateOfBirth ? (
                                                    <div className="text-xs text-gray-500">DOB: {p.dateOfBirth}</div>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date Row: Start Date | End Date */}
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                Start Date
                            </label>
                            <DateInput
                                value={startDate}
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) => {
                                    const d = e.target.value;
                                    setStartDate(d);
                                    setStartDateInput(d);
                                    if (!endDate && d) { setEndDate(d); setEndDateInput(d); }
                                    // If end date is before new start date, reset end date
                                    if (endDate && d > endDate) { setEndDate(d); setEndDateInput(d); }
                                }}
                                className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                End Date
                            </label>
                            <DateInput
                                value={endDate}
                                min={startDate || new Date().toISOString().split("T")[0]}
                                onChange={(e) => {
                                    const d = e.target.value;
                                    setEndDate(d);
                                    setEndDateInput(d);
                                }}
                                className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Time Row: Start Time | End Time | Duration */}
                    <div className="col-span-2 grid grid-cols-3 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                Start Time
                            </label>
                            <div className="relative">
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => {
                                        const t = e.target.value;
                                        setStartTime(t);
                                        if (t) setEndTime(addMinutes(t, 15));
                                    }}
                                    className="h-9 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                End Time
                            </label>
                            <div className="relative">
                                <input
                                    type="time"
                                    value={endTime}
                                    min={startTime && (!startDate || !endDate || startDate === endDate) ? startTime : undefined}
                                    onChange={(e) => {
                                        const t = e.target.value;
                                        // Prevent end time before start time (same day or dates not yet set)
                                        if (startTime && (!startDate || !endDate || startDate === endDate) && t < startTime) return;
                                        setEndTime(t);
                                    }}
                                    className="h-9 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                Duration
                            </label>
                            <div className="h-9 flex items-center px-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-dark-800 text-sm text-gray-600 dark:text-gray-400">
                                {(() => {
                                    const diff = hmToMinutes(endTime) - hmToMinutes(startTime);
                                    if (diff <= 0) return <span className="text-gray-400">—</span>;
                                    const h = Math.floor(diff / 60);
                                    const m = diff % 60;
                                    return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m} min`;
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">Priority</label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as Priority)}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                        >
                            <option value="Routine">Routine</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>

                    {/* Provider */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Provider{" "}
                            <span className="ml-2 rounded-md bg-red-100 px-2 py-[2px] text-xs font-medium text-red-700">required</span>
                        </label>
                        <select
                            value={providerId}
                            onChange={(e) => setProviderId(e.target.value)}
                            disabled={loadingProvidersForDate || providersForDate.length === 0}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100 disabled:opacity-60"
                        >
                            <option value="">
                                {loadingProvidersForDate
                                        ? "Loading available providers…"
                                        : providersForDate.length === 0
                                            ? "No providers available"
                                            : "Select a provider..."}
                            </option>
                            {providersForDate.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Location{" "}
                            <span className="ml-2 rounded-md bg-red-100 px-2 py-[2px] text-xs font-medium text-red-700">required</span>
                        </label>
                        <select
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value)}
                            disabled={providerLocationOptions.length === 0}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100 disabled:opacity-60"
                        >
                            <option value="">
                                {providerLocationOptions.length === 0
                                    ? "No locations available"
                                    : "Select a location"}
                            </option>
                            {providerLocationOptions.map((l) => (
                                <option key={l.value} value={l.value}>
                                    {l.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                        >
                            {statusOptions.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notes */}
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Reason / Chief Complaint
                        </label>
                        <textarea
                            rows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., chest discomfort for 2 days"
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center gap-3 sm:justify-end">
                    <button
                        onClick={() => setOpen(false)}
                        type="button"
                        className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        type="button"
                        className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
                        disabled={!startDate || !startTime || !endDate || !endTime || !providerId || !locationId || !canWriteAppointment}
                        title={!canWriteAppointment ? "You don't have permission to create appointments" : undefined}
                    >
                        Save Appointment
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AppointmentModal;
