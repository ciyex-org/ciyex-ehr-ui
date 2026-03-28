"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Pill, User, Building2, FileText, Loader2, Stethoscope } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Prescription, ToastState } from "./types";
import DrugInteractionCheck from "./DrugInteractionCheck";
import DateInput from "@/components/ui/DateInput";
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

/* ── helpers (module-level, no component state) ── */
function parseProviderList(json: any): any[] {
  if (Array.isArray(json?.data?.content)) return json.data.content;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.content)) return json.content;
  if (Array.isArray(json)) return json;
  return [];
}
function resolveProviderName(p: any): string {
  if (p.fullName && typeof p.fullName === "string" && p.fullName.trim()) return p.fullName.trim();
  if (p.name && typeof p.name === "string" && p.name.trim()) return p.name.trim();
  if (p.displayName && typeof p.displayName === "string" && p.displayName.trim()) return p.displayName.trim();
  if (p.providerName && typeof p.providerName === "string" && p.providerName.trim()) return p.providerName.trim();
  if (p.fullProviderName && typeof p.fullProviderName === "string" && p.fullProviderName.trim()) return p.fullProviderName.trim();
  if (p.providerDisplayName && typeof p.providerDisplayName === "string" && p.providerDisplayName.trim()) return p.providerDisplayName.trim();
  const ident = p.identification || {};
  const first = String(p.firstName || p["identification.firstName"] || ident.firstName || p.providerFirstName || "").trim();
  const last  = String(p.lastName  || p["identification.lastName"]  || ident.lastName  || p.providerLastName  || "").trim();
  const built = `${first} ${last}`.trim();
  if (built) return built;
  return String(p.id || p.fhirId || "");
}
function resolveProviderNpi(p: any): string {
  const ident = p.identification || {};
  return String(p.npi || p["identification.npi"] || ident.npi || p.providerNpi || "");
}

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
  const { canWriteResource } = usePermissions();
  const canWriteRx = canWriteResource("MedicationRequest");
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

  /* Pharmacy search state */
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [pharmacyResults, setPharmacyResults] = useState<{ id?: string; name: string; phone?: string; address?: string }[]>([]);
  const [showPharmacyDropdown, setShowPharmacyDropdown] = useState(false);

  /* Prescriber search state */
  const [prescriberQuery, setPrescriberQuery] = useState("");
  const [prescriberResults, setPrescriberResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string; npi?: string }[]>([]);
  const [showPrescriberDropdown, setShowPrescriberDropdown] = useState(false);
  const [prescriberDropdownStyle, setPrescriberDropdownStyle] = useState<React.CSSProperties>({});
  const [prescriberSearching, setPrescriberSearching] = useState(false);
  const prescriberInputRef = useRef<HTMLDivElement>(null);
  const skipPrescriberSearchRef = useRef(false);

  useEffect(() => {
    if (open) {
      const p = prescription ? { ...prescription } : blankPrescription();
      setForm(p);
      setErrors({});
      // Only set skip flag if there's an actual value to suppress searching on
      skipPatientSearchRef.current = !!(p.patientName);
      setPatientQuery(p.patientName || "");
      setPatientResults([]);
      setShowPatientDropdown(false);
      setPharmacyQuery(p.pharmacyName || "");
      setPharmacyResults([]);
      setShowPharmacyDropdown(false);
      skipPrescriberSearchRef.current = !!(p.prescriberName);
      setPrescriberQuery(p.prescriberName || "");
      setPrescriberResults([]);
      setShowPrescriberDropdown(false);
      setRefillsInput(p.refills != null ? String(p.refills) : "0");
    }
  }, [open, prescription]);

  /* Pre-load provider list when form opens so dropdown is instant on first click */
  useEffect(() => {
    if (open) runPrescriberSearch("");
  }, [open, runPrescriberSearch]);

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
      const res = await fetchWithAuth(`${(getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "")}/api/patients?search=${encodeURIComponent(q)}&size=20`);
      if (!res.ok) return;
      const json = await res.json();
      let list: any[] = [];
      if (Array.isArray(json?.data?.content)) list = json.data.content;
      else if (Array.isArray(json?.data)) list = json.data;
      else if (Array.isArray(json?.content)) list = json.content;
      else if (Array.isArray(json)) list = json;
      // Ensure each item has an id
      list = list.filter(p => p && (p.id || p.fhirId));
      list.forEach(p => { if (!p.id && p.fhirId) p.id = p.fhirId; });
      setPatientResults(list);
      setShowPatientDropdown(list.length > 0);
    } catch (err) { console.error("Patient search failed:", err); }
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

  /* Prescriber search — mirrors runPatientSearch pattern */
  const runPrescriberSearch = useCallback(async (q: string) => {
    const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
    setPrescriberSearching(true);
    try {
      let list: any[] = [];

      // 1. Server-side search when query is non-empty
      if (q.trim().length >= 1) {
        const res = await fetchWithAuth(`${base}/api/providers?search=${encodeURIComponent(q)}&page=0&size=100`);
        if (res.ok) list = parseProviderList(await res.json());
      }

      // 2. Fetch full list when query is empty OR server search returned nothing
      if (list.length === 0) {
        const allRes = await fetchWithAuth(`${base}/api/providers?page=0&size=1000`);
        if (allRes.ok) list = parseProviderList(await allRes.json());

        // 3. FHIR fallback — covers role-filtered cases where /api/providers returns only self
        if (list.length <= 1) {
          try {
            const fb = await fetchWithAuth(`${base}/api/fhir-resource/providers?size=100`);
            if (fb.ok) {
              const fbList = parseProviderList(await fb.json());
              if (fbList.length > list.length) list = fbList;
            }
          } catch { /* ignore */ }
        }

        // 4. Client-side filter when user has typed something
        if (q.trim().length >= 1) {
          const ql = q.toLowerCase();
          list = list.filter((p: any) => {
            const ident = p.identification || {};
            const first = String(p.firstName || p["identification.firstName"] || ident.firstName || p.providerFirstName || "").toLowerCase();
            const last  = String(p.lastName  || p["identification.lastName"]  || ident.lastName  || p.providerLastName  || "").toLowerCase();
            const full  = String(p.fullName  || p.name || p.displayName || p.providerName || p.fullProviderName || p.providerDisplayName || "").toLowerCase();
            const npi   = String(p.npi || p["identification.npi"] || ident.npi || p.providerNpi || "").toLowerCase();
            const built = full || `${first} ${last}`.trim();
            return built.includes(ql) || first.includes(ql) || last.includes(ql) || npi.includes(ql);
          });
        }
      }

      // Normalise id field
      list = list.filter((p: any) => p && (p.id || p.fhirId));
      list.forEach((p: any) => { if (!p.id && p.fhirId) p.id = String(p.fhirId); });

      setPrescriberResults(list);
      setShowPrescriberDropdown(list.length > 0);
    } catch { /* silent */ } finally {
      setPrescriberSearching(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Debounced prescriber search */
  useEffect(() => {
    if (skipPrescriberSearchRef.current) { skipPrescriberSearchRef.current = false; return; }
    if (!prescriberQuery.trim()) {
      // Don't clear results for empty query — keep preloaded provider list visible on focus
      setShowPrescriberDropdown(false);
      return;
    }
    const t = setTimeout(() => runPrescriberSearch(prescriberQuery), 250);
    return () => clearTimeout(t);
  }, [prescriberQuery, runPrescriberSearch]);

  /* Debounced pharmacy search */
  useEffect(() => {
    if (!pharmacyQuery.trim() || pharmacyQuery.length < 2) { setPharmacyResults([]); setShowPharmacyDropdown(false); return; }
    const t = setTimeout(async () => {
      const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
      try {
        const res = await fetchWithAuth(`${base}/api/pharmacies?search=${encodeURIComponent(pharmacyQuery)}&size=20`);
        if (res.ok) {
          const json = await res.json();
          let list: any[] = [];
          if (Array.isArray(json?.data?.content)) list = json.data.content;
          else if (Array.isArray(json?.data)) list = json.data;
          else if (Array.isArray(json?.content)) list = json.content;
          else if (Array.isArray(json)) list = json;
          setPharmacyResults(list.map((p: any) => ({ id: p.id, name: p.name || p.pharmacyName || "", phone: p.phone || p.phoneNumber || "", address: p.address || p.streetAddress || "" })));
          setShowPharmacyDropdown(list.length > 0);
        }
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [pharmacyQuery]);

  const selectPharmacy = (p: { name: string; phone?: string; address?: string }) => {
    setForm((prev) => ({ ...prev, pharmacyName: p.name, pharmacyPhone: p.phone || prev.pharmacyPhone || "", pharmacyAddress: p.address || prev.pharmacyAddress || "" }));
    setPharmacyQuery(p.name);
    setShowPharmacyDropdown(false);
  };

  const selectPrescriber = (p: any) => {
    const name = resolveProviderName(p);
    const npi  = resolveProviderNpi(p);
    setForm((prev) => ({ ...prev, prescriberName: name, prescriberNpi: npi || prev.prescriberNpi || "" }));
    skipPrescriberSearchRef.current = true;
    setPrescriberQuery(name);
    setShowPrescriberDropdown(false);
  };

  const pName = (p: any) => {
    // Try all possible patient name field structures
    if (p.fullName) return p.fullName;
    if (p.name && typeof p.name === "string") return p.name;
    // Try top-level firstName/lastName
    const first = p.firstName || p.first_name || "";
    const last = p.lastName || p.last_name || "";
    if (first || last) return `${first} ${last}`.trim();
    // Try nested identification object (FHIR-style)
    const ident = p.identification || p.name_obj || {};
    if (ident.firstName || ident.lastName) return `${ident.firstName || ""} ${ident.lastName || ""}`.trim();
    // Try FHIR HumanName array
    if (Array.isArray(p.name)) {
      const hn = p.name[0];
      if (hn?.text) return hn.text;
      if (hn?.given || hn?.family) return `${(hn.given || []).join(" ")} ${hn.family || ""}`.trim();
    }
    // Fallback to display or patientDisplay
    return p.display || p.patientDisplay || String(p.id || "Unknown");
  };

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
      const apiBase = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
      const url = isEdit
        ? `${apiBase}/api/prescriptions/${form.id}`
        : `${apiBase}/api/prescriptions`;
      // Add MedicationRequest.intent (required by FHIR R4)
      // On create, set refillsRemaining equal to refills so new prescriptions start with full refill count
      const refillsRemaining = isEdit ? (form.refillsRemaining ?? form.refills ?? 0) : (form.refills ?? 0);
      const payload = { ...form, intent: (form as any).intent || "order", status: form.status || "active", refillsRemaining };
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
                  <div className="absolute left-0 right-0 top-full mt-1 z-[9999] max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
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
                <div className="relative">
                  <input
                    className={inputCls("prescriberName")}
                    value={prescriberQuery}
                    onChange={(e) => {
                      setPrescriberQuery(e.target.value);
                      set("prescriberName", e.target.value);
                      set("prescriberNpi", "");
                      setShowPrescriberDropdown(true);
                    }}
                    onFocus={() => {
                      if (prescriberResults.length > 0) { setShowPrescriberDropdown(true); return; }
                      // Always trigger search on focus — fetch all providers if query is empty
                      runPrescriberSearch(prescriberQuery || "");
                    }}
                    onBlur={() => setTimeout(() => setShowPrescriberDropdown(false), 200)}
                    placeholder="Type to search provider..."
                    autoComplete="off"
                  />
                  {prescriberSearching && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </span>
                  )}
                </div>
                {errors.prescriberName && <p className="text-xs text-red-500 mt-1">{errors.prescriberName}</p>}
                {showPrescriberDropdown && prescriberResults.length > 0 && (
                  <div
                    className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg"
                    style={prescriberDropdownStyle.position ? prescriberDropdownStyle : { position: "absolute" as const, top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 9999 }}
                  >
                    {prescriberResults.map((p) => {
                      const name = resolveProviderName(p);
                      const npi = resolveProviderNpi(p);
                      if (!name && !npi) return null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectPrescriber(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                        >
                          <span className="font-medium">{name || `Provider ${p.id}`}</span>
                          {npi && <span className="text-xs text-gray-400 ml-2">NPI: {npi}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Prescriber NPI <span className="text-gray-400 font-normal">(auto-filled on selection)</span></label>
                <input className={inputCls("prescriberNpi")} value={form.prescriberNpi || ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); set("prescriberNpi", v); }} placeholder="Auto-filled from provider search" />
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
              <div className="sm:col-span-2 relative">
                <label className={labelCls}>Pharmacy Name</label>
                <input
                  className={inputCls("pharmacyName")}
                  value={pharmacyQuery}
                  onChange={(e) => { setPharmacyQuery(e.target.value); set("pharmacyName", e.target.value); }}
                  onFocus={() => { if (pharmacyResults.length > 0) setShowPharmacyDropdown(true); }}
                  placeholder="Search pharmacy..."
                  autoComplete="off"
                />
                {showPharmacyDropdown && pharmacyResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
                    {pharmacyResults.map((p, i) => (
                      <button key={p.id || i} type="button" onClick={() => selectPharmacy(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 cursor-pointer">
                        <div className="font-medium">{p.name}</div>
                        {(p.phone || p.address) && <div className="text-xs text-gray-400">{[p.phone, p.address].filter(Boolean).join(" · ")}</div>}
                      </button>
                    ))}
                  </div>
                )}
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <DateInput
                    value={form.startDate || ""}
                    onChange={(e) => set("startDate", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <DateInput
                    value={form.endDate || ""}
                    min={form.startDate || undefined}
                    onChange={(e) => set("endDate", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
