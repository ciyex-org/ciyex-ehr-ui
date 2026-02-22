"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  AlertTriangle,
  Info,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  CDSRule,
  RULE_TYPE_LABELS,
  SEVERITY_COLORS,
} from "./types";

interface Props {
  rules: CDSRule[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onEdit: (rule: CDSRule) => void;
  onDelete: (rule: CDSRule) => void;
  onToggle: (rule: CDSRule) => void;
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
    case "warning":
      return <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    default:
      return <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
  }
};

export default function CDSRuleTable({
  rules,
  loading,
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  onToggle,
}: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Loading rules...</span>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
        <ShieldAlert className="w-12 h-12 mb-3" />
        <p className="text-sm font-medium">No CDS rules found</p>
        <p className="text-xs mt-1">Create a rule to start providing clinical decision support.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Rule</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden lg:table-cell">Trigger</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Severity</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Action</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rules.map((rule) => {
              const sev = SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.info;
              return (
                <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{rule.name}</div>
                    {rule.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {rule.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600 dark:text-slate-400 text-xs capitalize">
                    {rule.triggerEvent?.replace(/_/g, " ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.text}`}>
                      <SeverityIcon severity={rule.severity} />
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400 capitalize">
                    {rule.actionType?.replace(/_/g, " ") || "alert"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onToggle(rule)}
                      title={rule.isActive ? "Click to deactivate" : "Click to activate"}
                      className="inline-flex items-center"
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {rule.referenceUrl && (
                        <a
                          href={rule.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Reference"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => onEdit(rule)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(rule)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0 mt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400 px-2">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
