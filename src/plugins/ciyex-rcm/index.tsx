"use client";

import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import BillingSummary from "./BillingSummary";
import BillingTab from "./BillingTab";

/**
 * Ciyex RCM (Revenue Cycle Management) -- Billing & claims plugin.
 *
 * Contributes:
 * 1. A billing summary panel at the bottom of encounter forms
 * 2. A "Billing & Claims" tab in the patient chart
 */
export function register(api: PluginAPI) {
    api.contribute({
        slotName: "encounter:form-footer",
        component: BillingSummary,
        label: "Billing",
        icon: "Receipt",
        priority: 10,
    });

    api.contribute({
        slotName: "patient-chart:tab",
        component: BillingTab,
        label: "Billing & Claims",
        icon: "CreditCard",
        priority: 50,
    });

    api.events.on("encounter:saved", () => {
        console.log("[ciyex-rcm] Encounter saved, would refresh billing data");
    });

    api.events.on("patient:changed", (patientId: string) => {
        console.log(`[ciyex-rcm] Patient changed to ${patientId}`);
    });
}
