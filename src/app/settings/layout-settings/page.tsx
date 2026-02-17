"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import AdminLayout from "@/app/(admin)/layout";
import TabManager from "@/components/settings/TabManager";
import FormBuilder from "@/components/settings/FormBuilder";
import IconPicker from "@/components/settings/IconPicker";
import {
    Settings, Loader2, Save, RotateCcw, Plus, Trash2, Edit2, X, Check,
    FileText, Eye, Stethoscope, ChevronDown, ChevronUp, Columns,
    GripVertical, ArrowUp, ArrowDown, Search,
} from "lucide-react";
import { FHIR_RESOURCES, FHIR_PATH_SUGGESTIONS, FIELD_TYPES } from "@/utils/FhirPathHelper";
import type { FieldDef, SectionDef, FieldConfig } from "@/components/patients/DynamicFormRenderer";
import DynamicFormRenderer from "@/components/patients/DynamicFormRenderer";
import FieldConfigEditor from "@/components/settings/FieldConfigEditor";

const METADATA_API_BASE = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface PracticeType {
    id: string;
    code: string;
    name: string;
    category: string;
    description: string;
    icon: string;
    active: boolean;
}

interface Specialty {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    parentCode: string | null;
    active: boolean;
}

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

interface CustomTab {
    id: string;
    tabKey: string;
    label: string;
    icon: string;
    category: string;
    formSchema: any;
    position: number;
    active: boolean;
}

const CATEGORY_OPTIONS = ["Overview", "Encounters", "Clinical", "Claims", "General", "Financial", "Other"];
const PRACTICE_CATEGORIES = ["MEDICAL", "SURGICAL", "BEHAVIORAL", "DENTAL", "ALLIED_HEALTH", "HOME_HEALTH", "INPATIENT"];

