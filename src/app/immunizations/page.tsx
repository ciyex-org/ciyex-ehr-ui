"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Inbox,
  Syringe,
  XCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Immunization = {
  id?: number;
  patientId: number | string;
  patientName: string;
  vaccineName: string;
  cvxCode: string;
  lotNumber: string;
  manufacturer: string;
  administrationDate: string;
  expirationDate?: string;
  site: string;
  route: string;
  doseNumber: number | string;
  doseSeries: string;
  administeredBy: string;
  orderingProvider: string;
  status: string;
  refusalReason?: string;
  reaction?: string;
  visDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StatusFilter = "all" | "completed" | "not_done" | "entered_in_error";
type ToastState = { type: "success" | "error"; text: string } | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "not_done", label: "Not Done" },
  { key: "entered_in_error", label: "Entered in Error" },
];

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  not_done: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  entered_in_error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  not_done: <XCircle className="w-3.5 h-3.5" />,
  entered_in_error: <AlertTriangle className="w-3.5 h-3.5" />,
};

const SITE_OPTIONS = [
  "Left Arm", "Right Arm", "Left Thigh", "Right Thigh",
  "Left Deltoid", "Right Deltoid", "Left Gluteal", "Right Gluteal",
];

const ROUTE_OPTIONS = [
  { value: "intramuscular", label: "Intramuscular (IM)" },
  { value: "subcutaneous", label: "Subcutaneous (SC)" },
  { value: "oral", label: "Oral" },
  { value: "intranasal", label: "Intranasal" },
  { value: "intradermal", label: "Intradermal" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

function blankImmunization(): Immunization {
  return {
    patientId: "", patientName: "", vaccineName: "", cvxCode: "", lotNumber: "", manufacturer: "",
    administrationDate: new Date().toISOString().slice(0, 10), expirationDate: "", site: "", route: "intramuscular",
    doseNumber: "", doseSeries: "", administeredBy: "", orderingProvider: "",
    status: "completed", refusalReason: "", reaction: "", visDate: "", notes: "",
  };
}

function formatDate(d?: string) {
  if (!d) return "--";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return d; }
}

function statusLabel(s: string) {
  return s === "entered_in_error" ? "Entered in Error" : s === "not_done" ? "Not Done" : s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [toast, onClose]);
  const cls = toast.type === "success"
    ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
    : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200";
  return (
    <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${cls}`}>
      {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide-out Form Panel                                               */
/* ------------------------------------------------------------------ */

function ImmunizationFormPanel({ open, onClose, record, onSaved, showToast }: {
  open: boolean; onClose: () => void; record: Immunization | null; onSaved: () => void; showToast: (t: ToastState) => void;
}) {
  const [form, setForm] = useState<Immunization>(blankImmunization());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(record ? { ...record } : blankImmunization()); }, [open, record]);
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const set = (field: keyof Immunization, value: string | number) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.patientName.trim()) { showToast({ type: "error", text: "Patient name is required" }); return; }
    if (!form.vaccineName.trim()) { showToast({ type: "error", text: "Vaccine name is required" }); return; }
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit ? apiUrl(`/api/immunizations/${form.id}`) : apiUrl("/api/immunizations");
      const payload = { ...form, doseNumber: form.doseNumber ? Number(form.doseNumber) : null };
      const res = await fetchWithAuth(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast({ type: "success", text: isEdit ? "Immunization updated" : "Immunization recorded" });
        onSaved(); onClose();
      } else {
        showToast({ type: "error", text: json.message || "Failed to save immunization" });
      }
    } catch { showToast({ type: "error", text: "Network error saving immunization" }); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";
  const sectionCls = "border-b border-gray-100 dark:border-slate-800 pb-4";

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[min(640px,95vw)] bg-white dark:bg-slate-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{form.id ? "Edit Immunization" : "Record Immunization"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Patient Info */}
          <div className={sectionCls}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Patient Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Patient Name *</label>
                <input className={inputCls} value={form.patientName} onChange={(e) => set("patientName", e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <label className={labelCls}>Patient ID</label>
                <input className={inputCls} value={form.patientId} onChange={(e) => set("patientId", e.target.value)} placeholder="12345" />
              </div>
            </div>
          </div>

          {/* Vaccine Info */}
          <div className={sectionCls}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Vaccine Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Vaccine Name *</label>
                <input className={inputCls} value={form.vaccineName} onChange={(e) => set("vaccineName", e.target.value)} placeholder="Influenza, inactivated" />
              </div>
              <div>
                <label className={labelCls}>CVX Code</label>
                <input className={inputCls} value={form.cvxCode} onChange={(e) => set("cvxCode", e.target.value)} placeholder="141" />
              </div>
              <div>
                <label className={labelCls}>Manufacturer</label>
                <input className={inputCls} value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="Pfizer" />
              </div>
              <div>
                <label className={labelCls}>Lot Number</label>
                <input className={inputCls} value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} placeholder="ABC123" />
              </div>
              <div>
                <label className={labelCls}>Expiration Date</label>
                <input type="date" className={inputCls} value={form.expirationDate || ""} onChange={(e) => set("expirationDate", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Administration Details */}
          <div className={sectionCls}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Administration Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Administration Date</label>
                <input type="date" className={inputCls} value={form.administrationDate} onChange={(e) => set("administrationDate", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Site</label>
                <select className={inputCls} value={form.site} onChange={(e) => set("site", e.target.value)}>
                  <option value="">Select site...</option>
                  {SITE_OPTIONS.map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Route</label>
                <select className={inputCls} value={form.route} onChange={(e) => set("route", e.target.value)}>
                  {ROUTE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Dose Number</label>
                <input type="number" min={1} className={inputCls} value={form.doseNumber} onChange={(e) => set("doseNumber", e.target.value)} placeholder="1" />
              </div>
              <div>
                <label className={labelCls}>Dose Series</label>
                <input className={inputCls} value={form.doseSeries} onChange={(e) => set("doseSeries", e.target.value)} placeholder="1 of 3 or booster" />
              </div>
            </div>
          </div>

          {/* Provider Info */}
          <div className={sectionCls}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Provider Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Administered By</label>
                <input className={inputCls} value={form.administeredBy} onChange={(e) => set("administeredBy", e.target.value)} placeholder="Nurse Smith" />
              </div>
              <div>
                <label className={labelCls}>Ordering Provider</label>
                <input className={inputCls} value={form.orderingProvider} onChange={(e) => set("orderingProvider", e.target.value)} placeholder="Dr. Johnson" />
              </div>
            </div>
          </div>

          {/* Status & Notes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Status & Notes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="completed">Completed</option>
                  <option value="not_done">Not Done</option>
                  <option value="entered_in_error">Entered in Error</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>VIS Date</label>
                <input type="date" className={inputCls} value={form.visDate || ""} onChange={(e) => set("visDate", e.target.value)} />
              </div>
              {form.status === "not_done" && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Refusal Reason</label>
                  <input className={inputCls} value={form.refusalReason || ""} onChange={(e) => set("refusalReason", e.target.value)} placeholder="Patient declined..." />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={labelCls}>Reaction</label>
                <input className={inputCls} value={form.reaction || ""} onChange={(e) => set("reaction", e.target.value)} placeholder="None observed" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea rows={3} className={inputCls} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes..." />
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
          <button disabled={saving} onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {form.id ? "Update" : "Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ImmunizationsPage() {
  const [records, setRecords] = useState<Immunization[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toast, setToast] = useState<ToastState>(null);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Immunization | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Immunization | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: "20" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetchWithAuth(apiUrl(`/api/immunizations?${params.toString()}`));
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (Array.isArray(json.data)) {
            const filtered = statusFilter === "all" ? json.data : json.data.filter((r: Immunization) => r.status === statusFilter);
            setRecords(filtered);
            setTotalPages(1);
            setTotalElements(filtered.length);
          } else {
            const items = json.data.content || [];
            const filtered = statusFilter === "all" ? items : items.filter((r: Immunization) => r.status === statusFilter);
            setRecords(filtered);
            setTotalPages(json.data.totalPages || 1);
            setTotalElements(json.data.totalElements || 0);
          }
        } else { setRecords([]); }
      } else { setRecords([]); }
    } catch (err) { console.error("Failed to load immunizations:", err); setRecords([]); }
    finally { setLoading(false); }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const reload = () => { loadRecords(); };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(0), 300);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/immunizations/${deleteTarget.id}`), { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) { setToast({ type: "success", text: "Immunization record deleted" }); reload(); }
      else { setToast({ type: "error", text: json.message || "Failed to delete record" }); }
    } catch { setToast({ type: "error", text: "Network error deleting record" }); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Immunization Registry</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track and manage patient immunization records</p>
              </div>
              <button onClick={() => { setEditingRecord(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                <Plus className="w-4 h-4" /> Record Immunization
              </button>
            </div>

            {/* Filters + Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by patient, vaccine, CVX, manufacturer..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
                </div>
                {/* Status filter */}
                <div className="flex gap-1 overflow-x-auto shrink-0">
                  {STATUS_FILTERS.map((f) => (
                    <button key={f.key} onClick={() => { setStatusFilter(f.key); setPage(0); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${statusFilter === f.key ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-400"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">No immunization records found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Record a new immunization to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vaccine</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CVX</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dose</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Site</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Route</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Administered By</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {records.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.patientName || "--"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900 dark:text-gray-100">{r.vaccineName || "--"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">{r.cvxCode || "--"}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {r.doseNumber ? `#${r.doseNumber}` : "--"}{r.doseSeries ? ` (${r.doseSeries})` : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{r.site || "--"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{r.route || "--"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(r.administrationDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.administeredBy || "--"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] || "bg-gray-100 text-gray-600"}`}>
                              {STATUS_ICON[r.status]} {statusLabel(r.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button title="Edit" onClick={() => { setEditingRecord(r); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button title="Delete" onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!loading && records.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/20">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{totalElements} record{totalElements !== 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-1">
                    <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400 px-2">Page {page + 1} of {totalPages}</span>
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide-out form */}
        <ImmunizationFormPanel open={formOpen} onClose={() => setFormOpen(false)} record={editingRecord} onSaved={reload} showToast={setToast} />

        {/* Delete confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete Record</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete the <strong>{deleteTarget.vaccineName}</strong> record for <strong>{deleteTarget.patientName}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                <button disabled={deleting} onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </AdminLayout>
  );
}
