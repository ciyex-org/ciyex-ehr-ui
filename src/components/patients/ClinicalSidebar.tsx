"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
    ShieldAlert, HeartPulse, Pill, Activity, Cigarette,
    ChevronDown, ChevronUp, PanelLeftClose, PanelLeft,
    type LucideIcon,
} from "lucide-react";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface TabItem {
    key: string;
    label: string;
    icon: LucideIcon;
}

interface TabCategory {
    label: string;
    tabs: TabItem[];
}

interface ClinicalSidebarProps {
    patientId: number;
    collapsed: boolean;
    onToggle: () => void;
    activeTab: string;
    onNavigate: (tabKey: string) => void;
    tabCategories: TabCategory[];
}

export default function ClinicalSidebar({
    patientId,
    collapsed,
    onToggle,
    activeTab,
    onNavigate,
    tabCategories,
}: ClinicalSidebarProps) {
    // Clinical data
    const [allergies, setAllergies] = useState<any[]>([]);
    const [problems, setProblems] = useState<any[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [vitals, setVitals] = useState<Record<string, any> | null>(null);
    const [smokingStatus, setSmokingStatus] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    // Only the category containing the active tab starts expanded; all others collapsed
    const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => {
        const activeCatLabel = tabCategories.find(cat => cat.tabs.some(t => t.key === activeTab))?.label;
        return new Set(tabCategories.map(c => c.label).filter(l => l !== activeCatLabel));
    });

    // Auto-expand the category containing the active tab when it changes
    useEffect(() => {
        const activeCat = tabCategories.find(cat => cat.tabs.some(t => t.key === activeTab));
        if (activeCat && collapsedCats.has(activeCat.label)) {
            setCollapsedCats(prev => {
                const next = new Set(prev);
                next.delete(activeCat.label);
                return next;
            });
        }
    }, [activeTab, tabCategories]);

    // Refresh badge counts on mount and whenever switching to/from a clinical tab
    const BADGE_TABS = new Set(["allergies", "medicalproblems", "medications", "vitals"]);
    useEffect(() => {
        if (!patientId) return;
        // Only re-fetch when navigating into a badge tab (to pick up counts after saves)
        if (loaded && !BADGE_TABS.has(activeTab)) return;

        Promise.allSettled([
            fetchWithAuth(`${API_BASE()}/api/allergy-intolerances/${patientId}`).then(r => r.ok ? r.json() : null),
            fetchWithAuth(`${API_BASE()}/api/medical-problems/${patientId}`).then(r => r.ok ? r.json() : null),
            fetchWithAuth(`${API_BASE()}/api/fhir-resource/medications/patient/${patientId}?size=10`).then(r => r.ok ? r.json() : null),
            fetchWithAuth(`${API_BASE()}/api/fhir-resource/vitals/patient/${patientId}?size=1`).then(r => r.ok ? r.json() : null),
            fetchWithAuth(`${API_BASE()}/api/fhir-resource/social-history/patient/${patientId}?size=5`).then(r => r.ok ? r.json() : null),
        ]).then(([aRes, pRes, mRes, vRes, shRes]) => {
            if (aRes.status === "fulfilled" && aRes.value) {
                const d = aRes.value;
                setAllergies(d.data?.allergiesList || (Array.isArray(d) ? d : []));
            }
            if (pRes.status === "fulfilled" && pRes.value) {
                const d = pRes.value;
                setProblems(d.data?.problemsList || (Array.isArray(d) ? d : []));
            }
            if (mRes.status === "fulfilled" && mRes.value) {
                setMedications(mRes.value.data?.content || []);
            }
            if (vRes.status === "fulfilled" && vRes.value) {
                const content = vRes.value.data?.content || [];
                const first = content.length > 0 ? content[0] : null;
                setVitals(first && typeof first === "object" ? first : null);
            }
            {
                const shData = (shRes.status === "fulfilled" && shRes.value) ? shRes.value : null;
                const content = shData?.data?.content || [];
                // Helper: extract a plain string from any value shape
                const extractStr = (v: any): string => {
                    if (v == null) return "";
                    if (typeof v === "string") return v.trim();
                    if (typeof v === "object") {
                        return (v.text || v.display || v.coding?.[0]?.display || v.value || "").toString().trim();
                    }
                    return String(v).trim();
                };
                // Helper: check if a value is meaningless
                const isMeaningless = (s: string): boolean => {
                    if (!s) return true;
                    return /^(unknown|null|none|n\/a|not\s*recorded|not\s*available|not\s*specified|undefined|-)$/i.test(s);
                };
                const smokingRec = content.find((r: any) => {
                    const name = extractStr(r.name || r.category || r.code || r.socialHistoryType || r.type).toLowerCase();
                    return name.includes("smoking") || name.includes("tobacco");
                });
                if (smokingRec) {
                    const val = extractStr(smokingRec.value) || extractStr(smokingRec.status) || extractStr(smokingRec.valueCodeableConcept) || extractStr(smokingRec.answer);
                    setSmokingStatus(isMeaningless(val) ? "No records" : val);
                } else if (content.length > 0) {
                    const first = content[0];
                    const label = extractStr(first.name || first.category || first.type);
                    const val = extractStr(first.value) || extractStr(first.status) || extractStr(first.answer);
                    if (!isMeaningless(val)) {
                        setSmokingStatus(label ? `${label}: ${val}` : val);
                    } else {
                        setSmokingStatus("No records");
                    }
                } else {
                    setSmokingStatus("No records");
                }
            }
            setLoaded(true);
        });
    }, [patientId, activeTab]);

    const toggleCat = (label: string) => {
        setCollapsedCats(prev => {
            const next = new Set(prev);
            next.has(label) ? next.delete(label) : next.add(label);
            return next;
        });
    };

    const severityColor = (s?: string) => {
        if (!s) return "bg-gray-100 text-gray-600";
        const l = s.toLowerCase();
        if (l === "severe" || l === "high") return "bg-red-100 text-red-700";
        if (l === "moderate") return "bg-yellow-100 text-yellow-700";
        return "bg-gray-100 text-gray-600";
    };

    // Badge counts for specific clinical tabs
    const getBadge = (tabKey: string): number | undefined => {
        if (tabKey === "allergies") return allergies.length || undefined;
        if (tabKey === "medicalproblems") return problems.length || undefined;
        if (tabKey === "medications") return medications.length || undefined;
        return undefined;
    };

    /* --- Collapsed: icon-only strip --- */
    if (collapsed) {
        return (
            <div className="w-12 shrink-0 bg-white border-r border-gray-200 flex flex-col items-center pt-2 gap-1 overflow-y-auto">
                <button onClick={onToggle} className="p-1.5 rounded hover:bg-gray-100 mb-2" title="Expand sidebar">
                    <PanelLeft className="w-4 h-4 text-gray-500" />
                </button>
                {tabCategories.flatMap(cat => cat.tabs).map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    const badge = getBadge(tab.key);
                    return (
                        <button
                            key={tab.key}
                            onClick={() => onNavigate(tab.key)}
                            className={`p-1.5 rounded relative ${isActive ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}
                            title={tab.label}
                        >
                            <Icon className="w-4 h-4" />
                            {badge !== undefined && badge > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] rounded-full flex items-center justify-center">
                                    {badge > 9 ? "9+" : badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    /* --- Expanded: clinical snapshot + categorized nav --- */
    return (
        <aside className="w-[250px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 shrink-0">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Chart</span>
                <button onClick={onToggle} className="p-1 rounded hover:bg-gray-100" title="Collapse">
                    <PanelLeftClose className="w-3.5 h-3.5 text-gray-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* ---- Clinical Snapshot ---- */}
                <div className="border-b border-gray-200 py-1 px-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-0.5">Quick Info</div>

                    {/* Allergies row */}
                    <button
                        onClick={() => onNavigate("allergies")}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[12px] ${activeTab === "allergies" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                        <ShieldAlert className="w-3 h-3 shrink-0 text-red-400" />
                        <span className="flex-1 text-left truncate">
                            <span className="font-medium">Allergies: </span>
                            {!loaded ? "..." : allergies.length === 0 ? <span title="No Known Allergies">NKA</span> : allergies.slice(0, 2).map(a => a.allergyName || a.substance).join(", ")}
                        </span>
                        {allergies.length > 0 && (
                            <span className="px-1 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-medium">{allergies.length}</span>
                        )}
                    </button>

                    {/* Problems row */}
                    <button
                        onClick={() => onNavigate("medicalproblems")}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[12px] ${activeTab === "medicalproblems" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                        <HeartPulse className="w-3 h-3 shrink-0 text-orange-400" />
                        <span className="flex-1 text-left truncate">
                            <span className="font-medium">Problems: </span>
                            {!loaded ? "..." : problems.length === 0 ? "None" : problems.slice(0, 2).map(p => p.conditionName || p.title || p.code || p.name || "Problem").join(", ")}
                        </span>
                        {problems.length > 0 && (
                            <span className="px-1 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-medium">{problems.length}</span>
                        )}
                    </button>

                    {/* History row */}
                    <button
                        onClick={() => onNavigate("history")}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[12px] ${activeTab === "history" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                        <Cigarette className="w-3 h-3 shrink-0 text-amber-500" />
                        <span className="flex-1 text-left truncate">
                            <span className="font-medium">History: </span>
                            {!loaded ? "..." : smokingStatus || "No records"}
                        </span>
                    </button>

                    {/* Vitals row */}
                    <button
                        onClick={() => onNavigate("vitals")}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[12px] ${activeTab === "vitals" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                        <Activity className="w-3 h-3 shrink-0 text-green-500" />
                        <span className="flex-1 text-left truncate">
                            <span className="font-medium">Vitals: </span>
                            <span className="text-gray-600">{!loaded ? "..." : !vitals ? "No recorded vitals" : (() => {
                                const v = vitals;
                                const sys = v.bpSystolic ?? v.systolicBP ?? v.systolic ?? v.bloodPressureSystolic ?? v.sbp ?? null;
                                const dia = v.bpDiastolic ?? v.diastolicBP ?? v.diastolic ?? v.bloodPressureDiastolic ?? v.dbp ?? null;
                                const hr  = v.pulse ?? v.heartRate ?? v.pulseRate ?? v.hr ?? null;
                                const temp = v.temperatureC ?? v.temperature ?? v.temp ?? null;
                                const spo2 = v.oxygenSaturation ?? v.spO2 ?? v.spo2 ?? v.o2Saturation ?? null;
                                const rr = v.respiratoryRate ?? v.respirations ?? v.rr ?? null;
                                const parts = [
                                    sys != null ? `BP ${sys}/${dia ?? "?"}` : null,
                                    hr != null ? `HR ${hr}` : null,
                                    temp != null ? `T ${temp}°` : null,
                                    spo2 != null ? `SpO₂ ${spo2}%` : null,
                                    rr != null ? `RR ${rr}` : null,
                                ].filter(Boolean);
                                return parts.length > 0 ? parts.join(" · ") : "No recorded vitals";
                            })()}</span>
                        </span>
                    </button>
                </div>

                {/* ---- Tab Navigation by Category ---- */}
                {/* Deduplicate categories by label (case-insensitive) AND ensure each tab key appears only once globally */}
                {(() => {
                    const globalSeen = new Set<string>();
                    return tabCategories.reduce((acc: typeof tabCategories, cat) => {
                        const existing = acc.find(c => c.label.toLowerCase().trim() === cat.label.toLowerCase().trim());
                        if (existing) {
                            const existingKeys = new Set(existing.tabs.map(t => t.key));
                            const newTabs = cat.tabs.filter(t => !existingKeys.has(t.key) && !globalSeen.has(t.key));
                            existing.tabs.push(...newTabs);
                            newTabs.forEach(t => globalSeen.add(t.key));
                        } else {
                            const uniqueTabs = cat.tabs.filter((t, i, arr) => arr.findIndex(x => x.key === t.key) === i && !globalSeen.has(t.key));
                            acc.push({ ...cat, tabs: uniqueTabs });
                            uniqueTabs.forEach(t => globalSeen.add(t.key));
                        }
                        return acc;
                    }, [] as typeof tabCategories);
                })().map(cat => {
                    const isCollapsed = collapsedCats.has(cat.label);
                    const hasActiveTab = cat.tabs.some(t => t.key === activeTab);
                    return (
                        <div key={cat.label} className="border-b border-gray-100 last:border-b-0">
                            <button
                                onClick={() => toggleCat(cat.label)}
                                className="w-full flex items-center gap-1 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:bg-gray-50"
                            >
                                <span className="flex-1 text-left">{cat.label}</span>
                                {hasActiveTab && !isCollapsed && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            </button>
                            {!isCollapsed && (
                                <div className="pl-3 pr-2 pb-1 space-y-0">
                                    {cat.tabs.map(tab => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.key;
                                        const badge = getBadge(tab.key);
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => onNavigate(tab.key)}
                                                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[12px] transition-colors ${
                                                    isActive
                                                        ? "bg-blue-50 text-blue-700 font-medium"
                                                        : "text-gray-700 hover:bg-gray-50"
                                                }`}
                                            >
                                                <Icon className={`w-3 h-3 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                                                <span className="flex-1 text-left">{tab.label}</span>
                                                {badge !== undefined && badge > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600 font-medium">
                                                        {badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
