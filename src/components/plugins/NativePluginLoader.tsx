"use client";

import { useEffect, useRef } from "react";
import { usePluginRegistry, type InstalledPlugin, type SlotContribution } from "@/context/PluginRegistryContext";
import { usePluginEventBus, type PluginEventBusAPI } from "@/context/PluginEventBus";

/**
 * Plugin Registration API passed to each plugin's `register()` function.
 * Plugins use this API to declare which slots they contribute to.
 */
export interface PluginAPI {
    /** Register a React component to render in a named slot */
    contribute: (contribution: Omit<SlotContribution, "pluginSlug" | "pluginName">) => void;
    /** The plugin's org-specific configuration */
    config: Record<string, any>;
    /** The plugin's slug identifier */
    slug: string;
    /** Event bus for subscribing to host events and emitting plugin events */
    events: PluginEventBusAPI;
}

/**
 * Expected export shape of a native plugin module.
 * Each plugin's entry point must export a `register` function.
 *
 * Example plugin module:
 * ```ts
 * import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
 *
 * export function register(api: PluginAPI) {
 *     api.contribute({
 *         slotName: "patient-chart:tab",
 *         component: MyPatientTab,
 *         label: "My App Tab",
 *         icon: "Layers",
 *         priority: 50,
 *     });
 *     api.contribute({
 *         slotName: "patient-chart:action-bar",
 *         component: MyActionButton,
 *     });
 * }
 * ```
 */
interface PluginModule {
    register: (api: PluginAPI) => void | Promise<void>;
}

/**
 * Built-in plugin registry: maps app slugs to their module loaders.
 *
 * For Tier 1 (native) plugins that ship as part of the EHR-UI bundle or
 * are loaded from a known path, register them here. This avoids arbitrary
 * code execution from unknown URLs.
 *
 * To add a new native plugin:
 *   1. Create a folder: src/plugins/{app-slug}/index.ts
 *   2. Export a `register(api: PluginAPI)` function
 *   3. Add the slug → dynamic import mapping below
 */
const NATIVE_PLUGIN_LOADERS: Record<string, () => Promise<PluginModule>> = {
    // Demo plugin — validates the full plugin pipeline
    "demo-care-gaps": () => import("@/plugins/demo-care-gaps"),
    // Vaultik — secure file storage (S3-backed, per-practice overrides)
    "vaultik": () => import("@/plugins/vaultik"),
    // Ask Dr. Ciya — AI clinical assistant chatbot
    "ask-ciya": () => import("@/plugins/ask-dr-ciya"),
    // Ciyex RCM — revenue cycle management, billing & claims
    "ciyex-rcm": () => import("@/plugins/ciyex-rcm"),
    // Ciyex Credentialing — provider credentialing management
    "ciyex-credentialing": () => import("@/plugins/ciyex-credentialing"),
    // Payment Gateway — multi-processor patient payment collection
    "payment-gateway": () => import("@/plugins/payment-gateway"),
    // Ciyex Telehealth — video visits and virtual care
    "ciyex-telehealth": () => import("@/plugins/ciyex-telehealth"),
    // Ciyex Eligibility — insurance verification and coverage discovery
    "ciyex-eligibility": () => import("@/plugins/ciyex-eligibility"),
    // Ciyex eRx — electronic prescribing and medication management
    "ciyex-erx": () => import("@/plugins/ciyex-erx"),
    // Ciyex Lab — lab orders and results integration
    "ciyex-lab": () => import("@/plugins/ciyex-lab"),
    // Twilio SMS — HIPAA-eligible SMS messaging
    "twilio-sms": () => import("@/plugins/twilio-sms"),
    // eFax — HIPAA-compliant fax send/receive
    "efax": () => import("@/plugins/efax"),
    // Ciyex RPM — remote patient monitoring devices and alerts
    "ciyex-rpm": () => import("@/plugins/ciyex-rpm"),
};

/**
 * NativePluginLoader watches the installed plugins list and loads
 * native plugin modules for any that have registered extension points.
 *
 * Place this component once in the app tree (inside PluginRegistryProvider).
 * It renders nothing — it only triggers side effects (loading + registration).
 */
export default function NativePluginLoader() {
    const { plugins, loaded, registerContribution } = usePluginRegistry();
    const events = usePluginEventBus();
    const loadedPlugins = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!loaded) return;

        for (const plugin of plugins) {
            // Skip if already loaded or no extension points
            if (loadedPlugins.current.has(plugin.appSlug)) continue;
            if (!plugin.extensionPoints || plugin.extensionPoints.length === 0) continue;

            const loader = NATIVE_PLUGIN_LOADERS[plugin.appSlug];
            if (!loader) {
                // No native loader registered for this plugin — it may be a
                // SMART-on-FHIR app or an external app that doesn't inject UI
                continue;
            }

            // Mark as loading immediately to prevent double-loads
            loadedPlugins.current.add(plugin.appSlug);
            loadPlugin(plugin, loader, registerContribution, events);
        }
    }, [plugins, loaded, registerContribution, events]);

    return null;
}

async function loadPlugin(
    plugin: InstalledPlugin,
    loader: () => Promise<PluginModule>,
    registerContribution: (c: SlotContribution) => void,
    events: PluginEventBusAPI
) {
    try {
        const mod = await loader();

        const api: PluginAPI = {
            slug: plugin.appSlug,
            config: plugin.config || {},
            events,
            contribute: (contribution) => {
                registerContribution({
                    ...contribution,
                    pluginSlug: plugin.appSlug,
                    pluginName: plugin.appName,
                });
            },
        };

        await mod.register(api);
    } catch (err) {
        console.error(`Failed to load native plugin "${plugin.appSlug}":`, err);
    }
}
