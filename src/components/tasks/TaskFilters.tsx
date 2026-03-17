"use client";

import { Search, Plus, Filter } from "lucide-react";
import {
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  type TaskType,
  type TaskPriority,
} from "./types";

type StatusTab = "all" | "pending" | "in_progress" | "completed" | "overdue" | "deferred" | "cancelled";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: StatusTab;
  onTabChange: (tab: StatusTab) => void;
  priorityFilter: TaskPriority | "all";
  onPriorityChange: (p: TaskPriority | "all") => void;
  typeFilter: TaskType | "all";
  onTypeChange: (t: TaskType | "all") => void;
  onNewTask: () => void;
}

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "deferred", label: "Deferred" },
  { key: "cancelled", label: "Cancelled" },
  { key: "overdue", label: "Overdue" },
];

export default function TaskFilters({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  priorityFilter,
  onPriorityChange,
  typeFilter,
  onTypeChange,
  onNewTask,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Top row: search + new task button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
        </div>

        {/* Priority filter */}
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value as TaskPriority | "all")}
            className="pl-8 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none cursor-pointer transition"
          >
            <option value="all">All Priorities</option>
            {(Object.entries(PRIORITY_LABELS) as [TaskPriority, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value as TaskType | "all")}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none cursor-pointer pr-8 transition"
          >
            <option value="all">All Types</option>
            {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onNewTask}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
