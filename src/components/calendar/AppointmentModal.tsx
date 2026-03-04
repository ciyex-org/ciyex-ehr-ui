
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
import VideoCallButton from "@/components/telehealth/VideoCallButton";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

/* =========================
 * Types
 * ======================= */
type AppointmentStatus = "Scheduled" | "Confirmed" | "Checked-in" | "Completed";
type Priority = "Routine" | "Urgent";

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

// join yyyy-mm-dd + HH:mm into local string
const combineLocal = (ymd: string, hm: string) => (ymd && hm ? `${ymd}T${hm}` : "");

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
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);
    const startTimeRef = useRef<HTMLInputElement>(null);
    const endTimeRef = useRef<HTMLInputElement>(null);
    const fpStartRef = useRef<flatpickr.Instance | null>(null);
    const fpEndRef = useRef<flatpickr.Instance | null>(null);
    const fpStartTimeRef = useRef<flatpickr.Instance | null>(null);
    const fpEndTimeRef = useRef<flatpickr.Instance | null>(null);

    const [priority, setPriority] = useState<Priority>("Routine");
    const [status, setStatus] = useState<AppointmentStatus>("Scheduled");

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


    // Flatpickr init/destroy tied to modal open state
    useEffect(() => {
        if (!open) {
            fpStartRef.current?.destroy();
            fpEndRef.current?.destroy();
            fpStartTimeRef.current?.destroy();
            fpEndTimeRef.current?.destroy();
            fpStartRef.current = null;
            fpEndRef.current = null;
            fpStartTimeRef.current = null;
            fpEndTimeRef.current = null;
            return;
        }
        // Small delay so DOM refs are mounted inside the dialog
        const timer = setTimeout(() => {
            if (startDateRef.current && !fpStartRef.current) {
                fpStartRef.current = flatpickr(startDateRef.current, {
                    dateFormat: "m/d/Y",
                    allowInput: true,
                    onChange: ([d]) => {
                        if (!d) return;
                        const iso = d.toISOString().slice(0, 10);
                        setStartDate(iso);
                        setStartDateInput(iso);
                        if (!endDate) { setEndDate(iso); setEndDateInput(iso); fpEndRef.current?.setDate(d, false); }
                    },
                });
            }
            if (endDateRef.current && !fpEndRef.current) {
                fpEndRef.current = flatpickr(endDateRef.current, {
                    dateFormat: "m/d/Y",
                    allowInput: true,
                    onChange: ([d]) => {
                        if (!d) return;
                        const iso = d.toISOString().slice(0, 10);
                        setEndDate(iso);
                        setEndDateInput(iso);
                    },
                });
            }
            if (startTimeRef.current && !fpStartTimeRef.current) {
                fpStartTimeRef.current = flatpickr(startTimeRef.current, {
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "h:i K",
                    time_24hr: false,
                    minuteIncrement: 15,
                    onChange: ([d]) => {
                        if (!d) return;
                        const hh = String(d.getHours()).padStart(2, "0");
                        const mm = String(d.getMinutes()).padStart(2, "0");
                        setStartTime(`${hh}:${mm}`);
                    },
                });
            }
            if (endTimeRef.current && !fpEndTimeRef.current) {
                fpEndTimeRef.current = flatpickr(endTimeRef.current, {
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "h:i K",
                    time_24hr: false,
                    minuteIncrement: 15,
                    onChange: ([d]) => {
                        if (!d) return;
                        const hh = String(d.getHours()).padStart(2, "0");
                        const mm = String(d.getMinutes()).padStart(2, "0");
                        setEndTime(`${hh}:${mm}`);
                    },
                });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
                if (json?.success && json?.data) {
                    const providerData = json.data.content || json.data;
                    const list: Provider[] = Array.isArray(providerData) ? providerData : [];
                    const opts = list.map((p) => ({
                        value: String(p.id),
                        label: `${p.identification?.firstName || ""} ${p.identification?.lastName || ""}`.trim(),
                    })).filter((o) => o.label.trim() !== "");
                    setAllProviders(opts);
                }
            } catch (e) {
                console.error("Failed to fetch providers", e);
            }
        })();
    }, [apiUrl]);

    // All locations
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/locations`);
                const json = await res.json();
                if (json?.success && json?.data) {
                    // Handle paginated response
                    const locationData = json.data.content || json.data;
                    const list: Location[] = Array.isArray(locationData) ? locationData : [];
                    const opts = list.map((l) => ({
                        value: String(l.id),
                        label: `${l.name}${l.address ? ` - ${l.address}` : ""}`,
                    }));
                    setAllLocations(opts);
                }
            } catch (err) {
                console.error("Failed to fetch locations", err);
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
     * Provider availability for chosen slot
     * ======================= */
    useEffect(() => {
        // Load providers when at least a start date is selected
        if (!open || !startDate) {
            setProvidersForDate([]);
            return;
        }

        (async () => {
            setLoadingProvidersForDate(true);
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/schedules?status=active`);
                const json = await res.json();
                let schedules: Schedule[] = [];
                if (json?.success && json?.data) {
                    schedules = Array.isArray(json.data) ? json.data : (Array.isArray(json.data.content) ? json.data.content : []);
                } else if (Array.isArray(json?.data)) {
                    schedules = json.data;
                }

                const providerIds = new Set<number>();
                for (const s of schedules) {
                    if (String(s.status).toLowerCase() !== "active") continue;
                    // If full date+time is available, check exact slot coverage
                    if (combinedStart && combinedEnd) {
                        if (hasOccurrenceCoveringSlot(s, combinedStart, combinedEnd)) {
                            providerIds.add(Number(s.providerId));
                        }
                    } else {
                        // Otherwise just check if provider has a schedule on this date
                        if (hasOccurrenceOnDate(s, startDate)) {
                            providerIds.add(Number(s.providerId));
                        }
                    }
                }

                const allowed = allProviders.filter((p) => providerIds.has(Number(p.value)));
                setProvidersForDate(allowed);
            } catch (e) {
                console.error("Failed to load schedules", e);
                setProvidersForDate([]);
            } finally {
                setLoadingProvidersForDate(false);
            }
        })();
    }, [open, startDate, combinedStart, combinedEnd, allProviders, apiUrl]);

    /* =========================
     * Provider → valid locations for slot
     * ======================= */
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!providerId) {
                setProviderLocationOptions([]);
                setLocationId("");
                return;
            }

            try {
                const res = await fetchWithAuth(`${apiUrl}/api/schedules?status=active&providerId=${providerId}`);
                const json = await res.json();
                let schedules: Schedule[] = [];
                if (json?.success && json?.data) {
                    schedules = Array.isArray(json.data) ? json.data : (Array.isArray(json.data.content) ? json.data.content : []);
                } else if (Array.isArray(json?.data)) {
                    schedules = json.data;
                }

                // strictly this provider's schedules
                const providerSchedules = schedules.filter((s) => Number(s.providerId) === Number(providerId));

                const locIds = new Set<string>();
                providerSchedules.forEach((s) => {
                    // Check recurrence locationId
                    if (s.recurrence?.locationId) {
                        locIds.add(String(s.recurrence.locationId));
                    }
                    // Check actorReferences
                    if (s.actorReferences) {
                        s.actorReferences.forEach(ref => {
                            if (String(ref).startsWith('Location/')) {
                                const id = String(ref).split('/')[1];
                                if (id) locIds.add(id);
                            }
                        });
                    }
                });

                // id → label
                const byId: Record<string, Option<string>> = {};
                allLocations.forEach((l) => (byId[l.value] = l));
                const filtered = Array.from(locIds).map((id) => byId[id]).filter(Boolean) as Option<string>[];

                if (!cancelled) {
                    setProviderLocationOptions(filtered);

                    // Auto-select if exactly one
                    if (filtered.length === 1) {
                        setLocationId(filtered[0].value);
                    } else if (locationId && !filtered.some((l) => l.value === locationId)) {
                        // Clear if previous location no longer valid
                        setLocationId("");
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    console.error("Failed to load provider locations", e);
                    setProviderLocationOptions([]);
                    setLocationId("");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [providerId, combinedStart, combinedEnd, allLocations, apiUrl, locationId]);

    // Clear location if provider changes
    useEffect(() => {
        setLocationId("");
    }, [providerId]);

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
        setProviderLocationOptions([]);
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

        if (!startDate || !endDate || !startTime || !endTime) {
            setAlertData({
                variant: "warning",
                title: "Missing Date/Time",
                message: "Please choose start and end date/time.",
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

        // ✅ Validate provider schedule covers the slot
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
                setAlertData({
                    variant: "error",
                    title: "No Schedule Found",
                    message:
                        "This provider has no schedule for the selected time. Please add the schedule first.",
                });
                return;
            }
        } catch (err) {
            console.error("Failed to validate provider schedule", err);
            setAlertData({
                variant: "error",
                title: "Schedule Validation Failed",
                message:
                    "Could not verify the provider's schedule. Please try again.",
            });
            return;
        }

        const dto: Record<string, unknown> = {
            appointmentType: visitType,
            status,
            priority,
            start: combinedStart ? new Date(combinedStart).toISOString() : null,
            end: combinedEnd ? new Date(combinedEnd).toISOString() : null,
            reason: notes || null,
            patient: `Patient/${selectedPatientId}`,
            provider: `Practitioner/${providerId}`,
        };
        if (locationId) dto.location = `Location/${locationId}`;

        try {
            const res = await fetchWithAuth(`${apiUrl}/api/fhir-resource/appointments/patient/${selectedPatientId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dto),
            });
            const json = await res.json();
            if (json.success) {
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
                setAlertData({
                    variant: "error",
                    title: "Error",
                    message: json.message || "Failed to save appointment.",
                });
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
                {/* If you want to show telehealth options for new appointments, remove the selectedEvent check */}
                {selectedPatientId && providerId && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-blue-900 text-sm">Telehealth Options</h4>
                            <p className="text-blue-700 text-xs mt-1">
                            Click &quot;Join&quot; to connect with your provider.  
                            Please ensure you click &quot;Allow&quot; when your browser asks for camera and microphone access.
                            </p>
                        </div>
                        <VideoCallButton
                            appointmentId={undefined}
                            patientId={Number(selectedPatientId)}
                            providerId={Number(providerId)}
                            patientName={selectedPatientName}
                            variant="primary"
                            size="sm"
                        />
                        </div>
                    </div>
                )}

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

                    {/* Dates */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Appointment Start date
                        </label>
                        <div className="relative">
                            <input
                                ref={startDateRef}
                                type="text"
                                placeholder="Pick a date"
                                readOnly
                                className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Appointment End date
                        </label>
                        <div className="relative">
                            <input
                                ref={endDateRef}
                                type="text"
                                placeholder="Pick a date"
                                readOnly
                                className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </span>
                        </div>
                    </div>

                    {/* Times */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Appointment start time
                        </label>
                        <div className="relative">
                            <input
                                ref={startTimeRef}
                                type="text"
                                placeholder="Select time"
                                readOnly
                                className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Appointment end time
                        </label>
                        <div className="relative">
                            <input
                                ref={endTimeRef}
                                type="text"
                                placeholder="Select time"
                                readOnly
                                className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </span>
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
                            disabled={!startDate || loadingProvidersForDate || providersForDate.length === 0}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100 disabled:opacity-60"
                        >
                            <option value="">
                                {!startDate
                                    ? "Pick a date first"
                                    : loadingProvidersForDate
                                        ? "Loading available providers…"
                                        : providersForDate.length === 0
                                            ? "No providers scheduled for this date"
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
                            disabled={!providerId || providerLocationOptions.length === 0}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100 disabled:opacity-60"
                        >
                            <option value="">
                                {!providerId
                                    ? "Select provider first"
                                    : providerLocationOptions.length === 0
                                        ? "No locations for this provider"
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
                            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                        >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Checked-in">Checked-in</option>
                            <option value="Completed">Completed</option>
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
                        disabled={!startDate || !startTime || !endDate || !endTime || !providerId || !locationId}
                    >
                        Save Appointment
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AppointmentModal;
