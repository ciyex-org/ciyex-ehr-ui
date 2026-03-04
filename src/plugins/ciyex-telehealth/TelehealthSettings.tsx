"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Video, Save, ChevronDown, ChevronRight, CheckCircle2, Loader2,
    AlertTriangle, ExternalLink, Settings, Shield, Clock, Monitor
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-telehealth";

interface TelehealthConfig {
    vendor_name: string;
    vendor_id: string;
    default_duration: number;
    allow_patient_initiate: boolean;
    require_waiting_room: boolean;
    auto_record: boolean;
    record_consent_required: boolean;
    screen_share_enabled: boolean;
    chat_enabled: boolean;
    virtual_background: boolean;
    max_participants: number;
    auto_end_minutes: number;
    send_reminder_email: boolean;
    send_reminder_sms: boolean;
    reminder_minutes_before: number;
    hipaa_baa_signed: boolean;
    e2e_encryption: boolean;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: TelehealthConfig = {
    vendor_name: "", vendor_id: "",
    default_duration: 15, allow_patient_initiate: false,
    require_waiting_room: true, auto_record: false,
    record_consent_required: true, screen_share_enabled: true,
    chat_enabled: true, virtual_background: true,
    max_participants: 2, auto_end_minutes: 60,
    send_reminder_email: true, send_reminder_sms: true,
    reminder_minutes_before: 15, hipaa_baa_signed: false,
    e2e_encryption: true,
};

export default function TelehealthSettings() {
    const [config, setConfig] = useState<TelehealthConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ provider: true, session: true, features: false, reminders: false, security: false });

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
    const isConfigured = config.vendor_name || config.vendor_id || true; // Built-in SFU is always available
    const providerName = config.vendor_name || "Qiaben Telehealth";

    const Section = ({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-green-500" /><span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expanded[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"}`} onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}</div>
        </label>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Video className="h-6 w-6 text-green-600 dark:text-green-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Telehealth</h2><p className="text-sm text-gray-500">Configure video visit settings and providers</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="provider" icon={Video} title="Video Provider">
                    {isConfigured ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="font-medium text-sm">{providerName}</p></div></div>
                            <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" /><p className="text-sm font-medium text-amber-700 dark:text-amber-400">No video provider configured</p>
                            <a href="/hub" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"><ExternalLink className="h-4 w-4" /> Browse Hub</a>
                        </div>
                    )}
                </Section>

                <Section id="session" icon={Clock} title="Session Defaults">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div><label className="text-gray-500">Default duration</label>
                            <select value={config.default_duration} onChange={e => updateConfig("default_duration", Number(e.target.value))} className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600">
                                <option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option>
                            </select>
                        </div>
                        <div><label className="text-gray-500">Max participants</label>
                            <select value={config.max_participants} onChange={e => updateConfig("max_participants", Number(e.target.value))} className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600">
                                <option value={2}>2 (1:1)</option><option value={4}>4 (group)</option><option value={10}>10 (large group)</option>
                            </select>
                        </div>
                        <div><label className="text-gray-500">Auto-end after (minutes)</label>
                            <input type="number" value={config.auto_end_minutes} onChange={e => updateConfig("auto_end_minutes", Number(e.target.value))} className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600" />
                        </div>
                    </div>
                    <Toggle label="Allow patients to initiate visits" checked={config.allow_patient_initiate} onChange={v => updateConfig("allow_patient_initiate", v)} desc="Patients can start video calls from the portal" />
                    <Toggle label="Require waiting room" checked={config.require_waiting_room} onChange={v => updateConfig("require_waiting_room", v)} desc="Patients wait until provider admits them" />
                </Section>

                <Section id="features" icon={Monitor} title="In-Call Features">
                    <Toggle label="Screen sharing" checked={config.screen_share_enabled} onChange={v => updateConfig("screen_share_enabled", v)} />
                    <Toggle label="In-call chat messaging" checked={config.chat_enabled} onChange={v => updateConfig("chat_enabled", v)} />
                    <Toggle label="Virtual backgrounds" checked={config.virtual_background} onChange={v => updateConfig("virtual_background", v)} />
                    <Toggle label="Auto-record sessions" checked={config.auto_record} onChange={v => updateConfig("auto_record", v)} />
                    {config.auto_record && (
                        <Toggle label="Require patient consent before recording" checked={config.record_consent_required} onChange={v => updateConfig("record_consent_required", v)} />
                    )}
                </Section>

                <Section id="reminders" icon={Settings} title="Visit Reminders">
                    <Toggle label="Send email reminder" checked={config.send_reminder_email} onChange={v => updateConfig("send_reminder_email", v)} />
                    <Toggle label="Send SMS reminder" checked={config.send_reminder_sms} onChange={v => updateConfig("send_reminder_sms", v)} />
                    <div className="text-xs"><label className="text-gray-500">Send reminder</label>
                        <select value={config.reminder_minutes_before} onChange={e => updateConfig("reminder_minutes_before", Number(e.target.value))} className="ml-2 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                            <option value={5}>5 min before</option><option value={10}>10 min before</option><option value={15}>15 min before</option><option value={30}>30 min before</option><option value={60}>1 hour before</option>
                        </select>
                    </div>
                </Section>

                <Section id="security" icon={Shield} title="Security & Compliance">
                    <Toggle label="End-to-end encryption" checked={config.e2e_encryption} onChange={v => updateConfig("e2e_encryption", v)} desc="All video/audio encrypted in transit and at rest" />
                    <Toggle label="HIPAA BAA signed with provider" checked={config.hipaa_baa_signed} onChange={v => updateConfig("hipaa_baa_signed", v)} />
                    {!config.hipaa_baa_signed && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> HIPAA Business Associate Agreement required for patient video visits
                        </div>
                    )}
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
                </button>
            </div>
        </div>
    );
}
