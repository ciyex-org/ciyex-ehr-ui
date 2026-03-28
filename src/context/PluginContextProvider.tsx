"use client";

import React, { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { usePluginEventBus, type PluginEventBusAPI } from "./PluginEventBus";
import { usePathname } from "next/navigation";

/**
 * PluginContext — the structured context injected into every plugin component.
 *
 * This provides plugins with:
 *   - Current patient & encounter info (if on a patient chart / encounter page)
 *   - Current user & org info
 *   - Event bus for pub/sub communication
 *   - Theme tokens for consistent styling
 */

export interface PluginPatient {
    id: string;
    name?: string;
    birthDate?: string;
    gender?: string;
}

export interface PluginEncounter {
    id: string;
    status?: string;
    period?: { start: string; end?: string };
}

export interface PluginUser {
    id: string;
    name: string;
    roles: string[];
}

export interface PluginOrg {
    alias: string;
    name: string;
}

export interface PluginThemeTokens {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        error: string;
        warning: string;
        success: string;
    };
    fontFamily: string;
    borderRadius: string;
}

export interface PluginContext {
    /** Current patient (null if not on a patient page) */
    patient: PluginPatient | null;
    /** Current encounter (null if not in an encounter) */
    encounter: PluginEncounter | null;
    /** Current user info */
    user: PluginUser | null;
    /** Current org info */
    org: PluginOrg | null;
    /** Event bus for plugin↔host communication */
    events: PluginEventBusAPI;
    /** Theme tokens for consistent styling */
    theme: PluginThemeTokens;
}

const defaultTheme: PluginThemeTokens = {
    colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        error: "#dc2626",
        warning: "#d97706",
        success: "#16a34a",
    },
    fontFamily: "Outfit, sans-serif",
    borderRadius: "0.5rem",
};

const PluginCtx = createContext<PluginContext | null>(null);

interface PluginContextProviderProps {
    children: React.ReactNode;
    /** Override patient for pages that know the current patient */
    patient?: PluginPatient | null;
    /** Override encounter for encounter pages */
    encounter?: PluginEncounter | null;
}

/**
 * Provides structured context to all plugin components in the subtree.
 *
 * Placed in layout.tsx to provide global context (user, org, events, theme).
 * Can be nested in patient chart or encounter pages to add patient/encounter scope.
 */
export function PluginContextProvider({ children, patient = null, encounter = null }: PluginContextProviderProps) {
    const events = usePluginEventBus();
    const pathname = usePathname();
    const prevPatientRef = useRef<string | null>(null);
    const prevEncounterRef = useRef<string | null>(null);

    // Read user/org from localStorage (set by auth flow)
    const userOrg = useMemo(() => {
        if (typeof window === "undefined") return { user: null, org: null };
        try {
            const userStr = localStorage.getItem("user");
            const orgAlias = localStorage.getItem("orgAlias") || localStorage.getItem("org_alias") || "";
            const orgName = localStorage.getItem("orgName") || orgAlias;
            const user = userStr ? JSON.parse(userStr) : null;
            return {
                user: user
                    ? {
                          id: user.id || user.sub || "",
                          name: user.name || user.preferred_username || "",
                          roles: user.roles || user.realm_access?.roles || [],
                      }
                    : null,
                org: orgAlias ? { alias: orgAlias, name: orgName } : null,
            };
        } catch {
            return { user: null, org: null };
        }
    }, []);

    // Emit patient:changed when patient prop changes
    useEffect(() => {
        const currentId = patient?.id || null;
        if (currentId !== prevPatientRef.current) {
            prevPatientRef.current = currentId;
            if (currentId) {
                events.emit("patient:changed", currentId);
            }
        }
    }, [patient?.id, events]);

    // Emit encounter:changed when encounter prop changes
    useEffect(() => {
        const currentId = encounter?.id || null;
        if (currentId !== prevEncounterRef.current) {
            prevEncounterRef.current = currentId;
            if (currentId) {
                events.emit("encounter:changed", currentId);
            }
        }
    }, [encounter?.id, events]);

    // Emit navigation:changed on route changes
    useEffect(() => {
        events.emit("navigation:changed", pathname);
    }, [pathname, events]);

    const value = useMemo<PluginContext>(
        () => ({
            patient,
            encounter,
            user: userOrg.user,
            org: userOrg.org,
            events,
            theme: defaultTheme,
        }),
        [patient, encounter, userOrg.user, userOrg.org, events]
    );

    return <PluginCtx.Provider value={value}>{children}</PluginCtx.Provider>;
}

/**
 * Hook to access the plugin context from within a plugin or slot.
 */
export function usePluginContext(): PluginContext {
    const ctx = useContext(PluginCtx);
    if (!ctx) {
        // Safe fallback — return empty context when outside provider
        return {
            patient: null,
            encounter: null,
            user: null,
            org: null,
            events: {
                on: () => () => {},
                off: () => {},
                emit: () => {},
                emitAsync: async () => [],
            },
            theme: defaultTheme,
        };
    }
    return ctx;
}
