"use client";

import { getEnv } from "@/utils/env";
import React, { useMemo, useState, useEffect, useRef } from "react";

// Add CSS to hide number input spinners
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
    `;
    document.head.appendChild(style);
}
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";


/** Types */
type Order = {
    id: number;
    orderNumber: string;
    supplier: string;
    itemName: string;
    category: string;
    date: string;
    status: "Pending" | "Received" | "Cancelled";
    stock: number;   //  replaced itemsCount with stock
    amount: number;
};

type ApiResponse<T> = {
    success?: boolean;
    message?: string;
    data?: T;
};

/** Helpers */
const currency = (n: number) => {
    if (n === null || n === undefined || !isFinite(n)) {
        return "₹0";
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
};

function TableShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
            {children}
        </div>
    );
}

function dateLabel(iso?: string) {
    if (!iso || !iso.trim()) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso; // fallback if invalid
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}


function Pill({
                  children,
                  tone = "neutral" as const,
              }: {
    children: React.ReactNode;
    tone?: "neutral" | "warn" | "ok" | "danger";
}) {
    const map: Record<string, string> = {
        neutral:
            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        warn: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
        ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
        danger: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
    };
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[tone]}`}
        >
      {children}
    </span>
    );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className="text-slate-500 dark:text-slate-400">{label}</div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
                {value}
            </div>
        </div>
    );
}



