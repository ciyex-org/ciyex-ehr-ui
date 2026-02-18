
'use client';

import { getEnv } from "@/utils/env";
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useModal } from '@/hooks/useModal';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import {
    EventInput,
    DateSelectArg,
    EventClickArg,
    EventContentArg,
} from '@fullcalendar/core';
import Alert from "@/components/ui/alert/Alert";
import VideoCallButton from "@/components/telehealth/VideoCallButton";

const monthViewStyles = `
/* Hide FullCalendar scrollbars */
.fc-view-harness {
  overflow: hidden !important;
}
/* 1. The Frame: The positioning context for the whole day */
.fc-daygrid-day-frame {
  position: relative !important;
  min-height: 120px !important;
  z-index: 1;
}

/* 2. Neutralize the default top bar & containers so they don't trap our card */
.fc-daygrid-day-top {
  position: static !important;
  display: block !important;
  padding: 0 !important;
}

.fc-daygrid-day-number {
  position: static !important;
  width: 100%;
  height: 100%;
  padding: 4px !important;
  text-decoration: none !important;
  color: #6b7280; /* Default color for empty days */
}

/* 3. Hide Default Events to be safe */
.fc-dayGridMonth-view .fc-daygrid-event-harness,
.fc-dayGridMonth-view .fc-daygrid-event {
  display: none !important;
}

/* 4. The Custom Card - Breaks out of the static containers to fill the Frame */
.fc-month-card {
  position: absolute !important;
  top: 4px !important;
  left: 4px !important;
  right: 4px !important;
  bottom: 4px !important;
  background-color: #d1fae5 !important; /* Solid Light Green */
  border-radius: 12px !important;
  z-index: 10 !important;
  padding: 0 !important;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* 5. Inner Content Container */
.fc-month-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 8px;
}

/* 6. Big Date Number */
.fc-month-day {
  position: absolute;
  top: 8px;
  left: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #355e4e; /* Dark Green */
  line-height: 1;
}

/* 7. Notification Badge */
.fc-month-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #10b981; /* Bright Green */
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* 8. Hover Effect */
.fc-month-card:hover {
  filter: brightness(0.98);
}

/* 9. Hide FullCalendar scrollbar to prevent double scrollbars */
.fc-scroller {
  overflow: hidden !important;
}

.fc-daygrid-body {
  overflow: hidden !important;
}
`;

/* =========================
 * Types & Interfaces
 * ======================= */
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

/** Support BOTH API shapes:
 *  - flat: { firstName, lastName, dateOfBirth }
 *  - nested: { identification: { firstName, lastName }, dateOfBirth }
 */
interface Patient {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: string | null;
    identification?: { firstName?: string | null; lastName?: string | null } | null;
}

type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Checked-in' | 'Completed';
type Priority = 'Routine' | 'Urgent';

interface CalendarEvent extends EventInput {
    extendedProps: {
        visitType?: string;
        providerId?: string;
        locationId?: string;
        status?: AppointmentStatus;
        notes?: string; // Reason / Chief Complaint
        patientId?: string;
        patientName?: string;
        priority?: Priority;
    };
}

/* Schedules from backend */
type ScheduleRecurrence = {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
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

interface AppointmentDTO {
    id: number;
    visitType: string;
    patientName?: string | null;
    appointmentStartDate: string;
    appointmentEndDate: string;
    appointmentStartTime: string;
    appointmentEndTime: string;
    providerId: number;
    locationId?: number | null;
    status: AppointmentStatus;
    reason?: string | null;
    patientId: number;
    priority: Priority;
    start?: string;
    end?: string;
    notes?: string;
}

interface VisitType {
    activity: number;
    seq: number;
    title: string;
}

/* =========================
 * Helpers
 * ======================= */

const getProviderColor = (providerId: number | string) => {
    const idNum = Number(providerId);
    return providerPalette[idNum % providerPalette.length];
};

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const getPatientFullName = (p: Patient | null | undefined): string => {
    if (!p) return '';
    const first = (p.firstName ?? p.identification?.firstName ?? '')?.trim();
    const last = (p.lastName ?? p.identification?.lastName ?? '')?.trim();
    return `${first} ${last}`.trim();
};

// Match Provider Schedule page: MM/DD/YYYY UI + ISO for logic
const formatInputToMMDDYYYY = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    let result = '';
    if (digits.length > 0) result += digits.substring(0, 2); // MM
    if (digits.length >= 3) result += '/' + digits.substring(2, 4); // DD
    if (digits.length >= 5) result += '/' + digits.substring(4, 8); // YYYY
    return result;
};
const toISODateFromMMDDYYYY = (val: string): string => {
    const parts = val.split('/');
    if (parts.length === 3) {
        const [mm, dd, yyyy] = parts;
        if (mm && dd && yyyy && yyyy.length === 4) {
            return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
    }
    return '';
};
const dateToMMDDYYYY = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
};

const providerPalette = [
    "#1E90FF", // Blue
    "#28A745", // Green
    "#FF5733", // Orange Red
    "#6F42C1", // Purple
    "#20C997", // Teal
    "#FD7E14", // Orange
    "#DC3545", // Red
    "#17A2B8", // Cyan
    "#FFC107", // Yellow
];





// yyyy-mm-dd from Date
const dateInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
// HH:mm from Date
const timeInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
// join yyyy-mm-dd + HH:mm into local string
const combineLocal = (ymd: string, hm: string) => (ymd && hm ? `${ymd}T${hm}` : '');

// Days between YYYY-MM-DD strings
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
    const [h, m] = hm.split(':').map((n) => parseInt(n || '0', 10));
    return (h || 0) * 60 + (m || 0);
};
const toDateOnly = (isoOrYmd: string) => (isoOrYmd.includes('T') ? isoOrYmd.slice(0, 10) : isoOrYmd);

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
        case 'DAILY':
            return diffDays % Math.max(1, r.interval) === 0;
        case 'WEEKLY': {
            const weeks = Math.floor(diffDays / 7);
            const dayCode = WEEKDAY_CODES[new Date(`${dateYmd}T00:00:00`).getDay()];
            const inBy = !r.byWeekday || r.byWeekday.includes(dayCode);
            return inBy && weeks % Math.max(1, r.interval) === 0;
        }
        case 'MONTHLY': {
            const months = monthsBetween(r.startDate, dateYmd);
            const startDay = new Date(`${r.startDate}T00:00:00`).getDate();
            const targetDay = new Date(`${dateYmd}T00:00:00`).getDate();
            const sameDay = startDay === targetDay;
            return months >= 0 && sameDay && months % Math.max(1, r.interval) === 0;
        }
    }
};

