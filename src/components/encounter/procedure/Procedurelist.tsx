
//
//
//
// "use client";
//
// import { useEffect, useMemo, useState } from "react";
// import { fetchWithOrg } from "@/utils/fetchWithOrg";
// import type { ApiResponse, ProcedureDto } from "@/utils/types";
// import Procedureform from "./Procedureform";
//
// type Props = { patientId: number; encounterId: number };
//
// // ---- helpers
// async function safeJson<T>(res: Response): Promise<T | null> {
//     const t = await res.text().catch(() => "");
//     if (!t) return null;
//     try { return JSON.parse(t) as T; } catch { return null; }
// }
// function escapeHtml(s: string) {
//     return String(s).replace(/[&<>"']/g, (m) =>
//         ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!)
//     );
// }
//
// export default function Procedurelist({ patientId, encounterId }: Props) {
//     const [items, setItems] = useState<ProcedureDto[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [showForm, setShowForm] = useState(false);
//     const [editing, setEditing] = useState<ProcedureDto | null>(null);
//
//     // UI feedback
//     const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
//     const [busyId, setBusyId] = useState<number | null>(null);
//
//     async function load() {
//         setLoading(true);
//         setError(null);
//         try {
//             // GET /api/procedures/{patientId}/{encounterId}
//             const res = await fetchWithOrg(`/api/procedures/${patientId}/${encounterId}`);
//             const json = await safeJson<ApiResponse<ProcedureDto[]>>(res);
//             if (!res.ok) throw new Error(json?.message || `Load failed (HTTP ${res.status})`);
//             if (!json?.success) throw new Error(json?.message || "Load failed");
//             setItems(json.data || []);
//         } catch (e: unknown) {
//             setError(e instanceof Error ? e.message : "Something went wrong");
//         } finally {
//             setLoading(false);
//         }
//     }
//
//     useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [patientId, encounterId]);
//
//     function onSaved(saved: ProcedureDto) {
//         setShowForm(false);
//         setEditing(null);
//         setItems((prev) => {
//             const i = prev.findIndex((x) => x.id === saved.id);
//             if (i >= 0) { const copy = [...prev]; copy[i] = saved; return copy; }
//             return [saved, ...prev];
//         });
//         setAlert({ type: "success", msg: "Procedure saved." });
//         setTimeout(() => setAlert(null), 3000);
//     }
//
//     async function remove(id: number) {
//         if (!confirm("Delete this procedure?")) return;
//         try {
//             setBusyId(id);
//             const res = await fetchWithOrg(
//                 `/api/procedures/${patientId}/${encounterId}/${id}`,
//                 { method: "DELETE" }
//             );
//
//             if (res.status === 204) {
//                 setItems((p) => p.filter((x) => x.id !== id));
//                 setAlert({ type: "success", msg: "Procedure deleted." });
//                 return;
//             }
//
//             const json = await safeJson<ApiResponse<void>>(res);
//             if (!res.ok || (json && json.success === false)) {
//                 throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);
//             }
//             setItems((p) => p.filter((x) => x.id !== id));
//             setAlert({ type: "success", msg: "Procedure deleted." });
//         } catch (e: unknown) {
//             setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
//         } finally {
//             setBusyId(null);
//             setTimeout(() => setAlert(null), 3000);
//         }
//     }
//
//     // --- eSign (adjust endpoint if your backend differs)
//     async function esign(id: number) {
//         try {
//             setBusyId(id);
//             const res = await fetchWithOrg(
//                 `/api/procedures/${patientId}/${encounterId}/${id}/esign`,
//                 { method: "POST" }
//             );
//             let ok = res.ok;
//             const json = await safeJson<ApiResponse<unknown>>(res);
//             if (json && json.success === false) ok = false;
//             if (!ok) throw new Error(json?.message || "eSign failed");
//
//             setAlert({ type: "success", msg: "Procedure e-signed." });
//             await load(); // reflect any signature fields
//         } catch (e: unknown) {
//             setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
//         } finally {
//             setBusyId(null);
//             setTimeout(() => setAlert(null), 3000);
//         }
//     }
//
//     // --- Print: covers both legacy and current DTO shapes
//     function printProcedure(p: ProcedureDto) {
//         try {
//             const win = window.open("", "_blank", "noopener,noreferrer");
//             if (!win) throw new Error("Popup blocked. Please allow popups to print.");
//
//             const a: any = p as any;
//             const lineItems: string[] = [];
//
//             // Current billing-style fields
//             if (a.cpt4 || a.description) {
//                 const units = typeof a.units === "number" ? ` · Units: ${a.units}` : "";
//                 const rate  = a.rate ? ` · $${a.rate}` : "";
//                 lineItems.push(`<div class="row"><strong>CPT4:</strong> ${escapeHtml(a.cpt4 || "—")} · ${escapeHtml(a.description || "—")}${units}${rate}</div>`);
//             }
//             if (a.relatedIcds) lineItems.push(`<div class="row"><strong>ICDs:</strong> ${escapeHtml(String(a.relatedIcds))}</div>`);
//             if (a.hospitalBillingStart || a.hospitalBillingEnd) {
//                 lineItems.push(`<div class="row"><strong>Hospital Billing:</strong> ${escapeHtml(a.hospitalBillingStart || "—")} ${a.hospitalBillingEnd ? "– " + escapeHtml(a.hospitalBillingEnd) : ""}</div>`);
//             }
//             if (a.modifier1 || a.modifier2 || a.modifier3 || a.modifier4) {
//                 const mods = [a.modifier1, a.modifier2, a.modifier3, a.modifier4].filter(Boolean).join(", ");
//                 lineItems.push(`<div class="row"><strong>Modifiers:</strong> ${escapeHtml(mods)}</div>`);
//             }
//             if (a.note) lineItems.push(`<div class="row"><strong>Notes:</strong><br/>${escapeHtml(String(a.note)).replace(/\n/g,"<br/>")}</div>`);
//
//             // Legacy clinical fields (if present)
//             if (a.procedureName || a.procedureCode || a.status) {
//                 const top = [a.procedureName, a.procedureCode, a.status].filter(Boolean).map(String).join(" · ");
//                 lineItems.push(`<div class="row"><strong>Procedure:</strong> ${escapeHtml(top)}</div>`);
//             }
//             if (a.datePerformed || a.performer) {
//                 const meta = [a.datePerformed ? "Date: " + a.datePerformed : "", a.performer ? "Performer: " + a.performer : ""].filter(Boolean).join(" · ");
//                 if (meta) lineItems.push(`<div class="row">${escapeHtml(meta)}</div>`);
//             }
//             if (a.bodySite || a.laterality || a.modifiers || a.anesthesia) {
//                 const meta2 = [
//                     a.bodySite ? "Site: " + a.bodySite : "",
//                     a.laterality ? a.laterality : "",
//                     a.modifiers ? "Mod: " + a.modifiers : "",
//                     a.anesthesia ? "Anes: " + a.anesthesia : ""
//                 ].filter(Boolean).join(" · ");
//                 if (meta2) lineItems.push(`<div class="row">${escapeHtml(meta2)}</div>`);
//             }
//             if (a.notes && !a.note) {
//                 lineItems.push(`<div class="row"><strong>Notes:</strong><br/>${escapeHtml(String(a.notes)).replace(/\n/g,"<br/>")}</div>`);
//             }
//
//             const created = p.audit?.createdDate ? `Created: ${p.audit.createdDate}` : "";
//             const updated = p.audit?.lastModifiedDate ? ` · Updated: ${p.audit.lastModifiedDate}` : "";
//
//             win.document.write(`<!doctype html>
// <html>
// <head>
// <meta charset="utf-8" />
// <title>Procedure #${p.id ?? ""}</title>
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
//   <h1>Procedure</h1>
//   <div class="meta">Patient #${patientId} · Encounter #${encounterId} · ID ${p.id ?? ""} ${created}${updated}</div>
//   <div class="card">
//     ${lineItems.join("\n")}
//   </div>
//   <script>window.onload = () => { window.print(); };</script>
// </body>
// </html>`);
//             win.document.close();
//         } catch (e: unknown) {
//             toast.error(e instanceof Error ? e.message : "Unable to print");
//         }
//     }
//
//     const sorted = useMemo(() => {
//         return [...items].sort((a, b) => {
//             // Prefer lastModified/created, then procedure date or hospital billing start if available
//             const aKey =
//                 a.audit?.lastModifiedDate ||
//                 a.audit?.createdDate ||
//                 (a as any).datePerformed ||
//                 (a as any).hospitalBillingStart ||
//                 "";
//             const bKey =
//                 b.audit?.lastModifiedDate ||
//                 b.audit?.createdDate ||
//                 (b as any).datePerformed ||
//                 (b as any).hospitalBillingStart ||
//                 "";
//             return String(bKey).localeCompare(String(aKey));
//         });
//     }, [items]);
//
//     return (
//         <div className="space-y-4">
//             <div className="flex items-center justify-between">
//                 <h2 className="text-xl font-semibold">Procedures</h2>
//                 <button
//                     onClick={() => { setEditing(null); setShowForm((s) => !s); }}
//                     className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
//                 >
//                     {showForm ? "Close" : "Add Procedure"}
//                 </button>
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
//                 <Procedureform
//                     patientId={patientId}
//                     encounterId={encounterId}
//                     editing={editing}
//                     onSaved={onSaved}
//                     onCancel={() => { setShowForm(false); setEditing(null); }}
//                 />
//             )}
//
//             {loading && <div className="text-gray-600">Loading...</div>}
//             {error && <div className="text-red-600">{error}</div>}
//             {!loading && !error && sorted.length === 0 && (
//                 <div className="rounded-xl border p-4 text-gray-600">No procedures yet.</div>
//             )}
//
//             <ul className="space-y-3">
//                 {sorted.map((p) => (
//                     <li key={p.id} className="rounded-2xl border p-4 bg-white shadow-sm">
//                         <div className="flex items-start justify-between gap-4">
//                             <div className="space-y-1">
//                                 <p className="font-medium text-gray-900">
//                                     {/* Current billing-style display */}
//                                     {p.cpt4 ? `${p.cpt4} · ${p.description}` : (p as any).procedureName || "Procedure"}
//                                     {typeof (p as any).units === "number" ? ` · Units: ${(p as any).units}` : ""}
//                                     {(p as any).rate ? ` · $${(p as any).rate}` : ""}
//                                     {/* Legacy status if present */}
//                                     {(p as any).status ? ` · ${(p as any).status}` : ""}
//                                 </p>
//
//                                 {(p as any).relatedIcds && (
//                                     <p className="text-sm text-gray-700">ICDs: {(p as any).relatedIcds}</p>
//                                 )}
//
//                                 {((p as any).hospitalBillingStart || (p as any).hospitalBillingEnd) && (
//                                     <p className="text-sm text-gray-700">
//                                         {(p as any).hospitalBillingStart ? `HB Start: ${(p as any).hospitalBillingStart}` : ""}
//                                         {(p as any).hospitalBillingEnd ? ` · HB End: ${(p as any).hospitalBillingEnd}` : ""}
//                                     </p>
//                                 )}
//
//                                 {(p as any).modifier1 || (p as any).modifier2 || (p as any).modifier3 || (p as any).modifier4 ? (
//                                     <p className="text-sm text-gray-700">
//                                         Modifiers:
//                                         {(p as any).modifier1 ? ` ${(p as any).modifier1}` : ""}
//                                         {(p as any).modifier2 ? `, ${(p as any).modifier2}` : ""}
//                                         {(p as any).modifier3 ? `, ${(p as any).modifier3}` : ""}
//                                         {(p as any).modifier4 ? `, ${(p as any).modifier4}` : ""}
//                                     </p>
//                                 ) : null}
//
//                                 {/* Legacy clinical display if present */}
//                                 {((p as any).datePerformed || (p as any).performer) && (
//                                     <p className="text-sm text-gray-700">
//                                         {(p as any).datePerformed ? `Date: ${(p as any).datePerformed}` : ""}
//                                         {(p as any).performer ? ` · Performer: ${(p as any).performer}` : ""}
//                                     </p>
//                                 )}
//                                 {((p as any).bodySite || (p as any).laterality || (p as any).modifiers || (p as any).anesthesia) && (
//                                     <p className="text-sm text-gray-700">
//                                         {(p as any).bodySite ? `Site: ${(p as any).bodySite}` : ""}
//                                         {(p as any).laterality ? ` · ${(p as any).laterality}` : ""}
//                                         {(p as any).modifiers ? ` · Mod: ${(p as any).modifiers}` : ""}
//                                         {(p as any).anesthesia ? ` · Anes: ${(p as any).anesthesia}` : ""}
//                                     </p>
//                                 )}
//
//                                 {(p as any).note && <p className="text-gray-800 whitespace-pre-wrap">{(p as any).note}</p>}
//                                 {(p as any).notes && !(p as any).note && (
//                                     <p className="text-gray-800 whitespace-pre-wrap">{(p as any).notes}</p>
//                                 )}
//
//                                 <p className="text-xs text-gray-500">
//                                     {p.audit?.createdDate && <>Created: {p.audit.createdDate}</>}
//                                     {p.audit?.lastModifiedDate && <> · Updated: {p.audit.lastModifiedDate}</>}
//                                 </p>
//                             </div>
//
//                             <div className="flex flex-wrap gap-2">
//                                 <button
//                                     onClick={() => { setEditing(p); setShowForm(true); }}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
//                                 >
//                                     Edit
//                                 </button>
//
//                                 <button
//                                     onClick={() => remove(p.id!)}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
//                                     disabled={busyId === p.id}
//                                 >
//                                     Delete
//                                 </button>
//
//                                 <button
//                                     onClick={() => esign(p.id!)}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
//                                     disabled={busyId === p.id}
//                                     title="eSign"
//                                 >
//                                     eSign
//                                 </button>
//
//                                 <button
//                                     onClick={() => printProcedure(p)}
//                                     className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
//                                     disabled={busyId === p.id}
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






