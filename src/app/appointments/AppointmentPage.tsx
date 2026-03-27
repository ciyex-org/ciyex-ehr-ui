"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  Loader2, Video, Tv, Monitor, Clock,
  ChevronDown, ArrowRight, ExternalLink, Activity, FilePlus, FileText, Printer, Download,
} from "lucide-react";
import VideoCallModal from "@/components/telehealth/VideoCallModal";
import { SlideOverPanel } from "@/components/ui/slide-over-panel";
import DynamicEncounterForm from "@/components/patients/DynamicEncounterForm";
import PatientChartPanel from "@/components/patients/PatientChartPanel";
import Encountersummary from "@/components/encounter/summary/Encountersummary";
import { usePermissions } from "@/context/PermissionContext";
import DateInput from "@/components/ui/DateInput";
import * as XLSX from "xlsx";
import { toast } from "@/utils/toast";

type PanelState =
  | { mode: "closed" }
  | { mode: "vitals"; patientId: number; encounterId: number; patientName: string }
  | { mode: "encounter"; patientId: number; encounterId: number; patientName: string }
  | { mode: "patient"; patientId: number; patientName: string }
  | { mode: "summary"; patientId: number; encounterId: number; patientName: string };

export type AppointmentDTO = {
  id: number;
  visitType: string;
  patientId: number;
  providerId: number;
  appointmentStartDate: string;
  appointmentEndDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  priority: string;
  locationId: number;
  status: string;
  room?: string;
  reason: string;
  orgId: number;
  patientName?: string;
  encounterId?: string;      // populated after auto-encounter creation
  encounterPatientId?: number;
  locationName?: string;     // from FHIR reference resolution
  patientPhone?: string;     // from patient record
  providerName?: string;     // from FHIR reference resolution
  _lastUpdated?: string;     // from FHIR meta.lastUpdated
  audit?: {
    createdDate?: string;
    lastModifiedDate?: string;
  };
};

interface StatusOption {
  value: string;
  label: string;
  color?: string;
  triggersEncounter?: boolean;
  terminal?: boolean;
  nextStatus?: string;
  order?: number;
  encounterNote?: string;
}

const FALLBACK_STATUS_OPTIONS: StatusOption[] = [
  { value: 'Scheduled',     label: 'Scheduled',     color: '#3b82f6', order: 0, nextStatus: 'Confirmed' },
  { value: 'Confirmed',     label: 'Confirmed',     color: '#6366f1', order: 1, nextStatus: 'Checked-in' },
  { value: 'Checked-in',    label: 'Checked-in',    color: '#f59e0b', order: 2, nextStatus: 'Completed', triggersEncounter: true },
  { value: 'Completed',     label: 'Completed',     color: '#10b981', order: 3, terminal: true },
  { value: 'Re-Scheduled',  label: 'Re-Scheduled',  color: '#8b5cf6', order: 4, nextStatus: 'Scheduled' },
  { value: 'No Show',       label: 'No Show',       color: '#ef4444', order: 5, terminal: true },
  { value: 'Cancelled',     label: 'Cancelled',     color: '#6b7280', order: 6, terminal: true },
];

interface Provider { id: number; name: string; }
interface Location { id: number; name: string; }

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** Normalize an appointment DTO so that time fields are always populated.
 *  Handles cases where the backend returns a full ISO datetime in appointmentStartDate
 *  (e.g. "2026-03-17T10:00:00.000Z") and leaves appointmentStartTime empty, which
 *  happens when appointments are saved via the FHIR endpoint. */
