"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import LabSettings from "./LabSettings";
import LabOrderWidget from "./LabOrderWidget";
import LabResultsTab from "./LabResultsTab";

export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: LabSettings,
        label: "Lab Integration",
        icon: "FlaskConical",
        priority: 40,
    });

    api.contribute({
        slotName: "encounter:form-footer",
        component: LabOrderWidget,
        label: "Order Labs",
        icon: "FlaskConical",
        priority: 25,
    });

    api.contribute({
        slotName: "patient-chart:tab",
        component: LabResultsTab,
        label: "Lab Results",
        icon: "FlaskConical",
        priority: 30,
    });
}
