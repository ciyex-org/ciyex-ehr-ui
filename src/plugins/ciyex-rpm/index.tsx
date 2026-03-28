"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import RpmSettings from "./RpmSettings";
import RpmTab from "./RpmTab";

export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: RpmSettings,
        label: "Remote Monitoring",
        icon: "Activity",
        priority: 55,
    });

    api.contribute({
        slotName: "patient-chart:tab",
        component: RpmTab,
        label: "RPM",
        icon: "Activity",
        priority: 60,
    });
}
