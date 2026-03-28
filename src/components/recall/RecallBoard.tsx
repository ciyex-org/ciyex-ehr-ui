"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import DateInput from "@/components/ui/DateInput";
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, Phone, Mail, MessageSquare,
  FileText, ChevronRight, ChevronDown, Search, Plus, Filter, X, User,
  TrendingUp, XCircle, Bell, Send, Eye,
} from "lucide-react";

const API = getEnv("NEXT_PUBLIC_API_URL")!;

/* ═══════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════ */
type RecallType = {
  id: number; name: string; code: string; category: string;
  intervalMonths: number; leadTimeDays: number; maxAttempts: number;
  priority: string; active: boolean;
};

type PatientRecall = {
  id: number; patientId: number; patientName: string;
  patientPhone?: string; patientEmail?: string;
  recallTypeId?: number; recallTypeName?: string; recallTypeCode?: string; recallTypeCategory?: string;
  providerId?: number; providerName?: string; locationId?: number;
  status: string; dueDate: string; notificationDate?: string;
  sourceEncounterId?: string; sourceAppointmentId?: number;
  linkedAppointmentId?: number; completedEncounterId?: string; completedDate?: string;
  attemptCount: number; lastAttemptDate?: string; lastAttemptMethod?: string;
  lastAttemptOutcome?: string; nextAttemptDate?: string;
  preferredContact?: string; priority: string; notes?: string; cancelledReason?: string;
  autoCreated: boolean; createdBy?: string; updatedBy?: string;
  createdAt?: string; updatedAt?: string;
  outreachLogs?: OutreachLog[];
};

type OutreachLog = {
  id: number; recallId: number; attemptNumber: number; attemptDate: string;
  method: string; direction: string; performedBy?: string; performedByName?: string;
  outcome: string; notes?: string; nextAction?: string; nextActionDate?: string;
  automated: boolean; deliveryStatus?: string; createdAt?: string;
};

type KpiData = {
  dueToday: number; overdue: number; completedThisMonth: number;
  pendingTotal: number; contactedTotal: number; scheduledTotal: number;
  cancelledTotal: number; complianceRate: number;
};

type Patient = {
  id: number; firstName?: string | null; lastName?: string | null;
  dateOfBirth?: string | null;
  identification?: { firstName?: string | null; lastName?: string | null } | null;
  phoneNumber?: string | null; email?: string | null;
};

type Provider = { id: number; name: string };

/* ═══════════════════════════════════════════
 * Constants
 * ═══════════════════════════════════════════ */
