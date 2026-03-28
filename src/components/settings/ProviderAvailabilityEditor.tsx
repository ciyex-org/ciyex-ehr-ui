"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
    Plus, Pencil, Trash2, X, Save, Loader2,
    MapPin, Clock, Calendar, ChevronDown, ChevronUp,
} from "lucide-react";

import DateInput from "@/components/ui/DateInput";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/* ========================= Types ========================= */

interface Recurrence {
    frequency: "WEEKLY" | "MONTHLY" | "DAILY";
    interval: number;
    byWeekday?: string[];
    startDate: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    locationId?: string;
}

interface ScheduleBlock {
    id?: number;
    fhirId?: string;
    providerId?: number;
    status: string;
    recurrence?: Recurrence | null;
    start?: string;
    end?: string;
    timezone?: string;
    serviceType?: string;
    actorReferences?: string[];
    // Local UI state
    _editing?: boolean;
    _new?: boolean;
}

interface Location {
    id: number;
    name: string;
    timezone?: string;
}

interface ProviderAvailabilityEditorProps {
    providerId: number | string | undefined;
    readOnly?: boolean;
}

/* ========================= Constants ========================= */

const WEEKDAYS = [
    { code: "MO", label: "Mon" },
    { code: "TU", label: "Tue" },
    { code: "WE", label: "Wed" },
    { code: "TH", label: "Thu" },
    { code: "FR", label: "Fri" },
    { code: "SA", label: "Sat" },
    { code: "SU", label: "Sun" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
        TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
}

const formatTime12 = (hm: string) => {
    const [h, m] = hm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const PATTERN_OPTIONS = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Every 2 Weeks" },
    { value: "custom-weekly", label: "Custom Interval (weeks)" },
    { value: "monthly-day", label: "Monthly (day of month)" },
    { value: "monthly-weekday", label: "Monthly (nth weekday)" },
];

const NTH_WEEK = [
    { value: "first", label: "First" },
    { value: "second", label: "Second" },
    { value: "third", label: "Third" },
    { value: "fourth", label: "Fourth" },
    { value: "last", label: "Last" },
];

/* ========================= Helpers ========================= */

function describeSchedule(block: ScheduleBlock): string {
    const r = block.recurrence;
    if (!r) return "One-time";

    let pattern = "";
    if (r.frequency === "WEEKLY") {
        if (r.interval === 1) pattern = "Every week";
        else if (r.interval === 2) pattern = "Every 2 weeks";
        else pattern = `Every ${r.interval} weeks`;
        if (r.byWeekday?.length) {
            const dayLabels = r.byWeekday.map(d => WEEKDAYS.find(w => w.code === d)?.label || d);
            pattern += ` · ${dayLabels.join(", ")}`;
        }
    } else if (r.frequency === "MONTHLY") {
        pattern = r.interval === 1 ? "Monthly" : `Every ${r.interval} months`;
        if (r.startDate) {
            const day = new Date(`${r.startDate}T00:00:00`).getDate();
            pattern += ` · Day ${day}`;
        }
    } else if (r.frequency === "DAILY") {
        pattern = r.interval === 1 ? "Daily" : `Every ${r.interval} days`;
    }

    return pattern;
}

function getLocationFromBlock(block: ScheduleBlock): string | null {
    if (block.recurrence?.locationId) return block.recurrence.locationId;
    const refs = block.actorReferences || [];
    const locRef = refs.find(r => r.startsWith("Location/"));
    return locRef ? locRef.split("/")[1] : null;
}

function patternFromRecurrence(r?: Recurrence | null): string {
    if (!r) return "weekly";
    if (r.frequency === "MONTHLY") return "monthly-day";
    if (r.frequency === "WEEKLY") {
        if (r.interval === 2) return "biweekly";
        if (r.interval > 2) return "custom-weekly";
        return "weekly";
    }
    return "weekly";
}

/* ========================= Component ========================= */

export default function ProviderAvailabilityEditor({
    providerId,
    readOnly = false,
}: ProviderAvailabilityEditorProps) {
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [practiceTimezone, setPracticeTimezone] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Inline edit form state
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(defaultForm());

    const loadData = useCallback(async () => {
        if (!providerId) return;
        setLoading(true);
        try {
            const [schedRes, locRes, practiceRes] = await Promise.all([
                fetchWithAuth(`${API_BASE()}/api/providers/${providerId}/availability`),
                fetchWithAuth(`${API_BASE()}/api/locations`),
                fetchWithAuth(`${API_BASE()}/api/practices`),
            ]);

            if (schedRes.ok) {
                const data = await schedRes.json();
                const list = data.data || data || [];
                setBlocks(Array.isArray(list) ? list : []);
            }

            if (locRes.ok) {
                const locData = await locRes.json();
                const locList = locData.data?.content || locData.data || locData.content || locData || [];
                setLocations(Array.isArray(locList) ? locList.map((l: any) => ({
                    id: l.id || l.fhirId,
                    name: l.name || l.facilityName || `Location ${l.id}`,
                    timezone: l.timezone || undefined,
                })) : []);
            }

            if (practiceRes.ok) {
                const practiceData = await practiceRes.json();
                const practices = practiceData.data || [];
                if (Array.isArray(practices) && practices.length > 0) {
                    const tz = practices[0]?.regionalSettings?.timeZone;
                    if (tz) setPracticeTimezone(tz);
                }
            }
        } catch (e: any) {
            setError("Failed to load availability data");
        } finally {
            setLoading(false);
        }
    }, [providerId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-clear notifications
    useEffect(() => {
        if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
    }, [success]);
    useEffect(() => {
        if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
    }, [error]);

    /* ---------- Save all blocks ---------- */
    const handleSaveAll = async () => {
        if (!providerId) return;
        setSaving(true);
        setError(null);
        try {
            const payload = blocks.map(b => {
                const { _editing, _new, ...rest } = b;
                return rest;
            });
            const res = await fetchWithAuth(`${API_BASE()}/api/providers/${providerId}/availability`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                setBlocks(data.data || []);
                setSuccess("Availability saved successfully");
            } else {
                setError("Failed to save availability");
            }
        } catch {
            setError("Failed to save availability");
        } finally {
            setSaving(false);
        }
    };

    /* ---------- Add new block ---------- */
    const handleAddBlock = () => {
        setForm(defaultForm());
        setEditingIdx(-1); // -1 = new block
    };

    /* ---------- Edit existing block ---------- */
    const handleEditBlock = (idx: number) => {
        const block = blocks[idx];
        const r = block.recurrence;
        setForm({
            locationId: getLocationFromBlock(block) || "",
            pattern: patternFromRecurrence(r),
            daysOfWeek: r?.byWeekday || ["MO", "TU", "WE", "TH", "FR"],
            weekInterval: r?.interval || 1,
            dayOfMonth: r?.startDate ? new Date(`${r.startDate}T00:00:00`).getDate() : 1,
            monthInterval: r?.interval || 1,
            startTime: r?.startTime || "08:00",
            endTime: r?.endTime || "17:00",
            effectiveFrom: r?.startDate || new Date().toISOString().slice(0, 10),
            effectiveTo: r?.endDate || "",
            serviceType: block.serviceType || "Office Visit",
            status: block.status || "active",
        });
        setEditingIdx(idx);
    };

    /* ---------- Delete block ---------- */
    const handleDeleteBlock = (idx: number) => {
        setBlocks(prev => prev.filter((_, i) => i !== idx));
    };

    /* ---------- Save form into blocks array ---------- */
    const handleFormSave = () => {
        const block = formToScheduleBlock(form, providerId, locations, practiceTimezone);
        if (editingIdx === -1) {
            // New
            setBlocks(prev => [...prev, block]);
        } else if (editingIdx !== null) {
            // Edit - preserve fhirId
            setBlocks(prev => prev.map((b, i) => i === editingIdx ? { ...block, fhirId: b.fhirId, id: b.id } : b));
        }
        setEditingIdx(null);
    };

    const handleFormCancel = () => setEditingIdx(null);

    /* ---------- Render ---------- */

    if (!providerId) {
        return (
            <div className="p-4 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                Save the provider first to manage availability schedules.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading availability...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Notifications */}
            {success && (
                <div className="px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md border border-green-200">
                    {success}
                </div>
            )}
            {error && (
                <div className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Schedule Blocks</h4>
                <div className="flex items-center gap-2">
                    {!readOnly && (
                        <>
                            <button
                                onClick={handleAddBlock}
                                disabled={editingIdx !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Block
                            </button>
                            <button
                                onClick={handleSaveAll}
                                disabled={saving || editingIdx !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save All
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Block list */}
            {blocks.length === 0 && editingIdx === null && (
                <div className="p-6 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    No availability blocks configured. Add a block to define when this provider is available for appointments.
                </div>
            )}

            {blocks.map((block, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg bg-white">
                    {editingIdx === idx ? (
                        <BlockForm
                            form={form}
                            setForm={setForm}
                            locations={locations}
                            onSave={handleFormSave}
                            onCancel={handleFormCancel}
                        />
                    ) : (
                        <BlockCard
                            block={block}
                            locations={locations}
                            readOnly={readOnly}
                            onEdit={() => handleEditBlock(idx)}
                            onDelete={() => handleDeleteBlock(idx)}
                        />
                    )}
                </div>
            ))}

            {/* New block form */}
            {editingIdx === -1 && (
                <div className="border border-blue-200 rounded-lg bg-blue-50/30">
                    <BlockForm
                        form={form}
                        setForm={setForm}
                        locations={locations}
                        onSave={handleFormSave}
                        onCancel={handleFormCancel}
                        isNew
                    />
                </div>
            )}
        </div>
    );
}

/* ========================= Form State ========================= */

interface FormState {
    locationId: string;
    pattern: string;
    daysOfWeek: string[];
    weekInterval: number;
    dayOfMonth: number;
    monthInterval: number;
    startTime: string;
    endTime: string;
    effectiveFrom: string;
    effectiveTo: string;
    serviceType: string;
    status: string;
}

function defaultForm(): FormState {
    return {
        locationId: "",
        pattern: "weekly",
        daysOfWeek: ["MO", "TU", "WE", "TH", "FR"],
        weekInterval: 1,
        dayOfMonth: 1,
        monthInterval: 1,
        startTime: "08:00",
        endTime: "17:00",
        effectiveFrom: new Date().toISOString().slice(0, 10),
        effectiveTo: "",
        serviceType: "Office Visit",
        status: "active",
    };
}

function resolveTimezone(
    locationId: string | undefined,
    locations: Location[],
    practiceTimezone: string | null,
): string {
    // 1. Location-level timezone
    if (locationId) {
        const loc = locations.find(l => String(l.id) === String(locationId));
        if (loc?.timezone) return loc.timezone;
    }
    // 2. Practice-level timezone
    if (practiceTimezone) return practiceTimezone;
    // 3. Browser timezone (last resort)
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formToScheduleBlock(
    form: FormState,
    providerId: number | string | undefined,
    locations: Location[],
    practiceTimezone: string | null,
): ScheduleBlock {
    const isMonthly = form.pattern.startsWith("monthly");
    const interval = isMonthly
        ? form.monthInterval
        : form.pattern === "biweekly"
            ? 2
            : form.weekInterval;

    const recurrence: Recurrence = {
        frequency: isMonthly ? "MONTHLY" : "WEEKLY",
        interval,
        byWeekday: isMonthly ? undefined : form.daysOfWeek,
        startDate: form.effectiveFrom,
        endDate: form.effectiveTo || undefined,
        startTime: form.startTime,
        endTime: form.endTime,
        locationId: form.locationId || undefined,
    };

    // For monthly-day, set startDate to the desired day
    if (form.pattern === "monthly-day" && form.dayOfMonth) {
        const base = new Date(`${form.effectiveFrom}T00:00:00`);
        base.setDate(form.dayOfMonth);
        recurrence.startDate = base.toISOString().slice(0, 10);
    }

    const block: ScheduleBlock = {
        providerId: providerId ? Number(providerId) : undefined,
        status: form.status,
        timezone: resolveTimezone(form.locationId, locations, practiceTimezone),
        serviceType: form.serviceType,
        recurrence,
        actorReferences: form.locationId ? [`Location/${form.locationId}`] : [],
    };

    return block;
}

/* ========================= Sub-Components ========================= */

function BlockCard({
    block,
    locations,
    readOnly,
    onEdit,
    onDelete,
}: {
    block: ScheduleBlock;
    locations: Location[];
    readOnly: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const locId = getLocationFromBlock(block);
    const locName = locId ? locations.find(l => String(l.id) === String(locId))?.name || `Location #${locId}` : "All Locations";
    const r = block.recurrence;
    const isActive = block.status === "active";

    return (
        <div className="p-3 flex items-start gap-3">
            <MapPin className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900">{locName}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
                        {isActive ? "Active" : "Inactive"}
                    </span>
                    {block.serviceType && (
                        <span className="text-[10px] text-gray-400">{block.serviceType}</span>
                    )}
                </div>
                <div className="text-xs text-gray-600 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {describeSchedule(block)}
                    </div>
                    {r && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {formatTime12(r.startTime)} – {formatTime12(r.endTime)}
                        </div>
                    )}
                    {r && (
                        <div className="text-[11px] text-gray-400">
                            Effective: {r.startDate}{r.endDate ? ` → ${r.endDate}` : " → ongoing"}
                        </div>
                    )}
                </div>
            </div>
            {!readOnly && (
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function BlockForm({
    form,
    setForm,
    locations,
    onSave,
    onCancel,
    isNew = false,
}: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    locations: Location[];
    onSave: () => void;
    onCancel: () => void;
    isNew?: boolean;
}) {
    const update = (key: keyof FormState, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    const toggleDay = (code: string) => {
        setForm(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(code)
                ? prev.daysOfWeek.filter(d => d !== code)
                : [...prev.daysOfWeek, code],
        }));
    };

    const isWeekly = form.pattern === "weekly" || form.pattern === "biweekly" || form.pattern === "custom-weekly";
    const isMonthly = form.pattern.startsWith("monthly");

    return (
        <div className="p-4 space-y-4">
            <h5 className="text-sm font-semibold text-gray-700">{isNew ? "Add Schedule Block" : "Edit Schedule Block"}</h5>

            {/* Row 1: Location + Status */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                    <select
                        value={form.locationId}
                        onChange={e => update("locationId", e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Locations</option>
                        {locations.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Service Type</label>
                    <select
                        value={form.serviceType}
                        onChange={e => update("serviceType", e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="Office Visit">Office Visit</option>
                        <option value="Telehealth">Telehealth</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Consultation">Consultation</option>
                        <option value="Procedure">Procedure</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                        value={form.status}
                        onChange={e => update("status", e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Row 2: Recurrence Pattern */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recurrence Pattern</label>
                <div className="flex flex-wrap gap-2">
                    {PATTERN_OPTIONS.map(opt => (
                        <label key={opt.value} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                                type="radio"
                                name="pattern"
                                value={opt.value}
                                checked={form.pattern === opt.value}
                                onChange={() => {
                                    update("pattern", opt.value);
                                    if (opt.value === "biweekly") update("weekInterval", 2);
                                    else if (opt.value === "weekly") update("weekInterval", 1);
                                }}
                                className="text-blue-600"
                            />
                            <span className="text-gray-700">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Row 3: Pattern-specific fields */}
            {isWeekly && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Days of Week</label>
                        <div className="flex gap-1">
                            {WEEKDAYS.map(day => (
                                <button
                                    key={day.code}
                                    type="button"
                                    onClick={() => toggleDay(day.code)}
                                    className={`h-8 w-10 text-xs font-medium rounded-md border transition-colors ${
                                        form.daysOfWeek.includes(day.code)
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {form.pattern === "custom-weekly" && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Repeat every</span>
                            <input
                                type="number"
                                min={1}
                                max={52}
                                value={form.weekInterval}
                                onChange={e => update("weekInterval", parseInt(e.target.value) || 1)}
                                className="w-16 h-8 px-2 text-xs border border-gray-300 rounded-md text-center"
                            />
                            <span className="text-xs text-gray-600">week(s)</span>
                        </div>
                    )}
                </div>
            )}

            {form.pattern === "monthly-day" && (
                <div className="flex items-center gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Day of Month</label>
                        <select
                            value={form.dayOfMonth}
                            onChange={e => update("dayOfMonth", parseInt(e.target.value))}
                            className="w-20 h-8 px-2 text-xs border border-gray-300 rounded-md"
                        >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Every N months</label>
                        <input
                            type="number"
                            min={1}
                            max={12}
                            value={form.monthInterval}
                            onChange={e => update("monthInterval", parseInt(e.target.value) || 1)}
                            className="w-16 h-8 px-2 text-xs border border-gray-300 rounded-md text-center"
                        />
                    </div>
                </div>
            )}

            {form.pattern === "monthly-weekday" && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-600">The</span>
                    <select
                        value={form.dayOfMonth}
                        onChange={e => update("dayOfMonth", parseInt(e.target.value))}
                        className="h-8 px-2 text-xs border border-gray-300 rounded-md"
                    >
                        {NTH_WEEK.map((n, i) => (
                            <option key={n.value} value={i + 1}>{n.label}</option>
                        ))}
                    </select>
                    <select
                        value={form.daysOfWeek[0] || "MO"}
                        onChange={e => update("daysOfWeek", [e.target.value])}
                        className="h-8 px-2 text-xs border border-gray-300 rounded-md"
                    >
                        {WEEKDAYS.map(d => (
                            <option key={d.code} value={d.code}>{d.label}</option>
                        ))}
                    </select>
                    <span className="text-xs text-gray-600">of every</span>
                    <input
                        type="number"
                        min={1}
                        max={12}
                        value={form.monthInterval}
                        onChange={e => update("monthInterval", parseInt(e.target.value) || 1)}
                        className="w-12 h-8 px-2 text-xs border border-gray-300 rounded-md text-center"
                    />
                    <span className="text-xs text-gray-600">month(s)</span>
                </div>
            )}

            {/* Row 4: Time + Effective dates */}
            <div className="grid grid-cols-4 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                    <select
                        value={form.startTime}
                        onChange={e => update("startTime", e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md"
                    >
                        {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{formatTime12(t)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                    <select
                        value={form.endTime}
                        onChange={e => update("endTime", e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md"
                    >
                        {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{formatTime12(t)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Effective From</label>
                    <DateInput
                        value={form.effectiveFrom}
                        onChange={e => update("effectiveFrom", e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Effective To (optional)</label>
                    <DateInput
                        value={form.effectiveTo}
                        onChange={e => update("effectiveTo", e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                    onClick={onCancel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                    onClick={onSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                    <Save className="w-3.5 h-3.5" /> {isNew ? "Add Block" : "Update Block"}
                </button>
            </div>
        </div>
    );
}
