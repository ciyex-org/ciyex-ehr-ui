"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { NotebookPen, Scissors, Activity, Loader2, Video } from "lucide-react";
import VideoCallModal from "@/components/telehealth/VideoCallModal";

// drawer content
import ProviderNoteList from "@/components/encounter/providernote/Providernotelist";
import ProcedureList from "@/components/encounter/procedure/Procedurelist";
import VitalsList from "@/components/encounter/Vitals/Vitalslist";

export type AppointmentDTO = {
  id: number;
  visitType: string;
  patientId: number; // still used for MRN
  providerId: number;
  appointmentStartDate: string;
  appointmentEndDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  priority: string;
  locationId: number;
  status: string;
  reason: string;
  orgId: number;
  patientName?: string; // resolved from patient API
  audit: {
    createdDate: string;
    lastModifiedDate: string;
  };
};

interface Category { title: string; optionName: string; activity?: number; }
interface Provider { id: number; name: string; }
interface Location { id: number; name: string; }

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

type DrawerSection = "notes" | "procedures" | "vitals";

const pad = (n: number) => n.toString().padStart(2, "0");

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
function timeFromMMDDYYYY(s: string, fallback: number): number {
  const iso = parseMMDDYYYY(s);
  return iso ? new Date(iso).getTime() : fallback;
}

