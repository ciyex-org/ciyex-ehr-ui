"use client";
import { getEnv } from "@/utils/env";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { isValidName, isValidPhone, isValidEmail } from "@/utils/validation";
import AdminLayout from "@/app/(admin)/layout";

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
    assignedProviderId?: string;
    assignedProviderName?: string;
}

interface ProviderOption {
    id: string;
    name: string;
}

export default function EditPatientPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id ?? "";
    const [formData, setFormData] = useState<Partial<Patient> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [providerSearch, setProviderSearch] = useState("");
    const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
    const [providerLoading, setProviderLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchProviders = useCallback(async (query: string) => {
        setProviderLoading(true);
        try {
            const url = `${getEnv("NEXT_PUBLIC_API_URL")}/api/practitioners?search=${encodeURIComponent(query)}`;
            const res = await fetchWithAuth(url);
            if (res.ok) {
                const result = await res.json();
                const list = result.data?.content || result.data || result.content || [];
                setProviders(
                    (Array.isArray(list) ? list : []).map((p: any) => ({
                        id: String(p.id),
                        name: p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || `Provider ${p.id}`,
                    }))
                );
            }
        } catch { /* ignore */ }
        setProviderLoading(false);
    }, []);

    // Load initial providers list on mount
    useEffect(() => {
        searchProviders("");
    }, [searchProviders]);

    // Debounced provider search
    useEffect(() => {
        if (!providerDropdownOpen) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchProviders(providerSearch);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [providerSearch, providerDropdownOpen, searchProviders]);

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
                    assignedProviderId: formData.assignedProviderId || null,
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
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
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
                    <div className="mb-4 relative">
                        <label htmlFor="assignedProviderId" className="block text-sm font-medium text-gray-700">Assigned Provider</label>
                        <input
                            type="text"
                            autoComplete="off"
                            placeholder="Search providers..."
                            value={providerDropdownOpen ? providerSearch : (providers.find(p => p.id === formData.assignedProviderId)?.name || formData.assignedProviderName || "")}
                            onFocus={() => { setProviderDropdownOpen(true); setProviderSearch(""); }}
                            onChange={(e) => { setProviderSearch(e.target.value); setProviderDropdownOpen(true); }}
                            onBlur={() => setTimeout(() => setProviderDropdownOpen(false), 200)}
                            className="mt-1 block w-full p-2 border rounded-md"
                        />
                        {formData.assignedProviderId && (
                            <button
                                type="button"
                                onClick={() => { if (formData) setFormData({ ...formData, assignedProviderId: undefined, assignedProviderName: undefined }); }}
                                className="absolute right-2 top-8 text-gray-400 hover:text-gray-600 text-sm"
                            >
                                ✕
                            </button>
                        )}
                        {providerDropdownOpen && (
                            <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {providerLoading && (
                                    <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
                                )}
                                {!providerLoading && providers.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            if (formData) setFormData({ ...formData, assignedProviderId: p.id, assignedProviderName: p.name });
                                            setProviderDropdownOpen(false);
                                            setProviderSearch("");
                                        }}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                                {!providerLoading && providers.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-400">No providers found</div>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </form>
            </div>
        </AdminLayout>
    );
}