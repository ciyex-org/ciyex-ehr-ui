"use client";

import React, { useEffect, useRef } from "react";
import { usePluginRegistry } from "@/context/PluginRegistryContext";
import PluginErrorBoundary from "./PluginErrorBoundary";
import { trackPluginUsage } from "@/hooks/usePluginUsageTracker";

interface PluginSlotProps {
    /** Named extension point (e.g., "patient-chart:tab", "patient-chart:action-bar") */
    name: string;
    /** Context data passed to each plugin component */
    context?: Record<string, any>;
    /** Wrapper className for the slot container */
    className?: string;
    /** Render as a specific wrapper element */
    as?: "div" | "span" | "li" | "fragment";
}

/**
 * PluginSlot renders all plugin contributions registered for a given slot name.
 * Plugins register components into named slots via the PluginRegistryContext.
 * Each contribution is wrapped in a PluginErrorBoundary to isolate failures.
 * Plugin renders are automatically tracked for usage metering.
 *
 * Usage:
 *   <PluginSlot name="patient-chart:action-bar" context={{ patientId }} />
 *   <PluginSlot name="patient-chart:tab" context={{ patientId }} />
 */
export default function PluginSlot({ name, context, className, as = "div" }: PluginSlotProps) {
    const { getSlotContributions, loaded } = usePluginRegistry();
    const trackedRef = useRef<Set<string>>(new Set());

    const contributions = loaded ? getSlotContributions(name) : [];

    // Track plugin renders for usage metering (batched, deduplicated)
    useEffect(() => {
        for (const c of contributions) {
            const key = `${c.pluginSlug}:${name}`;
            if (!trackedRef.current.has(key)) {
                trackedRef.current.add(key);
                trackPluginUsage(c.pluginSlug, "plugin_render", name);
            }
        }
    }, [contributions, name]);

    if (!loaded || contributions.length === 0) return null;

    const content = contributions.map((contribution) => (
        <PluginErrorBoundary
            key={`${contribution.pluginSlug}-${contribution.slotName}`}
            pluginName={contribution.pluginName}
            slotName={name}
        >
            <contribution.component {...(context || {})} />
        </PluginErrorBoundary>
    ));

    if (as === "fragment") {
        return <>{content}</>;
    }

    const Wrapper = as;
    return <Wrapper className={className}>{content}</Wrapper>;
}
