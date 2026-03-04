"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    ShieldCheck, Save, TestTube, ExternalLink, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, Clock, CreditCard, Search, Scan,
    AlertTriangle, HeartPulse
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-eligibility";

interface EligibilityConfig {
    vendor_name: string;
    vendor_id: string;
    auto_verify_on_schedule: boolean;
    re_verify_timing_hours: number;
    re_verify_at_checkin: boolean;
    re_verify_on_change: boolean;
    overnight_batch: boolean;
    active_census_daily: boolean;
    coverage_discovery_selfpay: boolean;
    mbi_lookup: boolean;
    medicaid_discovery: boolean;
    cob_detection: boolean;
    card_ocr: boolean;
    charity_screening: boolean;
    cost_estimates_enabled: boolean;
    use_contracted_rates: boolean;
    include_deductible: boolean;
    self_service_portal: boolean;
    alert_inactive: boolean;
    alert_auth_required: boolean;
    alert_coverage_change: boolean;
    alert_network_mismatch: boolean;
    deductible_threshold: number;
    dental_cdt_lookup: boolean;
    dental_frequency: boolean;
    dental_annual_max: boolean;
    dental_waiting_period: boolean;
    vision_eligibility: boolean;
    workers_comp: boolean;
    [key: string]: unknown;
}

const DEFAULT_CONFIG: EligibilityConfig = {
    vendor_name: "",
    vendor_id: "",
    auto_verify_on_schedule: true,
    re_verify_timing_hours: 24,
    re_verify_at_checkin: true,
    re_verify_on_change: true,
    overnight_batch: false,
    active_census_daily: false,
    coverage_discovery_selfpay: true,
    mbi_lookup: true,
    medicaid_discovery: true,
    cob_detection: true,
    card_ocr: false,
    charity_screening: false,
    cost_estimates_enabled: true,
    use_contracted_rates: true,
    include_deductible: true,
    self_service_portal: false,
    alert_inactive: true,
    alert_auth_required: true,
    alert_coverage_change: true,
    alert_network_mismatch: false,
    deductible_threshold: 0,
    dental_cdt_lookup: false,
    dental_frequency: false,
    dental_annual_max: false,
    dental_waiting_period: false,
    vision_eligibility: false,
    workers_comp: false,
};

