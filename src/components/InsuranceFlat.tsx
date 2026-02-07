"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { verifyInsuranceEligibility } from "@/utils/sikkaApi";

type ApiResponse<T> = {
    success: boolean;
    message?: string;
    data?: T;
};

type InsuranceLevel = "primary" | "secondary" | "tertiary";

type CoverageDto = {
    id?: number;
    externalId?: string | null;
    coverageType?: string | null;
    planName?: string | null;
    policyNumber?: string | null;
    coverageStartDate?: string | null;
    coverageEndDate?: string | null;
    patientId: number;
    orgId?: number;

    provider?: string | null;
    effectiveDate?: string | null;
    effectiveDateEnd?: string | null;
    groupNumber?: string | null;

    subscriberEmployer?: string | null;
    subscriberAddressLine1?: string | null;
    subscriberAddressLine2?: string | null;
    subscriberCity?: string | null;
    subscriberState?: string | null;
    subscriberZipCode?: string | null;
    subscriberCountry?: string | null;
    subscriberPhone?: string | null;

    byholderName?: string | null;
    byholderRelation?: string | null;
    byholderAddressLine1?: string | null;
    byholderAddressLine2?: string | null;
    byholderCity?: string | null;
    byholderState?: string | null;
    byholderZipCode?: string | null;
    byholderCountry?: string | null;
    byholderPhone?: string | null;

    copayAmount?: number | null;
};

type Props = {
    patient: { id: string; firstName: string; lastName: string; insuranceProvider?: string };
    /** If not passed, we try localStorage("orgId") then NEXT_PUBLIC_ORG_ID then 1 */
    orgId?: number;
    // keep the outer page props for navigation consistency
    editInsurance: boolean;
    setEditInsurance: (v: boolean) => void;
    insuranceSubTab: InsuranceLevel;
    setInsuranceSubTab: (tab: InsuranceLevel) => void;
    setViewMode: (mode: string) => void;
    setHighlightedTab: (tab: string) => void;
    // not used anymore, but left in the signature so page code doesn’t break
    insuranceForm?: any;
    setInsuranceForm?: any;
    saveInsurance?: any;
    setPolicyField?: any;
};

const tabLabels: Record<InsuranceLevel, string> = {
    primary: "Primary",
    secondary: "Secondary",
    tertiary: "Tertiary",
};

