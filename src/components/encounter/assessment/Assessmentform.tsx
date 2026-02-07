


"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { ApiResponse, AssessmentDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";

type Props = {
    patientId: number;
    encounterId: number;
    editing?: AssessmentDto | null;
    onSaved: (saved: AssessmentDto) => void;
    onCancel?: () => void;
};

const CODE_TYPES = ["CPT4", "HCPCS", "ICD10", "ICD9", "CVX", "CUSTOM"] as const;

type CodeOption = {
    id: number;
    code: string;
    description?: string;
};

export default function Assessmentform({ patientId, encounterId, editing, onSaved, onCancel }: Props) {
    const [codeType, setCodeType] = useState<string>("ICD10");
    const [diagnosisCode, setDiagnosisCode] = useState("");
    const [diagnosisName, setDiagnosisName] = useState("");
    const [status, setStatus] = useState<AssessmentDto["status"]>("Active");
    const [priority, setPriority] = useState<AssessmentDto["priority"]>("Primary");
    const [assessmentText, setAssessmentText] = useState("");
    const [notes, setNotes] = useState("");

    const [codeOptions, setCodeOptions] = useState<CodeOption[]>([]);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

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
                    description: item.description || item.shortDescription
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

    useEffect(() => {
        if (codeType) fetchCodes(codeType);
    }, [codeType]);

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.assessment && !editing?.id) {
            const data = encounterData.assessment;
            setDiagnosisCode(data.diagnosisCode || "");
            setDiagnosisName(data.diagnosisName || "");
            setStatus(data.status || "Active");
            setPriority(data.priority || "Primary");
            setAssessmentText(data.assessmentText || "");
            setNotes(data.notes || "");
        } else if (editing?.id) {
            setDiagnosisCode(editing.diagnosisCode || "");
            setDiagnosisName(editing.diagnosisName || "");
            setStatus(editing.status || "Active");
            setPriority(editing.priority || "Primary");
            setAssessmentText(editing.assessmentText || "");
            setNotes(editing.notes || "");
        } else {
            setDiagnosisCode("");
            setDiagnosisName("");
            setStatus("Active");
            setPriority("Primary");
            setAssessmentText("");
            setNotes("");
        }
    }, [editing, patientId, encounterId]);

    useEffect(() => {
        if (diagnosisCode || diagnosisName || assessmentText || notes) {
            setEncounterSection(patientId, encounterId, "assessment", {
                diagnosisCode,
                diagnosisName,
                status,
                priority,
                assessmentText,
                notes
            });
        }
    }, [diagnosisCode, diagnosisName, status, priority, assessmentText, notes, patientId, encounterId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErr(null);

        try {
            const body: AssessmentDto = {
                patientId,
                encounterId,
                ...(diagnosisCode ? { diagnosisCode: diagnosisCode.trim() } : {}),
                ...(diagnosisName ? { diagnosisName: diagnosisName.trim() } : {}),
                ...(status ? { status } : {}),
                ...(priority ? { priority } : {}),
                ...(assessmentText ? { assessmentText: assessmentText.trim() } : {}),
                ...(notes ? { notes: notes.trim() } : {}),
                ...(editing?.id ? { id: editing.id } : {}),
            };

            const url = editing?.id
                ? `/api/assessment/${patientId}/${encounterId}/${editing.id}`
                : `/api/assessment/${patientId}/${encounterId}`;

            const method = editing?.id ? "PUT" : "POST";

            const res = await fetchWithOrg(url, { method, body: JSON.stringify(body) });
            const json = (await res.json()) as ApiResponse<AssessmentDto>;
            if (!res.ok || !json.success) throw new Error(json.message || "Save failed");

            onSaved(json.data!);
            removeEncounterSection(patientId, encounterId, "assessment");

            if (!editing?.id) {
                setDiagnosisCode(""); setDiagnosisName(""); setStatus("Active"); setPriority("Primary");
                setAssessmentText(""); setNotes("");
            }
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border p-4 shadow-sm bg-white">
            <h3 className="text-lg font-semibold">{editing?.id ? "Edit Assessment" : "Add Assessment"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                <div>
                    <label className="block text-sm font-medium mb-1">Diagnosis Code <span className="text-red-600">*</span></label>
                    <select
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={diagnosisCode}
                        onChange={(e) => {
                            const selected = codeOptions.find(c => c.code === e.target.value);
                            if (selected) {
                                setDiagnosisCode(selected.code);
                                setDiagnosisName(selected.description || "");
                            }
                        }}
                        required
                    >
                        <option value="">Select Code</option>
                        {codeOptions.map(c => (
                            <option key={c.id} value={c.code}>
                                {c.code} - {c.description}
                            </option>
                        ))}
                    </select>
                    {loadingCodes && <p className="text-xs text-gray-500 mt-1">Loading codes...</p>}
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Diagnosis Name <span className="text-red-600">*</span></label>
                    <input
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={diagnosisName}
                        onChange={(e) => setDiagnosisName(e.target.value)}
                        placeholder="e.g., Low back pain"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as AssessmentDto["status"])}
                    >
                        <option value="Active">Active</option>
                        <option value="Resolved">Resolved</option>
                        <option value="RuleOut">Rule Out</option>
                        <option value="Differential">Differential</option>
                        <option value="Chronic">Chronic</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                        className="w-full rounded-lg border px-3 py-2 focus:ring"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as AssessmentDto["priority"])}
                    >
                        <option value="Primary">Primary</option>
                        <option value="Secondary">Secondary</option>
                        <option value="Tertiary">Tertiary</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Assessment / Impression <span className="text-red-600">*</span></label>
                    <textarea
                        className="w-full rounded-lg border px-3 py-2 focus:ring min-h-24"
                        value={assessmentText}
                        onChange={(e) => setAssessmentText(e.target.value)}
                        placeholder="Clinical impression, differentials, brief rationale"
                        required
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Notes </label>
                    <textarea
                        className="w-full rounded-lg border px-3 py-2 focus:ring min-h-20"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional notes"
                    />
                </div>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex items-center gap-2">
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
                    {saving ? "Saving..." : editing?.id ? "Update" : "Save"}
                </button>
                {onCancel && (
                    <button type="button" onClick={() => { removeEncounterSection(patientId, encounterId, "assessment"); onCancel(); }} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
