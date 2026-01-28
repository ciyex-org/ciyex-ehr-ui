"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, FamilyHistoryDto, FamilyHistoryEntryDto } from "@/utils/types";
import FHform from "./FHform";

type Props = { patientId: number | string; encounterId: number | string };

async function safeJson<T>(res: Response): Promise<T | null> {
    const t = await res.text().catch(() => "");
    if (!t) return null;
    try { return JSON.parse(t) as T; } catch { return null; }
}

/** Normalize entries and signature fields from possible backend shapes */
function entriesFromDto(dto: unknown): FamilyHistoryEntryDto[] {
    if (!dto || typeof dto !== "object") return [];
    const d = dto as Record<string, unknown>;
    if (Array.isArray(d.entries)) return d.entries as FamilyHistoryEntryDto[];
    if (Array.isArray(d.familyHistoryEntries)) return d.familyHistoryEntries as FamilyHistoryEntryDto[];
    if (Array.isArray(d.items)) return d.items as FamilyHistoryEntryDto[];
    return [];
}

function pickSignedEntryId(dto: unknown): number | null {
    if (!dto || typeof dto !== "object") return null;
    const d = dto as Record<string, unknown>;
    if (typeof d.signedEntryId === "number") return d.signedEntryId;
    if (typeof d.signed_entry_id === "number") return d.signed_entry_id as number;
    if (typeof d.signedEntryID === "number") return d.signedEntryID as number;
    return null;
}