export default function TabConfigurationPage() {
    const [activeSection, setActiveSection] = useState<"tab-manager" | "custom-tabs" | "manage-specialties" | "field-config">("tab-manager");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [selectedPracticeType, setSelectedPracticeType] = useState<string>("");
    const [tabCategories, setTabCategories] = useState<TabCategory[]>([]);
    const [configSource, setConfigSource] = useState<string>("UNIVERSAL_DEFAULT");
    const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
    const [editingCustomTab, setEditingCustomTab] = useState<CustomTab | null>(null);
    const [showCustomTabForm, setShowCustomTabForm] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Manage specialties state
    const [showSpecialtyForm, setShowSpecialtyForm] = useState(false);
    const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
    const [newSpecialty, setNewSpecialty] = useState({ code: "", name: "", description: "", icon: "Stethoscope", parentCode: "" });
    const [showPracticeTypeForm, setShowPracticeTypeForm] = useState(false);
    const [editingPracticeType, setEditingPracticeType] = useState<PracticeType | null>(null);
    const [newPracticeType, setNewPracticeType] = useState({ code: "", name: "", description: "", icon: "Stethoscope", category: "MEDICAL" });
    const [specialtyFilter, setSpecialtyFilter] = useState("");
    const [practiceTypeFilter, setPracticeTypeFilter] = useState("");
    const [expandedPT, setExpandedPT] = useState<string | null>(null);
    const [ptSpecialties, setPtSpecialties] = useState<Record<string, string[]>>({});

    // Field config state
    const [availableTabs, setAvailableTabs] = useState<{ tabKey: string; fhirResources: string[] }[]>([]);
    const [selectedTab, setSelectedTab] = useState<string>("");
    const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
    const [fieldConfigFhirResources, setFieldConfigFhirResources] = useState<string[]>([]);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [fieldConfigPreview, setFieldConfigPreview] = useState(false);
    const [previewFormData, setPreviewFormData] = useState<Record<string, any>>({});

    // New custom tab form state
    const [newTab, setNewTab] = useState<{
        tabKey: string; label: string; icon: string; category: string; formSchema: any;
    }>({
        tabKey: "",
        label: "",
        icon: "FileText",
        category: "Other",
        formSchema: { title: "", sections: [{ title: "Section 1", fields: [] }] },
    });

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
            const [ptRes, effectiveRes, customRes, specRes] = await Promise.allSettled([
                fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/practice-types`),
                fetchWithAuth(`${METADATA_API_BASE}/api/tab-field-config/layout`),
                fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/custom-tabs`),
                fetchWithAuth(`${METADATA_API_BASE}/api/specialties`),
            ]);

            if (ptRes.status === "fulfilled" && ptRes.value.ok) {
                const data = await ptRes.value.json();
                setPracticeTypes(data);
            }

            if (effectiveRes.status === "fulfilled" && effectiveRes.value.ok) {
                const data = await effectiveRes.value.json();
                setTabCategories(data.tabConfig || []);
                setConfigSource(data.source || "UNIVERSAL_DEFAULT");
                setSelectedPracticeType(data.practiceTypeCode || "universal");
            }

            if (customRes.status === "fulfilled" && customRes.value.ok) {
                const data = await customRes.value.json();
                setCustomTabs(data);
            }

            if (specRes.status === "fulfilled" && specRes.value.ok) {
                const data = await specRes.value.json();
                setSpecialties(data);
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

    // ---- Custom Tabs CRUD ----

    const handleCreateCustomTab = async () => {
        if (!newTab.tabKey || !newTab.label) {
            showNotif("error", "Tab key and label are required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/custom-tabs`, {
                method: "POST",
                body: JSON.stringify(newTab),
            });
            if (res.ok) {
                const created = await res.json();
                setCustomTabs([...customTabs, created]);
                setShowCustomTabForm(false);
                setNewTab({
                    tabKey: "",
                    label: "",
                    icon: "FileText",
                    category: "Other",
                    formSchema: { title: "", sections: [{ title: "Section 1", fields: [] }] },
                });
                showNotif("success", "Custom tab created");
            }
        } catch (err) {
            showNotif("error", "Failed to create custom tab");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateCustomTab = async () => {
        if (!editingCustomTab) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/custom-tabs/${editingCustomTab.id}`, {
                method: "PUT",
                body: JSON.stringify(editingCustomTab),
            });
            if (res.ok) {
                const updated = await res.json();
                setCustomTabs(customTabs.map(t => t.id === updated.id ? updated : t));
                setEditingCustomTab(null);
                showNotif("success", "Custom tab updated");
            }
        } catch (err) {
            showNotif("error", "Failed to update custom tab");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCustomTab = async (id: string) => {
        if (!confirm("Delete this custom tab? All patient data for this tab will be lost.")) return;
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/custom-tabs/${id}`, { method: "DELETE" });
            if (res.ok) {
                setCustomTabs(customTabs.filter(t => t.id !== id));
                showNotif("success", "Custom tab deleted");
            }
        } catch (err) {
            showNotif("error", "Failed to delete custom tab");
        }
    };

    // ---- Specialty CRUD ----

    const handleCreateSpecialty = async () => {
        if (!newSpecialty.code || !newSpecialty.name) {
            showNotif("error", "Code and name are required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/specialties`, {
                method: "POST",
                body: JSON.stringify(newSpecialty),
            });
            if (res.ok) {
                const created = await res.json();
                setSpecialties([...specialties, created]);
                setShowSpecialtyForm(false);
                setNewSpecialty({ code: "", name: "", description: "", icon: "Stethoscope", parentCode: "" });
                showNotif("success", "Specialty created");
            } else {
                const err = await res.text();
                showNotif("error", err || "Failed to create specialty");
            }
        } catch (err) {
            showNotif("error", "Failed to create specialty");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateSpecialty = async () => {
        if (!editingSpecialty) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/specialties/${editingSpecialty.code}`, {
                method: "PUT",
                body: JSON.stringify(editingSpecialty),
            });
            if (res.ok) {
                const updated = await res.json();
                setSpecialties(specialties.map(s => s.id === updated.id ? updated : s));
                setEditingSpecialty(null);
                showNotif("success", "Specialty updated");
            }
        } catch (err) {
            showNotif("error", "Failed to update specialty");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSpecialty = async (code: string) => {
        if (!confirm("Deactivate this specialty?")) return;
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/specialties/${code}`, { method: "DELETE" });
            if (res.ok) {
                setSpecialties(specialties.filter(s => s.code !== code));
                showNotif("success", "Specialty deactivated");
            }
        } catch (err) {
            showNotif("error", "Failed to deactivate specialty");
        }
    };

    // ---- Practice Type CRUD ----

    const handleCreatePracticeType = async () => {
        if (!newPracticeType.code || !newPracticeType.name) {
            showNotif("error", "Code and name are required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/practice-types`, {
                method: "POST",
                body: JSON.stringify(newPracticeType),
            });
            if (res.ok) {
                const created = await res.json();
                setPracticeTypes([...practiceTypes, created]);
                setShowPracticeTypeForm(false);
                setNewPracticeType({ code: "", name: "", description: "", icon: "Stethoscope", category: "MEDICAL" });
                showNotif("success", "Practice type created");
            } else {
                const err = await res.text();
                showNotif("error", err || "Failed to create practice type");
            }
        } catch (err) {
            showNotif("error", "Failed to create practice type");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePracticeType = async () => {
        if (!editingPracticeType) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/practice-types/${editingPracticeType.code}`, {
                method: "PUT",
                body: JSON.stringify(editingPracticeType),
            });
            if (res.ok) {
                const updated = await res.json();
                setPracticeTypes(practiceTypes.map(p => p.id === updated.id ? updated : p));
                setEditingPracticeType(null);
                showNotif("success", "Practice type updated");
            }
        } catch (err) {
            showNotif("error", "Failed to update practice type");
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePracticeType = async (code: string) => {
        if (!confirm("Deactivate this practice type?")) return;
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/practice-types/${code}`, { method: "DELETE" });
            if (res.ok) {
                setPracticeTypes(practiceTypes.filter(p => p.code !== code));
                showNotif("success", "Practice type deactivated");
            }
        } catch (err) {
            showNotif("error", "Failed to deactivate practice type");
        }
    };

    const loadPtSpecialties = async (code: string) => {
        if (expandedPT === code) {
            setExpandedPT(null);
            return;
        }
        try {
            const res = await fetchWithAuth(`${METADATA_API_BASE}/api/tab-config/practice-types/${code}/specialties`);
            if (res.ok) {
                const data = await res.json();
                setPtSpecialties(prev => ({ ...prev, [code]: data }));
                setExpandedPT(code);
            }
        } catch (err) {
            console.error("Failed to load practice type specialties:", err);
        }
    };

    const filteredSpecialties = specialties.filter(s =>
        s.name.toLowerCase().includes(specialtyFilter.toLowerCase()) ||
        s.code.toLowerCase().includes(specialtyFilter.toLowerCase())
    );

    const filteredPracticeTypes = practiceTypes.filter(p =>
        p.name.toLowerCase().includes(practiceTypeFilter.toLowerCase()) ||
        p.code.toLowerCase().includes(practiceTypeFilter.toLowerCase()) ||
        p.category.toLowerCase().includes(practiceTypeFilter.toLowerCase())
    );

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
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
                        { key: "custom-tabs" as const, label: "Custom Form Tabs", icon: FileText },
                        { key: "manage-specialties" as const, label: "Manage Specialties", icon: Stethoscope },
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

                {/* Section C: Custom Form Tabs */}
                {activeSection === "custom-tabs" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Custom Form Tabs</h3>
                            <button
                                onClick={() => setShowCustomTabForm(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" /> Add Custom Tab
                            </button>
                        </div>

                        <p className="text-sm text-gray-500">
                            Create custom form-based tabs that appear in the patient chart. Each tab has a form builder to define the fields.
                        </p>

                        {/* Existing Custom Tabs */}
                        {customTabs.length > 0 ? (
                            <div className="space-y-2">
                                {customTabs.map((tab) => (
                                    <div key={tab.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">{tab.label}</span>
                                                <span className="text-xs font-mono text-gray-400">{tab.tabKey}</span>
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                    {tab.category}
                                                </span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                    tab.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                }`}>
                                                    {tab.active ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {tab.formSchema?.sections?.reduce((acc: number, s: any) => acc + (s.fields?.length || 0), 0) || 0} fields
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setEditingCustomTab(tab)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCustomTab(tab.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No custom tabs yet</p>
                                <p className="text-xs text-gray-400 mt-1">Click &quot;Add Custom Tab&quot; to create one</p>
                            </div>
                        )}

                        {/* Create / Edit Custom Tab Form */}
                        {(showCustomTabForm || editingCustomTab) && (
                            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-md font-semibold text-gray-900">
                                        {editingCustomTab ? "Edit Custom Tab" : "New Custom Tab"}
                                    </h4>
                                    <button
                                        onClick={() => {
                                            setShowCustomTabForm(false);
                                            setEditingCustomTab(null);
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tab Key</label>
                                        <input
                                            type="text"
                                            value={editingCustomTab?.tabKey || newTab.tabKey}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\s/g, "-").toLowerCase();
                                                if (editingCustomTab) setEditingCustomTab({ ...editingCustomTab, tabKey: val });
                                                else setNewTab({ ...newTab, tabKey: val });
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                            placeholder="e.g., wound-care"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Label</label>
                                        <input
                                            type="text"
                                            value={editingCustomTab?.label || newTab.label}
                                            onChange={(e) => {
                                                if (editingCustomTab) setEditingCustomTab({ ...editingCustomTab, label: e.target.value });
                                                else setNewTab({ ...newTab, label: e.target.value });
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                            placeholder="e.g., Wound Care"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                        <IconPicker
                                            value={editingCustomTab?.icon || newTab.icon}
                                            onChange={(icon) => {
                                                if (editingCustomTab) setEditingCustomTab({ ...editingCustomTab, icon });
                                                else setNewTab({ ...newTab, icon });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            value={editingCustomTab?.category || newTab.category}
                                            onChange={(e) => {
                                                if (editingCustomTab) setEditingCustomTab({ ...editingCustomTab, category: e.target.value });
                                                else setNewTab({ ...newTab, category: e.target.value });
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        >
                                            {CATEGORY_OPTIONS.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Form Builder</h5>
                                    <FormBuilder
                                        schema={editingCustomTab?.formSchema || newTab.formSchema}
                                        onChange={(schema) => {
                                            if (editingCustomTab) setEditingCustomTab({ ...editingCustomTab, formSchema: schema });
                                            else setNewTab({ ...newTab, formSchema: schema });
                                        }}
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={editingCustomTab ? handleUpdateCustomTab : handleCreateCustomTab}
                                        disabled={saving}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {editingCustomTab ? "Update Tab" : "Create Tab"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCustomTabForm(false);
                                            setEditingCustomTab(null);
                                        }}
                                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Section D: Manage Specialties */}
                {activeSection === "manage-specialties" && (
                    <div className="space-y-6">
                        {/* Practice Types */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Practice Types</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Practice types group specialties and define default tab configurations.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPracticeTypeForm(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                                >
                                    <Plus className="w-4 h-4" /> Add Practice Type
                                </button>
                            </div>

                            <input
                                type="text"
                                value={practiceTypeFilter}
                                onChange={(e) => setPracticeTypeFilter(e.target.value)}
                                placeholder="Filter practice types..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-3"
                            />

                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {filteredPracticeTypes.map((pt) => (
                                    <div key={pt.id} className="border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-3 p-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">{pt.name}</span>
                                                    <span className="text-xs font-mono text-gray-400">{pt.code}</span>
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                        {pt.category}
                                                    </span>
                                                </div>
                                                {pt.description && (
                                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{pt.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => loadPtSpecialties(pt.code)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600"
                                                    title="View mapped specialties"
                                                >
                                                    {expandedPT === pt.code ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => setEditingPracticeType(pt)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePracticeType(pt.code)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {expandedPT === pt.code && ptSpecialties[pt.code] && (
                                            <div className="px-3 pb-3 border-t border-gray-100 pt-2">
                                                <span className="text-xs font-medium text-gray-500">Mapped Specialties:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {ptSpecialties[pt.code].length > 0 ? ptSpecialties[pt.code].map(sc => (
                                                        <span key={sc} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                                                            {sc}
                                                        </span>
                                                    )) : (
                                                        <span className="text-xs text-gray-400">No specialties mapped</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Create / Edit Practice Type Form */}
                            {(showPracticeTypeForm || editingPracticeType) && (
                                <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-gray-900">
                                            {editingPracticeType ? "Edit Practice Type" : "New Practice Type"}
                                        </h4>
                                        <button onClick={() => { setShowPracticeTypeForm(false); setEditingPracticeType(null); }}
                                            className="p-1 text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                                            <input
                                                type="text"
                                                value={editingPracticeType?.code || newPracticeType.code}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\s/g, "-").toLowerCase();
                                                    if (editingPracticeType) setEditingPracticeType({ ...editingPracticeType, code: val });
                                                    else setNewPracticeType({ ...newPracticeType, code: val });
                                                }}
                                                disabled={!!editingPracticeType}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                                                placeholder="e.g., radiology"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={editingPracticeType?.name || newPracticeType.name}
                                                onChange={(e) => {
                                                    if (editingPracticeType) setEditingPracticeType({ ...editingPracticeType, name: e.target.value });
                                                    else setNewPracticeType({ ...newPracticeType, name: e.target.value });
                                                }}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                                                placeholder="e.g., Radiology"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                                            <select
                                                value={editingPracticeType?.category || newPracticeType.category}
                                                onChange={(e) => {
                                                    if (editingPracticeType) setEditingPracticeType({ ...editingPracticeType, category: e.target.value });
                                                    else setNewPracticeType({ ...newPracticeType, category: e.target.value });
                                                }}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                                            >
                                                {PRACTICE_CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                                            <IconPicker
                                                value={editingPracticeType?.icon || newPracticeType.icon}
                                                onChange={(icon) => {
                                                    if (editingPracticeType) setEditingPracticeType({ ...editingPracticeType, icon });
                                                    else setNewPracticeType({ ...newPracticeType, icon });
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={editingPracticeType?.description || newPracticeType.description}
                                                onChange={(e) => {
                                                    if (editingPracticeType) setEditingPracticeType({ ...editingPracticeType, description: e.target.value });
                                                    else setNewPracticeType({ ...newPracticeType, description: e.target.value });
                                                }}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                                                placeholder="Brief description"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={editingPracticeType ? handleUpdatePracticeType : handleCreatePracticeType}
                                            disabled={saving}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            {editingPracticeType ? "Update" : "Create"}
                                        </button>
                                        <button
                                            onClick={() => { setShowPracticeTypeForm(false); setEditingPracticeType(null); }}
                                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Specialties */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Specialties</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Medical specialties that map to practice types. {specialties.length} total.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowSpecialtyForm(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                                >
                                    <Plus className="w-4 h-4" /> Add Specialty
                                </button>
                            </div>

                            <input
                                type="text"
                                value={specialtyFilter}
                                onChange={(e) => setSpecialtyFilter(e.target.value)}
                                placeholder="Filter specialties..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-3"
                            />

                            <div className="space-y-1 max-h-[400px] overflow-y-auto">
                                {filteredSpecialties.map((spec) => (
                                    <div key={spec.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-900">{spec.name}</span>
                                                <span className="text-xs font-mono text-gray-400">{spec.code}</span>
                                                {spec.parentCode && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                        parent: {spec.parentCode}
                                                    </span>
                                                )}
                                            </div>
                                            {spec.description && (
                                                <p className="text-xs text-gray-400 truncate">{spec.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingSpecialty(spec)}
                                                className="p-1 text-gray-400 hover:text-blue-600"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSpecialty(spec.code)}
                                                className="p-1 text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredSpecialties.length === 0 && (
                                    <p className="text-sm text-gray-400 py-4 text-center">No specialties match your filter</p>
                                )}
                            </div>

                            {/* Create / Edit Specialty Form */}
                            {(showSpecialtyForm || editingSpecialty) && (
                                <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-gray-900">
                                            {editingSpecialty ? "Edit Specialty" : "New Specialty"}
                                        </h4>
                                        <button onClick={() => { setShowSpecialtyForm(false); setEditingSpecialty(null); }}
                                            className="p-1 text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                                            <input
                                                type="text"
                                                value={editingSpecialty?.code || newSpecialty.code}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\s/g, "-").toLowerCase();
                                                    if (editingSpecialty) setEditingSpecialty({ ...editingSpecialty, code: val });
                                                    else setNewSpecialty({ ...newSpecialty, code: val });
                                                }}
                                                disabled={!!editingSpecialty}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                                                placeholder="e.g., interventional-radiology"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={editingSpecialty?.name || newSpecialty.name}
                                                onChange={(e) => {
                                                    if (editingSpecialty) setEditingSpecialty({ ...editingSpecialty, name: e.target.value });
                                                    else setNewSpecialty({ ...newSpecialty, name: e.target.value });
                                                }}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                                                placeholder="e.g., Interventional Radiology"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Parent Specialty (optional)</label>
                                            <select
                                                value={editingSpecialty?.parentCode || newSpecialty.parentCode}
                                                onChange={(e) => {
                                                    if (editingSpecialty) setEditingSpecialty({ ...editingSpecialty, parentCode: e.target.value || null });
                                                    else setNewSpecialty({ ...newSpecialty, parentCode: e.target.value });
                                                }}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                                            >
                                                <option value="">None (top-level)</option>
                                                {specialties.map(s => (
                                                    <option key={s.code} value={s.code}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                                            <IconPicker
                                                value={editingSpecialty?.icon || newSpecialty.icon}
                                                onChange={(icon) => {
                                                    if (editingSpecialty) setEditingSpecialty({ ...editingSpecialty, icon });
                                                    else setNewSpecialty({ ...newSpecialty, icon });
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={editingSpecialty?.description || newSpecialty.description}
                                                onChange={(e) => {
                                                    if (editingSpecialty) setEditingSpecialty({ ...editingSpecialty, description: e.target.value });
                                                    else setNewSpecialty({ ...newSpecialty, description: e.target.value });
                                                }}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                                                placeholder="Brief description"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={editingSpecialty ? handleUpdateSpecialty : handleCreateSpecialty}
                                            disabled={saving}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            {editingSpecialty ? "Update" : "Create"}
                                        </button>
                                        <button
                                            onClick={() => { setShowSpecialtyForm(false); setEditingSpecialty(null); }}
                                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
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
        </AdminLayout>
    );
}