export default function EligibilitySettings() {
    const [config, setConfig] = useState<EligibilityConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saved, setSaved] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        provider: true, auto: true, discovery: false, estimation: false, alerts: false, specialty: false,
    });

    useEffect(() => {
        fetchWithAuth(`/api/app-installations/${PLUGIN_SLUG}`)
            .then(r => r.json())
            .then(json => {
                if (json.data?.config) setConfig({ ...DEFAULT_CONFIG, ...json.data.config });
            })
            .catch(() => {});
    }, []);

    const toggleSection = (key: string) =>
        setExpandedSections(p => ({ ...p, [key]: !p[key] }));

    const updateConfig = useCallback((key: string, value: unknown) => {
        setConfig(p => ({ ...p, [key]: value }));
        setSaved(false);
    }, []);

    const saveConfig = async () => {
        setSaving(true);
        try {
            await fetchWithAuth(`/api/app-installations/${PLUGIN_SLUG}/config`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { /* ignore */ }
        setSaving(false);
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetchWithAuth(`/api/app-proxy/${PLUGIN_SLUG}/test-connection`, { method: "POST" });
            if (res.ok) {
                setTestResult({ success: true, message: "Connected — 1,500+ payers available" });
            } else {
                setTestResult({ success: false, message: "Could not reach eligibility service" });
            }
        } catch {
            setTestResult({ success: false, message: "Could not reach eligibility service. Install a vendor from Hub." });
        }
        setTesting(false);
    };

    const Section = ({ id, icon: Icon, title, children }: {
        id: string; icon: React.ElementType; title: string; children: React.ReactNode;
    }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggleSection(id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expandedSections[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expandedSections[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, description }: {
        label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
    }) => (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
        </label>
    );

    const isConfigured = config.vendor_name || config.vendor_id;

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Insurance Verification</h2>
                        <p className="text-sm text-gray-500">Configure eligibility checking and coverage discovery</p>
                    </div>
                </div>
                {isConfigured && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                    </span>
                )}
            </div>

            <div className="space-y-4">
                <Section id="provider" icon={ShieldCheck} title="Eligibility Provider">
                    {isConfigured ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-sm">{config.vendor_name || "Eligibility Provider"}</p>
                                    <p className="text-xs text-gray-500">Payer connections: 1,500+</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={testConnection} disabled={testing}
                                    className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                                    Test
                                </button>
                                <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5">
                                    <ExternalLink className="h-3 w-3" /> Change Provider
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No eligibility provider configured</p>
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Install a provider from Ciyex Hub to enable eligibility verification</p>
                            <a href="/hub" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700">
                                <ExternalLink className="h-4 w-4" /> Browse Hub
                            </a>
                        </div>
                    )}
                    {testResult && (
                        <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${testResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                            {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {testResult.message}
                        </div>
                    )}
                </Section>

                <Section id="auto" icon={Clock} title="Auto-Verification">
                    <Toggle label="Auto-verify on appointment scheduling" checked={config.auto_verify_on_schedule}
                        onChange={v => updateConfig("auto_verify_on_schedule", v)} />
                    <Toggle label="Re-verify before appointment" checked={config.re_verify_at_checkin}
                        onChange={v => updateConfig("re_verify_at_checkin", v)} />
                    {config.re_verify_at_checkin && (
                        <div className="ml-12">
                            <label className="text-xs text-gray-500">Timing</label>
                            <select value={config.re_verify_timing_hours}
                                onChange={e => updateConfig("re_verify_timing_hours", Number(e.target.value))}
                                className="ml-2 text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                                <option value={2}>2 hours before</option>
                                <option value={24}>24 hours before</option>
                                <option value={48}>48 hours before</option>
                                <option value={72}>72 hours before</option>
                            </select>
                        </div>
                    )}
                    <Toggle label="Re-verify on patient info change" checked={config.re_verify_on_change}
                        onChange={v => updateConfig("re_verify_on_change", v)} />
                    <Toggle label="Overnight batch re-verification" checked={config.overnight_batch}
                        onChange={v => updateConfig("overnight_batch", v)} description="Batch verify all next-day appointments overnight" />
                    <Toggle label="Active census daily re-verification" checked={config.active_census_daily}
                        onChange={v => updateConfig("active_census_daily", v)} description="For inpatient/SNF facilities" />
                </Section>

                <Section id="discovery" icon={Search} title="Coverage Discovery">
                    <Toggle label="Auto-discover coverage for self-pay patients" checked={config.coverage_discovery_selfpay}
                        onChange={v => updateConfig("coverage_discovery_selfpay", v)} description="Find hidden/unknown insurance" />
                    <Toggle label="Medicare MBI lookup" checked={config.mbi_lookup}
                        onChange={v => updateConfig("mbi_lookup", v)} />
                    <Toggle label="Medicaid coverage discovery" checked={config.medicaid_discovery}
                        onChange={v => updateConfig("medicaid_discovery", v)} />
                    <Toggle label="COB (Coordination of Benefits) detection" checked={config.cob_detection}
                        onChange={v => updateConfig("cob_detection", v)} description="Detect primary/secondary/tertiary coverage" />
                    <Toggle label="Insurance card OCR (patient mobile upload)" checked={config.card_ocr}
                        onChange={v => updateConfig("card_ocr", v)} />
                    <Toggle label="Charity/financial assistance screening" checked={config.charity_screening}
                        onChange={v => updateConfig("charity_screening", v)} />
                </Section>

                <Section id="estimation" icon={CreditCard} title="Patient Estimation">
                    <Toggle label="Enable patient cost estimates" checked={config.cost_estimates_enabled}
                        onChange={v => updateConfig("cost_estimates_enabled", v)} />
                    <Toggle label="Use contracted rates from fee schedules" checked={config.use_contracted_rates}
                        onChange={v => updateConfig("use_contracted_rates", v)} />
                    <Toggle label="Include remaining deductible in estimate" checked={config.include_deductible}
                        onChange={v => updateConfig("include_deductible", v)} />
                    <Toggle label="Self-service estimate portal for patients" checked={config.self_service_portal}
                        onChange={v => updateConfig("self_service_portal", v)} />
                </Section>

                <Section id="alerts" icon={AlertTriangle} title="Alerts & Notifications">
                    <Toggle label="Alert on inactive/terminated coverage" checked={config.alert_inactive}
                        onChange={v => updateConfig("alert_inactive", v)} />
                    <Toggle label="Alert on prior auth requirement detected" checked={config.alert_auth_required}
                        onChange={v => updateConfig("alert_auth_required", v)} />
                    <Toggle label="Alert on coverage change since last visit" checked={config.alert_coverage_change}
                        onChange={v => updateConfig("alert_coverage_change", v)} />
                    <Toggle label="Alert on network mismatch (provider OON)" checked={config.alert_network_mismatch}
                        onChange={v => updateConfig("alert_network_mismatch", v)} />
                    <div className="flex items-center gap-2 ml-12">
                        <label className="text-xs text-gray-500">Flag deductible above:</label>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-500">$</span>
                            <input type="number" value={config.deductible_threshold}
                                onChange={e => updateConfig("deductible_threshold", Number(e.target.value))}
                                className="w-20 ml-1 text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"
                                placeholder="0" />
                        </div>
                    </div>
                </Section>

                <Section id="specialty" icon={HeartPulse} title="Dental / Specialty">
                    <Toggle label="CDT code-level benefit lookup" checked={config.dental_cdt_lookup}
                        onChange={v => updateConfig("dental_cdt_lookup", v)} />
                    <Toggle label="Frequency limitation tracking" checked={config.dental_frequency}
                        onChange={v => updateConfig("dental_frequency", v)} />
                    <Toggle label="Annual maximum tracking (used/remaining)" checked={config.dental_annual_max}
                        onChange={v => updateConfig("dental_annual_max", v)} />
                    <Toggle label="Waiting period identification" checked={config.dental_waiting_period}
                        onChange={v => updateConfig("dental_waiting_period", v)} />
                    <Toggle label="Vision eligibility" checked={config.vision_eligibility}
                        onChange={v => updateConfig("vision_eligibility", v)} />
                    <Toggle label="Workers' compensation eligibility" checked={config.workers_comp}
                        onChange={v => updateConfig("workers_comp", v)} />
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Settings
                </button>
            </div>
        </div>
    );
}
