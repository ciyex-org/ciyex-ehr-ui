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
import type {
  ReportDefinition, ReportResult, FilterValues, ChartConfig,
  ChartDataPoint, KpiValue, ColumnConfig,
} from "./types";
import { CHART_COLORS } from "./types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

/* ── helpers: detect column types from data ── */
const SKIP_KEYS = new Set(["id", "key", "uuid", "fhirId", "patientId", "encounterId"]);
const MAX_UNIQUE_FOR_FILTER = 30; // don't show filter if > 30 unique vals

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

/** Scan tableData and return filterable categorical columns */
function detectDynamicFilters(columns: ColumnConfig[], data: Record<string, unknown>[]): DynamicFilterInfo[] {
  if (data.length === 0) return [];
  const filters: DynamicFilterInfo[] = [];

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

    // Skip if all numeric, all dates, too many unique values, or only 1 value
    if (allNumeric || allDate || vals.size > MAX_UNIQUE_FOR_FILTER || vals.size <= 1) continue;

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

  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  useEffect(() => {
    const filtersWithApi = report.filters.filter(f => f.apiSource);
    if (filtersWithApi.length === 0) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, { value: string; label: string }[]> = {};
      await Promise.all(filtersWithApi.map(async (f) => {
        try {
          const res = await fetchWithAuth(`${API()}${f.apiSource}`);
          if (!res.ok || cancelled) return;
          const json = await res.json();
          const raw = json?.data ?? json;
          const items: any[] = Array.isArray(raw) ? raw : raw?.content ?? raw?.data?.content ?? raw?.data ?? [];
          const vf = f.apiMapping?.valueField || "name";
          const lf = f.apiMapping?.labelField || "name";
          results[f.key] = items.map(item => ({
            value: String(item[vf] ?? item.id ?? ""),
            label: String(item[lf] ?? item.name ?? item[vf] ?? ""),
          }));
        } catch (err) {
          console.warn(`Failed to fetch options for filter "${f.key}":`, err);
        }
      }));
      if (!cancelled) setDynamicOptions(results);
    })();
    return () => { cancelled = true; };
  }, [report.key]);

  return (
    <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <Filter className="w-4 h-4 text-slate-400 self-center" />
      {hasDateRange && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">From</label>
            <input type="date" value={(filters.fromDate as string) || ""} onChange={e => onChange({ ...filters, fromDate: e.target.value })} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">To</label>
            <input type="date" value={(filters.toDate as string) || ""} onChange={e => onChange({ ...filters, toDate: e.target.value })} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
          </div>
        </>
      )}
      {report.filters.filter(f => f.type !== "dateRange").map(f => {
        const allOptions = [...(f.options || []), ...(dynamicOptions[f.key] || [])];
        return (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{f.label}</label>
            <select value={(filters[f.key] as string) || ""} onChange={e => onChange({ ...filters, [f.key]: e.target.value })} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 min-w-[130px]">
              {allOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        );
      })}
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

/* ── CSV Export ── */
function downloadCSV(report: ReportDefinition, data: Record<string, unknown>[]) {
  const headers = report.columns.map(c => c.label);
  const rows = data.map(row => report.columns.map(c => {
    const v = row[c.key];
    const s = v == null ? "" : String(v);
    return s.includes(",") ? `"${s}"` : s;
  }));
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
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
    const past = new Date(today); past.setDate(today.getDate() - 30);
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

  // Detect dynamic filters from table data
  const dynamicFilters = useMemo(() => {
    if (!result || result.tableData.length === 0) return [];
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

  return (
    <div className="flex flex-col gap-4">
      {/* API Filter bar */}
      <ApiFilterBar report={report} filters={filters} onChange={setFilters} onGenerate={generate} loading={loading} />

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
