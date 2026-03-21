"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Pill, User, Building2, FileText, Loader2, Stethoscope } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { Prescription, ToastState } from "./types";
import DrugInteractionCheck from "./DrugInteractionCheck";
import DatePicker from "@/components/form/date-picker";
import { usePermissions } from "@/context/PermissionContext";

function blankPrescription(): Prescription {
  return {
    patientId: "",
    patientName: "",
    encounterId: "",
    prescriberName: "",
    prescriberNpi: "",
    medicationName: "",
    medicationCode: "",
    medicationSystem: "NDC",
    strength: "",
    dosageForm: "tablet",
    sig: "",
    quantity: undefined,
    quantityUnit: "each",
    daysSupply: undefined,
    refills: 0,
    refillsRemaining: 0,
    pharmacyName: "",
    pharmacyPhone: "",
    pharmacyAddress: "",
    status: "active",
    priority: "routine",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    notes: "",
    deaSchedule: "",
  };
}

const DOSAGE_FORMS = [
  "tablet", "capsule", "solution", "injection", "cream",
  "ointment", "patch", "inhaler", "drops", "suppository", "other",
];

const PRIORITY_OPTIONS = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "stat", label: "STAT" },
];

const DEA_SCHEDULE_OPTIONS = [
  { value: "", label: "None" },
  { value: "II", label: "Schedule II" },
  { value: "III", label: "Schedule III" },
  { value: "IV", label: "Schedule IV" },
  { value: "V", label: "Schedule V" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  prescription: Prescription | null;
  onSaved: () => void;
  showToast: (t: ToastState) => void;
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

export default function PrescriptionFormPanel({ open, onClose, prescription, onSaved, showToast }: Props) {
  const { hasCategoryWrite } = usePermissions();
  const canWriteRx = hasCategoryWrite("rx");
  const [form, setForm] = useState<Prescription>(blankPrescription());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refillsInput, setRefillsInput] = useState<string>("0");

  /* Patient search state */
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientDropdownStyle, setPatientDropdownStyle] = useState<React.CSSProperties>({});
  const patientInputRef = useRef<HTMLDivElement>(null);
  const skipPatientSearchRef = useRef(false);

  /* Prescriber search state */
  const [prescriberQuery, setPrescriberQuery] = useState("");
  const [prescriberResults, setPrescriberResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string; npi?: string }[]>([]);
  const [showPrescriberDropdown, setShowPrescriberDropdown] = useState(false);
  const [prescriberDropdownStyle, setPrescriberDropdownStyle] = useState<React.CSSProperties>({});
  const prescriberInputRef = useRef<HTMLDivElement>(null);
  const skipPrescriberSearchRef = useRef(false);

  useEffect(() => {
    if (open) {
      const p = prescription ? { ...prescription } : blankPrescription();
      setForm(p);
      setErrors({});
      skipPatientSearchRef.current = true; // suppress the search triggered by the patientQuery change below
      setPatientQuery(p.patientName || "");
      setPatientResults([]);
      setShowPatientDropdown(false);
      skipPrescriberSearchRef.current = true;
      setPrescriberQuery(p.prescriberName || "");
      setPrescriberResults([]);
      setShowPrescriberDropdown(false);
      setRefillsInput(p.refills != null ? String(p.refills) : "0");
    }
  }, [open, prescription]);

  /* Update dropdown position when shown */
  useEffect(() => {
    if (showPatientDropdown && patientInputRef.current) {
      const rect = patientInputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min(192, patientResults.length * 44);
      if (spaceBelow < dropHeight && rect.top > dropHeight) {
        setPatientDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 });
      } else {
        setPatientDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
      }
    }
  }, [showPatientDropdown, patientResults.length]);

  /* Patient search function — shared by effect and onFocus */
  const runPatientSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setPatientResults([]); return; }
    try {
      const res = await fetchWithAuth(`/api/patients?search=${encodeURIComponent(q)}&size=20`);
      if (!res.ok) return;
      const json = await res.json();
      let list: typeof patientResults = [];
      if (Array.isArray(json?.data?.content)) list = json.data.content;
      else if (Array.isArray(json?.data)) list = json.data;
      else if (Array.isArray(json?.content)) list = json.content;
      else if (Array.isArray(json)) list = json;
      setPatientResults(list);
      setShowPatientDropdown(list.length > 0);
    } catch { /* silent */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Debounced patient search */
  useEffect(() => {
    if (skipPatientSearchRef.current) { skipPatientSearchRef.current = false; return; }
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(() => runPatientSearch(patientQuery), 300);
    return () => clearTimeout(t);
  }, [patientQuery, runPatientSearch]);

  /* Update prescriber dropdown position when shown */
  useEffect(() => {
    if (showPrescriberDropdown && prescriberInputRef.current) {
      const rect = prescriberInputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min(192, prescriberResults.length * 44);
      if (spaceBelow < dropHeight && rect.top > dropHeight) {
        setPrescriberDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 });
      } else {
        setPrescriberDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
      }
    }
  }, [showPrescriberDropdown, prescriberResults.length]);

  /* Debounced prescriber search */
  useEffect(() => {
    if (skipPrescriberSearchRef.current) { skipPrescriberSearchRef.current = false; return; }
    if (!prescriberQuery.trim() || prescriberQuery.length < 2) { setPrescriberResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/providers?status=ACTIVE&search=${encodeURIComponent(prescriberQuery)}`);
        if (!res.ok) return;
        const json = await res.json();
        let list: typeof prescriberResults = [];
        if (Array.isArray(json?.data?.content)) list = json.data.content;
        else if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json?.content)) list = json.content;
        else if (Array.isArray(json)) list = json;
        setPrescriberResults(list);
        setShowPrescriberDropdown(list.length > 0);
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [prescriberQuery]);

  const prescriberName = (p: typeof prescriberResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  const selectPrescriber = (p: typeof prescriberResults[0]) => {
    const name = prescriberName(p);
    setForm((prev) => ({ ...prev, prescriberName: name, prescriberNpi: p.npi || prev.prescriberNpi || "" }));
    skipPrescriberSearchRef.current = true;
    setPrescriberQuery(name);
    setShowPrescriberDropdown(false);
  };

  const pName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  const selectPatient = (p: typeof patientResults[0]) => {
    const name = pName(p);
    setForm((prev) => ({ ...prev, patientId: p.id, patientName: name }));
    skipPatientSearchRef.current = true;
    setPatientQuery(name);
    setShowPatientDropdown(false);
  };

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

  const set = (field: keyof Prescription, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.patientName.trim()) e.patientName = "Patient name is required";
    else if (!String(form.patientId || "").trim()) e.patientName = "Please select a patient from the search results";
    else if (!/^[A-Za-z\s\-'.]+$/.test(form.patientName.trim())) e.patientName = "Patient name must contain only letters, spaces, hyphens, apostrophes, or periods";
    if (!form.medicationName.trim()) e.medicationName = "Medication name is required";
    else if (!/[a-zA-Z]/.test(form.medicationName.trim())) e.medicationName = "Medication name must contain at least one letter";
    else if (!/^[A-Za-z0-9\s\-.'()\/&+%,]+$/.test(form.medicationName.trim())) e.medicationName = "Medication name must contain only alphanumeric characters and standard punctuation";
    if (!form.sig.trim()) e.sig = "SIG directions are required";
    if (form.prescriberName && !/^[A-Za-z\s\-'.]+$/.test(form.prescriberName.trim())) e.prescriberName = "Prescriber name must contain only letters";
    if (form.pharmacyName && !/^[A-Za-z0-9\s\-'.,&#]+$/.test(form.pharmacyName.trim())) e.pharmacyName = "Pharmacy name contains invalid characters";
    if (form.pharmacyPhone && !/^[+]?[\d\s().\-]{7,20}$/.test(form.pharmacyPhone.trim())) e.pharmacyPhone = "Enter a valid phone number";
    if (form.prescriberNpi && !/^\d{10}$/.test(form.prescriberNpi.trim())) e.prescriberNpi = "NPI must be exactly 10 digits";
    if (form.medicationCode && form.medicationSystem === "NDC" && !/^(\d{5}-\d{4}-\d{2}|\d{11}|\d{4}-\d{4}-\d{2}|\d{5}-\d{3}-\d{2})$/.test(form.medicationCode.trim())) e.medicationCode = "Invalid NDC code format";
    if (form.pharmacyAddress && form.pharmacyAddress.trim().length < 5) e.pharmacyAddress = "Enter a valid address (at least 5 characters)";
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = "End date must be on or after start date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit
        ? `/api/prescriptions/${form.id}`
        : `/api/prescriptions`;
      // Add MedicationRequest.intent (required by FHIR R4)
      const payload = { ...form, intent: (form as any).intent || "order", status: form.status || "active" };
      const res = await fetchWithAuth(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        showToast({ type: "success", text: isEdit ? "Prescription updated" : "Prescription created" });
        onSaved();
        onClose();
      } else {
        // Show user-friendly message instead of raw backend JSON errors
        let errorMsg = "Failed to save prescription";
        if (json?.message && !json.message.includes("JSON parse error") && !json.message.includes("Cannot deserialize") && !json.message.includes("Unexpected")) {
          errorMsg = json.message;
        } else if (json?.message) {
          errorMsg = "Invalid data entered. Please check your input and try again.";
        }
        showToast({ type: "error", text: errorMsg });
      }
    } catch {
      showToast({ type: "error", text: "Network error saving prescription" });
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
            {form.id ? "Edit Prescription" : "New Prescription"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Patient Info */}
          <Section title="Patient Information" icon={<User className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative" ref={patientInputRef}>
                <label className={labelCls}>Patient Name *</label>
                <input
                  className={inputCls("patientName")}
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    set("patientName", e.target.value);
                    set("patientId", "");
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => {
                    if (patientResults.length > 0) {
                      setShowPatientDropdown(true);
                    } else if (patientQuery.trim().length >= 2) {
                      // Re-trigger search if field has text but results were cleared (e.g. after blur)
                      runPatientSearch(patientQuery);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
                  placeholder="Search patient by name..."
                  autoComplete="off"
                />
                {errors.patientName && <p className="text-xs text-red-500 mt-1">{errors.patientName}</p>}
                {showPatientDropdown && patientResults.length > 0 && (
                  <div style={patientDropdownStyle} className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectPatient(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                      >
                        <span className="font-medium">{pName(p)}</span>
                        <span className="text-xs text-gray-400 ml-2">#{p.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Patient ID</label>
                <input className={inputCls()} value={form.patientId} readOnly placeholder="Auto-filled from search" />
              </div>
            </div>
          </Section>

          {/* Prescriber Info */}
          <Section title="Prescriber Information" icon={<Stethoscope className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative" ref={prescriberInputRef}>
                <label className={labelCls}>Prescriber Name</label>
                <input
                  className={inputCls("prescriberName")}
                  value={prescriberQuery}
                  onChange={(e) => {
                    setPrescriberQuery(e.target.value);
                    set("prescriberName", e.target.value);
                    setShowPrescriberDropdown(true);
                  }}
                  onFocus={() => prescriberResults.length > 0 && setShowPrescriberDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPrescriberDropdown(false), 150)}
                  placeholder="Search provider by name..."
                  autoComplete="off"
                />
                {errors.prescriberName && <p className="text-xs text-red-500 mt-1">{errors.prescriberName}</p>}
                {showPrescriberDropdown && prescriberResults.length > 0 && (
                  <div style={prescriberDropdownStyle} className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {prescriberResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectPrescriber(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                      >
                        <span className="font-medium">{prescriberName(p)}</span>
                        {p.npi && <span className="text-xs text-gray-400 ml-2">NPI: {p.npi}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Prescriber NPI</label>
                <input className={inputCls("prescriberNpi")} value={form.prescriberNpi || ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); set("prescriberNpi", v); }} placeholder="1234567890" />
                {errors.prescriberNpi && <p className="text-xs text-red-500 mt-1">{errors.prescriberNpi}</p>}
              </div>
            </div>
          </Section>

          {/* Medication Info */}
          <Section title="Medication Details" icon={<Pill className="w-4 h-4" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Medication Name *</label>
                  <input className={inputCls("medicationName")} value={form.medicationName} onChange={(e) => set("medicationName", e.target.value)} placeholder="Amoxicillin" />
                  {errors.medicationName && <p className="text-xs text-red-500 mt-1">{errors.medicationName}</p>}
                </div>
                <div>
                  <label className={labelCls}>Medication Code</label>
                  <input className={inputCls("medicationCode")} value={form.medicationCode || ""} onChange={(e) => set("medicationCode", e.target.value)} placeholder="0781-1764-01" />
                  {errors.medicationCode && <p className="text-xs text-red-500 mt-1">{errors.medicationCode}</p>}
                </div>
                <div>
                  <label className={labelCls}>Code System</label>
                  <select className={inputCls()} value={form.medicationSystem || "NDC"} onChange={(e) => set("medicationSystem", e.target.value)}>
                    <option value="NDC">NDC</option>
                    <option value="RxNorm">RxNorm</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Strength</label>
                  <input className={inputCls()} value={form.strength || ""} onChange={(e) => set("strength", e.target.value)} placeholder="500mg" />
                </div>
                <div>
                  <label className={labelCls}>Dosage Form</label>
                  <select className={inputCls()} value={form.dosageForm || "tablet"} onChange={(e) => set("dosageForm", e.target.value)}>
                    {DOSAGE_FORMS.map((df) => (
                      <option key={df} value={df}>{df.charAt(0).toUpperCase() + df.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drug Interaction Check */}
              <DrugInteractionCheck medicationName={form.medicationName} />
            </div>
          </Section>

          {/* SIG and Dispensing */}
          <Section title="Directions & Dispensing" icon={<FileText className="w-4 h-4" />}>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>SIG (Directions) *</label>
                <textarea className={inputCls("sig")} rows={2} value={form.sig} onChange={(e) => set("sig", e.target.value)} placeholder="Take 1 tablet by mouth twice daily" />
                {errors.sig && <p className="text-xs text-red-500 mt-1">{errors.sig}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input type="number" className={inputCls()} value={form.quantity ?? ""} onChange={(e) => set("quantity", e.target.value ? Number(e.target.value) : undefined)} placeholder="30" />
                </div>
                <div>
                  <label className={labelCls}>Quantity Unit</label>
                  <input className={inputCls()} value={form.quantityUnit || ""} onChange={(e) => set("quantityUnit", e.target.value)} placeholder="each" />
                </div>
                <div>
                  <label className={labelCls}>Days Supply</label>
                  <input type="number" className={inputCls()} value={form.daysSupply ?? ""} onChange={(e) => set("daysSupply", e.target.value ? Number(e.target.value) : undefined)} placeholder="30" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Refills</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls()}
                    value={refillsInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRefillsInput(v);
                      if (v === "") {
                        // Keep form refills as 0 but let input show empty while typing
                        set("refills", 0);
                      } else {
                        const n = parseInt(v, 10);
                        if (!isNaN(n) && n >= 0) set("refills", n);
                      }
                    }}
                    onBlur={(e) => {
                      // On blur, normalize empty to "0"
                      if (e.target.value === "") setRefillsInput("0");
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select className={inputCls()} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>DEA Schedule</label>
                  <select className={inputCls()} value={form.deaSchedule || ""} onChange={(e) => set("deaSchedule", e.target.value)}>
                    {DEA_SCHEDULE_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Section>

          {/* Pharmacy */}
          <Section title="Pharmacy Information" icon={<Building2 className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Pharmacy Name</label>
                <input className={inputCls("pharmacyName")} value={form.pharmacyName || ""} onChange={(e) => set("pharmacyName", e.target.value)} placeholder="CVS Pharmacy" />
                {errors.pharmacyName && <p className="text-xs text-red-500 mt-1">{errors.pharmacyName}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" className={inputCls("pharmacyPhone")} value={form.pharmacyPhone || ""} onChange={(e) => set("pharmacyPhone", e.target.value)} placeholder="(555) 123-4567" pattern="[+]?[\d\s().\-]{7,20}" title="Enter a valid phone number" />
                {errors.pharmacyPhone && <p className="text-xs text-red-500 mt-1">{errors.pharmacyPhone}</p>}
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input className={inputCls("pharmacyAddress")} value={form.pharmacyAddress || ""} onChange={(e) => set("pharmacyAddress", e.target.value)} placeholder="123 Main St, City, ST 12345" />
                {errors.pharmacyAddress && <p className="text-xs text-red-500 mt-1">{errors.pharmacyAddress}</p>}
              </div>
            </div>
          </Section>

          {/* Status & Dates & Notes */}
          <Section title="Status, Dates & Notes" icon={<FileText className="w-4 h-4" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls()} value={form.status} onChange={(e) => set("status", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="discontinued">Discontinued</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePicker
                  id="rx-start-date"
                  label="Start Date"
                  mode="single"
                  defaultDate={form.startDate || undefined}
                  placeholder="Select start date"
                  onChange={(dates) => {
                    if (dates.length > 0) {
                      const d = dates[0];
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, "0");
                      const dd = String(d.getDate()).padStart(2, "0");
                      set("startDate", `${yyyy}-${mm}-${dd}`);
                    } else {
                      set("startDate", "");
                    }
                  }}
                />
                <div>
                  <DatePicker
                    id="rx-end-date"
                    label="End Date"
                    mode="single"
                    defaultDate={form.endDate || undefined}
                    placeholder="Select end date"
                    onChange={(dates) => {
                      if (dates.length > 0) {
                        const d = dates[0];
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, "0");
                        const dd = String(d.getDate()).padStart(2, "0");
                        set("endDate", `${yyyy}-${mm}-${dd}`);
                      } else {
                        set("endDate", "");
                      }
                    }}
                  />
                  {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                </div>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea className={inputCls()} rows={3} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes..." />
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canWriteRx}
            title={!canWriteRx ? "You don't have permission to create or edit prescriptions" : undefined}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.id ? "Update" : "Create"} Prescription
          </button>
        </div>
      </div>
    </div>
  );
}
