"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { X, Loader2, Search, Send, BookOpen } from "lucide-react";
import { EducationMaterial, CATEGORY_COLORS, categoryLabel } from "./types";
import DateInput from "@/components/ui/DateInput";

interface Props {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  preselectedMaterial?: EducationMaterial | null;
}

export default function AssignMaterialModal({
  open,
  onClose,
  onAssigned,
  preselectedMaterial,
}: Props) {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [selectedMaterial, setSelectedMaterial] = useState<EducationMaterial | null>(null);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialResults, setMaterialResults] = useState<EducationMaterial[]>([]);
  const [searchingMaterials, setSearchingMaterials] = useState(false);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedBy, setAssignedBy] = useState("");
  const [providerResults, setProviderResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string; identification?: { firstName?: string; lastName?: string }; 'identification.firstName'?: string; 'identification.lastName'?: string }[]>([]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const providerSearchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});


  const getPatientDisplayName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  // Patient search
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return; }
    if (patientSearchTimer.current) clearTimeout(patientSearchTimer.current);
    patientSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/patients?search=${encodeURIComponent(patientQuery)}`);
        if (!res.ok) return;
        const json = await res.json();
        let list: typeof patientResults = [];
        if (Array.isArray(json?.data?.content)) list = json.data.content;
        else if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json)) list = json;
        setPatientResults(list);
        setShowPatientDropdown(true);
      } catch { /* silent */ }
    }, 300);
  }, [patientQuery]);

  const getProviderDisplayName = (p: typeof providerResults[0]) => {
    const firstName = p.identification?.firstName || p['identification.firstName'] || p.firstName || '';
    const lastName = p.identification?.lastName || p['identification.lastName'] || p.lastName || '';
    return p.fullName || p.name || `${firstName} ${lastName}`.trim() || p.id;
  };

  // Provider search for "Assigned By"
  useEffect(() => {
    if (!assignedBy.trim() || assignedBy.length < 2) { setProviderResults([]); setShowProviderDropdown(false); return; }
    if (providerSearchTimer.current) clearTimeout(providerSearchTimer.current);
    providerSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/providers?status=ACTIVE`);
        if (!res.ok) return;
        const json = await res.json();
        let list: typeof providerResults = [];
        if (Array.isArray(json?.data?.content)) list = json.data.content;
        else if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json)) list = json;
        const query = assignedBy.toLowerCase();
        const filtered = list.filter((p) => {
          const firstName = p.identification?.firstName || p['identification.firstName'] || p.firstName || '';
          const lastName = p.identification?.lastName || p['identification.lastName'] || p.lastName || '';
          const name = (p.fullName || p.name || `${firstName} ${lastName}`.trim()).toLowerCase();
          return name.includes(query);
        });
        setProviderResults(filtered);
        setShowProviderDropdown(filtered.length > 0);
      } catch { /* silent */ }
    }, 300);
  }, [assignedBy]);

  useEffect(() => {
    if (open) {
      setPatientId("");
      setPatientName("");
      setPatientQuery("");
      setPatientResults([]);
      setShowPatientDropdown(false);
      setDueDate("");
      setNotes("");
      setError("");
      setMaterialSearch("");
      setMaterialResults([]);
      setShowMaterialDropdown(false);
      setProviderResults([]);
      setShowProviderDropdown(false);

      if (preselectedMaterial) {
        setSelectedMaterial(preselectedMaterial);
      } else {
        setSelectedMaterial(null);
      }

      setAssignedBy("");
    }
  }, [open, preselectedMaterial]);

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

  const searchMaterials = useCallback(async (q: string) => {
    if (!q.trim()) {
      setMaterialResults([]);
      return;
    }
    setSearchingMaterials(true);
    try {
      const res = await fetchWithAuth(`/api/education/materials?q=${encodeURIComponent(q)}&size=10`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMaterialResults(json.data.content || []);
        }
      }
    } catch {
      // silent
    } finally {
      setSearchingMaterials(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedMaterial && materialSearch.trim()) {
      const t = setTimeout(() => searchMaterials(materialSearch), 300);
      return () => clearTimeout(t);
    }
  }, [materialSearch, selectedMaterial, searchMaterials]);

  const handleSubmit = async () => {
    setError("");
    const fe: Record<string, string> = {};
    if (!patientName.trim()) fe.patientName = "Patient Name is required";
    if (!patientId.trim()) fe.patientId = "Please select a patient from the search dropdown";
    if (!selectedMaterial?.id) fe.material = "Please select a material";
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) {
      setError(Object.values(fe)[0]);
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/education/assignments", {
        method: "POST",
        body: JSON.stringify({
          patientId: patientId.trim(),
          patientName: patientName.trim(),
          materialId: selectedMaterial.id,
          assignedBy: assignedBy.trim(),
          dueDate: dueDate || null,
          encounterId: null,
          notes: notes.trim(),
        }),
      });
      if (res.ok) {
        // Show success toast
        const toast = document.createElement("div");
        toast.className = "fixed top-4 right-4 z-[99999] px-4 py-3 rounded-lg bg-green-600 text-white text-sm font-medium shadow-lg transition-opacity duration-300";
        toast.textContent = "Material assigned successfully";
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
        onAssigned();
        onClose();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || "Failed to assign material");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls = (field?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 ${field && fieldErrors[field] ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 dark:border-slate-600"} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`;

  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-[min(520px,100%)] rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Assign Material to Patient
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Patient Name + ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelCls}>Patient Name *</label>
                <input
                  className={inputCls("patientName")}
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setPatientName("");
                    setPatientId("");
                    setShowPatientDropdown(true);
                    setFieldErrors((prev) => { const n = { ...prev }; delete n.patientName; delete n.patientId; return n; });
                  }}
                  onFocus={() => { if (patientResults.length > 0) setShowPatientDropdown(true); }}
                  placeholder="Search patient..."
                />
                {showPatientDropdown && patientResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const name = getPatientDisplayName(p);
                          setPatientName(name);
                          setPatientId(String(p.id));
                          setPatientQuery(name);
                          setShowPatientDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        {getPatientDisplayName(p)} <span className="text-xs text-gray-400">({p.id})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Patient ID *</label>
                <input
                  className={inputCls("patientId")}
                  value={patientId}
                  readOnly
                  placeholder="Auto-filled"
                />
                {fieldErrors.patientId && <p className="text-xs text-red-500 mt-1">{fieldErrors.patientId}</p>}
              </div>
            </div>

            {/* Material Selector */}
            <div className="relative">
              <label className={labelCls}>Material *</label>
              {selectedMaterial ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                  <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">
                    {selectedMaterial.title}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[selectedMaterial.category] || CATEGORY_COLORS.other}`}>
                    {categoryLabel(selectedMaterial.category)}
                  </span>
                  <button
                    onClick={() => { setSelectedMaterial(null); setMaterialSearch(""); }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Search materials..."
                    value={materialSearch}
                    onChange={(e) => { setMaterialSearch(e.target.value); setShowMaterialDropdown(true); }}
                    onFocus={() => setShowMaterialDropdown(true)}
                  />
                  {searchingMaterials && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
              )}
              {/* Material dropdown */}
              {showMaterialDropdown && !selectedMaterial && materialResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {materialResults.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMaterial(m);
                        setShowMaterialDropdown(false);
                        setMaterialSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition"
                    >
                      <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate flex-1 text-gray-900 dark:text-gray-100">{m.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[m.category] || CATEGORY_COLORS.other}`}>
                        {categoryLabel(m.category)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.material && <p className="text-xs text-red-500 mt-1">{fieldErrors.material}</p>}
            </div>

            {/* Due Date */}
            <div>
              <label className={labelCls}>Due Date</label>
              <DateInput
                className={inputCls()}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes for Patient</label>
              <textarea
                className={inputCls()}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions for the patient..."
              />
            </div>

            {/* Assigned By */}
            <div className="relative">
              <label className={labelCls}>Assigned By</label>
              <input
                className={inputCls()}
                value={assignedBy}
                onChange={(e) => {
                  setAssignedBy(e.target.value);
                  setShowProviderDropdown(true);
                }}
                onFocus={() => { if (providerResults.length > 0) setShowProviderDropdown(true); }}
                onBlur={() => { setTimeout(() => setShowProviderDropdown(false), 200); }}
                placeholder="Search provider..."
              />
              {showProviderDropdown && providerResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                  {providerResults.map((p) => {
                    const name = getProviderDisplayName(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setAssignedBy(name);
                          setShowProviderDropdown(false);
                          setProviderResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
