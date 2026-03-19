"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import DatePicker from "@/components/form/date-picker";
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

  // Sync patient query with form data
  useEffect(() => {
    setPatientQuery(form.patientName || "");
  }, [form.patientName, open]);

  // Debounced patient search — skip if query matches already-selected patient name
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return; }
    if (form.patientName && patientQuery === form.patientName && form.patientId) return;
    const t = setTimeout(async () => {
      try {
        const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
        const res = await fetchWithAuth(`${base}/api/patients?search=${encodeURIComponent(patientQuery)}`);
        const json = await res.json();
        let list: typeof patientResults = [];
        if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json?.data?.content)) list = json.data.content;
        setPatientResults(list);
        setShowPatientDropdown(list.length > 0);
      } catch { /* silent */ }
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
              className={`w-full px-3 py-2 text-sm rounded-lg border ${form.title !== undefined && form.title !== "" && (!form.title.trim() || /[<>{}[\]\\^~`|]/.test(form.title)) ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition`}
              maxLength={200}
            />
            {form.title !== undefined && form.title !== "" && !form.title.trim() && (
              <p className="text-xs text-red-500 mt-1">Title cannot be only whitespace</p>
            )}
            {form.title !== undefined && form.title.trim() && /[<>{}[\]\\^~`|]/.test(form.title) && (
              <p className="text-xs text-red-500 mt-1">Title contains invalid characters</p>
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
            <DatePicker
              id="task-due-date"
              label="Due Date"
              mode="single"
              defaultDate={form.dueDate || undefined}
              placeholder="Select date"
              onChange={(dates) => {
                if (dates.length > 0) {
                  const d = dates[0];
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  set("dueDate", `${yyyy}-${mm}-${dd}`);
                } else {
                  set("dueDate", "");
                }
              }}
            />
            <DatePicker
              id="task-due-time"
              label="Due Time"
              mode="time"
              defaultDate={form.dueTime || undefined}
              placeholder="Select time"
              onChange={(dates) => {
                if (dates.length > 0) {
                  const d = dates[0];
                  const hh = String(d.getHours()).padStart(2, "0");
                  const min = String(d.getMinutes()).padStart(2, "0");
                  set("dueTime", `${hh}:${min}`);
                } else {
                  set("dueTime", "");
                }
              }}
            />
          </div>

          {/* Row: Assigned To + Assigned By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Assigned To
              </label>
              <input
                type="text"
                value={form.assignedTo}
                onChange={(e) => set("assignedTo", e.target.value)}
                placeholder="e.g. Dr. Smith"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
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
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Patient Name
              </label>
              <input
                type="text"
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  set("patientName", e.target.value);
                  set("patientId", "");
                  setShowPatientDropdown(true);
                }}
                onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
                placeholder="Search patient by name..."
                autoComplete="off"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              {showPatientDropdown && patientResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
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
            disabled={saving || !form.title.trim() || /[<>{}[\]\\^~`|]/.test(form.title)}
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
