"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import {
  CDSRule,
  RuleType,
  RuleCategory,
  TriggerEvent,
  ActionType,
  Severity,
  RULE_TYPE_LABELS,
  CATEGORY_LABELS,
} from "./types";
import { isValidUrl } from "@/utils/validation";

interface Props {
  rule: CDSRule | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<CDSRule>) => Promise<void>;
}

const RULE_TYPES: RuleType[] = [
  "preventive_screening", "drug_allergy", "drug_drug", "duplicate_order",
  "age_based", "condition_based", "lab_value", "custom",
];
const CATEGORIES: RuleCategory[] = ["preventive", "medication_safety", "order_entry", "chronic_disease"];
const TRIGGERS: TriggerEvent[] = ["encounter_open", "order_entry", "medication_prescribe", "lab_result", "manual"];
const ACTIONS: ActionType[] = ["alert", "reminder", "suggestion", "hard_stop"];
const SEVERITIES: Severity[] = ["info", "warning", "critical"];

export default function CDSRuleFormPanel({ rule, open, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<CDSRule>>({
    name: "", description: "", ruleType: "preventive_screening", category: "preventive",
    triggerEvent: "encounter_open", actionType: "alert", severity: "info",
    message: "", recommendation: "", referenceUrl: "", isActive: true,
    appliesTo: "all", snoozeDays: null as number | null, conditions: {},
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rule) {
      // Normalize active/isActive field from backend (Java may return 'active' instead of 'isActive')
      setForm({ ...rule, isActive: rule.isActive ?? (rule as any).active ?? false, snoozeDays: rule.snoozeDays ?? null });
    } else {
      setForm({
        name: "", description: "", ruleType: "preventive_screening", category: "preventive",
        triggerEvent: "encounter_open", actionType: "alert", severity: "info",
        message: "", recommendation: "", referenceUrl: "", isActive: true,
        appliesTo: "all", snoozeDays: null as number | null, conditions: {},
      });
    }
  }, [rule, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.referenceUrl && !isValidUrl(form.referenceUrl)) errs.referenceUrl = "Must be a valid URL (https://...)";
    if (!form.name?.trim()) errs.name = "Name is required";
    else if (form.name.length > 100) errs.name = "Name must be 100 characters or less";
    else if (!/^[a-zA-Z0-9\s\-/()&.,:']+$/.test(form.name.trim())) errs.name = "Name contains invalid characters (only letters, numbers, spaces, and common punctuation allowed)";
    else if (!/[A-Za-z]/.test(form.name)) errs.name = "Name must contain at least one letter";
    if (!form.message?.trim()) errs.message = "Alert message is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {rule ? "Edit CDS Rule" : "Create CDS Rule"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Rule Name *</label>
            <input
              type="text" required value={form.name || ""} maxLength={100}
              onChange={(e) => { set("name", e.target.value); if (errors.name) setErrors(prev => { const n = {...prev}; delete n.name; return n; }); }}
              className={`w-full rounded-lg border ${errors.name ? "border-red-400 ring-1 ring-red-300" : "border-slate-300 dark:border-slate-600"} bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="e.g., Diabetes A1C Screening"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
            <textarea
              rows={2} value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Row: Rule Type + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Rule Type *</label>
              <select
                value={form.ruleType || ""}
                onChange={(e) => set("ruleType", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RULE_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{RULE_TYPE_LABELS[rt]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select
                value={form.category || ""}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Trigger + Action Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Trigger Event</label>
              <select
                value={form.triggerEvent || ""}
                onChange={(e) => set("triggerEvent", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Action Type</label>
              <select
                value={form.actionType || ""}
                onChange={(e) => set("actionType", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Severity + Applies To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Severity *</label>
              <select
                value={form.severity || "info"}
                onChange={(e) => set("severity", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Applies To</label>
              <select
                value={form.appliesTo || "all"}
                onChange={(e) => set("appliesTo", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="provider">Providers Only</option>
                <option value="nurse">Nurses Only</option>
                <option value="ma">Medical Assistants</option>
              </select>
            </div>
          </div>

          {/* Alert Message */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Alert Message *</label>
            <textarea
              rows={3} required value={form.message || ""}
              onChange={(e) => set("message", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Message shown to the provider when this rule fires..."
            />
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Recommendation</label>
            <textarea
              rows={2} value={form.recommendation || ""}
              onChange={(e) => set("recommendation", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Recommended action for the provider..."
            />
          </div>

          {/* Row: Reference URL + Snooze Days */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reference URL</label>
              <input
                type="url" value={form.referenceUrl || ""}
                onChange={(e) => { set("referenceUrl", e.target.value); if (errors.referenceUrl) setErrors(prev => { const n = {...prev}; delete n.referenceUrl; return n; }); }}
                className={`w-full rounded-lg border ${errors.referenceUrl ? "border-red-400 ring-1 ring-red-300" : "border-slate-300 dark:border-slate-600"} bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="https://guidelines.example.com"
              />
              {errors.referenceUrl && <p className="text-xs text-red-500 mt-1">{errors.referenceUrl}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Snooze (days)</label>
              <input
                type="number" min={0} value={form.snoozeDays != null ? form.snoozeDays : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") { set("snoozeDays", null); return; }
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n >= 0) set("snoozeDays", n);
                }}
                placeholder="Leave empty for no snooze"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox" checked={form.isActive ?? false}
                onChange={(e) => set("isActive", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600" />
            </label>
            <span className="text-sm text-slate-700 dark:text-slate-300">{form.isActive ? "Active" : "Inactive"}</span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving || !form.name || !form.message}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {rule ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
