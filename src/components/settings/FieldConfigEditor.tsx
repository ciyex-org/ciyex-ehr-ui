"use client";

import React, { useCallback, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Save, RotateCcw, Plus, Trash2, Edit2, X, Check, Eye, EyeOff,
  GripVertical, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
} from "lucide-react";
import { FHIR_RESOURCES, FHIR_PATH_SUGGESTIONS, FIELD_TYPES } from "@/utils/FhirPathHelper";
import { confirmDialog } from "@/utils/toast";
import type { FieldDef, SectionDef, FieldConfig } from "@/components/patients/DynamicFormRenderer";
import DynamicFormRenderer from "@/components/patients/DynamicFormRenderer";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

// Known extended option keys (beyond value/label) and their editor types
const EXTENDED_OPTION_KEYS: Record<string, { label: string; type: "text" | "color" | "checkbox" | "number" }> = {
  color: { label: "Color", type: "color" },
  triggersEncounter: { label: "Triggers Encounter", type: "checkbox" },
  terminal: { label: "Terminal", type: "checkbox" },
  nextStatus: { label: "Next Status", type: "text" },
  order: { label: "Order", type: "number" },
  encounterNote: { label: "Encounter Note", type: "text" },
};

/** Detects if options have properties beyond value/label (i.e., extended metadata). */
function hasExtendedOptions(options: any[]): boolean {
  if (!options || options.length === 0) return false;
  return options.some((o) => {
    if (typeof o !== "object") return false;
    return Object.keys(o).some((k) => k !== "value" && k !== "label");
  });
}

/** Smart options editor — uses simple textarea for basic value|label options,
 *  advanced table for options with extended metadata (color, triggersEncounter, etc.) */
