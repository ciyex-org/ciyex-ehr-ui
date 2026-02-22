"use client";

import { Clock, PlayCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import type { TaskStats } from "./types";

interface Props {
  stats: TaskStats;
  loading: boolean;
}

const cards = [
  {
    key: "pending" as const,
    label: "Pending",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    key: "inProgress" as const,
    label: "In Progress",
    icon: PlayCircle,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
  },
];

export default function TaskStatsCards({ stats, loading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ key, label, icon: Icon, color, bg, border }) => (
        <div
          key={key}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${border} ${bg} transition-colors`}
        >
          <div className={`p-2 rounded-lg bg-white/60 dark:bg-gray-800/60`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            {loading ? (
              <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
            ) : (
              <p className={`text-xl font-semibold ${color}`}>{stats[key]}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
