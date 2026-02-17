"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
    ShieldAlert, HeartPulse, Pill, Activity,
    ChevronRight, PanelLeftClose, PanelLeft,
    ChevronDown, ChevronUp,
} from "lucide-react";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface ClinicalSidebarProps {
    patientId: number;
    collapsed: boolean;
    onToggle: () => void;
    onNavigate: (tabKey: string) => void;
}

/* ---------- tiny section wrapper ---------- */
function SidebarSection({
    title,
    icon: Icon,
    tabKey,
    onNavigate,
    count,
    children,
}: {
    title: string;
    icon: React.ElementType;
    tabKey: string;
    onNavigate: (k: string) => void;
    count?: number;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);
    return (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(!open)}
            >
                <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="flex-1 text-left">{title}</span>
                {count !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600">
                        {count}
                    </span>
                )}
                {open ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
            </button>
            {open && (
                <div className="px-3 pb-2">
                    {children}
                    <button
                        onClick={() => onNavigate(tabKey)}
                        className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                    >
                        View all <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ClinicalSidebar({ patientId, collapsed, onToggle, onNavigate }: ClinicalSidebarProps) {
    // Allergies
    const [allergies, setAllergies] = useState<any[]>([]);
    const [allergiesLoading, setAllergiesLoading] = useState(true);

    // Problems
    const [problems, setProblems] = useState<any[]>([]);
    const [problemsLoading, setProblemsLoading] = useState(true);

    // Medications
    const [medications, setMedications] = useState<any[]>([]);
    const [medsLoading, setMedsLoading] = useState(true);

    // Vitals
    const [vitals, setVitals] = useState<Record<string, any> | null>(null);
    const [vitalsLoading, setVitalsLoading] = useState(true);

    useEffect(() => {
        if (!patientId) return;

        // Fetch allergies
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/allergy-intolerances/${patientId}`);
                if (res.ok) {
                    const body = await res.json();
                    const list = body.data?.allergiesList || (Array.isArray(body) ? body : []);
                    setAllergies(list);
                }
            } catch { /* silent */ } finally { setAllergiesLoading(false); }
        })();

        // Fetch problems
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/medical-problems/${patientId}`);
                if (res.ok) {
                    const body = await res.json();
                    const list = body.data?.problemsList || (Array.isArray(body) ? body : []);
                    setProblems(list);
                }
            } catch { /* silent */ } finally { setProblemsLoading(false); }
        })();

        // Fetch medications
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/fhir-resource/medications/patient/${patientId}?size=10`);
                if (res.ok) {
                    const body = await res.json();
                    const content = body.data?.content || [];
                    setMedications(content);
                }
            } catch { /* silent */ } finally { setMedsLoading(false); }
        })();

        // Fetch latest vitals
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/fhir-resource/vitals/patient/${patientId}?size=1`);
                if (res.ok) {
                    const body = await res.json();
                    const content = body.data?.content || [];
                    setVitals(content.length > 0 ? content[0] : null);
                }
            } catch { /* silent */ } finally { setVitalsLoading(false); }
        })();
    }, [patientId]);

    const severityColor = (s?: string) => {
        if (!s) return "bg-gray-100 text-gray-600";
        const lower = s.toLowerCase();
        if (lower === "severe" || lower === "high") return "bg-red-100 text-red-700";
        if (lower === "moderate") return "bg-yellow-100 text-yellow-700";
        return "bg-gray-100 text-gray-600";
    };

    /* --- Collapsed view: icon strip --- */
    if (collapsed) {
        return (
            <div className="w-12 shrink-0 bg-white border-r border-gray-200 flex flex-col items-center pt-2 gap-3">
                <button onClick={onToggle} className="p-1 rounded hover:bg-gray-100" title="Expand sidebar">
                    <PanelLeft className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => onNavigate("allergies")} className="p-1.5 rounded hover:bg-gray-100 relative" title="Allergies">
                    <ShieldAlert className="w-4 h-4 text-gray-500" />
                    {allergies.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center">
                            {allergies.length}
                        </span>
                    )}
                </button>
                <button onClick={() => onNavigate("medicalproblems")} className="p-1.5 rounded hover:bg-gray-100 relative" title="Problems">
                    <HeartPulse className="w-4 h-4 text-gray-500" />
                    {problems.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 text-white text-[8px] rounded-full flex items-center justify-center">
                            {problems.length}
                        </span>
                    )}
                </button>
                <button onClick={() => onNavigate("medications")} className="p-1.5 rounded hover:bg-gray-100 relative" title="Medications">
                    <Pill className="w-4 h-4 text-gray-500" />
                    {medications.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 text-white text-[8px] rounded-full flex items-center justify-center">
                            {medications.length}
                        </span>
                    )}
                </button>
                <button onClick={() => onNavigate("vitals")} className="p-1.5 rounded hover:bg-gray-100" title="Vitals">
                    <Activity className="w-4 h-4 text-gray-500" />
                </button>
            </div>
        );
    }

    /* --- Expanded view --- */
    return (
        <aside className="w-[280px] shrink-0 bg-white border-r border-gray-200 rounded-lg overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
            {/* Collapse button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clinical Summary</span>
                <button onClick={onToggle} className="p-1 rounded hover:bg-gray-100" title="Collapse sidebar">
                    <PanelLeftClose className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Allergies */}
            <SidebarSection title="Allergies" icon={ShieldAlert} tabKey="allergies" onNavigate={onNavigate} count={allergies.length}>
                {allergiesLoading ? (
                    <p className="text-[11px] text-gray-400">Loading...</p>
                ) : allergies.length === 0 ? (
                    <p className="text-[11px] text-gray-400">No known allergies</p>
                ) : (
                    <ul className="space-y-1">
                        {allergies.slice(0, 5).map((a: any, i: number) => (
                            <li key={a.id || i} className="flex items-center gap-1.5 text-[11px]">
                                <span className="text-gray-800 truncate">{a.allergyName || a.substance || "—"}</span>
                                <span className={`px-1 py-0.5 rounded text-[9px] shrink-0 ${severityColor(a.severity)}`}>
                                    {a.severity || "—"}
                                </span>
                            </li>
                        ))}
                        {allergies.length > 5 && (
                            <li className="text-[10px] text-gray-400">+{allergies.length - 5} more</li>
                        )}
                    </ul>
                )}
            </SidebarSection>

            {/* Active Problems */}
            <SidebarSection title="Active Problems" icon={HeartPulse} tabKey="medicalproblems" onNavigate={onNavigate} count={problems.length}>
                {problemsLoading ? (
                    <p className="text-[11px] text-gray-400">Loading...</p>
                ) : problems.length === 0 ? (
                    <p className="text-[11px] text-gray-400">No active problems</p>
                ) : (
                    <ul className="space-y-1">
                        {problems.slice(0, 5).map((p: any, i: number) => (
                            <li key={p.id || i} className="text-[11px] text-gray-800 truncate">
                                {p.title || p.code || "—"}
                                {p.verificationStatus && (
                                    <span className="ml-1 text-[9px] text-gray-500">({p.verificationStatus})</span>
                                )}
                            </li>
                        ))}
                        {problems.length > 5 && (
                            <li className="text-[10px] text-gray-400">+{problems.length - 5} more</li>
                        )}
                    </ul>
                )}
            </SidebarSection>

            {/* Medications */}
            <SidebarSection title="Medications" icon={Pill} tabKey="medications" onNavigate={onNavigate} count={medications.length}>
                {medsLoading ? (
                    <p className="text-[11px] text-gray-400">Loading...</p>
                ) : medications.length === 0 ? (
                    <p className="text-[11px] text-gray-400">No current medications</p>
                ) : (
                    <ul className="space-y-1">
                        {medications.slice(0, 5).map((m: any, i: number) => (
                            <li key={m.id || i} className="text-[11px]">
                                <span className="text-gray-800 font-medium">{m.medication_name || m.name || "—"}</span>
                                {(m.dosage || m.frequency) && (
                                    <span className="text-gray-500 ml-1">{m.dosage} {m.frequency}</span>
                                )}
                            </li>
                        ))}
                        {medications.length > 5 && (
                            <li className="text-[10px] text-gray-400">+{medications.length - 5} more</li>
                        )}
                    </ul>
                )}
            </SidebarSection>

            {/* Recent Vitals */}
            <SidebarSection title="Recent Vitals" icon={Activity} tabKey="vitals" onNavigate={onNavigate}>
                {vitalsLoading ? (
                    <p className="text-[11px] text-gray-400">Loading...</p>
                ) : !vitals ? (
                    <p className="text-[11px] text-gray-400">No vitals recorded</p>
                ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {vitals.vitals_bp_systolic && (
                            <div className="text-[11px]">
                                <span className="text-gray-500">BP: </span>
                                <span className="font-medium text-gray-800">{vitals.vitals_bp_systolic}/{vitals.vitals_bp_diastolic}</span>
                            </div>
                        )}
                        {vitals.vitals_hr && (
                            <div className="text-[11px]">
                                <span className="text-gray-500">HR: </span>
                                <span className="font-medium text-gray-800">{vitals.vitals_hr}</span>
                            </div>
                        )}
                        {vitals.vitals_temp && (
                            <div className="text-[11px]">
                                <span className="text-gray-500">Temp: </span>
                                <span className="font-medium text-gray-800">{vitals.vitals_temp}</span>
                            </div>
                        )}
                        {vitals.vitals_spo2 && (
                            <div className="text-[11px]">
                                <span className="text-gray-500">SpO2: </span>
                                <span className="font-medium text-gray-800">{vitals.vitals_spo2}%</span>
                            </div>
                        )}
                        {vitals.vitals_weight && (
                            <div className="text-[11px]">
                                <span className="text-gray-500">Wt: </span>
                                <span className="font-medium text-gray-800">{vitals.vitals_weight} kg</span>
                            </div>
                        )}
                        {vitals.vitals_height && (
                            <div className="text-[11px]">
                                <span className="text-gray-500">Ht: </span>
                                <span className="font-medium text-gray-800">{vitals.vitals_height} cm</span>
                            </div>
                        )}
                        {!vitals.vitals_bp_systolic && !vitals.vitals_hr && !vitals.vitals_temp && (
                            <p className="col-span-2 text-[11px] text-gray-400">No vital data available</p>
                        )}
                    </div>
                )}
            </SidebarSection>
        </aside>
    );
}
