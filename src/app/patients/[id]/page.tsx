"use client";

import { getEnv } from "@/utils/env";
import AllergiesSummary from "@/components/patients/AllergiesSummary";
import MedicalProblemsSummary from "@/components/patients/MedicalProblemsSummary";
import InsuranceSummary from "@/components/patients/InsuranceSummary";
import ClinicalSidebar from "@/components/patients/ClinicalSidebar";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";

import Link from "next/link";
import GenericFhirTab from "@/components/patients/GenericFhirTab";
import PluginSlot from "@/components/plugins/PluginSlot";
import { usePluginRegistry } from "@/context/PluginRegistryContext";
import { PluginContextProvider } from "@/context/PluginContextProvider";
import {
    LayoutDashboard, Stethoscope, HeartPulse, ShieldAlert, Pill,
    Activity, FlaskConical, Syringe, Clock, UserRound, CalendarDays,
    FileText, MessageSquare, Users, Building2, Receipt, ShieldCheck,
    ArrowLeftRight, CreditCard, FileBarChart, CircleAlert,
    Eye, Ear, Bone, Brain, Smile, Scissors, Scan, Gauge, Microscope,
    Baby, Heart, Home, Droplets, Droplet, Wind, Dna, Radiation,
    Layers, Fingerprint, Bug, Zap, Moon, Leaf, Sparkles, Footprints,
    Hand, Apple, GitBranch, Siren, ClipboardList, ClipboardCheck,
    TrendingUp, Target, Dumbbell, Forward, FileCheck, RotateCcw,
    BarChart3, AlertTriangle, Shield, Cpu, Glasses, Bandage,
    type LucideIcon, MessageCircle, Search, Plane, Plus
} from "lucide-react";

const API_BASE = (getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080").replace(/\/$/, "");

const ICON_MAP: Record<string, LucideIcon> = {
    LayoutDashboard, Stethoscope, HeartPulse, ShieldAlert, Pill,
    Activity, FlaskConical, Syringe, Clock, UserRound, CalendarDays,
    FileText, MessageSquare, Users, Building2, Receipt, ShieldCheck,
    ArrowLeftRight, CreditCard, FileBarChart, CircleAlert,
    Eye, Ear, Bone, Brain, Smile, Scissors, Scan, Gauge, Microscope,
    Baby, Heart, Home, Droplets, Droplet, Wind, Dna, Radiation,
    Layers, Fingerprint, Bug, Zap, Moon, Leaf, Sparkles, Footprints,
    Hand, Apple, GitBranch, Siren, ClipboardList, ClipboardCheck,
    TrendingUp, Target, Dumbbell, Forward, FileCheck, RotateCcw,
    BarChart3, AlertTriangle, Shield, Cpu, Glasses, Bandage,
    MessageCircle, Search, Plane,
};

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender?: string;
    ssn?: string;
    mrn?: string;
    status?: "Active" | "Inactive" | "Pending";
    address?: string;
    provider?: string;
    referringProvider?: string;
    pharmacy?: string;
    hipaaNoticeReceived?: string;
    employerName?: string;
    employerAddress?: string;
    occupation?: string;
    language?: string;
    race?: string;
    ethnicity?: string;
    nationality?: string;
    billingNote?: string;
    previousNames?: string;
    guardianName?: string;
    guardianRelationship?: string;
    insuranceProvider?: string;
    primaryCarePhysician?: string;
    lastVisitDate?: string;
    familyMembers?: string[];
    careTeam?: string[];
    [key: string]: string | number | boolean | string[] | undefined;
}

interface XmlResponse {
    success?: boolean;
    data?: Record<string, string>;
    [key: string]: string | boolean | Record<string, string> | undefined;
}

interface ActivityItem {
    id: string;
    type: 'appointment' | 'medication' | 'lab' | 'document' | 'message' | 'billing' | 'vital' | 'issue';
    title: string;
    description: string;
    timestamp: string;
    status: 'completed' | 'pending' | 'scheduled' | 'cancelled' | 'new' | 'updated';
    priority?: 'high' | 'medium' | 'low';
}

