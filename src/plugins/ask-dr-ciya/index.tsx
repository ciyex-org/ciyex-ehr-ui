"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import ChatWidget from "./ChatWidget";
import PatientCiyaTab from "./PatientCiyaTab";

/**
 * Ask Dr. Ciya -- AI clinical assistant chatbot plugin.
 *
 * Contributes:
 * 1. A floating chat widget (bottom-right bubble) accessible from any page
 * 2. A patient chart tab for context-aware clinical queries
 */
export function register(api: PluginAPI) {
    // Floating chat bubble accessible from any page
    api.contribute({
        slotName: "global:floating-widget",
        component: ChatWidget,
        priority: 10,
    });

    // Patient chart tab for context-aware queries
    api.contribute({
        slotName: "patient-chart:tab",
        component: PatientCiyaTab,
        label: "Ask Dr. Ciya",
        icon: "Bot",
        priority: 90,
    });

    api.events.on("patient:changed", (patientId: string) => {
        console.log(`[ask-dr-ciya] Patient context changed to ${patientId}`);
    });
}
