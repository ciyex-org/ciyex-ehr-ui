"use client";
import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import VideoCallButton from "@/components/telehealth/VideoCallButton";

/* ---------------- TYPES ---------------- */
interface AppointmentDTO {
    id: number;
    visitType: string;
    patientId: number;
    providerId: number;
    appointmentStartDate: string;
    appointmentEndDate: string;
    appointmentStartTime: string;
    appointmentEndTime: string;
    priority?: string;
    locationId?: number;
    status: string;
    reason?: string;
}
// interface ProviderDTO {
//     id: number;
//     name: string;
// }

interface Billing {
    patientBalanceDue?: number;
    insuranceBalanceDue?: number;
    totalBalanceDue?: number;
}

interface Lab {
    testName: string;
    orderDate: string;
    result: string;
    referenceRange: string;
    status: string;
}

/* ---------------- APPOINTMENTS ---------------- */
export const AppointmentsFlat: React.FC<{
    patientId: number;
    formatDateTimeLocal: (d: string) => string;
}> = ({ patientId, formatDateTimeLocal }) => {
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // provider list
    const [providers, setProviders] = useState<{ id: number; name: string }[]>([]);

    // form state
    const [form, setForm] = useState({
        providerId: "",
        visitType: "",
        date: "",
        startTime: "",
        endTime: "",
        reason: "",
    });

    useEffect(() => {
        const fetchAppointments = async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/patient/${patientId}?page=0&size=10`
                );
                const json = await res.json();
                setAppointments(json.data?.content || []);
            } catch (err) {
                console.error("Error fetching appointments", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchProviders = async () => {
            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/providers?active=true`
                );
                const json = await res.json();
                setProviders(json.data || []);
            } catch (err) {
                console.error("Error fetching providers", err);
            }
        };

        if (patientId) fetchAppointments();
        fetchProviders();
    }, [patientId]);

    const setField = (key: string, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        try {
            const payload = {
                patientId,
                providerId: Number(form.providerId),
                visitType: form.visitType,
                appointmentStartDate: form.date,
                appointmentStartTime: form.startTime,
                appointmentEndTime: form.endTime,
                reason: form.reason,
                status: "Scheduled",
            };
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/appointments`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );
            if (res.ok) {
                setShowModal(false);
                setForm({ providerId: "", visitType: "", date: "", startTime: "", endTime: "", reason: "" });
                const updated = await res.json();
                setAppointments((prev) => [updated.data, ...prev].slice(0, 10));
            } else {
                console.error("Failed to save appointment");
            }
        } catch (err) {
            console.error("Error saving appointment", err);
        }
    };

    const filteredAppointments = appointments.filter((appt) =>
        [appt.visitType, appt.status, appt.reason]
            .filter(Boolean)
            .some((field) =>
                field!.toLowerCase().includes(searchTerm.toLowerCase())
            )
    );

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-lg text-gray-800">Appointments</h4>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded shadow hover:bg-blue-700"
                >
                    Schedule
                </button>
            </div>

            <input
                className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading ? (
                <div className="text-center text-gray-500">Loading...</div>
            ) : (
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-gray-700">
                    <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Time</th>
                        <th className="px-4 py-2 text-left">Provider</th>
                        <th className="px-4 py-2 text-left">Visit Type</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Video Call</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appt) => (
                            <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2">
                                    {formatDateTimeLocal(appt.appointmentStartDate).split(",")[0]}
                                </td>
                                <td className="px-4 py-2">
                                    {appt.appointmentStartTime} – {appt.appointmentEndTime}
                                </td>
                                <td className="px-4 py-2">
                                    {appt.providerId
                                        ? providers.find((p) => p.id === appt.providerId)?.name || `Provider #${appt.providerId}`
                                        : "—"}
                                </td>
                                <td className="px-4 py-2">{appt.visitType || "—"}</td>
                                <td className="px-4 py-2">
                    <span
                        className={`px-2 py-1 rounded-full text-xs ${
                            appt.status === "Completed"
                                ? "bg-green-100 text-green-800"
                                : appt.status === "Scheduled"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                        }`}
                    >
                      {appt.status}
                    </span>
                                </td>
                                <td className="px-4 py-2">
                                    {(appt.status === "Scheduled" && (appt.visitType === "Telehealth" || appt.visitType === "Video Consultation")) ? (
                                        <VideoCallButton
                                            patientId={appt.patientId}
                                            appointmentId={appt.id} providerId={0}                                        />
                                    ) : (
                                        "—"
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                                {searchTerm
                                    ? "No matching appointments found"
                                    : "No appointments scheduled"}
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-semibold">Schedule Appointment</h3>

                        {/* Provider dropdown */}
                        <label className="block text-sm font-medium">Provider</label>
                        <select
                            value={form.providerId}
                            onChange={(e) => setField("providerId", e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        >
                            <option value="">-- Select Provider --</option>
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Visit Type"
                            value={form.visitType}
                            onChange={(e) => setField("visitType", e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        />
                        <input
                            type="date"
                            value={form.date}
                            onChange={(e) => setField("date", e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        />
                        <div className="flex gap-2">
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={(e) => setField("startTime", e.target.value)}
                                className="flex-1 border rounded px-2 py-1"
                            />
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={(e) => setField("endTime", e.target.value)}
                                className="flex-1 border rounded px-2 py-1"
                            />
                        </div>
                        <textarea
                            placeholder="Reason"
                            value={form.reason}
                            onChange={(e) => setField("reason", e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-3 py-1 bg-gray-200 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ---------------- BILLING ---------------- */
export const BillingFlat: React.FC<{ billing: Billing | null }> = ({ billing }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h4 className="font-semibold text-lg mb-4 text-gray-800">Billing</h4>
        {billing ? (
            <table className="w-full text-sm">
                <tbody>
                <tr className="border-b">
                    <td className="px-3 py-2">Patient Balance Due</td>
                    <td className="px-3 py-2 text-right">
                        {billing.patientBalanceDue?.toFixed(2) ?? "0.00"}
                    </td>
                </tr>
                <tr className="border-b">
                    <td className="px-3 py-2">Insurance Balance Due</td>
                    <td className="px-3 py-2 text-right">
                        {billing.insuranceBalanceDue?.toFixed(2) ?? "0.00"}
                    </td>
                </tr>
                <tr>
                    <td className="px-3 py-2 font-semibold">Total Balance Due</td>
                    <td className="px-3 py-2 text-right font-semibold">
                        {billing.totalBalanceDue?.toFixed(2) ?? "0.00"}
                    </td>
                </tr>
                </tbody>
            </table>
        ) : (
            <div className="text-center py-6 text-gray-500">No billing records</div>
        )}
    </div>
);

/* ---------------- MEDICATIONS (re-export) ---------------- */
export { default as MedicationsFlat } from "./MedicationsFlat";

/* ---------------- ALLERGIES (re-export) ---------------- */
export { default as AllergiesFlat } from "./AllergiesFlat";

/* ---------------- INSURANCE (re-export) ---------------- */
export { default as InsuranceFlat } from "./InsuranceFlat";

export { default as MedicalProblemsFlat } from "./MedicalProblemsFlat";

export { default as IssuesFlat } from "@/components/IssuesFlat";

export { default as ImmunizationsFlat } from "@/components/ImmunizationsFlat";

/* ---------------- HEALTHCARE SERVICES (new) ---------------- */
export { default as HealthcareServicesFlat } from "@/components/HealthcareServicesFlat";

/* ---------------- PAYMENT ---------------- */
export { default as PaymentFlat } from "@/components/PaymentFlat";

/* ---------------- REPORT ---------------- */
export { ReportFlat } from "@/components/report";

/* ---------------- LABS ---------------- */
export const LabsFlat: React.FC<{ labsData: Lab[] }> = ({ labsData }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h4 className="font-semibold text-lg text-gray-800 mb-4">Labs</h4>
        {!labsData?.length ? (
            <div className="text-center py-6 text-gray-500">No lab results</div>
        ) : (
            <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                <tr>
                    <th className="px-2 py-1">Test</th>
                    <th className="px-2 py-1">Order Date</th>
                    <th className="px-2 py-1">Result</th>
                    <th className="px-2 py-1">Range</th>
                    <th className="px-2 py-1">Status</th>
                </tr>
                </thead>
                <tbody>
                {labsData.map((lab, i) => (
                    <tr key={i}>
                        <td className="border px-2 py-1">{lab.testName}</td>
                        <td className="border px-2 py-1">{lab.orderDate}</td>
                        <td className="border px-2 py-1">{lab.result}</td>
                        <td className="border px-2 py-1">{lab.referenceRange}</td>
                        <td className="border px-2 py-1">{lab.status}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        )}
    </div>
);

/* ---------------- VITALS ---------------- */
export const VitalsFlat: React.FC<{ patientId: number }> = ({ patientId }) => {
    const [vitals, setVitals] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchVitals = async () => {
        if (!patientId) return;
        
        try {
            setLoading(true);
            console.log('Fetching encounters for patient ID:', patientId);
            const encountersRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/${patientId}/encounters`);
            
            if (!encountersRes.ok) {
                console.error('Failed to fetch encounters:', encountersRes.status);
                return;
            }
            
            const encountersJson = await encountersRes.json();
            const encounters = encountersJson.data || [];
            
            if (encounters.length === 0) {
                console.log('No encounters found');
                return;
            }
            
            const latestEncounter = encounters.sort((a: any, b: any) => {
                const dateA = new Date(a.audit?.createdDate || 0).getTime();
                const dateB = new Date(b.audit?.createdDate || 0).getTime();
                return dateB - dateA;
            })[0];
            
            const latestEncounterId = latestEncounter.id;
            
            console.log('Fetching vitals for encounter ID:', latestEncounterId);
            const vitalsRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/vitals/${patientId}/${latestEncounterId}`);
            
            if (!vitalsRes.ok) {
                console.error('Failed to fetch vitals:', vitalsRes.status);
                return;
            }
            
            const vitalsJson = await vitalsRes.json();
            const vitalsData = vitalsJson.data || [];
            
            if (vitalsData.length > 0) {
                const latestVital = vitalsData.sort((a: any, b: any) => {
                    const dateA = new Date(a.audit?.createdDate || 0).getTime();
                    const dateB = new Date(b.audit?.createdDate || 0).getTime();
                    
                    if (dateA === dateB) {
                        return b.id - a.id;
                    }
                    
                    return dateB - dateA;
                })[0];
                
                setVitals(latestVital);
            } else {
                // Fallback: fetch last available vital for this patient
                console.log('No vitals in latest encounter, fetching last available vital for patient');
                try {
                    const allVitalsRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/vitals/patient/${patientId}`);
                    
                    if (allVitalsRes.ok) {
                        const allVitalsJson = await allVitalsRes.json();
                        const allVitals = allVitalsJson.data || [];
                        
                        if (allVitals.length > 0) {
                            const lastVital = allVitals.sort((a: any, b: any) => {
                                const dateA = new Date(a.audit?.createdDate || 0).getTime();
                                const dateB = new Date(b.audit?.createdDate || 0).getTime();
                                
                                if (dateA === dateB) {
                                    return b.id - a.id;
                                }
                                
                                return dateB - dateA;
                            })[0];
                            
                            setVitals(lastVital);
                        }
                    }
                } catch (fallbackErr) {
                    console.error('Error fetching fallback vitals:', fallbackErr);
                }
            }
        } catch (err) {
            console.error('Error fetching vitals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVitals();
    }, [patientId]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">💊</span>
                    Latest Vitals
                </h4>
                {vitals && (
                    <div className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full border">
                        Last updated: {new Date(vitals.audit?.createdDate || Date.now()).toLocaleDateString()}
                    </div>
                )}
            </div>
            
            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 text-blue-600">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium">Loading vitals...</span>
                    </div>
                </div>
            ) : !vitals ? (
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">🏥</div>
                    <p className="text-gray-600 font-medium">No vitals found</p>
                    <p className="text-sm text-gray-500 mt-1">Vitals will appear here once recorded</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                ⚖️ Weight
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.weightKg || 'N/A'}
                            {vitals.weightKg && <span className="text-sm font-normal text-gray-500 ml-1">kg</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                📏 Height
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.heightCm || 'N/A'}
                            {vitals.heightCm && <span className="text-sm font-normal text-gray-500 ml-1">cm</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                💓 Blood Pressure
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.bpSystolic || 'N/A'}
                            {vitals.bpSystolic && <span className="text-sm font-normal text-gray-500 ml-1">mmHg</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                💗 Pulse
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.pulse || 'N/A'}
                            {vitals.pulse && <span className="text-sm font-normal text-gray-500 ml-1">bpm</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                🫁 Respiration
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.respiration || 'N/A'}
                            {vitals.respiration && <span className="text-sm font-normal text-gray-500 ml-1">/min</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                🌡️ Temperature
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.temperatureC || 'N/A'}
                            {vitals.temperatureC && <span className="text-sm font-normal text-gray-500 ml-1">°C</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                🩸 Oxygen Saturation
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.oxygenSaturation || 'N/A'}
                            {vitals.oxygenSaturation && <span className="text-sm font-normal text-gray-500 ml-1">%</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                📊 BMI
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {vitals.bmi || 'N/A'}
                        </div>
                    </div>
                    
                    {vitals.notes && (
                        <div className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow md:col-span-2 lg:col-span-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                    📝 Notes
                                </span>
                            </div>
                            <div className="text-sm text-gray-700">
                                {vitals.notes}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};