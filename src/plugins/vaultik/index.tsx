"use client";

import React from "react";
import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import PatientFilesTab from "./PatientFilesTab";
import VaultikSettingsNav from "./VaultikSettingsNav";

/**
 * Vaultik – Secure file storage plugin.
 *
 * Contributes:
 * 1. A settings page for configuring storage (S3 overrides, limits, etc.)
 * 2. A "Files" tab in the patient chart for upload/download/manage files
 */
export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: VaultikSettingsNav,
        label: "Vaultik Storage",
        icon: "HardDrive",
        priority: 60,
    });

    api.contribute({
        slotName: "patient-chart:tab",
        component: PatientFilesTab,
        label: "Files",
        icon: "FolderOpen",
        priority: 40,
    });

    api.events.on("patient:changed", (patientId: string) => {
        console.log(`[vaultik] Patient changed to ${patientId}`);
    });
}
