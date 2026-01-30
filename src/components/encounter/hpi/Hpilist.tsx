"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, HpiDto } from "@/utils/types";
import Hpiform from "./Hpiform";

type Props = { patientId: number; encounterId: number };

// --- helpers ---------------------------------------------------------------
async function safeJson<T>(res: Response): Promise<T | null> {
    const t = await res.text().catch(() => "");
    if (!t) return null;
    try { return JSON.parse(t) as T; } catch { return null; }
}
// function escapeHtml(s: string) {
//     return String(s).replace(/[&<>"']/g, (m) => (
//         { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" } as Record<string,string>
//     )[m]!);
// }
// Be flexible with DTO shape differences

// function pickHpiFields(hpi: HpiDto) {
//     const any = hpi as any;
//     const narrative: string | undefined =
//         typeof any.narrative === "string" ? any.narrative :
//             typeof any.description === "string" ? any.description : undefined;
//
//     return {
//         narrative,
//         onset: any.onset ?? any.onsetDate ?? any.onsetTime,
//         duration: any.duration,
//         severity: any.severity,
//         location: any.location,
//         character: any.character,
//         timing: any.timing,
//         aggravatingFactors: any.aggravatingFactors,
//         alleviatingFactors: any.alleviatingFactors,
//         associatedSymptoms: any.associatedSymptoms,
//         esigned: Boolean(any.esigned || any.signed || any.signedAt),
//     };
// }
// ---------------------------------------------------------------------------


function pickHpiFields(hpi: HpiDto) {
    const rec = hpi as Record<string, unknown>;
    const narrative =
        typeof rec.narrative === "string" ? rec.narrative :
            typeof rec.description === "string" ? rec.description : undefined;

    const normalize = (v: unknown): string | number | undefined => {
        if (typeof v === "string" || typeof v === "number") return v;
        return undefined;
    };

    return {
        narrative,
        onset: normalize(rec.onset ?? rec.onsetDate ?? rec.onsetTime),
        duration: normalize(rec.duration),
        severity: normalize(rec.severity),
        location: normalize(rec.location),
        character: normalize(rec.character),
        timing: normalize(rec.timing),
        aggravatingFactors: normalize(rec.aggravatingFactors),
        alleviatingFactors: normalize(rec.alleviatingFactors),
        associatedSymptoms: normalize(rec.associatedSymptoms),
        esigned: Boolean(rec.esigned || rec.signed || rec.signedAt),
    };
}



