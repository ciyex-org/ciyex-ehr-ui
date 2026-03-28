"use client";
import { getEnv } from "@/utils/env";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import DateInput from "@/components/ui/DateInput";
import PluginSlot from "@/components/plugins/PluginSlot";
import { usePermissions } from "@/context/PermissionContext";
import { isValidName, isValidPhone, isValidEmail } from "@/utils/validation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { confirmDialog } from "@/utils/toast";

interface AppHeaderProps {
    pageTitle?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ pageTitle }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
    const { toggleSidebar } = useSidebar();
    const { canWriteResource } = usePermissions();
    const canWritePatient = canWriteResource("Patient");
    const canWriteAppointment = canWriteResource("Appointment");
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        gender: "",
        dateOfBirth: "",
        phoneNumber: "",
        email: "",
        status: "Active",
        allowSms: true,
        allowEmail: true,
        allowVoicemail: true,
    });

    const [errorMessage, setErrorMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: number; firstName: string; lastName: string; dateOfBirth?: string }[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDeletePatientConfirm, setShowDeletePatientConfirm] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const resetForm = () => {
        setFormData({
            firstName: "",
            middleName: "",
            lastName: "",
            gender: "",
            dateOfBirth: "",
            phoneNumber: "",
            email: "",
            status: "Active",
            allowSms: true,
            allowEmail: true,
            allowVoicemail: true,
        });
        setEditingPatientId(null);
        setErrorMessage("");
        setFieldErrors({});
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        if (fieldErrors[name]) setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    };

    const handleSave = async () => {
        const errs: Record<string, string> = {};
        if (!formData.firstName.trim()) errs.firstName = "First name is required";
        else if (!isValidName(formData.firstName)) errs.firstName = "Name must contain only letters";
        if (!formData.lastName.trim()) errs.lastName = "Last name is required";
        else if (!isValidName(formData.lastName)) errs.lastName = "Name must contain only letters";
        if (formData.middleName && !isValidName(formData.middleName)) errs.middleName = "Name must contain only letters";
        if (!formData.phoneNumber.trim()) errs.phoneNumber = "Phone number is required";
        else if (!isValidPhone(formData.phoneNumber)) errs.phoneNumber = "Enter a valid phone number";
        if (!formData.email.trim()) errs.email = "Email is required";
        else if (!isValidEmail(formData.email)) errs.email = "Enter a valid email address";
        if (!formData.gender) errs.gender = "Gender is required";
        if (!formData.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
        else if (formData.dateOfBirth > new Date().toISOString().split("T")[0]) errs.dateOfBirth = "Date of birth cannot be a future date";
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) return;

        try {
            const apiUrl = getEnv("NEXT_PUBLIC_API_URL");

            // Duplicate check: search by email or phone
            if (!editingPatientId) {
                const checks: string[] = [];
                if (formData.email.trim()) checks.push(`email=${encodeURIComponent(formData.email.trim())}`);
                if (formData.phoneNumber.trim()) checks.push(`phone=${encodeURIComponent(formData.phoneNumber.trim())}`);
                if (checks.length > 0) {
                    try {
                        const dupRes = await fetchWithAuth(`${apiUrl}/api/patients?search=${encodeURIComponent(formData.email.trim() || formData.phoneNumber.trim())}&size=5`);
                        const dupJson = await dupRes.json();
                        const existing = dupJson?.data?.content || dupJson?.data || [];
                        if (Array.isArray(existing) && existing.length > 0) {
                            const match = existing.find((p: any) =>
                                (formData.email.trim() && p.email && p.email.toLowerCase() === formData.email.trim().toLowerCase()) ||
                                (formData.phoneNumber.trim() && p.phoneNumber && p.phoneNumber.replace(/\D/g, '') === formData.phoneNumber.trim().replace(/\D/g, ''))
                            );
                            if (match) {
                                setErrorMessage(`A patient with this ${match.email?.toLowerCase() === formData.email.trim().toLowerCase() ? 'email' : 'phone number'} already exists: ${match.firstName} ${match.lastName} (ID: ${match.id})`);
                                return;
                            }
                        }
                    } catch { /* continue if duplicate check fails */ }
                }
            }

            let response: Response;

            if (editingPatientId) {
                // Update existing patient via generic FHIR handler
                response = await fetchWithAuth(
                    `${apiUrl}/api/fhir-resource/demographics/patient/${editingPatientId}/${editingPatientId}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formData),
                    }
                );
            } else {
                // Create new patient via generic FHIR handler
                response = await fetchWithAuth(
                    `${apiUrl}/api/fhir-resource/demographics`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formData),
                    }
                );
            }

            const res = await response.json();
            if (res.success) {
                const patientId = res.data?.fhirId || res.data?.id;
                setModalOpen(false);
                resetForm();
                if (patientId) {
                    // Redirect to patient demographics to add more details
                    router.push(`/patients/${patientId}`);
                } else {
                    router.refresh();
                }
            } else {
                setErrorMessage(res.message || "Failed to save patient");
            }
        } catch {
            setErrorMessage("Something went wrong.");
        }
    };

    const handleDelete = () => {
        if (!editingPatientId) return;
        setShowDeletePatientConfirm(true);
    };

    const confirmDeletePatient = async () => {
        setShowDeletePatientConfirm(false);
        try {
            const response = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/fhir-resource/demographics/${editingPatientId}`,
                { method: "DELETE" }
            );
            const res = await response.json();
            if (res.success) {
                setModalOpen(false);
                resetForm();
                router.refresh();
            } else {
                setErrorMessage(res.message || "Failed to delete patient");
            }
        } catch {
            setErrorMessage("Something went wrong.");
        }
    };

    // Debounced patient search for header dropdown
    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }
        const t = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
                const res = await fetchWithAuth(`${apiUrl}/api/patients?search=${encodeURIComponent(searchTerm.trim())}&size=10`);
                const json = await res.json();
                const list = json?.data?.content || json?.data || [];
                setSearchResults(Array.isArray(list) ? list : []);
                setShowSearchDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const runSearch = useCallback(() => {
        if (!searchTerm.trim()) return;
        setShowSearchDropdown(false);
        if (searchResults.length === 1) {
            setSearchTerm("");
            router.push(`/patients/${searchResults[0].id}`);
        } else {
            router.push(`/patients?search=${encodeURIComponent(searchTerm.trim())}`);
        }
    }, [searchTerm, searchResults, router]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "k") {
                event.preventDefault();
                inputRef.current?.focus();
            }
            if (event.key === "Enter" && document.activeElement === inputRef.current) {
                event.preventDefault();
                runSearch();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [runSearch, searchTerm]);

    return (
        <header className="sticky top-0 flex w-full bg-white border-b border-gray-200 z-50 dark:bg-gray-900">
            <div className="flex items-center justify-between w-full px-4 py-2">
                {/* Left section: sidebar + title */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSidebar}
                        className="flex items-center justify-center h-11 w-11 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {pageTitle && <h1 className="text-lg font-semibold">{pageTitle}</h1>}
                </div>

                {/* Right section: search + actions grouped together */}
                <div className="flex items-center gap-3 flex-1 justify-end">
                    {/* Search box */}
                    <div className="max-w-md w-full" ref={searchRef}>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                                </svg>
                            </span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); }}
                                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                                placeholder="Search by name or DOB (MM/DD/YYYY)..."
                                className="h-11 w-full rounded-lg border border-gray-200 pl-9 pr-14 text-sm text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={runSearch}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500"
                            >
                                ⌘ K
                            </button>
                            {showSearchDropdown && (
                                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-dark-900 dark:border-gray-700">
                                    {searchLoading ? (
                                        <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-500">No patients found</div>
                                    ) : (
                                        <ul className="max-h-64 overflow-auto py-1">
                                            {searchResults.map((p) => (
                                                <li
                                                    key={p.id}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setSearchTerm("");
                                                        setShowSearchDropdown(false);
                                                        router.push(`/patients/${p.id}`);
                                                    }}
                                                    className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
                                                >
                                                    <div className="font-medium text-gray-800 dark:text-gray-100">
                                                        {p.firstName} {p.lastName}
                                                    </div>
                                                    {p.dateOfBirth && (
                                                        <div className="text-xs text-gray-500">DOB: {p.dateOfBirth}</div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Patient button — only for users with Patient write scope */}
                    {canWritePatient && (
                    <button
                        onClick={() => {
                            resetForm();
                            setModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 text-blue-700 px-3 py-1.5 text-sm font-medium hover:bg-blue-200"
                    >
                        <span className="text-xl font-bold">+</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" className="w-5 h-5">
                            <path
                                className="stroke-[#6C3DB7]"
                                d="M24,28H6c-1.1,0-2-0.9-2-2v0c0-3.9,3.1-7,7-7h8c3.9,0,7,3.1,7,7v0C26,27.1,25.1,28,24,28z"
                            />
                            <circle className="fill-[#6EBAFF]" cx="15" cy="9" r="6" />
                        </svg>
                    </button>
                    )}

                    {/* Appointment button — only for users with Appointment write scope */}
                    {canWriteAppointment && (
                    <button
                        onClick={() => window.dispatchEvent(new Event("open-appointment-modal"))}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 text-blue-700 px-3 py-1.5 text-sm font-medium hover:bg-blue-200"
                    >
                        <span className="text-xl font-bold">+</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-7 w-7"
                            viewBox="0 0 26 26"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                        </svg>
                    </button>
                    )}

                    {/* Plugin-injected header actions */}
                    <PluginSlot name="global:header-action" as="fragment" />

                    <NotificationDropdown />
                    <UserDropdown />
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
                <DialogContent
                    className="max-w-2xl z-[9999]"
                    onClose={() => {
                        setModalOpen(false);
                        resetForm();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            {editingPatientId ? "Edit Patient" : "Create Patient"}
                        </DialogTitle>
                        <DialogDescription>
                            Fill out the patient details below.
                        </DialogDescription>
                    </DialogHeader>

                    <form className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="text-red-500">*</span> First Name
                                </label>
                                <input
                                    name="firstName"
                                    required
                                    placeholder="First name"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    className={`w-full p-2 border rounded ${fieldErrors.firstName ? "border-red-400" : ""}`}
                                />
                                {fieldErrors.firstName && <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Middle Name
                                </label>
                                <input
                                    name="middleName"
                                    placeholder="Middle name"
                                    value={formData.middleName}
                                    onChange={handleInputChange}
                                    className={`w-full p-2 border rounded ${fieldErrors.middleName ? "border-red-400" : ""}`}
                                />
                                {fieldErrors.middleName && <p className="text-xs text-red-500 mt-1">{fieldErrors.middleName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="text-red-500">*</span> Last Name
                                </label>
                                <input
                                    name="lastName"
                                    required
                                    placeholder="Last name"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    className={`w-full p-2 border rounded ${fieldErrors.lastName ? "border-red-400" : ""}`}
                                />
                                {fieldErrors.lastName && <p className="text-xs text-red-500 mt-1">{fieldErrors.lastName}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="text-red-500">*</span> Phone Number
                                </label>
                                <input
                                    name="phoneNumber"
                                    required
                                    placeholder="(555) 123-4567"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    className={`w-full p-2 border rounded ${fieldErrors.phoneNumber ? "border-red-400" : ""}`}
                                />
                                {fieldErrors.phoneNumber ? (
                                    <p className="text-xs text-red-500 mt-1">{fieldErrors.phoneNumber}</p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">Include country code if outside your region.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="text-red-500">*</span> Gender
                                </label>
                                <select
                                    name="gender"
                                    required
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className={`w-full p-2 border rounded ${fieldErrors.gender ? "border-red-400" : ""}`}
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Unknown">Unknown</option>
                                </select>
                                {fieldErrors.gender && <p className="text-xs text-red-500 mt-1">{fieldErrors.gender}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="text-red-500">*</span> Date of Birth
                                </label>
                                <DateInput
                                    value={formData.dateOfBirth}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }));
                                        if (fieldErrors.dateOfBirth) setFieldErrors(prev => { const n = { ...prev }; delete n.dateOfBirth; return n; });
                                    }}
                                    placeholder="MM/DD/YYYY"
                                    max={new Date().toISOString().split("T")[0]}
                                />
                                {fieldErrors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{fieldErrors.dateOfBirth}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    <span className="text-red-500">*</span> Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full p-2 border rounded ${fieldErrors.email ? "border-red-400" : ""}`}
                                />
                                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Communication Consent</label>
                            <div className="flex items-center gap-4">
                                <div>
                                    <input
                                        type="checkbox"
                                        id="allowEmail"
                                        name="allowEmail"
                                        checked={formData.allowEmail}
                                        onChange={handleInputChange}
                                    />
                                    <label htmlFor="allowEmail" className="ml-2">Email</label>
                                </div>
                                <div>
                                    <input
                                        type="checkbox"
                                        id="allowSms"
                                        name="allowSms"
                                        checked={formData.allowSms}
                                        onChange={handleInputChange}
                                    />
                                    <label htmlFor="allowSms" className="ml-2">SMS/Text</label>
                                </div>
                                <div>
                                    <input
                                        type="checkbox"
                                        id="allowVoicemail"
                                        name="allowVoicemail"
                                        checked={formData.allowVoicemail}
                                        onChange={handleInputChange}
                                    />
                                    <label htmlFor="allowVoicemail" className="ml-2">Voicemail</label>
                                </div>
                            </div>
                        </div>
                    </form>


                    {errorMessage && (
                        <p className="text-red-600 text-sm mt-3">{errorMessage}</p>
                    )}

                    <DialogFooter className="flex justify-between items-center mt-6">
                        <div className="flex gap-2">
                            {editingPatientId && (
                                <button
                                    onClick={handleDelete}
                                    className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setModalOpen(false);
                                    resetForm();
                                }}
                                className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                {editingPatientId ? "Update" : "Save"}
                            </button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={showDeletePatientConfirm}
                title="Delete Patient"
                message="Are you sure you want to delete this patient? This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={confirmDeletePatient}
                onCancel={() => setShowDeletePatientConfirm(false)}
            />
        </header>
    );
};


export default AppHeader;
