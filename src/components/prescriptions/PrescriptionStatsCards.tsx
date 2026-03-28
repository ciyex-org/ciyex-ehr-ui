"use client";

import React from "react";
import {
  Pill,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Ban,
} from "lucide-react";
import { PrescriptionStats, PrescriptionStatus } from "./types";

const STAT_CARDS: {
  key: keyof PrescriptionStats;
  statusKey: PrescriptionStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { key: "active", statusKey: "active", label: "Active", icon: <Pill className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
  { key: "completed", statusKey: "completed", label: "Completed", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 dark:text-green-400" },
  { key: "cancelled", statusKey: "cancelled", label: "Cancelled", icon: <XCircle className="w-4 h-4" />, color: "text-gray-500 dark:text-gray-400" },
  { key: "on_hold", statusKey: "on_hold", label: "On Hold", icon: <PauseCircle className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400" },
  { key: "discontinued", statusKey: "discontinued", label: "Discontinued", icon: <Ban className="w-4 h-4" />, color: "text-red-600 dark:text-red-400" },
];

interface Props {
  stats: PrescriptionStats;
  activeFilter: PrescriptionStatus | "all";
  onFilterChange: (status: PrescriptionStatus | "all") => void;
}

export default function PrescriptionStatsCards({ stats, activeFilter, onFilterChange }: Props) {
  return (
    <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {STAT_CARDS.map((sc) => {
        const isActive = activeFilter === sc.statusKey;
        return (
          <div
            key={sc.key}
            className={`bg-white dark:bg-slate-900 rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer transition ${
              isActive
                ? "border-blue-400 dark:border-blue-500 ring-1 ring-blue-200 dark:ring-blue-800"
                : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
            }`}
            onClick={() => onFilterChange(activeFilter === sc.statusKey ? "all" : sc.statusKey)}
          >
            <div className={`flex-shrink-0 ${sc.color}`}>{sc.icon}</div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {stats[sc.key]}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{sc.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