function normalizeApptTimes(appt: AppointmentDTO): AppointmentDTO {
  const raw = appt as Record<string, unknown>;
  const rawStart = (raw.start as string) || '';
  const rawEnd   = (raw.end   as string) || '';
  let startDate = String(appt.appointmentStartDate || rawStart || '');
  let endDate   = String(appt.appointmentEndDate   || rawEnd   || '');
  let startTime = String(appt.appointmentStartTime || '');
  let endTime   = String(appt.appointmentEndTime   || '');

  // Guard: if date is purely numeric (e.g. an ID), discard it
  if (/^\d+$/.test(startDate)) startDate = '';
  if (/^\d+$/.test(endDate)) endDate = '';

  // If we have a full ISO datetime (with T), extract local date and time from it
  if (startDate.includes('T')) {
    const d = new Date(startDate);
    if (!isNaN(d.getTime())) {
      startTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      startDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  } else if (!startTime && rawStart.includes('T')) {
    // appointmentStartDate is date-only but time is missing — try raw FHIR start field
    const d = new Date(rawStart);
    if (!isNaN(d.getTime())) {
      startTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      startDate = startDate || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }

  if (endDate.includes('T')) {
    const d = new Date(endDate);
    if (!isNaN(d.getTime())) {
      endTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      endDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  } else if (!endTime && rawEnd.includes('T')) {
    const d = new Date(rawEnd);
    if (!isNaN(d.getTime())) {
      endTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      endDate = endDate || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }

  // Extract locationId from FHIR location reference string (e.g. "Location/6735")
  let locationId = appt.locationId;
  const rawLoc = (raw as any).location;
  if ((!locationId || locationId === 0) && typeof rawLoc === 'string' && rawLoc.includes('/')) {
    const extracted = Number(rawLoc.split('/').pop());
    if (!isNaN(extracted) && extracted > 0) locationId = extracted;
  }

  return { ...appt, appointmentStartDate: startDate, appointmentEndDate: endDate, appointmentStartTime: startTime, appointmentEndTime: endTime, locationId };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayFormatted(): string {
  const d = new Date();
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

function formatToMMDDYYYY(iso: string): string {
  if (!iso) return "";
  // Guard: reject purely numeric strings (e.g. IDs like "131")
  if (/^\d+$/.test(iso)) return "";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

function formatTimeTo12h(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function parseMMDDYYYY(s: string): string | null {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const [mmStr, ddStr, yyyyStr] = parts;
  const mm = parseInt(mmStr, 10);
  const dd = parseInt(ddStr, 10);
  const yyyy = parseInt(yyyyStr, 10);
  if (Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(yyyy)) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return `${yyyy}-${pad(mm)}-${pad(dd)}`;
}

function timeFromMMDDYYYY(s: string, fallback: number, endOfDay = false): number {
  const iso = parseMMDDYYYY(s);
  if (!iso) return fallback;
  // Use local time to match appointment date parsing which also uses local time
  return endOfDay
    ? new Date(iso + "T23:59:59.999").getTime()
    : new Date(iso + "T00:00:00").getTime();
}

/** Format wait time = Current Time - Scheduled Appointment Time (uses local timezone).
 *  Only shows wait time for TODAY's appointments where the appointment time has passed.
 *  Returns null for future appointments or appointments from other days. */
function formatWaitTime(scheduledDateTime: string): { text: string; color: string } | null {
  if (!scheduledDateTime) return null;
  // Parse as local time (no "Z" suffix so it's treated as local)
  const raw = scheduledDateTime.endsWith("Z") ? scheduledDateTime.slice(0, -1) : scheduledDateTime;
  const scheduled = new Date(raw).getTime();
  if (isNaN(scheduled)) return null;

  // Only show wait time for today's appointments
  const now = new Date();
  const scheduledDate = new Date(raw);
  if (
    scheduledDate.getFullYear() !== now.getFullYear() ||
    scheduledDate.getMonth() !== now.getMonth() ||
    scheduledDate.getDate() !== now.getDate()
  ) {
    return null; // not today — no wait time
  }

  const mins = Math.floor((now.getTime() - scheduled) / 60000);
  if (mins < 0) return null; // appointment hasn't started yet
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const text = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const color = mins < 15 ? "#22c55e" : mins < 30 ? "#eab308" : "#ef4444";
  return { text, color };
}

/** Extract display text from a FHIR CodeableConcept or raw Java toString string */
function normalizeVisitType(raw: unknown): string {
  if (!raw) return "";
  // Already a plain string — check if it's a Java object toString like "{coding=[...], text=Telehealth}"
  if (typeof raw === "string") {
    // Try to extract text= value from Java toString format
    const textMatch = raw.match(/\btext=([^,}]+)/);
    if (textMatch) return textMatch[1].trim();
    // Try to extract display= value from coding array
    const displayMatch = raw.match(/\bdisplay=([^,}\]]+)/);
    if (displayMatch) return displayMatch[1].trim();
    return raw;
  }
  // It's an object (proper JSON)
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.text && typeof obj.text === "string") return obj.text;
    const coding = obj.coding;
    if (Array.isArray(coding) && coding.length > 0) {
      const first = coding[0] as Record<string, unknown>;
      if (first.display && typeof first.display === "string") return first.display;
      if (first.code && typeof first.code === "string") return first.code;
    }
  }
  return String(raw);
}

/** Calculate duration between start and end time strings (HH:mm) */
function calcDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "";
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "";
  const totalMins = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMins <= 0) return "";
  if (totalMins >= 60) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${totalMins} mins`;
}

const fetchPatientInfo = async (id: number): Promise<{ name: string; phone?: string }> => {
  try {
    const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`);
    if (!res.ok) return { name: String(id) };
    const data = await res.json();
    if (!data?.data) return { name: String(id) };
    return {
      name: `${data.data.firstName ?? ""} ${data.data.lastName ?? ""}`.trim() || String(id),
      phone: data.data.phoneNumber || undefined,
    };
  } catch {
    return { name: String(id) };
  }
};

/** Toast notification */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm animate-slideInRight">
      {message}
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">&times;</button>
    </div>
  );
}

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "15s", value: 15000 },
  { label: "30s", value: 30000 },
  { label: "60s", value: 60000 },
];

/** Date preset options for the date filter dropdown */
const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Current Month", value: "current_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Upcoming", value: "upcoming" },
  { label: "All Time", value: "all_time" },
];

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  const today = fmt(now);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "last_7_days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: fmt(d), to: fmt(new Date(now.getTime() - 86400000)) }; // exclude today
    }
    case "current_month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(d), to: today };
    }
    case "last_month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(d), to: fmt(end) };
    }
    case "upcoming": {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureEnd = new Date(now);
      futureEnd.setFullYear(futureEnd.getFullYear() + 1);
      return { from: fmt(tomorrow), to: fmt(futureEnd) };
    }
    case "all_time":
      return { from: "", to: "" };
    default:
      return { from: today, to: today };
  }
}

