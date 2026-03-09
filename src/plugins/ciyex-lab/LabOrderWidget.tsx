"use client";

import React, { useState } from "react";
import { FlaskConical, Search, CheckCircle2, X, Send, Printer, AlertTriangle } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

interface LabTest { code: string; name: string; loinc: string; specimen: string; fasting: boolean; }

const TEST_DB: LabTest[] = [
    { code: "CMP", name: "Comprehensive Metabolic Panel", loinc: "24323-8", specimen: "Serum", fasting: true },
    { code: "CBC", name: "CBC w/ Differential", loinc: "57021-8", specimen: "Whole blood", fasting: false },
    { code: "LIPID", name: "Lipid Panel", loinc: "24331-1", specimen: "Serum", fasting: true },
    { code: "TSH", name: "Thyroid Stimulating Hormone", loinc: "11580-8", specimen: "Serum", fasting: false },
    { code: "HBA1C", name: "Hemoglobin A1c", loinc: "4548-4", specimen: "Whole blood", fasting: false },
    { code: "UA", name: "Urinalysis", loinc: "24357-6", specimen: "Urine", fasting: false },
    { code: "BMP", name: "Basic Metabolic Panel", loinc: "51990-0", specimen: "Serum", fasting: true },
];

export default function LabOrderWidget({ encounterId, patientId }: { encounterId?: string; patientId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<(LabTest & { icd: string })[]>([]);
    const [lab, setLab] = useState("Quest Diagnostics — Main St PSC");
    const [priority, setPriority] = useState("Routine");
    const [sent, setSent] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const results = search.length >= 2 ? TEST_DB.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())) : [];

    const addTest = (t: LabTest) => {
        if (!selected.find(s => s.code === t.code)) setSelected(p => [...p, { ...t, icd: "" }]);
        setSearch("");
    };

    const removeTest = (code: string) => setSelected(p => p.filter(s => s.code !== code));
    const updateIcd = (code: string, icd: string) => setSelected(p => p.map(s => s.code === code ? { ...s, icd } : s));

    const submit = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            const API = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
            const payload = {
                encounterId: encounterId || null,
                patientId: patientId || null,
                lab,
                priority,
                tests: selected.map(t => ({ code: t.code, name: t.name, loinc: t.loinc, icdCode: t.icd })),
            };
            const res = await fetchWithAuth(`${API}/api/lab-orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setSent(true);
                setTimeout(() => { setSent(false); setIsOpen(false); setSelected([]); }, 2000);
            } else {
                const err = await res.json().catch(() => null);
                setSaveError(err?.message || `Failed to submit order (${res.status})`);
            }
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : "Network error");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
                <FlaskConical className="h-4 w-4" /> Order Labs
            </button>
        );
    }

    return (
        <div className="border border-teal-200 dark:border-teal-800 rounded-lg bg-white dark:bg-gray-900 shadow-lg">
            <div className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800 flex items-center justify-between">
                <div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-teal-600" /><span className="text-sm font-semibold text-teal-800 dark:text-teal-300">Lab Order</span></div>
                <button onClick={() => { setIsOpen(false); setSelected([]); }}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="p-4 space-y-3">
                {sent ? (
                    <div className="text-center py-6"><CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" /><p className="text-sm font-medium text-green-700 dark:text-green-400">Lab order submitted to {lab}</p></div>
                ) : (
                    <>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600" />
                            {results.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {results.map(t => (
                                        <button key={t.code} onClick={() => addTest(t)} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm border-b last:border-0 dark:border-gray-700">
                                            <span className="font-medium">{t.name}</span> <span className="text-xs text-gray-500">LOINC: {t.loinc}</span>
                                            {t.fasting && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded ml-1">Fasting</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selected.length > 0 && (
                            <div className="space-y-2">
                                {selected.map(t => (
                                    <div key={t.code} className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded border border-teal-200 dark:border-teal-800">
                                        <div className="flex items-center justify-between">
                                            <div><span className="text-xs font-medium">{t.name}</span><span className="text-[10px] text-gray-500 ml-2">LOINC: {t.loinc}</span></div>
                                            <button onClick={() => removeTest(t.code)}><X className="h-3 w-3 text-gray-400 hover:text-red-500" /></button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                            <span>Specimen: {t.specimen}</span>{t.fasting && <span className="text-amber-600">Fasting: Yes (8hr)</span>}
                                            <input value={t.icd} onChange={e => updateIcd(t.code, e.target.value)} placeholder="ICD-10 code" className="ml-auto w-32 border rounded px-1.5 py-0.5 text-[10px] dark:bg-gray-800 dark:border-gray-600" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><label className="text-gray-500">Lab</label><select value={lab} onChange={e => setLab(e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600"><option>Quest Diagnostics — Main St PSC</option><option>Labcorp — Oak Ave</option><option>In-Office Draw</option></select></div>
                            <div><label className="text-gray-500">Priority</label><select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600"><option>Routine</option><option>STAT</option><option>ASAP</option></select></div>
                            <div><label className="text-gray-500">Collection</label><select className="w-full border rounded px-2 py-1.5 mt-1 dark:bg-gray-800 dark:border-gray-600"><option>Patient Service Center</option><option>In-Office</option><option>Home Draw</option></select></div>
                        </div>

                        {selected.some(t => t.fasting) && (
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> Fasting required for selected tests. Patient should fast 8-12 hours before collection.
                            </div>
                        )}

                        {saveError && (
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
                                {saveError}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={submit} disabled={!selected.length || saving} className="px-4 py-2 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5">
                                <Send className="h-3 w-3" /> {saving ? "Saving..." : "Submit Order"}
                            </button>
                            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 flex items-center gap-1.5"><Printer className="h-3 w-3" /> Print Requisition</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
