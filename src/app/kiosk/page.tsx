"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Monitor,
  Settings,
  Users,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Loader2,
  UserCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Save,
  Smartphone,
} from "lucide-react";
import { KioskConfig, KioskCheckin } from "@/components/kiosk/types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

type ToastState = { type: "success" | "error"; text: string } | null;
type TabKey = "config" | "checkins";

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const cls = toast.type === "success"
    ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
    : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200";
  return (
    <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${cls}`}>
      {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

/* ── Config Tab ── */
function KioskConfigPanel({ showToast }: { showToast: (t: ToastState) => void }) {
  const [config, setConfig] = useState<KioskConfig>({
    enabled: false,
    config: { verify_dob: true, verify_phone: false, update_demographics: true, update_insurance: true, sign_consent: true, collect_copay: false, show_wait_time: true },
    welcomeMessage: "Welcome! Please check in for your appointment.",
    completionMessage: "Thank you! Please have a seat and we will call you shortly.",
    idleTimeoutSec: 120,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API()}/api/kiosk/config`);
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const rawConfig = json.data.config;
          const parsedConfig = rawConfig
            ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig)
            : { verify_dob: true, verify_phone: false, update_demographics: true, update_insurance: true, sign_consent: true, collect_copay: false, show_wait_time: true };
          setConfig({ ...json.data, config: parsedConfig });
        }
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...config,
        config: typeof config.config === 'object' ? JSON.stringify(config.config) : config.config,
      };
      const res = await fetchWithAuth(`${API()}/api/kiosk/config`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success) showToast({ type: "success", text: "Kiosk config saved" });
      else showToast({ type: "error", text: json.message || "Failed to save" });
    } catch { showToast({ type: "error", text: "Failed to save config" }); }
    finally { setSaving(false); }
  };

  const toggleFeature = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: !prev.config[key as keyof typeof prev.config] },
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  const features = [
    { key: "verify_dob", label: "Verify Date of Birth", desc: "Patient must enter DOB to verify identity" },
    { key: "verify_phone", label: "Verify Phone Number", desc: "Patient must enter phone for verification" },
    { key: "update_demographics", label: "Update Demographics", desc: "Allow patients to review and update demographics" },
    { key: "update_insurance", label: "Update Insurance", desc: "Allow patients to update insurance information" },
    { key: "sign_consent", label: "Sign Consent Forms", desc: "Present consent forms for electronic signature" },
    { key: "collect_copay", label: "Collect Copay", desc: "Allow copay payment during check-in" },
    { key: "show_wait_time", label: "Show Wait Time", desc: "Display estimated wait time after check-in" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        <div>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Kiosk Mode</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Enable patient self-service check-in</div>
        </div>
        <button onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}>
          {config.enabled
            ? <ToggleRight className="w-8 h-8 text-green-600 dark:text-green-400" />
            : <ToggleLeft className="w-8 h-8 text-slate-400 dark:text-slate-600" />
          }
        </button>
      </div>

      {/* Features */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 divide-y divide-slate-100 dark:divide-slate-700">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Check-in Steps</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure which steps are included in kiosk check-in</p>
        </div>
        {features.map((f) => (
          <div key={f.key} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-slate-700 dark:text-slate-200">{f.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</div>
            </div>
            <button onClick={() => toggleFeature(f.key)}>
              {config.config[f.key as keyof typeof config.config]
                ? <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                : <ToggleLeft className="w-6 h-6 text-slate-400 dark:text-slate-600" />
              }
            </button>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Messages</h3>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Welcome Message</label>
          <textarea
            rows={2} value={config.welcomeMessage}
            onChange={(e) => setConfig((c) => ({ ...c, welcomeMessage: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Completion Message</label>
          <textarea
            rows={2} value={config.completionMessage}
            onChange={(e) => setConfig((c) => ({ ...c, completionMessage: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idle Timeout (seconds)</label>
          <input
            type="number" min={30} value={config.idleTimeoutSec}
            onChange={(e) => setConfig((c) => ({ ...c, idleTimeoutSec: parseInt(e.target.value) || 120 }))}
            className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Launch kiosk + Save */}
      <div className="flex items-center justify-between">
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <ExternalLink className="w-4 h-4" />
          Launch Kiosk Preview
        </button>
        <button
          onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}

/* ── Check-in Log Tab ── */
function CheckinLogTab() {
  const [checkins, setCheckins] = useState<KioskCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  const fetchCheckins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API()}/api/kiosk/checkins?page=${page}&size=${pageSize}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setCheckins(json.data.content || json.data || []);
        setTotalPages(json.data.totalPages || 1);
        setTotalElements(json.data.totalElements || 0);
      }
    } catch { setCheckins([]); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  if (checkins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-600">
        <UserCheck className="w-12 h-12 mb-3" />
        <p className="text-sm font-medium">No check-ins recorded</p>
        <p className="text-xs mt-1">Check-ins will appear here once patients use the kiosk.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Patient</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Check-in Time</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Demographics</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Insurance</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Consent</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Copay</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {checkins.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{c.patientName}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {new Date(c.checkInTime).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  {c.demographicsUpdated ? <CheckCircle2 className="w-4 h-4 text-green-600 inline" /> : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {c.insuranceUpdated ? <CheckCircle2 className="w-4 h-4 text-green-600 inline" /> : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {c.consentSigned ? <CheckCircle2 className="w-4 h-4 text-green-600 inline" /> : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {c.copayCollected ? (
                    <span className="text-green-700 dark:text-green-400 text-xs font-medium">${c.copayAmount?.toFixed(2)}</span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 capitalize">{c.verificationMethod || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 mt-2 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2">Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function KioskPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("config");
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* Header */}
        <div className="flex items-center gap-3 shrink-0 mb-4">
          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Patient Kiosk</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Self-service check-in configuration and log</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 mb-4">
          <nav className="flex gap-1 -mb-px">
            {[
              { key: "config" as TabKey, label: "Configuration", icon: Settings },
              { key: "checkins" as TabKey, label: "Check-in Log", icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "config" && <KioskConfigPanel showToast={setToast} />}
          {activeTab === "checkins" && <CheckinLogTab />}
        </div>
      </div>
    </AdminLayout>
  );
}
