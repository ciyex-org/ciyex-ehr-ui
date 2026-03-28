"use client";

import React from "react";
import {
  ClipboardList,
  Activity,
  CheckCircle2,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { CarePlanStats } from "./types";

interface Props {
  stats: CarePlanStats | null;
}

const CARDS: {
  key: keyof CarePlanStats;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    key: "draft",
    label: "Draft",
    icon: <ClipboardList className="w-5 h-5" />,
    color: "bg-gray-50 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400",
  },
  {
    key: "active",
    label: "Active",
    icon: <Activity className="w-5 h-5" />,
    color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  },
  {
    key: "completed",
    label: "Completed",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    key: "revoked",
    label: "Revoked",
    icon: <XCircle className="w-5 h-5" />,
    color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  },
  {
    key: "onHold",
    label: "On Hold",
    icon: <PauseCircle className="w-5 h-5" />,
    color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
];

export default function CarePlanStatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 flex-shrink-0">
      {CARDS.map((c) => (
        <div
          key={c.key}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3"
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${c.color}`}
          >
            {c.icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats ? stats[c.key] : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {c.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