export default function AppointmentPage() {
  const { canWriteResource } = usePermissions();
  const canWriteAppointment = canWriteResource("Appointment");
  const canWriteEncounter = canWriteResource("Encounter");

  const [category, setCategory] = useState<string>("All Visit Categories");
  const [categories, setCategories] = useState<string[]>([]);
  const [provider, setProvider] = useState<string>("All Providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [location, setLocation] = useState<string>("All Locations");
  const [locations, setLocations] = useState<Location[]>([]);
  const [datePreset, setDatePreset] = useState<string>("today");
  const [from, setFrom] = useState<string>(() => typeof window !== "undefined" ? todayFormatted() : "");
  const [to, setTo] = useState<string>(() => typeof window !== "undefined" ? todayFormatted() : "");
  const [patientName, setPatientName] = useState("");
  const [rows, setRows] = useState<AppointmentDTO[]>([]);

  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Status
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [hideCompleted, setHideCompleted] = useState(false); // show all statuses by default
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>(FALLBACK_STATUS_OPTIONS);
  const [mounted, setMounted] = useState(false);

  // Room
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const DEFAULT_ROOM_OPTIONS = ["Exam 1", "Exam 2", "Exam 3", "Exam 4", "Lab", "Procedure Room", "Triage"];
  const [roomOptions, setRoomOptions] = useState<string[]>(DEFAULT_ROOM_OPTIONS);

  // Auto-refresh
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [refreshOpen, setRefreshOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Slide-over panel (encounter/vitals)
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });

  // Video
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [selectedAppointmentForVideo, setSelectedAppointmentForVideo] = useState<AppointmentDTO | null>(null);

  // TV dropdown
  const [tvOpen, setTvOpen] = useState(false);

  // Silent refresh indicator (spinning icon only, no table flash)
  const [refreshing, setRefreshing] = useState(false);

  // Wait time ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000); // update wait times every 30s
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // Close dropdowns on outside click (#13)
  const refreshRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (refreshRef.current && !refreshRef.current.contains(e.target as Node)) {
        setRefreshOpen(false);
      }
      if (tvRef.current && !tvRef.current.contains(e.target as Node)) {
        setTvOpen(false);
      }
      // Close status/room inline dropdowns when clicking outside their select elements
      const target = e.target as HTMLElement;
      if (editingStatusId !== null && !target.closest('[data-status-edit]')) {
        setEditingStatusId(null);
      }
      if (editingRoomId !== null && !target.closest('[data-room-edit]')) {
        setEditingRoomId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editingStatusId, editingRoomId]);

  // Fetch status options from API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/status-options`);
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
  }, []);

  // Fetch room options — try dedicated endpoint, then tab_field_config, then locations as fallback
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/room-options`);
        if (res.ok) {
          const data = await res.json();
          const opts = data.data || [];
          if (opts.length > 0) { setRoomOptions(opts); return; }
        }
      } catch (e) {
        console.error("Failed to fetch room options:", e);
      }
      // Fallback: try to get room options from tab_field_config
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/tab-field-config/appointments`);
        if (res.ok) {
          const json = await res.json();
          const config = json.data || json;
          const fc = typeof config.fieldConfig === "string" ? JSON.parse(config.fieldConfig) : config.fieldConfig;
          const sections: Array<{ fields?: Array<{ key: string; options?: Array<{ value?: string; label?: string }> }> }> = fc?.sections || [];
          for (const section of sections) {
            for (const field of section.fields || []) {
              if ((field.key === "room" || field.key === "roomNumber" || field.key === "roomName") && field.options?.length) {
                setRoomOptions(field.options.map((o: any) => typeof o === "string" ? o : (o.value || o.label || "")));
                return;
              }
            }
          }
        }
      } catch { /* ignore */ }
      // Fallback: use location names as room options
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/locations?page=0&size=100`);
        if (res.ok) {
          const data = await res.json();
          const locs = data.data?.content || data.content || data.data || [];
          const names = locs.map((l: any) => l.name || l.locationName).filter(Boolean);
          if (names.length > 0) setRoomOptions(names);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Visit Categories — loaded from tab_field_config appointmentType options
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/tab-field-config/appointments`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        const config = json.data || json;
        const fc = typeof config.fieldConfig === "string" ? JSON.parse(config.fieldConfig) : config.fieldConfig;
        const sections: Array<{ fields?: Array<{ key: string; options?: unknown[] }> }> = fc?.sections || [];
        for (const section of sections) {
          for (const field of (section?.fields || [])) {
            if (field.key === "appointmentType" && Array.isArray(field.options)) {
              const strings = field.options.map((item) =>
                typeof item === "string" ? item : String((item as Record<string, unknown>)?.value ?? (item as Record<string, unknown>)?.label ?? "")
              ).filter(Boolean);
              if (strings.length > 0) { setCategories(strings); return; }
            }
          }
        }
      } catch { /* leave categories empty */ }
      finally { setLoadingCategories(false); }
    })();
  }, []);

  // Providers
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/providers`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const providerList = data?.data?.content || data?.data || data?.content || data || [];
        setProviders((Array.isArray(providerList) ? providerList : []).map((p: any) => ({
          id: p.id || p.fhirId || "",
          name: p.identification
            ? `${p.identification.firstName || ""} ${p.identification.lastName || ""}`.trim()
            : (p.name || p.displayName || "Unknown Provider"),
        })).filter((p: any) => p.id && p.name));
      } catch { setProviders([]); }
      finally { setLoadingProviders(false); }
    })();
  }, []);

  // Locations
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/locations?page=0&size=1000`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const payload = data?.data || data;
        const ld = payload?.content || (Array.isArray(payload) ? payload : []);
        const locs = Array.isArray(ld) ? ld.map((l: any) => ({ id: l.id, name: l.name })) : [];
        setLocations(locs);
      } catch { setLocations([]); }
      finally { setLoadingLocations(false); }
    })();
  }, []);

  // Appointments loader — silent=true skips loading spinner (used by auto-refresh)
  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoadingAppointments(true);
    if (silent) setRefreshing(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage - 1),
        size: String(pageSize),
      });
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);
      // Pass date range for server-side FHIR filtering
      const isoFrom = from ? parseMMDDYYYY(from) : null;
      const isoTo = to ? parseMMDDYYYY(to) : null;
      if (isoFrom) params.set("dateFrom", isoFrom);
      if (isoTo) params.set("dateTo", isoTo);

      const res = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments?${params.toString()}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();

      const payload = data?.data ?? {};
      const content: AppointmentDTO[] = payload.content ?? [];
      const totalPagesVal = payload.totalPages ?? 1;
      const totalElementsVal = payload.totalElements ?? content.length;

      if (Array.isArray(content)) {
        const enriched = await Promise.all(
          content.map(async (appt) => {
            const info = await fetchPatientInfo(appt.patientId);
            const raw = appt as any;
            return normalizeApptTimes({ ...appt, patientName: info.name, patientPhone: info.phone, visitType: normalizeVisitType(raw.visitType), room: raw.room || raw.roomName || raw.room_name || raw.roomNumber || undefined });
          })
        );
        setRows(enriched);
        setTotalPages(totalPagesVal);
        setTotalItems(totalElementsVal);
        // Determine if there's a next page
        // hasNext from API, or last=false (Spring Page), or currentPage < totalPages
        const hasMore = payload.hasNext === true
          || payload.last === false
          || (currentPage < totalPagesVal);
        setHasNextPage(hasMore);
      } else {
        setRows([]);
        setTotalPages(1);
        setTotalItems(0);
        setHasNextPage(false);
      }
    } catch (err) {
      console.error(err);
      if (!silent) setRows([]);
    } finally {
      if (!silent) setLoadingAppointments(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize, statusFilter, from, to, datePreset]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Reload when a new appointment is created via the global AppointmentModal
  useEffect(() => {
    const handler = () => loadAppointments(true);
    window.addEventListener("appointments-changed", handler);
    return () => window.removeEventListener("appointments-changed", handler);
  }, [loadAppointments]);

  // Auto-refresh (silent — no loading flash)
  useEffect(() => {
    if (!refreshInterval) return;
    const t = setInterval(() => loadAppointments(true), refreshInterval);
    return () => clearInterval(t);
  }, [refreshInterval, loadAppointments]);

  const onPrint = () => {
    // Build a clean print table from actual data — no raw innerHTML to avoid interactive elements
    const pw = window.open("", "_blank");
    if (!pw) { window.print(); return; }

    const printRows = filtered.map((r) => {
      const statusOpt = getStatusOption(r.status);
      return `<tr>
        <td>${formatToMMDDYYYY(r.appointmentStartDate)}<br><small>${formatTimeTo12h(r.appointmentStartTime) || "—"} - ${formatTimeTo12h(r.appointmentEndTime) || "—"}</small></td>
        <td>${r.patientName || "—"}<br><small>MRN: ${r.patientId}</small>${r.patientPhone ? `<br><small>${r.patientPhone}</small>` : ""}</td>
        <td>${r.providerName || providers.find((p) => String(p.id) === String(r.providerId))?.name || "—"}</td>
        <td>${r.locationName || locations.find((l) => String(l.id) === String(r.locationId))?.name || "—"}</td>
        <td>${typeof r.visitType === "object" && r.visitType !== null ? ((r.visitType as any).text || (r.visitType as any).coding?.[0]?.display || "—") : (r.visitType || "—")}</td>
        <td>${statusOpt?.label || r.status || "—"}</td>
        <td>${r.room || "—"}</td>
        <td>${r.reason || "—"}</td>
      </tr>`;
    }).join("");

    pw.document.write(`<!DOCTYPE html><html><head><title>Ciyex | FrontDesk</title><style>
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0.5in; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
      th { background: #f9fafb; font-weight: 600; text-transform: uppercase; font-size: 10px; color: #6b7280; }
      small { color: #6b7280; }
      @page { size: landscape; margin: 0.5in; }
      h2 { text-align: center; font-size: 14px; margin-bottom: 8px; }
    </style></head><body>
      <h2>${formatToMMDDYYYY(todayISO())} &mdash; Appointments</h2>
      <table>
        <thead><tr>
          <th>Date</th><th>Patient</th><th>Provider</th><th>Location</th><th>Type</th><th>Status</th><th>Room</th><th>Reason</th>
        </tr></thead>
        <tbody>${printRows}</tbody>
      </table>
    </body></html>`);
    pw.document.close();
    setTimeout(() => { pw.print(); pw.close(); }, 300);
  };

  // Handle date preset change (#5)
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const range = getDateRange(preset);
    setFrom(range.from);
    setTo(range.to);
    setCurrentPage(1);
  };

  // Status option lookup — case-insensitive and normalizes underscores/hyphens
  const getStatusOption = useCallback(
    (value: string): StatusOption | undefined => {
      if (!value) return undefined;
      const normalize = (v: string) => v.toLowerCase().replace(/[_\s]+/g, "-");
      const norm = normalize(value);
      return statusOptions.find((o) => normalize(o.value) === norm);
    },
    [statusOptions]
  );

  // Update status with auto-encounter
  const updateStatus = useCallback(
    async (row: AppointmentDTO, newStatus: string) => {
      try {
        const res = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/${row.id}/status`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          }
        );
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to update status");
        }
        setEditingStatusId(null);

        // Check if encounter was auto-created
        const d = json.data;
        if (d?.encounterId) {
          setToast(`Encounter created (#${d.encounterId})`);
          // Update the row locally with encounter info
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? { ...r, status: newStatus, encounterId: d.encounterId, encounterPatientId: d.encounterPatientId }
                : r
            )
          );
        } else {
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r))
          );
        }
        // Notify other views (e.g. Calendar) that appointment data changed
        window.dispatchEvent(new Event("appointments-changed"));
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Failed to update status");
      }
    },
    []
  );

  // Quick-advance: one-click workflow button
  const advanceStatus = useCallback(
    (row: AppointmentDTO) => {
      const opt = getStatusOption(row.status);
      if (opt?.nextStatus) {
        updateStatus(row, opt.nextStatus);
      }
    },
    [getStatusOption, updateStatus]
  );

  // Manual encounter creation
  const createEncounter = useCallback(async (row: AppointmentDTO) => {
    try {
      const res = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/${row.id}/encounter`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to create encounter");
      }
      const d = json.data;
      setToast(`Encounter created (#${d.encounterId})`);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, encounterId: d.encounterId, encounterPatientId: d.encounterPatientId }
            : r
        )
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create encounter");
    }
  }, []);

  // Update room assignment
  const updateRoom = useCallback(
    async (row: AppointmentDTO, newRoom: string) => {
      try {
        const res = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/${row.id}/room`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: newRoom }),
          }
        );
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to update room");
        }
        setEditingRoomId(null);
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, room: newRoom } : r))
        );
        setToast(`Room assigned: ${newRoom || "cleared"}`);
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Failed to update room");
      }
    },
    []
  );

  // Client-side filters
  const filtered = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    const fromTime = from ? timeFromMMDDYYYY(from, -Infinity) : -Infinity;
    const toTime = to ? timeFromMMDDYYYY(to, Infinity, true) : Infinity;

    const normalize = (v: string) => (v || "").toLowerCase().replace(/[_\s]+/g, "-");
    return rows.filter((r) => {
      const d = new Date(r.appointmentStartDate?.includes("T") ? r.appointmentStartDate : r.appointmentStartDate + "T00:00:00").getTime();
      const matchDate = d >= fromTime && d <= toTime;
      const matchProvider = provider === "All Providers" || String(r.providerId) === String(provider);
      const visitTypeStr = typeof r.visitType === "object" && r.visitType !== null ? ((r.visitType as any).text || (r.visitType as any).coding?.[0]?.display || "") : (r.visitType || "");
      const matchCategory = category === "All Visit Categories" || visitTypeStr === category;
      const matchLocation = location === "All Locations" || String(r.locationId) === String(location);
      const matchPatient = !patientName || (r.patientName || "").toLowerCase().includes(patientName.trim().toLowerCase());
      // Client-side status filter (fallback for when API doesn't filter server-side)
      const matchStatus = statusFilter === "All" || normalize(r.status) === normalize(statusFilter);
      // Hide completed/terminal statuses when toggle is on
      const matchCompleted = !hideCompleted || (() => {
        const opt = statusOptions.find((o) => normalize(o.value) === normalize(r.status));
        return !opt?.terminal;
      })();
      return matchDate && matchProvider && matchCategory && matchLocation && matchPatient && matchStatus && matchCompleted;
    }).sort((a, b) => {
      // Sort by date descending (recent first), then by time descending
      const dateA = new Date(a.appointmentStartDate?.includes("T") ? a.appointmentStartDate : a.appointmentStartDate + "T00:00:00").getTime();
      const dateB = new Date(b.appointmentStartDate?.includes("T") ? b.appointmentStartDate : b.appointmentStartDate + "T00:00:00").getTime();
      if (dateA !== dateB) return dateB - dateA;
      // Parse time strings (HH:mm format) for same-day sorting (recent first)
      const timeA = (a.appointmentStartTime || "").replace(":", "");
      const timeB = (b.appointmentStartTime || "").replace(":", "");
      return timeB.localeCompare(timeA);
    });
  }, [rows, from, to, provider, category, location, patientName, hideCompleted, statusOptions, statusFilter]);

  const colCount = 9;
  const total = filtered.length;
  const handlePrevious = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage(p => p + 1);

  const handleVideoCall = (appointment: AppointmentDTO) => {
    setSelectedAppointmentForVideo(appointment);
    setVideoCallModalOpen(true);
  };

  const isVirtualAppointment = (visitType: string) => {
    const type = (visitType || "").toLowerCase();
    return type.includes("telehealth") || type.includes("virtual") || type.includes("video");
  };

  // Export to Excel (#16)
  const exportToExcel = () => {
    const data = filtered.map((r) => ({
      "Date": formatToMMDDYYYY(r.appointmentStartDate),
      "Start Time": r.appointmentStartTime || "",
      "End Time": r.appointmentEndTime || "",
      "Duration": calcDuration(r.appointmentStartTime, r.appointmentEndTime),
      "Patient": r.patientName || "",
      "MRN": r.patientId,
      "Phone": r.patientPhone || "",
      "Provider": r.providerName || providers.find((p) => String(p.id) === String(r.providerId))?.name || "",
      "Location": locations.find((l) => String(l.id) === String(r.locationId))?.name || "",
      "Type": typeof r.visitType === "object" && r.visitType !== null ? ((r.visitType as any).text || (r.visitType as any).coding?.[0]?.display || "") : (r.visitType || ""),
      "Status": getStatusOption(r.status)?.label || r.status,
      "Room": r.room || "",
      "Reason": r.reason || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appointments");
    XLSX.writeFile(wb, `appointments_${todayISO()}.xlsx`);
  };

  // Render status badge with config-driven color
  const renderStatusBadge = (status: string) => {
    const opt = getStatusOption(status);
    const color = opt?.color || "#94a3b8";
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1 whitespace-nowrap"
        style={{
          backgroundColor: color + "20",
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {opt?.label || status}
      </span>
    );
  };

  if (!mounted) return null;

  return (
    <AdminLayout>
      <div className="text-gray-800 dark:text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 no-print">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {loadingAppointments ? "..." : `${total} appointments`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-refresh dropdown */}
            <div ref={refreshRef} className="relative">
              <button
                onClick={() => setRefreshOpen(!refreshOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-500" : refreshInterval ? "text-green-500" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {REFRESH_OPTIONS.find((o) => o.value === refreshInterval)?.label || "Off"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {refreshOpen && (
                <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-25">
                  {REFRESH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setRefreshInterval(opt.value); setRefreshOpen(false); }}
                      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        refreshInterval === opt.value ? "font-semibold text-blue-600" : ""
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            {/* Excel Export (#16) */}
            <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            {/* TV dropdown */}
            <div ref={tvRef} className="relative">
              <button
                onClick={() => setTvOpen(!tvOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Tv className="w-3.5 h-3.5" />
                TV Display
                <ChevronDown className="w-3 h-3" />
              </button>
              {tvOpen && (
                <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-45">
                  <button
                    onClick={() => { window.open("/appointments/tv?mode=staff", "_blank"); setTvOpen(false); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Monitor className="w-4 h-4 text-blue-500" />
                    Staff TV Board
                  </button>
                  <button
                    onClick={() => { window.open("/appointments/tv?mode=waiting-room", "_blank"); setTvOpen(false); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Tv className="w-4 h-4 text-green-500" />
                    Waiting Room
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table (#7, #8, #9, #10, #14, #15) */}
        <div ref={tableRef} className="print-appointment-table overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-5">
              {/* Filter row — each dropdown aligned above its column */}
              <tr className="no-print">
                <th className="py-1.5 px-3">
                  <select value={datePreset} onChange={(e) => handleDatePreset(e.target.value)}
                    className="w-full rounded border px-1.5 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 font-normal">
                    {DATE_PRESETS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </th>
                <th className="py-1.5 px-3">
                  <input type="text" placeholder="Search patient..." value={patientName} onChange={(e) => setPatientName(e.target.value)}
                    className="w-full rounded border px-1.5 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 font-normal" />
                </th>
                <th className="py-1.5 px-3">
                  <select value={provider} onChange={(e) => setProvider(e.target.value)}
                    className="w-full rounded border px-1.5 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 font-normal">
                    <option value="All Providers">All Providers</option>
                    {loadingProviders ? <option disabled>Loading...</option> :
                      providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </th>
                <th className="py-1.5 px-3">
                  <select value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded border px-1.5 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 font-normal">
                    <option value="All Locations">All Locations</option>
                    {loadingLocations ? <option disabled>Loading...</option> :
                      locations.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                </th>
                <th className="py-1.5 px-3">
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded border px-1.5 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 font-normal">
                    <option value="All Visit Categories">All Types</option>
                    {loadingCategories ? <option disabled>Loading...</option> :
                      categories.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
                  </select>
                </th>
                <th className="py-1.5 px-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full rounded border px-1.5 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 font-normal"
                  >
                    <option value="All">All Status</option>
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </th>
                <th className="py-1.5 px-3"></th>
                <th className="py-1.5 px-3">
                  {/* Custom date range for All Time */}
                  {datePreset === "all_time" && (
                    <div className="flex items-center gap-1">
                      <DateInput value={from ? parseMMDDYYYY(from) || "" : ""} onChange={(e) => { const v = e.target.value; if (v) setFrom(formatToMMDDYYYY(v)); else setFrom(""); setCurrentPage(1); }}
                        className="rounded border px-1 py-0.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 w-24" title="Start date" />
                      <DateInput value={to ? parseMMDDYYYY(to) || "" : ""} onChange={(e) => { const v = e.target.value; if (v) setTo(formatToMMDDYYYY(v)); else setTo(""); setCurrentPage(1); }}
                        className="rounded border px-1 py-0.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 w-24" title="End date" />
                    </div>
                  )}
                </th>
                <th className="py-1.5 px-3"></th>
              </tr>
              {/* Column headers */}
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-800">
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Date</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Patient</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Provider</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Location</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Type</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Status</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Room</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Wait</th>
                <th className="py-2.5 px-3 text-left text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingAppointments ? (
                <tr>
                  <td colSpan={colCount} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No appointments match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const statusOpt = getStatusOption(r.status);
                  const isCancelled = r.status === "cancelled";
                  const isTerminal = statusOpt?.terminal;
                  const hasNext = statusOpt?.nextStatus;
                  const nextOpt = hasNext ? getStatusOption(hasNext) : undefined;

                  // Wait time = Current Time - Scheduled Appointment Time (for active appointments only)
                  const waitStatusOpt = getStatusOption(r.status);
                  const showWait = !isCancelled && !waitStatusOpt?.terminal;
                  // Always use scheduled appointment start time for wait calculation
                  const waitTimestamp = r.appointmentStartDate && r.appointmentStartTime
                    ? `${r.appointmentStartDate}T${r.appointmentStartTime}`
                    : r.appointmentStartDate
                      ? `${r.appointmentStartDate}T00:00:00`
                      : "";
                  const waitInfo = showWait ? formatWaitTime(waitTimestamp) : null;
                  const duration = calcDuration(r.appointmentStartTime, r.appointmentEndTime);

                  return (
                    <tr
                      key={`${r.patientId}-${r.id}`}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700 ${
                        isCancelled ? "opacity-50" : ""
                      }`}
                    >
                      {/* Date (#8 — Date first with start-end time + duration) */}
                      <td className="py-1.5 px-3 text-sm whitespace-nowrap">
                        <div className="font-medium">{formatToMMDDYYYY(r.appointmentStartDate)}</div>
                        <div className="text-xs text-gray-500">
                          {formatTimeTo12h(r.appointmentStartTime) || "—"} - {formatTimeTo12h(r.appointmentEndTime) || "—"}
                        </div>
                        {duration && (
                          <div className="text-xs text-gray-400">{duration}</div>
                        )}
                      </td>

                      {/* Patient */}
                      <td className="py-1.5 px-3 text-sm">
                        <button
                          onClick={() => setPanel({ mode: "patient", patientId: r.patientId, patientName: r.patientName || "Patient" })}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {r.patientName || "—"}
                        </button>
                        <div className="text-xs text-gray-400">MRN: {r.patientId}</div>
                        {r.patientPhone && (
                          <div className="text-xs text-gray-400">{r.patientPhone}</div>
                        )}
                      </td>

                      {/* Provider (#9 — always show name, never raw ID) */}
                      <td className="py-1.5 px-3 text-sm">
                        {r.providerName || providers.find((p) => String(p.id) === String(r.providerId))?.name || "—"}
                      </td>

                      {/* Location (#10) */}
                      <td className="py-1.5 px-3 text-sm">
                        {r.locationName || (r as any).locationDisplay || locations.find((l) => String(l.id) === String(r.locationId))?.name || "—"}
                      </td>

                      {/* Type */}
                      <td className="py-1.5 px-3 text-sm">{typeof r.visitType === "object" && r.visitType !== null ? ((r.visitType as any).text || (r.visitType as any).coding?.[0]?.display || (r.visitType as any).coding?.[0]?.code || "—") : (r.visitType || "—")}</td>

                      {/* Status — badge + workflow button */}
                      <td className="py-1.5 px-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          {editingStatusId === r.id ? (
                            <div className="flex items-center gap-1" data-status-edit>
                              <select
                                autoFocus
                                defaultValue={r.status}
                                className="rounded border px-2 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600"
                                onChange={(e) => {
                                  if (e.target.value && e.target.value !== r.status) updateStatus(r, e.target.value);
                                }}
                                onBlur={() => setEditingStatusId(null)}
                              >
                                {statusOptions.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                              <button
                                className="text-xs text-gray-400 hover:text-gray-600"
                                onClick={() => setEditingStatusId(null)}
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => canWriteAppointment && setEditingStatusId(r.id)}
                                title={canWriteAppointment ? "Click to change status" : "No permission to change status"}
                                className={!canWriteAppointment ? "cursor-default" : ""}
                              >
                                {renderStatusBadge(r.status)}
                              </button>
                              {/* Workflow quick-action */}
                              {canWriteAppointment && hasNext && !isTerminal && nextOpt && (
                                <button
                                  onClick={() => advanceStatus(r)}
                                  className="flex items-center gap-0.5 px-2 py-0.5 text-xs rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                  title={`Advance to ${nextOpt.label}`}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  {nextOpt.label}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Room */}
                      <td className="py-1.5 px-3 text-sm relative">
                        {editingRoomId === r.id ? (
                          <select
                            data-room-edit
                            autoFocus
                            defaultValue={r.room || ""}
                            className="rounded border px-2 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 min-w-20 z-20 relative"
                            onChange={(e) => {
                              updateRoom(r, e.target.value);
                            }}
                            onBlur={() => setEditingRoomId(null)}
                          >
                            <option value="">— None —</option>
                            {roomOptions.map((rm) => (
                              <option key={rm} value={rm}>{rm}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingRoomId(r.id)}
                            className={`text-xs px-2 py-0.5 rounded ${
                              r.room
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 font-medium"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            title="Click to assign room"
                          >
                            {r.room || "Assign"}
                          </button>
                        )}
                      </td>

                      {/* Wait time */}
                      <td className="py-1.5 px-3 text-sm">
                        {waitInfo ? (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: waitInfo.color }}>
                            <Clock className="w-3 h-3" />
                            {waitInfo.text}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-3 text-sm no-print">
                        <div className="flex items-center gap-1.5">
                          {isVirtualAppointment(r.visitType) && (
                            <button
                              className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                              onClick={() => handleVideoCall(r)}
                              title="Video Call"
                            >
                              <Video className="h-4 w-4" />
                            </button>
                          )}
                          {r.encounterId ? (
                            <>
                              <button
                                onClick={() => setPanel({
                                  mode: "encounter",
                                  patientId: r.encounterPatientId || r.patientId,
                                  encounterId: Number(r.encounterId),
                                  patientName: r.patientName || "Patient",
                                })}
                                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                                title="Open Chart"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setPanel({
                                  mode: "vitals",
                                  patientId: r.encounterPatientId || r.patientId,
                                  encounterId: Number(r.encounterId),
                                  patientName: r.patientName || "Patient",
                                })}
                                className="p-1.5 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600"
                                title="Record Vitals"
                              >
                                <Activity className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setPanel({
                                  mode: "summary",
                                  patientId: r.encounterPatientId || r.patientId,
                                  encounterId: Number(r.encounterId),
                                  patientName: r.patientName || "Patient",
                                })}
                                className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600"
                                title="Visit Summary"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            </>
                          ) : canWriteEncounter ? (
                            <button
                              onClick={() => createEncounter(r)}
                              className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                              title="Create Encounter"
                            >
                              <FilePlus className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Status summary bar */}
        {!loadingAppointments && filtered.length > 0 && (
          <div className="flex items-center gap-4 mt-1 px-2 text-xs text-gray-500 no-print">
            {statusOptions
              .filter((s) => s.color)
              .map((s) => {
                const count = filtered.filter((r) => r.status === s.value).length;
                if (count === 0) return null;
                return (
                  <span key={s.value} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}: {count}
                  </span>
                );
              })}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-1 flex items-center justify-between px-3 py-1.5 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm rounded-b-lg no-print">
          <div className="flex items-center gap-3">
            <button disabled={currentPage === 1 || loadingAppointments} onClick={handlePrevious}
              className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 text-sm">
              Prev
            </button>
            <div className="text-sm">Page {currentPage} of {totalPages}</div>
            <button disabled={!hasNextPage || loadingAppointments} onClick={handleNext}
              className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 text-sm">
              Next
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">Showing {loadingAppointments ? "..." : filtered.length} of {totalItems}</div>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="border rounded px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>


        {/* Video Call Modal */}
        <VideoCallModal
          open={videoCallModalOpen}
          onClose={() => { setVideoCallModalOpen(false); setSelectedAppointmentForVideo(null); }}
          appointmentId={selectedAppointmentForVideo?.id}
          patientId={selectedAppointmentForVideo?.patientId}
          providerId={selectedAppointmentForVideo?.providerId}
          patientName={selectedAppointmentForVideo?.patientName}
          providerName={selectedAppointmentForVideo?.providerName || providers.find((p) => String(p.id) === String(selectedAppointmentForVideo?.providerId))?.name}
          roomName={selectedAppointmentForVideo ? `apt-${selectedAppointmentForVideo.id}` : undefined}
        />

        {/* Toast */}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}

        {/* Slide-over Panel (Encounter / Vitals / Patient Chart) */}
        <SlideOverPanel
          open={panel.mode !== "closed"}
          onClose={() => setPanel({ mode: "closed" })}
          title={
            panel.mode === "vitals"
              ? `Vitals — ${panel.patientName}`
              : panel.mode === "encounter"
              ? `Encounter — ${panel.patientName}`
              : panel.mode === "summary"
              ? `Visit Summary — ${panel.patientName}`
              : panel.mode === "patient"
              ? panel.patientName
              : undefined
          }
          widthClass={panel.mode === "patient" ? "w-[80vw]" : "w-[65vw]"}
        >
          {panel.mode === "vitals" && (
            <DynamicEncounterForm
              patientId={panel.patientId}
              encounterId={panel.encounterId}
              embedded
              initialSection="vitals"
            />
          )}
          {panel.mode === "encounter" && (
            <DynamicEncounterForm patientId={panel.patientId} encounterId={panel.encounterId} embedded />
          )}
          {panel.mode === "summary" && (
            <Encountersummary patientId={panel.patientId} encounterId={panel.encounterId} showDownload />
          )}
          {panel.mode === "patient" && (
            <PatientChartPanel patientId={panel.patientId} />
          )}
        </SlideOverPanel>
      </div>
    </AdminLayout>
  );
}
