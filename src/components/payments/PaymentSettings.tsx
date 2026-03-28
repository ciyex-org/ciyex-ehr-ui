"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Loader2,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { PaymentConfig } from "./types";

const apiUrl = (p: string) => `${getEnv("NEXT_PUBLIC_API_URL")}${p}`;

const PROCESSORS = [
  { value: "stripe", label: "Stripe" },
  { value: "square", label: "Square" },
  { value: "authorize_net", label: "Authorize.net" },
];

const METHOD_CHECKBOXES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "bank_account", label: "Bank Account" },
  { value: "fsa", label: "FSA" },
  { value: "hsa", label: "HSA" },
];

type Toast = { type: "success" | "error"; text: string };

type Props = {
  showToast: (t: Toast) => void;
};

function defaultConfig(): PaymentConfig {
  return {
    processor: "stripe",
    enabled: false,
    config: {},
    acceptedMethods: ["credit_card", "debit_card"],
    convenienceFeeEnabled: false,
    convenienceFeePercent: 0,
    convenienceFeeFlatAmount: 0,
    autoReceipt: true,
  };
}

export default function PaymentSettings({ showToast }: Props) {
  const [config, setConfig] = useState<PaymentConfig>(defaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Config key-value pairs for JSONB editor */
  const [configEntries, setConfigEntries] = useState<{ key: string; value: string }[]>([]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/payments/config"));
      const json = await res.json();
      if (res.ok) {
        const data = json.data || json;
        const cfg: PaymentConfig = {
          ...defaultConfig(),
          ...data,
          config: data.config || {},
          acceptedMethods: data.acceptedMethods || ["credit_card", "debit_card"],
        };
        setConfig(cfg);
        setConfigEntries(
          Object.entries(cfg.config).map(([key, value]) => ({ key, value: String(value) }))
        );
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const configObj: Record<string, string> = {};
      configEntries.forEach((e) => { if (e.key.trim()) configObj[e.key.trim()] = e.value; });
      const body = { ...config, config: configObj };

      const res = await fetchWithAuth(apiUrl("/api/payments/config"), {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Payment settings saved" });
        fetchConfig();
      } else {
        showToast({ type: "error", text: json.message || "Failed to save settings" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setSaving(false); }
  };

  const toggleMethod = (method: string) => {
    setConfig((prev) => ({
      ...prev,
      acceptedMethods: prev.acceptedMethods.includes(method)
        ? prev.acceptedMethods.filter((m) => m !== method)
        : [...prev.acceptedMethods, method],
    }));
  };

  const addConfigEntry = () => {
    setConfigEntries((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeConfigEntry = (idx: number) => {
    setConfigEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateConfigEntry = (idx: number, field: "key" | "value", val: string) => {
    setConfigEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)));
  };

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment Configuration</h2>
        </div>

        {/* Processor */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Processor</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Payment Processor</label>
              <select className={inputCls} value={config.processor} onChange={(e) => setConfig((prev) => ({ ...prev, processor: e.target.value }))}>
                {PROCESSORS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
              </label>
            </div>
          </div>
        </div>

        {/* Config key-value pairs */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Processor Config</h3>
            <button onClick={addConfigEntry} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Entry
            </button>
          </div>
          {configEntries.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">No config entries. Click &quot;Add Entry&quot; to add key-value pairs.</p>
          ) : (
            <div className="space-y-2">
              {configEntries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Key"
                    value={entry.key}
                    onChange={(e) => updateConfigEntry(idx, "key", e.target.value)}
                  />
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Value"
                    value={entry.value}
                    onChange={(e) => updateConfigEntry(idx, "value", e.target.value)}
                  />
                  <button onClick={() => removeConfigEntry(idx)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accepted Methods */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Accepted Methods</h3>
          <div className="flex flex-wrap gap-4">
            {METHOD_CHECKBOXES.map((m) => (
              <label key={m.value} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.acceptedMethods.includes(m.value)}
                  onChange={() => toggleMethod(m.value)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Convenience Fee */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Convenience Fee</h3>
          <div className="flex items-center gap-3 mb-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.convenienceFeeEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, convenienceFeeEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
          </div>
          {config.convenienceFeeEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Percent (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  value={config.convenienceFeePercent}
                  onChange={(e) => setConfig((prev) => ({ ...prev, convenienceFeePercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className={labelCls}>Flat Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  value={config.convenienceFeeFlatAmount}
                  onChange={(e) => setConfig((prev) => ({ ...prev, convenienceFeeFlatAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Auto Receipt */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoReceipt}
                onChange={(e) => setConfig((prev) => ({ ...prev, autoReceipt: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Auto-send Receipts</span>
            </label>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-12">
            Automatically email receipts to patients after successful payments.
          </p>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
