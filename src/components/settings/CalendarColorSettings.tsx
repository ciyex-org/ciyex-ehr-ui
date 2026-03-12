"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";


/* ─── Types ─── */
interface ColorEntry {
    entityKey: string;
    entityLabel: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
}

interface FieldOption {
    value: string;
    label: string;
}

type Category = "visit-type" | "provider" | "location" | "calendar";

/* ─── Deterministic random color from string (FNV-1a hash for better distribution) ─── */
function hashString(str: string): number {
    const s = str || "unknown";
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function contrastText(hexBg: string): string {
    const c = hexBg.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.45 ? '#1e293b' : '#FFFFFF';
}

function stringToHslColor(str: string): { bg: string; border: string; text: string } {
    const h = hashString(str);
    const hue = h % 360;
    const s = 55 + ((h >> 10) % 20); // 55-75%
    const l = 45 + ((h >> 18) % 15); // 45-60%
    const bgHex = hslToHex(hue, s, l);
    return {
        bg: bgHex,
        border: hslToHex(hue, s + 10, l - 10),
        text: contrastText(bgHex),
    };
}

/* ─── HSL ↔ Hex helpers ─── */
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function parseHslString(hsl: string): string {
    const m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (m) return hslToHex(Number(m[1]), Number(m[2]), Number(m[3]));
    return hsl; // already hex
}

function darkenHex(hex: string, amount: number): string {
    const c = hex.replace("#", "");
    const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/* ─── Component ─── */
export default function CalendarColorSettings() {
    const API = getEnv("NEXT_PUBLIC_API_URL") as string;

    const [activeTab, setActiveTab] = useState<Category>("visit-type");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    // Source entities (from field config / FHIR)
    const [visitTypeOptions, setVisitTypeOptions] = useState<FieldOption[]>([]);
    const [providerOptions, setProviderOptions] = useState<FieldOption[]>([]);
    const [locationOptions, setLocationOptions] = useState<FieldOption[]>([]);

    // Saved color configs from API
    const [savedColors, setSavedColors] = useState<Record<string, ColorEntry>>({});

    // Local edits
    const [localColors, setLocalColors] = useState<Record<string, ColorEntry>>({});

    /* ─── Load visit types from appointments field config ─── */
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API}/api/tab-field-config/appointments`);
                if (!res.ok) return;
                const json = await res.json();
                const fc = typeof json.fieldConfig === "string"
                    ? JSON.parse(json.fieldConfig)
                    : json.fieldConfig;

                // Find the appointmentType field in any section
                const sections = fc?.sections || [];
                for (const section of sections) {
                    const fields = section?.fields || [];
                    for (const field of fields) {
                        if (field.key === "appointmentType" && Array.isArray(field.options)) {
                            setVisitTypeOptions(
                                field.options.map((o: string | { value: string; label: string }) => {
                                    if (typeof o === "string") {
                                        return { value: o, label: o };
                                    }
                                    return {
                                        value: o.value || o.label,
                                        label: o.label || o.value,
                                    };
                                })
                            );
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load visit types from field config:", err);
            }

            // Fallback: try list options
            try {
                const res = await fetchWithAuth(`${API}/api/list-options/list/${encodeURIComponent("Visit Type")}`);
                const json = await res.json();
                if (json?.data && Array.isArray(json.data)) {
                    const opts = json.data
                        .filter((i: { activity: number }) => i.activity === 1)
                        .map((i: { title: string }) => ({ value: i.title, label: i.title }));
                    if (opts.length > 0) setVisitTypeOptions(opts);
                } else if (Array.isArray(json)) {
                    const opts = json
                        .filter((i: { activity: number }) => i.activity === 1)
                        .map((i: { title: string }) => ({ value: i.title, label: i.title }));
                    if (opts.length > 0) setVisitTypeOptions(opts);
                }
            } catch {
                // no fallback
            }
        })();
    }, [API]);

    /* ─── Load providers from generic FHIR ─── */
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API}/api/fhir-resource/providers?size=100`);
                const json = await res.json();
                const content = json?.data?.content || json?.data || (Array.isArray(json) ? json : []);
                if (Array.isArray(content) && content.length > 0) {
                    const opts = (content as Record<string, unknown>[])
                        .map((p) => {
                            const first = p["identification.firstName"] || (p.identification as any)?.firstName || p.firstName || "";
                            const last = p["identification.lastName"] || (p.identification as any)?.lastName || p.lastName || "";
                            const label = `${first} ${last}`.trim();
                            return {
                                value: String(p.id || p.fhirId),
                                label: label || p.name as string || p.displayName as string || `Provider #${p.id}`,
                            };
                        })
                        .filter((o) => o.value && o.label);
                    setProviderOptions(opts);
                }
            } catch (err) {
                console.error("Failed to load providers:", err);
            }
        })();
    }, [API]);

    /* ─── Load locations from generic FHIR ─── */
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API}/api/fhir-resource/facilities?size=100`);
                const json = await res.json();
                if (json?.success && json?.data?.content) {
                    const opts = (json.data.content as Record<string, unknown>[]).map((l) => ({
                        value: String(l.id),
                        label: String(l.name || ""),
                    }));
                    setLocationOptions(opts);
                }
            } catch (err) {
                console.error("Failed to load locations:", err);
            }
        })();
    }, [API]);

    /* ─── Load saved color configs from backend ─── */
    const loadSavedColors = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${API}/api/ui-colors`);
            const json = await res.json();
            if (json?.success && Array.isArray(json.data)) {
                const map: Record<string, ColorEntry> = {};
                for (const c of json.data) {
                    const key = `${c.category}:${c.entityKey}`;
                    map[key] = {
                        entityKey: c.entityKey,
                        entityLabel: c.entityLabel || "",
                        bgColor: c.bgColor,
                        borderColor: c.borderColor,
                        textColor: c.textColor,
                    };
                }
                setSavedColors(map);
            }
        } catch (err) {
            console.error("Failed to load color configs:", err);
        }
    }, [API]);

    useEffect(() => {
        loadSavedColors();
    }, [loadSavedColors]);

    /* ─── Fixed calendar appearance options ─── */
    const calendarOptions: FieldOption[] = useMemo(() => [
        { value: "working-hours-bg", label: "Working Hours Background" },
        { value: "non-working-hours-bg", label: "Non-Working Hours Background" },
    ], []);

    /* ─── Merge saved colors + defaults for current tab ─── */
    const currentOptions = useMemo(() => {
        switch (activeTab) {
            case "visit-type": return visitTypeOptions;
            case "provider": return providerOptions;
            case "location": return locationOptions;
            case "calendar": return calendarOptions;
            default: return [];
        }
    }, [activeTab, visitTypeOptions, providerOptions, locationOptions, calendarOptions]);

    // Pleasant defaults for calendar background colors
    const calendarDefaults: Record<string, { bg: string; border: string }> = {
        'working-hours-bg': { bg: '#ffffff', border: '#e2e8f0' },       // clean white
        'non-working-hours-bg': { bg: '#f1f5f9', border: '#e2e8f0' },   // subtle cool gray
    };

    const mergedEntries = useMemo(() => {
        return (currentOptions || []).map((opt) => {
            const key = `${activeTab}:${opt.value}`;
            const local = localColors[key];
            const saved = savedColors[key];
            const isCalendar = activeTab === 'calendar';
            const defaultColor = isCalendar
                ? { bg: calendarDefaults[opt.value]?.bg || '#f0f9ff', border: calendarDefaults[opt.value]?.border || '#e0f2fe', text: '#1e293b' }
                : stringToHslColor(opt.label || opt.value);

            const bgColor = local?.bgColor || saved?.bgColor || defaultColor.bg;
            return {
                entityKey: opt.value,
                entityLabel: opt.label,
                bgColor,
                borderColor: local?.borderColor || saved?.borderColor || defaultColor.border,
                textColor: contrastText(bgColor),
                isCustomized: !!(local || saved),
            };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentOptions, activeTab, localColors, savedColors]);

    /* ─── Handle color change ─── */
    const handleColorChange = (entityKey: string, bgColor: string) => {
        const key = `${activeTab}:${entityKey}`;
        const opt = currentOptions.find((o) => o.value === entityKey);
        setLocalColors((prev) => ({
            ...prev,
            [key]: {
                entityKey,
                entityLabel: opt?.label || entityKey,
                bgColor,
                borderColor: darkenHex(bgColor, 30),
                textColor: contrastText(bgColor),
            },
        }));
    };

    /* ─── Save ─── */
    const handleSave = async () => {
        setSaving(true);
        setSaveMsg(null);
        try {
            // Build full list of entries for current tab
            const entries = mergedEntries.map((e) => ({
                category: activeTab,
                entityKey: e.entityKey,
                entityLabel: e.entityLabel,
                bgColor: e.bgColor,
                borderColor: e.borderColor,
                textColor: e.textColor,
            }));

            const res = await fetchWithAuth(`${API}/api/ui-colors`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entries),
            });
            const json = await res.json();
            if (json?.success) {
                setSaveMsg("Colors saved successfully!");
                setLocalColors({}); // clear local edits
                await loadSavedColors(); // refresh from server
            } else {
                setSaveMsg("Failed to save colors.");
            }
        } catch (err) {
            console.error("Save error:", err);
            setSaveMsg("Error saving colors.");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(null), 3000);
        }
    };

    const tabs: { key: Category; label: string }[] = [
        { key: "visit-type", label: "Visit Types" },
        { key: "provider", label: "Providers" },
        { key: "location", label: "Locations" },
        { key: "calendar", label: "Calendar" },
    ];

    return (
        <>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                            Calendar Colors
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Configure colors for visit types, providers, and locations on the calendar.
                            New items automatically get assigned a unique color.
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? "Saving..." : "Save Colors"}
                    </button>
                </div>

                {saveMsg && (
                    <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
                        saveMsg.includes("success")
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    }`}>
                        {saveMsg}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                activeTab === tab.key
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                            {tab.label}
                            <span className="ml-1.5 text-xs opacity-60">
                                ({activeTab === tab.key ? mergedEntries.length : "..."})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Color grid */}
                {mergedEntries.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <p className="text-lg">No {activeTab === "visit-type" ? "visit types" : activeTab === "provider" ? "providers" : "locations"} found.</p>
                        <p className="text-sm mt-1">
                            {activeTab === "visit-type"
                                ? "Visit types are loaded from the Appointments field configuration."
                                : `${activeTab === "provider" ? "Providers" : "Locations"} are loaded from the system.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mergedEntries.map((entry) => (
                            <div
                                key={entry.entityKey}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                            >
                                {/* Color preview + picker */}
                                <div className="relative flex-shrink-0">
                                    <div
                                        className="w-10 h-10 rounded-lg border-2 cursor-pointer shadow-sm"
                                        style={{
                                            backgroundColor: entry.bgColor,
                                            borderColor: entry.borderColor,
                                        }}
                                    />
                                    <input
                                        type="color"
                                        value={parseHslString(entry.bgColor)}
                                        onChange={(e) => handleColorChange(entry.entityKey, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        title={`Pick color for ${entry.entityLabel}`}
                                    />
                                </div>

                                {/* Label + preview badge */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                        {entry.entityLabel || entry.entityKey}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                                            style={{
                                                backgroundColor: entry.bgColor,
                                                color: entry.textColor,
                                                borderLeft: `3px solid ${entry.borderColor}`,
                                            }}
                                        >
                                            Preview
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {parseHslString(entry.bgColor).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info footer */}
                <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Colors are automatically assigned to new items. Click the color swatch to customize.
                        Changes are applied to the calendar after saving.
                    </p>
                </div>
            </div>
        </>
    );
}
