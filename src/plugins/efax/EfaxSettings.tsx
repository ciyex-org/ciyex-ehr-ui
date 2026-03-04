"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Printer, Save, TestTube, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, AlertTriangle, Phone,
    FileText, Inbox, Eye, EyeOff
} from "lucide-react";

const PLUGIN_SLUG = "efax";

interface EfaxConfig {
    efax_account_id: string;
    efax_api_key: string;
    efax_api_secret: string;
    fax_number: string;
    include_cover_page: boolean;
    auto_route_inbox: boolean;
    notify_on_receive: boolean;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: EfaxConfig = {
    efax_account_id: "",
    efax_api_key: "",
    efax_api_secret: "",
    fax_number: "",
    include_cover_page: true,
    auto_route_inbox: true,
    notify_on_receive: true,
};

export default function EfaxSettings() {
    const [config, setConfig] = useState<EfaxConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showSecret, setShowSecret] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ credentials: true, number: true, settings: false });

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
        try {
            const r = await fetchWithAuth(`/api/app-proxy/${PLUGIN_SLUG}/api/fax/test-connection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ efax_account_id: config.efax_account_id, efax_api_key: config.efax_api_key, efax_api_secret: config.efax_api_secret }) });
            const data = await r.json();
            setTestResult(r.ok ? { success: true, message: data.message || "Connected to eFax" } : { success: false, message: data.message || "Connection failed" });
        } catch { setTestResult({ success: false, message: "Could not reach eFax service" }); }
        setTesting(false);
    };

    const toggle = (s: string) => setExpanded(p => ({ ...p, [s]: !p[s] }));
    const isConfigured = config.efax_account_id && config.efax_api_key;

    const Section = ({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-teal-500" /><span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expanded[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-teal-600" : "bg-gray-300 dark:bg-gray-600"}`} onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}</div>
        </label>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg"><Printer className="h-6 w-6 text-teal-600 dark:text-teal-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">eFax</h2><p className="text-sm text-gray-500">HIPAA-compliant fax from the EHR</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="credentials" icon={Printer} title="eFax Credentials">
                    <div className="space-y-3">
                        <div className="text-xs">
                            <label className="text-gray-500 font-medium">eFax Account ID</label>
                            <input value={config.efax_account_id} onChange={e => updateConfig("efax_account_id", e.target.value)} placeholder="Your eFax account ID" className="w-full border rounded px-3 py-2 mt-1 font-mono text-xs dark:bg-gray-800 dark:border-gray-600" />
                        </div>
                        <div className="text-xs">
                            <label className="text-gray-500 font-medium">API Key</label>
                            <input value={config.efax_api_key} onChange={e => updateConfig("efax_api_key", e.target.value)} placeholder="Your eFax API key" className="w-full border rounded px-3 py-2 mt-1 font-mono text-xs dark:bg-gray-800 dark:border-gray-600" />
                        </div>
                        <div className="text-xs">
                            <label className="text-gray-500 font-medium">API Secret</label>
                            <div className="relative mt-1">
                                <input type={showSecret ? "text" : "password"} value={config.efax_api_secret} onChange={e => updateConfig("efax_api_secret", e.target.value)} placeholder="Your eFax API secret" className="w-full border rounded px-3 py-2 pr-10 font-mono text-xs dark:bg-gray-800 dark:border-gray-600" />
                                <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    {isConfigured && (
                        <div className="mt-3 flex items-center gap-2">
                            <button onClick={testConnection} disabled={testing} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5">
                                {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />} Test Connection
                            </button>
                            {testResult && <span className={`text-xs flex items-center gap-1 ${testResult.success ? "text-green-600" : "text-red-600"}`}>{testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {testResult.message}</span>}
                        </div>
                    )}
                    {!isConfigured && (
                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-amber-700 dark:text-amber-400">
                                <p className="font-medium">eFax credentials required</p>
                                <p className="mt-0.5">Sign up for eFax Enterprise and enter your Account ID, API Key, and API Secret.</p>
                            </div>
                        </div>
                    )}
                </Section>

                <Section id="number" icon={Phone} title="Practice Fax Number">
                    <div className="text-xs">
                        <label className="text-gray-500 font-medium">Fax Number</label>
                        <input value={config.fax_number} onChange={e => updateConfig("fax_number", e.target.value)} placeholder="+15551234568" className="w-full border rounded px-3 py-2 mt-1 dark:bg-gray-800 dark:border-gray-600" />
                        <p className="text-[10px] text-gray-500 mt-1">Your eFax-provisioned fax number for sending and receiving.</p>
                    </div>
                </Section>

                <Section id="settings" icon={FileText} title="Fax Settings">
                    <Toggle label="Include cover page" checked={config.include_cover_page} onChange={v => updateConfig("include_cover_page", v)} desc="Automatically add a cover page with practice info to outbound faxes" />
                    <Toggle label="Auto-route incoming faxes" checked={config.auto_route_inbox} onChange={v => updateConfig("auto_route_inbox", v)} desc="Automatically route received faxes to the provider inbox" />
                    <Toggle label="Notify on incoming fax" checked={config.notify_on_receive} onChange={v => updateConfig("notify_on_receive", v)} desc="Send an in-app notification when a fax is received" />
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
                </button>
            </div>
        </div>
    );
}
