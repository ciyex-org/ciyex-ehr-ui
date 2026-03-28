"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type {
  NotificationPreference,
  NotificationTemplate,
  EventType,
} from "./types";

/* ---------- Event metadata ---------- */
const EVENT_TYPES: { type: EventType; label: string; description: string }[] = [
  { type: "appointment_reminder", label: "Appointment Reminder", description: "Sent before a scheduled appointment" },
  { type: "appointment_confirmation", label: "Appointment Confirmation", description: "Sent when an appointment is booked" },
  { type: "lab_result_ready", label: "Lab Result Ready", description: "Sent when lab results are available" },
  { type: "prescription_ready", label: "Prescription Ready", description: "Sent when a prescription is ready for pickup" },
  { type: "recall_due", label: "Recall Due", description: "Sent when a patient is due for a recall visit" },
  { type: "billing_statement", label: "Billing Statement", description: "Sent when a new billing statement is generated" },
];

const TIMING_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "1h_before", label: "1 hour before" },
  { value: "2h_before", label: "2 hours before" },
  { value: "24h_before", label: "24 hours before" },
  { value: "48h_before", label: "48 hours before" },
  { value: "72h_before", label: "72 hours before" },
  { value: "1w_before", label: "1 week before" },
];

export default function EventPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  /* --- load --- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefRes, tplRes] = await Promise.all([
        fetchWithAuth("/api/notifications/config/preferences"),
        fetchWithAuth("/api/notifications/config/templates"),
      ]);

      if (prefRes.ok) {
        const json = await prefRes.json();
        const data = json.data ?? json;
        const arr: NotificationPreference[] = Array.isArray(data) ? data : data.content || [];
        // Ensure all event types present
        const existing = new Set(arr.map((p) => p.eventType));
        EVENT_TYPES.forEach(({ type }) => {
          if (!existing.has(type)) {
            arr.push({ eventType: type, emailEnabled: false, smsEnabled: false, timing: "immediate" });
          }
        });
        setPreferences(arr);
      } else {
        // Populate defaults if endpoint not yet implemented
        setPreferences(
          EVENT_TYPES.map(({ type }) => ({
            eventType: type,
            emailEnabled: false,
            smsEnabled: false,
            timing: "immediate",
          }))
        );
      }

      if (tplRes.ok) {
        const tplJson = await tplRes.json();
        const tplData = tplJson.data ?? tplJson;
        setTemplates(Array.isArray(tplData) ? tplData : tplData.content || []);
      }
    } catch {
      // populate defaults
      setPreferences(
        EVENT_TYPES.map(({ type }) => ({
          eventType: type,
          emailEnabled: false,
          smsEnabled: false,
          timing: "immediate",
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* --- update a preference row --- */
  const update = (eventType: EventType, key: string, value: unknown) =>
    setPreferences((prev) =>
      prev.map((p) =>
        p.eventType === eventType ? { ...p, [key]: value } : p
      )
    );

  /* --- save all --- */
  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/notifications/config/preferences", {
        method: "PUT",
        body: JSON.stringify(preferences),
      });
      showToast(res.ok, res.ok ? "Preferences saved" : "Save failed");
    } catch {
      showToast(false, "Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Event Preferences
          </h3>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm mb-4 ${
            toast.ok
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {toast.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Event</th>
              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-center">Email</th>
              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-center">SMS</th>
              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Timing</th>
              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Template</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {EVENT_TYPES.map(({ type, label, description }) => {
              const pref = preferences.find((p) => p.eventType === type);
              if (!pref) return null;
              return (
                <tr key={type} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  {/* Event */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{label}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{description}</div>
                  </td>
                  {/* Email toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => update(type, "emailEnabled", !pref.emailEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        pref.emailEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          pref.emailEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  {/* SMS toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => update(type, "smsEnabled", !pref.smsEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        pref.smsEnabled ? "bg-green-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          pref.smsEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  {/* Timing */}
                  <td className="px-4 py-3">
                    <select
                      value={pref.timing}
                      onChange={(e) => update(type, "timing", e.target.value)}
                      className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {TIMING_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Template */}
                  <td className="px-4 py-3">
                    <select
                      value={pref.templateId || ""}
                      onChange={(e) =>
                        update(type, "templateId", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Default --</option>
                      {templates
                        .filter((t) => t.isActive)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
