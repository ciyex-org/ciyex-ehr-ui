"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  XCircle,
  CheckCircle,
} from "lucide-react";
import type { NotificationTemplate, ChannelType } from "./types";

const EMPTY_TEMPLATE: NotificationTemplate = {
  name: "",
  templateKey: "",
  channelType: "email",
  subject: "",
  body: "",
  htmlBody: "",
  isActive: true,
  isDefault: false,
  variables: [],
};

const COMMON_VARIABLES = [
  "{{patientName}}",
  "{{providerName}}",
  "{{appointmentDate}}",
  "{{appointmentTime}}",
  "{{practiceName}}",
  "{{practicePhone}}",
  "{{portalLink}}",
];

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  /* --- load --- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/notifications/config/templates");
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setTemplates(Array.isArray(data) ? data : data.content || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* --- save / create --- */
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url = isNew
        ? "/api/notifications/config/templates"
        : `/api/notifications/config/templates/${editing.id}`;
      const res = await fetchWithAuth(url, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(editing),
      });
      showToast(res.ok, res.ok ? "Template saved" : "Save failed");
      if (res.ok) {
        setEditing(null);
        load();
      }
    } catch {
      showToast(false, "Network error");
    } finally {
      setSaving(false);
    }
  };

  /* --- delete --- */
  const remove = async (id: number) => {
    try {
      const res = await fetchWithAuth(
        `/api/notifications/config/templates/${id}`,
        { method: "DELETE" }
      );
      showToast(res.ok, res.ok ? "Template deleted" : "Delete failed");
      if (res.ok) load();
    } catch {
      showToast(false, "Network error");
    }
  };

  /* --- toggle active --- */
  const toggleActive = async (tpl: NotificationTemplate) => {
    if (!tpl.id) return;
    try {
      const res = await fetchWithAuth(
        `/api/notifications/config/templates/${tpl.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ ...tpl, isActive: !tpl.isActive }),
        }
      );
      if (res.ok) load();
    } catch {
      /* ignore */
    }
  };

  const updateEditing = (key: string, value: unknown) =>
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));

  /* --- preview body with variables highlighted --- */
  const renderPreview = (text: string) =>
    text.replace(
      /\{\{(\w+)\}\}/g,
      '<span class="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded px-1 text-xs font-mono">{{$1}}</span>'
    );

  /* ====== Editor panel ====== */
  if (editing) {
    return (
      <div className="h-full overflow-y-auto pr-1">
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
          {/* header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {editing.id ? "Edit Template" : "New Template"}
            </h3>
            <button
              onClick={() => setEditing(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Name
                </label>
                <input
                  value={editing.name}
                  onChange={(e) => updateEditing("name", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Template Key
                </label>
                <input
                  value={editing.templateKey}
                  onChange={(e) => updateEditing("templateKey", e.target.value)}
                  placeholder="e.g. appointment_reminder"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Channel
                </label>
                <select
                  value={editing.channelType}
                  onChange={(e) => updateEditing("channelType", e.target.value as ChannelType)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            {editing.channelType === "email" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <input
                  value={editing.subject}
                  onChange={(e) => updateEditing("subject", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Body
              </label>
              <textarea
                rows={6}
                value={editing.body}
                onChange={(e) => updateEditing("body", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
              />
            </div>

            {/* Preview */}
            {editing.body && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Preview
                </label>
                <div
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: renderPreview(editing.body) }}
                />
              </div>
            )}

            {/* Available variables */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Available Variables
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => updateEditing("body", editing.body + v)}
                    className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => updateEditing("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Active
            </label>

            {/* Toast */}
            {toast && (
              <div
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                  toast.ok
                    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {toast.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {toast.msg}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !editing.name || !editing.templateKey}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ====== List view ====== */
  return (
    <div className="h-full overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Message Templates
          </h3>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY_TEMPLATE })}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileText className="h-12 w-12 mb-3" />
          <p className="text-sm">No templates yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Name</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Key</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Channel</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-center">Active</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {templates.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100 font-medium">
                    {tpl.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {tpl.templateKey}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        tpl.channelType === "email"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      }`}
                    >
                      {tpl.channelType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(tpl)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        tpl.isActive ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          tpl.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing({ ...tpl })}
                        className="rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => tpl.id && remove(tpl.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
