"use client";

import React from "react";
import { usePermissions } from "@/context/PermissionContext";
import {
  Edit,
  Trash2,
  RefreshCw,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  Plus,
  Zap,
  Pill,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  Ban,
} from "lucide-react";
import { Prescription, PrescriptionStatus } from "./types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLOR: Record<PrescriptionStatus, string> = {
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  discontinued: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_ICON: Record<PrescriptionStatus, React.ReactNode> = {
  active: <Pill className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  on_hold: <PauseCircle className="w-3.5 h-3.5" />,
  discontinued: <Ban className="w-3.5 h-3.5" />,
};

const STATUS_LABEL: Record<PrescriptionStatus, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
  discontinued: "Discontinued",
};

const PRIORITY_COLOR: Record<string, string> = {
  routine: "",
  urgent: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  stat: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const DEA_COLOR: Record<string, string> = {
  II: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  III: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  IV: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  V: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: PrescriptionStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] || STATUS_COLOR.active}`}>
      {STATUS_ICON[status]}
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority || "routine").toLowerCase();
  if (p === "stat") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLOR.stat}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
        </span>
        STAT
      </span>
    );
  }
  if (p === "urgent") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLOR.urgent}`}>
        <Zap className="w-3 h-3" />
        Urgent
      </span>
    );
  }
  return null; // Don't show badge for routine
}

function DEABadge({ schedule }: { schedule?: string }) {
  if (!schedule) return null;
  const cls = DEA_COLOR[schedule];
  if (!cls) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>
      <AlertTriangle className="w-3 h-3" />
      C-{schedule}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Table                                                         */
/* ------------------------------------------------------------------ */

interface Props {
  prescriptions: Prescription[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEdit: (rx: Prescription) => void;
  onRefill: (rx: Prescription) => void;
  onDiscontinue: (rx: Prescription) => void;
  onDelete: (rx: Prescription) => void;
  onNew: () => void;
  hasFilters: boolean;
}

export default function PrescriptionTable({
  prescriptions,
  loading,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onEdit,
  onRefill,
  onDiscontinue,
  onDelete,
  onNew,
  hasFilters,
}: Props) {
  const { canWriteResource } = usePermissions();
  const canWriteRx = canWriteResource("MedicationRequest");

  return (
    <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Medication</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">SIG</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Qty / Days</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Refills</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Pharmacy</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Prescriber</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Loading prescriptions...</span>
                </td>
              </tr>
            ) : prescriptions.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-20">
                  <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No prescriptions found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {hasFilters ? "Try adjusting your filters" : "Create your first prescription to get started"}
                  </p>
                  {!hasFilters && canWriteRx && (
                    <button onClick={onNew} className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                      <Plus className="w-4 h-4" />
                      New Prescription
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              prescriptions.map((rx) => (
                <tr key={rx.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {rx.patientName || "--"}
                      {rx.patientId && <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-2">(ID: {rx.patientId})</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 capitalize whitespace-nowrap">
                      {rx.medicationName || "--"}{rx.dosageForm ? ` - ${rx.dosageForm}` : ""}{rx.strength ? ` ${rx.strength}` : ""}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <PriorityBadge priority={rx.priority} />
                      <DEABadge schedule={rx.deaSchedule} />
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="text-gray-700 dark:text-gray-300 text-xs max-w-[220px] truncate" title={rx.sig}>
                      {rx.sig || "--"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {rx.quantity != null && rx.daysSupply != null
                        ? `${rx.quantity} ${rx.quantityUnit || "units"} / ${rx.daysSupply} day${rx.daysSupply !== 1 ? "s" : ""}`
                        : rx.quantity != null
                          ? `${rx.quantity} ${rx.quantityUnit || "units"}`
                          : rx.daysSupply != null
                            ? `${rx.daysSupply} day${rx.daysSupply !== 1 ? "s" : ""}`
                            : "--"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-gray-700 dark:text-gray-300 whitespace-nowrap" title={rx.refillsRemaining != null && rx.refills != null ? `${rx.refillsRemaining} remaining of ${rx.refills} authorized` : undefined}>
                      {rx.refillsRemaining != null && rx.refills != null
                        ? `${rx.refillsRemaining} / ${rx.refills}`
                        : rx.refills != null
                          ? `0 / ${rx.refills}`
                          : "--"}
                    </div>
                    {rx.refillsRemaining != null && rx.refills != null && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">remaining / total</div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{rx.pharmacyName || "--"}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                      {rx.prescriberName && !/^\d+$/.test(rx.prescriberName.trim())
                        ? rx.prescriberName
                        : "--"}
                    </div>
                    {(rx.prescriberNpi || (rx.prescriberName && /^\d+$/.test(rx.prescriberName.trim()))) && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        NPI: {rx.prescriberNpi || rx.prescriberName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <PriorityBadge priority={rx.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rx.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canWriteRx && (
                        <>
                          {/* Edit */}
                          <button
                            onClick={() => onEdit(rx)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Refill - only for active prescriptions with refills remaining */}
                          {rx.status === "active" && (rx.refillsRemaining ?? 0) > 0 && (
                            <button
                              onClick={() => onRefill(rx)}
                              title="Refill"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Discontinue - only for active or on_hold */}
                          {(rx.status === "active" || rx.status === "on_hold") && (
                            <button
                              onClick={() => onDiscontinue(rx)}
                              title="Discontinue"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => onDelete(rx)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && prescriptions.length > 0 && (
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing {page * pageSize + 1}--{Math.min((page + 1) * pageSize, totalElements)} of {totalElements} prescriptions
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                    pageNum === page
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
