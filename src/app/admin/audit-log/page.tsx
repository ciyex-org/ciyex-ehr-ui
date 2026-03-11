"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { ScrollText, Activity } from "lucide-react";
import AuditFilters from "@/components/audit/AuditFilters";
import AuditTable, { type AuditLogEntry } from "@/components/audit/AuditTable";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

interface Stats {
  total24h: number;
  total7d: number;
  total30d: number;
}

export default function AuditLogPage() {
  // Data
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<Stats>({ total24h: 0, total7d: 0, total30d: 0 });
  const [resourceTypes, setResourceTypes] = useState<string[]>([
    "Appointment", "Coverage", "Encounter", "InsuranceCompany", "LabOrder",
    "LabResult", "Medication", "Patient", "Practitioner", "Provider",
    "User", "Vitals",
  ]);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Sorting (client-side within current page)
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Fetch stats and resource types once on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(apiUrl("/api/audit-log/stats"));
        if (!res.ok) return;
        const json = await res.json();
        const statsData = json.success ? json.data : json;
        if (statsData) {
          setStats({
            total24h: statsData.total24h ?? 0,
            total7d: statsData.total7d ?? 0,
            total30d: statsData.total30d ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to load audit stats:", err);
      }
    })();

    // Try to load all distinct resource types from a dedicated endpoint or first large page
    (async () => {
      try {
        const res = await fetchWithAuth(apiUrl("/api/audit-log/resource-types"));
        if (res.ok) {
          const json = await res.json();
          const types: string[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
          if (types.length > 0) {
            setResourceTypes(types.filter(Boolean).sort());
            return;
          }
        }
      } catch { /* ignore, fall through to page-based collection */ }
      // Fallback: fetch a larger page to seed the resource type list
      try {
        const res = await fetchWithAuth(apiUrl("/api/audit-log?page=0&size=200"));
        if (res.ok) {
          const json = await res.json();
          const raw = json.data || json;
          const content: AuditLogEntry[] = raw.content ?? (Array.isArray(raw) ? raw : []);
          const types = content
            .map((e: any) => e.resourceType || e.resource_type || e.entityType)
            .filter((rt): rt is string => Boolean(rt));
          if (types.length > 0) {
            setResourceTypes(Array.from(new Set(types)).sort());
          }
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Build query params for the API call
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(pageSize));
    if (search) params.set("q", search);
    if (actionFilter !== "ALL") params.set("action", actionFilter);
    if (resourceTypeFilter !== "ALL") params.set("resourceType", resourceTypeFilter);
    if (userFilter) params.set("userId", userFilter);
    return params;
  }, [page, pageSize, search, actionFilter, resourceTypeFilter, userFilter]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const res = await fetchWithAuth(apiUrl(`/api/audit-log?${params.toString()}`));
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const json = await res.json();
      const raw = json.success ? json.data : json;
      const content: AuditLogEntry[] = raw?.content ?? (Array.isArray(raw) ? raw : []);
      setLogs(content);
      setTotalElements(raw?.totalElements ?? content.length);
      setTotalPages(raw?.totalPages ?? (content.length > 0 ? 1 : 0));

      const newTypes = content
        .map((entry: AuditLogEntry) => entry.resourceType)
        .filter((rt): rt is string => Boolean(rt));
      if (newTypes.length > 0) {
        setResourceTypes((prev) => Array.from(new Set([...prev, ...newTypes])).sort());
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setLogs([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to first page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, actionFilter, resourceTypeFilter, userFilter]);

  // Client-side date filter + sort
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Date range filtering (client-side since API doesn't support date params)
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      result = result.filter((log) => {
        const d = new Date(log.createdAt);
        return !isNaN(d.getTime()) && d >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      result = result.filter((log) => {
        const d = new Date(log.createdAt);
        return !isNaN(d.getTime()) && d <= to;
      });
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];
      const aStr = aVal != null ? String(aVal) : "";
      const bStr = bVal != null ? String(bVal) : "";
      const cmp = aStr.localeCompare(bStr);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [logs, dateFrom, dateTo, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) setPage(newPage);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
  };

  // CSV export
  const handleExport = () => {
    const headers = ["Timestamp", "User", "Role", "Action", "Resource Type", "Resource Name", "Patient", "IP Address", "Details"];
    const csvRows = filteredLogs.map((log) => {
      const row = [
        log.createdAt ?? "",
        log.userName ?? "",
        log.userRole ?? "",
        log.action ?? "",
        log.resourceType ?? "",
        log.resourceName ?? "",
        log.patientName ?? "",
        log.ipAddress ?? "",
        log.details ? `"${String(log.details).replace(/"/g, '""')}"` : "",
      ];
      return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-hidden gap-4">
        {/* Header with stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Audit Log</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalElements.toLocaleString()} total entries
              </p>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2">
            <StatBadge label="24h" count={stats.total24h} color="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
            <StatBadge label="7d" count={stats.total7d} color="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
            <StatBadge label="30d" count={stats.total30d} color="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0">
          <AuditFilters
            search={search}
            onSearchChange={setSearch}
            actionFilter={actionFilter}
            onActionChange={setActionFilter}
            resourceTypeFilter={resourceTypeFilter}
            onResourceTypeChange={setResourceTypeFilter}
            resourceTypes={resourceTypes}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            userFilter={userFilter}
            onUserFilterChange={setUserFilter}
            onExport={handleExport}
          />
        </div>

        {/* Table */}
        <AuditTable
          logs={filteredLogs}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>
    </AdminLayout>
  );
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${color}`}>
      <Activity className="w-3.5 h-3.5" />
      <span>{count.toLocaleString()}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}