const STATUSES = ["ALL", "PENDING", "DUE", "OVERDUE", "CONTACTED", "SCHEDULED", "COMPLETED", "DECLINED", "CANCELLED"] as const;

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:   { color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-700", icon: <Clock className="w-3 h-3" /> },
  DUE:       { color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-900/40", icon: <Bell className="w-3 h-3" /> },
  OVERDUE:   { color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-900/40", icon: <AlertTriangle className="w-3 h-3" /> },
  CONTACTED: { color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-900/40", icon: <Phone className="w-3 h-3" /> },
  SCHEDULED: { color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-100 dark:bg-indigo-900/40", icon: <Calendar className="w-3 h-3" /> },
  COMPLETED: { color: "text-green-700 dark:text-green-300", bg: "bg-green-100 dark:bg-green-900/40", icon: <CheckCircle2 className="w-3 h-3" /> },
  DECLINED:  { color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-900/40", icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800", icon: <X className="w-3 h-3" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "text-red-600 dark:text-red-400",
  URGENT: "text-red-700 dark:text-red-300 font-bold",
  NORMAL: "text-slate-500 dark:text-slate-400",
  LOW: "text-slate-400 dark:text-slate-500",
};

const OUTREACH_METHODS = ["PHONE", "SMS", "EMAIL", "PORTAL", "LETTER", "IN_PERSON"] as const;
const OUTREACH_OUTCOMES = ["REACHED", "NO_ANSWER", "LEFT_VOICEMAIL", "WRONG_NUMBER", "SCHEDULED", "DECLINED", "CALLBACK_REQUESTED"] as const;

const getPatientName = (p: Patient): string => {
  const first = (p.firstName ?? p.identification?.firstName ?? "")?.trim();
  const last = (p.lastName ?? p.identification?.lastName ?? "")?.trim();
  return `${first} ${last}`.trim();
};

/* ═══════════════════════════════════════════
 * API helper
 * ═══════════════════════════════════════════ */
async function api<T>(url: string, opts?: RequestInit): Promise<{ ok: boolean; data: T | null }> {
  try {
    const res = await fetchWithAuth(url, opts);
    const text = await res.text();
    if (!text) return { ok: res.ok, data: null };
    const json = JSON.parse(text);
    if (res.ok && json.success) return { ok: true, data: json.data };
    return { ok: false, data: null };
  } catch { return { ok: false, data: null }; }
}

/* ═══════════════════════════════════════════
 * KPI Card
 * ═══════════════════════════════════════════ */
function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
 * Status Badge
 * ═══════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {status}
    </span>
  );
}

/* ═══════════════════════════════════════════
 * Main Component
 * ═══════════════════════════════════════════ */
export default function RecallPage() {
  /* ── State ── */
  const [recalls, setRecalls] = useState<PatientRecall[]>([]);
  const [recallTypes, setRecallTypes] = useState<RecallType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Create/Edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRecall, setEditRecall] = useState<PatientRecall | null>(null);
  const [formErrors, setFormErrors] = useState<{ patientPhone?: string; patientEmail?: string }>({});
  const [formData, setFormData] = useState({
    patientId: "", patientName: "", patientPhone: "", patientEmail: "",
    recallTypeId: "", providerId: "", providerName: "", dueDate: "",
    preferredContact: "PHONE", priority: "NORMAL", status: "DUE", notes: "",
  });

  // Patient search in modal
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Detail side panel
  const [detailRecall, setDetailRecall] = useState<PatientRecall | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Outreach form
  const [showOutreachForm, setShowOutreachForm] = useState(false);
  const [outreachData, setOutreachData] = useState({ method: "PHONE", outcome: "REACHED", notes: "" });

  useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 4000); return () => clearTimeout(t); } }, [alert]);

  /* ── Load data ── */
  const loadRecalls = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(pageSize));
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (typeFilter) params.set("typeId", typeFilter);
    if (providerFilter) params.set("providerId", providerFilter);
    if (dateFrom) params.set("dueDateFrom", dateFrom);
    if (dateTo) params.set("dueDateTo", dateTo);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    const { data } = await api<any>(`${API}/api/recalls?${params}`);
    if (data?.content) {
      setRecalls(data.content);
      setTotalPages(data.totalPages ?? 1);
      setTotalItems(data.totalElements ?? 0);
    } else if (Array.isArray(data)) {
      setRecalls(data);
      setTotalPages(1);
      setTotalItems(data.length);
    } else {
      setRecalls([]);
      setTotalPages(1);
      setTotalItems(0);
    }
    setLoading(false);
  }, [page, pageSize, statusFilter, typeFilter, providerFilter, dateFrom, dateTo, searchQuery]);

  const loadKpis = useCallback(async () => {
    const { data } = await api<KpiData>(`${API}/api/recalls/kpis`);
    if (data) setKpis(data);
  }, []);

  const loadRecallTypes = useCallback(async () => {
    const { data } = await api<RecallType[]>(`${API}/api/recall-types`);
    if (data && Array.isArray(data)) {
      setRecallTypes(data);
    } else {
      // Fallback: provide common recall types so the UI isn't stuck on "Loading types..."
      setRecallTypes([
        { id: 1, name: "Annual Physical", code: "ANNUAL", category: "Preventive", intervalMonths: 12, leadTimeDays: 30, maxAttempts: 3, priority: "NORMAL", active: true },
        { id: 2, name: "Follow-up Visit", code: "FOLLOWUP", category: "Clinical", intervalMonths: 3, leadTimeDays: 14, maxAttempts: 3, priority: "NORMAL", active: true },
        { id: 3, name: "Lab Recheck", code: "LAB", category: "Lab", intervalMonths: 6, leadTimeDays: 14, maxAttempts: 3, priority: "NORMAL", active: true },
        { id: 4, name: "Immunization Due", code: "IMMUNIZATION", category: "Preventive", intervalMonths: 12, leadTimeDays: 30, maxAttempts: 3, priority: "NORMAL", active: true },
        { id: 5, name: "Chronic Care Management", code: "CCM", category: "Clinical", intervalMonths: 1, leadTimeDays: 7, maxAttempts: 5, priority: "HIGH", active: true },
      ]);
    }
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API}/api/providers`);
      if (res.ok) {
        const json = await res.json();
        const list = (json?.data ?? []).map((p: any) => ({
          id: p.id,
          name: `${p?.identification?.firstName ?? ""} ${p?.identification?.lastName ?? ""}`.trim(),
        }));
        setProviders(list);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadRecalls();
    loadKpis();
    loadRecallTypes();
    loadProviders();
  }, []);

  useEffect(() => { loadRecalls(); }, [page, pageSize, statusFilter, typeFilter, providerFilter, dateFrom, dateTo, searchQuery]);

  /* ── Patient search (debounced) ── */
  useEffect(() => {
    if (!showCreateModal) return;
    const q = patientQuery.trim();
    if (q.length < 2) { setPatientResults([]); return; }
    let cancelled = false;
    setPatientSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`${API}/api/patients?search=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (cancelled) return;
        let list: Patient[] = [];
        if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json?.data?.content)) list = json.data.content;
        setPatientResults(list);
        setShowPatientDropdown(true);
      } catch { if (!cancelled) setPatientResults([]); }
      finally { if (!cancelled) setPatientSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [patientQuery, showCreateModal]);

  /* ── Actions ── */
  const openCreate = () => {
    setEditRecall(null);
    setFormData({
      patientId: "", patientName: "", patientPhone: "", patientEmail: "",
      recallTypeId: "", providerId: "", providerName: "", dueDate: "",
      preferredContact: "PHONE", priority: "NORMAL", status: "DUE", notes: "",
    });
    setPatientQuery(""); setPatientResults([]); setShowPatientDropdown(false);
    setFormErrors({});
    setShowCreateModal(true);
  };

  const openEdit = (r: PatientRecall) => {
    setEditRecall(r);
    setFormData({
      patientId: String(r.patientId), patientName: r.patientName ?? "",
      patientPhone: r.patientPhone ?? "", patientEmail: r.patientEmail ?? "",
      recallTypeId: r.recallTypeId ? String(r.recallTypeId) : "",
      providerId: r.providerId ? String(r.providerId) : "",
      providerName: r.providerName ?? "",
      dueDate: r.dueDate ?? "", preferredContact: r.preferredContact ?? "PHONE",
      priority: r.priority ?? "NORMAL", status: r.status ?? "DUE", notes: r.notes ?? "",
    });
    setPatientQuery(""); setFormErrors({}); setShowCreateModal(true);
  };

  const choosePatient = (p: Patient) => {
    const name = getPatientName(p);
    setFormData(prev => ({
      ...prev, patientId: String(p.id), patientName: name,
      patientPhone: p.phoneNumber ?? "", patientEmail: p.email ?? "",
    }));
    setPatientQuery(""); setPatientResults([]); setShowPatientDropdown(false);
  };

  const saveRecall = async () => {
    if (!formData.patientId) { setAlert({ variant: "error", title: "Error", message: "Please select a patient." }); return; }
    if (!formData.dueDate) { setAlert({ variant: "error", title: "Error", message: "Due date is required." }); return; }
    if (formData.patientPhone && !/^\+?[\d\s\-().]{7,20}$/.test(formData.patientPhone)) {
      setAlert({ variant: "error", title: "Error", message: "Please enter a valid phone number." }); return;
    }
    if (formData.patientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.patientEmail)) {
      setAlert({ variant: "error", title: "Error", message: "Please enter a valid email address." }); return;
    }

    const payload = {
      patientId: Number(formData.patientId),
      patientName: formData.patientName,
      patientPhone: formData.patientPhone || null,
      patientEmail: formData.patientEmail || null,
      recallTypeId: formData.recallTypeId ? Number(formData.recallTypeId) : null,
      providerId: formData.providerId ? Number(formData.providerId) : null,
      providerName: formData.providerName || null,
      dueDate: formData.dueDate,
      preferredContact: formData.preferredContact,
      priority: formData.priority,
      status: formData.status,
      notes: formData.notes || null,
    };

    const url = editRecall ? `${API}/api/recalls/${editRecall.id}` : `${API}/api/recalls`;
    const method = editRecall ? "PUT" : "POST";
    const { ok } = await api<PatientRecall>(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });

    if (ok) {
      setAlert({ variant: "success", title: editRecall ? "Updated" : "Created", message: `Recall ${editRecall ? "updated" : "created"} successfully.` });
      setShowCreateModal(false);
      setPage(0);
      setTimeout(() => { loadRecalls(); loadKpis(); }, 200);
    } else {
      setAlert({ variant: "error", title: "Error", message: "Failed to save recall." });
    }
  };

  const deleteRecall = async (id: number) => {
    const { ok } = await api<void>(`${API}/api/recalls/${id}`, { method: "DELETE" });
    if (ok) {
      setAlert({ variant: "success", title: "Deleted", message: "Recall deleted." });
      setRecalls(prev => prev.filter(r => r.id !== id));
      loadKpis();
      if (detailRecall?.id === id) setDetailRecall(null);
    } else {
      setAlert({ variant: "error", title: "Error", message: "Failed to delete recall." });
    }
  };

  const openDetail = async (r: PatientRecall) => {
    setDetailLoading(true);
    setDetailRecall(r);
    setShowOutreachForm(false);
    setOutreachData({ method: "PHONE", outcome: "REACHED", notes: "" });
    const { data } = await api<PatientRecall>(`${API}/api/recalls/${r.id}`);
    if (data) setDetailRecall(data);
    setDetailLoading(false);
  };

  const logOutreach = async () => {
    if (!detailRecall) return;
    const { ok } = await api<OutreachLog>(`${API}/api/recalls/${detailRecall.id}/outreach`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outreachData),
    });
    if (ok) {
      setAlert({ variant: "success", title: "Logged", message: "Outreach attempt recorded." });
      setShowOutreachForm(false);
      setOutreachData({ method: "PHONE", outcome: "REACHED", notes: "" });
      openDetail(detailRecall);
      loadRecalls();
      loadKpis();
    } else {
      setAlert({ variant: "error", title: "Error", message: "Failed to log outreach." });
    }
  };

  const updateStatus = async (id: number, status: string) => {
    const { ok } = await api<PatientRecall>(`${API}/api/recalls/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (ok) {
      loadRecalls();
      loadKpis();
      if (detailRecall?.id === id) openDetail({ ...detailRecall, status });
    }
  };

  /* ── Helpers ── */
  const formatDate = (d?: string) => formatDisplayDate(d) || "—";
  const daysUntil = (d?: string) => {
    if (!d) return 0;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  };

  /* ═══════════════════════════════════════════
   * Render
   * ═══════════════════════════════════════════ */
  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Alert */}
        {alert && <div className="px-5 pt-3"><Alert variant={alert.variant} title={alert.title} message={alert.message} /></div>}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Patient Recall</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage patient follow-up recalls, outreach, and compliance tracking</p>
            </div>
            <Button onClick={openCreate} className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Recall
            </Button>
          </div>

          {/* KPI Cards */}
          {kpis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <KpiCard label="Due Today" value={kpis.dueToday} icon={<Calendar className="w-4 h-4 text-blue-600" />} color="bg-blue-50 dark:bg-blue-900/30" />
              <KpiCard label="Overdue" value={kpis.overdue} icon={<AlertTriangle className="w-4 h-4 text-red-600" />} color="bg-red-50 dark:bg-red-900/30" />
              <KpiCard label="Completed (Mo)" value={kpis.completedThisMonth} icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} color="bg-green-50 dark:bg-green-900/30" />
              <KpiCard label="Compliance" value={`${kpis.complianceRate}%`} icon={<TrendingUp className="w-4 h-4 text-indigo-600" />} color="bg-indigo-50 dark:bg-indigo-900/30" />
              <KpiCard label="Pending" value={kpis.pendingTotal} icon={<Clock className="w-4 h-4 text-slate-600" />} color="bg-slate-50 dark:bg-slate-800" />
              <KpiCard label="Contacted" value={kpis.contactedTotal} icon={<Phone className="w-4 h-4 text-amber-600" />} color="bg-amber-50 dark:bg-amber-900/30" />
              <KpiCard label="Scheduled" value={kpis.scheduledTotal} icon={<Calendar className="w-4 h-4 text-indigo-600" />} color="bg-indigo-50 dark:bg-indigo-900/30" />
              <KpiCard label="Cancelled" value={kpis.cancelledTotal} icon={<XCircle className="w-4 h-4 text-gray-500" />} color="bg-gray-50 dark:bg-gray-800" />
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            <div className="flex gap-1 flex-wrap">
              {STATUSES.map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    statusFilter === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}>
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {/* Recall Type */}
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs">
              <option value="">All Types</option>
              {recallTypes.length === 0
                ? <option value="" disabled>No types available</option>
                : recallTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
              }
            </select>
            {/* Provider */}
            <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value); setPage(0); }}
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs">
              <option value="">All Providers</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {/* Date range dropdown */}
            <select
              value={dateFrom && dateTo ? `${dateFrom}|${dateTo}` : ""}
              onChange={e => {
                const val = e.target.value;
                if (!val) { setDateFrom(""); setDateTo(""); setPage(0); return; }
                const [from, to] = val.split("|");
                setDateFrom(from); setDateTo(to); setPage(0);
              }}
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs"
            >
              <option value="">All Dates</option>
              {(() => {
                const today = new Date();
                const fmt = (d: Date) => d.toISOString().split("T")[0];
                const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
                const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
                const endOfWeek = addDays(startOfWeek, 6);
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                const past30 = addDays(today, -30);
                const next30 = addDays(today, 30);
                const next90 = addDays(today, 90);
                return [
                  <option key="overdue" value={`2020-01-01|${fmt(addDays(today, -1))}`}>Overdue</option>,
                  <option key="today" value={`${fmt(today)}|${fmt(today)}`}>Today</option>,
                  <option key="week" value={`${fmt(startOfWeek)}|${fmt(endOfWeek)}`}>This Week</option>,
                  <option key="month" value={`${fmt(startOfMonth)}|${fmt(endOfMonth)}`}>This Month</option>,
                  <option key="next-month" value={`${fmt(startOfNextMonth)}|${fmt(endOfNextMonth)}`}>Next Month</option>,
                  <option key="next-30" value={`${fmt(today)}|${fmt(next30)}`}>Next 30 Days</option>,
                  <option key="next-90" value={`${fmt(today)}|${fmt(next90)}`}>Next 90 Days</option>,
                  <option key="past-30" value={`${fmt(past30)}|${fmt(today)}`}>Past 30 Days</option>,
                ];
              })()}
            </select>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Search patient..." value={searchInput}
                onChange={e => {
                  setSearchInput(e.target.value);
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  searchTimerRef.current = setTimeout(() => { setSearchQuery(e.target.value); setPage(0); }, 300);
                }}
                className="h-8 pl-7 pr-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs w-44" />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Patient</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Provider</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Due Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Attempts</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Contact</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">Loading recalls...</td></tr>
                ) : recalls.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">No recalls found.</td></tr>
                ) : recalls.map(r => {
                  const days = daysUntil(r.dueDate);
                  const overdue = days < 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => openDetail(r)}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{r.patientName || "—"}</div>
                        <div className="text-[10px] text-slate-400">ID: {r.patientId}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs">{r.recallTypeName || "—"}</span>
                        {r.recallTypeCategory && (
                          <div className="text-[10px] text-slate-400">{r.recallTypeCategory}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">{r.providerName || "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs">{formatDate(r.dueDate)}</div>
                        {overdue && r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                          <div className="text-[10px] text-red-500 font-medium">{Math.abs(days)}d overdue</div>
                        )}
                        {!overdue && days <= 7 && r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                          <div className="text-[10px] text-amber-500">in {days}d</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[r.priority] ?? PRIORITY_COLORS.NORMAL}`}>{r.priority}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">{r.attemptCount}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {r.patientPhone && <Phone className="w-3 h-3 text-slate-400" />}
                          {r.patientEmail && <Mail className="w-3 h-3 text-slate-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(r)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="View details">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Edit">
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                          <button onClick={() => deleteRecall(r.id)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Delete">
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>Showing {recalls.length} of {totalItems} recalls</div>
            <div className="flex items-center gap-2">
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="h-7 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Prev</button>
              <span>Page {page + 1} of {totalPages}</span>
              <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Next</button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
         * Create/Edit Modal
         * ══════════════════════════════════════ */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40">
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{editRecall ? "Edit Recall" : "Create Recall"}</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                {/* Patient search */}
                <div className="relative">
                  <Label>Patient <span className="text-red-500">*</span></Label>
                  {formData.patientId ? (
                    <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{formData.patientName}</span>
                      <span className="text-xs text-slate-400">#{formData.patientId}</span>
                      {!editRecall && (
                        <button onClick={() => { setFormData(prev => ({ ...prev, patientId: "", patientName: "" })); setPatientQuery(""); }}
                          className="ml-auto p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="relative mt-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" placeholder="Search patient by name..." value={patientQuery}
                          onChange={e => { setPatientQuery(e.target.value); setShowPatientDropdown(true); }}
                          onFocus={() => { if (patientResults.length > 0) setShowPatientDropdown(true); }}
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                      </div>
                      {showPatientDropdown && (patientSearching || patientResults.length > 0) && (
                        <div className="absolute z-20 mt-1 w-full max-w-[calc(100%-3rem)] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                          {patientSearching ? (
                            <div className="px-3 py-2 text-xs text-slate-400">Searching...</div>
                          ) : (
                            <ul className="max-h-48 overflow-auto py-1">
                              {patientResults.map(p => (
                                <li key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => choosePatient(p)}
                                  className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                                  <div className="font-medium text-slate-800 dark:text-slate-100">{getPatientName(p) || `Patient #${p.id}`}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {p.dateOfBirth && `DOB: ${p.dateOfBirth}`}
                                    {p.phoneNumber && ` | ${p.phoneNumber}`}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Recall Type */}
                <div>
                  <Label>Recall Type</Label>
                  <select value={formData.recallTypeId}
                    onChange={e => setFormData(prev => ({ ...prev, recallTypeId: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                    <option value="" disabled>
                      {recallTypes.length === 0 ? "Loading types..." : "Select type..."}
                    </option>
                    {recallTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Provider */}
                  <div>
                    <Label>Provider</Label>
                    <select value={formData.providerId}
                      onChange={e => {
                        const prov = providers.find(p => String(p.id) === e.target.value);
                        setFormData(prev => ({ ...prev, providerId: e.target.value, providerName: prov?.name ?? "" }));
                      }}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                      <option value="">Select provider...</option>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {/* Due Date */}
                  <div>
                    <Label>Due Date <span className="text-red-500">*</span></Label>
                    <DateInput value={formData.dueDate}
                      onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Preferred Contact */}
                  <div>
                    <Label>Preferred Contact</Label>
                    <select value={formData.preferredContact}
                      onChange={e => setFormData(prev => ({ ...prev, preferredContact: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                      <option value="PHONE">Phone</option>
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="PORTAL">Portal</option>
                      <option value="LETTER">Letter</option>
                    </select>
                  </div>
                  {/* Priority */}
                  <div>
                    <Label>Priority</Label>
                    <select value={formData.priority}
                      onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Status (shown in edit mode) */}
                {editRecall && (
                  <div>
                    <Label>Status</Label>
                    <select value={formData.status}
                      onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm">
                      <option value="DUE">Due</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="NOTIFIED">Notified</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                )}

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <input type="tel" value={formData.patientPhone}
                      onChange={e => {
                        const v = e.target.value;
                        setFormData(prev => ({ ...prev, patientPhone: v }));
                        setFormErrors(prev => ({ ...prev, patientPhone: v && !/^\+?[\d\s\-().]{7,20}$/.test(v) ? "Enter a valid phone number (7–20 digits)" : undefined }));
                      }}
                      placeholder="e.g. (555) 123-4567"
                      className={`mt-1 w-full h-9 rounded-lg border px-3 text-sm bg-white dark:bg-slate-800 ${formErrors.patientPhone ? "border-red-400 dark:border-red-500" : "border-slate-300 dark:border-slate-600"}`} />
                    {formErrors.patientPhone && <p className="mt-1 text-xs text-red-500">{formErrors.patientPhone}</p>}
                  </div>
                  <div>
                    <Label>Email</Label>
                    <input type="email" value={formData.patientEmail}
                      onChange={e => {
                        const v = e.target.value;
                        setFormData(prev => ({ ...prev, patientEmail: v }));
                        setFormErrors(prev => ({ ...prev, patientEmail: v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Enter a valid email address" : undefined }));
                      }}
                      placeholder="e.g. patient@email.com"
                      className={`mt-1 w-full h-9 rounded-lg border px-3 text-sm bg-white dark:bg-slate-800 ${formErrors.patientEmail ? "border-red-400 dark:border-red-500" : "border-slate-300 dark:border-slate-600"}`} />
                    {formErrors.patientEmail && <p className="mt-1 text-xs text-red-500">{formErrors.patientEmail}</p>}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes</Label>
                  <textarea value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={saveRecall} className="bg-blue-600 text-white hover:bg-blue-700">
                  {editRecall ? "Update Recall" : "Create Recall"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
         * Detail Side Panel
         * ══════════════════════════════════════ */}
        {detailRecall && (
          <div className="fixed inset-0 z-40 flex">
            <button className="flex-1 bg-black/30" onClick={() => setDetailRecall(null)} aria-label="Close" />
            <div className="w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{detailRecall.patientName}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">{detailRecall.recallTypeName || "No type"} &bull; Due {formatDate(detailRecall.dueDate)}</div>
                </div>
                <button onClick={() => setDetailRecall(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {detailLoading ? (
                  <p className="text-sm text-slate-400">Loading details...</p>
                ) : (
                  <>
                    {/* Status & Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={detailRecall.status} />
                      <span className={`text-xs font-medium ${PRIORITY_COLORS[detailRecall.priority] ?? PRIORITY_COLORS.NORMAL}`}>{detailRecall.priority}</span>
                      <div className="flex-1" />
                      {detailRecall.status !== "COMPLETED" && detailRecall.status !== "CANCELLED" && (
                        <>
                          <button onClick={() => updateStatus(detailRecall.id, "COMPLETED")}
                            className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50">
                            Mark Complete
                          </button>
                          <button onClick={() => updateStatus(detailRecall.id, "CANCELLED")}
                            className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50">
                            Cancel
                          </button>
                        </>
                      )}
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-slate-400">Patient ID:</span><div className="font-medium text-slate-700 dark:text-slate-200">{detailRecall.patientId}</div></div>
                      <div><span className="text-slate-400">Provider:</span><div className="font-medium text-slate-700 dark:text-slate-200">{detailRecall.providerName || "—"}</div></div>
                      <div><span className="text-slate-400">Phone:</span><div className="font-medium text-slate-700 dark:text-slate-200">{detailRecall.patientPhone || "—"}</div></div>
                      <div><span className="text-slate-400">Email:</span><div className="font-medium text-slate-700 dark:text-slate-200">{detailRecall.patientEmail || "—"}</div></div>
                      <div><span className="text-slate-400">Preferred Contact:</span><div className="font-medium text-slate-700 dark:text-slate-200">{detailRecall.preferredContact || "—"}</div></div>
                      <div><span className="text-slate-400">Attempts:</span><div className="font-medium text-slate-700 dark:text-slate-200">{detailRecall.attemptCount}</div></div>
                      {detailRecall.lastAttemptDate && (
                        <div><span className="text-slate-400">Last Attempt:</span><div className="font-medium text-slate-700 dark:text-slate-200">{formatDate(detailRecall.lastAttemptDate)} ({detailRecall.lastAttemptMethod})</div></div>
                      )}
                      {detailRecall.nextAttemptDate && (
                        <div><span className="text-slate-400">Next Attempt:</span><div className="font-medium text-slate-700 dark:text-slate-200">{formatDate(detailRecall.nextAttemptDate)}</div></div>
                      )}
                    </div>

                    {detailRecall.notes && (
                      <div className="text-xs"><span className="text-slate-400">Notes:</span><p className="mt-1 text-slate-600 dark:text-slate-300">{detailRecall.notes}</p></div>
                    )}

                    {/* Outreach History */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Outreach History</h4>
                        {detailRecall.status !== "COMPLETED" && detailRecall.status !== "CANCELLED" && (
                          <button onClick={() => setShowOutreachForm(!showOutreachForm)}
                            className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1">
                            <Send className="w-3 h-3" /> Log Outreach
                          </button>
                        )}
                      </div>

                      {/* Outreach form */}
                      {showOutreachForm && (
                        <div className="mb-3 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 font-medium">Method</label>
                              <select value={outreachData.method} onChange={e => setOutreachData(prev => ({ ...prev, method: e.target.value }))}
                                className="w-full h-7 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs mt-0.5">
                                {OUTREACH_METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-medium">Outcome</label>
                              <select value={outreachData.outcome} onChange={e => setOutreachData(prev => ({ ...prev, outcome: e.target.value }))}
                                className="w-full h-7 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs mt-0.5">
                                {OUTREACH_OUTCOMES.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                              </select>
                            </div>
                          </div>
                          <textarea placeholder="Notes..." value={outreachData.notes}
                            onChange={e => setOutreachData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={2} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs" />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setShowOutreachForm(false)} className="text-xs px-2 py-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                            <button onClick={logOutreach} className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
                          </div>
                        </div>
                      )}

                      {/* Outreach log list */}
                      {detailRecall.outreachLogs && detailRecall.outreachLogs.length > 0 ? (
                        <div className="space-y-2">
                          {detailRecall.outreachLogs.map(log => (
                            <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">#{log.attemptNumber}</span>
                                  <span className="text-slate-400">{formatDate(log.attemptDate)}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  log.outcome === "SCHEDULED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                                  log.outcome === "DECLINED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                                  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                }`}>{log.outcome.replace(/_/g, " ")}</span>
                              </div>
                              <div className="text-slate-500 dark:text-slate-400">
                                {log.method.replace("_", " ")} {log.direction === "INBOUND" ? "(inbound)" : ""} {log.performedByName ? `by ${log.performedByName}` : ""}
                              </div>
                              {log.notes && <p className="mt-1 text-slate-600 dark:text-slate-300">{log.notes}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-3">No outreach attempts yet</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