export default function FHlist(props: Props) {
    const pid = Number(props.patientId);
    const eid = Number(props.encounterId);

    const [fhId, setFhId] = useState<number | null>(null);
    const [items, setItems] = useState<FamilyHistoryEntryDto[]>([]);
    const [signedEntryId, setSignedEntryId] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<FamilyHistoryEntryDto | null>(null);

    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null); // for eSign/print in-flight

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithOrg(`/api/family-history/${pid}/${eid}`, {
                headers: { Accept: "application/json" },
            });
            const json = await safeJson<ApiResponse<FamilyHistoryDto | FamilyHistoryDto[]>>(res);

            if (!res.ok) throw new Error(`Load failed (${res.status})`);
            if (!json || json.success !== true) throw new Error(json?.message || "Load failed");

            const list = Array.isArray(json.data) ? json.data : [json.data];
            const dto = list[0];
            setFhId(dto?.id ?? null);
            setItems(entriesFromDto(dto));
            setSignedEntryId(pickSignedEntryId(dto));
        } catch (e: unknown) {
            setToast({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [pid, eid]);

    async function onSaved() {
        setShowForm(false);
        setEditing(null);
        await load();
    }

    // Delete one entry by PUT-ing the reduced array back to the container
    async function removeEntry(entryId: number) {
        if (!fhId) return;
        if (typeof window !== "undefined" && !confirm("Delete this entry?")) return;

        const next = items.filter(x => x.id !== entryId);
        try {
            const res = await fetchWithOrg(
                `/api/family-history/${pid}/${eid}/${fhId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({ entries: next }),
                }
            );
            const json = await safeJson<ApiResponse<FamilyHistoryDto>>(res);
            if (!res.ok || (json && json.success === false)) {
                window.alert(json?.message || `Delete failed (${res.status})`);
                return;
            }
            setItems(next);
        } catch (e: unknown) {
            window.alert(e instanceof Error ? e.message : "Something went wrong");
        }

    }

    // eSign a single entry (POST body { entryId })
    async function esign(entryId: number) {
        if (!fhId) {
            setToast({ type: "error", msg: "No Family History record to sign yet." });
            setTimeout(() => setToast(null), 3000);
            return;
        }
        try {
            setBusyId(entryId);
            const res = await fetchWithOrg(
                `/api/family-history/${pid}/${eid}/${fhId}/esign`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({ entryId }),
                }
            );

            let ok = res.ok;
            const json = await safeJson<ApiResponse<FamilyHistoryDto>>(res);
            if (json && json.success === false) ok = false;
            if (!ok) throw new Error(json?.message || "eSign failed");

            // Optimistic UI update from response to avoid "missing data" flash
            if (json?.data) {
                const dto = json.data as FamilyHistoryDto;
                setFhId(dto?.id ?? fhId);
                setItems(entriesFromDto(dto));
                setSignedEntryId(pickSignedEntryId(dto) ?? entryId);
            }
            else {
                setSignedEntryId(entryId);
            }

            setToast({ type: "success", msg: "Family history entry e-signed." });
            await load(); // authoritative refresh
        } catch (e: unknown) {
            setToast({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        }
        finally {
            setBusyId(null);
            setTimeout(() => setToast(null), 3000);
        }
    }

    // Print entire FH container via backend PDF (Assessmentlist workflow)
    async function printContainerPdf() {
        if (!fhId) { window.alert("Nothing to print yet."); return; }
        try {
            setBusyId(-1);
            const res = await fetchWithOrg(
                `/api/family-history/${pid}/${eid}/${fhId}/print`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );
            if (!res.ok) throw new Error("Print failed");

            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty PDF received");
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (e: unknown) {
            window.alert(e instanceof Error ? e.message : "Unable to print");
        }
        finally {
            setBusyId(null);
        }
    }

    const sorted = useMemo(
        () => [...items].sort((a, b) => {
            const ra = "relation" in a ? (a.relation as string) ?? "" : "";
            const rb = "relation" in b ? (b.relation as string) ?? "" : "";
            return ra.localeCompare(rb);
        }),
        [items]
    );


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">Family History</h2>
                {/* Top Print button removed as requested */}
                <button
                    onClick={() => { setEditing(null); setShowForm(s => !s); }}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Add Entry"}
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
                <FHform
                    patientId={pid}
                    encounterId={eid}
                    fhId={fhId}
                    entries={items}
                    editing={editing}
                    onSaved={onSaved}
                    onCancel={() => { setShowForm(false); setEditing(null); }}
                />
            )}

            {loading && <div className="text-gray-600">Loading...</div>}
            {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && sorted.length === 0 && (
                <div className="rounded-xl border p-4 text-gray-600">No family history yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((entry, i) => {
                    //const id = (entry as any)?.id as number | undefined;
                    const id = "id" in entry ? (entry.id as number | undefined) : undefined;

                    const relation = "relation" in entry ? entry.relation as string | undefined : undefined;
                    const diagnosisText = "diagnosisText" in entry ? entry.diagnosisText as string | undefined : undefined;
                    const diagnosisCode = "diagnosisCode" in entry ? entry.diagnosisCode as string | undefined : undefined;
                    const notes = "notes" in entry ? entry.notes as string | undefined : undefined;

                    const isSigned = !!id && signedEntryId === id;

                    return (
                        <li key={id ?? `${relation ?? "fh"}-${i}`} className="rounded-2xl border p-4 bg-white shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="font-medium text-gray-900">
                                        {relation}: {diagnosisText || "—"}{diagnosisCode ? ` (${diagnosisCode})` : ""}
                                    </p>
                                    {notes && <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>}

                                    {isSigned && (
                                        <p className="text-xs text-gray-500 mt-1">Signed — read only</p>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {!isSigned && (
                                        <>
                                            <button
                                                onClick={() => { setEditing(entry); setShowForm(true); }}
                                                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                            >
                                                Edit
                                            </button>

                                            {id && (
                                                <button
                                                    onClick={() => removeEntry(id)}
                                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                                >
                                                    Delete
                                                </button>
                                            )}

                                            <button
                                                onClick={() => id && esign(id)}
                                                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                                disabled={busyId === id || !fhId}
                                                title="eSign"
                                            >
                                                eSign
                                            </button>
                                        </>
                                    )}

                                    {/* Print always available; this opens backend PDF for the whole FH container */}
                                    <button
                                        onClick={() => printContainerPdf()}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                        disabled={!fhId || busyId === -1}
                                        title="Print (PDF)"
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

