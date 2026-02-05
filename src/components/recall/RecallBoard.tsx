"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";   // ✅ add this


/* =========================
 * Types
 * ======================= */
export type RecallDTO = {
    id: number;
    orgId: number;
    patientId: number;
    providerId: number;

    patientName: string;
    dob?: string;

    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;

    lastVisit?: string;
    recallDate: string;
    recallReason?: string;

    smsConsent: boolean;
    emailConsent: boolean;

    audit: {
        createdDate: string;
        lastModifiedDate: string;
    };
    fhirId?: string;
};


type NewRecallForm = {
    patientId: string;
    patientName: string;
    dob: string;
    lastVisit: string;
    recallWhen: string;
    recallDate: string;
    recallType: string;
    reason: string;
    providerId: string;
    facility: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    smsOk: boolean | null;
    avmOk: boolean | null;
    email: string;
    emailOk: boolean | null;
    notes: string;
};
type EditableRecallForm = NewRecallForm & { id?: number };

/** Matches the Calendar file’s flexible shape */
type Patient = {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: string | null;
    identification?: {
        firstName?: string | null;
        lastName?: string | null
    } | null;

    // ✅ From PatientDto
    phoneNumber?: string | null;   // maps to Recall "Phone"
    email?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;    // maps to Recall "zip"
    country?: string | null;
};




/* =========================
 * Helpers
 * ======================= */
const initialNewRecall: NewRecallForm = {
    patientId: "",
    patientName: "",
    dob: "",
    lastVisit: "",
    recallWhen: "",
    recallDate: "",
    recallType: "",
    reason: "",
    providerId: "",
    facility: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    smsOk: null,
    avmOk: null,
    email: "",
    emailOk: null,
    notes: "",
};


const pad = (n: number) => n.toString().padStart(2, "0");

function parseMMDDYYYY(s: string): string | null {
    if (!s) return null;
    const parts = s.split("/");
    if (parts.length !== 3) return null;
    const [mmStr, ddStr, yyyyStr] = parts;
    const mm = parseInt(mmStr, 10);
    const dd = parseInt(ddStr, 10);
    const yyyy = parseInt(yyyyStr, 10);
    if (Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(yyyy)) return null;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
}

function timeFromMMDDYYYY(s: string, fallback: number): number {
    const iso = parseMMDDYYYY(s);
    return iso ? new Date(iso).getTime() : fallback;
}

// ✅ Add this here
const formatMMDDYYYY = (date: Date) => {
    const mm = date.getMonth() + 1;  // no pad
    const dd = date.getDate();       // no pad
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
};


const getPatientFullName = (p: Patient | null | undefined): string => {
    if (!p) return "";
    const first = (p.firstName ?? p.identification?.firstName ?? "")?.trim();
    const last = (p.lastName ?? p.identification?.lastName ?? "")?.trim();
    return `${first} ${last}`.trim();
};

const fetchPatientName = async (id: number): Promise<string> => {
    try {
        const res = await fetchWithAuth(
            `${process.env.NEXT_PUBLIC_API_URL}/api/patients/${id}`
        );
        if (!res.ok) return String(id);
        const data = await res.json();
        return getPatientFullName(data?.data) || String(id);
    } catch {
        return String(id);
    }
};

/* =========================
 * Component
 * ======================= */
