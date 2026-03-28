"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Activity, Save, TestTube, ExternalLink, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, AlertTriangle, Heart, Droplets,
    Scale, Thermometer, Settings
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-rpm";

interface RpmConfig {
    vendor_name: string;
    vendor_id: string;
    devices_bp: boolean;
    devices_glucose: boolean;
    devices_weight: boolean;
    devices_pulse_ox: boolean;
    devices_temp: boolean;
    threshold_systolic_high: number;
    threshold_systolic_low: number;
    threshold_diastolic_high: number;
    threshold_glucose_high: number;
    threshold_glucose_low: number;
    threshold_spo2_low: number;
    alert_on_threshold: boolean;
    alert_on_missed_reading: boolean;
    missed_reading_days: number;
    billing_auto_track: boolean;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: RpmConfig = {
    vendor_name: "", vendor_id: "",
    devices_bp: true, devices_glucose: true, devices_weight: true,
    devices_pulse_ox: true, devices_temp: false,
    threshold_systolic_high: 140, threshold_systolic_low: 90,
    threshold_diastolic_high: 90, threshold_glucose_high: 250,
    threshold_glucose_low: 70, threshold_spo2_low: 92,
    alert_on_threshold: true, alert_on_missed_reading: true,
    missed_reading_days: 2, billing_auto_track: true,
};

export default function RpmSettings() {
    const [config, setConfig] = useState<RpmConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ provider: true, devices: true, thresholds: false, alerts: false, billing: false });

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

    const toggle = (s: string) => setExpanded(p => ({ ...p, [s]: !p[s] }));
    const isConfigured = config.vendor_name || config.vendor_id;

    const Section = ({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-rose-500" /><span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expanded[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-rose-600" : "bg-gray-300 dark:bg-gray-600"}`} onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}</div>
        </label>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg"><Activity className="h-6 w-6 text-rose-600 dark:text-rose-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Remote Patient Monitoring</h2><p className="text-sm text-gray-500">Configure RPM devices and alert thresholds</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="provider" icon={Activity} title="RPM Device Provider">
                    {isConfigured ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="font-medium text-sm">{config.vendor_name || "RPM Provider"}</p></div></div>
                            <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" /><p className="text-sm font-medium text-amber-700 dark:text-amber-400">No RPM provider configured</p>
                            <a href="/hub" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"><ExternalLink className="h-4 w-4" /> Browse Hub</a>
                        </div>
                    )}
                </Section>

                <Section id="devices" icon={Heart} title="Supported Devices">
                    <Toggle label="Blood Pressure Monitor" checked={config.devices_bp} onChange={v => updateConfig("devices_bp", v)} />
                    <Toggle label="Glucose Monitor" checked={config.devices_glucose} onChange={v => updateConfig("devices_glucose", v)} />
                    <Toggle label="Weight Scale" checked={config.devices_weight} onChange={v => updateConfig("devices_weight", v)} />
                    <Toggle label="Pulse Oximeter" checked={config.devices_pulse_ox} onChange={v => updateConfig("devices_pulse_ox", v)} />
                    <Toggle label="Thermometer" checked={config.devices_temp} onChange={v => updateConfig("devices_temp", v)} />
                </Section>

                <Section id="thresholds" icon={AlertTriangle} title="Alert Thresholds">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-2">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Blood Pressure</p>
                            <div className="flex items-center gap-2"><label className="text-gray-500 w-24">Systolic high:</label><input type="number" value={config.threshold_systolic_high} onChange={e => updateConfig("threshold_systolic_high", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /><span className="text-gray-400">mmHg</span></div>
                            <div className="flex items-center gap-2"><label className="text-gray-500 w-24">Systolic low:</label><input type="number" value={config.threshold_systolic_low} onChange={e => updateConfig("threshold_systolic_low", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /><span className="text-gray-400">mmHg</span></div>
                            <div className="flex items-center gap-2"><label className="text-gray-500 w-24">Diastolic high:</label><input type="number" value={config.threshold_diastolic_high} onChange={e => updateConfig("threshold_diastolic_high", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /><span className="text-gray-400">mmHg</span></div>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Glucose & SpO2</p>
                            <div className="flex items-center gap-2"><label className="text-gray-500 w-24">Glucose high:</label><input type="number" value={config.threshold_glucose_high} onChange={e => updateConfig("threshold_glucose_high", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /><span className="text-gray-400">mg/dL</span></div>
                            <div className="flex items-center gap-2"><label className="text-gray-500 w-24">Glucose low:</label><input type="number" value={config.threshold_glucose_low} onChange={e => updateConfig("threshold_glucose_low", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /><span className="text-gray-400">mg/dL</span></div>
                            <div className="flex items-center gap-2"><label className="text-gray-500 w-24">SpO2 low:</label><input type="number" value={config.threshold_spo2_low} onChange={e => updateConfig("threshold_spo2_low", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /><span className="text-gray-400">%</span></div>
                        </div>
                    </div>
                </Section>

                <Section id="alerts" icon={Settings} title="Alert Settings">
                    <Toggle label="Alert on threshold violation" checked={config.alert_on_threshold} onChange={v => updateConfig("alert_on_threshold", v)} />
                    <Toggle label="Alert on missed reading" checked={config.alert_on_missed_reading} onChange={v => updateConfig("alert_on_missed_reading", v)} />
                    {config.alert_on_missed_reading && (
                        <div className="ml-12 text-xs"><label className="text-gray-500">After</label>
                            <select value={config.missed_reading_days} onChange={e => updateConfig("missed_reading_days", Number(e.target.value))} className="ml-2 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                                <option value={1}>1 day</option><option value={2}>2 days</option><option value={3}>3 days</option><option value={7}>7 days</option>
                            </select>
                        </div>
                    )}
                </Section>

                <Section id="billing" icon={Settings} title="RPM Billing">
                    <Toggle label="Auto-track monitoring time for billing" checked={config.billing_auto_track} onChange={v => updateConfig("billing_auto_track", v)} desc="Track time for CPT 99453, 99454, 99457, 99458" />
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs text-gray-500">
                        <p className="font-medium mb-1">CPT Code Requirements:</p>
                        <p>99453 — Initial device setup & patient education (once)</p>
                        <p>99454 — Device supply + daily readings (16+ days/month)</p>
                        <p>99457 — First 20 min clinical staff time</p>
                        <p>99458 — Each additional 20 min</p>
                    </div>
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
                </button>
            </div>
        </div>
    );
}
