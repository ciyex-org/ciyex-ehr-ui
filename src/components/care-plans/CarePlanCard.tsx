"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  User,
  Calendar,
  Target,
  Activity,
  Loader2,
} from "lucide-react";
import {
  CarePlan,
  Goal,
  Intervention,
  EMPTY_GOAL,
  EMPTY_INTERVENTION,
  statusBadgeClass,
  categoryLabel,
  formatDate,
  statusLabel,
} from "./types";
import GoalItem from "./GoalItem";
import InterventionItem from "./InterventionItem";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import DateInput from "@/components/ui/DateInput";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

interface Props {
  plan: CarePlan;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

export default function CarePlanCard({
  plan,
  onEdit,
  onDelete,
  onRefresh,
  showToast,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([]);
  // Local copies so optimistic updates show immediately
  const [localGoals, setLocalGoals] = useState<Goal[]>(plan.goals || []);
  const [localInterventions, setLocalInterventions] = useState<Intervention[]>(plan.interventions || []);

  // Sync local state when the plan prop is refreshed from the server
  useEffect(() => {
    setLocalGoals(plan.goals || []);
  }, [plan.goals]);
  useEffect(() => {
    setLocalInterventions(plan.interventions || []);
  }, [plan.interventions]);

  // Load providers with FHIR fallback
  useEffect(() => {
    async function loadProviders() {
      const parseList = (json: any): any[] => {
        if (Array.isArray(json?.data?.content)) return json.data.content;
        if (Array.isArray(json?.data)) return json.data;
        if (Array.isArray(json?.content)) return json.content;
        if (Array.isArray(json)) return json;
        return [];
      };
      const mapProviders = (raw: any[]) => raw.map((p: any) => ({
        id: p.id || p.fhirId,
        name: `${p?.identification?.firstName ?? p.firstName ?? ""} ${p?.identification?.lastName ?? p.lastName ?? ""}`.trim() || p.name || p.fullName || p.displayName || "",
      })).filter((p: { name: string }) => p.name);

      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/providers`);
        if (res.ok) {
          const list = mapProviders(parseList(await res.json()));
          if (list.length > 0) { setProviders(list); return; }
        }
      } catch { /* silent */ }
      // FHIR fallback
      try {
        const fb = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/fhir-resource/providers?size=200`);
        if (fb.ok) {
          const list = mapProviders(parseList(await fb.json()));
          if (list.length > 0) setProviders(list);
        }
      } catch { /* silent */ }
    }
    loadProviders();
  }, []);

