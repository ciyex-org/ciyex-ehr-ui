

"use client";

import { useEffect, useMemo, useState, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchWithOrg } from "@/utils/fetchWithOrg";

// Keep in sync with backend enum
type EncounterStatus = "SIGNED" | "INCOMPLETE" | "UNSIGNED";

type Encounter = {
  id: number;
  patientId?: number;
  encounterDate?: string | number[] | number | null; // ISO string, [Y,M,D,H,MM,SS], or epoch
  visitCategory?: string | null;
  status?: EncounterStatus | null; // may be null for old rows
  encounterProvider?: string | null;
  type?: string | null;
  sensitivity?: string | null;
  dischargeDisposition?: string | null;
  reasonForVisit?: string | null;
};

type ApiResponse<T> = { success: boolean; message?: string; data?: T };

// ---------- small helpers ----------
const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

function toDate(value: Encounter["encounterDate"]): Date | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss);
  }
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === "string") {
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// For <input type="datetime-local" />
function toInputLocal(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

// Ensure we send "YYYY-MM-DDTHH:mm:ss"
function ensureLocalIsoSeconds(inputValue: string): string | undefined {
  if (!inputValue) return undefined;
  return inputValue.length === 16 ? `${inputValue}:00` : inputValue;
}

// ---- Normalize API responses (array OR Page OR single) ----
function normalizeData(data: unknown): Encounter[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Encounter[];
  const rec = asRecord(data);
  const content = rec["content"];
  if (Array.isArray(content)) return content as Encounter[];
  // Single object
  return [rec as unknown as Encounter];
}

export default function EncounterTableExpandable({ patientId }: { patientId: number }) {
  const router = useRouter();

  const [rows, setRows] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Encounter
  const [openNew, setOpenNew] = useState(false);
  const [newForm, setNewForm] = useState({
    visitCategory: "OPD",
    encounterProvider: "",
    type: "",
    sensitivity: "Normal",
    dischargeDisposition: "",
    reasonForVisit: "",
    encounterDate: "", // datetime-local string
  });

  // Auto-fetch latest appointment
  async function fetchLatestAppointment() {
    try {
      const res = await fetchWithOrg(`/api/appointments/patient/${patientId}/latest`, {
        method: "GET",
        headers: withOrgId(),
      });
      const body = await res.json() as ApiResponse<{ visitType?: string; reason?: string; providerId?: number }>;
      if (res.ok && body.success && body.data) {
        const { visitType, reason, providerId } = body.data;
        
        // Fetch provider name if providerId exists
        let providerName = "";
        if (providerId) {
          try {
            const providerRes = await fetchWithOrg(`/api/providers/${providerId}`, {
              method: "GET",
              headers: withOrgId(),
            });
            const providerBody = await providerRes.json() as ApiResponse<{ identification?: { firstName?: string; lastName?: string } }>;
            if (providerRes.ok && providerBody.success && providerBody.data?.identification) {
              const { firstName, lastName } = providerBody.data.identification;
              providerName = `${firstName || ""} ${lastName || ""}`.trim();
            }
          } catch {
            // Silently fail - will use empty string
          }
        }
        
        setNewForm((prev) => ({
          ...prev,
          type: visitType || prev.type,
          reasonForVisit: reason || prev.reasonForVisit,
          encounterProvider: providerName || prev.encounterProvider,
        }));
      }
    } catch {
      // Silently fail - form remains with default values
    }
  }

  // Edit Encounter
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Encounter | null>(null);
  const [editingDateLocal, setEditingDateLocal] = useState<string>("");

  // Filter tab
  type Tab = "ALL" | EncounterStatus;
  const [tab, setTab] = useState<Tab>("ALL");

  // “recent only” toggle (last 10)
  const [recentOnly, setRecentOnly] = useState<boolean>(false);

  const base = `/api/${patientId}/encounters`;

  // orgId header (your controller requires it)
  const orgId =
    (typeof window !== "undefined" &&
      (localStorage.getItem("orgId") || sessionStorage.getItem("orgId"))) ||
    undefined;

  const withOrgId = (h?: HeadersInit): HeadersInit => {
    const baseHeaders: Record<string, string> = {};
    if (orgId) baseHeaders["orgId"] = String(orgId);
    return { ...baseHeaders, ...(h as Record<string, string>) };
  };

  // ---- LOAD LIST ----
  async function loadAll() {
    setLoading(true);
    setError(null);

    const url = `${base}?page=0&size=1000&sort=id,desc`;

    try {
      const res = await fetchWithOrg(url, { method: "GET", headers: withOrgId() });
      const raw: unknown = await res.json();
      const body = raw as ApiResponse<unknown>;
      if (!res.ok || body?.success === false) {
        const msg = asRecord(body).message ?? `HTTP ${res.status}`;
        throw new Error(String(msg));
      }

      const list = normalizeData(body.data)
        .map((e) => ({
          ...e,
          status: (e.status ?? "UNSIGNED") as EncounterStatus,
        }))
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

      setRows(list);
    } catch (err: unknown) {
      try {
        const res2 = await fetchWithOrg(base, { method: "GET", headers: withOrgId() });
        const raw2: unknown = await res2.json();
        const body2 = raw2 as ApiResponse<unknown>;
        if (!res2.ok || body2?.success === false) {
          const msg2 = asRecord(body2).message ?? `HTTP ${res2.status}`;
          throw new Error(String(msg2));
        }
        const list2 = normalizeData(body2.data)
          .map((e) => ({ ...e, status: (e.status ?? "UNSIGNED") as EncounterStatus }))
          .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        setRows(list2);
      } catch (err2: unknown) {
        const msg =
          err2 instanceof Error ? err2.message : err instanceof Error ? err.message : "Failed to fetch encounters.";
        setRows([]);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // ---- CREATE ----
  async function createEncounter() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        visitCategory: newForm.visitCategory,
        encounterProvider: newForm.encounterProvider,
        type: newForm.type,
        sensitivity: newForm.sensitivity,
        dischargeDisposition: newForm.dischargeDisposition,
        reasonForVisit: newForm.reasonForVisit,
        encounterDate: ensureLocalIsoSeconds(newForm.encounterDate),
      };

      const res = await fetchWithOrg(base, {
        method: "POST",
        headers: withOrgId({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const raw: unknown = await res.json();
      const body = raw as ApiResponse<Encounter>;
      if (!res.ok || body?.success === false) {
        const msg = asRecord(body).message ?? `HTTP ${res.status}`;
        throw new Error(String(msg));
      }
      setOpenNew(false);
      setNewForm({
        visitCategory: "OPD",
        encounterProvider: "",
        type: "",
        sensitivity: "Normal",
        dischargeDisposition: "",
        reasonForVisit: "",
        encounterDate: "",
      });
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create encounter.");
    } finally {
      setSaving(false);
    }
  }

  // ---- UPDATE ----
  async function updateEncounter() {
    if (!editing?.id) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<Encounter> & { encounterDate?: string } = {
        ...editing,
        encounterDate: ensureLocalIsoSeconds(editingDateLocal),
      };

      const res = await fetchWithOrg(`${base}/${editing.id}`, {
        method: "PUT",
        headers: withOrgId({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const raw: unknown = await res.json();
      const body = raw as ApiResponse<Encounter>;
      if (!res.ok || body?.success === false) {
        const msg = asRecord(body).message ?? `HTTP ${res.status}`;
        throw new Error(String(msg));
      }
      setOpenEdit(false);
      setEditing(null);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update encounter.");
    } finally {
      setSaving(false);
    }
  }

  // ---- DELETE ----
  async function deleteEncounter(id: number) {
    if (!confirm(`Delete encounter #${id}?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithOrg(`${base}/${id}`, { method: "DELETE", headers: withOrgId() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete encounter.");
    } finally {
      setSaving(false);
    }
  }

  // Open new encounter modal and fetch latest appointment
  function handleOpenNew() {
    setOpenNew(true);
    fetchLatestAppointment();
  }

  // Open edit modal when clicking anywhere on the row (except the action cell)
  function onRowClick(enc: Encounter) {
    setEditing({ ...enc });
    setOpenEdit(true);
    setEditingDateLocal(toInputLocal(toDate(enc.encounterDate)));
  }

  // Prevent row-click when action buttons are used
  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  // ---- Filters ----
  const byTab = useMemo(() => {
    if (tab === "ALL") return rows;
    return rows.filter((r) => (r.status ?? "UNSIGNED") === tab);
  }, [rows, tab]);

  const filtered = useMemo(() => {
    if (!recentOnly) return byTab;
    return byTab.slice(0, 10); // latest 10 rows (IDs already sorted desc)
  }, [byTab, recentOnly]);

  function StatusPill({ value }: { value?: EncounterStatus | null }) {
    const v = (value ?? "UNSIGNED") as EncounterStatus;
    const styles =
      v === "SIGNED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : v === "INCOMPLETE"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${styles}`}>
        {v}
      </span>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-neutral-800">Encounters</h3>
        <button
          onClick={handleOpenNew}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          + New Encounter
        </button>
      </div>

      {/* Tabs (blue active like New Encounter button) */}
      <div className="px-3 pt-3 flex items-center gap-2 flex-wrap">
        {(["ALL", "SIGNED", "INCOMPLETE", "UNSIGNED"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md border text-xs transition-colors
              ${
                tab === t
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
              }`}
          >
            {t === "ALL" ? "All" : t}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={recentOnly}
              onChange={(ev) => setRecentOnly(ev.target.checked)}
            />
            Show only recent (10)
          </label>
          <span className="text-neutral-500">
            Showing <strong>{filtered.length}</strong> of <strong>{byTab.length}</strong>
          </span>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">S.NO</th>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Visit Category</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left w-44">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  Loading…
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((row, idx) => {
                const d = toDate(row.encounterDate);
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-neutral-50 cursor-pointer"
                    onClick={() => onRowClick(row)}
                  >
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{row.id}</td>
                    <td className="px-3 py-2">{d ? d.toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2">{row.visitCategory || "-"}</td>
                    <td className="px-3 py-2">
                      <StatusPill value={row.status} />
                    </td>

                    {/* ACTIONS (no Sign/Incomplete/Unsign here) */}
                    <td className="px-3 py-2" onClick={stop}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/patients/${patientId}/encounters/${row.id}`)}
                          title="Open encounter"
                          className="h-7 w-7 grid place-items-center rounded-full border hover:bg-neutral-100"
                        >
                          +
                        </button>
                        <button
                          onClick={() => deleteEncounter(row.id)}
                          className="px-2 py-1 rounded-lg border text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  No encounters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* -------- New Encounter (modal) -------- */}
      {openNew && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4">
            <div className="text-lg font-semibold mb-3">New Encounter</div>

            {error && (
              <div className="mb-3 px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="grid gap-1">
                <span className="text-sm">Visit Category</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={newForm.visitCategory}
                  onChange={(ev) => setNewForm((f) => ({ ...f, visitCategory: ev.target.value }))}
                >
                  <option value="OPD">OPD</option>
                  <option value="IPD">IPD</option>
                  <option value="ER">ER</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm">
                  Provider<span className="text-red-500">*</span>
                </span>
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder='e.g. "Dr. Smith"'
                  value={newForm.encounterProvider}
                  onChange={(ev) =>
                    setNewForm((f) => ({ ...f, encounterProvider: ev.target.value }))
                  }
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">
                  Type<span className="text-red-500">*</span>
                </span>
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Consultation / Follow-up / Telehealth…"
                  value={newForm.type}
                  onChange={(ev) => setNewForm((f) => ({ ...f, type: ev.target.value }))}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Sensitivity</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={newForm.sensitivity}
                  onChange={(ev) => setNewForm((f) => ({ ...f, sensitivity: ev.target.value }))}
                >
                  <option value="Normal">Normal</option>
                  <option value="Restricted">Restricted</option>
                </select>
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm">Discharge Disposition</span>
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder='e.g. "Home"'
                  value={newForm.dischargeDisposition}
                  onChange={(ev) =>
                    setNewForm((f) => ({ ...f, dischargeDisposition: ev.target.value }))
                  }
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm">
                  Reason for Visit<span className="text-red-500">*</span>
                </span>
                <textarea
                  className="border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="General checkup"
                  value={newForm.reasonForVisit}
                  onChange={(ev) => setNewForm((f) => ({ ...f, reasonForVisit: ev.target.value }))}
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm">Encounter Date/Time <span className="text-red-600">*</span></span>
                <input
                  type="datetime-local"
                  className="border rounded-lg px-3 py-2"
                  value={newForm.encounterDate}
                  onChange={(ev) => setNewForm((f) => ({ ...f, encounterDate: ev.target.value }))}
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300"
                onClick={() => setOpenNew(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={createEncounter}
                disabled={
                  saving ||
                  !newForm.encounterProvider ||
                  !newForm.type ||
                  !newForm.reasonForVisit
                }
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------- Edit Encounter (modal) -------- */}
      {openEdit && editing && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4">
            <div className="text-lg font-semibold mb-3">Edit Encounter #{editing.id}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="grid gap-1">
                <span className="text-sm">Visit Category</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={editing.visitCategory || ""}
                  onChange={(ev) =>
                    setEditing((f) => (f ? { ...f, visitCategory: ev.target.value } : f))
                  }
                >
                  <option value="OPD">OPD</option>
                  <option value="IPD">IPD</option>
                  <option value="ER">ER</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm">
                  Provider<span className="text-red-500">*</span>
                </span>
                <input
                  className="border rounded-lg px-3 py-2"
                  value={editing.encounterProvider || ""}
                  onChange={(ev) =>
                    setEditing((f) => (f ? { ...f, encounterProvider: ev.target.value } : f))
                  }
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">
                  Type<span className="text-red-500">*</span>
                </span>
                <input
                  className="border rounded-lg px-3 py-2"
                  value={editing.type || ""}
                  onChange={(ev) => setEditing((f) => (f ? { ...f, type: ev.target.value } : f))}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Sensitivity</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={editing.sensitivity || "Normal"}
                  onChange={(ev) =>
                    setEditing((f) => (f ? { ...f, sensitivity: ev.target.value } : f))
                  }
                >
                  <option value="Normal">Normal</option>
                  <option value="Restricted">Restricted</option>
                </select>
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm">Discharge Disposition</span>
                <input
                  className="border rounded-lg px-3 py-2"
                  value={editing.dischargeDisposition || ""}
                  onChange={(ev) =>
                    setEditing((f) => (f ? { ...f, dischargeDisposition: ev.target.value } : f))
                  }
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm">
                  Reason for Visit<span className="text-red-500">*</span>
                </span>
                <textarea
                  className="border rounded-lg px-3 py-2"
                  rows={3}
                  value={editing.reasonForVisit || ""}
                  onChange={(ev) =>
                    setEditing((f) => (f ? { ...f, reasonForVisit: ev.target.value } : f))
                  }
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm">Encounter Date/Time <span className="text-red-600">*</span></span>
                <input
                  type="datetime-local"
                  className="border rounded-lg px-3 py-2"
                  value={editingDateLocal}
                  onChange={(ev) => setEditingDateLocal(ev.target.value)}
                />
              </label>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200"
                onClick={() => {
                  setOpenEdit(false);
                  setEditing(null);
                }}
                disabled={saving}
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (editing?.id) deleteEncounter(editing.id);
                    setOpenEdit(false);
                  }}
                  disabled={saving}
                >
                  Delete
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={updateEncounter}
                  disabled={
                    saving || !editing?.encounterProvider || !editing?.type || !editing?.reasonForVisit
                  }
                >
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}