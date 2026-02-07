"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";

const API_URL = getEnv("NEXT_PUBLIC_API_URL")!;

type WeeklyRecord = {
    day?: string;
    label?: string;
    stock?: number;
    value?: number;
};

type MonthlyRecord = {
    month?: string;
    label?: string;
    count?: number;
    value?: number;
};

type CategoryItem = {
    id: string;
    name: string;
    category: string;
    stock: number;
    unit: string;
};


/** UI */
function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            {title && (
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</h3>
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    );
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

/** Component */
export default function Records() {
    const [weekly, setWeekly] = useState<{ label: string; value: number }[]>([]);
    const [monthly, setMonthly] = useState<{ label: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
    const [showItems, setShowItems] = useState(false);

    // ✅ Safe JSON helper
    async function safeJson(res: Response) {
        const text = await res.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (err) {
            console.error("Invalid JSON:", err);
            return null;
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const [weeklyRes, monthlyRes, categoriesRes, inventoryRes] = await Promise.all([
                    fetchWithAuth(`${API_URL}/api/inventory/records/weekly-consumption`),
                    fetchWithAuth(`${API_URL}/api/inventory/records/monthly-orders`),
                    fetchWithAuth(`${API_URL}/api/list-options/list/inventorytype`),
                    fetchWithAuth(`${API_URL}/api/inventory/list`),
                ]);

                const weeklyJson = await safeJson(weeklyRes);
                const monthlyJson = await safeJson(monthlyRes);
                const categoriesJson = await safeJson(categoriesRes);
                const inventoryJson = await safeJson(inventoryRes);

                setWeekly(
                    (weeklyJson?.data as WeeklyRecord[] || []).map((d) => ({
                        label: d.day || d.label || "N/A",
                        value: d.stock || d.value || 0,
                    }))
                );

                setMonthly(
                    (monthlyJson?.data as MonthlyRecord[] || []).map((d) => ({
                        label: d.month || d.label || "N/A",
                        value: d.count || d.value || 0,
                    }))
                );

                // Load categories from API or extract from inventory
                let cats: string[] = [];
                if (Array.isArray(categoriesJson)) {
                    cats = categoriesJson.map((c: any) => c.title || c.name || c.value).filter(Boolean);
                }
                
                // Fallback: extract unique categories from inventory
                if (cats.length === 0 && inventoryJson?.success && Array.isArray(inventoryJson.data)) {
                    const uniqueCats = [...new Set(inventoryJson.data.map((item: any) => item.category).filter(Boolean))];
                    cats = uniqueCats as string[];
                }
                
                setCategories(cats);
            } catch (e) {
                console.error("Error loading records", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function loadCategoryItems() {
        try {
            const res = await fetchWithAuth(`${API_URL}/api/inventory/list`);
            const json = await safeJson(res);
            if (json?.success && Array.isArray(json.data)) {
                const items = json.data.map((d: any) => ({
                    id: String(d.id),
                    name: d.name,
                    category: d.category,
                    stock: d.stock,
                    unit: d.unit,
                }));
                setCategoryItems(
                    selectedCategory === "All"
                        ? items
                        : items.filter((i: CategoryItem) => i.category === selectedCategory)
                );
            }
        } catch (e) {
            console.error("Error loading category items", e);
        }
    }

    return (
        <AdminLayout>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100"></div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Maintain records of past stock movements and audit history.
            </p>

            {loading ? (
                <p className="mt-4 text-slate-500 dark:text-slate-400">Loading...</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-4">
                        <Panel title="Weekly Stock Consumption">
                            <SimpleBarChart data={weekly} valueKey="value" labelKey="label" />
                        </Panel>
                        <Panel title="Monthly Orders (count)">
                            <SimpleBarChart data={monthly} valueKey="value" labelKey="label" />
                        </Panel>
                    </div>

                    {/* Monthly Records Section */}
                    <div className="mt-6">
                        <Panel title="Monthly Records">
                            <div className="flex items-center gap-4 mb-4">
                                <div>
                                    <Label className="text-sm">Select Month</Label>
                                    <Input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-48"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm">Category</Label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="h-10 w-48 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        <option value="All">All Categories</option>
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mt-6">
                                    <Button
                                        onClick={() => {
                                            setShowItems(true);
                                            loadCategoryItems();
                                        }}
                                        className="bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        View Items
                                    </Button>
                                </div>
                            </div>

                            {showItems && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-medium mb-3">
                                        Items for {selectedMonth} - {selectedCategory}
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100 dark:bg-slate-800">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Item Name</th>
                                                    <th className="px-4 py-2 text-left">Category</th>
                                                    <th className="px-4 py-2 text-right">Stock</th>
                                                    <th className="px-4 py-2 text-left">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {categoryItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-3 text-center text-slate-500">
                                                            No items found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    categoryItems.map((item) => (
                                                        <tr key={item.id} className="border-b dark:border-slate-700">
                                                            <td className="px-4 py-3">{item.name}</td>
                                                            <td className="px-4 py-3">{item.category}</td>
                                                            <td className="px-4 py-3 text-right">{item.stock}</td>
                                                            <td className="px-4 py-3">{item.unit}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </Panel>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
