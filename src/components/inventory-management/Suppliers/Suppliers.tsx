"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";

/** Types */
type Supplier = {
    id: number;
    orgId: number;
    name: string;
    contact: string;
    phone: string;
    email: string;
    createdDate?: string;
    lastModifiedDate?: string;
    externalId?: string;
};

/** UI */
function TableShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
            {children}
        </div>
    );
}

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('suppliers');
            return cached ? JSON.parse(cached) : [];
        }
        return [];
    });
    const [addOpen, setAddOpen] = useState(false);
    const [selected, setSelected] = useState<Supplier | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);

    // ✅ Alert state
    const [alertData, setAlertData] = useState<{
        variant: "success" | "error";
        title: string;
        message: string;
    } | null>(null);

    // Form validation errors
    const [formErrors, setFormErrors] = useState<{
        name?: string;
        email?: string;
        phone?: string;
    }>({});

    useEffect(() => {
        if (alertData) {
            const timer = setTimeout(() => setAlertData(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [alertData]);

    // Load suppliers
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers?page=${currentPage - 1}&size=${pageSize}`
                );
                const json = await res.json();
                if (json.success && json.data) {
                    const data = json.data.content || [];
                    if (data.length > 0) {
                        setSuppliers(data);
                        localStorage.setItem('suppliers', JSON.stringify(data));
                    }
                    setTotalPages(json.data.totalPages);
                    setTotalItems(json.data.totalElements);
                }
            } catch (err) {
                console.error("Failed to load suppliers", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [currentPage, pageSize]);
    // Validate form
    function validateForm(data: { name: string; email: string; phone: string }) {
        const errors: { name?: string; email?: string; phone?: string } = {};
        
        if (!data.name.trim()) errors.name = "Please fill out this field";
        if (!data.email.trim()) errors.email = "Please fill out this field";
        if (!data.phone.trim()) errors.phone = "Please fill out this field";
        
        return errors;
    }

    // Add
    async function addSupplier(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body = {
            name: String(fd.get("name") || ""),
            phone: String(fd.get("phone") || ""),
            email: String(fd.get("email") || ""),
        };

        // Validate mandatory fields
        const errors = validateForm(body);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        
        setFormErrors({});
        
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                }
            );
            const json = await res.json();
            if (json.success && json.data) {
                const updated = [json.data, ...suppliers];
                setSuppliers(updated);
                localStorage.setItem('suppliers', JSON.stringify(updated));
                setAddOpen(false);
                setAlertData({
                    variant: "success",
                    title: "Supplier Added",
                    message: `${json.data.name} was added successfully.`,
                });
            } else {
                setAlertData({
                    variant: "error",
                    title: "Error",
                    message: json.message || "Failed to add supplier.",
                });
            }
        } catch {
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to add supplier.",
            });
        }
    }

    // Update
    async function editSupplier(id: number, updates: Partial<Supplier>) {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                }
            );
            const json = await res.json();
            if (json.success && json.data) {
                const updated = suppliers.map((s) => (s.id === id ? { ...s, ...json.data } : s));
                setSuppliers(updated);
                localStorage.setItem('suppliers', JSON.stringify(updated));
                setSelected(null);
                setEditMode(false);
                setAlertData({
                    variant: "success",
                    title: "Supplier Updated",
                    message: `${json.data.name} was updated successfully.`,
                });
            }
        } catch {
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to update supplier.",
            });
        }
    }

    // Delete
    async function deleteSupplier(id: number) {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${id}`,
                { method: "DELETE" }
            );
            const json = await res.json();
            if (json.success) {
                const updated = suppliers.filter((s) => s.id !== id);
                setSuppliers(updated);
                localStorage.setItem('suppliers', JSON.stringify(updated));
                setSelected(null);
                setDeleteTarget(null);
                setAlertData({
                    variant: "success",
                    title: "Supplier Deleted",
                    message: "Supplier was deleted successfully.",
                });
            }
        } catch {
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to delete supplier.",
            });
        }
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-between p-1">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage supplier information, ratings, and contact details.
                </p>
                <Button
                    onClick={() => {
                        setAddOpen(true);
                        setFormErrors({});
                        setAlertData(null);
                    }}
                    className="h-8 px-3 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                    + Add Supplier
                </Button>
            </div>
            <div className="space-y-4">
                {alertData && !addOpen && (
                    <Alert
                        variant={alertData.variant}
                        title={alertData.title}
                        message={alertData.message}
                    />
                )}

                <TableShell>
                    <table className="w-full table-auto text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr className="text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {suppliers.map((s) => (
                            <tr
                                key={s.id}
                                className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                                <td className="px-6 py-3">{s.name}</td>
                                <td className="px-6 py-3">{s.phone}</td>
                                <td className="px-6 py-3">{s.email}</td>
                                <td className="px-6 py-3 text-right">
                                    <Button
                                        className="rounded-2xl px-3 py-1 text-xs"
                                        onClick={() => {
                                            setSelected(s);
                                            setEditMode(false);
                                        }}
                                    >
                                        View
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </TableShell>


                {/* ✅ Pagination controls */}
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
                            Showing {loading ? "…" : suppliers.length} of {totalItems}
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

                {/* Add Supplier Modal */}
                {addOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-lg rounded-2xl border bg-white dark:bg-gray-900">
                            {/* Header */}
                            <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Add Supplier
                                </h3>
                                <button
                                    onClick={() => setAddOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Alert in modal */}
                            {alertData && (
                                <div className="px-6 pt-4">
                                    <Alert
                                        variant={alertData.variant}
                                        title={alertData.title}
                                        message={alertData.message}
                                    />
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={addSupplier} className="flex flex-col">
                                <div className="flex-1 p-6 grid grid-cols-1 gap-6 text-sm">
                                    <div>
                                        <Label>
                                            Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input 
                                            name="name" 
                                            placeholder="Name" 
                                            className={`h-10 ${formErrors.name ? 'border-red-500' : ''}`}
                                        />
                                        {formErrors.name && (
                                            <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>
                                            Phone <span className="text-red-500">*</span>
                                        </Label>
                                        <Input 
                                            name="phone" 
                                            placeholder="Phone" 
                                            className={`h-10 ${formErrors.phone ? 'border-red-500' : ''}`}
                                        />
                                        {formErrors.phone && (
                                            <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>
                                            Email <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            name="email"
                                            type="email"
                                            placeholder="Email"
                                            className={`h-10 ${formErrors.email ? 'border-red-500' : ''}`}
                                        />
                                        {formErrors.email && (
                                            <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
                                    <Button type="button" onClick={() => setAddOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                                        Save
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}


                {/* View/Edit Supplier Modal */}
                {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-lg rounded-2xl border bg-white dark:bg-gray-900">
                            <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Supplier — {selected.name}
                                </h3>
                                <button
                                    onClick={() => {
                                        setSelected(null);
                                        setEditMode(false);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>

                            {editMode ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const fd = new FormData(e.currentTarget);
                                        editSupplier(selected.id, {
                                            name: String(fd.get("name") || ""),
                                            phone: String(fd.get("phone") || ""),
                                            email: String(fd.get("email") || ""),
                                        });
                                    }}
                                    className="p-6 space-y-4"
                                >
                                    {/* ✅ Two-column layout */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <Label>Name</Label>
                                            <Input name="name" defaultValue={selected.name} className="h-10" />
                                        </div>
                                        <div>
                                            <Label>Phone</Label>
                                            <Input name="phone" defaultValue={selected.phone} className="h-10" />
                                        </div>
                                        <div>
                                            <Label>Email</Label>
                                            <Input name="email" type="email" defaultValue={selected.email} className="h-10" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" onClick={() => setEditMode(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-blue-600 text-white">
                                            Save
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-6 space-y-2 text-sm">
                                    <div><strong>Name:</strong> {selected.name}</div>
                                    <div><strong>Phone:</strong> {selected.phone}</div>
                                    <div><strong>Email:</strong> {selected.email}</div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button onClick={() => setEditMode(true)}>Edit</Button>
                                        <Button
                                            className="bg-rose-600 text-white"
                                            onClick={() => setDeleteTarget(selected)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {/* Delete Confirmation Modal */}
                {deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6">
                            <h3 className="text-lg font-semibold">Delete Supplier</h3>
                            <p className="mt-2 text-sm">
                                Are you sure you want to delete{" "}
                                <span className="font-medium">{deleteTarget.name}</span>?
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                                <Button
                                    className="bg-rose-600 text-white"
                                    onClick={() => deleteSupplier(deleteTarget.id)}
                                >
                                    Yes, Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
