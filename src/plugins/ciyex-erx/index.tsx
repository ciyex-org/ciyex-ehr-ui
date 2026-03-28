"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import ErxSettings from "./ErxSettings";
import PrescribeWidget from "./PrescribeWidget";
import RxHistoryTab from "./RxHistoryTab";

export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: ErxSettings,
        label: "E-Prescribing",
        icon: "Pill",
        priority: 35,
    });

    api.contribute({
        slotName: "encounter:form-footer",
        component: PrescribeWidget,
        label: "Prescribe",
        icon: "Pill",
        priority: 20,
    });

    api.contribute({
        slotName: "patient-chart:tab",
        component: RxHistoryTab,
        label: "Medications",
        icon: "Pill",
        priority: 35,
    });
}
