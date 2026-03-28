"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  Mail,
  MessageSquare,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { NotificationConfig as ConfigType, ChannelType } from "./types";

/* ---------- Provider options ---------- */
const EMAIL_PROVIDERS = [
  { value: "smtp", label: "SMTP" },
  { value: "sendgrid", label: "SendGrid" },
  { value: "mailgun", label: "Mailgun" },
];
const SMS_PROVIDERS = [
  { value: "twilio", label: "Twilio" },
  { value: "vonage", label: "Vonage" },
];

/* ---------- Provider config field definitions ---------- */
const PROVIDER_FIELDS: Record<string, { key: string; label: string; type: string }[]> = {
  smtp: [
    { key: "host", label: "SMTP Host", type: "text" },
    { key: "port", label: "Port", type: "number" },
    { key: "username", label: "Username", type: "text" },
    { key: "password", label: "Password", type: "password" },
    { key: "from_email", label: "From Email", type: "email" },
    { key: "from_name", label: "From Name", type: "text" },
    { key: "use_tls", label: "Use TLS", type: "checkbox" },
  ],
  sendgrid: [
    { key: "api_key", label: "API Key", type: "password" },
    { key: "from_email", label: "From Email", type: "email" },
    { key: "from_name", label: "From Name", type: "text" },
  ],
  mailgun: [
    { key: "api_key", label: "API Key", type: "password" },
    { key: "domain", label: "Domain", type: "text" },
    { key: "from_email", label: "From Email", type: "email" },
    { key: "from_name", label: "From Name", type: "text" },
  ],
  twilio: [
    { key: "account_sid", label: "Account SID", type: "text" },
    { key: "auth_token", label: "Auth Token", type: "password" },
    { key: "from_number", label: "From Number", type: "text" },
  ],
  vonage: [
    { key: "api_key", label: "API Key", type: "password" },
    { key: "api_secret", label: "API Secret", type: "password" },
    { key: "from_number", label: "From Number", type: "text" },
  ],
};

function emptyConfig(channel: ChannelType): ConfigType {
  return {
    channelType: channel,
    provider: channel === "email" ? "smtp" : "twilio",
    enabled: false,
    config: {},
    senderName: "",
    senderAddress: "",
    dailyLimit: 500,
  };
}

/* ===================================================================
 * Single channel config card
 * =================================================================== */
function ChannelCard({
  channel,
  icon,
}: {
  channel: ChannelType;
  icon: React.ReactNode;
}) {
  const [cfg, setCfg] = useState<ConfigType>(emptyConfig(channel));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  /* --- load --- */
  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/notifications/config/${channel}`);
      if (res.ok) {
        const json = await res.json();
        const dto = json.data; // unwrap ApiResponse
        if (dto) {
          // Backend stores config as JSON string — parse it to object for form fields
          let configObj: Record<string, string> = {};
          if (dto.config) {
            try { configObj = typeof dto.config === 'string' ? JSON.parse(dto.config) : dto.config; }
            catch { configObj = {}; }
          }
          setCfg({ ...emptyConfig(channel), ...dto, config: configObj });
        }
      }
    } catch {
      /* first-time: use defaults */
    }
  }, [channel]);

  useEffect(() => { load(); }, [load]);

  /* --- helpers --- */
  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const updateField = (key: string, value: string | boolean) =>
    setCfg((p) => ({ ...p, [key]: value }));

  const updateConfigField = (key: string, value: string) =>
    setCfg((p) => ({ ...p, config: { ...p.config, [key]: value } }));

  /* --- save --- */
  const save = async () => {
    setSaving(true);
    try {
      // Backend expects config as a JSON string, dailyLimit as integer
      const payload = {
        channelType: cfg.channelType,
        provider: cfg.provider,
        enabled: cfg.enabled,
        config: JSON.stringify(cfg.config),
        senderName: cfg.senderName,
        senderAddress: cfg.senderAddress,
        dailyLimit: typeof cfg.dailyLimit === 'string' ? parseInt(cfg.dailyLimit, 10) : cfg.dailyLimit,
      };
      const res = await fetchWithAuth(`/api/notifications/config/${channel}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showToast(res.ok, res.ok ? "Configuration saved" : "Save failed");
      if (res.ok) load(); // reload to get server state
    } catch {
      showToast(false, "Network error");
    } finally {
      setSaving(false);
    }
  };

  /* --- test --- */
  const test = async () => {
    setTesting(true);
    try {
      const res = await fetchWithAuth(
        `/api/notifications/config/${channel}/test`,
        { method: "POST" }
      );
      const json = await res.json().catch(() => ({}));
      const msg = json.data?.message || json.message || (res.ok ? "Connection successful" : "Test failed");
      showToast(res.ok && json.success !== false, msg);
    } catch {
      showToast(false, "Network error");
    } finally {
      setTesting(false);
    }
  };

  const providers = channel === "email" ? EMAIL_PROVIDERS : SMS_PROVIDERS;
  const fields = PROVIDER_FIELDS[cfg.provider] || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {channel === "email" ? "Email Configuration" : "SMS Configuration"}
          </h3>
        </div>
        {/* enabled toggle */}
        <button
          type="button"
          onClick={() => updateField("enabled", !cfg.enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            cfg.enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
              cfg.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* body */}
      <div className="p-5 space-y-4">
        {/* Provider */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Provider
          </label>
          <select
            value={cfg.provider}
            onChange={(e) => updateField("provider", e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {providers.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic provider fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) =>
            f.type === "checkbox" ? (
              <label
                key={f.key}
                className="flex items-center gap-2 col-span-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={cfg.config[f.key] === "true"}
                  onChange={(e) =>
                    updateConfigField(f.key, String(e.target.checked))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {f.label}
              </label>
            ) : (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={cfg.config[f.key] || ""}
                  onChange={(e) => updateConfigField(f.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            )
          )}
        </div>

        {/* Sender + limit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Sender Name
            </label>
            <input
              type="text"
              value={cfg.senderName}
              onChange={(e) => updateField("senderName", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Sender Address
            </label>
            <input
              type="text"
              value={cfg.senderAddress}
              onChange={(e) => updateField("senderAddress", e.target.value)}
              placeholder={channel === "email" ? "noreply@example.com" : "+1234567890"}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Daily Limit
            </label>
            <input
              type="number"
              value={cfg.dailyLimit}
              onChange={(e) => updateField("dailyLimit", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Sent today indicator */}
        {cfg.sentToday !== undefined && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sent today: <span className="font-semibold">{cfg.sentToday}</span> / {cfg.dailyLimit}
          </p>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
              toast.ok
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {toast.ok ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {toast.msg}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={test}
            disabled={testing}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
 * Exported component — two cards side by side
 * =================================================================== */
export default function NotificationConfigPanel() {
  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-4">
        <ChannelCard
          channel="email"
          icon={<Mail className="h-5 w-5 text-blue-600" />}
        />
        <ChannelCard
          channel="sms"
          icon={<MessageSquare className="h-5 w-5 text-green-600" />}
        />
      </div>
    </div>
  );
}
