const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Parse a date string safely in the local timezone.
 *
 * `new Date("2026-02-22")` interprets date-only strings as UTC midnight,
 * which shifts backward in US timezones (e.g. shows Feb 21 instead of Feb 22).
 *
 * This function appends `T00:00:00` to date-only strings so they are
 * interpreted as local midnight instead.
 */
export function parseLocalDate(dateStr: string | undefined | null): Date {
    if (!dateStr) return new Date(NaN);
    // If it already contains a time component, parse as-is
    if (dateStr.includes("T") || dateStr.includes(" ")) return new Date(dateStr);
    // Date-only string (YYYY-MM-DD) → force local timezone
    return new Date(dateStr + "T00:00:00");
}

/**
 * Format a date value to MM/DD/YYYY display format (system standard).
 * Handles ISO strings (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss), Date objects,
 * Java array format [year, month, day, ...], and timestamps.
 * Returns "" for invalid/empty input.
 */
export function formatDisplayDate(value: unknown): string {
    if (value == null || value === "") return "";
    // Java array format: [year, month, day, hour?, min?, sec?]
    if (Array.isArray(value)) {
        const [y, m, d] = value;
        if (typeof y === "number" && typeof m === "number" && typeof d === "number") {
            return `${pad2(m)}/${pad2(d)}/${y}`;
        }
        return "";
    }
    let dateStr = typeof value === "number" ? new Date(value).toISOString() : String(value);
    if (!dateStr) return "";
    // Reject purely numeric strings (e.g. IDs like "131")
    if (/^\d+$/.test(dateStr)) return "";
    const d = parseLocalDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

/**
 * Format a date+time value to MM/DD/YYYY h:mm AM/PM display format.
 */
export function formatDisplayDateTime(value: unknown): string {
    if (value == null || value === "") return "";
    if (Array.isArray(value)) {
        const [y, m, d, h = 0, min = 0] = value;
        if (typeof y === "number" && typeof m === "number" && typeof d === "number") {
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${pad2(m)}/${pad2(d)}/${y} ${h12}:${pad2(min)} ${ampm}`;
        }
        return "";
    }
    let dateStr = typeof value === "number" ? new Date(value).toISOString() : String(value);
    if (!dateStr) return "";
    if (/^\d+$/.test(dateStr)) return "";
    const dt = parseLocalDate(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    const ampm = dt.getHours() >= 12 ? "PM" : "AM";
    const h12 = dt.getHours() === 0 ? 12 : dt.getHours() > 12 ? dt.getHours() - 12 : dt.getHours();
    return `${pad2(dt.getMonth() + 1)}/${pad2(dt.getDate())}/${dt.getFullYear()} ${h12}:${pad2(dt.getMinutes())} ${ampm}`;
}

/**
 * Format a date to ISO YYYY-MM-DD format (for storage/API).
 */
export function toISODate(value: unknown): string {
    if (value == null || value === "") return "";
    if (Array.isArray(value)) {
        const [y, m, d] = value;
        if (typeof y === "number" && typeof m === "number" && typeof d === "number") {
            return `${y}-${pad2(m)}-${pad2(d)}`;
        }
        return "";
    }
    const dateStr = String(value);
    if (/^\d+$/.test(dateStr)) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
    const dt = parseLocalDate(dateStr);
    if (isNaN(dt.getTime())) return "";
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
