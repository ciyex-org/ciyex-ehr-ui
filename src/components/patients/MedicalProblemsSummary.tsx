// MedicalProblemsSummary.tsx - Updated
"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type MedicalProblem = {
    id: number;
    title?: string;
    conditionName?: string;
    verificationStatus?: string;
    clinicalStatus?: string;
};

type ApiResponse<T> = {
    success?: boolean;
    message?: string;
    data?: T;
};

type MedicalProblemDto = {
    problemsList?: MedicalProblem[];
};

export default function MedicalProblemsSummary({
                                                   patientId,
                                                   onNavigate,
                                               }: {
    patientId: number;
    onNavigate?: (tab: string) => void;
}) {
    const [items, setItems] = useState<MedicalProblem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                };

                if (typeof window !== "undefined") {
                    const storedOrgId = localStorage.getItem("orgId");
                    if (storedOrgId) {
                        headers.orgId = storedOrgId;
                    }
                }

                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/medical-problems/${patientId}`,
                    { headers }
                );

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const body: ApiResponse<MedicalProblemDto> = await res.json();

                // Handle different response structures
                if (body.success && body.data?.problemsList) {
                    setItems(body.data.problemsList);
                } else if (Array.isArray(body)) {
                    setItems(body);
                } else {
                    setItems([]);
                }
            } catch (error) {
                console.error("Failed to load medical problems:", error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [patientId]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm">Medical Problems</h4>
                    <button type="button" onClick={() => onNavigate ? onNavigate("medicalproblems") : (window.location.search = "?tab=medicalproblems")} className="text-xs text-blue-600 hover:underline">View all</button>
                </div>
                <p className="text-gray-500 text-sm">Loading problems...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Medical Problems</h4>
                <button type="button" onClick={() => onNavigate ? onNavigate("medicalproblems") : (window.location.search = "?tab=medicalproblems")} className="text-xs text-blue-600 hover:underline">View all</button>
            </div>
            {items.length === 0 ? (
                <p className="text-gray-500 text-sm">No problems recorded</p>
            ) : (
                <ul className="list-disc ml-5 text-sm">
                    {items.slice(0, 3).map((p) => (
                        <li key={p.id}>
                            {p.conditionName || p.title || "—"} ({p.clinicalStatus || p.verificationStatus || "—"})
                        </li>
                    ))}
                    {items.length > 3 && (
                        <li className="text-xs text-gray-500">
                            +{items.length - 3} more...
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}