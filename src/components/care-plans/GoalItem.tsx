"use client";

import React from "react";
import { Target, Edit, Trash2 } from "lucide-react";
import {
  Goal,
  statusBadgeClass,
  priorityBadgeClass,
  statusLabel,
  formatDate,
} from "./types";

interface Props {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}

export default function GoalItem({ goal, onEdit, onDelete }: Props) {
  const pct =
    goal.targetValue && Number(goal.targetValue) > 0
      ? Math.min(
          100,
          Math.round(
            (Number(goal.currentValue || 0) / Number(goal.targetValue)) * 100
          )
        )
      : null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {goal.description}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
              title="Edit goal"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
              title="Delete goal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${statusBadgeClass(
              goal.status
            )}`}
          >
            {statusLabel(goal.status)}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${priorityBadgeClass(
              goal.priority
            )}`}
          >
            {goal.priority}
          </span>
          {goal.targetDate && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Target: {formatDate(goal.targetDate)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
              <span>
                {goal.measure ? `${goal.measure}: ` : ""}
                {goal.currentValue || 0} / {goal.targetValue}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  pct >= 100
                    ? "bg-green-500"
                    : pct >= 60
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {goal.notes && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">
            {goal.notes}
          </p>
        )}
      </div>
    </div>
  );
}
