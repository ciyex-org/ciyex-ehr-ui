//
// "use client";
//
// import { useEffect, useMemo, useState } from "react";
// import { fetchWithOrg } from "@/utils/fetchWithOrg";
// import type { ApiResponse, SocialHistoryDto, SocialHistoryEntryDto } from "@/utils/types";
// import Shform from "./Shform";
//
// // Safely parse JSON (handles empty bodies / 204 / 401)
// async function safeJson<T = unknown>(res: Response): Promise<T | null> {
//     const text = await res.text().catch(() => "");
//     if (!text) return null;
//     try {
//         return JSON.parse(text) as T;
//     } catch {
//         return null;
//     }
// }
//
// function escapeHtml(s: string) {
//     return String(s).replace(/[&<>"']/g, (m) =>
//         ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!)
//     );
// }
//
// type Props = { patientId: number | string; encounterId: number | string };
//
// export default function Shlist({ patientId, encounterId }: Props) {
//     const pid = typeof patientId === "string" ? Number(patientId) : patientId;
//     const eid = typeof encounterId === "string" ? Number(encounterId) : encounterId;
//
//     const canFetch =
//         Number.isFinite(pid) &&
//         (pid as number) > 0 &&
//         Number.isFinite(eid) &&
//         (eid as number) > 0;
//
//     const [shId, setShId] = useState<number | null>(null); // container id
//     const [items, setItems] = useState<SocialHistoryEntryDto[]>([]);
//     const [loading, setLoading] = useState<boolean>(true);
//     const [error, setError] = useState<string | null>(null);
//     const [showForm, setShowForm] = useState<boolean>(false);
//     const [editing, setEditing] = useState<SocialHistoryEntryDto | null>(null);
//
//     // UI feedback
//     const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
//     const [busyIdx, setBusyIdx] = useState<number | null>(null);
//
//     async function load() {
//         if (!canFetch) {
//             setLoading(false);
//             setError(null);
//             setItems([]);
//             setShId(null);
//             return;
//         }
//
//         setLoading(true);
//         setError(null);
//
//         try {
//             const url = `/api/social-history/${pid}/${eid}`;
//             const res = await fetchWithOrg(url, { headers: { Accept: "application/json" } });
//             const json = await safeJson<ApiResponse<SocialHistoryDto | SocialHistoryDto[]>>(res);
//
//             if (!res.ok) throw new Error(`Load failed (${res.status})`);
//             if (!json || json.success !== true) throw new Error(json?.message || "Load failed");
//
//             // Normalize: API may return a single DTO or an array
//             const list = Array.isArray(json.data) ? json.data : [json.data];
//             const dto = list[0] as SocialHistoryDto | undefined;
//             setShId(dto?.id ?? null);
//             setItems(Array.isArray(dto?.entries) ? dto!.entries : []);
//         } catch (e: unknown) {
//             setError(e?.message ?? "Something went wrong");
//             setItems([]);
//             setShId(null);
//         } finally {
//             setLoading(false);
//         }
//     }
//
//     useEffect(() => {
//         load();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [canFetch, pid, eid]);
//
//     // After save, reload from server to keep shape consistent
//     async function onSaved() {
//         setShowForm(false);
//         setEditing(null);
//         await load();
//     }
//
//     // Delete a single entry (by index; works even when entries have no id)
//     async function removeEntryByIndex(idx: number) {
//         if (!shId) return;
//         if (typeof window !== "undefined" && !confirm("Delete this social history entry?")) return;
//
//         const next = items.filter((_, i) => i !== idx);
//         try {
//             const res = await fetchWithOrg(`/api/social-history/${pid}/${eid}/${shId}`, {
//                 method: "PUT",
//                 headers: { "Content-Type": "application/json", Accept: "application/json" },
//                 body: JSON.stringify({
//                     id: shId,
//                     patientId: Number(pid),
//                     encounterId: Number(eid),
//                     entries: next,
//                 }),
//             });
//             const json = await safeJson<ApiResponse<SocialHistoryDto>>(res);
//             if (!res.ok || (json && json.success === false)) {
//                 setAlert({ type: "error", msg: json?.message || `Delete failed (${res.status})` });
//                 setTimeout(() => setAlert(null), 3000);
//                 return;
//             }
//             setItems(next);
//             setAlert({ type: "success", msg: "Social history entry deleted." });
//             setTimeout(() => setAlert(null), 3000);
//         } catch (e: unknown) {
//             setAlert({ type: "error", msg: e?.message ?? "Something went wrong" });
//             setTimeout(() => setAlert(null), 3000);
//         }
//     }
//
//     // --- eSign: sign a specific entry by index (send both entryIndex and entryId if present)
//     async function esignEntry(idx: number) {
//         if (!shId) {
//             setAlert({ type: "error", msg: "No Social History record to sign yet." });
//             setTimeout(() => setAlert(null), 3000);
//             return;
//         }
//         const entry = items[idx];
//         try {
//             setBusyIdx(idx);
//             const res = await fetchWithOrg(`/api/social-history/${pid}/${eid}/${shId}/esign`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json", Accept: "application/json" },
//                 body: JSON.stringify({
//                     entryIndex: idx,
//                     entryId: (entry as any)?.id ?? null, // backends that require id can use this
//                 }),
//             });
//             let ok = res.ok;
//             const json = await safeJson<ApiResponse<unknown>>(res);
//             if (json && (json as any).success === false) ok = false;
//             if (!ok) throw new Error((json as any)?.message || "eSign failed");
//             setAlert({ type: "success", msg: "Social history entry e-signed." });
//             await load();
//         } catch (e: unknown) {
//             setAlert({ type: "error", msg: e?.message ?? "Something went wrong" });
//         } finally {
//             setBusyIdx(null);
//             setTimeout(() => setAlert(null), 3000);
//         }
//     }
//
//     // --- Print: open a clean printable view for the entry
//     function printEntry(sh: SocialHistoryEntryDto, idx: number) {
//         try {
//             const win = window.open("", "_blank", "noopener,noreferrer");
//             if (!win) throw new Error("Popup blocked. Please allow popups to print.");
//
//             win.document.write(`<!doctype html>
// <html>
// <head>
// <meta charset="utf-8" />
// <title>Social History #${idx + 1}</title>
// <style>
//   body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
//   h1 { font-size: 20px; margin: 0 0 8px; }
//   .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
//   .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
//   .row { margin: 6px 0; }
//   @media print { @page { margin: 12mm; } }
// </style>
// </head>
// <body>
//   <h1>Social History Entry</h1>
//   <div class="meta">Patient #${pid} · Encounter #${eid} · Entry ${idx + 1}</div>
//   <div class="card">
//     <div class="row"><strong>Category:</strong> ${escapeHtml(sh?.category || "—")}</div>
//     ${sh?.value ? `<div class="row"><strong>Value:</strong> ${escapeHtml(sh.value)}</div>` : ""}
//     ${sh?.details ? `<div class="row"><strong>Details:</strong><br/>${escapeHtml(sh.details).replace(/\n/g,"<br/>")}</div>` : ""}
//   </div>
//   <script>window.onload = () => { window.print(); };</script>
// </body>
// </html>`);
//             win.document.close();
//         } catch (e: unknown) {
//             window.alert(e?.message ?? "Unable to print");
//         }
//     }
//
//     const sorted = useMemo(() => {
//         const arr = Array.isArray(items) ? items : [];
//         try {
//             return [...arr].sort((a, b) => (a?.category || "").localeCompare(b?.category || ""));
//         } catch {
//             return arr;
//         }
//     }, [items]);
//
//     if (!canFetch) {
//         return (
//             <div className="space-y-2">
//                 <h2 className="text-xl font-semibold">Social History (SH)</h2>
//                 <div className="rounded-xl border p-4 text-gray-600">Waiting for patient/encounter…</div>
//             </div>
//         );
//     }
//
//     return (
//         <div className="space-y-4">
//             <div className="flex items-center justify-between">
//                 <h2 className="text-xl font-semibold">Social History (SH)</h2>
//                 <div className="flex items-center gap-2">
//                     <button
//                         onClick={() => {
//                             setEditing(null);
//                             setShowForm((s) => !s);
//                         }}
//                         className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
//                     >
//                         {showForm ? "Close" : "Add SH"}
//                     </button>
//                 </div>
//             </div>
//
//             {alert && (
//                 <div
//                     className={`rounded-xl border px-4 py-2 text-sm ${
//                         alert.type === "success"
//                             ? "border-green-300 bg-green-50 text-green-800"
//                             : "border-red-300 bg-red-50 text-red-800"
//                     }`}
//                     role="status"
//                 >
//                     {alert.msg}
//                 </div>
//             )}
//
//             {showForm && (
//                 <Shform
//                     patientId={Number(pid)}
//                     encounterId={Number(eid)}
//                     shId={shId}
//                     entries={items}
//                     editing={editing}
//                     onSaved={onSaved}
//                     onCancel={() => {
//                         setShowForm(false);
//                         setEditing(null);
//                     }}
//                 />
//             )}
//
//             {loading && <div className="text-gray-600">Loading...</div>}
//             {error && <div className="text-red-600">{error}</div>}
//             {!loading && !error && sorted.length === 0 && (
//                 <div className="rounded-xl border p-4 text-gray-600">No social history yet.</div>
//             )}
//
//             <ul className="space-y-3">
//                 {sorted.map((sh, i) => (
//                     <li key={`${sh?.category ?? "sh"}-${i}`} className="rounded-2xl border p-4 bg-white shadow-sm">
//                         <div className="flex items-start justify-between gap-4">
//                             <div className="space-y-1">
//                                 <p className="font-medium text-gray-900">
//                                     {sh?.category}: {sh?.value || "—"}
//                                 </p>
//                                 {sh?.details && <p className="text-gray-800 whitespace-pre-wrap">{sh.details}</p>}
//                             </div>
//                             <div className="flex flex-wrap gap-2">
//                                 <button
//                                     onClick={() => {
//                                         setEditing(sh);
//                                         setShowForm(true);
//                                     }}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
//                                 >
//                                     Edit
//                                 </button>
//
//                                 {/* Per-entry delete by index — entries may not have an id */}
//                                 <button
//                                     onClick={() => removeEntryByIndex(i)}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
//                                     disabled={busyIdx === i}
//                                 >
//                                     Delete
//                                 </button>
//
//                                 <button
//                                     onClick={() => esignEntry(i)}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
//                                     disabled={busyIdx === i || !shId}
//                                     title="eSign"
//                                 >
//                                     eSign
//                                 </button>
//
//                                 <button
//                                     onClick={() => printEntry(sh, i)}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
//                                     disabled={busyIdx === i}
//                                     title="Print"
//                                 >
//                                     Print
//                                 </button>
//                             </div>
//                         </div>
//                     </li>
//                 ))}
//             </ul>
//         </div>
//     );
// }
//
//
//







