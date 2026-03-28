"use client";

import React from "react";

interface AuditDetailRowProps {
  details: string | null;
  colSpan: number;
}

export default function AuditDetailRow({ details, colSpan }: AuditDetailRowProps) {
  let parsed: Record<string, unknown> | null = null;
  try {
    if (details) parsed = JSON.parse(details);
  } catch {
    // details might be plain text
  }

  if (!details) {
    return (
      <tr className="bg-slate-50 dark:bg-slate-800/50">
        <td colSpan={colSpan} className="px-4 py-3 text-sm text-slate-500 italic">
          No additional details recorded.
        </td>
      </tr>
    );
  }

  // If parsed is a change-tracking object with fields/old/new values
  if (parsed && typeof parsed === "object") {
    const entries = Object.entries(parsed);
    const hasFieldChanges = entries.some(
      ([, v]) => v && typeof v === "object" && ("old" in (v as Record<string, unknown>) || "new" in (v as Record<string, unknown>))
    );

    if (hasFieldChanges) {
      return (
        <tr className="bg-slate-50 dark:bg-slate-800/50">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Changed Fields
            </div>
            <div className="grid grid-cols-3 gap-1 text-sm max-w-2xl">
              <div className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase">Field</div>
              <div className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase">Old Value</div>
              <div className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase">New Value</div>
              {entries.map(([field, value]) => {
                const change = value as Record<string, unknown>;
                const formatKey = (k: string) => k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                return (
                  <React.Fragment key={field}>
                    <div className="text-slate-700 dark:text-slate-200 font-medium py-1 border-t border-slate-100 dark:border-slate-700">
                      {formatKey(field)}
                    </div>
                    <div className="text-red-600 dark:text-red-400 py-1 border-t border-slate-100 dark:border-slate-700 break-all">
                      {change.old != null ? String(change.old) : "\u2014"}
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400 py-1 border-t border-slate-100 dark:border-slate-700 break-all">
                      {change.new != null ? String(change.new) : "\u2014"}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </td>
        </tr>
      );
    }

    // Generic JSON object display
    return (
      <tr className="bg-slate-50 dark:bg-slate-800/50">
        <td colSpan={colSpan} className="px-4 py-3">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
            Details
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm max-w-2xl mt-1">
            {Object.entries(parsed).map(([key, val]) => {
              const fmtKey = (k: string) => k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
              return (
                <React.Fragment key={key}>
                  <div className="text-slate-600 dark:text-slate-300 font-medium text-xs py-1 border-t border-slate-100 dark:border-slate-700">{fmtKey(key)}</div>
                  <div className="text-slate-700 dark:text-slate-200 text-xs py-1 border-t border-slate-100 dark:border-slate-700 break-all">{val != null ? String(val) : '—'}</div>
                </React.Fragment>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  // Plain text fallback
  return (
    <tr className="bg-slate-50 dark:bg-slate-800/50">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
          Details
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{details}</p>
      </td>
    </tr>
  );
}
