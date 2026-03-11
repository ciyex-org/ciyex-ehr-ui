"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  Loader2, Video, RefreshCw, Tv, Monitor, Clock,
  ChevronDown, ArrowRight, ExternalLink, Activity, FilePlus, FileText, Printer,
} from "lucide-react";
import VideoCallModal from "@/components/telehealth/VideoCallModal";
import { SlideOverPanel } from "@/components/ui/slide-over-panel";
import DynamicEncounterForm from "@/components/patients/DynamicEncounterForm";
import PatientChartPanel from "@/components/patients/PatientChartPanel";
import Encountersummary from "@/components/encounter/summary/Encountersummary";
import { usePermissions } from "@/context/PermissionContext";

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
  patientPhone?: string;     // from patient record
  audit: {
    createdDate: string;
    lastModifiedDate: string;
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

interface Provider { id: number; name: string; }
interface Location { id: number; name: string; }

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

const pad = (n: number) => n.toString().padStart(2, "0");

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
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
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

/** Format elapsed wait time with color */
function formatWaitTime(lastModified: string): { text: string; color: string } | null {
  if (!lastModified) return null;
  const then = new Date(lastModified).getTime();
  if (isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const text = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const color = mins < 15 ? "#22c55e" : mins < 30 ? "#eab308" : "#ef4444";
  return { text, color };
}

const fetchPatientInfo = async (id: number): Promise<{ name: string; phone?: string }> => {
  try {
    const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`);
    if (!res.ok) return { name: String(id) };
    const data = await res.json();
    return {
      name: `${data.data.firstName} ${data.data.lastName}`,
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
  const [from, setFrom] = useState<string>(() => typeof window !== "undefined" ? todayFormatted() : "");
  const [to, setTo] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  });
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
  const tableRef = useRef<HTMLDivElement>(null);

  // Status
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [hideCompleted, setHideCompleted] = useState(true); // hide fulfilled/cancelled by default
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [mounted, setMounted] = useState(false);

  // Room
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomOptions, setRoomOptions] = useState<string[]>([]);

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

  // Fetch status options (with metadata)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/status-options`);
        if (res.ok) {
          const data = await res.json();
          const opts: StatusOption[] = (data.data || []).map((o: any) =>
            typeof o === "string" ? { value: o, label: o } : o
          );
          setStatusOptions(opts);
        }
      } catch (e) {
        console.error("Failed to fetch status options:", e);
      }
    })();
  }, []);

  // Fetch room options
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/room-options`);
        if (res.ok) {
          const data = await res.json();
          setRoomOptions(data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch room options:", e);
      }
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
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/locations`);
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

  // from/to are initialized with todayFormatted() in useState — no extra effect needed

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
            return { ...appt, patientName: info.name, patientPhone: info.phone };
          })
        );
        setRows(enriched);
        setTotalPages(totalPagesVal);
        setTotalItems(totalElementsVal);
      } else {
        setRows([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.error(err);
      if (!silent) setRows([]);
    } finally {
      if (!silent) setLoadingAppointments(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize, statusFilter, from, to]);

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

  const onRefresh = () => loadAppointments(rows.length > 0); // silent if data already shown
  const onPrint = () => window.print();

  const setTodayFilter = () => {
    const t = todayFormatted();
    setFrom(t);
    setTo(t);
    setCurrentPage(1);
  };

  // Status option lookup
  const getStatusOption = useCallback(
    (value: string): StatusOption | undefined =>
      statusOptions.find((o) => o.value === value),
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
      } catch (e: any) {
        console.error(e);
        alert(e.message || "Failed to update status");
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
      alert(e.message || "Failed to create encounter");
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
        alert(e.message || "Failed to update room");
      }
    },
    []
  );

  // Client-side filters
  const filtered = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    const fromTime = from ? timeFromMMDDYYYY(from, -Infinity) : -Infinity;
    const toTime = to ? timeFromMMDDYYYY(to, Infinity, true) : Infinity;

    return rows.filter((r) => {
      const d = new Date(r.appointmentStartDate?.includes("T") ? r.appointmentStartDate : r.appointmentStartDate + "T00:00:00").getTime();
      const matchDate = d >= fromTime && d <= toTime;
      const matchProvider = provider === "All Providers" || r.providerId === Number(provider);
      const matchCategory = category === "All Visit Categories" || r.visitType === category;
      const matchLocation = location === "All Locations" || r.locationId === Number(location);
      const matchPatient = !patientName || (r.patientName || "").toLowerCase().includes(patientName.trim().toLowerCase());
      // Hide completed/terminal statuses when toggle is on
      const matchCompleted = !hideCompleted || (() => {
        const opt = statusOptions.find((o) => o.value === r.status);
        return !opt?.terminal;
      })();
      return matchDate && matchProvider && matchCategory && matchLocation && matchPatient && matchCompleted;
    }).sort((a, b) => {
      // Sort by date first, then by time
      const dateA = new Date(a.appointmentStartDate?.includes("T") ? a.appointmentStartDate : a.appointmentStartDate + "T00:00:00").getTime();
      const dateB = new Date(b.appointmentStartDate?.includes("T") ? b.appointmentStartDate : b.appointmentStartDate + "T00:00:00").getTime();
      if (dateA !== dateB) return dateA - dateB;
      // Parse time strings (HH:mm format) for same-day sorting
      const timeA = (a.appointmentStartTime || "").replace(":", "");
      const timeB = (b.appointmentStartTime || "").replace(":", "");
      return timeA.localeCompare(timeB);
    });
  }, [rows, from, to, provider, category, location, patientName, hideCompleted, statusOptions]);

  const colCount = 8;
  const total = filtered.length;
  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const handleVideoCall = (appointment: AppointmentDTO) => {
    setSelectedAppointmentForVideo(appointment);
    setVideoCallModalOpen(true);
  };

  const isVirtualAppointment = (visitType: string) => {
    const type = (visitType || "").toLowerCase();
    return type.includes("telehealth") || type.includes("virtual") || type.includes("video");
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Appointments</h1>
            <span className="text-sm text-gray-500">
              {loadingAppointments ? "..." : `${total} appointments`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Today button */}
            <button
              onClick={setTodayFilter}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              Today
            </button>

            {/* Auto-refresh dropdown */}
            <div className="relative">
              <button
                onClick={() => setRefreshOpen(!refreshOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-500" : refreshInterval ? "text-green-500" : "text-gray-400"}`} />
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

            <button
              onClick={onRefresh}
              disabled={loadingAppointments || refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAppointments || refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button onClick={onPrint} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
              Print
            </button>

            {/* TV dropdown */}
            <div className="relative">
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

        {/* Filters — compact single row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="rounded border px-2 py-1.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 max-w-35">
            <option value="All Visit Categories">All Types</option>
            {loadingCategories ? <option disabled>Loading...</option> :
              categories.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
          </select>

          <select value={provider} onChange={(e) => setProvider(e.target.value)}
            className="rounded border px-2 py-1.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 max-w-35">
            <option value="All Providers">All Providers</option>
            {loadingProviders ? <option disabled>Loading...</option> :
              providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>

          <select value={location} onChange={(e) => setLocation(e.target.value)}
            className="rounded border px-2 py-1.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 max-w-35">
            <option value="All Locations">All Locations</option>
            {loadingLocations ? <option disabled>Loading...</option> :
              locations.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
          </select>

          <input type="text" placeholder="From" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded border px-2 py-1.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 w-25" />

          <input type="text" placeholder="To" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded border px-2 py-1.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 w-25" />

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="rounded border px-2 py-1.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 max-w-30"
          >
            <option value="All">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <input type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)}
            className="rounded border px-2 py-1.5 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 w-30" />

          <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="rounded border-gray-300"
            />
            Hide completed
          </label>
        </div>

        {/* Table */}
        <div ref={tableRef} className="overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md" style={{ maxHeight: 'calc(100vh - 270px)' }}>
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-5">
              <tr>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Patient</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Room</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Wait</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
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

                  // Wait time for active statuses
                  const showWait = ["arrived", "checked-in"].includes(r.status);
                  const waitInfo = showWait ? formatWaitTime(r.audit?.lastModifiedDate) : null;

                  return (
                    <tr
                      key={`${r.patientId}-${r.id}`}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700 ${
                        isCancelled ? "opacity-50" : ""
                      }`}
                    >
                      {/* Time */}
                      <td className="py-1.5 px-3 text-sm whitespace-nowrap">
                        <div className="font-medium">{r.appointmentStartTime || "—"}</div>
                        <div className="text-xs text-gray-400">{formatToMMDDYYYY(r.appointmentStartDate)}</div>
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

                      {/* Provider */}
                      <td className="py-1.5 px-3 text-sm">
                        {providers.find((p) => p.id === r.providerId)?.name || r.providerId}
                      </td>

                      {/* Type */}
                      <td className="py-1.5 px-3 text-sm">{r.visitType}</td>

                      {/* Status — badge + workflow button */}
                      <td className="py-1.5 px-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          {editingStatusId === r.id ? (
                            <div className="flex items-center gap-1">
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
                      <td className="py-1.5 px-3 text-sm">
                        {editingRoomId === r.id ? (
                          <select
                            autoFocus
                            defaultValue={r.room || ""}
                            className="rounded border px-2 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-600 min-w-20"
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
                      <td className="py-1.5 px-3 text-sm">
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
          <div className="flex items-center gap-4 mt-1 px-2 text-xs text-gray-500">
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
        <div className="mt-1 flex items-center justify-between px-3 py-1.5 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm rounded-b-lg">
          <div className="flex items-center gap-3">
            <button disabled={currentPage === 1 || loadingAppointments} onClick={handlePrevious}
              className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 text-sm">
              Prev
            </button>
            <div className="text-sm">Page {currentPage} of {totalPages}</div>
            <button disabled={currentPage === totalPages || loadingAppointments} onClick={handleNext}
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
          providerName={providers.find((p) => p.id === selectedAppointmentForVideo?.providerId)?.name}
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
