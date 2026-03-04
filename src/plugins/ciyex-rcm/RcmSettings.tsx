"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Receipt, Save, ChevronDown, ChevronRight, CheckCircle2, Loader2,
    AlertTriangle, ExternalLink, Settings, FileText, DollarSign,
    BarChart3, Shield
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-rcm";

interface RcmConfig {
    vendor_name: string;
    vendor_id: string;
    clearinghouse_name: string;
    clearinghouse_id: string;
    auto_scrub_claims: boolean;
    auto_submit_clean: boolean;
    auto_post_era: boolean;
    auto_secondary: boolean;
    auto_patient_statements: boolean;
    scrub_ncci_edits: boolean;
    scrub_lcd_ncd: boolean;
    scrub_modifier_check: boolean;
    scrub_demographics: boolean;
    denial_auto_categorize: boolean;
    denial_auto_appeal_simple: boolean;
    appeal_template_enabled: boolean;
    era_match_threshold: number;
    statement_cycle_days: number;
    statement_min_balance: number;
    timely_filing_alert_days: number;
    coding_ai_suggestions: boolean;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: RcmConfig = {
    vendor_name: "", vendor_id: "",
    clearinghouse_name: "", clearinghouse_id: "",
    auto_scrub_claims: true, auto_submit_clean: false,
    auto_post_era: false, auto_secondary: true,
    auto_patient_statements: true,
    scrub_ncci_edits: true, scrub_lcd_ncd: true,
    scrub_modifier_check: true, scrub_demographics: true,
    denial_auto_categorize: true, denial_auto_appeal_simple: false,
    appeal_template_enabled: true, era_match_threshold: 95,
    statement_cycle_days: 30, statement_min_balance: 5,
    timely_filing_alert_days: 30, coding_ai_suggestions: true,
};

export default function RcmSettings() {
    const [config, setConfig] = useState<RcmConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ provider: true, clearinghouse: true, scrub: false, denial: false, era: false, statements: false, coding: false });

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
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg"><Receipt className="h-6 w-6 text-rose-600 dark:text-rose-400" /></div>
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Cycle Management</h2><p className="text-sm text-gray-500">Configure claims processing and billing automation</p></div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="provider" icon={Receipt} title="RCM Engine Provider">
                    {isConfigured ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="font-medium text-sm">{config.vendor_name || "RCM Provider"}</p></div></div>
                            <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" /><p className="text-sm font-medium text-amber-700 dark:text-amber-400">No RCM provider configured</p>
                            <a href="/hub" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"><ExternalLink className="h-4 w-4" /> Browse Hub</a>
                        </div>
                    )}
                </Section>

                <Section id="clearinghouse" icon={FileText} title="Clearinghouse">
                    {config.clearinghouse_name ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><p className="font-medium text-sm">{config.clearinghouse_name}</p></div>
                            <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
                        </div>
                    ) : (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-sm text-gray-500">Clearinghouse: Not configured</span>
                            <a href="/hub" className="text-xs text-rose-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Add from Hub</a>
                        </div>
                    )}
                </Section>

                <Section id="scrub" icon={Shield} title="Claim Scrubbing Rules">
                    <Toggle label="Auto-scrub claims before submission" checked={config.auto_scrub_claims} onChange={v => updateConfig("auto_scrub_claims", v)} desc="Run validation rules on every claim" />
                    <Toggle label="Auto-submit clean claims" checked={config.auto_submit_clean} onChange={v => updateConfig("auto_submit_clean", v)} desc="Submit immediately if scrubbing passes with no errors" />
                    <div className="border-t dark:border-gray-700 pt-3 mt-3">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Scrubbing Checks</p>
                        <Toggle label="NCCI Procedure-to-Procedure edits" checked={config.scrub_ncci_edits} onChange={v => updateConfig("scrub_ncci_edits", v)} />
                        <Toggle label="LCD/NCD medical necessity" checked={config.scrub_lcd_ncd} onChange={v => updateConfig("scrub_lcd_ncd", v)} />
                        <Toggle label="Modifier validation" checked={config.scrub_modifier_check} onChange={v => updateConfig("scrub_modifier_check", v)} />
                        <Toggle label="Patient demographics completeness" checked={config.scrub_demographics} onChange={v => updateConfig("scrub_demographics", v)} />
                    </div>
                </Section>

                <Section id="denial" icon={AlertTriangle} title="Denial Management">
                    <Toggle label="Auto-categorize denials by reason code" checked={config.denial_auto_categorize} onChange={v => updateConfig("denial_auto_categorize", v)} />
                    <Toggle label="Auto-generate appeal for simple denials" checked={config.denial_auto_appeal_simple} onChange={v => updateConfig("denial_auto_appeal_simple", v)} desc="CO-4, CO-16, CO-18 denial reasons" />
                    <Toggle label="Enable appeal letter templates" checked={config.appeal_template_enabled} onChange={v => updateConfig("appeal_template_enabled", v)} />
                    <div className="flex items-center gap-2 text-xs">
                        <label className="text-gray-500 w-40">Timely filing alert:</label>
                        <select value={config.timely_filing_alert_days} onChange={e => updateConfig("timely_filing_alert_days", Number(e.target.value))} className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                            <option value={15}>15 days before</option><option value={30}>30 days before</option><option value={45}>45 days before</option><option value={60}>60 days before</option>
                        </select>
                        <span className="text-gray-400">deadline</span>
                    </div>
                </Section>

                <Section id="era" icon={DollarSign} title="ERA & Payment Posting">
                    <Toggle label="Auto-post ERA payments" checked={config.auto_post_era} onChange={v => updateConfig("auto_post_era", v)} desc="Automatically match and post electronic remittance advice" />
                    <Toggle label="Auto-generate secondary claims" checked={config.auto_secondary} onChange={v => updateConfig("auto_secondary", v)} desc="After primary payment, auto-bill secondary insurance" />
                    <div className="flex items-center gap-2 text-xs">
                        <label className="text-gray-500 w-40">ERA match threshold:</label>
                        <input type="number" min={50} max={100} value={config.era_match_threshold} onChange={e => updateConfig("era_match_threshold", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" />
                        <span className="text-gray-400">% confidence</span>
                    </div>
                </Section>

                <Section id="statements" icon={FileText} title="Patient Statements">
                    <Toggle label="Auto-generate patient statements" checked={config.auto_patient_statements} onChange={v => updateConfig("auto_patient_statements", v)} desc="Send statements after insurance has paid" />
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <label className="text-gray-500">Statement cycle:</label>
                            <select value={config.statement_cycle_days} onChange={e => updateConfig("statement_cycle_days", Number(e.target.value))} className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                                <option value={15}>Every 15 days</option><option value={30}>Every 30 days</option><option value={45}>Every 45 days</option><option value={60}>Every 60 days</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-gray-500">Min balance:</label>
                            <div className="flex items-center"><span className="text-gray-400 mr-1">$</span><input type="number" value={config.statement_min_balance} onChange={e => updateConfig("statement_min_balance", Number(e.target.value))} className="w-16 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                        </div>
                    </div>
                </Section>

                <Section id="coding" icon={BarChart3} title="AI Coding Assistance">
                    <Toggle label="AI-suggested CPT/ICD codes" checked={config.coding_ai_suggestions} onChange={v => updateConfig("coding_ai_suggestions", v)} desc="Suggest codes based on encounter documentation" />
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs text-gray-500">
                        <p>AI coding assistant analyzes encounter notes and suggests appropriate CPT and ICD-10 codes. Suggestions are reviewed by the billing team before submission.</p>
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
