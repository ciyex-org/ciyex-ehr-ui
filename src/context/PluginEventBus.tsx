"use client";

import React, { createContext, useContext, useRef, useCallback } from "react";

/**
 * Plugin Event Bus — pub/sub system for plugin↔host communication.
 *
 * Host events (plugins listen):
 *   - patient:changed     — user navigated to a different patient
 *   - encounter:changed   — encounter opened/switched
 *   - encounter:saved     — encounter auto-saved or manually saved
 *   - navigation:changed  — route changed
 *
 * Plugin events (host listens):
 *   - plugin:notification    — plugin wants to show a toast/banner
 *   - plugin:navigate        — plugin requests route navigation
 *   - plugin:requestRefresh  — plugin asks host to refetch a resource type
 */

type EventHandler = (...args: any[]) => void | Promise<void>;

export interface PluginEventBusAPI {
    /** Subscribe to an event. Returns an unsubscribe function. */
    on: (event: string, handler: EventHandler) => () => void;
    /** Unsubscribe from an event */
    off: (event: string, handler: EventHandler) => void;
    /** Emit an event to all subscribers */
    emit: (event: string, ...args: any[]) => void;
    /** Emit and collect responses from all handlers (for blocking hooks) */
    emitAsync: (event: string, ...args: any[]) => Promise<any[]>;
}

function createEventBus(): PluginEventBusAPI {
    const listeners = new Map<string, Set<EventHandler>>();

    const on = (event: string, handler: EventHandler) => {
        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }
        listeners.get(event)!.add(handler);
        return () => off(event, handler);
    };

    const off = (event: string, handler: EventHandler) => {
        listeners.get(event)?.delete(handler);
    };

    const emit = (event: string, ...args: any[]) => {
        const handlers = listeners.get(event);
        if (!handlers) return;
        for (const handler of handlers) {
            try {
                handler(...args);
            } catch (err) {
                console.error(`Plugin event handler error (${event}):`, err);
            }
        }
    };

    const emitAsync = async (event: string, ...args: any[]) => {
        const handlers = listeners.get(event);
        if (!handlers) return [];
        const results: any[] = [];
        for (const handler of handlers) {
            try {
                const result = await handler(...args);
                if (result !== undefined) results.push(result);
            } catch (err) {
                console.error(`Plugin async event handler error (${event}):`, err);
            }
        }
        return results;
    };

    return { on, off, emit, emitAsync };
}

const PluginEventBusContext = createContext<PluginEventBusAPI | null>(null);

export function PluginEventBusProvider({ children }: { children: React.ReactNode }) {
    const busRef = useRef<PluginEventBusAPI>(createEventBus());

    return (
        <PluginEventBusContext.Provider value={busRef.current}>
            {children}
        </PluginEventBusContext.Provider>
    );
}

export function usePluginEventBus(): PluginEventBusAPI {
    const ctx = useContext(PluginEventBusContext);
    if (!ctx) {
        // Safe fallback when outside provider
        return {
            on: () => () => {},
            off: () => {},
            emit: () => {},
            emitAsync: async () => [],
        };
    }
    return ctx;
}
