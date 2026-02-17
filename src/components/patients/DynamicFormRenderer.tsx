"use client";

import React, { useState, useCallback } from "react";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import TextArea from "@/components/form/input/TextArea";
import Checkbox from "@/components/form/input/Checkbox";
import Radio from "@/components/form/input/Radio";
import FileInput from "@/components/form/input/FileInput";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

// ---- Types ----

export interface FhirMapping {
  resource: string;
  path: string;
  type: "string" | "date" | "datetime" | "code" | "quantity" | "boolean" | "reference" | "address";
  loincCode?: string;
  unit?: string;
  system?: string;
}

export interface LookupConfig {
  endpoint: string;
  displayField: string;
  valueField: string;
  searchable?: boolean;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "radio" | "checkbox" | "boolean" | "date" | "datetime" | "phone" | "email" | "lookup" | "coded" | "quantity" | "file" | "group" | "computed" | "address";
  required?: boolean;
  colSpan?: number;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  lookupConfig?: LookupConfig;
  fhirMapping?: FhirMapping;
  validation?: FieldValidation;
  computeExpression?: string;
}

export interface SectionDef {
  key: string;
  title: string;
  columns?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: FieldDef[];
}

export interface FieldConfig {
  sections: SectionDef[];
}

export interface DynamicFormRendererProps {
  fieldConfig: FieldConfig;
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
  readOnly?: boolean;
  errors?: Record<string, string>;
}

// ---- Lookup Field Component ----

