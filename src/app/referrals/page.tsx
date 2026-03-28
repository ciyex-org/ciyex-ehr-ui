"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { formatDisplayDate } from "@/utils/dateUtils";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  Clock,
  CalendarCheck,
  FileText,
  XCircle,
  ShieldX,
  Trash2,
  Pencil,
  ArrowRightCircle,
  AlertTriangle,
  Zap,
  Filter,
  X,
  Building2,
  User,
  Stethoscope,
  CreditCard,
  ClipboardList,
  Loader2,
  Inbox,
} from "lucide-react";
import { isValidUSPhone, isValidFax, isValidNpi } from "@/utils/validation";
import DateInput from "@/components/ui/DateInput";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Referral = {
  id?: number;
  patientId: string;
  patientName: string;
  referringProvider: string;
  specialistName: string;
  specialistNpi: string;
  specialty: string;
  facilityName: string;
  facilityAddress: string;
  facilityPhone: string;
  facilityFax: string;
  reason: string;
  clinicalNotes: string;
  urgency: "routine" | "urgent" | "stat";
  status: ReferralStatus;
  referralDate: string;
  expiryDate: string;
  authorizationNumber: string;
  insuranceName: string;
  insuranceId: string;
  appointmentDate: string;
  appointmentNotes: string;
  followUpNotes: string;
};

type ReferralStatus =
  | "draft"
  | "sent"
  | "acknowledged"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "denied";

type ReferralStats = {
  draft: number;
  sent: number;
  acknowledged: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  denied: number;
};

type ToastState = { type: "success" | "error" | "info"; text: string } | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_TABS: { key: ReferralStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "denied", label: "Denied" },
  { key: "cancelled", label: "Cancelled" },
];

const URGENCY_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "All Urgency" },
  { key: "routine", label: "Routine" },
  { key: "urgent", label: "Urgent" },
  { key: "stat", label: "STAT" },
];

