"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import ChatWidget from "./ChatWidget";
import PatientCiyaTab from "./PatientCiyaTab";
import EncounterCiyaButton from "./EncounterCiyaButton";

/**
 * Ask Dr. Ciya -- AI clinical assistant chatbot plugin.
 *
 * Contributes:
 * 1. A floating chat widget (bottom-right bubble) accessible from any page
 * 2. A patient chart tab for context-aware clinical queries
 * 3. An "Ask Ciya" button in the encounter toolbar for SOAP notes & medical coding
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

    // Encounter toolbar button for SOAP notes & medical coding assistance
    api.contribute({
        slotName: "encounter:toolbar",
        component: EncounterCiyaButton,
        label: "Ask Ciya",
        icon: "Sparkles",
        priority: 10,
    });

    api.events.on("patient:changed", (patientId: string) => {
        console.log(`[ask-dr-ciya] Patient context changed to ${patientId}`);
    });
}
