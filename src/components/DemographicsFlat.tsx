"use client";
import { getEnv } from "@/utils/env";
import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import PatientDeletionFlow from "@/components/patients/PatientDeletionFlow";
import { useRouter } from "next/navigation";

interface Provider {
    id: number;
    identification?: { firstName?: string; lastName?: string };
    systemAccess?: { status?: string };
}
interface PatientRef {
    id: string;
    firstName?: string;
    lastName?: string;
}
interface Patient {
    id: string;
    [key: string]: string | number | boolean | string[] | undefined;
    familyMembers?: string[];
    careTeam?: string[];
}

interface PatientRelationship {
    id: number;
    relatedPatientName: string;
    relationshipType: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    emergencyContact: boolean;
    active: boolean;
}
interface Props {
    patient: Patient;
    demoForm: Partial<Patient>;
    setDemoForm: React.Dispatch<React.SetStateAction<Partial<Patient>>>;
    editDemographics: boolean;
    setEditDemographics: (v: boolean) => void;
    saveDemographics: () => Promise<void>;
    calculateAgeLocal: (date: string) => number | string;
}

export default function DemographicsFlat({
                                             patient,
                                             demoForm,
                                             setDemoForm,
                                             editDemographics,
                                             setEditDemographics,
                                             saveDemographics,
                                         }: Props) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [patients, setPatients] = useState<PatientRef[]>([]);
    const [relationships, setRelationships] = useState<PatientRelationship[]>([]);
    const [relationshipsLoading, setRelationshipsLoading] = useState(true);
    const [relationshipsError, setRelationshipsError] = useState<string | null>(null);
    const [alertState, setAlertState] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);
    const [showDeleteFlow, setShowDeleteFlow] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/providers`
                );
                const json = await res.json();
                const active: Provider[] = (json.data || [])
                    .filter((p: Provider) => p.systemAccess?.status === "ACTIVE")
                    .sort((a: Provider, b: Provider) =>
                        (a.identification?.lastName || "").localeCompare(
                            b.identification?.lastName || ""
                        )
                    );
                setProviders(active);
            } catch (err) {
                console.error("Error fetching providers", err);
            }
        };

        const fetchPatients = async () => {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients`
                );
                const json = await res.json();
                setPatients(json.data?.content || []);
            } catch {}
        };

        const fetchRelationships = async () => {
            if (!patient.id) {
                console.log('No patient ID available');
                setRelationshipsLoading(false);
                return;
            }
            
            try {
                setRelationshipsLoading(true);
                setRelationshipsError(null);
                console.log('Fetching relationships for patient:', patient.id);
                
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patient.id}/relationships`
                );
                console.log('Response status:', res.status);
                
                if (res.ok) {
                    const response = await res.json();
                    console.log('Full API response:', response);
                    
                    // Handle ApiResponse wrapper
                    const relationshipsData = response.data || [];
                    console.log('Relationships data array:', relationshipsData);
                    
                    // Filter for active relationships
                    const activeRelationships = relationshipsData.filter((r: PatientRelationship) => r.active);
                    console.log('Active relationships count:', activeRelationships.length, activeRelationships);
                    
                    setRelationships(activeRelationships);
                    setRelationshipsLoading(false);
                } else {
                    const errorMsg = `Failed to fetch relationships: ${res.status}`;
                    console.error(errorMsg);
                    setRelationshipsError(errorMsg);
                    setRelationshipsLoading(false);
                }
            } catch (err) {
                const errorMsg = `Error fetching relationships: ${err}`;
                console.error(errorMsg, err);
                setRelationshipsError(errorMsg);
                setRelationshipsLoading(false);
            }
        };

        fetchProviders();
        fetchPatients();
        if (patient.id) {
            fetchRelationships();
        }
    }, [patient.id]);

    const handleInputChange = (
        field: string,
        value: string | number | boolean | string[]
    ) => {
        setDemoForm((prev) => ({ ...prev, [field]: value }));
    };

    // ✅ Bold labels
    const Label = ({ text, required }: { text: string; required?: boolean }) => (
        <label className="block text-xs font-semibold text-gray-800 mb-0.5 flex items-center gap-1">
            {text}
            {required && <span className="text-red-500" title="Required">*</span>}
        </label>
    );

    const renderField = (
        label: string,
        field: string,
        type: string = "text",
        options?: string[],
        required?: boolean
    ) => (
        <div>
            <Label text={label} required={required} />
            {editDemographics ? (
                options ? (
                    <select
                        value={
                            (demoForm[field] as string) || (patient[field] as string) || ""
                        }
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className="w-full border-b border-gray-300 bg-transparent text-xs focus:outline-none"
                    >
                        <option value="">Select</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={type}
                        value={
                            (demoForm[field] as string) || (patient[field] as string) || ""
                        }
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className="w-full border-b border-gray-300 bg-transparent text-xs focus:outline-none"
                    />
                )
            ) : (
                <span className="text-xs text-gray-700 font-normal">
          {(patient[field] as string) || ""}
        </span>
            )}
        </div>
    );

    const Section = ({
                         title,
                         children,
                     }: {
        title: string;
        children: React.ReactNode;
    }) => (
        <section className="w-full mb-4">
            <h2 className="text-sm font-semibold text-blue-700 border-b pb-0.5 mb-2">
                {title}
            </h2>
            {children}
        </section>
    );

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {/* ✅ Alert Banner */}
            {alertState && (
                <div
                    className={`mb-2 p-2 rounded text-xs ${
                        alertState.type === "success"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                    }`}
                >
                    {alertState.message}
                </div>
            )}

            {/* Header with Edit/Save/Cancel/Delete */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-lg font-semibold text-gray-800">Demographics</h1>
                <div className="flex gap-2">
                    {!editDemographics ? (
                        <>
                            <button
                                onClick={() => setEditDemographics(true)}
                                className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setShowDeleteFlow(true)}
                                className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs hover:bg-red-200"
                            >
                                Delete Patient
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setEditDemographics(false)}
                                className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        console.log('Starting demographics save...');
                                        await saveDemographics();
                                        setAlertState({
                                            type: "success",
                                            message: "Demographics updated successfully.",
                                        });
                                        console.log('Demographics save completed successfully');
                                    } catch (error) {
                                        console.error('Demographics save failed:', error);
                                        const errorMessage = error instanceof Error 
                                            ? error.message 
                                            : 'Unknown error occurred';
                                        setAlertState({
                                            type: "error",
                                            message: `Failed to update demographics: ${errorMessage}`,
                                        });
                                    }
                                    setTimeout(() => setAlertState(null), 6000);
                                    setEditDemographics(false);
                                }}
                                className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs"
                            >
                                Save
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ✅ Patient Details */}
            <Section title="Patient Details">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {renderField("First Name", "firstName", "text", undefined, true)}
                    {renderField("Last Name", "lastName", "text", undefined, true)}
                    {renderField("Preferred Name", "preferredName")}
                    {renderField("Date of Birth", "dateOfBirth", "date", undefined, true)}
                    {renderField("Sex at Birth", "sexAtBirth", "text", ["Male", "Female"], true)}

                    {/* Assigned Provider */}
                    <div className="col-span-2">
                        <Label text="Assigned Provider" required />
                        {editDemographics ? (
                            <select
                                value={
                                    (demoForm.assignedProvider as string) ||
                                    (patient.assignedProvider as string) ||
                                    ""
                                }
                                onChange={(e) =>
                                    handleInputChange("assignedProvider", e.target.value)
                                }
                                className="w-full border-b border-gray-300 bg-transparent text-xs focus:outline-none"
                            >
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.identification
                                            ? `${p.identification.firstName || ""} ${
                                                p.identification.lastName || ""
                                            }`
                                            : `Provider #${p.id}`}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-xs text-gray-700 font-normal">
                {(() => {
                    const prov = providers.find(
                        (p) => p.id === patient.assignedProvider
                    );
                    return prov?.identification
                        ? `${prov.identification.firstName} ${prov.identification.lastName}`
                        : prov
                            ? `Provider #${prov.id}`
                            : "";
                })()}
              </span>
                        )}
                    </div>

                    {/* Referring Provider */}
                    <div>
                        <Label text="Referring Provider" />
                        {editDemographics ? (
                            <select
                                value={
                                    (demoForm.referringProvider as string) ||
                                    (patient.referringProvider as string) ||
                                    ""
                                }
                                onChange={(e) =>
                                    handleInputChange("referringProvider", e.target.value)
                                }
                                className="w-full border-b border-gray-300 bg-transparent text-xs focus:outline-none"
                            >
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.identification
                                            ? `${p.identification.firstName || ""} ${
                                                p.identification.lastName || ""
                                            }`
                                            : `Provider #${p.id}`}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-xs text-gray-700 font-normal">
                {(() => {
                    const ref = providers.find(
                        (p) => p.id === patient.referringProvider
                    );
                    return ref?.identification
                        ? `${ref.identification.firstName} ${ref.identification.lastName}`
                        : ref
                            ? `Provider #${ref.id}`
                            : "";
                })()}
              </span>
                        )}
                    </div>

                    {/* Referring Patient */}
                    <div>
                        <Label text="Referring Patient" />
                        {editDemographics ? (
                            <select
                                value={
                                    (demoForm.referringPatient as string) ||
                                    (patient.referringPatient as string) ||
                                    ""
                                }
                                onChange={(e) =>
                                    handleInputChange("referringPatient", e.target.value)
                                }
                                className="w-full border-b border-gray-300 bg-transparent text-xs focus:outline-none"
                            >
                                {patients.map((pt) => (
                                    <option key={pt.id} value={pt.id}>
                                        {pt.firstName} {pt.lastName}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-xs text-gray-700 font-normal">
                {(() => {
                    const pt = patients.find(
                        (p) => p.id === patient.referringPatient
                    );
                    return pt ? `${pt.firstName} ${pt.lastName}` : "";
                })()}
              </span>
                        )}
                    </div>
                </div>
            </Section>

            {/* ✅ Contact Information */}
            <Section title="Contact Information">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {renderField("Mobile Number", "mobileNumber")}
                    {renderField("Home Phone Number", "homePhoneNumber")}
                    {renderField("Email Address", "email", "email", undefined, true)}
                    {renderField("Address Line 1", "address1")}
                    {renderField("Address Line 2", "address2")}
                    {renderField("City", "city")}
                    {renderField("State", "state")}
                    {renderField("Zip Code", "zip")}
                    {renderField("Country", "country")}
                </div>
            </Section>

            {/* ✅ Family & Care Team */}
            <Section title="Family File & Care Team">
                <div className="grid grid-cols-2 gap-2">
                    {renderField("Head of Household", "headOfHousehold")}
                    {renderField(
                        "Financial Responsibility",
                        "financialResponsibility",
                        "text",
                        ["Self", "HOH responsible"]
                    )}
                    {renderField("Head of Communication", "headOfCommunication")}
                </div>
                <h3 className="mt-1 font-medium text-xs">Family Members</h3>
                {patient.familyMembers?.length ? (
                    <ul className="list-disc pl-5 text-xs space-y-0.5">
                        {patient.familyMembers.map((m, i) => (
                            <li key={i}>{m}</li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-xs text-gray-500 font-normal">None</div>
                )}
                <h3 className="mt-2 font-medium text-xs">Care Team</h3>
                {patient.careTeam?.length ? (
                    <ul className="list-disc pl-5 text-xs space-y-0.5">
                        {patient.careTeam.map((c, i) => (
                            <li key={i}>{c}</li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-xs text-gray-500 font-normal">None</div>
                )}
            </Section>

            {/* ✅ Patient Relationships */}
            <Section title="Patient Relationships">
                {relationshipsLoading ? (
                    <div className="text-xs text-gray-500 font-normal flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading relationships...
                    </div>
                ) : relationshipsError ? (
                    <div className="text-xs text-red-600 font-normal">
                        {relationshipsError}
                    </div>
                ) : relationships.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 py-1 text-left font-semibold">Relationship</th>
                                <th className="px-2 py-1 text-left font-semibold">Name</th>
                                <th className="px-2 py-1 text-center font-semibold">Emergency Contact</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {relationships.map((rel) => (
                                <tr key={rel.id} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5">{rel.relationshipType}</td>
                                    <td className="px-2 py-1.5">{rel.relatedPatientName}</td>
                                    <td className="px-2 py-1.5 text-center">
                                        {rel.emergencyContact ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-xs text-gray-500 font-normal">No relationships recorded</div>
                )}
            </Section>

            {/* ✅ Communication Preferences */}
            <Section title="Communication Preferences">
                <div className="grid grid-cols-2 gap-2">
                    {renderField("Appointment Reminders", "reminderPreference", "text", [
                        "Yes",
                        "No",
                    ])}
                    {renderField("Preferred Contact Time", "preferredContactTime", "text", [
                        "Morning",
                        "Afternoon",
                        "Evening",
                    ])}
                    <div>
                        <Label text="Preferred Contact Method" />
                        {["Phone", "Email", "SMS/Text", "Voicemail"].map((method) => (
                            <label key={method} className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={
                                        editDemographics
                                            ? (demoForm[`comm${method.replace(/\W/g, "")}`] as boolean) ||
                                            (patient[`comm${method.replace(/\W/g, "")}`] as boolean) ||
                                            false
                                            : (patient[`comm${method.replace(/\W/g, "")}`] as boolean) ||
                                            false
                                    }
                                    disabled={!editDemographics}
                                    onChange={
                                        editDemographics
                                            ? (e) =>
                                                handleInputChange(
                                                    `comm${method.replace(/\W/g, "")}`,
                                                    e.target.checked
                                                )
                                            : undefined
                                    }
                                />
                                {method}
                            </label>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ✅ Finance & Release */}
            <Section title="Finance & Release">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {renderField("Insurance Provider", "insuranceProvider")}
                    {renderField("Policy Number", "policyNumber")}
                    {renderField("Group Number", "groupNumber")}
                    {renderField("Copay / Deductible", "copay")}
                </div>
                <h3 className="text-xs font-medium mt-2">Release Information</h3>
                <div className="flex flex-wrap gap-3 text-xs">
                    {["Spouse / Partner", "Children", "Parents"].map((r) => (
                        <label key={r} className="flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={
                                    editDemographics
                                        ? (demoForm[`release${r}`] as boolean) ||
                                        (patient[`release${r}`] as boolean) ||
                                        false
                                        : (patient[`release${r}`] as boolean) || false
                                }
                                disabled={!editDemographics}
                                onChange={
                                    editDemographics
                                        ? (e) => handleInputChange(`release${r}`, e.target.checked)
                                        : undefined
                                }
                            />
                            {r}
                        </label>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {renderField("Assignment of Benefits", "assignmentRelease", "text", [
                        "Signed",
                        "E-Signed",
                        "Not Signed",
                    ])}
                    {renderField("Photography Release", "photoRelease", "text", ["Yes", "No"])}
                    {renderField("Social Media Release", "socialRelease", "text", ["Yes", "No"])}
                    {renderField("Telehealth Consent", "telehealthConsent", "text", ["Yes", "No"])}
                </div>
            </Section>

            {/* Patient Deletion Flow */}
            {showDeleteFlow && (
                <PatientDeletionFlow
                    patientId={patient.id}
                    patientName={`${patient.firstName || ''} ${patient.lastName || ''}`.trim()}
                    onSuccess={() => {
                        setShowDeleteFlow(false);
                        router.push('/patients');
                    }}
                    onCancel={() => setShowDeleteFlow(false)}
                />
            )}
        </div>
    );
}
