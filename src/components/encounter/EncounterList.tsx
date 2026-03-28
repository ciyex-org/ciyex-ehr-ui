"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, EncounterDto } from "@/utils/types";
import Link from "next/link";
import { toast, confirmDialog } from "@/utils/toast";

type Props = {
    patientId: number;
};

function toDateKey(d?: string | number[]): string {
    if (!d) return "";
    if (Array.isArray(d)) {
        const [y, m, day, h = 0, min = 0] = d;
        const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day), Number(h), Number(min)));
        return dt.toISOString();
    }
    return d.length >= 19 ? d.slice(0, 19) : d.slice(0, 10);
}

export default function EncounterList({ patientId }: Props) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<EncounterDto[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithOrg(`/api/encounters?patientId=${patientId}`, { method: "GET" });
            const json = (await res.json()) as ApiResponse<EncounterDto[]>;
            if (!res.ok || !json.success) throw new Error(json.message || "Load failed");
            setItems(json.data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    async function remove(id: number) {
        const confirmed = await confirmDialog("Delete this encounter?");
        if (!confirmed) return;
        const res = await fetchWithOrg(`/api/encounters/${id}`, { method: "DELETE" });
        const json = (await res.json()) as ApiResponse<void>;
        if (!res.ok || !json.success) {
            toast.error(json.message || "Delete failed");
            return;
        }
        setItems((p) => p.filter((x) => x.id !== id));
    }

    const sorted = useMemo(
        () =>
            [...items].sort((a, b) => {
                const d1 =
                    toDateKey(a.audit?.lastModifiedDate) ||
                    toDateKey(a.audit?.createdDate) ||
                    toDateKey(a.encounterDate as unknown as string);
                const d2 =
                    toDateKey(b.audit?.lastModifiedDate) ||
                    toDateKey(b.audit?.createdDate) ||
                    toDateKey(b.encounterDate as unknown as string);
                return d2.localeCompare(d1);
            }),
        [items]
    );

    return (
        <div className="flex flex-col space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Encounters</h2>
            </div>

            {loading && <div className="text-gray-600">Loading...</div>}
            {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && sorted.length === 0 && (
                <div className="rounded-xl border p-4 text-gray-600">No encounters yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((e) => (
                    <li key={e.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-medium">
                                    {e.encounterDate} · {e.status || "OPEN"}
                                </p>
                                <p className="text-gray-700">{e.reason || "-"}</p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    className="rounded-lg bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700 text-sm"
                                    href={`/patients/${e.patientId}/encounters/${e.id}`}
                                >
                                    Open
                                </Link>
                                <button
                                    onClick={() => remove(e.id!)}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
