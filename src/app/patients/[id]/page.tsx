"use client";

import AllergiesSummary from "@/components/patients/AllergiesSummary";
import MedicalProblemsSummary from "@/components/patients/MedicalProblemsSummary";
import InsuranceSummary from "@/components/patients/InsuranceSummary";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";

import Link from "next/link";
import DemographicsFlat from "@/components/DemographicsFlat";
import HistoryFlat, { HistoryForm } from "@/components/HistoryFlat";
import PatientRelationshipsTab from "@/components/PatientRelationshipsTab";
import PaymentFlat from "@/components/PaymentFlat";
import {
    AppointmentsFlat,
    BillingFlat,
    MedicationsFlat,
    AllergiesFlat,
    InsuranceFlat,
    ReportFlat,
    LabsFlat,
    IssuesFlat,
    MedicalProblemsFlat,
    ImmunizationsFlat,
    HealthcareServicesFlat,
    VitalsFlat
} from "@/components/PatientComponents";
import DocumentsFlat from "@/components/Documents/Documents";
import EncounterTableExpandable from "@/components/encounter/EncounterTableExpandable";

import PatientBilling from "@/components/billing/PatientBilling";

// Normalize API base - if NEXT_PUBLIC_API_URL is unset, fall back to localhost backend
// (other utils use http://localhost:8080 as a default when not set)
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
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

type InsuranceLevel = "primary" | "secondary" | "tertiary";

interface InsurancePolicy {
    provider?: string;
    planName?: string;
    effectiveStart?: string;
    effectiveEnd?: string;
    policyNumber?: string;
    groupNumber?: string;
    subscriberEmployer?: string;
    subscriber?: string;
    subscriberDob?: string;
    subscriberSex?: "Unassigned" | "Male" | "Female";
    ssn?: string;
    subscriberAddress?: string;
    copay?: string;
    acceptsAssignment?: "Yes" | "No";
    secondaryMedicareType?: string;
}

type InsuranceForm = Record<InsuranceLevel, InsurancePolicy>;

interface EncounterFormData {
    visitCategory: string;
    encounterClass: string;
    encounterType: string;
    sensitivity: string;
    encounterProvider: string;
    referringProvider: string;
    facility: string;
    billingFacility: string;
    inCollection: string;
    dischargeDisposition: string;
    reasonForVisit: string;
    issues: string[];
}

interface EncounterFormProps {
    onCancel: () => void | Promise<void>;
    onSave: (form: EncounterFormData) => void | Promise<void>;
}

interface Appointment {
    id: string;
    date: string;
    provider: string;
    type: string;
    status: "Scheduled" | "Completed" | "Cancelled";
    notes?: string;
}

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    status: "Active" | "Inactive" | "Completed";
    instructions?: string;
}

interface XmlResponse {
    success?: boolean;
    data?: Record<string, string>;
    [key: string]: string | boolean | Record<string, string> | undefined;
}

// Add this component right before the PatientDashboardPage function
interface ActivityItem {
    id: string;
    type: 'appointment' | 'medication' | 'lab' | 'document' | 'message' | 'billing' | 'vital' | 'issue';
    title: string;
    description: string;
    timestamp: string;
    status: 'completed' | 'pending' | 'scheduled' | 'cancelled' | 'new' | 'updated';
    priority?: 'high' | 'medium' | 'low';
    metadata?: Record<string, any>;
}

interface RecentActivityProps {
    patientId: number;
    limit?: number;
}

