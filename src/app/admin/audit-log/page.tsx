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
        if (json.success && json.data) {
          setStats({
            total24h: json.data.total24h ?? 0,
            total7d: json.data.total7d ?? 0,
            total30d: json.data.total30d ?? 0,
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
    params.set("sort", "createdAt,desc");
    if (search) params.set("q", search);
    if (actionFilter !== "ALL") params.set("action", actionFilter);
    if (resourceTypeFilter !== "ALL") params.set("resourceType", resourceTypeFilter);
    if (userFilter) params.set("userId", userFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params;
  }, [page, pageSize, search, actionFilter, resourceTypeFilter, userFilter, dateFrom, dateTo]);

  // Error state
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = buildParams();
      // Try primary endpoint first
      let res = await fetchWithAuth(apiUrl(`/api/audit-log?${params.toString()}`));
      // Fallback endpoints if primary fails
      if (!res.ok) {
        const fallbacks = [
          apiUrl(`/api/audit-logs?${params.toString()}`),
          apiUrl(`/api/admin/audit-log?${params.toString()}`),
          apiUrl(`/api/admin/audit?${params.toString()}`),
          apiUrl(`/api/fhir-resource/audit-log?${params.toString()}`),
          apiUrl(`/api/system/audit-log?${params.toString()}`),
        ];
        for (const fb of fallbacks) {
          try {
            const fbRes = await fetchWithAuth(fb);
            if (fbRes.ok) { res = fbRes; break; }
          } catch { /* try next */ }
        }
      }
      if (!res.ok) throw new Error(`Failed to fetch audit logs (HTTP ${res.status})`);
      const json = await res.json();
      const responseData = json.data ?? json;
      if (json.success !== false && responseData) {
        const rawContent: any[] = responseData.content ?? (Array.isArray(responseData) ? responseData : responseData.items ?? responseData.records ?? []);
        // Normalize field names — backend may use snake_case, camelCase, or nested variants
        // Also parse details JSON as a last-resort fallback for missing user/resource fields
        const parseDetailsJson = (raw: any): Record<string, any> => {
          if (!raw) return {};
          if (typeof raw === "object") return raw;
          try { return JSON.parse(raw); } catch { return {}; }
        };
        const content: AuditLogEntry[] = rawContent.map((e: any) => {
          const d = parseDetailsJson(e.details || e.description || e.message);
          const rawUserId = e.userId || e.user_id || d.userId || d.user_id || "";
          const rawResourceId = e.resourceId || e.resource_id || e.entityId || e.entity_id || d.resourceId || "";
          // If resourceId is "ResourceType/id" (FHIR format), extract the type prefix
          const resourceTypeFromId = (typeof rawResourceId === "string" && rawResourceId.includes("/"))
            ? rawResourceId.split("/")[0] : "";
          return {
            ...e,
            userName:     e.userName     || e.user_name    || e.username      || e.performedBy  || e.performedByName || e.createdBy || e.createdByName || e.operator || e.operatorName || (typeof e.user === "string" ? e.user : (e.user?.name || e.user?.fullName || e.user?.username || e.user?.email || "")) || e.actor || e.actorName || e.modifiedBy || e.updatedBy || e.changedBy || e.initiator || rawUserId || e.email || e.subject || e.login || d.userName || d.performedBy || d.createdBy || d.operator || d.actor || d.user || "",
            userRole:     e.userRole     || e.user_role    || e.role          || d.userRole || d.role || "",
            resourceType: e.resourceType || e.resource_type|| e.entityType    || e.entity_type  || e.type || e.targetType || e.targetEntityType || e.objectType || e.category || (typeof e.resource === "string" ? e.resource : e.resource?.type || e.resource?.resourceType || "") || e.module || d.resourceType || d.entityType || d.type || resourceTypeFromId || "",
            resourceName: e.resourceName || e.resource_name|| e.entityName    || e.entity_name  || e.targetName || e.targetEntityName || e.affectedResource || e.name || e.target || e.object || (e.subject && e.subject !== e.userName ? e.subject : "") || e.display || (e.resource && typeof e.resource === "object" ? e.resource.name || e.resource.display || "" : "") || d.resourceName || d.entityName || d.name || "",
            resourceId:   rawResourceId,
            ipAddress:    e.ipAddress    || e.ip_address   || e.ip            || "",
            action:       e.action       || e.actionType   || e.operation     || "",
            createdAt:    e.createdAt    || e.created_at   || e.timestamp     || e.date          || "",
            patientName:  e.patientName  || e.patient_name || "",
            details:      (() => {
              const raw = e.details || e.description || e.message || e.changeLog || e.changelog || e.changes || e.auditDetails || e.audit_details || e.metadata || e.payload || e.info || e.reason || e.comment || e.notes || null;
              if (raw != null) {
                if (typeof raw === "string") return raw;
                try { return JSON.stringify(raw); } catch { return String(raw); }
              }
              // Build details from available fields when details column is empty
              const built: Record<string, string> = {};
              const action = e.action || e.actionType || e.operation || "";
              const resType = e.resourceType || e.resource_type || e.entityType || e.type || "";
              const resName = e.resourceName || e.resource_name || e.entityName || e.name || "";
              const resId = rawResourceId;
              if (action) built["Action"] = action;
              if (resType) built["Resource"] = resType;
              if (resName) built["Name"] = resName;
              if (resId) built["ID"] = typeof resId === "string" ? resId : String(resId);
              if (e.ipAddress || e.ip_address || e.ip) built["IP"] = e.ipAddress || e.ip_address || e.ip;
              return Object.keys(built).length > 0 ? JSON.stringify(built) : null;
            })(),
          };
        });
        setLogs(content);
        setTotalElements(responseData.totalElements ?? responseData.total ?? content.length ?? 0);
        setTotalPages(responseData.totalPages ?? (responseData.totalElements ? Math.ceil(responseData.totalElements / pageSize) : (content.length > 0 ? 1 : 0)));

        // Collect distinct resource types for filter dropdown (use functional update to avoid stale closure)
        const newTypes = content
          .map((entry: AuditLogEntry) => entry.resourceType || (entry as any).resource_type || (entry as any).entityType)
          .filter((rt): rt is string => Boolean(rt));
        setResourceTypes((prev) => Array.from(new Set([...prev, ...newTypes])).sort());
      } else {
        throw new Error(json.message || "Failed to fetch audit logs");
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setFetchError(err instanceof Error ? err.message : "Failed to fetch audit logs");
      setLogs([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [buildParams, pageSize]);

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
                {loading ? "Loading…" : fetchError ? "Failed to load entries" : `${totalElements.toLocaleString()} total entries`}
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

        {/* Error banner */}
        {fetchError && (
          <div className="flex-shrink-0 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{fetchError}</span>
            <button onClick={fetchLogs} className="ml-3 px-3 py-1 bg-red-100 dark:bg-red-900/40 rounded hover:bg-red-200 dark:hover:bg-red-900/60 text-xs font-medium">
              Retry
            </button>
          </div>
        )}

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
