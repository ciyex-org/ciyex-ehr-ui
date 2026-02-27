/* ================================================================
   Reports Module – Type Definitions
   Config-driven report engine with Recharts visualizations
   ================================================================ */

export type ChartType = "bar" | "horizontalBar" | "line" | "area" | "pie" | "donut" | "stacked" | "composed" | "funnel";
export type FilterType = "dateRange" | "select" | "multiSelect" | "search";
export type KpiTrend = "up" | "down" | "flat";

/* ---- Filter ---- */
export interface FilterConfig {
  key: string;
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[];
  defaultValue?: string | string[];
  apiSource?: string; // endpoint to fetch options dynamically
  apiMapping?: { valueField: string; labelField: string }; // how to map API response items to dropdown options
}

export type FilterValues = Record<string, string | string[] | undefined>;

/* ---- KPI ---- */
export interface KpiConfig {
  key: string;
  label: string;
  format?: "number" | "currency" | "percent" | "days";
  color?: string; // tailwind color class
  icon?: string;  // lucide icon name
}

export interface KpiValue {
  key: string;
  label: string;
  value: number | string;
  trend?: KpiTrend;
  trendValue?: string;
  format?: "number" | "currency" | "percent" | "days";
  color?: string;
  sparkline?: number[];
}

/* ---- Chart ---- */
export interface ChartConfig {
  key: string;
  title: string;
  type: ChartType;
  dataKey: string;       // field in chartData array for the value axis
  categoryKey?: string;  // field for the category axis (x-axis)
  series?: { key: string; label: string; color: string }[];
  colors?: string[];
  height?: number;
  stacked?: boolean;
}

export interface ChartDataPoint {
  [key: string]: string | number;
}

/* ---- Table ---- */
export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  format?: "text" | "date" | "currency" | "number" | "status" | "percent";
  align?: "left" | "center" | "right";
}

/* ---- Report Result ---- */
export interface ReportResult {
  kpis: KpiValue[];
  charts: Record<string, ChartDataPoint[]>;
  tableData: Record<string, unknown>[];
  totalRecords: number;
}

/* ---- Report Definition ---- */
export interface ReportDefinition {
  key: string;
  title: string;
  description: string;
  category: ReportCategory;
  icon: string;
  filters: FilterConfig[];
  kpis: KpiConfig[];
  charts: ChartConfig[];
  columns: ColumnConfig[];
  defaultSort?: string;
  fetchData: (filters: FilterValues, apiUrl: string, fetchFn: typeof fetch) => Promise<ReportResult>;
}

/* ---- Categories ---- */
export type ReportCategory =
  | "clinical"
  | "financial"
  | "operational"
  | "compliance"
  | "population"
  | "administrative"
  | "ai";

export interface ReportCategoryInfo {
  key: ReportCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const REPORT_CATEGORIES: ReportCategoryInfo[] = [
  { key: "clinical", label: "Clinical", icon: "Stethoscope", color: "text-blue-600", description: "Patient demographics, encounters, labs, medications" },
  { key: "financial", label: "Financial", icon: "DollarSign", color: "text-emerald-600", description: "Revenue, AR aging, denials, payer mix" },
  { key: "operational", label: "Operational", icon: "Activity", color: "text-purple-600", description: "Appointments, no-shows, productivity, scheduling" },
  { key: "compliance", label: "Compliance", icon: "ShieldCheck", color: "text-amber-600", description: "Quality measures, MIPS, immunizations" },
  { key: "population", label: "Population Health", icon: "Heart", color: "text-rose-600", description: "Risk stratification, care gaps, disease registry" },
  { key: "administrative", label: "Administrative", icon: "Settings", color: "text-slate-600", description: "Audit logs, system usage, staff productivity" },
  { key: "ai", label: "AI Usage", icon: "Bot", color: "text-violet-600", description: "AI model usage, token costs, and performance" },
];

/* ---- Shared filter presets ---- */
export const DATE_RANGE_FILTER: FilterConfig = {
  key: "dateRange",
  label: "Date Range",
  type: "dateRange",
};

export const PROVIDER_FILTER: FilterConfig = {
  key: "provider",
  label: "Provider",
  type: "select",
  options: [{ value: "", label: "All Providers" }],
  apiSource: "/api/providers",
  apiMapping: { valueField: "name", labelField: "name" },
};

export const LOCATION_FILTER: FilterConfig = {
  key: "location",
  label: "Location",
  type: "select",
  options: [{ value: "", label: "All Locations" }],
};

export const PAYER_FILTER: FilterConfig = {
  key: "payer",
  label: "Payer",
  type: "select",
  options: [{ value: "", label: "All Payers" }],
  apiSource: "/api/insurance-companies",
  apiMapping: { valueField: "name", labelField: "name" },
};

export const STATUS_FILTER: FilterConfig = {
  key: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ],
};

/* ---- Chart color palette ---- */
export const CHART_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#22c55e", "#eab308",
];

export const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  completed: "#3b82f6",
  cancelled: "#ef4444",
  pending: "#f59e0b",
  "no-show": "#ef4444",
  scheduled: "#8b5cf6",
  checked_in: "#06b6d4",
  in_progress: "#f59e0b",
  sent: "#10b981",
  failed: "#ef4444",
  queued: "#f59e0b",
  draft: "#94a3b8",
};