function RecentActivityFeed({ patientId, limit = 10 }: RecentActivityProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            try {
                setLoading(true);

                // Fetch data from multiple endpoints in parallel (we only process appointments, medications and labs here)
                const [appointmentsRes, medicationsRes, labsRes] = await Promise.allSettled([
                    fetchWithAuth(`${API_BASE}/api/patients/${patientId}/appointments?limit=5`),
                    fetchWithAuth(`${API_BASE}/api/patients/${patientId}/medications?limit=5`),
                    fetchWithAuth(`${API_BASE}/api/patients/${patientId}/labs?limit=5`),
                ]);

                const allActivities: ActivityItem[] = [];

                // Process appointments
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
                            metadata: { providerId: appt.providerId }
                        });
                    });
                }

                // Process medications
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
                            metadata: { instructions: med.instructions }
                        });
                    });
                }

                // Process lab results
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
                            priority: lab.result === 'Abnormal' ? 'high' : 'medium'
                        });
                    });
                }

                // Sort by timestamp and limit
                const sortedActivities = allActivities
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, limit);

                setActivities(sortedActivities);

            } catch (err) {
                console.error('Failed to fetch recent activity:', err);
                setError('Failed to load recent activity');
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            fetchRecentActivity();
        }
    }, [patientId, limit]);

    const getActivityIcon = (type: string) => {
        const icons = {
            appointment: '📅',
            medication: '💊',
            lab: '🧪',
            document: '📄',
            message: '✉️',
            billing: '💰',
            vital: '❤️',
            issue: '⚠️'
        };
        return icons[type as keyof typeof icons] || '📋';
    };

    const getStatusColor = (status: string) => {
        const colors = {
            completed: 'text-green-600 bg-green-100',
            scheduled: 'text-blue-600 bg-blue-100',
            pending: 'text-yellow-600 bg-yellow-100',
            cancelled: 'text-red-600 bg-red-100',
            new: 'text-purple-600 bg-purple-100',
            updated: 'text-indigo-600 bg-indigo-100'
        };
        return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return <p className="text-red-600 text-sm">{error}</p>;
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
                                <h6 className="text-xs font-medium text-gray-900 truncate">
                                    {activity.title}
                                </h6>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
                            </div>

                            <p className="text-xs text-gray-600 mt-0.5 truncate">
                                {activity.description}
                            </p>

                            <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>

                                {activity.priority === 'high' && (
                                    <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                    ⚠️ High
                  </span>
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

    const [historyForm, setHistoryForm] = useState<HistoryForm>({
        general: { 
            riskFactors: {} as Record<string, boolean | string>, 
            examsTests: {} as Record<string, { status: "" | "N/A" | "Normal" | "Abnormal"; notes: string }>
        },
        family: {
            father: "",
            mother: "",
            siblings: "",
            spouse: "",
            offspring: "",
            diagFather: "",
            diagMother: "",
            diagSiblings: "",
            diagSpouse: "",
            diagOffspring: "",
        },
        relatives: {
            cancer: "",
            diabetes: "",
            heartProblems: "",
            epilepsy: "",
            suicide: "",
            tuberculosis: "",
            hbp: "",
            stroke: "",
            mentalIllness: "",
        },
        lifestyle: {
            tobacco: { value: "", status: "" },
            coffee: { value: "", status: "" },
            alcohol: { value: "", status: "" },
            drugs: { value: "", status: "" },
            counseling: { value: "", status: "" },
            exercise: { value: "", status: "" },
            hazardous: { value: "", status: "" },
            sleep: "",
            seatbelt: "",
        },
        other: { nameValue1: "", nameValue2: "", additionalHistory: "" },
    });

    const [activeHistoryTab, setActiveHistoryTab] = useState<keyof typeof historyForm>("general");
    const [editHistory, setEditHistory] = useState(false);
    const [lastVisitedTab, setLastVisitedTab] = useState("dashboard");
    const [billing, setBilling] = useState<{
        patientBalanceDue: number;
        insuranceBalanceDue: number;
        totalBalanceDue: number;
    } | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [allergies, setAllergies] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<string>("dashboard");
    const [highlightedTab, setHighlightedTab] = useState<string>("dashboard");
    const [showEncounterForm, setShowEncounterForm] = useState(false);
    const [encounterForm, setEncounterForm] = useState<EncounterFormData>({
        visitCategory: "",
        encounterClass: "Outpatient",
        encounterType: "",
        sensitivity: "Normal",
        encounterProvider: "",
        referringProvider: "",
        facility: "",
        billingFacility: "",
        inCollection: "No",
        dischargeDisposition: "",
        reasonForVisit: "",
        issues: [],
    });
    const [useDateRange, setUseDateRange] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [editInsurance, setEditInsurance] = useState(false);
    const [insuranceSubTab, setInsuranceSubTab] =
        useState<"primary" | "secondary" | "tertiary">("primary");
    const [editDemographics, setEditDemographics] = useState(false);
    const [demoForm, setDemoForm] = useState<Partial<Patient>>({});
    const emptyPolicy: InsurancePolicy = {
        acceptsAssignment: "Yes",
        subscriberSex: "Unassigned",
    };
    const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>({
        primary: { ...emptyPolicy, provider: undefined },
        secondary: { ...emptyPolicy },
        tertiary: { ...emptyPolicy },
    });

    const setPolicyField = <K extends keyof InsurancePolicy>(
        level: InsuranceLevel,
        field: K,
        value: InsurancePolicy[K]
    ) => {
        setInsuranceForm((prev) => ({
            ...prev,
            [level]: {
                ...prev[level],
                [field]: value,
            },
        }));
    };

    const [reportFilters, setReportFilters] = useState<string[]>([]);
    const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
    const toggleFilter = (filter: string) => {
        setReportFilters((prev) =>
            prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
        );
    };

    const generateReport = async (type: string, filters?: string[]) => {
        try {
            const res = await fetchWithAuth(`/api/reports/generate?type=${type}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filters }),
            });
            const data = await res.json();
            console.log("Report generated:", data);
        } catch (err) {
            console.error("Error generating report:", err);
        }
    };

    const downloadReport = async (type: string, filters?: string[]) => {
        try {
            const res = await fetchWithAuth(`/api/reports/download?type=${type}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filters }),
            });

            if (!res.ok) {
                throw new Error(`Failed to download report: ${res.status} ${res.statusText}`);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${type}-report.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Error downloading report:", message);
        }
    };

    const tabsHeaderRef = useRef<HTMLDivElement | null>(null);
    const mainContentRef = useRef<HTMLDivElement | null>(null);
    const [headerH, setHeaderH] = useState<number>(64);
    const tabContentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const ignoreInitialIntersection = useRef<boolean>(true);

    useEffect(() => {
        const recompute = () => setHeaderH(tabsHeaderRef.current?.offsetHeight ?? 64);
        recompute();
        const ro = new ResizeObserver(recompute);
        if (tabsHeaderRef.current) ro.observe(tabsHeaderRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            ignoreInitialIntersection.current = false;
        }, 700);
        return () => clearTimeout(t);
    }, []);

    // React to ?tab=... and optional #hash (e.g., ?tab=allergies#allergies)
    useEffect(() => {
        const qpTab = search?.get("tab");
        if (!qpTab) return;

        const valid = new Set([
            "dashboard",
            "demographics",
            "appointments",
            "insurance",
            "history",
            "documents",
            "report",
            "allergies",
            "medicalproblems",
            "medications",
            "labs",
            "transactions",
            "issues",
            "vitals",
            "messages",
        ]);

        if (valid.has(qpTab) && viewMode !== qpTab) {
            setViewMode(qpTab);
            setHighlightedTab(qpTab);
            setLastVisitedTab(qpTab);
            // after the tab renders, scroll to hash if present
            setTimeout(() => {
                if (typeof window !== "undefined" && window.location.hash) {
                    const el = document.querySelector(window.location.hash);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 0);
        }
    }, [search, viewMode]);

    useEffect(() => {
        if (viewMode !== "dashboard") {
            return;
        }

        const sections = Object.entries(tabContentRefs.current)
            .map(([key, el]) => ({ key, el }))
            .filter((s): s is { key: string; el: HTMLDivElement } => !!s.el);

        sections.forEach(({ key, el }) => {
            (el as HTMLElement).dataset.tabkey = key;
        });

        const observer = new IntersectionObserver(
            (entries) => {
                if (ignoreInitialIntersection.current) return;
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length === 0) return;
                const top = visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                const key = (top.target as HTMLElement).dataset.tabkey!;
                if (key) setHighlightedTab(key);
            },
            {
                root: null,
                rootMargin: `-${headerH + 8}px 0px -45% 0px`,
                threshold: [0, 0.05, 0.2, 0.5, 0.75, 1],
            }
        );

        sections.forEach(({ el }) => observer.observe(el));
        return () => observer.disconnect();
    }, [headerH, viewMode, patient, showEncounterForm]);

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                setLoading(true);
                const res = await fetchWithAuth(
                    `${API_BASE}/api/patients/${id}`
                );
                
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                
                const text = await res.text();
                if (!text || text.trim() === "") {
                    throw new Error("Empty response from server");
                }
                
                const data =
                    res.headers.get("content-type")?.includes("application/xml") || text.startsWith("<")
                        ? await parseXmlResponse(text)
                        : JSON.parse(text);

                if (data.success) {
                    const fetched = data.data as Patient;
                    setPatient(fetched);
                    setDemoForm({ ...fetched });
                } else {
                    throw new Error(data.message || "Failed to fetch patient");
                }

                const fetchHistory = async () => {
                    try {
                        const res = await fetchWithAuth(
                            `${API_BASE}/api/patients/${id}/history`
                        );
                        const data = await res.json();
                        if (res.ok && data.success && data.data) {
                            // Merge fetched data with default structure to ensure compatibility
                            setHistoryForm(prev => ({
                                ...prev,
                                ...data.data
                            }));
                        }
                    } catch (e) {
                        console.error("Failed to fetch history:", e);
                    }
                };

                const fetchBilling = async () => {
                    try {
                        const res = await fetchWithAuth(
                            `${API_BASE}/api/patients/${id}/billing`
                        );
                        const data = await res.json();
                        if (res.ok && data.success) {
                            setBilling(data.data);
                        }
                    } catch (e) {
                        console.error("Failed to fetch billing:", e);
                    }
                };

                const fetchAppointments = async () => {
                    try {
                        const res = await fetchWithAuth(
                            `${API_BASE}/api/patients/${id}/appointments`
                        );
                        const data = await res.json();
                        if (res.ok && data.success) setAppointments(data.data);
                    } catch (e) {
                        console.error("Failed to fetch appointments:", e);
                    }
                };

                const fetchMedications = async () => {
                    try {
                        const res = await fetchWithAuth(
                            `${API_BASE}/api/patients/${id}/medications`
                        );
                        const data = await res.json();
                        if (res.ok && data.success) setMedications(data.data);
                    } catch (e) {
                        console.error("Failed to fetch medications:", e);
                    }
                };

                const fetchAllergies = async () => {
                    try {
                        const res = await fetchWithAuth(
                            `${API_BASE}/api/patients/${id}/allergies`
                        );
                        const data = await res.json();
                        if (res.ok && data.success) setAllergies(data.data);
                    } catch (e) {
                        console.error("Failed to fetch allergies:", e);
                    }
                };

                await Promise.all([
                    fetchAppointments(),
                    fetchMedications(),
                    fetchAllergies(),
                    fetchHistory(),
                    fetchBilling(),
                ]);
                // reference state variables so linters don't flag them as "assigned but never used"
                void medications;
                void allergies;
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

    async function saveDemographics() {
        if (!demoForm || !patient) return;
        const payload = { ...patient, ...demoForm };
        const res = await fetchWithAuth(
            `${API_BASE}/api/patients/${patient.id}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }
        );

        const text = await res.text();
        const data =
            res.headers.get("content-type")?.includes("application/xml") || text.startsWith("<")
                ? await parseXmlResponse(text)
                : JSON.parse(text);

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to save demographics");
        }

        const updated: Patient = data.data ?? payload;
        setPatient(updated);
        setEditDemographics(false);
    }

    async function saveHistory() {
        if (!patient) return;
        try {
            const res = await fetchWithAuth(
                `${API_BASE}/api/patients/${patient.id}/history`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(historyForm),
                }
            );
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to save history");
            setEditHistory(false);
            if (data.data) setHistoryForm(data.data);
            setNotification({message: "History saved successfully!", type: "success"});
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error("Failed to save history:", error);
            setNotification({message: "Failed to save history", type: "error"});
            setTimeout(() => setNotification(null), 3000);
            throw error;
        }
    }

    async function saveInsurance() {
        if (!patient) throw new Error("No patient loaded");

        const payload = { policies: insuranceForm };
        const res = await fetchWithAuth(
            `${API_BASE}/api/patients/${patient.id}/insurance`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }
        );

        const text = await res.text();
        const data =
            res.headers.get("content-type")?.includes("application/xml") || text.startsWith("<")
                ? await parseXmlResponse(text)
                : JSON.parse(text);

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to save insurance");
        }

        if (data.data?.policies) {
            setInsuranceForm(data.data.policies as InsuranceForm);
        }
    }

    async function saveEncounter() {
        if (!patient) throw new Error("No patient loaded");
        const res = await fetchWithAuth(
            `${API_BASE}/api/patients/${patient.id}/encounters`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(encounterForm),
            }
        );
        const text = await res.text();
        const data =
            res.headers.get("content-type")?.includes("application/xml") || text.startsWith("<")
                ? await parseXmlResponse(text)
                : JSON.parse(text);

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to save encounter");
        }

        setShowEncounterForm(false);
        setEncounterForm({
            visitCategory: "",
            encounterClass: "Outpatient",
            encounterType: "",
            sensitivity: "Normal",
            encounterProvider: "",
            referringProvider: "",
            facility: "",
            billingFacility: "",
            inCollection: "No",
            dischargeDisposition: "",
            reasonForVisit: "",
            issues: [],
        });
    }

    const handleOpenEncounter = () => {
        setShowEncounterForm(true);
        setHighlightedTab("appointments");
        setViewMode("appointments");
    };

    const handleCloseEncounter = () => {
        setShowEncounterForm(false);
    };

    const onTabClick = (key: string) => {
        if (key !== "report") {
            setLastVisitedTab(key);
        }
        setViewMode(key);
        setHighlightedTab(key);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const formatDateLocal = (date: string) => {
        return date ? new Date(date).toLocaleDateString() : "—";
    };

    const calculateAgeLocal = (dob: string) => {
        if (!dob) return "—";
        const ageDifMs = Date.now() - new Date(dob).getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const formatDateTimeLocal = (date: string) => {
        return date ? new Date(date).toLocaleString() : "—";
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
                    <button
                        onClick={() => router.push("/patients")}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Back to Patients List
                    </button>
                </div>
            </AdminLayout>
        );
    }

    const patientTabs = [
        { key: "dashboard", label: "Dashboard" },
        { key: "demographics", label: "Demographics" },
        { key: "appointments", label: "Appointments" },
        { key: "encounters", label: "Encounters" },
        { key: "billing", label: "Billing" },
        { key: "insurance", label: "Insurance" },
        { key: "history", label: "History" },
        { key: "documents", label: "Documents" },
        { key: "report", label: "Report" },
        { key: "allergies", label: "Allergies" },
        { key: "medicalproblems", label: "Medical Problems" },
        { key: "medications", label: "Medications" },
        { key: "labs", label: "Labs" },
        { key: "transactions", label: "Transactions" },
        { key: "issues", label: "Issues" },
        { key: "vitals", label: "Vitals" },
        { key: "messages", label: "Messages" },

        // 👇 New buttons
        { key: "immunizations", label: "Immunizations" },
        { key: "healthcareservices", label: "Healthcare Services" },
        { key: "relationships", label: "Relationships" },
        { key: "payment", label: "Payment" },
    ];

    const renderTabContent = (tabKey: string) => {
        switch (tabKey) {
            case "dashboard":
                return (
                    <div className="space-y-10">
                        {/* --- Recent & Upcoming --- */}
                        <div
                            id="activity"
                            ref={(el) => {
                                tabContentRefs.current["activity"] = el;
                            }}
                            style={{ scrollMarginTop: headerH + 12 }}
                            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
                        >
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">
                                Recent &amp; Upcoming
                            </h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Enhanced Recent Activity */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-sm font-medium text-blue-700">
                                            Recent Activity
                                        </h5>
                                    </div>
                                    <RecentActivityFeed patientId={Number(patient.id)} limit={5} />
                                </div>

                                {/* Enhanced Upcoming Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-sm font-medium text-blue-700">
                                            Upcoming
                                        </h5>
                                        <button
                                            onClick={() => setViewMode("appointments")}
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                        >
                                            View all →
                                        </button>
                                    </div>

                                    {appointments.filter(a => a.status === "Scheduled").length > 0 ? (
                                        <div className="space-y-3">
                                            {appointments
                                                .filter((a) => a.status === "Scheduled")
                                                .slice(0, 3)
                                                .map((appt) => (
                                                    <div key={appt.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                        <div className="flex items-center justify-between">
                                                            <h6 className="text-sm font-medium text-blue-900">
                                                                {formatDateTimeLocal(appt.date).split(',')[0]}
                                                            </h6>
                                                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                                    Scheduled
                                                </span>
                                                        </div>
                                                        <p className="text-sm text-blue-700 mt-1">
                                                            {formatDateTimeLocal(appt.date).split(',')[1]?.trim()}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            with <strong>{appt.provider}</strong>
                                                        </p>
                                                        <p className="text-xs text-blue-600 mt-1">
                                                            {appt.type}
                                                        </p>
                                                        {appt.notes && (
                                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                                {appt.notes}
                                                            </p>
                                                        )}
                                                        <div className="mt-2 flex space-x-2">
                                                            <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                                                                Confirm
                                                            </button>
                                                            <button className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">
                                                                Reschedule
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                            {appointments.filter(a => a.status === "Scheduled").length > 3 && (
                                                <div className="text-center pt-2">
                                                    <button
                                                        onClick={() => setViewMode("appointments")}
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                    >
                                                        +{appointments.filter(a => a.status === "Scheduled").length - 3} more appointments
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                            <div className="text-3xl mb-2">⏰</div>
                                            <p className="text-sm">No upcoming appointments</p>
                                            <button
                                                onClick={() => setViewMode("appointments")}
                                                className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                                            >
                                                Schedule appointment →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats Row */}
                            <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {appointments.filter(a => a.status === "Scheduled").length}
                                    </div>
                                    <div className="text-xs text-gray-600">Upcoming</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {appointments.filter(a => a.status === "Completed").length}
                                    </div>
                                    <div className="text-xs text-gray-600">Completed</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-600">
                                        {appointments.length}
                                    </div>
                                    <div className="text-xs text-gray-600">Total</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {new Date().getMonth()}
                                    </div>
                                    <div className="text-xs text-gray-600">This Month</div>
                                </div>
                            </div>
                        </div>

                        {/* --- Summary Cards --- */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <AllergiesSummary patientId={Number(patient.id)}  />
                            <MedicalProblemsSummary patientId={Number(patient.id)}  />
                            <InsuranceSummary patientId={Number(patient.id)} />
                        </div>
                    </div>
                );


            case "demographics":
                return (
                    <DemographicsFlat
                        patient={patient}
                        demoForm={demoForm}
                        setDemoForm={setDemoForm}
                        editDemographics={editDemographics}
                        setEditDemographics={setEditDemographics}
                        saveDemographics={saveDemographics}
                        calculateAgeLocal={calculateAgeLocal}
                    />
                );

            case "appointments":
                return (
                    <AppointmentsFlat
                        patientId={Number(patient.id)}
                        formatDateTimeLocal={formatDateTimeLocal}
                    />
                );

            case "insurance":
                return (
                    <InsuranceFlat
                        patient={patient}
                        insuranceForm={insuranceForm}
                        setInsuranceForm={setInsuranceForm}
                        editInsurance={editInsurance}
                        setEditInsurance={setEditInsurance}
                        insuranceSubTab={insuranceSubTab}
                        setInsuranceSubTab={setInsuranceSubTab}
                        saveInsurance={saveInsurance}
                        setPolicyField={setPolicyField}
                        setViewMode={setViewMode}
                        setHighlightedTab={setHighlightedTab}
                    />
                );

            case "history":
                return (
                    <HistoryFlat
                        historyForm={historyForm}
                        setHistoryForm={setHistoryForm}
                        editHistory={editHistory}
                        setEditHistory={setEditHistory}
                        activeHistoryTab={activeHistoryTab}
                        setActiveHistoryTab={setActiveHistoryTab}
                        saveHistory={saveHistory}
                    />
                );

                case "encounters":
                return (
                    <div className="min-w-0">
                        <EncounterTableExpandable patientId={Number(patient.id)} />
                    </div>
                );
              case "billing":
  return (
    <div className="min-w-0">
      <PatientBilling
        patientId={Number(patient.id)}
        patientName={`${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim()}
      />
    </div>
  );



            case "report":
                return (
                    <ReportFlat
                        patientId={Number(patient.id)}
                        useDateRange={useDateRange}
                        setUseDateRange={setUseDateRange}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        generateReport={generateReport}
                        downloadReport={downloadReport}
                        reportFilters={reportFilters}
                        toggleFilter={toggleFilter}
                        lastVisitedTab={lastVisitedTab}
                        setActiveTab={setViewMode}
                    />
                );

            case "allergies":
                return <AllergiesFlat patientId={Number(patient.id)} />;

            case "medicalproblems":
                return (
                    <div
                        className="min-w-0"
                        id="medicalproblems"
                        ref={(el) => {
                            tabContentRefs.current["medicalproblems"] = el;
                        }}
                        style={{ scrollMarginTop: headerH + 12 }}
                    >
                        <MedicalProblemsFlat patientId={Number(patient.id)} />
                    </div>
                );

            case "medications":
                return <MedicationsFlat patientId={Number(patient.id)} />;

            case "labs":
                return <LabsFlat labsData={[]} />;

            case "transactions":
                return <BillingFlat billing={billing} />;

            case "issues":
                return (
                    <div
                        className="min-w-0"
                        id="issues"
                        ref={(el) => {
                            tabContentRefs.current["issues"] = el;
                        }}
                        style={{ scrollMarginTop: headerH + 12 }}
                    >
                        <IssuesFlat patientId={Number(patient.id)} />
                    </div>
                );

            case "vitals":
                return (
                    <div
                        id="vitals"
                        ref={(el) => {
                            tabContentRefs.current["vitals"] = el;
                        }}
                        style={{ scrollMarginTop: headerH + 12 }}
                    >
                        <VitalsFlat patientId={Number(patient.id)} />
                    </div>
                );

            case "messages":
                return (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Messages</h4>
                        <p className="text-sm text-gray-500">Patient communications</p>
                    </div>
                );

            case "immunizations":
                return <ImmunizationsFlat patientId={Number(patient.id)} />;
                
            case "healthcareservices":
                return <HealthcareServicesFlat patientId={Number(patient.id)} />;
            

            case "documents":
                return <DocumentsFlat patientId={Number(patient.id)} />;
            case "relationships":
                return <PatientRelationshipsTab patientId={Number(patient.id)} />;
            
            case "payment":
                return <PaymentFlat patientId={Number(patient.id)} />;

            default:
                return (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                        <div className="text-center py-8">
                            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h5 className="text-gray-700 font-medium">No data available</h5>
                            <p className="text-gray-500 text-sm mt-1">This section is currently empty</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <AdminLayout>
            <style jsx global>{`
                html,
                body {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                }
            `}</style>

            <div className="pageScroll bg-gray-50">
                <div
                    ref={tabsHeaderRef}
                    className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-3 py-1.5"
                >
                    <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <Link
                                href="/patients"
                                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs font-medium text-gray-700 flex items-center"
                            >
                                <svg className= "w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Patients
                            </Link>

                            <div className="flex items-center flex-wrap gap-2 min-w-0">
                                <span className="text-xs text-gray-500 mr-1 shrink-0">Patient:</span>
                                <div className="px-2 py-0.5 rounded bg-blue-50 text-xs font-medium text-blue-800 truncate">
                                    {patient.firstName} {patient.lastName}
                                </div>
                                {patient.mrn && (
                                    <div className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600 shrink-0">
                                        MRN: {patient.mrn}
                                    </div>
                                )}
                                <div className="h-7 px-3 inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 text-xs">
                                    {formatDateLocal(patient.dateOfBirth)} · Age {calculateAgeLocal(patient.dateOfBirth)}
                                </div>
                                <div className="h-7 px-3 inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-xs">
                                    {patient.phoneNumber || "—"}
                                </div>
                                <div className="h-7 px-3 inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-xs">
                                    {appointments.length > 0
                                        ? `Last visit: ${formatDateLocal(appointments[appointments.length - 1].date)}`
                                        : "No visits recorded"}
                                </div>
                            </div>
                        </div>


                    </div>

                    <div className="mt-1.5">
                        <div className="flex flex-wrap gap-2">
                            {patientTabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    className={`h-8 inline-flex items-center px-3 rounded-md text-xs font-medium whitespace-nowrap leading-none transition-colors ${
                                        highlightedTab === tab.key
                                            ? "bg-blue-600 text-white shadow"
                                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                    onClick={() => onTabClick(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-screen-2xl mx-auto p-4">
                    <div className="grid grid-cols-1 gap-4">
                        <main ref={mainContentRef} className="min-w-0">
                            {showEncounterForm ? (
                                <main className="flex-1 p-6 overflow-auto">
                                    <EncounterForm onCancel={handleCloseEncounter} onSave={saveEncounter} />
                                </main>
                            ) : (
                                <>
                                    {viewMode === "dashboard" ? (
                                        <div
                                            id="dashboard"
                                            ref={(el) => void (tabContentRefs.current.dashboard = el)}
                                            style={{ scrollMarginTop: headerH + 12 }}
                                        >
                                            <h2 className="text-lg font-semibold mb-3"></h2>
                                            <div className="min-w-0">{renderTabContent("dashboard")}</div>
                                        </div>
                                    ) : (
                                        <div
                                            id={viewMode}
                                            ref={(el) => {
                                                tabContentRefs.current[viewMode] = el;
                                            }}
                                            style={{ scrollMarginTop: headerH + 12 }}
                                            className="min-w-0"
                                        >
                                            <div className="min-w-0">{renderTabContent(viewMode)}</div>
                                        </div>
                                    )}
                                </>
                            )}
                        </main>
                    </div>
                </div>
            </div>
            
            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
                    notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    {notification.type === 'success' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    )}
                    {notification.message}
                    <button onClick={() => setNotification(null)} className="ml-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}
        </AdminLayout>
    );
}

function EncounterForm({ onCancel, onSave }: EncounterFormProps) {
    const [form, setForm] = useState<EncounterFormData>({
        visitCategory: "",
        encounterClass: "Outpatient",
        encounterType: "",
        sensitivity: "Normal",
        encounterProvider: "",
        referringProvider: "",
        facility: "",
        billingFacility: "",
        inCollection: "No",
        dischargeDisposition: "",
        reasonForVisit: "",
        issues: [],
    });

    const setField = <K extends keyof EncounterFormData>(
        field: K,
        value: EncounterFormData[K]
    ) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {/*<h3 className="text-lg font-semibold mb-4">New Encounter</h3>*/}

            {/* --- Encounter Fields --- */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Visit Category */}
                <div>
                    <label className="block text-sm font-medium">Visit Category</label>
                    <select
                        value={form.visitCategory}
                        onChange={(e) => setField("visitCategory", e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option>-- Select One --</option>
                        <option>Inpatient</option>
                        <option>Outpatient</option>
                        <option>Emergency</option>
                        <option>Observation</option>
                        <option>Telehealth</option>
                        <option>Preventive Care</option>
                        <option>Home Health</option>
                        <option>Ambulatory Surgery</option>
                        <option>Urgent Care</option>
                    </select>
                </div>

                {/* Class */}
                <div>
                    <label className="block text-sm font-medium">Class</label>
                    <select
                        value={form.encounterClass}
                        onChange={(e) => setField("encounterClass", e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option>Outpatient</option>
                        <option>Inpatient</option>
                        <option>Emergency</option>
                        <option>Day Care</option>
                        <option>Virtual</option>
                    </select>
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium">Type</label>
                    <select
                        value={form.encounterType}
                        onChange={(e) => setField("encounterType", e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option>-- Select One --</option>
                        <option>Consultation</option>
                        <option>Follow-up</option>
                        <option>Routine Exam</option>
                        <option>Initial Visit</option>
                        <option>Post-Op Visit</option>
                        <option>Telemedicine</option>
                        <option>Walk-in</option>
                    </select>
                </div>

                {/* Sensitivity */}
                <div>
                    <label className="block text-sm font-medium">Sensitivity</label>
                    <select
                        value={form.sensitivity}
                        onChange={(e) => setField("sensitivity", e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option>Normal</option>
                        <option>High</option>
                        <option>Restricted</option>
                    </select>
                </div>

                {/* Encounter Provider */}
                <div>
                    <label className="block text-sm font-medium">Encounter Provider</label>
                    <input
                        className="w-full border rounded px-3 py-2"
                        value={form.encounterProvider}
                        onChange={(e) => setField("encounterProvider", e.target.value)}
                        placeholder="e.g. Dr. John Doe"
                    />
                </div>

                {/* Referring Provider */}
                <div>
                    <label className="block text-sm font-medium">Referring Provider</label>
                    <input
                        className="w-full border rounded px-3 py-2"
                        value={form.referringProvider}
                        onChange={(e) => setField("referringProvider", e.target.value)}
                        placeholder="e.g. Dr. Patel"
                    />
                </div>

                {/* Facility */}
                <div>
                    <label className="block text-sm font-medium">Facility</label>
                    <input
                        className="w-full border rounded px-3 py-2"
                        value={form.facility}
                        onChange={(e) => setField("facility", e.target.value)}
                        placeholder="e.g. Main Hospital"
                    />
                </div>

                {/* Billing Facility */}
                <div>
                    <label className="block text-sm font-medium">Billing Facility</label>
                    <input
                        className="w-full border rounded px-3 py-2"
                        value={form.billingFacility}
                        onChange={(e) => setField("billingFacility", e.target.value)}
                        placeholder="e.g. Qiaben Uptown"
                    />
                </div>

                {/* In Collection */}
                <div>
                    <label className="block text-sm font-medium">In Collection</label>
                    <select
                        value={form.inCollection}
                        onChange={(e) => setField("inCollection", e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option>No</option>
                        <option>Yes</option>
                        <option>Pending</option>
                    </select>
                </div>

                {/* Discharge Disposition */}
                <div>
                    <label className="block text-sm font-medium">Discharge Disposition</label>
                    <select
                        value={form.dischargeDisposition}
                        onChange={(e) => setField("dischargeDisposition", e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option>-- Select One --</option>
                        <option>Home (Self-Care)</option>
                        <option>Transfer to Another Facility</option>
                        <option>Skilled Nursing Facility</option>
                        <option>Expired</option>
                        <option>Left Against Medical Advice</option>
                        <option>Hospice</option>
                        <option>Rehabilitation Facility</option>
                        <option>Still Patient</option>
                    </select>
                </div>
            </div>

            {/* Reason & Issues */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium">Reason for Visit</label>
                    <textarea
                        className="w-full border rounded px-3 py-2"
                        value={form.reasonForVisit}
                        onChange={(e) => setField("reasonForVisit", e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Link/Add Issues</label>
                    <div className="border rounded p-3 h-32 overflow-y-auto text-sm">
                        <button
                            type="button"
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs mb-2"
                            onClick={() => setField("issues", [...form.issues, "New Issue"])}
                        >
                            + Add Issue
                        </button>
                        <div className="mt-2 space-y-1">
                            {form.issues.map((issue, i) => (
                                <div key={i}>{issue}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-6">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onSave(form)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Save
                </button>
            </div>
        </div>
    );



}
