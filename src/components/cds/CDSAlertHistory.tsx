"use client";

import React from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { CDSAlert, SEVERITY_COLORS } from "./types";

interface Props {
  alerts: CDSAlert[];
  loading: boolean;
}

const ActionIcon = ({ action }: { action?: string }) => {
  switch (action) {
    case "acknowledged":
      return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
    case "acted_on":
      return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
    case "overridden":
      return <XCircle className="w-3.5 h-3.5 text-amber-600" />;
    case "snoozed":
      return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    case "dismissed":
      return <XCircle className="w-3.5 h-3.5 text-slate-400" />;
    default:
      return <Eye className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case "warning":
      return <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    default:
      return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
  }
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CDSAlertHistory({ alerts, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse text-sm text-slate-400">Loading alert history...</div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-600">
        <CheckCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">No recent alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${sev.border} ${sev.bg}`}
          >
            <SeverityIcon severity={alert.severity} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {alert.ruleName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  {timeAgo(alert.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{alert.message}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Patient: {alert.patientName}</span>
                {alert.actionTaken && (
                  <span className="inline-flex items-center gap-1 capitalize">
                    <ActionIcon action={alert.actionTaken} />
                    {alert.actionTaken.replace(/_/g, " ")}
                    {alert.actedBy && ` by ${alert.actedBy}`}
                  </span>
                )}
                {alert.overrideReason && (
                  <span className="italic">Reason: {alert.overrideReason}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
