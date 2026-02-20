"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

import TabManager from "@/components/settings/TabManager";
import {
    Settings, Loader2, Save, RotateCcw, X,
    Eye, Columns, Code, AlertTriangle,
} from "lucide-react";
import type { FieldConfig } from "@/components/patients/DynamicFormRenderer";
import FieldConfigEditor from "@/components/settings/FieldConfigEditor";

const METADATA_API_BASE = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface TabItem {
    key: string;
    label: string;
    icon: string;
    visible: boolean;
    position: number;
}

interface TabCategory {
    label: string;
    position: number;
    tabs: TabItem[];
}

export default function TabConfigurationPage() {
    const [activeSection, setActiveSection] = useState<"tab-manager" | "field-config" | "json-view">("tab-manager");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabCategories, setTabCategories] = useState<TabCategory[]>([]);
    const [configSource, setConfigSource] = useState<string>("UNIVERSAL_DEFAULT");
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Field config state
    const [availableTabs, setAvailableTabs] = useState<{ tabKey: string; fhirResources: any[] }[]>([]);
    const [selectedTab, setSelectedTab] = useState<string>("");
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [fieldConfigFhirResources, setFieldConfigFhirResources] = useState<string[]>([]);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [fieldConfigPreview, setFieldConfigPreview] = useState(false);
    const [previewFormData, setPreviewFormData] = useState<Record<string, any>>({});

    // JSON code view state
    const [jsonConfigs, setJsonConfigs] = useState<any[]>([]);
    const [jsonSelectedTab, setJsonSelectedTab] = useState<string>("");
    const [jsonEditorValue, setJsonEditorValue] = useState<string>("");
    const [jsonDirty, setJsonDirty] = useState(false);
    const [jsonError, setJsonError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const showNotif = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-field-config/layout`);
            if (res.ok) {
                const data = await res.json();
                setTabCategories(data.tabConfig || []);
                setConfigSource(data.source || "UNIVERSAL_DEFAULT");
            }

            // Load available tab field configs
            try {
                const tabsRes = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-field-config/tabs`);
                if (tabsRes.ok) {
                    const data = await tabsRes.json();
                    setAvailableTabs(data);
                }
            } catch {}
        } catch (err) {
            console.error("Failed to load tab configuration:", err);
            showNotif("error", "Failed to load configuration");
        } finally {
            setLoading(false);
        }
    };

    // ---- Tab Config Save ----

    const handleSaveTabConfig = async () => {
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-field-config/layout`, {
                method: "PUT",
                body: JSON.stringify({ tabConfig: tabCategories }),
            });
            if (res.ok) {
                setConfigSource("ORG_CUSTOM");
                showNotif("success", "Tab configuration saved");
            }
        } catch (err) {
            showNotif("error", "Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = async () => {
        if (!confirm("Reset to practice type defaults? Your custom tab layout will be removed.")) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-field-config/layout`, { method: "DELETE" });
            if (res.ok) {
                await loadData();
                showNotif("success", "Reset to defaults");
            }
        } catch (err) {
            showNotif("error", "Failed to reset");
        } finally {
            setSaving(false);
        }
    };

    // ---- JSON Code View ----

    const loadJsonConfigs = async () => {
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-field-config/all`);
            if (res.ok) {
                const data = await res.json();
                setJsonConfigs(data);
                if (data.length > 0 && !jsonSelectedTab) {
                    selectJsonTab(data[0].tabKey, data);
                }
            }
        } catch (err) {
            console.error("Failed to load JSON configs:", err);
        }
    };

    const selectJsonTab = (tabKey: string, configs?: any[]) => {
        if (jsonDirty && !confirm("Discard unsaved JSON changes?")) return;
        const allConfigs = configs || jsonConfigs;
        const config = allConfigs.find((c: any) => c.tabKey === tabKey);
        setJsonSelectedTab(tabKey);
        setJsonEditorValue(config ? JSON.stringify(config.fieldConfig, null, 2) : "{}");
        setJsonDirty(false);
        setJsonError(null);
    };

    const handleJsonSave = async () => {
        try {
            const parsed = JSON.parse(jsonEditorValue);
            setJsonError(null);

            const config = jsonConfigs.find((c) => c.tabKey === jsonSelectedTab);
            if (!config) return;

            setSaving(true);
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-field-config/${jsonSelectedTab}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fieldConfig: parsed,
                    fhirResources: config.fhirResources,
                }),
            });
            if (res.ok) {
                setJsonDirty(false);
                showNotif("success", `Saved ${jsonSelectedTab} field config`);
                await loadJsonConfigs();
            } else {
                showNotif("error", "Failed to save JSON config");
            }
        } catch (e: any) {
            setJsonError(e.message || "Invalid JSON");
        } finally {
            setSaving(false);
        }
    };

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
                            <Settings className="w-6 h-6" /> Chart
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure patient chart layout, tabs, and field mappings
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            configSource === "ORG_CUSTOM" ? "bg-blue-100 text-blue-800" :
                            configSource === "PRACTICE_TYPE_DEFAULT" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-600"
                        }`}>
                            {configSource === "ORG_CUSTOM" ? "Custom Config" :
                             configSource === "PRACTICE_TYPE_DEFAULT" ? "Practice Default" :
                             configSource === "CLONED_FROM_DEFAULT" ? "Cloned from Default" :
                             "Universal Default"}
                        </span>
                    </div>
                </div>

                {/* Section Tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                    {[
                        { key: "tab-manager" as const, label: "Tab Manager", icon: Eye },
                        { key: "field-config" as const, label: "Field Configuration", icon: Columns },
                        { key: "json-view" as const, label: "Code View", icon: Code },
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

                {/* Section B: Tab Manager */}
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

                {/* Section: Field Configuration */}
                {activeSection === "field-config" && (
                    <FieldConfigEditor
                        availableTabs={availableTabs}
                        selectedTab={selectedTab}
                        setSelectedTab={setSelectedTab}
                        fieldConfig={fieldConfig}
                        setFieldConfig={setFieldConfig}
                        fhirResources={fieldConfigFhirResources}
                        setFhirResources={setFieldConfigFhirResources}
                        fieldConfigPreview={fieldConfigPreview}
                        setFieldConfigPreview={setFieldConfigPreview}
                        previewFormData={previewFormData}
                        setPreviewFormData={setPreviewFormData}
                        saving={saving}
                        setSaving={setSaving}
                        showNotif={showNotif}
                    />
                )}

                {/* Section: JSON Code View */}
                {activeSection === "json-view" && (
                    <JsonCodeView
                        configs={jsonConfigs}
                        selectedTab={jsonSelectedTab}
                        editorValue={jsonEditorValue}
                        dirty={jsonDirty}
                        error={jsonError}
                        saving={saving}
                        onLoad={loadJsonConfigs}
                        onSelectTab={selectJsonTab}
                        onEditorChange={(val) => { setJsonEditorValue(val); setJsonDirty(true); setJsonError(null); }}
                        onSave={handleJsonSave}
                        onDiscard={() => selectJsonTab(jsonSelectedTab)}
                    />
                )}

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

