"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Bell, Save, TestTube, ExternalLink, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, AlertTriangle, MessageSquare,
    Mail, Phone, Calendar, Megaphone, Shield, BarChart3
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-notifications";

interface NotifConfig {
    sms_vendor_name: string;
    sms_vendor_id: string;
    email_vendor_name: string;
    email_vendor_id: string;
    sms_phone_number: string;
    email_from: string;
    appt_reminders_enabled: boolean;
    appt_reminder_sms: boolean;
    appt_reminder_email: boolean;
    appt_reminder_voice: boolean;
    appt_reminder_24h: boolean;
    appt_reminder_2h: boolean;
    allow_confirmation_reply: boolean;
    allow_self_reschedule: boolean;
    auto_lab_result: boolean;
    auto_rx_ready: boolean;
    auto_portal_message: boolean;
    auto_balance_due: boolean;
    auto_recall: boolean;
    auto_birthday: boolean;
    two_way_enabled: boolean;
    route_incoming_to_inbox: boolean;
    auto_replies: boolean;
    ai_chatbot: boolean;
    tcpa_optin_required: boolean;
    include_optout: boolean;
    maintain_dnc: boolean;
    retention_years: number;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: NotifConfig = {
    sms_vendor_name: "", sms_vendor_id: "", email_vendor_name: "", email_vendor_id: "",
    sms_phone_number: "", email_from: "",
    appt_reminders_enabled: true, appt_reminder_sms: true, appt_reminder_email: true, appt_reminder_voice: false,
    appt_reminder_24h: true, appt_reminder_2h: true,
    allow_confirmation_reply: true, allow_self_reschedule: false,
    auto_lab_result: true, auto_rx_ready: true, auto_portal_message: true,
    auto_balance_due: false, auto_recall: false, auto_birthday: false,
    two_way_enabled: true, route_incoming_to_inbox: true, auto_replies: false, ai_chatbot: false,
    tcpa_optin_required: true, include_optout: true, maintain_dnc: true, retention_years: 3,
};

export default function NotificationSettings() {
    const [config, setConfig] = useState<NotifConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ sms: true, email: false, reminders: true, auto: false, twoway: false, compliance: false, analytics: false });

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
    const isConfigured = config.sms_vendor_name || config.sms_vendor_id || config.email_vendor_name || config.email_vendor_id;

    const Section = ({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-indigo-500" /><span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expanded[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`} onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}</div>
        </label>
    );

    const ProviderCard = ({ label, name, isConnected }: { label: string; name: string; isConnected: boolean }) => (
        isConnected ? (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="font-medium text-sm">{name || label}</p></div></div>
                <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
            </div>
        ) : (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}: Not configured</span>
                <a href="/hub" className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Add from Hub</a>
            </div>
        )
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Bell className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications & Messaging</h2><p className="text-sm text-gray-500">Configure patient communication channels</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="sms" icon={MessageSquare} title="SMS Provider">
                    <ProviderCard label="SMS Provider" name={config.sms_vendor_name} isConnected={!!config.sms_vendor_name} />
                    {config.sms_vendor_name && <div className="text-xs"><label className="text-gray-500">Phone Number</label><input value={config.sms_phone_number} onChange={e => updateConfig("sms_phone_number", e.target.value)} placeholder="(555) 123-4567" className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600" /></div>}
                </Section>

                <Section id="email" icon={Mail} title="Email Provider">
                    <ProviderCard label="Email Provider" name={config.email_vendor_name} isConnected={!!config.email_vendor_name} />
                    {config.email_vendor_name && <div className="text-xs"><label className="text-gray-500">From Address</label><input value={config.email_from} onChange={e => updateConfig("email_from", e.target.value)} placeholder="noreply@practice.com" className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600" /></div>}
                </Section>

                <Section id="reminders" icon={Calendar} title="Appointment Reminders">
                    <Toggle label="Enable appointment reminders" checked={config.appt_reminders_enabled} onChange={v => updateConfig("appt_reminders_enabled", v)} />
                    {config.appt_reminders_enabled && (
                        <>
                            <div className="ml-12 flex items-center gap-4 text-xs">
                                <span className="text-gray-500">Send via:</span>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={config.appt_reminder_sms} onChange={e => updateConfig("appt_reminder_sms", e.target.checked)} className="rounded border-gray-300" /> SMS</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={config.appt_reminder_email} onChange={e => updateConfig("appt_reminder_email", e.target.checked)} className="rounded border-gray-300" /> Email</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={config.appt_reminder_voice} onChange={e => updateConfig("appt_reminder_voice", e.target.checked)} className="rounded border-gray-300" /> Voice</label>
                            </div>
                            <div className="ml-12 flex items-center gap-4 text-xs">
                                <span className="text-gray-500">Timing:</span>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={config.appt_reminder_24h} onChange={e => updateConfig("appt_reminder_24h", e.target.checked)} className="rounded border-gray-300" /> 24h before</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={config.appt_reminder_2h} onChange={e => updateConfig("appt_reminder_2h", e.target.checked)} className="rounded border-gray-300" /> 2h before</label>
                            </div>
                            <Toggle label="Allow patient confirmation reply" checked={config.allow_confirmation_reply} onChange={v => updateConfig("allow_confirmation_reply", v)} />
                            <Toggle label="Allow patient self-reschedule via link" checked={config.allow_self_reschedule} onChange={v => updateConfig("allow_self_reschedule", v)} />
                        </>
                    )}
                </Section>

                <Section id="auto" icon={Bell} title="Auto-Notifications">
                    <Toggle label="Lab result ready" checked={config.auto_lab_result} onChange={v => updateConfig("auto_lab_result", v)} />
                    <Toggle label="Prescription ready for pickup" checked={config.auto_rx_ready} onChange={v => updateConfig("auto_rx_ready", v)} />
                    <Toggle label="Portal message received" checked={config.auto_portal_message} onChange={v => updateConfig("auto_portal_message", v)} />
                    <Toggle label="Balance due reminder" checked={config.auto_balance_due} onChange={v => updateConfig("auto_balance_due", v)} />
                    <Toggle label="Recall / follow-up due" checked={config.auto_recall} onChange={v => updateConfig("auto_recall", v)} />
                    <Toggle label="Birthday greetings" checked={config.auto_birthday} onChange={v => updateConfig("auto_birthday", v)} />
                </Section>

                <Section id="twoway" icon={MessageSquare} title="Two-Way Messaging">
                    <Toggle label="Enable two-way patient texting" checked={config.two_way_enabled} onChange={v => updateConfig("two_way_enabled", v)} />
                    <Toggle label="Route incoming messages to provider inbox" checked={config.route_incoming_to_inbox} onChange={v => updateConfig("route_incoming_to_inbox", v)} />
                    <Toggle label="Enable auto-replies for common questions" checked={config.auto_replies} onChange={v => updateConfig("auto_replies", v)} />
                    <Toggle label="Enable AI chatbot for scheduling/FAQ" checked={config.ai_chatbot} onChange={v => updateConfig("ai_chatbot", v)} />
                </Section>

                <Section id="compliance" icon={Shield} title="Compliance">
                    <Toggle label="TCPA opt-in required before messaging" checked={config.tcpa_optin_required} onChange={v => updateConfig("tcpa_optin_required", v)} />
                    <Toggle label="Include opt-out instructions in every message" checked={config.include_optout} onChange={v => updateConfig("include_optout", v)} />
                    <Toggle label="Maintain DNC (Do Not Call) list" checked={config.maintain_dnc} onChange={v => updateConfig("maintain_dnc", v)} />
                    <div className="text-xs"><label className="text-gray-500">Message retention</label>
                        <select value={config.retention_years} onChange={e => updateConfig("retention_years", Number(e.target.value))} className="ml-2 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                            <option value={1}>1 year</option><option value={3}>3 years</option><option value={5}>5 years</option><option value={7}>7 years</option>
                        </select>
                    </div>
                </Section>

                <Section id="analytics" icon={BarChart3} title="Notification Analytics">
                    <div className="grid grid-cols-4 gap-3">
                        {[{ l: "Sent", v: "3,456" }, { l: "Delivered", v: "98.1%" }, { l: "Failed", v: "1.9%" }, { l: "Replies", v: "25.8%" }].map(s => (
                            <div key={s.l} className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <p className="text-lg font-bold text-indigo-600">{s.v}</p><p className="text-[10px] text-gray-500">{s.l}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>No-show reduction: <span className="text-green-600 font-medium">↓ 23%</span> (vs. no reminders)</p>
                        <p>Confirmation rate: <span className="font-medium">72%</span> of reminded patients confirm</p>
                    </div>
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
                </button>
            </div>
        </div>
    );
}
