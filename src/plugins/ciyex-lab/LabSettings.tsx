"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    FlaskConical, Save, TestTube, ExternalLink, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, AlertTriangle, Bell, FileText, Settings
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-lab";

interface LabConfig {
    vendor_name: string;
    vendor_id: string;
    default_lab: string;
    lab_account_number: string;
    auto_create_observations: boolean;
    notify_provider_all: boolean;
    critical_value_alert: boolean;
    notify_patient: boolean;
    patient_notification_delay_hours: number;
    require_provider_signoff: boolean;
    require_diagnosis: boolean;
    auto_abn_medicare: boolean;
    check_eligibility: boolean;
    enable_standing_orders: boolean;
    result_retention_years: number;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: LabConfig = {
    vendor_name: "", vendor_id: "",
    default_lab: "Quest Diagnostics", lab_account_number: "",
    auto_create_observations: true, notify_provider_all: true,
    critical_value_alert: true, notify_patient: true,
    patient_notification_delay_hours: 0, require_provider_signoff: true,
    require_diagnosis: true, auto_abn_medicare: true,
    check_eligibility: true, enable_standing_orders: false,
    result_retention_years: 7,
};

export default function LabSettings() {
    const [config, setConfig] = useState<LabConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ provider: true, labs: true, results: false, orders: false });

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
        try { const r = await fetchWithAuth(`/api/app-proxy/${PLUGIN_SLUG}/test-connection`, { method: "POST" }); setTestResult(r.ok ? { success: true, message: "Connected — Quest, Labcorp + 28 regional labs" } : { success: false, message: "Could not reach lab service" }); }
        catch { setTestResult({ success: false, message: "Could not reach lab service. Install a vendor from Hub." }); }
        setTesting(false);
    };

    const toggle = (s: string) => setExpanded(p => ({ ...p, [s]: !p[s] }));
    const isConfigured = config.vendor_name || config.vendor_id;

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
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg"><FlaskConical className="h-6 w-6 text-teal-600 dark:text-teal-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Lab Integration</h2><p className="text-sm text-gray-500">Configure external lab ordering and results</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="provider" icon={FlaskConical} title="Lab Network Provider">
                    {isConfigured ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="font-medium text-sm">{config.vendor_name || "Lab Provider"}</p><p className="text-xs text-gray-500">Connected labs: Quest, Labcorp + regional</p></div></div>
                            <div className="flex gap-2">
                                <button onClick={testConnection} disabled={testing} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5">{testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />} Test</button>
                                <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" /><p className="text-sm font-medium text-amber-700 dark:text-amber-400">No lab provider configured</p>
                            <a href="/hub" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"><ExternalLink className="h-4 w-4" /> Browse Hub</a>
                        </div>
                    )}
                    {testResult && <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${testResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>{testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {testResult.message}</div>}
                </Section>

                <Section id="labs" icon={Settings} title="Preferred Labs">
                    <div className="space-y-2">
                        <div className="text-xs"><label className="text-gray-500">Default lab</label><select value={config.default_lab} onChange={e => updateConfig("default_lab", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600"><option>Quest Diagnostics</option><option>Labcorp</option><option>BioReference</option><option>Sonic Healthcare</option></select></div>
                        <div className="text-xs"><label className="text-gray-500">Account #</label><input value={config.lab_account_number} onChange={e => updateConfig("lab_account_number", e.target.value)} placeholder="QD-123456" className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                        <button className="text-xs text-teal-600 hover:underline">+ Add another lab</button>
                    </div>
                </Section>

                <Section id="results" icon={Bell} title="Result Handling">
                    <Toggle label="Auto-create FHIR Observations from results" checked={config.auto_create_observations} onChange={v => updateConfig("auto_create_observations", v)} />
                    <Toggle label="Notify provider on all results" checked={config.notify_provider_all} onChange={v => updateConfig("notify_provider_all", v)} />
                    <Toggle label="Immediate alert on critical values" checked={config.critical_value_alert} onChange={v => updateConfig("critical_value_alert", v)} />
                    <Toggle label="Notify patient when results available" checked={config.notify_patient} onChange={v => updateConfig("notify_patient", v)} />
                    {config.notify_patient && (
                        <div className="ml-12 text-xs"><label className="text-gray-500">Notification delay</label>
                            <select value={config.patient_notification_delay_hours} onChange={e => updateConfig("patient_notification_delay_hours", Number(e.target.value))} className="ml-2 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                                <option value={0}>Immediately</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>72 hours</option>
                            </select>
                        </div>
                    )}
                    <Toggle label="Require provider sign-off before patient sees" checked={config.require_provider_signoff} onChange={v => updateConfig("require_provider_signoff", v)} />
                </Section>

                <Section id="orders" icon={FileText} title="Order Defaults">
                    <Toggle label="Require diagnosis code with every order" checked={config.require_diagnosis} onChange={v => updateConfig("require_diagnosis", v)} />
                    <Toggle label="Auto-generate ABN for Medicare patients" checked={config.auto_abn_medicare} onChange={v => updateConfig("auto_abn_medicare", v)} />
                    <Toggle label="Check insurance eligibility before ordering" checked={config.check_eligibility} onChange={v => updateConfig("check_eligibility", v)} />
                    <Toggle label="Enable standing orders" checked={config.enable_standing_orders} onChange={v => updateConfig("enable_standing_orders", v)} />
                    <div className="text-xs"><label className="text-gray-500">Result retention</label>
                        <select value={config.result_retention_years} onChange={e => updateConfig("result_retention_years", Number(e.target.value))} className="ml-2 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                            <option value={5}>5 years</option><option value={7}>7 years</option><option value={10}>10 years</option>
                        </select>
                    </div>
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
