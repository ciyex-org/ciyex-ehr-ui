"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { formatDisplayDate } from "@/utils/dateUtils";
import DateInput from "@/components/ui/DateInput";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldX,
  FileCheck,
  Loader2,
  Inbox,
  PenLine,
  Ban,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Consent = {
  id?: number;
  patientId: number | string;
  patientName: string;
  consentType: string;
  status: string;
  signedDate?: string;
  expiryDate?: string;
  signedBy?: string;
  witnessName?: string;
  documentUrl?: string;
  version?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ConsentStats = { pending: number; signed: number; expired: number; revoked: number };
type StatusTab = "all" | "pending" | "signed" | "expired" | "revoked";
type ToastState = { type: "success" | "error"; text: string } | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "signed", label: "Signed" },
  { key: "expired", label: "Expired" },
  { key: "revoked", label: "Revoked" },
];

const CONSENT_TYPES: { value: string; label: string }[] = [
  { value: "hipaa_privacy", label: "HIPAA Privacy" },
  { value: "treatment", label: "Treatment" },
  { value: "release_of_info", label: "Release of Info" },
  { value: "telehealth", label: "Telehealth" },
  { value: "research", label: "Research" },
  { value: "financial", label: "Financial" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  signed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  revoked: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  signed: <CheckCircle2 className="w-3.5 h-3.5" />,
  expired: <AlertTriangle className="w-3.5 h-3.5" />,
  revoked: <ShieldX className="w-3.5 h-3.5" />,
};

const STAT_CARDS: { key: keyof ConsentStats; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "pending", label: "Pending", icon: <Clock className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400" },
  { key: "signed", label: "Signed", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 dark:text-green-400" },
  { key: "expired", label: "Expired", icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600 dark:text-red-400" },
  { key: "revoked", label: "Revoked", icon: <ShieldX className="w-4 h-4" />, color: "text-gray-500 dark:text-gray-400" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

function blankConsent(): Consent {
  return { patientId: "", patientName: "", consentType: "hipaa_privacy", status: "pending", expiryDate: "", version: "", notes: "" };
}

function formatDate(d?: string) {
  if (!d) return "--";
  return formatDisplayDate(d) || "--";
}

function consentTypeLabel(t: string) {
  return CONSENT_TYPES.find((c) => c.value === t)?.label || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CONSENT_TYPE_COLOR: Record<string, string> = {
  hipaa_privacy: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  treatment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  release_of_info: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  telehealth: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  research: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  financial: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

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
/*  Sign Modal                                                         */
/* ------------------------------------------------------------------ */

function SignModal({ open, onClose, onSign }: { open: boolean; onClose: () => void; onSign: (signedBy: string, witnessName: string) => void }) {
  const [signedBy, setSignedBy] = useState("");
  const [witnessName, setWitnessName] = useState("");
  useEffect(() => { if (open) { setSignedBy(""); setWitnessName(""); } }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sign Consent</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Signed By *</label>
          <input className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Patient or guardian name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Witness Name</label>
          <input className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} placeholder="Witness name (optional)" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
          <button disabled={!signedBy.trim()} onClick={() => onSign(signedBy, witnessName)} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <PenLine className="w-4 h-4" /> Sign
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide-out Form Panel                                               */
/* ------------------------------------------------------------------ */

function ConsentFormPanel({ open, onClose, consent, onSaved, showToast }: {
  open: boolean; onClose: () => void; consent: Consent | null; onSaved: () => void; showToast: (t: ToastState) => void;
}) {
  const [form, setForm] = useState<Consent>(blankConsent());
  const [saving, setSaving] = useState(false);

  // Patient search
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: number; firstName?: string; lastName?: string; fullName?: string; name?: string; identification?: { firstName?: string; lastName?: string } | null }[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  useEffect(() => {
    if (open) {
      const c = consent ? { ...consent } : blankConsent();
      setForm(c);
      setPatientQuery(c.patientName || "");
      setPatientResults([]);
      setShowPatientDropdown(false);
    }
  }, [open, consent]);

  // Debounced patient search
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(apiUrl(`/api/patients?search=${encodeURIComponent(patientQuery)}`));
        const json = await res.json();
        let list: any[] = [];
        if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json?.data?.content)) list = json.data.content;
        setPatientResults(list);
        setShowPatientDropdown(list.length > 0);
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const set = (field: keyof Consent, value: string | number) => setForm((p) => ({ ...p, [field]: value }));

  const getPatientDisplayName = (p: any) => {
    if (p.fullName) return p.fullName;
    if (p.name) return p.name;
    const first = (p.firstName ?? p.identification?.firstName ?? "").trim();
    const last = (p.lastName ?? p.identification?.lastName ?? "").trim();
    return `${first} ${last}`.trim();
  };

  const selectPatient = (p: any) => {
    const name = getPatientDisplayName(p);
    setForm((prev) => ({ ...prev, patientId: p.id, patientName: name }));
    setPatientQuery(name);
    setShowPatientDropdown(false);
  };

  const handleSave = async () => {
    if (!form.patientName.trim()) { showToast({ type: "error", text: "Patient name is required" }); return; }
    if (!form.patientId?.toString().trim()) { showToast({ type: "error", text: "Patient ID is required" }); return; }
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit ? apiUrl(`/api/consents/${form.id}`) : apiUrl("/api/consents");
      const res = await fetchWithAuth(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(form) });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast({ type: "success", text: isEdit ? "Consent updated" : "Consent created" });
        onSaved(); onClose();
      } else {
        showToast({ type: "error", text: json.message || "Failed to save consent" });
      }
    } catch { showToast({ type: "error", text: "Network error saving consent" }); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[min(560px,95vw)] bg-white dark:bg-slate-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{form.id ? "Edit Consent" : "New Consent"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 relative">
              <label className={labelCls}>Patient Name *</label>
              <input
                className={inputCls}
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  set("patientName", e.target.value);
                  set("patientId", "");
                  setShowPatientDropdown(true);
                }}
                onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
                placeholder="Search patient by name..."
              />
              {showPatientDropdown && patientResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100"
                    >
                      {getPatientDisplayName(p)} <span className="text-xs text-gray-400">#{p.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Patient ID *</label>
              <input className={inputCls} value={form.patientId} readOnly placeholder="Auto-filled from search" />
            </div>
            <div>
              <label className={labelCls}>Consent Type</label>
              <select className={inputCls} value={form.consentType} onChange={(e) => set("consentType", e.target.value)}>
                {CONSENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status || "pending"} onChange={(e) => set("status", e.target.value)}>
                <option value="pending">Pending</option>
                <option value="signed">Signed</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Expiry Date</label>
              <DateInput className={inputCls} value={form.expiryDate || ""} onChange={(e) => set("expiryDate", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Version</label>
              <input
                className={`${inputCls} ${form.version && !/^\d+(\.\d+){0,2}$/.test(form.version.trim()) ? "border-red-400 ring-1 ring-red-300" : ""}`}
                value={form.version || ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  set("version", v);
                }}
                placeholder="1.0"
                maxLength={20}
              />
              {form.version && !/^\d+(\.\d+){0,2}$/.test(form.version.trim()) && (
                <p className="text-xs text-red-500 mt-1">Version must be in format like 1.0 or 1.0.0</p>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={3} className={inputCls} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>
        {/* Footer */}
        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
          <button disabled={saving} onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {form.id ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ConsentsPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [stats, setStats] = useState<ConsentStats>({ pending: 0, signed: 0, expired: 0, revoked: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [toast, setToast] = useState<ToastState>(null);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editingConsent, setEditingConsent] = useState<Consent | null>(null);

  // Sign modal
  const [signTarget, setSignTarget] = useState<Consent | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Consent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/consents/stats"));
      if (res.ok) { const json = await res.json(); if (json.success && json.data) setStats(json.data); }
    } catch (err) { console.error("Failed to load consent stats:", err); }
  }, []);

  const loadConsents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: "20" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetchWithAuth(apiUrl(`/api/consents?${params.toString()}`));
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          // Handle search result (list) vs paginated result (page object)
          if (Array.isArray(json.data)) {
            const filtered = activeTab === "all" ? json.data : json.data.filter((c: Consent) => c.status === activeTab);
            setConsents(filtered);
            setTotalPages(1);
            setTotalElements(filtered.length);
          } else {
            const items = json.data.content || [];
            const filtered = activeTab === "all" ? items : items.filter((c: Consent) => c.status === activeTab);
            setConsents(filtered);
            setTotalPages(json.data.totalPages || 1);
            setTotalElements(filtered.length);
          }
        } else { setConsents([]); }
      } else { setConsents([]); }
    } catch (err) { console.error("Failed to load consents:", err); setConsents([]); }
    finally { setLoading(false); }
  }, [page, searchQuery, activeTab]);

  useEffect(() => { loadConsents(); }, [loadConsents]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const reload = () => { loadConsents(); loadStats(); };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(0), 300);
  };

  const handleSign = async (signedBy: string, witnessName: string) => {
    if (!signTarget) return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/consents/${signTarget.id}/sign`), { method: "POST", body: JSON.stringify({ signedBy, witnessName }) });
      const json = await res.json();
      if (res.ok && json.success) { setToast({ type: "success", text: "Consent signed successfully" }); reload(); }
      else { setToast({ type: "error", text: json.message || "Failed to sign consent" }); }
    } catch { setToast({ type: "error", text: "Network error signing consent" }); }
    finally { setSignTarget(null); }
  };

  const handleRevoke = async (c: Consent) => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/consents/${c.id}/revoke`), { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) { setToast({ type: "success", text: "Consent revoked" }); reload(); }
      else { setToast({ type: "error", text: json.message || "Failed to revoke consent" }); }
    } catch { setToast({ type: "error", text: "Network error revoking consent" }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/consents/${deleteTarget.id}`), { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) { setToast({ type: "success", text: "Consent deleted" }); reload(); }
      else { setToast({ type: "error", text: json.message || "Failed to delete consent" }); }
    } catch { setToast({ type: "error", text: "Network error deleting consent" }); }
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Consent Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage patient consent forms and authorizations</p>
              </div>
              <button onClick={() => { setEditingConsent(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                <Plus className="w-4 h-4" /> New Consent
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STAT_CARDS.map((card) => (
                <div key={card.key} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={card.color}>{card.icon}</span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats[card.key]}</p>
                </div>
              ))}
            </div>

            {/* Tabs + Search */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Status Tabs */}
                <div className="flex gap-1 overflow-x-auto">
                  {STATUS_TABS.map((tab) => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(0); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${activeTab === tab.key ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-400"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                {/* Search */}
                <div className="sm:ml-auto relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search consents..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : consents.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">No consents found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create a new consent to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Signed Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Signed By</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {consents.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.patientName || "--"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${CONSENT_TYPE_COLOR[c.consentType] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                              {consentTypeLabel(c.consentType)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[c.status] || "bg-gray-100 text-gray-600"}`}>
                              {STATUS_ICON[c.status]} {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(c.signedDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(c.expiryDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.signedBy || "--"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {c.status === "pending" && (
                                <button title="Sign" onClick={() => setSignTarget(c)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  <PenLine className="w-4 h-4" />
                                </button>
                              )}
                              {c.status === "signed" && (
                                <button title="Revoke" onClick={() => handleRevoke(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              <button title="Edit" onClick={() => { setEditingConsent(c); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button title="Delete" onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400">
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
              {!loading && consents.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/20">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{totalElements} consent{totalElements !== 1 ? "s" : ""}</span>
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
        <ConsentFormPanel open={formOpen} onClose={() => setFormOpen(false)} consent={editingConsent} onSaved={reload} showToast={setToast} />

        {/* Sign modal */}
        <SignModal open={!!signTarget} onClose={() => setSignTarget(null)} onSign={handleSign} />

        {/* Delete confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete Consent</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this consent for <strong>{deleteTarget.patientName}</strong>? This action cannot be undone.
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
