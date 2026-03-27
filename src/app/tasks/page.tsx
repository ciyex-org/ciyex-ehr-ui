"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import TaskStatsCards from "@/components/tasks/TaskStatsCards";
import TaskFilters from "@/components/tasks/TaskFilters";
import TaskTable from "@/components/tasks/TaskTable";
import TaskFormPanel from "@/components/tasks/TaskFormPanel";
import DeleteConfirmDialog from "@/components/tasks/DeleteConfirmDialog";
import ToastContainer, { type ToastMessage } from "@/components/tasks/Toast";
import {
  EMPTY_FORM,
  type Task,
  type TaskStats,
  type TaskFormData,
  type TaskPriority,
  type TaskType,
} from "@/components/tasks/types";

type StatusTab = "all" | "pending" | "in_progress" | "completed" | "overdue" | "deferred" | "cancelled";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

function getCurrentUserName(): string {
  if (typeof window === "undefined") return "";
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
    if (!token) return "";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name || payload.preferred_username || "User";
  } catch {
    return "";
  }
}

export default function TasksPage() {
  // ---- State ----
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ pending: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((type: "success" | "error", text: string) => {
    const id = String(++toastIdRef.current);
    setToasts((prev) => [...prev, { id, type, text }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useCallback((q: string) => {
    setSearchInput(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(q);
      setPage(0);
    }, 300);
  }, []);

  // ---- Data fetching ----
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/tasks/stats"));
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) setStats(json.data);
      }
    } catch (err) {
      console.error("Failed to load task stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: "20" });

      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (activeTab !== "all") params.set("status", activeTab);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (typeFilter !== "all") params.set("taskType", typeFilter);

      const res = await fetchWithAuth(apiUrl(`/api/tasks?${params.toString()}`));
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          // Handle both paginated (content) and flat array responses
          const items = Array.isArray(json.data) ? json.data : (json.data.content || []);
          // Resolve fresh patient names to avoid showing stale names after patient updates
          const uniqueIds = [...new Set(items.map((t: any) => t.patientId).filter(Boolean))];
          const nameMap: Record<string, string> = {};
          await Promise.allSettled(
            uniqueIds.map(async (id) => {
              try {
                const r = await fetchWithAuth(apiUrl(`/api/patients/${id}`));
                if (r.ok) {
                  const d = await r.json();
                  if (d?.data) nameMap[String(id)] = `${d.data.firstName ?? ""} ${d.data.lastName ?? ""}`.trim();
                }
              } catch { /* silent */ }
            })
          );
          const resolved = items.map((t: any) => ({
            ...t,
            patientName: (t.patientId && nameMap[String(t.patientId)]) ? nameMap[String(t.patientId)] : (t.patientName || ""),
          }));
          setTasks(resolved);
          setTotalPages(Array.isArray(json.data) ? 1 : (json.data.totalPages || 1));
          setTotalElements(Array.isArray(json.data) ? items.length : (json.data.totalElements || 0));
        } else {
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, activeTab, priorityFilter, typeFilter]);

  // Load on mount and when filters change
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ---- Handlers ----
  const handleNewTask = useCallback(() => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setFormOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingId(task.id);
    // Normalize date values — backend may return Java LocalDate as [yyyy,mm,dd] array
    const normalizeDate = (d: any): string => {
      if (!d) return "";
      if (Array.isArray(d)) {
        const [y, m, day] = d;
        return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      return String(d);
    };
    const normalizeTime = (t: any): string => {
      if (!t) return "";
      if (Array.isArray(t)) {
        const [h, m] = t;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      return String(t);
    };
    setFormData({
      title: task.title || "",
      description: task.description || "",
      taskType: task.taskType || "general",
      status: task.status || "pending",
      priority: task.priority || "normal",
      dueDate: normalizeDate(task.dueDate),
      dueTime: normalizeTime(task.dueTime),
      assignedTo: task.assignedTo || "",
      assignedBy: task.assignedBy || "",
      patientId: task.patientId != null ? String(task.patientId) : "",
      patientName: task.patientName || "",
      encounterId: task.encounterId != null ? String(task.encounterId) : "",
      referenceType: task.referenceType || "",
      referenceId: task.referenceId != null ? String(task.referenceId) : "",
      notes: task.notes || "",
    });
    setFormOpen(true);
  }, []);

  const handleSaveTask = useCallback(async () => {
    // Field-level validation is handled by TaskFormPanel (inline errors + disabled button)
    const t = formData.title.trim();
    if (!t || !/^[A-Za-z0-9\s\-_/()&.,:'!?]+$/.test(t) || /^-|-$/.test(t) || !/[A-Za-z]/.test(t)) return;
    setSaving(true);
    try {
      const url = editingId ? apiUrl(`/api/tasks/${editingId}`) : apiUrl("/api/tasks");
      const method = editingId ? "PUT" : "POST";

      // Build payload, omitting empty strings
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(formData)) {
        if (v !== "") payload[k] = v;
      }

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast("success", editingId ? "Task updated successfully" : "Task created successfully");
        setFormOpen(false);
        setEditingId(null);
        setFormData({ ...EMPTY_FORM });
        loadTasks();
        loadStats();
      } else {
        const json = await res.json().catch(() => null);
        // Show user-friendly message instead of raw backend JSON errors
        let errorMsg = `Failed to ${editingId ? "update" : "create"} task`;
        if (json?.message && !json.message.includes("JSON parse error") && !json.message.includes("Cannot deserialize")) {
          errorMsg = json.message;
        } else if (json?.message) {
          errorMsg = "Invalid data entered. Please check your input and try again.";
        }
        addToast("error", errorMsg);
      }
    } catch (err) {
      console.error("Save task error:", err);
      addToast("error", "An error occurred while saving the task");
    } finally {
      setSaving(false);
    }
  }, [formData, editingId, addToast, loadTasks, loadStats]);

  const handleCompleteTask = useCallback(async (task: Task) => {
    try {
      const completedBy = getCurrentUserName();
      const res = await fetchWithAuth(apiUrl(`/api/tasks/${task.id}/complete`), {
        method: "POST",
        body: JSON.stringify({ completedBy }),
      });
      if (res.ok) {
        addToast("success", `"${task.title}" marked as complete`);
        loadTasks();
        loadStats();
      } else {
        addToast("error", "Failed to complete task");
      }
    } catch (err) {
      console.error("Complete task error:", err);
      addToast("error", "An error occurred");
    }
  }, [addToast, loadTasks, loadStats]);

  const handleDeleteTask = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/tasks/${deleteTarget.id}`), {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("success", `"${deleteTarget.title}" deleted`);
        setDeleteTarget(null);
        loadTasks();
        loadStats();
      } else {
        addToast("error", "Failed to delete task");
      }
    } catch (err) {
      console.error("Delete task error:", err);
      addToast("error", "An error occurred");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, addToast, loadTasks, loadStats]);

  const handleTabChange = useCallback((tab: StatusTab) => {
    setActiveTab(tab);
    setPage(0);
  }, []);

  const handlePriorityChange = useCallback((p: TaskPriority | "all") => {
    setPriorityFilter(p);
    setPage(0);
  }, []);

  const handleTypeChange = useCallback((t: TaskType | "all") => {
    setTypeFilter(t);
    setPage(0);
  }, []);

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Stats */}
          <TaskStatsCards stats={stats} loading={statsLoading} />

          {/* Filters & Table card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
            <div className="px-4 py-4">
              <TaskFilters
                searchQuery={searchInput}
                onSearchChange={debouncedSearch}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                priorityFilter={priorityFilter}
                onPriorityChange={handlePriorityChange}
                typeFilter={typeFilter}
                onTypeChange={handleTypeChange}
                onNewTask={handleNewTask}
              />
            </div>
            <TaskTable
              tasks={tasks}
              loading={loading}
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={setPage}
              onComplete={handleCompleteTask}
              onEdit={handleEditTask}
              onDelete={setDeleteTarget}
            />
          </div>
        </div>

        {/* Slide-out form panel */}
        <TaskFormPanel
          open={formOpen}
          form={formData}
          onChange={setFormData}
          onClose={() => {
            setFormOpen(false);
            setEditingId(null);
          }}
          onSave={handleSaveTask}
          saving={saving}
          isEditing={!!editingId}
        />

        {/* Delete confirmation */}
        <DeleteConfirmDialog
          open={!!deleteTarget}
          taskTitle={deleteTarget?.title || ""}
          deleting={deleting}
          onConfirm={handleDeleteTask}
          onCancel={() => setDeleteTarget(null)}
        />

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminLayout>
  );
}
