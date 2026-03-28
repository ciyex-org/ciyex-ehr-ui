"use client";
import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { isValidName, isValidEmail, isValidUSPhone, isValidSSN } from "@/utils/validation";
import AdminLayout from "@/app/(admin)/layout";
import { usePermissions } from "@/context/PermissionContext";
import DateInput from "@/components/ui/DateInput";

interface Patient {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    ssn: string;
    dateOfBirth: string;
    gender: string;
    status: "Active" | "Pending" | "Inactive";
}

const inputCls = (err?: string) =>
    `mt-1 block w-full p-2 border rounded-md ${err ? "border-red-400 focus:ring-red-400" : "border-gray-300"}`;

export default function EditPatientPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id ?? "";
    const { canWriteResource } = usePermissions();
    const canWritePatient = canWriteResource("Patient");
    const [formData, setFormData] = useState<Partial<Patient> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!id) {
            setError("Patient ID is missing.");
            return;
        }

        const fetchPatientDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`);
                const result = await res.json();
                if (result.success) {
                    const data = result.data;
                    // Normalize gender to title-case to match select options (Male/Female/Unknown)
                    if (data.gender) {
                        const g = String(data.gender).toLowerCase();
                        if (g === "male") data.gender = "Male";
                        else if (g === "female") data.gender = "Female";
                        else if (g === "unknown" || g === "other") data.gender = "Unknown";
                    }
                    // Strip phone number to raw digits (max 10) in case API returns formatted value
                    if (data.phoneNumber) {
                        data.phoneNumber = String(data.phoneNumber).replace(/\D/g, '').slice(0, 10);
                    }
                    setFormData(data);
                } else {
                    setError("Failed to fetch patient details.");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("An error occurred while fetching patient details.");
            } finally {
                setLoading(false);
            }
        };

        fetchPatientDetails();
    }, [id]);

    const NAME_FIELDS = new Set(["firstName", "lastName", "middleName"]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name } = e.target;
        let { value } = e.target;
        if (NAME_FIELDS.has(name)) {
            value = value.replace(/[^A-Za-z\s\-'.]/g, "");
        }
        if (formData) {
            setFormData({ ...formData, [name]: value });
            if (formErrors[name]) setFormErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !formData) return;

        const errs: Record<string, string> = {};
        if (!formData.firstName?.trim()) errs.firstName = "First name is required";
        else if (!isValidName(formData.firstName)) errs.firstName = "Name must contain only letters";
        if (!formData.lastName?.trim()) errs.lastName = "Last name is required";
        else if (!isValidName(formData.lastName)) errs.lastName = "Name must contain only letters";
        if (formData.middleName?.trim() && !isValidName(formData.middleName)) errs.middleName = "Name must contain only letters";
        if (!formData.phoneNumber?.trim()) errs.phoneNumber = "Mobile number is required";
        else if (!isValidUSPhone(formData.phoneNumber)) errs.phoneNumber = "Must be exactly 10 digits: (xxx) xxx-xxxx";
        if (!formData.email?.trim()) errs.email = "Email is required";
        else if (!isValidEmail(formData.email)) errs.email = "Enter a valid email address";
        if (formData.ssn && formData.ssn.trim() && !isValidSSN(formData.ssn)) errs.ssn = "SSN must be exactly 9 digits";
        if (formData.dateOfBirth) {
            // Parse as local midnight to avoid UTC offset shifting the date
            const dob = new Date(formData.dateOfBirth + "T00:00:00");
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (dob > today) errs.dateOfBirth = "Date of birth cannot be a future date";
        }
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
        setFormErrors({});

        setLoading(true);
        try {
            const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    middleName: formData.middleName || "",
                    lastName: formData.lastName,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    dateOfBirth: formData.dateOfBirth,
                    gender: formData.gender,
                    ssn: formData.ssn,
                    status: formData.status,
                }),
            });

            const result = await res.json();
            if (result.success) {
                router.push(`/patients/${id}`);
            } else {
                setError("Failed to update patient details.");
            }
        } catch (err) {
            console.error("Update error:", err);
            setError("An error occurred while updating patient details.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;
    if (!formData) return <div className="p-6">No patient data found.</div>;

    return (
        <AdminLayout>
            <div className="p-6 bg-[#f9fafb]">
                <h1 className="text-2xl font-bold">Edit Patient</h1>
                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="mb-4">
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName || ""}
                            onChange={handleChange}
                            className={inputCls(formErrors.firstName)}
                            required
                        />
                        {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">Middle Name</label>
                        <input
                            type="text"
                            id="middleName"
                            name="middleName"
                            value={formData.middleName || ""}
                            onChange={handleChange}
                            className={inputCls(formErrors.middleName)}
                        />
                        {formErrors.middleName && <p className="text-xs text-red-500 mt-1">{formErrors.middleName}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName || ""}
                            onChange={handleChange}
                            className={inputCls(formErrors.lastName)}
                            required
                        />
                        {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email || ""}
                            onChange={handleChange}
                            className={inputCls(formErrors.email)}
                            required
                        />
                        {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                            Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            inputMode="numeric"
                            value={formData.phoneNumber || ""}
                            onChange={(e) => {
                                // Only allow digits, strip non-digits, enforce max 10
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                if (formData) setFormData({ ...formData, phoneNumber: digits });
                                if (formErrors.phoneNumber) setFormErrors(prev => { const n = { ...prev }; delete n.phoneNumber; return n; });
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
                                if (formData) setFormData({ ...formData, phoneNumber: pasted });
                            }}
                            onBlur={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                if (formData) setFormData({ ...formData, phoneNumber: digits });
                                if (digits.length > 0 && digits.length < 10) {
                                    setFormErrors(prev => ({ ...prev, phoneNumber: "Must be exactly 10 digits: (xxx) xxx-xxxx" }));
                                } else if (digits.length > 10) {
                                    setFormErrors(prev => ({ ...prev, phoneNumber: "Must be exactly 10 digits: (xxx) xxx-xxxx" }));
                                }
                            }}
                            onKeyDown={(e) => {
                                // Allow control keys but block non-digit character input
                                if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                                    e.preventDefault();
                                }
                                // Block further digit input when already at 10 digits
                                const currentDigits = (formData.phoneNumber || '').replace(/\D/g, '');
                                if (currentDigits.length >= 10 && /\d/.test(e.key) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete') {
                                    e.preventDefault();
                                }
                            }}
                            placeholder="(xxx) xxx-xxxx"
                            maxLength={10}
                            className={inputCls(formErrors.phoneNumber)}
                            required
                        />
                        {formErrors.phoneNumber
                            ? <p className="text-xs text-red-500 mt-1">{formErrors.phoneNumber}</p>
                            : <p className="text-xs text-gray-500 mt-1">US format: (xxx) xxx-xxxx — exactly 10 digits</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <DateInput
                            id="dateOfBirth"
                            name="dateOfBirth"
                            value={formData.dateOfBirth || ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                const today = new Date().toISOString().split("T")[0];
                                if (val && val > today) {
                                    setFormErrors(prev => ({ ...prev, dateOfBirth: "Date of birth cannot be a future date" }));
                                    return; // Block future date from being set
                                }
                                setFormData(prev => prev ? { ...prev, dateOfBirth: val } : prev);
                                setFormErrors(prev => { const n = { ...prev }; delete n.dateOfBirth; return n; });
                            }}
                            max={new Date().toISOString().split("T")[0]}
                            className={inputCls(formErrors.dateOfBirth)}
                            required
                        />
                        {formErrors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{formErrors.dateOfBirth}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender || ""}
                            onChange={handleChange}
                            className={inputCls()}
                            required
                        >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status || "Active"}
                            onChange={handleChange}
                            className={inputCls()}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="ssn" className="block text-sm font-medium text-gray-700">SSN</label>
                        <input
                            type="text"
                            id="ssn"
                            name="ssn"
                            value={formData.ssn || ""}
                            onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                if (formData) setFormData({ ...formData, ssn: digits });
                                if (formErrors.ssn) setFormErrors(prev => { const n = { ...prev }; delete n.ssn; return n; });
                            }}
                            maxLength={11}
                            placeholder="123-45-6789"
                            title="SSN must be exactly 9 digits"
                            className={inputCls(formErrors.ssn)}
                        />
                        {formErrors.ssn
                            ? <p className="text-xs text-red-500 mt-1">{formErrors.ssn}</p>
                            : <p className="text-xs text-gray-500 mt-1">Exactly 9 digits required</p>}
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                        disabled={loading || !canWritePatient}
                        title={!canWritePatient ? "You don't have permission to edit patients" : undefined}
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </form>
            </div>
        </AdminLayout>
    );
}
