"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, ProviderNoteDto } from "@/utils/types";
import Providernoteform from "./Providernoteform";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/utils/toast";

type Props = { patientId: number; encounterId: number };

// Safely parse JSON (DELETE/204 empty bodies won't have JSON)
async function safeJson<T>(res: Response): Promise<T | null> {
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

export default function Providernotelist({ patientId, encounterId }: Props) {
    const [items, setItems] = useState<ProviderNoteDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ProviderNoteDto | null>(null);

    // UI feedback + disable buttons during calls
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithOrg(`/api/provider-notes/${patientId}/${encounterId}`);
            const json = (await res.json()) as ApiResponse<ProviderNoteDto[]>;
            if (!res.ok || !json.success) throw new Error(json.message || "Load failed");
            setItems(json.data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, encounterId]);

    function onSaved(saved: ProviderNoteDto) {
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
        setAlert({ type: "success", msg: "Note saved." });
        setTimeout(() => setAlert(null), 2500);
    }

    async function remove(id: number) {
        setDeleteTarget(id);
    }

    async function confirmDelete() {
        const id = deleteTarget;
        setDeleteTarget(null);
        if (id == null) return;
        try {
            setBusyId(id);
            const res = await fetchWithOrg(`/api/provider-notes/${patientId}/${encounterId}/${id}`, {
                method: "DELETE",
            });
            const json = await safeJson<ApiResponse<void>>(res);
            if (!res.ok || (json && json.success === false)) {
                throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);
            }
            setItems((p) => p.filter((x) => x.id !== id));
            setAlert({ type: "success", msg: "Note deleted." });
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 2500);
        }
    }

    // ---- eSign a note (reload after success)
    async function esign(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/provider-notes/${patientId}/${encounterId}/${id}/esign`,
                { method: "POST" }
            );
            const json = await safeJson<ApiResponse<unknown>>(res);
            if (!res.ok || (json && json.success === false)) {
                throw new Error(json?.message || "eSign failed");
            }
            setAlert({ type: "success", msg: "Note e-signed." });
            await load(); // refresh to reflect signed fields
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 2500);
        }
    }

    // ---- Print via backend PDF endpoint (fresh tab)
    async function printNote(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/provider-notes/${patientId}/${encounterId}/${id}/print`,
                { headers: { Accept: "application/pdf" } }
            );
            if (!res.ok) throw new Error(`Print failed (HTTP ${res.status})`);
            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty PDF received");
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Unable to print");
        } finally {
            setBusyId(null);
        }
    }



    const sorted = useMemo(() => {
        return [...items].sort((a, b) => {
            const d1 = a.audit?.lastModifiedDate || a.audit?.createdDate || "";
            const d2 = b.audit?.lastModifiedDate || b.audit?.createdDate || "";
            return String(d2).localeCompare(String(d1));
        });
    }, [items]);



    return (
        <>
        <ConfirmDialog
            open={deleteTarget !== null}
            title="Delete Provider Note"
            message="Are you sure you want to delete this provider note? This action cannot be undone."
            confirmLabel="Delete"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
        />
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Provider Notes</h2>
                <button
                    onClick={() => {
                        setEditing(null);
                        setShowForm((s) => !s);
                    }}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Add Note"}
                </button>
            </div>

            {alert && (
                <div
                    className={`rounded-xl border px-4 py-2 text-sm ${
                        alert.type === "success"
                            ? "border-green-300 bg-green-50 text-green-800"
                            : "border-red-300 bg-red-50 text-red-800"
                    }`}
                    role="status"
                >
                    {alert.msg}
                </div>
            )}

            {showForm && (
                <Providernoteform
                    patientId={patientId}
                    encounterId={encounterId}
                    editing={editing}
                    onSaved={onSaved}
                    onCancel={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                />
            )}

            {loading && <div className="text-gray-600">Loading...</div>}
            {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && sorted.length === 0 && (
                <div className="rounded-xl border p-4 text-gray-600">No provider notes yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((note) => (
                    <li key={note.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="font-medium text-gray-900">
                                    {note.noteTitle || "Provider Note"} · {note.noteStatus || "draft"}
                                </p>
                                <div className="text-sm text-gray-600">
                                    <span>Type: {note.noteTypeCode || "—"}</span>
                                    {note.noteDateTime && <span> · At: {note.noteDateTime}</span>}
                                    {note.authorPractitionerId && <span> · Author: {note.authorPractitionerId}</span>}
                                </div>

                                {/* SOAP blocks if present */}
                                {note.subjective && (
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                        <span className="font-semibold">S:</span> {note.subjective}
                                    </p>
                                )}
                                {note.objective && (
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                        <span className="font-semibold">O:</span> {note.objective}
                                    </p>
                                )}
                                {note.assessment && (
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                        <span className="font-semibold">A:</span> {note.assessment}
                                    </p>
                                )}
                                {note.plan && (
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                        <span className="font-semibold">P:</span> {note.plan}
                                    </p>
                                )}
                                {note.narrative && (
                                    <p className="text-gray-800 whitespace-pre-wrap">
                                        <span className="font-semibold">Narrative:</span> {note.narrative}
                                    </p>
                                )}

                                <p className="text-xs text-gray-500">
                                    {note.audit?.createdDate && <>Created: {note.audit.createdDate}</>}
                                    {note.audit?.lastModifiedDate && <> · Updated: {note.audit.lastModifiedDate}</>}
                                </p>


                                {note.esigned && (
                                    <p className="text-xs text-gray-500 font-medium">Signed — read only</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {/* Hide Edit/Delete/eSign once the note is signed */}
                                {!note.esigned && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setEditing(note);
                                                setShowForm(true);
                                            }}
                                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            onClick={() => remove(note.id!)}
                                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                            disabled={busyId === note.id}
                                        >
                                            Delete
                                        </button>

                                        <button
                                            onClick={() => esign(note.id!)}
                                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                            disabled={busyId === note.id}
                                            title="eSign"
                                        >
                                            eSign
                                        </button>
                                    </>
                                )}

                                {/* Print always available */}
                                <button
                                    onClick={() => printNote(note.id!)}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyId === note.id}
                                    title="Print"
                                >
                                    Print
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
        </>
    );
}