function OptionsEditor({ options, onChange }: { options: any[]; onChange: (opts: any[]) => void }) {
  const isExtended = hasExtendedOptions(options);
  const [mode, setMode] = React.useState<"auto" | "simple" | "advanced">("auto");
  const effectiveMode = mode === "auto" ? (isExtended ? "advanced" : "simple") : mode;

  // Collect all extra keys across all options
  const extraKeys = React.useMemo(() => {
    const keys = new Set<string>();
    options.forEach((o) => {
      if (typeof o === "object") {
        Object.keys(o).forEach((k) => {
          if (k !== "value" && k !== "label") keys.add(k);
        });
      }
    });
    return Array.from(keys);
  }, [options]);

  const updateOption = (idx: number, key: string, value: any) => {
    const updated = options.map((o, i) => (i === idx ? { ...o, [key]: value } : o));
    onChange(updated);
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const moveOption = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= options.length) return;
    const updated = [...options];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onChange(updated);
  };

  const addOption = () => {
    const base: any = { value: "", label: "" };
    // Carry forward the same extended keys from existing options
    extraKeys.forEach((k) => {
      const meta = EXTENDED_OPTION_KEYS[k];
      if (meta?.type === "checkbox") base[k] = false;
      else if (meta?.type === "number") base[k] = options.length + 1;
      else if (meta?.type === "color") base[k] = "#9ca3af";
      else base[k] = "";
    });
    onChange([...options, base]);
  };

  const switchToAdvanced = () => {
    // Ensure all options have extended keys
    const upgraded = options.map((o, idx) => {
      const obj = typeof o === "string" ? { value: o, label: o } : { ...o };
      if (!obj.color) obj.color = "#9ca3af";
      if (obj.triggersEncounter === undefined) obj.triggersEncounter = false;
      if (obj.terminal === undefined) obj.terminal = false;
      if (obj.order === undefined) obj.order = idx + 1;
      return obj;
    });
    onChange(upgraded);
    setMode("advanced");
  };

  // Simple textarea mode
  if (effectiveMode === "simple") {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-500">Options (one per line: value|label)</label>
          <button
            onClick={switchToAdvanced}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Switch to Advanced
          </button>
        </div>
        <textarea
          className="w-full px-2 py-1.5 text-sm border rounded font-mono dark:bg-gray-700 dark:border-gray-600"
          rows={4}
          value={options.map((o: any) => typeof o === "string" ? o : `${o.value}|${o.label}`).join("\n")}
          onChange={(e) => {
            const parsed = e.target.value.split("\n").filter(Boolean).map((line) => {
              const [value, ...rest] = line.split("|");
              return { value: value.trim(), label: (rest.join("|") || value).trim() };
            });
            onChange(parsed);
          }}
        />
      </div>
    );
  }

  // Advanced table mode
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-500">Status Options (extended metadata)</label>
        <button
          onClick={() => setMode("simple")}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Switch to Simple
        </button>
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid gap-1 px-2 py-1.5 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400"
          style={{ gridTemplateColumns: `28px 1fr 1fr ${extraKeys.map((k) => {
            const meta = EXTENDED_OPTION_KEYS[k];
            if (meta?.type === "checkbox") return "80px";
            if (meta?.type === "color") return "90px";
            if (meta?.type === "number") return "60px";
            return "1fr";
          }).join(" ")} 60px` }}
        >
          <span></span>
          <span>Value</span>
          <span>Label</span>
          {extraKeys.map((k) => (
            <span key={k}>{EXTENDED_OPTION_KEYS[k]?.label || k}</span>
          ))}
          <span></span>
        </div>
        {/* Rows */}
        {options.map((opt: any, idx: number) => (
          <div
            key={idx}
            className="grid gap-1 px-2 py-1 border-t border-gray-100 dark:border-gray-800 items-center"
            style={{ gridTemplateColumns: `28px 1fr 1fr ${extraKeys.map((k) => {
              const meta = EXTENDED_OPTION_KEYS[k];
              if (meta?.type === "checkbox") return "80px";
              if (meta?.type === "color") return "90px";
              if (meta?.type === "number") return "60px";
              return "1fr";
            }).join(" ")} 60px` }}
          >
            {/* Drag handle / reorder */}
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveOption(idx, -1)} className="text-gray-300 hover:text-gray-600 leading-none" title="Move up">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button onClick={() => moveOption(idx, 1)} className="text-gray-300 hover:text-gray-600 leading-none" title="Move down">
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
            {/* Value */}
            <input
              className="px-1.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
              value={opt.value || ""}
              onChange={(e) => updateOption(idx, "value", e.target.value)}
            />
            {/* Label */}
            <input
              className="px-1.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
              value={opt.label || ""}
              onChange={(e) => updateOption(idx, "label", e.target.value)}
            />
            {/* Extended fields */}
            {extraKeys.map((k) => {
              const meta = EXTENDED_OPTION_KEYS[k];
              if (meta?.type === "checkbox") {
                return (
                  <div key={k} className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={!!opt[k]}
                      onChange={(e) => updateOption(idx, k, e.target.checked)}
                    />
                  </div>
                );
              }
              if (meta?.type === "color") {
                return (
                  <div key={k} className="flex items-center gap-1">
                    <input
                      type="color"
                      value={opt[k] || "#9ca3af"}
                      onChange={(e) => updateOption(idx, k, e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0"
                    />
                    <input
                      className="px-1 py-1 text-xs border rounded w-16 font-mono dark:bg-gray-700 dark:border-gray-600"
                      value={opt[k] || ""}
                      onChange={(e) => updateOption(idx, k, e.target.value)}
                    />
                  </div>
                );
              }
              if (meta?.type === "number") {
                return (
                  <input
                    key={k}
                    type="number"
                    className="px-1.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 w-full"
                    value={opt[k] ?? ""}
                    onChange={(e) => updateOption(idx, k, Number(e.target.value))}
                  />
                );
              }
              return (
                <input
                  key={k}
                  className="px-1.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 w-full"
                  value={opt[k] || ""}
                  onChange={(e) => updateOption(idx, k, e.target.value)}
                />
              );
            })}
            {/* Delete */}
            <div className="flex justify-center">
              <button onClick={() => removeOption(idx)} className="p-0.5 text-gray-300 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addOption}
        className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
      >
        <Plus className="w-3 h-3" /> Add Option
      </button>
    </div>
  );
}

interface FieldConfigEditorProps {
  availableTabs: { tabKey: string; fhirResources: any[] }[];
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  fieldConfig: FieldConfig | null;
  setFieldConfig: (config: FieldConfig | null) => void;
  fhirResources: string[];
  setFhirResources: (res: string[]) => void;
  fieldConfigPreview: boolean;
  setFieldConfigPreview: (v: boolean) => void;
  previewFormData: Record<string, any>;
  setPreviewFormData: (d: Record<string, any>) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  showNotif: (type: "success" | "error", message: string) => void;
  /** Hide the tab selector header — used when editing a single page config */
  hideTabSelector?: boolean;
  /** Hide save/reset buttons — used when parent controls saving */
  hideSaveButton?: boolean;
}

export default function FieldConfigEditor({
  availableTabs, selectedTab, setSelectedTab,
  fieldConfig, setFieldConfig,
  fhirResources, setFhirResources,
  fieldConfigPreview, setFieldConfigPreview,
  previewFormData, setPreviewFormData,
  saving, setSaving, showNotif,
  hideTabSelector = false,
  hideSaveButton = false,
}: FieldConfigEditorProps) {

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; title: string; onConfirm: () => void } | null>(null);

  // Load field config for a tab
  const loadFieldConfig = useCallback(async (tabKey: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${tabKey}`);
      if (res.ok) {
        const data = await res.json();
        const fc = typeof data.fieldConfig === "string" ? JSON.parse(data.fieldConfig) : data.fieldConfig;
        setFieldConfig(fc?.sections ? fc : { sections: [] });
        setFhirResources(data.fhirResources || []);
      } else {
        setFieldConfig({ sections: [] });
        setFhirResources([]);
      }
    } catch {
      setFieldConfig({ sections: [] });
      setFhirResources([]);
    }
  }, [setFieldConfig, setFhirResources]);

  const handleTabSelect = async (tabKey: string) => {
    setSelectedTab(tabKey);
    setEditingFieldKey(null);
    setFieldConfigPreview(false);
    await loadFieldConfig(tabKey);
  };

  // Save field config
  const handleSave = async () => {
    if (!selectedTab || !fieldConfig) return;
    try {
      setSaving(true);
      const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${selectedTab}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fhirResources: fhirResources,
          fieldConfig: fieldConfig,
        }),
      });
      if (res.ok) {
        showNotif("success", "Field configuration saved");
      } else {
        const errJson = await res.json().catch(() => null);
        showNotif("error", errJson?.message || errJson?.error || `Failed to save field configuration (${res.status})`);
      }
    } catch {
      showNotif("error", "Failed to save field configuration");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (!selectedTab) return;
    setPendingConfirm({ title: "Reset Configuration", message: "Reset field configuration to defaults?", onConfirm: doReset });
  };

  const doReset = async () => {
    try {
      setSaving(true);
      await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${selectedTab}`, { method: "DELETE" });
      await loadFieldConfig(selectedTab);
      showNotif("success", "Field configuration reset to defaults");
    } catch {
      showNotif("error", "Failed to reset");
    } finally {
      setSaving(false);
    }
  };

  // Section operations
  const addSection = () => {
    if (!fieldConfig || !newSectionTitle.trim()) return;
    const key = newSectionTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setFieldConfig({
      sections: [...fieldConfig.sections, { key, title: newSectionTitle, columns: 3, collapsible: true, collapsed: false, fields: [] }],
    });
    setNewSectionTitle("");
    setExpandedSection(key);
  };

  const removeSection = async (sectionKey: string) => {
    if (!fieldConfig) return;
    setPendingConfirm({ title: "Delete Section", message: "Delete this section and all its fields?", onConfirm: () => setFieldConfig({ sections: fieldConfig.sections.filter((s) => s.key !== sectionKey) }) });
  };

  const moveSectionUp = (idx: number) => {
    if (!fieldConfig || idx <= 0) return;
    const sections = [...fieldConfig.sections];
    [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
    setFieldConfig({ sections });
  };

  const moveSectionDown = (idx: number) => {
    if (!fieldConfig || idx >= fieldConfig.sections.length - 1) return;
    const sections = [...fieldConfig.sections];
    [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
    setFieldConfig({ sections });
  };

  const updateSection = (sectionKey: string, updates: Partial<SectionDef>) => {
    if (!fieldConfig) return;
    setFieldConfig({
      sections: fieldConfig.sections.map((s) => (s.key === sectionKey ? { ...s, ...updates } : s)),
    });
  };

  // Field operations
  const addField = (sectionKey: string) => {
    if (!fieldConfig) return;
    const field: FieldDef = {
      key: `field-${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
      colSpan: 1,
    };
    setFieldConfig({
      sections: fieldConfig.sections.map((s) =>
        s.key === sectionKey ? { ...s, fields: [...s.fields, field] } : s
      ),
    });
    setEditingFieldKey(field.key);
  };

  const removeField = (sectionKey: string, fieldKey: string) => {
    if (!fieldConfig) return;
    setFieldConfig({
      sections: fieldConfig.sections.map((s) =>
        s.key === sectionKey ? { ...s, fields: s.fields.filter((f) => f.key !== fieldKey) } : s
      ),
    });
  };

  const updateField = (sectionKey: string, fieldKey: string, updates: Partial<FieldDef>) => {
    if (!fieldConfig) return;
    setFieldConfig({
      sections: fieldConfig.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, fields: s.fields.map((f) => (f.key === fieldKey ? { ...f, ...updates } : f)) }
          : s
      ),
    });
  };

  const moveFieldUp = (sectionKey: string, fieldIdx: number) => {
    if (!fieldConfig || fieldIdx <= 0) return;
    setFieldConfig({
      sections: fieldConfig.sections.map((s) => {
        if (s.key !== sectionKey) return s;
        const fields = [...s.fields];
        [fields[fieldIdx - 1], fields[fieldIdx]] = [fields[fieldIdx], fields[fieldIdx - 1]];
        return { ...s, fields };
      }),
    });
  };

  const moveFieldDown = (sectionKey: string, fieldIdx: number) => {
    if (!fieldConfig) return;
    setFieldConfig({
      sections: fieldConfig.sections.map((s) => {
        if (s.key !== sectionKey) return s;
        if (fieldIdx >= s.fields.length - 1) return s;
        const fields = [...s.fields];
        [fields[fieldIdx], fields[fieldIdx + 1]] = [fields[fieldIdx + 1], fields[fieldIdx]];
        return { ...s, fields };
      }),
    });
  };

  // Render field editor
  const renderFieldEditor = (section: SectionDef, field: FieldDef, fieldIdx: number) => {
    const isEditing = editingFieldKey === field.key;

    return (
      <div key={field.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-300" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{field.label}</span>
            <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{field.type}</span>
            {field.required && <span className="text-xs text-red-500">required</span>}
            {field.fhirMapping && (
              <span className="text-xs text-blue-500 font-mono">
                {field.fhirMapping.resource}.{field.fhirMapping.path.substring(0, 30)}{field.fhirMapping.path.length > 30 ? "..." : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => moveFieldUp(section.key, fieldIdx)} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Move up">
              <ArrowUp className="w-3 h-3" />
            </button>
            <button onClick={() => moveFieldDown(section.key, fieldIdx)} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Move down">
              <ArrowDown className="w-3 h-3" />
            </button>
            <button onClick={() => setEditingFieldKey(isEditing ? null : field.key)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Edit">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => removeField(section.key, field.key)} className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Expanded field editor */}
        {isEditing && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {/* Key */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Field Key</label>
                <input
                  className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={field.key}
                  onChange={(e) => updateField(section.key, field.key, { key: e.target.value })}
                />
              </div>
              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input
                  className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={field.label}
                  onChange={(e) => updateField(section.key, field.key, { label: e.target.value })}
                />
              </div>
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
                <select
                  className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={field.type}
                  onChange={(e) => updateField(section.key, field.key, { type: e.target.value as FieldDef["type"] })}
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              {/* ColSpan */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Column Span</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={field.colSpan || 1}
                  min={1}
                  max={4}
                  onChange={(e) => updateField(section.key, field.key, { colSpan: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* Required */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`req-${field.key}`}
                  checked={!!field.required}
                  onChange={(e) => updateField(section.key, field.key, { required: e.target.checked })}
                />
                <label htmlFor={`req-${field.key}`} className="text-xs text-gray-600">Required</label>
              </div>
              {/* Placeholder */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                <input
                  className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={field.placeholder || ""}
                  onChange={(e) => updateField(section.key, field.key, { placeholder: e.target.value })}
                />
              </div>
            </div>

            {/* FHIR Mapping */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">FHIR Mapping</h5>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Resource</label>
                  <select
                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                    value={field.fhirMapping?.resource || ""}
                    onChange={(e) => updateField(section.key, field.key, {
                      fhirMapping: { ...(field.fhirMapping || { path: "", type: "string" }), resource: e.target.value },
                    })}
                  >
                    <option value="">-- Select --</option>
                    {FHIR_RESOURCES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Path</label>
                  <input
                    className="w-full px-2 py-1.5 text-sm border rounded font-mono dark:bg-gray-700 dark:border-gray-600"
                    value={field.fhirMapping?.path || ""}
                    onChange={(e) => updateField(section.key, field.key, {
                      fhirMapping: { ...(field.fhirMapping || { resource: "", type: "string" }), path: e.target.value },
                    })}
                    list={`fhir-paths-${field.key}`}
                  />
                  {field.fhirMapping?.resource && FHIR_PATH_SUGGESTIONS[field.fhirMapping.resource] && (
                    <datalist id={`fhir-paths-${field.key}`}>
                      {FHIR_PATH_SUGGESTIONS[field.fhirMapping.resource].map((s) => (
                        <option key={s.path} value={s.path}>{s.label}</option>
                      ))}
                    </datalist>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data Type</label>
                  <select
                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                    value={field.fhirMapping?.type || "string"}
                    onChange={(e) => updateField(section.key, field.key, {
                      fhirMapping: { ...(field.fhirMapping || { resource: "", path: "" }), type: e.target.value as any },
                    })}
                  >
                    <option value="string">String</option>
                    <option value="date">Date</option>
                    <option value="datetime">DateTime</option>
                    <option value="code">Code</option>
                    <option value="quantity">Quantity</option>
                    <option value="boolean">Boolean</option>
                    <option value="reference">Reference</option>
                    <option value="address">Address</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Options (for select/radio/coded) */}
            {(field.type === "select" || field.type === "radio" || field.type === "coded" || field.type === "multiselect") && (
              <OptionsEditor
                options={(field.options || []) as any[]}
                onChange={(options) => updateField(section.key, field.key, { options: options as any })}
              />
            )}

            {/* Lookup config */}
            {field.type === "lookup" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">API Endpoint</label>
                  <input
                    className="w-full px-2 py-1.5 text-sm border rounded font-mono dark:bg-gray-700 dark:border-gray-600"
                    value={field.lookupConfig?.endpoint || ""}
                    onChange={(e) => updateField(section.key, field.key, {
                      lookupConfig: { ...(field.lookupConfig || { displayField: "name", valueField: "id" }), endpoint: e.target.value },
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Display Field</label>
                  <input
                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                    value={field.lookupConfig?.displayField || ""}
                    onChange={(e) => updateField(section.key, field.key, {
                      lookupConfig: { ...(field.lookupConfig || { endpoint: "", valueField: "id" }), displayField: e.target.value },
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Value Field</label>
                  <input
                    className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                    value={field.lookupConfig?.valueField || ""}
                    onChange={(e) => updateField(section.key, field.key, {
                      lookupConfig: { ...(field.lookupConfig || { endpoint: "", displayField: "name" }), valueField: e.target.value },
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + Tab Selector (hidden in single-page mode) */}
      {!hideTabSelector && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Field Configuration</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure the fields, FHIR mappings, and layout for each tab. Changes are saved per organization.
          </p>

          {/* Tab Selector */}
          <div className="flex flex-wrap gap-2">
            {availableTabs.map((tab) => (
              <button
                key={tab.tabKey}
                onClick={() => handleTabSelect(tab.tabKey)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedTab === tab.tabKey
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {tab.tabKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                <span className="ml-1 text-xs opacity-60">({tab.fhirResources.map((r: any) => typeof r === "string" ? r : r.type || r.resourceType || "?").join(", ")})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Field Config Editor */}
      {selectedTab && fieldConfig && (
        <>
          {/* FHIR Resources + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">FHIR Resources:</span>
              {fhirResources.map((r: any, i: number) => {
                const label = typeof r === "string" ? r : r.type || r.resourceType || "?";
                return (
                  <span key={label + i} className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    {label}
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setFieldConfigPreview(!fieldConfigPreview); setPreviewFormData({}); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {fieldConfigPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {fieldConfigPreview ? "Edit Mode" : "Preview"}
              </button>
              {!hideSaveButton && (
                <>
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview Mode */}
          {fieldConfigPreview && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-4 uppercase">Form Preview</h4>
              <DynamicFormRenderer
                fieldConfig={fieldConfig}
                formData={previewFormData}
                onChange={(key, value) => setPreviewFormData({ ...previewFormData, [key]: value })}
              />
            </div>
          )}

          {/* Edit Mode: Sections */}
          {!fieldConfigPreview && (
            <div className="space-y-4">
              {fieldConfig.sections.map((section, sectionIdx) => {
                const isExpanded = expandedSection === section.key;
                return (
                  <div key={section.key} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Section header */}
                    <div
                      className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                      onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{section.title}</span>
                      <span className="text-xs text-gray-400">{section.fields.length} fields | {section.columns || 3} cols</span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => moveSectionUp(sectionIdx)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ArrowUp className="w-3 h-3" /></button>
                        <button onClick={() => moveSectionDown(sectionIdx)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ArrowDown className="w-3 h-3" /></button>
                        <button onClick={() => removeSection(section.key)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>

                    {/* Section content */}
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {/* Section settings */}
                        <div className="grid grid-cols-4 gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Section Title</label>
                            <input
                              className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                              value={section.title}
                              onChange={(e) => updateSection(section.key, { title: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Columns</label>
                            <select
                              className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                              value={section.columns || 3}
                              onChange={(e) => updateSection(section.key, { columns: Number(e.target.value) })}
                            >
                              <option value={1}>1 column</option>
                              <option value={2}>2 columns</option>
                              <option value={3}>3 columns</option>
                              <option value={4}>4 columns</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <input
                              type="checkbox"
                              checked={!!section.collapsible}
                              onChange={(e) => updateSection(section.key, { collapsible: e.target.checked })}
                            />
                            <label className="text-xs text-gray-600">Collapsible</label>
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <input
                              type="checkbox"
                              checked={!!section.collapsed}
                              onChange={(e) => updateSection(section.key, { collapsed: e.target.checked })}
                            />
                            <label className="text-xs text-gray-600">Default Collapsed</label>
                          </div>
                        </div>

                        {/* Fields */}
                        <div className="space-y-2">
                          {section.fields.map((field, fieldIdx) => renderFieldEditor(section, field, fieldIdx))}
                        </div>

                        {/* Add field button */}
                        <button
                          onClick={() => addField(section.key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 w-full justify-center"
                        >
                          <Plus className="w-4 h-4" /> Add Field
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add section */}
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                  placeholder="New section title..."
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSection()}
                />
                <button
                  onClick={addSection}
                  disabled={!newSectionTitle.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* No tab selected */}
      {!selectedTab && !hideTabSelector && (
        <div className="text-center text-gray-400 py-12">
          Select a tab above to configure its fields.
        </div>
      )}
      <ConfirmDialog
        open={!!pendingConfirm}
        title={pendingConfirm?.title}
        message={pendingConfirm?.message || ""}
        confirmLabel="Confirm"
        onConfirm={() => { pendingConfirm?.onConfirm(); setPendingConfirm(null); }}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
