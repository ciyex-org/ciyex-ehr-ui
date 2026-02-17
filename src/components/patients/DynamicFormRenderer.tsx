"use client";

import React, { useState, useCallback } from "react";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import TextArea from "@/components/form/input/TextArea";
import Checkbox from "@/components/form/input/Checkbox";
import Radio from "@/components/form/input/Radio";
import FileInput from "@/components/form/input/FileInput";
import { ChevronDown, ChevronRight, Upload, FileText, X as XIcon } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
const CODES_BASE = () => (getEnv("NEXT_PUBLIC_CODES_SERVICE_URL") || "").replace(/\/$/, "");

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

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "radio" | "checkbox" | "boolean" | "date" | "datetime" | "phone" | "email" | "lookup" | "coded" | "quantity" | "file" | "group" | "computed" | "address" | "ros-grid" | "exam-grid" | "diagnosis-list" | "plan-items" | "code-lookup";
  required?: boolean;
  colSpan?: number;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  lookupConfig?: LookupConfig;
  fhirMapping?: FhirMapping;
  validation?: FieldValidation;
  computeExpression?: string;
  fileConfig?: FileConfig;
  badgeColors?: Record<string, string>;
  rosConfig?: { systems: RosSystemConfig[] };
  examConfig?: { systems: ExamSystemConfig[] };
  diagnosisConfig?: DiagnosisConfig;
  codeLookupConfig?: CodeLookupConfig;
}

export interface SectionDef {
  key: string;
  title: string;
  columns?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: FieldDef[];
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

// ---- File Upload Field Component ----

function FileUploadField({
  field,
  value,
  onChange,
  features,
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  features?: FieldConfigFeatures;
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
      if (!allowedTypes.some((t) => ext === t || file.type.includes(t))) {
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
        const res = await fetchWithAuth(`${API_BASE()}${uploadEndpoint}`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          const fileUrl = data.fileUrl || data.url || data.id || data.fhirId;
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
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
          {fileName || (typeof value === "string" ? value.split("/").pop() : "File attached")}
        </span>
        <button type="button" onClick={clearFile} className="p-1 text-gray-400 hover:text-red-500">
          <XIcon className="w-3.5 h-3.5" />
        </button>
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
        const base = API_BASE();
        const url = `${base}/api/codes-proxy/${codeSystem}/search?q=${encodeURIComponent(q)}&size=15`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.content || []);
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
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const config = field.codeLookupConfig;
  const codeSystem = config?.codeSystem || "CPT";
  const items: Array<{ code: string; description: string; fee?: number; modifier?: string; units?: number }> =
    Array.isArray(value) ? value : [];

  const searchCodes = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) { setSearchResults([]); return; }
      try {
        const base = API_BASE();
        const url = `${base}/api/codes-proxy/${codeSystem}/search?q=${encodeURIComponent(q)}&size=15`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.content || []);
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
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
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
          ))}
        </div>
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

    if (field.type === "code-lookup") {
      return (
        <div key={field.key} className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <CodeLookup field={field} value={value} onChange={(v) => onChange(field.key, v)} readOnly={readOnly} />
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
          field.type === "file" && value ? (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {typeof value === "string" ? value.split("/").pop() : "File attached"}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {field.type === "select" || field.type === "coded"
                ? field.options?.find((o) => o.value === value)?.label || value || "-"
                : field.type === "checkbox" || field.type === "boolean"
                ? value ? "Yes" : "No"
                : value || "-"}
            </span>
          )
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
          <FileUploadField
            field={field}
            value={value}
            onChange={(val) => onChange(field.key, val)}
            features={fieldConfig.features}
          />
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
