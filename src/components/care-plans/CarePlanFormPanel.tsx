"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Target,
  Activity,
  Search,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  CarePlan,
  Goal,
  Intervention,
  EMPTY_FORM,
  EMPTY_GOAL,
  EMPTY_INTERVENTION,
  CATEGORIES,
} from "./types";
import DateInput from "@/components/ui/DateInput";

type FormData = Omit<CarePlan, "id" | "createdAt" | "updatedAt">;

interface Props {
  editing: CarePlan | null;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
}

export default function CarePlanFormPanel({ editing, onClose, onSave }: Props) {
  const initial: FormData = editing
    ? {
        patientId: editing.patientId,
        patientName: editing.patientName,
        title: editing.title,
        status: editing.status,
        category: editing.category,
        startDate: editing.startDate,
        endDate: editing.endDate,
        authorName: editing.authorName,
        description: editing.description,
        notes: editing.notes,
        goals: editing.goals || [],
        interventions: editing.interventions || [],
      }
    : { ...EMPTY_FORM, startDate: new Date().toISOString().split("T")[0] };

  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([]);

  // Load active providers for intervention assignment (with FHIR fallback)
  useEffect(() => {
    async function loadProviders() {
      const parseList = (json: any): any[] => {
        if (Array.isArray(json?.data?.content)) return json.data.content;
        if (Array.isArray(json?.data)) return json.data;
        if (Array.isArray(json?.content)) return json.content;
        if (Array.isArray(json)) return json;
        return [];
      };
      const mapProviders = (raw: any[]) => raw.map((p: any) => ({
        id: p.id || p.fhirId,
        name: `${p?.identification?.firstName ?? p.firstName ?? ""} ${p?.identification?.lastName ?? p.lastName ?? ""}`.trim() || p.name || p.fullName || p.displayName || `Provider #${p.id}`,
      })).filter((p: { name: string }) => p.name);

      try {
        const res = await fetchWithAuth(`/api/providers`);
        if (res.ok) {
          const json = await res.json();
          const list = mapProviders(parseList(json));
          if (list.length > 0) { setProviders(list); return; }
        }
      } catch { /* silent */ }
      // FHIR fallback
      try {
        const fb = await fetchWithAuth(`/api/fhir-resource/providers?size=200`);
        if (fb.ok) {
          const json = await fb.json();
          const list = mapProviders(parseList(json));
          if (list.length > 0) setProviders(list);
        }
      } catch { /* silent */ }
    }
    loadProviders();
  }, []);

  // Patient search state
  const [patientQuery, setPatientQuery] = useState(initial.patientName || "");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Reset dropdown state when form opens
  useEffect(() => {
    setPatientResults([]);
    setShowPatientDropdown(false);
  }, [editing]);
  const patientSearchRef = useRef<ReturnType<typeof setTimeout>>();

  // Author/provider search state
  const [authorQuery, setAuthorQuery] = useState(initial.authorName || "");
  const [authorResults, setAuthorResults] = useState<{ id: number; name: string }[]>([]);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [authorSearching, setAuthorSearching] = useState(false);
  const authorSearchRef = useRef<ReturnType<typeof setTimeout>>(null);
  const skipAuthorSearchRef = useRef(!!editing?.authorName);

  // Debounced author/provider search (with FHIR fallback)
  useEffect(() => {
    if (skipAuthorSearchRef.current) { skipAuthorSearchRef.current = false; return; }
    if (!authorQuery.trim() || authorQuery.length < 2) { setAuthorResults([]); return; }
    if (authorSearchRef.current) clearTimeout(authorSearchRef.current);
    authorSearchRef.current = setTimeout(async () => {
      setAuthorSearching(true);
      const parseList = (json: any): any[] => {
        if (Array.isArray(json?.data?.content)) return json.data.content;
        if (Array.isArray(json?.data)) return json.data;
        if (Array.isArray(json?.content)) return json.content;
        if (Array.isArray(json)) return json;
        return [];
      };
      const mapProviders = (raw: any[]) => raw.map((p: any) => ({
        id: p.id || p.fhirId,
        name: `${p?.identification?.firstName ?? p.firstName ?? ""} ${p?.identification?.lastName ?? p.lastName ?? ""}`.trim() || p.name || p.fullName || p.displayName || `Provider #${p.id}`,
      })).filter((p: { name: string }) => p.name);
      try {
        let mapped: { id: number; name: string }[] = [];
        // Try /api/providers first
        const res = await fetchWithAuth(`/api/providers?search=${encodeURIComponent(authorQuery)}`);
        if (res.ok) mapped = mapProviders(parseList(await res.json()));
        // FHIR fallback if empty
        if (mapped.length === 0) {
          const fb = await fetchWithAuth(`/api/fhir-resource/providers?size=200`);
          if (fb.ok) {
            const all = mapProviders(parseList(await fb.json()));
            const ql = authorQuery.toLowerCase();
            mapped = all.filter((p: { name: string }) => p.name.toLowerCase().includes(ql));
          }
        }
        setAuthorResults(mapped);
        setShowAuthorDropdown(mapped.length > 0);
      } catch { /* silent */ }
      finally { setAuthorSearching(false); }
    }, 300);
    return () => { if (authorSearchRef.current) clearTimeout(authorSearchRef.current); };
  }, [authorQuery]);

  const getPatientName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return; }
    // Skip search if editing and patient already selected
    if (form.patientId && form.patientName && patientQuery === form.patientName) return;
    if (patientSearchRef.current) clearTimeout(patientSearchRef.current);
    patientSearchRef.current = setTimeout(async () => {
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

  function setField<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  // --- Goal management in form ---
  function addGoal() {
    setForm((prev) => ({
      ...prev,
      goals: [...prev.goals, { ...EMPTY_GOAL } as Goal],
    }));
  }

  function updateGoal(idx: number, partial: Partial<Goal>) {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals.map((g, i) => (i === idx ? { ...g, ...partial } : g)),
    }));
  }

  function removeGoal(idx: number) {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== idx),
    }));
  }

  // --- Intervention management in form ---
  function addIntervention() {
    setForm((prev) => ({
      ...prev,
      interventions: [
        ...prev.interventions,
        { ...EMPTY_INTERVENTION } as Intervention,
      ],
    }));
  }

  function updateIntervention(idx: number, partial: Partial<Intervention>) {
    setForm((prev) => ({
      ...prev,
      interventions: prev.interventions.map((int, i) =>
        i === idx ? { ...int, ...partial } : int
      ),
    }));
  }

  function removeIntervention(idx: number) {
    setForm((prev) => ({
      ...prev,
      interventions: prev.interventions.filter((_, i) => i !== idx),
    }));
  }

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [goalErrors, setGoalErrors] = useState<Record<number, string>>({});

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    // Title validation
    if (!form.title.trim()) {
      errs.title = "Title is required";
    } else if (form.title.trim().length < 2) {
      errs.title = "Title must be at least 2 characters";
    } else if (form.title.trim().length > 200) {
      errs.title = "Title must be 200 characters or less";
    } else if (!/^[A-Za-z0-9\s\-_/()&.,:'!?]+$/.test(form.title.trim())) {
      errs.title = "Title contains invalid characters (only letters, numbers, spaces, and common punctuation allowed)";
    } else if (!/[A-Za-z]/.test(form.title)) {
      errs.title = "Title must contain at least one letter";
    }
    // Author name validation
    if (form.authorName && form.authorName.trim().length > 0) {
      if (!/^[A-Za-z\s\-'.]+$/.test(form.authorName.trim())) {
        errs.authorName = "Author name must contain only letters, spaces, hyphens, apostrophes, or periods";
      } else if (form.authorName.trim().length < 2) {
        errs.authorName = "Author name must be at least 2 characters";
      }
    }
    // Validate goal target values are numeric
    const gErrs: Record<number, string> = {};
    form.goals.forEach((g, idx) => {
      if (g.targetValue && !/^\d*\.?\d*$/.test(g.targetValue)) {
        gErrs[idx] = "Must be a numeric value";
      }
    });
    setGoalErrors(gErrs);
    // Validate end date is after start date
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = "End date must be after start date";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || Object.keys(gErrs).length > 0) {
      setFormError(errs.endDate || null);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass =
    "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editing ? "Edit Care Plan" : "New Care Plan"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => { setField("title", e.target.value); if (fieldErrors.title) setFieldErrors(prev => { const n = {...prev}; delete n.title; return n; }); }}
                className={`${inputClass} ${fieldErrors.title ? "border-red-400 dark:border-red-500 ring-1 ring-red-300" : ""}`}
                placeholder="Care plan title"
                maxLength={200}
              />
              {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Patient Name - Searchable */}
              <div className="relative">
                <label className={labelClass}>Patient Name</label>
                <input
                  type="text"
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setField("patientName", "");
                    setField("patientId", "");
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => { if (patientResults.length > 0) setShowPatientDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
                  className={inputClass}
                  placeholder="Search patient..."
                />
                {showPatientDropdown && patientResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const name = getPatientName(p);
                          setField("patientName", name);
                          setField("patientId", String(p.id));
                          setPatientQuery(name);
                          setShowPatientDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        {getPatientName(p)} <span className="text-xs text-gray-400">({p.id})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Patient ID</label>
                <input
                  type="text"
                  value={form.patientId}
                  onChange={(e) => setField("patientId", e.target.value)}
                  className={inputClass}
                  placeholder="Patient ID"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setField("status", e.target.value as CarePlan["status"])
                  }
                  className={inputClass}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="revoked">Revoked</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date</label>
                <DateInput
                  value={form.startDate}
                  onChange={(e) => setField("startDate", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>End Date</label>
                <DateInput
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => { setField("endDate", e.target.value); setFormError(null); }}
                  className={inputClass}
                />
                {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
              </div>
            </div>

            <div className="relative">
              <label className={labelClass}>Author Name</label>
              <input
                type="text"
                value={authorQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setAuthorQuery(val);
                  setField("authorName", val);
                  setShowAuthorDropdown(true);
                  if (fieldErrors.authorName) setFieldErrors(prev => { const n = {...prev}; delete n.authorName; return n; });
                }}
                onFocus={() => { if (authorResults.length > 0) setShowAuthorDropdown(true); }}
                onBlur={() => { setTimeout(() => setShowAuthorDropdown(false), 150); }}
                className={`${inputClass} ${fieldErrors.authorName ? "border-red-400 dark:border-red-500 ring-1 ring-red-300" : ""}`}
                placeholder="Search provider..."
              />
              {authorSearching && (
                <div className="absolute right-3 top-8">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
              {showAuthorDropdown && authorResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                  {authorResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        skipAuthorSearchRef.current = true;
                        setField("authorName", p.name);
                        setAuthorQuery(p.name);
                        setShowAuthorDropdown(false);
                        if (fieldErrors.authorName) setFieldErrors(prev => { const n = {...prev}; delete n.authorName; return n; });
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.authorName && <p className="text-xs text-red-500 mt-1">{fieldErrors.authorName}</p>}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className={`${inputClass} resize-none`}
                placeholder="Plan description"
              />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className={`${inputClass} resize-none`}
                placeholder="Additional notes"
              />
            </div>
          </div>

          {/* Goals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                Goals ({form.goals.length})
              </h3>
              <button
                type="button"
                onClick={addGoal}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Goal
              </button>
            </div>

            <div className="space-y-3">
              {form.goals.map((goal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Goal {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGoal(idx)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Description"
                    value={goal.description}
                    onChange={(e) =>
                      updateGoal(idx, { description: e.target.value })
                    }
                    className={inputClass}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelClass}>Target Date</label>
                      <DateInput
                        value={goal.targetDate}
                        onChange={(e) =>
                          updateGoal(idx, { targetDate: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Measure</label>
                      <input
                        type="text"
                        placeholder="e.g. HbA1c"
                        value={goal.measure}
                        onChange={(e) =>
                          updateGoal(idx, { measure: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Target Value</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 7.0"
                        value={goal.targetValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Block non-numeric input (allow digits and single decimal point only)
                          if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
                          updateGoal(idx, { targetValue: val });
                          setGoalErrors((prev) => { const n = { ...prev }; delete n[idx]; return n; });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Priority</label>
                    <select
                      value={goal.priority}
                      onChange={(e) =>
                        updateGoal(idx, {
                          priority: e.target.value as Goal["priority"],
                        })
                      }
                      className={inputClass}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interventions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                Interventions ({form.interventions.length})
              </h3>
              <button
                type="button"
                onClick={addIntervention}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Intervention
              </button>
            </div>

            <div className="space-y-3">
              {form.interventions.map((int, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Intervention {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeIntervention(idx)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Description"
                    value={int.description}
                    onChange={(e) =>
                      updateIntervention(idx, {
                        description: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Assigned To</label>
                      <select
                        value={int.assignedTo}
                        onChange={(e) =>
                          updateIntervention(idx, {
                            assignedTo: e.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        <option value="">Assign to provider...</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Frequency</label>
                      <select
                        value={int.frequency}
                        onChange={(e) =>
                          updateIntervention(idx, {
                            frequency:
                              e.target.value as Intervention["frequency"],
                          })
                        }
                        className={inputClass}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="as_needed">As Needed</option>
                        <option value="once">Once</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || !/[A-Za-z]/.test(form.title) || !/^[A-Za-z0-9\s\-_/()&.,:'!?]+$/.test(form.title.trim())}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}