"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, SocialHistoryDto, SocialHistoryEntryDto } from "@/utils/types";
import Shform from "./Shform";

// Safely parse JSON (handles empty bodies / 204 / 401)
async function safeJson<T = unknown>(res: Response): Promise<T | null> {
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

type Props = { patientId: number | string; encounterId: number | string };

export default function Shlist({ patientId, encounterId }: Props) {
    const pid = typeof patientId === "string" ? Number(patientId) : patientId;
    const eid = typeof encounterId === "string" ? Number(encounterId) : encounterId;

    const canFetch =
        Number.isFinite(pid) &&
        (pid as number) > 0 &&
        Number.isFinite(eid) &&
        (eid as number) > 0;

    const [shId, setShId] = useState<number | null>(null); // container id
    const [items, setItems] = useState<SocialHistoryEntryDto[]>([]);
    const [isSigned, setIsSigned] = useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [editing, setEditing] = useState<SocialHistoryEntryDto | null>(null);

    // UI feedback
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [busyIdx, setBusyIdx] = useState<number | null>(null);

    async function load() {
        if (!canFetch) {
            setLoading(false);
            setError(null);
            setItems([]);
            setShId(null);
            setIsSigned(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = `/api/social-history/${pid}/${eid}`;
            const res = await fetchWithOrg(url, { headers: { Accept: "application/json" } });
            const json = await safeJson<ApiResponse<SocialHistoryDto | SocialHistoryDto[]>>(res);

            if (!res.ok) throw new Error(`Load failed (${res.status})`);
            if (!json || json.success !== true) throw new Error(json?.message || "Load failed");

            // Normalize: API may return a single DTO or an array
            const list = Array.isArray(json.data) ? json.data : [json.data];
            type SocialHistoryDtoWithSigned = SocialHistoryDto & { signed?: boolean };
            const dto = list[0] as SocialHistoryDtoWithSigned | undefined;


            setShId(dto?.id ?? null);
            setItems(Array.isArray(dto?.entries) ? dto!.entries : []);
            setIsSigned(Boolean(dto?.signed));
        } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canFetch, pid, eid]);

    // After save, reload from server to keep shape consistent
    async function onSaved() {
        setShowForm(false);
        setEditing(null);
        await load();
    }

    // Delete a single entry (by index; works even when entries have no id)
    async function removeEntryByIndex(idx: number) {
        if (!shId) return;
        if (typeof window !== "undefined" && !confirm("Delete this social history entry?")) return;

        const next = items.filter((_, i) => i !== idx);
        try {
            const res = await fetchWithOrg(`/api/social-history/${pid}/${eid}/${shId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                    id: shId,
                    patientId: Number(pid),
                    encounterId: Number(eid),
                    entries: next,
                }),
            });
            const json = await safeJson<ApiResponse<SocialHistoryDto>>(res);
            if (!res.ok || (json && json.success === false)) {
                setAlert({ type: "error", msg: json?.message || `Delete failed (${res.status})` });
                setTimeout(() => setAlert(null), 3000);
                return;
            }
            setItems(next);
            setAlert({ type: "success", msg: "Social history entry deleted." });
            setTimeout(() => setAlert(null), 3000);
        } catch (e: unknown) {
        setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        setTimeout(() => setAlert(null), 3000);
    }

}

    // --- eSign: sign a specific entry by index (send both entryIndex and entryId if present)
    async function esignEntry(idx: number) {
        if (!shId) {
            setAlert({ type: "error", msg: "No Social History record to sign yet." });
            setTimeout(() => setAlert(null), 3000);
            return;
        }
        type EntryWithId = SocialHistoryEntryDto & { id?: number };
        const entry = items[idx] as EntryWithId;

        try {
            setBusyIdx(idx);
            const res = await fetchWithOrg(`/api/social-history/${pid}/${eid}/${shId}/esign`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                    entryIndex: idx,
                    entryId: entry.id ?? null,
                }),
            });

            let ok = res.ok;
            const json = await safeJson<ApiResponse<unknown>>(res);
            if (json && (json as ApiResponse<unknown>).success === false) ok = false;
            if (!ok) throw new Error((json as ApiResponse<unknown>)?.message || "eSign failed");

            setAlert({ type: "success", msg: "Social history entry e-signed." });
            await load();
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyIdx(null);
            setTimeout(() => setAlert(null), 3000);
        }
    }


    // --- Print entire Social History via BACKEND PDF (prevents blank about:blank)
    async function printSectionFromBackend() {
        if (!shId) {
            window.alert("Nothing to print yet.");
            return;
        }
        try {
            const res = await fetchWithOrg(
                `/api/social-history/${pid}/${eid}/${shId}/print`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );
            if (!res.ok) throw new Error(`Print failed (${res.status})`);

            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty PDF received");

            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (e: unknown) {
            window.alert(e instanceof Error ? e.message : "Unable to print");
        }
    }

    // Safe sort (prevents "items is not iterable")
    const sorted = useMemo(() => {
        const arr = Array.isArray(items) ? items : [];
        try {
            return [...arr].sort((a, b) => (a?.category || "").localeCompare(b?.category || ""));
        } catch {
            return arr;
        }
    }, [items]);

    if (!canFetch) {
        return (
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Social History (SH)</h2>
                <div className="rounded-xl border p-4 text-gray-600">Waiting for patient/encounter…</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Social History (SH)</h2>
                <div className="flex items-center gap-3">
                    {isSigned && (
                        <span className="text-sm rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              Signed — read only
            </span>
                    )}
                    <button
                        onClick={() => {
                            setEditing(null);
                            setShowForm((s) => !s);
                        }}
                        className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
                        disabled={isSigned}
                        title={isSigned ? "Section is signed and cannot be modified" : "Add a social history entry"}
                    >
                        {showForm ? "Close" : "Add SH"}
                    </button>
                    {/* Print whole section (always allowed) */}
                    <button
                        onClick={printSectionFromBackend}
                        className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                        title="Print Social History"
                    >
                        Print
                    </button>
                </div>
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
                <Shform
                    patientId={Number(pid)}
                    encounterId={Number(eid)}
                    shId={shId}
                    entries={items}
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
                <div className="rounded-xl border p-4 text-gray-600">No social history yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((sh, i) => (
                    <li key={`${sh?.category ?? "sh"}-${i}`} className="rounded-2xl border p-4 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="font-medium text-gray-900">
                                    {sh?.category}: {sh?.value || "—"}
                                </p>
                                {sh?.details && <p className="text-gray-800 whitespace-pre-wrap">{sh.details}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => {
                                        setEditing(sh);
                                        setShowForm(true);
                                    }}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyIdx === i || isSigned}
                                    title={isSigned ? "Section is signed and cannot be edited" : "Edit"}
                                >
                                    Edit
                                </button>

                                {/* Per-entry delete by index — entries may not have an id */}
                                <button
                                    onClick={() => removeEntryByIndex(i)}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyIdx === i || isSigned}
                                    title={isSigned ? "Section is signed and cannot be deleted" : "Delete"}
                                >
                                    Delete
                                </button>

                                <button
                                    onClick={() => esignEntry(i)}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyIdx === i || !shId || isSigned}
                                    title={isSigned ? "Already signed" : "eSign"}
                                >
                                    eSign
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
