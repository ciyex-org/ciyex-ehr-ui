"use client";


import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";

type Provider = {
    id: number;
    npi: string | null;
    identification: { firstName: string | null; lastName: string | null } | null;
    professionalDetails: { specialty: string | null; providerType: string | null } | null;
};

type Freq = "DAILY" | "WEEKLY" | "MONTHLY";

type PreviewOccurrence = {
    start: Date;
    end: Date;
    isOneTime?: boolean; // optional, so recurrence entries don't need it
};


type Location = {
    id: number;
    name: string;
    address?: string;
};



const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_CODES = ["SU","MO","TU","WE","TH","FR","SA"];

function toByWeekday(weeklyFlags: boolean[]): string[] {
    return WEEKDAY_CODES.filter((_, i) => weeklyFlags[i]);
}


function parseTimeToDate(base: Date, time: string) {
    const [hh, mm] = time.split(":").map((v) => parseInt(v || "0", 10));
    const d = new Date(base);
    d.setHours(hh, mm, 0, 0);
    return d;
}
function addDays(d: Date, n: number) {
    const t = new Date(d);
    t.setDate(t.getDate() + n);
    return t;
}
function addMonths(d: Date, n: number) {
    const t = new Date(d);
    const day = t.getDate();
    t.setMonth(t.getMonth() + n);
    if (t.getDate() < day) t.setDate(0);
    return t;
}

// Format date/time in local timezone (browser default)
function formatRange(s: Date, e: Date) {
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return "Invalid time range";
    }

    const datePart = new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
    }).format(s);

    const startTime = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(s);

    const endTime = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(e);

    return `${datePart}, ${startTime} – ${endTime}`;
}


function formatInputToMMDDYYYY(value: string): string {
    // Keep only digits
    const digits = value.replace(/\D/g, "");
    let result = "";

    if (digits.length > 0) {
        result += digits.substring(0, 2); // MM
    }
    if (digits.length >= 3) {
        result += "/" + digits.substring(2, 4); // DD
    }
    if (digits.length >= 5) {
        result += "/" + digits.substring(4, 8); // YYYY
    }

    return result;
}

function toISODateFromMMDDYYYY(val: string): string {
    const parts = val.split("/");
    if (parts.length === 3) {
        const [mm, dd, yyyy] = parts;
        if (mm && dd && yyyy && yyyy.length === 4) {
            return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        }
    }
    return "";
}
// ✅ Place it here (top-level, after imports/types, before Page component)
type RecurrenceDto = {
    frequency: Freq;
    interval: number;
    byWeekday?: string[];
    startDate: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    maxOccurrences: number;
    locationId?: string;
};

type ScheduleDto = {
    providerId: number;
    actorReferences: string[];
    timezone: string;
    status: string;
    comment?: string;
    start?: string;
    end?: string;
    recurrence: RecurrenceDto | null;
};