  // Auto-refresh to load goals/interventions on first expand
  function handleToggleExpand() {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && !detailsLoaded) {
      setDetailsLoaded(true);
      onRefresh();
    }
  }

  // Inline goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState<Omit<Goal, "id">>({ ...EMPTY_GOAL });
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);

  // Inline intervention form
  const [showIntForm, setShowIntForm] = useState(false);
  const [intForm, setIntForm] = useState<Omit<Intervention, "id">>({ ...EMPTY_INTERVENTION });
  const [editingIntId, setEditingIntId] = useState<string | null>(null);
  const [savingInt, setSavingInt] = useState(false);

  // --- Goal CRUD ---
  async function saveGoal() {
    setSavingGoal(true);
    try {
      let res: Response;
      if (editingGoalId) {
        res = await fetchWithAuth(
          apiUrl(`/api/care-plans/${plan.id}/goals/${editingGoalId}`),
          { method: "PUT", body: JSON.stringify(goalForm) }
        );
        if (!res.ok) throw new Error("Update failed");
        // Optimistically update the goal in local state
        setLocalGoals((prev) =>
          prev.map((g) => (String(g.id) === editingGoalId ? { ...goalForm, id: editingGoalId } : g))
        );
        showToast("Goal updated", "success");
      } else {
        res = await fetchWithAuth(apiUrl(`/api/care-plans/${plan.id}/goals`), {
          method: "POST",
          body: JSON.stringify(goalForm),
        });
        if (!res.ok) throw new Error("Create failed");
        // Optimistically add the goal so it shows immediately
        try {
          const saved = await res.clone().json();
          const newGoal: Goal = saved?.data ?? { ...goalForm, id: String(Date.now()) };
          setLocalGoals((prev) => [...prev, newGoal]);
        } catch {
          setLocalGoals((prev) => [...prev, { ...goalForm, id: String(Date.now()) }]);
        }
        showToast("Goal added", "success");
      }
      setShowGoalForm(false);
      setEditingGoalId(null);
      setGoalForm({ ...EMPTY_GOAL });
      onRefresh();
    } catch {
      showToast("Failed to save goal", "error");
    } finally {
      setSavingGoal(false);
    }
  }

  async function deleteGoal(goalId: string) {
    setLocalGoals((prev) => prev.filter((g) => String(g.id) !== goalId));
    try {
      await fetchWithAuth(
        apiUrl(`/api/care-plans/${plan.id}/goals/${goalId}`),
        { method: "DELETE" }
      );
      showToast("Goal deleted", "success");
      onRefresh();
    } catch {
      showToast("Failed to delete goal", "error");
      onRefresh(); // Revert by re-fetching
    }
  }

  function editGoal(goal: Goal) {
    setEditingGoalId(goal.id || null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = goal;
    setGoalForm(rest);
    setShowGoalForm(true);
    setShowIntForm(false);
  }

  // --- Intervention CRUD ---
  async function saveIntervention() {
    setSavingInt(true);
    try {
      let res: Response;
      if (editingIntId) {
        res = await fetchWithAuth(
          apiUrl(`/api/care-plans/${plan.id}/interventions/${editingIntId}`),
          { method: "PUT", body: JSON.stringify(intForm) }
        );
        if (!res.ok) throw new Error("Update failed");
        // Optimistically update the intervention in local state
        setLocalInterventions((prev) =>
          prev.map((i) => (i.id === editingIntId ? { ...intForm, id: editingIntId } : i))
        );
        showToast("Intervention updated", "success");
      } else {
        res = await fetchWithAuth(
          apiUrl(`/api/care-plans/${plan.id}/interventions`),
          { method: "POST", body: JSON.stringify(intForm) }
        );
        if (!res.ok) throw new Error("Create failed");
        // Optimistically add the intervention so it shows immediately
        try {
          const saved = await res.clone().json();
          const newInt: Intervention = saved?.data ?? { ...intForm, id: String(Date.now()) };
          setLocalInterventions((prev) => [...prev, newInt]);
        } catch {
          setLocalInterventions((prev) => [...prev, { ...intForm, id: String(Date.now()) }]);
        }
        showToast("Intervention added", "success");
      }
      setShowIntForm(false);
      setEditingIntId(null);
      setIntForm({ ...EMPTY_INTERVENTION });
      onRefresh();
    } catch {
      showToast("Failed to save intervention", "error");
    } finally {
      setSavingInt(false);
    }
  }

  async function deleteIntervention(intId: string) {
    setLocalInterventions((prev) => prev.filter((i) => i.id !== intId));
    try {
      await fetchWithAuth(
        apiUrl(`/api/care-plans/${plan.id}/interventions/${intId}`),
        { method: "DELETE" }
      );
      showToast("Intervention deleted", "success");
      onRefresh();
    } catch {
      showToast("Failed to delete intervention", "error");
      onRefresh(); // Revert by re-fetching
    }
  }

  function editIntervention(int: Intervention) {
    setEditingIntId(int.id || null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = int;
    setIntForm(rest);
    setShowIntForm(true);
    setShowGoalForm(false);
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-shadow hover:shadow-md">
      {/* Card header — click to expand */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={handleToggleExpand}
      >
        <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {plan.title}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${statusBadgeClass(
                plan.status
              )}`}
            >
              {statusLabel(plan.status)}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              {categoryLabel(plan.category)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" />
              {plan.patientName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(plan.startDate)}
              {plan.endDate ? ` - ${formatDate(plan.endDate)}` : ""}
            </span>
            {localGoals?.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Target className="w-3 h-3" />
                {localGoals.length} goal{localGoals.length !== 1 ? "s" : ""}
              </span>
            )}
            {localInterventions?.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {localInterventions.length} intervention
                {localInterventions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
            title="Edit plan"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
            title="Delete plan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-4">
          {/* Description */}
          {plan.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {plan.description}
            </p>
          )}

          {/* Author + Notes */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {plan.authorName && <span>Author: {plan.authorName}</span>}
            {plan.notes && (
              <span className="truncate max-w-[300px]">
                Notes: {plan.notes}
              </span>
            )}
          </div>

          {/* ------- Goals Section ------- */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Goals ({localGoals?.length || 0})
              </h4>
              <button
                onClick={() => {
                  setShowGoalForm(true);
                  setEditingGoalId(null);
                  setGoalForm({ ...EMPTY_GOAL });
                  setShowIntForm(false);
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Goal
              </button>
            </div>

            {localGoals?.length > 0 ? (
              <div className="space-y-2">
                {localGoals.map((g) => (
                  <GoalItem
                    key={g.id}
                    goal={g}
                    onEdit={() => editGoal(g)}
                    onDelete={() => g.id && deleteGoal(g.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600 italic">
                No goals yet
              </p>
            )}

            {/* Inline Goal Form */}
            {showGoalForm && (
              <div className="mt-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 space-y-3">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {editingGoalId ? "Edit Goal" : "New Goal"}
                </h5>
                <input
                  type="text"
                  placeholder="Goal description"
                  value={goalForm.description}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, description: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <DateInput
                    value={goalForm.targetDate}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, targetDate: e.target.value })
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Target date"
                  />
                  <input
                    type="text"
                    placeholder="Measure"
                    value={goalForm.measure}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, measure: e.target.value })
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Target value"
                    value={goalForm.targetValue}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, targetValue: e.target.value })
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={goalForm.priority}
                    onChange={(e) =>
                      setGoalForm({
                        ...goalForm,
                        priority: e.target.value as Goal["priority"],
                      })
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveGoal}
                    disabled={savingGoal || !goalForm.description}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {savingGoal && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    {editingGoalId ? "Update" : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setShowGoalForm(false);
                      setEditingGoalId(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ------- Interventions Section ------- */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Interventions ({localInterventions?.length || 0})
              </h4>
              <button
                onClick={() => {
                  setShowIntForm(true);
                  setEditingIntId(null);
                  setIntForm({ ...EMPTY_INTERVENTION });
                  setShowGoalForm(false);
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Intervention
              </button>
            </div>

            {localInterventions?.length > 0 ? (
              <div className="space-y-2">
                {localInterventions.map((int) => (
                  <InterventionItem
                    key={int.id}
                    intervention={int}
                    onEdit={() => editIntervention(int)}
                    onDelete={() => int.id && deleteIntervention(int.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600 italic">
                No interventions yet
              </p>
            )}

            {/* Inline Intervention Form */}
            {showIntForm && (
              <div className="mt-3 p-3 rounded-lg bg-teal-50/50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/50 space-y-3">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {editingIntId ? "Edit Intervention" : "New Intervention"}
                </h5>
                <input
                  type="text"
                  placeholder="Intervention description"
                  value={intForm.description}
                  onChange={(e) =>
                    setIntForm({ ...intForm, description: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={intForm.assignedTo}
                    onChange={(e) =>
                      setIntForm({ ...intForm, assignedTo: e.target.value })
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Assign to provider...</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={intForm.frequency}
                    onChange={(e) =>
                      setIntForm({
                        ...intForm,
                        frequency: e.target.value as Intervention["frequency"],
                      })
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="as_needed">As Needed</option>
                    <option value="once">Once</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveIntervention}
                    disabled={savingInt || !intForm.description}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {savingInt && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    {editingIntId ? "Update" : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setShowIntForm(false);
                      setEditingIntId(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
