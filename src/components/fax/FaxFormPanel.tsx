"use client";

import React, { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { SendFaxForm, FaxCategory, CATEGORY_LABELS, FaxMessage } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SendFaxForm) => Promise<void>;
  resendFax?: FaxMessage | null;
}

const EMPTY_FORM: SendFaxForm = {
  recipientName: "",
  faxNumber: "",
  subject: "",
  patientName: "",
  category: "",
  notes: "",
};

export default function FaxFormPanel({ open, onClose, onSubmit, resendFax }: Props) {
  const [form, setForm] = useState<SendFaxForm>(() => {
    if (resendFax) {
      return {
        recipientName: resendFax.recipientName || "",
        faxNumber: resendFax.faxNumber || "",
        subject: resendFax.subject || "",
        patientName: resendFax.patientName || "",
        category: resendFax.category || "",
        notes: resendFax.notes || "",
      };
    }
    return { ...EMPTY_FORM };
  });
  const [saving, setSaving] = useState(false);

  // Reset form when panel opens with a new resendFax or fresh
  React.useEffect(() => {
    if (open) {
      if (resendFax) {
        setForm({
          recipientName: resendFax.recipientName || "",
          faxNumber: resendFax.faxNumber || "",
          subject: resendFax.subject || "",
          patientName: resendFax.patientName || "",
          category: resendFax.category || "",
          notes: resendFax.notes || "",
        });
      } else {
        setForm({ ...EMPTY_FORM });
      }
    }
  }, [open, resendFax]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      setForm({ ...EMPTY_FORM });
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof SendFaxForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {resendFax ? "Resend Fax" : "Send Fax"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Recipient Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Recipient Name *
            </label>
            <input
              type="text"
              required
              value={form.recipientName}
              onChange={(e) => update("recipientName", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dr. Smith's Office"
            />
          </div>

          {/* Fax Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Fax Number *
            </label>
            <input
              type="tel"
              required
              value={form.faxNumber}
              onChange={(e) => update("faxNumber", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Subject *
            </label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Patient Referral"
            />
          </div>

          {/* Patient Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Patient Name
              <span className="text-gray-400 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={form.patientName}
              onChange={(e) => update("patientName", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category...</option>
              {(Object.keys(CATEGORY_LABELS) as FaxCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Notes
            </label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Additional notes..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            disabled={saving || !form.recipientName || !form.faxNumber || !form.subject}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {resendFax ? "Resend" : "Send Fax"}
          </button>
        </div>
      </div>
    </>
  );
}
