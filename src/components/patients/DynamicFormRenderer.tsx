"use client";

import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import TextArea from "@/components/form/input/TextArea";
import Checkbox from "@/components/form/input/Checkbox";
import Radio from "@/components/form/input/Radio";
import Switch from "@/components/form/switch/Switch";
import FileInput from "@/components/form/input/FileInput";
import DateInput from "@/components/ui/DateInput";
import { ChevronDown, ChevronRight, Upload, FileText, X as XIcon } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { formatUSPhone } from "@/utils/validation";
import ProviderAvailabilityEditor from "@/components/settings/ProviderAvailabilityEditor";
import SystemAccessEditor from "@/components/settings/SystemAccessEditor";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/** Resolve a dot-notation or direct path on a possibly nested object */
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  if (path in obj) return obj[path];
  return path.split(".").reduce((cur: any, key: string) => cur?.[key], obj);
};

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

export interface FileConfig {
  uploadEndpoint: string;
  downloadEndpoint?: string;
  allowedTypes?: string[];
  maxSizeMB?: number;
  preview?: boolean;
  dragDrop?: boolean;
}

export interface RosSystemConfig {
  key: string;
  label: string;
  findings: string[];
}

export interface ExamSystemConfig {
  key: string;
  label: string;
  defaultNormal: string;
}

export interface DiagnosisConfig {
  codeSystem: string;
  searchEndpoint: string;
  allowMultiple: boolean;
}

export interface CodeLookupConfig {
  codeSystem: string;
  allowMultiple: boolean;
  showFee?: boolean;
  placeholder?: string;
}

export interface OptionsSource {
  endpoint: string;
  labelField: string;
  valueField: string;
}

export interface ShowWhenCondition {
  field: string;
  equals?: string | string[];
  notEquals?: string | string[];
}

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "radio" | "checkbox" | "boolean" | "toggle" | "date" | "datetime" | "phone" | "email" | "lookup" | "coded" | "quantity" | "file" | "group" | "computed" | "address" | "ros-grid" | "exam-grid" | "diagnosis-list" | "plan-items" | "code-lookup" | "combobox" | "family-history-list";
  required?: boolean;
  colSpan?: number;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  optionsSource?: OptionsSource;
  lookupConfig?: LookupConfig;
  /** When a lookup item is selected, auto-fill other form fields from the selected record.
   *  Keys are target form field keys, values are source property paths on the selected record. */
  autoFill?: Record<string, string>;
  fhirMapping?: FhirMapping;
  validation?: FieldValidation;
  computeExpression?: string;
  fileConfig?: FileConfig;
  badgeColors?: Record<string, string>;
  rosConfig?: { systems: RosSystemConfig[] };
  examConfig?: { systems: ExamSystemConfig[] };
  diagnosisConfig?: DiagnosisConfig;
  codeLookupConfig?: CodeLookupConfig;
  familyHistoryConfig?: {
    relationships: { value: string; label: string }[];
    fields?: { ageOfOnset?: boolean; deceased?: boolean; notes?: boolean };
  };
  showWhen?: ShowWhenCondition;
}

export interface SectionDef {
  key: string;
  title: string;
  columns?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  visible?: boolean;
  fields: FieldDef[];
  sectionComponent?: string;
  showWhen?: ShowWhenCondition;
}

export interface FieldConfigFeatures {
  fileUpload?: {
    enabled: boolean;
    dragDrop?: boolean;
    preview?: boolean;
    maxSizeMB?: number;
    allowedTypes?: string[];
    uploadEndpoint?: string;
    downloadEndpoint?: string;
  };
  rowLink?: {
    urlTemplate: string; // e.g. "/patients/{patientId}/encounters/{id}"
  };
}

export interface FieldConfig {
  sections: SectionDef[];
  features?: FieldConfigFeatures;
  singleton?: boolean;
}

export interface DynamicFormRendererProps {
  fieldConfig: FieldConfig;
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
  readOnly?: boolean;
  errors?: Record<string, string>;
  patientId?: number;
  onPreCreatedId?: (id: string) => void;
}

// ---- Combobox Field Component (select + free text, fixed positioning) ----

function ComboboxField({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const displayLabel = options.find((o) => o.value === value)?.label || value || "";

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Position dropdown using fixed coordinates from input bounding rect
  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  };

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-combobox-dropdown]") || target === inputRef.current) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        placeholder={placeholder}
        value={open ? search : displayLabel}
        onFocus={() => {
          updatePosition();
          setOpen(true);
          setSearch("");
        }}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && search) {
            const match = filtered.find((o) => o.label.toLowerCase() === search.toLowerCase());
            onChange(match ? match.value : search);
            setOpen(false);
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setSearch("");
          }
        }}
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      {open &&
        ReactDOM.createPortal(
          <div
            data-combobox-dropdown
            style={dropdownStyle}
            className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  opt.value === value
                    ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {opt.label}
              </button>
            ))}
            {search && !filtered.some((o) => o.label.toLowerCase() === search.toLowerCase()) && (
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 border-t border-gray-100 dark:border-gray-700"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(search);
                  setOpen(false);
                  setSearch("");
                }}
              >
                + Add &ldquo;{search}&rdquo;
              </button>
            )}
            {filtered.length === 0 && !search && (
              <div className="px-4 py-2.5 text-sm text-gray-400">No options</div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// ---- Lookup Field Component ----

function LookupField({
  field,
  value,
  onChange,
  onDisplayChange,
  onItemSelect,
  readOnly,
  displayLabel,
  formData: parentFormData,
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  onDisplayChange?: (display: string) => void;
  onItemSelect?: (item: Record<string, any>) => void;
  readOnly?: boolean;
  displayLabel?: string;
  formData?: Record<string, any>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayValue, setDisplayValue] = useState(displayLabel || value || "");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });

  // Update display value when displayLabel prop changes (e.g., after data reload)
  React.useEffect(() => {
    if (displayLabel) setDisplayValue(displayLabel);
  }, [displayLabel]);

  // Recalculate dropdown position when showing — auto-position above or below
  React.useEffect(() => {
    if (showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const dropHeight = Math.min(192, Math.max(results.length, 3) * 40);
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < dropHeight && rect.top > dropHeight) {
        // Position above the input
        setDropdownPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width });
      } else {
        // Position below the input
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
    }
  }, [showDropdown, results]);

  const fetchAll = useCallback(
    async () => {
      if (!field.lookupConfig?.endpoint) return;
      // If field depends on another field, check that the parent has a value
      const depKey = (field.lookupConfig as any).dependsOn;
      const depVal = depKey && parentFormData ? (parentFormData[depKey] || "") : "";
      if (depKey && !depVal) return; // Don't fetch if parent not selected
      const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
      const ep = field.lookupConfig.endpoint.startsWith("/") ? field.lookupConfig.endpoint : `/${field.lookupConfig.endpoint}`;
      const depParam = depKey && depVal ? `&${depKey}=${encodeURIComponent(depVal)}` : "";
      try {
        const res = await fetchWithAuth(`${base}${ep}?page=0&size=200${depParam}`);
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data) ? data
          : Array.isArray(data.data) ? data.data
          : Array.isArray(data.data?.content) ? data.data.content
          : Array.isArray(data.content) ? data.content
          : [];
        if (items.length > 0) setResults(items);
      } catch { /* ignore */ }
    },
    [field.lookupConfig, parentFormData]
  );

  const search = useCallback(
    async (q: string) => {
      if (!q || q.length < 1 || !field.lookupConfig?.endpoint) return;
      const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
      const ep = field.lookupConfig.endpoint.startsWith("/") ? field.lookupConfig.endpoint : `/${field.lookupConfig.endpoint}`;
      const eq = encodeURIComponent(q);
      // Try multiple query parameter patterns; use whichever returns results
      const urls = [
        `${base}${ep}?search=${eq}&size=200`,
        `${base}${ep}?q=${eq}&size=200`,
        `${base}${ep}?name=${eq}&size=200`,
      ];
      for (const url of urls) {
        try {
          const res = await fetchWithAuth(url);
          if (!res.ok) continue;
          const data = await res.json();
          const items = Array.isArray(data) ? data
            : Array.isArray(data.data) ? data.data
            : Array.isArray(data.data?.content) ? data.data.content
            : Array.isArray(data.content) ? data.content
            : [];
          if (items.length > 0) { setResults(items); return; }
        } catch { /* try next */ }
      }
      // If API search returned nothing, fetch all and let client-side filter narrow them
      if (results.length === 0) await fetchAll();
    },
    [field.lookupConfig, fetchAll, results.length]
  );

  // Check if field depends on another field that isn't filled yet
  const depKey = (field.lookupConfig as any)?.dependsOn;
  const depVal = depKey && parentFormData ? (parentFormData[depKey] || "") : "";
  const isDisabledByDep = !!depKey && !depVal;

  if (readOnly) {
    return <span className="text-sm text-gray-700 dark:text-gray-300">{displayValue || "-"}</span>;
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className={`w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDisabledByDep ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700" : ""}`}
        placeholder={isDisabledByDep ? `Select ${depKey?.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())} first` : (field.placeholder || `Search ${field.label}...`)}
        disabled={isDisabledByDep}
        value={query || displayValue}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          setDisplayValue("");
          setShowDropdown(true);
          if (val.length >= 1) {
            search(val);
          }
        }}
        onFocus={() => {
          setShowDropdown(true);
          if (results.length === 0) fetchAll();
        }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      {showDropdown && (() => {
        // Always filter client-side by query so typing narrows the list
        // regardless of whether the API supports server-side search
        const qLower = query.toLowerCase();
        const filteredResults = query
          ? results.filter(item => {
              const disp = String(
                item[field.lookupConfig!.displayField] ||
                (item.firstName && item.lastName ? `${item.firstName} ${item.lastName}` : "") ||
                item.firstName || item.lastName || item.name || item.label || item.display || ""
              ).toLowerCase();
              return disp.includes(qLower);
            })
          : results;
        return filteredResults.length > 0 && ReactDOM.createPortal(
        <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{ position: "fixed", top: dropdownPos.top, bottom: dropdownPos.bottom, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
        >
          {filteredResults.map((item, idx) => {
            const display = item[field.lookupConfig!.displayField] ||
              (item.firstName && item.lastName ? `${item.firstName} ${item.lastName}`.trim() : null) ||
              item.firstName || item.lastName || item.name || item.label || item.display;
            const val = item[field.lookupConfig!.valueField] || item.id;
            return (
              <button
                key={idx}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  // For FHIR reference fields, prefix the value with the TARGET resource type
                  let finalVal = val;
                  if (field.fhirMapping?.type === "reference" && val && !String(val).includes("/")) {
                    // Infer target resource type from the lookup endpoint (not the source resource)
                    const ep = (field.lookupConfig?.endpoint || "").toLowerCase();
                    const targetType = item._resourceType
                        || (ep.includes("provider") || ep.includes("practitioner") ? "Practitioner"
                        : ep.includes("patient") ? "Patient"
                        : ep.includes("location") ? "Location"
                        : ep.includes("organization") || ep.includes("insurance") ? "Organization"
                        : "");
                    if (targetType) finalVal = `${targetType}/${val}`;
                  }
                  onChange(finalVal);
                  setDisplayValue(display);
                  if (onDisplayChange) onDisplayChange(display);
                  if (onItemSelect) onItemSelect(item);
                  setQuery("");
                  setShowDropdown(false);
                }}
              >
                {display}
              </button>
            );
          })}
        </div>,
        document.body
        );
      })()}
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

