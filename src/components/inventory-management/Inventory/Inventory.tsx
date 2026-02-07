"use client";

import { getEnv } from "@/utils/env";
import React, {useEffect, useMemo, useState} from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/app/(admin)/layout";
import {fetchWithAuth} from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";




const API_URL = getEnv("NEXT_PUBLIC_API_URL")!;


/** Types */
type InventoryItem = {
    id: string;
    name: string;
    category: string;  // <-- allow dynamic values from backend
    lot?: string;
    expiry?: string; // ISO
    sku: string;
    stock: number;
    unit: string;
    minStock: number;
    supplier?: string;
    location: string;
    status: "Active" | "Inactive";
};
type ListOption = {
    id: string | number;
    title: string;
};
type SupplierApiResponse = {
    id: string | number;
    name: string;
};
/** Helpers */
const dateLabel = (iso?: string) => {
    if (!iso || !iso.trim()) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso; // fallback if invalid
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
};

/** UI primitives */
function TableShell({ children }: { children: React.ReactNode }) {
    return <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">{children}</div>;
}

function formatDateForInput(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}


function Pill({ children, tone = "neutral" as const }: { children: React.ReactNode; tone?: "neutral" | "warn" | "ok" | "danger" }) {
    const map: Record<string, string> = {
        neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        warn: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
        ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
        danger: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
    };
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[tone]}`}>{children}</span>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className="text-slate-500 dark:text-slate-400">{label}</div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{value}</div>
        </div>
    );
}


/** Component */
export default function Inventory() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<string>("All");
    const [type, setType] = useState<string>("All");
    const [expiry, setExpiry] = useState<string>("Any");
    const [addOpen, setAddOpen] = useState(false);
    const [selected, setSelected] = useState<InventoryItem | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

    const [typeOptions, setTypeOptions] = useState<{ id: string; label: string }[]>([]);
    const [reorderMode, setReorderMode] = useState(false);
    const [criticalLowPercentage, setCriticalLowPercentage] = useState(10);
    const [lowStockAlerts, setLowStockAlerts] = useState(false);
    const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([]);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [showErrorPopup, setShowErrorPopup] = useState(false);






    // ✅ Alert state
    const [alertData, setAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    // ✅ Auto-dismiss after 4s
    useEffect(() => {
        if (alertData) {
            const timer = setTimeout(() => setAlertData(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [alertData]);

    useEffect(() => {
        const orgId = localStorage.getItem("orgId");
        if (!orgId) return;

        (async () => {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/inventory-settings/${orgId}`
                );
                const text = await res.text();
                if (!text) return; // backend returned no body
                const json = JSON.parse(text);

                if (res.ok && json.success) {
                    const data = json.data;
                    setLowStockAlerts(data.lowStockAlerts);
                    setCriticalLowPercentage(data.criticalLowPercentage);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            }
        })();
    }, []);



    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/api/suppliers`);
                const json = await res.json();
                if (res.ok && json.success && Array.isArray(json.data?.content)) {
                    setSupplierOptions(
                        (json.data.content as SupplierApiResponse[]).map((s) => ({
                            id: String(s.id),
                            name: s.name,
                        }))
                    );
                }
            } catch (err) {
                console.error("Failed to load suppliers:", err);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [categoriesRes, inventoryRes] = await Promise.all([
                    fetchWithAuth(`${API_URL}/api/list-options/list/inventorytype`),
                    fetchWithAuth(`${API_URL}/api/inventory/list`)
                ]);
                
                const categoriesJson = await categoriesRes.json();
                const inventoryJson = await inventoryRes.json();
                
                let cats: string[] = [];
                
                // Try to get categories from API
                if (categoriesRes.ok && Array.isArray(categoriesJson)) {
                    cats = categoriesJson.map((c: any) => c.title || c.name || c.value).filter(Boolean);
                }
                
                // Fallback: extract unique categories from inventory
                if (cats.length === 0 && inventoryJson?.success && Array.isArray(inventoryJson.data)) {
                    const uniqueCats = [...new Set(inventoryJson.data.map((item: any) => item.category).filter(Boolean))];
                    cats = uniqueCats as string[];
                }
                
                setTypeOptions(cats.map((cat, idx) => ({ id: String(idx), label: cat })));
            } catch (err) {
                console.error("Failed to load type options:", err);
            }
        })();
    }, []);




    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth(
                    `${API_URL}/api/inventory?page=${currentPage - 1}&size=${pageSize}`
                );
                const json = await res.json();
                if (res.ok && json.success && json.data?.content) {
                    const items: InventoryItem[] = json.data.content.map((d: Record<string, unknown>) => ({
                        id: String(d.id),
                        supplier: String(d.supplier || ""),
                        name: d.name,
                        category: d.category,
                        lot: d.lot ?? undefined,
                        expiry: d.expiry ?? undefined,
                        sku: d.sku,
                        stock: d.stock,
                        unit: d.unit,
                        minStock: d.minStock,
                        location: d.location,
                        status: d.status,
                    }));
                    setInventory(items);
                    setTotalPages(json.data.totalPages);
                    setTotalItems(json.data.totalElements);
                } else {
                    setInventory([]);
                }
            } catch (err) {
                console.error("Failed to fetch inventory:", err);
                setInventory([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [currentPage, pageSize]);



    // Load items from backend
        useEffect(() => {
            (async () => {
                try {
                    const res = await fetchWithAuth(`${API_URL}/api/inventory/list`);
                    const json = await res.json();
                    if (res.ok && json.success && Array.isArray(json.data)) {
                        const items: InventoryItem[] = json.data.map((d: Record<string, unknown>) => ({                            id: String(d.id),
                            name: d.name,
                            category: d.category,
                            lot: d.lot ?? undefined,
                            expiry: d.expiry ?? undefined,
                            sku: d.sku,
                            stock: d.stock,
                            unit: d.unit,
                            minStock: d.minStock,
                            location: d.location,
                            status: d.status,
                            supplier: String(d.supplier || ""),
                        }));
                        setInventory(items);
                    }
                } catch (err) {
                    console.error("Failed to fetch inventory:", err);
                }
            })();
        }, []);


    const isExpired = (d?: string) => (d ? new Date(d) < new Date(new Date().toDateString()) : false);
    const isExpiringSoon = (d?: string) => {
        if (!d) return false;
        const today = new Date(new Date().toDateString());
        const soon = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const dt = new Date(d);
        return dt >= today && dt <= soon;
    };

    const filtered = useMemo(() => {
        return inventory.filter((i) => {
            const q = query.toLowerCase();
            const matches = !q || `${i.name} ${i.sku} ${i.location} ${i.category} ${i.lot ?? ""}`.toLowerCase().includes(q);
            const st = status === "All" || i.status === status;
            const tp = type === "All" || i.category === (type as InventoryItem["category"]);
            let expCheck = true;
            if (expiry === "Expired") expCheck = isExpired(i.expiry);
            if (expiry === "Expiring Soon") expCheck = isExpiringSoon(i.expiry);
            return matches && st && tp && expCheck;
        });
    }, [inventory, query, status, type, expiry]);

    // Validate mandatory fields
    function validateForm(formData: FormData): boolean {
        const errors: Record<string, string> = {};
        
        if (!formData.get("name")?.toString().trim()) {
            errors.name = "Please fill out this field";
        }
        if (!formData.get("category")?.toString().trim()) {
            errors.category = "Please fill out this field";
        }
        if (!formData.get("lot")?.toString().trim()) {
            errors.lot = "Please fill out this field";
        }
        if (!formData.get("sku")?.toString().trim()) {
            errors.sku = "Please fill out this field";
        }
        if (!formData.get("stock") || Number(formData.get("stock")) < 0) {
            errors.stock = "Please fill out this field";
        }
        if (!formData.get("unit")?.toString().trim()) {
            errors.unit = "Please fill out this field";
        }
        if (!formData.get("minStock") || Number(formData.get("minStock")) < 0) {
            errors.minStock = "Please fill out this field";
        }
        if (!formData.get("location")?.toString().trim()) {
            errors.location = "Please fill out this field";
        }
        if (!formData.get("supplier")?.toString().trim()) {
            errors.supplier = "Please fill out this field";
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function addItem(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        
        if (!validateForm(form)) {
            return;
        }

        const dto = {
            name: String(form.get("name") || "New Item"),
            category: (String(form.get("category")) as InventoryItem["category"]) || "Consumable",
            lot: (String(form.get("lot") || "").trim() || undefined),
            expiry: (String(form.get("expiry") || "").trim() || undefined),
            sku: String(form.get("sku") || "SKU-NEW"),
            stock: Number(form.get("stock") || 0),
            unit: String(form.get("unit") || "pcs"),
            minStock: Number(form.get("minStock") || 0),
            location: String(form.get("location") || "Main"),
            supplier: String(form.get("supplier") || ""),
            status: (String(form.get("status")) as InventoryItem["status"]) || "Active",
        };

        try {
            const res = await fetchWithAuth(`${API_URL}/api/inventory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dto),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed to create");

            const created = json.data;
            const uiItem: InventoryItem = {
                id: String(created.id),
                name: created.name,
                category: created.category,
                lot: created.lot ?? undefined,
                expiry: created.expiry ?? undefined,
                sku: created.sku,
                stock: created.stock,
                unit: created.unit,
                minStock: created.minStock,
                location: created.location,
                status: created.status,
                supplier: created.supplier || "",   // ✅ include supplier

            };

            setInventory(prev => [uiItem, ...prev]);
            setAddOpen(false);
            setValidationErrors({});

            // ✅ Success alert
            setAlertData({
                variant: "success",
                title: "Item Added",
                message: `${created.name} was added successfully.`,
            });
        } catch (err) {
            console.error("Create inventory failed:", err);
            setShowErrorPopup(true);
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to add inventory item.",
            });
        }
    }



    async function editItem(id: string, updates: Partial<InventoryItem>) {
        try {
            const res = await fetchWithAuth(`${API_URL}/api/inventory/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed");

            const updated = json.data;
            setInventory(prev =>
                prev.map(i => (i.id === id ? { ...i, ...updated } : i))
            );
            setSelected(null);

            // ✅ Success alert
            setAlertData({
                variant: "success",
                title: "Item Updated",
                message: `${updated.name} was updated successfully.`,
            });
        } catch (err) {
            console.error("Edit failed:", err);
            setShowErrorPopup(true);
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to update inventory item.",
            });
        }
    }

    async function reorderItem(
        id: string,
        payload: { supplier: string; stock: number }
    ) {
        try {
            const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
            const res = await fetchWithAuth(`${API_URL}/api/inventory/${id}/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplier: payload.supplier,
                    stock: payload.stock,            // ✅ make sure backend sees correct field
                    itemName: selected?.name,        // ✅ backend expects itemName
                    category: selected?.category,    // ✅ include category for context
                    status: "Pending",
                    date: today,
                    amount: 0,                       // backend expects amount field in OrderDto
                }),
            });

            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed to reorder");

            const order = json.data;

            // ✅ Close modal
            setSelected(null);
            setReorderMode(false);

            // ✅ Refresh inventory list
            const refreshed = await fetchWithAuth(`${API_URL}/api/inventory/list`);
            const refreshedJson = await refreshed.json();
            if (refreshed.ok && refreshedJson.success) {
                setInventory(refreshedJson.data);
            }

            // ✅ Success alert
            setAlertData({
                variant: "success",
                title: "Reorder Placed",
                message: `Order ${order.orderNumber} was created for ${order.supplier}.`,
            });
        } catch (err) {
            console.error("Reorder failed:", err);
            setShowErrorPopup(true);
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to place reorder.",
            });
        }
    }




    async function deleteItem(id: string) {
        if (!confirm("Are you sure you want to delete this item?")) {
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_URL}/api/inventory/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed");

            setInventory(prev => prev.filter(i => i.id !== id));
            setSelected(null);

            // ✅ Success alert
            setAlertData({
                variant: "success",
                title: "Item Deleted",
                message: "The inventory item was deleted successfully.",
            });
        } catch (err) {
            console.error("Delete failed:", err);
            setShowErrorPopup(true);
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to delete inventory item.",
            });
        }
    }


    return (
        <AdminLayout>
            <div className="container mx-auto p-6 overflow-x-hidden text-gray-800 dark:text-gray-200">
                {/* ✅ Alert at the top */}
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
                Manage stock items, expiry dates, and stock levels.
            </p>
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <Label className="text-sm text-slate-700 dark:text-slate-300">Type</Label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="h-9 w-48 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="All">All</option>
                        {typeOptions.map(opt => (
                            <option key={opt.id} value={opt.label}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label className="text-sm text-slate-700 dark:text-slate-300">Status</Label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="h-9 w-40 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="All">All</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
                <div>
                    <Label className="text-sm text-slate-700 dark:text-slate-300">Expiry</Label>
                    <select
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="h-9 w-44 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="Any">Any</option>
                        <option value="Expired">Expired</option>
                        <option value="Expiring Soon">Expiring Soon</option>
                    </select>
                </div>
                <div className="ml-auto">
                    <Input
                        className="w-72 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        placeholder="Search items…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div>
                    <Button
                        onClick={() => {
                            setAddOpen(true);
                            setValidationErrors({});
                        }}
                        className="w-30 h-10 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                        + Add Item
                    </Button>
                </div>
            </div>

            {/* Table */}
            <TableShell>
                <table className="w-full table-auto text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr className="text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                        <th className="px-6 py-3">Suppliers</th>
                        <th className="px-6 py-3">Item</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Lot</th>
                        <th className="px-6 py-3">Expiry</th>
                        <th className="px-6 py-3 text-right">On Hand</th>
                        <th className="px-6 py-3">Clinic</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((i) => {
                        // 🔎 Calculate % of stock vs minStock
                        const percent = i.minStock > 0 ? (i.stock / i.minStock) * 100 : 100;

                        let pillTone: "neutral" | "warn" | "ok" | "danger";
                        let pillText: string;

                        if (i.stock === 0) {
                            pillTone = "danger";
                            pillText = "Out";
                        } else if (lowStockAlerts && percent <= criticalLowPercentage) {
                            pillTone = "danger";
                            pillText = "Critical";
                        } else if (lowStockAlerts && i.stock <= i.minStock) {
                            pillTone = "warn";
                            pillText = "Low";
                        } else {
                            pillTone = "ok";
                            pillText = "OK";
                        }
                        return (
                            <tr key={i.id} className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">{i.supplier || "—"}</td>
                                <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{i.name}</td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">{i.category}</td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">{i.lot || "—"}</td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">{dateLabel(i.expiry)}</td>
                                <td className="px-6 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">{i.stock}</td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">{i.location}</td>
                                <td className="px-6 py-3">
                                    <Pill
                                        tone={
                                            i.status === "Inactive"
                                                ? "neutral"
                                                : isExpired(i.expiry)
                                                    ? "danger"
                                                    : isExpiringSoon(i.expiry)
                                                        ? "warn"
                                                        : pillTone
                                        }
                                    >
                                        {i.status === "Inactive"
                                            ? "Inactive"
                                            : isExpired(i.expiry)
                                                ? "Expired"
                                                : isExpiringSoon(i.expiry)
                                                    ? "Expiring Soon"
                                                    : pillText}
                                    </Pill>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <Button
                                        className="rounded-2xl px-3 py-1 text-xs"
                                        onClick={() => {
                                            setSelected(i);
                                            setEditMode(false);   // ✅ reset editMode when opening
                                        }}
                                    >
                                        View
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </TableShell>

            {/* Pagenation*/}
            <div className="mt-3 flex items-center justify-between px-3 py-2 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm">
                <div className="flex items-center gap-3">
                    <button
                        disabled={currentPage === 1 || loading}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                    >
                        Prev
                    </button>
                    <div>Page {currentPage} of {totalPages}</div>
                    <button
                        disabled={currentPage === totalPages || loading}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                    >
                        Next
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <div>Showing {loading ? "…" : inventory.length} of {totalItems}</div>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="border rounded px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>


            {/* Details Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">

                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Item Details — {selected.name}
                            </h3>
                            <button
                                onClick={() => {
                                    setSelected(null);
                                    setEditMode(false);
                                    setReorderMode(false);   // ✅ reset reorder mode too

                                }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body + Footer combined */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const form = new FormData(e.currentTarget);

                                if (reorderMode) {
                                    // ✅ Reorder API call
                                    reorderItem(selected!.id, {
                                        supplier: String(form.get("supplier") || ""),
                                        stock: Number(form.get("stock") || 0),
                                    });
                                } else {
                                    // ✅ Edit API call
                                    editItem(selected!.id, {
                                        name: String(form.get("name")),
                                        category: form.get("category") as "Consumable" | "Device",
                                        lot: String(form.get("lot") || ""),
                                        expiry: String(form.get("expiry") || ""),
                                        sku: String(form.get("sku") || ""),
                                        stock: Number(form.get("stock") || 0),
                                        unit: String(form.get("unit") || ""),
                                        minStock: Number(form.get("minStock") || 0),
                                        supplier: String(form.get("supplier") || ""),
                                        location: String(form.get("location") || ""),
                                        status: form.get("status") as "Active" | "Inactive",
                                    });
                                }
                            }}
                            className="flex flex-col max-h-[70vh]"
                        >

                        <div className="flex-1 overflow-y-auto p-6 text-sm">
                                {editMode ? (
                                    // ✅ Edit Form
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div>
                                            <Label>Supplier</Label>
                                            <select
                                                name="supplier"
                                                defaultValue={selected?.supplier || ""}
                                                className="h-10 w-full rounded-md border px-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                required
                                            >
                                                <option value="" disabled>Select supplier</option>
                                                {supplierOptions.map(s => (
                                                    <option key={s.id} value={s.name}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Name</Label>
                                            <Input name="name" defaultValue={selected.name} className="h-10" />
                                        </div>
                                        <div>
                                            <Label>Category</Label>
                                            <select
                                                name="category"
                                                defaultValue={selected.category}
                                                className="h-10 w-full rounded-md border px-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                required
                                            >
                                                {typeOptions.map(opt => (
                                                    <option key={opt.id} value={opt.label}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Lot</Label>
                                            <Input name="lot" defaultValue={selected?.lot || ""} className="h-10" />                                        </div>
                                        <div>
                                            <Label>Expiry</Label>
                                            <Input
                                                type="text"
                                                name="expiry"
                                                defaultValue={formatDateForInput(selected.expiry)}
                                                placeholder="MM/DD/YYYY"
                                                className="h-10"
                                                maxLength={10}
                                                onChange={(e) => {
                                                    let v = e.target.value.replace(/\D/g, "");
                                                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                                                    if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5, 9);
                                                    e.target.value = v;
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <Label>SKU</Label>
                                            <Input name="sku" defaultValue={selected.sku} className="h-10" />
                                        </div>
                                        <div>
                                            <Label>Stock</Label>
                                            <Input type="number" name="stock" defaultValue={selected?.stock ?? 0} className="h-10" />
                                        </div>
                                        <div>
                                            <Label>Unit</Label>
                                            <Input name="unit" defaultValue={selected?.unit || ""} className="h-10" />                                        </div>
                                        <div>
                                            <Label>Min. Required</Label>
                                            <Input type="number" name="minStock" defaultValue={selected?.minStock ?? 0} className="h-10" />
                                        </div>
                                        <div>
                                            <Label>Clinic</Label>
                                            <Input name="location" defaultValue={selected?.location || ""} className="h-10" />
                                        </div>
                                        <div>
                                            <Label>Status</Label>
                                            <select
                                                name="status"
                                                defaultValue={selected.status}
                                                className="h-10 w-full rounded-md border px-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : reorderMode ? (
                                    // ✅ Reorder Form
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div>
                                            <Label>Supplier</Label>
                                            <select
                                                name="supplier"
                                                defaultValue={selected?.supplier || ""}
                                                className="h-10 w-full rounded-md border px-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                required
                                            >
                                                <option value="" disabled>Select supplier</option>
                                                {supplierOptions.map(s => (
                                                    <option key={s.id} value={s.name}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Item Name</Label>
                                            <Input type="text" defaultValue={selected?.name || ""} readOnly />                                        </div>
                                        <div>
                                            <Label>Category</Label>
                                            <Input type="text" defaultValue={selected?.category || ""} readOnly />                                        </div>
                                        <div>
                                            <Label>Stock Quantity</Label>
                                            <Input
                                                type="number"
                                                name="stock"
                                                min={1}
                                                defaultValue={selected.stock}
                                                required
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    // ✅ Read-only Info view
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Info label="Suppliers" value={selected.supplier || "—"} />
                                        <Info label="Name" value={selected.name} />
                                        <Info label="Category" value={selected.category} />
                                        <Info label="Lot" value={selected.lot || "—"} />
                                        <Info label="Expiry" value={dateLabel(selected.expiry)} />
                                        <Info label="SKU" value={selected.sku} />
                                        <Info label="Stock" value={selected.stock} />
                                        <Info label="Unit" value={selected.unit} />
                                        <Info label="Min. Required" value={String(selected.minStock)} />
                                        <Info label="Clinic" value={selected.location} />
                                        <Info label="Status" value={selected.status} />
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setSelected(null);
                                        setEditMode(false);
                                        setReorderMode(false);
                                    }}
                                >
                                    Cancel
                                </Button>

                                {(editMode || reorderMode) && (
                                    <Button
                                        type="submit"
                                        className={
                                            editMode
                                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                                :"rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                                        }
                                    >
                                        {editMode ? "Save" : "Reorder"}
                                    </Button>
                                )}


                                {!editMode && !reorderMode && (
                                    <>
                                        <Button type="button" onClick={() => setEditMode(true)}>
                                            Edit
                                        </Button>
                                        {selected.status === "Active" && (
                                            <Button
                                                type="button"
                                                className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                                                onClick={() => {
                                                    setReorderMode(true);
                                                    setEditMode(false);
                                                }}
                                            >
                                                Reorder
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
                                            onClick={() => setDeleteTarget(selected)}
                                        >
                                            Delete
                                        </Button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ✅ Delete confirmation modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Delete Item
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Are you sure you want to delete{" "}
                            <span className="font-medium">{deleteTarget.name}</span>?
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-rose-600 text-white hover:bg-rose-700"
                                onClick={async () => {
                                    await deleteItem(deleteTarget.id);
                                    setDeleteTarget(null);
                                }}
                            >
                                Yes, Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {addOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">

                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Add Inventory Item
                            </h3>
                            <button
                                onClick={() => setAddOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body + Footer */}
                        <form onSubmit={addItem} className="flex flex-col max-h-[70vh]">
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 gap-6 sm:grid-cols-2 text-sm">
                                <div>
                                    <div>
                                        <Label>Supplier <span className="text-red-500">*</span></Label>
                                        <select
                                            name="supplier"
                                            defaultValue=""
                                            className={`h-10 w-full rounded-md border px-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
                                                validationErrors.supplier ? 'border-red-500' : ''
                                            }`}
                                            onChange={() => {
                                                if (validationErrors.supplier) {
                                                    setValidationErrors(prev => ({ ...prev, supplier: '' }));
                                                }
                                            }}
                                        >
                                            <option value="" disabled>Select supplier</option>
                                            {supplierOptions.map(s => (
                                                <option key={s.id} value={s.name}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                        {validationErrors.supplier && (
                                            <p className="mt-1 text-xs text-red-500">{validationErrors.supplier}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label>Name <span className="text-red-500">*</span></Label>
                                    <Input 
                                        name="name" 
                                        className={`h-10 ${
                                            validationErrors.name ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.name) {
                                                setValidationErrors(prev => ({ ...prev, name: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.name && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.name}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Category <span className="text-red-500">*</span></Label>
                                    <select
                                        name="category"
                                        defaultValue=""
                                        className={`h-10 w-full rounded-md border px-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
                                            validationErrors.category ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.category) {
                                                setValidationErrors(prev => ({ ...prev, category: '' }));
                                            }
                                        }}
                                    >
                                        <option value="" disabled>Select category</option>
                                        {typeOptions.map(opt => (
                                            <option key={opt.id} value={opt.label}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.category && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.category}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Lot <span className="text-red-500">*</span></Label>
                                    <Input 
                                        name="lot" 
                                        placeholder="LOT- / SN-" 
                                        className={`h-10 ${
                                            validationErrors.lot ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.lot) {
                                                setValidationErrors(prev => ({ ...prev, lot: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.lot && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.lot}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Expiry</Label>
                                    <Input
                                        type="text"
                                        name="expiry"
                                        placeholder="MM/DD/YYYY"
                                        className="h-10"
                                        maxLength={10}
                                        onChange={(e) => {
                                            let v = e.target.value.replace(/\D/g, ""); // digits only
                                            if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                                            if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5, 9);
                                            e.target.value = v;
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label>SKU <span className="text-red-500">*</span></Label>
                                    <Input 
                                        name="sku" 
                                        className={`h-10 ${
                                            validationErrors.sku ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.sku) {
                                                setValidationErrors(prev => ({ ...prev, sku: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.sku && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.sku}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Unit <span className="text-red-500">*</span></Label>
                                    <Input 
                                        name="unit" 
                                        placeholder="pcs / box / pair" 
                                        className={`h-10 ${
                                            validationErrors.unit ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.unit) {
                                                setValidationErrors(prev => ({ ...prev, unit: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.unit && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.unit}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>On Hand <span className="text-red-500">*</span></Label>
                                    <Input 
                                        name="stock" 
                                        type="number" 
                                        min={0} 
                                        className={`h-10 ${
                                            validationErrors.stock ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.stock) {
                                                setValidationErrors(prev => ({ ...prev, stock: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.stock && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.stock}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Min. Required <span className="text-red-500">*</span></Label>
                                    <Input 
                                        name="minStock" 
                                        type="number" 
                                        min={0} 
                                        className={`h-10 ${
                                            validationErrors.minStock ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.minStock) {
                                                setValidationErrors(prev => ({ ...prev, minStock: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.minStock && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.minStock}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Clinic <span className="text-red-500">*</span></Label>
                                    <Input 
                                        name="location" 
                                        placeholder="Main" 
                                        className={`h-10 ${
                                            validationErrors.location ? 'border-red-500' : ''
                                        }`}
                                        onChange={() => {
                                            if (validationErrors.location) {
                                                setValidationErrors(prev => ({ ...prev, location: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.location && (
                                        <p className="mt-1 text-xs text-red-500">{validationErrors.location}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Status</Label>
                                    <select
                                        name="status"
                                        defaultValue="Active"
                                        className="h-10 w-full rounded-md border px-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
                                <Button type="button" onClick={() => {
                                    setAddOpen(false);
                                    setValidationErrors({});
                                }}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                    Save Item
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Error Popup */}
            {showErrorPopup && alertData && alertData.variant === "error" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900">{alertData.title}</h4>
                                <p className="mt-1 text-sm text-gray-600">{alertData.message}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                onClick={() => {
                                    setShowErrorPopup(false);
                                    setAlertData(null);
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
            </div>
        </AdminLayout>
    );
}
