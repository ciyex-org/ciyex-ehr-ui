"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  taskTitle: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ open, taskTitle, deleting, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-sm w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete Task</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Are you sure you want to delete{" "}
            <span className="font-medium text-gray-900 dark:text-gray-200">&ldquo;{taskTitle}&rdquo;</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
