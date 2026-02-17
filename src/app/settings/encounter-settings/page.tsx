"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import {
    SECTIONS,
    type SectionKey,
    type EnabledMap,
    readEnabledMap,
    writeEnabledMap,
} from "@/lib/encounter-sections";
import {
    Settings, Loader2, Save, RotateCcw, Plus, Trash2, Edit2, X, Check,
    Eye, ClipboardList, ArrowUp, ArrowDown, Search, GripVertical,
} from "lucide-react";

const ORDER_KEY = "encounter-sections-order@v1";
const DESC_KEY = "encounter-sections-enabled@v1:descriptions";
const CUSTOM_KEY = "encounter-custom-sections@v1";

interface SectionRow {
    id: string;
    name: string;
    enabled: boolean;
    description: string;
    isCustom: boolean;
}

interface CustomSection {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

function loadOrder(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(ORDER_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveOrder(order: string[]) {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function loadDescriptions(): Record<string, string> {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(DESC_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function saveDescriptions(descs: Record<string, string>) {
    localStorage.setItem(DESC_KEY, JSON.stringify(descs));
}

function loadCustomSections(): CustomSection[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(CUSTOM_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveCustomSections(sections: CustomSection[]) {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(sections));
}

export default function EncounterSettingsPage() {
    const [activeSection, setActiveSection] = useState<"section-manager" | "custom-sections">("section-manager");
    const [enabledMap, setEnabledMap] = useState<EnabledMap>({});
    const [descriptions, setDescriptions] = useState<Record<string, string>>({});
    const [order, setOrder] = useState<string[]>([]);
    const [customSections, setCustomSections] = useState<CustomSection[]>([]);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Custom section form
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [newCustom, setNewCustom] = useState({ name: "", description: "" });
    const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

    useEffect(() => {
        setEnabledMap(readEnabledMap());
        setDescriptions(loadDescriptions());
        setOrder(loadOrder());
        setCustomSections(loadCustomSections());
    }, []);

    // Build ordered section rows
    const rows = useMemo(() => {
        const allSections: SectionRow[] = [
            ...SECTIONS.map(s => ({
                id: s.id,
                name: s.name,
                enabled: enabledMap[s.id] ?? true,
                description: descriptions[s.id] ?? "",
                isCustom: false,
            })),
            ...customSections.map(cs => ({
                id: cs.id,
                name: cs.name,
                enabled: cs.enabled,
                description: cs.description,
                isCustom: true,
            })),
        ];

        // Apply saved order
        if (order.length > 0) {
            const orderMap = new Map(order.map((id, i) => [id, i]));
            allSections.sort((a, b) => {
                const ai = orderMap.get(a.id) ?? 999;
                const bi = orderMap.get(b.id) ?? 999;
                return ai - bi;
            });
        }

        // Apply search filter
        const term = search.trim().toLowerCase();
        if (term) {
            return allSections.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.description.toLowerCase().includes(term)
            );
        }
        return allSections;
    }, [enabledMap, descriptions, order, customSections, search]);

    const enabledCount = useMemo(() =>
        rows.filter(r => r.enabled).length,
        [rows]
    );

    const moveSection = useCallback((id: string, direction: "up" | "down") => {
        setOrder(prev => {
            // Build full order if not yet established
            let current = prev.length > 0 ? [...prev] : [
                ...SECTIONS.map(s => s.id),
                ...customSections.map(cs => cs.id),
            ];
            const idx = current.indexOf(id);
            if (idx === -1) return prev;
            const newIdx = direction === "up" ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= current.length) return prev;
            [current[idx], current[newIdx]] = [current[newIdx], current[idx]];
            saveOrder(current);
            return current;
        });
    }, [customSections]);

    const toggleEnabled = useCallback((id: string, isCustom: boolean) => {
        if (isCustom) {
            setCustomSections(prev => {
                const next = prev.map(cs => cs.id === id ? { ...cs, enabled: !cs.enabled } : cs);
                saveCustomSections(next);
                return next;
            });
        } else {
            setEnabledMap(prev => {
                const current = prev[id as SectionKey] ?? true;
                const next: EnabledMap = { ...prev, [id]: !current };
                writeEnabledMap(next);
                return next;
            });
        }
    }, []);

    const updateDescription = useCallback((id: string, desc: string, isCustom: boolean) => {
        if (isCustom) {
            setCustomSections(prev => {
                const next = prev.map(cs => cs.id === id ? { ...cs, description: desc } : cs);
                return next;
            });
        } else {
            setDescriptions(prev => ({ ...prev, [id]: desc }));
        }
    }, []);

    const handleSave = useCallback(() => {
        setSaving(true);
        saveDescriptions(descriptions);
        saveCustomSections(customSections);
        if (order.length === 0) {
            const defaultOrder = [...SECTIONS.map(s => s.id), ...customSections.map(cs => cs.id)];
            saveOrder(defaultOrder);
            setOrder(defaultOrder);
        }
        setSaving(false);
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 1200);
    }, [descriptions, customSections, order]);

    const handleReset = useCallback(() => {
        const defaultMap: EnabledMap = {};
        SECTIONS.forEach(s => { defaultMap[s.id] = true; });
        setEnabledMap(defaultMap);
        writeEnabledMap(defaultMap);
        setDescriptions({});
        saveDescriptions({});
        setOrder([]);
        saveOrder([]);
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 1200);
    }, []);

    const addCustomSection = useCallback(() => {
        if (!newCustom.name.trim()) return;
        const id = `custom-${Date.now()}`;
        const section: CustomSection = {
            id,
            name: newCustom.name.trim(),
            description: newCustom.description.trim(),
            enabled: true,
        };
        const next = [...customSections, section];
        setCustomSections(next);
        saveCustomSections(next);
        // Add to order
        const currentOrder = order.length > 0 ? [...order] : [...SECTIONS.map(s => s.id), ...customSections.map(cs => cs.id)];
        currentOrder.push(id);
        setOrder(currentOrder);
        saveOrder(currentOrder);
        setNewCustom({ name: "", description: "" });
        setShowCustomForm(false);
    }, [newCustom, customSections, order]);

    const deleteCustomSection = useCallback((id: string) => {
        const next = customSections.filter(cs => cs.id !== id);
        setCustomSections(next);
        saveCustomSections(next);
        const newOrder = order.filter(o => o !== id);
        setOrder(newOrder);
        saveOrder(newOrder);
    }, [customSections, order]);

    const updateCustomSection = useCallback((id: string, updates: Partial<CustomSection>) => {
        const next = customSections.map(cs => cs.id === id ? { ...cs, ...updates } : cs);
        setCustomSections(next);
        saveCustomSections(next);
        setEditingCustomId(null);
    }, [customSections]);

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList className="w-6 h-6" /> Encounter
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure encounter sections, ordering, and custom sections
                        </p>
                    </div>
                </div>

                {/* Section Tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                    {[
                        { key: "section-manager" as const, label: "Section Manager", icon: Eye },
                        { key: "custom-sections" as const, label: "Custom Sections", icon: Plus },
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

                {/* Section Manager */}
                {activeSection === "section-manager" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                        placeholder="Search sections..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <span className="text-sm text-gray-500">
                                    {enabledCount}/{rows.length} enabled
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
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

                        {/* Section Table */}
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-10"></th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-[30%]">Section</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Order</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <GripVertical className="w-4 h-4 text-gray-400" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${row.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                                                    <span className="text-sm font-medium text-gray-900">{row.name}</span>
                                                    {row.isCustom && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Custom</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingId === row.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            value={row.description}
                                                            onChange={e => updateDescription(row.id, e.target.value, row.isCustom)}
                                                            autoFocus
                                                        />
                                                        <button onClick={() => { handleSave(); setEditingId(null); }} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span
                                                        className="text-sm text-gray-500 cursor-pointer hover:text-gray-700"
                                                        onClick={() => setEditingId(row.id)}
                                                    >
                                                        {row.description || "Click to add description..."}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => toggleEnabled(row.id, row.isCustom)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        row.enabled ? "bg-green-500" : "bg-gray-300"
                                                    }`}
                                                >
                                                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                                        row.enabled ? "translate-x-6" : "translate-x-1"
                                                    }`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => moveSection(row.id, "up")}
                                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                                        disabled={!!search}
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveSection(row.id, "down")}
                                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                                        disabled={!!search}
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={5}>
                                                No sections match your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Custom Sections */}
                {activeSection === "custom-sections" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Custom Encounter Sections</h3>
                            <button
                                onClick={() => { setShowCustomForm(true); setEditingCustomId(null); }}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" /> Add Custom Section
                            </button>
                        </div>

                        <p className="text-sm text-gray-500">
                            Create custom encounter sections that appear alongside the standard sections. Custom sections can be reordered in the Section Manager tab.
                        </p>

                        {/* Add/Edit Form */}
                        {showCustomForm && (
                            <div className="bg-white rounded-lg border border-blue-200 p-4 space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700">
                                    {editingCustomId ? "Edit Custom Section" : "New Custom Section"}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Section Name *</label>
                                        <input
                                            type="text"
                                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., Patient Goals"
                                            value={newCustom.name}
                                            onChange={e => setNewCustom(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                                        <input
                                            type="text"
                                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Brief description of this section"
                                            value={newCustom.description}
                                            onChange={e => setNewCustom(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {editingCustomId ? (
                                        <button
                                            onClick={() => {
                                                updateCustomSection(editingCustomId, { name: newCustom.name, description: newCustom.description });
                                                setShowCustomForm(false);
                                                setNewCustom({ name: "", description: "" });
                                            }}
                                            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                        >
                                            Update
                                        </button>
                                    ) : (
                                        <button
                                            onClick={addCustomSection}
                                            disabled={!newCustom.name.trim()}
                                            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Add Section
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowCustomForm(false); setNewCustom({ name: "", description: "" }); setEditingCustomId(null); }}
                                        className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Custom Sections List */}
                        {customSections.length === 0 && !showCustomForm ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
                                <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No custom sections yet. Click &quot;Add Custom Section&quot; to create one.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Status</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {customSections.map(cs => (
                                            <tr key={cs.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-900">{cs.name}</span>
                                                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Custom</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{cs.description || "—"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                        cs.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                        {cs.enabled ? "Enabled" : "Disabled"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCustomId(cs.id);
                                                                setNewCustom({ name: cs.name, description: cs.description });
                                                                setShowCustomForm(true);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleEnabled(cs.id, true)}
                                                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                                            title={cs.enabled ? "Disable" : "Enable"}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCustomSection(cs.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
