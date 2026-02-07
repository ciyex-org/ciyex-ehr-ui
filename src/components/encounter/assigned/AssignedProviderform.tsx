"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { ApiResponse, AssignedProviderDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";

type Props = {
    patientId: number;
    encounterId: number;
    editing?: AssignedProviderDto | null;
    onSaved: (saved: AssignedProviderDto) => void;
    onCancel?: () => void;
};

type ProviderOption = { 
    id: number; 
    name: string; 
    npi?: string; 
    providerType?: string;
    licenseExpiry?: string;
    specialty?: string;
};

const ROLES: AssignedProviderDto["role"][] = ["Primary", "Attending", "Consultant", "Nurse", "Scribe", "Other"];

export default function AssignedProviderform({ patientId, encounterId, editing, onSaved, onCancel }: Props) {
    const [providerId, setProviderId] = useState<number | "">("");
    const [providerName, setProviderName] = useState("");
    const [role, setRole] = useState<AssignedProviderDto["role"]>("Primary");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");
    const [options, setOptions] = useState<ProviderOption[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.assignedProvider && !editing?.id) {
            const data = encounterData.assignedProvider;
            setProviderId(data.providerId ? Number(data.providerId) : "");
            setProviderName(data.providerName || "");
            setRole((data.role as AssignedProviderDto["role"]) || "Primary");
            setEndDate(data.endDate || "");
            setNotes(data.notes || "");
        } else if (editing?.id) {
            setProviderId(editing.providerId);
            setProviderName(editing.providerName || "");
            setRole(editing.role || "Primary");
            setEndDate(editing?.endDate?.slice(0, 10) || editing?.endDate || "");
            setNotes(editing.notes || "");
        } else {
            setProviderId("");
            setProviderName("");
            setRole("Primary");
            setEndDate("");
            setNotes("");
        }
    }, [editing, patientId, encounterId]);

    useEffect(() => {
        if (providerId || role || endDate || notes) {
            setEncounterSection(patientId, encounterId, "assignedProvider", {
                providerId: String(providerId),
                providerName,
                role,
                startDate: "",
                endDate,
                notes,
                patientId,
                encounterId
            });
        }
    }, [providerId, providerName, role, endDate, notes, patientId, encounterId]);

    async function fetchProviders() {
        setLoadingProviders(true);
        try {
            const orgIds = JSON.parse(localStorage.getItem("orgIds") || "[]");
            const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";
            const res = await fetchWithAuth(
                `${apiUrl}/api/providers?orgIds=${orgIds.join(",")}`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" }
                }
            );
            const json = await res.json();
            console.log('API Response:', json);
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
                        npi: item.npi,
                        providerType: item.professionalDetails?.providerType,
                        licenseExpiry: item.professionalDetails?.licenseExpiry,
                        specialty: item.professionalDetails?.specialty,
                    };
                }).filter((p) => p.id > 0);
                
                console.log('Mapped providers:', mapped);
                setOptions(mapped);
            } else {
                setOptions([]);
            }
        } catch (e) {
            console.error('Fetch error:', e);
            setOptions([]);
        } finally {
            setLoadingProviders(false);
        }
    }

    useEffect(() => {
        fetchProviders();
    }, []);

    function chooseProvider(p: ProviderOption) {
        console.log('Selected provider:', p);
        setProviderId(p.id);
        setProviderName(p.name);
        setRole((p.providerType as AssignedProviderDto["role"]) || "Primary");
        setEndDate(p.licenseExpiry || "");
        setNotes(p.specialty || "");
        console.log('Updated fields - ID:', p.id, 'Role:', p.providerType, 'Expiry:', p.licenseExpiry, 'Specialty:', p.specialty);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);
        try {
            if (providerId === "" || Number(providerId) <= 0) throw new Error("Please select a provider");

            const body: AssignedProviderDto = {
                patientId,
                encounterId,
                providerId: Number(providerId),
                role,
                ...(providerName ? { providerName: providerName.trim() } : {}),
                ...(endDate ? { endDate } : {}),
                ...(notes ? { notes: notes.trim() } : {}),
                ...(editing?.id ? { id: editing.id } : {}),
            };

            const url = editing?.id
                ? `/api/assigned-providers/${patientId}/${encounterId}/${editing.id}`
                : `/api/assigned-providers/${patientId}/${encounterId}`;
            const method = editing?.id ? "PUT" : "POST";

            const res = await fetchWithOrg(url, { method, body: JSON.stringify(body) });
            const json = (await res.json()) as ApiResponse<AssignedProviderDto>;
            if (!res.ok || !json.success) throw new Error(json.message || "Save failed");
            onSaved(json.data!);
            removeEncounterSection(patientId, encounterId, "assignedProvider");

            if (!editing?.id) {
                setProviderId(""); setProviderName(""); setRole("Primary");
                setEndDate(""); setNotes("");
            }
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border p-4 shadow-sm bg-white">
            <h3 className="text-lg font-semibold">{editing?.id ? "Edit Assignment" : "Assign Provider"}</h3>

            <div>
                <label className="block text-sm font-medium mb-1">Provider <span className="text-red-600">*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <select
                            className="w-full rounded-lg border px-3 py-2 focus:ring"
                            value={providerId}
                            onChange={(e) => {
                                const selectedId = Number(e.target.value);
                                console.log('Dropdown changed, selected ID:', selectedId);
                                const selected = options.find(p => p.id === selectedId);
                                console.log('Found provider:', selected);
                                if (selected) chooseProvider(selected);
                            }}
                            required
                        >
                            <option value="">Select Provider</option>
                            {options.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.npi ? `(NPI: ${p.npi})` : ""}
                                </option>
                            ))}
                        </select>
                        {loadingProviders && <p className="text-xs text-gray-500 mt-1">Loading providers…</p>}
                    </div>
                    <div>
                        <input
                            className="w-full rounded-lg border px-3 py-2 focus:ring bg-gray-50"
                            type="number"
                            value={providerId}
                            readOnly
                            placeholder="Provider ID"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Role (Provider Type)</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={role}
                        onChange={(e) => setRole(e.target.value as AssignedProviderDto["role"])}
                        placeholder="Auto-filled from provider"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">License Expiry Date</label>
                    <input
                        type="date"
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Specialty</label>
                <textarea
                    className="w-full rounded-lg border px-3 py-2 focus:ring min-h-20"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Auto-filled from provider"
                />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {saving ? "Saving..." : editing?.id ? "Update" : "Save"}
                </button>
                {onCancel && (
                    <button type="button" onClick={() => { removeEncounterSection(patientId, encounterId, "assignedProvider"); onCancel(); }} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
