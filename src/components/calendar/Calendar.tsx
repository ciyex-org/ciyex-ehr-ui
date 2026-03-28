
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
import FilterMultiSelect from "@/components/calendar/FilterMultiSelect";
import DateInput from "@/components/ui/DateInput";

const monthViewStyles = `
/* Hide horizontal scrollbar only — use clip (not hidden) so position:sticky still works */
.fc-view-harness {
  overflow-x: clip !important;
}

/* Month view: day cell minimum height */
.fc-daygrid-day-frame {
  min-height: 100px !important;
}

/* Month view: event styling */
.fc-dayGridMonth-view .fc-daygrid-event {
  border-radius: 4px !important;
  margin-bottom: 2px !important;
  font-size: 11px !important;
}

/* Month view: hide FullCalendar's default event dot */
.fc-dayGridMonth-view .fc-daygrid-event-dot {
  display: none !important;
}

/* Hide FullCalendar scrollbar to prevent double scrollbars */
.fc-scroller {
  overflow-x: clip !important;
}

.fc-daygrid-body {
  overflow: hidden !important;
}

/* Sticky day-of-week header row for Month / Week views
   Target fc-scrollgrid-section-header directly (works without stickyHeaderDates prop).
   overflow-x:clip on fc-view-harness is NOT a sticky containing block (only overflow:hidden/auto/scroll are),
   so sticky correctly propagates up to scrollContainerRef (overflow-auto). */
.fc .fc-scrollgrid-section-header > td,
.fc .fc-scrollgrid-section-header > th {
  position: sticky !important;
  top: 0 !important;
  z-index: 20 !important;
  background: white;
}
.dark .fc .fc-scrollgrid-section-header > td,
.dark .fc .fc-scrollgrid-section-header > th {
  background: #1a2231;
}

/* Multi-provider day view: hide time axis labels in non-first columns */
.multi-provider-grid .provider-col:not(:first-child) .fc-timegrid-axis,
.multi-provider-grid .provider-col:not(:first-child) .fc-timegrid-slot-label {
  visibility: hidden;
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
}

/* 11. Multi-provider grid: hide FC day headers (shown in sticky bar) */
.multi-provider-grid .fc-col-header {
  display: none !important;
}

/* Hide FC's built-in col header in Month and Week views — replaced by custom sticky header */
.cal-view-dayGridMonth .fc-col-header,
.cal-view-timeGridWeek .fc-col-header {
  display: none !important;
}

/* 12. Configurable working / non-working hours backgrounds */
.custom-calendar .fc-timegrid-col.fc-day {
  background-color: var(--cal-working-bg, #ffffff) !important;
}
.custom-calendar .fc-non-business {
  background-color: var(--cal-non-working-bg, #f1f5f9) !important;
}
.custom-calendar .fc-day-today {
  background-color: var(--cal-working-bg, #ffffff) !important;
}

/* Month view: custom day-number + event-count cell */
.fc-month-card {
  display: block;
  width: 100%;
}
.fc-month-card-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 2px 4px 2px 2px;
}
.fc-month-day {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.5;
  color: inherit;
}
.fc-month-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background-color: #22c55e;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

/* "+N more" link styling for month view overflow */
.fc .fc-daygrid-more-link {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #2563eb !important;
  padding: 2px 4px !important;
  margin-top: 2px !important;
}
.fc .fc-daygrid-more-link:hover {
  color: #1d4ed8 !important;
  text-decoration: underline !important;
}

/* Popover for "+N more" click — dropdown list of appointments */
.fc .fc-popover {
  border-radius: 8px !important;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
  border: 1px solid #e5e7eb !important;
  max-height: 300px !important;
  overflow-y: auto !important;
  z-index: 100 !important;
}
.fc .fc-popover-header {
  background: #f8fafc !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  padding: 8px 12px !important;
  border-bottom: 1px solid #e5e7eb !important;
}
.fc .fc-popover-body {
  padding: 4px !important;
}
.fc .fc-popover-body .fc-daygrid-event {
  margin: 2px 4px !important;
  border-radius: 4px !important;
}
`;

/* =========================
 * Types & Interfaces
 * ======================= */
/* Generic FHIR providers return dot-separated keys:
   identification.firstName, identification.lastName, systemAccess.status */
interface FhirProvider {
    id: string;
    'identification.firstName'?: string;
    'identification.lastName'?: string;
    'systemAccess.status'?: string;
    [key: string]: unknown;
}

/* Generic FHIR facilities return: name, status, address.line1, address.city, etc. */
interface FhirLocation {
    id: string;
    name?: string;
    status?: string;
    'address.line1'?: string;
    'address.city'?: string;
    'address.state'?: string;
    [key: string]: unknown;
}