/** Component */
export default function Orders() {
    const [orders, setOrders] = useState<Order[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('orders');
            return cached ? JSON.parse(cached) : [];
        }
        return [];
    });
    const [status, setStatus] = useState<string>("All");
    const [selected, setSelected] = useState<Order | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [createModalError, setCreateModalError] = useState<string | null>(null);
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);


    const [alertData, setAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (alertData) {
            const t = setTimeout(() => setAlertData(null), 4000);
            return () => clearTimeout(t);
        }
    }, [alertData]);



    useEffect(() => {
        async function loadOrders() {
            setLoading(true);
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/orders?page=${
                        currentPage - 1
                    }&size=${pageSize}`
                );
                const json = await res.json();

                if (json.success && json.data) {
                    let items: Order[] = [];

                    if (json.data?.content && Array.isArray(json.data.content)) {
                        items = json.data.content;
                        setTotalPages(json.data.totalPages);
                        setTotalItems(json.data.totalElements);
                    } else if (Array.isArray(json.data)) {
                        items = json.data;
                        setTotalPages(1);
                        setTotalItems(items.length);
                    }

                    if (items.length > 0) {
                        const mappedOrders = items.map((o) => ({
                            id: o.id,
                            orderNumber: o.orderNumber,
                            supplier: o.supplier,
                            date: o.date,
                            itemName: o.itemName,
                            category: o.category,
                            status: o.status,
                            stock: o.stock ?? 0,
                            amount: o.amount ?? 0,
                        }));
                        setOrders(mappedOrders);
                        localStorage.setItem('orders', JSON.stringify(mappedOrders));
                    }
                }
            } catch (err) {
                console.error("Failed to load orders", err);
            } finally {
                setLoading(false);
            }
        }

        loadOrders();
    }, [currentPage, pageSize]);

    const filtered = useMemo(
        () => orders.filter((o) => status === "All" || o.status === status),
        [orders, status]
    );

    /** ✅ Generate next PO Number */
    function generatePONumber() {
        const existingNumbers = new Set(orders.map(order => order.orderNumber));
        let counter = 10001;
        let newPO;
        do {
            newPO = `PO-${counter}`;
            counter++;
        } while (existingNumbers.has(newPO));
        return newPO;
    }

    /** ✅ Create New Order */
    async function createOrder(orderData: Omit<Order, 'id' | 'orderNumber'>) {
        setCreateModalError(null);
        try {
            const orderWithPO = {
                ...orderData,
                orderNumber: generatePONumber()
            };

            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/orders`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderWithPO),
                }
            );

            let json: ApiResponse<Order> = {};
            try {
                const text = await res.text();
                json = text ? JSON.parse(text) : {};
            } catch {
                json = {};
            }

            if (!res.ok || json.success === false) {
                throw new Error(json.message || "Failed to create order");
            }

            const newOrder = json.data ?? { ...orderWithPO, id: Date.now() };
            const updatedOrders = [...orders, newOrder];
            setOrders(updatedOrders);
            localStorage.setItem('orders', JSON.stringify(updatedOrders));
            setShowCreateModal(false);
            setCreateModalError(null);

            setAlertData({
                variant: "success",
                title: "Order Created",
                message: `Order ${newOrder.orderNumber} was created successfully.`,
            });
        } catch (err) {
            console.error("Create failed:", err);
            setCreateModalError(err instanceof Error ? err.message : "Failed to create order.");
        }
    }

    /** ✅ Update Order */
    async function updateOrder(id: number, updates: Partial<Order>) {
        setModalError(null);
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/orders/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                }
            );

            let json: ApiResponse<Order> = {};
            try {
                const text = await res.text();
                json = text ? JSON.parse(text) : {};
            } catch (parseErr) {
                json = {};
            }

            if (!res.ok || json.success === false) {
                throw new Error(json.message || `HTTP ${res.status}: Failed to update order`);
            }

            const updated = json.data ?? { ...selected, ...updates };
            const updatedOrders = orders.map(o => (o.id === id ? { ...o, ...updated } : o));
            setOrders(updatedOrders);
            localStorage.setItem('orders', JSON.stringify(updatedOrders));
            setSelected(null);
            setEditMode(false);
            setModalError(null);

            const statusMessage = updates.status === "Received" 
                ? `Order ${updated.orderNumber ?? id} was marked as received — Amount: ${currency(updated.amount ?? 0)}`
                : `Order ${updated.orderNumber ?? id} was updated successfully`;

            setAlertData({
                variant: "success",
                title: updates.status === "Received" ? "Order Received" : "Order Updated",
                message: statusMessage,
            });
        } catch (err) {
            console.error("Update failed:", err);
            setModalError(err instanceof Error ? err.message : "Failed to update order.");
        }
    }
    return (
        <AdminLayout>
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
            <div className="flex items-center justify-between">
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    View and manage purchase orders, statuses, and receipts.
                </p>
                <Button
                    className="h-8 px-3 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setShowCreateModal(true)}
                >
                    + New Order
                </Button>
            </div>

            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-slate-700 dark:text-slate-300">
                            Status
                        </Label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="h-9 w-40 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                            <option value="All">All</option>
                            <option value="Pending">Pending</option>
                            <option value="Received">Received</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <TableShell>
                    <table className="w-full table-auto text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr className="text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                            <th className="px-6 py-3">PO #</th>
                            <th className="px-6 py-3">Supplier</th>
                            <th className="px-6 py-3">Item Name</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Stock</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((o) => (
                            <tr
                                key={o.id}
                                className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                                <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">
                                    {o.orderNumber}
                                </td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">
                                    {o.supplier}
                                </td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">
                                    {o.itemName}
                                </td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">
                                    {o.category}
                                </td>
                                <td className="px-6 py-3 text-gray-700 dark:text-gray-200">
                                    {dateLabel(o.date)}
                                </td>
                                <td className="px-6 py-3">
                                    <Pill
                                        tone={
                                            o.status === "Cancelled"
                                                ? "danger"
                                                : o.status === "Pending"
                                                    ? "warn"
                                                    : "ok"
                                        }
                                    >
                                        {o.status}
                                    </Pill>
                                </td>
                                <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-200">
                                    {o.stock}
                                </td>
                                <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-200">
                                    {currency(o.amount)}
                                </td>
                                <td className="px-6 py-3 text-right space-x-2">
                                    <Button
                                        className="rounded-2xl px-3 py-1 text-xs"
                                        onClick={() => setSelected(o)}
                                    >
                                        View
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </TableShell>

                {/* ✅ Pagination Footer */}
                <div className="mt-3 flex items-center justify-between px-3 py-2 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm">
                    <div className="flex items-center gap-3">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                            Prev
                        </button>
                        <div>
                            Page {currentPage} of {totalPages}
                        </div>
                        <button
                            disabled={currentPage === totalPages || loading}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                            Next
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            Showing {loading ? "…" : orders.length} of {totalItems}
                        </div>
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


                {/* Modal */}
                {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">

                            {/* Header */}
                            <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Order Details — {selected.orderNumber}
                                </h3>
                                <button
                                    onClick={() => {
                                        setSelected(null);
                                        setEditMode(false);
                                        setModalError(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    
                                    // Convert MM/DD/YYYY to ISO format if needed
                                    const dateValue = String(fd.get("date") || selected!.date);
                                    let isoDate = dateValue;
                                    if (dateValue.includes("/")) {
                                        const [mm, dd, yyyy] = dateValue.split("/");
                                        isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                                    }

                                    const statusValue = String(fd.get("status") || selected!.status);
                                    const stockValue = Number(fd.get("stock") || selected!.stock || 0);
                                    const amountValue = Number(fd.get("amount") || selected!.amount || 0);

                                    updateOrder(selected!.id, {
                                        orderNumber: String(fd.get("orderNumber") || selected!.orderNumber),
                                        supplier: String(fd.get("supplier") || selected!.supplier),
                                        itemName: String(fd.get("itemName") || selected!.itemName),
                                        category: String(fd.get("category") || selected!.category),
                                        date: isoDate,
                                        status: statusValue as Order["status"],
                                        stock: stockValue,
                                        amount: amountValue,
                                    });
                                }}
                                className="flex flex-col max-h-[70vh]"
                            >

                                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 gap-4 text-sm">
                                    {modalError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                                            {modalError}
                                        </div>
                                    )}
                                    {editMode ? (
                                        <>
                                            <div>
                                                <Label>PO Number</Label>
                                                <Input name="orderNumber" defaultValue={selected.orderNumber} disabled />
                                            </div>
                                            <div>
                                                <Label>Supplier <span className="text-red-500">*</span></Label>
                                                <Input name="supplier" defaultValue={selected.supplier} required />
                                            </div>
                                            <div>
                                                <Label>Item Name <span className="text-red-500">*</span></Label>
                                                <Input name="itemName" defaultValue={selected.itemName} required />
                                            </div>
                                            <div>
                                                <Label>Category <span className="text-red-500">*</span></Label>
                                                <Input name="category" defaultValue={selected.category} required />
                                            </div>
                                            <div>
                                                <Label>Date <span className="text-red-500">*</span></Label>
                                                <input
                                                    type="date"
                                                    name="date"
                                                    defaultValue={selected.date ? new Date(selected.date).toISOString().split('T')[0] : ''}
                                                    className="order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <Label>Status <span className="text-red-500">*</span></Label>
                                                <select
                                                    name="status"
                                                    defaultValue={selected.status}
                                                    className="h-9 w-full rounded-md border dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                    required
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Received">Received</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Stock</Label>
                                                <input
                                                    type="number"
                                                    name="stock"
                                                    defaultValue={selected.stock ?? 0}
                                                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                    style={{
                                                        MozAppearance: 'textfield',
                                                        WebkitAppearance: 'none'
                                                    }}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                />
                                            </div>
                                            <div>
                                                <Label>Amount (₹)</Label>
                                                <input
                                                    type="number"
                                                    name="amount"
                                                    defaultValue={selected.amount ?? 0}
                                                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                    style={{
                                                        MozAppearance: 'textfield',
                                                        WebkitAppearance: 'none'
                                                    }}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Info label="PO Number" value={selected.orderNumber} />
                                            <Info label="Supplier" value={selected.supplier} />
                                            <Info label="Item Name" value={selected.itemName} />
                                            <Info label="Category" value={selected.category} />
                                            <Info label="Date" value={dateLabel(selected.date)} />
                                            <Info label="Status" value={selected.status} />
                                            <Info label="Stock" value={selected.stock ?? 0} />
                                            <Info label="Amount" value={currency(selected.amount ?? 0)} />
                                        </>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setEditMode(false); // cancel edit but keep modal open
                                            setSelected(null);  // close modal completely
                                            setModalError(null);
                                        }}
                                    >
                                        {editMode ? "Cancel" : "Cancel"}
                                    </Button>

                                    {editMode && (
                                        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                            Save Changes
                                        </Button>
                                    )}

                                    {!editMode && (
                                        <Button type="button" onClick={() => setEditMode(true)}>
                                            Edit
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Create Order Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Create New Order
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setCreateModalError(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    
                                    createOrder({
                                        supplier: String(fd.get("supplier") || ""),
                                        itemName: String(fd.get("itemName") || ""),
                                        category: String(fd.get("category") || ""),
                                        date: String(fd.get("date") || ""),
                                        status: "Pending",
                                        stock: Number(fd.get("stock") || 0),
                                        amount: Number(fd.get("amount") || 0),
                                    });
                                }}
                                className="p-6 grid grid-cols-1 gap-4 text-sm"
                            >
                                {createModalError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                                        {createModalError}
                                    </div>
                                )}

                                <div>
                                    <Label>Supplier <span className="text-red-500">*</span></Label>
                                    <Input name="supplier" required />
                                </div>
                                <div>
                                    <Label>Item Name <span className="text-red-500">*</span></Label>
                                    <Input name="itemName" required />
                                </div>
                                <div>
                                    <Label>Category <span className="text-red-500">*</span></Label>
                                    <Input name="category" required />
                                </div>
                                <div>
                                    <Label>Date <span className="text-red-500">*</span></Label>
                                    <input
                                        type="date"
                                        name="date"
                                        className="order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Stock</Label>
                                    <input
                                        type="number"
                                        name="stock"
                                        defaultValue={0}
                                        className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        style={{
                                            MozAppearance: 'textfield',
                                            WebkitAppearance: 'none'
                                        }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </div>
                                <div>
                                    <Label>Amount (₹)</Label>
                                    <input
                                        type="number"
                                        name="amount"
                                        defaultValue={0}
                                        className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        style={{
                                            MozAppearance: 'textfield',
                                            WebkitAppearance: 'none'
                                        }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreateModalError(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                        Create Order
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
