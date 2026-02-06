"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";



/** UI primitives */
function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none ${className}`}
        >
            {title && (
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</h3>
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    );
}

function Pill({
                  children,
                  tone = "neutral" as const,
              }: {
    children: React.ReactNode;
    tone?: "neutral" | "warn" | "ok" | "danger";
}) {
    const map: Record<string, string> = {
        neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        warn: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
        ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
        danger: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
    };
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[tone]}`}>{children}</span>;
}

function SimpleBarChart<T extends Record<string, unknown>>({
                                                               data,
                                                               valueKey,
                                                               labelKey,
                                                           }: {
    data: T[];
    valueKey: keyof T & string;
    labelKey: keyof T & string;
}) {
    const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

    return (
        <div className="space-y-3">
            {data.map((d, i) => {
                const v = Number(d[valueKey]) || 0;
                const pct = Math.round((v / max) * 100);
                return (
                    <div key={i}>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>{String(d[labelKey])}</span>
                            <span className="tabular-nums">{v}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function MetricCard({
                        title,
                        value,
                        subtext,
                        tone,
                    }: {
    title: string;
    value: string;
    subtext?: string;
    tone?: "warn" | "ok";
}) {
    return (
        <Panel>
            <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
            {subtext && (
                <div className={`mt-1 text-xs ${tone === "warn" ? "text-amber-600" : "text-slate-500 dark:text-slate-400"}`}>
                    {subtext}
                </div>
            )}
        </Panel>
    );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/** Component */
export default function Dashboard() {
    const [stats, setStats] = useState({
        totalSkus: 0,
        lowCritical: 0,
        pendingOrders: 0,
        suppliers: 0,
        ordersByMonth: [] as { month: string; value: number }[],
        stockHealth: { adequate: 0, low: 0, critical: 0 },
    });

    const [alertItems, setAlertItems] = useState<{
        critical: string[];
        low: string[];
    }>({ critical: [], low: [] });

    const [criticalLowPercentage, setCriticalLowPercentage] = useState(10);

    useEffect(() => {
        (async () => {
            try {
                const [skuRes, lowRes, pendingRes, suppRes, monthlyRes, settingsRes, inventoryRes] = await Promise.all([
                    fetchWithAuth(`${API_URL}/api/inventory/count`),
                    fetchWithAuth(`${API_URL}/api/inventory/low-critical`),
                    fetchWithAuth(`${API_URL}/api/orders/pending/count`),
                    fetchWithAuth(`${API_URL}/api/suppliers/count`),
                    fetchWithAuth(`${API_URL}/api/inventory/records/monthly-orders`),
                    fetchWithAuth(`${API_URL}/api/inventory-settings`),
                    fetchWithAuth(`${API_URL}/api/inventory/list`),
                ]);

                // Safe JSON parsing with text fallback
                const safeJson = async (res: Response) => {
                    const text = await res.text();
                    if (!text) return {};
                    try {
                        return JSON.parse(text);
                    } catch {
                        return {};
                    }
                };

                const [sku, low, pending, supp, monthly, settings, inventory] = await Promise.all([
                    safeJson(skuRes),
                    safeJson(lowRes),
                    safeJson(pendingRes),
                    safeJson(suppRes),
                    safeJson(monthlyRes),
                    safeJson(settingsRes),
                    safeJson(inventoryRes),
                ]);

                const lowCount = low.data?.low ?? 0;
                const critical = low.data?.critical ?? 0;
                const total = sku.data ?? 1;
                const adequate = Math.max(total - (lowCount + critical), 0);

                // Get critical threshold from settings
                const threshold = settings.data?.criticalLowPercentage ?? 10;
                const alertsEnabled = settings.data?.lowStockAlerts ?? true; // Default to TRUE
                setCriticalLowPercentage(threshold);

                // Process inventory items for alerts
                const criticalItems: string[] = [];
                const lowItems: string[] = [];

                if (inventory.success && Array.isArray(inventory.data)) {
                    inventory.data.forEach((item: any) => {
                        const stock = item.stock || 0;
                        const minStock = item.minStock || 0;
                        const percent = minStock > 0 ? (stock / minStock) * 100 : 100;

                        if (stock === 0 || (alertsEnabled && minStock > 0 && percent <= threshold)) {
                            criticalItems.push(item.name);
                        } else if (alertsEnabled && minStock > 0 && stock <= minStock) {
                            lowItems.push(item.name);
                        }
                    });
                }

                setAlertItems({ critical: criticalItems, low: lowItems });

                setStats({
                    totalSkus: sku.data ?? 0,
                    lowCritical: lowCount + critical,
                    pendingOrders: pending.data ?? 0,
                    suppliers: supp.data ?? 0,
                    ordersByMonth: Array.isArray(monthly.data)
                        ? (monthly.data as { month: string; value: number }[]).map((m) => ({
                            month: m.month,
                            value: m.value,
                        }))
                        : [],
                    stockHealth: {
                        adequate: Math.round((adequate / total) * 100),
                        low: Math.round((lowCount / total) * 100),
                        critical: Math.round((critical / total) * 100),
                    },
                });
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            }
        })();
    }, []);

    return (
        <AdminLayout>
            <div className="p-1">
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Track stock, purchase orders, suppliers, and equipment upkeep.
                </p>
            </div>

            <div className="space-y-6">
                {/* Alert Summary Card */}
                {(alertItems.critical.length > 0 || alertItems.low.length > 0) && (
                    <Panel className="border-l-4 border-l-red-500">
                        <div className="flex items-start gap-3">
                            <div className="text-red-500">
                                🚨
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-700 dark:text-red-400">
                                    Inventory Alerts
                                </h3>
                                <div className="mt-2 space-y-1 text-sm">
                                    {alertItems.critical.length > 0 && (
                                        <div className="text-red-600 dark:text-red-400">
                                            <strong>{alertItems.critical.length} item{alertItems.critical.length > 1 ? 's' : ''} critically low:</strong>
                                            <div className="mt-1">
                                                {alertItems.critical.slice(0, 3).join(", ")}
                                                {alertItems.critical.length > 3 && ` and ${alertItems.critical.length - 3} more`}
                                            </div>
                                        </div>
                                    )}
                                    {alertItems.low.length > 0 && (
                                        <div className="text-amber-600 dark:text-amber-400">
                                            <strong>{alertItems.low.length} item{alertItems.low.length > 1 ? 's' : ''} need restock:</strong>
                                            <div className="mt-1">
                                                {alertItems.low.slice(0, 3).join(", ")}
                                                {alertItems.low.length > 3 && ` and ${alertItems.low.length - 3} more`}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <a 
                                        href="/inventory-management/inventory" 
                                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                    >
                                        View Inventory → 
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Panel>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Total SKUs" value={String(stats.totalSkus)} subtext="Tracked items" />
                    <a href="/inventory-management/inventory" className="block hover:opacity-80 transition-opacity">
                        <MetricCard title="Low / Critical" value={String(stats.lowCritical)} subtext="Needs restock" tone="warn" />
                    </a>
                    <MetricCard title="Pending Orders" value={String(stats.pendingOrders)} subtext="Awaiting receipt" />
                    <MetricCard title="Suppliers" value={String(stats.suppliers)} subtext="Active partners" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Panel title="Orders (Last 6 Months)" className="lg:col-span-2">
                        <SimpleBarChart data={stats.ordersByMonth} valueKey="value" labelKey="month" />
                        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                            Numbers represent order count per month.
                        </div>
                    </Panel>

                    <Panel title="Stock Health">
                        <div className="space-y-2">
                            {Object.entries(stats.stockHealth).map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                    <span
                        className={`inline-block h-2 w-2 rounded-full ${
                            label === "critical" ? "bg-rose-500" : label === "low" ? "bg-amber-500" : "bg-indigo-500"
                        }`}
                    />
                                        <span className="text-sm capitalize text-slate-600 dark:text-slate-300">{label}</span>
                                    </div>
                                    <Pill>{value}%</Pill>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>
        </AdminLayout>
        
    );
}