/* Generic FHIR appointments return start/end ISO, patient/provider/location as references */
interface FhirAppointment {
    id: string;
    appointmentType?: string;
    status?: string;
    priority?: string;
    start?: string;
    end?: string;
    minutesDuration?: string;
    reason?: string;
    description?: string;
    patient?: string; // "Patient/123"
    provider?: string; // "Practitioner/456"
    location?: string | Record<string, unknown>; // "Location/789" or { reference: "Location/789" }
    patientName?: string;
    patientDisplay?: string;
    providerDisplay?: string;
    locationDisplay?: string;
    [key: string]: unknown;
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

type AppointmentStatus = 'proposed' | 'pending' | 'booked' | 'arrived' | 'checked-in' | 'fulfilled' | 'cancelled' | 'noshow' | 'entered-in-error' | 'waitlist' | string;
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

/* Helper to extract ID from FHIR reference strings like "Patient/123" */
const extractIdFromRef = (ref: string | Record<string, unknown> | undefined | null): string => {
    if (!ref) return '';
    // Handle FHIR reference object: { reference: "Location/123" }
    if (typeof ref === 'object') {
        const r = (ref as Record<string, unknown>).reference;
        if (typeof r === 'string') return r.includes('/') ? r.split('/').pop() || '' : r;
        return '';
    }
    return ref.includes('/') ? ref.split('/').pop() || '' : ref;
};

interface VisitType {
    activity: number;
    seq: number;
    title: string;
}

/* =========================
 * Dynamic color helper — generates deterministic color from string
 * ======================= */
type ColorTriple = { bg: string; border: string; text: string };

function hashString(str: string): number {
    // FNV-1a-like hash for better distribution on short strings
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0; // unsigned
}

function hslToHex(hue: number, sat: number, light: number): string {
    sat /= 100; light /= 100;
    const a = sat * Math.min(light, 1 - light);
    const f = (n: number) => {
        const k = (n + hue / 30) % 12;
        const c = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/** Calculate relative luminance and return dark or white text */
function contrastText(hexBg: string): string {
    const c = hexBg.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.45 ? '#1e293b' : '#FFFFFF';
}

function stringToColor(str: string): ColorTriple {
    const h = hashString(str);
    const hue = h % 360;
    const sat = 55 + ((h >> 10) % 20);  // 55-75%
    const lig = 45 + ((h >> 18) % 15);  // 45-60%
    const bg = hslToHex(hue, sat, lig);
    return {
        bg,
        border: hslToHex(hue, sat + 10, lig - 10),
        text: contrastText(bg),
    };
}

/* =========================
 * Helpers
 * ======================= */

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

// Format a local datetime string ("yyyy-mm-ddTHH:mm") as ISO with local timezone offset
// e.g. "2026-03-17T10:00" in IST → "2026-03-17T10:00:00+05:30"
// This tells the backend the exact intended local time, preventing UTC misinterpretation.
const toLocalISOWithOffset = (localDT: string): string => {
    const d = new Date(`${localDT}:00`);
    const off = -d.getTimezoneOffset(); // minutes ahead of UTC
    const sign = off >= 0 ? '+' : '-';
    const absOff = Math.abs(off);
    const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
    const mm = String(absOff % 60).padStart(2, '0');
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${hh}:${mm}`;
};

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
    if (rid) {
        const s = String(rid);
        return s.startsWith('Location/') ? s.split('/')[1] : s;
    }
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




const FALLBACK_STATUS_OPTIONS: Option<AppointmentStatus>[] = [
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Checked-in', label: 'Checked-in' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Re-Scheduled', label: 'Re-Scheduled' },
    { value: 'No Show', label: 'No Show' },
    { value: 'Cancelled', label: 'Cancelled' },
];

const priorityOptions: Option<Priority>[] = [
    { value: 'Routine', label: 'Routine' },
    { value: 'Urgent', label: 'Urgent' },
];



type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';



const Calendar: React.FC = () => {
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // Status options loaded from API (consistent with Appointment page)
    const [statusOptions, setStatusOptions] = useState<Option<AppointmentStatus>[]>(FALLBACK_STATUS_OPTIONS);

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
    // Quick Create Patient form in appointment modal
    const [showCreatePatient, setShowCreatePatient] = useState(false);
    const [createPatientSaving, setCreatePatientSaving] = useState(false);
    const [newPt, setNewPt] = useState({ firstName: '', lastName: '', dateOfBirth: '', gender: '', phoneNumber: '', email: '', status: 'Active' });
    const [newPtError, setNewPtError] = useState('');
    const nameRegex = /^[A-Za-z\s\-'.]+$/;
    const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const [startTime, setStartTime] = useState<string>('00:00');
    const [endTime, setEndTime] = useState<string>('00:00');

    // Reason / Chief Complaint
    const [appointmentNotes, setAppointmentNotes] = useState<string>('');

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const calendarRef = useRef<FullCalendar>(null);
    const { isOpen, openModal, closeModal } = useModal();

    // Loading state for save button
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") as string;

    // Header filters — empty array = "all" (show everything)
    const [providers, setProviders] = useState<{ value: string; label: string }[]>([{ value: 'all', label: 'All Providers' }]);
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    // Convenience: true when nothing is filtered (empty array = all; ["__none__"] = none)
    const noneProvidersSelected = selectedProviders.length === 1 && selectedProviders[0] === "__none__";
    const noneLocationsSelected = selectedLocations.length === 1 && selectedLocations[0] === "__none__";
    const allProvidersSelected = selectedProviders.length === 0;
    const allLocationsSelected = selectedLocations.length === 0;
    // Providers visible in multi-column day view
    const visibleProviders = useMemo(() => {
        const nonAll = providers.filter((p) => p.value !== "all");
        if (noneProvidersSelected) return [];
        if (allProvidersSelected) return nonAll;
        return nonAll.filter((p) => selectedProviders.includes(p.value));
    }, [providers, allProvidersSelected, selectedProviders]);

    // Modal provider list (based on chosen slot & location)
    const [providersForDate, setProvidersForDate] = useState<{ value: string; label: string }[]>([]);
    const [loadingProvidersForDate, setLoadingProvidersForDate] = useState(false);

    // Filtered locations for the selected provider (modal dropdown)
    const [providerLocationOptions, setProviderLocationOptions] = useState<
        { value: string; label: string }[]
    >([]);

    const combinedStart = useMemo(() => combineLocal(startDate, startTime), [startDate, startTime]);
    const combinedEnd = useMemo(() => combineLocal(endDate, endTime), [endDate, endTime]);

    // Calendar title + active view
    const [calendarTitle, setCalendarTitle] = useState<string>('');
    const [activeView, setActiveView] = useState<ViewType>('timeGridDay');
    const [weekViewDates, setWeekViewDates] = useState<Date[]>([]);
    const calendarRefs = useRef<Record<string, FullCalendar | null>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Working hours state — derived from loaded schedules, defaults to 8am-5pm
    const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
    const [workingHoursStart, setWorkingHoursStart] = useState<string>('08:00');
    const [workingHoursEnd, setWorkingHoursEnd] = useState<string>('17:00');

    // Dynamic color config loaded from backend
    const [colorConfig, setColorConfig] = useState<Record<string, ColorTriple>>({});

    // Compute working hours from schedules based on selected location
    useEffect(() => {
        if (allSchedules.length === 0) {
            setWorkingHoursStart('08:00');
            setWorkingHoursEnd('17:00');
            return;
        }

        let minStart = 24 * 60; // start with latest possible
        let maxEnd = 0;

        for (const s of allSchedules) {
            if (String(s.status).toLowerCase() !== 'active') continue;
            // If location filter is set, only consider schedules for those locations
            if (!allLocationsSelected && !selectedLocations.some(lid => scheduleHasLocation(s, lid))) continue;

            const r = s.recurrence;
            if (r?.startTime && r?.endTime) {
                const startMin = hmToMinutes(r.startTime);
                const endMin = hmToMinutes(r.endTime);
                if (startMin < minStart) minStart = startMin;
                if (endMin > maxEnd) maxEnd = endMin;
            }
        }

        // Only update if we found valid hours
        if (minStart < maxEnd) {
            const pad = (n: number) => String(n).padStart(2, '0');
            setWorkingHoursStart(`${pad(Math.floor(minStart / 60))}:${pad(minStart % 60)}`);
            setWorkingHoursEnd(`${pad(Math.floor(maxEnd / 60))}:${pad(maxEnd % 60)}`);
        } else {
            setWorkingHoursStart('08:00');
            setWorkingHoursEnd('17:00');
        }
    }, [allSchedules, allLocationsSelected, selectedLocations]);

    // FullCalendar businessHours config
    const businessHours = useMemo(() => ({
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startTime: workingHoursStart,
        endTime: workingHoursEnd,
    }), [workingHoursStart, workingHoursEnd]);

    // Scroll to working hours start when calendar renders
    useEffect(() => {
        const timer = setTimeout(() => {
            const container = scrollContainerRef.current;
            if (!container) return;
            const scrollTarget = `${workingHoursStart}:00`;
            const slot = container.querySelector(`[data-time="${scrollTarget}"]`);
            if (slot) {
                const containerRect = container.getBoundingClientRect();
                const slotRect = slot.getBoundingClientRect();
                container.scrollTop += slotRect.top - containerRect.top - 36;
            } else {
                container.scrollTop = container.scrollHeight * 0.25;
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [activeView, allProvidersSelected, selectedProviders, workingHoursStart]);

    // Are we showing multi-column day view? (more than 1 provider visible)
    const multiColumnDay = activeView === "timeGridDay" && (allProvidersSelected ? providers.length > 1 : selectedProviders.length !== 1);

    // FullCalendar controls — navigate ALL visible calendar instances
    const goPrev = () => {
        // Always navigate both refs and stacked refs so every visible calendar moves
        Object.values(calendarRefs.current).forEach(cal => cal?.getApi().prev());
        calendarRef.current?.getApi().prev();
    };

    const goNext = () => {
        Object.values(calendarRefs.current).forEach(cal => cal?.getApi().next());
        calendarRef.current?.getApi().next();
    };

    const changeView = useCallback((v: ViewType) => {
        setActiveView(v);
        // Change view on ALL calendar instances
        Object.values(calendarRefs.current).forEach(cal => {
            if (cal) cal.getApi().changeView(v);
        });
        if (calendarRef.current) {
            calendarRef.current.getApi().changeView(v);
        }
    }, []);


    // Shared provider fetch logic — reused on mount and on tab visibility restore
    const fetchProviders = useCallback(async () => {
        const toOption = (p: any) => {
            const firstName = p.identification?.firstName || p['identification.firstName'] || p.firstName || '';
            const lastName = p.identification?.lastName || p['identification.lastName'] || p.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            return {
                value: String(p.id || p.fhirId || ''),
                label: fullName || p.name || p.fullName || p.displayName || `Provider #${p.id || p.fhirId || ''}`,
            };
        };
        const isActive = (p: any) => {
            const rawStatus = p?.systemAccess?.status || p['systemAccess.status'];
            if (rawStatus == null || rawStatus === '' || rawStatus === undefined) return true;
            return !['INACTIVE', 'DISABLED', 'FALSE', 'SUSPENDED', '0', 'BLOCKED'].includes(String(rawStatus).toUpperCase());
        };
        try {
            const seen = new Map<string, any>();
            const addToMap = (list: any[]) => {
                for (const p of list) {
                    const id = String(p.id || p.fhirId || '');
                    if (id && !seen.has(id)) seen.set(id, p);
                }
            };
            // Try facade endpoint — returns enriched nested providers
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/providers`);
                if (res.ok) {
                    const json = await res.json();
                    const raw = json?.data?.content || json?.data || json?.content || json;
                    if (Array.isArray(raw)) addToMap(raw);
                }
            } catch { /* ignore */ }
            // Also try FHIR resource endpoint — catches providers the facade may miss
            try {
                const fb = await fetchWithAuth(`${apiUrl}/api/fhir-resource/providers?size=200`);
                if (fb.ok) {
                    const fj = await fb.json();
                    const fr = fj?.data?.content || fj?.data || fj?.content || fj;
                    if (Array.isArray(fr)) addToMap(fr);
                }
            } catch { /* ignore */ }
            const providerList = Array.from(seen.values());
            let active = providerList.filter(isActive).map(toOption).filter((p: any) => p.value);
            if (active.length === 0) active = providerList.map(toOption).filter((p: any) => p.value);
            setProviders([{ value: 'all', label: 'All Providers' }, ...active]);
        } catch (e) {
            console.error('Failed to fetch providers', e);
            setProviders((prev) => prev.length === 0 ? [{ value: 'all', label: 'All Providers' }] : prev);
        }
    }, [apiUrl]);

    // Fetch on mount
    useEffect(() => { fetchProviders(); }, [fetchProviders]);

    // Re-fetch when user returns to this tab so newly added providers appear without full reload
    useEffect(() => {
        const handleVisibility = () => { if (!document.hidden) fetchProviders(); };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [fetchProviders]);

    // No auto-select: let users freely choose "All Providers" in any view



    // Fetch locations — try /api/locations first (same as Appointments page), fallback to FHIR facilities
    useEffect(() => {
        (async () => {
            try {
                let opts: { value: string; label: string }[] = [];

                // Try /api/locations first (consistent with Appointments page)
                const res = await fetchWithAuth(`${apiUrl}/api/locations?page=0&size=1000`);
                if (res.ok) {
                    const json = await res.json();
                    const payload = json?.data || json;
                    const ld = payload?.content || (Array.isArray(payload) ? payload : []);
                    const list = Array.isArray(ld) ? ld : [];
                    if (list.length > 0) {
                        opts = list.filter((l: any) => l.id).map((l: any) => ({
                            value: String(l.id),
                            label: l.name || `Location #${l.id}`,
                        }));
                    }
                }

                // Fallback to FHIR facilities if /api/locations returned nothing
                if (opts.length === 0) {
                    const res2 = await fetchWithAuth(`${apiUrl}/api/fhir-resource/facilities?size=100`);
                    if (res2.ok) {
                        const json2 = await res2.json();
                        const content = json2?.data?.content || json2?.data || json2?.content || [];
                        const list = Array.isArray(content) ? content as FhirLocation[] : [];
                        opts = list.filter((l) => l.id).map((l) => ({
                            value: String(l.id),
                            label: `${l.name || ''}${l['address.line1'] ? ` - ${l['address.line1']}` : ''}`.trim() || `Location #${l.id}`,
                        }));
                    }
                }

                if (opts.length > 0) {
                    setLocations([{ value: 'all', label: 'All Locations' }, ...opts]);
                }
            } catch (e) {
                console.error('Failed to fetch locations', e);
            }
        })();
    }, [apiUrl]);

    // Load visit types from appointments field config (FHIR mapping source of truth)
    useEffect(() => {
        (async () => {
            // Try 1: Load from appointments field config (authoritative source)
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/tab-field-config/appointments`);
                if (res.ok) {
                    const json = await res.json();
                    const fc = typeof json.fieldConfig === 'string'
                        ? JSON.parse(json.fieldConfig)
                        : json.fieldConfig;
                    const sections = fc?.sections || [];
                    for (const section of sections) {
                        for (const field of (section?.fields || [])) {
                            if (field.key === 'appointmentType' && Array.isArray(field.options)) {
                                const opts = field.options.map((o: string | { value: string; label: string }) => {
                                    const str = typeof o === 'string' ? o : (o.value || o.label || '');
                                    return { value: str, label: str };
                                });
                                if (opts.length > 0) {
                                    setVisitTypeOptions(opts);
                                    return;
                                }
                            }
                        }
                    }
                }
            } catch {
                // fall through to list options
            }

            // Try 2: Load from list options
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/list-options/list/${encodeURIComponent('Visit Type')}`);
                const json = await res.json();
                const arr = Array.isArray(json) ? json : (json?.data || []);
                if (Array.isArray(arr) && arr.length > 0) {
                    const opts = arr
                        .filter((item: VisitType) => item.activity === 1)
                        .sort((a: VisitType, b: VisitType) => a.seq - b.seq)
                        .map((item: VisitType) => ({
                            value: item.title,
                            label: item.title,
                        }));
                    if (opts.length > 0) setVisitTypeOptions(opts);
                }
            } catch (err) {
                console.error("Failed to fetch visit types", err);
            }
        })();
    }, [apiUrl]);

    // Load all active schedules (for working hours + provider availability)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/schedules?status=active`);
                const json = await res.json();
                let schedules: Schedule[] = [];
                if (json?.success && json?.data) {
                    schedules = Array.isArray(json.data) ? json.data : (Array.isArray(json.data.content) ? json.data.content : []);
                }
                setAllSchedules(schedules);
            } catch (e) {
                console.error('Failed to load schedules', e);
            }
        })();
    }, [apiUrl]);

    // Load color config from backend (visit-type, provider, location colors)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/ui-colors`);
                const json = await res.json();
                if (json?.success && Array.isArray(json.data)) {
                    const map: Record<string, ColorTriple> = {};
                    for (const c of json.data) {
                        // Key by "category:entityKey" for lookup
                        map[`${c.category}:${c.entityKey}`] = {
                            bg: c.bgColor,
                            border: c.borderColor,
                            text: c.textColor,
                        };
                    }
                    setColorConfig(map);
                }
            } catch (e) {
                console.error('Failed to load color config', e);
            }
        })();
    }, [apiUrl]);

    // Fetch status options from API, fall back to canonical list
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${apiUrl}/api/appointments/status-options`);
                if (res.ok) {
                    const data = await res.json();
                    const opts = (data.data || []).map((o: any) =>
                        typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label }
                    ).filter((o: any) => o.value);
                    if (opts.length > 0) setStatusOptions(opts);
                }
            } catch (e) {
                // keep fallback
            }
        })();
    }, [apiUrl]);

    // Resolve color for a given category + key; falls back to deterministic random
    // label is used for the hash when no saved config (produces better variety than numeric IDs)
    const getColor = useCallback((category: string, key: string | undefined, label?: string): ColorTriple => {
        if (!key) return stringToColor('unknown');
        const saved = colorConfig[`${category}:${key}`];
        if (saved) {
            // Ensure saved colors also have good text contrast
            return { ...saved, text: contrastText(saved.bg) };
        }
        return stringToColor(label || key);
    }, [colorConfig]);

    // Cache patient names across loads to avoid repeated lookups
    const patientNameCache = useRef<Record<string, string>>({});

    const loadAppointments = useCallback(async () => {
        try {
            let page = 0;
            const size = 200;
            const maxPages = 5;
            let allEvents: CalendarEvent[] = [];
            let hasMore = true;

            while (hasMore && page < maxPages) {
                const res = await fetchWithAuth(
                    `${apiUrl}/api/fhir-resource/appointments?page=${page}&size=${size}`
                );
                const json = await res.json();

                if (json.success && json.data?.content) {
                    const events: CalendarEvent[] = (json.data.content as FhirAppointment[]).map((a) => {
                        const patientId = extractIdFromRef(a.patient) || String(a.patientId || '');
                        const providerId = extractIdFromRef(a.provider) || String(a.providerId || a.practitionerId || '');
                        const locationId = (() => {
                            // Try flat location field (string or FHIR ref object)
                            const fromLocation = extractIdFromRef(a.location as string | Record<string, unknown>);
                            if (fromLocation) return fromLocation;
                            // Try plain locationId field
                            if (a.locationId) return String(a.locationId);
                            // Try FHIR participant[] array for Location actor
                            const parts = (a as any).participant;
                            if (Array.isArray(parts)) {
                                for (const p of parts) {
                                    const ref: string = p?.actor?.reference || p?.actor || '';
                                    if (typeof ref === 'string' && ref.startsWith('Location/')) {
                                        return ref.split('/').pop() || '';
                                    }
                                }
                            }
                            return '';
                        })();

                        // Parse ISO start/end into local date strings (skip purely numeric values like IDs)
                        const rawStartStr = typeof a.start === 'string' && !/^\d+$/.test(a.start) ? a.start : '';
                        const rawEndStr = typeof a.end === 'string' && !/^\d+$/.test(a.end) ? a.end : '';
                        const startDt = rawStartStr ? new Date(rawStartStr) : null;
                        let endDt = rawEndStr ? new Date(rawEndStr) : null;

                        // If end is missing but start is valid, compute end from duration or default to +15 min
                        if (!endDt && startDt && !isNaN(startDt.getTime())) {
                            const dur = Number(a.minutesDuration ?? a.duration ?? a.durationMinutes ?? 15);
                            endDt = new Date(startDt.getTime() + (dur > 0 ? dur : 15) * 60 * 1000);
                        }

                        let name = a.patientName || a.patientDisplay || '';
                        if (!name && patientId && patientNameCache.current[patientId]) {
                            name = patientNameCache.current[patientId];
                        }

                        const providerEntry = providers.find(p => p.value === String(providerId));
                        const providerName = providerEntry?.label || '';
                        const providerColor = getColor('provider', String(providerId), providerName);

                        return {
                            id: String(a.id),
                            title: name || `Patient #${patientId || a.id}`,
                            start: startDt ? startDt.toISOString() : '',
                            end: endDt ? endDt.toISOString() : '',
                            allDay: false,
                            backgroundColor: providerColor.bg,
                            borderColor: providerColor.border,
                            textColor: providerColor.text,
                            extendedProps: {
                                visitType: a.appointmentType,
                                providerId: String(providerId),
                                providerName,
                                locationId: locationId ? String(locationId) : "",
                                status: a.status as AppointmentStatus,
                                notes: a.reason,
                                patientId: String(patientId),
                                patientName: name,
                                priority: a.priority as Priority,
                            },
                        };
                    });

                    // Only include events that have a valid start date — skip entries
                    // where the FHIR resource returned a numeric ID or empty string
                    // instead of an ISO datetime (causes ghost cells like "131", "147").
                    const validEvents = events.filter((e) => {
                        if (!e.start) return false;
                        const d = new Date(e.start as string);
                        return !isNaN(d.getTime());
                    });
                    allEvents = [...allEvents, ...validEvents];
                    hasMore = json.data.hasNext === true;
                    page++;
                } else {
                    hasMore = false;
                }
            }

            setEvents(allEvents);

            // Resolve missing patient names in the background
            const missingNames = allEvents.filter(
                (e) => e.extendedProps?.patientId && !e.extendedProps?.patientName
            );
            if (missingNames.length > 0) {
                const uniqueIds = [...new Set(missingNames.map((e) => e.extendedProps!.patientId!))];
                const batch = uniqueIds.slice(0, 20);
                const results = await Promise.allSettled(
                    batch.map(async (pid) => {
                        const pres = await fetchWithAuth(`${apiUrl}/api/patients/${pid}`);
                        const pjson = await pres.json();
                        if (pjson.success && pjson.data) {
                            const fullName = getPatientFullName(pjson.data);
                            patientNameCache.current[pid] = fullName;
                            return { pid, name: fullName };
                        }
                        return null;
                    })
                );

                const nameMap: Record<string, string> = {};
                results.forEach((r) => {
                    if (r.status === 'fulfilled' && r.value) {
                        nameMap[r.value.pid] = r.value.name;
                    }
                });

                if (Object.keys(nameMap).length > 0) {
                    setEvents((prev) =>
                        prev.map((e) => {
                            const pid = e.extendedProps?.patientId;
                            if (pid && nameMap[pid]) {
                                return {
                                    ...e,
                                    title: nameMap[pid],
                                    extendedProps: { ...e.extendedProps, patientName: nameMap[pid] },
                                };
                            }
                            return e;
                        })
                    );
                }
            }
        } catch (err) {
            console.error("Failed to load appointments", err);
        }
    }, [apiUrl, getColor, providers]);

    // Trigger loadAppointments when component is mounted or colors change
    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    // Reload appointments when a new one is created via the global AppointmentModal
    useEffect(() => {
        const handler = () => loadAppointments();
        window.addEventListener("appointments-changed", handler);
        return () => window.removeEventListener("appointments-changed", handler);
    }, [loadAppointments]);




    // Build provider list for chosen date/time (& location) — uses cached schedules
    useEffect(() => {
        if (!isOpen) {
            setProvidersForDate([]);
            return;
        }

        // If no date/time selected yet, show all providers so the dropdown is never empty
        if (!startDate) {
            setProvidersForDate(providers.filter(p => p.value !== "all"));
            return;
        }

        // If a provider is already selected (e.g. clicked from calendar column),
        // always show all providers so the pre-selected one stays visible.
        // Location-based filtering should never override an already-chosen provider.
        if (appointmentProviderId) {
            setProvidersForDate(providers.filter(p => p.value !== "all"));
            setLoadingProvidersForDate(false);
            return;
        }

        setLoadingProvidersForDate(true);
        const effectiveLocation =
            appointmentLocationId || (selectedLocations.length === 1 ? selectedLocations[0] : "all");

        const providerIds = new Set<number>();
        for (const s of allSchedules) {
            if (String(s.status).toLowerCase() !== "active") continue;
            // If full date+time available, check exact slot coverage
            if (combinedStart && combinedEnd) {
                if (hasOccurrenceCoveringSlot(s, combinedStart, combinedEnd) && scheduleHasLocation(s, effectiveLocation)) {
                    providerIds.add(Number(s.providerId));
                }
            } else {
                // Otherwise just check if provider has a schedule on this date
                if (hasOccurrenceOnDate(s, startDate) && scheduleHasLocation(s, effectiveLocation)) {
                    providerIds.add(Number(s.providerId));
                }
            }
        }

        const allowed = providers.filter((p) =>
            p.value !== "all" && providerIds.has(Number(p.value))
        );
        // Fallback to all active providers when no schedule-specific providers found
        setProvidersForDate(allowed.length > 0 ? allowed : providers.filter(p => p.value !== "all"));
        setLoadingProvidersForDate(false);
    }, [
        isOpen,
        combinedStart,
        combinedEnd,
        providers,
        appointmentProviderId,
        selectedLocations,
        appointmentLocationId,
        allSchedules,
    ]);


    // Slot-aware locations: ONLY the selected provider's locations (uses cached schedules).
    useEffect(() => {
        if (!appointmentProviderId) {
            setProviderLocationOptions([]);
            setAppointmentLocationId('');
            return;
        }

        const providerSchedules = allSchedules.filter(
            (s) => Number(s.providerId) === Number(appointmentProviderId)
        );

        const locIds = new Set<string>();
        providerSchedules.forEach((s) => {
            const coversSlot =
                combinedStart && combinedEnd
                    ? hasOccurrenceCoveringSlot(s, combinedStart, combinedEnd)
                    : true;

            if (coversSlot) {
                const lid = getLocationIdFromSchedule(s);
                if (lid) locIds.add(String(lid));
            }
        });

        const byId: Record<string, { value: string; label: string }> = {};
        locations.forEach((l) => (byId[l.value] = l));

        const filtered = Array.from(locIds).map((id) => byId[id]).filter(Boolean);

        // Fallback: if no schedule-based locations found, show all locations
        // so the user can still create the appointment
        const effectiveLocations = filtered.length > 0 ? filtered : locations.filter(l => l.value !== "all");
        setProviderLocationOptions(effectiveLocations);

        if (effectiveLocations.length === 1) {
            setAppointmentLocationId(effectiveLocations[0].value);
        } else if (
            appointmentLocationId &&
            !effectiveLocations.some((l) => l.value === appointmentLocationId)
        ) {
            setAppointmentLocationId('');
        } else if (
            effectiveLocations.length > 1 &&
            selectedLocations.length === 1 &&
            effectiveLocations.some((l) => l.value === selectedLocations[0])
        ) {
            setAppointmentLocationId(selectedLocations[0]);
        }
    }, [appointmentProviderId, combinedStart, combinedEnd, locations, allSchedules, appointmentLocationId, selectedLocations]);

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
        // Block past time slots — only allow current time or future
        if (selectInfo.start < new Date()) return;

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

        // ✅ Prefill location only if header filter is specific (single location)
        setAppointmentLocationId(selectedLocations.length === 1 ? selectedLocations[0] : '');

        openModal();
    }, [selectedLocations, openModal]);

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

        if (endDate < startDate) {
            setAlertData({
                variant: "error",
                title: "Invalid Date Range",
                message: "End date cannot be before start date.",
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

        // For new appointments only: check provider schedule
        if (!selectedEvent) {
            const providerScheds = allSchedules.filter(
                (s) => Number(s.providerId) === Number(appointmentProviderId)
            );
            const covers = providerScheds.some(s =>
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

        // Validate reason/condition field for special characters
        if (appointmentNotes && /[^A-Za-z0-9\s\-.,/()':#&+;@]/.test(appointmentNotes)) {
            setAlertData({
                variant: "error",
                title: "Invalid Characters",
                message: "Reason/condition contains invalid special characters. Only letters, numbers, and common punctuation are allowed.",
            });
            setIsSaving(false);
            return;
        }

        const participant: Record<string, unknown>[] = [
            { actor: { reference: `Patient/${selectedPatientId}` }, required: "required", status: "accepted" },
            { actor: { reference: `Practitioner/${appointmentProviderId}` }, required: "required", status: "accepted" },
        ];
        if (appointmentLocationId) {
            participant.push({ actor: { reference: `Location/${appointmentLocationId}` }, required: "required", status: "accepted" });
        }

        const dto: Record<string, unknown> = {
            appointmentType: visitType,
            status: appointmentStatus,
            priority: appointmentPriority,
            start: combinedStart ? toLocalISOWithOffset(combinedStart) : null,
            end: combinedEnd ? toLocalISOWithOffset(combinedEnd) : null,
            reason: appointmentNotes || null,
            patient: selectedPatientId ? `Patient/${selectedPatientId}` : null,
            provider: `Practitioner/${appointmentProviderId}`,
            participant,
        };
        if (appointmentLocationId) dto.location = `Location/${appointmentLocationId}`;

        try {
            let res;
            if (selectedEvent) {
                // Update existing appointment via generic FHIR
                res = await fetchWithAuth(
                    `${apiUrl}/api/fhir-resource/appointments/${selectedEvent.id}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(dto),
                    }
                );
            } else {
                // Create new appointment via generic FHIR
                res = await fetchWithAuth(`${apiUrl}/api/fhir-resource/appointments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dto),
                });
            }

            const json = await res.json();
            if (json.success) {
                // ✅ Re-fetch all appointments to keep calendar consistent
                await loadAppointments();

                // Notify other views (e.g. Appointments page) that data changed
                window.dispatchEvent(new Event("appointments-changed"));

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
    const handleCreatePatientAndSelect = async () => {
        if (!newPt.firstName || !newPt.lastName || !newPt.dateOfBirth || !newPt.phoneNumber || !newPt.gender || !newPt.email) return;
        setNewPtError('');
        // Validate name fields (letters, spaces, hyphens, apostrophes only)
        if (!nameRegex.test(newPt.firstName)) { setNewPtError('First name must contain only letters'); return; }
        if (!nameRegex.test(newPt.lastName)) { setNewPtError('Last name must contain only letters'); return; }
        // Validate phone format
        if (!phoneRegex.test(newPt.phoneNumber)) { setNewPtError('Please enter a valid phone number'); return; }
        // Validate email format
        if (!emailRegex.test(newPt.email)) { setNewPtError('Please enter a valid email address'); return; }
        setCreatePatientSaving(true);
        try {
            // Check for duplicate patient by phone number
            const dupRes = await fetchWithAuth(`${apiUrl}/api/patients?search=${encodeURIComponent(newPt.phoneNumber)}&size=5`);
            if (dupRes.ok) {
                const dupJson = await dupRes.json();
                const dupList = Array.isArray(dupJson) ? dupJson : dupJson?.data?.content || dupJson?.data || [];
                const existing = dupList.find((p: any) => (p.phoneNumber || p.phone || '').replace(/\D/g, '') === newPt.phoneNumber.replace(/\D/g, ''));
                if (existing) {
                    const eName = `${existing.firstName || ''} ${existing.lastName || ''}`.trim();
                    setNewPtError(`A patient "${eName}" already exists with this phone number. Please search for them instead.`);
                    setCreatePatientSaving(false);
                    return;
                }
            }
            const res = await fetchWithAuth(`${apiUrl}/api/patients`, {
                method: 'POST',
                body: JSON.stringify(newPt),
            });
            const json = await res.json();
            if (json.success && json.data) {
                const created = json.data;
                const name = `${created.firstName || newPt.firstName} ${created.lastName || newPt.lastName}`.trim();
                setSelectedPatientId(String(created.id));
                setSelectedPatientName(name);
                setShowCreatePatient(false);
                setNewPt({ firstName: '', lastName: '', dateOfBirth: '', gender: '', phoneNumber: '', status: 'Active' });
                setNewPtError('');
                setShowPatientDropdown(false);
                setPatientQuery('');
            } else {
                setNewPtError(json.message || 'Failed to create patient');
            }
        } catch {
            setNewPtError('Failed to create patient');
        } finally {
            setCreatePatientSaving(false);
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
        setShowCreatePatient(false);
        setNewPt({ firstName: '', lastName: '', dateOfBirth: '', gender: '', phoneNumber: '', status: 'Active' });
        setSelectedEvent(null);
        setIsSaving(false); // Reset saving state
    };

    // === Event renderer (inside component so we can read location labels) ===
    const renderEventContent = useCallback(
        (eventInfo: EventContentArg) => {
            const xp = eventInfo.event.extendedProps as {
                patientName?: string;
                visitType?: string;
                status?: string;
                providerName?: string;
            };

            const patientName = xp?.patientName || eventInfo.event.title;
            const startTime = eventInfo.event.start
                ? eventInfo.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

            const textColor = eventInfo.event.textColor || '#ffffff';

            return (
                <div className="fc-event-main rounded-sm px-1.5 py-0.5 text-xs leading-tight overflow-hidden">
                    <div className="font-semibold truncate" style={{ color: textColor }}>{patientName}</div>
                    <div className="mt-0.5">
                        <span className="truncate text-[10px]" style={{ color: textColor, opacity: 0.9 }}>{startTime}</span>
                    </div>
                </div>
            );
        },
        [activeView]
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
                // Always convert to local Date to get the correct local calendar day
                // (ISO strings from .toISOString() are UTC and substring(0,10) can shift dates)
                const eventStart = new Date(e.start as string | number | Date);
                if (isNaN(eventStart.getTime())) return false;
                const eventDateStr = eventStart.getFullYear() + '-' +
                    String(eventStart.getMonth() + 1).padStart(2, '0') + '-' +
                    String(eventStart.getDate()).padStart(2, '0');
                if (eventDateStr !== cellDateStr) return false;
                if (!allProvidersSelected && (!e.extendedProps.providerId || !selectedProviders.includes(String(e.extendedProps.providerId)))) return false;
                if (!allLocationsSelected && (!e.extendedProps.locationId || !selectedLocations.includes(String(e.extendedProps.locationId)))) return false;
                return true;
            }).length;

            // No count → default number
            if (count === 0) {
                return <span className="fc-daygrid-day-number">{arg.date.getDate()}</span>;
            }

            // Check if date is in the past (before today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const cellDateObj = new Date(cellDate);
            cellDateObj.setHours(0, 0, 0, 0);
            const isPastDate = cellDateObj < today;

            // Pill UI with click handlers
            return (
                <div
                    className={`fc-month-card ${isPastDate ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ display: 'block', width: '100%' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isPastDate) return;
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
                    <div
                        className="fc-month-card-inner"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '2px 4px 2px 2px' }}
                    >
                        <span className="fc-month-day" style={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: '1.5' }}>
                            {arg.date.getDate()}
                        </span>
                        <span
                            className="fc-month-count cursor-pointer hover:bg-green-600 transition-colors"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '20px', height: '20px', padding: '0 5px', borderRadius: '10px', backgroundColor: '#22c55e', color: '#fff', fontSize: '11px', fontWeight: 600, lineHeight: 1 }}
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
        [activeView, events, allProvidersSelected, selectedProviders, allLocationsSelected, selectedLocations]
    );




    /* =========================
     * Render
     * ======================= */
    return (
        <div className="relative flex flex-col h-full min-h-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
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
            <div className="flex items-center justify-between px-6 pt-4">

                {/* Left: Providers + Locations */}
                <div className="flex items-center gap-3">
                    <div className="w-48">
                        <FilterMultiSelect
                            label="Providers"
                            options={providers.filter((p) => p.value !== "all")}
                            selected={selectedProviders}
                            onChange={setSelectedProviders}
                        />
                    </div>
                    <div className="w-52">
                        <FilterMultiSelect
                            label="Locations"
                            options={locations.filter((l) => l && l.value && l.value !== "all")}
                            selected={selectedLocations}
                            onChange={setSelectedLocations}
                        />
                    </div>
                </div>

                {/* Center: Prev / Date / Next */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={goPrev}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-900"
                    >
                        &lt;
                    </button>

                    <div className="min-w-[240px] text-center text-base font-semibold text-gray-900 dark:text-white/90">
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

                {/* Right: View toggles */}
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

            {/* Calendar */}
            <div
                ref={scrollContainerRef}
                className={`custom-calendar flex-1 min-h-0 overflow-auto no-scrollbar cal-view-${activeView}`}
                style={{
                    '--cal-working-bg': colorConfig['calendar:working-hours-bg']?.bg || '#ffffff',
                    '--cal-non-working-bg': colorConfig['calendar:non-working-hours-bg']?.bg || '#f1f5f9',
                } as React.CSSProperties}
            >
                {/* Custom sticky day-of-week header for Month and Week views */}
                {!multiColumnDay && (activeView === 'dayGridMonth' || activeView === 'timeGridWeek') && (
                    <div className="sticky top-0 z-30 h-9 flex items-center bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-gray-700">
                        {activeView === 'dayGridMonth' ? (
                            <div className="grid grid-cols-7 w-full">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {day}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Week view: time-axis spacer + 7 day columns
                            <div className="flex w-full">
                                <div className="flex-none" style={{ width: '3.9em' }} />
                                <div className="flex-1 grid grid-cols-7">
                                    {(weekViewDates.length === 7 ? weekViewDates : Array.from({ length: 7 }, (_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - d.getDay() + i);
                                        return d;
                                    })).map((date, i) => (
                                        <div key={i} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            {date.toLocaleDateString('en-US', { weekday: 'short' })} {date.getDate()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {multiColumnDay ? (
                    /* === Multi-provider Day View → side-by-side columns */
                    <div className="overflow-x-auto" style={{ minWidth: 0 }}>
                        {/* Sticky provider name header row */}
                        <div
                            className="sticky top-0 z-20 bg-white dark:bg-dark-900 grid gap-px border-b"
                            style={{
                                gridTemplateColumns: `repeat(${Math.max(visibleProviders.length, 1)}, minmax(${visibleProviders.length > 5 ? '140px' : '180px'}, 1fr))`,
                                minWidth: visibleProviders.length > 5 ? `${visibleProviders.length * 140}px` : undefined,
                            }}
                        >
                            {visibleProviders.map((p) => {
                                const clr = getColor('provider', p.value, p.label);
                                return (
                                    <div
                                        key={`hdr-${p.value}`}
                                        className="flex items-center justify-center gap-1 py-2 text-xs font-semibold"
                                        style={{ backgroundColor: clr.bg, color: clr.text }}
                                    >
                                        <span className="truncate">{p.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Provider calendar columns grid */}
                        <div
                            className="multi-provider-grid grid gap-px"
                            style={{
                                gridTemplateColumns: `repeat(${Math.max(visibleProviders.length, 1)}, minmax(${visibleProviders.length > 5 ? '140px' : '180px'}, 1fr))`,
                                minWidth: visibleProviders.length > 5 ? `${visibleProviders.length * 140}px` : undefined,
                            }}
                        >
                            {visibleProviders.map((p) => (
                                <div key={`day-${p.value}`} className="provider-col border-r border-gray-200 last:border-r-0">
                                    <FullCalendar
                                        key={`day-${p.value}-${activeView}`}
                                        ref={(el) => { calendarRefs.current[p.value] = el; }}
                                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                        initialView="timeGridDay"
                                        headerToolbar={false}
                                        dayHeaders={false}
                                        allDaySlot={false}
                                        nowIndicator={true}
                                        height="auto"
                                        contentHeight="auto"
                                        slotMinTime="00:00:00"
                                        slotDuration="00:15:00"
                                        slotLabelInterval="00:30:00"
                                        defaultTimedEventDuration="00:15:00"
                                        scrollTime={`${workingHoursStart}:00`}
                                        businessHours={businessHours}
                                        views={{ timeGridDay: { titleFormat: { year: "numeric", month: "long", day: "numeric", weekday: "long" } } }}
                                        datesSet={(arg) => {
                                            setCalendarTitle(arg.view.title);
                                            setActiveView(arg.view.type as ViewType);
                                        }}
                                        events={events.filter((e) => {
                                            const eProv = String(e.extendedProps.providerId || "");
                                            const matchProv = eProv === p.value || !eProv || !visibleProviders.some(vp => vp.value === eProv);
                                            const matchLoc = allLocationsSelected || (e.extendedProps.locationId && selectedLocations.includes(String(e.extendedProps.locationId)));
                                            return matchProv && matchLoc;
                                        })}
                                        selectable
                                        select={(info) => handleDateSelect(info, p.value)}
                                        eventClick={handleEventClick}
                                        eventContent={renderEventContent}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : visibleProviders.length > 1 ? (
                    /* === Multiple Providers in Week/Month View → stacked vertically */
                    <div className="flex flex-col gap-6">
                        {visibleProviders.map((p) => {
                            const clr = getColor('provider', p.value, p.label);
                            return (
                                <div key={`${activeView}-${p.value}`} className="border rounded-md">
                                    <h3
                                        className={`sticky z-10 text-center font-medium py-2 rounded-t-md ${activeView !== 'timeGridDay' ? 'top-9' : 'top-0'}`}
                                        style={{ backgroundColor: clr.bg, color: clr.text }}
                                    >
                                        {p.label}
                                    </h3>
                                    <FullCalendar
                                        key={`stacked-${p.value}-${activeView}`}
                                        ref={(el) => { calendarRefs.current[`stacked-${p.value}`] = el; }}
                                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                        initialView={activeView}
                                        headerToolbar={false}
                                        allDaySlot={false}
                                        nowIndicator={true}
                                        height="auto"
                                        contentHeight="auto"
                                        slotMinTime="00:00:00"
                                        slotDuration="00:15:00"
                                        slotLabelInterval="00:30:00"
                                        defaultTimedEventDuration="00:15:00"
                                        scrollTime={`${workingHoursStart}:00`}
                                        businessHours={businessHours}
                                        eventDisplay="block"
                                        dayMaxEvents={3}
                                        moreLinkClick="popover"
                                        views={{
                                            dayGridMonth: { titleFormat: { year: "numeric", month: "long" } },
                                            timeGridWeek: { titleFormat: { month: "short", day: "numeric" } },
                                            timeGridDay: { titleFormat: { year: "numeric", month: "long", day: "numeric", weekday: "long" } },
                                        }}
                                        datesSet={(arg) => {
                                            setCalendarTitle(arg.view.title);
                                            setActiveView(arg.view.type as ViewType);
                                            if (arg.view.type === 'timeGridWeek') {
                                                const start = new Date(arg.view.currentStart);
                                                setWeekViewDates(Array.from({ length: 7 }, (_, i) => {
                                                    const d = new Date(start);
                                                    d.setDate(d.getDate() + i);
                                                    return d;
                                                }));
                                            }
                                        }}
                                        events={events.filter((e) => {
                                            const eProv = String(e.extendedProps.providerId || "");
                                            const matchProv = eProv === p.value || !eProv || !visibleProviders.some(vp => vp.value === eProv);
                                            const matchLoc = allLocationsSelected || (e.extendedProps.locationId && selectedLocations.includes(String(e.extendedProps.locationId)));
                                            return matchProv && matchLoc;
                                        })}
                                        selectable
                                        select={(info) => handleDateSelect(info, p.value)}
                                        eventClick={handleEventClick}
                                        eventContent={renderEventContent}
                                        dayCellContent={dayCellContent}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* === Single Provider / Single Calendar View */
                    (() => {
                        const singleProviderId = selectedProviders.length === 1 ? selectedProviders[0] : undefined;
                        const provLabel = singleProviderId ? (providers.find((p) => p.value === singleProviderId)?.label || "") : "";
                        const provClr = singleProviderId ? getColor('provider', singleProviderId, provLabel) : { bg: '', text: '' };
                        return (
                            <div className="border rounded-md">
                                {singleProviderId && (
                                    <h3
                                        className={`sticky z-10 text-center font-medium py-2 rounded-t-md ${activeView !== 'timeGridDay' ? 'top-9' : 'top-0'}`}
                                        style={{ backgroundColor: provClr.bg, color: provClr.text }}
                                    >
                                        {provLabel}
                                    </h3>
                                )}
                                <FullCalendar
                                    key={`single-${singleProviderId || 'all'}-${activeView}`}
                                    ref={calendarRef}
                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                    initialView={activeView}
                                    headerToolbar={false}
                                    allDaySlot={false}
                                    nowIndicator={true}
                                    height="auto"
                                    contentHeight="auto"
                                    slotMinTime="00:00:00"
                                    slotDuration="00:15:00"
                                    defaultTimedEventDuration="00:15:00"
                                    scrollTime={`${workingHoursStart}:00`}
                                    businessHours={businessHours}
                                    eventDisplay="block"
                                    dayMaxEvents={3}
                                    moreLinkClick="popover"
                                    views={{
                                        dayGridMonth: { titleFormat: { year: "numeric", month: "long" } },
                                        timeGridWeek: { titleFormat: { month: "short", day: "numeric", year: "numeric" } },
                                        timeGridDay: { titleFormat: { year: "numeric", month: "long", day: "numeric", weekday: "long" } },
                                    }}
                                    datesSet={(arg) => {
                                        setCalendarTitle(arg.view.title);
                                        setActiveView(arg.view.type as ViewType);
                                        if (arg.view.type === 'timeGridWeek') {
                                            const start = new Date(arg.view.currentStart);
                                            setWeekViewDates(Array.from({ length: 7 }, (_, i) => {
                                                const d = new Date(start);
                                                d.setDate(d.getDate() + i);
                                                return d;
                                            }));
                                        }
                                    }}
                                    events={events.filter((e) => {
                                        const matchProv = allProvidersSelected
                                            ? true
                                            : selectedProviders.includes(String(e.extendedProps.providerId || ""));
                                        const matchLoc = allLocationsSelected || (e.extendedProps.locationId && selectedLocations.includes(String(e.extendedProps.locationId)));
                                        return matchProv && matchLoc;
                                    })}
                                    selectable
                                    select={(info) => handleDateSelect(info, singleProviderId || undefined)}
                                    eventClick={handleEventClick}
                                    eventContent={renderEventContent}
                                    dayCellContent={dayCellContent}
                                />
                            </div>
                        );
                    })()
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
                                            <div className="absolute z-60 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-900">
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
                                                            <li className="px-3 py-2 text-sm text-gray-500">
                                                                No matches —{' '}
                                                                <button
                                                                    type="button"
                                                                    className="text-blue-600 hover:underline font-medium"
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => { setShowCreatePatient(true); setShowPatientDropdown(false); }}
                                                                >
                                                                    Create New Patient
                                                                </button>
                                                            </li>
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                        {/* Quick Create Patient button when no search has been done yet */}
                                        {!showPatientDropdown && !selectedPatientId && (
                                            <button
                                                type="button"
                                                className="mt-1 text-xs text-blue-600 hover:underline"
                                                onClick={() => setShowCreatePatient(true)}
                                            >
                                                + Create New Patient
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Inline Create New Patient Form */}
                                {showCreatePatient && (
                                    <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-4 space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Create New Patient</span>
                                            <button type="button" onClick={() => setShowCreatePatient(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
                                        </div>
                                        {newPtError && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1 mb-2">{newPtError}</p>}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">First Name*</label>
                                                <input type="text" value={newPt.firstName} onChange={(e) => { const v = e.target.value.replace(/[0-9]/g, ''); setNewPt(p => ({ ...p, firstName: v })); setNewPtError(''); }} className={`h-8 w-full rounded-md border px-2 text-sm dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100 ${newPt.firstName && !nameRegex.test(newPt.firstName) ? 'border-red-400' : 'border-gray-300'}`} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">Last Name*</label>
                                                <input type="text" value={newPt.lastName} onChange={(e) => { const v = e.target.value.replace(/[0-9]/g, ''); setNewPt(p => ({ ...p, lastName: v })); setNewPtError(''); }} className={`h-8 w-full rounded-md border px-2 text-sm dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100 ${newPt.lastName && !nameRegex.test(newPt.lastName) ? 'border-red-400' : 'border-gray-300'}`} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">Date of Birth*</label>
                                                <DateInput value={newPt.dateOfBirth} max={new Date().toISOString().split('T')[0]} onChange={(e) => { const v = e.target.value; if (v > new Date().toISOString().split('T')[0]) return; setNewPt(p => ({ ...p, dateOfBirth: v })); }} className="h-8 w-full rounded-md border border-gray-300 px-2 text-sm dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100" />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">Gender*</label>
                                                <select value={newPt.gender} onChange={(e) => setNewPt(p => ({ ...p, gender: e.target.value }))} className="h-8 w-full rounded-md border border-gray-300 px-2 text-sm dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100">
                                                    <option value="">Select</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Unknown">Unknown</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">Phone Number*</label>
                                                <input type="tel" value={newPt.phoneNumber} maxLength={10} onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 10); setNewPt(p => ({ ...p, phoneNumber: digits })); }} className="h-8 w-full rounded-md border border-gray-300 px-2 text-sm dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100" />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">Email*</label>
                                                <input type="email" value={newPt.email} onChange={(e) => { setNewPt(p => ({ ...p, email: e.target.value.trim() })); setNewPtError(''); }} className={`h-8 w-full rounded-md border px-2 text-sm dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100 ${newPt.email && !emailRegex.test(newPt.email) ? 'border-red-400' : 'border-gray-300'}`} placeholder="patient@example.com" />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-400">Status</label>
                                                <select value={newPt.status} onChange={(e) => setNewPt(p => ({ ...p, status: e.target.value }))} className="h-8 w-full rounded-md border border-gray-300 px-2 text-sm dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100">
                                                    <option value="Active">Active</option>
                                                    <option value="Inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button type="button" onClick={() => setShowCreatePatient(false)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
                                            <button type="button" onClick={handleCreatePatientAndSelect} disabled={createPatientSaving || !newPt.firstName || !newPt.lastName || !newPt.dateOfBirth || !newPt.phoneNumber || !newPt.gender || !newPt.email || !emailRegex.test(newPt.email)} className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                                                {createPatientSaving ? 'Creating...' : 'Create & Select Patient'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Date Row: Start Date | End Date */}
                                <div className="col-span-2 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                            Start Date
                                        </label>
                                        <DateInput
                                            value={startDate}
                                            onChange={(e) => {
                                                const d = e.target.value;
                                                setStartDate(d);
                                                setStartDateInput(d ? d.split('-').reverse().join('/') : '');
                                                if (!endDate && d) { setEndDate(d); setEndDateInput(d.split('-').reverse().join('/')); }
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
                                            onChange={(e) => {
                                                const d = e.target.value;
                                                setEndDate(d);
                                                setEndDateInput(d ? d.split('-').reverse().join('/') : '');
                                            }}
                                            className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                        />
                                    </div>
                                </div>

                                {/* Time Row: Start Time | End Time */}
                                <div className="col-span-2 grid grid-cols-2 gap-3">
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
                                                    if (t) {
                                                        const startDt = new Date(`${startDate || '2000-01-01'}T${t}`);
                                                        const endDt = new Date(startDt.getTime() + 15 * 60 * 1000);
                                                        setEndTime(`${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`);
                                                    }
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
                                                onChange={(e) => {
                                                    setEndTime(e.target.value);
                                                    setEndDateInput(endDate ? endDate.split('-').reverse().join('/') : '');
                                                }}
                                                className="h-9 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
                                            />
                                        </div>
                                    </div>
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
                                        disabled={loadingProvidersForDate || providersForDate.length === 0}
                                    >
                                        <option value="">
                                            {loadingProvidersForDate
                                                    ? 'Loading available providers…'
                                                    : providersForDate.length === 0
                                                        ? 'No providers available'
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
                                        disabled={providerLocationOptions.length === 0}
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
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            // Block invalid special characters — allow letters, digits, spaces, common medical punctuation
                                            if (v && /[^A-Za-z0-9\s\-.,/()':#&+;@]/.test(v)) {
                                                setAlertData({ variant: "warning", title: "Invalid Characters", message: "Reason/condition contains invalid special characters." });
                                                setAppointmentNotes(v.replace(/[^A-Za-z0-9\s\-.,/()':#&+;@]/g, ""));
                                            } else {
                                                setAppointmentNotes(v);
                                            }
                                        }}
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
