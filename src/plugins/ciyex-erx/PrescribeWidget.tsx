"use client";

import React, { useState } from "react";
import { Pill, Search, AlertTriangle, CheckCircle2, Star, Send, X } from "lucide-react";

interface DrugResult {
    name: string;
    strength: string;
    form: string;
    rxcui: string;
    generic: boolean;
    controlled: boolean;
    schedule?: string;
}

const DRUG_DB: DrugResult[] = [
    { name: "Metformin", strength: "500mg", form: "Tablet", rxcui: "860975", generic: true, controlled: false },
    { name: "Metformin", strength: "1000mg", form: "Tablet", rxcui: "860981", generic: true, controlled: false },
    { name: "Lisinopril", strength: "10mg", form: "Tablet", rxcui: "314076", generic: true, controlled: false },
    { name: "Atorvastatin", strength: "20mg", form: "Tablet", rxcui: "259255", generic: true, controlled: false },
    { name: "Amoxicillin", strength: "500mg", form: "Capsule", rxcui: "308182", generic: true, controlled: false },
    { name: "Hydrocodone/APAP", strength: "5-325mg", form: "Tablet", rxcui: "857001", generic: true, controlled: true, schedule: "II" },
];

export default function PrescribeWidget({ encounterId }: { encounterId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedDrug, setSelectedDrug] = useState<DrugResult | null>(null);
    const [sig, setSig] = useState({ dose: "", unit: "mg", route: "Oral", freq: "BID", duration: "90", qty: "180", refills: "3", daw: "Substitution allowed", instructions: "" });
    const [pharmacy, setPharmacy] = useState("CVS #1234 — 100 Main St");
    const [sent, setSent] = useState(false);

    const results = search.length >= 2 ? DRUG_DB.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : [];

    const selectDrug = (drug: DrugResult) => {
        setSelectedDrug(drug);
        setSearch("");
        setSig(p => ({ ...p, dose: drug.strength.replace(/[^\d.]/g, ""), unit: drug.strength.replace(/[\d.]/g, "") || "mg" }));
    };

    const sendRx = () => {
        setSent(true);
        setTimeout(() => { setSent(false); setIsOpen(false); setSelectedDrug(null); }, 2000);
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                <Pill className="h-4 w-4" /> New Prescription
            </button>
        );
    }

    return (
        <div className="border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-gray-900 shadow-lg">
            <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between">
                <div className="flex items-center gap-2"><Pill className="h-4 w-4 text-purple-600" /><span className="text-sm font-semibold text-purple-800 dark:text-purple-300">New Prescription</span></div>
                <button onClick={() => { setIsOpen(false); setSelectedDrug(null); }}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="p-4 space-y-3">
                {sent ? (
                    <div className="text-center py-6">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Prescription sent to {pharmacy}</p>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search medication..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600" />
                            {results.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {results.map(d => (
                                        <button key={d.rxcui} onClick={() => selectDrug(d)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center justify-between border-b last:border-0 dark:border-gray-700">
                                            <span>{d.name} {d.strength} {d.form}</span>
                                            <div className="flex gap-1">
                                                {d.generic && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">Generic</span>}
                                                {d.controlled && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded">C-{d.schedule}</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedDrug && (
                            <>
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-sm font-medium text-purple-800 dark:text-purple-300">
                                    {selectedDrug.name} {selectedDrug.strength} {selectedDrug.form}
                                    {selectedDrug.controlled && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Schedule {selectedDrug.schedule}</span>}
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div><label className="text-gray-500">Dose</label><input value={sig.dose} onChange={e => setSig(p => ({ ...p, dose: e.target.value }))} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                                    <div><label className="text-gray-500">Route</label><select value={sig.route} onChange={e => setSig(p => ({ ...p, route: e.target.value }))} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"><option>Oral</option><option>Topical</option><option>IM</option><option>IV</option><option>Inhaled</option></select></div>
                                    <div><label className="text-gray-500">Frequency</label><select value={sig.freq} onChange={e => setSig(p => ({ ...p, freq: e.target.value }))} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"><option>QD</option><option>BID</option><option>TID</option><option>QID</option><option>PRN</option><option>QHS</option></select></div>
                                    <div><label className="text-gray-500">Duration (days)</label><input value={sig.duration} onChange={e => setSig(p => ({ ...p, duration: e.target.value }))} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div><label className="text-gray-500">Quantity</label><input value={sig.qty} onChange={e => setSig(p => ({ ...p, qty: e.target.value }))} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                                    <div><label className="text-gray-500">Refills</label><input value={sig.refills} onChange={e => setSig(p => ({ ...p, refills: e.target.value }))} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /></div>
                                    <div><label className="text-gray-500">DAW</label><select value={sig.daw} onChange={e => setSig(p => ({ ...p, daw: e.target.value }))} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"><option>Substitution allowed</option><option>DAW - Brand required</option></select></div>
                                </div>
                                <div className="text-xs"><label className="text-gray-500">Instructions</label><input value={sig.instructions} onChange={e => setSig(p => ({ ...p, instructions: e.target.value }))} placeholder="Take with meals" className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600" /></div>

                                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs space-y-0.5">
                                    <div className="flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Formulary: Tier 1 (preferred) — $10 copay</div>
                                    <div className="flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> No drug interactions detected</div>
                                    <div className="flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> No allergy conflicts</div>
                                </div>

                                <div className="text-xs"><label className="text-gray-500">Pharmacy</label>
                                    <select value={pharmacy} onChange={e => setPharmacy(e.target.value)} className="w-full border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600">
                                        <option>CVS #1234 — 100 Main St</option><option>Walgreens — 200 Oak Ave</option><option>Rite Aid — 300 Elm St</option>
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={sendRx} className="px-4 py-2 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 flex items-center gap-1.5"><Send className="h-3 w-3" /> Send to Pharmacy</button>
                                    <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 flex items-center gap-1.5"><Star className="h-3 w-3" /> Add to Favorites</button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
