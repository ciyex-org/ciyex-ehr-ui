"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import CredentialingPanel from "./CredentialingPanel";

/**
 * Ciyex Credentialing -- Provider credentialing management plugin.
 *
 * Contributes:
 * 1. A "Credentialing" settings navigation item with dashboard
 */
export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: CredentialingPanel,
        label: "Credentialing",
        icon: "BadgeCheck",
        priority: 20,
    });
}
