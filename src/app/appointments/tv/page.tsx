"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Monitor, Tv, X, Maximize, Clock } from "lucide-react";

interface StatusOption {
  value: string;
  label: string;
  color?: string;
  triggersEncounter?: boolean;
  terminal?: boolean;
  order?: number;
}

interface Appointment {
  id: number;
  patientId: number;
  patientName?: string;
  providerId: number;
  providerName?: string;
  locationId: number;
  locationName?: string;
  visitType: string;
  status: string;
  appointmentStartTime: string;
  appointmentStartDate: string;
  audit?: { lastModifiedDate?: string };
}

interface Provider { id: number; name: string; }
interface Location { id: number; name: string; }

const pad = (n: number) => n.toString().padStart(2, "0");

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join(".")
    .toUpperCase();
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="text-center">
      <div className="text-lg font-medium opacity-80">{dateStr}</div>
      <div className="text-3xl font-bold tabular-nums">{timeStr}</div>
    </div>
  );
}

/** Waiting-time label for the patient status */
function waitLabel(status: string): string {
  switch (status) {
    case "arrived": return "Waiting";
    case "checked-in": return "Checked In";
    case "booked": return "Upcoming";
    case "proposed":
    case "pending": return "Upcoming";
    default: return status;
  }
}

export default function TVDisplayPage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get("mode") === "waiting-room" ? "waiting-room" : "staff";
  const [mode, setMode] = useState<"staff" | "waiting-room">(initialMode);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [practiceName, setPracticeName] = useState("Practice");
  const [loading, setLoading] = useState(true);

  // Fetch reference data once
  useEffect(() => {
    (async () => {
      try {
        // Status options
        const statusRes = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/status-options`);
        if (statusRes.ok) {
          const d = await statusRes.json();
          setStatusOptions((d.data || []).map((o: any) => typeof o === "string" ? { value: o, label: o } : o));
        }
        // Providers
        const provRes = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/providers`);
        if (provRes.ok) {
          const d = await provRes.json();
          const providerList = d?.data?.content || d?.data || [];
          setProviders((Array.isArray(providerList) ? providerList : []).map((p: any) => ({
            id: p.id || p.fhirId || "",
            name: p.identification
              ? `${p.identification.firstName || ""} ${p.identification.lastName || ""}`.trim()
              : (p.name || p.displayName || "Unknown Provider"),
          })).filter((p: any) => p.id && p.name));
        }
        // Locations + derive practice name from first location
        const locRes = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/locations`);
        if (locRes.ok) {
          const d = await locRes.json();
          const ld = d?.data?.content || d?.data || [];
          if (Array.isArray(ld)) {
            setLocations(ld.map((l: any) => ({ id: l.id, name: l.name })));
            // Derive practice name: "Sunrise Family Medicine - Main Clinic" → "Sunrise Family Medicine"
            if (ld.length > 0) {
              const firstName = ld[0].name || "";
              const dashIdx = firstName.indexOf(" - ");
              setPracticeName(dashIdx > 0 ? firstName.substring(0, dashIdx) : firstName);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load reference data", e);
      }
    })();
  }, []);

  // Fetch patient name
  const fetchPatientName = useCallback(async (id: number): Promise<string> => {
    try {
      const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`);
      if (!res.ok) return String(id);
      const data = await res.json();
      return `${data.data.firstName} ${data.data.lastName}`;
    } catch {
      return String(id);
    }
  }, []);

  // Load today's appointments
  const loadAppointments = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments?page=0&size=200`
      );
      if (!res.ok) return;
      const data = await res.json();
      const content: Appointment[] = data?.data?.content ?? [];

      // Filter today only
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      const todayAppts = content.filter((a) => a.appointmentStartDate === todayStr);

      // Resolve names (use String() comparison to handle number/string type mismatch)
      const enriched = await Promise.all(
        todayAppts.map(async (a) => ({
          ...a,
          patientName: await fetchPatientName(a.patientId),
          providerName: providers.find((p) => String(p.id) === String(a.providerId))?.name || String(a.providerId),
          locationName: locations.find((l) => String(l.id) === String(a.locationId))?.name || "",
        }))
      );

      // Sort by start time
      enriched.sort((a, b) => (a.appointmentStartTime || "").localeCompare(b.appointmentStartTime || ""));
      setAppointments(enriched);
    } catch (e) {
      console.error("Failed to load appointments", e);
    } finally {
      setLoading(false);
    }
  }, [fetchPatientName, providers, locations]);

  // Initial load + auto-refresh every 15s
  useEffect(() => {
    if (providers.length === 0 && locations.length === 0) return; // wait for ref data
    loadAppointments();
    const t = setInterval(loadAppointments, 15000);
    return () => clearInterval(t);
  }, [loadAppointments, providers, locations]);

  const getStatusColor = useCallback(
    (value: string) => statusOptions.find((s) => s.value === value)?.color || "#94a3b8",
    [statusOptions]
  );

  const getStatusLabel = useCallback(
    (value: string) => statusOptions.find((s) => s.value === value)?.label || value,
    [statusOptions]
  );

  // Status counts for summary bar
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [appointments]);

  // Active appointments for waiting room (non-terminal, non-cancelled)
  const activeAppointments = useMemo(
    () => appointments.filter((a) => {
      const opt = statusOptions.find((s) => s.value === a.status);
      return !opt?.terminal && a.status !== "cancelled" && a.status !== "fulfilled";
    }),
    [appointments, statusOptions]
  );

  const goFullscreen = () => {
    document.documentElement.requestFullscreen?.();
  };

  return (
    <div className={`min-h-screen flex flex-col ${mode === "staff" ? "bg-gray-950 text-white" : "bg-gradient-to-br from-blue-950 to-slate-900 text-white"}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="text-xl font-bold">{practiceName}</div>
        <LiveClock />
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <button
            onClick={() => setMode(mode === "staff" ? "waiting-room" : "staff")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
          >
            {mode === "staff" ? <Tv className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            {mode === "staff" ? "Waiting Room" : "Staff View"}
          </button>
          <button
            onClick={goFullscreen}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.close()}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg opacity-60">Loading appointments...</div>
          </div>
        ) : mode === "staff" ? (
          /* ==================== STAFF TV BOARD ==================== */
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 text-left">
                  <th className="py-3 px-4 text-sm font-semibold opacity-60 uppercase">Time</th>
                  <th className="py-3 px-4 text-sm font-semibold opacity-60 uppercase">Patient</th>
                  <th className="py-3 px-4 text-sm font-semibold opacity-60 uppercase">Provider</th>
                  <th className="py-3 px-4 text-sm font-semibold opacity-60 uppercase">Location</th>
                  <th className="py-3 px-4 text-sm font-semibold opacity-60 uppercase">Type</th>
                  <th className="py-3 px-4 text-sm font-semibold opacity-60 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-lg opacity-40">
                      No appointments for today
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => {
                    const color = getStatusColor(a.status);
                    const isCancelled = a.status === "cancelled";
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-white/5 ${isCancelled ? "opacity-30" : ""}`}
                      >
                        <td className="py-4 px-4 text-lg font-medium tabular-nums">
                          {formatTime(a.appointmentStartTime)}
                        </td>
                        <td className="py-4 px-4 text-lg font-medium">{a.patientName || "—"}</td>
                        <td className="py-4 px-4 text-base opacity-80">{a.providerName}</td>
                        <td className="py-4 px-4 text-base opacity-80">{a.locationName}</td>
                        <td className="py-4 px-4 text-base opacity-80">{a.visitType}</td>
                        <td className="py-4 px-4">
                          <span
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold"
                            style={{
                              backgroundColor: color + "30",
                              color: color,
                            }}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            {getStatusLabel(a.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Summary bar */}
            {appointments.length > 0 && (
              <div className="mt-6 flex items-center gap-6 px-4 py-3 rounded-lg bg-white/5 text-sm">
                {statusOptions
                  .filter((s) => statusCounts[s.value])
                  .map((s) => (
                    <span key={s.value} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color || "#94a3b8" }} />
                      <span className="opacity-70">{s.label}:</span>
                      <span className="font-bold">{statusCounts[s.value]}</span>
                    </span>
                  ))}
                <span className="ml-auto opacity-70">
                  Total: <span className="font-bold">{appointments.length}</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          /* ==================== WAITING ROOM ==================== */
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light opacity-80">
                Welcome! Your provider will be with you shortly.
              </h2>
            </div>

            {activeAppointments.length === 0 ? (
              <div className="text-center py-16 text-lg opacity-40">
                No patients currently waiting
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {activeAppointments.map((a) => {
                  const color = getStatusColor(a.status);
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl p-5 text-center"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.08)",
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      {/* Initials only — HIPAA safe */}
                      <div className="text-2xl font-bold mb-2 opacity-90">
                        {getInitials(a.patientName || "")}
                      </div>
                      <div className="text-sm opacity-60 mb-3">
                        {formatTime(a.appointmentStartTime)}
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: color + "30",
                          color: color,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {waitLabel(a.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom summary */}
            <div className="mt-8 text-center text-sm opacity-50">
              Currently Serving: {activeAppointments.length} patient{activeAppointments.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
