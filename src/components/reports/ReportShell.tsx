"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Download, FileText, Loader2, ChevronDown, ChevronUp, ArrowUpDown,
  TrendingUp, TrendingDown, Minus, Filter, X,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { formatDisplayDate } from "@/utils/dateUtils";
import { usePermissions } from "@/context/PermissionContext";
import DateInput from "@/components/ui/DateInput";
import type {
  ReportDefinition, ReportResult, FilterValues, ChartConfig,
  ChartDataPoint, KpiValue, ColumnConfig,
} from "./types";
import { CHART_COLORS } from "./types";

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

  // When no data exists, only create filters for columns that have known default options
  // (skip columns with no defaults — they'd render an empty dropdown like "All Reason" with no choices)
  if (data.length === 0) {
    for (const col of columns) {
      if (SKIP_KEYS.has(col.key)) continue;
      if (col.format === "currency" || col.format === "number" || col.format === "percent" || col.format === "date") continue;
      if (UNIQUE_PER_ROW_KEYS.has(col.key)) continue;

      const defaults = DEFAULT_FILTER_OPTIONS[col.key];
      if (!defaults || defaults.length === 0) continue; // no known options — skip to avoid empty dropdown
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

/** Count occurrences of each value for a given key */
function countBy(data: Record<string, unknown>[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of data) {
    const v = String(row[key] ?? "Unknown");
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

/** Build pie chart data from a categorical column */
function toPieData(counts: Record<string, number>): ChartDataPoint[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));
}

/* ── KPI Cards ── */
function KpiCards({ kpis }: { kpis: KpiValue[] }) {
  const formatValue = (kpi: KpiValue) => {
    const v = kpi.value;
    if (typeof v === "string") return v;
    switch (kpi.format) {
      case "currency": return `$${v.toLocaleString()}`;
      case "percent": return `${v}%`;
      case "days": return `${v} days`;
      default: return v.toLocaleString();
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map(kpi => (
        <div key={kpi.key} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</span>
            {kpi.trend && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.trend === "up" ? "text-emerald-600" : kpi.trend === "down" ? "text-red-600" : "text-slate-400"}`}>
                {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : kpi.trend === "down" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {kpi.trendValue}
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold ${kpi.color || "text-slate-800 dark:text-slate-100"}`}>
            {formatValue(kpi)}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Chart Renderer ── */
function ChartRenderer({ config, data }: { config: ChartConfig; data: ChartDataPoint[] }) {
  if (!data || data.length === 0) return null;

  const height = config.height || 280;
  const colors = config.colors || CHART_COLORS;
  const catKey = config.categoryKey || "name";

  const tooltipStyle = {
    contentStyle: {
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
      fontSize: "12px",
    },
  };

  switch (config.type) {
    case "bar":
    case "horizontalBar":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout={config.type === "horizontalBar" ? "vertical" : "horizontal"} margin={{ top: 5, right: 20, bottom: 5, left: config.type === "horizontalBar" ? 100 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            {config.type === "horizontalBar" ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey={catKey} type="category" tick={{ fontSize: 11 }} width={95} />
              </>
            ) : (
              <>
                <XAxis dataKey={catKey} tick={{ fontSize: 11 }} angle={data.length > 8 ? -30 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 60 : 30} />
                <YAxis tick={{ fontSize: 11 }} />
              </>
            )}
            <Tooltip {...tooltipStyle} />
            {config.series ? (
              config.series.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />)
            ) : (
              <Bar dataKey={config.dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      );

    case "stacked":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={catKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            {config.series?.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId="a" />)}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={catKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            {config.series ? (
              config.series.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} />)
            ) : (
              <Line type="monotone" dataKey={config.dataKey} stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id={`grad-${config.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={catKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey={config.dataKey} stroke={colors[0]} strokeWidth={2} fill={`url(#grad-${config.key})`} />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "composed":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={catKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            {config.series?.map((s) =>
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      );

    case "pie":
    case "donut":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey={config.dataKey}
              nameKey={catKey}
              cx="50%" cy="50%"
              innerRadius={config.type === "donut" ? "55%" : 0}
              outerRadius="80%"
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}

/* ── API Filter Bar (date range + report-defined filters for API fetch) ── */
function ApiFilterBar({
  report, filters, onChange, onGenerate, loading,
}: {
  report: ReportDefinition; filters: FilterValues; onChange: (f: FilterValues) => void; onGenerate: () => void; loading: boolean;
}) {
  const hasDateRange = report.filters.some(f => f.type === "dateRange");

  return (
    <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <Filter className="w-4 h-4 text-slate-400 self-center" />
      {hasDateRange && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">From</label>
            <DateInput value={(filters.fromDate as string) || ""} onChange={e => onChange({ ...filters, fromDate: e.target.value })} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">To</label>
            <DateInput value={(filters.toDate as string) || ""} onChange={e => onChange({ ...filters, toDate: e.target.value })} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
          </div>
        </>
      )}
      {/* Non-date API filters removed – use Data Filters instead */}
      <button onClick={onGenerate} disabled={loading} className="px-5 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
        {loading ? "Loading..." : "Generate"}
      </button>
    </div>
  );
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
    <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 relative z-20">
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
            className={`px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 min-w-[130px] cursor-pointer appearance-auto ${
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
function formatDateForExcel(dateStr: string): string {
  if (!dateStr) return "";
  return formatDisplayDate(dateStr) || dateStr;
}

function downloadCSV(report: ReportDefinition, data: Record<string, unknown>[]) {
  const headers = report.columns.map(c => c.label);
  const rows = data.map(row => report.columns.map(c => {
    const v = row[c.key];
    if (v == null || v === "") return '""';
    // Format date columns as readable text for Excel
    if (c.format === "date") {
      const formatted = formatDateForExcel(String(v));
      return `"${formatted.replace(/"/g, '""')}"`;
    }
    const s = String(v);
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

/* ── Searchable Filter Dropdown (replaces native <select> for large option lists) ── */
function SearchableFilterDropdown({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel = options.find(o => o.value === value)?.label || `All ${label}s`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className={`px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 min-w-[160px] text-left truncate ${
          value ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-300 dark:border-slate-600"
        }`}
      >
        {selectedLabel}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">No matches</div>
            ) : filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  o.value === value ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Shell ── */
export default function ReportShell({ report }: { report: ReportDefinition }) {
  const { hasCategoryWrite } = usePermissions();
  const canWriteReports = hasCategoryWrite("reports");

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

  // Load API-sourced filter options (e.g. PROVIDER_FILTER with apiSource)
  const [apiFilterOptions, setApiFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const selectFilters = useMemo(() => report.filters.filter(f => f.type === "select" && f.apiSource), [report.filters]);
  useEffect(() => {
    for (const f of selectFilters) {
      if (!f.apiSource) continue;
      const url = `${API()}${f.apiSource}`;
      fetchWithAuth(url).then(r => r.ok ? r.json() : null).then(json => {
        if (!json) return;
        const list: any[] = Array.isArray(json) ? json : json.data?.content ?? json.data ?? [];
        const vField = f.apiMapping?.valueField || "name";
        const lField = f.apiMapping?.labelField || "name";
        const opts = list.map((item: any) => {
          const raw = typeof item === "string" ? item : item;
          const val = typeof raw === "string" ? raw : (raw.identification ? `${raw.identification.firstName || ""} ${raw.identification.lastName || ""}`.trim() : String(raw[vField] || ""));
          const lab = typeof raw === "string" ? raw : (raw.identification ? `${raw.identification.firstName || ""} ${raw.identification.lastName || ""}`.trim() : String(raw[lField] || ""));
          return { value: val, label: lab };
        }).filter((o: { value: string }) => o.value);
        setApiFilterOptions(prev => ({ ...prev, [f.key]: [{ value: "", label: `All ${f.label}s` }, ...opts] }));
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.key]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDataFilters({}); // reset data filters on new generation
    try {
      const data = await report.fetchData(filters, API(), (url: string, opts?: RequestInit) => fetchWithAuth(url, opts) as Promise<Response>);
      setResult(data);
    } catch (err: any) {
      console.error("Report generation failed:", err);
      const rawMsg = err?.message || "Failed to generate report";
      // Suppress backend DTO/validation errors and show user-friendly message
      const isBackendValidation = /missing required fields|dto|validation/i.test(rawMsg);
      setError(isBackendValidation ? "Unable to load report data. Some API endpoints may not be available for this practice." : rawMsg);
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
  // Exclude columns that already have an API-sourced select filter to avoid duplicates
  const apiFilterKeys = useMemo(() => new Set(selectFilters.map(f => f.key)), [selectFilters]);
  const dynamicFilters = useMemo(() => {
    if (!result) return [];
    return detectDynamicFilters(report.columns, result.tableData).filter(f => !apiFilterKeys.has(f.key));
  }, [result, report.columns, apiFilterKeys]);

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

  // Recompute KPIs based on filtered data
  const filteredKpis = useMemo((): KpiValue[] => {
    if (!result) return [];
    const hasActiveFilter = Object.values(dataFilters).some(v => v !== "");
    if (!hasActiveFilter) return result.kpis;

    // Simple recalculation: total records + proportional adjustment
    const ratio = result.tableData.length > 0 ? filteredTableData.length / result.tableData.length : 0;
    return result.kpis.map(kpi => {
      if (typeof kpi.value === "number") {
        // For percent/rate KPIs, keep original; for counts/currency, scale
        if (kpi.format === "percent" || kpi.format === "days") return kpi;
        return { ...kpi, value: Math.round(kpi.value * ratio) };
      }
      return kpi;
    });
  }, [result, dataFilters, filteredTableData]);

  // Recompute chart data based on filtered data
  const filteredCharts = useMemo((): Record<string, ChartDataPoint[]> => {
    if (!result) return {};
    const hasActiveFilter = Object.values(dataFilters).some(v => v !== "");
    if (!hasActiveFilter) return result.charts;

    // Generic label keys used by chart data — NOT actual table column references
    const GENERIC_KEYS = new Set(["name", "label", "category", "key", "bucket"]);

    // Find the table column a chart is about, based on chart.key (e.g. "genderDistribution" -> "gender")
    function findChartColumn(chart: ChartConfig): ColumnConfig | undefined {
      const catKey = chart.categoryKey || "name";

      // 1) Direct match on categoryKey — but only if it's NOT a generic label key
      if (!GENERIC_KEYS.has(catKey)) {
        const direct = report.columns.find(c => c.key === catKey);
        if (direct) return direct;
      }

      // 2) Fuzzy match: derive column from chart.key or chart.title
      //    e.g. "genderDistribution" -> "gender", "byStatus" -> "status", "byProvider" -> "provider"
      const chartKeyLower = chart.key.toLowerCase();
      const titleLower = (chart.title || "").toLowerCase();

      // Skip generic columns (name, id) in fuzzy matching — they're almost never the chart's subject
      const candidates = report.columns.filter(c => !GENERIC_KEYS.has(c.key) && !SKIP_KEYS.has(c.key));

      // Prefer longer column key matches (more specific)
      const scored = candidates.map(c => {
        const ck = c.key.toLowerCase();
        let score = 0;
        if (chartKeyLower.includes(ck)) score = ck.length + 10;
        else if (chartKeyLower.replace(/by/g, "").includes(ck)) score = ck.length + 5;
        if (titleLower.includes(ck) || titleLower.includes(c.label.toLowerCase())) score += ck.length;
        return { col: c, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

      return scored.length > 0 ? scored[0].col : undefined;
    }

    const newCharts: Record<string, ChartDataPoint[]> = {};
    for (const chart of report.charts) {
      const originalData = result.charts[chart.key] || [];
      const catKey = chart.categoryKey || "name";

      // Time-based charts can't be re-aggregated from table rows — keep original
      if (catKey === "month" || catKey === "date" || chart.key.toLowerCase().includes("trend") || chart.key.toLowerCase().includes("monthly") || chart.key.toLowerCase().includes("daily")) {
        newCharts[chart.key] = originalData;
        continue;
      }

      const col = findChartColumn(chart);

      if (col && filteredTableData.length > 0) {
        const dataKey = chart.dataKey || "count";

        // For charts with series (composed/stacked), sum or average numeric fields per category
        if (chart.series && chart.series.length > 0) {
          const grouped: Record<string, { sums: Record<string, number>; count: number }> = {};
          for (const row of filteredTableData) {
            const cat = String(row[col.key] ?? "Unknown");
            if (!grouped[cat]) grouped[cat] = { sums: {}, count: 0 };
            grouped[cat].count += 1;
            for (const s of chart.series) {
              const val = Number(row[s.key] ?? 0);
              grouped[cat].sums[s.key] = (grouped[cat].sums[s.key] || 0) + val;
            }
          }
          // For rate/percent series, use average instead of sum
          newCharts[chart.key] = Object.entries(grouped).map(([name, { sums, count }]) => {
            const point: ChartDataPoint = { [catKey]: name };
            for (const s of chart.series!) {
              const isRate = s.key.toLowerCase().includes("rate") || s.key.toLowerCase().includes("pct") || s.key.toLowerCase().includes("percent");
              point[s.key] = isRate ? Math.round(sums[s.key] / count) : Math.round(sums[s.key]);
            }
            return point;
          });
        } else {
          // Check if the dataKey field exists in table rows (value-based chart vs count-based)
          const hasDataKeyInRows = filteredTableData.some(row => row[dataKey] !== undefined && row[dataKey] !== null);

          if (hasDataKeyInRows && dataKey !== "count") {
            // Group by column and aggregate the actual values
            const grouped: Record<string, { sum: number; count: number }> = {};
            for (const row of filteredTableData) {
              const cat = String(row[col.key] ?? "Unknown");
              if (!grouped[cat]) grouped[cat] = { sum: 0, count: 0 };
              grouped[cat].sum += Number(row[dataKey] ?? 0);
              grouped[cat].count += 1;
            }
            // For rate/percent/pct fields, use average; for others, use sum
            const isRate = dataKey.toLowerCase().includes("rate") || dataKey.toLowerCase().includes("pct") || dataKey.toLowerCase().includes("percent");
            newCharts[chart.key] = Object.entries(grouped)
              .sort((a, b) => b[1].sum - a[1].sum)
              .slice(0, 12)
              .map(([name, { sum, count }]) => ({
                [catKey]: name,
                [dataKey]: isRate ? Math.round(sum / count) : Math.round(sum),
              }));
          } else {
            // Fall back to counting occurrences
            const counts = countBy(filteredTableData, col.key);
            newCharts[chart.key] = Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([name, count]) => ({ [catKey]: name, [dataKey]: count }));
          }
        }
        continue;
      }

      // Fallback: keep original chart data
      newCharts[chart.key] = originalData;
    }
    return newCharts;
  }, [result, dataFilters, filteredTableData, report.charts, report.columns]);

  // Auto-generate pie charts for categorical columns that don't already have a chart
  const autoPieCharts = useMemo((): { config: ChartConfig; data: ChartDataPoint[] }[] => {
    if (!result || filteredTableData.length === 0) return [];
    const existingChartKeys = new Set(report.charts.map(c => c.categoryKey || ""));
    const pies: { config: ChartConfig; data: ChartDataPoint[] }[] = [];

    for (const df of dynamicFilters) {
      // Skip if this column already has a dedicated chart
      if (existingChartKeys.has(df.key)) continue;
      // Skip if chart already exists for this key
      if (report.charts.some(c => c.key === `auto_${df.key}` || c.key.toLowerCase().includes(df.key.toLowerCase()))) continue;

      const counts = countBy(filteredTableData, df.key);
      const data = toPieData(counts);
      if (data.length >= 2 && data.length <= 12) {
        pies.push({
          config: {
            key: `auto_${df.key}`,
            title: `By ${df.label}`,
            type: "pie",
            dataKey: "count",
            categoryKey: "name",
          },
          data,
        });
      }
    }
    return pies;
  }, [dynamicFilters, filteredTableData, report.charts, result]);

  const handleDataFilterChange = (key: string, val: string) => {
    setDataFilters(prev => ({ ...prev, [key]: val }));
  };

  const allCharts = report.charts;
  const totalChartCount = allCharts.length + autoPieCharts.length;

  const hasDateRange = report.filters.some(f => f.type === "dateRange");

  return (
    <div className="flex flex-col gap-4">
      {/* Unified filter bar: date range + generate + data filters */}
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 relative z-20">
        <Filter className="w-4 h-4 text-slate-400 self-center" />
        {hasDateRange && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">From</label>
              <DateInput value={(filters.fromDate as string) || ""} onChange={e => setFilters({ ...filters, fromDate: e.target.value })} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">To</label>
              <DateInput value={(filters.toDate as string) || ""} onChange={e => setFilters({ ...filters, toDate: e.target.value })} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
            </div>
          </>
        )}
        {/* API-sourced select filters (e.g. Provider) — searchable dropdown for large lists */}
        {selectFilters.map(f => {
          const opts = apiFilterOptions[f.key] || f.options || [];
          const useSearchable = opts.length > 8;
          if (useSearchable) {
            return <SearchableFilterDropdown key={f.key} label={f.label} options={opts} value={(filters[f.key] as string) || ""} onChange={v => setFilters({ ...filters, [f.key]: v })} />;
          }
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">{f.label}</label>
              <select
                value={(filters[f.key] as string) || ""}
                onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                className={`px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 min-w-[130px] cursor-pointer appearance-auto ${
                  filters[f.key] ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          );
        })}
        {/* Data filters inline (after data is loaded) — searchable for large option sets */}
        {!loading && result && dynamicFilters.map(f => {
          if (f.uniqueValues.length > 8) {
            const opts = [{ value: "", label: `All ${f.label}` }, ...f.uniqueValues.map(v => ({ value: v, label: v }))];
            return <SearchableFilterDropdown key={f.key} label={f.label} options={opts} value={dataFilters[f.key] || ""} onChange={v => handleDataFilterChange(f.key, v)} />;
          }
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">{f.label}</label>
              <select
                value={dataFilters[f.key] || ""}
                onChange={e => handleDataFilterChange(f.key, e.target.value)}
                className={`px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 min-w-[130px] cursor-pointer appearance-auto ${
                  dataFilters[f.key] ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-300 dark:border-slate-600"
                }`}
              >
                <option value="">All {f.label}</option>
                {f.uniqueValues.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          );
        })}
        {!loading && result && Object.values(dataFilters).some(v => v !== "") && (
          <button onClick={() => setDataFilters({})} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <button onClick={generate} disabled={loading} className="px-5 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition ml-auto">
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

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

          {/* KPIs */}
          <KpiCards kpis={filteredKpis} />

          {/* Charts grid: report-defined + auto-generated pie charts */}
          {totalChartCount > 0 && (
            <div className={`grid gap-4 ${totalChartCount === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
              {allCharts.map(chart => {
                const chartData = filteredCharts[chart.key];
                if (!chartData || chartData.length === 0) return null;
                return (
                  <div key={chart.key} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{chart.title}</h4>
                    <ChartRenderer config={chart} data={chartData} />
                  </div>
                );
              })}
              {autoPieCharts.map(({ config, data }) => (
                <div key={config.key} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                    {config.title}
                    <span className="ml-2 text-[10px] font-normal text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">auto</span>
                  </h4>
                  <ChartRenderer config={config} data={data} />
                </div>
              ))}
            </div>
          )}

          {/* Export + Data Table */}
          {filteredTableData.length > 0 && (
            <>
              {canWriteReports && (
              <div className="flex justify-end">
                <button onClick={() => downloadCSV(report, filteredTableData)} className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
              )}
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

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <FileText className="w-16 h-16 mb-3 opacity-40" />
          <p className="text-sm font-medium">Click Generate to run this report</p>
        </div>
      )}
    </div>
  );
}
