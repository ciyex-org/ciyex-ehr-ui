// ---------------------------------------------------------------------------
// Care Plans – shared types
// ---------------------------------------------------------------------------
import { formatDisplayDate } from "@/utils/dateUtils";

export interface Goal {
  id?: string;
  description: string;
  targetDate: string;
  status: "in_progress" | "achieved" | "not_achieved" | "cancelled";
  measure: string;
  currentValue: string;
  targetValue: string;
  priority: "low" | "medium" | "high";
  notes: string;
}

export interface Intervention {
  id?: string;
  goalId?: string;
  description: string;
  assignedTo: string;
  frequency: "daily" | "weekly" | "monthly" | "as_needed" | "once";
  status: "active" | "completed" | "cancelled";
  notes: string;
}

export interface CarePlan {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  status: "draft" | "active" | "completed" | "revoked" | "on_hold";
  category: string;
  startDate: string;
  endDate: string;
  authorName: string;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  goals: Goal[];
  interventions: Intervention[];
}

export interface CarePlanStats {
  draft: number;
  active: number;
  completed: number;
  revoked: number;
  onHold: number;
}

export interface PageData {
  content: CarePlan[];
  totalPages: number;
  totalElements: number;
}

export const EMPTY_GOAL: Omit<Goal, "id"> = {
  description: "",
  targetDate: "",
  status: "in_progress",
  measure: "",
  currentValue: "",
  targetValue: "",
  priority: "medium",
  notes: "",
};

export const EMPTY_INTERVENTION: Omit<Intervention, "id"> = {
  description: "",
  assignedTo: "",
  frequency: "as_needed",
  status: "active",
  notes: "",
};

export const EMPTY_FORM: Omit<CarePlan, "id" | "createdAt" | "updatedAt"> = {
  patientId: "",
  patientName: "",
  title: "",
  status: "draft",
  category: "chronic_disease",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  authorName: "",
  description: "",
  notes: "",
  goals: [],
  interventions: [],
};

export const CATEGORIES: { value: string; label: string }[] = [
  { value: "chronic_disease", label: "Chronic Disease" },
  { value: "preventive", label: "Preventive" },
  { value: "post_surgical", label: "Post-Surgical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "rehabilitation", label: "Rehabilitation" },
  { value: "palliative", label: "Palliative" },
  { value: "other", label: "Other" },
];

export const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "revoked", label: "Revoked" },
  { key: "on_hold", label: "On Hold" },
];

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    revoked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    achieved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    not_achieved: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-500",
  };
  return map[status] || map.draft;
}

export function priorityBadgeClass(priority: string): string {
  const map: Record<string, string> = {
    low: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[priority] || map.medium;
}

export function frequencyBadgeClass(_freq: string): string {
  return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
}

export function categoryLabel(cat: string): string {
  const found = CATEGORIES.find((c) => c.value === cat);
  return found ? found.label : cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "--";
  return formatDisplayDate(d) || "--";
}

export function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
