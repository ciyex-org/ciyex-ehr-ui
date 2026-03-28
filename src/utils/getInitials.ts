export function getInitials(firstName?: string, lastName?: string): string {
    const f = firstName?.trim()?.charAt(0) || "";
    const l = lastName?.trim()?.charAt(0) || "";
    return `${f}${l}`.toUpperCase();
}
