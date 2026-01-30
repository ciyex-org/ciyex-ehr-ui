"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/** ---------- Types from modules ---------- */
type AllergyItem = {
    id: number;
    allergyName?: string | null;
    reaction?: string | null;
    severity?: string | null;
    status?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    comments?: string | null;
};

type MedicalProblemItem = {
    id?: number;
    title?: string;
    outcome?: string | null;
    verificationStatus?: string | null;
    beginDateTime?: string | null; // "yyyy-MM-dd HH:mm:ss"
};

type MedicationRequest = {
    id?: number;
    medicationName: string;
    dosage?: string;
    instructions?: string;
    dateIssued?: string | null;
    prescribingDoctor?: string | null;
    status?: string | null;
};

type ApiResponse<T> = { success?: boolean; message?: string; data?: T };

/** ---------- Issues’ unified item ---------- */
type IssueCategory = "Medical Problem" | "Allergy" | "Medication";
type IssueRow = {
    id?: number;
    category: IssueCategory;
    title: string;
    status?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
    source: "medical-problems" | "allergy-intolerances" | "medication-requests";
    sourceId?: number | null;
};

type Props = { patientId: number; orgId?: number };

export default function IssuesFlat({ patientId, orgId }: Props) {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [medicalProblems, setMedicalProblems] = useState<IssueRow[]>([]);
    const [allergies, setAllergies] = useState<IssueRow[]>([]);
    const [medications, setMedications] = useState<IssueRow[]>([]);

    const router = useRouter();
    const pathname = usePathname();
    const search = useSearchParams();

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    const resolvedOrgId = useMemo(() => {
        if (orgId != null) return orgId;
        if (typeof window !== "undefined") {
            const s = window.localStorage.getItem("orgId");
            if (s && !Number.isNaN(Number(s))) return Number(s);
        }
        if (process.env.NEXT_PUBLIC_ORG_ID && !Number.isNaN(Number(process.env.NEXT_PUBLIC_ORG_ID))) {
            return Number(process.env.NEXT_PUBLIC_ORG_ID);
        }
        return 1;
    }, [orgId]);

    const headers = useMemo(
        () => ({ "Content-Type": "application/json", orgId: String(resolvedOrgId) }),
        [resolvedOrgId]
    );

    /** ---------- Load from the three modules (live view) ---------- */
    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const [mpRes, alRes, mdRes] = await Promise.all([
                fetchWithAuth(`${apiBase}/api/medical-problems/${patientId}`, { headers }),
                fetchWithAuth(`${apiBase}/api/allergy-intolerances/${patientId}`, { headers }),
                fetchWithAuth(`${apiBase}/api/medication-requests?patientId=${patientId}`),
            ]);

            // Medical Problems
            const mpJson: ApiResponse<{ problemsList?: MedicalProblemItem[] }> = await mpRes
                .json()
                .catch(() => ({} as any));
            const mpRows: IssueRow[] =
                (mpJson?.data?.problemsList || []).map((p) => ({
                    id: p.id,
                    category: "Medical Problem",
                    title: p.title || "Medical problem",
                    status: p.outcome || p.verificationStatus || "Active",
                    startDate: (p.beginDateTime || "").slice(0, 10) || null,
                    endDate: null,
                    notes: [p.outcome, p.verificationStatus].filter(Boolean).join(" | ") || null,
                    source: "medical-problems",
                    sourceId: p.id ?? null,
                })) ?? [];
            setMedicalProblems(mpRows);

            // Allergies
            const alJson: ApiResponse<{ allergiesList?: AllergyItem[] }> = await alRes
                .json()
                .catch(() => ({} as any));
            const alRows: IssueRow[] =
                (alJson?.data?.allergiesList || []).map((a) => ({
                    id: a.id,
                    category: "Allergy",
                    title: a.allergyName || "Allergy",
                    status: a.status || "Active",
                    startDate: a.startDate || null,
                    endDate: a.endDate || null,
                    notes: a.comments || a.reaction || null,
                    source: "allergy-intolerances",
                    sourceId: a.id,
                })) ?? [];
            setAllergies(alRows);

            // Medications
            const mdJson = await mdRes.json().catch(() => ({} as any));
            const list: MedicationRequest[] = Array.isArray(mdJson) ? mdJson : mdJson?.data || [];
            const mdRows: IssueRow[] =
                (list || []).map((m) => ({
                    id: m.id,
                    category: "Medication",
                    title: m.medicationName || "Medication",
                    status: m.status || "active",
                    startDate: m.dateIssued || null,
                    endDate: null,
                    notes: m.instructions || null,
                    source: "medication-requests",
                    sourceId: m.id ?? null,
                })) ?? [];
            setMedications(mdRows);
        } catch (e: unknown) {
            setErr(e?.message || "Failed to load Issues");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (patientId) void load();
    }, [patientId, resolvedOrgId]);

    /** ---------- Redirect helpers (to modules) ---------- */
    function goManage(cat: IssueCategory) {
        const mapping: Record<IssueCategory, string> = {
            Allergy: "allergies",
            "Medical Problem": "medicalproblems", // <-- fixed key (no dash)
            Medication: "medications",
        };
        const key = mapping[cat];
        router.push(`${pathname}?tab=${key}#${key}`);
    }

    /** ---------- Auto-focus a section when coming from modules ---------- */
    useEffect(() => {
        const section = (search?.get("section") || "").toLowerCase();
        const idMap: Record<string, string> = {
            allergy: "issues-allergy",
            "medical problem": "issues-medical-problem",
            medication: "issues-medication",
        };
        const targetId = idMap[section];
        if (!loading && targetId) {
            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [search, loading]);

    /** ---------- UI ---------- */
    function Section({
                         id,
                         title,
                         cat,
                         rows,
                     }: {
        id: string;
        title: string;
        cat: IssueCategory;
        rows: IssueRow[];
    }) {
        return (
            <div id={id} className="border-b last:border-b-0">
                <div className="flex items-center justify-between py-3">
                    <div className="text-[15px] font-semibold text-gray-800">{title}</div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => goManage(cat)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            title={`Add / Edit ${title}`}
                        >
                            + Add
                        </button>
                        <button
                            onClick={() => goManage(cat)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                        >
                            Manage
                        </button>
                    </div>
                </div>

                {rows.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 py-3">
                        <input type="checkbox" disabled className="accent-gray-400" />
                        <span>None</span>
                    </div>
                ) : (
                    <ul className="py-1 divide-y divide-gray-100">
                        {rows.map((r) => (
                            <li key={`${r.source}-${r.id}`} className="flex items-center justify-between py-2">
                                <div className="min-w-0">
                                    <div className="text-sm text-gray-800 truncate">
                                        {r.title}
                                        {r.status ? (
                                            <span className="ml-2 inline-flex items-center rounded-full border px-2 text-[11px] leading-5 text-gray-700">
                        {r.status}
                      </span>
                                        ) : null}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {r.startDate || "—"}
                                        {r.endDate ? ` → ${r.endDate}` : ""}
                                        {r.notes ? ` · ${r.notes}` : ""}
                                    </div>
                                </div>
                                <button
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={() => goManage(r.category)}
                                >
                                    Edit in {r.category === "Medical Problem" ? "Medical Problems" : r.category}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Issues</h4>

            {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
            ) : err ? (
                <p className="text-sm text-red-600">Error: {err}</p>
            ) : (
                <div className="rounded-lg border border-gray-200">
                    <Section
                        id="issues-medical-problem"
                        title="Medical Problems"
                        cat="Medical Problem"
                        rows={medicalProblems}
                    />
                    <Section id="issues-allergy" title="Allergies" cat="Allergy" rows={allergies} />
                    <Section id="issues-medication" title="Medications" cat="Medication" rows={medications} />
                </div>
            )}
        </div>
    );
}