const STATUS_COLOR: Record<ReferralStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  acknowledged: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  denied: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const URGENCY_COLOR: Record<string, string> = {
  routine: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  urgent: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  stat: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_ICON: Record<ReferralStatus, React.ReactNode> = {
  draft: <FileText className="w-3.5 h-3.5" />,
  sent: <Send className="w-3.5 h-3.5" />,
  acknowledged: <CheckCircle2 className="w-3.5 h-3.5" />,
  scheduled: <CalendarCheck className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  denied: <ShieldX className="w-3.5 h-3.5" />,
};

const STAT_CARDS: { key: keyof ReferralStats; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "draft", label: "Draft", icon: <FileText className="w-4 h-4" />, color: "text-slate-600 dark:text-slate-300" },
  { key: "sent", label: "Sent", icon: <Send className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
  { key: "acknowledged", label: "Acknowledged", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-indigo-600 dark:text-indigo-400" },
  { key: "scheduled", label: "Scheduled", icon: <CalendarCheck className="w-4 h-4" />, color: "text-purple-600 dark:text-purple-400" },
  { key: "completed", label: "Completed", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 dark:text-green-400" },
  { key: "cancelled", label: "Cancelled", icon: <XCircle className="w-4 h-4" />, color: "text-gray-500 dark:text-gray-400" },
  { key: "denied", label: "Denied", icon: <ShieldX className="w-4 h-4" />, color: "text-red-600 dark:text-red-400" },
];

/** Next allowed status transitions */
const WORKFLOW_NEXT: Partial<Record<ReferralStatus, { next: ReferralStatus; label: string; icon: React.ReactNode }>> = {
  draft: { next: "sent", label: "Send", icon: <Send className="w-3.5 h-3.5" /> },
  sent: { next: "acknowledged", label: "Acknowledge", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  acknowledged: { next: "scheduled", label: "Schedule", icon: <CalendarCheck className="w-3.5 h-3.5" /> },
  scheduled: { next: "completed", label: "Complete", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const apiBase = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

function blankReferral(): Referral {
  return {
    patientId: "",
    patientName: "",
    referringProvider: "",
    specialistName: "",
    specialistNpi: "",
    specialty: "",
    facilityName: "",
    facilityAddress: "",
    facilityPhone: "",
    facilityFax: "",
    reason: "",
    clinicalNotes: "",
    urgency: "routine",
    status: "draft",
    referralDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    authorizationNumber: "",
    insuranceName: "",
    insuranceId: "",
    appointmentDate: "",
    appointmentNotes: "",
    followUpNotes: "",
  };
}

function formatDate(d?: string) {
  if (!d) return "--";
  return formatDisplayDate(d) || "--";
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
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

function UrgencyBadge({ urgency }: { urgency: string }) {
  const u = (urgency || "routine").toLowerCase();
  if (u === "stat") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${URGENCY_COLOR.stat}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
        </span>
        STAT
      </span>
    );
  }
  if (u === "urgent") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${URGENCY_COLOR.urgent}`}>
        <Zap className="w-3 h-3" />
        Urgent
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${URGENCY_COLOR.routine}`}>
      Routine
    </span>
  );
}

function StatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[status] || STATUS_COLOR.draft}`}>
      {STATUS_ICON[status]}
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide-over Form Panel                                              */
/* ------------------------------------------------------------------ */

function ReferralFormPanel({
  open,
  onClose,
  referral,
  onSaved,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  referral: Referral | null;
  onSaved: () => void;
  showToast: (t: ToastState) => void;
}) {
  const [form, setForm] = useState<Referral>(blankReferral());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Patient search
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Provider search for Referring Provider
  const [providerList, setProviderList] = useState<{ id: string; label: string }[]>([]);
  const [refProvQuery, setRefProvQuery] = useState("");
  const [refProvResults, setRefProvResults] = useState<{ id: string; label: string }[]>([]);
  const [showRefProvDropdown, setShowRefProvDropdown] = useState(false);

  useEffect(() => {
    if (open) {
      const r = referral ? { ...referral, patientId: String(referral.patientId ?? "") } : blankReferral();
      setForm(r);
      setErrors({});
      setPatientQuery(r.patientName || "");
      setPatientResults([]);
      setShowPatientDropdown(false);
      setRefProvQuery(r.referringProvider || "");
    }
  }, [open, referral]);

  // Fetch providers
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetchWithAuth(`${apiBase()}/api/providers?status=ACTIVE`);
        const json = await res.json();
        const list = json?.data?.content || json?.data || [];
        const mapped = (Array.isArray(list) ? list : []).map((p: any) => {
          const first = p.identification?.firstName || p.firstName || "";
          const last = p.identification?.lastName || p.lastName || "";
          return { id: String(p.id || p.fhirId || ""), label: `${first} ${last}`.trim() || p.name || `Provider #${p.id}` };
        }).filter((p: any) => p.id);
        setProviderList(mapped);
      } catch { /* silent */ }
    })();
  }, [open]);

  // Patient search (debounced)
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return; }
    // Skip search if editing and patient already selected
    if (form.patientId && form.patientName && patientQuery === form.patientName) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`${apiBase()}/api/patients?search=${encodeURIComponent(patientQuery)}`);
        const json = await res.json();
        let list: typeof patientResults = [];
        if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json?.data?.content)) list = json.data.content;
        setPatientResults(list);
        setShowPatientDropdown(list.length > 0);
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  const pName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  const selectPatient = (p: typeof patientResults[0]) => {
    const name = pName(p);
    setForm(prev => ({ ...prev, patientId: p.id, patientName: name }));
    setPatientQuery(name);
    setShowPatientDropdown(false);
  };

  // Filter providers for referring provider
  useEffect(() => {
    if (!refProvQuery.trim()) { setRefProvResults([]); return; }
    const q = refProvQuery.toLowerCase();
    setRefProvResults(providerList.filter(p => p.label.toLowerCase().includes(q)).slice(0, 10));
  }, [refProvQuery, providerList]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const set = (field: keyof Referral, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    // Use String() to safely handle values that may come as numbers from the API
    const s = (v: unknown) => String(v ?? "").trim();
    if (!s(form.patientId)) e.patientId = "Patient ID is required";
    if (!s(form.patientName)) e.patientName = "Patient name is required";
    if (!s(form.reason)) e.reason = "Reason is required";
    if (!s(form.specialistName)) e.specialistName = "Specialist name is required";
    else if (!/^[A-Za-z\s\-'.]+$/.test(s(form.specialistName))) e.specialistName = "Specialist name must contain only letters";
    if (!s(form.facilityName)) e.facilityName = "Facility name is required";
    else if (!/^[A-Za-z0-9\s\-'.,&#()\/]+$/.test(s(form.facilityName))) e.facilityName = "Facility name contains invalid characters";
    else if (!/[A-Za-z]/.test(s(form.facilityName))) e.facilityName = "Facility name must contain at least one letter";
    else if (s(form.facilityName).length < 2) e.facilityName = "Facility name must be at least 2 characters";
    else if (s(form.facilityName).length > 200) e.facilityName = "Facility name must be less than 200 characters";
    if (!s(form.referralDate)) e.referralDate = "Referral date is required";
    if (s(form.facilityPhone) && !isValidUSPhone(String(form.facilityPhone))) e.facilityPhone = "Phone number must be exactly 10 digits";
    if (s(form.facilityFax) && !isValidFax(String(form.facilityFax))) e.facilityFax = "Invalid fax number";
    if (s(form.specialistNpi) && !isValidNpi(String(form.specialistNpi))) e.specialistNpi = "NPI must be exactly 10 digits";
    if (form.expiryDate && form.referralDate && form.expiryDate < form.referralDate) e.expiryDate = "Expiry date must be after referral date";
    if (form.appointmentDate && form.referralDate && form.appointmentDate < form.referralDate) e.appointmentDate = "Appointment date must be after referral date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const base = apiBase();
      const isEdit = !!form.id;
      const url = isEdit ? `${base}/api/referrals/${form.id}` : `${base}/api/referrals`;
      // Add ServiceRequest.intent (required by FHIR R4)
      const payload = { ...form, intent: (form as any).intent || "referral", status: (form as any).status || "active" };
      const res = await fetchWithAuth(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      let json;
      try { json = await res.json(); } catch { json = {}; }
      if (res.ok && json.success !== false) {
        showToast({ type: "success", text: isEdit ? "Referral updated" : "Referral created" });
        onSaved();
        onClose();
      } else {
        const errMsg = json.message || (res.status === 500 ? "Server error — please check that all required fields are filled" : "Failed to save referral");
        showToast({ type: "error", text: errMsg });
      }
    } catch {
      showToast({ type: "error", text: "Network error saving referral" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls = (field?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${field && errors[field] ? "border-red-400 ring-1 ring-red-300" : ""}`;

  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[min(680px,95vw)] bg-white dark:bg-slate-900 shadow-xl flex flex-col animate-slideInFromRight">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {form.id ? "Edit Referral" : "New Referral"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* --- Section: Patient Info --- */}
          <Section title="Patient Information" icon={<User className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelCls}>Patient Name *</label>
                <input className={inputCls("patientName")} value={patientQuery} onChange={(e) => { setPatientQuery(e.target.value); set("patientName", e.target.value); set("patientId", ""); setShowPatientDropdown(true); }} onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)} onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)} placeholder="Search patient by name..." autoComplete="off" />
                {errors.patientName && <p className="text-xs text-red-500 mt-1">{errors.patientName}</p>}
                {showPatientDropdown && patientResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {patientResults.map((p) => (
                      <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                        <span className="font-medium">{pName(p)}</span>
                        <span className="text-xs text-gray-400 ml-2">#{p.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Patient ID <span className="text-red-500">*</span></label>
                <input className={inputCls("patientId")} value={form.patientId} readOnly placeholder="Auto-filled from search" />
                {errors.patientId && <p className="text-xs text-red-500 mt-1">{errors.patientId}</p>}
              </div>
              <div className="relative">
                <label className={labelCls}>Referring Provider</label>
                <input className={inputCls()} value={refProvQuery} onChange={(e) => { setRefProvQuery(e.target.value); set("referringProvider", e.target.value); setShowRefProvDropdown(true); }} onFocus={() => refProvResults.length > 0 && setShowRefProvDropdown(true)} onBlur={() => setTimeout(() => setShowRefProvDropdown(false), 200)} placeholder="Search provider..." autoComplete="off" />
                {showRefProvDropdown && refProvResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {refProvResults.map((p) => (
                      <button key={p.id} type="button" onMouseDown={(e) => { e.preventDefault(); set("referringProvider", p.label); setRefProvQuery(p.label); setShowRefProvDropdown(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Referral Date <span className="text-red-500">*</span></label>
                <DateInput className={inputCls("referralDate")} value={form.referralDate} onChange={(e) => set("referralDate", e.target.value)} />
                {errors.referralDate && <p className="text-xs text-red-500 mt-1">{errors.referralDate}</p>}
              </div>
            </div>
          </Section>

          {/* --- Section: Specialist Info --- */}
          <Section title="Specialist Information" icon={<Stethoscope className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Specialist Name <span className="text-red-500">*</span></label>
                <input className={inputCls("specialistName")} value={form.specialistName} onChange={(e) => set("specialistName", e.target.value)} placeholder="Dr. Johnson" />
                {errors.specialistName && <p className="text-xs text-red-500 mt-1">{errors.specialistName}</p>}
              </div>
              <div>
                <label className={labelCls}>NPI</label>
                <input className={inputCls("specialistNpi")} value={form.specialistNpi} onChange={(e) => set("specialistNpi", e.target.value)} placeholder="1234567890" />
                {errors.specialistNpi && <p className="text-xs text-red-500 mt-1">{errors.specialistNpi}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Specialty</label>
                <select className={inputCls()} value={form.specialty} onChange={(e) => set("specialty", e.target.value)}>
                  <option value="">Select specialty...</option>
                  <option value="Allergy & Immunology">Allergy & Immunology</option>
                  <option value="Anesthesiology">Anesthesiology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Endocrinology">Endocrinology</option>
                  <option value="Family Medicine">Family Medicine</option>
                  <option value="Gastroenterology">Gastroenterology</option>
                  <option value="General Surgery">General Surgery</option>
                  <option value="Geriatrics">Geriatrics</option>
                  <option value="Hematology">Hematology</option>
                  <option value="Infectious Disease">Infectious Disease</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Nephrology">Nephrology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Otolaryngology (ENT)">Otolaryngology (ENT)</option>
                  <option value="Pain Management">Pain Management</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Physical Medicine & Rehabilitation">Physical Medicine & Rehabilitation</option>
                  <option value="Plastic Surgery">Plastic Surgery</option>
                  <option value="Podiatry">Podiatry</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Rheumatology">Rheumatology</option>
                  <option value="Sports Medicine">Sports Medicine</option>
                  <option value="Urology">Urology</option>
                  <option value="Vascular Surgery">Vascular Surgery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </Section>

          {/* --- Section: Facility Info --- */}
          <Section title="Facility Information" icon={<Building2 className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Facility Name <span className="text-red-500">*</span></label>
                <input className={inputCls("facilityName")} value={form.facilityName} onChange={(e) => set("facilityName", e.target.value)} placeholder="City Medical Center" />
                {errors.facilityName && <p className="text-xs text-red-500 mt-1">{errors.facilityName}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <input className={inputCls()} value={form.facilityAddress} onChange={(e) => set("facilityAddress", e.target.value)} placeholder="123 Main St, City, ST 12345" />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls("facilityPhone")} value={form.facilityPhone} onChange={(e) => set("facilityPhone", e.target.value)} placeholder="(555) 123-4567" />
                {errors.facilityPhone && <p className="text-xs text-red-500 mt-1">{errors.facilityPhone}</p>}
              </div>
              <div>
                <label className={labelCls}>Fax</label>
                <input className={inputCls("facilityFax")} value={form.facilityFax} onChange={(e) => set("facilityFax", e.target.value)} placeholder="(555) 123-4568" />
                {errors.facilityFax && <p className="text-xs text-red-500 mt-1">{errors.facilityFax}</p>}
              </div>
            </div>
          </Section>

          {/* --- Section: Insurance --- */}
          <Section title="Insurance / Authorization" icon={<CreditCard className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Insurance Name</label>
                <input className={inputCls()} value={form.insuranceName} onChange={(e) => set("insuranceName", e.target.value)} placeholder="Blue Cross" />
              </div>
              <div>
                <label className={labelCls}>Insurance ID</label>
                <input className={inputCls()} value={form.insuranceId} onChange={(e) => set("insuranceId", e.target.value)} placeholder="INS-12345" />
              </div>
              <div>
                <label className={labelCls}>Authorization Number</label>
                <input className={inputCls()} value={form.authorizationNumber} onChange={(e) => set("authorizationNumber", e.target.value)} placeholder="AUTH-001" />
              </div>
              <div>
                <label className={labelCls}>Expiry Date</label>
                <DateInput className={inputCls("expiryDate")} value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
                {errors.expiryDate && <p className="text-xs text-red-500 mt-1">{errors.expiryDate}</p>}
              </div>
            </div>
          </Section>

          {/* --- Section: Clinical Details --- */}
          <Section title="Clinical Details" icon={<ClipboardList className="w-4 h-4" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Urgency</label>
                  <select className={inputCls()} value={form.urgency} onChange={(e) => set("urgency", e.target.value)}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls()} value={form.status} onChange={(e) => set("status", e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Reason *</label>
                <textarea className={inputCls("reason")} rows={2} value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Reason for referral..." />
                {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
              </div>
              <div>
                <label className={labelCls}>Clinical Notes</label>
                <textarea className={inputCls()} rows={3} value={form.clinicalNotes} onChange={(e) => set("clinicalNotes", e.target.value)} placeholder="Relevant clinical information..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Appointment Date</label>
                  <DateInput className={inputCls("appointmentDate")} value={form.appointmentDate} onChange={(e) => set("appointmentDate", e.target.value)} />
                  {errors.appointmentDate && <p className="text-xs text-red-500 mt-1">{errors.appointmentDate}</p>}
                </div>
              </div>
              <div>
                <label className={labelCls}>Appointment Notes</label>
                <textarea className={inputCls()} rows={2} value={form.appointmentNotes} onChange={(e) => set("appointmentNotes", e.target.value)} placeholder="Appointment scheduling notes..." />
              </div>
              <div>
                <label className={labelCls}>Follow-up Notes</label>
                <textarea className={inputCls()} rows={2} value={form.followUpNotes} onChange={(e) => set("followUpNotes", e.target.value)} placeholder="Follow-up plan..." />
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.id ? "Update" : "Create"} Referral
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-600 dark:text-blue-400">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 p-4">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Dialog                                         */
/* ------------------------------------------------------------------ */

function DeleteDialog({
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
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete Referral</h3>
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
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function ReferralsPage() {
  /* State */
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats>({ draft: 0, sent: 0, acknowledged: 0, scheduled: 0, completed: 0, cancelled: 0, denied: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  /* Filters */
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Panel */
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);

  /* Delete */
  const [deleteTarget, setDeleteTarget] = useState<Referral | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Toast */
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* Status transition loading */
  const [transitioningId, setTransitioningId] = useState<number | null>(null);

  /* ---- API calls ---- */

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const base = apiBase();
      let url = `${base}/api/referrals?page=${page}&size=${pageSize}`;
      if (searchQuery) url = `${base}/api/referrals?q=${encodeURIComponent(searchQuery)}&page=${page}&size=${pageSize}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (res.ok && json.success) {
        // Search returns a plain List; paginated fetch returns a Page object
        const data = json.data;
        const rawItems = Array.isArray(data) ? data : (data.content || []);
        // Resolve fresh patient names to avoid showing stale names after patient updates
        const uniqueIds = [...new Set(rawItems.map((r: any) => r.patientId).filter(Boolean))];
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
        const resolved = rawItems.map((r: any) => ({
          ...r,
          patientName: (r.patientId && nameMap[String(r.patientId)]) ? nameMap[String(r.patientId)] : (r.patientName || ""),
        }));
        if (Array.isArray(data)) {
          setReferrals(resolved);
          setTotalPages(1);
          setTotalElements(resolved.length);
        } else {
          setReferrals(resolved);
          setTotalPages(data.totalPages || 1);
          setTotalElements(data.totalElements || 0);
        }
      } else {
        setReferrals([]);
      }
    } catch {
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/referrals/stats`);
      const json = await res.json();
      if (res.ok && json.success) setStats(json.data);
    } catch {
      /* silent */
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchReferrals();
    fetchStats();
  }, [fetchReferrals, fetchStats]);

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

  /* ---- Filtered data ---- */

  const filtered = useMemo(() => {
    return referrals.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (urgencyFilter !== "all" && r.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [referrals, statusFilter, urgencyFilter]);

  /* ---- Actions ---- */

  const handleStatusTransition = async (referral: Referral, nextStatus: ReferralStatus) => {
    if (!referral.id) return;
    setTransitioningId(referral.id);
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/referrals/${referral.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: `Referral ${nextStatus}` });
        refreshAll();
      } else {
        setToast({ type: "error", text: json.message || "Failed to update status" });
      }
    } catch {
      setToast({ type: "error", text: "Network error" });
    } finally {
      setTransitioningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/referrals/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Referral deleted" });
        setDeleteTarget(null);
        refreshAll();
      } else {
        setToast({ type: "error", text: json.message || "Failed to delete" });
      }
    } catch {
      setToast({ type: "error", text: "Network error" });
    } finally {
      setDeleting(false);
    }
  };

  const openNew = () => {
    setEditingReferral(null);
    setPanelOpen(true);
  };

  const openEdit = (r: Referral) => {
    setEditingReferral(r);
    setPanelOpen(true);
  };

  /* ---- Compute active status tab count ---- */
  const totalAll = stats.draft + stats.sent + stats.acknowledged + stats.scheduled + stats.completed + stats.cancelled + stats.denied;

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* ---------- Stats Row ---------- */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {STAT_CARDS.map((sc) => (
            <div
              key={sc.key}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition"
              onClick={() => setStatusFilter(statusFilter === sc.key ? "all" : sc.key)}
            >
              <div className={`flex-shrink-0 ${sc.color}`}>{sc.icon}</div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{stats[sc.key]}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{sc.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Toolbar ---------- */}
        <div className="shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 mb-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              const count = tab.key === "all" ? totalAll : stats[tab.key as keyof ReferralStats] || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key as ReferralStatus | "all"); setPage(0); }}
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

          {/* Search + Filters + New button */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-slate-800">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Search by patient, specialist, reason..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
              {searchDraft && (
                <button onClick={() => setSearchDraft("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={urgencyFilter}
                onChange={(e) => { setUrgencyFilter(e.target.value); setPage(0); }}
              >
                {URGENCY_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex-shrink-0 ml-auto">
              <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm">
                <Plus className="w-4 h-4" />
                New Referral
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Table ---------- */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Urgency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Specialist / Specialty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Facility</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Referral Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Loading referrals...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No referrals found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {searchQuery || statusFilter !== "all" || urgencyFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Create your first referral to get started"}
                      </p>
                      {!searchQuery && statusFilter === "all" && urgencyFilter === "all" && (
                        <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                          <Plus className="w-4 h-4" />
                          New Referral
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const workflow = WORKFLOW_NEXT[r.status];
                    const isTransitioning = transitioningId === r.id;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3">
                          <UrgencyBadge urgency={r.urgency} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{r.patientName || "--"}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{r.patientId || ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-gray-100">{r.specialistName || "--"}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{r.specialty || ""}</div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="text-gray-700 dark:text-gray-300 truncate max-w-[180px]">{r.facilityName || "--"}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{r.reason || "--"}</div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(r.referralDate)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Workflow transition button */}
                            {workflow && (
                              <button
                                onClick={() => handleStatusTransition(r, workflow.next)}
                                disabled={isTransitioning}
                                title={workflow.label}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition disabled:opacity-50"
                              >
                                {isTransitioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : workflow.icon}
                                <span className="hidden xl:inline">{workflow.label}</span>
                              </button>
                            )}

                            {/* Cancel button for non-terminal statuses */}
                            {!["completed", "cancelled", "denied"].includes(r.status) && (
                              <button
                                onClick={() => handleStatusTransition(r, "cancelled")}
                                disabled={isTransitioning}
                                title="Cancel"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => openEdit(r)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteTarget(r)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ---------- Pagination ---------- */}
          {!loading && filtered.length > 0 && (
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing {page * pageSize + 1}--{Math.min((page + 1) * pageSize, totalElements)} of {totalElements} referrals
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                        pageNum === page
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Slide-over Form Panel ---------- */}
        <ReferralFormPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          referral={editingReferral}
          onSaved={refreshAll}
          showToast={setToast}
        />

        {/* ---------- Delete Dialog ---------- */}
        <DeleteDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}
