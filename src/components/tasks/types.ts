export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "deferred" | "overdue";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskType =
  | "general"
  | "follow_up"
  | "callback"
  | "refill"
  | "lab_review"
  | "referral"
  | "prior_auth"
  | "documentation";

export interface Task {
  id: string;
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  dueTime?: string;
  assignedTo?: string;
  assignedBy?: string;
  patientId?: string;
  patientName?: string;
  encounterId?: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  completedBy?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskStats {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface TaskFormData {
  title: string;
  description: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  assignedTo: string;
  assignedBy: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  referenceType: string;
  referenceId: string;
  notes: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  general: "General",
  follow_up: "Follow Up",
  callback: "Callback",
  refill: "Refill",
  lab_review: "Lab Review",
  referral: "Referral",
  prior_auth: "Prior Auth",
  documentation: "Documentation",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  deferred: "Deferred",
  overdue: "Overdue",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_COLORS: Record<TaskPriority, { dot: string; bg: string; text: string }> = {
  urgent: {
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
  },
  high: {
    dot: "bg-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
  },
  normal: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  low: {
    dot: "bg-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
  },
};

export const EMPTY_FORM: TaskFormData = {
  title: "",
  description: "",
  taskType: "general",
  status: "pending",
  priority: "normal",
  dueDate: "",
  dueTime: "",
  assignedTo: "",
  assignedBy: "",
  patientId: "",
  patientName: "",
  encounterId: "",
  referenceType: "",
  referenceId: "",
  notes: "",
};
