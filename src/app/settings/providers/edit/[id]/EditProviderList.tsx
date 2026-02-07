"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Button from "@/components/ui/button/Button";
import AdminLayout from "@/app/(admin)/layout";
import Alert from "@/components/ui/alert/Alert";


interface Provider {
    id: number;
    npi: string | null;
    identification:
        | {
        firstName: string | null;
        lastName: string | null;
        dateOfBirth: string | null;
        gender: string | null;
    }
        | null;
    contact:
        | {
        email: string | null;
        phoneNumber: string | null;
    }
        | null;
    professionalDetails:
        | {
        specialty: string | null;
        providerType: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        licenseExpiry: string | null;
    }
        | null;
}

const EditProvider = () => {
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
    //const { id } = useParams();
    const { id } = useParams() as { id: string };

    const router = useRouter();

    const [provider, setProvider] = useState<Provider | null>(null);
    const [, setLoading] = useState(true);
    const [alert, setAlert] = useState<{
        type: "success" | "error" | "warning";
        title: string;
        message: string;
    } | null>(null);

    // unified, lighter input style (no bold values)
    const inputCls =
        "mt-1 h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-normal text-gray-900 " +
        "placeholder:text-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

    useEffect(() => {
        const fetchProvider = async () => {
            try {
                const response = await fetchWithAuth(`${apiUrl}/api/providers/${id}`, { method: "GET" });
                if (response.ok) {
                    const data = await response.json();
                    setProvider(data.data || {});
                } else {
                    setAlert({ type: "error", title: "Error", message: "Failed to fetch provider details." });
                }
            } catch {
                setAlert({ type: "error", title: "Network Error", message: "Please check your connection." });
            } finally {
                setLoading(false);
            }
        };

        fetchProvider();
    }, [id, apiUrl]);

    const handleSaveChanges = async () => {
        if (!provider) return;
        if (!provider.identification?.firstName || !provider.identification?.lastName) {
            setAlert({ type: "warning", title: "Validation Error", message: "Please fill all required fields!" });
            return;
        }

        try {
            const response = await fetchWithAuth(`${apiUrl}/api/providers/${provider.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",   // 👈 added
                },
                body: JSON.stringify(provider),
            });

            const data = await response.json();

            if (response.ok) {
                setAlert({ type: "success", title: "Updated", message: "Provider updated successfully!" });
                router.push("/settings/providers/edit/" + provider.id);
            } else {
                setAlert({
                    type: "error",
                    title: "Update Failed",
                    message: data.message || "Unable to update provider.",
                });
            }
        } catch {
            setAlert({ type: "error", title: "Error", message: "An error occurred while saving." });
        }
    };


    const formattedDob = provider?.identification?.dateOfBirth
        ? new Date(provider.identification.dateOfBirth).toISOString().split("T")[0]
        : "";

    const formattedLicenseExpiry = provider?.professionalDetails?.licenseExpiry
        ? new Date(provider.professionalDetails.licenseExpiry).toISOString().split("T")[0]
        : "";

    return (
        <AdminLayout>
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                {/* Card */}
                <div className="w-full max-w-5xl bg-white p-8 rounded-xl shadow-sm min-h-[calc(100vh-120px)] flex flex-col justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Edit Provider</h1>

                        {alert && (
                            <div className="mb-4">
                                <Alert variant={alert.type} title={alert.title} message={alert.message} />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Info */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    value={provider?.identification?.firstName || ""}
                                    onChange={(e) =>
                                        setProvider({
                                            ...provider!,
                                            identification: {
                                                ...provider!.identification!,
                                                firstName: e.target.value || null,
                                            },
                                        })
                                    }
                                    className={inputCls}
                                    placeholder="Enter first name"
                                />

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                    <input
                                        type="text"
                                        value={provider?.identification?.lastName || ""}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                identification: {
                                                    ...provider!.identification!,
                                                    lastName: e.target.value || null,
                                                },
                                            })
                                        }
                                        className={inputCls}
                                        placeholder="Enter last name"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={formattedDob}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                identification: {
                                                    ...provider!.identification!,
                                                    dateOfBirth: e.target.value || null,
                                                },
                                            })
                                        }
                                        className={inputCls}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                                    <select
                                        value={provider?.identification?.gender || ""}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                identification: {
                                                    ...provider!.identification!,
                                                    gender: e.target.value || null,
                                                },
                                            })
                                        }
                                        className={inputCls}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>


                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input
                                        type="text"
                                        value={provider?.contact?.phoneNumber || ""}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                contact: { ...provider!.contact!, phoneNumber: e.target.value || null },
                                            })
                                        }
                                        className={inputCls}
                                        placeholder="+1 555 123 4567"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={provider?.contact?.email || ""}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                contact: { ...provider!.contact!, email: e.target.value || null },
                                            })
                                        }
                                        className={inputCls}
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>



                            {/* Professional Info */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Specialty</label>
                                <input
                                    type="text"
                                    value={provider?.professionalDetails?.specialty || ""}
                                    onChange={(e) =>
                                        setProvider({
                                            ...provider!,
                                            professionalDetails: {
                                                ...provider!.professionalDetails!,
                                                specialty: e.target.value || null,
                                            },
                                        })
                                    }
                                    className={inputCls}
                                    placeholder="e.g., Cardiology"
                                />

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">NPI Number</label>
                                    <input
                                        type="text"
                                        value={provider?.npi || ""}
                                        onChange={(e) => setProvider({ ...provider!, npi: e.target.value || null })}
                                        className={inputCls}
                                        placeholder="Enter NPI"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Provider Type</label>
                                    <input
                                        type="text"
                                        value={provider?.professionalDetails?.providerType || ""}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                professionalDetails: {
                                                    ...provider!.professionalDetails!,
                                                    providerType: e.target.value || null,
                                                },
                                            })
                                        }
                                        className={inputCls}
                                        placeholder="e.g., MD, Dentist"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                                    <input
                                        type="text"
                                        value={provider?.professionalDetails?.licenseNumber || ""}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                professionalDetails: {
                                                    ...provider!.professionalDetails!,
                                                    licenseNumber: e.target.value || null,
                                                },
                                            })
                                        }
                                        className={inputCls}
                                        placeholder="Enter license number"
                                    />
                                </div>


                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">License Expiry</label>
                                    <input
                                        type="date"
                                        value={formattedLicenseExpiry}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                professionalDetails: {
                                                    ...provider!.professionalDetails!,
                                                    licenseExpiry: e.target.value || null,
                                                },
                                            })
                                        }
                                        className={inputCls}
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">License State</label>
                                    <input
                                        type="text"
                                        value={provider?.professionalDetails?.licenseState || ""}
                                        onChange={(e) =>
                                            setProvider({
                                                ...provider!,
                                                professionalDetails: {
                                                    ...provider!.professionalDetails!,
                                                    licenseState: e.target.value || null,
                                                },
                                            })
                                        }
                                        className={inputCls}
                                        placeholder="e.g., US, CA"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                        <Button variant="primary" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveChanges}>Update</Button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default EditProvider;