export default function InsuranceFlat({
                                          patient,
                                          orgId,
                                          editInsurance,
                                          setEditInsurance,
                                          insuranceSubTab,
                                          setInsuranceSubTab,
                                          setViewMode,
                                          setHighlightedTab,
                                      }: Props) {
    const API = getEnv("NEXT_PUBLIC_API_URL")!;
    const patientId = Number(patient.id);

    // ✅ Resolve orgId same way across app
    const resolvedOrgId = useMemo(() => {
        if (orgId != null) return orgId;
        if (typeof window !== "undefined") {
            const fromLS = Number(localStorage.getItem("orgId"));
            if (Number.isFinite(fromLS) && fromLS > 0) return fromLS;
        }
        return Number(getEnv("NEXT_PUBLIC_ORG_ID")) || 1;
    }, [orgId]);

    const commonHeaders = useMemo(
        () => ({ "Content-Type": "application/json", orgId: String(resolvedOrgId) }),
        [resolvedOrgId]
    );

    // we keep **one coverage per level**; backend doesn’t store “level”, so we tag it via coverageType
    // convention: coverageType = "PRIMARY" | "SECONDARY" | "TERTIARY"
    const [rows, setRows] = useState<Record<InsuranceLevel, CoverageDto | null>>({
        primary: null,
        secondary: null,
        tertiary: null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    const [form, setForm] = useState<CoverageDto>({
        patientId,
        coverageType: "PRIMARY",
        planName: "",
        policyNumber: "",
        provider: "",
        groupNumber: "",
        coverageStartDate: "",
        coverageEndDate: "",
        effectiveDate: "",
        effectiveDateEnd: "",
        subscriberEmployer: "",
        subscriberAddressLine1: "",
        subscriberAddressLine2: "",
        subscriberCity: "",
        subscriberState: "",
        subscriberZipCode: "",
        subscriberCountry: "",
        subscriberPhone: "",
        byholderName: "",
        byholderRelation: "",
        byholderAddressLine1: "",
        byholderAddressLine2: "",
        byholderCity: "",
        byholderState: "",
        byholderZipCode: "",
        byholderCountry: "",
        byholderPhone: "",
        copayAmount: undefined,
    });

    useEffect(() => {
        // when tab changes, load that row into the form
        const current = rows[insuranceSubTab];
        setForm(
            current
                ? { ...current, patientId, coverageType: mapTabToCoverageType(insuranceSubTab) }
                : {
                    patientId,
                    coverageType: mapTabToCoverageType(insuranceSubTab),
                    planName: "",
                    policyNumber: "",
                }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [insuranceSubTab]);

    const resetMessagesSoon = () => setTimeout(() => { setError(null); setInfo(null); }, 2500);

    function mapCovTypeToTab(t?: string | null): InsuranceLevel | null {
        if (!t) return null;
        const up = t.toUpperCase();
        if (up.includes("PRIMARY")) return "primary";
        if (up.includes("SECONDARY")) return "secondary";
        if (up.includes("TERTIARY")) return "tertiary";
        return null;
    }

    function mapTabToCoverageType(tab: InsuranceLevel) {
        return tab.toUpperCase(); // PRIMARY/SECONDARY/TERTIARY
    }

    async function load() {
        setLoading(true);
        setError(null);
        try {
            // org-scoped list, we filter by patientId
            const res = await fetchWithAuth(`${API}/api/coverages`, { headers: commonHeaders });

            // ADD DEBUG LOGS HERE:
            console.log("Insurance API Response status:", res.status);
            console.log("Insurance API Response headers:", Object.fromEntries(res.headers.entries()));

            const body: ApiResponse<CoverageDto[]> = await res.json();

            // ADD DEBUG LOGS HERE:
            console.log("Insurance API Response body:", body);

            const perLevel: Record<InsuranceLevel, CoverageDto | null> = {
                primary: null, secondary: null, tertiary: null,
            };

            if (res.ok && body.success && Array.isArray(body.data)) {
                body.data
                    .filter((c) => Number(c.patientId) === patientId)
                    .forEach((c) => {
                        const key = mapCovTypeToTab(c.coverageType) ?? "primary";
                        perLevel[key] = c;
                    });
            }

            setRows(perLevel);

            // refresh currently visible form
            const current = perLevel[insuranceSubTab];
            setForm(
                current
                    ? { ...current, patientId, coverageType: mapTabToCoverageType(insuranceSubTab) }
                    : { patientId, coverageType: mapTabToCoverageType(insuranceSubTab) }
            );
        } catch (e: unknown) {
            setError(e?.message || "Failed to load coverages");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, resolvedOrgId]);

    function setF<K extends keyof CoverageDto>(key: K, value: CoverageDto[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    async function saveCurrent() {
        setSaving(true);
        setError(null);
        setInfo(null);
        try {
            // enforce patient & org & coverageType
            const payload: CoverageDto = {
                ...form,
                patientId,
                orgId: resolvedOrgId,
                coverageType: mapTabToCoverageType(insuranceSubTab),
            };

            if (!rows[insuranceSubTab]?.id) {
                // CREATE
                const res = await fetchWithAuth(`${API}/api/coverages`, {
                    method: "POST",
                    headers: commonHeaders,
                    body: JSON.stringify(payload),
                });
                const body: ApiResponse<CoverageDto> = await res.json();
                if (!res.ok || !body.success) throw new Error(body.message || "Create failed");
                setInfo(`${tabLabels[insuranceSubTab]} insurance added`);
            } else {
                // UPDATE
                const id = rows[insuranceSubTab]!.id!;
                const res = await fetchWithAuth(`${API}/api/coverages/${id}/${patientId}`, {
                    method: "PUT",
                    headers: commonHeaders,
                    body: JSON.stringify(payload),
                });
                const body: ApiResponse<CoverageDto> = await res.json();
                if (!res.ok || !body.success) throw new Error(body.message || "Update failed");
                setInfo(`${tabLabels[insuranceSubTab]} insurance updated`);
            }

            await load();
            setEditInsurance(false);
            setViewMode("dashboard");
            setHighlightedTab("dashboard");
        } catch (e: unknown) {
            setError(e?.message || "Save failed");
        } finally {
            setSaving(false);
            resetMessagesSoon();
        }
    }

    async function deleteCurrent() {
        const row = rows[insuranceSubTab];
        if (!row?.id) return;
        if (!confirm(`Delete ${tabLabels[insuranceSubTab]} insurance?`)) return;

        setSaving(true);
        setError(null);
        setInfo(null);
        try {
            const res = await fetchWithAuth(`${API}/api/coverages/${row.id}/${patientId}`, {
                method: "DELETE",
                headers: commonHeaders,
            });
            const body: ApiResponse<null> = await res.json();
            if (!res.ok || !body.success) throw new Error(body.message || "Delete failed");
            setInfo(`${tabLabels[insuranceSubTab]} insurance deleted`);
            await load();
        } catch (e: unknown) {
            setError(e?.message || "Delete failed");
        } finally {
            setSaving(false);
            resetMessagesSoon();
        }
    }

    async function verifyCurrentInsurance() {
        const row = rows[insuranceSubTab];
        if (!row?.id) {
            setError("No insurance data to verify. Please add insurance first.");
            resetMessagesSoon();
            return;
        }

        if (!row.policyNumber || !row.provider) {
            setError("Missing required fields (Policy Number, Provider) for verification.");
            resetMessagesSoon();
            return;
        }

        setVerifying(true);
        setError(null);
        setVerificationResult(null);
        try {
            // Call Sikka API to verify this specific insurance
            const result = await verifyInsuranceEligibility(
                patientId,
                row.policyNumber,
                row.provider,
                patient.dateOfBirth || "",
                insuranceSubTab // Pass which level is being verified
            );
            setVerificationResult(result);
            setShowVerificationModal(true);
            setInfo(`${tabLabels[insuranceSubTab]} insurance verified successfully`);
        } catch (err: unknown) {
            setError(err?.message || "Verification failed");
        } finally {
            setVerifying(false);
            resetMessagesSoon();
        }
    }

    const current = rows[insuranceSubTab];

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Insurance</h4>
                <div className="flex gap-2">
                    {!editInsurance && rows[insuranceSubTab]?.id && (
                        <button
                            onClick={verifyCurrentInsurance}
                            disabled={verifying}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            {verifying ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Verify {tabLabels[insuranceSubTab]}
                                </>
                            )}
                        </button>
                    )}
                    {!editInsurance && (
                        <button
                            onClick={() => setEditInsurance(true)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
            )}
            {info && (
                <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{info}</div>
            )}

            {/* Sub-tabs */}
            <div className="flex gap-2 mb-4 border-b">
                {(["primary", "secondary", "tertiary"] as InsuranceLevel[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setInsuranceSubTab(tab)}
                        className={`px-3 py-1 rounded-t ${
                            insuranceSubTab === tab ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                    >
                        {tabLabels[tab]}
                        {rows[tab]?.id && <span className="ml-1 text-xs">✓</span>}
                    </button>
                ))}
            </div>

            {/* READ ONLY */}
            {!editInsurance ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <FieldRead label="Provider" value={current?.provider || patient.insuranceProvider || "—"} />
                    <FieldRead label="Plan Name" value={current?.planName} />
                    <FieldRead label="Policy Number" value={current?.policyNumber} />
                    <FieldRead label="Group Number" value={current?.groupNumber} />
                    <FieldRead label="Coverage Start" value={current?.coverageStartDate } />
                    <FieldRead label="Coverage End" value={current?.coverageEndDate } />
                    <FieldRead label="Copay" value={current?.copayAmount != null ? String(current?.copayAmount) : "—"} />
                    <FieldRead label="Coverage Type" value={current?.coverageType} />

                    <Section title="Subscriber">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldRead label="Employer" value={current?.subscriberEmployer} />
                            <FieldRead label="Phone" value={current?.subscriberPhone} />
                            <FieldRead label="Address 1" value={current?.subscriberAddressLine1} />
                            <FieldRead label="Address 2" value={current?.subscriberAddressLine2} />
                            <FieldRead label="City" value={current?.subscriberCity} />
                            <FieldRead label="State" value={current?.subscriberState} />
                            <FieldRead label="Zip" value={current?.subscriberZipCode} />
                            <FieldRead label="Country" value={current?.subscriberCountry} />
                        </div>
                    </Section>

                    <Section title="Policy Holder">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldRead label="Name" value={current?.byholderName} />
                            <FieldRead label="Relation" value={current?.byholderRelation} />
                            <FieldRead label="Phone" value={current?.byholderPhone} />
                            <FieldRead label="Address 1" value={current?.byholderAddressLine1} />
                            <FieldRead label="Address 2" value={current?.byholderAddressLine2} />
                            <FieldRead label="City" value={current?.byholderCity} />
                            <FieldRead label="State" value={current?.byholderState} />
                            <FieldRead label="Zip" value={current?.byholderZipCode} />
                            <FieldRead label="Country" value={current?.byholderCountry} />
                        </div>
                    </Section>
                </div>
            ) : (
                // EDIT MODE
                <form
                    className="space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void saveCurrent();
                    }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Provider" value={form.provider || ""} onChange={(v) => setF("provider", v)} />
                        <Input label="Plan Name" value={form.planName || ""} onChange={(v) => setF("planName", v)} />
                        <Input label="Policy Number" value={form.policyNumber || ""} onChange={(v) => setF("policyNumber", v)} />
                        <Input label="Group Number" value={form.groupNumber || ""} onChange={(v) => setF("groupNumber", v)} />
                        <Input label="Coverage Type" value={form.coverageType || ""} onChange={(v) => setF("coverageType", v)} />
                        <Input label="Copay" type="number" value={form.copayAmount ?? ""} onChange={(v) => setF("copayAmount", v === "" ? null : Number(v))} />
                        <Input label="Coverage Start (yyyy-mm-dd)" value={form.coverageStartDate || ""} onChange={(v) => setF("coverageStartDate", v)} />
                        <Input label="Coverage End (yyyy-mm-dd)" value={form.coverageEndDate || ""} onChange={(v) => setF("coverageEndDate", v)} />
                        </div>

                    <Section title="Subscriber">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Employer" value={form.subscriberEmployer || ""} onChange={(v) => setF("subscriberEmployer", v)} />
                            <Input label="Phone" value={form.subscriberPhone || ""} onChange={(v) => setF("subscriberPhone", v)} />
                            <Input label="Address Line 1" value={form.subscriberAddressLine1 || ""} onChange={(v) => setF("subscriberAddressLine1", v)} />
                            <Input label="Address Line 2" value={form.subscriberAddressLine2 || ""} onChange={(v) => setF("subscriberAddressLine2", v)} />
                            <Input label="City" value={form.subscriberCity || ""} onChange={(v) => setF("subscriberCity", v)} />
                            <Input label="State" value={form.subscriberState || ""} onChange={(v) => setF("subscriberState", v)} />
                            <Input label="Zip Code" value={form.subscriberZipCode || ""} onChange={(v) => setF("subscriberZipCode", v)} />
                            <Input label="Country" value={form.subscriberCountry || ""} onChange={(v) => setF("subscriberCountry", v)} />
                        </div>
                    </Section>

                    <Section title="Policy Holder">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Name" value={form.byholderName || ""} onChange={(v) => setF("byholderName", v)} />
                            <Input label="Relation" value={form.byholderRelation || ""} onChange={(v) => setF("byholderRelation", v)} />
                            <Input label="Phone" value={form.byholderPhone || ""} onChange={(v) => setF("byholderPhone", v)} />
                            <Input label="Address Line 1" value={form.byholderAddressLine1 || ""} onChange={(v) => setF("byholderAddressLine1", v)} />
                            <Input label="Address Line 2" value={form.byholderAddressLine2 || ""} onChange={(v) => setF("byholderAddressLine2", v)} />
                            <Input label="City" value={form.byholderCity || ""} onChange={(v) => setF("byholderCity", v)} />
                            <Input label="State" value={form.byholderState || ""} onChange={(v) => setF("byholderState", v)} />
                            <Input label="Zip Code" value={form.byholderZipCode || ""} onChange={(v) => setF("byholderZipCode", v)} />
                            <Input label="Country" value={form.byholderCountry || ""} onChange={(v) => setF("byholderCountry", v)} />
                        </div>
                    </Section>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Save All & Exit"}
                        </button>
                        {rows[insuranceSubTab]?.id && (
                            <button
                                type="button"
                                onClick={deleteCurrent}
                                disabled={saving}
                                className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-50"
                            >
                                Delete {tabLabels[insuranceSubTab].toLowerCase()}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setEditInsurance(false)}
                            disabled={saving}
                            className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading && <div className="mt-3 text-sm text-gray-500">Loading insurance…</div>}
        </div>
    );
}

/* --- small presentational bits --- */
function Input({
                   label,
                   value,
                   onChange,
                   type = "text",
               }: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="block text-xs text-gray-600 mb-1">{label}</label>
            <input
                type={type}
                className="w-full px-3 py-2 border rounded-md"
                value={value as any}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function FieldRead({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-gray-800">{value || "—"}</div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="md:col-span-2 border-t pt-4">
            <div className="text-sm font-medium text-gray-800 mb-2">{title}</div>
            {children}
        </div>
    );
}