"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, ProcedureDto } from "@/utils/types";
import Procedureform from "./Procedureform";
import { toast, confirmDialog } from "@/utils/toast";

type Props = { patientId: number; encounterId: number };


// Only ADD new optional fields in the extend, do NOT redeclare or change types of fields inherited from ProcedureDto
interface ExtendedProcedureDto extends ProcedureDto {
    // Only add fields not already in ProcedureDto
    // e.g., legacy clinical fields
    procedureName?: string;
    procedureCode?: string;
    status?: string;
    datePerformed?: string;
    performer?: string;
    bodySite?: string;
    laterality?: string;
    modifiers?: string;
    anesthesia?: string;
    notes?: string;
}

// ---- helpers
async function safeJson<T>(res: Response): Promise<T | null> {
    const t = await res.text().catch(() => "");
    if (!t) return null;
    try { return JSON.parse(t) as T; } catch { return null; }
}

function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (m) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!)
    );
}

export default function Procedurelist({ patientId, encounterId }: Props) {
    const [items, setItems] = useState<ExtendedProcedureDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ExtendedProcedureDto | null>(null);

    // UI feedback
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            // GET /api/procedures/{patientId}/{encounterId}
            const res = await fetchWithOrg(`/api/procedures/${patientId}/${encounterId}`);
            const json = await safeJson<ApiResponse<ExtendedProcedureDto[]>>(res);
            if (!res.ok) throw new Error(json?.message || `Load failed (HTTP ${res.status})`);
            if (!json?.success) throw new Error(json?.message || "Load failed");
            setItems(json.data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [patientId, encounterId]);

    function onSaved(saved: ExtendedProcedureDto | ExtendedProcedureDto[]) {
        setShowForm(false);
        setEditing(null);
        
        if (Array.isArray(saved)) {
            // Multiple procedures created
            setItems((prev) => [...saved, ...prev]);
            setAlert({ type: "success", msg: `${saved.length} procedures saved.` });
        } else {
            // Single procedure created or updated
            setItems((prev) => {
                const i = prev.findIndex((x) => x.id === saved.id);
                if (i >= 0) { const copy = [...prev]; copy[i] = saved; return copy; }
                return [saved, ...prev];
            });
            setAlert({ type: "success", msg: "Procedure saved." });
        }
        setTimeout(() => setAlert(null), 3000);
    }

    async function remove(id: number) {
        const confirmed = await confirmDialog("Delete this procedure?");
        if (!confirmed) return;
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/procedures/${patientId}/${encounterId}/${id}`,
                { method: "DELETE" }
            );

            if (res.status === 204) {
                setItems((p) => p.filter((x) => x.id !== id));
                setAlert({ type: "success", msg: "Procedure deleted." });
                return;
            }

            const json = await safeJson<ApiResponse<void>>(res);
            if (!res.ok || (json && json.success === false)) {
                throw new Error(json?.message || `Delete failed (HTTP ${res.status})`);
            }
            setItems((p) => p.filter((x) => x.id !== id));
            setAlert({ type: "success", msg: "Procedure deleted." });
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3000);
        }
    }

    // --- eSign (adjust endpoint if your backend differs)
    async function esign(id: number) {
        try {
            setBusyId(id);
            const res = await fetchWithOrg(
                `/api/procedures/${patientId}/${encounterId}/${id}/esign`,
                { method: "POST" }
            );
            let ok = res.ok;
            const json = await safeJson<ApiResponse<unknown>>(res);
            if (json && json.success === false) ok = false;
            if (!ok) throw new Error(json?.message || "eSign failed");

            setAlert({ type: "success", msg: "Procedure e-signed." });
            await load(); // reflect any signature fields
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusyId(null);
            setTimeout(() => setAlert(null), 3000);
        }
    }

    // --- Print: covers both legacy and current DTO shapes
    function printProcedure(p: ExtendedProcedureDto) {
        try {
            const win = window.open("", "_blank", "noopener,noreferrer");
            if (!win) throw new Error("Popup blocked. Please allow popups to print.");

            const lineItems: string[] = [];

            // Current billing-style fields
            if (p.cpt4 || p.description) {
                const units = typeof p.units === "number" ? ` · Units: ${p.units}` : "";
                const rate  = p.rate ? ` · $${p.rate}` : "";
                lineItems.push(`<div class="row"><strong>CPT4:</strong> ${escapeHtml(p.cpt4 || "—")} · ${escapeHtml(p.description || "—")}${units}${rate}</div>`);
            }
            if (p.relatedIcds) lineItems.push(`<div class="row"><strong>ICDs:</strong> ${escapeHtml(String(p.relatedIcds))}</div>`);
            if (p.hospitalBillingStart || p.hospitalBillingEnd) {
                lineItems.push(`<div class="row"><strong>Hospital Billing:</strong> ${escapeHtml(p.hospitalBillingStart || "—")} ${p.hospitalBillingEnd ? "– " + escapeHtml(p.hospitalBillingEnd) : ""}</div>`);
            }
            if (p.modifier1 || p.modifier2 || p.modifier3 || p.modifier4) {
                const mods = [p.modifier1, p.modifier2, p.modifier3, p.modifier4].filter(Boolean).join(", ");
                lineItems.push(`<div class="row"><strong>Modifiers:</strong> ${escapeHtml(mods)}</div>`);
            }
            if (p.note) lineItems.push(`<div class="row"><strong>Notes:</strong><br/>${escapeHtml(String(p.note)).replace(/\n/g,"<br/>")}</div>`);

            // Legacy clinical fields (if present)
            if (p.procedureName || p.procedureCode || p.status) {
                const top = [p.procedureName, p.procedureCode, p.status].filter(Boolean).map(String).join(" · ");
                lineItems.push(`<div class="row"><strong>Procedure:</strong> ${escapeHtml(top)}</div>`);
            }
            const performerDisplay = p.performer || (p as any).providername || "";
            if (p.datePerformed || performerDisplay) {
                const meta = [p.datePerformed ? "Date: " + p.datePerformed : "", performerDisplay ? "Performer: " + performerDisplay : ""].filter(Boolean).join(" · ");
                if (meta) lineItems.push(`<div class="row">${escapeHtml(meta)}</div>`);
            }
            if (p.bodySite || p.laterality || p.modifiers || p.anesthesia) {
                const meta2 = [
                    p.bodySite ? "Site: " + p.bodySite : "",
                    p.laterality ? p.laterality : "",
                    p.modifiers ? "Mod: " + p.modifiers : "",
                    p.anesthesia ? "Anes: " + p.anesthesia : ""
                ].filter(Boolean).join(" · ");
                if (meta2) lineItems.push(`<div class="row">${escapeHtml(meta2)}</div>`);
            }
            if (p.notes && !p.note) {
                lineItems.push(`<div class="row"><strong>Notes:</strong><br/>${escapeHtml(String(p.notes)).replace(/\n/g,"<br/>")}</div>`);
            }

            const created = p.audit?.createdDate ? `Created: ${p.audit.createdDate}` : "";
            const updated = p.audit?.lastModifiedDate ? ` · Updated: ${p.audit.lastModifiedDate}` : "";

            win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Procedure #${p.id ?? ""}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
  .row { margin: 6px 0; }
  @media print { @page { margin: 12mm; } }
</style>
</head>
<body>
  <h1>Procedure</h1>
  <div class="meta">Patient #${patientId} · Encounter #${encounterId} · ID ${p.id ?? ""} ${created}${updated}</div>
  <div class="card">
    ${lineItems.join("\n")}
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
            win.document.close();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Unable to print");
        }
    }

    const sorted = useMemo(() => {
        return [...items].sort((a, b) => {
            // Prefer lastModified/created, then procedure date or hospital billing start if available
            const aKey =
                a.audit?.lastModifiedDate ||
                a.audit?.createdDate ||
                a.datePerformed ||
                a.hospitalBillingStart ||
                "";
            const bKey =
                b.audit?.lastModifiedDate ||
                b.audit?.createdDate ||
                b.datePerformed ||
                b.hospitalBillingStart ||
                "";
            return String(bKey).localeCompare(String(aKey));
        });
    }, [items]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Procedures</h2>
                <button
                    onClick={() => { setEditing(null); setShowForm((s) => !s); }}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Add Procedure"}
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
                <Procedureform
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
                <div className="rounded-xl border p-4 text-gray-600">No procedures yet.</div>
            )}

            <ul className="space-y-3">
                {sorted.map((p) => (
                    <li key={p.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                {/* Display codeItems if available */}
                                {(p as any).codeItems && Array.isArray((p as any).codeItems) && (p as any).codeItems.length > 0 ? (
                                    <div className="space-y-2">
                                        {(p as any).codeItems.map((item: any, idx: number) => (
                                            <div key={idx} className="border-l-2 border-indigo-500 pl-3">
                                                <p className="font-medium text-gray-900">
                                                    {item.cpt4} · {item.description}
                                                    {typeof item.units === "number" ? ` · Units: ${item.units}` : ""}
                                                    {item.rate ? ` · $${item.rate}` : ""}
                                                </p>
                                                {item.relatedIcds && (
                                                    <p className="text-sm text-gray-700">ICDs: {item.relatedIcds}</p>
                                                )}
                                                {item.modifier1 && (
                                                    <p className="text-sm text-gray-700">Modifier: {item.modifier1}</p>
                                                )}
                                                {item.note && <p className="text-sm text-gray-600">{item.note}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-medium text-gray-900">
                                            {p.cpt4 ? `${p.cpt4} · ${p.description}` : p.procedureName || "Procedure"}
                                            {typeof p.units === "number" ? ` · Units: ${p.units}` : ""}
                                            {p.rate ? ` · $${p.rate}` : ""}
                                            {p.status ? ` · ${p.status}` : ""}
                                        </p>

                                        {p.relatedIcds && (
                                            <p className="text-sm text-gray-700">ICDs: {p.relatedIcds}</p>
                                        )}

                                        {(p.hospitalBillingStart || p.hospitalBillingEnd) && (
                                            <p className="text-sm text-gray-700">
                                                {p.hospitalBillingStart ? `HB Start: ${p.hospitalBillingStart}` : ""}
                                                {p.hospitalBillingEnd ? ` · HB End: ${p.hospitalBillingEnd}` : ""}
                                            </p>
                                        )}

                                        {(p.modifier1 || p.modifier2 || p.modifier3 || p.modifier4) && (
                                            <p className="text-sm text-gray-700">
                                                Modifiers:
                                                {p.modifier1 ? ` ${p.modifier1}` : ""}
                                                {p.modifier2 ? `, ${p.modifier2}` : ""}
                                                {p.modifier3 ? `, ${p.modifier3}` : ""}
                                                {p.modifier4 ? `, ${p.modifier4}` : ""}
                                            </p>
                                        )}

                                        {(p.datePerformed || p.performer || (p as any).providername) && (
                                            <p className="text-sm text-gray-700">
                                                {p.datePerformed ? `Date: ${p.datePerformed}` : ""}
                                                {(p.performer || (p as any).providername) ? ` · Performer: ${p.performer || (p as any).providername}` : ""}
                                            </p>
                                        )}
                                        {(p.bodySite || p.laterality || p.modifiers || p.anesthesia) && (
                                            <p className="text-sm text-gray-700">
                                                {p.bodySite ? `Site: ${p.bodySite}` : ""}
                                                {p.laterality ? ` · ${p.laterality}` : ""}
                                                {p.modifiers ? ` · Mod: ${p.modifiers}` : ""}
                                                {p.anesthesia ? ` · Anes: ${p.anesthesia}` : ""}
                                            </p>
                                        )}

                                        {p.note && <p className="text-gray-800 whitespace-pre-wrap">{p.note}</p>}
                                        {p.notes && !p.note && (
                                            <p className="text-gray-800 whitespace-pre-wrap">{p.notes}</p>
                                        )}
                                    </>
                                )}

                                <p className="text-xs text-gray-500">
                                    {p.audit?.createdDate && <>Created: {p.audit.createdDate}</>}
                                    {p.audit?.lastModifiedDate && <> · Updated: {p.audit.lastModifiedDate}</>}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => { setEditing(p); setShowForm(true); }}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                >
                                    Edit
                                </button>

                                <button
                                    onClick={() => remove(p.id!)}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyId === p.id}
                                >
                                    Delete
                                </button>

                                <button
                                    onClick={() => esign(p.id!)}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyId === p.id}
                                    title="eSign"
                                >
                                    eSign
                                </button>

                                <button
                                    onClick={() => printProcedure(p)}
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    disabled={busyId === p.id}
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
    );
}