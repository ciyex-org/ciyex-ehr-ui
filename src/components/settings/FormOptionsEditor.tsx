"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Loader2, ChevronRight, Plus, Trash2, GripVertical, Save, X, Zap, OctagonX, ArrowRight, Hash, StickyNote } from "lucide-react";
import { toast, confirmDialog } from "@/utils/toast";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/* Extended option: supports all possible properties from status-type fields */
interface SelectOption {
    value: string;
    label: string;
    color?: string;
    triggersEncounter?: boolean;
    terminal?: boolean;
    nextStatus?: string;
    order?: number;
    encounterNote?: string;
    [key: string]: any; // preserve any unknown properties
}

interface SelectField {
    key: string;
    label: string;
    sectionLabel: string;
    options: SelectOption[];
    hasExtended: boolean; // true if options have properties beyond value/label/color
}

interface TabConfig {
    tabKey: string;
    label: string;
    category: string;
    fieldConfig: any;
    fhirResources: string[];
}

interface GroupedFields {
    tabKey: string;
    tabLabel: string;
    fields: SelectField[];
}

const EXTENDED_KEYS = ["triggersEncounter", "terminal", "nextStatus", "order", "encounterNote"];

function extractSelectFields(config: TabConfig): SelectField[] {
    const fields: SelectField[] = [];
    const fc = config.fieldConfig;
    if (!fc?.sections) return fields;

    for (const section of fc.sections) {
        const sectionLabel = section.title || section.label || "";
        if (!section.fields) continue;
        for (const field of section.fields) {
            if (
                (field.type === "select" || field.type === "radio") &&
                Array.isArray(field.options) &&
                field.options.length > 0
            ) {
                const options: SelectOption[] = field.options.map((o: any) => {
                    if (typeof o === "string") {
                        return { value: o, label: o };
                    }
                    // Preserve ALL properties from the option object
                    return {
                        ...o,
                        value: o.value ?? o,
                        label: o.label ?? o.value ?? o,
                    };
                });

                // Detect if any option has extended properties
                const hasExtended = field.options.some(
                    (o: any) => typeof o === "object" && EXTENDED_KEYS.some((k) => k in o)
                );

                fields.push({
                    key: field.key,
                    label: field.label || field.key,
                    sectionLabel,
                    options,
                    hasExtended,
                });
            }
        }
    }
    return fields;
}

function buildUpdatedFieldConfig(fieldConfig: any, fieldKey: string, newOptions: SelectOption[]): any {
    const updated = JSON.parse(JSON.stringify(fieldConfig));
    for (const section of updated.sections || []) {
        for (const field of section.fields || []) {
            if (field.key === fieldKey) {
                field.options = newOptions.map((o) => {
                    // Check if this option has any extended properties
                    const hasExt = EXTENDED_KEYS.some((k) => o[k] !== undefined && o[k] !== "" && o[k] !== null);
                    if (!hasExt && !o.color) {
                        // Simple option — just value and label
                        return { value: o.value, label: o.label };
                    }
                    // Preserve all properties
                    const opt: any = { value: o.value, label: o.label };
                    if (o.color) opt.color = o.color;
                    for (const k of EXTENDED_KEYS) {
                        if (o[k] !== undefined && o[k] !== "" && o[k] !== null) {
                            opt[k] = o[k];
                        }
                    }
                    return opt;
                });
                return updated;
            }
        }
    }
    return updated;
}

