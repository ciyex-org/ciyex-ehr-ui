"use client";
import Image from "next/image";
import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import type { ApiResponse, ProviderSignatureDto } from "@/utils/types";
import Providersignatureform from "./Providersignatureform";

// Safe JSON parser
async function safeJson<T>(res: Response): Promise<T | null> {
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (m) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!)
    );
}

type Props = { patientId: number; encounterId: number };

export default function Providersignaturecard({ patientId, encounterId }: Props) {
    const [item, setItem] = useState<ProviderSignatureDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // UI feedback
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetchWithOrg(
                `/api/provider-signatures/${patientId}/${encounterId}`,
                { cache: "no-store" as RequestCache }
            );

            const json = await safeJson<
                ApiResponse<ProviderSignatureDto | ProviderSignatureDto[] | null>
            >(res);

            if (!res.ok || !json?.success) throw new Error(json?.message || "Load failed");

            const data = json.data;
            let sig: ProviderSignatureDto | null = null;
            if (Array.isArray(data)) {
                sig =
                    [...data]
                        .sort((a, b) =>
                            (a.id ?? 0) === (b.id ?? 0)
                                ? String(a.signedAt ?? "").localeCompare(String(b.signedAt ?? ""))
                                : (a.id ?? 0) - (b.id ?? 0)
                        )
                        .pop() ?? null;
            } else {
                sig = data ?? null;
            }
            setItem(sig);
            setShowForm(!sig);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
            setItem(null);
        } finally {
            setLoading(false);
        }
    }, [patientId, encounterId]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = useCallback(async () => {
        if (!item?.id) return;
        if (!confirm("Delete signature?")) return;
        try {
            setBusy(true);
            const res = await fetchWithOrg(
                `/api/provider-signatures/${patientId}/${encounterId}/${item.id}`,
                { method: "DELETE" }
            );
            if (!res.ok) throw new Error(`Delete failed (${res.status})`);
            setItem(null);
            setShowForm(true);
            setAlert({ type: "success", msg: "Signature deleted." });
        } catch (e: unknown) {
            setAlert({ type: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
        } finally {
            setBusy(false);
            setTimeout(() => setAlert(null), 3000);
        }
    }, [item, patientId, encounterId]);

    const printSignature = useCallback(
        (sig: ProviderSignatureDto) => {
            try {
                const win = window.open("", "_blank", "noopener,noreferrer");
                if (!win) throw new Error("Popup blocked. Please allow popups to print.");

                const signedBy = sig.signedBy || "—";
                const role = sig.signerRole ? ` (${sig.signerRole})` : "";
                const at = sig.signedAt ? ` · ${sig.signedAt}` : "";
                const status = sig.status ? ` · ${sig.status}` : "";
                const created = sig.audit?.createdDate ? `Created: ${sig.audit.createdDate}` : "";
                const updated = sig.audit?.lastModifiedDate ? ` · Updated: ${sig.audit.lastModifiedDate}` : "";

                const isImageFormat = sig.signatureFormat?.startsWith?.("image/");
                const imgSrc = sig.signatureData
                    ? isImageFormat
                        ? `data:${sig.signatureFormat};base64,${sig.signatureData}`
                        : `data:image/png;base64,${sig.signatureData}`
                    : "";

                win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Provider Signature</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
  .row { margin: 6px 0; }
  .sig { margin-top: 12px; }
  @media print { @page { margin: 12mm; } }
</style>
</head>
<body>
  <h1>Provider Signature</h1>
  <div class="meta">Patient #${patientId} · Encounter #${encounterId} ${created}${updated}</div>
  <div class="card">
    <div class="row"><strong>Signed by:</strong> ${escapeHtml(signedBy)}${escapeHtml(role)}${escapeHtml(at)}${escapeHtml(status)}</div>
    ${sig.comments ? `<div class="row"><strong>Comments:</strong><br/>${escapeHtml(sig.comments).replace(/\n/g,"<br/>")}</div>` : ""}
    ${imgSrc ? `<div class="sig"><img alt="Signature" style="max-height:120px" src="${imgSrc}" /></div>` : ""}
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
                win.document.close();
            } catch (e: unknown) {
                window.alert(e instanceof Error ? e.message : "Unable to print");
            }
        },
        [patientId, encounterId]
    );

    const headerActions = useMemo(() => {
        if (!item) {
            return (
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Add Signature"}
                </button>
            );
        }
        return (
            <div className="flex gap-2">
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
                >
                    {showForm ? "Close" : "Edit"}
                </button>
                <button
                    onClick={() => item && printSignature(item)}
                    className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                    title="Print"
                    disabled={busy}
                >
                    Print
                </button>
                <button
                    onClick={remove}
                    className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
                    disabled={busy}
                >
                    Delete
                </button>
            </div>
        );
    }, [item, showForm, busy, printSignature, remove]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Provider Signature</h2>
                {headerActions}
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

            {loading && <div className="text-gray-600">Loading...</div>}
            {err && <div className="text-red-600">{err}</div>}

            {!loading && !err && item && !showForm && (
                <div className="rounded-xl border p-4 bg-white space-y-2">
                    <div className="text-sm text-gray-800">
                        <b>Signed by:</b> {item.signedBy}
                        {item.signerRole ? ` (${item.signerRole})` : ""}
                        {item.signedAt ? ` · ${item.signedAt}` : ""}
                        {item.status ? ` · ${item.status}` : ""}
                    </div>

                    {item.signatureData && (
                        <div className="pt-2">
                            <Image
                                alt="Signature"
                                className="max-h-24"
                                src={`data:image/png;base64,${item.signatureData}`}
                                width={200}
                                height={100}
                            />
                        </div>
                    )}

                    {item.comments && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.comments}</p>
                    )}

                    <p className="text-xs text-gray-500">
                        {item.audit?.createdDate && <>Created: {item.audit.createdDate}</>}
                        {item.audit?.lastModifiedDate && <> · Updated: {item.audit.lastModifiedDate}</>}
                    </p>
                </div>
            )}

            {!loading && !err && showForm && (
                <Providersignatureform
                    patientId={patientId}
                    encounterId={encounterId}
                    value={item}
                    onSaved={(saved) => {
                        setItem(saved);
                        setShowForm(false);
                        setAlert({ type: "success", msg: "Signature saved." });
                        setTimeout(() => setAlert(null), 3000);
                    }}
                    onAfterSubmit={() => load()}
                />
            )}
        </div>
    );
}
