"use client";

import React, { useState } from "react";
import { ICONS } from "./IconPicker";
import IconPicker from "./IconPicker";
import {
    Eye, EyeOff, GripVertical, ChevronDown, ChevronUp, Plus, Trash2, FileText,
    Pencil, X, Check, FolderPlus, ArrowRight,
    type LucideIcon,
} from "lucide-react";

export interface TabItem {
    key: string;
    label: string;
    icon: string;
    visible: boolean;
    position: number;
}

export interface TabCategory {
    label: string;
    position: number;
    tabs: TabItem[];
}

interface TabManagerProps {
    categories: TabCategory[];
    onChange: (categories: TabCategory[]) => void;
}

export default function TabManager({ categories, onChange }: TabManagerProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(categories.map(c => c.label))
    );
    const [editingTab, setEditingTab] = useState<{ catIdx: number; tabIdx: number } | null>(null);
    const [editForm, setEditForm] = useState({ label: "", icon: "", key: "" });
    const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
    const [editCategoryLabel, setEditCategoryLabel] = useState("");
    const [showAddTab, setShowAddTab] = useState<number | null>(null); // catIdx or -1 for ungrouped
    const [newTab, setNewTab] = useState({ key: "", label: "", icon: "FileText" });
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [newGroupLabel, setNewGroupLabel] = useState("");
    const [movingTab, setMovingTab] = useState<{ catIdx: number; tabIdx: number } | null>(null);

    // The first category with label "" or "(Top Level)" is ungrouped tabs
    const TOP_LEVEL_LABEL = "(Top Level)";

    const toggleExpand = (label: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    const toggleTabVisibility = (catIdx: number, tabIdx: number) => {
        const updated = [...categories];
        updated[catIdx] = {
            ...updated[catIdx],
            tabs: updated[catIdx].tabs.map((tab, i) =>
                i === tabIdx ? { ...tab, visible: !tab.visible } : tab
            ),
        };
        onChange(updated);
    };

    const moveTab = (catIdx: number, tabIdx: number, direction: "up" | "down") => {
        const updated = [...categories];
        const tabs = [...updated[catIdx].tabs];
        const swapIdx = direction === "up" ? tabIdx - 1 : tabIdx + 1;
        if (swapIdx < 0 || swapIdx >= tabs.length) return;

        [tabs[tabIdx], tabs[swapIdx]] = [tabs[swapIdx], tabs[tabIdx]];
        tabs.forEach((tab, i) => (tab.position = i));
        updated[catIdx] = { ...updated[catIdx], tabs };
        onChange(updated);
    };

    const moveCategory = (catIdx: number, direction: "up" | "down") => {
        const updated = [...categories];
        const swapIdx = direction === "up" ? catIdx - 1 : catIdx + 1;
        if (swapIdx < 0 || swapIdx >= updated.length) return;

        [updated[catIdx], updated[swapIdx]] = [updated[swapIdx], updated[catIdx]];
        updated.forEach((cat, i) => (cat.position = i));
        onChange(updated);
    };

    // Start editing a tab
    const startEditTab = (catIdx: number, tabIdx: number) => {
        const tab = categories[catIdx].tabs[tabIdx];
        setEditingTab({ catIdx, tabIdx });
        setEditForm({ label: tab.label, icon: tab.icon, key: tab.key });
    };

    // Save tab edits
    const saveEditTab = () => {
        if (!editingTab || !editForm.label.trim()) return;
        const updated = [...categories];
        const tab = { ...updated[editingTab.catIdx].tabs[editingTab.tabIdx] };
        tab.label = editForm.label;
        tab.icon = editForm.icon;
        tab.key = editForm.key || tab.key;
        updated[editingTab.catIdx].tabs[editingTab.tabIdx] = tab;
        onChange(updated);
        setEditingTab(null);
    };

    // Start editing category label
    const startEditCategory = (catIdx: number) => {
        setEditingCategoryIdx(catIdx);
        setEditCategoryLabel(categories[catIdx].label);
    };

    const saveEditCategory = () => {
        if (editingCategoryIdx === null || !editCategoryLabel.trim()) return;
        const updated = [...categories];
        updated[editingCategoryIdx] = { ...updated[editingCategoryIdx], label: editCategoryLabel };
        onChange(updated);
        setEditingCategoryIdx(null);
    };

    // Move tab to a different group
    const moveTabToGroup = (fromCatIdx: number, tabIdx: number, toCatIdx: number) => {
        if (fromCatIdx === toCatIdx) {
            setMovingTab(null);
            return;
        }
        const updated = [...categories];
        const tab = updated[fromCatIdx].tabs[tabIdx];
        // Remove from source
        updated[fromCatIdx] = {
            ...updated[fromCatIdx],
            tabs: updated[fromCatIdx].tabs.filter((_, i) => i !== tabIdx),
        };
        // Add to target
        const targetTabs = [...updated[toCatIdx].tabs, { ...tab, position: updated[toCatIdx].tabs.length }];
        updated[toCatIdx] = { ...updated[toCatIdx], tabs: targetTabs };
        // Re-index positions
        updated[fromCatIdx].tabs.forEach((t, i) => (t.position = i));
        onChange(updated);
        setMovingTab(null);
    };

    // Add new group
    const addGroup = () => {
        if (!newGroupLabel.trim()) return;
        const updated = [...categories, {
            label: newGroupLabel.trim(),
            position: categories.length,
            tabs: [],
        }];
        onChange(updated);
        setShowAddGroup(false);
        setNewGroupLabel("");
        setExpandedCategories(prev => new Set([...prev, newGroupLabel.trim()]));
    };

    // Remove group (move its tabs to top-level or delete if empty)
    const removeGroup = (catIdx: number) => {
        const cat = categories[catIdx];
        if (cat.tabs.length > 0) {
            if (!confirm(`Remove group "${cat.label}"? Its ${cat.tabs.length} tabs will be moved to the first group.`)) return;
            // Move tabs to first available group (or create top-level)
            const updated = [...categories];
            const targetIdx = catIdx === 0 ? 1 : 0;
            if (updated[targetIdx]) {
                const movedTabs = cat.tabs.map((t, i) => ({ ...t, position: updated[targetIdx].tabs.length + i }));
                updated[targetIdx] = {
                    ...updated[targetIdx],
                    tabs: [...updated[targetIdx].tabs, ...movedTabs],
                };
            }
            updated.splice(catIdx, 1);
            updated.forEach((c, i) => (c.position = i));
            onChange(updated);
        } else {
            const updated = [...categories];
            updated.splice(catIdx, 1);
            updated.forEach((c, i) => (c.position = i));
            onChange(updated);
        }
    };

    // Add a new tab to a group
    const addTabToGroup = (catIdx: number) => {
        if (!newTab.label.trim()) return;
        const key = newTab.key.trim() || newTab.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const updated = [...categories];
        updated[catIdx] = {
            ...updated[catIdx],
            tabs: [...updated[catIdx].tabs, {
                key,
                label: newTab.label,
                icon: newTab.icon || "FileText",
                visible: true,
                position: updated[catIdx].tabs.length,
            }],
        };
        onChange(updated);
        setShowAddTab(null);
        setNewTab({ key: "", label: "", icon: "FileText" });
    };

    // Remove a tab
    const removeTab = (catIdx: number, tabIdx: number) => {
        const tab = categories[catIdx].tabs[tabIdx];
        if (!confirm(`Remove "${tab.label}" from the layout?`)) return;
        const updated = [...categories];
        updated[catIdx] = {
            ...updated[catIdx],
            tabs: updated[catIdx].tabs.filter((_, i) => i !== tabIdx),
        };
        updated[catIdx].tabs.forEach((t, i) => (t.position = i));
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            {categories.map((category, catIdx) => {
                const isExpanded = expandedCategories.has(category.label);
                const visibleCount = category.tabs.filter(t => t.visible).length;
                const isEditingCategory = editingCategoryIdx === catIdx;

                return (
                    <div key={catIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Category Header */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => moveCategory(catIdx, "up")}
                                    disabled={catIdx === 0}
                                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    title="Move group up"
                                >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => moveCategory(catIdx, "down")}
                                    disabled={catIdx === categories.length - 1}
                                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    title="Move group down"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {isEditingCategory ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={editCategoryLabel}
                                        onChange={(e) => setEditCategoryLabel(e.target.value)}
                                        className="px-2 py-0.5 text-sm font-semibold border border-blue-300 rounded bg-white outline-none w-40"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") saveEditCategory();
                                            if (e.key === "Escape") setEditingCategoryIdx(null);
                                        }}
                                    />
                                    <button onClick={saveEditCategory} className="p-0.5 text-green-600 hover:text-green-700">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditingCategoryIdx(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => startEditCategory(catIdx)}
                                    className="text-sm font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1"
                                    title="Click to rename group"
                                >
                                    {category.label}
                                    <Pencil className="w-3 h-3 text-gray-300" />
                                </button>
                            )}

                            <span className="text-xs text-gray-500 ml-auto mr-2">
                                {visibleCount}/{category.tabs.length} visible
                            </span>

                            <button
                                onClick={() => {
                                    setShowAddTab(catIdx);
                                    if (!isExpanded) toggleExpand(category.label);
                                }}
                                className="p-1 text-gray-400 hover:text-green-600"
                                title="Add tab to group"
                            >
                                <Plus className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => removeGroup(catIdx)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Remove group"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={() => toggleExpand(category.label)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Tab List */}
                        {isExpanded && (
                            <div className="divide-y divide-gray-100">
                                {category.tabs.map((tab, tabIdx) => {
                                    const Icon = ICONS[tab.icon] || FileText;
                                    const isEditing = editingTab?.catIdx === catIdx && editingTab?.tabIdx === tabIdx;
                                    const isMoving = movingTab?.catIdx === catIdx && movingTab?.tabIdx === tabIdx;

                                    return (
                                        <div key={tab.key}>
                                            <div
                                                className={`flex items-center gap-3 px-4 py-2.5 ${
                                                    tab.visible ? "bg-white" : "bg-gray-50 opacity-60"
                                                } ${isEditing ? "bg-blue-50" : "hover:bg-gray-50"}`}
                                            >
                                                <GripVertical className="w-4 h-4 text-gray-300" />

                                                <Icon className="w-4 h-4 text-gray-500 shrink-0" />

                                                <span className="text-sm text-gray-700 flex-1 font-medium">{tab.label}</span>
                                                <span className="text-xs text-gray-400 font-mono mr-2">{tab.key}</span>

                                                <div className="flex items-center gap-0.5">
                                                    <button
                                                        onClick={() => moveTab(catIdx, tabIdx, "up")}
                                                        disabled={tabIdx === 0}
                                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                        title="Move up"
                                                    >
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveTab(catIdx, tabIdx, "down")}
                                                        disabled={tabIdx === category.tabs.length - 1}
                                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                        title="Move down"
                                                    >
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => startEditTab(catIdx, tabIdx)}
                                                        className="p-1 text-gray-400 hover:text-blue-600"
                                                        title="Edit tab"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setMovingTab(isMoving ? null : { catIdx, tabIdx })}
                                                        className={`p-1 ${isMoving ? "text-blue-600" : "text-gray-400 hover:text-blue-600"}`}
                                                        title="Move to another group"
                                                    >
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleTabVisibility(catIdx, tabIdx)}
                                                        className={`p-1 rounded ${
                                                            tab.visible
                                                                ? "text-blue-600 hover:text-blue-700"
                                                                : "text-gray-400 hover:text-gray-600"
                                                        }`}
                                                        title={tab.visible ? "Hide tab" : "Show tab"}
                                                    >
                                                        {tab.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => removeTab(catIdx, tabIdx)}
                                                        className="p-1 text-gray-400 hover:text-red-600"
                                                        title="Remove tab"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Move to group dropdown */}
                                            {isMoving && (
                                                <div className="px-8 py-2 bg-blue-50 border-t border-blue-100">
                                                    <span className="text-xs font-medium text-blue-700 mr-2">Move to:</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {categories.map((targetCat, targetIdx) => (
                                                            targetIdx !== catIdx && (
                                                                <button
                                                                    key={targetIdx}
                                                                    onClick={() => moveTabToGroup(catIdx, tabIdx, targetIdx)}
                                                                    className="px-2 py-1 text-xs bg-white border border-blue-200 rounded hover:bg-blue-100 text-blue-700"
                                                                >
                                                                    {targetCat.label}
                                                                </button>
                                                            )
                                                        ))}
                                                        <button
                                                            onClick={() => setMovingTab(null)}
                                                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Edit tab inline */}
                                            {isEditing && (
                                                <div className="px-8 py-3 bg-blue-50 border-t border-blue-100 space-y-2">
                                                    <div className="flex items-end gap-3">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.label}
                                                                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="w-32">
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">Key</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.key}
                                                                onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                                                            <IconPicker
                                                                value={editForm.icon}
                                                                onChange={(v) => setEditForm({ ...editForm, icon: v })}
                                                            />
                                                        </div>
                                                        <button onClick={saveEditTab} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Save">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditingTab(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded" title="Cancel">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Add tab form inline */}
                                {showAddTab === catIdx && (
                                    <div className="px-4 py-3 bg-green-50 border-t border-green-100">
                                        <div className="flex items-end gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Tab Label</label>
                                                <input
                                                    type="text"
                                                    value={newTab.label}
                                                    onChange={(e) => setNewTab({ ...newTab, label: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    placeholder="e.g., Encounters"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") addTabToGroup(catIdx);
                                                        if (e.key === "Escape") setShowAddTab(null);
                                                    }}
                                                />
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Key</label>
                                                <input
                                                    type="text"
                                                    value={newTab.key}
                                                    onChange={(e) => setNewTab({ ...newTab, key: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono"
                                                    placeholder="auto"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                                                <IconPicker
                                                    value={newTab.icon}
                                                    onChange={(v) => setNewTab({ ...newTab, icon: v })}
                                                />
                                            </div>
                                            <button
                                                onClick={() => addTabToGroup(catIdx)}
                                                disabled={!newTab.label.trim()}
                                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => setShowAddTab(null)}
                                                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {category.tabs.length === 0 && showAddTab !== catIdx && (
                                    <div className="px-4 py-4 text-center">
                                        <p className="text-xs text-gray-400">No tabs in this group</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add Group button */}
            {showAddGroup ? (
                <div className="border border-dashed border-blue-300 rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newGroupLabel}
                            onChange={(e) => setNewGroupLabel(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded"
                            placeholder="Group name (e.g., Billing)"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") addGroup();
                                if (e.key === "Escape") setShowAddGroup(false);
                            }}
                        />
                        <button
                            onClick={addGroup}
                            disabled={!newGroupLabel.trim()}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            Add Group
                        </button>
                        <button
                            onClick={() => { setShowAddGroup(false); setNewGroupLabel(""); }}
                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddGroup(true)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                    <FolderPlus className="w-4 h-4" />
                    Add Group
                </button>
            )}
        </div>
    );
}
