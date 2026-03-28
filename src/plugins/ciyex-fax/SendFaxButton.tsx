"use client";

import React, { useState } from "react";
import { Printer, Send, X, CheckCircle2, Loader2, FileText, Plus } from "lucide-react";

export default function SendFaxButton({ encounterId }: { encounterId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [to, setTo] = useState("");
    const [notes, setNotes] = useState("");
    const [docs, setDocs] = useState({ visitNotes: true, labResults: false, referral: false });

    const send = () => {
        setSending(true);
        setTimeout(() => { setSending(false); setSent(true); setTimeout(() => { setSent(false); setIsOpen(false); }, 2000); }, 1500);
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800">
                <Printer className="h-3.5 w-3.5" /> Send Fax
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[420px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Printer className="h-4 w-4 text-orange-600" /><span className="font-semibold text-sm">Send Fax</span></div>
                    <button onClick={() => setIsOpen(false)}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-4 space-y-3">
                    {sent ? (
                        <div className="text-center py-8"><CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" /><p className="text-sm font-medium text-green-700 dark:text-green-400">Fax sent successfully</p><p className="text-xs text-gray-500 mt-1">3 pages to {to}</p></div>
                    ) : (
                        <>
                            <div className="text-xs"><label className="text-gray-500 font-medium">To</label><input value={to} onChange={e => setTo(e.target.value)} placeholder="Fax number or search recipient..." className="w-full border rounded px-3 py-2 mt-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                            <div className="text-xs"><label className="text-gray-500 font-medium">From</label><p className="text-gray-700 dark:text-gray-300 mt-1">(555) 123-4568</p></div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Documents</label>
                                <div className="mt-1 space-y-1">
                                    {Object.entries({ visitNotes: "Visit notes (03/04/26)", labResults: "Lab results", referral: "Referral letter" }).map(([k, v]) => (
                                        <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input type="checkbox" checked={docs[k as keyof typeof docs]} onChange={e => setDocs(p => ({ ...p, [k]: e.target.checked }))} className="rounded border-gray-300" />{v}
                                        </label>
                                    ))}
                                    <button className="flex items-center gap-1 text-xs text-orange-600 hover:underline mt-1"><Plus className="h-3 w-3" /> Attach file</button>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" defaultChecked className="rounded border-gray-300" /> Include cover page</label>
                            <div className="text-xs"><label className="text-gray-500">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 mt-1 dark:bg-gray-800 dark:border-gray-600" placeholder="Notes for cover page..." /></div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={send} disabled={sending || !to} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Now
                                </button>
                                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-200">Schedule</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
