"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/* ------------ Types ------------ */
type ApiResponse<T> = { success: boolean; message: string; data: T };

type Service = {
    id: number;
    name: string;
    defaultPrice: string;
    createdAt?: string;
    updatedAt?: string;
};

/* ------------ Helpers ------------ */
async function safeJson<T>(res: Response): Promise<ApiResponse<T> | null> {
    try {
        if (res.status === 204) return null;
        const text = await res.text();
        if (!text) return null;
        return JSON.parse(text) as ApiResponse<T>;
    } catch (err) {
        console.error("Failed to parse JSON:", err);
        return null;
    }
}

/* ------------ Modal Form ------------ */
function ServiceForm({
                         mode,
                         service,
                         onClose,
                         onSaved,
                     }: {
    mode: "add" | "edit";
    service?: Service;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(service?.name || "");
    const [defaultPrice, setDefaultPrice] = useState(service?.defaultPrice || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit() {
        if (!name.trim()) {
            setError("Service name is required");
            return;
        }
        if (!defaultPrice.trim()) {
            setError("Default price is required");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const payload = {
                id: service?.id,
                name: name.trim(),
                defaultPrice: defaultPrice.trim()
            };

            const url = mode === "add"
                ? `${getEnv("NEXT_PUBLIC_API_URL")}/api/services`
                : `${getEnv("NEXT_PUBLIC_API_URL")}/api/services/${service?.id}`;

            const res = await fetchWithAuth(url, {
                method: mode === "add" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Server error:", errorText);
                
                if (errorText.includes("parameter name information not available")) {
                    setError("Backend needs to be recompiled with '-parameters' flag. Please contact your system administrator.");
                } else {
                    setError(`Failed to save (${res.status})`);
                }
                return;
            }

            const json = await safeJson<Service>(res);
            if (!json || json.success) {
                onSaved();
                onClose();
            } else {
                setError(json.message || "Failed to save service");
            }
        } catch (err) {
            console.error("Error saving service:", err);
            setError(err instanceof Error ? err.message : "Unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[99999] grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold mb-4">
                    {mode === "add" ? "Add Service" : "Edit Service"}
                </h2>
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name <span className="text-red-600">*</span></label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Service name"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Default Price <span className="text-red-600">*</span></label>
                        <input
                            value={defaultPrice}
                            onChange={(e) => setDefaultPrice(e.target.value)}
                            placeholder="Default price"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="flex justify-between items-center gap-2 pt-3 border-t mt-4">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !name.trim() || !defaultPrice.trim()}
                            className={`px-4 py-2 rounded ${
                                loading || !name.trim() || !defaultPrice.trim()
                                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------ Page ------------ */
export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
    const [selectedService, setSelectedService] = useState<Service | undefined>();

    async function loadServices() {
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/services`
            );
            const json = await safeJson<Service[]>(res);
            if (json && json.success && Array.isArray(json.data)) {
                const normalized: Service[] = json.data.map((s) => ({
                    ...s,
                    updatedAt: s.updatedAt || s.createdAt || new Date().toISOString(),
                }));
                setServices(normalized);
            } else {
                setServices([]);
            }
        } catch (err) {
            console.error("Error loading services:", err);
        }
    }

    useEffect(() => {
        loadServices();
    }, []);

    const paginatedServices = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return services.slice(start, start + pageSize);
    }, [services, currentPage, pageSize]);

    async function handleDelete(id: number) {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/services/${id}`,
                { method: "DELETE" }
            );
            const json = await safeJson<null>(res);
            if (!json || json.success) {
                loadServices();
            } else {
                alert(json.message || "Failed to delete");
            }
        } catch (err) {
            console.error("Error deleting service:", err);
        }
    }

    return (
        <AdminLayout>
            <div className="p-4"> {/* reduced padding from p-6 to p-4 */}
                {/* Header */}
                <div className="flex justify-between items-center mb-3"> {/* reduced mb */}
                    <h1 className="text-xl font-bold">Services</h1> {/* slightly smaller text */}
                    <button
                        onClick={() => {
                            setFormMode("add");
                            setSelectedService(undefined);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
                    >
                        + Add Service
                    </button>
                </div>

                {/* Table */}
                <table className="w-full text-sm border rounded bg-white shadow-sm">
                    <thead className="bg-gray-100 text-left">
                    <tr>
                        <th className="px-3 py-2">No.</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Default Price</th>
                        <th className="px-3 py-2">Updated</th>
                        <th className="px-3 py-2">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {paginatedServices.length ? (
                        paginatedServices.map((s, idx) => (
                            <tr key={s.id} className="border-t hover:bg-gray-50">
                                <td className="px-3 py-3">
                                    {(currentPage - 1) * pageSize + idx + 1}
                                </td>
                                <td className="px-3 py-3">{s.name}</td>
                                <td className="px-3 py-3">{s.defaultPrice}</td>
                                <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                                    {s.updatedAt
                                        ? new Date(s.updatedAt).toLocaleString()
                                        : new Date().toLocaleString()}
                                </td>
                                <td className="px-3 py-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setFormMode("edit");
                                            setSelectedService(s);
                                        }}
                                        className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                                No services found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>

                {/* Pagination */}
                {services.length > 0 && (
                    <div className="flex justify-between items-center mt-3 text-sm">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span>
                                Page {currentPage} of{" "}
                                {Math.max(1, Math.ceil(services.length / pageSize))}
                            </span>
                            <button
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        p < Math.ceil(services.length / pageSize) ? p + 1 : p
                                    )
                                }
                                disabled={currentPage >= Math.ceil(services.length / pageSize)}
                                className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span>
                                Showing{" "}
                                {services.length === 0
                                    ? "0"
                                    : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                                        currentPage * pageSize,
                                        services.length
                                    )}`}{" "}
                                of {services.length}
                            </span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    setPageSize(Number(e.target.value));
                                }}
                                className="border rounded px-2 py-1"
                            >
                                {[5, 10, 20, 50].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Modal */}
                {formMode && (
                    <ServiceForm
                        mode={formMode}
                        service={selectedService}
                        onClose={() => setFormMode(null)}
                        onSaved={loadServices}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
