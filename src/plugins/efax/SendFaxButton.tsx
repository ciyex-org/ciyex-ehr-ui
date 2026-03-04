"use client";

import React, { useState } from "react";
import { Printer, Send, X, CheckCircle2, Loader2, Plus } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export default function SendFaxButton({ encounterId }: { encounterId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [to, setTo] = useState("");
    const [notes, setNotes] = useState("");
    const [coverPage, setCoverPage] = useState(true);
    const [docs, setDocs] = useState({ visitNotes: true, labResults: false, referral: false });

    const send = async () => {
        setSending(true);
        setError(null);
        try {
            const selectedDocs = Object.entries(docs).filter(([, v]) => v).map(([k]) => k);
            const r = await fetchWithAuth("/api/app-proxy/efax/api/fax/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toNumber: to,
                    encounterId,
                    documents: selectedDocs,
                    includeCoverPage: coverPage,
                    coverPageNotes: notes,
                }),
            });
            if (r.ok) {
                setSent(true);
                setTimeout(() => { setSent(false); setIsOpen(false); setTo(""); setNotes(""); }, 2000);
            } else {
                const data = await r.json().catch(() => ({}));
                setError(data.message || "Failed to send fax");
            }
        } catch {
            setError("Could not reach fax service");
        }
        setSending(false);
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800">
                <Printer className="h-3.5 w-3.5" /> Send Fax
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[420px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Printer className="h-4 w-4 text-teal-600" /><span className="font-semibold text-sm">Send Fax via eFax</span></div>
                    <button onClick={() => setIsOpen(false)}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-4 space-y-3">
                    {sent ? (
                        <div className="text-center py-8"><CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" /><p className="text-sm font-medium text-green-700 dark:text-green-400">Fax queued for delivery</p><p className="text-xs text-gray-500 mt-1">To: {to}</p></div>
                    ) : (
                        <>
                            <div className="text-xs">
                                <label className="text-gray-500 font-medium">To (Fax Number)</label>
                                <input value={to} onChange={e => setTo(e.target.value)} placeholder="+15551234567" className="w-full border rounded px-3 py-2 mt-1 dark:bg-gray-800 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Documents</label>
                                <div className="mt-1 space-y-1">
                                    {Object.entries({ visitNotes: "Visit notes", labResults: "Lab results", referral: "Referral letter" }).map(([k, v]) => (
                                        <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input type="checkbox" checked={docs[k as keyof typeof docs]} onChange={e => setDocs(p => ({ ...p, [k]: e.target.checked }))} className="rounded border-gray-300" />{v}
                                        </label>
                                    ))}
                                    <button className="flex items-center gap-1 text-xs text-teal-600 hover:underline mt-1"><Plus className="h-3 w-3" /> Attach file</button>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input type="checkbox" checked={coverPage} onChange={e => setCoverPage(e.target.checked)} className="rounded border-gray-300" /> Include cover page
                            </label>
                            <div className="text-xs">
                                <label className="text-gray-500">Cover page notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1 dark:bg-gray-800 dark:border-gray-600" placeholder="Notes for the recipient..." />
                            </div>
                            {error && <p className="text-xs text-red-600">{error}</p>}
                            <div className="flex gap-2 pt-2">
                                <button onClick={send} disabled={sending || !to} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Now
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
