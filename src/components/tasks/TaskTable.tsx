"use client";

import {
  CheckCircle2,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import {
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  type Task,
  type TaskType,
  type TaskStatus,
  type TaskPriority,
} from "./types";
import { formatDisplayDate } from "@/utils/dateUtils";

interface Props {
  tasks: Task[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (p: number) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "completed" || task.status === "cancelled") return false;
  const now = new Date();
  const due = new Date(task.dueDate + "T00:00:00");
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(":").map(Number);
    due.setHours(h, m, 0, 0);
  } else {
    due.setHours(23, 59, 59, 999);
  }
  return now > due;
}

function formatDueDate(date?: string, time?: string): string {
  if (!date) return "--";
  const formatted = formatDisplayDate(date) || "--";
  if (time) return `${formatted} ${time}`;
  return formatted;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    cancelled: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    deferred: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
    overdue: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[status]}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

export default function TaskTable({
  tasks,
  loading,
  page,
  totalPages,
  totalElements,
  onPageChange,
  onComplete,
  onEdit,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading tasks...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
        <Inbox className="w-12 h-12 mb-3" />
        <p className="text-sm font-medium">No tasks found</p>
        <p className="text-xs mt-1">Create a new task to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 w-10">
                <span className="sr-only">Priority</span>
              </th>
              <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Assigned To</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Patient</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Due Date</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tasks.map((task) => {
              const overdue = isOverdue(task);
              const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
              return (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  {/* Priority dot */}
                  <td className="py-3 px-3">
                    <div className="flex items-center" title={PRIORITY_LABELS[task.priority]}>
                      <span className={`w-2.5 h-2.5 rounded-full ${priorityColor.dot}`} />
                    </div>
                  </td>

                  {/* Title + description */}
                  <td className="py-3 px-3 max-w-[240px]">
                    <p
                      className={`font-medium truncate ${
                        task.status === "completed"
                          ? "line-through text-gray-400 dark:text-gray-500"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {task.title || "--"}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                    </span>
                  </td>

                  {/* Assigned To */}
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                    {task.assignedTo || "--"}
                  </td>

                  {/* Patient */}
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                    {task.patientName || "--"}
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-3">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatDueDate(task.dueDate, task.dueTime)}
                    </span>
                    {overdue && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Overdue
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <StatusBadge status={task.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {task.status !== "completed" && task.status !== "cancelled" && (
                        <button
                          onClick={() => onComplete(task)}
                          title="Mark complete"
                          className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(task)}
                        title="Edit task"
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(task)}
                        title="Delete task"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {page * 20 + 1}-{Math.min((page + 1) * 20, totalElements)} of {totalElements} tasks
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-medium text-gray-600 dark:text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