async function createSchedule(dto: ScheduleDto) {
    const res = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/schedules`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dto),
        }
    );

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to create schedule");
    }

    const json = await res.json();
    if (!json?.success) {
        throw new Error(json?.message || "Failed to create schedule");
    }
    return json.data;
}



const Page = () => {
  //  const { id } = useParams();
   const { id } = useParams() as { id: string };
    const router = useRouter();
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");

    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);

    // recurrence state
    const [freq, setFreq] = useState<Freq>("WEEKLY");
    const [interval, setInterval] = useState<number>(1);
    const [maxOccurrences, setMaxOccurrences] = useState<number>(10);
    const [weeklyDays, setWeeklyDays] = useState<boolean[]>([false, true, true, true, true, true, false]); // Mon–Fri
    const [startTime, setStartTime] = useState<string>("09:00");
    const [endTime, setEndTime] = useState<string>("");
    const [locations, setLocations] = useState<Location[]>([]);
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];
    const todayInput = `${String(today.getMonth() + 1).padStart(2,"0")}/${String(today.getDate()).padStart(2,"0")}/${today.getFullYear()}`;

    const [startDate, setStartDate] = useState<string>(todayISO);
    const [startDateInput, setStartDateInput] = useState<string>(todayInput);

    const [endDate, setEndDate] = useState<string>("");
    const [endDateInput, setEndDateInput] = useState<string>("");
    const [showRecurrence, setShowRecurrence] = useState(false);
    const [locationId, setLocationId] = useState<number | "">(""); // <- instead of location: string


    const [alertData, setAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);


    // one-time schedules
    type OneTimeSchedule = {
        dateInput: string;
        date: string;        // ISO yyyy-mm-dd
        startTime: string;
        endTime: string;
        locationId?: number; // <- was location?: string
    };

    const [oneTimeSchedules, setOneTimeSchedules] = useState<OneTimeSchedule[]>([]);


    // Fetch provider & other providers
    useEffect(() => {
        (async () => {
            try {
                const resProvider = await fetchWithAuth(`${apiUrl}/api/providers/${id}`, { method: "GET" });
                
                if (resProvider.ok) {
                    const data = await resProvider.json();
                    setProvider(data?.data ?? null);
                }
                
                // Fetch locations from API
                try {
                    const resLocations = await fetchWithAuth(`${apiUrl}/api/locations`, { method: "GET" });
                    if (resLocations.ok) {
                        const data = await resLocations.json();
                        if (data?.success && data?.data) {
                            // Handle paginated response
                            const locationData = data.data.content || data.data;
                            if (Array.isArray(locationData)) {
                                setLocations(locationData.map((loc: any) => ({
                                    id: loc.id,
                                    name: loc.name,
                                    address: loc.address
                                })));
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch locations:', error);
                    setAlertData({
                        variant: "warning",
                        title: "Warning",
                        message: "Failed to load locations. Please refresh the page."
                    });
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [apiUrl, id]);

    useEffect(() => {
        if (alertData) {
            const timer = setTimeout(() => setAlertData(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [alertData]);


// Preview calculation (recurrence + one-time)
    const preview = useMemo<PreviewOccurrence[]>(() => {
        try {
            const recurrences: PreviewOccurrence[] = [];

            // ✅ Skip recurrence preview if disabled or inputs are invalid
            if (
                !showRecurrence ||
                !startDate ||
                !startTime ||
                !endTime ||
                !endTime.includes(":")
            ) {
                return oneTimeSchedules.map((s) => {
                    const base = new Date(s.date);
                    return {
                        start: parseTimeToDate(base, s.startTime),
                        end: parseTimeToDate(base, s.endTime),
                        isOneTime: true,
                    };
                });
            }

            // ✅ Base validation
            const start = parseTimeToDate(new Date(startDate), startTime);
            const endCheck = parseTimeToDate(start, endTime);
            if (
                isNaN(start.getTime()) ||
                isNaN(endCheck.getTime()) ||
                endCheck <= start
            ) {
                return oneTimeSchedules.map((s) => {
                    const base = new Date(s.date);
                    return {
                        start: parseTimeToDate(base, s.startTime),
                        end: parseTimeToDate(base, s.endTime),
                        isOneTime: true,
                    };
                });
            }

            const endLimit = endDate ? new Date(endDate) : null;
            let cursor = new Date(start);

            // === DAILY ===
            if (freq === "DAILY") {
                let guard = 0;
                const MAX_GUARD = 1000;
                while (recurrences.length < maxOccurrences && guard < MAX_GUARD) {
                    guard++;
                    if (!endLimit || cursor <= addDays(endLimit, 1)) {
                        const s = new Date(cursor);
                        const e = parseTimeToDate(s, endTime);
                        if (!isNaN(e.getTime()) && e > s) {
                            recurrences.push({ start: s, end: e });
                        }
                        const next = addDays(cursor, interval);
                        if (next <= cursor) break;
                        cursor = next;
                    } else break;
                }
            }

            // === WEEKLY ===
            else if (freq === "WEEKLY") {
                let guard = 0;
                const MAX_GUARD = 2000;
                while (recurrences.length < maxOccurrences && guard < MAX_GUARD) {
                    guard++;
                    for (let dow = 0; dow < 7 && recurrences.length < maxOccurrences; dow++) {
                        const d = addDays(cursor, dow);
                        if (weeklyDays[d.getDay()]) {
                            const s = parseTimeToDate(d, startTime);
                            const e = parseTimeToDate(d, endTime);
                            if (
                                (!endLimit || s <= addDays(endLimit, 1)) &&
                                !isNaN(e.getTime()) &&
                                e > s
                            ) {
                                recurrences.push({ start: s, end: e });
                            }
                        }
                    }
                    const next = addDays(cursor, 7 * interval);
                    if (next <= cursor) break;
                    cursor = next;
                    if (endLimit && cursor > addDays(endLimit, 1)) break;
                }
            }

            // === MONTHLY ===
            else if (freq === "MONTHLY") {
                const targetDay = new Date(startDate).getDate();
                let monthCursor = new Date(start);
                let guard = 0;
                const MAX_GUARD = 1000;
                while (recurrences.length < maxOccurrences && guard < MAX_GUARD) {
                    guard++;
                    if (!endLimit || monthCursor <= addDays(endLimit, 1)) {
                        const s = parseTimeToDate(monthCursor, startTime);
                        const e = parseTimeToDate(monthCursor, endTime);
                        if (!isNaN(e.getTime()) && e > s) {
                            recurrences.push({ start: s, end: e });
                        }
                        const nextMonth = addMonths(monthCursor, interval);
                        const fix = new Date(nextMonth);
                        fix.setDate(
                            Math.min(
                                targetDay,
                                new Date(fix.getFullYear(), fix.getMonth() + 1, 0).getDate()
                            )
                        );
                        if (fix <= monthCursor) break;
                        monthCursor = fix;
                    } else break;
                }
            }

            // ✅ Always include one-time schedules
            const oneTimes: PreviewOccurrence[] = oneTimeSchedules
                .filter((s) => s.date && s.startTime && s.endTime)
                .map((s) => {
                    const base = new Date(s.date);
                    return {
                        start: parseTimeToDate(base, s.startTime),
                        end: parseTimeToDate(base, s.endTime),
                        isOneTime: true,
                    };
                });

            return [...recurrences, ...oneTimes].sort(
                (a, b) => a.start.getTime() - b.start.getTime()
            );
        } catch {
            return [];
        }
    }, [
        startDate,
        endDate,
        startTime,
        endTime,
        freq,
        interval,
        maxOccurrences,
        weeklyDays,
        oneTimeSchedules,
        showRecurrence,
    ]);







    const fullName = provider
        ? `${provider.identification?.firstName ?? ""} ${provider.identification?.lastName ?? ""}`.trim()
        : "";

    return (
        <AdminLayout>
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {loading
                                ? "Loading provider…"
                                : fullName
                                    ? `${fullName} • ${provider?.professionalDetails?.specialty ?? ""}`
                                    : "—"}
                        </p>
                    </div>
                </div>

                {alertData && (
                    <div className="mb-4">
                        <Alert
                            variant={alertData.variant}
                            title={alertData.title}
                            message={alertData.message}
                        />
                    </div>
                )}



                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left: Form */}
                    <div className="lg:col-span-3 space-y-6">


                        {/* One-Time Schedules Card */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                                        One-Time Schedules
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Add specific dates/times in addition to recurring schedule
                                    </p>
                                </div>

                                {/* ✅ Add Schedule button */}
                                <Button
                                    variant="primary"
                                    onClick={() =>
                                        setOneTimeSchedules((prev) => [
                                            ...prev,
                                            { dateInput: "", date: "", startTime: "09:00", endTime: "" },
                                        ])
                                    }
                                >
                                    Add Schedule
                                </Button>
                            </div>

                            {/* Existing inputs stay here */}
                            {oneTimeSchedules.map((s, idx) => (
                                <div
                                    key={idx}
                                    className="grid grid-cols-5 gap-3 mt-4 p-4
             border border-gray-200 dark:border-gray-700
             rounded-lg
             bg-gray-50 dark:bg-slate-800
             items-center"
                                >

                                {/* Date */}
                                    <input
                                        type="text"
                                        value={s.dateInput}
                                        placeholder="MM/DD/YYYY"
                                        onChange={(e) => {
                                            const formatted = formatInputToMMDDYYYY(e.target.value);
                                            const iso = toISODateFromMMDDYYYY(formatted);
                                            const copy = [...oneTimeSchedules];
                                            copy[idx].dateInput = formatted;
                                            copy[idx].date = iso;
                                            setOneTimeSchedules(copy);
                                        }}
                                        className="h-10 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 px-2 text-sm"                                    />

                                    {/* Start Time */}
                                    <input
                                        type="time"
                                        value={s.startTime}
                                        onChange={(e) => {
                                            const copy = [...oneTimeSchedules];
                                            copy[idx].startTime = e.target.value;
                                            setOneTimeSchedules(copy);
                                        }}
                                        className="h-10 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 px-2 text-sm"                                    />

                                    {/* End Time */}
                                    <input
                                        type="time"
                                        value={s.endTime}
                                        onChange={(e) => {
                                            const copy = [...oneTimeSchedules];
                                            copy[idx].endTime = e.target.value;
                                            setOneTimeSchedules(copy);
                                        }}
                                        className="h-10 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 px-2 text-sm"                                    />

                                    {/* Location */}
                                    <select
                                        value={s.locationId ?? ""}
                                        onChange={(e) => {
                                            const copy = [...oneTimeSchedules];
                                            copy[idx].locationId = e.target.value ? Number(e.target.value) : undefined;
                                            setOneTimeSchedules(copy);
                                        }}
                                        className="h-10 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 px-2 text-sm"                                    >
                                        <option value="">Select Location</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name} {loc.address ? ` - ${loc.address}` : ""}
                                            </option>
                                        ))}
                                    </select>




                                    {/* Delete */}
                                    <div className="flex justify-end">
                                        <Button
                                            variant="primary"
                                            onClick={() =>
                                                setOneTimeSchedules((prev) => prev.filter((_, i) => i !== idx))
                                            }
                                            className="h-10 px-4 text-sm"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>



                        {/* Recurrence (mirrors One-Time Schedules) */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">Recurrence</h3>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Define repeating availability in addition to one-time schedules.
                                    </p>
                                </div>

                                <Button
                                    variant="primary"
                                    onClick={() => setShowRecurrence((prev) => !prev)}
                                    aria-expanded={showRecurrence}
                                    aria-controls="recurrence-card"
                                >
                                    {showRecurrence ? "Hide Recurrence" : "Add Recurrence"}
                                </Button>
                            </div>

                            {showRecurrence && (
                                <div id="recurrence-card" className="mt-6 border-t border-gray-100 pt-6">
                                    {/* Frequency */}
                                    <div className="mt-0">
                                        <label className="block text-sm font-medium text-gray-700">Frequency</label>
                                        <div className="mt-2 flex gap-2">
                                            {(["DAILY", "WEEKLY", "MONTHLY"] as Freq[]).map((f) => (
                                                <button
                                                    key={f}
                                                    type="button"
                                                    onClick={() => setFreq(f)}
                                                    className={[
                                                        "rounded-full border px-3 py-1.5 text-sm",
                                                        freq === f
                                                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                            : "border-gray-300 text-gray-700",
                                                    ].join(" ")}
                                                    aria-pressed={freq === f}
                                                >
                                                    {f.charAt(0) + f.slice(1).toLowerCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Interval */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">Every</label>
                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                value={interval}
                                                onChange={(e) => setInterval(Math.max(1, Number(e.target.value || 1)))}
                                                className="h-10 w-20 rounded-lg border border-gray-300 px-3 text-sm"
                                            />
                                            <span className="text-sm text-gray-600">
            {freq === "DAILY" ? "day(s)" : freq === "WEEKLY" ? "week(s)" : "month(s)"}
          </span>
                                        </div>
                                    </div>

                                    {/* Weekly day picker */}
                                    {freq === "WEEKLY" && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700">Repeat On</label>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {dayNames.map((d, idx) => (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() =>
                                                            setWeeklyDays((prev) => {
                                                                const c = [...prev];
                                                                c[idx] = !c[idx];
                                                                return c;
                                                            })
                                                        }
                                                        className={[
                                                            "w-10 rounded-full border px-0 py-1.5 text-sm",
                                                            weeklyDays[idx]
                                                                ? "border-indigo-600 bg-indigo-600 text-white"
                                                                : "border-gray-300 text-gray-700",
                                                        ].join(" ")}
                                                        aria-pressed={weeklyDays[idx]}
                                                    >
                                                        {d[0]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dates */}
                                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                                            <input
                                                type="text"
                                                value={startDateInput}
                                                placeholder="MM/DD/YYYY"
                                                onChange={(e) => {
                                                    const formatted = formatInputToMMDDYYYY(e.target.value);
                                                    setStartDateInput(formatted);
                                                    const iso = toISODateFromMMDDYYYY(formatted);
                                                    if (iso) setStartDate(iso);
                                                    else setStartDate("");
                                                }}
                                                className="mt-2 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                                            <input
                                                type="text"
                                                value={endDateInput}
                                                placeholder="MM/DD/YYYY"
                                                onChange={(e) => {
                                                    const formatted = formatInputToMMDDYYYY(e.target.value);
                                                    setEndDateInput(formatted);
                                                    const iso = toISODateFromMMDDYYYY(formatted);
                                                    if (iso) setEndDate(iso);
                                                    else setEndDate("");
                                                }}
                                                className="mt-2 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Time + Duration + Location */}
                                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="mt-2 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">End Time</label>
                                            <input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="mt-2 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Location</label>
                                            <div className="mt-2">
                                                <select
                                                    value={locationId}
                                                    onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : "")}
                                                    className="block w-full h-10 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 px-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"                                                >
                                                    <option value="">Select Location</option>
                                                    {locations.map((loc) => (
                                                        <option key={loc.id} value={loc.id}>
                                                            {loc.name} {loc.address ? ` - ${loc.address}` : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Occurrence cap */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Max Occurrences (preview & save)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={maxOccurrences}
                                            onChange={(e) => setMaxOccurrences(Math.max(1, Number(e.target.value || 1)))}
                                            className="mt-2 h-10 w-32 rounded-lg border border-gray-300 px-3 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex justify-end gap-2">
                            <Button variant="primary" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    try {
                                        // basic validation
                                        if (!provider?.id) throw new Error("Provider not loaded.");
                                        if (showRecurrence && !endTime?.trim()) {
                                            throw new Error("Please choose an end time for recurrence.");
                                        }

                                        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

                                        // shared actors: Practitioner + optional Location
                                        const actorReferences: string[] = [`Practitioner/${provider.id}`];
                                        if (locationId) actorReferences.push(`Location/${locationId}`);

                                        // ===== (A) Recurrence schedule (single DTO) =====
                                        const created: ScheduleDto[] = [];
                                        if (showRecurrence && startDate && startTime && endTime) {
                                            const recurrenceDto = {
                                                // ScheduleDto (server computes id/orgId)
                                                providerId: Number(id),
                                                externalId: undefined, // not set here
                                                actorReferences,
                                                timezone: tz,
                                                status: "active",

                                                // one-time window not used for recurrence:
                                                start: undefined,
                                                end: undefined,

                                                recurrence: {
                                                    frequency: freq,                  // "DAILY" | "WEEKLY" | "MONTHLY"
                                                    interval,                         // every n
                                                    byWeekday: freq === "WEEKLY" ? toByWeekday(weeklyDays) : undefined,
                                                    startDate,                        // yyyy-MM-dd
                                                    endDate: endDate || undefined,    // yyyy-MM-dd (optional)
                                                    startTime,                        // HH:mm
                                                    endTime,                          // HH:mm
                                                    maxOccurrences,                   // preview cap
                                                    locationId: locationId ? String(locationId) : undefined, // ✅ pass ID, not name
                                                },
                                            };

                                            const r = await createSchedule(recurrenceDto);
                                            created.push(r);
                                        }

                                        // ===== (B) One-time schedules (one DTO per row) =====
                                        const oneTimeRows = oneTimeSchedules.filter(
                                            (s) => s.date && s.startTime && s.endTime
                                        );

                                        for (const row of oneTimeRows) {
                                            const rowActors = [`Practitioner/${provider.id}`];
                                            if (row.locationId) rowActors.push(`Location/${row.locationId}`);

                                            // combine date + times into ISO-8601 instants in local TZ
                                            const startISO = new Date(`${row.date}T${row.startTime}:00`).toISOString();
                                            const endISO = new Date(`${row.date}T${row.endTime}:00`).toISOString();

                                            const oneTimeDto = {
                                                providerId: Number(id),
                                                actorReferences: rowActors,
                                                timezone: tz,
                                                status: "active",

                                                // One-time window
                                                start: startISO, // ISO-8601
                                                end: endISO,     // ISO-8601

                                                // No recurrence
                                                recurrence: null,
                                            };

                                            const r = await createSchedule(oneTimeDto);
                                            created.push(r);
                                        }

                                        if (created.length === 0) {
                                            alert("Nothing to save. Add a recurrence or one-time row.");
                                            return;
                                        }

                                        setAlertData({
                                            variant: "success",
                                            title: "Schedule Saved",
                                            message: `Created ${created.length} schedule(s) successfully.`,
                                        });
                                        router.push(`/settings/providers/schedule/${id}`);
                                    } catch (e: unknown) {
                                        console.error(e);
                                        setAlertData({
                                            variant: "error",
                                            title: "Error",
                                            message: e instanceof Error ? e.message : "Failed to create schedule(s).",
                                        });
                                    }
                                }}
                            >
                                Save Schedule
                            </Button>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Preview</h2>                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Next {Math.min(preview.length, 10)} occurrence(s)
                        </p>

                        <div className="mt-4 space-y-2">
                            {preview.length === 0 ? (
                                <div className="text-sm text-slate-500 dark:text-slate-400">No occurrences with the current settings.</div>
                            ) : (
                                preview.slice(0, 10).map((o, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                                    >
                                        {formatRange(o.start, o.end)}
                                        {o.isOneTime && (
                                            <span className="ml-2 text-xs text-indigo-600 font-medium">(One-Time)</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 rounded-lg bg-gray-50 dark:bg-slate-800/40 p-3 text-xs text-slate-600 dark:text-slate-400">                            The preview uses your browser’s <strong>local timezone</strong>. Location is stored as text only.
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Page;
