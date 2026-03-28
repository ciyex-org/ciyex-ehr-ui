"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import DateInput from "@/components/ui/DateInput";
import {
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  PRIORITY_LABELS,
  type TaskFormData,
  type TaskType,
  type TaskStatus,
  type TaskPriority,
} from "./types";

interface Props {
  open: boolean;
  form: TaskFormData;
  onChange: (form: TaskFormData) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  isEditing: boolean;
}

export default function TaskFormPanel({
  open,
  form,
  onChange,
  onClose,
  onSave,
  saving,
  isEditing,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Focus first input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const input = panelRef.current?.querySelector<HTMLInputElement>("input[name='title']");
        input?.focus();
      }, 200);
    }
  }, [open]);

  const set = <K extends keyof TaskFormData>(key: K, val: TaskFormData[K]) =>
    onChange({ ...form, [key]: val });

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientInputRef = useRef<HTMLDivElement>(null);

  // Provider search for "Assigned To"
  const [providerQuery, setProviderQuery] = useState("");
  const [providerResults, setProviderResults] = useState<{ id: number; name: string }[]>([]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const providerInputRef = useRef<HTMLDivElement>(null);
  const skipProviderSearchRef = useRef(false);

  // Sync provider query only when panel opens (populate edit-mode value) or resets
  useEffect(() => {
    setProviderQuery(form.assignedTo || "");
    setProviderResults([]);
    setShowProviderDropdown(false);
  }, [open]);

  // Debounced provider search
  useEffect(() => {
    if (skipProviderSearchRef.current) { skipProviderSearchRef.current = false; return; }
    if (!providerQuery.trim() || providerQuery.length < 2) { setProviderResults([]); setShowProviderDropdown(false); return; }
    const currentQuery = providerQuery;
    const t = setTimeout(async () => {
      try {
        const parseProviders = (json: any) => {
          const raw = Array.isArray(json) ? json : (json?.data?.content || json?.content || json?.data || []);
          return (Array.isArray(raw) ? raw : [])
            .map((p: any) => ({
              id: p.id || p.fhirId,
              name: `${p?.identification?.firstName ?? p.firstName ?? ""} ${p?.identification?.lastName ?? p.lastName ?? ""}`.trim() || p.name || p.displayName || p.fullName || `Provider #${p.id || p.fhirId || ""}`,
            }))
            .filter((p: { id: any; name: string }) => p.name && p.id);
        };

        // Fetch all providers and filter client-side (more reliable than search param)
        let list: { id: number; name: string }[] = [];
        const allRes = await fetchWithAuth(`/api/providers`);
        if (allRes.ok) {
          const allJson = await allRes.json();
          const all = parseProviders(allJson);
          const q = currentQuery.toLowerCase();
          list = all.filter((p) => p.name.toLowerCase().includes(q));
        }

        // Fallback: try search endpoint if all-providers returned nothing
        if (list.length === 0) {
          const res = await fetchWithAuth(`/api/providers?search=${encodeURIComponent(currentQuery)}`);
          if (res.ok) {
            const json = await res.json();
            list = parseProviders(json);
          }
        }

        if (currentQuery === providerQuery) {
          setProviderResults(list);
          setShowProviderDropdown(list.length > 0);
        }
      } catch (e) { console.error("Provider search failed:", e); }
    }, 250);
    return () => clearTimeout(t);
  }, [providerQuery]);

  // Provider dropdown positioning removed — uses absolute positioning relative to parent

  // Sync patient query with form data
  useEffect(() => {
    setPatientQuery(form.patientName || "");
  }, [form.patientName, open]);

  // Patient dropdown positioning removed — uses absolute positioning relative to parent

  // Debounced patient search
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); setShowPatientDropdown(false); return; }
    if (form.patientName && patientQuery === form.patientName && form.patientId) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/patients?search=${encodeURIComponent(patientQuery)}`);
        if (!res.ok) return;
        const json = await res.json();
        let list: typeof patientResults = [];
        if (Array.isArray(json?.data?.content)) list = json.data.content;
        else if (Array.isArray(json?.content)) list = json.content;
        else if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json)) list = json;

        // If search returned empty, try fetching all patients and filtering client-side
        if (list.length === 0) {
          const allRes = await fetchWithAuth(`/api/patients?page=0&size=200`);
          if (allRes.ok) {
            const allJson = await allRes.json();
            let allList: typeof patientResults = [];
            if (Array.isArray(allJson?.data?.content)) allList = allJson.data.content;
            else if (Array.isArray(allJson?.content)) allList = allJson.content;
            else if (Array.isArray(allJson?.data)) allList = allJson.data;
            else if (Array.isArray(allJson)) allList = allJson;
            const q = patientQuery.toLowerCase();
            list = allList.filter((p) => {
              const name = (p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()).toLowerCase();
              return name.includes(q);
            });
          }
        }

        setPatientResults(list);
        setShowPatientDropdown(list.length > 0);
      } catch (e) { console.error("Patient search failed:", e); }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, form.patientName, form.patientId]);

  const pName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  const selectPatient = (p: typeof patientResults[0]) => {
    const name = pName(p);
    onChange({ ...form, patientId: p.id, patientName: name });
    setPatientQuery(name);
    setShowPatientDropdown(false);
    setPatientResults([]);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="overflow-y-auto h-[calc(100%-130px)] px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Enter task title"
              className={`w-full px-3 py-2 text-sm rounded-lg border ${form.title !== undefined && form.title !== "" && (!form.title.trim() || !/^[A-Za-z0-9\s\-_/()&.,:'!?]+$/.test(form.title.trim()) || /^-|-$/.test(form.title.trim()) || (form.title.trim().length > 0 && !/[A-Za-z]/.test(form.title))) ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition`}
              maxLength={200}
            />
            {form.title !== undefined && form.title !== "" && !form.title.trim() && (
              <p className="text-xs text-red-500 mt-1">Title cannot be only whitespace</p>
            )}
            {form.title !== undefined && form.title.trim() && !/^[A-Za-z0-9\s\-_/()&.,:'!?]+$/.test(form.title.trim()) && (
              <p className="text-xs text-red-500 mt-1">Title contains invalid characters (only letters, numbers, spaces, and common punctuation allowed)</p>
            )}
            {form.title !== undefined && form.title.trim() && /^[A-Za-z0-9\s\-_/()&.,:'!?]+$/.test(form.title.trim()) && /^-|-$/.test(form.title.trim()) && (
              <p className="text-xs text-red-500 mt-1">Title cannot start or end with a hyphen</p>
            )}
            {form.title !== undefined && form.title.trim().length > 0 && !/[A-Za-z]/.test(form.title) && (
              <p className="text-xs text-red-500 mt-1">Title must contain at least one letter</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Task description..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Row: Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Task Type
              </label>
              <select
                value={form.taskType}
                onChange={(e) => set("taskType", e.target.value as TaskType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              >
                {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              >
                {(Object.entries(PRIORITY_LABELS) as [TaskPriority, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as TaskStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            >
              {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Row: Due Date + Due Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
              <DateInput
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Time</label>
              <input
                type="time"
                value={form.dueTime}
                onChange={(e) => set("dueTime", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Row: Assigned To + Assigned By */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative" ref={providerInputRef}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Assigned To <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={providerQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setProviderQuery(val);
                  onChange({ ...form, assignedTo: val });
                  setShowProviderDropdown(true);
                }}
                onFocus={() => providerResults.length > 0 && setShowProviderDropdown(true)}
                onBlur={() => setTimeout(() => setShowProviderDropdown(false), 300)}
                placeholder="Search provider..."
                autoComplete="off"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              {showProviderDropdown && providerResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-[9999]">
                  {providerResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        skipProviderSearchRef.current = true;
                        setProviderQuery(p.name);
                        set("assignedTo", p.name);
                        setShowProviderDropdown(false);
                        setProviderResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Assigned By
              </label>
              <input
                type="text"
                value={form.assignedBy}
                onChange={(e) => set("assignedBy", e.target.value)}
                placeholder="e.g. Front Desk"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Row: Patient Name + Patient ID */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative" ref={patientInputRef}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={patientQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setPatientQuery(val);
                  onChange({ ...form, patientName: val, patientId: "" });
                  setShowPatientDropdown(true);
                }}
                onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
                onBlur={() => setTimeout(() => setShowPatientDropdown(false), 300)}
                placeholder="Search patient by name..."
                autoComplete="off"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              {showPatientDropdown && patientResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-[9999]">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <span className="font-medium">{pName(p)}</span>
                      <span className="text-xs text-gray-400 ml-2">#{p.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Patient ID
              </label>
              <input
                type="text"
                value={form.patientId}
                readOnly
                placeholder="Auto-filled from search"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none transition cursor-not-allowed"
              />
              {!String(form.patientId || "").trim() && form.patientName !== undefined && form.patientName !== "" && (
                <p className="text-xs text-red-500 mt-1">Please select a patient from the dropdown</p>
              )}
            </div>
          </div>

          {/* Encounter ID */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Encounter ID
            </label>
            <input
              type="text"
              value={form.encounterId}
              onChange={(e) => set("encounterId", e.target.value)}
              placeholder="Encounter ID (optional)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>

          {/* Reference Type + Reference ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Reference Type
              </label>
              <input
                type="text"
                value={form.referenceType}
                onChange={(e) => set("referenceType", e.target.value)}
                placeholder="e.g. Order, Lab"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Reference ID
              </label>
              <input
                type="text"
                value={form.referenceId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v)) set("referenceId", v);
                }}
                placeholder="Reference ID (numeric)"
                className={`w-full px-3 py-2 text-sm rounded-lg border ${form.referenceId && !/^\d+$/.test(form.referenceId) ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition`}
              />
              {form.referenceId && !/^\d+$/.test(form.referenceId) && (
                <p className="text-xs text-red-500 mt-1">Reference ID must be numeric</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.title.trim() || !/^[A-Za-z0-9\s\-_/()&.,:'!?]+$/.test(form.title.trim()) || /^-|-$/.test(form.title.trim()) || !/[A-Za-z]/.test(form.title) || !String(form.patientId || "").trim() || !String(form.assignedTo || "").trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}