const hasOccurrenceCoveringSlot = (
    sched: Schedule,
    startYmdTHM: string,
    endYmdTHM: string
) => {
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
    return (
        hmToMinutes(apptStartHM) >= hmToMinutes(r.startTime) &&
        hmToMinutes(apptEndHM) <= hmToMinutes(r.endTime)
    );
};

const scheduleHasLocation = (sched: Schedule, locId: string | 'all') => {
    if (!locId || locId === 'all') return true;
    const idStr = String(locId);
    if (sched.recurrence?.locationId && String(sched.recurrence.locationId) === idStr) return true;
    const refs = sched.actorReferences;
    if (Array.isArray(refs) && refs.includes(`Location/${idStr}`)) return true;
    return false;
};

// Extract Location/{id} preference from a schedule
const getLocationIdFromSchedule = (sched: Schedule): string | null => {
    const rid = sched?.recurrence?.locationId;
    if (rid) return String(rid);
    const refs = Array.isArray(sched?.actorReferences) ? sched.actorReferences : [];
    const locRef = refs.find((r) => String(r).startsWith('Location/'));
    if (!locRef) return null;
    const parts = String(locRef).split('/');
    return parts[1] || null;
};

/* =========================
 * Static Options
 * ======================= */
type Option<T extends string = string> = { value: T; label: string };



const FALLBACK_VISIT_TYPES = [
    { value: 'Consultation', label: 'Consultation' },
    { value: 'Follow-up', label: 'Follow-up' },
    { value: 'Initial Visit', label: 'Initial Visit' },
    { value: 'Telehealth', label: 'Telehealth' },
    { value: 'Virtual Visit', label: 'Virtual Visit' },
    { value: 'Video Call', label: 'Video Call' },
    { value: 'Physical Exam', label: 'Physical Exam' },
    { value: 'Urgent Care', label: 'Urgent Care' },
    { value: 'Emergency', label: 'Emergency' },
    { value: 'Checkup', label: 'Checkup' },
    { value: 'Wellness Visit', label: 'Wellness Visit' },
    { value: 'Preventive Care', label: 'Preventive Care' }
];

const statusOptions: Option<AppointmentStatus>[] = [
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Checked-in', label: 'Checked-in' },
    { value: 'Completed', label: 'Completed' },
];

const priorityOptions: Option<Priority>[] = [
    { value: 'Routine', label: 'Routine' },
    { value: 'Urgent', label: 'Urgent' },
];



type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';



