// InsuranceSummary.tsx - Updated
"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";

type Coverage = Record<string, any>;

type ApiResponse<T> = {
    success?: boolean;
    message?: string;
    data?: T;
};

export default function InsuranceSummary({
                                             patientId,
                                             orgId,
                                             onNavigate,
                                         }: {
    patientId: number;
    orgId?: number;
    onNavigate?: (tab: string) => void;
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

                // Use the patient-specific FHIR resource endpoint for insurance coverage data
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/fhir-resource/insurance-coverage/patient/${patientId}?page=0&size=50`,
                    { headers }
                );

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const body: ApiResponse<any> = await res.json();

                // Handle paginated, wrapped, or plain array response structures
                let coverages: Coverage[] = [];

                if (body.success && body.data) {
                    const d = body.data;
                    if (Array.isArray(d)) {
                        coverages = d;
                    } else if (Array.isArray(d.content)) {
                        coverages = d.content;
                    }
                } else if (Array.isArray(body)) {
                    coverages = body as unknown as Coverage[];
                }

                setRows(coverages);
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
                    <button type="button" onClick={() => onNavigate ? onNavigate("insurance") : (window.location.search = "?tab=insurance")} className="text-xs text-blue-600 hover:underline">View all</button>
                </div>
                <p className="text-gray-500 text-sm">Loading insurance...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Insurance</h4>
                <button type="button" onClick={() => onNavigate ? onNavigate("insurance") : (window.location.search = "?tab=insurance")} className="text-xs text-blue-600 hover:underline">View all</button>
            </div>
            {rows.length === 0 ? (
                <p className="text-gray-500 text-sm">No insurance on file</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {rows.slice(0, 3).map((c: any, idx: number) => {
                        // Try multiple possible field names from tab_field_config mappings
                        const prov = c.payerName || c.provider || c.insurerName || c.companyName || c.payor || c.insurer || "";
                        const plan = c.planName || c.plan || c.coveragePlan || c.planDisplay || c.groupName || c.groupId || "";
                        const ctype = c.coverageType || c.type || c.level || c.kind || c.relationship || "";
                        const status = c.status || "";
                        const effectiveDate = c.policyEffectiveDate || c.effectiveDate || c.startDate || "";
                        const endDate = c.policyEndDate || c.endDate || "";

                        // Format date for display
                        const fmtDate = (d: string) => formatDisplayDate(d);

                        // Build a meaningful display line from whatever fields are available
                        const allValues = Object.values(c).filter(
                            (v) => v != null && typeof v === "string" && v.trim() !== "" && v !== "Coverage" && !String(v).startsWith("Patient/")
                        );
                        const label = prov || plan || (allValues.length > 0 ? String(allValues[0]) : "Insurance Record");

                        return (
                            <li key={c.id || c.fhirId || idx}>
                                <strong>{label}</strong>
                                {plan && prov ? ` — ${plan}` : ""}
                                {" "}
                                {ctype && <span className="ml-1 text-gray-500">({ctype})</span>}
                                {status && <span className="ml-1 text-xs text-green-600">{status}</span>}
                                {(effectiveDate || endDate) && (
                                    <span className="ml-1 text-xs text-gray-400">
                                        {effectiveDate ? fmtDate(effectiveDate) : ""}
                                        {effectiveDate && endDate ? " – " : ""}
                                        {endDate ? fmtDate(endDate) : ""}
                                    </span>
                                )}
                            </li>
                        );
                    })}
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
