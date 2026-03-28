"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Eye,
  Filter,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Send,
} from "lucide-react";
import type { NotificationLog, NotificationStats, NotificationStatus } from "./types";

const apiBase = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "bounced", label: "Bounced" },
];

function statusBadge(status: NotificationStatus) {
  const map: Record<string, string> = {
    queued: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    bounced: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || map.queued}`}
    >
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${color}`}>
      {icon}
      <div>
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </div>
  );
}

export default function MessageLog() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<NotificationLog | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  /* --- load logs --- */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${apiBase()}/api/notifications/log?page=${page}&size=20`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        let items: NotificationLog[] = Array.isArray(data) ? data : data.content || [];
        // Normalize patient name from possible field variants
        items = items.map((log: any) => ({
          ...log,
          patientName: log.patientName || log.patient_name || log.patientFullName || (log.patient && typeof log.patient === "object" ? (log.patient.name || log.patient.fullName || `${log.patient.firstName || ""} ${log.patient.lastName || ""}`.trim()) : "") || "",
          status: (log.status || "queued").toLowerCase(),
        }));
        // Resolve patient names from patientId if patientName is missing
        const needNames = items.filter((l: any) => !l.patientName && l.patientId);
        if (needNames.length > 0) {
          const uniqueIds = [...new Set(needNames.map((l: any) => l.patientId))];
          const nameMap: Record<string, string> = {};
          await Promise.allSettled(uniqueIds.map(async (id) => {
            try {
              const r = await fetchWithAuth(`${apiBase()}/api/patients/${id}`);
              if (r.ok) {
                const d = await r.json();
                const p = d?.data || d;
                nameMap[String(id)] = `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.fullName || p.name || "";
              }
            } catch { /* silent */ }
          }));
          items = items.map((l: any) => ({
            ...l,
            patientName: l.patientName || (l.patientId ? nameMap[String(l.patientId)] : "") || "",
          }));
        }
        // Client-side status filter
        if (statusFilter) {
          items = items.filter((l: any) => (l.status || "") === statusFilter);
        }
        setLogs(items);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  /* --- load stats --- */
  const loadStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/notifications/log/stats`);
      if (res.ok) {
        const json = await res.json();
        setStats(json.data ?? json);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const fmtDate = (d?: string | number[]) => {
    if (!d) return "-";
    let dateStr: string;
    if (Array.isArray(d)) {
      const [y, mo, day, h = 0, mi = 0] = d as number[];
      dateStr = `${y}-${String(mo).padStart(2,"0")}-${String(day).padStart(2,"0")}T${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}:00`;
    } else {
      dateStr = d;
    }
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return String(d).slice(0, 16);
    return dt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ====== Detail modal ====== */
  if (detail) {
    return (
      <div className="h-full overflow-y-auto pr-1">
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Message Detail
            </h3>
            <button
              onClick={() => setDetail(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-slate-500">Channel:</span> {detail.channelType}</div>
              <div><span className="text-slate-500">Status:</span> {statusBadge(detail.status)}</div>
              <div><span className="text-slate-500">Recipient:</span> {detail.recipientName || detail.recipient}</div>
              <div><span className="text-slate-500">Sent At:</span> {fmtDate(detail.sentAt || detail.createdAt)}</div>
              {detail.patientName && (
                <div><span className="text-slate-500">Patient:</span> {detail.patientName}</div>
              )}
              {detail.triggerType && (
                <div><span className="text-slate-500">Trigger:</span> {detail.triggerType}</div>
              )}
              {detail.errorMessage && (
                <div className="col-span-2 text-red-600 dark:text-red-400">
                  <span className="text-slate-500">Error:</span> {detail.errorMessage}
                </div>
              )}
            </div>
            {detail.subject && (
              <div>
                <span className="text-slate-500">Subject:</span>
                <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">{detail.subject}</div>
              </div>
            )}
            {detail.body && (
              <div>
                <span className="text-slate-500">Body:</span>
                <div className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 p-3 text-slate-700 dark:text-slate-200">
                  {detail.body}
                </div>
              </div>
            )}
            <button
              onClick={() => setDetail(null)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Back to Log
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-4">
      {/* Action feedback */}
      {actionFeedback && (
        <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${actionFeedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"}`}>
          {actionFeedback.text}
        </div>
      )}
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            label="Sent"
            value={stats.totalSent}
            icon={<Send className="h-5 w-5" />}
            color="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          />
          <StatCard
            label="Delivered"
            value={stats.totalDelivered}
            icon={<CheckCircle className="h-5 w-5" />}
            color="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
          />
          <StatCard
            label="Failed"
            value={stats.totalFailed}
            icon={<XCircle className="h-5 w-5" />}
            color="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          />
          <StatCard
            label="Bounced"
            value={stats.totalBounced}
            icon={<XCircle className="h-5 w-5" />}
            color="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          />
          <StatCard
            label="Queued"
            value={stats.totalQueued}
            icon={<Clock className="h-5 w-5" />}
            color="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(0); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Send className="h-12 w-12 mb-3" />
          <p className="text-sm">No messages found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Timestamp</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Channel</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Recipient</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Subject</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Trigger</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Patient</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {logs.map((log, idx) => (
                <tr
                  key={log.id ?? idx}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {fmtDate(log.sentAt || log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.channelType === "email"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      }`}
                    >
                      {log.channelType === "email" ? (
                        <Mail className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      {log.channelType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {log.recipientName || log.recipient || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">
                    {log.subject || "-"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(log.status)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize">
                    {log.triggerType || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {log.patientName || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setDetail(log)}
                        title="View Details"
                        className="rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          setRetryingId(log.id);
                          try {
                            // Try without /log/ prefix first, fallback to /resend/
                            let res = await fetchWithAuth(`${apiBase()}/api/notifications/${log.id}/retry`, { method: "POST" });
                            if (!res.ok) {
                              res = await fetchWithAuth(`${apiBase()}/api/notifications/resend/${log.id}`, { method: "POST" });
                            }
                            if (res.ok) {
                              setActionFeedback({ type: "success", text: "Notification queued for resend" });
                              loadLogs();
                              loadStats();
                            } else {
                              const json = await res.json().catch(() => ({}));
                              setActionFeedback({ type: "error", text: json.message || "Resend failed" });
                            }
                          } catch {
                            setActionFeedback({ type: "error", text: "Network error. Please try again." });
                          } finally {
                            setRetryingId(null);
                            setTimeout(() => setActionFeedback(null), 4000);
                          }
                        }}
                        disabled={retryingId === log.id}
                        title={log.status === "failed" ? "Retry" : "Resend"}
                        className="rounded-md p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
                      >
                        {retryingId === log.id ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
