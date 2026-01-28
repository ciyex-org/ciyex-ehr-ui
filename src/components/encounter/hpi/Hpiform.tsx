"use client";

import { useEffect, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, HpiDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";

type Props = {
    patientId: number;
    encounterId: number;
    editing?: HpiDto | null;
    onSaved: (saved: HpiDto) => void;
    onCancel?: () => void;
};

export default function Hpiform({ patientId, encounterId, editing, onSaved, onCancel }: Props) {
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.hpi && !editing?.id) {
            setDescription(encounterData.hpi.description || "");
        } else {
            setDescription(editing?.description ?? "");
        }
    }, [editing, patientId, encounterId]);

    useEffect(() => {
        if (description) {
            setEncounterSection(patientId, encounterId, "hpi", { description });
        }
    }, [description, patientId, encounterId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);
        try {
            const body: HpiDto = {
                patientId,
                encounterId,
                description: description.trim(),
                ...(editing?.id ? { id: editing.id } : {}),
            };

            const url = editing?.id
                ? `/api/history-of-present-illness/${patientId}/${encounterId}/${editing.id}`
                : `/api/history-of-present-illness/${patientId}/${encounterId}`;
            const method = editing?.id ? "PUT" : "POST";

            const res = await fetchWithOrg(url, { method, body: JSON.stringify(body) });
            const json = (await res.json()) as ApiResponse<HpiDto>;
            if (!res.ok || !json.success) throw new Error(json.message || "Save failed");

            onSaved(json.data!);
            removeEncounterSection(patientId, encounterId, "hpi");
            if (!editing?.id) setDescription("");
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border p-4 shadow-sm bg-white">
            <h3 className="text-lg font-semibold">{editing?.id ? "Edit HPI" : "Add HPI"}</h3>

            <div>
                <label className="block text-sm font-medium mb-1">Description <span className="text-red-600">*</span></label>
                <textarea
                    className="w-full rounded-lg border px-3 py-2 focus:ring min-h-28"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Patient presents with intermittent chest pain lasting 2 weeks, worsens with exertion."
                    required
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
                    <button type="button" onClick={() => { removeEncounterSection(patientId, encounterId, "hpi"); onCancel(); }} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
