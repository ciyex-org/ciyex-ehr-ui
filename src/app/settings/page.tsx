"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import AdminLayout from "@/app/(admin)/layout";
import GenericSettingsPage from "@/components/settings/GenericSettingsPage";
import { ICONS } from "@/components/settings/IconPicker";
import { Settings, Loader2, FileText } from "lucide-react";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface SettingsItem {
    tabKey: string;
    label: string;
    icon: string;
}

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
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
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
                            const Icon = ICONS[item.icon] || FileText;
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
                        {items.length === 0 && (
                            <p className="text-sm text-gray-400 px-3 py-4 text-center">
                                No settings pages configured
                            </p>
                        )}
                    </nav>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto">
                    {activeKey ? (
                        <GenericSettingsPage key={activeKey} pageKey={activeKey} embedded />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Select a settings page from the left
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
