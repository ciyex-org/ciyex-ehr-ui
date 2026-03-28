"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Bot, RefreshCw, Loader2, AlertTriangle, X,
  Zap, Coins, Clock, Hash, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import DateInput from "@/components/ui/DateInput";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
const PROXY = () => `${API()}/api/app-proxy/ask-ciya`;

type ToastState = { type: "success" | "error"; text: string } | null;

interface ModelSummary {
  modelId: string;
  vendor: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
}

interface DailyUsage {
  date: string;
  requestCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

interface AuditLogEntry {
  id: number;
  orgAlias: string;
  callerService: string;
  endpoint: string;
  aiVendor: string;
  modelUsed: string;
  taskComplexity: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCost: number;
  status: string;
  errorMessage: string | null;
  userId: string;
  createdAt: string;
}

export default function AiUsageDashboard() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<ModelSummary[]>([]);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [logPage, setLogPage] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = `from=${fromDate}&to=${toDate}`;
      const [summaryRes, dailyRes, logRes] = await Promise.all([
        fetchWithAuth(`${PROXY()}/api/ai/usage/summary?${params}`),
        fetchWithAuth(`${PROXY()}/api/ai/usage/daily?${params}`),
        fetchWithAuth(`${PROXY()}/api/ai/usage/log?page=${logPage}&size=20`),
      ]);

      const summaryJson = await summaryRes.json();
      const dailyJson = await dailyRes.json();
      const logJson = await logRes.json();

      if (summaryRes.ok) setSummary(summaryJson.data || []);
      if (dailyRes.ok) setDaily(dailyJson.data || []);
      if (logRes.ok) {
        setLogs(logJson.data?.content || []);
        setLogTotalPages(logJson.data?.totalPages || 0);
      }
    } catch (err) {
      console.error("Failed to fetch AI usage data:", err);
      setToast({ type: "error", text: "Failed to load AI usage data" });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, logPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = summary.reduce(
    (acc, m) => ({
      requests: acc.requests + (m.requestCount || 0),
      tokens: acc.tokens + (m.totalTokens || 0),
      cost: acc.cost + (m.estimatedCostUsd || 0),
      latency: acc.latency + (m.avgLatencyMs || 0) * (m.requestCount || 0),
      weightedCount: acc.weightedCount + (m.requestCount || 0),
    }),
    { requests: 0, tokens: 0, cost: 0, latency: 0, weightedCount: 0 },
  );
  const avgLatency = totals.weightedCount > 0 ? Math.round(totals.latency / totals.weightedCount) : 0;

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
              : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Date range + refresh */}
      <div className="flex items-center gap-2">
        <DateInput
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-2 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400">to</span>
        <DateInput
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-2 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        />
        <button
          onClick={fetchData}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Requests" value={totals.requests.toLocaleString()} icon={<Hash className="w-4 h-4" />} color="text-blue-600 dark:text-blue-400" />
            <KpiCard label="Total Tokens" value={totals.tokens.toLocaleString()} icon={<Zap className="w-4 h-4" />} color="text-purple-600 dark:text-purple-400" />
            <KpiCard label="Estimated Cost" value={`$${totals.cost.toFixed(4)}`} icon={<Coins className="w-4 h-4" />} color="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Avg Latency" value={`${avgLatency.toLocaleString()}ms`} icon={<Clock className="w-4 h-4" />} color="text-amber-600 dark:text-amber-400" />
          </div>

          {/* Usage by Model */}
          <ModelTable data={summary} />

          {/* Daily Trend Chart */}
          <DailyChart data={daily} />

          {/* Audit Log */}
          <LogTable
            logs={logs}
            page={logPage}
            totalPages={logTotalPages}
            onPageChange={setLogPage}
          />
        </>
      )}
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition hover:shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <span className="text-slate-400">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/* ─── Model Summary Table ─── */
function ModelTable({ data }: { data: ModelSummary[] }) {
  if (!data.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
        <Bot className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-400">No usage data for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Usage by Model</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-left">
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400">Model</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400">Vendor</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-right">Requests</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-right">Prompt</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-right">Completion</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-right">Total</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-right">Est. Cost</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-right">Avg Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-800 dark:text-slate-200">{m.modelId || "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.vendor === "bedrock"
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  }`}>
                    {m.vendor}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{(m.requestCount || 0).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{(m.promptTokens || 0).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{(m.completionTokens || 0).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">{(m.totalTokens || 0).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">${(m.estimatedCostUsd || 0).toFixed(4)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400">{Math.round(m.avgLatencyMs || 0).toLocaleString()}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Daily Trend Chart ─── */
function DailyChart({ data }: { data: DailyUsage[] }) {
  if (!data.length) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Daily Usage Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            angle={data.length > 10 ? -30 : 0}
            textAnchor={data.length > 10 ? "end" : "middle"}
            height={data.length > 10 ? 60 : 30}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string) => {
              if (name === "estimatedCostUsd") return [`$${value.toFixed(4)}`, "Est. Cost"];
              if (name === "totalTokens") return [value.toLocaleString(), "Total Tokens"];
              if (name === "requestCount") return [value.toLocaleString(), "Requests"];
              return [value, name];
            }}
          />
          <Bar dataKey="totalTokens" name="totalTokens" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Audit Log Table ─── */
function LogTable({
  logs,
  page,
  totalPages,
  onPageChange,
}: {
  logs: AuditLogEntry[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent AI Calls</h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-500 dark:text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {logs.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">No AI calls recorded yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-left">
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">Time</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">User</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">Model</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">Vendor</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">Complexity</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400 text-right">Prompt</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400 text-right">Completion</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400 text-right">Total</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400 text-right">Cost</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400 text-right">Latency</th>
                <th className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{log.userId || "—"}</td>
                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{log.modelUsed || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                      log.aiVendor === "bedrock"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    }`}>
                      {log.aiVendor || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                      log.taskComplexity === "COMPLEX" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : log.taskComplexity === "MODERATE" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}>
                      {log.taskComplexity || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{(log.promptTokens || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{(log.completionTokens || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-800 dark:text-slate-200">{(log.totalTokens || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                    {log.estimatedCost != null ? `$${Number(log.estimatedCost).toFixed(4)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{(log.latencyMs || 0).toLocaleString()}ms</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                      log.status === "SUCCESS"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
