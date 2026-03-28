"use client";

import React, { useState } from "react";
import { Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User, Shield } from "lucide-react";
import AuditDetailRow from "./AuditDetailRow";
import { formatDisplayDateTime } from "@/utils/dateUtils";

export interface AuditLogEntry {
  id: number;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  details: string | null;
  patientId: number | null;
  patientName: string | null;
  createdAt: string;
}

interface AuditTableProps {
  logs: AuditLogEntry[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}

const ACTION_COLORS: Record<string, string> = {
  VIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SIGN: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  PRINT: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
  EXPORT: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

function formatTimestamp(iso: string): string {
  if (!iso) return "\u2014";
  return formatDisplayDateTime(iso) || iso;
}

const SORTABLE_COLUMNS = [
  { key: "createdAt", label: "Timestamp" },
  { key: "userName", label: "User" },
  { key: "action", label: "Action" },
  { key: "resourceType", label: "Resource" },
  { key: "patientName", label: "Patient" },
  { key: "ipAddress", label: "IP Address" },
];

const COL_SPAN = 7; // 6 data columns + 1 details button

export default function AuditTable({
  logs,
  loading,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDir,
  onSort,
}: AuditTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
    );
  };

  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col min-h-0 flex-1">
      {/* Scrollable table */}
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
            <tr>
              {SORTABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none whitespace-nowrap"
                >
                  {col.label}
                  <SortIcon field={col.key} />
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: COL_SPAN }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={COL_SPAN} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      No audit logs found
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Try adjusting your filters or date range.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                      {formatTimestamp(log.createdAt)}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {(log.userName && log.userName.trim()) || (log.userId && log.userId.trim()) || ((log as any).user && String((log as any).user).trim()) || ((log as any).username && String((log as any).username).trim()) || ((log as any).performedBy && String((log as any).performedBy).trim()) || ((log as any).createdBy && String((log as any).createdBy).trim()) || ((log as any).modifiedBy && String((log as any).modifiedBy).trim()) || ((log as any).operator && String((log as any).operator).trim()) || ((log as any).actor && String((log as any).actor).trim()) || ((log as any).email && String((log as any).email).trim()) || "System"}
                          </div>
                          {log.userRole && (
                            <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 mt-0.5">
                              {log.userRole}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          ACTION_COLORS[log.action] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Resource */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                        {log.resourceType || (log as any).resource || (log as any).entityType || (log.resourceId ? log.resourceId.split("/")[0] : null) || log.action || "General"}
                      </div>
                      {(log.resourceName || (log.resourceId && log.resourceId.includes("/"))) && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {log.resourceName || log.resourceId}
                        </div>
                      )}
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {log.patientName || "\u2014"}
                    </td>

                    {/* IP Address */}
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {log.ipAddress || "\u2014"}
                    </td>

                    {/* Details expand */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className={`p-1 rounded transition-colors ${
                          expandedId === log.id
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        }`}
                        title="Toggle details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === log.id && (
                    <AuditDetailRow details={log.details} colSpan={COL_SPAN} />
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {!loading && totalElements > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between text-sm flex-shrink-0">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <span>
              {startItem}-{endItem} of {totalElements.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
