"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import GenericSettingsPage from "@/components/settings/GenericSettingsPage";
import FormOptionsEditor from "@/components/settings/FormOptionsEditor";
import DisplaySettings from "@/components/settings/DisplaySettings";
import CalendarColorSettings from "@/components/settings/CalendarColorSettings";
import PracticeLogoUpload from "@/components/settings/PracticeLogoUpload";
import CodesPage from "@/components/codes/CodesPage";
import { ICONS } from "@/components/settings/IconPicker";
import { Settings, Loader2, FileText, SlidersHorizontal, Monitor, Palette, Users, Shield } from "lucide-react";
import { usePluginRegistry } from "@/context/PluginRegistryContext";
import PluginErrorBoundary from "@/components/plugins/PluginErrorBoundary";
import UserManagementPage from "@/app/settings/user-management/page";
import RolesPermissionsPage from "@/app/settings/roles-permissions/page";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface SettingsItem {
    tabKey: string;
    label: string;
    icon: string;
}

const ADMIN_PAGES = [
    { tabKey: "__users__", label: "Users", icon: "Users" },
    { tabKey: "__roles__", label: "Roles & Permissions", icon: "Shield" },
];

const BUILTIN_PAGES = [
    { tabKey: "__form-options__", label: "Form Options", icon: "SlidersHorizontal" },
    { tabKey: "__display__", label: "Display", icon: "Monitor" },
    { tabKey: "__calendar-colors__", label: "Calendar Colors", icon: "Palette" },
];

export default function SettingsPage() {
    const [items, setItems] = useState<SettingsItem[]>([]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { getSlotContributions, loaded: pluginsLoaded } = usePluginRegistry();

    const pluginNavItems = pluginsLoaded ? getSlotContributions("settings:nav-item") : [];

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
        if (iconName === "Users") return Users;
        if (iconName === "Shield") return Shield;
        return ICONS[iconName] || FileText;
    };

    // Find the active plugin contribution (if active key matches a plugin slug)
    const activePlugin = pluginNavItems.find(
        (c) => `__plugin_${c.pluginSlug}__` === activeKey
    );

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

                    {/* Divider before admin pages */}
                    {items.length > 0 && (
                        <div className="border-t border-gray-200 my-2" />
                    )}

                    {/* Admin pages */}
                    {ADMIN_PAGES.map((item) => {
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
                    <div className="border-t border-gray-200 my-2" />

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

                    {/* Plugin-contributed settings nav items */}
                    {pluginNavItems.length > 0 && (
                        <div className="border-t border-gray-200 my-2" />
                    )}
                    {pluginNavItems.map((contribution) => {
                        const pluginKey = `__plugin_${contribution.pluginSlug}__`;
                        const isActive = activeKey === pluginKey;
                        const Icon = contribution.icon ? (ICONS[contribution.icon] || FileText) : FileText;
                        return (
                            <button
                                key={pluginKey}
                                onClick={() => setActiveKey(pluginKey)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{contribution.label || contribution.pluginName}</span>
                            </button>
                        );
                    })}

                    {items.length === 0 && BUILTIN_PAGES.length === 0 && pluginNavItems.length === 0 && (
                        <p className="text-sm text-gray-400 px-3 py-4 text-center">
                            No settings pages configured
                        </p>
                    )}
                </nav>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
                {activePlugin ? (
                    <PluginErrorBoundary
                        pluginName={activePlugin.pluginName}
                        slotName="settings:nav-item"
                    >
                        <activePlugin.component />
                    </PluginErrorBoundary>
                ) : activeKey === "__users__" ? (
                    <div className="p-6 h-full"><UserManagementPage /></div>
                ) : activeKey === "__roles__" ? (
                    <div className="p-6 h-full"><RolesPermissionsPage /></div>
                ) : activeKey === "__form-options__" ? (
                    <FormOptionsEditor />
                ) : activeKey === "__display__" ? (
                    <DisplaySettings />
                ) : activeKey === "__calendar-colors__" ? (
                    <CalendarColorSettings />
                ) : activeKey === "codes" ? (
                    <div className="p-6"><CodesPage /></div>
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