export default function FormOptionsEditor() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<GroupedFields[]>([]);
    const [configs, setConfigs] = useState<TabConfig[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [editOptions, setEditOptions] = useState<SelectOption[]>([]);
    const [dirty, setDirty] = useState(false);
    const [isExtended, setIsExtended] = useState(false);

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/all`);
            if (!res.ok) throw new Error("Failed to fetch configs");
            const data: TabConfig[] = await res.json();
            setConfigs(data);

            const grouped: GroupedFields[] = [];
            for (const config of data) {
                const fields = extractSelectFields(config);
                if (fields.length > 0) {
                    grouped.push({
                        tabKey: config.tabKey,
                        tabLabel: config.label || config.tabKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                        fields,
                    });
                }
            }
            setGroups(grouped);
            if (grouped.length > 0 && !activeTab) {
                setActiveTab(grouped[0].tabKey);
            }
        } catch (err) {
            console.error("Failed to load configs:", err);
        }
        setLoading(false);
    }, [activeTab]);

    useEffect(() => { fetchConfigs(); }, []);

    const activeGroup = groups.find((g) => g.tabKey === activeTab);
    const activeFieldData = activeGroup?.fields.find((f) => f.key === activeField);

    const handleSelectField = async (field: SelectField) => {
        if (dirty) {
            const confirmed = await confirmDialog("You have unsaved changes. Discard?");
            if (!confirmed) return;
        }
        setActiveField(field.key);
        setEditOptions(field.options.map((o) => ({ ...o })));
        setIsExtended(field.hasExtended);
        setDirty(false);
    };

    const handleAddOption = () => {
        const newOpt: SelectOption = { value: "", label: "" };
        if (isExtended) {
            newOpt.triggersEncounter = false;
            newOpt.terminal = false;
            newOpt.order = editOptions.length + 1;
        }
        setEditOptions([...editOptions, newOpt]);
        setDirty(true);
    };

    const handleRemoveOption = (idx: number) => {
        setEditOptions(editOptions.filter((_, i) => i !== idx));
        setDirty(true);
    };

    const handleOptionChange = (idx: number, field: string, val: any) => {
        const updated = [...editOptions];
        updated[idx] = { ...updated[idx], [field]: val };
        // Auto-sync label from value if label is empty and user is typing value
        if (field === "value" && !updated[idx].label) {
            updated[idx].label = String(val).charAt(0).toUpperCase() + String(val).slice(1);
        }
        setEditOptions(updated);
        setDirty(true);
    };

    const handleSave = async () => {
        if (!activeTab || !activeField) return;
        const config = configs.find((c) => c.tabKey === activeTab);
        if (!config) return;

        const invalid = editOptions.some((o) => !o.value.trim());
        if (invalid) {
            toast.error("All options must have a value.");
            return;
        }

        setSaving(true);
        try {
            const updatedFieldConfig = buildUpdatedFieldConfig(config.fieldConfig, activeField, editOptions);
            const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${activeTab}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fieldConfig: updatedFieldConfig,
                    fhirResources: config.fhirResources,
                }),
            });
            if (!res.ok) throw new Error("Failed to save");
            setDirty(false);
            await fetchConfigs();
        } catch (err) {
            toast.error("Failed to save options. Please try again.");
            console.error(err);
        }
        setSaving(false);
    };

    const handleDiscard = () => {
        if (activeFieldData) {
            setEditOptions(activeFieldData.options.map((o) => ({ ...o })));
            setIsExtended(activeFieldData.hasExtended);
        }
        setDirty(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left: Tab + Field list */}
            <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto shrink-0">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dropdown Fields</h3>
                </div>
                <div className="p-2">
                    {groups.map((group) => (
                        <div key={group.tabKey} className="mb-1">
                            <button
                                onClick={() => {
                                    setActiveTab(activeTab === group.tabKey ? null : group.tabKey);
                                }}
                                className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    activeTab === group.tabKey
                                        ? "bg-gray-100 text-gray-900"
                                        : "text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                <ChevronRight
                                    className={`w-3.5 h-3.5 transition-transform ${
                                        activeTab === group.tabKey ? "rotate-90" : ""
                                    }`}
                                />
                                <span className="truncate">{group.tabLabel}</span>
                                <span className="ml-auto text-xs text-gray-400">{group.fields.length}</span>
                            </button>
                            {activeTab === group.tabKey && (
                                <div className="ml-4 mt-0.5 space-y-0.5">
                                    {group.fields.map((field) => (
                                        <button
                                            key={field.key}
                                            onClick={() => handleSelectField(field)}
                                            className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
                                                activeField === field.key
                                                    ? "bg-blue-50 text-blue-700 font-medium"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1 truncate">
                                                {field.label}
                                                {field.hasExtended && (
                                                    <Zap className="w-3 h-3 text-amber-500 shrink-0" title="Has workflow config" />
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400">{field.options.length} options</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <p className="text-sm text-gray-400 px-3 py-8 text-center">
                            No configurable dropdown fields found
                        </p>
                    )}
                </div>
            </div>

            {/* Right: Option editor */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                {activeField && activeFieldData ? (
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{activeFieldData.label}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {activeGroup?.tabLabel} {activeFieldData.sectionLabel ? `/ ${activeFieldData.sectionLabel}` : ""}
                                    {" "}&middot; Field key: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{activeField}</code>
                                </p>
                            </div>
                            {dirty && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleDiscard}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border rounded-md hover:bg-gray-50"
                                    >
                                        <X className="w-3.5 h-3.5" /> Discard
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Options table */}
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="w-8 px-2 py-2"></th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Value</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Label</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">Color</th>
                                            {isExtended && (
                                                <>
                                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-16" title="Order">
                                                        <Hash className="w-3.5 h-3.5 mx-auto" />
                                                    </th>
                                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase" title="Triggers Encounter">
                                                        <div className="flex items-center gap-1 justify-center">
                                                            <Zap className="w-3.5 h-3.5" />
                                                            <span className="hidden xl:inline">Encounter</span>
                                                        </div>
                                                    </th>
                                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase" title="Terminal Status">
                                                        <div className="flex items-center gap-1 justify-center">
                                                            <OctagonX className="w-3.5 h-3.5" />
                                                            <span className="hidden xl:inline">Terminal</span>
                                                        </div>
                                                    </th>
                                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase" title="Next Status">
                                                        <div className="flex items-center gap-1">
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                            <span className="hidden xl:inline">Next</span>
                                                        </div>
                                                    </th>
                                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase" title="Encounter Note">
                                                        <div className="flex items-center gap-1">
                                                            <StickyNote className="w-3.5 h-3.5" />
                                                            <span className="hidden xl:inline">Note</span>
                                                        </div>
                                                    </th>
                                                </>
                                            )}
                                            <th className="w-10 px-2 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {editOptions.map((opt, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50">
                                                <td className="px-2 py-1.5 text-gray-300">
                                                    <GripVertical className="w-4 h-4" />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={opt.value}
                                                        onChange={(e) => handleOptionChange(idx, "value", e.target.value)}
                                                        placeholder="option_value"
                                                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={opt.label}
                                                        onChange={(e) => handleOptionChange(idx, "label", e.target.value)}
                                                        placeholder="Display Label"
                                                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="color"
                                                            value={opt.color || "#3b82f6"}
                                                            onChange={(e) => handleOptionChange(idx, "color", e.target.value)}
                                                            className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5"
                                                        />
                                                        {opt.color && (
                                                            <button
                                                                onClick={() => handleOptionChange(idx, "color", "")}
                                                                className="text-xs text-gray-400 hover:text-red-500"
                                                                title="Remove color"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                {isExtended && (
                                                    <>
                                                        <td className="px-2 py-1.5">
                                                            <input
                                                                type="number"
                                                                value={opt.order ?? ""}
                                                                onChange={(e) => handleOptionChange(idx, "order", e.target.value ? parseInt(e.target.value) : undefined)}
                                                                className="w-14 px-1.5 py-1 text-sm text-center border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!opt.triggersEncounter}
                                                                onChange={(e) => handleOptionChange(idx, "triggersEncounter", e.target.checked)}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                                title="Auto-create encounter when this status is set"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!opt.terminal}
                                                                onChange={(e) => handleOptionChange(idx, "terminal", e.target.checked)}
                                                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                                                title="Final status — no further transitions"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <select
                                                                value={opt.nextStatus || ""}
                                                                onChange={(e) => handleOptionChange(idx, "nextStatus", e.target.value || undefined)}
                                                                className="w-full px-1.5 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 bg-white"
                                                            >
                                                                <option value="">—</option>
                                                                {editOptions
                                                                    .filter((_, i) => i !== idx)
                                                                    .map((o) => (
                                                                        <option key={o.value} value={o.value}>{o.label || o.value}</option>
                                                                    ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={opt.encounterNote || ""}
                                                                onChange={(e) => handleOptionChange(idx, "encounterNote", e.target.value || undefined)}
                                                                placeholder="—"
                                                                className="w-full px-1.5 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-2 py-1.5">
                                                    <button
                                                        onClick={() => handleRemoveOption(idx)}
                                                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Remove option"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add option */}
                            <div className="px-3 py-2 border-t border-gray-100">
                                <button
                                    onClick={handleAddOption}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    <Plus className="w-4 h-4" /> Add option
                                </button>
                            </div>
                        </div>

                        {/* Extended config legend */}
                        {isExtended && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Workflow Configuration</h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-800">
                                    <div className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> <strong>Encounter:</strong> Auto-creates encounter on this status</div>
                                    <div className="flex items-center gap-1.5"><OctagonX className="w-3 h-3" /> <strong>Terminal:</strong> Final status, no further transitions</div>
                                    <div className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> <strong>Next:</strong> Suggested next status in workflow</div>
                                    <div className="flex items-center gap-1.5"><StickyNote className="w-3 h-3" /> <strong>Note:</strong> Auto-added to encounter when created</div>
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        <div className="mt-6">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</h4>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">{activeFieldData.label}</label>
                                <select className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md bg-white">
                                    <option value="">Select...</option>
                                    {editOptions.map((opt, idx) => (
                                        <option key={idx} value={opt.value}>{opt.label || opt.value}</option>
                                    ))}
                                </select>
                                {editOptions.some((o) => o.color) && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {editOptions.filter((o) => o.color).map((opt, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium text-white"
                                                style={{ backgroundColor: opt.color }}
                                            >
                                                {opt.label || opt.value}
                                                {opt.triggersEncounter && <Zap className="w-3 h-3" />}
                                                {opt.terminal && <OctagonX className="w-3 h-3" />}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                        <p className="text-sm font-medium">Select a field to edit its options</p>
                        <p className="text-xs mt-1">Choose a dropdown field from the left panel</p>
                    </div>
                )}
            </div>
        </div>
    );
}
