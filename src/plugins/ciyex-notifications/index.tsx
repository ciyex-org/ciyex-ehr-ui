"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import NotificationSettings from "./NotificationSettings";

export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: NotificationSettings,
        label: "Notifications",
        icon: "Bell",
        priority: 45,
    });
}
