"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import EligibilitySettings from "./EligibilitySettings";
import EligibilityPanel from "./EligibilityPanel";
import EligibilityTab from "./EligibilityTab";

export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: EligibilitySettings,
        label: "Insurance Verification",
        icon: "ShieldCheck",
        priority: 30,
    });

    api.contribute({
        slotName: "patient-chart:banner-alert",
        component: EligibilityPanel,
        label: "Coverage",
        icon: "ShieldCheck",
        priority: 5,
    });

    api.contribute({
        slotName: "patient-chart:tab",
        component: EligibilityTab,
        label: "Eligibility",
        icon: "ShieldCheck",
        priority: 25,
    });
}
