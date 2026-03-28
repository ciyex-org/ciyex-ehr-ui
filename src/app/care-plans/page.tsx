"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  ClipboardList,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import CarePlanStatsCards from "@/components/care-plans/CarePlanStatsCards";
import CarePlanCard from "@/components/care-plans/CarePlanCard";
import CarePlanFormPanel from "@/components/care-plans/CarePlanFormPanel";
import {
  CarePlan,
  CarePlanStats,
  PageData,
  CATEGORIES,
  STATUS_TABS,
} from "@/components/care-plans/types";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

export default function CarePlansPage() {
  // Data
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [stats, setStats] = useState<CarePlanStats | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // UI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [authorDraft, setAuthorDraft] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CarePlan | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }

  // ------- Fetch list -------
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${getEnv("NEXT_PUBLIC_API_URL")}/api/care-plans?page=${page}&size=${pageSize}`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (authorFilter) url += `&author=${encodeURIComponent(authorFilter)}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (categoryFilter !== "all") url += `&category=${categoryFilter}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const pd: PageData = json.data;
          // Resolve fresh patient names to avoid showing stale names after patient updates
          const rawItems = pd.content || [];
          const uniqueIds = [...new Set(rawItems.map((p) => p.patientId).filter(Boolean))];
          const nameMap: Record<string, string> = {};
          await Promise.allSettled(
            uniqueIds.map(async (id) => {
              try {
                const r = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`);
                if (r.ok) {
                  const d = await r.json();
                  if (d?.data) nameMap[String(id)] = `${d.data.firstName ?? ""} ${d.data.lastName ?? ""}`.trim();
                }
              } catch { /* silent */ }
            })
          );
          const resolved = rawItems.map((p) => {
            // Ensure interventions are populated: from plan level, or extracted from goals
            let interventions = Array.isArray(p.interventions) ? p.interventions : [];
            if (interventions.length === 0 && Array.isArray(p.goals)) {
              interventions = p.goals.flatMap((g: any) => Array.isArray(g.interventions) ? g.interventions : []);
            }
            return {
              ...p,
              interventions,
              patientName: (p.patientId && nameMap[String(p.patientId)]) ? nameMap[String(p.patientId)] : (p.patientName || ""),
            };
          });
          setPlans(resolved);
          setTotalPages(pd.totalPages);
          setTotalElements(pd.totalElements);
        }
      }
    } catch (err) {
      console.error("Failed to fetch care plans:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, authorFilter, statusFilter, categoryFilter]);

  // ------- Fetch stats -------
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/care-plans/stats`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStats(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounced search
  function handleSearchChange(val: string) {
    setSearchTerm(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(0);
    }, 400);
  }

  // Debounced author filter
  function handleAuthorChange(val: string) {
    setAuthorDraft(val);
    if (authorTimeout.current) clearTimeout(authorTimeout.current);
    authorTimeout.current = setTimeout(() => {
      setAuthorFilter(val.trim());
      setPage(0);
    }, 400);
  }

  // Client-side fallback filter for category, author and search term (in case backend ignores filters)
  const filteredPlans = plans.filter((p) => {
    if (categoryFilter !== "all" && (p.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (authorFilter && !(p.authorName || "").toLowerCase().includes(authorFilter.toLowerCase())) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const searchable = [p.title, p.patientName, p.authorName, p.category, p.status, p.description].filter(Boolean).join(" ").toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  // ------- CRUD -------
  function openNewForm() {
    setEditingPlan(null);
    setShowForm(true);
  }

  function openEditForm(plan: CarePlan) {
    setEditingPlan(plan);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingPlan(null);
  }

  async function handleSave(
    data: Omit<CarePlan, "id" | "createdAt" | "updatedAt">
  ) {
    try {
      const url = editingPlan
        ? apiUrl(`/api/care-plans/${editingPlan.id}`)
        : apiUrl("/api/care-plans");
      const method = editingPlan ? "PUT" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          editingPlan ? "Care plan updated" : "Care plan created",
          "success"
        );
        closeForm();
        fetchPlans();
        fetchStats();
      } else {
        showToast(json.message || "Save failed", "error");
      }
    } catch {
      showToast("Failed to save care plan", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/care-plans/${id}`), {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Care plan deleted", "success");
        fetchPlans();
        fetchStats();
      } else {
        showToast("Failed to delete", "error");
      }
    } catch {
      showToast("Failed to delete care plan", "error");
    }
  }

  // Refresh a single plan (after inline goal/intervention edits)
  async function refreshPlan(planId: string) {
    try {
      const planRes = await fetchWithAuth(apiUrl(`/api/care-plans/${planId}`));
      const planJson = await planRes.json();
      if (!planJson.success) return;
      const plan = planJson.data;

      // Preserve data from plan response if already present (toDto always includes them)
      const planGoals = Array.isArray(plan.goals) ? plan.goals : [];
      const planInterventions = Array.isArray(plan.interventions) ? plan.interventions : [];

      // Try fetching goals from dedicated endpoint
      try {
        const goalRes = await fetchWithAuth(apiUrl(`/api/care-plans/${planId}/goals`));
        if (goalRes.ok) {
          const goalJson = await goalRes.json();
          if (goalJson.success) {
            const fetched = Array.isArray(goalJson.data)
              ? goalJson.data
              : goalJson.data?.content ?? goalJson.data?.goals ?? [];
            plan.goals = fetched.length > 0 ? fetched : planGoals;
          }
        }
      } catch {
        plan.goals = planGoals;
      }

      // Try fetching interventions from dedicated endpoint as well
      try {
        const intRes = await fetchWithAuth(apiUrl(`/api/care-plans/${planId}/interventions`));
        if (intRes.ok) {
          const intJson = await intRes.json();
          if (intJson.success) {
            // Handle array, Page (content), or nested interventions field
            const fetched = Array.isArray(intJson.data)
              ? intJson.data
              : intJson.data?.content ?? intJson.data?.interventions ?? [];
            plan.interventions = fetched.length > 0 ? fetched : planInterventions;
          } else {
            plan.interventions = planInterventions.length > 0
              ? planInterventions
              : (plan.goals ?? []).flatMap((g: any) => g.interventions ?? []);
          }
        } else {
          plan.interventions = planInterventions.length > 0
            ? planInterventions
            : (plan.goals ?? []).flatMap((g: any) => g.interventions ?? []);
        }
      } catch {
        plan.interventions = planInterventions.length > 0
          ? planInterventions
          : (plan.goals ?? []).flatMap((g: any) => g.interventions ?? []);
      }

      // Final fallback: if interventions still empty, try extracting from goals
      if ((!Array.isArray(plan.interventions) || plan.interventions.length === 0) && Array.isArray(plan.goals)) {
        const fromGoals = plan.goals.flatMap((g: any) => Array.isArray(g.interventions) ? g.interventions : []);
        if (fromGoals.length > 0) plan.interventions = fromGoals;
      }

      // Use String comparison to handle both number and string IDs from different API responses
      setPlans((prev) => prev.map((p) => (String(p.id) === String(planId) ? plan : p)));
    } catch {
      // silent — will be stale until next full refresh
    }
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Care Plans
            </h1>
          </div>
          <button
            onClick={openNewForm}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Care Plan
          </button>
        </div>

        {/* Stats Cards */}
        <CarePlanStatsCards stats={stats} />

        {/* Toolbar: Status Tabs + Search + Category Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 flex-shrink-0">
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(0);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search care plans..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Author search */}
            <div className="relative sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by author..."
                value={authorDraft}
                onChange={(e) => handleAuthorChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-2">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Loading care plans...
              </span>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
              <ClipboardList className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No care plans found</p>
              <p className="text-xs mt-1">
                Create a new care plan to get started.
              </p>
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <CarePlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => openEditForm(plan)}
                onDelete={() => handleDelete(plan.id)}
                onRefresh={() => refreshPlan(plan.id)}
                showToast={showToast}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && plans.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-xl flex-shrink-0 mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {page * pageSize + 1}-
              {Math.min((page + 1) * pageSize, totalElements)} of{" "}
              {totalElements}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                Page {page + 1} of {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Slide-out Form Panel */}
        {showForm && (
          <CarePlanFormPanel
            editing={editingPlan}
            onClose={closeForm}
            onSave={handleSave}
          />
        )}

        {/* Toast notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