// ---- File Upload Field Component ----

function FileUploadField({
  field,
  value,
  onChange,
  features,
  patientId,
  formData: parentFormData,
  onPreCreatedId,
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  features?: FieldConfigFeatures;
  patientId?: number;
  formData?: Record<string, any>;
  onPreCreatedId?: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileUploadConfig = features?.fileUpload;
  const fc = field.fileConfig;
  const allowedTypes = fc?.allowedTypes || fileUploadConfig?.allowedTypes || [];
  const maxSizeMB = fc?.maxSizeMB || fileUploadConfig?.maxSizeMB || 10;
  const enableDragDrop = fc?.dragDrop ?? fileUploadConfig?.dragDrop ?? false;
  const uploadEndpoint = fc?.uploadEndpoint || fileUploadConfig?.uploadEndpoint;

  const validateFile = (file: File): string | null => {
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Max size: ${maxSizeMB}MB`;
    }
    if (allowedTypes.length > 0) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedTypes.some((t) => ext === t || file.type.includes(t) || (t === "csv" && (file.type === "text/csv" || file.type === "application/vnd.ms-excel")))) {
        return `File type not allowed. Allowed: ${allowedTypes.join(", ")}`;
      }
    }
    return null;
  };

  const handleFile = async (file: File) => {
    setUploadError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    if (uploadEndpoint) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        // Include patientId and document metadata for document uploads
        if (patientId) {
          formData.append("patientId", String(patientId));
        }
        if (parentFormData) {
          const dto: Record<string, any> = {};
          for (const [k, v] of Object.entries(parentFormData)) {
            if (v != null && k !== field.key) dto[k] = v;
          }
          dto.fileName = file.name;
          formData.append("dto", JSON.stringify(dto));
        }
        const res = await fetchWithAuth(`${API_BASE()}${uploadEndpoint}`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          const fileUrl = data.fileUrl || data.url || data.id || data.fhirId;
          // If upload pre-created a FHIR document record, notify parent
          if (data.fhirId && onPreCreatedId) onPreCreatedId(String(data.fhirId));
          onChange(fileUrl);
          setFileName(file.name);
        } else {
          const err = await res.json().catch(() => null);
          setUploadError(err?.message || "Upload failed");
        }
      } catch {
        setUploadError("Upload failed");
      } finally {
        setUploading(false);
      }
    } else {
      // No upload endpoint — store the file name as the value
      onChange(file.name);
      setFileName(file.name);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    onChange(null);
    setFileName(null);
    setUploadError(null);
  };

  // Show current file
  if (value && !uploading) {
    const displayName = fileName || (typeof value === "string" ? value.split("/").pop() : "File attached");
    const fileUrl = typeof value === "string" ? value : "";
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(displayName || "") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(displayName || "") || /\.pdf$/i.test(fileUrl);
    const previewUrl = fileUrl.startsWith("http") ? fileUrl : fileUrl ? `${API_BASE()}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}` : "";

    return (
      <div className="space-y-2">
        {isImage && previewUrl && (
          <div className="relative group">
            <img src={previewUrl} alt={displayName || "Preview"} className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-600 object-contain bg-white dark:bg-gray-800" />
          </div>
        )}
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate flex-1">
              {displayName}
            </a>
          ) : (
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
              {displayName}
            </span>
          )}
          <button type="button" onClick={clearFile} className="p-1 text-gray-400 hover:text-red-500">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Drag & drop zone
  if (enableDragDrop) {
    return (
      <div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          onClick={() => document.getElementById(`file-${field.key}`)?.click()}
        >
          <Upload className="w-6 h-6 text-gray-400 mb-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {uploading ? "Uploading..." : "Drag & drop or click to upload"}
          </span>
          {allowedTypes.length > 0 && (
            <span className="text-xs text-gray-400 mt-1">
              {allowedTypes.join(", ")} (max {maxSizeMB}MB)
            </span>
          )}
          <input
            id={`file-${field.key}`}
            type="file"
            className="hidden"
            accept={allowedTypes.map((t) => t.includes("/") ? t : `.${t}`).join(",")}
            onChange={handleInputChange}
          />
        </div>
        {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
      </div>
    );
  }

  // Simple file input
  return (
    <div>
      <div className="flex items-center gap-2">
        <FileInput onChange={handleInputChange} />
        {uploading && <span className="text-xs text-gray-400">Uploading...</span>}
      </div>
      {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
    </div>
  );
}

// ---- ROS Grid Component ----

function RosGrid({
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
  const systems = field.rosConfig?.systems || [];
  const data: Record<string, Record<string, boolean | string>> = typeof value === "object" && value ? value : {};

  const updateFinding = (sysKey: string, finding: string, checked: boolean) => {
    const sys = { ...(data[sysKey] || {}) };
    sys[finding] = checked;
    onChange({ ...data, [sysKey]: sys });
  };

  const updateNote = (sysKey: string, note: string) => {
    const sys = { ...(data[sysKey] || {}) };
    sys.note = note;
    onChange({ ...data, [sysKey]: sys });
  };

  const setAllNegative = (sysKey: string) => {
    const sys: Record<string, boolean | string> = { note: (data[sysKey]?.note as string) || "" };
    const sysCfg = systems.find((s) => s.key === sysKey);
    sysCfg?.findings.forEach((f) => { sys[f] = false; });
    onChange({ ...data, [sysKey]: sys });
  };

  const setAllSystemsNegative = () => {
    const result: Record<string, Record<string, boolean | string>> = {};
    systems.forEach((sys) => {
      const entry: Record<string, boolean | string> = { note: "" };
      sys.findings.forEach((f) => { entry[f] = false; });
      result[sys.key] = entry;
    });
    onChange(result);
  };

  const humanize = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={setAllSystemsNegative}
            className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            All Systems Negative
          </button>
        </div>
      )}
      {systems.map((sys) => {
        const sysData = data[sys.key] || {};
        const hasPositive = sys.findings.some((f) => sysData[f] === true);
        return (
          <div key={sys.key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{sys.label}</span>
              <div className="flex items-center gap-2">
                {hasPositive && <span className="text-xs text-amber-600 font-medium">Positive</span>}
                {!hasPositive && Object.keys(sysData).length > 0 && <span className="text-xs text-green-600 font-medium">Negative</span>}
                {!readOnly && (
                  <button type="button" onClick={() => setAllNegative(sys.key)} className="text-xs text-blue-600 hover:underline">
                    Neg
                  </button>
                )}
              </div>
            </div>
            <div className="p-3">
              <div className="flex flex-wrap gap-3">
                {sys.findings.map((finding) => (
                  <label key={finding} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sysData[finding] === true}
                      onChange={(e) => updateFinding(sys.key, finding, e.target.checked)}
                      disabled={readOnly}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    {humanize(finding)}
                  </label>
                ))}
              </div>
              {(hasPositive || sysData.note) && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Additional notes..."
                    value={(sysData.note as string) || ""}
                    onChange={(e) => updateNote(sys.key, e.target.value)}
                    readOnly={readOnly}
                    className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Exam Grid Component ----

function ExamGrid({
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
  const systems = field.examConfig?.systems || [];
  const data: Record<string, { status: string; findings: string }> = typeof value === "object" && value ? value : {};

  const updateSystem = (sysKey: string, patch: Partial<{ status: string; findings: string }>) => {
    const current = data[sysKey] || { status: "normal", findings: "" };
    onChange({ ...data, [sysKey]: { ...current, ...patch } });
  };

  const setWnlAll = () => {
    const result: Record<string, { status: string; findings: string }> = {};
    systems.forEach((sys) => {
      result[sys.key] = { status: "normal", findings: sys.defaultNormal };
    });
    onChange(result);
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={setWnlAll}
            className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
          >
            WNL All
          </button>
        </div>
      )}
      {systems.map((sys) => {
        const entry = data[sys.key] || { status: "", findings: "" };
        const isNormal = entry.status === "normal";
        return (
          <div key={sys.key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{sys.label}</span>
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateSystem(sys.key, { status: "normal", findings: sys.defaultNormal })}
                    className={`px-2 py-0.5 text-xs rounded ${isNormal ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSystem(sys.key, { status: "abnormal", findings: "" })}
                    className={`px-2 py-0.5 text-xs rounded ${entry.status === "abnormal" ? "bg-amber-600 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                  >
                    Abnormal
                  </button>
                </div>
              )}
              {readOnly && entry.status && (
                <span className={`text-xs font-medium ${isNormal ? "text-green-600" : "text-amber-600"}`}>
                  {isNormal ? "Normal" : "Abnormal"}
                </span>
              )}
            </div>
            {entry.status && (
              <div className="p-3">
                <textarea
                  value={entry.findings}
                  onChange={(e) => updateSystem(sys.key, { findings: e.target.value })}
                  readOnly={readOnly}
                  rows={2}
                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
                  placeholder={isNormal ? sys.defaultNormal : "Describe abnormal findings..."}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Diagnosis List Component ----

function DiagnosisList({
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const items: Array<{ code: string; description: string; status: string; priority: string }> =
    Array.isArray(value) ? value : [];

  const searchCodes = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) { setSearchResults([]); return; }
      try {
        const codeSystem = field.diagnosisConfig?.codeSystem || "ICD10_CM";
        const codeTypeMap: Record<string, string> = { ICD10_CM: "ICD10", ICD10: "ICD10", ICD9: "ICD9" };
        const mappedCodeType = codeTypeMap[codeSystem] || codeSystem;
        const base = API_BASE();

        // Primary: ciyex-codes proxy
        const url = `${base}/api/app-proxy/ciyex-codes/api/codes/${codeSystem}/search?q=${encodeURIComponent(q)}&size=15`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const json = await res.json();
          const results = json.content || json.data || [];
          if (results.length > 0) { setSearchResults(results); return; }
        }

        // Fallback: global_codes search
        const fb = await fetchWithAuth(`${base}/api/global_codes/search?q=${encodeURIComponent(q)}&codeType=${mappedCodeType}`);
        if (fb.ok) {
          const fj = await fb.json();
          const fbResults = fj.data || fj.content || [];
          if (fbResults.length > 0) { setSearchResults(fbResults); return; }
        }

        // Second fallback: global_codes list + client filter
        const fb2 = await fetchWithAuth(`${base}/api/global_codes?codeType=${mappedCodeType}&page=0&size=50`);
        if (fb2.ok) {
          const fj2 = await fb2.json();
          const allCodes = fj2.data || fj2.content || [];
          const ql = q.toLowerCase();
          const filtered = allCodes.filter((c: any) =>
            (c.code || "").toLowerCase().includes(ql) ||
            (c.description || "").toLowerCase().includes(ql) ||
            (c.shortDescription || "").toLowerCase().includes(ql)
          );
          setSearchResults(filtered.slice(0, 15));
        }
      } catch { setSearchResults([]); }
    },
    [field.diagnosisConfig]
  );

  const addDiagnosis = (item: any) => {
    const code = item.code || item.codeValue || "";
    const desc = item.shortDescription || item.description || item.longDescription || "";
    if (items.some((d) => d.code === code)) return;
    const priority = items.length === 0 ? "Primary" : "Secondary";
    onChange([...items, { code, description: desc, status: "Active", priority }]);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeDiagnosis = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  };

  const updateDiagnosis = (idx: number, patch: Partial<typeof items[0]>) => {
    const next = items.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search ICD-10 codes..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); searchCodes(e.target.value); }}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addDiagnosis(item)}
                >
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {item.code || item.codeValue}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {item.shortDescription || item.description || item.longDescription}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-gray-400">No diagnoses added</p>
      ) : (
        <div className="space-y-2">
          {items.map((dx, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap min-w-[70px]">
                {dx.code}
              </span>
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{dx.description}</span>
              {!readOnly && (
                <>
                  <select
                    value={dx.priority}
                    onChange={(e) => updateDiagnosis(idx, { priority: e.target.value })}
                    className="text-xs border rounded px-1 py-0.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                  </select>
                  <select
                    value={dx.status}
                    onChange={(e) => updateDiagnosis(idx, { status: e.target.value })}
                    className="text-xs border rounded px-1 py-0.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <button type="button" onClick={() => removeDiagnosis(idx)} className="p-1 text-gray-400 hover:text-red-500">
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {readOnly && (
                <>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${dx.priority === "Primary" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{dx.priority}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${dx.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{dx.status}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Code Lookup Component (CPT, HCPCS, etc.) ----

function CodeLookup({
  field,
  value,
  onChange,
  readOnly,
  diagnoses,
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
  diagnoses?: Array<{ code: string; description: string; priority?: string; status?: string }>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const config = field.codeLookupConfig;
  const codeSystem = config?.codeSystem || "CPT";
  const items: Array<{ code: string; description: string; fee?: number; modifier?: string; units?: number; diagnosisPointers?: string[] }> =
    Array.isArray(value) ? value : [];
  const availableDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];

  const searchCodes = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) { setSearchResults([]); return; }
      // Map code system names to the format the global_codes API expects
      const codeTypeMap: Record<string, string> = { CPT: "CPT4", HCPCS: "HCPCS", ICD10: "ICD10", ICD9: "ICD9", CVX: "CVX" };
      const mappedCodeType = codeTypeMap[codeSystem] || codeSystem;
      try {
        const base = API_BASE();
        const url = `${base}/api/app-proxy/ciyex-codes/api/codes/${codeSystem}/search?q=${encodeURIComponent(q)}&size=15`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const json = await res.json();
          const results = json.content || json.data || [];
          if (results.length > 0) { setSearchResults(results); return; }
        }
        // Fallback: global_codes search endpoint (uses CPT4 format)
        const fb = await fetchWithAuth(`${base}/api/global_codes/search?q=${encodeURIComponent(q)}&codeType=${mappedCodeType}`);
        if (fb.ok) {
          const fj = await fb.json();
          const fbResults = fj.data || fj.content || [];
          if (fbResults.length > 0) { setSearchResults(fbResults); return; }
        }
        // Second fallback: global_codes list endpoint with search
        const fb2 = await fetchWithAuth(`${base}/api/global_codes?codeType=${mappedCodeType}&page=0&size=50`);
        if (fb2.ok) {
          const fj2 = await fb2.json();
          const allCodes = fj2.data || fj2.content || [];
          const ql = q.toLowerCase();
          const filtered = allCodes.filter((c: any) =>
            (c.code || "").toLowerCase().includes(ql) ||
            (c.description || "").toLowerCase().includes(ql) ||
            (c.shortDescription || "").toLowerCase().includes(ql)
          );
          setSearchResults(filtered.slice(0, 15));
        }
      } catch { setSearchResults([]); }
    },
    [codeSystem]
  );

  const addCode = (item: any) => {
    const code = item.code || "";
    if (items.some((c) => c.code === code)) return;
    onChange([...items, {
      code,
      description: item.shortDescription || item.longDescription || "",
      fee: item.medicareFee || undefined,
      modifier: "",
      units: 1,
    }]);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeCode = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const updateCode = (idx: number, patch: Partial<typeof items[0]>) => {
    onChange(items.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="relative">
          <input
            type="text"
            placeholder={config?.placeholder || `Search ${codeSystem} codes...`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); searchCodes(e.target.value); }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addCode(item)}
                >
                  <span className="font-mono text-xs font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                    {item.code}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                    {item.shortDescription || item.longDescription}
                  </span>
                  {item.medicareFee && (
                    <span className="text-xs text-gray-500 whitespace-nowrap">${Number(item.medicareFee).toFixed(2)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-gray-400">No {codeSystem} codes added</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const pointers = item.diagnosisPointers || [];
            const togglePointer = (dxCode: string) => {
              const next = pointers.includes(dxCode)
                ? pointers.filter((p) => p !== dxCode)
                : [...pointers, dxCode];
              updateCode(idx, { diagnosisPointers: next });
            };
            return (
              <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-green-600 dark:text-green-400 whitespace-nowrap min-w-[60px]">
                    {item.code}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{item.description}</span>
                  {!readOnly ? (
                    <>
                      <input
                        type="text"
                        value={item.modifier || ""}
                        onChange={(e) => updateCode(idx, { modifier: e.target.value })}
                        placeholder="Mod"
                        className="w-16 px-1.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                      />
                      <input
                        type="number"
                        value={item.units ?? 1}
                        onChange={(e) => updateCode(idx, { units: Number(e.target.value) || 1 })}
                        min={1}
                        className="w-14 px-1.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                      />
                      {item.fee && <span className="text-xs text-gray-500 whitespace-nowrap">${Number(item.fee).toFixed(2)}</span>}
                      <button type="button" onClick={() => removeCode(idx)} className="p-1 text-gray-400 hover:text-red-500">
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {item.modifier && <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">Mod: {item.modifier}</span>}
                      <span className="text-xs text-gray-500">×{item.units || 1}</span>
                      {item.fee && <span className="text-xs text-gray-500">${Number(item.fee).toFixed(2)}</span>}
                    </>
                  )}
                </div>
                {availableDiagnoses.length > 0 && (
                  <div className="flex items-center gap-1.5 pl-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Dx:</span>
                    {availableDiagnoses.map((dx, dxIdx) => {
                      const selected = pointers.includes(dx.code);
                      const label = String.fromCharCode(65 + dxIdx); // A, B, C, D...
                      return readOnly ? (
                        selected && (
                          <span key={dx.code} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" title={`${dx.code} - ${dx.description}`}>
                            {label}
                          </span>
                        )
                      ) : (
                        <button
                          key={dx.code}
                          type="button"
                          onClick={() => togglePointer(dx.code)}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            selected
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                          title={`${dx.code} - ${dx.description}`}
                        >
                          {label}: {dx.code}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Single Code Search Component (for "coded" fields with fhirMapping.system) ----

const FHIR_SYSTEM_TO_CODE_SYSTEM: Record<string, string> = {
  "http://hl7.org/fhir/sid/icd-10-cm": "ICD10_CM",
  "http://loinc.org": "LOINC",
  "http://hl7.org/fhir/sid/cvx": "CVX",
  "http://www.ama-assn.org/go/cpt": "CPT",
  "http://snomed.info/sct": "SNOMED_CT",
  "http://www.nlm.nih.gov/research/umls/rxnorm": "RXNORM",
  "http://hl7.org/fhir/sid/ndc": "NDC",
  "http://www.ada.org/cdt": "CDT",
  "https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets": "HCPCS",
};

// Fallback CVX codes when the ciyex-codes API has no CVX data loaded
const FALLBACK_CVX_CODES: { code: string; shortDescription: string }[] = [
  { code: "03", shortDescription: "MMR (Measles, Mumps, Rubella)" },
  { code: "08", shortDescription: "Hepatitis B, adolescent or pediatric" },
  { code: "10", shortDescription: "IPV (Poliovirus, inactivated)" },
  { code: "17", shortDescription: "HIB (Haemophilus influenzae type b)" },
  { code: "20", shortDescription: "DTaP" },
  { code: "21", shortDescription: "Varicella (Chickenpox)" },
  { code: "33", shortDescription: "Pneumococcal polysaccharide (PPV23)" },
  { code: "43", shortDescription: "Hepatitis B, adult" },
  { code: "49", shortDescription: "Hib (PRP-OMP)" },
  { code: "62", shortDescription: "HPV, bivalent" },
  { code: "83", shortDescription: "Hepatitis A, pediatric/adolescent" },
  { code: "88", shortDescription: "Flu, unspecified" },
  { code: "94", shortDescription: "MMR-Varicella (MMRV)" },
  { code: "100", shortDescription: "Pneumococcal conjugate (PCV7)" },
  { code: "110", shortDescription: "DTaP-Hepatitis B-IPV" },
  { code: "113", shortDescription: "Td, adult" },
  { code: "114", shortDescription: "Meningococcal MCV4P" },
  { code: "115", shortDescription: "Tdap" },
  { code: "116", shortDescription: "Rotavirus, pentavalent" },
  { code: "121", shortDescription: "Zoster (shingles), live" },
  { code: "133", shortDescription: "PCV13 (Pneumococcal conjugate)" },
  { code: "135", shortDescription: "Influenza, high dose" },
  { code: "140", shortDescription: "Influenza, seasonal, injectable" },
  { code: "150", shortDescription: "Influenza, injectable, quadrivalent" },
  { code: "158", shortDescription: "Influenza, injectable, quadrivalent, preservative free" },
  { code: "162", shortDescription: "Meningococcal B, recombinant" },
  { code: "165", shortDescription: "HPV9 (Human Papillomavirus 9-valent)" },
  { code: "176", shortDescription: "COVID-19 Pfizer-BioNTech" },
  { code: "207", shortDescription: "COVID-19 Moderna" },
  { code: "210", shortDescription: "COVID-19 Janssen (Johnson & Johnson)" },
  { code: "212", shortDescription: "COVID-19 Novavax" },
  { code: "228", shortDescription: "Zoster (shingles), recombinant (Shingrix)" },
];

function CodedField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: FieldDef;
  value: any;
  onChange: (val: string) => void;
  readOnly?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(value || "");
  const justSelected = React.useRef(false);

  const fhirSystem = field.fhirMapping?.system || "";
  const codeSystem = FHIR_SYSTEM_TO_CODE_SYSTEM[fhirSystem] || "ICD10_CM";

  useEffect(() => {
    // Don't overwrite the rich label when we just selected a code
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    setDisplayLabel(value || "");
  }, [value]);

  const searchCodes = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) { setSearchResults([]); return; }
      try {
        const base = API_BASE();
        const url = `${base}/api/app-proxy/ciyex-codes/api/codes/${codeSystem}/search?q=${encodeURIComponent(q)}&size=15`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const json = await res.json();
          const results = json.content || [];
          if (results.length > 0) {
            setSearchResults(results);
            return;
          }
        }
      } catch { /* fall through to fallback */ }
      // Fallback: for CVX codes, use local data when API returns empty
      if (codeSystem === "CVX") {
        const lq = q.toLowerCase();
        const fallback = FALLBACK_CVX_CODES.filter(
          (c) => c.code.includes(lq) || c.shortDescription.toLowerCase().includes(lq)
        ).slice(0, 15);
        setSearchResults(fallback);
      } else {
        // Fallback: try global_codes search endpoint for non-CVX code systems
        try {
          const base = API_BASE();
          const fb = await fetchWithAuth(`${base}/api/global_codes/search?q=${encodeURIComponent(q)}&codeType=${codeSystem}`);
          if (fb.ok) { const fj = await fb.json(); setSearchResults(fj.data || fj.content || []); }
          else setSearchResults([]);
        } catch { setSearchResults([]); }
      }
    },
    [codeSystem]
  );

  const selectCode = (item: any) => {
    const code = item.code || item.codeValue || "";
    const desc = item.shortDescription || item.description || item.longDescription || "";
    justSelected.current = true;
    setDisplayLabel(`${code} - ${desc}`);
    onChange(code);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const clearCode = () => {
    onChange("");
    setDisplayLabel("");
    setSearchQuery("");
  };

  if (readOnly) {
    return (
      <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
        {displayLabel || <span className="text-gray-400">-</span>}
      </div>
    );
  }

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  React.useEffect(() => {
    if (showSearch && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [showSearch, searchResults]);

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{value}</span>
          <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{displayLabel.replace(`${value} - `, "")}</span>
          <button type="button" onClick={clearCode} className="p-0.5 text-gray-400 hover:text-red-500">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          placeholder={`Search ${codeSystem.replace(/_/g, "-")} codes...`}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); searchCodes(e.target.value); }}
          onFocus={() => setShowSearch(true)}
          onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      )}
      {showSearch && searchResults.length > 0 && ReactDOM.createPortal(
        <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
        >
          {searchResults.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectCode(item)}
            >
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {item.code || item.codeValue}
              </span>
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {item.shortDescription || item.description || item.longDescription}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ---- Plan Items Component ----

function PlanItems({
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
  const items: Array<{ type: string; description: string; notes: string }> =
    Array.isArray(value) ? value : [];

  const addItem = () => {
    onChange([...items, { type: "other", description: "", notes: "" }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, patch: Partial<typeof items[0]>) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const typeOptions = [
    { value: "medication", label: "Medication" },
    { value: "procedure", label: "Procedure" },
    { value: "lab", label: "Lab Order" },
    { value: "referral", label: "Referral" },
    { value: "follow-up", label: "Follow-up" },
    { value: "other", label: "Other" },
  ];

  const typeColors: Record<string, string> = {
    medication: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    procedure: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    lab: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    referral: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "follow-up": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    other: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          {readOnly ? (
            <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${typeColors[item.type] || typeColors.other}`}>
              {typeOptions.find((o) => o.value === item.type)?.label || item.type}
            </span>
          ) : (
            <select
              value={item.type}
              onChange={(e) => updateItem(idx, { type: e.target.value })}
              className="text-xs border rounded px-1.5 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[100px]"
            >
              {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <div className="flex-1 space-y-1">
            {readOnly ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">{item.description || "-"}</p>
            ) : (
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
                placeholder="Description..."
                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            )}
            {(item.notes || !readOnly) && (
              readOnly ? (
                item.notes ? <p className="text-xs text-gray-500">{item.notes}</p> : null
              ) : (
                <input
                  type="text"
                  value={item.notes}
                  onChange={(e) => updateItem(idx, { notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              )
            )}
          </div>
          {!readOnly && (
            <button type="button" onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500 mt-0.5">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add Plan Item
        </button>
      )}
      {readOnly && items.length === 0 && <p className="text-xs text-gray-400">No plan items</p>}
    </div>
  );
}

// ---- Family History List Component ----

const DEFAULT_RELATIONSHIP_OPTIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "maternal_grandmother", label: "Maternal Grandmother" },
  { value: "maternal_grandfather", label: "Maternal Grandfather" },
  { value: "paternal_grandmother", label: "Paternal Grandmother" },
  { value: "paternal_grandfather", label: "Paternal Grandfather" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "other", label: "Other" },
];

function FamilyHistoryList({
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
  const config = field.familyHistoryConfig;
  const relationshipOptions = config?.relationships?.length ? config.relationships : DEFAULT_RELATIONSHIP_OPTIONS;
  const showAgeOfOnset = config?.fields?.ageOfOnset !== false;
  const showDeceased = config?.fields?.deceased !== false;
  const showNotes = config?.fields?.notes !== false;

  const items: Array<{
    relationship: string;
    condition: string;
    ageOfOnset: string;
    deceased: boolean;
    notes: string;
  }> = Array.isArray(value) ? value : [];

  const addItem = () => {
    onChange([...items, { relationship: relationshipOptions[0]?.value || "other", condition: "", ageOfOnset: "", deceased: false, notes: "" }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, patch: Partial<(typeof items)[0]>) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          {readOnly ? (
            <div className="flex flex-wrap items-start gap-2">
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 whitespace-nowrap shrink-0">
                {relationshipOptions.find((o) => o.value === item.relationship)?.label || item.relationship}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.condition || "—"}</span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {showAgeOfOnset && item.ageOfOnset && <span className="text-xs text-gray-500">Onset: {item.ageOfOnset}</span>}
                  {showDeceased && item.deceased && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Deceased</span>}
                  {showNotes && item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={item.relationship}
                  onChange={(e) => updateItem(idx, { relationship: e.target.value })}
                  className="text-xs border rounded px-1.5 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[160px]"
                >
                  {relationshipOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={item.condition}
                  onChange={(e) => updateItem(idx, { condition: e.target.value })}
                  placeholder="Condition (e.g., Diabetes, Heart Disease)..."
                  className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 pl-1">
                {showAgeOfOnset && (
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500">Age of onset:</label>
                    <input
                      type="text"
                      value={item.ageOfOnset}
                      onChange={(e) => updateItem(idx, { ageOfOnset: e.target.value })}
                      placeholder="e.g., 45"
                      className="w-20 px-2 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}
                {showDeceased && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.deceased}
                      onChange={(e) => updateItem(idx, { deceased: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Deceased
                  </label>
                )}
                {showNotes && (
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(idx, { notes: e.target.value })}
                    placeholder="Notes (optional)..."
                    className="flex-1 px-2 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add Family Member
        </button>
      )}
      {readOnly && items.length === 0 && <p className="text-xs text-gray-400">No family history recorded</p>}
    </div>
  );
}

// ---- Dynamic Options Select (fetches options from API) ----

function DynamicOptionsSelect({
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
  const [options, setOptions] = useState<{ value: string; label: string }[]>(field.options || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!field.optionsSource) return;
    const src = field.optionsSource;
    setLoading(true);
    const base = API_BASE();
    fetchWithAuth(`${base}${src.endpoint}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const items = Array.isArray(data) ? data : data.data || data.content || [];
        const mapped = items
          .filter((item: any) => item.activity !== 0)
          .map((item: any) => ({
            value: String(item[src.valueField] || item.id || ""),
            label: String(item[src.labelField] || item.title || ""),
          }));
        // Merge: API options first, then any static options not already present
        const apiValues = new Set(mapped.map((o: any) => o.value));
        const staticExtras = (field.options || []).filter((o) => !apiValues.has(o.value));
        setOptions([...mapped, ...staticExtras]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [field.optionsSource?.endpoint]);

  if (readOnly) {
    const display = options.find((o) => o.value === value)?.label || value || "-";
    return <span className="text-sm text-gray-700 dark:text-gray-300">{display}</span>;
  }

  if (field.type === "combobox") {
    return (
      <ComboboxField
        options={options}
        value={value || ""}
        placeholder={loading ? "Loading..." : field.placeholder || "Select or type..."}
        onChange={onChange}
      />
    );
  }

  return (
    <Select
      options={options}
      defaultValue={value || ""}
      onChange={onChange}
    />
  );
}

// ---- Main DynamicFormRenderer ----

export default function DynamicFormRenderer({
  fieldConfig,
  formData,
  onChange,
  readOnly = false,
  errors = {},
  patientId,
  onPreCreatedId,
}: DynamicFormRendererProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set<string>()
  );

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderField = (field: FieldDef) => {
    if (!evaluateShowWhen(field.showWhen)) return null;
    // Hidden fields are not rendered at all
    if (field.type === "hidden") return null;
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
      let computedValue = value;
      // Auto-calculate BMI from weight and height fields in formData
      if (/bmi/i.test(field.key) || /body.?mass/i.test(field.label || "")) {
        // Search all formData keys for weight and height values (flexible matching)
        const findValue = (patterns: RegExp[]): string => {
          for (const pattern of patterns) {
            for (const [k, v] of Object.entries(formData)) {
              if (pattern.test(k) && v != null && String(v).trim() !== "") return String(v);
            }
          }
          return "";
        };
        const weightPatterns = [/^weightKg$/i, /^weight$/i, /^weightLbs$/i, /weight/i];
        const heightPatterns = [/^heightCm$/i, /^height$/i, /^heightIn$/i, /height/i];
        const w = parseFloat(findValue(weightPatterns));
        const h = parseFloat(findValue(heightPatterns));
        if (w > 0 && h > 0) {
          // Detect unit system from field keys or unit fields
          const weightKey = Object.keys(formData).find(k => /weight/i.test(k) && !/unit|bmi/i.test(k)) || "";
          const heightKey = Object.keys(formData).find(k => /height/i.test(k) && !/unit|bmi/i.test(k)) || "";
          const isLbs = /lbs|pounds|lb/i.test(weightKey) || /lbs|pounds/i.test(String(formData.weightUnit ?? formData.unit ?? ""));
          const isInches = /in\b|inches/i.test(heightKey) || /in\b|inches/i.test(String(formData.heightUnit ?? formData.unit ?? ""));
          const weightKg = isLbs ? w * 0.453592 : w;
          const heightM = isInches ? h * 0.0254 : h / 100;
          if (heightM > 0) {
            computedValue = (weightKg / (heightM * heightM)).toFixed(1);
            // Persist the computed value back to formData
            if (String(formData[field.key]) !== computedValue) {
              setTimeout(() => onChange(field.key, computedValue), 0);
            }
          }
        }
      }
      // Evaluate generic computeExpression if present and no special handler matched
      if (computedValue == null && field.computeExpression) {
        try {
          const expr = field.computeExpression.replace(/\{(\w+)\}/g, (_: string, k: string) => {
            const v = formData[k];
            return v != null ? String(v) : "0";
          });
          computedValue = new Function(`return (${expr})`)();
          if (typeof computedValue === "number") computedValue = computedValue.toFixed(1);
          if (String(formData[field.key]) !== String(computedValue)) {
            setTimeout(() => onChange(field.key, computedValue), 0);
          }
        } catch { /* ignore invalid expressions */ }
      }
      const isBmiField = /bmi/i.test(field.key) || /body.?mass/i.test(field.label || "");
      const bmiVal = isBmiField ? parseFloat(String(computedValue)) : NaN;
      const bmiStatus = !isNaN(bmiVal) ? (bmiVal < 18.5 ? { label: "Underweight", color: "text-blue-600" } : bmiVal < 25 ? { label: "Normal", color: "text-green-600" } : bmiVal < 30 ? { label: "Overweight", color: "text-amber-600" } : { label: "Obese", color: "text-red-600" }) : null;
      const hasComputedValue = computedValue != null && computedValue !== "" && computedValue !== "0";
      return (
        <div key={field.key} className={`col-span-${field.colSpan || 1}`}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.label}</label>
          {hasComputedValue ? (
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {computedValue}
              {bmiStatus && <span className={`ml-2 text-xs font-medium ${bmiStatus.color}`}>({bmiStatus.label})</span>}
            </span>
          ) : readOnly ? (
            <span className="text-sm text-gray-400">{isBmiField ? "Enter weight & height to calculate" : "-"}</span>
          ) : (
            <input
              type="number"
              step="0.1"
              value={value || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={isBmiField ? "Auto-calculated or enter manually" : "Enter value"}
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
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

    if (field.type === "ros-grid") {
      return (
        <div key={field.key} className="col-span-full">
          <RosGrid field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
        </div>
      );
    }

    if (field.type === "exam-grid") {
      return (
        <div key={field.key} className="col-span-full">
          <ExamGrid field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
        </div>
      );
    }

    if (field.type === "diagnosis-list") {
      return (
        <div key={field.key} className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <DiagnosisList field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
        </div>
      );
    }

    if (field.type === "plan-items") {
      return (
        <div key={field.key} className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label}
          </label>
          <PlanItems field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
        </div>
      );
    }

    if (field.type === "family-history-list") {
      return (
        <div key={field.key} className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label}
          </label>
          <FamilyHistoryList field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
        </div>
      );
    }

    if (field.type === "code-lookup") {
      const dxList = formData["assessment_diagnoses"];
      return (
        <div key={field.key} className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <CodeLookup field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} diagnoses={Array.isArray(dxList) ? dxList : undefined} />
        </div>
      );
    }

    if (field.type === "lookup") {
      return (
        <div key={field.key} className={`col-span-${field.colSpan || 1}`}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <LookupField field={field} value={value} onChange={(v) => onChange(field.key, v)} onDisplayChange={(d) => onChange(field.key + "Display", d)} onItemSelect={field.autoFill ? (item) => {
            for (const [targetKey, sourceKey] of Object.entries(field.autoFill!)) {
              const sourceValue = getNestedValue(item, sourceKey);
              if (sourceValue !== undefined) {
                onChange(targetKey, sourceValue);
              }
            }
          } : undefined} readOnly={readOnly || !!(field as any).readOnly} displayLabel={formData[field.key + "Display"] || (readOnly || (field as any).readOnly ? value : undefined)} formData={formData} />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    // Reference fields with a lookupConfig use LookupField; without one, fall through to text input
    if (field.fhirMapping?.type === "reference" && field.lookupConfig) {
      return (
        <div key={field.key} className={`col-span-${field.colSpan || 1}`}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <LookupField field={field} value={value} onChange={(v) => onChange(field.key, v)} onDisplayChange={(d) => onChange(field.key + "Display", d)} onItemSelect={field.autoFill ? (item) => {
            for (const [targetKey, sourceKey] of Object.entries(field.autoFill!)) {
              const sourceValue = getNestedValue(item, sourceKey);
              if (sourceValue !== undefined) {
                onChange(targetKey, sourceValue);
              }
            }
          } : undefined} readOnly={readOnly || !!(field as any).readOnly} displayLabel={formData[field.key + "Display"] || (readOnly || (field as any).readOnly ? value : undefined)} formData={formData} />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    return (
      <div key={field.key} className={`col-span-${field.colSpan || 1}`}>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        {(readOnly || !!(field as any).readOnly) ? (
          field.type === "file" && value ? (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {typeof value === "string" ? value.split("/").pop() : "File attached"}
              </span>
            </div>
          ) : (field.type === "select" || field.type === "coded" || field.type === "combobox") && field.optionsSource ? (
            <DynamicOptionsSelect field={field} value={value} onChange={() => {}} readOnly />
          ) : /photo|image|avatar|picture|pic$|img$|imgurl/i.test(field.key) && typeof value === "string" && value.trim() ? (
            <div className="flex flex-col gap-1.5">
              <img
                src={value}
                alt="Patient photo"
                className="w-24 h-24 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                View photo
              </a>
            </div>
          ) : (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {field.type === "select" || field.type === "coded" || field.type === "combobox"
                ? field.options?.find((o) => o.value === value)?.label || value || "-"
                : field.type === "checkbox" || field.type === "boolean" || field.type === "toggle"
                ? value ? "Yes" : "No"
                : field.fhirMapping?.type === "reference"
                ? formData[field.key + "Display"] || value || "-"
                : (/photo|image|avatar|picture|pic$|img$|imgurl/i.test(field.key) && typeof value === "string" && (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(value)))
                ? <img src={value} alt="Profile" className="w-10 h-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : (/^(url|externalUrl|videoUrl|articleUrl|link|resourceUrl|website|websiteUrl|web_url)$/i.test(field.key) && typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://")))
                ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{value}</a>
                : value || "-"}
            </span>
          )
        ) : field.type === "date" ? (() => {
          // For date fields, compute min/max constraints based on related date fields
          const dateValue = Array.isArray(value) && value.length >= 3
            ? `${value[0]}-${String(value[1]).padStart(2, "0")}-${String(value[2]).padStart(2, "0")}`
            : typeof value === "string" && value.includes("T") ? value.split("T")[0] : (value || "");
          const toISODate = (v: any): string | undefined => {
            if (!v) return undefined;
            // Handle Java date arrays [year, month, day, ...]
            if (Array.isArray(v) && v.length >= 3) {
              const [y, m, d] = v as number[];
              return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            }
            const s = typeof v === "string" ? v : String(v);
            // Already YYYY-MM-DD or ISO datetime
            if (s.includes("T")) return s.split("T")[0];
            // Handle MM/DD/YYYY display format → convert to YYYY-MM-DD
            const mmddyyyy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (mmddyyyy) return `${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`;
            // Handle DD-MM-YYYY display format → convert to YYYY-MM-DD (legacy)
            const ddmmyyyy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
            return s;
          };
          // Detect end-date and onset-date fields by key OR label
          const fieldLabel = (field.label || "").toLowerCase();
          const isEndDateKey =
            /end.*date|^end$|enddate|endtime|resolv|abate|conclus/i.test(field.key) ||
            /end\s*date|end\s*time|resolv|abate/i.test(fieldLabel) ||
            /^(serviceTo|serviceToDate|serviceDateTo|billablePeriodEnd|serviceEndDate)$/i.test(field.key) ||
            /service\s*to|service\s*end/i.test(fieldLabel);
          const isOnsetKey =
            /onset.*date|^onset$|onset.*time|start.*date|^recorded|^identified/i.test(field.key) ||
            /onset|start\s*date/i.test(fieldLabel);

          // Dynamically find onset date from formData (any key containing "onset" or "start")
          const findDateInFormData = (patterns: RegExp[]): string | undefined => {
            // Check exact known keys first
            const knownOnset = ["onsetDate", "onset", "onsetDateTime", "onsetTime", "startDate", "recordedDate", "identifiedDate", "appointmentStartDate", "appointmentStart", "scheduledStart", "serviceFrom", "serviceFromDate", "serviceDateFrom", "billablePeriodStart", "serviceStartDate"];
            const knownEnd = ["endDate", "end", "endDateTime", "resolvedDate", "abatementDate", "conclusionDate", "appointmentEndDate", "appointmentEnd", "scheduledEnd", "serviceTo", "serviceToDate", "serviceDateTo", "billablePeriodEnd", "serviceEndDate"];
            const keys = patterns.some(p => p.source.includes("onset") || p.source.includes("start") || p.source.includes("record"))
              ? knownOnset : knownEnd;
            for (const k of keys) {
              const d = toISODate(formData[k]);
              if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
            }
            // Fallback: scan all formData keys matching any pattern
            for (const k of Object.keys(formData)) {
              if (patterns.some(p => p.test(k)) && formData[k]) {
                const d = toISODate(formData[k]);
                if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
              }
            }
            return undefined;
          };

          const isDobField = /^(dateOfBirth|dob|birthDate|birthdate|birth_date|date_of_birth|ptDob|patientDob)$/i.test(field.key);
          const todayStr = new Date().toISOString().slice(0, 10);
          const minDate = isEndDateKey
            ? findDateInFormData([/onset/i, /start/i, /recorded/i, /identified/i])
            : undefined;
          const maxDate = isDobField
            ? todayStr
            : isOnsetKey
              ? findDateInFormData([/end/i, /resolv/i, /abate/i, /conclus/i])
              : undefined;
          return (
            <DateInput
              value={dateValue}
              onChange={(e) => onChange(field.key, e.target.value)}
              min={minDate}
              max={maxDate}
              className={`h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? "border-red-500 text-red-900" : "border-gray-300 dark:border-gray-600 bg-transparent text-gray-800 dark:text-white/90"}`}
            />
          );
        })() : (
          renderInput(field, value, error)
        )}
        {!readOnly && !(field as any).readOnly && error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {!readOnly && !(field as any).readOnly && field.helpText && <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>}
      </div>
    );
  };

  const renderInput = (field: FieldDef, value: any, error?: string) => {
    switch (field.type) {
      case "text":
      case "email": {
        const isPhotoTextKey = /photo|image|avatar|picture/i.test(field.key) || /^(photoUrl|imageUrl|avatarUrl|profilePhoto|profileImage|photo_url|image_url|avatar_url|profile_photo|profile_image|profile_picture|photo[-_]?url|profile[-_]?photo|patientPhoto|profilePicture)$/i.test(field.key);
        if (isPhotoTextKey) {
          const hasUrl = typeof value === "string" && (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:image"));
          return (
            <div className="space-y-2">
              {hasUrl && (
                <img src={value} alt="Patient photo" className="w-24 h-24 rounded-lg object-cover border border-gray-200 dark:border-gray-600" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <Input
                type="text"
                value={value ?? ""}
                placeholder={field.placeholder || "Enter image URL"}
                onChange={(e) => onChange(field.key, e.target.value)}
                error={!!error}
              />
            </div>
          );
        }
        const ssnKeys = ["ssn", "ptssn", "socialSecurityNumber", "guarantorSsn", "guarantor_ssn"];
        const isSsn = ssnKeys.includes(field.key);
        const groupNumberKeys = ["groupNumber", "group_number", "groupNo", "group"];
        const isGroupNumber = groupNumberKeys.includes(field.key);
        const memberIdKeys = ["memberId", "memberNumber", "subscriberId", "idNo", "policyNumber", "policyNo", "member_id", "policy_number"];
        const isMemberId = memberIdKeys.includes(field.key);
        return (
          <Input
            type={field.type}
            value={value || ""}
            placeholder={field.placeholder}
            onChange={(e) => {
              if (isSsn) {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                onChange(field.key, digits);
              } else if (isGroupNumber || isMemberId) {
                const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                onChange(field.key, filtered);
              } else {
                onChange(field.key, e.target.value);
              }
            }}
            maxLength={isSsn ? 9 : (field as any).maxLength}
            error={!!error}
          />
        );
      }
      case "phone":
        return (
          <Input
            type="tel"
            value={value || ""}
            placeholder={field.placeholder || "(xxx) xxx-xxxx"}
            onChange={(e) => onChange(field.key, formatUSPhone(e.target.value))}
            error={!!error}
            maxLength={14}
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
              onKeyDown={(e: React.KeyboardEvent) => { if (["e", "E", "+"].includes(e.key)) e.preventDefault(); }}
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

      case "coded":
        // If the field has a FHIR system mapping, use the searchable CodedField component
        if (field.fhirMapping?.system && FHIR_SYSTEM_TO_CODE_SYSTEM[field.fhirMapping.system]) {
          return (
            <CodedField
              field={field}
              value={value}
              onChange={(val) => onChange(field.key, val)}
              readOnly={readOnly}
            />
          );
        }
        // Fall through to regular select for coded fields without a known code system
        if (field.optionsSource) {
          return (
            <DynamicOptionsSelect
              field={field}
              value={value}
              onChange={(val) => onChange(field.key, val)}
            />
          );
        }
        return (
          <Select
            options={(field.options || []).map((o: any) =>
              typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label }
            )}
            defaultValue={value || ""}
            onChange={(val) => onChange(field.key, val)}
          />
        );

      case "select":
        if (field.optionsSource) {
          return (
            <DynamicOptionsSelect
              field={field}
              value={value}
              onChange={(val) => onChange(field.key, val)}
            />
          );
        }
        // Normalize options: support both string[] and {label, value}[] formats
        const normalizedOptions = (field.options || []).map((o: any) =>
          typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label }
        );
        return (
          <Select
            options={normalizedOptions}
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

      case "toggle":
        return (
          <Switch
            label=""
            defaultChecked={!!value}
            onChange={(checked) => onChange(field.key, checked)}
          />
        );

      case "color":
        return (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value || "#3b82f6"}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
            />
            <Input
              type="text"
              value={value || ""}
              placeholder="#3b82f6"
              onChange={(e) => onChange(field.key, e.target.value)}
              error={!!error}
            />
          </div>
        );

      case "combobox":
        if (field.optionsSource) {
          return (
            <DynamicOptionsSelect
              field={field}
              value={value}
              onChange={(val) => onChange(field.key, val)}
            />
          );
        }
        return (
          <ComboboxField
            options={field.options || []}
            value={value || ""}
            placeholder={field.placeholder || "Select or type..."}
            onChange={(val) => onChange(field.key, val)}
          />
        );

      case "date": {
        // Strip time portion from FHIR datetime strings (e.g. "2025-04-10T16:11:23+00:00" → "2025-04-10")
        const dateValue = typeof value === "string" && value.includes("T") ? value.split("T")[0] : (value || "");
        const isDob = /^(dateOfBirth|dob|birthDate|birthdate|birth_date|date_of_birth|ptDob|patientDob)$/i.test(field.key);
        return (
          <DateInput
            value={dateValue}
            onChange={(e) => onChange(field.key, e.target.value)}
            max={isDob ? new Date().toISOString().slice(0, 10) : undefined}
            className={`h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? "border-red-500 text-red-900" : "border-gray-300 dark:border-gray-600 bg-transparent text-gray-800 dark:text-white/90"}`}
          />
        );
      }

      case "datetime": {
        // Convert FHIR instant/datetime to datetime-local format (YYYY-MM-DDTHH:mm)
        let dtValue = value || "";
        if (typeof dtValue === "string" && dtValue.includes("T")) {
          // Strip timezone suffix and milliseconds: "2026-02-19T21:00:00.000Z" → "2026-02-19T21:00"
          dtValue = dtValue.replace(/(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/, "").slice(0, 16);
        }
        return (
          <Input
            type="datetime-local"
            value={dtValue}
            onChange={(e) => onChange(field.key, e.target.value)}
            error={!!error}
          />
        );
      }

      case "file":
        return (
          <FileUploadField
            field={field}
            value={value}
            onChange={(val) => onChange(field.key, val)}
            features={fieldConfig.features}
            patientId={patientId}
            formData={formData}
            onPreCreatedId={onPreCreatedId}
          />
        );

      default: {
        // Photo/image fields: show image preview + URL input
        const isPhotoField = /photo|image|avatar|picture/i.test(field.key) || /^(photoUrl|imageUrl|avatarUrl|profilePhoto|profileImage|photo_url|image_url|avatar_url|profile_photo|profile_image|profile_picture|photo[-_]?url|profile[-_]?photo|patientPhoto|profilePicture)$/i.test(field.key);
        if (isPhotoField) {
          const hasUrl = typeof value === "string" && (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:image"));
          return (
            <div className="space-y-2">
              {hasUrl && (
                <img src={value} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <Input
                type="text"
                value={value ?? ""}
                placeholder={field.placeholder || "Enter image URL"}
                onChange={(e) => onChange(field.key, e.target.value)}
                error={!!error}
              />
            </div>
          );
        }
        // Detect monetary/numeric fields by key name to block e/E/+ even when type is "text"
        const isMonetaryField = /^(totalCharge|totalAmount|chargeAmount|amount|copay|coinsurance|deductible|allowedAmount|paidAmount|billedAmount|balance|payment|price|cost|fee|rate|total)$/i.test(field.key);
        return (
          <Input
            type={isMonetaryField ? "number" : "text"}
            value={value ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.key, isMonetaryField && e.target.value ? Number(e.target.value) : e.target.value)}
            onKeyDown={isMonetaryField ? ((e: React.KeyboardEvent) => { if (["e", "E", "+"].includes(e.key)) e.preventDefault(); }) : undefined}
            error={!!error}
          />
        );
      }
    }
  };

  // Evaluate showWhen condition against current form data
  const evaluateShowWhen = (condition?: ShowWhenCondition): boolean => {
    if (!condition) return true;
    const val = formData[condition.field];
    if (condition.equals != null) {
      const targets = Array.isArray(condition.equals) ? condition.equals : [condition.equals];
      return targets.includes(val);
    }
    if (condition.notEquals != null) {
      const targets = Array.isArray(condition.notEquals) ? condition.notEquals : [condition.notEquals];
      return !targets.includes(val);
    }
    return true;
  };

  if (!fieldConfig?.sections?.length) {
    return <div className="text-gray-400 text-sm p-4">No field configuration available.</div>;
  }

  return (
    <div className="space-y-6">
      {fieldConfig.sections.map((section) => {
        if (!evaluateShowWhen(section.showWhen)) return null;
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

            {/* Section Content */}
            {!isCollapsed && section.sectionComponent === "provider-availability-editor" ? (
              <div className="p-4">
                <ProviderAvailabilityEditor
                  providerId={formData?.fhirId || formData?.id}
                  readOnly={readOnly}
                />
              </div>
            ) : !isCollapsed && (
              <div className="p-4 space-y-4">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gap: "1rem",
                  }}
                >
                  {section.fields.map((field) => renderField(field))}
                </div>
                {section.key === "system-access" && formData?.fhirId && (
                  <SystemAccessEditor
                    providerId={formData.fhirId}
                    systemAccess={(formData?.systemAccess as Record<string, unknown>) || {}}
                    readOnly={readOnly}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
