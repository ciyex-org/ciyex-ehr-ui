"use client";

import React, { useState } from "react";
import { UserPlus, Loader2, X } from "lucide-react";
import { AssignPayload, FaxCategory, FaxMessage, CATEGORY_LABELS } from "./types";

interface Props {
  fax: FaxMessage | null;
  onClose: () => void;
  onSubmit: (faxId: string, payload: AssignPayload) => Promise<void>;
}

export default function AssignPatientModal({ fax, onClose, onSubmit }: Props) {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [category, setCategory] = useState<FaxCategory>("referral");
  const [saving, setSaving] = useState(false);

  // Reset on open
  React.useEffect(() => {
    if (fax) {
      setPatientId("");
      setPatientName("");
      setCategory(fax.category || "referral");
    }
  }, [fax]);

  if (!fax) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fax) return;
    setSaving(true);
    try {
      await onSubmit(fax.id, { patientId, patientName, category });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Assign to Patient
          </h3>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Assign fax from{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {fax.senderName}
          </span>
          {fax.subject && (
            <>
              {" "}
              &mdash; <span className="italic">{fax.subject}</span>
            </>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient ID */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Patient ID *
            </label>
            <input
              type="text"
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter patient ID"
            />
          </div>

          {/* Patient Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Patient Name *
            </label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter patient name"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FaxCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(CATEGORY_LABELS) as FaxCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !patientId || !patientName}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
