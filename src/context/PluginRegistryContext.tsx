"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

/**
 * Represents an installed app/plugin that can render in extension points.
 */
export interface InstalledPlugin {
    id: string;
    appSlug: string;
    appName: string;
    appIconUrl?: string;
    appCategory?: string;
    status: string;
    config: Record<string, any>;
    /** Extension points this plugin wants to render in (from marketplace manifest) */
    extensionPoints?: string[];
}

/**
 * A registered component contribution from a plugin to a specific slot.
 */
export interface SlotContribution {
    pluginSlug: string;
    pluginName: string;
    slotName: string;
    /** React component to render */
    component: React.ComponentType<any>;
    /** Priority for ordering within the slot (lower = first) */
    priority?: number;
    /** Optional label for tabs/buttons */
    label?: string;
    /** Optional icon name (Lucide) */
    icon?: string;
}

interface PluginRegistryContextValue {
    /** All installed plugins for the current org */
    plugins: InstalledPlugin[];
    /** All slot contributions registered by plugins */
    contributions: SlotContribution[];
    /** Whether the registry has loaded */
    loaded: boolean;
    /** Get contributions for a specific slot */
    getSlotContributions: (slotName: string) => SlotContribution[];
    /** Register a component contribution to a slot (used by plugin loaders) */
    registerContribution: (contribution: SlotContribution) => void;
    /** Refresh the plugin list from the API */
    refresh: () => Promise<void>;
}

const PluginRegistryContext = createContext<PluginRegistryContextValue | null>(null);

export function PluginRegistryProvider({ children }: { children: React.ReactNode }) {
    const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
    const [contributions, setContributions] = useState<SlotContribution[]>([]);
    const [loaded, setLoaded] = useState(false);

    const loadPlugins = useCallback(async () => {
        try {
            const apiBase = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");
            const res = await fetchWithAuth(`${apiBase}/api/app-installations`);
            if (res.ok) {
                const data = await res.json();
                const list = data.data || data || [];
                setPlugins(list.filter((p: InstalledPlugin) => p.status === "active"));
            }
        } catch (err) {
            console.error("Failed to load plugins:", err);
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        // Only load if we have a token (user is logged in)
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("authToken") : null;
        if (token) {
            loadPlugins();
        } else {
            setLoaded(true);
        }
    }, [loadPlugins]);

    const getSlotContributions = useCallback(
        (slotName: string) => {
            return contributions
                .filter((c) => c.slotName === slotName)
                .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
        },
        [contributions]
    );

    const registerContribution = useCallback((contribution: SlotContribution) => {
        setContributions((prev) => {
            // Avoid duplicate registrations
            const exists = prev.some(
                (c) => c.pluginSlug === contribution.pluginSlug && c.slotName === contribution.slotName
            );
            if (exists) return prev;
            return [...prev, contribution];
        });
    }, []);

    return (
        <PluginRegistryContext.Provider
            value={{
                plugins,
                contributions,
                loaded,
                getSlotContributions,
                registerContribution,
                refresh: loadPlugins,
            }}
        >
            {children}
        </PluginRegistryContext.Provider>
    );
}

export function usePluginRegistry(): PluginRegistryContextValue {
    const ctx = useContext(PluginRegistryContext);
    if (!ctx) {
        // Return a safe default when outside provider (e.g., during SSR or on public pages)
        return {
            plugins: [],
            contributions: [],
            loaded: false,
            getSlotContributions: () => [],
            registerContribution: () => {},
            refresh: async () => {},
        };
    }
    return ctx;
}