export default function RecallPage() {
    const [provider, setProvider] = useState("All Providers");
    type Provider = { id: number; name: string };
    const [providers, setProviders] = useState<Provider[]>([]);
    const [patientId, setPatientId] = useState("");
    const [patientName, setPatientName] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [rows, setRows] = useState<RecallDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<RecallDTO | null>(null); //  add here

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [alertData, setAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    // ✅ Auto-dismiss alerts after 4s
    useEffect(() => {
        if (alertData) {
            const timer = setTimeout(() => {
                setAlertData(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [alertData]);


    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [newRecall, setNewRecall] = useState<EditableRecallForm>(initialNewRecall);
    const [modalError, setModalError] = useState<string | null>(null);

    // 🔎 Patient search state (matches Calendar behavior)
    const [patientQuery, setPatientQuery] = useState<string>("");
    const [patientResults, setPatientResults] = useState<Patient[]>([]);
    const [, setSelectedPatientId] = useState<string>("");
    const [selectedPatientName, setSelectedPatientName] = useState<string>("");
    const [patientSearching, setPatientSearching] = useState<boolean>(false);
    const [showPatientDropdown, setShowPatientDropdown] = useState<boolean>(false);

    // Load providers
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/providers`
                );
                if (!res.ok) throw new Error("Failed to fetch providers");
                const data = await res.json();
                interface ProviderApi {
                    id: number;
                    identification?: {
                        firstName?: string;
                        lastName?: string;
                    };
                }
                const providerList: Provider[] = (data?.data ?? []).map((p: ProviderApi) => ({
                    id: p.id,
                    name: `${p?.identification?.firstName ?? ""} ${p?.identification?.lastName ?? ""}`.trim(),
                }));
                setProviders(providerList);
            } catch {
                setProviders([]);
            }
        };
        fetchProviders();
    }, []);

    // Default date range: no filter (show all)
    useEffect(() => {
        setFrom("");
        setTo("");
    }, []);



    // Load recalls (no pagination)
    const loadRecalls = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/recalls?page=${currentPage - 1}&size=${pageSize}`
            );
            if (!res.ok) throw new Error("Failed to fetch recalls");
            const data = await res.json();
            if (data.success && data.data?.content) {
                setRows(data.data.content);
                setTotalPages(data.data.totalPages);
                setTotalItems(data.data.totalElements ?? data.data.content.length);
            } else {
                setRows([]);
            }
        } catch (err) {
            console.error("Error loading recalls:", err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize]);

    useEffect(() => {
        loadRecalls();
    }, [currentPage, pageSize]);

    const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
    const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

    async function deleteRecall(id: number) {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/recalls/${id}`,
                { method: "DELETE" }
            );
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed");
            setRows(prev => prev.filter(r => r.id !== id));
            setAlertData({
                variant: "success",
                title: "Deleted",
                message: "Recall deleted successfully.",
            });
        } catch (err) {
            console.error("Delete failed:", err);
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to delete recall.",
            });
        }
    }


    /* =========================
     * Patient search (debounced)
     * ======================= */
    useEffect(() => {
        if (!isOpen) return;
        const q = patientQuery.trim();
        if (q.length < 2) {
            setPatientResults([]);
            return;
        }
        let cancelled = false;
        setPatientSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/patients?search=${encodeURIComponent(q)}`
                );
                const json = await res.json();
                if (cancelled) return;

                // Handle both array and Page shapes
                let list: Patient[] = [];
                if (Array.isArray(json?.data)) list = json.data;
                else if (Array.isArray(json?.data?.content)) list = json.data.content;

                setPatientResults(list);
                setShowPatientDropdown(true);
            } catch (e) {
                if (!cancelled) {
                    console.error("Patient search failed", e);
                    setPatientResults([]);
                }
            } finally {
                if (!cancelled) setPatientSearching(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [patientQuery, isOpen]);

    const choosePatient = async (p: Patient) => {
        const fullName = `${p.firstName ?? p.identification?.firstName ?? ""} ${
            p.lastName ?? p.identification?.lastName ?? ""
        }`.trim();

        // Split address into parts
        const parts = (p.address ?? "").split(",");
        const street = parts[0]?.trim() || "";
        const city = parts[1]?.trim() || "";
        const stateZip = parts[2]?.trim() || "";
        const [state, zip] = stateZip.split(" ").map((s) => s.trim());

        setNewRecall((prev) => ({
            ...prev,
            patientId: String(p.id),
            patientName: fullName,
            dob: p.dateOfBirth ?? "",
            phone: p.phoneNumber ?? "",
            email: p.email ?? "",
            address: street,
            city: city,
            state: state || "",
            zip: zip || "",
        }));

        setSelectedPatientId(String(p.id));
        setSelectedPatientName(fullName);
        setPatientQuery("");
        setPatientResults([]);
        setShowPatientDropdown(false);

        // 🔎 Fetch latest appointment for Last Visit
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/patient/${p.id}?size=1&sort=appointmentStartDate,desc`
            );
            if (res.ok) {
                const json = await res.json();
                const latest = json?.data?.content?.[0];
                if (latest?.appointmentStartDate) {
                    setNewRecall((prev) => ({
                        ...prev,
                        lastVisit: latest.appointmentStartDate,
                    }));
                }
            }
        } catch (err) {
            console.error("Failed to fetch last visit", err);
        }
    };

    const openNewRecall = () => {
        setNewRecall(initialNewRecall);
        setSelectedPatientId("");
        setSelectedPatientName("");
        setPatientQuery("");
        setPatientResults([]);
        setShowPatientDropdown(false);
        setModalMode("add");   // 👈 add this
        setIsOpen(true);
    };

    const handleSaveRecall = async () => {
        setModalError(null);
        try {
            if (!newRecall.patientId || newRecall.patientId.trim() === "") {
                setModalError("Please select a patient from the dropdown.");
                return;
            }

            const payload: any = {
                patientId: Number(newRecall.patientId),
                patientName: newRecall.patientName || "",
                dob: newRecall.dob || "",
                lastVisit: newRecall.lastVisit || "",
                recallDate: newRecall.recallDate || "",
                recallReason: newRecall.reason && newRecall.reason.trim() ? newRecall.reason : "Routine recall",
                smsConsent: newRecall.smsOk ?? false,
                emailConsent: newRecall.emailOk ?? false,
                phone: newRecall.phone || "",
                email: newRecall.email || "",
                address: newRecall.address || "",
                city: newRecall.city || "",
                state: newRecall.state || "",
                zip: newRecall.zip || "",
                providerId: newRecall.providerId ? Number(newRecall.providerId) : 0,
            };

            let res;
            if (modalMode === "edit" && newRecall.id) {
                res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/recalls/${newRecall.id}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );
            }
            else {
                res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/recalls`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );
            }

            const result = await res.json();
            if (!res.ok || !result?.success) {
                setModalError(result?.error || result?.message || "Failed to save recall");
                return;
            }

            setAlertData({
                variant: "success",
                title: modalMode === "add" ? "Success" : "Updated",
                message:
                    modalMode === "add"
                        ? "Recall created successfully!"
                        : "Recall updated successfully!",
            });

            setIsOpen(false);
            setNewRecall(initialNewRecall);
            setCurrentPage(1);
            await loadRecalls();
        } catch (err) {
            console.error("Error saving recall:", err);
            setModalError("Failed to save recall. Please try again.");
        }
    };

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            const d = new Date(r.recallDate).getTime();
            const fromTime = from ? timeFromMMDDYYYY(from, -Infinity) : -Infinity;
            const toTime = to ? timeFromMMDDYYYY(to, Infinity) : Infinity;
            const matchDate = d >= fromTime && d <= toTime;
            const matchProvider =
                provider === "All Providers" ? true : r.providerId === Number(provider);
            const matchPatientId = patientId ? r.patientId === Number(patientId) : true;
            const matchPatientName = patientName
                ? r.patientName?.toLowerCase().includes(patientName.trim().toLowerCase())
                : true;
            return matchDate && matchProvider && matchPatientId && matchPatientName;
        });
    }, [rows, from, to, provider, patientId, patientName]);

    const total = filtered.length;

    return (
        <AdminLayout>
            <div className="container mx-auto p-6 overflow-x-hidden text-gray-800 dark:text-gray-200">
                {/* Heading + Alert */}
                {alertData && (
                    <div className="mb-4">
                        <Alert
                            variant={alertData.variant}
                            title={alertData.title}
                            message={alertData.message}
                        />
                    </div>
                )}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm">
                        <span className="italic font-semibold">Total recalls:</span> {loading ? "…" : total}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 w-full">
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
                        >
                            <option value="All Providers">All Providers</option>
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Patient ID"
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                            className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
                        />

                        <input
                            type="text"
                            placeholder="Patient Name"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
                        />

                        {/* From Date */}
                        <input
                            type="text"
                            placeholder="MM/DD/YYYY"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
                        />

                        {/* To Date */}
                        <input
                            type="text"
                            placeholder="MM/DD/YYYY"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={openNewRecall}
                            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                        >
                            + New Recall
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
                    <table className="w-full table-auto">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="py-3 px-6 text-left text-sm font-medium">Patient Name</th>
                            <th className="py-3 px-6 text-left text-sm font-medium">Provider Name</th>
                            <th className="py-3 px-6 text-left text-sm font-medium">Last Visit</th>
                            <th className="py-3 px-6 text-left text-sm font-medium">Email</th>
                            <th className="py-3 px-6 text-left text-sm font-medium">Phone</th>
                            <th className="py-3 px-6 text-left text-sm font-medium">SMS</th>
                            <th className="py-3 px-6 text-left text-sm font-medium">Email Consent</th>
                            <th className="py-3 px-6 text-left text-sm font-medium">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                                />
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                                >
                                    No recalls match your filters.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((r) => (
                                <tr
                                    key={r.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700"
                                >
                                    <td className="py-3 px-6 text-sm">{r.patientName || "—"}</td>
                                    <td className="py-3 px-6 text-sm">
                                        {providers.find((p) => p.id === r.providerId)?.name || "—"}
                                    </td>
                                    <td className="py-3 px-6 text-sm">
                                        {r.lastVisit
                                            ? new Date(r.lastVisit).toLocaleDateString("en-US")
                                            : "—"}
                                    </td>
                                    <td className="py-3 px-6 text-sm">{r.email || "—"}</td>
                                    <td className="py-3 px-6 text-sm">{r.phone || "—"}</td>
                                    <td className="py-3 px-6 text-sm">
                                        {r.smsConsent ? "Yes" : "No"}
                                    </td>
                                    <td className="py-3 px-6 text-sm">
                                        {r.emailConsent ? "Yes" : "No"}
                                    </td>
                                    <td className="py-3 px-6 text-sm">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    // Figure out recallWhen automatically
                                                    let recallWhen = "";
                                                    if (r.lastVisit && r.recallDate) {
                                                        const last = new Date(r.lastVisit);
                                                        const recall = new Date(r.recallDate);

                                                        const diffYears = recall.getFullYear() - last.getFullYear();
                                                        if (
                                                            diffYears >= 1 &&
                                                            diffYears <= 3 &&
                                                            last.getMonth() === recall.getMonth() &&
                                                            last.getDate() === recall.getDate()
                                                        ) {
                                                            recallWhen = `${diffYears}y`;
                                                        }
                                                    }

                                                    setNewRecall({
                                                        ...initialNewRecall,
                                                        ...r,
                                                        patientId: String(r.patientId),
                                                        recallDate: r.recallDate
                                                            ? formatMMDDYYYY(new Date(r.recallDate))
                                                            : "",
                                                        reason: r.recallReason || "",
                                                        providerId: String(r.providerId || ""),
                                                        patientName: String(r.patientName || ""),
                                                        smsOk: r.smsConsent,
                                                        emailOk: r.emailConsent,
                                                        recallWhen,
                                                    });

                                                    setSelectedPatientId(String(r.patientId));
                                                    setSelectedPatientName(String(r.patientName || ""));
                                                    setModalMode("edit");
                                                    setIsOpen(true);
                                                }}
                                                className="p-1 text-blue-600 hover:text-blue-800 rounded"
                                            >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"
                                                     fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                     strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                          d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.125 19.589 3 21l1.411-4.125L16.862 3.487z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(r)}
                                                className="p-1 text-red-600 hover:text-red-800 rounded"
                                            >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"
                                                     fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                     strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                          d="M6 7h12M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="mt-3 flex items-center justify-between px-3 py-2 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm">
                    <div className="flex items-center gap-3">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={handlePrevious}
                            className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                            Prev
                        </button>
                        <div>Page {currentPage} of {totalPages}</div>
                        <button
                            disabled={currentPage === totalPages || loading}
                            onClick={handleNext}
                            className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                            Next
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>Showing {loading ? "…" : rows.length} of {totalItems}</div>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="border rounded px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Modal for new recall (inline popup, like Calendar) */}
            {isOpen && (
                <div className="absolute inset-0 z-50">
                    {/* Transparent backdrop to catch outside clicks */}
                    <button
                        aria-label="Close recall panel"
                        onClick={() => setIsOpen(false)}
                        className="absolute inset-0 bg-transparent"
                    />

                    {/* Panel */}
                    <div className="pointer-events-auto absolute left-1/2 top-6 w-[95%] max-w-[760px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-dark-900">
                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-5">
                            <div>
                                <h5 className="mb-1 font-semibold text-gray-800 text-theme-xl dark:text-white/90 lg:text-2xl">
                                    {modalMode === "add" ? "Add Recall" : "Edit Recall"}
                                </h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {modalMode === "add" ? "Create a patient recall entry" : "Update patient recall entry"}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                                className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto px-6 pb-6 lg:px-10">
                            {modalError && (
                                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                                    <p className="text-sm text-red-700 dark:text-red-300">{modalError}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    {/* Patient search */}
                                    <div className="relative">
                                        <Label>Name <span className="text-red-600">*</span></Label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                            value={selectedPatientName || patientQuery}
                                            onChange={(e) => {
                                                setPatientQuery(e.target.value);
                                                setShowPatientDropdown(true);
                                                if (e.target.value !== selectedPatientName) {
                                                    setSelectedPatientId("");
                                                    setSelectedPatientName("");
                                                    setNewRecall((prev) => ({
                                                        ...prev,
                                                        patientId: "",
                                                        patientName: e.target.value,
                                                    }));
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && patientResults.length > 0) {
                                                    e.preventDefault();
                                                    choosePatient(patientResults[0]);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (patientResults.length > 0) setShowPatientDropdown(true);
                                            }}
                                            placeholder="Search patient by name…"
                                        />
                                        {showPatientDropdown &&
                                            (patientSearching || patientResults.length > 0) && (
                                                <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-900">
                                                    {patientSearching ? (
                                                        <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
                                                    ) : (
                                                        <ul className="max-h-56 overflow-auto py-1">
                                                            {patientResults.map((p) => {
                                                                const name = getPatientFullName(p);
                                                                return (
                                                                    <li
                                                                        key={p.id}
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() => choosePatient(p)}
                                                                        className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
                                                                    >
                                                                        <div className="font-medium text-gray-800 dark:text-gray-100">
                                                                            {name || `Patient #${p.id}`}
                                                                        </div>
                                                                        {p.dateOfBirth && (
                                                                            <div className="text-xs text-gray-500">DOB: {p.dateOfBirth}</div>
                                                                        )}
                                                                        {p.phoneNumber && (
                                                                            <div className="text-xs text-gray-500">Phone: {p.phoneNumber}</div>
                                                                        )}
                                                                        {p.email && (
                                                                            <div className="text-xs text-gray-500">Email: {p.email}</div>
                                                                        )}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                    </div>

                                    {/* DOB */}
                                    <div>
                                        <Label>DOB</Label>
                                        <input
                                            type="text"
                                            placeholder="MM/DD/YYYY"
                                            pattern="\d{2}/\d{2}/\d{4}"
                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                            value={newRecall.dob ? new Date(newRecall.dob).toLocaleDateString("en-US") : ""}
                                            readOnly
                                        />
                                    </div>

                                    {/* Last Visit */}
                                    <div>
                                        <Label>Last Visit <span className="text-red-600">*</span></Label>
                                        <input
                                            type="date"
                                            className="order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                            value={newRecall.lastVisit || ""}
                                            onChange={(e) => {
                                                setNewRecall((prev) => ({ ...prev, lastVisit: e.target.value }));
                                            }}
                                        />
                                        <div className="flex gap-4 mt-2 text-sm">
                                            <button type="button" onClick={() => {
                                                if (!newRecall.lastVisit) return;
                                                const d = new Date(newRecall.lastVisit + "T00:00:00");
                                                d.setFullYear(d.getFullYear() + 1);
                                                setNewRecall((prev) => ({
                                                    ...prev,
                                                    recallWhen: "1y",
                                                    recallDate: d.toISOString().split('T')[0],
                                                }));
                                            }} className="flex items-center gap-1">
                                                <input type="radio" checked={newRecall.recallWhen === "1y"} readOnly />
                                                plus 1 year
                                            </button>

                                            <button type="button" onClick={() => {
                                                if (!newRecall.lastVisit) return;
                                                const d = new Date(newRecall.lastVisit + "T00:00:00");
                                                d.setFullYear(d.getFullYear() + 2);
                                                setNewRecall((prev) => ({
                                                    ...prev,
                                                    recallWhen: "2y",
                                                    recallDate: d.toISOString().split('T')[0],
                                                }));
                                            }} className="flex items-center gap-1">
                                                <input type="radio" checked={newRecall.recallWhen === "2y"} readOnly />
                                                plus 2 years
                                            </button>

                                            <button type="button" onClick={() => {
                                                if (!newRecall.lastVisit) return;
                                                const d = new Date(newRecall.lastVisit + "T00:00:00");
                                                d.setFullYear(d.getFullYear() + 3);
                                                setNewRecall((prev) => ({
                                                    ...prev,
                                                    recallWhen: "3y",
                                                    recallDate: d.toISOString().split('T')[0],
                                                }));
                                            }} className="flex items-center gap-1">
                                                <input type="radio" checked={newRecall.recallWhen === "3y"} readOnly />
                                                plus 3 years
                                            </button>
                                        </div>
                                    </div>

                                    {/* Recall Date */}
                                    <div>
                                        <Label>Recall Date <span className="text-red-600">*</span></Label>
                                        <input
                                            type="date"
                                            className="order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                            value={newRecall.recallDate || ""}
                                            onChange={(e) => {
                                                setNewRecall((prev) => ({ ...prev, recallDate: e.target.value }));
                                            }}
                                        />
                                    </div>


                                    <div>
                                        <Label>Provider</Label>
                                        <select
                                            value={newRecall.providerId}
                                            onChange={(e) => setNewRecall((prev) => ({ ...prev, providerId: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                        >
                                            <option value="">Select provider</option>
                                            {providers.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    {/* Address */}
                                    <div>
                                        <Label>Address</Label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                            placeholder="Address"
                                            value={newRecall.address || ""}
                                            onChange={(e) => setNewRecall((prev) => ({ ...prev, address: e.target.value }))}
                                        />
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            <input
                                                type="text"
                                                className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                                placeholder="City"
                                                value={newRecall.city || ""}
                                                onChange={(e) => setNewRecall((prev) => ({ ...prev, city: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                                placeholder="State"
                                                value={newRecall.state || ""}
                                                onChange={(e) => setNewRecall((prev) => ({ ...prev, state: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                                placeholder="ZIP Code"
                                                value={newRecall.zip || ""}
                                                onChange={(e) => setNewRecall((prev) => ({ ...prev, zip: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <Label>Phone</Label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                            value={newRecall.phone || ""}
                                            onChange={(e) => setNewRecall((prev) => ({ ...prev, phone: e.target.value }))}
                                        />
                                    </div>

                                    {/* SMS OK */}
                                    <div className="flex gap-4">
                                        <Label>SMS</Label>
                                        <label>
                                            <input
                                                type="radio"
                                                checked={newRecall.smsOk === true}
                                                onClick={() =>
                                                    setNewRecall((prev) => ({
                                                        ...prev,
                                                        smsOk: prev.smsOk === true ? null : true,
                                                    }))
                                                }
                                                readOnly
                                            />{" "}
                                            YES
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                checked={newRecall.smsOk === false}
                                                onClick={() =>
                                                    setNewRecall((prev) => ({
                                                        ...prev,
                                                        smsOk: prev.smsOk === false ? null : false,
                                                    }))
                                                }
                                                readOnly
                                            />{" "}
                                            NO
                                        </label>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <Label>Email</Label>
                                        <input
                                            type="email"
                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
                                            value={newRecall.email || ""}
                                            onChange={(e) =>
                                                setNewRecall((prev) => ({ ...prev, email: e.target.value }))
                                            }
                                        />

                                        <div className="flex gap-4 mt-2">
                                            <Label>Email Consent</Label>
                                            <label>
                                                <input
                                                    type="radio"
                                                    checked={newRecall.emailOk === true}
                                                    onClick={() =>
                                                        setNewRecall((prev) => ({
                                                            ...prev,
                                                            emailOk: prev.emailOk === true ? null : true,
                                                        }))
                                                    }
                                                    readOnly
                                                />{" "}
                                                YES
                                            </label>
                                            <label>
                                                <input
                                                    type="radio"
                                                    checked={newRecall.emailOk === false}
                                                    onClick={() =>
                                                        setNewRecall((prev) => ({
                                                            ...prev,
                                                            emailOk: prev.emailOk === false ? null : false,
                                                        }))
                                                    }
                                                    readOnly
                                                />{" "}
                                                NO
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 pb-6">
                            <Button size="sm" variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveRecall}>
                                {modalMode === "add" ? "Add Recall" : "Update Recall"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Delete Recall
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Are you sure you want to delete{" "}
                            <span className="font-medium">{deleteTarget.patientName}</span>’s recall?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-rose-600 text-white hover:bg-rose-700"
                                onClick={async () => {
                                    await deleteRecall(deleteTarget.id);
                                    setDeleteTarget(null);
                                }}
                            >
                                Yes, Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}





