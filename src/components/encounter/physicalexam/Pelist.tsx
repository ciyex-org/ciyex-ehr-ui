"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, PhysicalExamDto } from "@/utils/types";
import Peform from "./Peform";

type Props = { patientId: number; encounterId: number };

// helper for section labels
function keyToTitle(k: string) {
    return k
        .toLowerCase()
        .split("_")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
}

// safe JSON parser
async function safeJson<T>(res: Response): Promise<T | null> {
    const txt = await res.text().catch(() => "");
    if (!txt) return null;
    try {
        return JSON.parse(txt) as T;
    } catch {
        return null;
    }
}

export default function Pelist({ patientId, encounterId }: Props) {
    const [items, setItems] = useState<PhysicalExamDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<PhysicalExamDto | null>(null);

    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithOrg(`/api/physical-exam/${patientId}/${encounterId}`);
            const json = await safeJson<ApiResponse<PhysicalExamDto[]>>(res);
            if (!res.ok) throw new Error(json?.message || `Load failed (HTTP ${res.status})`);
            if (!json?.success) throw new Error(json?.message || "Load failed");
            setItems(json.data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        }
        finally {
            setLoading(false);
        }
    }

   // useEffect(() => { load(); }, [patientId, encounterId]);
// eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [patientId, encounterId]);

    function onSaved(saved: PhysicalExamDto) {
        setShowForm(false);
        setEditing(null);
        setItems((prev) => {
            const i = prev.findIndex((x) => x.id === saved.id);
            if (i >= 0) {
                const copy = [...prev];
                copy[i] = saved;
                return copy;
            }
            return [saved, ...prev];
        });
        setAlert({ type: "success", msg: "Physical exam saved." });
        setTimeout(() => setAlert(null), 3000);
    }

    async function remove(id: number) {
        if (!confirm("Delete this physical exam?")) return;
        try {
            setBusyId(id);
            const res = await fetchWithOrg(`/api/physical-exam/${patientId}/${encounterId}/${id}`, {
                method: "DELETE",
            });

            if (res.status === 204) {
                setItems((p) => p.filter((x) => x.id !== id));
                setAlert({ type: "success", msg: "Physical exam deleted." });
                return;
            }

            const json = await safeJson<ApiResponse<void>>(res);
            if (!res.ok || (json && json.success === false))
                throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);

            setItems((p) => p.filter((x) => x.id !== id));
            setAlert({ type: "success", msg: "Physical exam deleted." });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        }
        finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3000);
        }
    }

    // --- eSign: backend call
    async function esign(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/physical-exam/${patientId}/${encounterId}/${id}/esign`,
                { method: "POST" }
            );
            const json = await safeJson<ApiResponse<unknown>>(res);
            if (!res.ok || (json && json.success === false))
                throw new Error(json?.message || "eSign failed");

            setAlert({ type: "success", msg: "Physical exam e-signed." });
            await load();
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        }
        finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3000);
        }
    }

    // --- Print: backend PDF
    async function printFromBackend(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/physical-exam/${patientId}/${encounterId}/${id}/print`,
                { headers: { Accept: "application/pdf" } }
            );
            if (!res.ok) throw new Error("Print failed");
            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty PDF received");
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
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
                <h2 className="text-xl font-semibold">Physical Examination</h2>
                <button
                    onClick={() => { setEditing(null); setShowForm((s) => !s); }}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Add Physical Exam"}
                </button>
            </div>

            {alert && (
                <div
                    className={`rounded-xl border px-4 py-2 text-sm ${
                        alert.type === "success"
                            ? "border-green-300 bg-green-50 text-green-800"
                            : "border-red-300 bg-red-50 text-red-800"
                    }`}
                >
                    {alert.msg}
                </div>
            )}

            {showForm && (
                <Peform
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
                <div className="rounded-xl border p-4 text-gray-600">No physical exam recorded yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((pe) => (
                    <li key={pe.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                        <div className="space-y-2">
                            {pe.summary && <p className="text-gray-900 whitespace-pre-wrap">{pe.summary}</p>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(pe.sections || []).map((s, idx) => (
                                    <div key={`${s.sectionKey}-${idx}`} className="rounded-lg border p-3">
                                        <p className="font-medium flex items-center gap-2">
                                            {keyToTitle(s.sectionKey)}
                                            {s.allNormal ? (
                                                <span className="text-xs rounded-full border px-2 py-0.5">All normal</span>
                                            ) : (
                                                <span className="text-xs rounded-full border px-2 py-0.5">Abnormal</span>
                                            )}
                                        </p>
                                        {s.normalText && <p className="text-sm text-gray-800 mt-1"><b>Normal Text:</b> {s.normalText}</p>}
                                        {s.findings && <p className="text-sm text-gray-800 mt-1"><b>Findings:</b> {s.findings}</p>}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-gray-500">
                                {pe.audit?.createdDate && <>Created: {pe.audit.createdDate}</>}
                                {pe.audit?.lastModifiedDate && <> · Updated: {pe.audit.lastModifiedDate}</>}
                            </p>
                            {pe.esigned && (
                                <p className="text-xs text-gray-500">Signed — read only</p>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {!pe.esigned && (
                                <>
                                    <button
                                        onClick={() => { setEditing(pe); setShowForm(true); }}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => remove(pe.id!)}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                        disabled={busyId === pe.id}
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => esign(pe.id!)}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                        disabled={busyId === pe.id}
                                    >
                                        eSign
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => printFromBackend(pe.id!)}
                                className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                disabled={busyId === pe.id}
                            >
                                Print
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
