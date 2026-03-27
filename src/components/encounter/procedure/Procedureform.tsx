"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { ApiResponse, ProcedureDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";
import DateInput from "@/components/ui/DateInput";

type Props = {
    patientId: number;
    encounterId: number;
    editing?: ProcedureDto | null;
    onSaved: (saved: ProcedureDto | ProcedureDto[]) => void;
    onCancel?: () => void;
};

type ProcedureFormData = {
    cpt4: string;
    description: string;
    units: number | "";
    rate: string;
    relatedIcds: string;
    hospitalBillingStart: string;
    hospitalBillingEnd: string;
    modifier1: string;
    note: string;
    priceLevelTitle: number | "";
    providername: string;
    datePerformed: string;
};

const CODE_TYPES = ["CPT4", "HCPCS", "ICD10", "ICD9", "CVX", "CUSTOM"] as const;

type CodeOption = {
    id: number;
    code: string;
    description?: string;
    relateTo?: string;
    feeStandard?: number;
    modifier?: string;
};

type ProviderOption = { id: number; name: string; };
type PatientCodeList = { id: number; title: string; active?: boolean; isDefault?: boolean };

export default function Procedureform({ patientId, encounterId, editing, onSaved, onCancel }: Props) {
    const [procedures, setProcedures] = useState<ProcedureFormData[]>([{
        cpt4: "",
        description: "",
        units: "",
        rate: "",
        relatedIcds: "",
        hospitalBillingStart: "",
        hospitalBillingEnd: "",
        modifier1: "",
        note: "",
        priceLevelTitle: "",
        providername: "",
        datePerformed: new Date().toISOString().slice(0, 10),
    }]);
    const [codeType, setCodeType] = useState<string>("CPT4");
    const [codeOptions, setCodeOptions] = useState<CodeOption[]>([]);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [priceLevels, setPriceLevels] = useState<PatientCodeList[]>([]);

    async function fetchCodes(type: string) {
        setLoadingCodes(true);
        try {
            const orgId = localStorage.getItem("orgId") || "";
            const apiUrl = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
            const url = `${apiUrl}/api/global_codes?codeType=${type}`;
            
            const headers: Record<string, string> = {
                Accept: "application/json",
                "Content-Type": "application/json"
            };
            if (orgId) headers["orgId"] = orgId;
            
            const res = await fetchWithAuth(url, {
                method: "GET",
                headers,
                mode: "cors" as const
            });
            
            const json = await res.json();
            
            if (res.ok && json.data) {
                const mapped: CodeOption[] = json.data.map((item: any) => ({
                    id: item.id,
                    code: item.code,
                    description: item.description || item.shortDescription,
                    relateTo: item.relateTo,
                    feeStandard: item.feeStandard,
                    modifier: item.modifier
                }));
                setCodeOptions(mapped);
            } else {
                setCodeOptions([]);
            }
        } catch (e) {
            console.error("Failed to fetch codes:", e);
            setCodeOptions([]);
        } finally {
            setLoadingCodes(false);
        }
    }

    async function fetchProviders() {
        setLoadingProviders(true);
        try {
            const orgIds = JSON.parse(localStorage.getItem("orgIds") || "[]");
            const apiUrl = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
            const res = await fetchWithAuth(
                `${apiUrl}/api/providers?orgIds=${orgIds.join(",")}`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" }
                }
            );
            const json = await res.json();
            if (res.ok && json.success) {
                const list: unknown[] = json?.data || [];
                const mapped: ProviderOption[] = list.map((item: any) => {
                    const firstName = item.identification?.firstName || "";
                    const lastName = item.identification?.lastName || "";
                    const prefix = item.identification?.prefix || "";
                    const fullName = `${prefix} ${firstName} ${lastName}`.trim();
                    
                    return {
                        id: item.id,
                        name: fullName || "Provider",
                    };
                }).filter((p) => p.id > 0);
                
                setProviderOptions(mapped);
            }
        } catch (e) {
            console.error("Failed to fetch providers:", e);
        } finally {
            setLoadingProviders(false);
        }
    }

    useEffect(() => {
        if (codeType) fetchCodes(codeType);
        fetchProviders();
    }, [codeType]);

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.procedure && !editing?.id) {
            const data = encounterData.procedure;
            setProcedures([{
                cpt4: data.cpt4 || "",
                description: data.description || "",
                units: typeof data.units === "number" ? data.units : "",
                rate: data.rate || "",
                relatedIcds: data.relatedIcds || "",
                hospitalBillingStart: (data as any).hospitalBillingStart || "",
                hospitalBillingEnd: (data as any).hospitalBillingEnd || "",
                modifier1: data.modifier1 ?? "",
                note: data.note ?? "",
                priceLevelTitle: typeof data.priceLevelTitle === "number" ? data.priceLevelTitle : "",
                providername: data.providername ?? "",
                datePerformed: (data as any).datePerformed || new Date().toISOString().slice(0, 10)
            }]);
        } else if (editing?.id) {
            const codeItems = (editing as any).codeItems;
            if (codeItems && Array.isArray(codeItems) && codeItems.length > 0) {
                setProcedures(codeItems.map((item: any) => ({
                    cpt4: item.cpt4 || "",
                    description: item.description || "",
                    units: typeof item.units === "number" ? item.units : "",
                    rate: item.rate || "",
                    relatedIcds: item.relatedIcds || "",
                    hospitalBillingStart: item.hospitalBillingStart || "",
                    hospitalBillingEnd: item.hospitalBillingEnd || "",
                    modifier1: item.modifier1 ?? "",
                    note: item.note ?? "",
                    priceLevelTitle: typeof item.priceLevelId === "number" ? item.priceLevelId : "",
                    providername: item.providername ?? "",
                    datePerformed: item.datePerformed || new Date().toISOString().slice(0, 10)
                })));
            } else {
                setProcedures([{
                    cpt4: editing.cpt4 || "",
                    description: editing.description || "",
                    units: typeof editing.units === "number" ? editing.units : "",
                    rate: editing.rate || "",
                    relatedIcds: editing.relatedIcds || "",
                    hospitalBillingStart: editing.hospitalBillingStart || "",
                    hospitalBillingEnd: editing.hospitalBillingEnd || "",
                    modifier1: editing.modifier1 ?? "",
                    note: editing.note ?? "",
                    priceLevelTitle: typeof (editing as any).priceLevelId === "number" ? (editing as any).priceLevelId : "",
                    providername: (editing as any).providername ?? "",
                    datePerformed: (editing as any).datePerformed || new Date().toISOString().slice(0, 10)
                }]);
            }
        }
    }, [editing, patientId, encounterId]);

    useEffect(() => {
        if (procedures[0]?.cpt4 || procedures[0]?.description) {
            setEncounterSection(patientId, encounterId, "procedure", procedures[0] as any);
        }
    }, [procedures, patientId, encounterId]);

    useEffect(() => {
        const ac = new AbortController();
        (async () => {
            try {
                const raw = (typeof window !== "undefined" && localStorage.getItem("orgId")) || "";
                const orgId = raw ? String(raw) : undefined;
                const preferFetchWithOrg = typeof fetchWithOrg === "function";
                const headers: Record<string, string> = { Accept: "application/json" };
                if (orgId) headers["X-Org-Id"] = orgId;

                const res = preferFetchWithOrg
                    ? await fetchWithOrg("/api/patient-codes", { method: "GET", headers, signal: ac.signal })
                    : await fetchWithAuth("/api/patient-codes", { method: "GET", headers, signal: ac.signal });

                let json: { success?: boolean; data?: any[]; message?: string } | null = null;
                try {
                    json = await res.json();
                } catch {}

                if (!res.ok || json?.success === false) {
                    const msg = json?.message || `Load failed (${res.status})`;
                    throw new Error(msg);
                }

                const rows = Array.isArray(json?.data) ? json!.data! : [];
                const active = rows.filter((r: any) => r?.active !== false);
                const mapped: PatientCodeList[] = active.map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    active: r.active,
                    isDefault: r.isDefault,
                }));

                setPriceLevels(mapped);

                if (!editing?.id) {
                    const def = mapped.find((r) => r.isDefault);
                    if (def) {
                        setProcedures(prev => prev.map((p, i) => i === 0 ? { ...p, priceLevelTitle: def.id as number } : p));
                    }
                }
            } catch (err) {
                console.warn("[procedureform] Failed to load patient-codes:", err);
                setPriceLevels([]);
            }
        })();
        return () => ac.abort();
    }, [editing?.id]);

    const addProcedure = () => {
        setProcedures([...procedures, {
            cpt4: "",
            description: "",
            units: "",
            rate: "",
            relatedIcds: "",
            hospitalBillingStart: "",
            hospitalBillingEnd: "",
            modifier1: "",
            note: "",
            priceLevelTitle: "",
            providername: "",
            datePerformed: new Date().toISOString().slice(0, 10)
        }]);
    };

    const removeProcedure = (index: number) => {
        if (procedures.length > 1) {
            setProcedures(procedures.filter((_, i) => i !== index));
        }
    };

    const updateProcedure = (index: number, field: keyof ProcedureFormData, value: any) => {
        setProcedures(procedures.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    const handleCodeSelect = (index: number, code: string) => {
        const selected = codeOptions.find(c => c.code === code);
        if (selected) {
            setProcedures(procedures.map((p, i) => i === index ? {
                ...p,
                cpt4: selected.code,
                description: selected.description || "",
                relatedIcds: selected.relateTo || "",
                rate: selected.feeStandard?.toString() || "",
                modifier1: selected.modifier || ""
            } : p));
        }
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);

        try {
            if (editing?.id) {
                const bodyArray = procedures.map(proc => {
                    const cptCode = proc.cpt4.trim();
                    return {
                    cpt4: cptCode,
                    // Add code as FHIR CodeableConcept with CPT system (fixes Coding has no system)
                    code: cptCode ? {
                        coding: [{ system: "http://www.ama-assn.org/go/cpt", code: cptCode, display: proc.description.trim() || cptCode }],
                        text: proc.description.trim() || cptCode,
                    } : undefined,
                    description: proc.description.trim(),
                    units: proc.units !== "" ? Number(proc.units) : 1,
                    rate: proc.rate || "0",
                    ...(proc.priceLevelTitle !== "" ? { priceLevelId: Number(proc.priceLevelTitle) } : {}),
                    ...(proc.relatedIcds ? { relatedIcds: proc.relatedIcds.trim() } : {}),
                    ...(proc.hospitalBillingStart ? { hospitalBillingStart: proc.hospitalBillingStart } : {}),
                    ...(proc.hospitalBillingEnd ? { hospitalBillingEnd: proc.hospitalBillingEnd } : {}),
                    ...(proc.modifier1 ? { modifier1: proc.modifier1.trim() } : {}),
                    ...(proc.note ? { note: proc.note.trim() } : {}),
                    ...(proc.providername ? { providername: proc.providername.trim() } : {}),
                    ...(proc.datePerformed ? { datePerformed: proc.datePerformed } : {}),
                    ...(proc.priceLevelTitle !== "" ? { priceLevelTitle: priceLevels.find(pl => pl.id === proc.priceLevelTitle)?.title } : {})
                    };
                });

                const res = await fetchWithOrg(`/api/procedures/${patientId}/${encounterId}/${editing.id}`, {
                    method: "PUT",
                    body: JSON.stringify(bodyArray)
                });
                const json = (await res.json()) as ApiResponse<ProcedureDto>;
                if (!res.ok || !json.success) throw new Error(json.message || "Save failed");
                onSaved(json.data!);
            } else {
                const bodyArray = procedures.map(proc => {
                    const cptCode = proc.cpt4.trim();
                    return {
                    patientId,
                    encounterId,
                    cpt4: cptCode,
                    // Add code as FHIR CodeableConcept with CPT system (fixes Coding has no system)
                    code: cptCode ? {
                        coding: [{ system: "http://www.ama-assn.org/go/cpt", code: cptCode, display: proc.description.trim() || cptCode }],
                        text: proc.description.trim() || cptCode,
                    } : undefined,
                    description: proc.description.trim(),
                    units: proc.units !== "" ? Number(proc.units) : 1,
                    rate: proc.rate || "0",
                    ...(proc.priceLevelTitle !== "" ? { priceLevelId: Number(proc.priceLevelTitle) } : {}),
                    ...(proc.relatedIcds ? { relatedIcds: proc.relatedIcds.trim() } : {}),
                    ...(proc.hospitalBillingStart ? { hospitalBillingStart: proc.hospitalBillingStart } : {}),
                    ...(proc.hospitalBillingEnd ? { hospitalBillingEnd: proc.hospitalBillingEnd } : {}),
                    ...(proc.modifier1 ? { modifier1: proc.modifier1.trim() } : {}),
                    ...(proc.note ? { note: proc.note.trim() } : {}),
                    ...(proc.providername ? { providername: proc.providername.trim() } : {}),
                    ...(proc.datePerformed ? { datePerformed: proc.datePerformed } : {}),
                    ...(proc.priceLevelTitle !== "" ? { priceLevelTitle: priceLevels.find(pl => pl.id === proc.priceLevelTitle)?.title } : {})
                    };
                });

                const res = await fetchWithOrg(`/api/procedures/${patientId}/${encounterId}`, {
                    method: "POST",
                    body: JSON.stringify(bodyArray)
                });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || "Save failed");

                const createdProcedures = Array.isArray(json.data) ? json.data : [json.data];
                for (let i = 0; i < createdProcedures.length; i++) {
                    const proc = procedures[i];
                    const savedProc = createdProcedures[i];
                    try {
                        const invoiceBody = {
                            code: proc.cpt4.trim() || savedProc.cpt4 || "",
                            description: proc.description.trim() || savedProc.description || "",
                            units: proc.units !== "" ? Number(proc.units) : 1,
                            rate: proc.rate ? Number(proc.rate) : 0,
                            dos: proc.hospitalBillingStart || savedProc.hospitalBillingStart || "",
                            provider: proc.providername.trim(),
                            modifiers: proc.modifier1 || "",
                            patientId,
                            encounterId,
                        };
                        await fetchWithAuth(`/api/patient-billing/${patientId}/invoices`, {
                            method: "POST",
                            body: JSON.stringify(invoiceBody),
                            headers: { "Content-Type": "application/json" },
                        });
                    } catch (err) {
                        console.error("Invoice creation failed:", err);
                    }
                }

                onSaved(createdProcedures);
            }

            removeEncounterSection(patientId, encounterId, "procedure");

            if (!editing?.id) {
                setProcedures([{
                    cpt4: "",
                    description: "",
                    units: "",
                    rate: "",
                    relatedIcds: "",
                    hospitalBillingStart: "",
                    hospitalBillingEnd: "",
                    modifier1: "",
                    note: "",
                    priceLevelTitle: "",
                    providername: "",
                    datePerformed: new Date().toISOString().slice(0, 10)
                }]);
            }
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    <div className="flex justify-between items-center sticky top-0 bg-white pb-4 border-b">
                        <h3 className="text-xl font-semibold">{editing?.id ? "Edit Procedure" : "Add Procedures"}</h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={addProcedure}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                            >
                                + Add Another
                            </button>
                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={() => { removeEncounterSection(patientId, encounterId, "procedure"); onCancel(); }}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

            {procedures.map((proc, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg bg-gray-50">
                    {procedures.length > 1 && (
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium">Procedure {index + 1}</h4>
                            <button
                                type="button"
                                onClick={() => removeProcedure(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {index === 0 && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Code Type</label>
                                <select
                                    className="w-full rounded-lg border px-3 py-2 focus:ring"
                                    value={codeType}
                                    onChange={(e) => setCodeType(e.target.value)}
                                >
                                    {CODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        )}

                        <div className={index === 0 ? "" : "md:col-span-2"}>
                            <label className="block text-sm font-medium mb-1">CPT-4 Code <span className="text-red-600">*</span></label>
                            <select
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.cpt4}
                                onChange={(e) => handleCodeSelect(index, e.target.value)}
                                required
                            >
                                <option value="">Select Code</option>
                                {codeOptions.map(c => (
                                    <option key={c.id} value={c.code}>
                                        {c.code} - {c.description}
                                    </option>
                                ))}
                            </select>
                            {index === 0 && loadingCodes && <p className="text-xs text-gray-500 mt-1">Loading codes...</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Units <span className="text-red-600">*</span></label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.units}
                                onChange={(e) => updateProcedure(index, "units", e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="1"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Rate <span className="text-red-600">*</span></label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.rate}
                                onChange={(e) => updateProcedure(index, "rate", e.target.value)}
                                placeholder="239.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Price Level</label>
                            <select
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.priceLevelTitle}
                                onChange={(e) => updateProcedure(index, "priceLevelTitle", e.target.value === "" ? "" : Number(e.target.value))}
                            >
                                <option value="">Price level</option>
                                {priceLevels.map((pl) => (
                                    <option key={pl.id} value={pl.id}>
                                        {pl.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Provider Name</label>
                            <select
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.providername}
                                onChange={(e) => { updateProcedure(index, "providername", e.target.value); updateProcedure(index, "performer", e.target.value); }}
                            >
                                <option value="">Select Provider</option>
                                {providerOptions.map((p) => (
                                    <option key={p.id} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            {index === 0 && loadingProviders && <p className="text-xs text-gray-500 mt-1">Loading providers...</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <input
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.description}
                                onChange={(e) => updateProcedure(index, "description", e.target.value)}
                                placeholder="Office visit est. patient comprehensive"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Related ICDs</label>
                            <input
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.relatedIcds}
                                onChange={(e) => updateProcedure(index, "relatedIcds", e.target.value)}
                                placeholder='e.g., "E0500" or comma-separated'
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date Performed</label>
                            <DateInput
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.datePerformed}
                                onChange={(e) => updateProcedure(index, "datePerformed", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Hospital Billing Start</label>
                            <DateInput
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.hospitalBillingStart}
                                onChange={(e) => updateProcedure(index, "hospitalBillingStart", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Hospital Billing End</label>
                            <DateInput
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.hospitalBillingEnd}
                                onChange={(e) => updateProcedure(index, "hospitalBillingEnd", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Modifier</label>
                            <input
                                className="w-full rounded-lg border px-3 py-2 focus:ring"
                                value={proc.modifier1}
                                onChange={(e) => updateProcedure(index, "modifier1", e.target.value)}
                                placeholder="25"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Note</label>
                            <textarea
                                className="w-full rounded-lg border px-3 py-2 focus:ring min-h-24"
                                value={proc.note}
                                onChange={(e) => updateProcedure(index, "note", e.target.value)}
                                placeholder="Follow CPT Estimator guidance"
                            />
                        </div>
                    </div>
                </div>
            ))}

                    {err && <p className="text-sm text-red-600">{err}</p>}

                    <div className="flex items-center gap-2 sticky bottom-0 bg-white pt-4 border-t">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-60 font-medium"
                        >
                            {saving ? "Saving..." : editing?.id ? "Update" : `Save ${procedures.length > 1 ? `${procedures.length} Procedures` : "Procedure"}`}
                        </button>
                        {onCancel && (
                            <button type="button" onClick={() => { removeEncounterSection(patientId, encounterId, "procedure"); onCancel(); }} className="rounded-xl border px-6 py-2.5 hover:bg-gray-50 font-medium">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
