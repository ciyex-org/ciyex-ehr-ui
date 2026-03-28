"use client";

import React from "react";
import {
  Inbox,
  Send,
  Clock,
  XCircle,
} from "lucide-react";
import { FaxStats } from "./types";

interface Props {
  stats: FaxStats | null;
}

function StatCard({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {count}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default function FaxStatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
      <StatCard
        label="Inbound"
        count={stats?.inbound.total ?? 0}
        icon={<Inbox className="w-5 h-5" />}
        color="blue"
      />
      <StatCard
        label="Outbound"
        count={stats?.outbound.total ?? 0}
        icon={<Send className="w-5 h-5" />}
        color="green"
      />
      <StatCard
        label="Pending"
        count={
          (stats?.inbound.pending ?? 0) + (stats?.outbound.pending ?? 0)
        }
        icon={<Clock className="w-5 h-5" />}
        color="yellow"
      />
      <StatCard
        label="Failed"
        count={stats?.outbound.failed ?? 0}
        icon={<XCircle className="w-5 h-5" />}
        color="red"
      />
    </div>
  );
}
