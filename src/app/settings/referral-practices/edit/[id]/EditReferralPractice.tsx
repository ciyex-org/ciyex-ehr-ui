"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";

interface FormData {
    name: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    npiId: string;
    taxId: string;
}

const EditReferralPractice = ({ id }: { id: string }) => {
    const router = useRouter();
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");

    const [formData, setFormData] = useState<FormData>({
        name: "",
        email: "",
        phoneNumber: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        npiId: "",
        taxId: "",
    });

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchReferralPractice();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchReferralPractice = async () => {
        if (!id) {
            setError("Invalid practice ID");
            setFetchLoading(false);
            return;
        }
        
        try {
            setFetchLoading(true);
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-practices/${id}`
            );

            if (response.ok) {
                const data = await response.json();
                console.log("📦 Fetch Practice Response:", data);
                
                // Handle different response structures
                let practiceData = null;
                
                if (data?.data) {
                    practiceData = data.data;
                } else if (data?.id) {
                    practiceData = data;
                }
                
                if (practiceData) {
                    setFormData({
                        name: practiceData.name || "",
                        email: practiceData.email || "",
                        phoneNumber: practiceData.phoneNumber || "",
                        address: practiceData.address || "",
                        city: practiceData.city || "",
                        state: practiceData.state || "",
                        postalCode: practiceData.postalCode || "",
                        country: practiceData.country || "",
                        npiId: practiceData.npiId || "",
                        taxId: practiceData.taxId || "",
                    });
                } else {
                    setError("Referral practice not found");
                }
            } else {
                setError("Failed to fetch referral practice");
            }
        } catch (err) {
            console.error("Error fetching referral practice:", err);
            setError("Error fetching referral practice");
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation
        if (!formData.name) {
            setError("Practice name is required");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                name: formData.name,
                email: formData.email || null,
                phoneNumber: formData.phoneNumber || null,
                address: formData.address || null,
                city: formData.city || null,
                state: formData.state || null,
                postalCode: formData.postalCode || null,
                country: formData.country || null,
                npiId: formData.npiId || null,
                taxId: formData.taxId || null,
            };

            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-practices/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            console.log("📤 Update Response:", response.status);

            if (response.ok) {
                setSuccess("Referral practice updated successfully!");
                setTimeout(() => {
                    router.push("/settings/referral-practices");
                }, 1500);
            } else {
                const data = await response.json();
                setError(data.message || "Failed to update referral practice");
            }
        } catch (err) {
            console.error("Error updating referral practice:", err);
            setError("Error updating referral practice. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-full py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                            Edit Referral Practice
                        </h1>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push("/settings/referral-practices")}
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
                                        Practice Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter practice name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
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
                                        placeholder="practice@example.com"
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
                                onClick={() => router.push("/settings/referral-practices")}
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
                                {loading ? "Updating..." : "Update Practice"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default EditReferralPractice;