function RecentActivityFeed({ patientId, limit = 10 }: { patientId: number; limit?: number }) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            try {
                setLoading(true);
                const [appointmentsRes, medicationsRes, labsRes] = await Promise.allSettled([
                    fetchWithAuth(`${API_BASE}/api/patients/${patientId}/appointments?limit=5`),
                    fetchWithAuth(`${API_BASE}/api/patients/${patientId}/medications?limit=5`),
                    fetchWithAuth(`${API_BASE}/api/patients/${patientId}/labs?limit=5`),
                ]);

                const allActivities: ActivityItem[] = [];

                if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.ok) {
                    const appointments = await appointmentsRes.value.json();
                    appointments.data?.content?.forEach((appt: Record<string, any>) => {
                        allActivities.push({
                            id: `appt-${appt.id}`,
                            type: 'appointment',
                            title: `Appointment: ${appt.visitType || 'Visit'}`,
                            description: `With Provider at ${appt.appointmentStartTime}`,
                            timestamp: appt.appointmentStartDate,
                            status: String(appt.status ?? 'new') as ActivityItem['status'],
                        });
                    });
                }

                if (medicationsRes.status === 'fulfilled' && medicationsRes.value.ok) {
                    const medications = await medicationsRes.value.json();
                    medications.data?.forEach((med: Record<string, any>) => {
                        allActivities.push({
                            id: `med-${med.id}`,
                            type: 'medication',
                            title: `Medication: ${med.name}`,
                            description: `${med.dosage} ${med.frequency}`,
                            timestamp: med.startDate || med.createdDate,
                            status: String(med.status ?? 'new') as ActivityItem['status'],
                        });
                    });
                }

                if (labsRes.status === 'fulfilled' && labsRes.value.ok) {
                    const labs = await labsRes.value.json();
                    labs.data?.forEach((lab: Record<string, any>) => {
                        allActivities.push({
                            id: `lab-${lab.id}`,
                            type: 'lab',
                            title: `Lab Result: ${lab.testName}`,
                            description: `Result: ${lab.result}, Status: ${lab.status}`,
                            timestamp: lab.orderDate || lab.resultDate,
                            status: lab.status?.toLowerCase() === 'completed' ? 'completed' : 'pending',
                            priority: lab.result === 'Abnormal' ? 'high' : 'medium',
                        });
                    });
                }

                setActivities(
                    allActivities
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, limit)
                );
            } catch (err) {
                console.error('Failed to fetch recent activity:', err);
            } finally {
                setLoading(false);
            }
        };

        if (patientId) fetchRecentActivity();
    }, [patientId, limit]);

    const getActivityIcon = (type: string) => {
        const icons: Record<string, string> = {
            appointment: '\u{1F4C5}', medication: '\u{1F48A}', lab: '\u{1F9EA}',
            document: '\u{1F4C4}', message: '\u{2709}\u{FE0F}', billing: '\u{1F4B0}',
            vital: '\u{2764}\u{FE0F}', issue: '\u{26A0}\u{FE0F}',
        };
        return icons[type] || '\u{1F4CB}';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            completed: 'text-green-600 bg-green-100',
            scheduled: 'text-blue-600 bg-blue-100',
            pending: 'text-yellow-600 bg-yellow-100',
            cancelled: 'text-red-600 bg-red-100',
            new: 'text-purple-600 bg-purple-100',
            updated: 'text-indigo-600 bg-indigo-100',
        };
        return colors[status] || 'text-gray-600 bg-gray-100';
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {activities.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
                activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-2 p-2 rounded-lg hover:bg-gray-50">
                        <div className="text-xl mt-1">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <h6 className="text-xs font-medium text-gray-900 truncate">{activity.title}</h6>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${getStatusColor(activity.status)}`}>
                                    {activity.status}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 truncate">{activity.description}</p>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-gray-500">
                                    {new Date(activity.timestamp).toLocaleDateString()}
                                </span>
                                {activity.priority === 'high' && (
                                    <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded">High</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

function parseXmlResponse(xmlText: string): Promise<XmlResponse> {
    return new Promise((resolve, reject) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const response: XmlResponse = {};
            Array.from(xmlDoc.documentElement.children).forEach((child) => {
                if (child.children.length > 0) {
                    if (child.nodeName === "data") {
                        response.data = {};
                        Array.from(child.children).forEach((dataChild) => {
                            response.data![dataChild.nodeName] = dataChild.textContent || "";
                        });
                    } else {
                        response[child.nodeName] = child.textContent || "";
                    }
                } else {
                    response[child.nodeName] = child.textContent || "";
                }
            });
            if ("success" in response && typeof response.success === "string") {
                response.success = response.success === "true";
            }
            resolve(response);
        } catch {
            reject(new Error("Failed to parse XML response"));
        }
    });
}

export default function PatientDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const search = useSearchParams();
    const id = params?.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<string>("dashboard");
    const [highlightedTab, setHighlightedTab] = useState<string>("dashboard");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("clinicalSidebarCollapsed") === "true";
        }
        return false;
    });

    const [dynamicTabCategories, setDynamicTabCategories] = useState<Array<{
        label: string;
        tabs: Array<{ key: string; label: string; icon: LucideIcon; visible?: boolean }>;
    }> | null>(null);

    // Persist sidebar state
    useEffect(() => {
        localStorage.setItem("clinicalSidebarCollapsed", String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // React to ?tab=... query param
    useEffect(() => {
        const qpTab = search?.get("tab");
        if (qpTab && viewMode !== qpTab) {
            setViewMode(qpTab);
            setHighlightedTab(qpTab);
        }
    }, [search, viewMode]);

    // Fetch tab layout
    useEffect(() => {
        const fetchTabConfig = async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/api/tab-field-config/layout`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.tabConfig && Array.isArray(data.tabConfig)) {
                        const mapped = data.tabConfig.map((category: any) => ({
                            label: category.label,
                            tabs: (category.tabs || [])
                                .filter((tab: any) => tab.visible !== false)
                                .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
                                .map((tab: any) => ({
                                    key: tab.key,
                                    label: tab.label,
                                    icon: ICON_MAP[tab.icon] || FileText,
                                })),
                        })).filter((cat: any) => cat.tabs.length > 0);
                        setDynamicTabCategories(mapped);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch tab layout, using defaults:", err);
            }
        };
        fetchTabConfig();
    }, []);

    // Fetch patient data
    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                setLoading(true);
                const res = await fetchWithAuth(`${API_BASE}/api/patients/${id}`);

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                const text = await res.text();
                if (!text || text.trim() === "") throw new Error("Empty response from server");

                const data =
                    res.headers.get("content-type")?.includes("application/xml") || text.startsWith("<")
                        ? await parseXmlResponse(text)
                        : JSON.parse(text);

                if (data.success) {
                    setPatient(data.data as Patient);
                } else {
                    throw new Error(data.message || "Failed to fetch patient");
                }
            } catch (err: unknown) {
                console.error("Patient data fetch failed:", err);
                const message = err instanceof Error ? err.message : "An unknown error occurred";
                setError(message);
                if (message.includes("401")) router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        if (id) void fetchPatientData();
    }, [id, router]);

    const onTabClick = (key: string) => {
        setViewMode(key);
        setHighlightedTab(key);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const formatDateLocal = (date: string) => date ? new Date(date).toLocaleDateString() : "\u2014";
    const calculateAgeLocal = (dob: string) => {
        if (!dob) return "\u2014";
        const ageDifMs = Date.now() - new Date(dob).getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="p-6 text-center">Loading patient data...</div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="p-6 text-center text-red-600">Error: {error}</div>
            </AdminLayout>
        );
    }

    if (!patient) {
        return (
            <AdminLayout>
                <div className="p-6 text-center">
                    <p>Patient not found</p>
                    <button onClick={() => router.push("/patients")} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Back to Patients List
                    </button>
                </div>
            </AdminLayout>
        );
    }

    // Hardcoded fallback tabs
    const defaultTabCategories = [
        {
            label: "Overview",
            tabs: [
                { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            ],
        },
        {
            label: "Clinical",
            tabs: [
                { key: "encounters", label: "Encounters", icon: Stethoscope },
                { key: "medicalproblems", label: "Problems", icon: HeartPulse },
                { key: "allergies", label: "Allergies", icon: ShieldAlert },
                { key: "medications", label: "Meds", icon: Pill },
                { key: "vitals", label: "Vitals", icon: Activity },
                { key: "labs", label: "Labs", icon: FlaskConical },
                { key: "immunizations", label: "Immunizations", icon: Syringe },
                { key: "history", label: "History", icon: Clock },
            ],
        },
        {
            label: "General",
            tabs: [
                { key: "demographics", label: "Demographics", icon: UserRound },
                { key: "appointments", label: "Appointments", icon: CalendarDays },
                { key: "documents", label: "Documents", icon: FileText },
                { key: "messages", label: "Messages", icon: MessageSquare },
                { key: "relationships", label: "Relationships", icon: Users },
                { key: "healthcareservices", label: "Services", icon: Building2 },
            ],
        },
        {
            label: "Financial",
            tabs: [
                { key: "billing", label: "Billing", icon: Receipt },
                { key: "insurance", label: "Insurance", icon: ShieldCheck },
                { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
                { key: "payment", label: "Payment", icon: CreditCard },
            ],
        },
        {
            label: "Other",
            tabs: [
                { key: "report", label: "Report", icon: FileBarChart },
                { key: "issues", label: "Issues", icon: CircleAlert },
            ],
        },
    ];

    // Merge plugin-contributed tabs into the tab navigation
    const { getSlotContributions } = usePluginRegistry();
    const pluginTabs = getSlotContributions("patient-chart:tab");

    const baseCategories = dynamicTabCategories || defaultTabCategories;
    const tabCategories = pluginTabs.length > 0
        ? [
            ...baseCategories,
            {
                label: "Apps",
                tabs: pluginTabs.map((pt) => ({
                    key: `plugin:${pt.pluginSlug}`,
                    label: pt.label || pt.pluginName,
                    icon: ICON_MAP[pt.icon || "Layers"] || Layers,
                })),
            },
        ]
        : baseCategories;

    const renderTabContent = (tabKey: string) => {
        if (tabKey === "dashboard") {
            return (
                <div className="space-y-6">
                    {/* Recent & Upcoming */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent & Upcoming</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h5 className="text-sm font-medium text-blue-700 mb-2">Recent Activity</h5>
                                <RecentActivityFeed patientId={Number(patient.id)} limit={5} />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-sm font-medium text-blue-700">Upcoming</h5>
                                    <button onClick={() => onTabClick("appointments")} className="text-xs text-blue-600 hover:text-blue-800">
                                        View all &rarr;
                                    </button>
                                </div>
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">View upcoming appointments</p>
                                    <button onClick={() => onTabClick("appointments")} className="text-xs text-blue-600 hover:text-blue-800 mt-2">
                                        Go to Appointments &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AllergiesSummary patientId={Number(patient.id)} />
                        <MedicalProblemsSummary patientId={Number(patient.id)} />
                        <InsuranceSummary patientId={Number(patient.id)} />
                    </div>

                    {/* Plugin summary cards (e.g., RPM Summary, Risk Score) */}
                    <PluginSlot name="patient-chart:summary-card" context={{ patientId: patient.id }} className="grid grid-cols-1 md:grid-cols-3 gap-4" />
                </div>
            );
        }

        // Plugin-contributed tabs render via their registered component
        if (tabKey.startsWith("plugin:")) {
            const pluginSlug = tabKey.replace("plugin:", "");
            const contribution = pluginTabs.find((pt) => pt.pluginSlug === pluginSlug);
            if (contribution) {
                return <contribution.component patientId={patient.id} />;
            }
            return <div className="p-4 text-gray-500">Plugin tab not found</div>;
        }

        // All FHIR-resource-backed tabs render dynamically via GenericFhirTab
        return (
            <>
                <PluginSlot name={`patient-chart:tab:${tabKey}:header`} context={{ patientId: patient.id, tabKey }} />
                <GenericFhirTab tabKey={tabKey} patientId={Number(patient.id)} />
                <PluginSlot name={`patient-chart:tab:${tabKey}:footer`} context={{ patientId: patient.id, tabKey }} />
            </>
        );
    };

    return (
        <PluginContextProvider patient={{ id: patient.id, name: `${patient.firstName} ${patient.lastName}`, birthDate: patient.dateOfBirth, gender: patient.gender }}>
        <AdminLayout>
            {/* Negate AdminLayout padding so chart goes full-bleed */}
            <div className="pageScroll bg-gray-50 min-h-screen -m-4 md:-m-6">
                {/* Patient header bar */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between px-4 py-2">
                        {/* Left: back + patient info */}
                        <div className="flex items-center gap-3 min-w-0">
                            <Link
                                href="/patients"
                                className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                title="Back to Patient List"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <h1 className="text-base font-semibold text-gray-900 truncate">
                                    {patient.firstName} {patient.lastName}
                                </h1>
                                {patient.mrn && (
                                    <span className="text-xs text-gray-400 shrink-0">MRN: {patient.mrn}</span>
                                )}
                                <span className="text-gray-300 shrink-0">|</span>
                                <span className="text-xs text-gray-500 shrink-0">
                                    {formatDateLocal(patient.dateOfBirth)} ({calculateAgeLocal(patient.dateOfBirth)}y)
                                </span>
                                {patient.gender && (
                                    <>
                                        <span className="text-gray-300 shrink-0">|</span>
                                        <span className="text-xs text-gray-500 shrink-0">{patient.gender}</span>
                                    </>
                                )}
                                <span className="text-gray-300 shrink-0">|</span>
                                <span className="text-xs text-gray-500 shrink-0">{patient.phoneNumber || "\u2014"}</span>
                                {patient.status && (
                                    <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                                        patient.status === "Active" ? "bg-green-50 text-green-700" :
                                        patient.status === "Inactive" ? "bg-red-50 text-red-700" :
                                        "bg-yellow-50 text-yellow-700"
                                    }`}>
                                        {patient.status}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Right: action buttons */}
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                            <Link
                                href={`/patients/${patient.id}/encounters/new`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Encounter
                            </Link>
                            <button
                                onClick={() => onTabClick("appointments")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50"
                            >
                                <CalendarDays className="w-3.5 h-3.5" />
                                Schedule Appointment
                            </button>
                            <PluginSlot name="patient-chart:action-bar" context={{ patientId: patient.id }} as="fragment" />
                        </div>
                    </div>
                </div>

                {/* Plugin banner alerts (e.g., drug interaction warnings, care gap alerts) */}
                <PluginSlot name="patient-chart:banner-alert" context={{ patientId: patient.id }} className="px-4 pt-2 space-y-2" />

                {/* Content area: sidebar + main */}
                <div className="flex">
                    <ClinicalSidebar
                        patientId={Number(patient.id)}
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                        activeTab={highlightedTab}
                        onNavigate={onTabClick}
                        tabCategories={tabCategories}
                    />
                    <main className="flex-1 min-w-0 p-4">
                        {renderTabContent(viewMode)}
                    </main>
                    {/* Plugin sidebar widgets (e.g., Chat, AI Assistant, RPM panel) */}
                    <PluginSlot name="patient-chart:sidebar-widget" context={{ patientId: patient.id }} className="w-72 shrink-0 border-l border-gray-200 p-3 space-y-3 bg-white hidden xl:block" />
                </div>
            </div>
        </AdminLayout>
        </PluginContextProvider>
    );
}
