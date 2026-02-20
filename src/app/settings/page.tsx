"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import GenericSettingsPage from "@/components/settings/GenericSettingsPage";
import FormOptionsEditor from "@/components/settings/FormOptionsEditor";
import DisplaySettings from "@/components/settings/DisplaySettings";
import CalendarColorSettings from "@/components/settings/CalendarColorSettings";
import PracticeLogoUpload from "@/components/settings/PracticeLogoUpload";
import { ICONS } from "@/components/settings/IconPicker";
import { Settings, Loader2, FileText, SlidersHorizontal, Monitor, Palette } from "lucide-react";
import PluginSlot from "@/components/plugins/PluginSlot";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface SettingsItem {
    tabKey: string;
    label: string;
    icon: string;
}

const BUILTIN_PAGES = [
    { tabKey: "__form-options__", label: "Form Options", icon: "SlidersHorizontal" },
    { tabKey: "__display__", label: "Display", icon: "Monitor" },
    { tabKey: "__calendar-colors__", label: "Calendar Colors", icon: "Palette" },
];

export default function SettingsPage() {
    const [items, setItems] = useState<SettingsItem[]>([]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/all`);
                if (res.ok) {
                    const data: any[] = await res.json();
                    // Filter to Settings-category pages with FHIR resources
                    const settingsItems = data
                        .filter((d: any) => {
                            if (d.category !== "Settings") return false;
                            const fhir = Array.isArray(d.fhirResources) ? d.fhirResources : [];
                            return fhir.length > 0;
                        })
                        .map((d: any) => ({
                            tabKey: d.tabKey,
                            label: d.label || d.tabKey.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                            icon: d.icon || "FileText",
                        }));
                    setItems(settingsItems);
                    if (settingsItems.length > 0) {
                        setActiveKey(settingsItems[0].tabKey);
                    }
                }
            } catch (err) {
                console.error("Failed to load settings pages:", err);
            }
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const getIcon = (iconName: string) => {
        if (iconName === "SlidersHorizontal") return SlidersHorizontal;
        if (iconName === "Monitor") return Monitor;
        if (iconName === "Palette") return Palette;
        return ICONS[iconName] || FileText;
    };

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Side menu */}
            <div className="w-56 border-r border-gray-200 bg-gray-50 overflow-y-auto shrink-0">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Settings className="w-4 h-4" /> Settings
                    </h2>
                </div>
                <nav className="p-2 space-y-0.5">
                    {items.map((item) => {
                        const Icon = getIcon(item.icon);
                        const isActive = activeKey === item.tabKey;
                        return (
                            <button
                                key={item.tabKey}
                                onClick={() => setActiveKey(item.tabKey)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}

                    {/* Divider before built-in pages */}
                    {items.length > 0 && BUILTIN_PAGES.length > 0 && (
                        <div className="border-t border-gray-200 my-2" />
                    )}

                    {/* Built-in pages */}
                    {BUILTIN_PAGES.map((item) => {
                        const Icon = getIcon(item.icon);
                        const isActive = activeKey === item.tabKey;
                        return (
                            <button
                                key={item.tabKey}
                                onClick={() => setActiveKey(item.tabKey)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}

                    {items.length === 0 && BUILTIN_PAGES.length === 0 && (
                        <p className="text-sm text-gray-400 px-3 py-4 text-center">
                            No settings pages configured
                        </p>
                    )}
                    <PluginSlot name="settings:nav-item" className="mt-1 space-y-0.5" />
                </nav>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
                {activeKey === "__form-options__" ? (
                    <FormOptionsEditor />
                ) : activeKey === "__display__" ? (
                    <DisplaySettings />
                ) : activeKey === "__calendar-colors__" ? (
                    <CalendarColorSettings />
                ) : activeKey ? (
                    <>
                        {activeKey === "practice" && <PracticeLogoUpload />}
                        <GenericSettingsPage key={activeKey} pageKey={activeKey} embedded />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Select a settings page from the left
                    </div>
                )}
            </div>
        </div>
    );
}