export default function Hpilist({ patientId, encounterId }: Props) {
    const [items, setItems] = useState<HpiDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<HpiDto | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            // GET /api/history-of-present-illness/{patientId}/{encounterId}
            const res = await fetchWithOrg(
                `/api/history-of-present-illness/${patientId}/${encounterId}`,
                { headers: { Accept: "application/json" } }
            );
            const json = await safeJson<ApiResponse<HpiDto[]>>(res);
            if (!res.ok || !json || json.success === false) throw new Error(json?.message || "Load failed");
            setItems(json.data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        }
        finally {
            setLoading(false);
        }
    }

   // useEffect(() => { void load(); }, [patientId, encounterId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void load(); }, [patientId, encounterId]);

    function onSaved(saved: HpiDto) {
        setShowForm(false);
        setEditing(null);
        setItems((prev) => {
            const i = prev.findIndex((x) => x.id === saved.id);
            if (i >= 0) { const copy = [...prev]; copy[i] = saved; return copy; }
            return [saved, ...prev];
        });
        setToast({ type: "success", msg: "HPI saved." });
        setTimeout(() => setToast(null), 3000);
    }

    async function remove(id: number) {
        if (!confirm("Delete this HPI entry?")) return;
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/history-of-present-illness/${patientId}/${encounterId}/${id}`,
                { method: "DELETE", headers: { Accept: "application/json" } }
            );
            const json = await safeJson<ApiResponse<void>>(res);
            if (!res.ok || (json && json.success === false)) throw new Error(json?.message || "Delete failed");
            setItems((p) => p.filter((x) => x.id !== id));
            setToast({ type: "success", msg: "HPI deleted." });
        } catch (e: unknown) {
            setToast({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        }
        finally {
            setBusyId(null);
            setTimeout(() => setToast(null), 3000);
        }
    }

    // --- eSign: POST /esign ---------------------------------------------------
    async function esign(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/history-of-present-illness/${patientId}/${encounterId}/${id}/esign`,
                { method: "POST", headers: { Accept: "application/json" } }
            );
            const json = await safeJson<ApiResponse<unknown>>(res);
            if (!res.ok || (json && json.success === false)) throw new Error(json?.message || "eSign failed");
            setToast({ type: "success", msg: "HPI entry e-signed." });
            await load(); // reflect read-only state
        } catch (e: unknown) {
            window.alert(e instanceof Error ? e.message : "Unable to print");
        }


        finally {
            setBusyId(null);
            setTimeout(() => setToast(null), 3000);
        }
    }

    // --- Print (backend PDF): GET /print -------------------------------------
    async function printBackend(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/history-of-present-illness/${patientId}/${encounterId}/${id}/print`,
                { headers: { Accept: "application/pdf" } }
            );
            if (!res.ok) throw new Error("Print failed");
            const blob = await res.blob();
            if (!blob || blob.size === 0) throw new Error("Empty PDF received");
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (e: unknown) {
            window.alert(e instanceof Error ? e.message : "Unable to print");
        }
        finally {
            setBusyId(null);
        }
    }

    const sorted = useMemo(() => {
        return [...items].sort((a, b) => {
            const d1 = a.audit?.lastModifiedDate || a.audit?.createdDate || "";
            const d2 = b.audit?.lastModifiedDate || b.audit?.createdDate || "";
            return d2.localeCompare(d1);
        });
    }, [items]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">History of Present Illness (HPI)</h2>
                <button
                    onClick={() => { setEditing(null); setShowForm((s) => !s); }}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Add HPI"}
                </button>
            </div>

            {toast && (
                <div
                    className={`rounded-xl border px-4 py-2 text-sm ${
                        toast.type === "success"
                            ? "border-green-300 bg-green-50 text-green-800"
                            : "border-red-300 bg-red-50 text-red-800"
                    }`}
                    role="status"
                >
                    {toast.msg}
                </div>
            )}

            {showForm && (
                <Hpiform
                    patientId={patientId}
                    encounterId={encounterId}
                    editing={editing}
                    onSaved={onSaved}
                    onCancel={() => { setShowForm(false); setEditing(null); }}
                />
            )}

            {loading && <div className="text-gray-600">Loading...</div>}
            {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && sorted.length === 0 && (
                <div className="rounded-xl border p-4 text-gray-600">No HPI entries yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((hpi) => {
                    const {
                        narrative, onset, duration, severity, location, character, timing,
                        aggravatingFactors, alleviatingFactors, associatedSymptoms, esigned
                    } = pickHpiFields(hpi);

                    return (
                        <li key={hpi.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-gray-900 whitespace-pre-wrap">{narrative ?? ""}</p>
                                    <p className="text-xs text-gray-500">
                                        {hpi.audit?.createdDate && <>Created: {hpi.audit.createdDate}</>}
                                        {hpi.audit?.lastModifiedDate && <> · Updated: {hpi.audit.lastModifiedDate}</>}
                                    </p>

                                    {/* Structured fields when present */}
                                    <div className="text-xs text-gray-600 space-x-2">
                                        {onset && <span><b>Onset:</b> {String(onset)}</span>}
                                        {duration && <span><b>Duration:</b> {String(duration)}</span>}
                                        {severity && <span><b>Severity:</b> {String(severity)}</span>}
                                        {location && <span><b>Location:</b> {String(location)}</span>}
                                        {character && <span><b>Character:</b> {String(character)}</span>}
                                        {timing && <span><b>Timing:</b> {String(timing)}</span>}
                                        {aggravatingFactors && <span><b>Aggravating:</b> {String(aggravatingFactors)}</span>}
                                        {alleviatingFactors && <span><b>Alleviating:</b> {String(alleviatingFactors)}</span>}
                                        {associatedSymptoms && <span><b>Assoc.:</b> {String(associatedSymptoms)}</span>}
                                    </div>

                                    {esigned && <p className="text-xs text-gray-500 font-medium">Signed — read only</p>}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {!esigned && (
                                        <>
                                            <button
                                                onClick={() => { setEditing(hpi); setShowForm(true); }}
                                                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                onClick={() => remove(hpi.id!)}
                                                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                                disabled={busyId === hpi.id}
                                            >
                                                Delete
                                            </button>

                                            <button
                                                onClick={() => esign(hpi.id!)}
                                                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                                disabled={busyId === hpi.id}
                                                title="eSign"
                                            >
                                                eSign
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => printBackend(hpi.id!)}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                        disabled={busyId === hpi.id}
                                        title="Print"
                                    >
                                        Print
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
