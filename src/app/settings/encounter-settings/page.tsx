"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";

import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import JsonCodeView from "@/components/settings/JsonCodeView";
import {
    ClipboardList, Loader2, Save, RotateCcw, X, Check,
    Eye, EyeOff, ArrowUp, ArrowDown, Search, GripVertical,
    ChevronDown, ChevronRight, Code,
} from "lucide-react";
import { toast, confirmDialog } from "@/utils/toast";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface Section {
    key: string;
    title: string;
    columns?: number;
    collapsible?: boolean;
    collapsed?: boolean;
    visible?: boolean; // added for enable/disable
    fields: any[];
    [k: string]: any;
}

interface FieldConfig {
    sections: Section[];
    features?: any;
}

export default function EncounterSettingsPage() {
    const [showCode, setShowCode] = useState(false);
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [fhirResources, setFhirResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(false);
    const [configSource, setConfigSource] = useState("UNIVERSAL_DEFAULT");
    const [search, setSearch] = useState("");
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const showNotif = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // Load encounter-form field config from backend
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const base = API_BASE();
            if (!base) { setLoading(false); return; }

            const res = await fetchWithAuth(`${base}/api/tab-field-config/encounter-form`);
            if (res.ok) {
                const data = await res.json();
                const config = data.data || data;
                const fc: FieldConfig = typeof config.fieldConfig === "string"
                    ? JSON.parse(config.fieldConfig)
                    : config.fieldConfig;

                // Ensure every section has a visible property
                if (fc?.sections) {
                    fc.sections = fc.sections.map((s) => ({
                        ...s,
                        visible: s.visible !== false, // default to true
                    }));
                }
                setFieldConfig(fc || { sections: [] });
                setFhirResources(config.fhirResources || []);
                setConfigSource(config.orgId && config.orgId !== "*" ? "ORG_CUSTOM" : "UNIVERSAL_DEFAULT");
            } else {
                setFieldConfig({ sections: [] });
            }
        } catch {
            setFieldConfig({ sections: [] });
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const sections = useMemo(() => {
        if (!fieldConfig?.sections) return [];
        const term = search.trim().toLowerCase();
        if (!term) return fieldConfig.sections;
        return fieldConfig.sections.filter(
            (s) =>
                s.title.toLowerCase().includes(term) ||
                s.key.toLowerCase().includes(term)
        );
    }, [fieldConfig, search]);

    const enabledCount = useMemo(
        () => (fieldConfig?.sections || []).filter((s) => s.visible !== false).length,
        [fieldConfig]
    );

    const totalCount = fieldConfig?.sections?.length || 0;

    // Toggle section visibility
    const toggleVisible = useCallback((key: string) => {
        setFieldConfig((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                sections: prev.sections.map((s) =>
                    s.key === key ? { ...s, visible: !s.visible } : s
                ),
            };
        });
    }, []);

    // Move section up/down
    const moveSection = useCallback((key: string, direction: "up" | "down") => {
        setFieldConfig((prev) => {
            if (!prev) return prev;
            const secs = [...prev.sections];
            const idx = secs.findIndex((s) => s.key === key);
            if (idx === -1) return prev;
            const newIdx = direction === "up" ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= secs.length) return prev;
            [secs[idx], secs[newIdx]] = [secs[newIdx], secs[idx]];
            return { ...prev, sections: secs };
        });
    }, []);

    // Update section properties (title, columns, collapsible, collapsed)
    const updateSection = useCallback((key: string, updates: Partial<Section>) => {
        setFieldConfig((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                sections: prev.sections.map((s) =>
                    s.key === key ? { ...s, ...updates } : s
                ),
            };
        });
    }, []);

    // Save to backend
    const handleSave = useCallback(async () => {
        if (!fieldConfig) return;
        setSaving(true);
        try {
            const base = API_BASE();
            const res = await fetchWithAuth(`${base}/api/tab-field-config/encounter-form`, {
                method: "PUT",
                body: JSON.stringify({
                    fieldConfig,
                    fhirResources,
                }),
            });
            if (res.ok) {
                setConfigSource("ORG_CUSTOM");
                setSaveFeedback(true);
                showNotif("success", "Encounter configuration saved");
                setTimeout(() => setSaveFeedback(false), 1200);
            } else {
                const errJson = await res.json().catch(() => null);
                showNotif("error", errJson?.message || errJson?.error || `Failed to save configuration (${res.status})`);
            }
        } catch {
            showNotif("error", "Failed to save configuration");
        } finally {
            setSaving(false);
        }
    }, [fieldConfig, fhirResources]);

    // Reset to defaults
    const handleReset = useCallback(async () => {
        if (!(await confirmDialog("Reset to defaults? Your custom encounter configuration will be removed."))) return;
        setSaving(true);
        try {
            const base = API_BASE();
            const res = await fetchWithAuth(`${base}/api/tab-field-config/encounter-form`, {
                method: "DELETE",
            });
            if (res.ok) {
                await loadData();
                showNotif("success", "Reset to defaults");
            } else {
                showNotif("error", "Failed to reset");
            }
        } catch {
            showNotif("error", "Failed to reset");
        } finally {
            setSaving(false);
        }
    }, [loadData]);

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
                            <ClipboardList className="w-6 h-6" /> Encounter Form Configuration
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure encounter form sections — enable/disable, reorder, and adjust display settings.
                            Changes are saved to the server and apply to all users.
                        </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        configSource === "ORG_CUSTOM" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                    }`}>
                        {configSource === "ORG_CUSTOM" ? "Custom Config" : "Universal Default"}
                    </span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                placeholder="Search sections..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <span className="text-sm text-gray-500">
                            {enabledCount}/{totalCount} enabled
                        </span>
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
                        <button
                            onClick={handleReset}
                            disabled={saving || configSource === "UNIVERSAL_DEFAULT"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
                             saveFeedback ? <Check className="w-4 h-4" /> :
                             <Save className="w-4 h-4" />}
                            {saveFeedback ? "Saved!" : "Save Changes"}
                        </button>
                    </div>
                </div>

                <div className={showCode ? "flex gap-4" : ""}>
                {/* Code Panel */}
                {showCode && (
                    <div className="w-1/2 shrink-0 border border-gray-200 rounded-lg overflow-hidden h-[calc(100vh-336px)] min-h-64">
                        <JsonCodeView
                            value={fieldConfig}
                            onChange={(parsed) => {
                                if (parsed?.sections) {
                                    parsed.sections = parsed.sections.map((s: any) => ({
                                        ...s,
                                        visible: s.visible !== false,
                                    }));
                                }
                                setFieldConfig(parsed);
                            }}
                            tabKey="encounter-form"
                            fhirResources={fhirResources}
                        />
                    </div>
                )}

                <div className={showCode ? "w-1/2 overflow-auto" : ""}>
                {/* Sections List */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-10"></th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-[35%]">Section</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fields</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-20">Columns</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Order</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sections.map((section) => {
                                const isExpanded = expandedSection === section.key;
                                return (
                                    <React.Fragment key={section.key}>
                                        <tr className={`hover:bg-gray-50 transition-colors ${section.visible === false ? "opacity-50" : ""}`}>
                                            <td className="px-4 py-3">
                                                <GripVertical className="w-4 h-4 text-gray-400" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                                                        className="p-0.5 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                    <span className={`w-2 h-2 rounded-full ${section.visible !== false ? "bg-green-500" : "bg-gray-300"}`} />
                                                    <span className="text-sm font-medium text-gray-900">{section.title}</span>
                                                    <span className="text-xs text-gray-400">{section.key}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-500">
                                                    {section.fields?.length || 0} fields
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <select
                                                    value={section.columns || 1}
                                                    onChange={(e) => updateSection(section.key, { columns: Number(e.target.value) })}
                                                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-16"
                                                >
                                                    {[1, 2, 3, 4].map((n) => (
                                                        <option key={n} value={n}>{n}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => toggleVisible(section.key)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        section.visible !== false ? "bg-green-500" : "bg-gray-300"
                                                    }`}
                                                >
                                                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                                        section.visible !== false ? "translate-x-6" : "translate-x-1"
                                                    }`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => moveSection(section.key, "up")}
                                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                                        disabled={!!search}
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveSection(section.key, "down")}
                                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                                        disabled={!!search}
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded row: section details */}
                                        {isExpanded && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={6} className="px-8 py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Collapsible</label>
                                                            <button
                                                                onClick={() => updateSection(section.key, { collapsible: !section.collapsible })}
                                                                className={`px-3 py-1 rounded text-xs font-medium ${
                                                                    section.collapsible ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                                                                }`}
                                                            >
                                                                {section.collapsible ? "Yes" : "No"}
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Default Collapsed</label>
                                                            <button
                                                                onClick={() => updateSection(section.key, { collapsed: !section.collapsed })}
                                                                className={`px-3 py-1 rounded text-xs font-medium ${
                                                                    section.collapsed ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                                                                }`}
                                                            >
                                                                {section.collapsed ? "Collapsed" : "Expanded"}
                                                            </button>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Fields in this section</label>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(section.fields || []).map((f: any) => (
                                                                    <span key={f.key} className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-gray-200 text-xs text-gray-600">
                                                                        {f.label || f.key}
                                                                    </span>
                                                                ))}
                                                                {(!section.fields || section.fields.length === 0) && (
                                                                    <span className="text-xs text-gray-400">No fields</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {sections.length === 0 && (
                                <tr>
                                    <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={6}>
                                        {search ? "No sections match your search." : "No encounter form configuration found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Info */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700">
                        <strong>Note:</strong> To edit the fields within each section (add/remove/reorder fields, change field types, etc.),
                        use the <strong>Field Configuration</strong> editor on the Layout Settings page for Encounter.
                        This page controls section visibility, ordering, and display properties.
                    </p>
                </div>
                </div>{/* close sections column */}
                </div>{/* close flex wrapper */}
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
