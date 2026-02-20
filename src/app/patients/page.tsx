"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface Patient {
    id: number;
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string;
    status?: string;
    address?: string;
}

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

const badgeColors = [
    "bg-pink-200 text-pink-700",
    "bg-green-200 text-green-700",
    "bg-blue-200 text-blue-700",
    "bg-yellow-200 text-yellow-700",
    "bg-purple-200 text-purple-700",
    "bg-teal-200 text-teal-700",
    "bg-indigo-200 text-indigo-700",
    "bg-red-200 text-red-700",
];

const emptyPatient: Omit<Patient, "id"> = {
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    status: "Active",
    address: "",
};

export default function PatientListPage() {
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [patientsPerPage, setPatientsPerPage] = useState<number>(20);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(0);

    const [search, setSearch] = useState("");
    const [showInactive, setShowInactive] = useState(false);
    const [genderFilter, setGenderFilter] = useState("all");

    const [editPatient, setEditPatient] = useState<Patient | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPatient, setNewPatient] = useState(emptyPatient);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    useEffect(() => {
        const recent = JSON.parse(localStorage.getItem("recentPatients") || "[]");
        setRecentPatients(recent);
    }, []);

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    };

    const getInitials = (firstName: string, lastName: string) =>
        `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

    const getBadgeColor = (id: number) => badgeColors[id % badgeColors.length];

    const handlePatientClick = (patient: Patient) => {
        const updatedRecent = [
            patient,
            ...recentPatients.filter((p) => p.id !== patient.id),
        ].slice(0, 5);
        setRecentPatients(updatedRecent);
        localStorage.setItem("recentPatients", JSON.stringify(updatedRecent));
    };

    const goToPatient = (patient: Patient) => {
        handlePatientClick(patient);
        router.push(`/patients/${patient.id}/`);
    };

    const fetchPatients = useCallback(
        async (page: number, size: number, search: string, status: string, gender: string, signal?: AbortSignal) => {
            setLoading(true);
            setError(null);
            try {
                const base = `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients`;
                const params = new URLSearchParams();
                params.set("page", String(Math.max(0, page - 1)));
                params.set("size", String(size));
                params.set("sort", "id,asc");
                if (search) params.set("search", search);
                if (status && status !== "all") params.set("status", status);
                if (gender && gender !== "all") params.set("gender", gender);

                const url = `${base}?${params.toString()}`;
                const res = await fetchWithAuth(url, { signal });
                const body = (await res.json()) as ApiResponse<PageResponse<Patient>>;
                if (!body.success) throw new Error(body.message || "Failed to fetch patients");
                if (!body.data) {
                    setPatients([]);
                    setTotalPages(1);
                    setTotalItems(0);
                    return;
                }

                const pageData = body.data;
                setPatients(pageData.content || []);
                setTotalPages(Math.max(1, pageData.totalPages ?? 1));
                setTotalItems(pageData.totalElements ?? (pageData.content?.length ?? 0));
                setCurrentPage((pageData.number ?? (page - 1)) + 1);
            } catch (err: unknown) {
                if (err instanceof Error && err.name !== "AbortError") {
                    setError("An error occurred while fetching patients: " + err.message);
                }
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        const controller = new AbortController();
        fetchPatients(currentPage, patientsPerPage, search, showInactive ? "all" : "Active", genderFilter, controller.signal);
        return () => controller.abort();
    }, [currentPage, patientsPerPage, search, showInactive ? "all" : "Active", genderFilter, fetchPatients]);

    const handlePrevious = () => setCurrentPage((p) => Math.max(1, p - 1));
    const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

    const handleEdit = (patient: Patient) => setEditPatient(patient);

    const handleSaveEdit = async (updatedPatient: Patient) => {
        if (!updatedPatient) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${updatedPatient.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedPatient),
                }
            );
            const body = await res.json();
            if (!body.success) throw new Error(body.message || "Failed to update patient");
            fetchPatients(currentPage, patientsPerPage, search, showInactive ? "all" : "Active", genderFilter);
            setEditPatient(null);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to update patient");
        } finally {
            setSaving(false);
        }
    };

    const handleAddPatient = async () => {
        setSaving(true);
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newPatient),
                }
            );
            const body = await res.json();
            if (!body.success) {
                const errMsg = typeof body.data === "object" && body.data
                    ? Object.entries(body.data).map(([k, v]) => `${k}: ${v}`).join(", ")
                    : body.message || "Failed to create patient";
                throw new Error(errMsg);
            }
            setShowAddModal(false);
            setNewPatient(emptyPatient);
            fetchPatients(1, patientsPerPage, search, showInactive ? "all" : "Active", genderFilter);
            setCurrentPage(1);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to create patient");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (patient: Patient) => {
        const newStatus = patient.status === "Active" ? "Inactive" : "Active";
        if (newStatus === "Inactive") {
            const confirmed = window.confirm(
                `Are you sure you want to deactivate ${patient.firstName} ${patient.lastName}? This patient will be hidden from the default list.`
            );
            if (!confirmed) return;
        }
        setTogglingId(patient.id);
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patient.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...patient, status: newStatus }),
                }
            );
            const body = await res.json();
            if (!body.success) throw new Error(body.message || "Failed to update status");
            fetchPatients(currentPage, patientsPerPage, search, showInactive ? "all" : "Active", genderFilter);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to toggle status");
        } finally {
            setTogglingId(null);
        }
    };

    const clearFilters = () => {
        setSearch("");
        setShowInactive(false);
        setGenderFilter("all");
        setCurrentPage(1);
    };

    const hasActiveFilters = search || showInactive || genderFilter !== "all";

    return (
        <AdminLayout>
            <div className="flex flex-col h-full overflow-hidden">
                {/* Top bar: recent patients + actions */}
                <div className="flex flex-wrap justify-between gap-3 px-4 py-3 items-start">
                    <div className="flex-1 min-w-0">
                        {recentPatients.length > 0 && (
                            <>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Recent patients</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {recentPatients.slice(0, 5).map((patient) => (
                                        <Link
                                            key={patient.id}
                                            href={`/patients/${patient.id}/`}
                                            onClick={() => handlePatientClick(patient)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                        >
                                            <div
                                                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${getBadgeColor(patient.id)}`}
                                            >
                                                {getInitials(patient.firstName, patient.lastName)}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                {patient.firstName} {patient.lastName}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Patient
                    </button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-y border-gray-200 bg-gray-50/80">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <span className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                    </div>

                    {/* Show Inactive checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => { setShowInactive(e.target.checked); setCurrentPage(1); }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Show Inactive</span>
                    </label>

                    {/* Gender filter */}
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-gray-500">Gender:</label>
                        <select
                            value={genderFilter}
                            onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Clear filters
                        </button>
                    )}

                    {/* Count badge */}
                    <div className="ml-auto text-xs text-gray-500">
                        {totalItems} patient{totalItems !== 1 ? "s" : ""}
                    </div>
                </div>

                {/* Table */}
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-auto flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading patients...</div>
                        ) : error ? (
                            <div className="flex items-center justify-center py-16 text-red-500 text-sm">{error}</div>
                        ) : patients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                                <div className="text-sm font-medium">No patients found</div>
                                {hasActiveFilters && <div className="text-xs mt-1">Try adjusting your filters</div>}
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">MRN</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">DOB</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {patients.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-blue-50/40 transition-colors">
                                            {/* Name + avatar */}
                                            <td className="px-3 py-2">
                                                <button
                                                    onClick={() => goToPatient(patient)}
                                                    className="flex items-center gap-2 group text-left"
                                                >
                                                    <div
                                                        className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-semibold ${getBadgeColor(patient.id)}`}
                                                    >
                                                        {getInitials(patient.firstName, patient.lastName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
                                                            {patient.firstName} {patient.lastName}
                                                        </div>
                                                        {patient.email && (
                                                            <div className="text-xs text-gray-400 truncate">{patient.email}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            </td>

                                            <td className="px-3 py-2 text-gray-600 font-mono text-xs">{patient.id}</td>

                                            {/* Contact: phone + email */}
                                            <td className="px-3 py-2 text-gray-600">
                                                <div className="text-sm">{patient.phoneNumber || "N/A"}</div>
                                            </td>

                                            <td className="px-3 py-2 text-gray-600 text-sm">{formatDate(patient.dateOfBirth)}</td>
                                            <td className="px-3 py-2 text-gray-600 text-sm">{patient.gender || "N/A"}</td>

                                            {/* Status badge */}
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    patient.status === "Active"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-gray-100 text-gray-500"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        patient.status === "Active" ? "bg-emerald-500" : "bg-gray-400"
                                                    }`} />
                                                    {patient.status || "Active"}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex justify-center gap-1">
                                                    {/* View chart */}
                                                    <button
                                                        onClick={() => goToPatient(patient)}
                                                        title="View Chart"
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </button>

                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => handleEdit(patient)}
                                                        title="Edit Patient"
                                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                                        </svg>
                                                    </button>

                                                    {/* Toggle active/inactive */}
                                                    <button
                                                        onClick={() => handleToggleStatus(patient)}
                                                        title={patient.status === "Active" ? "Deactivate" : "Activate"}
                                                        disabled={togglingId === patient.id}
                                                        className={`p-1.5 rounded transition-colors ${
                                                            togglingId === patient.id
                                                                ? "opacity-50 cursor-not-allowed"
                                                                : patient.status === "Active"
                                                                ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                        }`}
                                                    >
                                                        {patient.status === "Active" ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Sticky pagination */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t bg-white text-sm shrink-0">
                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={handlePrevious}
                                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-gray-500 text-sm">
                                Page <span className="font-medium text-gray-700">{currentPage}</span> of{" "}
                                <span className="font-medium text-gray-700">{totalPages}</span>
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={handleNext}
                                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500 text-sm">
                                Showing <span className="font-medium text-gray-700">{patients.length}</span> of{" "}
                                <span className="font-medium text-gray-700">{totalItems}</span>
                            </span>
                            <select
                                value={patientsPerPage}
                                onChange={(e) => { setPatientsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="border rounded-md px-2 py-1 bg-white text-sm"
                            >
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Patient Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-2xl" onClose={() => setShowAddModal(false)}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Add New Patient</DialogTitle>
                        <DialogDescription>Enter the patient&apos;s information. Fields marked with * are required.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleAddPatient(); }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">First Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    placeholder="First name"
                                    value={newPatient.firstName}
                                    onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Middle Name</label>
                                <input
                                    placeholder="Middle (optional)"
                                    value={newPatient.middleName}
                                    onChange={(e) => setNewPatient({ ...newPatient, middleName: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Last Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    placeholder="Last name"
                                    value={newPatient.lastName}
                                    onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Date of Birth <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    value={newPatient.dateOfBirth}
                                    onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Gender <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={newPatient.gender}
                                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="(555) 123-4567"
                                    value={newPatient.phoneNumber}
                                    onChange={(e) => setNewPatient({ ...newPatient, phoneNumber: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="patient@email.com"
                                    value={newPatient.email}
                                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Address</label>
                            <input
                                placeholder="123 Main St, City, State ZIP"
                                value={newPatient.address}
                                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                                className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => { setShowAddModal(false); setNewPatient(emptyPatient); }}
                                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {saving ? "Creating..." : "Create Patient"}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Patient Modal */}
            {editPatient && (
                <Dialog open={true} onOpenChange={() => setEditPatient(null)}>
                    <DialogContent className="max-w-2xl" onClose={() => setEditPatient(null)}>
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">Edit Patient</DialogTitle>
                            <DialogDescription>Update the patient details below.</DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSaveEdit(editPatient); }}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">First Name <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        placeholder="First name"
                                        value={editPatient.firstName}
                                        onChange={(e) => setEditPatient({ ...editPatient, firstName: e.target.value })}
                                        className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Middle Name</label>
                                    <input
                                        placeholder="Middle (optional)"
                                        value={editPatient.middleName}
                                        onChange={(e) => setEditPatient({ ...editPatient, middleName: e.target.value })}
                                        className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Last Name <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        placeholder="Last name"
                                        value={editPatient.lastName}
                                        onChange={(e) => setEditPatient({ ...editPatient, lastName: e.target.value })}
                                        className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date of Birth <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        value={editPatient.dateOfBirth}
                                        onChange={(e) => setEditPatient({ ...editPatient, dateOfBirth: e.target.value })}
                                        className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Gender <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={editPatient.gender}
                                        onChange={(e) => setEditPatient({ ...editPatient, gender: e.target.value })}
                                        className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Phone Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        required
                                        value={editPatient.phoneNumber}
                                        onChange={(e) => setEditPatient({ ...editPatient, phoneNumber: e.target.value })}
                                        className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editPatient.email}
                                        onChange={(e) => setEditPatient({ ...editPatient, email: e.target.value })}
                                        className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select
                                    value={editPatient.status || "Active"}
                                    onChange={(e) => setEditPatient({ ...editPatient, status: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <DialogFooter>
                                <button
                                    type="button"
                                    onClick={() => setEditPatient(null)}
                                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </AdminLayout>
    );
}