/* ---- JSON Code View Component ---- */

function JsonCodeView({
    configs, selectedTab, editorValue, dirty, error, saving,
    onLoad, onSelectTab, onEditorChange, onSave, onDiscard,
}: {
    configs: any[];
    selectedTab: string;
    editorValue: string;
    dirty: boolean;
    error: string | null;
    saving: boolean;
    onLoad: () => void;
    onSelectTab: (tabKey: string) => void;
    onEditorChange: (val: string) => void;
    onSave: () => void;
    onDiscard: () => void;
}) {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!loaded) {
            onLoad();
            setLoaded(true);
        }
    }, [loaded, onLoad]);

    // Line count for gutter
    const lineCount = editorValue.split("\n").length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">JSON Code View</h3>
                    <p className="text-sm text-gray-500">
                        Edit field configuration as raw JSON. Changes are saved to the database on save.
                    </p>
                </div>
                {dirty && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onDiscard}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            <X className="w-3.5 h-3.5" /> Discard
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving || !!error}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save JSON
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-4">
                {/* Tab selector sidebar */}
                <div className="w-52 shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tab Configs</span>
                    </div>
                    <div className="max-h-125 overflow-y-auto p-1.5">
                        {configs.map((c) => (
                            <button
                                key={c.tabKey}
                                onClick={() => onSelectTab(c.tabKey)}
                                className={`w-full text-left px-2.5 py-1.5 text-sm rounded transition-colors ${
                                    selectedTab === c.tabKey
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                <div className="truncate">{c.label || c.tabKey}</div>
                                <div className="text-xs text-gray-400 truncate">{c.tabKey}</div>
                            </button>
                        ))}
                        {configs.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
                        )}
                    </div>
                </div>

                {/* JSON editor */}
                <div className="flex-1 min-w-0">
                    {error && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Invalid JSON: {error}</span>
                        </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                            <span className="text-xs font-mono text-gray-500">
                                {selectedTab ? `field_config / ${selectedTab}` : "Select a tab"}
                            </span>
                            <span className="text-xs text-gray-400">{lineCount} lines</span>
                        </div>
                        <div className="relative flex">
                            {/* Line numbers */}
                            <div
                                className="shrink-0 px-2 py-3 bg-gray-50 border-r border-gray-200 text-right select-none"
                                aria-hidden
                            >
                                {Array.from({ length: lineCount }, (_, i) => (
                                    <div key={i} className="text-xs leading-5 text-gray-400 font-mono">
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                            <textarea
                                value={editorValue}
                                onChange={(e) => onEditorChange(e.target.value)}
                                spellCheck={false}
                                className="flex-1 p-3 text-sm font-mono leading-5 text-gray-800 bg-white border-none outline-none resize-none min-h-100"
                                style={{ tabSize: 2 }}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Edit the JSON field configuration directly. Saving will update the database for this tab.
                    </p>
                </div>
            </div>
        </div>
    );
}
