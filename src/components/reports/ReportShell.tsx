"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Download, FileText, Loader2, ChevronDown, ChevronUp, ArrowUpDown,
  Filter, X,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type {
  ReportDefinition, ReportResult, FilterValues, ColumnConfig,
} from "./types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

/* ── helpers: detect column types from data ── */
const SKIP_KEYS = new Set(["id", "key", "uuid", "fhirId", "patientId", "encounterId"]);
const MAX_UNIQUE_FOR_FILTER = 30; // don't show filter if > 30 unique vals

/** Known default options for universal categorical columns */
const DEFAULT_FILTER_OPTIONS: Record<string, string[]> = {
  gender: ["Male", "Female", "Other", "Unknown"],
  status: ["Active", "Inactive", "Completed", "Cancelled", "Pending", "Unsigned", "Signed", "Draft"],
  ageGroup: ["0-17", "18-29", "30-44", "45-59", "60-74", "75+"],
  priority: ["Routine", "STAT", "Urgent"],
  urgency: ["Routine", "Urgent", "STAT"],
  tier: ["Low", "Moderate", "High", "Very High"],
  gapType: ["AWV", "A1C Lab", "Screening", "Depression", "Immunization"],
};

/** Column keys that are likely unique per row and should NOT become filters */
const UNIQUE_PER_ROW_KEYS = new Set([
  "name", "patient", "description", "details", "diagnosis", "medication",
  "testName", "code", "cptCode", "ipAddress", "timestamp", "date", "time",
  "feature", "measure", "referTo", "resource", "dose",
]);

function isDateLike(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return /^\d{4}-\d{2}/.test(v);
}

function isNumeric(v: unknown): boolean {
  return typeof v === "number" || (typeof v === "string" && /^\d+(\.\d+)?$/.test(v));
}

interface DynamicFilterInfo {
  key: string;
  label: string;
  uniqueValues: string[];
}

/** Scan tableData and return filterable categorical columns. When no data, create filters from column definitions. */
function detectDynamicFilters(columns: ColumnConfig[], data: Record<string, unknown>[]): DynamicFilterInfo[] {
  const filters: DynamicFilterInfo[] = [];

  // When no data exists, create filters from column definitions for all eligible text columns
  if (data.length === 0) {
    for (const col of columns) {
      if (SKIP_KEYS.has(col.key)) continue;
      if (col.format === "currency" || col.format === "number" || col.format === "percent" || col.format === "date") continue;
      if (UNIQUE_PER_ROW_KEYS.has(col.key)) continue;

      const defaults = DEFAULT_FILTER_OPTIONS[col.key] || [];
      filters.push({ key: col.key, label: col.label, uniqueValues: defaults });
    }
    return filters;
  }

  for (const col of columns) {
    if (SKIP_KEYS.has(col.key)) continue;
    // Skip numeric/currency/percent/date columns — not good for dropdown filters
    if (col.format === "currency" || col.format === "number" || col.format === "percent" || col.format === "date") continue;

    // Collect unique non-empty string values
    const vals = new Set<string>();
    let allNumeric = true;
    let allDate = true;
    for (const row of data) {
      const v = row[col.key];
      if (v == null || v === "") continue;
      const s = String(v);
      vals.add(s);
      if (!isNumeric(v)) allNumeric = false;
      if (!isDateLike(v)) allDate = false;
    }

    // Merge in known defaults for this column so common options always appear
    const defaults = DEFAULT_FILTER_OPTIONS[col.key];
    if (defaults) {
      for (const d of defaults) vals.add(d);
    }

    // Skip if all numeric, all dates, too many unique values, or no values at all
    if (allNumeric || allDate || vals.size > MAX_UNIQUE_FOR_FILTER || vals.size === 0) continue;

    filters.push({
      key: col.key,
      label: col.label,
      uniqueValues: Array.from(vals).sort(),
    });
  }
  return filters;
}


