"use client";

import { useEffect, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/** Batches usage events and sends them periodically to avoid excessive API calls */
let eventBuffer: UsageEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 30_000; // 30 seconds
const MAX_BUFFER_SIZE = 50;

interface UsageEvent {
    appSlug: string;
    eventType: string;
    eventDetail?: string;
}

function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
}

async function flushEvents() {
    flushTimer = null;
    if (eventBuffer.length === 0) return;

    const events = [...eventBuffer];
    eventBuffer = [];

    // Aggregate duplicate events
    const aggregated = new Map<string, { event: UsageEvent; count: number }>();
    for (const event of events) {
        const key = `${event.appSlug}:${event.eventType}:${event.eventDetail || ""}`;
        const existing = aggregated.get(key);
        if (existing) {
            existing.count++;
        } else {
            aggregated.set(key, { event, count: 1 });
        }
    }

    // Send each aggregated event
    for (const { event, count } of aggregated.values()) {
        try {
            await fetchWithAuth(`${API_BASE()}/api/app-usage/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appSlug: event.appSlug,
                    eventType: event.eventType,
                    eventDetail: event.eventDetail,
                    quantity: count,
                }),
            });
        } catch {
            // Silent failure — usage tracking should never break the app
        }
    }
}

/**
 * Track a plugin usage event. Events are batched and sent periodically.
 */
export function trackPluginUsage(appSlug: string, eventType: string, eventDetail?: string) {
    eventBuffer.push({ appSlug, eventType, eventDetail });
    if (eventBuffer.length >= MAX_BUFFER_SIZE) {
        flushEvents();
    } else {
        scheduleFlush();
    }
}

/**
 * Hook that tracks when a plugin renders in a specific slot.
 * Call once per plugin render — it deduplicates and batches.
 */
export function usePluginUsageTracker(appSlug: string | undefined, slotName: string) {
    const tracked = useRef(false);

    useEffect(() => {
        if (!appSlug || tracked.current) return;
        tracked.current = true;
        trackPluginUsage(appSlug, "plugin_render", slotName);
    }, [appSlug, slotName]);
}

// Flush on page unload
if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flushEvents);
}
