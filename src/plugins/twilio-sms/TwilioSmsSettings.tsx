"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    MessageSquare, Save, TestTube, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, AlertTriangle, Phone,
    Calendar, Shield, Eye, EyeOff
} from "lucide-react";

const PLUGIN_SLUG = "twilio-sms";

interface TwilioConfig {
    twilio_account_sid: string;
    twilio_auth_token: string;
    twilio_from_number: string;
    twilio_messaging_service_sid: string;
    appt_reminders_enabled: boolean;
    reminder_hours_before: number;
    two_way_enabled: boolean;
    tcpa_optin_required: boolean;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: TwilioConfig = {
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_from_number: "",
    twilio_messaging_service_sid: "",
    appt_reminders_enabled: true,
    reminder_hours_before: 24,
    two_way_enabled: true,
    tcpa_optin_required: true,
};

export default function TwilioSmsSettings() {
    const [config, setConfig] = useState<TwilioConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showToken, setShowToken] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ credentials: true, reminders: false, messaging: false, compliance: false });

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
            const r = await fetchWithAuth(`/api/app-proxy/${PLUGIN_SLUG}/api/sms/test-connection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ twilio_account_sid: config.twilio_account_sid, twilio_auth_token: config.twilio_auth_token }) });
            const data = await r.json();
            setTestResult(r.ok ? { success: true, message: data.message || "Connected to Twilio" } : { success: false, message: data.message || "Connection failed" });
        } catch { setTestResult({ success: false, message: "Could not reach Twilio SMS service" }); }
        setTesting(false);
    };

    const toggle = (s: string) => setExpanded(p => ({ ...p, [s]: !p[s] }));
    const isConfigured = config.twilio_account_sid && config.twilio_auth_token;

    const Section = ({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-blue-500" /><span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expanded[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`} onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}</div>
        </label>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Twilio SMS</h2><p className="text-sm text-gray-500">HIPAA-eligible SMS messaging powered by Twilio</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="credentials" icon={MessageSquare} title="Twilio Credentials">
                    <div className="space-y-3">
                        <div className="text-xs">
                            <label className="text-gray-500 font-medium">Account SID</label>
                            <input value={config.twilio_account_sid} onChange={e => updateConfig("twilio_account_sid", e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full border rounded px-3 py-2 mt-1 font-mono text-xs dark:bg-gray-800 dark:border-gray-600" />
                        </div>
                        <div className="text-xs">
                            <label className="text-gray-500 font-medium">Auth Token</label>
                            <div className="relative mt-1">
                                <input type={showToken ? "text" : "password"} value={config.twilio_auth_token} onChange={e => updateConfig("twilio_auth_token", e.target.value)} placeholder="Your Twilio auth token" className="w-full border rounded px-3 py-2 pr-10 font-mono text-xs dark:bg-gray-800 dark:border-gray-600" />
                                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="text-xs">
                            <label className="text-gray-500 font-medium">From Phone Number</label>
                            <input value={config.twilio_from_number} onChange={e => updateConfig("twilio_from_number", e.target.value)} placeholder="+15551234567" className="w-full border rounded px-3 py-2 mt-1 dark:bg-gray-800 dark:border-gray-600" />
                        </div>
                        <div className="text-xs">
                            <label className="text-gray-500 font-medium">Messaging Service SID <span className="text-gray-400">(optional)</span></label>
                            <input value={config.twilio_messaging_service_sid} onChange={e => updateConfig("twilio_messaging_service_sid", e.target.value)} placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full border rounded px-3 py-2 mt-1 font-mono text-xs dark:bg-gray-800 dark:border-gray-600" />
                            <p className="text-[10px] text-gray-500 mt-1">Use a Messaging Service for number pool management and compliance.</p>
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
                                <p className="font-medium">Twilio credentials required</p>
                                <p className="mt-0.5">Sign up at <span className="font-mono">twilio.com</span> and copy your Account SID and Auth Token from the dashboard.</p>
                            </div>
                        </div>
                    )}
                </Section>

                <Section id="reminders" icon={Calendar} title="Appointment Reminders">
                    <Toggle label="Enable appointment reminders" checked={config.appt_reminders_enabled} onChange={v => updateConfig("appt_reminders_enabled", v)} desc="Automatically send SMS reminders before scheduled appointments" />
                    {config.appt_reminders_enabled && (
                        <div className="ml-12 text-xs">
                            <label className="text-gray-500">Send reminder</label>
                            <select value={config.reminder_hours_before} onChange={e => updateConfig("reminder_hours_before", Number(e.target.value))} className="ml-2 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                                <option value={2}>2 hours before</option>
                                <option value={4}>4 hours before</option>
                                <option value={12}>12 hours before</option>
                                <option value={24}>24 hours before</option>
                                <option value={48}>48 hours before</option>
                            </select>
                        </div>
                    )}
                </Section>

                <Section id="messaging" icon={Phone} title="Two-Way Messaging">
                    <Toggle label="Enable two-way patient messaging" checked={config.two_way_enabled} onChange={v => updateConfig("two_way_enabled", v)} desc="Allow patients to reply to SMS messages and route responses to provider inbox" />
                </Section>

                <Section id="compliance" icon={Shield} title="TCPA Compliance">
                    <Toggle label="Require TCPA opt-in before messaging" checked={config.tcpa_optin_required} onChange={v => updateConfig("tcpa_optin_required", v)} desc="Patients must explicitly consent before receiving SMS messages (recommended)" />
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
                </button>
            </div>
        </div>
    );
}
