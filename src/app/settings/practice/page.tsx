"use client";
import React, { useState, useCallback, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
/* ------------ Types ------------ */
interface PracticeSettings {
    name: string;
    enablePatientPractice: boolean;
    tokenExpiryMinutes?: number;
}
interface RegionalSettings {
    unitsForVisitForms: "US" | "Metric" | "Both";
    displayFormatUSWeights: "Show pounds as decimal value" | "Show pounds and ounces";
    telephoneCountryCode: string;
    dateDisplayFormat: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";
    timeDisplayFormat: "24 hr" | "12 hr";
    timeZone: string;
    currencyDesignator: string;
}
interface ToastNotification {
    id: number;
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
}
/* ------------ Reusable UI Components ------------ */
interface FormRowProps {
    label: string;
    children: React.ReactNode;
}
const FormRow: React.FC<FormRowProps> = ({ label, children }) => (
    <div className="flex items-center justify-between border-b pb-4 last:border-b-0">
        <span className="text-gray-700 text-sm font-medium pr-4 w-2/3">{label}</span>
        <div className="w-1/3 flex justify-end">{children}</div>
    </div>
);
const ConfigCard: React.FC<{ title: string; children: React.ReactNode }> = ({
                                                                                title,
                                                                                children,
                                                                            }) => (
    <div className="rounded-lg bg-white shadow-md p-4 space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2 mb-2">{title}</h2>
        {children}
    </div>
);
/* ------------ Toast Notification Component ------------ */
const ToastNotificationComponent: React.FC<{
    notification: ToastNotification;
    onClose: (id: number) => void;
}> = ({ notification, onClose }) => {
    const getToastStyles = () => {
        switch (notification.type) {
            case "success":
                return "bg-green-500 border-green-600";
            case "error":
                return "bg-red-500 border-red-600";
            case "info":
                return "bg-blue-500 border-blue-600";
            default:
                return "bg-gray-500 border-gray-600";
        }
    };
    return (
        <div
            className={`${getToastStyles()} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 flex items-center justify-between min-w-80 max-w-96 transform transition-all duration-300 ${
                notification.visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
        >
            <div className="flex items-center">
                <div className="mr-3">
                    {notification.type === "success" && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                    {notification.type === "error" && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                    {notification.type === "info" && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                </div>
                <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
                onClick={() => onClose(notification.id)}
                className="ml-4 text-white hover:text-gray-200 focus:outline-none"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
        </div>
    );
};
/* ------------ Main Page ------------ */
export default function RegionalFormattingSettingsPage() {
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);
    const [nextNotificationId, setNextNotificationId] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [practiceSettings, setPracticeSettings] = useState<PracticeSettings>({
        name: "",
        enablePatientPractice: false,
    tokenExpiryMinutes: 5,
    });
    
    // persist fetched expiry to localStorage per org
    const persistExpiryLocally = (orgId: string | null, mins: number | undefined) => {
        try {
            const keyOrg = orgId || "default";
            const m = typeof mins === 'number' && mins > 0 ? mins : 5;
            localStorage.setItem(`tokenExpiryMinutes_${keyOrg}`, String(m));
            localStorage.setItem('tokenExpiryMinutes', String(m));
        } catch {}
    };
    const [practiceId, setPracticeId] = useState<string | null>(null);
    const [settings, setSettings] = useState<RegionalSettings>({
        unitsForVisitForms: "US",
        displayFormatUSWeights: "Show pounds as decimal value",
        telephoneCountryCode: "",
        dateDisplayFormat: "YYYY-MM-DD",
        timeDisplayFormat: "24 hr",
        timeZone: "",
        currencyDesignator: "",
    });
    const hideNotification = useCallback((id: number) => {
        setNotifications((prev: ToastNotification[]) =>
            prev.map((n: ToastNotification) => n.id === id ? { ...n, visible: false } : n)
        );
// Remove from array after animation
        setTimeout(() => {
            setNotifications((prev: ToastNotification[]) => prev.filter((n: ToastNotification) => n.id !== id));
        }, 300);
    }, []);
    const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
        const newNotification: ToastNotification = {
            id: nextNotificationId,
            message,
            type,
            visible: false,
        };
        setNotifications((prev: ToastNotification[]) => [...prev, newNotification]);
        setNextNotificationId((prev: number) => prev + 1);
// Show the notification
        setTimeout(() => {
            setNotifications((prev: ToastNotification[]) =>
                prev.map((n: ToastNotification) => n.id === newNotification.id ? { ...n, visible: true } : n)
            );
        }, 100);
// Auto-hide after 5 seconds
        setTimeout(() => {
            hideNotification(newNotification.id);
        }, 5000);
    }, [nextNotificationId, hideNotification]);
// Fetch practice settings on component mount
    useEffect(() => {
        const fetchPracticeSettings = async () => {
            try {
                const token = localStorage.getItem("token") || localStorage.getItem("authToken");
                const orgId = localStorage.getItem("orgId");
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                };
                if (orgId) headers["orgId"] = orgId;
                const fetchPracticeId = orgId || "1";
                const res = await fetch(`${API_BASE}/api/practices/${fetchPracticeId}`, {
                    method: "GET",
                    headers,
                });
                if (res.ok) {
                    const response = await res.json();
                    if (response.success && response.data) {
                        setPracticeId(response.data.id);
                        setPracticeSettings({
                            name: response.data.name || "",
                            enablePatientPractice: response.data.practiceSettings?.enablePatientPractice || false,
                            tokenExpiryMinutes: response.data.practiceSettings?.tokenExpiryMinutes ?? response.data.tokenExpiryMinutes ?? 5,
                        });
                        persistExpiryLocally(response.data.id || orgId, response.data.practiceSettings?.tokenExpiryMinutes ?? response.data.tokenExpiryMinutes);
                        if (response.data.regionalSettings) {
                            setSettings(response.data.regionalSettings);
                        }
                    }
                } else if (res.status === 404) {
                    setPracticeId(null);
                } else {
                    console.error("Failed to fetch practice settings");
                }
            } catch (error) {
                console.error("Error fetching practice settings:", error);
                showNotification("Failed to load practice settings", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPracticeSettings();
    }, [showNotification, setPracticeId]);
    const handlePracticeInputChange = useCallback(
        (key: keyof PracticeSettings, value: boolean | string | number) =>
            setPracticeSettings((prev: PracticeSettings) => ({ ...prev, [key]: value })),
        []
    );
    const handleInputChange = useCallback(
        (key: keyof RegionalSettings, value: string) =>
            setSettings((prev: RegionalSettings) => ({ ...prev, [key]: value })),
        []
    );
    const handleSavePractice = async () => {
        try {
            const token = localStorage.getItem("token") || localStorage.getItem("authToken");
            const orgId = localStorage.getItem("orgId");
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            };
            if (orgId) headers["orgId"] = orgId;
            const currentPracticeId = practiceId || orgId || "1";
            const url = practiceId ? `${API_BASE}/api/practices/${currentPracticeId}` : `${API_BASE}/api/practices`;
            const method = practiceId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({
                    name: practiceSettings.name,
                    practiceSettings: { enablePatientPractice: practiceSettings.enablePatientPractice, tokenExpiryMinutes: practiceSettings.tokenExpiryMinutes ?? 5 },
                    regionalSettings: settings
                }),
            });
            if (res.ok) {
                const response = await res.json();
                if (!practiceId && response.success && response.data) {
                    setPracticeId(response.data.id);
                }
                // persist expiry locally for session manager and notify it in this tab
                try {
                    const orgKey = response?.data?.id || practiceId || orgId || "default";
                    const mins = practiceSettings.tokenExpiryMinutes ?? 5;
                    localStorage.setItem(`tokenExpiryMinutes_${orgKey}`, String(mins));
                    localStorage.setItem('tokenExpiryMinutes', String(mins));
                    try {
                        sessionStorage.setItem('lastActivity', String(Date.now()));
                    } catch {}
                    // notify SessionManager in same tab (storage events don't fire in same tab)
                    try {
                        window.dispatchEvent(new CustomEvent('tokenExpiryUpdated', { detail: { orgId: orgKey, mins } }));
                    } catch {}
                } catch {}
                showNotification("Practice settings saved successfully!", "success");
            } else {
                showNotification("Failed to save practice settings.", "error");
            }
        } catch (error) {
            showNotification("Error saving practice settings.", "error");
        }
    };
    const handleSaveRegional = async () => {
        try {
            const token = localStorage.getItem("token") || localStorage.getItem("authToken");
            const orgId = localStorage.getItem("orgId");
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            };
            if (orgId) headers["orgId"] = orgId;
            const currentPracticeId = practiceId || orgId || "1";
            const res = await fetch(`${API_BASE}/api/practices/${currentPracticeId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    name: practiceSettings.name,
                    practiceSettings: { enablePatientPractice: practiceSettings.enablePatientPractice, tokenExpiryMinutes: practiceSettings.tokenExpiryMinutes ?? 5 },
                    regionalSettings: settings
                }),
            });
            if (res.ok) {
                const response = await res.json();
                if (!practiceId && response.success && response.data) {
                    setPracticeId(response.data.id);
                }
                // persist expiry locally for session manager and notify it in this tab
                try {
                    const orgKey = response?.data?.id || practiceId || orgId || "default";
                    const mins = practiceSettings.tokenExpiryMinutes ?? 5;
                    localStorage.setItem(`tokenExpiryMinutes_${orgKey}`, String(mins));
                    localStorage.setItem('tokenExpiryMinutes', String(mins));
                    try { sessionStorage.setItem('lastActivity', String(Date.now())); } catch {}
                    try { window.dispatchEvent(new CustomEvent('tokenExpiryUpdated', { detail: { orgId: orgKey, mins } })); } catch {}
                } catch {}
                showNotification("Regional settings saved successfully!", "success");
            } else {
                showNotification("Failed to save regional settings.", "error");
            }
        } catch (error) {
            showNotification("Error saving regional settings.", "error");
        }
    };
    if (isLoading) {
        return (
            <AdminLayout>
                <div className="p-4 max-w-4xl mx-auto space-y-6">
                    <div className="flex justify-center items-center h-64">
                        <div className="text-gray-600">Loading settings...</div>
                    </div>
                </div>
            </AdminLayout>
        );
    }
    return (
        <AdminLayout>
            <div className="p-4 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold"></h1>
                </div>
                {/* --- Practice Configuration Card --- */}
                <ConfigCard title="Practice">
                    {/* Practice Name */}
                    <FormRow label="Practice Name">
                        <input
                            type="text"
                            value={practiceSettings.name}
                            onChange={(e) => handlePracticeInputChange("name", e.target.value)}
                            placeholder="Enter practice name"
                            className="p-2 border rounded w-full max-w-xs"
                        />
                    </FormRow>
                    {/* Enable Patient Practice */}
                    <FormRow label="Enable Patient Practice">
                        <button
                            onClick={() =>
                                handlePracticeInputChange("enablePatientPractice", !practiceSettings.enablePatientPractice)
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                practiceSettings.enablePatientPractice ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
<span
    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        practiceSettings.enablePatientPractice ? 'translate-x-6' : 'translate-x-1'
    }`}
/>
                        </button>
                    </FormRow>
                    {/* Session timeout for organization (minutes) */}
                    <FormRow label="Session timeout (minutes)">
                        <select
                            value={practiceSettings.tokenExpiryMinutes}
                            onChange={(e) => handlePracticeInputChange("tokenExpiryMinutes", Number(e.target.value))}
                            className="p-2 border rounded w-full max-w-xs"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={20}>20</option>
                            <option value={25}>25</option>
                            <option value={30}>30</option>
                        </select>
                    </FormRow>
                </ConfigCard>
                {/* --- Regional & Locale Card (merged) --- */}
                <ConfigCard title="Regional & Locale Options">
                    {/* Units for Visit Forms */}
                    <FormRow label="Units for Visit Forms">
                        <select
                            value={settings.unitsForVisitForms}
                            onChange={(e) =>
                                handleInputChange(
                                    "unitsForVisitForms",
                                    e.target.value as RegionalSettings["unitsForVisitForms"]
                                )
                            }
                            className="p-2 border rounded w-full max-w-xs"
                        >
                            <option value="US">US</option>
                            <option value="Metric">Metric</option>
                            <option value="Both">Show both US and metric (main unit is US)</option>
                        </select>
                    </FormRow>
                    {/* Display Format for US Weights */}
                    <FormRow label="Display Format for US Weights">
                        <select
                            value={settings.displayFormatUSWeights}
                            onChange={(e) =>
                                handleInputChange(
                                    "displayFormatUSWeights",
                                    e.target.value as RegionalSettings["displayFormatUSWeights"]
                                )
                            }
                            className="p-2 border rounded w-full max-w-xs"
                        >
                            <option value="Show pounds as decimal value">
                                Show pounds as decimal value
                            </option>
                            <option value="Show pounds and ounces">Show pounds and ounces</option>
                        </select>
                    </FormRow>
                    {/* Telephone Country Code */}
                    <FormRow label="Telephone Country Code">
                        <input
                            type="text"
                            value={settings.telephoneCountryCode}
                            onChange={(e) =>
                                handleInputChange("telephoneCountryCode", e.target.value)
                            }
                            className="p-2 border rounded w-24 text-center"
                        />
                    </FormRow>
                    {/* Date Display Format */}
                    <FormRow label="Date Display Format">
                        <select
                            value={settings.dateDisplayFormat}
                            onChange={(e) =>
                                handleInputChange(
                                    "dateDisplayFormat",
                                    e.target.value as RegionalSettings["dateDisplayFormat"]
                                )
                            }
                            className="p-2 border rounded w-full max-w-xs"
                        >
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        </select>
                    </FormRow>
                    {/* Time Display Format */}
                    <FormRow label="Time Display Format">
                        <select
                            value={settings.timeDisplayFormat}
                            onChange={(e) =>
                                handleInputChange(
                                    "timeDisplayFormat",
                                    e.target.value as RegionalSettings["timeDisplayFormat"]
                                )
                            }
                            className="p-2 border rounded w-full max-w-xs"
                        >
                            <option value="24 hr">24 hr</option>
                            <option value="12 hr">12 hr</option>
                        </select>
                    </FormRow>
                    {/* Time Zone */}
                    <FormRow label="Time Zone">
                        <select
                            value={settings.timeZone}
                            onChange={(e) => handleInputChange("timeZone", e.target.value)}
                            className="p-2 border rounded w-full max-w-xs"
                        >
                            <option value="Unassigned">Unassigned</option>
                            <option value="Asia/Kolkata">Asia/Kolkata</option>
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">America/New_York</option>
                        </select>
                    </FormRow>
                    {/* Currency Designator (moved up here) */}
                    <FormRow label="Currency Designator">
                        <input
                            type="text"
                            value={settings.currencyDesignator}
                            onChange={(e) =>
                                handleInputChange("currencyDesignator", e.target.value)
                            }
                            className="p-2 border rounded w-24 text-center"
                        />
                    </FormRow>
                </ConfigCard>
                {/* Regional Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSaveRegional}
                        className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
            {/* Toast Notifications Container */}
            <div className="fixed bottom-4 right-4 z-50 space-y-3">
                {notifications.map((notification) => (
                    <ToastNotificationComponent
                        key={notification.id}
                        notification={notification}
                        onClose={hideNotification}
                    />
                ))}
            </div>
        </AdminLayout>
    );
}