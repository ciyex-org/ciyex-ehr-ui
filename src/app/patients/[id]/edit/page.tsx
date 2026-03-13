"use client";
import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { isValidName, isValidPhone, isValidEmail } from "@/utils/validation";
import AdminLayout from "@/app/(admin)/layout";
import { usePermissions } from "@/context/PermissionContext";

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    ssn: string;
    dateOfBirth: string;
    gender: string;
    status: "Active" | "Pending" | "Inactive";
}

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
                    setFormData(result.data);
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (formData) {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !formData) return;

        const errs: Record<string, string> = {};
        if (formData.firstName && !isValidName(formData.firstName)) errs.firstName = "Name must contain only letters";
        if (formData.lastName && !isValidName(formData.lastName)) errs.lastName = "Name must contain only letters";
        if (formData.phoneNumber && !isValidPhone(formData.phoneNumber)) errs.phoneNumber = "Enter a valid phone number";
        if (formData.email && !isValidEmail(formData.email)) errs.email = "Enter a valid email address";
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
        setFormErrors({});

        setLoading(true);
        try {
            const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
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
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName || ""}
                            onChange={handleChange}
                            pattern="[A-Za-z\s\-'.]+"
                            title="Name must contain only letters"
                            className="mt-1 block w-full p-2 border rounded-md"
                            required
                        />
                        {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName || ""}
                            onChange={handleChange}
                            pattern="[A-Za-z\s\-'.]+"
                            title="Name must contain only letters"
                            className="mt-1 block w-full p-2 border rounded-md"
                            required
                        />
                        {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 border rounded-md"
                            required
                        />
                        {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber || ""}
                            onChange={handleChange}
                            pattern="[+]?[\d\s().\-]{7,20}"
                            title="Enter a valid phone number"
                            className="mt-1 block w-full p-2 border rounded-md"
                            required
                        />
                        {formErrors.phoneNumber && <p className="text-xs text-red-500 mt-1">{formErrors.phoneNumber}</p>}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <input
                            type="date"
                            id="dateOfBirth"
                            name="dateOfBirth"
                            value={formData.dateOfBirth || ""}
                            onChange={handleChange}
                            max={new Date().toISOString().split("T")[0]}
                            className="mt-1 block w-full p-2 border rounded-md"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 border rounded-md"
                            required
                        >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Third Gender">Third Gender</option>
                            <option value="Other">Other</option>
                            <option value="Unknown">Unknown</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status || "Active"}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 border rounded-md"
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
                            onChange={handleChange}
                            pattern="\d{3}-?\d{2}-?\d{4}"
                            placeholder="123-45-6789"
                            title="SSN format: 123-45-6789"
                            className="mt-1 block w-full p-2 border rounded-md"
                            required
                        />
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