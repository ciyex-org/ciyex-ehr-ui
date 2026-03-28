"use client";

import { getEnv } from "@/utils/env";
import { useState } from "react";
import Button from "@/components/ui/button/Button";
import PersonalInfo from "@/components/settings/provider-registration/PersonalInfo";
import ProfessionalInfo from "@/components/settings/provider-registration/ProfessionalInfo";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { Modal } from "@/components/ui/modal";
import { isValidEmail, isValidUSPhone, isValidNpi } from "@/utils/validation";

interface ProviderRequestData {
    npi: string;
    identification: {
        firstName: string;
        lastName: string;
        gender: string;
        dateOfBirth: string;
    };
    professionalDetails: {
        licenseNumber: string;
        licenseState: string;
        licenseExpiry: string;
        specialty: string | null;
        providerType: string;
    };
    contact: {
        email: string;
        phoneNumber?: string;
        mobileNumber?: string;
    };
    systemAccess?: {
        status?: string;
    };
}

const ProviderRegistrationForm = () => {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dob: "",
        gender: "",
        phone: "",
        email: "",
        providerType: "",
        specialty: "",
        licenseNumber: "",
        licenseState: "",
        licenseExpiry: "",
        npiNumber: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalError, setModalError] = useState<{
        title: string;
        message: string;
    } | null>(null);

    const router = useRouter();

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") as string; //  ADD THIS LINE

    const validateFields = () => {
        const newErrors: Record<string, string> = {};

        // Validate mandatory fields (all except dob and gender)
        if (!formData.firstName?.trim()) {
            newErrors.firstName = "Please fill out this field";
        }
        if (!formData.lastName?.trim()) {
            newErrors.lastName = "Please fill out this field";
        }
        if (!formData.phone?.trim()) {
            newErrors.phone = "Please fill out this field";
        } else if (!isValidUSPhone(formData.phone)) {
            newErrors.phone = "Mobile number must be exactly 10 digits";
        }
        if (!formData.email?.trim()) {
            newErrors.email = "Please fill out this field";
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }
        if (!formData.specialty?.trim()) {
            newErrors.specialty = "Please fill out this field";
        }
        if (!formData.providerType?.trim()) {
            newErrors.providerType = "Please fill out this field";
        }
        if (!formData.npiNumber?.trim()) {
            newErrors.npiNumber = "Please fill out this field";
        } else if (!isValidNpi(formData.npiNumber)) {
            newErrors.npiNumber = "NPI must be exactly 10 digits";
        }
        if (!formData.licenseNumber?.trim()) {
            newErrors.licenseNumber = "Please fill out this field";
        }
        if (!formData.licenseState?.trim()) {
            newErrors.licenseState = "Please fill out this field";
        }
        if (!formData.licenseExpiry) {
            newErrors.licenseExpiry = "Please fill out this field";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateFields()) {
            return;
        }

        const requestData: ProviderRequestData = {
            npi: formData.npiNumber,
            identification: {
                firstName: (formData as any).firstName || "",
                lastName: formData.lastName,
                gender: formData.gender,
                dateOfBirth: formData.dob,
            },
            professionalDetails: {
                licenseNumber: formData.licenseNumber,
                licenseState: formData.licenseState,
                licenseExpiry: formData.licenseExpiry,
                specialty: formData.specialty || null,
                providerType: formData.providerType,
            },
            contact: {
                email: formData.email,
                phoneNumber: formData.phone,
                mobileNumber: formData.phone, // backend validation requires mobileNumber
            },
            systemAccess: {
                status: "ACTIVE",
            },
        };

        // Quick check: ensure an auth token exists in local/session storage
        const token = typeof window !== "undefined" ? (localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token")) : null;
        if (!token) {
            setModalError({
                title: "Not Signed In",
                message: "You are not signed in. Please sign in and try again.",
            });
            setShowErrorModal(true);
            return;
        }

        try {
            const response = await fetchWithAuth(`${apiUrl}/api/providers`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(requestData),
            });

            let result: unknown = null;
            try {
                result = await response.json();
            } catch (err) {
                console.error("Failed to parse create provider response", err);
            }

            if (response.ok) {
                // Redirect to provider list immediately on success
                router.push("/settings/p/providers");
            } else if (response.status === 401) {
                // Unauthorized — surface clear message
                console.error("Create provider unauthorized", { status: response.status, body: result });
                setModalError({
                    title: "Unauthorized",
                    message: "Your session has expired or you are not signed in. Please sign in and try again.",
                });
                setShowErrorModal(true);
            } else {
                console.error("Create provider failed", { status: response.status, body: result });
                setModalError({
                    title: "Error",
                    message: (result && ((result as any).message || (result as any).error)) || `Save failed (status ${response.status})`,
                });
                setShowErrorModal(true);
            }
        } catch {
            setModalError({
                title: "Error",
                message: "An error occurred while submitting the form.",
            });
            setShowErrorModal(true);
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <div>
            {/* Error Modal */}
            <Modal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                className="max-w-md mx-4"
            >
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-gray-900">
                                {modalError?.title}
                            </h3>
                        </div>
                    </div>
                    <div className="mb-4">
                        <p className="text-sm text-gray-700">
                            {modalError?.message}
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setShowErrorModal(false)}
                        >
                            OK
                        </Button>
                    </div>
                </div>
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                    <PersonalInfo formData={formData} handleChange={handleChange} errors={errors} />
                </div>

                <div className="bg-white p-6 rounded shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
                    <ProfessionalInfo formData={formData} handleChange={handleChange} errors={errors} />
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                <Button size="md" variant="primary" onClick={handleSubmit}>
                    Save
                </Button>
                <span className="mx-2"></span>
                <Button size="md" variant="primary" onClick={handleBack}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};

export default ProviderRegistrationForm;
