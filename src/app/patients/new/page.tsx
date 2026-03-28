"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { isValidName, isValidPhone, isValidEmail, isValidUSPhone, formatUSPhone, isValidSSN } from "@/utils/validation";
import { usePermissions } from "@/context/PermissionContext";
import { toast } from "@/utils/toast";
import DateInput from "@/components/ui/DateInput";

// Define interfaces for your form data structure
interface PersonalInfo {
    firstName: string;
    lastName: string;
    mi: string;
    suffix: string;
    dob: string;
    gender: string;
    status: string;
    maritalStatus: string;
    siblings: string;
    ethnicity: string;
    additionalRace: string;
    communicationPreference: string;
    category: string;
    referringPhysician: string;
    primaryCarePhysician: string;
    ptssn: string;
    language: string;
    publicityCode: string;
    immunizationRegistryId: string;
}
interface Contact {
    name: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    country: string;
    cellPhone: string;
    email: string;
    relation?: string;
}
interface ContactInfo {
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    homePhone: string;
    fax: string;
    cellPhone: string;
    email: string;
    additionalContacts: Contact[];
    emergencyContact: Contact & { relation: string };
}
interface Preferences {
    pharmacy: string;
    erxPharmacy: string;
    labCenter: string;
    radiologyCenter: string;
    serviceLocation: string;
}
interface PatientNetwork {
    enterpriseMasterPatientIndexId: string;
    regionalPatientIdentifier: string;
    nationalPatientIdentifier: string;
    vfcEligibility: string;
    patientClass: string;
    shareNonPHIData: boolean;
}
interface EmployerInfo {
    name: string;
    address1: string;
    address2: string;
    status: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    workPhone: string;
    cellPhone: string;
    email: string;
}
interface Guarantor {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    fax: string;
    dob: string;
    relation: string;
    country: string;
    cell: string;
    email: string;
    sex: string;
}
interface Insurance {
    carrier: string;
    category?: string;
    receiver?: string;
    emrInsuranceId?: string;
    programPlanType?: string;
    incentiveType?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    plan: string;
    idNo: string;
    copay: string;
    capitationAgreement?: boolean;
    doNotBalanceBill?: boolean;
    notes?: string;
    effectiveDate: string;
    endDate: string;
    groupNumber: string;
    policyNo: string;
    subscriber: string;
    guarantor: Guarantor;
}
interface InsuranceInfo {
    primary: Insurance;
    secondary: Insurance;
    tertiary: Omit<Insurance, 'category' | 'receiver' | 'emrInsuranceId' | 'programPlanType' | 'incentiveType' | 'capitationAgreement' | 'doNotBalanceBill' | 'notes'>;
}
interface PatientFormData {
    personalInfo: PersonalInfo;
    contactInfo: ContactInfo;
    preferences: Preferences;
    patientNetwork: PatientNetwork;
    employerInfo: EmployerInfo;
    insurance: InsuranceInfo;
}

