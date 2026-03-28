"use client";

import React from "react";
import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import PaymentGatewaySettings from "./PaymentGatewaySettings";

/**
 * Payment Gateway – Multi-processor payment collection plugin.
 *
 * Contributes:
 * 1. A settings page for configuring payment processors (Stripe, GPS, Square)
 */
export function register(api: PluginAPI) {
    api.contribute({
        slotName: "settings:nav-item",
        component: PaymentGatewaySettings,
        label: "Payment Gateway",
        icon: "CreditCard",
        priority: 55,
    });

    api.events.on("patient:changed", (patientId: string) => {
        console.log(`[payment-gateway] Patient changed to ${patientId}`);
    });
}
