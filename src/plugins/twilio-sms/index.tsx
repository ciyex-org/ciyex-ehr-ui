"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import TwilioSmsSettings from "./TwilioSmsSettings";

export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: TwilioSmsSettings,
        label: "Twilio SMS",
        icon: "MessageSquare",
        priority: 45,
    });
}
