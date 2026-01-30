"use client";

import { useEffect, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, FamilyHistoryDto, FamilyHistoryEntryDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";

type Props = {
    patientId: number;
    encounterId: number;
    fhId: number | null;                           // <— container id (can be null if none yet)
    entries: FamilyHistoryEntryDto[];              // <— current entries
    editing?: FamilyHistoryEntryDto | null;
    onSaved: () => void;                           // parent will reload
    onCancel?: () => void;
};

const RELATIONS: FamilyHistoryEntryDto["relation"][] = ["FATHER","MOTHER","SIBLING","SPOUSE","OFFSPRING"];

async function safeJson<T>(res: Response): Promise<T | null> {
    const t = await res.text().catch(() => "");
    if (!t) return null;
    try { return JSON.parse(t) as T; } catch { return null; }
}

export default function FHform({ patientId, encounterId, fhId, entries, editing, onSaved, onCancel }: Props) {
    const [relation, setRelation] = useState<FamilyHistoryEntryDto["relation"]>("FATHER");
    const [diagnosisCode, setDiagnosisCode] = useState("");
    const [diagnosisText, setDiagnosisText] = useState("");
    const [notes, setNotes] = useState("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.familyHistory && !editing?.id) {
            const data = encounterData.familyHistory;
            setRelation(data.relation || "FATHER");
            setDiagnosisCode(data.diagnosisCode || "");
            setDiagnosisText(data.diagnosisText || "");
            setNotes(data.notes || "");
        } else if (editing?.id) {
            setRelation(editing.relation || "FATHER");
            setDiagnosisCode(editing.diagnosisCode || "");
            setDiagnosisText(editing.diagnosisText || "");
            setNotes(editing.notes || "");
        } else {
            setRelation("FATHER"); setDiagnosisCode(""); setDiagnosisText(""); setNotes("");
        }
    }, [editing, patientId, encounterId]);

    useEffect(() => {
        if (relation || diagnosisCode || diagnosisText || notes) {
            setEncounterSection(patientId, encounterId, "familyHistory", {
                relation,
                diagnosisCode,
                diagnosisText,
                notes
            });
        }
    }, [relation, diagnosisCode, diagnosisText, notes, patientId, encounterId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);
        try {
            const newEntry: FamilyHistoryEntryDto = {
                ...(editing?.id ? { id: editing.id } : {}),
                relation,
                ...(diagnosisCode ? { diagnosisCode } : {}),
                ...(diagnosisText ? { diagnosisText } : {}),
                ...(notes ? { notes } : {}),
            };

            let url: string;
            let method: "POST" | "PUT";
            let body: FamilyHistoryDto;

            if (fhId) {
                // Update existing container: PUT full entries array
                const next = editing?.id
                    ? entries.map(e => e.id === editing.id ? { ...e, ...newEntry } : e)
                    : [...entries, newEntry];

                url = `/api/family-history/${patientId}/${encounterId}/${fhId}`;
                method = "PUT";
                body = { id: fhId, patientId, encounterId, entries: next } as FamilyHistoryDto;
            } else {
                // No container yet: POST to create it
                url = `/api/family-history/${patientId}/${encounterId}`;
                method = "POST";
                body = { patientId, encounterId, entries: [newEntry] } as FamilyHistoryDto;
            }

            const res = await fetchWithOrg(url, {
                method,
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(body),
            });

            const json = await safeJson<ApiResponse<FamilyHistoryDto>>(res);
            if (!res.ok || !json || json.success !== true) {
                throw new Error(json?.message || `Save failed (${res.status})`);
            }

            removeEncounterSection(patientId, encounterId, "familyHistory");
            onSaved();
        } catch (e: unknown) {
            if (e instanceof Error) {
                setErr(e.message);
            } else {
                setErr("Something went wrong");
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-2xl border p-4 shadow-sm bg-white space-y-4">
            <h3 className="text-lg font-semibold">{editing?.id ? "Edit Family History" : "Add Family History"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Relation <span className="text-red-600">*</span></label>
                    <select className="w-full rounded-lg border px-3 py-2 focus:ring"
                            value={relation}
                            onChange={(e) => setRelation(e.target.value as FamilyHistoryEntryDto["relation"])}
                            required>
                        {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Diagnosis Code <span className="text-red-600">*</span></label>
                    <input className="w-full rounded-lg border px-3 py-2 focus:ring"
                           value={diagnosisCode}
                           onChange={(e) => setDiagnosisCode(e.target.value)}
                           placeholder="e.g., I10"
                           required />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Diagnosis Text <span className="text-red-600">*</span></label>
                    <input className="w-full rounded-lg border px-3 py-2 focus:ring"
                           value={diagnosisText}
                           onChange={(e) => setDiagnosisText(e.target.value)}
                           placeholder="Hypertension"
                           required />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Notes </label>
                    <textarea className="w-full rounded-lg border px-3 py-2 focus:ring min-h-20"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Additional context"
                               />
                </div>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
                <button type="submit" disabled={saving}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
                    {saving ? "Saving..." : editing?.id ? "Update" : "Save"}
                </button>
                {onCancel && (
                    <button type="button" onClick={() => { removeEncounterSection(patientId, encounterId, "familyHistory"); onCancel(); }} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
