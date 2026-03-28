"use client";

import React from "react";
import {
  Inbox,
  Send,
  Eye,
  UserPlus,
  CheckCircle,
  RefreshCw,
  FileText,
  Phone,
  Tag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
} from "lucide-react";
import { FaxMessage, CATEGORY_LABELS, FaxCategory } from "./types";
import { formatDisplayDateTime } from "@/utils/dateUtils";

interface Props {
  faxes: FaxMessage[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewDetails: (fax: FaxMessage) => void;
  onAssignPatient: (fax: FaxMessage) => void;
  onMarkProcessed: (fax: FaxMessage) => void;
  onResend: (fax: FaxMessage) => void;
  onEdit?: (fax: FaxMessage) => void;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    categorized: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    attached: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    sending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    sent: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[status] || map.pending;
}

function categoryBadge(category: FaxCategory) {
  const map: Record<string, string> = {
    referral: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    lab_result: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    prior_auth: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    medical_records: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400",
  };
  return map[category] || map.other;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "--";
  return formatDisplayDateTime(d) || "--";
}

export default function FaxTable({
  faxes,
  loading,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onViewDetails,
  onAssignPatient,
  onMarkProcessed,
  onResend,
  onEdit,
}: Props) {
  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col">
      <div className="overflow-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Loading faxes...
            </span>
          </div>
        ) : faxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No faxes found</p>
            <p className="text-xs mt-1">
              Faxes will appear here when received or sent.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                  &nbsp;
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  From / To
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fax Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pages
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {faxes.map((fax) => {
                const isInbound = fax.direction === "inbound";
                const contactName = isInbound
                  ? fax.senderName
                  : fax.recipientName;
                const dateValue = isInbound
                  ? fax.receivedAt || fax.createdAt
                  : fax.sentAt || fax.createdAt;

                return (
                  <tr
                    key={fax.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Direction icon */}
                    <td className="px-4 py-3">
                      {isInbound ? (
                        <Inbox className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Send className="w-4 h-4 text-green-500" />
                      )}
                    </td>

                    {/* From / To */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                        {contactName || "--"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {isInbound ? "From" : "To"}
                      </div>
                    </td>

                    {/* Fax Number */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono text-xs">
                          {fax.faxNumber || "--"}
                        </span>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-gray-100 truncate max-w-[180px] block">
                        {fax.subject || "--"}
                      </span>
                    </td>

                    {/* Pages */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-600 dark:text-gray-400 text-xs">
                        {fax.pageCount ?? "--"}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      {fax.category ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${categoryBadge(
                            fax.category
                          )}`}
                        >
                          <Tag className="w-3 h-3" />
                          {CATEGORY_LABELS[fax.category]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-gray-100 text-xs truncate max-w-[120px] block">
                        {fax.patientName || "--"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(
                          fax.status
                        )}`}
                      >
                        {fax.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(dateValue)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewDetails(fax)}
                          title="View details"
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onEdit && (
                          <button
                            onClick={() => onEdit(fax)}
                            title="Edit fax"
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {isInbound && !fax.patientId && (
                          <button
                            onClick={() => onAssignPatient(fax)}
                            title="Assign to patient"
                            className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}

                        {fax.patientId && !fax.processedAt && (
                          <button
                            onClick={() => onMarkProcessed(fax)}
                            title="Mark processed"
                            className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {!isInbound && fax.status === "failed" && (
                          <button
                            onClick={() => onResend(fax)}
                            title="Resend"
                            className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && faxes.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing {page * pageSize + 1}-
            {Math.min((page + 1) * pageSize, totalElements)} of{" "}
            {totalElements}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
              Page {page + 1} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
