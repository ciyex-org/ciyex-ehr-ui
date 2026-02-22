"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import VideoCallButton from "./VideoCallButton";

/**
 * Ciyex Telehealth -- Video call plugin for patient consultations.
 *
 * Contributes:
 * 1. A "Start Video Call" button on the patient chart action bar
 */
export function register(api: PluginAPI) {
    api.contribute({
        slotName: "patient-chart:action-bar",
        component: VideoCallButton,
        label: "Video Call",
        icon: "Video",
        priority: 10,
    });

    api.events.on("patient:changed", (patientId: string) => {
        console.log(`[ciyex-telehealth] Patient context changed to ${patientId}`);
    });
}
