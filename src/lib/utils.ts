import { getEnv } from "@/utils/env";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and tailwind-merge
 * This utility handles conditional classes and merges Tailwind CSS classes properly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse JSON from a Response object
 * Handles empty responses and non-JSON content gracefully
 */
export async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Get organization ID from localStorage or environment
 */
export function getOrgId(): number {
  if (typeof window === "undefined") return 1;
  const stored = window.localStorage.getItem("orgId");
  if (stored) {
    const n = Number(stored);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const envId = getEnv("NEXT_PUBLIC_ORG_ID");
  if (envId) {
    const n = Number(envId);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

/**
 * Format date from various formats to YYYY-MM-DD string
 */
export function formatDate(d?: string | number[] | null): string {
  if (!d) return "";
  if (Array.isArray(d)) {
    const [y, m, day, h = 0, min = 0] = d;
    const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day), Number(h), Number(min)));
    return dt.toISOString().slice(0, 10);
  }
  return String(d).slice(0, 10);
}

/**
 * Escape HTML special characters for safe rendering
 */
export function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(s).replace(/[&<>"']/g, (m) => map[m] || m);
}
