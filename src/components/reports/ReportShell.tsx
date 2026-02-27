"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Download, FileText, Loader2, ChevronDown, ChevronUp, ArrowUpDown,
  TrendingUp, TrendingDown, Minus, Filter,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type {
  ReportDefinition, ReportResult, FilterValues, ChartConfig,
  ChartDataPoint, KpiValue, ColumnConfig,
} from "./types";
import { CHART_COLORS } from "./types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

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
            {config.series?.map((s, i) =>
              i === 0
                ? <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
                : <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
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

/* ── Filter Bar ── */
function FilterBar({
  report, filters, onChange, onGenerate, loading,
}: {
  report: ReportDefinition; filters: FilterValues; onChange: (f: FilterValues) => void; onGenerate: () => void; loading: boolean;
}) {
  const hasDateRange = report.filters.some(f => f.type === "dateRange");

  // Dynamic options fetched from apiSource endpoints
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

          // Normalize API response to array
          const raw = json?.data ?? json;
          const items: any[] = Array.isArray(raw)
            ? raw
            : raw?.content ?? raw?.data?.content ?? raw?.data ?? [];

          // Map to {value, label} using apiMapping or sensible defaults
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
  }, [report.key]); // re-fetch when report changes

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
        const allOptions = [
          ...(f.options || []),
          ...(dynamicOptions[f.key] || []),
        ];
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

/* ── Data Table ── */
function DataTable({ columns, data, totalRecords }: { columns: ColumnConfig[]; data: Record<string, unknown>[]; totalRecords: number }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 25;

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
          Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} of {totalRecords.toLocaleString()} records
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

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
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
  React.useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.key]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <FilterBar report={report} filters={filters} onChange={setFilters} onGenerate={generate} loading={loading} />

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
          <KpiCards kpis={result.kpis} />

          {/* Charts grid */}
          {report.charts.length > 0 && (
            <div className={`grid gap-4 ${report.charts.length === 1 ? "grid-cols-1" : report.charts.length === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}>
              {report.charts.map(chart => {
                const chartData = result.charts[chart.key];
                if (!chartData || chartData.length === 0) return null;
                return (
                  <div key={chart.key} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{chart.title}</h4>
                    <ChartRenderer config={chart} data={chartData} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Export + Data Table */}
          {result.tableData.length > 0 && (
            <>
              <div className="flex justify-end">
                <button onClick={() => downloadCSV(report, result.tableData)} className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
              <DataTable columns={report.columns} data={result.tableData} totalRecords={result.totalRecords} />
            </>
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
