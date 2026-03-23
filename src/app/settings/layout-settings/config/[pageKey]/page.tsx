"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

import TabManager, { type TabCategory } from "@/components/settings/TabManager";
import FieldConfigEditor from "@/components/settings/FieldConfigEditor";
import type { FieldConfig } from "@/components/patients/DynamicFormRenderer";
import JsonCodeView from "@/components/settings/JsonCodeView";
import {
    Settings, Loader2, Save, RotateCcw, X, Eye, Columns, Code,
} from "lucide-react";
import { toast, confirmDialog } from "@/utils/toast";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

export default function PageConfigPage() {
    const params = useParams()!;
    const pageKey = params.pageKey as string;

    const [activeSection, setActiveSection] = useState<"tab-manager" | "field-config">("tab-manager");
    const [showCode, setShowCode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configSource, setConfigSource] = useState("UNIVERSAL_DEFAULT");
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Tab Manager state
    const [tabCategories, setTabCategories] = useState<TabCategory[]>([]);

    // Field Config state
    const [availableTabs, setAvailableTabs] = useState<{ tabKey: string; fhirResources: any[] }[]>([]);
    const [selectedTab, setSelectedTab] = useState("");
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [fhirResources, setFhirResources] = useState<string[]>([]);
    const [fieldConfigPreview, setFieldConfigPreview] = useState(false);
    const [previewFormData, setPreviewFormData] = useState<Record<string, any>>({});

    const showNotif = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [allRes, configRes] = await Promise.all([
                fetchWithAuth(`${API_BASE()}/api/tab-field-config/all`),
                fetchWithAuth(`${API_BASE()}/api/tab-field-config/${pageKey}`),
            ]);

            if (allRes.ok) {
                const allConfigs: any[] = await allRes.json();
                const settingsTabs = allConfigs
                    .filter((c: any) => {
                        const fhir = Array.isArray(c.fhirResources) ? c.fhirResources : [];
                        return fhir.length > 0;
                    })
                    .map((c: any) => ({
                        tabKey: c.tabKey,
                        fhirResources: c.fhirResources || [],
                    }));
                setAvailableTabs(settingsTabs);

                const categoryLabel = pageKey.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
                const categoryTabs = allConfigs
                    .filter((c: any) => {
                        const fhir = Array.isArray(c.fhirResources) ? c.fhirResources : [];
                        return fhir.length > 0 && c.category === categoryLabel;
                    })
                    .map((c: any, idx: number) => ({
                        key: c.tabKey,
                        label: c.label || c.tabKey.replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase()),
                        icon: c.icon || "FileText",
                        visible: true,
                        position: idx,
                        fhirResources: c.fhirResources || [],
                    }));

                setTabCategories([{
                    label: categoryLabel,
                    position: 0,
                    tabs: categoryTabs,
                }]);
            }

            if (configRes.ok) {
                const data = await configRes.json();
                const fc = typeof data.fieldConfig === "string" ? JSON.parse(data.fieldConfig) : data.fieldConfig;
                setFieldConfig(fc?.sections ? fc : { sections: [] });
                setFhirResources(data.fhirResources || []);
                setConfigSource(data.orgId && data.orgId !== "*" ? "ORG_CUSTOM" : "UNIVERSAL_DEFAULT");
            } else {
                setFieldConfig({ sections: [] });
            }
        } catch {
            setFieldConfig({ sections: [] });
        }
        setLoading(false);
    }, [pageKey]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSaveTabConfig = async () => {
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/layout`, {
                method: "PUT",
                body: JSON.stringify({ tabConfig: tabCategories }),
            });
            if (res.ok) {
                setConfigSource("ORG_CUSTOM");
                showNotif("success", "Tab configuration saved");
            } else {
                const errJson = await res.json().catch(() => null);
                showNotif("error", errJson?.message || errJson?.error || `Failed to save configuration (${res.status})`);
            }
        } catch {
            showNotif("error", "Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = async () => {
        if (!(await confirmDialog("Reset to practice type defaults? Your custom tab layout will be removed."))) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/layout`, { method: "DELETE" });
            if (res.ok) {
                await loadData();
                showNotif("success", "Reset to defaults");
            }
        } catch {
            showNotif("error", "Failed to reset");
        } finally {
            setSaving(false);
        }
    };

    const displayLabel = pageKey.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    if (loading) {
        return (
            <>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </>
        );
    }

    return (
        <>
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Settings className="w-6 h-6" /> {displayLabel}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure tabs, fields, and FHIR mappings for the {displayLabel} page
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCode(!showCode)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors ${
                                showCode
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            <Code className="w-3.5 h-3.5" /> Code
                        </button>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            configSource === "ORG_CUSTOM" ? "bg-blue-100 text-blue-800" :
                            configSource === "PRACTICE_TYPE_DEFAULT" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-600"
                        }`}>
                            {configSource === "ORG_CUSTOM" ? "Custom Config" :
                             configSource === "PRACTICE_TYPE_DEFAULT" ? "Practice Default" :
                             "Universal Default"}
                        </span>
                    </div>
                </div>

                {/* Section Tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                    {[
                        { key: "tab-manager" as const, label: "Tab Manager", icon: Eye },
                        { key: "field-config" as const, label: "Field Configuration", icon: Columns },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeSection === key
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    ))}
                </div>

                <div className={showCode ? "flex gap-4" : ""}>
                    {/* Code Panel */}
                    {showCode && (
                        <div className="w-1/2 shrink-0 border border-gray-200 rounded-lg overflow-hidden h-[calc(100vh-336px)] min-h-64">
                            {activeSection === "field-config" && selectedTab && fieldConfig ? (
                                <JsonCodeView
                                    value={fieldConfig}
                                    onChange={setFieldConfig}
                                    tabKey={selectedTab}
                                    fhirResources={fhirResources}
                                />
                            ) : (
                                <JsonCodeView />
                            )}
                        </div>
                    )}

                    <div className={showCode ? "w-1/2 overflow-auto" : ""}>
                        {/* Tab Manager */}
                        {activeSection === "tab-manager" && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">Manage Tabs</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleResetToDefaults}
                                            disabled={saving || configSource === "UNIVERSAL_DEFAULT"}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
                                        </button>
                                        <button
                                            onClick={handleSaveTabConfig}
                                            disabled={saving}
                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </div>

                                <TabManager
                                    categories={tabCategories}
                                    onChange={setTabCategories}
                                />
                            </div>
                        )}

                        {/* Field Configuration */}
                        {activeSection === "field-config" && (
                            <FieldConfigEditor
                                availableTabs={availableTabs}
                                selectedTab={selectedTab}
                                setSelectedTab={setSelectedTab}
                                fieldConfig={fieldConfig}
                                setFieldConfig={setFieldConfig}
                                fhirResources={fhirResources}
                                setFhirResources={setFhirResources}
                                fieldConfigPreview={fieldConfigPreview}
                                setFieldConfigPreview={setFieldConfigPreview}
                                previewFormData={previewFormData}
                                setPreviewFormData={setPreviewFormData}
                                saving={saving}
                                setSaving={setSaving}
                                showNotif={showNotif}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
                    notification.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                }`}>
                    {notification.message}
                    <button onClick={() => setNotification(null)} className="ml-2 text-white/80 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </>
    );
}
