"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import Alert from "@/components/ui/alert/Alert";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            {title && (
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {title}
                    </h3>
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    );
}

function Switch({
                    checked,
                    onChange,
                    label,
                }: {
    checked: boolean;
    onChange: () => void;
    label?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    checked ? "translate-x-5" : "translate-x-1"
                }`}
            />
        </button>
    );
}

export default function Settings() {
    const [lowStockAlerts, setLowStockAlerts] = useState(true);
    const [threshold, setThreshold] = useState(10);
    const [savedThreshold, setSavedThreshold] = useState(10);
    const [loading, setLoading] = useState(false);

    const [alertData, setAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (alertData) {
            const timer = setTimeout(() => setAlertData(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [alertData]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/inventory-settings`
                );
                const text = await res.text();
                if (!text) {
                    setLowStockAlerts(true);
                    setThreshold(10);
                    setSavedThreshold(10);
                    return;
                }
                const json = JSON.parse(text);

                if (res.ok && json.success) {
                    const data = json.data;
                    setLowStockAlerts(data.lowStockAlerts ?? true);
                    setThreshold(data.criticalLowPercentage ?? 10);
                    setSavedThreshold(data.criticalLowPercentage ?? 10);
                } else {
                    setLowStockAlerts(true);
                    setThreshold(10);
                    setSavedThreshold(10);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
                setLowStockAlerts(true);
                setThreshold(10);
                setSavedThreshold(10);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function saveSettings(
        updates: Partial<{
            lowStockAlerts: boolean;
            criticalLowPercentage: number;
        }>
    ) {
        try {
            const body = {
                lowStockAlerts,
                criticalLowPercentage: threshold,
                ...updates,
            };

            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/inventory-settings`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                }
            );

            const text = await res.text();
            if (!text) return;
            const json = JSON.parse(text);

            if (res.ok && json.success) {
                const data = json.data;
                setLowStockAlerts(data.lowStockAlerts);
                setThreshold(data.criticalLowPercentage);
                setSavedThreshold(data.criticalLowPercentage);

                setAlertData({
                    variant: "success",
                    title: "Updated",
                    message: "Inventory settings updated successfully.",
                });
            } else {
                throw new Error(json.message || "Update failed");
            }
        } catch (err) {
            console.error("Failed to update settings:", err);
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to update inventory settings.",
            });
        }
    }

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <AdminLayout>
            {alertData && (
                <div className="mb-4">
                    <Alert
                        variant={alertData.variant}
                        title={alertData.title}
                        message={alertData.message}
                    />
                </div>
            )}
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Configure inventory thresholds and alerts.
            </p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
                <Panel title="Alerts & Notifications">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                    Low Stock Alerts
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    Notify when stock dips below minimum
                                </div>
                            </div>
                            <Switch
                                checked={lowStockAlerts}
                                onChange={() => {
                                    const newVal = !lowStockAlerts;
                                    setLowStockAlerts(newVal);
                                    saveSettings({ lowStockAlerts: newVal });
                                }}
                                label="Low Stock Alerts"
                            />
                        </div>
                    </div>
                </Panel>

                <Panel title="Thresholds">
                    <div className="space-y-2">
                        <Label className="dark:text-slate-300">Critical Low (%)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={50}
                            value={threshold}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setThreshold(Number(e.target.value))
                            }
                            onBlur={() => {
                                if (threshold !== savedThreshold) {
                                    saveSettings({ criticalLowPercentage: threshold }).then(() => {
                                        setSavedThreshold(threshold);
                                    });
                                }
                            }}
                            className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Items below this percentage of minimum stock are marked &quot;Critical&quot;.
                        </div>
                    </div>
                </Panel>
            </div>
        
        </AdminLayout>
    );
}