const Calendar: React.FC = () => {
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const [alertData, setAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    // Auto-dismiss alerts after 4 seconds
    useEffect(() => {
        if (alertData) {
            const timer = setTimeout(() => {
                setAlertData(null);
            }, 4000); // auto-hide after 4s
            return () => clearTimeout(timer);
        }
    }, [alertData]);



    // Removed Title — auto-generate from Visit Type + Patient
    const [visitType, setVisitType] = useState<string>('Consultation');

    // This holds the list of visit types fetched from backend
    const [visitTypeOptions, setVisitTypeOptions] = useState<{ value: string; label: string }[]>([]);

    // Patient search & selection
    const [patientQuery, setPatientQuery] = useState<string>('');
    const [patientResults, setPatientResults] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [selectedPatientName, setSelectedPatientName] = useState<string>('');
    const [patientSearching, setPatientSearching] = useState<boolean>(false);
    const [showPatientDropdown, setShowPatientDropdown] = useState<boolean>(false);

    // Priority / Provider / Location / Status
    const [appointmentPriority, setAppointmentPriority] = useState<Priority>('Routine');
    const [appointmentProviderId, setAppointmentProviderId] = useState<string>('');
    const [appointmentLocationId, setAppointmentLocationId] = useState<string>('');
    const [appointmentStatus, setAppointmentStatus] = useState<AppointmentStatus>('Scheduled');


    // Date & Time — input (MM/DD/YYYY) + ISO (YYYY-MM-DD)
    const [startDateInput, setStartDateInput] = useState<string>('');
    const [endDateInput, setEndDateInput] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(''); // ISO yyyy-mm-dd
    const [endDate, setEndDate] = useState<string>(''); // ISO yyyy-mm-dd
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');

    // Reason / Chief Complaint
    const [appointmentNotes, setAppointmentNotes] = useState<string>('');

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const calendarRef = useRef<FullCalendar>(null);
    const { isOpen, openModal, closeModal } = useModal();

    // Loading state for save button
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") as string;

    // Header filters (existing)
    const [providers, setProviders] = useState<{ value: string; label: string }[]>([]);
    const [provider, setProvider] = useState('all');
    const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);
    const [location, setLocation] = useState('all');

    // Modal provider list (based on chosen slot & location)
    const [providersForDate, setProvidersForDate] = useState<{ value: string; label: string }[]>([]);
    const [loadingProvidersForDate, setLoadingProvidersForDate] = useState(false);

    // Filtered locations for the selected provider (modal dropdown)
    const [providerLocationOptions, setProviderLocationOptions] = useState<
        { value: string; label: string }[]
    >([]);

    const combinedStart = useMemo(() => combineLocal(startDate, startTime), [startDate, startTime]);
    const combinedEnd = useMemo(() => combineLocal(endDate, endTime), [endDate, endTime]);

    // NEW: calendar title + active view
    const [calendarTitle, setCalendarTitle] = useState<string>('');
    const [activeView, setActiveView] = useState<ViewType>('timeGridDay');
    const calendarRefs = useRef<Record<string, FullCalendar | null>>({});



    // FullCalendar controls
    const goPrev = () => {
        if (provider === 'all') {
            Object.values(calendarRefs.current).forEach(cal => cal?.getApi().prev());
        } else {
            calendarRef.current?.getApi().prev();
        }
    };

    const goNext = () => {
        if (provider === 'all') {
            Object.values(calendarRefs.current).forEach(cal => cal?.getApi().next());
        } else {
            calendarRef.current?.getApi().next();
        }
    };

    const changeView = useCallback((v: ViewType) => {
        setActiveView(v);

        if (provider === 'all') {
            // update ALL provider calendars
            Object.values(calendarRefs.current).forEach(cal => {
                if (cal) cal.getApi().changeView(v);
            });
        } else {
            if (calendarRef.current) {
                calendarRef.current.getApi().changeView(v);
            }
        }
    }, [provider]);


    // Fetch ACTIVE providers (header)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/providers?status=ACTIVE`);
                const json = await res.json();
                if (json?.success && Array.isArray(json.data)) {
                    const active = json.data
                        .filter((p: Provider) => p?.systemAccess?.status === 'ACTIVE')
                        .map((p: Provider) => ({
                            value: String(p.id),
                            label: `${p.identification?.firstName || ''} ${p.identification?.lastName || ''}`.trim(),
                        }));

                    // Always store "all" in the state list, but we’ll hide it in Week/Month dropdown
                    setProviders([{ value: 'all', label: 'All Providers' }, ...active]);
                }
            } catch (e) {
                console.error('Failed to fetch providers', e);
            }
        })();
    }, [apiUrl]);

    /// Auto-select a real provider when in Week/Month view
    useEffect(() => {
        if (activeView !== "timeGridDay" && provider === "all" && providers.length > 1) {
            setProvider(providers[1].value); // default to first provider
        }
    }, [activeView, provider, providers]);



    // Fetch locations (header & modal base)
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
                        label: `${l.name}${l.address ? ` - ${l.address}` : ''}`,
                    }));
                    setLocations([{ value: 'all', label: 'All Locations' }, ...opts]);
                }
            } catch (e) {
                console.error('Failed to fetch locations', e);
            }
        })();
    }, [apiUrl]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/list-options/list/${encodeURIComponent('Visit Type')}`);
                const json = await res.json();

                if (Array.isArray(json)) {
                    const opts = json
                        .filter((item: VisitType) => item.activity === 1) // only active
                        .sort((a: VisitType, b: VisitType) => a.seq - b.seq) // order by seq
                        .map((item: VisitType) => ({
                            value: item.title,
                            label: item.title,
                        }));

                    // Ensure we have visit types - add fallback if API returns empty
                    if (opts.length > 0) {
                        setVisitTypeOptions(opts);
                    } else {
                        setVisitTypeOptions(FALLBACK_VISIT_TYPES);
                    }
                } else {
                    setVisitTypeOptions(FALLBACK_VISIT_TYPES);
                }
            } catch (err) {
                console.error("Failed to fetch visit types", err);
                setVisitTypeOptions(FALLBACK_VISIT_TYPES);
            }
        })();
    }, [apiUrl]);

    const loadAppointments = useCallback(async () => {
        try {
            let page = 0;
            const size = 50;
            let allEvents: CalendarEvent[] = [];
            let lastPage = false;

            while (!lastPage) {
                const res = await fetchWithAuth(
                    `${apiUrl}/api/appointments?page=${page}&size=${size}`
                );
                const json = await res.json();

                if (json.success && json.data?.content) {
                    const events: CalendarEvent[] = await Promise.all(
                        json.data.content.map(async (a: AppointmentDTO) => {
                            let name = a.patientName;

                            // 🔑 If patientName missing, fetch patient record
                            if (!name && a.patientId) {
                                try {
                                    const pres = await fetchWithAuth(
                                        `${apiUrl}/api/patients/${a.patientId}`
                                    );
                                    const pjson = await pres.json();
                                    if (pjson.success && pjson.data) {
                                        name = getPatientFullName(pjson.data);
                                    }
                                } catch (err) {
                                    console.error("Failed to fetch patient name", err);
                                }
                            }

                            return {
                                id: String(a.id),
                                // main title → patient’s name
                                title: name || `Patient #${a.id}`,
                                start: `${a.appointmentStartDate}T${a.appointmentStartTime}`,
                                end: `${a.appointmentEndDate}T${a.appointmentEndTime}`,
                                allDay: false,
                                color: getProviderColor(a.providerId),
                                extendedProps: {
                                    visitType: a.visitType,
                                    providerId: String(a.providerId),
                                    locationId: a.locationId ? String(a.locationId) : undefined,
                                    status: a.status,
                                    notes: a.reason,
                                    patientId: String(a.patientId),
                                    patientName: name,
                                    priority: a.priority,
                                    startTime: a.appointmentStartTime, // ✅ keep start time
                                },
                            };
                        })
                    );

                    allEvents = [...allEvents, ...events];
                    lastPage = json.data.last;
                    page++;
                } else {
                    lastPage = true;
                }
            }

            setEvents(allEvents);
        } catch (err) {
            console.error("Failed to load appointments", err);
        }
    }, [apiUrl]);

    // Trigger loadAppointments when component is mounted
    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);




    // Build provider list for chosen date/time (& location)
    useEffect(() => {
        if (!isOpen || !combinedStart || !combinedEnd) {
            setProvidersForDate([]);
            return;
        }

        // ✅ If provider already chosen from the calendar slot, stick with it
        if (appointmentProviderId) {
            const chosen = providers.find((p) => p.value === appointmentProviderId);
            setProvidersForDate(chosen ? [chosen] : []);
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
                const effectiveLocation =
                    appointmentLocationId || (location !== "all" ? location : "all");

                const providerIds = new Set<number>();
                for (const s of schedules) {
                    if (
                        String(s.status).toLowerCase() === "active" &&
                        hasOccurrenceCoveringSlot(s, combinedStart, combinedEnd) &&
                        scheduleHasLocation(s, effectiveLocation)
                    ) {
                        providerIds.add(Number(s.providerId));
                    }
                }

                const allowed = providers.filter((p) =>
                    providerIds.has(Number(p.value))
                );
                setProvidersForDate(allowed);
            } catch (e) {
                console.error("Failed to load schedules", e);
                setProvidersForDate([]);
            } finally {
                setLoadingProvidersForDate(false);
            }
        })();
    }, [
        isOpen,
        combinedStart,
        combinedEnd,
        providers,
        appointmentProviderId,
        location,
        appointmentLocationId,
        apiUrl,
    ]);


    // Slot-aware locations: ONLY the selected provider's locations.
    // If a time is chosen, further restrict to schedules covering that slot.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            // No provider selected → nothing to show
            if (!appointmentProviderId) {
                setProviderLocationOptions([]);
                setAppointmentLocationId('');
                return;
            }

            try {
                // Ask server for this provider's schedules (but also strictly filter client-side)
                const res = await fetchWithAuth(
                    `${apiUrl}/api/schedules?status=active&providerId=${appointmentProviderId}`
                );
                const json = await res.json();
                let schedules: Schedule[] = [];
                if (json?.success && json?.data) {
                    schedules = Array.isArray(json.data) ? json.data : (Array.isArray(json.data.content) ? json.data.content : []);
                } else if (Array.isArray(json?.data)) {
                    schedules = json.data;
                }

                // STRICT provider filter on the client
                const providerSchedules = schedules.filter(
                    (s) => Number(s.providerId) === Number(appointmentProviderId)
                );

                const locIds = new Set<string>();
                providerSchedules.forEach((s) => {
                    const coversSlot =
                        combinedStart && combinedEnd
                            ? hasOccurrenceCoveringSlot(s, combinedStart, combinedEnd)
                            : true; // if no slot yet, show all provider locations

                    if (coversSlot) {
                        const lid = getLocationIdFromSchedule(s);
                        if (lid) locIds.add(String(lid));
                    }
                });

                // Map ids → labels using the global locations list
                const byId: Record<string, { value: string; label: string }> = {};
                locations.forEach((l) => (byId[l.value] = l));

                const filtered = Array.from(locIds).map((id) => byId[id]).filter(Boolean);

                if (!cancelled) {
                    setProviderLocationOptions(filtered);

                    // Auto-select if exactly one
                    if (filtered.length === 1) {
                        setAppointmentLocationId(filtered[0].value);
                    } else if (
                        appointmentLocationId &&
                        !filtered.some((l) => l.value === appointmentLocationId)
                    ) {
                        // Clear if previously selected location no longer valid
                        setAppointmentLocationId('');
                    } else if (
                        // Optional: if header location filter is valid for this provider, prefill it
                        filtered.length > 1 &&
                        location !== 'all' &&
                        filtered.some((l) => l.value === location)
                    ) {
                        setAppointmentLocationId(location);
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    console.error('Failed to load provider locations', e);
                    setProviderLocationOptions([]);
                    setAppointmentLocationId('');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [appointmentProviderId, combinedStart, combinedEnd, locations, apiUrl, appointmentLocationId, location]);

    // Clear modal location whenever provider changes
    useEffect(() => {
        setAppointmentLocationId('');
    }, [appointmentProviderId]);

    // Patient search (debounced)
    useEffect(() => {
        if (!isOpen) return;
        const q = patientQuery.trim();
        if (q.length < 2) {
            setPatientResults([]);
            return;
        }
        let cancelled = false;
        setPatientSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await fetchWithAuth(
                    `${apiUrl}/api/patients?search=${encodeURIComponent(q)}`
                );
                const json = await res.json();
                if (cancelled) return;

                // Handle both {data: [...]} and {data: {content: [...]}}
                let list: Patient[] = [];
                if (Array.isArray(json?.data)) {
                    list = json.data;
                } else if (Array.isArray(json?.data?.content)) {
                    list = json.data.content;
                }

                setPatientResults(list);
                setShowPatientDropdown(true);
            } catch (e) {
                if (!cancelled) {
                    console.error('Patient search failed', e);
                    setPatientResults([]);
                }
            } finally {
                if (!cancelled) setPatientSearching(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [patientQuery, apiUrl, isOpen]);

    // Default 15-minute end when selecting on grid
    const handleDateSelect = useCallback((selectInfo: DateSelectArg, providerId?: string) => {
        resetModalFields();

        const start = selectInfo.start;
        const end = new Date(start.getTime() + 15 * 60 * 1000);

        // UI inputs (MM/DD/YYYY)
        setStartDateInput(dateToMMDDYYYY(start));
        setEndDateInput(dateToMMDDYYYY(end));

        // ISO for logic
        setStartDate(dateInput(start));
        setEndDate(dateInput(end));

        setStartTime(timeInput(start));
        setEndTime(timeInput(end));

        // ✅ Prefill provider if passed from the calendar column
        if (providerId && providerId !== 'all') {
            setAppointmentProviderId(providerId);
        } else {
            setAppointmentProviderId('');
        }

        // ✅ Prefill location only if header filter is specific
        setAppointmentLocationId(location === 'all' ? '' : location);

        openModal();
    }, [location, openModal]);

    // Click existing event → load into modal
    const handleEventClick = (clickInfo: EventClickArg) => {
        const apiEvent = clickInfo.event; // EventApi

        const s = apiEvent.start;
        const e = apiEvent.end;

        // UI inputs (MM/DD/YYYY) + ISO
        setStartDateInput(s ? dateToMMDDYYYY(s) : '');
        setStartDate(s ? dateInput(s) : '');
        setStartTime(s ? timeInput(s) : '');

        setEndDateInput(e ? dateToMMDDYYYY(e) : '');
        setEndDate(e ? dateInput(e) : '');
        setEndTime(e ? timeInput(e) : '');

        // Extended props from EventApi
        const xp = apiEvent.extendedProps as CalendarEvent['extendedProps'];

        setVisitType(xp?.visitType ?? 'Consultation');
        setAppointmentProviderId(xp?.providerId ?? '');
        setAppointmentLocationId(xp?.locationId ?? '');
        setAppointmentStatus((xp?.status as AppointmentStatus) ?? 'Scheduled');
        setAppointmentNotes(xp?.notes ?? '');
        setAppointmentPriority((xp?.priority as Priority) ?? 'Routine');

        setSelectedPatientId(xp?.patientId ?? '');
        setSelectedPatientName(xp?.patientName ?? ''); // already stored when created
        setPatientQuery(''); // keep input showing the selected full name

        setSelectedEvent({
            id: apiEvent.id,
            extendedProps: xp,
        } as unknown as CalendarEvent);

        openModal();
    };

    // Fetch patient details when editing an appointment (if only patientId is available)
    useEffect(() => {
        if (selectedPatientId && !selectedPatientName) {
            (async () => {
                try {
                    const res = await fetchWithAuth(`${apiUrl}/api/patients/${selectedPatientId}`);
                    const json = await res.json();
                    if (json.success && json.data) {
                        const name = getPatientFullName(json.data);
                        setSelectedPatientName(name);
                    }
                } catch (err) {
                    console.error("Failed to fetch patient name", err);
                }
            })();
        }
    }, [selectedPatientId, selectedPatientName, apiUrl]);


    const choosePatient = (p: Patient) => {
        const name = getPatientFullName(p);
        setSelectedPatientId(String(p.id));
        setSelectedPatientName(name);
        setPatientQuery('');
        setPatientResults([]);
        setShowPatientDropdown(false);
    };

    const handleAddOrUpdateAppointment = async () => {
        if (isSaving) return; // Prevent double submission

        setIsSaving(true);

        if (!selectedPatientId) {
            setAlertData({
                variant: "warning",
                title: "Missing Patient",
                message: "Please select a patient before saving the appointment.",
            });
            setIsSaving(false);
            return;
        }

        if (!appointmentProviderId) {
            setAlertData({
                variant: "warning",
                title: "Missing Provider",
                message: "Please select a provider before saving the appointment.",
            });
            setIsSaving(false);
            return;
        }

        const combinedStart = startDate && startTime ? `${startDate}T${startTime}` : '';
        const combinedEnd = endDate && endTime ? `${endDate}T${endTime}` : '';

        if (!combinedStart || !combinedEnd) {
            setAlertData({
                variant: "warning",
                title: "Missing Date/Time",
                message: "Please choose start and end date/time.",
            });
            setIsSaving(false);
            return;
        }

        if (new Date(combinedEnd).getTime() <= new Date(combinedStart).getTime()) {
            setAlertData({
                variant: "error",
                title: "Invalid Time Range",
                message: "End time must be after start time.",
            });
            setIsSaving(false);
            return;
        }

        // 🔴 NEW: Check provider schedule
        try {
            const res = await fetchWithAuth(
                `${apiUrl}/api/schedules?status=active&providerId=${appointmentProviderId}`
            );
            const json = await res.json();
            let schedules: Schedule[] = [];
            if (json?.success && json?.data) {
                schedules = Array.isArray(json.data) ? json.data : (Array.isArray(json.data.content) ? json.data.content : []);
            } else if (Array.isArray(json?.data)) {
                schedules = json.data;
            }

            const covers = schedules.some(s =>
                hasOccurrenceCoveringSlot(s, combinedStart, combinedEnd)
            );

            if (!covers) {
                setAlertData({
                    variant: "error",
                    title: "No Schedule Found",
                    message: "This provider has no schedule for the selected time. Please add the schedule first.",
                });
                setIsSaving(false);
                return;
            }
        } catch (err) {
            console.error("Failed to validate provider schedule", err);
            setAlertData({
                variant: "error",
                title: "Schedule Validation Failed",
                message: "Could not verify the provider's schedule. Please try again.",
            });
            setIsSaving(false);
            return;
        }

        if (!appointmentLocationId) {
            setAlertData({
                variant: "warning",
                title: "Missing Location",
                message: "Please select a location before saving the appointment.",
            });
            setIsSaving(false);
            return;
        }

        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const dto = {
            visitType,
            patientId: selectedPatientId ? Number(selectedPatientId) : null,
            providerId: Number(appointmentProviderId),
            appointmentStartDate: startDate,
            appointmentEndDate: endDate,
            appointmentStartTime: startTime,
            appointmentEndTime: endTime,
            start: combinedStart ? new Date(combinedStart).toISOString() : null,
            end: combinedEnd ? new Date(combinedEnd).toISOString() : null,
            actorReferences: appointmentLocationId ? [`Location/${appointmentLocationId}`] : null,
            timezone: browserTz,
            priority: appointmentPriority,
            locationId: appointmentLocationId ? Number(appointmentLocationId) : null,
            status: appointmentStatus,
            reason: appointmentNotes || null,
        };

        try {
            let res;
            if (selectedEvent) {
                // Update existing appointment
                res = await fetchWithAuth(
                    `${apiUrl}/api/appointments/${selectedEvent.id}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(dto),
                    }
                );
            } else {
                // Create new appointment
                res = await fetchWithAuth(`${apiUrl}/api/appointments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dto),
                });
            }

            const json = await res.json();
            if (json.success) {
                // ✅ Re-fetch all appointments to keep calendar consistent
                await loadAppointments();

                setAlertData({
                    variant: "success",
                    title: selectedEvent ? "Updated" : "Created",
                    message: selectedEvent
                        ? "Appointment updated successfully!"
                        : "Appointment created successfully!",
                });

                closeModal();
                resetModalFields();
            } else {
                setAlertData({
                    variant: "error",
                    title: "Error",
                    message: json.message || "Failed to save appointment.",
                });
            }
        } catch (err) {
            console.error("Error saving appointment", err);
            setAlertData({
                variant: "error",
                title: "Network Error",
                message: "Could not save the appointment. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };
    const resetModalFields = () => {
        setVisitType('Consultation');
        setPatientQuery('');
        setPatientResults([]);
        setSelectedPatientId('');
        setSelectedPatientName('');
        setAppointmentPriority('Routine');
        setAppointmentProviderId('');
        setAppointmentLocationId('');
        setAppointmentStatus('Scheduled');
        setStartDateInput('');
        setEndDateInput('');
        setStartDate('');
        setStartTime('');
        setEndDate('');
        setEndTime('');
        setAppointmentNotes('');
        setShowPatientDropdown(false);
        setSelectedEvent(null);
        setIsSaving(false); // Reset saving state
    };

    // === Event renderer (inside component so we can read location labels) ===
    const renderEventContent = useCallback(
        (eventInfo: EventContentArg) => {
            const xp = eventInfo.event.extendedProps as {
                patientName?: string;
            };

            const patientName = xp?.patientName || eventInfo.event.title;

            return (
                <div className="event-fc-color fc-event-main rounded-sm p-1 text-xs">
                    <span className="font-semibold text-white">{patientName}</span>
                </div>
            );
        },
        []
    );

    const dayCellContent = useCallback(
        (arg: any) => {
            if (activeView !== 'dayGridMonth') {
                return arg.dayNumberText;
            }

            const cellDate = arg.date;
            const cellDateStr = cellDate.getFullYear() + '-' +
                String(cellDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(cellDate.getDate()).padStart(2, '0');

            const count = events.filter((e) => {
                if (!e.start) return false;
                const eventStart = new Date(e.start as string | number | Date);
                const eventDateStr = eventStart.getFullYear() + '-' +
                    String(eventStart.getMonth() + 1).padStart(2, '0') + '-' +
                    String(eventStart.getDate()).padStart(2, '0');
                if (eventDateStr !== cellDateStr) return false;
                if (provider !== 'all' && e.extendedProps.providerId !== provider) return false;
                if (location !== 'all' && e.extendedProps.locationId !== location) return false;
                return true;
            }).length;

            // No count → default number
            if (count === 0) {
                return <span className="fc-daygrid-day-number">{arg.dayNumberText}</span>;
            }

            // Pill UI with click handlers
            return (
                <div
                    className="fc-month-card cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        const selectInfo = {
                            start: arg.date,
                            end: (() => {
                                const dateValue = arg.date instanceof Date ? arg.date : new Date(arg.date);
                                return isNaN(dateValue.getTime()) ? new Date() : new Date(dateValue.getTime() + 15 * 60 * 1000);
                            })(),
                            allDay: false
                        };
                        handleDateSelect(selectInfo as any);
                    }}
                >
                    <div className="fc-month-card-inner">
                        <span className="fc-month-day">
                            {arg.dayNumberText}
                        </span>
                        <span
                            className="fc-month-count cursor-pointer hover:bg-green-600 transition-colors"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                changeView('timeGridDay');
                                if (calendarRef.current) {
                                    const dateValue = arg.date instanceof Date ? arg.date : new Date(arg.date);
                                    calendarRef.current.getApi().gotoDate(dateValue);
                                }
                            }}
                        >
                            {count}
                        </span>
                    </div>
                </div>
            );
        },
        [activeView, events, provider, location, changeView, handleDateSelect, calendarRef]
    );




    /* =========================
     * Render
     * ======================= */
    return (
        <div className="relative rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <style>{monthViewStyles}</style>

            {/* Alert banner */}
            {alertData && (
                <div className="p-4">
                    <Alert
                        variant={alertData.variant}
                        title={alertData.title}
                        message={alertData.message}
                    />
                </div>
            )}


            {/* Custom header */}
            <div className="flex items-center px-6 pt-4">

                {/* Left side: Providers + Locations + Date Nav + View toggles */}
                <div className="flex items-center gap-4">
                    {/* Providers */}
                    <div className="relative w-44">
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900
      focus:outline-none focus:ring-2 focus:ring-brand-500
      dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                        >
                            {/* Show "All Providers" only in Day view */}
                            {activeView === "timeGridDay" && (
                                <option value="all">All Providers</option>
                            )}
                            {providers
                                .filter((p) => p.value !== "all")
                                .map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                        </select>
                    </div>


                    {/* Locations */}
                    <div className="relative w-52">
                        <select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900
          focus:outline-none focus:ring-2 focus:ring-brand-500
          dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                        >
                            <option value="all">All Locations</option>
                            {locations.filter((l) => l && l.value && l.value !== 'all').map((loc) => (
                                <option key={loc.value} value={loc.value}>{loc.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Prev / Date / Next */}
                    <div className="flex items-center gap-2 flex-1">
                        <button
                            type="button"
                            onClick={goPrev}
                            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-900"
                        >
                            &lt;
                        </button>

                        {/* FIXED WIDTH TITLE */}
                        <div className="flex-1 min-w-[240px] text-center text-base font-semibold text-gray-900 dark:text-white/90">
                            {calendarTitle}
                        </div>

                        <button
                            type="button"
                            onClick={goNext}
                            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-900"
                        >
                            &gt;
                        </button>
                    </div>

                    {/* View toggles */}
                    <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-[2px] dark:border-gray-700 dark:bg-white/10">
                        {([
                            { key: 'dayGridMonth', label: 'Month' },
                            { key: 'timeGridWeek', label: 'Week' },
                            { key: 'timeGridDay', label: 'Day' },
                        ] as { key: ViewType; label: string }[]).map((v) => {
                            const active = activeView === v.key;
                            return (
                                <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => changeView(v.key)}
                                    aria-pressed={active}
                                    className={[
                                        'px-3 py-1.5 text-sm font-medium rounded-lg',
                                        active
                                            ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-900 dark:text-white'
                                            : 'text-gray-600 hover:bg-white/80 dark:text-gray-300',
                                    ].join(' ')}
                                >
                                    {v.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Calendar */}
            <div className="custom-calendar">
                {provider === "all" && providers.length > 1 ? (
                    <>
                        {/* Shared day headers */}
                        {(activeView === "timeGridWeek" || activeView === "dayGridMonth") && (
                            <div className="border rounded-md mb-4">
                                <FullCalendar
                                    plugins={[dayGridPlugin, timeGridPlugin]}
                                    initialView={activeView}
                                    headerToolbar={false}
                                    events={[]} // no events, just headers
                                    selectable={false}
                                    editable={false}
                                    height="700px"
                                    slotMinTime={provider === "all" ? "06:00:00" : "00:00:00"}
                                    scrollTime="06:00:00"
                                    dayHeaderFormat={{ weekday: "short", month: "numeric", day: "numeric" }}
                                    views={{
                                        dayGridMonth: { titleFormat: { year: "numeric", month: "long" } },
                                        timeGridWeek: { titleFormat: { month: "short", day: "numeric" } },
                                        timeGridDay: {
                                            titleFormat: {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                weekday: "long",
                                            },
                                        },
                                    }}
                                />
                            </div>
                        )}

                        {activeView === "timeGridDay" ? (
                            // === All Providers + Day View → Columns side by side with one shared scrollbar
                            <div className="h-[700px] overflow-y-auto">
                                <div
                                    className="grid gap-1"
                                    style={{
                                        gridTemplateColumns: `repeat(${Math.max(
                                            providers.length - 1,
                                            1
                                        )}, minmax(0, 1fr))`,
                                    }}
                                >
                                    {providers
                                        .filter((p) => p.value !== "all")
                                        .map((p) => (
                                            <div
                                                key={`day-${p.value}`}
                                                className="provider-col flex flex-col border rounded-md"
                                            >
                                                <div className="flex items-center justify-between bg-blue-500 text-white px-2 py-1 text-sm font-semibold">
                                                    <span>{p.label}</span>
                                                    <button
                                                        onClick={() =>
                                                            setProviders((prev) =>
                                                                prev.filter((prov) => prov.value !== p.value)
                                                            )
                                                        }
                                                        className="ml-2 text-xs hover:text-gray-200"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                {/* Calendar */}
                                                <FullCalendar
                                                    key={`day-${p.value}-${activeView}`}
                                                    ref={(el) => {
                                                        calendarRefs.current[p.value] = el;
                                                    }}
                                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                                    initialView="timeGridDay"
                                                    headerToolbar={false}
                                                    allDaySlot={false}
                                                    height="700px"
                                                    slotMinTime={provider === "all" ? "06:00:00" : "00:00:00"}
                                                    scrollTime="06:00:00"
                                                    contentHeight="auto"
                                                    views={{
                                                        dayGridMonth: { titleFormat: { year: "numeric", month: "long" } },
                                                        timeGridWeek: { titleFormat: { month: "short", day: "numeric" } },
                                                        timeGridDay: {
                                                            titleFormat: {
                                                                year: "numeric",
                                                                month: "long",
                                                                day: "numeric",
                                                                weekday: "long",
                                                            },
                                                        },
                                                    }}
                                                    datesSet={(arg) => {
                                                        setCalendarTitle(arg.view.title);
                                                        setActiveView(arg.view.type as ViewType);
                                                    }}
                                                    events={events.filter(
                                                        (e) => e.extendedProps.providerId === p.value
                                                    )}
                                                    selectable
                                                    select={(info) => handleDateSelect(info, p.value)}
                                                    eventClick={handleEventClick}
                                                    eventContent={renderEventContent}
                                                />
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            // === All Providers + Week/Month View → Stacked vertically with one shared scrollbar
                            <div className="h-[700px] overflow-y-auto flex flex-col gap-6">
                                {providers
                                    .filter((p) => p.value !== "all")
                                    .map((p) => (
                                        <div key={`${activeView}-${p.value}`} className="border rounded-md">
                                            <h3 className="bg-blue-500 text-white text-center font-medium py-2 rounded-t-md">
                                                {p.label}
                                            </h3>
                                            <FullCalendar
                                                key={`single-${provider}-${activeView}`}
                                                ref={calendarRef}
                                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                                initialView={activeView}
                                                headerToolbar={false}
                                                allDaySlot={false}
                                                height="700px"
                                                slotMinTime={provider === "all" ? "06:00:00" : "00:00:00"}
                                                scrollTime="06:00:00"
                                                views={{
                                                    dayGridMonth: { titleFormat: { year: "numeric", month: "long" } },
                                                    timeGridWeek: { titleFormat: { month: "short", day: "numeric" } },
                                                    timeGridDay: {
                                                        titleFormat: {
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                            weekday: "long",
                                                        },
                                                    },
                                                }}
                                                datesSet={(arg) => {
                                                    setCalendarTitle(arg.view.title);
                                                    setActiveView(arg.view.type as ViewType);
                                                }}
                                                events={events.filter((e) => {
                                                    const matchesProvider =
                                                        provider && provider !== "all"
                                                            ? e.extendedProps.providerId === provider
                                                            : true;
                                                    const matchesLocation =
                                                        location === "all" || e.extendedProps.locationId === location;
                                                    return matchesProvider && matchesLocation;
                                                })}
                                                selectable
                                                select={(info) =>
                                                    handleDateSelect(info, provider !== "all" ? provider : undefined)
                                                }
                                                eventClick={handleEventClick}
                                                eventContent={renderEventContent}
                                            />
                                        </div>
                                    ))}
                            </div>
                        )}
                    </>
                ) : (
                    // === Single Provider Selected
                    <div className="border rounded-md">
                        {provider && (
                            <h3 className="bg-blue-500 text-white text-center font-medium py-2 rounded-t-md">
                                {providers.find((p) => p.value === provider)?.label || ""}
                            </h3>
                        )}
                        <FullCalendar
                            key={`single-${provider}-${activeView}`}
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView={activeView}
                            headerToolbar={false}
                            allDaySlot={false}
                            height="700px"
                            slotMinTime={provider === "all" ? "06:00:00" : "00:00:00"}
                            scrollTime="06:00:00"
                            views={{
                                dayGridMonth: { titleFormat: { year: "numeric", month: "long" } },
                                timeGridWeek: { titleFormat: { month: "short", day: "numeric", year: "numeric" } },
                                timeGridDay: {
                                    titleFormat: {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        weekday: "long",
                                    },
                                },
                            }}
                            datesSet={(arg) => {
                                setCalendarTitle(arg.view.title);
                                setActiveView(arg.view.type as ViewType);
                            }}
                            events={events.filter((e) => {
                                const matchesProvider =
                                    provider && provider !== "all"
                                        ? e.extendedProps.providerId === provider
                                        : true;
                                const matchesLocation =
                                    location === "all" || e.extendedProps.locationId === location;
                                return matchesProvider && matchesLocation;
                            })}
                            selectable
                            select={(info) =>
                                handleDateSelect(info, provider !== "all" ? provider : undefined)
                            }
                            eventClick={handleEventClick}
                            eventContent={renderEventContent}
                            dayCellContent={dayCellContent}
                        />
                    </div>
                )}
            </div>










            {/* Inline "modal" panel — no blur, rendered inside this card */}
            {isOpen && (
                <div className="absolute inset-0 z-50">
                    {/* Transparent backdrop only to catch outside clicks (no blur, no dimming) */}
                    <button
                        aria-label="Close appointment panel"
                        onClick={closeModal}
                        className="absolute inset-0 bg-transparent"
                    />
                    {/* Panel */}
                    <div className="pointer-events-auto absolute left-1/2 top-6 w-[95%] max-w-[760px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-dark-900">
                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-5">
                            <div>
                                <h5 className="mb-1 font-semibold text-gray-800 text-theme-xl dark:text-white/90 lg:text-2xl">
                                    {selectedEvent ? 'Edit Appointment' : 'Add Appointment'}
                                </h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Schedule or edit an appointment to stay on track
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                            >
                                ×
                            </button>
                        </div>

                        {/* Video Call Section - Show for existing appointments with selected patient and provider */}
                        {selectedEvent && selectedPatientId && appointmentProviderId && (
                            <div className="mx-6 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-blue-900 text-sm">Telehealth Options</h4>
                                        <p className="text-blue-700 text-xs mt-1">
                                            Start a video call for this appointment
                                        </p>
                                    </div>
                                    <VideoCallButton
                                        appointmentId={selectedEvent.id ? Number(selectedEvent.id) : undefined}
                                        patientId={Number(selectedPatientId)}
                                        providerId={Number(appointmentProviderId)}
                                        patientName={selectedPatientName}
                                        variant="primary"
                                        size="sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Body */}
                        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto px-6 pb-6 lg:px-10">
                            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* Row 1: Visit Type / Patient */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Visit Type
                                    </label>
                                    <select
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                        value={visitType}
                                        onChange={(e) => setVisitType(e.target.value)}
                                    >
                                        {visitTypeOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>


                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Patient{" "}
                                        <span className="ml-2 rounded-md bg-red-100 px-2 py-[2px] text-xs font-medium text-red-700">
                                            required
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={selectedPatientName || patientQuery}
                                            onChange={(e) => {
                                                setSelectedPatientId('');
                                                setSelectedPatientName('');
                                                setPatientQuery(e.target.value);
                                                setShowPatientDropdown(true);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && patientResults.length > 0) {
                                                    e.preventDefault();
                                                    choosePatient(patientResults[0]);
                                                }
                                            }}
                                            onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
                                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                            placeholder="Search patient by name..."
                                        />
                                        {showPatientDropdown && (patientSearching || patientResults.length > 0) && (
                                            <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-900">
                                                {patientSearching ? (
                                                    <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
                                                ) : (
                                                    <ul className="max-h-56 overflow-auto py-1">
                                                        {patientResults.map((p) => {
                                                            const name = getPatientFullName(p);
                                                            return (
                                                                <li
                                                                    key={p.id}
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => choosePatient(p)}
                                                                    className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
                                                                >
                                                                    <div className="font-medium text-gray-800 dark:text-gray-100">
                                                                        {name || `Patient #${p.id}`}
                                                                    </div>
                                                                    {p.dateOfBirth ? (
                                                                        <div className="text-xs text-gray-500">DOB: {p.dateOfBirth}</div>
                                                                    ) : null}
                                                                </li>
                                                            );
                                                        })}
                                                        {patientResults.length === 0 && (
                                                            <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Row 2: Start / End Dates (MM/DD/YYYY UI) */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Appointment Start date
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="MM/DD/YYYY"
                                        maxLength={10}
                                        value={startDateInput}
                                        onChange={(e) => {
                                            const formatted = formatInputToMMDDYYYY(e.target.value);
                                            setStartDateInput(formatted);
                                            setStartDate(toISODateFromMMDDYYYY(formatted)); // ISO for logic
                                        }}
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Appointment End date
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="MM/DD/YYYY"
                                        maxLength={10}
                                        value={endDateInput}
                                        onChange={(e) => {
                                            const formatted = formatInputToMMDDYYYY(e.target.value);
                                            setEndDateInput(formatted);
                                            setEndDate(toISODateFromMMDDYYYY(formatted)); // ISO for logic
                                        }}
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                    />
                                </div>

                                {/* Row 3: Start / End Times */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Appointment start time
                                    </label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Appointment end time
                                    </label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                    />
                                </div>

                                {/* Row 4: Priority / Provider */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Priority
                                    </label>
                                    <select
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                        value={appointmentPriority}
                                        onChange={(e) => setAppointmentPriority(e.target.value as Priority)}
                                    >
                                        {priorityOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Provider{' '}
                                        <span className="ml-2 rounded-md bg-red-100 px-2 py-[2px] text-xs font-medium text-red-700">
                                            required
                                        </span>
                                    </label>
                                    <select
                                        required
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                        value={appointmentProviderId}
                                        onChange={(e) => setAppointmentProviderId(e.target.value)}
                                        disabled={!combinedStart || !combinedEnd || loadingProvidersForDate || providersForDate.length === 0}
                                    >
                                        <option value="">
                                            {!combinedStart || !combinedEnd
                                                ? 'Pick date & time first'
                                                : loadingProvidersForDate
                                                    ? 'Loading available providers…'
                                                    : providersForDate.length === 0
                                                        ? 'No providers scheduled for this slot'
                                                        : 'Select a provider...'}
                                        </option>
                                        {providersForDate.map((p) => (
                                            <option key={p.value} value={p.value}>
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Row 5: Location / Status */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Location{" "}
                                        <span className="ml-2 rounded-md bg-red-100 px-2 py-[2px] text-xs font-medium text-red-700">
                                            required
                                        </span>
                                    </label>
                                    <select
                                        required
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                        value={appointmentLocationId}
                                        onChange={(e) => setAppointmentLocationId(e.target.value)}
                                        disabled={!appointmentProviderId || providerLocationOptions.length === 0}
                                    >
                                        <option value="">
                                            {!appointmentProviderId
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

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Status
                                    </label>
                                    <select
                                        className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                        value={appointmentStatus}
                                        onChange={(e) => setAppointmentStatus(e.target.value as AppointmentStatus)}
                                    >
                                        {statusOptions.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Row 6: Reason / Chief Complaint */}
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Reason / Chief Complaint
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={appointmentNotes}
                                        onChange={(e) => setAppointmentNotes(e.target.value)}
                                        placeholder="e.g., chest discomfort for 2 days"
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-6 flex items-center gap-3 sm:justify-end">
                                <button
                                    onClick={closeModal}
                                    type="button"
                                    className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleAddOrUpdateAppointment}
                                    type="button"
                                    className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
                                    disabled={isSaving || !appointmentProviderId || !startDate || !startTime || !endDate || !endTime}
                                >
                                    {isSaving ? 'Saving...' : (selectedEvent ? 'Update Appointment' : 'Save Appointment')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
