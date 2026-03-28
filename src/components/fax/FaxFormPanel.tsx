"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Send } from "lucide-react";
import { SendFaxForm, FaxCategory, CATEGORY_LABELS, FaxMessage } from "./types";
import { isValidFax } from "@/utils/validation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SendFaxForm) => Promise<void>;
  resendFax?: FaxMessage | null;
  direction?: "inbound" | "outbound";
}

const EMPTY_FORM: SendFaxForm = {
  recipientName: "",
  faxNumber: "",
  subject: "",
  pageCount: undefined,
  patientName: "",
  category: "",
  notes: "",
};

export default function FaxFormPanel({ open, onClose, onSubmit, resendFax, direction = "outbound" }: Props) {
  const apiUrl = getEnv("NEXT_PUBLIC_API_URL") as string;
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Debounced patient search
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`${apiUrl}/api/patients?search=${encodeURIComponent(patientQuery)}`);
        const json = await res.json();
        let list: any[] = [];
        if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json?.data?.content)) list = json.data.content;
        setPatientResults(list);
        setShowPatientDropdown(list.length > 0);
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, apiUrl]);

  const getPatientName = (p: any) =>
    p.fullName || p.name || `${p.firstName ?? p.identification?.firstName ?? ""} ${p.lastName ?? p.identification?.lastName ?? ""}`.trim();

  const [form, setForm] = useState<SendFaxForm>(() => {
    if (resendFax) {
      return {
        recipientName: resendFax.recipientName || "",
        faxNumber: resendFax.faxNumber || "",
        subject: resendFax.subject || "",
        pageCount: resendFax.pageCount || undefined,
        patientName: resendFax.patientName || "",
        category: resendFax.category || "",
        notes: resendFax.notes || "",
      };
    }
    return { ...EMPTY_FORM };
  });
  const [saving, setSaving] = useState(false);
  const [faxError, setFaxError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset form when panel opens with a new resendFax or fresh
  useEffect(() => {
    if (open) {
      setPatientQuery(resendFax?.patientName || "");
      setPatientResults([]);
      setShowPatientDropdown(false);
      if (resendFax) {
        setForm({
          recipientName: resendFax.recipientName || "",
          faxNumber: resendFax.faxNumber || "",
          subject: resendFax.subject || "",
          pageCount: resendFax.pageCount || undefined,
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
    const fe: Record<string, string> = {};
    if (!form.patientName?.trim()) {
      fe.patientName = "Patient name is required";
    }
    if (!form.recipientName.trim()) {
      fe.recipientName = "Recipient name is required";
    } else if (!/[A-Za-z]/.test(form.recipientName)) {
      fe.recipientName = "Recipient name must contain at least one letter";
    } else if (!/^[A-Za-z0-9\s\-_/()&.,:'!?@#]+$/.test(form.recipientName.trim())) {
      fe.recipientName = "Recipient name contains invalid characters";
    }
    if (!form.faxNumber.trim()) {
      fe.faxNumber = "Fax number is required";
    } else {
      const digitCount = form.faxNumber.replace(/\D/g, "").length;
      if (!isValidFax(form.faxNumber) || digitCount < 7) {
        fe.faxNumber = "Please enter a valid fax number with at least 7 digits";
      }
    }
    if (!form.subject.trim()) {
      fe.subject = "Subject is required";
    } else if (!/[A-Za-z]/.test(form.subject)) {
      fe.subject = "Subject must contain at least one letter";
    }
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) {
      return;
    }
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
              onChange={(e) => { update("recipientName", e.target.value); setFieldErrors((prev) => { const n = { ...prev }; delete n.recipientName; return n; }); }}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${fieldErrors.recipientName ? "border-red-400 ring-1 ring-red-300" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Dr. Smith's Office"
            />
            {fieldErrors.recipientName && <p className="text-xs text-red-500 mt-1">{fieldErrors.recipientName}</p>}
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
              onChange={(e) => { update("faxNumber", e.target.value); setFieldErrors((prev) => { const n = { ...prev }; delete n.faxNumber; return n; }); }}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${fieldErrors.faxNumber ? "border-red-400 ring-1 ring-red-300" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="+1 (555) 123-4567"
            />
            {fieldErrors.faxNumber && <p className="text-xs text-red-500 mt-1">{fieldErrors.faxNumber}</p>}
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
              onChange={(e) => { update("subject", e.target.value); setFieldErrors((prev) => { const n = { ...prev }; delete n.subject; return n; }); }}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${fieldErrors.subject ? "border-red-400 ring-1 ring-red-300" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Patient Referral"
            />
            {fieldErrors.subject && <p className="text-xs text-red-500 mt-1">{fieldErrors.subject}</p>}
          </div>

          {/* Page Count */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Pages
            </label>
            <input
              type="number"
              min={1}
              value={form.pageCount ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, pageCount: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
          </div>

          {/* Patient Name - with search */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Patient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={patientQuery || form.patientName}
              onChange={(e) => {
                setPatientQuery(e.target.value);
                update("patientName", e.target.value);
                setShowPatientDropdown(true);
              }}
              onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search patient by name..."
            />
            {showPatientDropdown && patientResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-auto">
                {patientResults.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const name = getPatientName(p);
                      update("patientName", name);
                      setPatientQuery(name);
                      setShowPatientDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    {getPatientName(p)} <span className="text-xs text-gray-400">#{p.id}</span>
                  </button>
                ))}
              </div>
            )}
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

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Status
            </label>
            <select
              value={(form as any).status || "pending"}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value } as any))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {direction === "inbound" ? (
                <>
                  <option value="pending">Pending</option>
                  <option value="received">Received</option>
                  <option value="categorized">Categorized</option>
                  <option value="attached">Attached</option>
                </>
              ) : (
                <>
                  <option value="pending">Pending</option>
                  <option value="sending">Sending</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </>
              )}
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
