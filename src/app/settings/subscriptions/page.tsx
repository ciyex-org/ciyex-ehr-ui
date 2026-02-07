"use client";

import { getEnv } from "@/utils/env";
import React, { useState, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/* ------------ Types ------------ */
interface Subscription {
    id: number;
    service: string;
    billingCycle: "Yearly" | "Monthly";
    scope: "Per Provider" | "Per Encounter";
    status: "Paid" | "Unpaid" | "Failed";
    startDate: string;
    price: number;
}

interface Service {
    id: number;
    name: string;
}

/* ------------ Subscription Form ------------ */
function SubscriptionForm({
                              mode,
                              subscription,
                              onClose,
                              onSaved,
                          }: {
    mode: "add" | "edit";
    subscription?: Subscription;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [service, setService] = useState(subscription?.service || "");
    const [billingCycle, setBillingCycle] = useState<"Yearly" | "Monthly">(
        subscription?.billingCycle || "Yearly"
    );
    const [scope, setScope] = useState<"Per Provider" | "Per Encounter">(
        subscription?.scope || "Per Provider"
    );
    const [status, setStatus] = useState<"Paid" | "Unpaid" | "Failed">(
        subscription?.status || "Paid"
    );
    const [startDate, setStartDate] = useState(subscription?.startDate || "");
    const [price, setPrice] = useState(subscription?.price || 0);
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<Service[]>([]);

    // Load available services
    useEffect(() => {
        async function loadServices() {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/services`
                );
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setServices(json.data);
                }
            } catch (err) {
                console.error("Error fetching services:", err);
            }
        }
        loadServices();
    }, []);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const url =
                mode === "add"
                    ? `${getEnv("NEXT_PUBLIC_API_URL")}/api/subscriptions`
                    : `${getEnv("NEXT_PUBLIC_API_URL")}/api/subscriptions/${subscription?.id}`;

            // normalize date to ISO datetime
            function normalizeStartDateForApi(s: string) {
                if (!s) return s;
                const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
                const ymd = /^\d{4}-\d{2}-\d{2}$/;
                const iso = /^\d{4}-\d{2}-\d{2}T/;
                if (iso.test(s)) return s;
                const m = s.match(ddmmyyyy);
                if (m) return `${m[3]}-${m[2]}-${m[1]}T00:00:00`;
                if (ymd.test(s)) return `${s}T00:00:00`;
                const d = new Date(s);
                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    const hh = String(d.getHours()).padStart(2, "0");
                    const mi = String(d.getMinutes()).padStart(2, "0");
                    const ss = String(d.getSeconds()).padStart(2, "0");
                    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
                }
                return s;
            }

            const normalizedStartDate = normalizeStartDateForApi(startDate);

            const res = await fetchWithAuth(url, {
                method: mode === "add" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    service,
                    billingCycle,
                    scope,
                    status,
                    startDate: normalizedStartDate,
                    price,
                }),
            });

            const json = await res.json();
            if (json.success) {
                onSaved();
                onClose();
            } else {
                alert(json.message || "Failed to save subscription");
            }
        } catch (err) {
            console.error("Error saving subscription:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg">
                <h2 className="text-lg font-semibold mb-4">
                    {mode === "add" ? "Add Subscription" : "Edit Subscription"}
                </h2>

                {/* Form Fields */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm mb-1">Service</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={service}
                            onChange={(e) => setService(e.target.value)}
                        >
                            <option value="">Select Service</option>
                            {services.map((s) => (
                                <option key={s.id} value={s.name}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Billing Cycle</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={billingCycle}
                            onChange={(e) =>
                                setBillingCycle(e.target.value as "Yearly" | "Monthly")
                            }
                        >
                            <option value="Yearly">Yearly</option>
                            <option value="Monthly">Monthly</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Scope</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={scope}
                            onChange={(e) =>
                                setScope(e.target.value as "Per Provider" | "Per Encounter")
                            }
                        >
                            <option value="Per Provider">Per Provider</option>
                            <option value="Per Encounter">Per Encounter</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Status</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={status}
                            onChange={(e) =>
                                setStatus(e.target.value as "Paid" | "Unpaid" | "Failed")
                            }
                        >
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Price ($)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------ Page ------------ */
export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Subscription | null>(null);

    // Load subscriptions
    const loadSubscriptions = async () => {
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/subscriptions`
            );
            const json = await res.json();
            if (json.success) setSubscriptions(json.data);
        } catch (err) {
            console.error("Error fetching subscriptions:", err);
        }
    };

    useEffect(() => {
        loadSubscriptions();
    }, []);

    return (
        <AdminLayout>
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Subscriptions</h1>
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => {
                            setEditing(null);
                            setShowModal(true);
                        }}
                    >
                        + Add Subscription
                    </button>
                </div>

                {/* Table */}
                <table className="w-full border border-gray-200 text-sm">
                    <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2 border text-left">Service</th>
                        <th className="p-2 border text-left">Billing Cycle</th>
                        <th className="p-2 border text-left">Scope</th>
                        <th className="p-2 border text-left">Status</th>
                        <th className="p-2 border text-left">Start Date</th>
                        <th className="p-2 border text-left">Price</th>
                        <th className="p-2 border text-left">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {subscriptions.length > 0 ? (
                        subscriptions.map((sub) => (
                            <tr key={sub.id}>
                                <td className="p-2 border">{sub.service}</td>
                                <td className="p-2 border">{sub.billingCycle}</td>
                                <td className="p-2 border">{sub.scope}</td>
                                <td className="p-2 border">{sub.status}</td>
                                <td className="p-2 border">{sub.startDate}</td>
                                <td className="p-2 border">${sub.price}</td>
                                <td className="p-2 border space-x-2">
                                    <button
                                        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                        onClick={() => {
                                            setEditing(sub);
                                            setShowModal(true);
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                        onClick={async () => {
                                            await fetchWithAuth(
                                                `${getEnv("NEXT_PUBLIC_API_URL")}/api/subscriptions/${sub.id}`,
                                                { method: "DELETE" }
                                            );
                                            loadSubscriptions();
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="p-4 text-center">
                                No subscriptions found
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>

                {/* Modal */}
                {showModal && (
                    <SubscriptionForm
                        mode={editing ? "edit" : "add"}
                        subscription={editing || undefined}
                        onClose={() => setShowModal(false)}
                        onSaved={loadSubscriptions}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
