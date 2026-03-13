"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  Users,
  Plus,
  Play,
  XCircle,
  CheckCircle,
  Eye,
} from "lucide-react";
import type {
  BulkCampaign,
  CampaignStatus,
  ChannelType,
  NotificationTemplate,
} from "./types";

const EMPTY_CAMPAIGN: BulkCampaign = {
  name: "",
  channelType: "email",
  subject: "",
  body: "",
  status: "draft",
};

function campaignStatusBadge(status: CampaignStatus) {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    sending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] || map.draft}`}
    >
      {status}
    </span>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BulkCampaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  /* --- load --- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, tplRes] = await Promise.all([
        fetchWithAuth("/api/notifications/campaigns"),
        fetchWithAuth("/api/notifications/config/templates"),
      ]);
      if (campRes.ok) {
        const json = await campRes.json();
        const data = json.data ?? json;
        setCampaigns(Array.isArray(data) ? data : data.content || []);
      }
      if (tplRes.ok) {
        const tplJson = await tplRes.json();
        const tplData = tplJson.data ?? tplJson;
        setTemplates(Array.isArray(tplData) ? tplData : tplData.content || []);
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

  /* --- create --- */
  const create = async () => {
    if (!form) return;
    setSaving(true);
    try {
      // Backend expects targetCriteria as a JSON string, not an object
      const payload = { ...form };
      if (payload.targetCriteria && typeof payload.targetCriteria === "object") {
        (payload as any).targetCriteria = JSON.stringify(payload.targetCriteria);
      }
      const res = await fetchWithAuth("/api/notifications/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast(res.ok, res.ok ? "Campaign created" : "Create failed");
      if (res.ok) {
        setForm(null);
        setCreating(false);
        load();
      }
    } catch {
      showToast(false, "Network error");
    } finally {
      setSaving(false);
    }
  };

  /* --- start --- */
  const start = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/notifications/campaigns/${id}/start`, {
        method: "POST",
      });
      showToast(res.ok, res.ok ? "Campaign started" : "Start failed");
      if (res.ok) load();
    } catch {
      showToast(false, "Network error");
    }
  };

  /* --- cancel --- */
  const cancel = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/notifications/campaigns/${id}/cancel`, {
        method: "POST",
      });
      showToast(res.ok, res.ok ? "Campaign cancelled" : "Cancel failed");
      if (res.ok) load();
    } catch {
      showToast(false, "Network error");
    }
  };

  const updateForm = (key: string, value: unknown) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  /* ====== Create form ====== */
  if (creating && form) {
    return (
      <div className="h-full overflow-y-auto pr-1">
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              New Campaign
            </h3>
            <button
              onClick={() => { setCreating(false); setForm(null); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Name + Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Campaign Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Channel
                </label>
                <select
                  value={form.channelType}
                  onChange={(e) => updateForm("channelType", e.target.value as ChannelType)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Template (optional)
              </label>
              <select
                value={form.templateId || ""}
                onChange={(e) =>
                  updateForm("templateId", e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">-- None --</option>
                {templates
                  .filter((t) => t.isActive && t.channelType === form.channelType)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Subject (email only) */}
            {form.channelType === "email" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <input
                  value={form.subject || ""}
                  onChange={(e) => updateForm("subject", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            {/* Recipients */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Recipients
              </label>
              <textarea
                rows={3}
                value={
                  form.targetCriteria?.recipientEmails
                    ? String(form.targetCriteria.recipientEmails)
                    : ""
                }
                onChange={(e) =>
                  updateForm("targetCriteria", {
                    ...(form.targetCriteria || {}),
                    recipientEmails: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Enter recipient emails, one per line or comma-separated"
              />
              <p className="text-xs text-slate-400 mt-1">
                Enter patient emails separated by commas or newlines
              </p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Body
              </label>
              <textarea
                rows={5}
                value={form.body || ""}
                onChange={(e) => updateForm("body", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
              />
            </div>

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
                onClick={() => { setCreating(false); setForm(null); }}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={saving || !form.name}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Creating..." : "Create Campaign"}
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
          <Users className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Bulk Campaigns
          </h3>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_CAMPAIGN }); setCreating(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
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
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users className="h-12 w-12 mb-3" />
          <p className="text-sm">No campaigns yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Name</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Channel</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-center">Recipients</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-center">Sent</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-center">Failed</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {c.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.channelType === "email"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      }`}
                    >
                      {c.channelType}
                    </span>
                  </td>
                  <td className="px-4 py-3">{campaignStatusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                    {c.totalRecipients != null ? c.totalRecipients : (c.sentCount ?? 0) + (c.failedCount ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">
                    {c.sentCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-medium">
                    {c.failedCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setForm({ ...c }); setCreating(true); }}
                        className="rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title="View Campaign"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {(c.status === "draft" || c.status === "scheduled") && c.id != null && (
                        <button
                          onClick={() => start(c.id!)}
                          className="rounded-md p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                          title="Start Campaign"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {(c.status === "draft" || c.status === "scheduled" || c.status === "sending") &&
                        c.id != null && (
                          <button
                            onClick={() => cancel(c.id!)}
                            className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Cancel Campaign"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
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
