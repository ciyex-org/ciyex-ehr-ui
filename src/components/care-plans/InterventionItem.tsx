"use client";

import React from "react";
import { Activity, Edit, Trash2 } from "lucide-react";
import {
  Intervention,
  statusBadgeClass,
  frequencyBadgeClass,
  statusLabel,
} from "./types";

interface Props {
  intervention: Intervention;
  onEdit: () => void;
  onDelete: () => void;
}

export default function InterventionItem({
  intervention,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {intervention.description}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
              title="Edit intervention"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
              title="Delete intervention"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${statusBadgeClass(
              intervention.status
            )}`}
          >
            {statusLabel(intervention.status)}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${frequencyBadgeClass(
              intervention.frequency
            )}`}
          >
            {intervention.frequency.replace(/_/g, " ")}
          </span>
          {intervention.assignedTo && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Assigned: {intervention.assignedTo}
            </span>
          )}
        </div>

        {intervention.notes && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">
            {intervention.notes}
          </p>
        )}
      </div>
    </div>
  );
}
