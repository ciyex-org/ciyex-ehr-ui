// InsuranceSummary.tsx - Updated
"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type Coverage = {
    id: number;
    provider?: string;
    planName?: string;
    coverageType?: string;
    patientId?: number;
};

type ApiResponse<T> = {
    success?: boolean;
    message?: string;
    data?: T;
};

export default function InsuranceSummary({
                                             patientId,
                                             orgId,
                                         }: {
    patientId: number;
    orgId?: number;
}) {
    const [rows, setRows] = useState<Coverage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                };

                if (orgId) {
                    headers.orgId = String(orgId);
                } else if (typeof window !== "undefined") {
                    const storedOrgId = localStorage.getItem("orgId");
                    if (storedOrgId) {
                        headers.orgId = storedOrgId;
                    }
                }

                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/coverages`,
                    { headers }
                );

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const body: ApiResponse<Coverage[]> = await res.json();

                // Handle different response structures
                let coverages: Coverage[] = [];

                if (body.success && Array.isArray(body.data)) {
                    coverages = body.data;
                } else if (Array.isArray(body)) {
                    coverages = body;
                }

                // Filter by patientId
                const patientCoverages = coverages.filter(
                    (c: any) => c.patientId && Number(c.patientId) === patientId
                );

                setRows(patientCoverages);
            } catch (error) {
                console.error("Failed to load insurance:", error);
                setRows([]);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [patientId, orgId]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm">Insurance</h4>
                    <a href={`?tab=insurance`} className="text-xs text-blue-600 hover:underline">
                        View all
                    </a>
                </div>
                <p className="text-gray-500 text-sm">Loading insurance...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Insurance</h4>
                <a href={`?tab=insurance`} className="text-xs text-blue-600 hover:underline">
                    View all
                </a>
            </div>
            {rows.length === 0 ? (
                <p className="text-gray-500 text-sm">No insurance on file</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {rows.slice(0, 3).map((c) => (
                        <li key={c.id}>
                            <strong>{c.provider}</strong> — {c.planName}{" "}
                            <span className="ml-1 text-gray-500">
                                ({c.coverageType || "—"})
                            </span>
                        </li>
                    ))}
                    {rows.length > 3 && (
                        <li className="text-xs text-gray-500">
                            +{rows.length - 3} more...
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}