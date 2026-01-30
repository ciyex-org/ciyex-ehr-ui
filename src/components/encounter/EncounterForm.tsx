"use client";

import { useEffect, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { ApiResponse, EncounterDto } from "@/utils/types";

type Props = {
    patientId: number;
    editing?: EncounterDto | null;
    onSaved: (e: EncounterDto) => void;
    onCancel?: () => void;
};

interface Provider { id: number; name: string; }

export default function EncounterForm({ patientId, editing, onSaved, onCancel }: Props) {
    const [encounterDate, setEncounterDate] = useState("");
    const [reason, setReason] = useState("");
    const [visitType, setVisitType] = useState("");
    const [providerId, setProviderId] = useState<number | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/providers`);
                if (!res.ok) return;
                const data = await res.json();
                const list: Provider[] = data.data.map((p: {id:number;identification:{firstName:string;lastName:string}})=>({
                    id:p.id,
                    name:`${p.identification.firstName} ${p.identification.lastName}`,
                }));
                setProviders(list);
            } catch {}
        };
        fetchProviders();
    }, []);

    useEffect(() => {
        if (editing && editing.id) {
            const iso =
                typeof editing.encounterDate === "string" ? editing.encounterDate.slice(0, 10) : "";
            setEncounterDate(iso);
            setReason(editing.reason || "");
            setStatus(editing.status === "OPEN" || editing.status === "CLOSED" ? editing.status : "OPEN");
        } else {
            setEncounterDate(new Date().toISOString().slice(0, 10));
            setReason("");
            setVisitType("");
            setProviderId(null);
            setStatus("OPEN");
            
            // Fetch latest appointment for this patient
            const fetchLatestAppointment = async () => {
                try {
                    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments?page=0&size=100`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const appointments = data?.data?.content ?? [];
                    
                    // Filter by patientId and get the latest
                    const patientAppts = appointments.filter((a: any) => a.patientId === patientId);
                    if (patientAppts.length > 0) {
                        const latest = patientAppts.sort((a: any, b: any) => 
                            new Date(b.appointmentStartDate).getTime() - new Date(a.appointmentStartDate).getTime()
                        )[0];
                        
                        setVisitType(latest.visitType || "");
                        setProviderId(latest.providerId || null);
                        setReason(latest.priority || "");
                    }
                } catch {}
            };
            fetchLatestAppointment();
        }
    }, [editing, patientId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setErr(null);
        try {
            const base: Omit<EncounterDto, "id"> = { patientId, encounterDate, reason, status };

            let method: "POST" | "PUT" = "POST";
            let url = `/api/${patientId}/encounters`;
            const payload: Partial<EncounterDto> =
                editing && editing.id ? { ...base, id: editing.id } : base;

            if (editing && editing.id) {
                method = "PUT";
                url = `/api/${patientId}/encounters/${editing.id}`;
            }

            const res = await fetchWithOrg(url, { method, body: JSON.stringify(payload) });
            const json = (await res.json()) as ApiResponse<EncounterDto>;
            if (!res.ok || !json.success) throw new Error(json.message || "Save failed");
            onSaved(json.data!);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Error");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border p-4 shadow-sm bg-white relative z-10">
            <h3 className="text-lg font-semibold">{editing?.id ? "Edit Encounter" : "New Encounter"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Date<span className="text-red-600">*</span></label>
                    <input
                        type="date"
                        value={encounterDate}
                        onChange={(e) => setEncounterDate(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Provider<span className="text-red-600">*</span></label>
                    <select
                        value={providerId ?? ""}
                        onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        required
                    >
                        <option value="">Select Provider</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Type<span className="text-red-600">*</span></label>
                    <input
                        value={visitType}
                        onChange={(e) => setVisitType(e.target.value)}
                        placeholder="Visit type"
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as "OPEN" | "CLOSED")}
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                    >
                        <option value="OPEN">OPEN</option>
                        <option value="CLOSED">CLOSED</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-1">Reason for Visit<span className="text-red-600">*</span></label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for visit"
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        rows={3}
                        required
                    />
                </div>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {submitting ? "Saving..." : editing?.id ? "Update" : "Save"}
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
