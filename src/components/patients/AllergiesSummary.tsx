// AllergiesSummary.tsx - Updated
"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type AllergyItem = {
    id: number;
    allergyName?: string | null;
    severity?: string | null;
    status?: string | null;
};

type ApiResponse<T> = {
    success?: boolean;
    message?: string;
    data?: T;
};

type AllergyDto = {
    allergiesList?: AllergyItem[];
};

export default function AllergiesSummary({
                                             patientId,
                                             orgId,
                                             onNavigate,
                                         }: {
    patientId: number;
    orgId?: number;
    onNavigate?: (tab: string) => void;
}) {
    const [items, setItems] = useState<AllergyItem[]>([]);
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
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/allergy-intolerances/${patientId}`,
                    { headers }
                );

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const body: ApiResponse<AllergyDto> = await res.json();

                // Handle different response structures
                if (body.success && body.data?.allergiesList) {
                    setItems(body.data.allergiesList);
                } else if (Array.isArray(body)) {
                    // Handle case where response is directly an array
                    setItems(body);
                } else {
                    setItems([]);
                }
            } catch (error) {
                console.error("Failed to load allergies:", error);
                setItems([]);
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
                    <h4 className="font-semibold text-sm">Allergies</h4>
                    <button type="button" onClick={() => onNavigate ? onNavigate("allergies") : (window.location.search = "?tab=allergies")} className="text-xs text-blue-600 hover:underline">View all</button>
                </div>
                <p className="text-gray-500 text-sm">Loading allergies...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Allergies</h4>
                <button type="button" onClick={() => onNavigate ? onNavigate("allergies") : (window.location.search = "?tab=allergies")} className="text-xs text-blue-600 hover:underline">View all</button>
            </div>
            {items.length === 0 ? (
                <p className="text-gray-500 text-sm" title="NKA = No Known Allergies">NKA — No Known Allergies</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {items.slice(0, 3).map((a) => (
                        <li key={a.id}>
                            {a.allergyName}{" "}
                            <span
                                className={`ml-1 px-2 py-0.5 rounded text-xs ${
                                    a.severity === "Severe"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                {a.severity || "—"}
                            </span>
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