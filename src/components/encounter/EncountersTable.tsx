"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { formatDisplayDate } from "@/utils/dateUtils";
import { Loader2, ExternalLink } from "lucide-react";

type EncounterStatus = "SIGNED" | "INCOMPLETE" | "UNSIGNED";
type Tab = "ALL" | EncounterStatus;

type Encounter = {
    id: number;
    patientId: number;
    encounterDate?: string | number[] | number | null;
    visitCategory?: string | null;
    status?: EncounterStatus | null;
    patientName?: string | null;
    encounterProvider?: string | null;
    reason?: string | null;
};

function toDate(value: Encounter["encounterDate"]): Date | null {
    if (value == null) return null;
    if (Array.isArray(value)) {
        const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
        return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss);
    }
    if (typeof value === "number") {
        return new Date(value < 1e12 ? value * 1000 : value);
    }
    if (typeof value === "string") {
        const d = new Date(value.includes("T") ? value : value.replace(" ", "T"));
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function normalizeData(data: unknown): Encounter[] {
    if (!data) return [];
    let list: Record<string, unknown>[] = [];
    if (Array.isArray(data)) list = data;
    else {
        const rec = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
        if (Array.isArray(rec.content)) list = rec.content;
    }
    return list.map((e) => {
        // Extract date from period object if needed
        const periodStart = e.period && typeof e.period === "object" && (e.period as any).start ? (e.period as any).start : null;
        const actualPeriodStart = e.actualPeriod && typeof e.actualPeriod === "object" && (e.actualPeriod as any).start ? (e.actualPeriod as any).start : null;
        return {
            ...e,
            id: e.id as number,
            patientId: e.patientId as number,
            encounterDate: (e.encounterDate ?? e.startDate ?? e.date ?? periodStart ?? actualPeriodStart ?? e.start ?? e.created ?? e.createdAt ?? e._lastUpdated) as Encounter["encounterDate"],
            encounterProvider: (e.encounterProvider ?? e.providerDisplay ?? e.provider ?? e.practitionerName ?? e.performerDisplay) as string | undefined,
            visitCategory: (e.visitCategory ?? e.type ?? e.encounterType ?? e.serviceType ?? e.class) as string | undefined,
            reason: (() => {
                const raw = e.reasonForVisit ?? e.reason ?? e.reasonCode ?? e.chiefComplaint;
                if (!raw) return undefined;
                if (typeof raw === "string") return raw;
                if (Array.isArray(raw) && raw.length > 0) {
                    const first = raw[0];
                    return first?.coding?.[0]?.display || first?.coding?.[0]?.code || first?.text || String(first) || undefined;
                }
                if (typeof raw === "object") {
                    return (raw as any)?.coding?.[0]?.display || (raw as any)?.coding?.[0]?.code || (raw as any)?.text || undefined;
                }
                return String(raw) || undefined;
            })(),
            patientName: (e.patientName ?? e.patientDisplay ?? e.subjectDisplay) as string | undefined,
            status: e.status as EncounterStatus | undefined,
        };
    });
}

function StatusBadge({ value }: { value?: EncounterStatus | null }) {
    const v = (value ?? "UNSIGNED") as EncounterStatus;
    const cls =
        v === "SIGNED"
            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
            : v === "INCOMPLETE"
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
            {v}
        </span>
    );
}

export default function EncountersTable() {
    const router = useRouter();

    const [rows, setRows] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>("ALL");
    const [recentOnly, setRecentOnly] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetchWithOrg("/api/encounters?page=0&size=1000&sort=id,desc");
                const body = await res.json();
                if (!res.ok || body?.success === false) {
                    throw new Error(body?.message || `HTTP ${res.status}`);
                }
                const list = normalizeData(body.data)
                    .map((e) => ({ ...e, status: (e.status ?? "UNSIGNED") as EncounterStatus }))
                    .sort((a, b) => {
                        const da = toDate(a.encounterDate);
                        const db = toDate(b.encounterDate);
                        if (da && db) return db.getTime() - da.getTime();
                        if (da) return -1;
                        if (db) return 1;
                        return (b.id ?? 0) - (a.id ?? 0);
                    });
                setRows(list);
            } catch (err: unknown) {
                setRows([]);
                setError(err instanceof Error ? err.message : "Failed to load encounters.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const byTab = useMemo(
        () => (tab === "ALL" ? rows : rows.filter((r) => (r.status ?? "UNSIGNED") === tab)),
        [rows, tab]
    );

    const filtered = useMemo(
        () => (recentOnly ? byTab.slice(0, 10) : byTab),
        [byTab, recentOnly]
    );

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const clampedPage = Math.min(page, pageCount - 1);
    const paged = filtered.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    {(["ALL", "SIGNED", "UNSIGNED"] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setPage(0); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                tab === t
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                        >
                            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="accent-blue-600 rounded"
                            checked={recentOnly}
                            onChange={(e) => { setRecentOnly(e.target.checked); setPage(0); }}
                        />
                        Show only recent (10)
                    </label>
                    <span>
                        Showing <strong>{paged.length}</strong> of <strong>{filtered.length}</strong>
                    </span>
                </div>
            </div>

            {error && (
                <div className="px-4 py-2 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visit Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                                    </td>
                                </tr>
                            )}
                            {!loading && paged.map((row, idx) => {
                                const d = toDate(row.encounterDate);
                                return (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/patients/${row.patientId}/encounters/${row.id}?from=encounters`)}
                                    >
                                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500">{clampedPage * pageSize + idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.patientName || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDisplayDate(row.encounterDate) || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.encounterProvider || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.visitCategory || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{row.reason || "—"}</td>
                                        <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/patients/${row.patientId}/encounters/${row.id}?from=encounters`);
                                                }}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Open
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && paged.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                                        No encounters found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={clampedPage === 0}
                            className="px-3 py-1.5 rounded-md border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Prev
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                            Page {clampedPage + 1} of {pageCount}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                            disabled={clampedPage >= pageCount - 1}
                            className="px-3 py-1.5 rounded-md border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Next
                        </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                            Showing <strong>{paged.length}</strong> of <strong>{filtered.length}</strong>
                        </span>
                        <select
                            className="border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                        >
                            {[10, 20, 50, 100].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
