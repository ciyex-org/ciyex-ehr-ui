"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import FaxSettings from "./FaxSettings";
import SendFaxButton from "./SendFaxButton";

export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: FaxSettings,
        label: "Fax",
        icon: "Printer",
        priority: 50,
    });

    api.contribute({
        slotName: "encounter:toolbar",
        component: SendFaxButton,
        label: "Send Fax",
        icon: "Printer",
        priority: 30,
    });
}
