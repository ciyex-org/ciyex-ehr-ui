"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Printer, Save, TestTube, ExternalLink, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, AlertTriangle, Phone, Inbox, FileText
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-fax";

interface FaxConfig {
    vendor_name: string;
    vendor_id: string;
    fax_number: string;
    include_cover_page: boolean;
    cover_page_practice_name: string;
    cover_page_phone: string;
    auto_print_incoming: boolean;
    notify_on_receive: boolean;
    retention_days: number;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: FaxConfig = {
    vendor_name: "", vendor_id: "",
    fax_number: "", include_cover_page: true,
    cover_page_practice_name: "", cover_page_phone: "",
    auto_print_incoming: false, notify_on_receive: true,
    retention_days: 365,
};

export default function FaxSettings() {
    const [config, setConfig] = useState<FaxConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ provider: true, number: true, settings: false, inbox: false });

    useEffect(() => {
        fetchWithAuth(`/api/app-installations/${PLUGIN_SLUG}`)
            .then(r => r.json())
            .then(json => { if (json.data?.config) setConfig({ ...DEFAULT_CONFIG, ...json.data.config }); })
            .catch(() => {});
    }, []);

    const updateConfig = useCallback((k: string, v: unknown) => { setConfig(p => ({ ...p, [k]: v })); setSaved(false); }, []);
    const saveConfig = async () => {
        setSaving(true);
        try { await fetchWithAuth(`/api/app-installations/${PLUGIN_SLUG}/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) }); setSaved(true); setTimeout(() => setSaved(false), 3000); } catch {}
        setSaving(false);
    };
    const testConnection = async () => {
        setTesting(true); setTestResult(null);
        try { const r = await fetchWithAuth(`/api/app-proxy/${PLUGIN_SLUG}/test-connection`, { method: "POST" }); setTestResult(r.ok ? { success: true, message: "Fax service connected" } : { success: false, message: "Could not reach fax service" }); }
        catch { setTestResult({ success: false, message: "Could not reach fax service. Install a vendor from Hub." }); }
        setTesting(false);
    };

    const toggle = (s: string) => setExpanded(p => ({ ...p, [s]: !p[s] }));
    const isConfigured = config.vendor_name || config.vendor_id;

    const Section = ({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-orange-500" /><span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expanded[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-orange-600" : "bg-gray-300 dark:bg-gray-600"}`} onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}</div>
        </label>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><Printer className="h-6 w-6 text-orange-600 dark:text-orange-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Fax</h2><p className="text-sm text-gray-500">Configure electronic fax sending and receiving</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="provider" icon={Printer} title="Fax Provider">
                    {isConfigured ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="font-medium text-sm">{config.vendor_name || "Fax Provider"}</p></div></div>
                            <div className="flex gap-2">
                                <button onClick={testConnection} disabled={testing} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5">{testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />} Test</button>
                                <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" /><p className="text-sm font-medium text-amber-700 dark:text-amber-400">No fax provider configured</p>
                            <a href="/hub" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"><ExternalLink className="h-4 w-4" /> Browse Hub</a>
                        </div>
                    )}
                    {testResult && <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${testResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>{testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {testResult.message}</div>}
                </Section>

                <Section id="number" icon={Phone} title="Fax Number">
                    <div className="text-xs"><label className="text-gray-500">Fax Number</label><input value={config.fax_number} onChange={e => updateConfig("fax_number", e.target.value)} placeholder="(555) 123-4568" className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                    <p className="text-[10px] text-gray-500">Provision a new fax number from your provider, or use an existing one.</p>
                </Section>

                <Section id="settings" icon={FileText} title="Cover Page & Settings">
                    <Toggle label="Include cover page with faxes" checked={config.include_cover_page} onChange={v => updateConfig("include_cover_page", v)} />
                    {config.include_cover_page && (
                        <div className="ml-12 space-y-2">
                            <div className="text-xs"><label className="text-gray-500">Practice Name</label><input value={config.cover_page_practice_name} onChange={e => updateConfig("cover_page_practice_name", e.target.value)} className="w-full border rounded px-2 py-1 mt-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                            <div className="text-xs"><label className="text-gray-500">Return Phone</label><input value={config.cover_page_phone} onChange={e => updateConfig("cover_page_phone", e.target.value)} className="w-full border rounded px-2 py-1 mt-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                        </div>
                    )}
                    <Toggle label="Auto-print incoming faxes" checked={config.auto_print_incoming} onChange={v => updateConfig("auto_print_incoming", v)} />
                    <Toggle label="Notify on fax received" checked={config.notify_on_receive} onChange={v => updateConfig("notify_on_receive", v)} />
                    <div className="text-xs"><label className="text-gray-500">Retention</label>
                        <select value={config.retention_days} onChange={e => updateConfig("retention_days", Number(e.target.value))} className="ml-2 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                            <option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>1 year</option><option value={730}>2 years</option><option value={2555}>7 years</option>
                        </select>
                    </div>
                </Section>

                <Section id="inbox" icon={Inbox} title="Fax Inbox">
                    <div className="text-center py-4 text-xs text-gray-500">
                        <Inbox className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        No recent faxes
                    </div>
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
                </button>
            </div>
        </div>
    );
}
