"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { ApiResponse, ProviderNoteDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";

type Props = {
    patientId: number;
    encounterId: number;
    editing?: ProviderNoteDto | null;
    onSaved: (saved: ProviderNoteDto) => void;
    onCancel?: () => void;
};

/** Safely parse JSON (handles empty/non-JSON bodies). */
async function safeJson<T>(res: Response): Promise<T | null> {
    try {
        const txt = await res.text();
        if (!txt) return null;
        return JSON.parse(txt) as T;
    } catch {
        return null;
    }
}

const NOTE_STATUSES = ["draft", "final", "amended"] as const;
type NoteStatus = (typeof NOTE_STATUSES)[number];

const DEFAULT_TYPE_CODE = "34109-0";

export default function Providernoteform({
                                             patientId,
                                             encounterId,
                                             editing,
                                             onSaved,
                                             onCancel,
                                         }: Props) {
    const [noteTitle, setNoteTitle] = useState("");
    const [noteTypeCode, setNoteTypeCode] = useState(DEFAULT_TYPE_CODE);
    const [noteStatus, setNoteStatus] = useState<NoteStatus>("draft");
    const [noteDateTime, setNoteDateTime] = useState<string>(""); // yyyy-MM-ddTHH:mm
    const [authorPractitionerId, setAuthorPractitionerId] = useState<string>("");
    const [subjective, setSubjective] = useState("");
    const [objective, setObjective] = useState("");
    const [assessment, setAssessment] = useState("");
    const [plan, setPlan] = useState("");
    const [narrative, setNarrative] = useState("");
    const [externalId, setExternalId] = useState("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const isSigned = !!editing?.signed;

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.providerNotes && !editing?.id) {
            const data = encounterData.providerNotes;
            setNoteTitle(data.noteTitle ?? "");
            setNoteTypeCode(data.noteTypeCode ?? DEFAULT_TYPE_CODE);
            setNoteStatus((data.noteStatus as NoteStatus) ?? "draft");
            setNoteDateTime(data.noteDateTime ?? "");
            setAuthorPractitionerId(data.authorPractitionerId ?? "");
            setSubjective(data.subjective ?? "");
            setObjective(data.objective ?? "");
            setAssessment(data.assessment ?? "");
            setPlan(data.plan ?? "");
            setNarrative(data.narrative ?? "");
            setExternalId((data as any).externalId ?? "");
        } else if (editing) {
            setNoteTitle(editing.noteTitle ?? "");
            setNoteTypeCode(editing.noteTypeCode ?? DEFAULT_TYPE_CODE);
            setNoteStatus(((editing.noteStatus as string) || "draft") as NoteStatus);
            const dt = (editing.noteDateTime ?? "").replace(/:\d\d(\.\d+)?Z?$/, "");
            setNoteDateTime(dt);
            setAuthorPractitionerId(
                editing.authorPractitionerId != null ? String(editing.authorPractitionerId) : ""
            );
            setSubjective(editing.subjective ?? "");
            setObjective(editing.objective ?? "");
            setAssessment(editing.assessment ?? "");
            setPlan(editing.plan ?? "");
            setNarrative(editing.narrative ?? "");
            setExternalId(editing.externalId ?? "");
        } else {
            setNoteTitle("");
            setNoteTypeCode(DEFAULT_TYPE_CODE);
            setNoteStatus("draft");
            setNoteDateTime("");
            setAuthorPractitionerId("");
            setSubjective("");
            setObjective("");
            setAssessment("");
            setPlan("");
            setNarrative("");
            setExternalId("");
        }
    }, [editing, patientId, encounterId]);

    useEffect(() => {
        if (noteTitle || subjective || objective || assessment || plan || narrative) {
            setEncounterSection(patientId, encounterId, "providerNotes", {
                noteTitle, noteTypeCode, noteStatus, noteDateTime,
                authorPractitionerId, subjective, objective,
                assessment, plan, narrative
            } as any);
        }
    }, [noteTitle, noteTypeCode, noteStatus, noteDateTime, authorPractitionerId, subjective, objective, assessment, plan, narrative, patientId, encounterId]);

    function normalizeLocalDateTime(val: string) {
        // Ensure we send seconds too (yyyy-MM-ddTHH:mm -> yyyy-MM-ddTHH:mm:00)
        if (!val) return val;
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val) ? `${val}:00` : val;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (isSigned) return;

        // Basic validations
        if (!noteTitle.trim()) return setErr("Title is required.");
        if (!noteDateTime) return setErr("Note date/time is required.");
        if (
            !subjective.trim() &&
            !objective.trim() &&
            !assessment.trim() &&
            !plan.trim() &&
            !narrative.trim()
        ) {
            return setErr("Enter at least one SOAP/narrative field.");
        }

        setSaving(true);
        setErr(null);

        try {
            const body: ProviderNoteDto = {
                id: editing?.id,
                patientId,
                encounterId,
                noteTitle: noteTitle.trim(),
                noteTypeCode: noteTypeCode.trim(),
                noteStatus, // NoteStatus union is compatible with DTO string literal
                noteDateTime: normalizeLocalDateTime(noteDateTime),
                authorPractitionerId: authorPractitionerId ? Number(authorPractitionerId) : undefined,
                subjective: subjective || undefined,
                objective: objective || undefined,
                assessment: assessment || undefined,
                plan: plan || undefined,
                narrative: narrative || undefined,
                externalId: externalId || undefined,
            };

            const method = editing?.id ? "PUT" : "POST";
            const url = editing?.id
                ? `/api/provider-notes/${patientId}/${encounterId}/${editing.id}`
                : `/api/provider-notes/${patientId}/${encounterId}`;

            const res = await fetchWithAuth(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const json = await safeJson<ApiResponse<ProviderNoteDto>>(res);

            if (!res.ok) {
                // Show a helpful error instead of JSON parse exception
                const msg = json?.message || `HTTP ${res.status} while saving`;
                throw new Error(msg);
            }
            if (!json || json.success !== true) {
                throw new Error(json?.message || "Save failed");
            }

            onSaved(json.data!);
            removeEncounterSection(patientId, encounterId, "providerNotes");

            if (!editing?.id) {
                setNoteTitle("");
                setNoteTypeCode(DEFAULT_TYPE_CODE);
                setNoteStatus("draft");
                setNoteDateTime("");
                setAuthorPractitionerId("");
                setSubjective("");
                setObjective("");
                setAssessment("");
                setPlan("");
                setNarrative("");
                setExternalId("");
            }
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border p-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold">
                {editing?.id ? (isSigned ? "View Provider Note (Signed)" : "Edit Provider Note") : "Add Provider Note"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        disabled={isSigned}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Type Code (LOINC)</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2"
                        value={noteTypeCode}
                        onChange={(e) => setNoteTypeCode(e.target.value)}
                        disabled={isSigned}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                        className="w-full rounded-lg border px-3 py-2"
                        value={noteStatus}
                        onChange={(e) => setNoteStatus(e.target.value as NoteStatus)}
                        disabled={isSigned}
                    >
                        {NOTE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Note Date/Time</label>
                    <input
                        type="datetime-local"
                        className="w-full rounded-lg border px-3 py-2"
                        value={noteDateTime}
                        onChange={(e) => setNoteDateTime(e.target.value)}
                        disabled={isSigned}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Author Practitioner ID</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2"
                        value={authorPractitionerId}
                        onChange={(e) => setAuthorPractitionerId(e.target.value)}
                        disabled={isSigned}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">External ID (optional)</label>
                    <input
                        className="w-full rounded-lg border px-3 py-2"
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                        disabled={isSigned}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Subjective <span className="text-red-600">*</span></label>
                    <textarea
                        className="w-full rounded-lg border px-3 py-2 min-h-24"
                        value={subjective}
                        onChange={(e) => setSubjective(e.target.value)}
                        disabled={isSigned}
                        required={!isSigned}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Objective <span className="text-red-600">*</span></label>
                    <textarea
                        className="w-full rounded-lg border px-3 py-2 min-h-24"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        disabled={isSigned}
                        required={!isSigned}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Assessment <span className="text-red-600">*</span></label>
                    <textarea
                        className="w-full rounded-lg border px-3 py-2 min-h-24"
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        disabled={isSigned}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Plan <span className="text-red-600">*</span></label>
                    <textarea
                        className="w-full rounded-lg border px-3 py-2 min-h-24"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        disabled={isSigned}
                        required={!isSigned}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Narrative <span className="text-red-600">*</span></label>
                <textarea
                    className="w-full rounded-lg border px-3 py-2 min-h-24"
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    disabled={isSigned}
                    required={!isSigned}
                />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex gap-2">
                {!isSigned && (
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {saving ? "Saving..." : editing?.id ? "Update" : "Save"}
                    </button>
                )}
                {onCancel && (
                    <button
                        type="button"
                        onClick={() => { removeEncounterSection(patientId, encounterId, "providerNotes"); onCancel(); }}
                        className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                    >
                        {isSigned ? "Close" : "Cancel"}
                    </button>
                )}
            </div>
        </form>
    );
}
