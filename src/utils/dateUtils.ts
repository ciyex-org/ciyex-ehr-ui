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