/* ── Dynamic Data Filters (generated from actual data) ── */
function DynamicDataFilters({
  dynamicFilters, dataFilters, onChange, onClear,
}: {
  dynamicFilters: DynamicFilterInfo[]; dataFilters: Record<string, string>; onChange: (key: string, val: string) => void; onClear: () => void;
}) {
  if (dynamicFilters.length === 0) return null;
  const activeCount = Object.values(dataFilters).filter(v => v !== "").length;

  return (
    <div className="flex flex-wrap items-end gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 self-center">
        <Filter className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Data Filters</span>
      </div>
      {dynamicFilters.map(f => (
        <div key={f.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">{f.label}</label>
          <select
            value={dataFilters[f.key] || ""}
            onChange={e => onChange(f.key, e.target.value)}
            className={`px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 min-w-[130px] ${
              dataFilters[f.key] ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-300 dark:border-slate-600"
            }`}
          >
            <option value="">All {f.label}</option>
            {f.uniqueValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      ))}
      {activeCount > 0 && (
        <button onClick={onClear} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
          <X className="w-3 h-3" /> Clear ({activeCount})
        </button>
      )}
    </div>
  );
}

/* ── Data Table ── */
function DataTable({ columns, data, totalRecords }: { columns: ColumnConfig[]; data: Record<string, unknown>[]; totalRecords: number }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Reset page when data changes
  useEffect(() => { setPage(0); }, [data]);

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, sortCol, sortDir]);

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const formatCell = (col: ColumnConfig, value: unknown): string => {
    if (value == null || value === "") return "—";
    switch (col.format) {
      case "currency": return `$${Number(value).toLocaleString()}`;
      case "percent": return `${value}%`;
      case "number": return Number(value).toLocaleString();
      case "date": return String(value).slice(0, 10);
      default: return String(value);
    }
  };

  const statusColor = (val: string) => {
    const v = val.toLowerCase();
    if (["active", "completed", "signed", "above", "sent"].includes(v)) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (["cancelled", "failed", "below", "very high", "denied"].includes(v)) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (["pending", "unsigned", "high", "draft", "no-show"].includes(v)) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {data.length > 0
            ? `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, data.length)} of ${totalRecords.toLocaleString()} records`
            : "No records match filters"
          }
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 text-xs rounded border disabled:opacity-40">Prev</button>
            <span className="text-xs text-slate-500">Page {page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded border disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10">
            <tr>
              {columns.map(col => (
                <th key={col.key} className={`px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"} ${col.sortable ? "cursor-pointer hover:text-blue-600 select-none" : ""}`} style={col.width ? { width: col.width } : undefined} onClick={() => col.sortable && handleSort(col.key)}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortCol === col.key && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    {col.sortable && sortCol !== col.key && <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100 dark:border-slate-700 hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition">
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300 ${col.align === "right" ? "text-right" : "text-left"}`}>
                    {col.format === "status" ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(String(row[col.key] ?? ""))}`}>
                        {String(row[col.key] ?? "—")}
                      </span>
                    ) : formatCell(col, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── CSV Export (with BOM for Excel compatibility) ── */
function downloadCSV(report: ReportDefinition, data: Record<string, unknown>[]) {
  const headers = report.columns.map(c => c.label);
  const rows = data.map(row => report.columns.map(c => {
    const v = row[c.key];
    const s = v == null ? "" : String(v);
    // Always quote fields to prevent Excel display issues (######)
    return `"${s.replace(/"/g, '""')}"`;
  }));
  // UTF-8 BOM ensures Excel opens CSV with correct encoding and wider column detection
  const bom = "\uFEFF";
  const csv = bom + [headers.map(h => `"${h}"`).join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.key}_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Main Shell ── */
export default function ReportShell({ report }: { report: ReportDefinition }) {
  const [filters, setFilters] = useState<FilterValues>(() => {
    const today = new Date();
    const past = new Date(today); past.setFullYear(today.getFullYear() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { fromDate: fmt(past), toDate: fmt(today) };
  });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic data filters (client-side, after data loads)
  const [dataFilters, setDataFilters] = useState<Record<string, string>>({});

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDataFilters({}); // reset data filters on new generation
    try {
      const data = await report.fetchData(filters, API(), (url: string, opts?: RequestInit) => fetchWithAuth(url, opts) as Promise<Response>);
      setResult(data);
    } catch (err: any) {
      console.error("Report generation failed:", err);
      setError(err?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [report, filters]);

  // Auto-generate on first render
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.key]);

  // Detect dynamic filters from table data (or from column definitions when no data)
  const dynamicFilters = useMemo(() => {
    if (!result) return [];
    return detectDynamicFilters(report.columns, result.tableData);
  }, [result, report.columns]);

  // Apply data filters to table data
  const filteredTableData = useMemo(() => {
    if (!result) return [];
    let data = result.tableData;
    for (const [key, val] of Object.entries(dataFilters)) {
      if (!val) continue;
      data = data.filter(row => String(row[key] ?? "") === val);
    }
    return data;
  }, [result, dataFilters]);

  const handleDataFilterChange = (key: string, val: string) => {
    setDataFilters(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          {/* Dynamic data filters (auto-detected from data) */}
          <DynamicDataFilters
            dynamicFilters={dynamicFilters}
            dataFilters={dataFilters}
            onChange={handleDataFilterChange}
            onClear={() => setDataFilters({})}
          />

          {/* Export + Data Table */}
          {filteredTableData.length > 0 && (
            <>
              <div className="flex justify-end">
                <button onClick={() => downloadCSV(report, filteredTableData)} className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
              <DataTable columns={report.columns} data={filteredTableData} totalRecords={filteredTableData.length} />
            </>
          )}

          {/* No data after filter */}
          {filteredTableData.length === 0 && result.tableData.length > 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Filter className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No records match the selected filters</p>
              <button onClick={() => setDataFilters({})} className="mt-2 text-xs text-blue-600 hover:underline">Clear all filters</button>
            </div>
          )}

          {/* No data for this practice yet */}
          {result.tableData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <FileText className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No data available yet for this report</p>
              <p className="text-xs mt-1">Data will appear here once records are added to this practice</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
