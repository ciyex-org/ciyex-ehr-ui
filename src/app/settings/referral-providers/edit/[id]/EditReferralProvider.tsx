"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";

interface Practice {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

interface FormData {
    name: string;
    practiceId: string;
    specialty: string;
    phoneNumber: string;
    email: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    npiId: string;
    taxId: string;
}

const EditReferralProvider = ({ id }: { id: string }) => {
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    const [formData, setFormData] = useState<FormData>({
        name: "",
        practiceId: "",
        specialty: "",
        phoneNumber: "",
        email: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        npiId: "",
        taxId: "",
    });

    const [practices, setPractices] = useState<Practice[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchPractices();
        fetchReferralProvider();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchPractices = async () => {
        try {
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-practices`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" },
                }
            );

            if (response.ok) {
                const data = await response.json();
                let practicesData = [];

                if (Array.isArray(data)) {
                    practicesData = data;
                } else if (data?.data && Array.isArray(data.data)) {
                    practicesData = data.data;
                }

                setPractices(practicesData);
            }
        } catch (err) {
            console.error("Error fetching practices:", err);
        }
    };

    const fetchReferralProvider = async () => {
        if (!id) {
            setError("Invalid provider ID");
            setFetchLoading(false);
            return;
        }
        
        try {
            setFetchLoading(true);
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-providers/${id}`
            );

            if (response.ok) {
                const responseData = await response.json();
                console.log("📦 Fetch Provider Response:", responseData);
                
                // Handle wrapped response structure
                const providerData = responseData.data || responseData;
                
                if (providerData && providerData.id) {
                    // Extract practiceId from various possible structures
                    let extractedPracticeId = "";
                    if (providerData.practiceId) {
                        extractedPracticeId = providerData.practiceId.toString();
                    } else if (providerData.practice?.id) {
                        extractedPracticeId = providerData.practice.id.toString();
                    } else if (providerData.referralPractice?.id) {
                        extractedPracticeId = providerData.referralPractice.id.toString();
                    }
                    
                    setFormData({
                        name: providerData.name || "",
                        practiceId: extractedPracticeId,
                        specialty: providerData.specialty || "",
                        phoneNumber: providerData.phoneNumber || "",
                        email: providerData.email || "",
                        address: providerData.address || "",
                        city: providerData.city || "",
                        state: providerData.state || "",
                        postalCode: providerData.postalCode || "",
                        country: providerData.country || "",
                        npiId: providerData.npiId || "",
                        taxId: providerData.taxId || "",
                    });
                } else {
                    setError("Referral provider not found");
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.message || "Failed to fetch referral provider");
            }
        } catch (err) {
            console.error("Error fetching referral provider:", err);
            setError("Error fetching referral provider");
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        
        if (name === "practiceId" && value) {
            const selectedPractice = practices.find(p => p.id.toString() === value);
            if (selectedPractice) {
                setFormData((prev) => ({
                    ...prev,
                    [name]: value,
                    address: selectedPractice.address || "",
                    city: selectedPractice.city || "",
                    state: selectedPractice.state || "",
                    postalCode: selectedPractice.postalCode || "",
                    country: selectedPractice.country || "",
                }));
                return;
            }
        }
        
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const payload = {
                name: formData.name,
                email: formData.email || null,
                phoneNumber: formData.phoneNumber || null,
                specialty: formData.specialty || null,
                address: formData.address || null,
                city: formData.city || null,
                state: formData.state || null,
                postalCode: formData.postalCode || null,
                country: formData.country || null,
                npiId: formData.npiId || null,
                taxId: formData.taxId || null,
                practice: {
                    id: parseInt(formData.practiceId)
                }
            };

            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-providers/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();
            console.log("📤 Update Response:", data);

            if (response.ok) {
                setSuccess("Referral provider updated successfully!");
                setTimeout(() => {
                    router.push("/settings/referral-providers");
                }, 1500);
            } else {
                setError(data.message || "Failed to update referral provider");
            }
        } catch (err) {
            console.error("Error updating referral provider:", err);
            setError("Error updating referral provider. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-full">
                    <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 border-solid border-gray-200 rounded-full text-gray-800"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="container mx-auto p-6 max-w-5xl">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-semibold text-gray-800">
                            Edit Referral Provider
                        </h1>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push("/settings/referral-providers")}
                        >
                            Back to List
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                                Basic Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Provider Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter provider full name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Practice *
                                    </label>
                                    <select
                                        name="practiceId"
                                        value={formData.practiceId}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    >
                                        <option value="">Select Practice</option>
                                        {practices.map((practice) => (
                                            <option key={practice.id} value={practice.id}>
                                                {practice.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Specialty
                                    </label>
                                    <input
                                        type="text"
                                        name="specialty"
                                        value={formData.specialty}
                                        onChange={handleChange}
                                        placeholder="e.g., Cardiology"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        placeholder="(555) 123-4567"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="provider@example.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        NPI ID
                                    </label>
                                    <input
                                        type="text"
                                        name="npiId"
                                        value={formData.npiId}
                                        onChange={handleChange}
                                        placeholder="1234567890"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tax ID
                                    </label>
                                    <input
                                        type="text"
                                        name="taxId"
                                        value={formData.taxId}
                                        onChange={handleChange}
                                        placeholder="12-3456789"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address Information */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                                Address Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Street Address
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="123 Main Street"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="New York"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="NY"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Postal Code
                                    </label>
                                    <input
                                        type="text"
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        placeholder="10001"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        placeholder="United States"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                size="md"
                                variant="outline"
                                onClick={() => router.push("/settings/referral-providers")}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="md"
                                variant="primary"
                                disabled={loading}
                            >
                                {loading ? "Updating..." : "Update Provider"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default EditReferralProvider;