const fetchPatientName = async (id: number): Promise<string> => {
  try {
    const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`);
    if (!res.ok) return String(id);
    const data = await res.json();
    return `${data.data.firstName} ${data.data.lastName}`;
  } catch {
    return String(id);
  }
};

/** Right-side drawer (frame only) */
function Drawer({
                  open,
                  onClose,
                  title,
                  children,
                }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-[800px] max-w-full bg-white dark:bg-slate-900 shadow-xl p-6 overflow-y-auto animate-slideInRight">
          <button className="mb-4 text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕ Close
          </button>
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
          {children}
        </div>
      </div>
  );
}

export default function AppointmentPage() {
  const [category, setCategory] = useState<string>("All Visit Categories");
  const [categories, setCategories] = useState<string[]>([]);
  const [provider, setProvider] = useState<string>("All Providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [location, setLocation] = useState<string>("All Locations");
  const [locations, setLocations] = useState<Location[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [rows, setRows] = useState<AppointmentDTO[]>([]);

  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // Status filter & inline status edit
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AppointmentDTO | null>(null);
  const [activeSection, setActiveSection] = useState<DrawerSection>("notes");

  // Video call modal state
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [selectedAppointmentForVideo, setSelectedAppointmentForVideo] = useState<AppointmentDTO | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch available statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/status-options`);
        if (res.ok) {
          const data = await res.json();
          setAvailableStatuses(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch status options:', error);
      }
    };
    fetchStatuses();
  }, []);

  // Visit Categories (active only)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/list-options/list/Visit Type`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        const active = (data as Category[]).filter((c) => c.activity === 1).map((c) => c.title || c.optionName);
        setCategories(active);
      } catch { setCategories([]); }
      finally { setLoadingCategories(false); }
    };
    fetchCategories();
  }, []);

  // Providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/providers`);
        if (!res.ok) throw new Error("Failed to fetch providers");
        const data = await res.json();
        const list: Provider[] = data.data.map((p: { id: number; identification: { firstName: string; lastName: string } }) => ({
          id: p.id,
          name: `${p.identification.firstName} ${p.identification.lastName}`,
        }));
        setProviders(list);
      } catch { setProviders([]); }
      finally { setLoadingProviders(false); }
    };
    fetchProviders();
  }, []);

  // Locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/locations`);
        if (!res.ok) throw new Error("Failed to fetch locations");
        const data = await res.json();
        if (data?.success && data?.data) {
          // Handle paginated response
          const locationData = data.data.content || data.data;
          const list: Location[] = Array.isArray(locationData) ? locationData.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name })) : [];
          setLocations(list);
        }
      } catch { setLocations([]); }
      finally { setLoadingLocations(false); }
    };
    fetchLocations();
  }, []);

  // Default date range: last month -> today
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      const fmt = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
      setFrom(fmt(lastMonth));
      setTo(fmt(today));
    }
  }, []);

  // ---- Appointments loader ----
  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      // include status filter when not "All"
      const params = new URLSearchParams({
        page: String(currentPage - 1),
        size: String(pageSize),
      });
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();

      const payload = data?.data ?? {};
      const content: AppointmentDTO[] = payload.content ?? payload?.data?.content ?? [];
      const totalPagesVal = payload.totalPages ?? data?.data?.totalPages ?? 1;
      const totalElementsVal = payload.totalElements ?? data?.data?.totalElements ?? content.length;

      if (content && Array.isArray(content)) {
        const enriched = await Promise.all(
            content.map(async (appt: AppointmentDTO) => {
              const name = await fetchPatientName(appt.patientId);
              return { ...appt, patientName: name };
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
      setRows([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [currentPage, pageSize, statusFilter]);

  // Initial & pagination fetch
  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const onRefresh = () => { loadAppointments(); };
  const onPrint = () => window.print();
  const onKiosk = () => {
    const el = tableRef.current as FullscreenElement | null;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  // Update status
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
          await loadAppointments();
        } catch (e) {
          console.error(e);
          alert("Failed to update status");
        }
      },
      [loadAppointments]
  );

  // Client-side filter includes status (case-insensitive)
  const filtered = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    const fromTime = from ? timeFromMMDDYYYY(from, -Infinity) : -Infinity;
    const toTime   = to   ? timeFromMMDDYYYY(to,   Infinity)  : Infinity;
    const wanted   = (statusFilter || "All").toUpperCase();

    return rows.filter((r) => {
      const d = new Date(r.appointmentStartDate).getTime();

      const matchDate      = d >= fromTime && d <= toTime;
      const matchProvider  = provider === "All Providers" ? true : r.providerId === Number(provider);
      const matchCategory  = category === "All Visit Categories" ? true : r.visitType === category;
      const matchLocation  = location === "All Locations" ? true : r.locationId === Number(location);
      const matchPatient   = patientName
          ? (r.patientName || "").toLowerCase().includes(patientName.trim().toLowerCase())
          : true;

      const currStatus     = (r.status || "").toUpperCase();
      const matchStatus    = wanted === "ALL" ? true : currStatus === wanted;

      return matchDate && matchProvider && matchCategory && matchLocation && matchPatient && matchStatus;
    });
  }, [rows, from, to, provider, category, location, patientName, statusFilter]);

  const total = filtered.length;
  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const getStatusClass = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "CONFIRMED":  return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "SCHEDULED":  return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "PENDING":    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "CANCELLED":
      case "CANCELED":   return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "CANCELED LESS THAN 24H": return "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100";
      case "CHECKED":    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "UNCHECKED":  return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "CHECKED OUT": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ARRIVED LATE": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "LEFT W/O APT": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "NO-FILL ISSUE": return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "CODING ISSUE": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "AM CONFIRMED": return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "EMAIL CONFIRMED": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "CALLBACK REQUESTED": return "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200";
      default:           return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    }
  };

  const openDrawer = (row: AppointmentDTO, section: DrawerSection) => {
    setSelectedRow(row);
    setActiveSection(section);
    setDrawerOpen(true);
  };

  const encounterUrl = (row: AppointmentDTO) =>
      `/patients/${row.patientId}/encounters/${row.id}`;

  const sectionLabel = (s: DrawerSection) =>
      s === "notes" ? "Provider Notes" : s === "procedures" ? "Procedures" : "Vitals";

  // Video call functionality
  const handleVideoCall = (appointment: AppointmentDTO) => {
    setSelectedAppointmentForVideo(appointment);
    setVideoCallModalOpen(true);
  };

  const isVirtualAppointment = (visitType: string) => {
    const type = visitType.toLowerCase();
    return type.includes('telehealth') || type.includes('virtual') || type.includes('video');
  };

  if (!mounted) return null;

  return (
      <AdminLayout>
        <div className="container mx-auto p-6 overflow-x-hidden text-gray-800 dark:text-gray-200">
          {/* Heading */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <span className="italic font-semibold">Total appointments:</span>{" "}
              {loadingAppointments ? "…" : total}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 w-full">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
                <option value="All Visit Categories">All Visit Categories</option>
                {loadingCategories ? <option disabled>Loading...</option> :
                    categories.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
              </select>

              <select value={provider} onChange={(e) => setProvider(e.target.value)}
                      className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
                <option value="All Providers">All Providers</option>
                {loadingProviders ? <option disabled>Loading...</option> :
                    providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>

              <select value={location} onChange={(e) => setLocation(e.target.value)}
                      className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
                <option value="All Locations">All Locations</option>
                {loadingLocations ? <option disabled>Loading...</option> :
                    locations.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>

              <input type="text" placeholder="MM/DD/YYYY" value={from} onChange={(e) => setFrom(e.target.value)}
                     className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />

              <input type="text" placeholder="MM/DD/YYYY" value={to} onChange={(e) => setTo(e.target.value)}
                     className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />

              <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="All">All Statuses</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <input type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                     className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />
            </div>

            <div className="flex gap-2">
              <button onClick={onRefresh} disabled={loadingAppointments}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" title="Refresh table data">
                Refresh
              </button>
              <button onClick={onPrint} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Print
              </button>
              <button onClick={onKiosk} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Kiosk
              </button>
            </div>
          </div>

          {/* Table */}
          <div ref={tableRef} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
            <table className="w-full table-auto">
              <colgroup>
                <col className="w-20" />
                <col className="w-48" />
                <col className="w-48" />
                <col />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-[260px]" />
              </colgroup>
              <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="py-3 px-6 text-left text-sm font-medium">MRN</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Patient Name</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Provider Name</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Location</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Visit Type</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Start Date</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Start Time</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Priority</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Status</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Action</th>
              </tr>
              </thead>
              <tbody>
              {loadingAppointments ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400" />
                  </tr>
              ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No appointments match your filters.
                    </td>
                  </tr>
              ) : (
                  filtered.map((r) => (
                      <tr key={`${r.patientId}-${r.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700">
                        <td className="py-3 px-6 text-sm whitespace-nowrap">{r.patientId}</td>
                        <td className="py-3 px-6 text-sm">{r.patientName || "—"}</td>
                        <td className="py-3 px-6 text-sm">
                          {providers.find((p) => p.id === r.providerId)?.name || r.providerId}
                        </td>
                        <td className="py-3 px-6 text-sm">
                          {locations.find((l) => l.id === r.locationId)?.name || "—"}
                        </td>
                        <td className="py-3 px-6 text-sm">{r.visitType}</td>
                        <td className="py-3 px-6 text-sm">{formatToMMDDYYYY(r.appointmentStartDate)}</td>
                        <td className="py-3 px-6 text-sm">{r.appointmentStartTime}</td>
                        <td className="py-3 px-6 text-sm">{r.priority}</td>

                        {/* Status cell — click to edit */}
                        <td className="py-3 px-6 text-sm">
                          {editingStatusId === r.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                    autoFocus
                                    defaultValue={
                                      ((r.status || "").toUpperCase() === "CHECKED") ? "Checked" :
                                          ((r.status || "").toUpperCase() === "UNCHECKED") ? "Unchecked" : ""
                                    }
                                    className="rounded-md border px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val && val !== r.status) updateStatus(r, val);
                                    }}
                                    onBlur={() => setEditingStatusId(null)}
                                >
                                  {availableStatuses.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                  ))}
                                </select>

                                <button
                                    type="button"
                                    className="px-2 py-1 text-xs rounded border dark:border-gray-600"
                                    onClick={() => setEditingStatusId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                          ) : (
                              <button
                                  type="button"
                                  className={[
                                    "inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap",
                                    getStatusClass(r.status),
                                  ].join(" ")}
                                  title="Click to change status"
                                  onClick={() => setEditingStatusId(r.id)}
                              >
                                {r.status}
                              </button>
                          )}
                        </td>

                        <td className="py-3 px-6 text-sm">
                          <div className="flex items-center gap-2">
                            {/* Encounter button */}
                            <button
                                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
                                onClick={() => window.location.assign(encounterUrl(r))}
                                title="Open encounters for this appointment"
                            >
                              Encounter
                            </button>

                            {/* Join Video Call button - only for virtual appointments */}
                            {isVirtualAppointment(r.visitType) && (
                              <button
                                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-xs font-medium flex items-center gap-1"
                                  onClick={() => handleVideoCall(r)}
                                  title="Join video call"
                              >
                                <Video className="h-3 w-3" />
                                Join
                              </button>
                            )}

                            {/* Icon buttons — aligned and sized consistently */}
                            <button
                                type="button"
                                onClick={() => openDrawer(r, "notes")}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
                                title="Provider Notes"
                                aria-label="Open Provider Notes"
                            >
                              <NotebookPen className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => openDrawer(r, "procedures")}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
                                title="Procedures"
                                aria-label="Open Procedures"
                            >
                              <Scissors className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => openDrawer(r, "vitals")}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
                                title="Vitals"
                                aria-label="Open Vitals"
                            >
                              <Activity className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))
              )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between px-3 py-2 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm">
            <div className="flex items-center gap-3">
              <button disabled={currentPage === 1 || loadingAppointments} onClick={handlePrevious}
                      className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
                Prev
              </button>
              <div>Page {currentPage} of {totalPages}</div>
              <button disabled={currentPage === totalPages || loadingAppointments} onClick={handleNext}
                      className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
                Next
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div>Showing {loadingAppointments ? "…" : filtered.length} of {totalItems}</div>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="border rounded px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Drawer: shows ONLY the chosen section */}
          <Drawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              title={
                selectedRow ? (
                    <>
                      Appointment #{selectedRow.id} — Patient {selectedRow.patientName ?? selectedRow.patientId} &nbsp;·&nbsp; {sectionLabel(activeSection)}
                    </>
                ) : ("")
              }
          >
            {selectedRow && activeSection === "notes" && (
                <section className="mb-8">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Provider Notes</h3>
                  </div>
                  <ProviderNoteList
                      patientId={selectedRow.patientId}
                      encounterId={selectedRow.id}
                  />
                </section>
            )}

            {selectedRow && activeSection === "procedures" && (
                <section className="mb-8">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Procedures</h3>
                  </div>
                  <ProcedureList
                      patientId={selectedRow.patientId}
                      encounterId={selectedRow.id}
                  />
                </section>
            )}

            {selectedRow && activeSection === "vitals" && (
                <section className="mb-8">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Vitals</h3>
                  </div>
                  <VitalsList
                      patientId={selectedRow.patientId}
                      encounterId={selectedRow.id}
                  />
                </section>
            )}
          </Drawer>

          {/* Video Call Modal */}
          <VideoCallModal
            open={videoCallModalOpen}
            onClose={() => {
              setVideoCallModalOpen(false);
              setSelectedAppointmentForVideo(null);
            }}
            appointmentId={selectedAppointmentForVideo?.id}
            patientId={selectedAppointmentForVideo?.patientId}
            providerId={selectedAppointmentForVideo?.providerId}
            patientName={selectedAppointmentForVideo?.patientName}
            providerName={providers.find(p => p.id === selectedAppointmentForVideo?.providerId)?.name}
            roomName={selectedAppointmentForVideo ? `apt-${selectedAppointmentForVideo.id}` : undefined}
          />

        </div>

      </AdminLayout>
  );
}