function LookupField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || "");

  const search = useCallback(
    async (q: string) => {
      if (!q || q.length < 2 || !field.lookupConfig) return;
      try {
        const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
        const res = await fetchWithAuth(`${base}${field.lookupConfig.endpoint}?search=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : data.data || data.content || []);
        }
      } catch {
        setResults([]);
      }
    },
    [field.lookupConfig]
  );

  if (readOnly) {
    return <span className="text-sm text-gray-700 dark:text-gray-300">{displayValue || "-"}</span>;
  }

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={field.placeholder || `Search ${field.label}...`}
        value={query || displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
          search(e.target.value);
        }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((item, idx) => {
            const display = item[field.lookupConfig!.displayField] || item.name || item.label;
            const val = item[field.lookupConfig!.valueField] || item.id;
            return (
              <button
                key={idx}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(val);
                  setDisplayValue(display);
                  setQuery("");
                  setShowDropdown(false);
                }}
              >
                {display}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Address Field Component ----

function AddressField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
}) {
  const addr = typeof value === "object" && value ? value : {};

  const update = (part: string, val: string) => {
    onChange({ ...addr, [part]: val });
  };

  if (readOnly) {
    const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
    return <span className="text-sm text-gray-700 dark:text-gray-300">{parts.join(", ") || "-"}</span>;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-3 sm:col-span-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Address Line 1</label>
        <input className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={addr.line1 || ""} onChange={(e) => update("line1", e.target.value)} />
      </div>
      <div className="col-span-3 sm:col-span-1">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Address Line 2</label>
        <input className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={addr.line2 || ""} onChange={(e) => update("line2", e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">City</label>
        <input className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={addr.city || ""} onChange={(e) => update("city", e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">State</label>
        <input className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={addr.state || ""} onChange={(e) => update("state", e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Zip Code</label>
        <input className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" value={addr.zip || ""} onChange={(e) => update("zip", e.target.value)} />
      </div>
    </div>
  );
}

// ---- Main DynamicFormRenderer ----

export default function DynamicFormRenderer({
  fieldConfig,
  formData,
  onChange,
  readOnly = false,
  errors = {},
}: DynamicFormRendererProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    fieldConfig.sections?.forEach((s) => {
      if (s.collapsed) initial.add(s.key);
    });
    return initial;
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderField = (field: FieldDef) => {
    const value = formData[field.key];
    const error = errors[field.key];

    if (field.type === "group") {
      return (
        <div key={field.key} className="col-span-full border-b border-gray-200 dark:border-gray-700 pb-1 pt-3">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">{field.label}</h4>
        </div>
      );
    }

    if (field.type === "computed") {
      return (
        <div key={field.key} className={`col-span-${field.colSpan || 1}`}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.label}</label>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {value != null ? value : "-"}
          </span>
        </div>
      );
    }

    if (field.type === "address") {
      return (
        <div key={field.key} className={`col-span-${field.colSpan || 3}`}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.label}</label>
          <AddressField field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
        </div>
      );
    }

    if (field.type === "lookup") {
      return (
        <div key={field.key} className={`col-span-${field.colSpan || 1}`}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <LookupField field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    return (
      <div key={field.key} className={`col-span-${field.colSpan || 1}`}>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        {readOnly ? (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {field.type === "select" || field.type === "coded"
              ? field.options?.find((o) => o.value === value)?.label || value || "-"
              : field.type === "checkbox" || field.type === "boolean"
              ? value ? "Yes" : "No"
              : value || "-"}
          </span>
        ) : (
          renderInput(field, value, error)
        )}
        {!readOnly && error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {!readOnly && field.helpText && <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>}
      </div>
    );
  };

  const renderInput = (field: FieldDef, value: any, error?: string) => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            type={field.type === "phone" ? "tel" : field.type}
            value={value || ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.key, e.target.value)}
            error={!!error}
          />
        );

      case "number":
      case "quantity":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value ? Number(e.target.value) : null)}
              error={!!error}
            />
            {field.fhirMapping?.unit && (
              <span className="text-xs text-gray-400 whitespace-nowrap">{field.fhirMapping.unit}</span>
            )}
          </div>
        );

      case "textarea":
        return (
          <TextArea
            value={value || ""}
            placeholder={field.placeholder}
            onChange={(val) => onChange(field.key, val)}
            rows={3}
            error={!!error}
          />
        );

      case "select":
      case "coded":
        return (
          <Select
            options={field.options || []}
            defaultValue={value || ""}
            onChange={(val) => onChange(field.key, val)}
          />
        );

      case "multiselect":
        return (
          <MultiSelect
            label={field.label}
            options={(field.options || []).map((o) => ({ value: o.value, text: o.label, selected: (value || []).includes(o.value) }))}
            onChange={(selected) => onChange(field.key, selected)}
          />
        );

      case "radio":
        return (
          <div className="flex gap-4 flex-wrap">
            {(field.options || []).map((opt) => (
              <Radio
                key={opt.value}
                id={`${field.key}-${opt.value}`}
                name={field.key}
                value={opt.value}
                label={opt.label}
                checked={value === opt.value}
                onChange={() => onChange(field.key, opt.value)}
              />
            ))}
          </div>
        );

      case "checkbox":
      case "boolean":
        return (
          <Checkbox
            checked={!!value}
            onChange={(checked) => onChange(field.key, checked)}
            label=""
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            error={!!error}
          />
        );

      case "datetime":
        return (
          <Input
            type="datetime-local"
            value={value || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            error={!!error}
          />
        );

      case "file":
        return (
          <FileInput onChange={(e) => onChange(field.key, e.target.files?.[0] || null)} />
        );

      default:
        return (
          <Input
            type="text"
            value={value || ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.key, e.target.value)}
            error={!!error}
          />
        );
    }
  };

  if (!fieldConfig?.sections?.length) {
    return <div className="text-gray-400 text-sm p-4">No field configuration available.</div>;
  }

  return (
    <div className="space-y-6">
      {fieldConfig.sections.map((section) => {
        const isCollapsed = collapsedSections.has(section.key);
        const cols = section.columns || 3;

        return (
          <div
            key={section.key}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Section Header */}
            <div
              className={`flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${
                section.collapsible ? "cursor-pointer select-none" : ""
              }`}
              onClick={() => section.collapsible && toggleSection(section.key)}
            >
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {section.title}
              </h3>
              {section.collapsible && (
                <span className="text-gray-400">
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              )}
            </div>

            {/* Section Fields */}
            {!isCollapsed && (
              <div
                className="p-4"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: "1rem",
                }}
              >
                {section.fields.map((field) => renderField(field))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
