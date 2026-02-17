"use client";

import React, { useState, useCallback, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import AdminLayout from "@/app/(admin)/layout";
import {
    Building2, MapPin, Stethoscope, Settings, Globe,
    Loader2, Save, Check, X, Plus, Search,
} from "lucide-react";
import IconPicker from "@/components/settings/IconPicker";

const API_BASE = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/* ------------ Types ------------ */

interface ContactAddress {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface ContactInfo {
    email: string;
    phoneNumber: string;
    faxNumber: string;
    address: ContactAddress;
}

interface PracticeData {
    name: string;
    description: string;
    npi: string;
    taxId: string;
    enablePatientPractice: boolean;
    contact: ContactInfo;
    regional: {
        unitsForVisitForms: string;
        displayFormatUSWeights: string;
        telephoneCountryCode: string;
        dateDisplayFormat: string;
        timeDisplayFormat: string;
        timeZone: string;
        currencyDesignator: string;
    };
}

interface PracticeType {
    id: string;
    code: string;
    name: string;
    category: string;
    description: string;
    icon: string;
    active: boolean;
}

interface TabCategory {
    label: string;
    position: number;
    tabs: { key: string; label: string; icon: string; visible: boolean; position: number }[];
}

type SectionKey = "business" | "contact" | "practice-type" | "settings" | "regional";

const PRACTICE_CATEGORIES = [
    "MEDICAL", "SURGICAL", "BEHAVIORAL", "DENTAL", "VISION",
    "ALLIED_HEALTH", "HOME_HEALTH", "INPATIENT", "DIAGNOSTIC",
    "PHARMACY", "WELLNESS",
];

const EMPTY_PRACTICE: PracticeData = {
    name: "",
    description: "",
    npi: "",
    taxId: "",
    enablePatientPractice: false,
    contact: {
        email: "",
        phoneNumber: "",
        faxNumber: "",
        address: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "" },
    },
    regional: {
        unitsForVisitForms: "US",
        displayFormatUSWeights: "Show pounds as decimal value",
        telephoneCountryCode: "",
        dateDisplayFormat: "YYYY-MM-DD",
        timeDisplayFormat: "24 hr",
        timeZone: "",
        currencyDesignator: "",
    },
};

/* ------------ Main Page ------------ */
export default function PracticeSettingsPage() {
    const [activeSection, setActiveSection] = useState<SectionKey>("business");
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [practiceId, setPracticeId] = useState<string | null>(null);
    const [fhirId, setFhirId] = useState<string | null>(null);
    const [data, setData] = useState<PracticeData>({ ...EMPTY_PRACTICE });
    const [original, setOriginal] = useState<PracticeData>({ ...EMPTY_PRACTICE });
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Practice type state
    const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
    const [selectedPracticeType, setSelectedPracticeType] = useState("");
    const [tabCategories, setTabCategories] = useState<TabCategory[]>([]);
    const [configSource, setConfigSource] = useState("UNIVERSAL_DEFAULT");
    const [ptSearch, setPtSearch] = useState("");
    const [ptCategoryFilter, setPtCategoryFilter] = useState("");
    const [showNewPtForm, setShowNewPtForm] = useState(false);
    const [newPt, setNewPt] = useState({ code: "", name: "", description: "", icon: "Stethoscope", category: "MEDICAL" });

    const showNotif = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // Load practice data
    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem("token") || localStorage.getItem("authToken");
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                };
                const fetchPracticeId = "1063";
                const res = await fetch(`${API_BASE}/api/practices/${fetchPracticeId}`, { method: "GET", headers });

                if (res.ok) {
                    const response = await res.json();
                    if (response.success && response.data) {
                        const d = response.data;
                        setPracticeId(d.id);
                        setFhirId(d.fhirId);
                        const loaded: PracticeData = {
                            name: d.name || "",
                            description: d.description || "",
                            npi: d.npi || "",
                            taxId: d.taxId || "",
                            enablePatientPractice: d.practiceSettings?.enablePatientPractice || false,
                            contact: {
                                email: d.contact?.email || "",
                                phoneNumber: d.contact?.phoneNumber || "",
                                faxNumber: d.contact?.faxNumber || "",
                                address: {
                                    line1: d.contact?.address?.line1 || "",
                                    line2: d.contact?.address?.line2 || "",
                                    city: d.contact?.address?.city || "",
                                    state: d.contact?.address?.state || "",
                                    postalCode: d.contact?.address?.postalCode || "",
                                    country: d.contact?.address?.country || "",
                                },
                            },
                            regional: {
                                unitsForVisitForms: d.regionalSettings?.unitsForVisitForms || "US",
                                displayFormatUSWeights: d.regionalSettings?.displayFormatUSWeights || "Show pounds as decimal value",
                                telephoneCountryCode: d.regionalSettings?.telephoneCountryCode || "",
                                dateDisplayFormat: d.regionalSettings?.dateDisplayFormat || "YYYY-MM-DD",
                                timeDisplayFormat: d.regionalSettings?.timeDisplayFormat || "24 hr",
                                timeZone: d.regionalSettings?.timeZone || "",
                                currencyDesignator: d.regionalSettings?.currencyDesignator || "",
                            },
                        };
                        setData(loaded);
                        setOriginal(JSON.parse(JSON.stringify(loaded)));
                    }
                }
            } catch (error) {
                console.error("Error fetching practice settings:", error);
                showNotif("error", "Failed to load practice settings");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Load practice types
    useEffect(() => {
        const loadPracticeTypes = async () => {
            try {
                const [ptRes, effectiveRes] = await Promise.allSettled([
                    fetchWithAuth(`${API_BASE}/api/tab-config/practice-types`),
                    fetchWithAuth(`${API_BASE}/api/tab-config/effective`),
                ]);
                if (ptRes.status === "fulfilled" && ptRes.value.ok) {
                    setPracticeTypes(await ptRes.value.json());
                }
                if (effectiveRes.status === "fulfilled" && effectiveRes.value.ok) {
                    const d = await effectiveRes.value.json();
                    setTabCategories(d.tabConfig || []);
                    setConfigSource(d.source || "UNIVERSAL_DEFAULT");
                    setSelectedPracticeType(d.practiceTypeCode || "general-practice");
                }
            } catch {}
        };
        loadPracticeTypes();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("token") || localStorage.getItem("authToken");
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };
            const currentPracticeId = "1063";

            const payload: any = {};

            if (data.name !== original.name) payload.name = data.name;
            if (data.description !== original.description) payload.description = data.description;
            if (data.npi !== original.npi) payload.npi = data.npi;
            if (data.taxId !== original.taxId) payload.taxId = data.taxId;

            if (data.enablePatientPractice !== original.enablePatientPractice) {
                payload.practiceSettings = { enablePatientPractice: data.enablePatientPractice };
            }

            const c = data.contact;
            const oc = original.contact;
            if (
                c.email !== oc.email || c.phoneNumber !== oc.phoneNumber || c.faxNumber !== oc.faxNumber ||
                c.address.line1 !== oc.address.line1 || c.address.line2 !== oc.address.line2 ||
                c.address.city !== oc.address.city || c.address.state !== oc.address.state ||
                c.address.postalCode !== oc.address.postalCode || c.address.country !== oc.address.country
            ) {
                payload.contact = {
                    email: c.email || null,
                    phoneNumber: c.phoneNumber || null,
                    faxNumber: c.faxNumber || null,
                    address: {
                        line1: c.address.line1 || null,
                        line2: c.address.line2 || null,
                        city: c.address.city || null,
                        state: c.address.state || null,
                        postalCode: c.address.postalCode || null,
                        country: c.address.country || null,
                    },
                };
            }

            const r = data.regional;
            const or = original.regional;
            const hasRegionalChanges = Object.keys(r).some((k) => (r as any)[k] !== (or as any)[k]);
            if (hasRegionalChanges) {
                payload.regionalSettings = r;
            }

            if (Object.keys(payload).length === 0) {
                showNotif("error", "No changes to save");
                setSaving(false);
                return;
            }

            const res = await fetch(`${API_BASE}/api/practices/${currentPracticeId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setOriginal(JSON.parse(JSON.stringify(data)));
                showNotif("success", "Settings saved successfully");
            } else {
                showNotif("error", "Failed to save settings");
            }
        } catch {
            showNotif("error", "Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    // Practice type handlers
    const handlePreviewDefaults = async (code: string) => {
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/tab-config/practice-types/${code}/defaults`);
            if (res.ok) {
                const d = await res.json();
                setTabCategories(d.tabConfig);
                setSelectedPracticeType(code);
            }
        } catch {}
    };

    const handleApplyDefaults = async () => {
        if (!selectedPracticeType) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/tab-config/org/clone-from-default`, {
                method: "POST",
                body: JSON.stringify({ practiceTypeCode: selectedPracticeType }),
            });
            if (res.ok) {
                const d = await res.json();
                setTabCategories(d.tabConfig);
                setConfigSource("CLONED_FROM_DEFAULT");
                showNotif("success", "Practice type defaults applied");
            }
        } catch {
            showNotif("error", "Failed to apply defaults");
        } finally {
            setSaving(false);
        }
    };

    const handleCreatePracticeType = async () => {
        if (!newPt.code || !newPt.name) {
            showNotif("error", "Code and name are required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetchWithAuth(`${API_BASE}/api/tab-config/practice-types`, {
                method: "POST",
                body: JSON.stringify(newPt),
            });
            if (res.ok) {
                const created = await res.json();
                setPracticeTypes([...practiceTypes, created]);
                setShowNewPtForm(false);
                setNewPt({ code: "", name: "", description: "", icon: "Stethoscope", category: "MEDICAL" });
                showNotif("success", "Practice type created");
            } else {
                const err = await res.text();
                showNotif("error", err || "Failed to create practice type");
            }
        } catch {
            showNotif("error", "Failed to create practice type");
        } finally {
            setSaving(false);
        }
    };

    const filteredPracticeTypes = practiceTypes.filter((pt) => {
        const matchesSearch = !ptSearch ||
            pt.name.toLowerCase().includes(ptSearch.toLowerCase()) ||
            pt.category.toLowerCase().includes(ptSearch.toLowerCase());
        const matchesCategory = !ptCategoryFilter || pt.category === ptCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    const ptCategoriesInUse = [...new Set(practiceTypes.map(pt => pt.category))].sort();

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    const sections: { key: SectionKey; label: string; icon: React.ElementType }[] = [
        { key: "business", label: "Business Details", icon: Building2 },
        { key: "contact", label: "Contact & Address", icon: MapPin },
        { key: "practice-type", label: "Practice Type", icon: Stethoscope },
        { key: "settings", label: "Practice Settings", icon: Settings },
        { key: "regional", label: "Regional & Locale", icon: Globe },
    ];

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-6 h-6" /> Practice Configuration
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage your practice details, contact information, and preferences
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>

                {/* Section Tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                    {sections.map(({ key, label, icon: Icon }) => (
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

                {/* Business Details */}
                {activeSection === "business" && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Practice Name</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData({ ...data, name: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                    placeholder="Enter practice name"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={data.description}
                                    onChange={(e) => setData({ ...data, description: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                    placeholder="Brief description of your practice"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                                <input
                                    type="text"
                                    value={data.npi}
                                    onChange={(e) => setData({ ...data, npi: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                    placeholder="10-digit NPI"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (EIN)</label>
                                <input
                                    type="text"
                                    value={data.taxId}
                                    onChange={(e) => setData({ ...data, taxId: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                    placeholder="XX-XXXXXXX"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Contact & Address */}
                {activeSection === "contact" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={data.contact.email}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: { ...data.contact, email: e.target.value },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="office@practice.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={data.contact.phoneNumber}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: { ...data.contact, phoneNumber: e.target.value },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                                    <input
                                        type="tel"
                                        value={data.contact.faxNumber}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: { ...data.contact, faxNumber: e.target.value },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="(555) 123-4568"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                            <h3 className="text-lg font-semibold text-gray-900">Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                    <input
                                        type="text"
                                        value={data.contact.address.line1}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: {
                                                ...data.contact,
                                                address: { ...data.contact.address, line1: e.target.value },
                                            },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="Street address"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                    <input
                                        type="text"
                                        value={data.contact.address.line2}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: {
                                                ...data.contact,
                                                address: { ...data.contact.address, line2: e.target.value },
                                            },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="Suite, unit, etc."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        value={data.contact.address.city}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: {
                                                ...data.contact,
                                                address: { ...data.contact.address, city: e.target.value },
                                            },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        type="text"
                                        value={data.contact.address.state}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: {
                                                ...data.contact,
                                                address: { ...data.contact.address, state: e.target.value },
                                            },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="State"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                    <input
                                        type="text"
                                        value={data.contact.address.postalCode}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: {
                                                ...data.contact,
                                                address: { ...data.contact.address, postalCode: e.target.value },
                                            },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="ZIP Code"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <input
                                        type="text"
                                        value={data.contact.address.country}
                                        onChange={(e) => setData({
                                            ...data,
                                            contact: {
                                                ...data.contact,
                                                address: { ...data.contact.address, country: e.target.value },
                                            },
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        placeholder="Country"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Practice Type */}
                {activeSection === "practice-type" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Select Practice Type</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Choose your practice type to load default tab configurations.
                                        You can customize the tabs further in Chart settings.
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
                                    <button
                                        onClick={() => setShowNewPtForm(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Type
                                    </button>
                                </div>
                            </div>

                            {/* Search & Filter */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={ptSearch}
                                        onChange={(e) => setPtSearch(e.target.value)}
                                        placeholder="Search practice types..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md"
                                    />
                                </div>
                                <select
                                    value={ptCategoryFilter}
                                    onChange={(e) => setPtCategoryFilter(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                    <option value="">All Categories</option>
                                    {ptCategoriesInUse.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto">
                                {filteredPracticeTypes.map((pt) => (
                                    <button
                                        key={pt.code}
                                        onClick={() => handlePreviewDefaults(pt.code)}
                                        className={`text-left p-4 rounded-lg border-2 transition-colors ${
                                            selectedPracticeType === pt.code
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300 bg-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-gray-900">{pt.name}</span>
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                {pt.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">{pt.description}</p>
                                    </button>
                                ))}
                                {filteredPracticeTypes.length === 0 && (
                                    <p className="col-span-3 text-center text-sm text-gray-400 py-8">No practice types match your filter</p>
                                )}
                            </div>

                            {selectedPracticeType && (
                                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={handleApplyDefaults}
                                        disabled={saving}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Apply &quot;{practiceTypes.find(p => p.code === selectedPracticeType)?.name}&quot; Defaults
                                    </button>
                                    <span className="text-xs text-gray-400">
                                        This will clone the default tabs so you can customize them.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Add New Practice Type Form */}
                        {showNewPtForm && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-md font-semibold text-gray-900">New Practice Type</h4>
                                    <button onClick={() => setShowNewPtForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                                        <input
                                            type="text"
                                            value={newPt.code}
                                            onChange={(e) => setNewPt({ ...newPt, code: e.target.value.replace(/\s/g, "-").toLowerCase() })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                            placeholder="e.g., radiology"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={newPt.name}
                                            onChange={(e) => setNewPt({ ...newPt, name: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                            placeholder="e.g., Radiology"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                                        <select
                                            value={newPt.category}
                                            onChange={(e) => setNewPt({ ...newPt, category: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                        >
                                            {PRACTICE_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                                        <IconPicker
                                            value={newPt.icon}
                                            onChange={(icon) => setNewPt({ ...newPt, icon })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={newPt.description}
                                            onChange={(e) => setNewPt({ ...newPt, description: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                            placeholder="Brief description"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        onClick={handleCreatePracticeType}
                                        disabled={saving}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Create
                                    </button>
                                    <button
                                        onClick={() => setShowNewPtForm(false)}
                                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        {tabCategories.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Preview: Tab Layout</h4>
                                <div className="space-y-2">
                                    {tabCategories.map((cat, idx) => (
                                        <div key={idx}>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {cat.label}
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(cat.tabs || [])
                                                    .filter((t) => t.visible !== false)
                                                    .map((tab) => (
                                                        <span
                                                            key={tab.key}
                                                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                                                        >
                                                            {tab.label}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Practice Settings */}
                {activeSection === "settings" && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-gray-900">Practice Settings</h3>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <span className="text-sm font-medium text-gray-700">Enable Patient Portal</span>
                                <p className="text-xs text-gray-400 mt-0.5">Allow patients to access the patient portal</p>
                            </div>
                            <button
                                onClick={() => setData({ ...data, enablePatientPractice: !data.enablePatientPractice })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    data.enablePatientPractice ? "bg-blue-600" : "bg-gray-200"
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        data.enablePatientPractice ? "translate-x-6" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                )}

                {/* Regional & Locale */}
                {activeSection === "regional" && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                        <h3 className="text-lg font-semibold text-gray-900">Regional & Locale Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Units for Visit Forms</label>
                                <select
                                    value={data.regional.unitsForVisitForms}
                                    onChange={(e) => setData({
                                        ...data,
                                        regional: { ...data.regional, unitsForVisitForms: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                    <option value="US">US</option>
                                    <option value="Metric">Metric</option>
                                    <option value="Both">Show both US and metric</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Format for US Weights</label>
                                <select
                                    value={data.regional.displayFormatUSWeights}
                                    onChange={(e) => setData({
                                        ...data,
                                        regional: { ...data.regional, displayFormatUSWeights: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                    <option value="Show pounds as decimal value">Show pounds as decimal value</option>
                                    <option value="Show pounds and ounces">Show pounds and ounces</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone Country Code</label>
                                <input
                                    type="text"
                                    value={data.regional.telephoneCountryCode}
                                    onChange={(e) => setData({
                                        ...data,
                                        regional: { ...data.regional, telephoneCountryCode: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                    placeholder="+1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date Display Format</label>
                                <select
                                    value={data.regional.dateDisplayFormat}
                                    onChange={(e) => setData({
                                        ...data,
                                        regional: { ...data.regional, dateDisplayFormat: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time Display Format</label>
                                <select
                                    value={data.regional.timeDisplayFormat}
                                    onChange={(e) => setData({
                                        ...data,
                                        regional: { ...data.regional, timeDisplayFormat: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                    <option value="24 hr">24 hr</option>
                                    <option value="12 hr">12 hr</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                                <select
                                    value={data.regional.timeZone}
                                    onChange={(e) => setData({
                                        ...data,
                                        regional: { ...data.regional, timeZone: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                    <option value="">Unassigned</option>
                                    <option value="America/New_York">America/New_York</option>
                                    <option value="America/Chicago">America/Chicago</option>
                                    <option value="America/Denver">America/Denver</option>
                                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                                    <option value="UTC">UTC</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Designator</label>
                                <input
                                    type="text"
                                    value={data.regional.currencyDesignator}
                                    onChange={(e) => setData({
                                        ...data,
                                        regional: { ...data.regional, currencyDesignator: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                    placeholder="$"
                                />
                            </div>
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
