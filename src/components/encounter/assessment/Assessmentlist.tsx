"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, AssessmentDto } from "@/utils/types";
import Assessmentform from "./Assessmentform";

type Props = {
    patientId: number;
    encounterId: number;
};

export default function Assessmentlist({ patientId, encounterId }: Props) {
    const [items, setItems] = useState<AssessmentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<AssessmentDto | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithOrg(`/api/assessment/${patientId}/${encounterId}`);
            const json = (await res.json()) as ApiResponse<AssessmentDto[]>;
            if (!res.ok || !json.success) throw new Error(json.message || "Load failed");
            setItems(json.data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, encounterId]);

    function onSaved(saved: AssessmentDto) {
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
        setAlert({ type: "success", msg: "Assessment saved." });
        setTimeout(() => setAlert(null), 3500);
    }

    async function remove(id: number) {
        if (!confirm("Delete this assessment?")) return;
        try {
            setBusyId(id);
            const res = await fetchWithOrg(`/api/assessment/${patientId}/${encounterId}/${id}`, { method: "DELETE" });
            const json = (await res.json()) as ApiResponse<void>;
            if (!res.ok || !json.success) throw new Error(json.message || "Delete failed");
            setItems((p) => p.filter((x) => x.id !== id));
            setAlert({ type: "success", msg: "Assessment deleted." });
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3500);
        }
    }

    async function esign(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(`/api/assessment/${patientId}/${encounterId}/${id}/esign`, {
                method: "POST",
            });
            let ok = res.ok;
            try {
                const json = (await res.json()) as ApiResponse<unknown>;
                ok = ok && (json.success ?? true);
            } catch {
                // ignore parse errors for PDF/plain text bodies
            }
            if (!ok) throw new Error("eSign failed");
            setAlert({ type: "success", msg: "Assessment e-signed." });
            await load();
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3500);
        }
    }

//     function printAssessment(a: AssessmentDto) {
//         try {
//             const win = window.open("", "_blank", "noopener,noreferrer");
//             if (!win) throw new Error("Popup blocked. Please allow popups to print.");
//
//             const created = a.audit?.createdDate ? `Created: ${a.audit.createdDate}` : "";
//             const updated = a.audit?.lastModifiedDate ? ` · Updated: ${a.audit.lastModifiedDate}` : "";
//
//             win.document.write(`<!doctype html>
// <html lang="en">
// <head>
// <meta charset="utf-8" />
// <title>Assessment #${a.id ?? ""}</title>
// <style>
//   body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
//   h1 { font-size: 20px; margin: 0 0 8px; }
//   .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
//   .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
//   .row { margin: 6px 0; }
//   .muted { color: #111827; }
//   @media print { @page { margin: 12mm; } }
// </style>
// </head>
// <body>
//   <h1>Assessment</h1>
//   <div class="meta">Patient #${patientId} · Encounter #${encounterId}${created}${updated}</div>
//   <div class="card">
//     <div class="row"><strong>Priority/Status:</strong> ${a.priority || "Primary"} · ${a.status || "Active"}</div>
//     ${a.diagnosisCode ? `<div class="row"><strong>Code:</strong> ${a.diagnosisCode}</div>` : ""}
//     ${a.diagnosisName ? `<div class="row"><strong>Diagnosis:</strong> <span class="muted">${a.diagnosisName}</span></div>` : ""}
//     ${a.assessmentText ? `<div class="row"><strong>Assessment:</strong><br/>${escapeHtml(a.assessmentText).replace(/\n/g,"<br/>")}</div>` : ""}
//     ${a.notes ? `<div class="row"><strong>Notes:</strong><br/>${escapeHtml(a.notes).replace(/\n/g,"<br/>")}</div>` : ""}
//   </div>
//   <script>
//     function escapeHtml(s){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
//     window.onload = () => { window.print(); };
//   </script>
// </body>
// </html>`);
//             win.document.close();
//         } catch (e) {
//             window.alert(e instanceof Error ? e.message : "Unable to print");
//         }
//     }

    // optional backend PDF
    // ---- Print: use backend API (PDF)
    async function printFromBackend(id: number) {
        try {
            const res = await fetchWithOrg(
                `/api/assessment/${patientId}/${encounterId}/${id}/print`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/pdf",   // ✅ force backend to send PDF
                    },
                }
            );

            if (!res.ok) throw new Error("Print failed");

            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty PDF received");

            const url = URL.createObjectURL(blob);
            window.open(url, "_blank"); // ✅ this will open your backend PDF
        } catch (e) {
            window.alert(e instanceof Error ? e.message : "Unable to print");
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
                <h2 className="text-xl font-semibold">Assessment</h2>
                <button
                    onClick={() => {
                        setEditing(null);
                        setShowForm((s) => !s);
                    }}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Add Assessment"}
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
                <Assessmentform
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
                <div className="rounded-xl border p-4 text-gray-600">No assessments yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((a) => (
                    <li key={a.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="font-medium text-gray-900">
                                    {a.priority || "Primary"} · {a.status || "Active"}
                                    {a.diagnosisCode ? ` · ${a.diagnosisCode}` : ""}
                                </p>
                                {a.diagnosisName && <p className="text-gray-900">{a.diagnosisName}</p>}
                                {a.assessmentText && (
                                    <p className="text-gray-800 whitespace-pre-wrap">{a.assessmentText}</p>
                                )}
                                {a.notes && (
                                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{a.notes}</p>
                                )}
                                <p className="text-xs text-gray-500">
                                    {a.audit?.createdDate && <>Created: {a.audit.createdDate}</>}
                                    {a.audit?.lastModifiedDate && <> · Updated: {a.audit.lastModifiedDate}</>}
                                </p>
                                {a.esigned && (
                                    <p className="text-xs text-gray-500 font-medium">Signed — read only</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {!a.esigned && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setEditing(a);
                                                setShowForm(true);
                                            }}
                                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => remove(a.id!)}
                                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                            disabled={busyId === a.id}
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}

                                {!a.esigned && (
                                    <button
                                        onClick={() => esign(a.id!)}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                        disabled={busyId === a.id}
                                    >
                                        eSign
                                    </button>
                                )}

                                <button
                                    onClick={() => printFromBackend(a.id!)}   // ✅ use backend print
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyId === a.id}
                                >
                                    Print
                                </button>

                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (m) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!
    ));
}