export default function AddPatient() {
    const router = useRouter();
    const { canWriteResource } = usePermissions();
    const canWritePatient = canWriteResource("Patient");
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState<PatientFormData>({
        // Personal Information
        personalInfo: {
            firstName: "",
            lastName: "",
            mi: "",
            suffix: "",
            dob: "",
            gender: "",
            status: "Active",
            maritalStatus: "",
            siblings: "",
            ethnicity: "",
            additionalRace: "",
            communicationPreference: "",
            category: "",
            referringPhysician: "",
            primaryCarePhysician: "",
            ptssn: "",
            language: "",
            publicityCode: "",
            immunizationRegistryId: "",
        },
        // Contact Information
        contactInfo: {
            address1: "",
            address2: "",
            city: "",
            state: "",
            zip: "",
            country: "USA",
            homePhone: "",
            fax: "",
            cellPhone: "",
            email: "",
            additionalContacts: [{
                name: "",
                address1: "",
                address2: "",
                city: "",
                state: "",
                country: "USA",
                cellPhone: "",
                email: "",
            }],
            emergencyContact: {
                name: "",
                address1: "",
                address2: "",
                city: "",
                state: "",
                country: "USA",
                cellPhone: "",
                email: "",
                relation: "",
            }
        },
        // Preferences
        preferences: {
            pharmacy: "",
            erxPharmacy: "",
            labCenter: "",
            radiologyCenter: "",
            serviceLocation: "",
        },
        // Patient Network
        patientNetwork: {
            enterpriseMasterPatientIndexId: "",
            regionalPatientIdentifier: "",
            nationalPatientIdentifier: "",
            vfcEligibility: "",
            patientClass: "",
            shareNonPHIData: false,
        },
        // Employer Information
        employerInfo: {
            name: "",
            address1: "",
            address2: "",
            status: "",
            city: "",
            state: "",
            zip: "",
            country: "USA",
            workPhone: "",
            cellPhone: "",
            email: "",
        },
        // Insurance
        insurance: {
            primary: {
                carrier: "",
                category: "",
                receiver: "",
                emrInsuranceId: "",
                programPlanType: "",
                incentiveType: "",
                address: "",
                city: "",
                state: "",
                zip: "",
                phone: "",
                plan: "",
                idNo: "",
                copay: "",
                capitationAgreement: false,
                doNotBalanceBill: false,
                notes: "",
                effectiveDate: "",
                endDate: "",
                groupNumber: "",
                policyNo: "",
                subscriber: "",
                guarantor: {
                    name: "",
                    address: "",
                    city: "",
                    state: "",
                    zip: "",
                    phone: "",
                    fax: "",
                    dob: "",
                    relation: "",
                    country: "USA",
                    cell: "",
                    email: "",
                    sex: ""
                }
            },
            secondary: {
                carrier: "",
                category: "",
                receiver: "",
                emrInsuranceId: "",
                programPlanType: "",
                incentiveType: "",
                address: "",
                city: "",
                state: "",
                zip: "",
                phone: "",
                plan: "",
                idNo: "",
                copay: "",
                effectiveDate: "",
                endDate: "",
                groupNumber: "",
                policyNo: "",
                subscriber: "",
                guarantor: {
                    name: "",
                    address: "",
                    city: "",
                    state: "",
                    zip: "",
                    phone: "",
                    fax: "",
                    dob: "",
                    relation: "",
                    country: "USA",
                    cell: "",
                    email: "",
                    sex: ""
                }
            },
            tertiary: {
                carrier: "",
                address: "",
                city: "",
                state: "",
                zip: "",
                phone: "",
                plan: "",
                idNo: "",
                copay: "",
                effectiveDate: "",
                endDate: "",
                groupNumber: "",
                policyNo: "",
                subscriber: "",
                guarantor: {
                    name: "",
                    address: "",
                    city: "",
                    state: "",
                    zip: "",
                    phone: "",
                    fax: "",
                    dob: "",
                    relation: "",
                    country: "USA",
                    cell: "",
                    email: "",
                    sex: ""
                }
            }
        }
    });
    const [isSubmitting, setIsSubmitting] = useState(false); // Manage submission state
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleChange = <K extends keyof PatientFormData>(
        section: K,
        field: keyof PatientFormData[K],
        value: string | boolean
    ) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleNestedChange = <
        K1 extends keyof PatientFormData,
        K2 extends keyof PatientFormData[K1]
    >(
        section: K1,
        subSection: K2,
        field: keyof PatientFormData[K1][K2],
        value: string | boolean
    ) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [subSection]: {
                    ...(prev[section][subSection] as object),
                    [field]: value
                }
            }
        }));
    };

    const handleDeepNestedChange = <
        K1 extends keyof PatientFormData,
        K2 extends keyof PatientFormData[K1],
        K3 extends keyof PatientFormData[K1][K2]
    >(
        section: K1,
        subSection: K2,
        subSubSection: K3,
        field: keyof PatientFormData[K1][K2][K3],
        value: string | boolean
    ) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [subSection]: {
                    ...prev[section][subSection],
                    [subSubSection]: {
                        ...(prev[section][subSection][subSubSection] as object),
                        [field]: value
                    }
                }
            }
        }));
    };

    const handleArrayChange = (
        path: string,
        index: number,
        field: string,
        value: string
    ) => {
        setFormData(prev => {
            // Create a deep copy safely
            const newState: PatientFormData = JSON.parse(JSON.stringify(prev));
            const pathParts = path.split('.');

            // Start with the root object
            let current: unknown = newState;

            // Traverse the path except the last part
            for (let i = 0; i < pathParts.length - 1; i++) {
                const key = pathParts[i];
                if (typeof current === 'object' && current !== null && key in current) {
                    current = (current as Record<string, unknown>)[key];
                } else {
                    console.error(`Invalid path ${path}`);
                    return prev;
                }
            }

            // Get the array property
            const lastKey = pathParts[pathParts.length - 1];
            if (typeof current === 'object' && current !== null && lastKey in current) {
                const array = (current as Record<string, unknown>)[lastKey];
                if (!Array.isArray(array)) {
                    console.error(`Path ${path} does not lead to an array`);
                    return prev;
                }

                // Update the array
                const newArray = [...array];
                newArray[index] = {
                    ...newArray[index],
                    [field]: value
                };
                (current as Record<string, unknown>)[lastKey] = newArray;
            }

            return newState;
        });
    };



    const addAdditionalContact = () => {
        setFormData(prev => ({
            ...prev,
            contactInfo: {
                ...prev.contactInfo,
                additionalContacts: [
                    ...prev.contactInfo.additionalContacts,
                    {
                        name: "",
                        address1: "",
                        address2: "",
                        city: "",
                        state: "",
                        country: "USA",
                        cellPhone: "",
                        email: "",
                    }
                ]
            }
        }));
    };

    const removeAdditionalContact = (index: number) => {
        setFormData(prev => ({
            ...prev,
            contactInfo: {
                ...prev.contactInfo,
                additionalContacts: prev.contactInfo.additionalContacts.filter((_, i) => i !== index)
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        const errs: Record<string, string> = {};
        if (formData.personalInfo.firstName && !isValidName(formData.personalInfo.firstName)) errs.firstName = "Name must contain only letters";
        if (formData.personalInfo.lastName && !isValidName(formData.personalInfo.lastName)) errs.lastName = "Name must contain only letters";
        if (!formData.contactInfo.cellPhone) errs.cellPhone = "Mobile number is required";
        else if (!isValidUSPhone(formData.contactInfo.cellPhone)) errs.cellPhone = "Enter a valid 10-digit US phone number";
        if (formData.contactInfo.homePhone && !isValidUSPhone(formData.contactInfo.homePhone)) errs.homePhone = "Enter a valid 10-digit US phone number";
        if (!formData.contactInfo.email?.trim()) errs.email = "Email is required";
        else if (!isValidEmail(formData.contactInfo.email)) errs.email = "Enter a valid email address";
        if (formData.personalInfo.ptssn && formData.personalInfo.ptssn.trim() && !isValidSSN(formData.personalInfo.ptssn)) errs.ptssn = "SSN must be exactly 9 digits";
        // Validate DOB is present and not in the future
        if (!formData.personalInfo.dob) {
            errs.dob = "Date of birth is required";
        } else {
            // Parse as local midnight to avoid UTC offset shifting the date
            const dobDate = new Date(formData.personalInfo.dob + "T00:00:00");
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dobDate > today) errs.dob = "Date of birth cannot be a future date";
        }
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
        setFormErrors({});

        setIsSubmitting(true);
        try {
            // Map form data to generic FHIR demographics field keys
            const fhirPayload: Record<string, unknown> = {
                firstName: formData.personalInfo.firstName,
                lastName: formData.personalInfo.lastName,
                middleName: formData.personalInfo.mi,
                suffix: formData.personalInfo.suffix,
                dateOfBirth: formData.personalInfo.dob,
                gender: formData.personalInfo.gender,
                maritalStatus: formData.personalInfo.maritalStatus,
                ethnicity: formData.personalInfo.ethnicity,
                language: formData.personalInfo.language,
                ssn: formData.personalInfo.ptssn,
                phoneNumber: formData.contactInfo.cellPhone || formData.contactInfo.homePhone,
                homePhone: formData.contactInfo.homePhone,
                email: formData.contactInfo.email,
                occupation: formData.employerInfo.status ? formData.employerInfo.status : undefined,
                employerName: formData.employerInfo.name,
                employerAddress: [formData.employerInfo.address1, formData.employerInfo.address2, formData.employerInfo.city, formData.employerInfo.state, formData.employerInfo.zip].filter(Boolean).join(", "),
                // Ensure patient is active by default and has an MRN
                status: formData.personalInfo.status || "Active",
                medicalRecordNumber: "MRN-" + Date.now(),
            };
            // Remove undefined/empty values AND any id-like fields to prevent HAPI-1396 update errors
            Object.keys(fhirPayload).forEach(key => {
                if (fhirPayload[key] === undefined || fhirPayload[key] === "") delete fhirPayload[key];
            });
            // Explicitly remove id fields that could cause FHIR server to treat this as an update
            delete fhirPayload.id;
            delete fhirPayload.fhirId;
            delete fhirPayload.resourceId;

            const apiBase = getEnv("NEXT_PUBLIC_API_URL");

            // Try the direct patients endpoint first (avoids FHIR update-vs-create confusion),
            // then fall back to the FHIR demographics endpoint
            let response: Response | null = null;
            let data: any = null;

            try {
                response = await fetchWithAuth(
                    `${apiBase}/api/patients`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(fhirPayload),
                    }
                );
                if (response.ok) {
                    data = await response.json();
                }
            } catch { /* fall through to FHIR endpoint */ }

            // Fallback to FHIR demographics endpoint if /api/patients failed or returned error
            if (!data || !response?.ok) {
                response = await fetchWithAuth(
                    `${apiBase}/api/fhir-resource/demographics`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(fhirPayload),
                    }
                );

                if (!response.ok) {
                    const text = await response.text();
                    const lower = text.toLowerCase();
                    if (response.status === 409 || lower.includes('already exists') || lower.includes('duplicate') || lower.includes('exists with same email')) {
                        throw new Error('A patient with this email already exists. Please use a different email address.');
                    }
                    if (lower.includes('hapi-1396') || lower.includes('no id supplied')) {
                        throw new Error('Unable to create patient record. Please contact your administrator to verify the FHIR server configuration.');
                    }
                    throw new Error('Failed to create patient. Please check your information and try again.');
                }
                data = await response.json();
            }

            const patientId = data?.data?.fhirId || data?.data?.id || data?.id;

            if (patientId) {
                // Redirect to patient demographics to add more details
                router.push(`/patients/${patientId}`);
            } else {
                router.push('/patients');
            }
        } catch (error: unknown) {
            console.error('Error creating patient:', error);
            const message = error instanceof Error
                ? error.message
                : 'Failed to create patient. Please try again.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        "Personal Information",
        "Contact Information",
        "Preferences",
        "Patient Network",
        "Employer Information",
        "Insurance"
    ];





    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6">Add New Patient</h1>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                    {tabs.map((tab, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveTab(index)}
                            className={`py-3 px-6 font-medium text-sm whitespace-nowrap focus:outline-none ${
                                activeTab === index
                                    ? "border-b-2 border-blue-500 text-blue-600" // Active tab color
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information Tab */}
                    {activeTab === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Basic Information</h2>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name*</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.firstName}
                                        onChange={(e) => handleChange("personalInfo", "firstName", e.target.value)}
                                        pattern="[A-Za-z\s\-'.]+"
                                        title="Name must contain only letters"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name*</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.lastName}
                                        onChange={(e) => handleChange("personalInfo", "lastName", e.target.value)}
                                        pattern="[A-Za-z\s\-'.]+"
                                        title="Name must contain only letters"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                                        <input
                                            type="text"
                                            value={formData.personalInfo.mi}
                                            onChange={(e) => handleChange("personalInfo", "mi", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                                        <select
                                            value={formData.personalInfo.suffix}
                                            onChange={(e) => handleChange("personalInfo", "suffix", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select</option>
                                            <option value="Jr">Jr</option>
                                            <option value="Sr">Sr</option>
                                            <option value="II">II</option>
                                            <option value="III">III</option>
                                            <option value="IV">IV</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth*</label>
                                    <DateInput
                                        value={formData.personalInfo.dob}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const today = new Date().toISOString().split("T")[0];
                                            if (val && val > today) {
                                                setFormErrors(prev => ({ ...prev, dob: "Date of birth cannot be a future date" }));
                                                handleChange("personalInfo", "dob", "");
                                                return;
                                            }
                                            handleChange("personalInfo", "dob", val);
                                            setFormErrors(prev => { const n = { ...prev }; delete n.dob; return n; });
                                        }}
                                        max={new Date().toISOString().split("T")[0]}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${formErrors.dob ? "border-red-500" : "border-gray-300"}`}
                                        required
                                    />
                                    {formErrors.dob && <p className="text-xs text-red-500 mt-1">{formErrors.dob}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender*</label>
                                    <select
                                        value={formData.personalInfo.gender}
                                        onChange={(e) => handleChange("personalInfo", "gender", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                                    <select
                                        value={formData.personalInfo.maritalStatus}
                                        onChange={(e) => handleChange("personalInfo", "maritalStatus", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Siblings</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.siblings}
                                        onChange={(e) => handleChange("personalInfo", "siblings", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Additional Information</h2>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ethnicity</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.ethnicity}
                                        onChange={(e) => handleChange("personalInfo", "ethnicity", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Race</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.additionalRace}
                                        onChange={(e) => handleChange("personalInfo", "additionalRace", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Communication Preference</label>
                                    <select
                                        value={formData.personalInfo.communicationPreference}
                                        onChange={(e) => handleChange("personalInfo", "communicationPreference", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select</option>
                                        <option value="Phone">Phone</option>
                                        <option value="Email">Email</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Mail">Mail</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category (Primary Care)</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.category}
                                        onChange={(e) => handleChange("personalInfo", "category", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Referring Physician</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.referringPhysician}
                                        onChange={(e) => handleChange("personalInfo", "referringPhysician", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Care Physician</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.primaryCarePhysician}
                                        onChange={(e) => handleChange("personalInfo", "primaryCarePhysician", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SSN</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.ptssn}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                            handleChange("personalInfo", "ptssn", digits);
                                        }}
                                        maxLength={9}
                                        placeholder="123456789"
                                        title="SSN must be exactly 9 digits"
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${formErrors.ptssn ? "border-red-400" : "border-gray-300"}`}
                                    />
                                    {formErrors.ptssn
                                        ? <p className="text-xs text-red-500 mt-1">{formErrors.ptssn}</p>
                                        : <p className="text-xs text-gray-500 mt-1">Exactly 9 digits required</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.language}
                                        onChange={(e) => handleChange("personalInfo", "language", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Publicity Code/Set</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.publicityCode}
                                        onChange={(e) => handleChange("personalInfo", "publicityCode", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Immunization Registry ID</label>
                                    <input
                                        type="text"
                                        value={formData.personalInfo.immunizationRegistryId}
                                        onChange={(e) => handleChange("personalInfo", "immunizationRegistryId", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contact Information Tab */}
                    {activeTab === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Primary Address</h2>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1*</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.address1}
                                            onChange={(e) => handleChange("contactInfo", "address1", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.address2}
                                            onChange={(e) => handleChange("contactInfo", "address2", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City*</label>
                                            <input
                                                type="text"
                                                value={formData.contactInfo.city}
                                                onChange={(e) => handleChange("contactInfo", "city", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">State*</label>
                                            <input
                                                type="text"
                                                value={formData.contactInfo.state}
                                                onChange={(e) => handleChange("contactInfo", "state", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code*</label>
                                            <input
                                                type="text"
                                                value={formData.contactInfo.zip}
                                                onChange={(e) => handleChange("contactInfo", "zip", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                            <input
                                                type="text"
                                                value={formData.contactInfo.country}
                                                onChange={(e) => handleChange("contactInfo", "country", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Contact Details</h2>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Home Phone*</label>
                                        <div className="flex">
                                            <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                <option>US +1</option>
                                            </select>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.contactInfo.homePhone}
                                                onChange={(e) => handleChange("contactInfo", "homePhone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className={`flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${formErrors.homePhone ? "border-red-400" : ""}`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                                        <input
                                            type="tel"
                                            value={formData.contactInfo.fax}
                                            onChange={(e) => handleChange("contactInfo", "fax", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone <span className="text-red-500">*</span></label>
                                        <div className="flex">
                                            <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                <option>US +1</option>
                                            </select>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.contactInfo.cellPhone}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, "");
                                                    if (digits.length > 10) {
                                                        setFormErrors(prev => ({ ...prev, cellPhone: "Phone number cannot exceed 10 digits" }));
                                                        return;
                                                    }
                                                    handleChange("contactInfo", "cellPhone", formatUSPhone(e.target.value));
                                                    if (digits.length === 10) {
                                                        setFormErrors(prev => { const n = { ...prev }; delete n.cellPhone; return n; });
                                                    }
                                                }}
                                                maxLength={14}
                                                title="Enter a valid 10-digit US phone number"
                                                className={`flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${formErrors.cellPhone ? "border-red-400" : ""}`}
                                            />
                                        </div>
                                        {formErrors.cellPhone && <p className="text-xs text-red-500 mt-1">{formErrors.cellPhone}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                                        <input
                                            type="email"
                                            value={formData.contactInfo.email}
                                            onChange={(e) => handleChange("contactInfo", "email", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                        {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Additional Contacts */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-700">Additional Contacts</h2>
                                    <button
                                        type="button"
                                        onClick={addAdditionalContact}
                                        className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-md hover:bg-blue-100"
                                    >
                                        + Add Contact
                                    </button>
                                </div>
                                {formData.contactInfo.additionalContacts.map((contact, index) => (
                                    <div key={index} className="border border-gray-200 rounded-md p-4 space-y-4">
                                        <div className="flex justify-between">
                                            <h3 className="text-sm font-medium text-gray-700">Contact {index + 1}</h3>
                                            <button
                                                type="button"
                                                onClick={() => removeAdditionalContact(index)}
                                                className="text-red-500 text-sm hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={contact.name}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "name", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={contact.email}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "email", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                                <input
                                                    type="text"
                                                    value={contact.address1}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "address1", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                                <input
                                                    type="text"
                                                    value={contact.address2}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "address2", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                                <input
                                                    type="text"
                                                    value={contact.city}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "city", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                                <input
                                                    type="text"
                                                    value={contact.state}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "state", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                                <input
                                                    type="text"
                                                    value={contact.country}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "country", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone</label>
                                            <div className="flex">
                                                <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                    <option>US +1</option>
                                                </select>
                                                <input
                                                    type="tel"
                                                    placeholder="(xxx) xxx-xxxx"
                                                    value={contact.cellPhone}
                                                    onChange={(e) => handleArrayChange("contactInfo.additionalContacts", index, "cellPhone", formatUSPhone(e.target.value))}
                                                    maxLength={14}
                                                    className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Emergency Contact */}
                            <div className="space-y-4 border border-gray-200 rounded-md p-4">
                                <h2 className="text-lg font-semibold text-gray-700">Emergency Contact</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.emergencyContact.name}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship*</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.emergencyContact.relation}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "relation", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.emergencyContact.address1}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "address1", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.emergencyContact.address2}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "address2", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.emergencyContact.city}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "city", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.emergencyContact.state}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "state", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.emergencyContact.country}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "country", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone*</label>
                                        <div className="flex">
                                            <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                <option>US +1</option>
                                            </select>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.contactInfo.emergencyContact.cellPhone}
                                                onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "cellPhone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.contactInfo.emergencyContact.email}
                                            onChange={(e) => handleNestedChange("contactInfo", "emergencyContact", "email", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 2 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Pharmacy</label>
                                    <input
                                        type="text"
                                        value={formData.preferences.pharmacy}
                                        onChange={(e) => handleChange("preferences", "pharmacy", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">eRx Pharmacy</label>
                                    <input
                                        type="text"
                                        value={formData.preferences.erxPharmacy}
                                        onChange={(e) => handleChange("preferences", "erxPharmacy", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Search for eRx Pharmacy"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">No Default eRx Pharmacy Set</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Laboratory Center</label>
                                    <input
                                        type="text"
                                        value={formData.preferences.labCenter}
                                        onChange={(e) => handleChange("preferences", "labCenter", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Radiology Center</label>
                                    <input
                                        type="text"
                                        value={formData.preferences.radiologyCenter}
                                        onChange={(e) => handleChange("preferences", "radiologyCenter", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Location</label>
                                <input
                                    type="text"
                                    value={formData.preferences.serviceLocation}
                                    onChange={(e) => handleChange("preferences", "serviceLocation", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Patient Network Tab */}
                    {activeTab === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Enterprise Master Patient Index ID</label>
                                    <input
                                        type="text"
                                        value={formData.patientNetwork.enterpriseMasterPatientIndexId}
                                        onChange={(e) => handleChange("patientNetwork", "enterpriseMasterPatientIndexId", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Regional Patient Identifier</label>
                                    <input
                                        type="text"
                                        value={formData.patientNetwork.regionalPatientIdentifier}
                                        onChange={(e) => handleChange("patientNetwork", "regionalPatientIdentifier", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">National Patient Identifier</label>
                                    <input
                                        type="text"
                                        value={formData.patientNetwork.nationalPatientIdentifier}
                                        onChange={(e) => handleChange("patientNetwork", "nationalPatientIdentifier", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">VFC Eligibility</label>
                                    <input
                                        type="text"
                                        value={formData.patientNetwork.vfcEligibility}
                                        onChange={(e) => handleChange("patientNetwork", "vfcEligibility", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Class</label>
                                <select
                                    value={formData.patientNetwork.patientClass}
                                    onChange={(e) => handleChange("patientNetwork", "patientClass", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select</option>
                                    <option value="Outpatient">Outpatient</option>
                                    <option value="Inpatient">Inpatient</option>
                                    <option value="Emergency">Emergency</option>
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="shareNonPHIData"
                                    checked={formData.patientNetwork.shareNonPHIData}
                                    onChange={(e) => handleChange("patientNetwork", "shareNonPHIData", e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="shareNonPHIData" className="ml-2 block text-sm text-gray-700">
                                    Patient would like to participate to share non-PHI Medical Data
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Employer Information Tab */}
                    {activeTab === 4 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employer Name</label>
                                    <input
                                        type="text"
                                        value={formData.employerInfo.name}
                                        onChange={(e) => handleChange("employerInfo", "name", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                    <input
                                        type="text"
                                        value={formData.employerInfo.address1}
                                        onChange={(e) => handleChange("employerInfo", "address1", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                    <input
                                        type="text"
                                        value={formData.employerInfo.address2}
                                        onChange={(e) => handleChange("employerInfo", "address2", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        value={formData.employerInfo.city}
                                        onChange={(e) => handleChange("employerInfo", "city", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        type="text"
                                        value={formData.employerInfo.state}
                                        onChange={(e) => handleChange("employerInfo", "state", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                                    <input
                                        type="text"
                                        value={formData.employerInfo.zip}
                                        onChange={(e) => handleChange("employerInfo", "zip", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                                    <div className="flex">
                                        <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                            <option>US +1</option>
                                        </select>
                                        <input
                                            type="tel"
                                            placeholder="(xxx) xxx-xxxx"
                                            value={formData.employerInfo.workPhone}
                                            onChange={(e) => handleChange("employerInfo", "workPhone", formatUSPhone(e.target.value))}
                                            maxLength={14}
                                            className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone</label>
                                    <div className="flex">
                                        <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                            <option>US +1</option>
                                        </select>
                                        <input
                                            type="tel"
                                            placeholder="(xxx) xxx-xxxx"
                                            value={formData.employerInfo.cellPhone}
                                            onChange={(e) => handleChange("employerInfo", "cellPhone", formatUSPhone(e.target.value))}
                                            maxLength={14}
                                            className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.employerInfo.email}
                                    onChange={(e) => handleChange("employerInfo", "email", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <input
                                    type="text"
                                    value={formData.employerInfo.country}
                                    onChange={(e) => handleChange("employerInfo", "country", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                    disabled
                                />
                            </div>
                        </div>
                    )}

                    {/* Insurance Tab */}
                    {activeTab === 5 && (
                        <div className="space-y-8">
                            {/* Primary Insurance */}
                            <div className="border border-gray-200 rounded-md p-4">
                                <h2 className="text-lg font-semibold text-gray-700 mb-4">Primary Insurance</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Carrier*</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.carrier}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "carrier", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.category}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "category", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Receiver</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.receiver}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "receiver", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">EMR Insurance ID</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.emrInsuranceId}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "emrInsuranceId", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Plan Type</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.programPlanType}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "programPlanType", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Incentive Type</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.incentiveType}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "incentiveType", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={formData.insurance.primary.address}
                                        onChange={(e) => handleNestedChange("insurance", "primary", "address", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.city}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "city", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.state}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "state", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.zip}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "zip", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <div className="flex">
                                            <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                <option>US +1</option>
                                            </select>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.primary.phone}
                                                onChange={(e) => handleNestedChange("insurance", "primary", "phone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.plan}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "plan", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID No*</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.idNo}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "idNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Copay</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.copay}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "copay", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                                        <DateInput
                                            value={formData.insurance.primary.effectiveDate}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "effectiveDate", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <DateInput
                                            value={formData.insurance.primary.endDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val && formData.insurance.primary.effectiveDate && val < formData.insurance.primary.effectiveDate) {
                                                    setFormErrors(prev => ({ ...prev, insuranceEndDate: "End date cannot be before effective date" }));
                                                } else {
                                                    setFormErrors(prev => { const n = { ...prev }; delete n.insuranceEndDate; return n; });
                                                }
                                                handleNestedChange("insurance", "primary", "endDate", val);
                                            }}
                                            min={formData.insurance.primary.effectiveDate || undefined}
                                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${formErrors.insuranceEndDate ? "border-red-500" : "border-gray-300"}`}
                                        />
                                        {formErrors.insuranceEndDate && <p className="text-xs text-red-500 mt-1">{formErrors.insuranceEndDate}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Group Number</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.groupNumber}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "groupNumber", e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                                            placeholder="Alphanumeric only"
                                            maxLength={30}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Policy No</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.policyNo}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "policyNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subscriber*</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.subscriber}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "subscriber", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center mt-4 space-x-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="capitationAgreement"
                                            checked={formData.insurance.primary.capitationAgreement}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "capitationAgreement", e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="capitationAgreement" className="ml-2 block text-sm text-gray-700">
                                            Capitation Agreement with Payer
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="doNotBalanceBill"
                                            checked={formData.insurance.primary.doNotBalanceBill}
                                            onChange={(e) => handleNestedChange("insurance", "primary", "doNotBalanceBill", e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="doNotBalanceBill" className="ml-2 block text-sm text-gray-700">
                                            Do Not Balance Bill
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={formData.insurance.primary.notes}
                                        onChange={(e) => handleNestedChange("insurance", "primary", "notes", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                    />
                                </div>

                                {/* Primary Insurance Guarantor */}
                                <div className="mt-8 border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-700 mb-4">Guarantor Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.primary.guarantor.name}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "name", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                            <DateInput
                                                value={formData.insurance.primary.guarantor.dob}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "dob", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.guarantor.address}
                                            onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "address", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.primary.guarantor.city}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "city", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.primary.guarantor.state}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "state", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.primary.guarantor.zip}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "zip", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.primary.guarantor.phone}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "phone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                                            <input
                                                type="tel"
                                                value={formData.insurance.primary.guarantor.fax}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "fax", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.primary.guarantor.cell}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "cell", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.insurance.primary.guarantor.email}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "email", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.primary.guarantor.relation}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "relation", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                                            <select
                                                value={formData.insurance.primary.guarantor.sex}
                                                onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "sex", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Unknown">Unknown</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.primary.guarantor.country}
                                            onChange={(e) => handleDeepNestedChange("insurance", "primary", "guarantor", "country", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Insurance */}
                            <div className="border border-gray-200 rounded-md p-4 mt-8">
                                <h2 className="text-lg font-semibold text-gray-700 mb-4">Secondary Insurance</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.carrier}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "carrier", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.category}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "category", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Receiver</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.receiver}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "receiver", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">EMR Insurance ID</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.emrInsuranceId}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "emrInsuranceId", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Plan Type</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.programPlanType}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "programPlanType", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Incentive Type</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.incentiveType}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "incentiveType", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={formData.insurance.secondary.address}
                                        onChange={(e) => handleNestedChange("insurance", "secondary", "address", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.city}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "city", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.state}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "state", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.zip}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "zip", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <div className="flex">
                                            <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                <option>US +1</option>
                                            </select>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.secondary.phone}
                                                onChange={(e) => handleNestedChange("insurance", "secondary", "phone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.plan}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "plan", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID No</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.idNo}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "idNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Copay</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.copay}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "copay", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                                        <DateInput
                                            value={formData.insurance.secondary.effectiveDate}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "effectiveDate", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Policy No</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.policyNo}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "policyNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subscriber</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.subscriber}
                                            onChange={(e) => handleNestedChange("insurance", "secondary", "subscriber", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Secondary Insurance Guarantor */}
                                <div className="mt-8 border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-700 mb-4">Guarantor Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.secondary.guarantor.name}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "name", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                            <DateInput
                                                value={formData.insurance.secondary.guarantor.dob}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "dob", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.guarantor.address}
                                            onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "address", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.secondary.guarantor.city}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "city", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.secondary.guarantor.state}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "state", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.secondary.guarantor.zip}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "zip", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.secondary.guarantor.phone}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "phone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                                            <input
                                                type="tel"
                                                value={formData.insurance.secondary.guarantor.fax}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "fax", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.secondary.guarantor.cell}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "cell", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.insurance.secondary.guarantor.email}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "email", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.secondary.guarantor.relation}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "relation", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                                            <select
                                                value={formData.insurance.secondary.guarantor.sex}
                                                onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "sex", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Unknown">Unknown</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.secondary.guarantor.country}
                                            onChange={(e) => handleDeepNestedChange("insurance", "secondary", "guarantor", "country", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tertiary Insurance */}
                            <div className="border border-gray-200 rounded-md p-4 mt-8">
                                <h2 className="text-lg font-semibold text-gray-700 mb-4">Tertiary Insurance</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.carrier}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "carrier", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.address}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "address", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.city}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "city", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.state}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "state", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.zip}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "zip", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <div className="flex">
                                            <select className="w-20 px-2 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                <option>US +1</option>
                                            </select>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.tertiary.phone}
                                                onChange={(e) => handleNestedChange("insurance", "tertiary", "phone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.plan}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "plan", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID No</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.idNo}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "idNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Copay</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.copay}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "copay", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                                        <DateInput
                                            value={formData.insurance.tertiary.effectiveDate}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "effectiveDate", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Policy No</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.policyNo}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "policyNo", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subscriber</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.subscriber}
                                            onChange={(e) => handleNestedChange("insurance", "tertiary", "subscriber", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Tertiary Insurance Guarantor */}
                                <div className="mt-8 border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-700 mb-4">Guarantor Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.tertiary.guarantor.name}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "name", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                            <DateInput
                                                value={formData.insurance.tertiary.guarantor.dob}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "dob", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.guarantor.address}
                                            onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "address", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.tertiary.guarantor.city}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "city", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.tertiary.guarantor.state}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "state", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.tertiary.guarantor.zip}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "zip", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.tertiary.guarantor.phone}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "phone", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                                            <input
                                                type="tel"
                                                value={formData.insurance.tertiary.guarantor.fax}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "fax", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="(xxx) xxx-xxxx"
                                                value={formData.insurance.tertiary.guarantor.cell}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "cell", formatUSPhone(e.target.value))}
                                                maxLength={14}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.insurance.tertiary.guarantor.email}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "email", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                                            <input
                                                type="text"
                                                value={formData.insurance.tertiary.guarantor.relation}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "relation", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                                            <select
                                                value={formData.insurance.tertiary.guarantor.sex}
                                                onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "sex", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Unknown">Unknown</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                        <input
                                            type="text"
                                            value={formData.insurance.tertiary.guarantor.country}
                                            onChange={(e) => handleDeepNestedChange("insurance", "tertiary", "guarantor", "country", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form Actions */}
                    <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <div className="flex space-x-3">
                            {activeTab > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(activeTab - 1)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Previous
                                </button>
                            )}
                            {activeTab < tabs.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(activeTab + 1)}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !canWritePatient}
                                    className={`px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${(isSubmitting || !canWritePatient) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={!canWritePatient ? "You don't have permission to create patients" : undefined}
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Patient'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}