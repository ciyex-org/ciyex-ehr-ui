"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Search,
  Plus,
  Filter,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Pill,
} from "lucide-react";
import {
  Prescription,
  PrescriptionStats,
  PrescriptionStatus,
  ToastState,
} from "@/components/prescriptions/types";
import PrescriptionStatsCards from "@/components/prescriptions/PrescriptionStatsCards";
import PrescriptionTable from "@/components/prescriptions/PrescriptionTable";
import PrescriptionFormPanel from "@/components/prescriptions/PrescriptionFormPanel";
import { usePermissions } from "@/context/PermissionContext";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_TABS: { key: PrescriptionStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
  { key: "discontinued", label: "Discontinued" },
  { key: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "All Priority" },
  { key: "routine", label: "Routine" },
  { key: "urgent", label: "Urgent" },
  { key: "stat", label: "STAT" },
];

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

const apiBase = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const cls =
    toast.type === "success"
      ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
      : toast.type === "error"
        ? "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
        : "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200";
  return (
    <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${cls}`}>
      {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
      {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600" />}
      {toast.type === "info" && <Clock className="w-4 h-4 text-blue-600" />}
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Discontinue Modal                                                  */
/* ------------------------------------------------------------------ */

function DiscontinueModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[min(480px,90vw)] rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Discontinue Prescription</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Please provide a reason for discontinuing.</p>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason *</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for discontinuation..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={loading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Discontinue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Refill Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function RefillModal({
  open,
  onClose,
  onConfirm,
  loading,
  prescription,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  prescription: Prescription | null;
}) {
  if (!open || !prescription) return null;
  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[min(440px,90vw)] rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Pill className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Refill Prescription</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {prescription.medicationName} {prescription.strength || ""}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Refills remaining: <span className="font-semibold">{prescription.refillsRemaining}</span> of {prescription.refills}.
            This will dispense one refill.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Refill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function DeleteModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[min(440px,90vw)] rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete Prescription</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function PrescriptionsPage() {
  const { canWriteResource } = usePermissions();
  const canWriteRx = canWriteResource("MedicationRequest");

  /* State */
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [stats, setStats] = useState<PrescriptionStats>({ active: 0, completed: 0, cancelled: 0, on_hold: 0, discontinued: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  /* Filters */
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [prescriberDraft, setPrescriberDraft] = useState("");
  const [prescriberFilter, setPrescriberFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prescriberDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Panel */
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  /* Modals */
  const [discontinueTarget, setDiscontinueTarget] = useState<Prescription | null>(null);
  const [refillTarget, setRefillTarget] = useState<Prescription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  /* Toast */
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---- API calls ---- */

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const base = apiBase();
      let url = `${base}/api/prescriptions?page=${page}&size=${pageSize}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (prescriberFilter) url += `&prescriberName=${encodeURIComponent(prescriberFilter)}&search=${encodeURIComponent(prescriberFilter)}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (priorityFilter !== "all") url += `&priority=${priorityFilter}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (res.ok && json.success) {
        // Search returns a plain List; paginated listing returns a Page with .content
        const raw: any[] = Array.isArray(json.data) ? json.data : (json.data?.content || []);
        // Normalize prescriber name — backend may use different field names
        let items = raw.map((rx: any) => ({
          ...rx,
          prescriberName: rx.prescriberName || rx.prescribingDoctor || rx.prescriber || rx.providerName || rx.renderingProvider || "",
        }));
        // Resolve fresh patient names to avoid showing stale names after patient updates
        const uniqueIds = [...new Set(items.map((rx: any) => rx.patientId).filter(Boolean))];
        const nameMap: Record<string, string> = {};
        await Promise.allSettled(
          uniqueIds.map(async (id) => {
            try {
              const r = await fetchWithAuth(`${apiBase()}/api/patients/${id}`);
              if (r.ok) {
                const d = await r.json();
                if (d?.data) nameMap[String(id)] = `${d.data.firstName ?? ""} ${d.data.lastName ?? ""}`.trim();
              }
            } catch { /* silent */ }
          })
        );
        items = items.map((rx: any) => ({
          ...rx,
          patientName: (rx.patientId && nameMap[String(rx.patientId)]) ? nameMap[String(rx.patientId)] : (rx.patientName || ""),
        }));
        setPrescriptions(items);
        setTotalPages(Array.isArray(json.data) ? 1 : (json.data?.totalPages || 1));
        setTotalElements(Array.isArray(json.data) ? items.length : (json.data?.totalElements || 0));
      } else {
        setPrescriptions([]);
      }
    } catch {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, prescriberFilter, statusFilter, priorityFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/prescriptions/stats`);
      const json = await res.json();
      if (res.ok && json.success) setStats(json.data);
    } catch {
      /* silent */
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchPrescriptions();
    fetchStats();
  }, [fetchPrescriptions, fetchStats]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  /* Debounced search */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchDraft.trim());
      setPage(0);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchDraft]);

  /* Debounced prescriber filter */
  useEffect(() => {
    if (prescriberDebounceRef.current) clearTimeout(prescriberDebounceRef.current);
    prescriberDebounceRef.current = setTimeout(() => {
      setPrescriberFilter(prescriberDraft.trim());
      setPage(0);
    }, 350);
    return () => { if (prescriberDebounceRef.current) clearTimeout(prescriberDebounceRef.current); };
  }, [prescriberDraft]);

  /* ---- Filtered data (client-side fallback for prescriber + priority) ---- */

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      if (priorityFilter !== "all" && rx.priority !== priorityFilter) return false;
      if (prescriberFilter) {
        const name = (rx.prescriberName || "").toLowerCase();
        if (!name.includes(prescriberFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [prescriptions, priorityFilter, prescriberFilter]);

  /* ---- Actions ---- */

  const handleDiscontinue = async (reason: string) => {
    if (!discontinueTarget?.id) return;
    setModalLoading(true);
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/prescriptions/${discontinueTarget.id}/discontinue`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Prescription discontinued" });
        setDiscontinueTarget(null);
        refreshAll();
      } else {
        setToast({ type: "error", text: json.message || "Failed to discontinue" });
      }
    } catch {
      setToast({ type: "error", text: "Network error" });
    } finally {
      setModalLoading(false);
    }
  };

  const handleRefill = async () => {
    if (!refillTarget?.id) return;
    setModalLoading(true);
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/prescriptions/${refillTarget.id}/refill`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Refill processed successfully" });
        setRefillTarget(null);
        refreshAll();
      } else {
        setToast({ type: "error", text: json.message || "Failed to process refill" });
      }
    } catch {
      setToast({ type: "error", text: "Network error" });
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setModalLoading(true);
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/prescriptions/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Prescription deleted" });
        setDeleteTarget(null);
        refreshAll();
      } else {
        setToast({ type: "error", text: json.message || "Failed to delete" });
      }
    } catch {
      setToast({ type: "error", text: "Network error" });
    } finally {
      setModalLoading(false);
    }
  };

  const openNew = () => {
    setEditingPrescription(null);
    setPanelOpen(true);
  };

  const openEdit = (rx: Prescription) => {
    setEditingPrescription(rx);
    setPanelOpen(true);
  };

  /* Stat counts for tabs */
  const totalAll = stats.active + stats.completed + stats.cancelled + stats.on_hold + stats.discontinued;
  const tabCountMap: Record<string, number> = {
    all: totalAll,
    active: stats.active,
    completed: stats.completed,
    cancelled: stats.cancelled,
    on_hold: stats.on_hold,
    discontinued: stats.discontinued,
  };

  const hasFilters = searchQuery !== "" || prescriberFilter !== "" || statusFilter !== "all" || priorityFilter !== "all";

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* Stats Cards */}
        <PrescriptionStatsCards
          stats={stats}
          activeFilter={statusFilter}
          onFilterChange={(s) => { setStatusFilter(s); setPage(0); }}
        />

        {/* Toolbar */}
        <div className="shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 mb-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              const count = tabCountMap[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key as PrescriptionStatus | "all"); setPage(0); }}
                  className={`relative px-3 py-2 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                    active
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    active
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400"
                  }`}>
                    {count}
                  </span>
                  {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Search + Filter + New button */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-slate-800">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Search by patient, medication, pharmacy..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
              {searchDraft && (
                <button onClick={() => setSearchDraft("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Search by prescriber..."
                value={prescriberDraft}
                onChange={(e) => setPrescriberDraft(e.target.value)}
              />
              {prescriberDraft && (
                <button onClick={() => setPrescriberDraft("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>

            {canWriteRx && (
            <div className="flex-shrink-0 ml-auto">
              <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm">
                <Plus className="w-4 h-4" />
                New Prescription
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Table */}
        <PrescriptionTable
          prescriptions={filtered}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onEdit={openEdit}
          onRefill={(rx) => setRefillTarget(rx)}
          onDiscontinue={(rx) => setDiscontinueTarget(rx)}
          onDelete={(rx) => setDeleteTarget(rx)}
          onNew={openNew}
          hasFilters={hasFilters}
        />

        {/* Form Panel */}
        <PrescriptionFormPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          prescription={editingPrescription}
          onSaved={refreshAll}
          showToast={setToast}
        />

        {/* Discontinue Modal */}
        <DiscontinueModal
          open={!!discontinueTarget}
          onClose={() => setDiscontinueTarget(null)}
          onConfirm={handleDiscontinue}
          loading={modalLoading}
        />

        {/* Refill Modal */}
        <RefillModal
          open={!!refillTarget}
          onClose={() => setRefillTarget(null)}
          onConfirm={handleRefill}
          loading={modalLoading}
          prescription={refillTarget}
        />

        {/* Delete Modal */}
        <DeleteModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={modalLoading}
        />
      </div>
    </AdminLayout>
  );
}
