"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
    Pill, Save, TestTube, ExternalLink, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Loader2, Shield, Stethoscope, Users,
    AlertTriangle, Settings
} from "lucide-react";

const PLUGIN_SLUG = "ciyex-erx";

interface ErxConfig {
    vendor_name: string;
    vendor_id: string;
    epcs_enabled: boolean;
    identity_proofing_complete: boolean;
    two_factor_configured: boolean;
    drug_drug_interaction: boolean;
    drug_allergy: boolean;
    duplicate_therapy: boolean;
    formulary_checking: boolean;
    rtbc_enabled: boolean;
    dosing_calculators: boolean;
    pdmp_auto_query: boolean;
    pharmacy_search: boolean;
    auto_approve_refills: boolean;
    require_provider_signoff: boolean;
    allow_delegation: boolean;
    providers: { name: string; npi: string; status: string }[];
    [key: string]: unknown;
}

const DEFAULT_CONFIG: ErxConfig = {
    vendor_name: "", vendor_id: "",
    epcs_enabled: false, identity_proofing_complete: false, two_factor_configured: false,
    drug_drug_interaction: true, drug_allergy: true, duplicate_therapy: true,
    formulary_checking: true, rtbc_enabled: true, dosing_calculators: false, pdmp_auto_query: true,
    pharmacy_search: true, auto_approve_refills: false, require_provider_signoff: true, allow_delegation: false,
    providers: [
        { name: "Dr. Sarah Williams", npi: "1234567890", status: "enrolled" },
        { name: "Dr. Robert Chen", npi: "2345678901", status: "pending" },
    ],
};

export default function ErxSettings() {
    const [config, setConfig] = useState<ErxConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ provider: true, epcs: true, clinical: false, workflow: false, enrollment: false });

    useEffect(() => {
        fetchWithAuth(`/api/app-installations/${PLUGIN_SLUG}`)
            .then(r => r.json())
            .then(json => { if (json.data?.config) setConfig({ ...DEFAULT_CONFIG, ...json.data.config }); })
            .catch(() => {});
    }, []);

    const updateConfig = useCallback((key: string, value: unknown) => {
        setConfig(p => ({ ...p, [key]: value }));
        setSaved(false);
    }, []);

    const saveConfig = async () => {
        setSaving(true);
        try {
            await fetchWithAuth(`/api/app-installations/${PLUGIN_SLUG}/config`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {}
        setSaving(false);
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetchWithAuth(`/api/app-proxy/${PLUGIN_SLUG}/test-connection`, { method: "POST" });
            setTestResult(res.ok ? { success: true, message: "Connected — Surescripts certified" } : { success: false, message: "Could not reach e-prescribing service" });
        } catch {
            setTestResult({ success: false, message: "Could not reach e-prescribing service. Install a vendor from Hub." });
        }
        setTesting(false);
    };

    const toggle = (s: string) => setExpanded(p => ({ ...p, [s]: !p[s] }));
    const isConfigured = config.vendor_name || config.vendor_id;

    const Section = ({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm flex-1 text-left">{title}</span>
                {expanded[id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded[id] && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );

    const Toggle = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"}`}
                onClick={() => onChange(!checked)}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
            <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
            </div>
        </label>
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Pill className="h-6 w-6 text-purple-600 dark:text-purple-400" /></div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">E-Prescribing</h2>
                        <p className="text-sm text-gray-500">Configure electronic prescribing capabilities</p>
                    </div>
                </div>
                {isConfigured && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>}
            </div>

            <div className="space-y-4">
                <Section id="provider" icon={Pill} title="E-Rx Network Provider">
                    {isConfigured ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <div><p className="font-medium text-sm">{config.vendor_name || "E-Rx Provider"}</p><p className="text-xs text-gray-500">Surescripts status: Certified</p></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={testConnection} disabled={testing} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5">
                                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />} Test
                                </button>
                                <a href="/hub" className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-md hover:bg-gray-50 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Change</a>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No e-prescribing provider configured</p>
                            <a href="/hub" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"><ExternalLink className="h-4 w-4" /> Browse Hub</a>
                        </div>
                    )}
                    {testResult && <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${testResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>{testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {testResult.message}</div>}
                </Section>

                <Section id="epcs" icon={Shield} title="EPCS (Controlled Substances)">
                    <Toggle label="Enable EPCS (Schedule II-V)" checked={config.epcs_enabled} onChange={v => updateConfig("epcs_enabled", v)} />
                    {config.epcs_enabled && (
                        <div className="ml-12 space-y-2 text-xs text-gray-500">
                            <p>Identity proofing: {config.identity_proofing_complete ? <span className="text-green-600">Completed</span> : <span className="text-amber-600">Not completed</span>}</p>
                            <p>Two-factor auth: {config.two_factor_configured ? <span className="text-green-600">Configured</span> : <span className="text-amber-600">Not configured</span>}</p>
                        </div>
                    )}
                </Section>

                <Section id="clinical" icon={Stethoscope} title="Clinical Checks">
                    <Toggle label="Drug-drug interaction alerts" checked={config.drug_drug_interaction} onChange={v => updateConfig("drug_drug_interaction", v)} />
                    <Toggle label="Drug-allergy alerts" checked={config.drug_allergy} onChange={v => updateConfig("drug_allergy", v)} />
                    <Toggle label="Duplicate therapy warnings" checked={config.duplicate_therapy} onChange={v => updateConfig("duplicate_therapy", v)} />
                    <Toggle label="Formulary checking" checked={config.formulary_checking} onChange={v => updateConfig("formulary_checking", v)} />
                    <Toggle label="Real-time benefit check (patient cost)" checked={config.rtbc_enabled} onChange={v => updateConfig("rtbc_enabled", v)} />
                    <Toggle label="Dosing calculators (renal/hepatic/pediatric)" checked={config.dosing_calculators} onChange={v => updateConfig("dosing_calculators", v)} />
                    <Toggle label="PDMP auto-query (state prescription monitoring)" checked={config.pdmp_auto_query} onChange={v => updateConfig("pdmp_auto_query", v)} />
                </Section>

                <Section id="workflow" icon={Settings} title="Workflow">
                    <Toggle label="Enable pharmacy search" checked={config.pharmacy_search} onChange={v => updateConfig("pharmacy_search", v)} />
                    <Toggle label="Auto-approve routine refill requests" checked={config.auto_approve_refills} onChange={v => updateConfig("auto_approve_refills", v)} />
                    <Toggle label="Require provider sign-off for all Rx" checked={config.require_provider_signoff} onChange={v => updateConfig("require_provider_signoff", v)} />
                    <Toggle label="Allow staff delegation (supervised prescribing)" checked={config.allow_delegation} onChange={v => updateConfig("allow_delegation", v)} />
                </Section>

                <Section id="enrollment" icon={Users} title="Provider Enrollment">
                    <div className="space-y-2">
                        {config.providers.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${p.status === "enrolled" ? "bg-green-500" : "bg-amber-500"}`} />
                                    <span className="text-sm font-medium">{p.name}</span>
                                    <span className="text-xs text-gray-500">NPI: {p.npi}</span>
                                </div>
                                <span className={`text-xs font-medium ${p.status === "enrolled" ? "text-green-600" : "text-amber-600"}`}>{p.status === "enrolled" ? "Enrolled" : "Pending"}</span>
                            </div>
                        ))}
                        <button className="text-xs text-purple-600 hover:underline">+ Enroll Provider</button>
                    </div>
                </Section>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
                {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
                <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
                </button>
            </div>
        </div>
    );
}
