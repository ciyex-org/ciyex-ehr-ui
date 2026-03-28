"use client";

import React, { useEffect, useRef } from "react";
import { Search, Filter, Download, Calendar } from "lucide-react";
import DateInput from "@/components/ui/DateInput";

const ACTIONS = ["ALL", "VIEW", "CREATE", "UPDATE", "DELETE", "SIGN", "PRINT", "EXPORT"] as const;

interface AuditFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  actionFilter: string;
  onActionChange: (v: string) => void;
  resourceTypeFilter: string;
  onResourceTypeChange: (v: string) => void;
  resourceTypes: string[];
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  userFilter: string;
  onUserFilterChange: (v: string) => void;
  onExport: () => void;
}

export default function AuditFilters({
  search,
  onSearchChange,
  actionFilter,
  onActionChange,
  resourceTypeFilter,
  onResourceTypeChange,
  resourceTypes,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  userFilter,
  onUserFilterChange,
  onExport,
}: AuditFiltersProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (v: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(v), 350);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            defaultValue={search}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search user, resource, patient..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Action filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={actionFilter}
            onChange={(e) => onActionChange(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a === "ALL" ? "All Actions" : a}
              </option>
            ))}
          </select>
        </div>

        {/* Resource type filter */}
        <select
          value={resourceTypeFilter}
          onChange={(e) => onResourceTypeChange(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
        >
          <option value="ALL">All Resources</option>
          {resourceTypes.filter((rt) => rt !== "ALL").map((rt) => (
            <option key={rt} value={rt}>
              {rt}
            </option>
          ))}
        </select>

        {/* Date from */}
        <DateInput
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="From date"
        />

        {/* Date to */}
        <DateInput
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="To date"
        />

        {/* User filter */}
        <input
          type="text"
          value={userFilter}
          onChange={(e) => onUserFilterChange(e.target.value)}
          placeholder="Filter by user..."
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-[150px]"
        />

        {/* Export */}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>
  );
}
