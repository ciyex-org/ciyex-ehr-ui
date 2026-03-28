"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import FieldConfigEditor from "@/components/settings/FieldConfigEditor";
import type { FieldConfig } from "@/components/patients/DynamicFormRenderer";
import {
    Globe, Loader2, Save, Settings, Shield, Layout, FileText, Navigation,
    Plus, Trash2, GripVertical, Eye, EyeOff, ChevronDown, ChevronRight,
    ToggleLeft, ToggleRight, X, Pencil, Copy,
} from "lucide-react";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

// ─── Types ───

interface PortalFeature {
    enabled: boolean;
    [key: string]: any;
}

interface PortalNavItem {
    key: string;
    label: string;
    icon: string;
    visible: boolean;
    position: number;
}

interface PortalFormDef {
    id?: number;
    formKey: string;
    formType: string;
    title: string;
    description: string;
    fieldConfig: any;
    settings: Record<string, any>;
    active: boolean;
    position: number;
}

type Tab = "general" | "features" | "forms" | "navigation";

// ─── Component ───

export default function PortalSettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("general");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Config state
    const [generalConfig, setGeneralConfig] = useState<Record<string, any>>({});
    const [features, setFeatures] = useState<Record<string, PortalFeature>>({});
    const [navigation, setNavigation] = useState<PortalNavItem[]>([]);
    const [forms, setForms] = useState<PortalFormDef[]>([]);

    // Form builder state
    const [editingForm, setEditingForm] = useState<PortalFormDef | null>(null);
    const [formEditorFieldConfig, setFormEditorFieldConfig] = useState<FieldConfig | null>(null);

    const notify = useCallback((type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // ─── Load ───

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [configRes, formsRes] = await Promise.all([
                fetchWithAuth(`${API()}/api/portal/config`),
                fetchWithAuth(`${API()}/api/portal/config/forms`),
            ]);

            if (configRes.ok) {
                const json = await configRes.json();
                const data = json.data || json;
                setGeneralConfig(data.general || {});
                setFeatures(data.features || {});
                setNavigation(Array.isArray(data.navigation) ? data.navigation : []);
            }

            if (formsRes.ok) {
                const json = await formsRes.json();
                const data = json.data || json;
                setForms(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to load portal config:", err);
            notify("error", "Failed to load portal configuration");
        }
        setLoading(false);
    };

    // ─── Save Helpers ───

    const saveSection = async (section: string, data: any) => {
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${API()}/api/portal/config/${section}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            });
            if (res.ok) {
                notify("success", `${section.charAt(0).toUpperCase() + section.slice(1)} saved`);
            } else {
                notify("error", "Save failed");
            }
        } catch {
            notify("error", "Save failed");
        }
        setSaving(false);
    };

    const saveForm = async (form: PortalFormDef) => {
        setSaving(true);
        try {
            const method = form.id ? "PUT" : "POST";
            const url = form.id
                ? `${API()}/api/portal/config/forms/${form.id}`
                : `${API()}/api/portal/config/forms`;
            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(form),
            });
            if (res.ok) {
                notify("success", "Form saved");
                await loadAll();
                setEditingForm(null);
            } else {
                notify("error", "Save failed");
            }
        } catch {
            notify("error", "Save failed");
        }
        setSaving(false);
    };

    const deleteForm = async (id: number) => {
        setSaving(true);
        try {
            await fetchWithAuth(`${API()}/api/portal/config/forms/${id}`, { method: "DELETE" });
            notify("success", "Form deleted");
            await loadAll();
        } catch {
            notify("error", "Delete failed");
        }
        setSaving(false);
    };

    const toggleFormActive = async (id: number, active: boolean) => {
        try {
            await fetchWithAuth(`${API()}/api/portal/config/forms/${id}/toggle?active=${active}`, { method: "PATCH" });
            await loadAll();
        } catch {
            notify("error", "Toggle failed");
        }
    };

    // ─── Tabs Config ───

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: "general", label: "General", icon: Settings },
        { key: "features", label: "Features", icon: Shield },
        { key: "forms", label: "Forms", icon: FileText },
        { key: "navigation", label: "Navigation", icon: Navigation },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-6 h-6" /> Portal Configuration
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Configure the patient portal — features, forms, navigation, and branding
                </p>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === key
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {/* ─── General Tab ─── */}
            {activeTab === "general" && (
                <GeneralSettings
                    config={generalConfig}
                    onChange={setGeneralConfig}
                    onSave={() => saveSection("general", generalConfig)}
                    saving={saving}
                />
            )}

            {/* ─── Features Tab ─── */}
            {activeTab === "features" && (
                <FeaturesSettings
                    features={features}
                    onChange={setFeatures}
                    onSave={() => saveSection("features", features)}
                    saving={saving}
                />
            )}

            {/* ─── Forms Tab ─── */}
            {activeTab === "forms" && (
                <FormsSettings
                    forms={forms}
                    editingForm={editingForm}
                    setEditingForm={setEditingForm}
                    onSave={saveForm}
                    onDelete={deleteForm}
                    onToggle={toggleFormActive}
                    saving={saving}
                    formEditorFieldConfig={formEditorFieldConfig}
                    setFormEditorFieldConfig={setFormEditorFieldConfig}
                />
            )}

            {/* ─── Navigation Tab ─── */}
            {activeTab === "navigation" && (
                <NavigationSettings
                    items={navigation}
                    onChange={setNavigation}
                    onSave={() => saveSection("navigation", navigation)}
                    saving={saving}
                />
            )}

            {/* Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-white ${
                    notification.type === "success" ? "bg-green-500" : "bg-red-500"
                }`}>
                    {notification.message}
                    <button onClick={() => setNotification(null)} className="ml-2 text-white/80 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// General Settings Sub-Component
// ──────────────────────────────────────────────

function GeneralSettings({
    config, onChange, onSave, saving,
}: {
    config: Record<string, any>;
    onChange: (c: Record<string, any>) => void;
    onSave: () => void;
    saving: boolean;
}) {
    const update = (key: string, value: any) => onChange({ ...config, [key]: value });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Portal Name">
                    <input
                        type="text"
                        value={config.portalName || ""}
                        onChange={(e) => update("portalName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Patient Portal"
                    />
                </Field>

                <Field label="Registration Mode">
                    <select
                        value={config.registrationMode || "open"}
                        onChange={(e) => update("registrationMode", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="open">Open (Auto-Approve)</option>
                        <option value="approval-required">Requires Staff Approval</option>
                        <option value="invite-only">Invite Only</option>
                    </select>
                </Field>

                <Field label="Welcome Message" className="md:col-span-2">
                    <textarea
                        value={config.welcomeMessage || ""}
                        onChange={(e) => update("welcomeMessage", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Welcome to your patient portal"
                    />
                </Field>

                <Field label="Session Timeout (minutes)">
                    <input
                        type="number"
                        value={config.sessionTimeout || 30}
                        onChange={(e) => update("sessionTimeout", parseInt(e.target.value) || 30)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        min={5}
                        max={480}
                    />
                </Field>

                <Field label="Primary Color">
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={config.primaryColor || "#2563eb"}
                            onChange={(e) => update("primaryColor", e.target.value)}
                            className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                            type="text"
                            value={config.primaryColor || "#2563eb"}
                            onChange={(e) => update("primaryColor", e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                </Field>
            </div>

            {/* Toggle Settings */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Access Controls</h4>
                <ToggleRow
                    label="Allow Self-Registration"
                    description="Patients can create their own portal accounts"
                    checked={config.allowSelfRegistration !== false}
                    onChange={(v) => update("allowSelfRegistration", v)}
                />
                <ToggleRow
                    label="Require Email Verification"
                    description="New accounts must verify their email address"
                    checked={config.requireEmailVerification === true}
                    onChange={(v) => update("requireEmailVerification", v)}
                />
                <ToggleRow
                    label="Maintenance Mode"
                    description="Temporarily disable portal access (shows maintenance message)"
                    checked={config.maintenanceMode === true}
                    onChange={(v) => update("maintenanceMode", v)}
                />
            </div>

            {config.maintenanceMode && (
                <Field label="Maintenance Message">
                    <textarea
                        value={config.maintenanceMessage || ""}
                        onChange={(e) => update("maintenanceMessage", e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="The patient portal is currently under maintenance. Please try again later."
                    />
                </Field>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Features Settings Sub-Component
// ──────────────────────────────────────────────

const FEATURE_META: Record<string, { label: string; description: string; subToggles?: { key: string; label: string }[] }> = {
    appointments: {
        label: "Appointments",
        description: "View upcoming and past appointments",
        subToggles: [
            { key: "allowScheduling", label: "Allow patients to schedule appointments" },
            { key: "allowCancellation", label: "Allow patients to cancel appointments" },
        ],
    },
    messaging: {
        label: "Secure Messaging",
        description: "Send/receive secure messages with care team",
        subToggles: [
            { key: "allowNewConversations", label: "Allow patients to start new conversations" },
        ],
    },
    labs: {
        label: "Lab Results",
        description: "View lab results and diagnostic reports",
        subToggles: [
            { key: "showResults", label: "Show lab results to patients" },
        ],
    },
    medications: {
        label: "Medications",
        description: "View current and past medications",
        subToggles: [
            { key: "allowRefillRequests", label: "Allow medication refill requests" },
        ],
    },
    vitals: {
        label: "Vitals",
        description: "View and track vital signs",
        subToggles: [
            { key: "allowEntry", label: "Allow patients to enter vitals" },
        ],
    },
    documents: {
        label: "Documents",
        description: "Access health documents and records",
        subToggles: [
            { key: "allowUpload", label: "Allow patients to upload documents" },
        ],
    },
    billing: {
        label: "Billing",
        description: "View billing statements and payment history",
        subToggles: [
            { key: "allowPayments", label: "Allow online payments" },
        ],
    },
    insurance: {
        label: "Insurance",
        description: "View and manage insurance information",
        subToggles: [
            { key: "allowEditing", label: "Allow patients to edit insurance info" },
        ],
    },
    demographics: {
        label: "Demographics",
        description: "View and update personal information",
        subToggles: [
            { key: "allowEditing", label: "Allow patients to edit demographics" },
        ],
    },
    education: { label: "Patient Education", description: "Access educational materials and resources" },
    allergies: { label: "Allergies & History", description: "View allergy and medical history" },
    reports: { label: "Reports", description: "Access health reports and summaries" },
    telehealth: { label: "Telehealth", description: "Join virtual visits and video appointments" },
};

function FeaturesSettings({
    features, onChange, onSave, saving,
}: {
    features: Record<string, PortalFeature>;
    onChange: (f: Record<string, PortalFeature>) => void;
    onSave: () => void;
    saving: boolean;
}) {
    const updateFeature = (featureKey: string, field: string, value: any) => {
        onChange({
            ...features,
            [featureKey]: { ...(features[featureKey] || { enabled: true }), [field]: value },
        });
    };

    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggleExpand = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Feature Toggles</h3>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                </button>
            </div>

            <p className="text-sm text-gray-500">
                Enable or disable features in the patient portal. Sub-options control what patients can do within each feature.
            </p>

            <div className="space-y-2">
                {Object.entries(FEATURE_META).map(([key, meta]) => {
                    const feat = features[key] || { enabled: true };
                    const hasSubToggles = meta.subToggles && meta.subToggles.length > 0;
                    const isExpanded = expanded.has(key);

                    return (
                        <div key={key} className="border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {hasSubToggles ? (
                                        <button onClick={() => toggleExpand(key)} className="text-gray-400 hover:text-gray-600">
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    ) : (
                                        <div className="w-4" />
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{meta.label}</div>
                                        <div className="text-xs text-gray-500">{meta.description}</div>
                                    </div>
                                </div>
                                <Toggle
                                    checked={feat.enabled !== false}
                                    onChange={(v) => updateFeature(key, "enabled", v)}
                                />
                            </div>

                            {isExpanded && hasSubToggles && feat.enabled !== false && (
                                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                                    {meta.subToggles!.map((sub) => (
                                        <div key={sub.key} className="flex items-center justify-between pl-7">
                                            <span className="text-sm text-gray-700">{sub.label}</span>
                                            <Toggle
                                                checked={feat[sub.key] !== false}
                                                onChange={(v) => updateFeature(key, sub.key, v)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Forms Settings Sub-Component
// ──────────────────────────────────────────────

function FormsSettings({
    forms, editingForm, setEditingForm, onSave, onDelete, onToggle, saving,
    formEditorFieldConfig, setFormEditorFieldConfig,
}: {
    forms: PortalFormDef[];
    editingForm: PortalFormDef | null;
    setEditingForm: (f: PortalFormDef | null) => void;
    onSave: (f: PortalFormDef) => void;
    onDelete: (id: number) => void;
    onToggle: (id: number, active: boolean) => void;
    saving: boolean;
    formEditorFieldConfig: FieldConfig | null;
    setFormEditorFieldConfig: (fc: FieldConfig | null) => void;
}) {
    const startEditing = (form: PortalFormDef) => {
        setEditingForm({ ...form });
        const fc = typeof form.fieldConfig === "string"
            ? JSON.parse(form.fieldConfig)
            : form.fieldConfig;
        setFormEditorFieldConfig(fc?.sections ? fc : { sections: [] });
    };

    const startNew = (formType: string) => {
        const form: PortalFormDef = {
            formKey: "",
            formType,
            title: "",
            description: "",
            fieldConfig: { sections: [] },
            settings: { required: false, showOnRegistration: false, requireSignature: false },
            active: true,
            position: forms.length,
        };
        setEditingForm(form);
        setFormEditorFieldConfig({ sections: [] });
    };

    if (editingForm) {
        return (
            <FormEditor
                form={editingForm}
                fieldConfig={formEditorFieldConfig}
                setFieldConfig={setFormEditorFieldConfig}
                onChange={setEditingForm}
                onSave={() => {
                    const toSave = { ...editingForm, fieldConfig: formEditorFieldConfig || { sections: [] } };
                    onSave(toSave);
                }}
                onCancel={() => { setEditingForm(null); setFormEditorFieldConfig(null); }}
                saving={saving}
            />
        );
    }

    const onboardingForms = forms.filter((f) => f.formType === "onboarding");
    const consentForms = forms.filter((f) => f.formType === "consent");
    const otherForms = forms.filter((f) => f.formType !== "onboarding" && f.formType !== "consent");

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Onboarding & Consent Forms</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Configure forms that patients complete during registration or as part of their care.
                    Use the form builder to design fields with FHIR field mapping.
                </p>
            </div>

            {/* Onboarding Forms */}
            <FormGroup
                title="Onboarding Forms"
                description="Completed after patient registration"
                forms={onboardingForms}
                onEdit={startEditing}
                onDelete={onDelete}
                onToggle={onToggle}
                onAdd={() => startNew("onboarding")}
            />

            {/* Consent Forms */}
            <FormGroup
                title="Consent Forms"
                description="HIPAA, telehealth, treatment authorization"
                forms={consentForms}
                onEdit={startEditing}
                onDelete={onDelete}
                onToggle={onToggle}
                onAdd={() => startNew("consent")}
            />

            {/* Custom Forms */}
            {otherForms.length > 0 && (
                <FormGroup
                    title="Custom Forms"
                    description="Additional configurable forms"
                    forms={otherForms}
                    onEdit={startEditing}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onAdd={() => startNew("custom")}
                />
            )}

            {otherForms.length === 0 && (
                <div className="text-center py-4">
                    <button
                        onClick={() => startNew("custom")}
                        className="text-sm text-blue-600 hover:text-blue-700"
                    >
                        + Add Custom Form
                    </button>
                </div>
            )}
        </div>
    );
}

function FormGroup({
    title, description, forms, onEdit, onDelete, onToggle, onAdd,
}: {
    title: string;
    description: string;
    forms: PortalFormDef[];
    onEdit: (f: PortalFormDef) => void;
    onDelete: (id: number) => void;
    onToggle: (id: number, active: boolean) => void;
    onAdd: () => void;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
                <button
                    onClick={onAdd}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>

            {forms.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
                    No forms configured
                </div>
            ) : (
                <div className="space-y-2">
                    {forms.map((form) => (
                        <div
                            key={form.id || form.formKey}
                            className={`flex items-center justify-between px-4 py-3 border rounded-lg ${
                                form.active ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <GripVertical className="w-4 h-4 text-gray-300" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{form.title}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="font-mono">{form.formKey}</span>
                                        {form.settings?.required && (
                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Required</span>
                                        )}
                                        {form.settings?.requireSignature && (
                                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">Signature</span>
                                        )}
                                        {form.settings?.showOnRegistration && (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">On Registration</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onEdit(form)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                    title="Edit form"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => form.id && onToggle(form.id, !form.active)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                                    title={form.active ? "Disable" : "Enable"}
                                >
                                    {form.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                {form.id && (
                                    <button
                                        onClick={() => form.id && onDelete(form.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                        title="Delete form"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Form Editor (Full-Screen) with FieldConfigEditor
// ──────────────────────────────────────────────

function FormEditor({
    form, fieldConfig, setFieldConfig, onChange, onSave, onCancel, saving,
}: {
    form: PortalFormDef;
    fieldConfig: FieldConfig | null;
    setFieldConfig: (fc: FieldConfig | null) => void;
    onChange: (f: PortalFormDef) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [activeEditorTab, setActiveEditorTab] = useState<"properties" | "fields">("properties");
    const update = (key: string, value: any) => onChange({ ...form, [key]: value });
    const updateSetting = (key: string, value: any) =>
        onChange({ ...form, settings: { ...form.settings, [key]: value } });

    // Dummy props for FieldConfigEditor compatibility
    const [preview, setPreview] = useState(false);
    const [previewData, setPreviewData] = useState<Record<string, any>>({});
    const [fhirRes, setFhirRes] = useState<string[]>([]);
    const dummySaving = false;
    const [, setDummySaving] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {form.id ? "Edit Form" : "New Form"}
                    </h3>
                </div>
                <button
                    onClick={onSave}
                    disabled={saving || !form.formKey || !form.title}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Form
                </button>
            </div>

            {/* Sub-tabs: Properties | Fields */}
            <div className="flex items-center gap-1 border-b border-gray-200">
                {[
                    { key: "properties" as const, label: "Properties" },
                    { key: "fields" as const, label: "Form Fields" },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveEditorTab(key)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeEditorTab === key
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {activeEditorTab === "properties" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Form Key (unique identifier)">
                        <input
                            type="text"
                            value={form.formKey}
                            onChange={(e) => update("formKey", e.target.value.replace(/[^a-z0-9-]/g, ""))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                            placeholder="e.g., patient-onboarding"
                            disabled={!!form.id}
                        />
                    </Field>

                    <Field label="Form Type">
                        <select
                            value={form.formType}
                            onChange={(e) => update("formType", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="onboarding">Onboarding</option>
                            <option value="consent">Consent</option>
                            <option value="intake">Intake</option>
                            <option value="custom">Custom</option>
                        </select>
                    </Field>

                    <Field label="Title">
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => update("title", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="Patient Onboarding Form"
                        />
                    </Field>

                    <Field label="Position">
                        <input
                            type="number"
                            value={form.position}
                            onChange={(e) => update("position", parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            min={0}
                        />
                    </Field>

                    <Field label="Description" className="md:col-span-2">
                        <textarea
                            value={form.description}
                            onChange={(e) => update("description", e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="Instructions shown to the patient"
                        />
                    </Field>

                    <div className="md:col-span-2 border-t border-gray-200 pt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700">Form Settings</h4>
                        <ToggleRow
                            label="Required"
                            description="Patient must complete this form"
                            checked={form.settings?.required === true}
                            onChange={(v) => updateSetting("required", v)}
                        />
                        <ToggleRow
                            label="Show on Registration"
                            description="Present immediately after patient registers"
                            checked={form.settings?.showOnRegistration === true}
                            onChange={(v) => updateSetting("showOnRegistration", v)}
                        />
                        <ToggleRow
                            label="Require Signature"
                            description="Patient must provide electronic signature"
                            checked={form.settings?.requireSignature === true}
                            onChange={(v) => updateSetting("requireSignature", v)}
                        />
                    </div>
                </div>
            )}

            {activeEditorTab === "fields" && fieldConfig && (
                <div className="-mx-6">
                    <FieldConfigEditor
                        availableTabs={[]}
                        selectedTab={form.formKey || "__portal_form__"}
                        setSelectedTab={() => {}}
                        fieldConfig={fieldConfig}
                        setFieldConfig={setFieldConfig}
                        fhirResources={fhirRes}
                        setFhirResources={setFhirRes}
                        fieldConfigPreview={preview}
                        setFieldConfigPreview={setPreview}
                        previewFormData={previewData}
                        setPreviewFormData={setPreviewData}
                        saving={dummySaving}
                        setSaving={setDummySaving}
                        showNotif={() => {}}
                        hideTabSelector
                        hideSaveButton
                    />
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Navigation Settings Sub-Component
// ──────────────────────────────────────────────

function NavigationSettings({
    items, onChange, onSave, saving,
}: {
    items: PortalNavItem[];
    onChange: (items: PortalNavItem[]) => void;
    onSave: () => void;
    saving: boolean;
}) {
    const toggleVisibility = (index: number) => {
        const updated = [...items];
        updated[index] = { ...updated[index], visible: !updated[index].visible };
        onChange(updated);
    };

    const moveItem = (index: number, direction: "up" | "down") => {
        if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return;
        const updated = [...items];
        const swapIdx = direction === "up" ? index - 1 : index + 1;
        [updated[index], updated[swapIdx]] = [updated[swapIdx], updated[index]];
        updated.forEach((item, i) => (item.position = i));
        onChange(updated);
    };

    const updateLabel = (index: number, label: string) => {
        const updated = [...items];
        updated[index] = { ...updated[index], label };
        onChange(updated);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Portal Navigation</h3>
                    <p className="text-sm text-gray-500">Configure the patient portal sidebar menu items</p>
                </div>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                </button>
            </div>

            <div className="space-y-1">
                {items.map((item, idx) => (
                    <div
                        key={item.key}
                        className={`flex items-center gap-3 px-4 py-2.5 border rounded-lg ${
                            item.visible ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-50"
                        }`}
                    >
                        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                        <div className="flex-1 flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-400 w-24 shrink-0">{item.key}</span>
                            <input
                                type="text"
                                value={item.label}
                                onChange={(e) => updateLabel(idx, e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => moveItem(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                                <ChevronDown className="w-4 h-4 rotate-180" />
                            </button>
                            <button
                                onClick={() => moveItem(idx, "down")}
                                disabled={idx === items.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => toggleVisibility(idx)}
                                className={`p-1 rounded ${item.visible ? "text-gray-400 hover:text-gray-600" : "text-red-400 hover:text-red-600"}`}
                            >
                                {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">
                    No navigation items configured. Save to initialize with defaults.
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Shared UI Primitives
// ──────────────────────────────────────────────

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            {children}
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    );
}

function ToggleRow({
    label, description, checked, onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <div className="text-sm font-medium text-gray-900">{label}</div>
                <div className="text-xs text-gray-500">{description}</div>
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}
