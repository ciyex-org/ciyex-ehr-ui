"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import Alert from "@/components/ui/alert/Alert";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type MaintenanceTask = {
    id: number;
    equipment: string;
    category: string;
    location: string;
    dueDate: string;
    lastServiceDate?: string;
    assignee: string;
    vendor?: string;
    priority: "Critical" | "High" | "Medium" | "Low";
    status: "Open" | "In Progress" | "Done" | "Scheduled";
    notes?: string;
};

function TableShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {children}
        </div>
    );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
    const colors: any = {
        yellow: "bg-yellow-100 text-yellow-800 border border-yellow-300",
        blue: "bg-blue-100 text-blue-800 border border-blue-300",
        green: "bg-green-100 text-green-800 border border-green-300",
        purple: "bg-purple-100 text-purple-800 border border-purple-300",
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
            {children}
        </span>
    );
}

export default function Maintenance() {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState<Partial<MaintenanceTask>>(
        {
            equipment: "",
            category: "Preventive",
            location: "",
            dueDate: "",
            lastServiceDate: "",
            assignee: "",
            vendor: "",
            priority: "Medium",
            notes: "",
        }
    );

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

    const [modalAlertData, setModalAlertData] = useState<{
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    } | null>(null);

    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (alertData) {
            const timer = setTimeout(() => setAlertData(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [alertData]);

    useEffect(() => {
        if (modalAlertData) {
            const timer = setTimeout(() => setModalAlertData(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [modalAlertData]);

    // Load from localStorage on mount
    useEffect(() => {
        const cached = localStorage.getItem("maintenanceTasks");
        if (cached) {
            try {
                setTasks(JSON.parse(cached));
            } catch (e) {
                console.error("Failed to parse cached tasks");
            }
        }
    }, []);

    // Fetch tasks
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/maintenances?page=${
                        currentPage - 1
                    }&size=${pageSize}`
                );
                
                if (res.status === 401) {
                    setLoading(false);
                    return;
                }
                
                const data = await res.json();

                if (res.ok && data.success) {
                    const tasks = data.data.content ?? [];
                    setTasks(tasks);
                    setTotalPages(data.data.totalPages);
                    setTotalItems(data.data.totalElements);
                    localStorage.setItem("maintenanceTasks", JSON.stringify(tasks));
                } else {
                    setTasks([]);
                }
            } catch (err) {
                console.error("Fetch failed:", err);
                setTasks([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [currentPage, pageSize]);

    // Validation function
    function validateForm(): boolean {
        const errors: Record<string, string> = {};

        if (!form.equipment?.trim()) {
            errors.equipment = "Please fill out this field";
        }
        if (!form.category?.trim()) {
            errors.category = "Please fill out this field";
        }
        if (!form.priority?.trim()) {
            errors.priority = "Please fill out this field";
        }
        if (!form.location?.trim()) {
            errors.location = "Please fill out this field";
        }
        if (!form.dueDate?.trim()) {
            errors.dueDate = "Please fill out this field";
        }
        if (!form.assignee?.trim()) {
            errors.assignee = "Please fill out this field";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }

    // Create or update
    async function createTask(e: React.FormEvent) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            setModalAlertData({
                variant: "error",
                title: "Validation Error",
                message: "Please fill out all required fields.",
            });
            return;
        }

        try {
            if (form.id) {
                // UPDATE
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/maintenances/${form.id}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(form),
                    }
                );
                const data = await res.json();

                if (res.ok && data?.success && data?.data) {
                    const updated = tasks.map((t) => (t.id === form.id ? data.data : t));
                    setTasks(updated);
                    localStorage.setItem("maintenanceTasks", JSON.stringify(updated));
                    setAlertData({
                        variant: "success",
                        title: "Updated",
                        message: `${data.data.equipment || "Task"} updated successfully.`,
                    });
                } else {
                    throw new Error("Update failed");
                }
            } else {
                // CREATE
                const payload = { ...form, status: "Open" };
                const res = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/maintenances`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );
                const data = await res.json();

                if (res.ok && data?.success && data?.data) {
                    const newTask: MaintenanceTask = data.data;
                    const updated = [...tasks, newTask];
                    setTasks(updated);
                    localStorage.setItem("maintenanceTasks", JSON.stringify(updated));
                    setAlertData({
                        variant: "success",
                        title: "Created",
                        message: `${newTask.equipment || "Task"} created successfully.`,
                    });
                } else {
                    throw new Error("Create failed");
                }
            }

            // Reset
            setShowModal(false);
            setForm({
                equipment: "",
                category: "Preventive",
                location: "",
                dueDate: "",
                lastServiceDate: "",
                assignee: "",
                vendor: "",
                priority: "Medium",
                notes: "",
            });
        } catch {
            setModalAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to save task.",
            });
        }
    }

    // DELETE
    async function deleteTask(id: number) {
        if (!confirm("Are you sure you want to delete this task?")) return;

        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/maintenances/${id}`,
                { method: "DELETE" }
            );
            const data = await res.json();

            if (res.ok && data.success) {
                const updated = tasks.filter((t) => t.id !== id);
                setTasks(updated);
                localStorage.setItem("maintenanceTasks", JSON.stringify(updated));
                setAlertData({
                    variant: "success",
                    title: "Deleted",
                    message: `Task #${id} removed successfully.`,
                });
            } else {
                throw new Error("Delete failed");
            }
        } catch {
            setAlertData({
                variant: "error",
                title: "Error",
                message: "Failed to delete task.",
            });
        }
    }

    async function cycleStatus(id: number, status: MaintenanceTask["status"]) {
        const next = status === "Open" ? "In Progress" : status === "In Progress" ? "Done" : "Open";

        try {
            const task = tasks.find((t) => t.id === id);
            if (!task) return;

            const updatedTask: MaintenanceTask = { ...task, status: next as MaintenanceTask["status"] };

            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/maintenances/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedTask),
                }
            );

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    const updated = tasks.map((t) =>
                        t.id === id ? { ...t, status: next as MaintenanceTask["status"] } : t
                    );
                    setTasks(updated);
                    localStorage.setItem("maintenanceTasks", JSON.stringify(updated));
                    setAlertData({
                        variant: "success",
                        title: "Updated",
                        message: `Task status changed to ${next}`,
                    });
                    return;
                }
            }

            throw new Error("Update failed");
        } catch {
            setAlertData({
                variant: "error",
                title: "Failed",
                message: "Status update failed.",
            });
        }
    }

    // Get badge color
    function getStatusColor(status: string) {
        if (status === "Done") return "green";
        if (status === "In Progress") return "blue";
        if (status === "Scheduled") return "purple";
        return "yellow";
    }

    return (
        <AdminLayout>
            {/* Alerts */}
            {alertData && (
                <div className="mb-4">
                    <Alert {...alertData} />
                </div>
            )}

            <div className="flex items-center justify-between p-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage maintenance tasks, schedules, and statuses.
                </p>
                <Button
                    className="h-8 px-3 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setShowModal(true)}
                >
                    + New Task
                </Button>
            </div>

            {/* TABLE */}
            <div className="mt-4">
                <TableShell>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr className="text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                                <th className="px-6 py-3">Equipment</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Priority</th>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3">Due</th>
                                <th className="px-6 py-3">Assignee</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tasks.map((t) => (
                                <tr
                                    key={t.id}
                                    className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                >
                                    <td className="px-6 py-3">{t.equipment}</td>
                                    <td className="px-6 py-3">{t.category}</td>
                                    <td className="px-6 py-3">{t.priority}</td>
                                    <td className="px-6 py-3">{t.location}</td>
                                    <td className="px-6 py-3">
                                        {new Date(t.dueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3">{t.assignee}</td>
                                    <td className="px-6 py-3">
                                        <Pill color={getStatusColor(t.status)}>
                                            {t.status}
                                        </Pill>
                                    </td>

                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* EDIT */}
                                            <button
                                                onClick={() => {
                                                    setForm({ ...t });
                                                    setShowModal(true);
                                                }}
                                                className="rounded px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                                            >
                                                Edit
                                            </button>

                                            {/* DELETE */}
                                            <button
                                                onClick={() => deleteTask(t.id)}
                                                className="rounded px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
                                            >
                                                Delete
                                            </button>

                                            {/* STATUS */}
                                            <button
                                                onClick={() => cycleStatus(t.id, t.status)}
                                                className="rounded px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                                {t.status === "Open"
                                                    ? "Start"
                                                    : t.status === "In Progress"
                                                        ? "Complete"
                                                        : "Reopen"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableShell>
            </div>

            {/* PAGINATION */}
            <div className="mt-4 flex justify-between items-center text-sm border-t py-3">
                <div className="flex gap-3 items-center">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 border rounded disabled:opacity-40"
                    >
                        Prev
                    </button>

                    <span>
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 border rounded disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>

                <div className="flex gap-3 items-center">
                    <span>
                        Showing {loading ? "…" : tasks.length} of {totalItems}
                    </span>

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="border rounded px-3 py-1.5 bg-white"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl">
                        <div className="px-6 py-4 border-b flex justify-between">
                            <h3 className="font-semibold text-lg">Maintenance Task</h3>
                            <button onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {/* Modal Alert */}
                        {modalAlertData && (
                            <div className="px-6 pt-4">
                                <Alert {...modalAlertData} />
                            </div>
                        )}

                        <form onSubmit={createTask} className="p-6 grid grid-cols-2 gap-6">
                            <div>
                                <Label>
                                    Equipment <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={form.equipment}
                                    onChange={(e) => {
                                        setForm({ ...form, equipment: e.target.value });
                                        if (validationErrors.equipment) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                equipment: "",
                                            }));
                                        }
                                    }}
                                    className={validationErrors.equipment ? "border-red-500" : ""}
                                />
                                {validationErrors.equipment && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {validationErrors.equipment}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>
                                    Category <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    value={form.category}
                                    onChange={(e) => {
                                        setForm({ ...form, category: e.target.value });
                                        if (validationErrors.category) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                category: "",
                                            }));
                                        }
                                    }}
                                    className={`h-10 w-full border rounded px-2 ${
                                        validationErrors.category ? "border-red-500" : ""
                                    }`}
                                >
                                    <option>Preventive</option>
                                    <option>Corrective</option>
                                    <option>Calibration</option>
                                    <option>Cleaning</option>
                                </select>
                                {validationErrors.category && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {validationErrors.category}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>
                                    Priority <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    value={form.priority}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            priority: e.target.value as MaintenanceTask["priority"],
                                        });
                                        if (validationErrors.priority) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                priority: "",
                                            }));
                                        }
                                    }}
                                    className={`h-10 w-full border rounded px-2 ${
                                        validationErrors.priority ? "border-red-500" : ""
                                    }`}
                                >
                                    <option>Critical</option>
                                    <option>High</option>
                                    <option>Medium</option>
                                    <option>Low</option>
                                </select>
                                {validationErrors.priority && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {validationErrors.priority}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>
                                    Location <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={form.location}
                                    onChange={(e) => {
                                        setForm({ ...form, location: e.target.value });
                                        if (validationErrors.location) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                location: "",
                                            }));
                                        }
                                    }}
                                    className={validationErrors.location ? "border-red-500" : ""}
                                />
                                {validationErrors.location && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {validationErrors.location}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>
                                    Due Date <span className="text-red-500">*</span>
                                </Label>
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={(e) => {
                                        setForm({ ...form, dueDate: e.target.value });
                                        if (validationErrors.dueDate) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                dueDate: "",
                                            }));
                                        }
                                    }}
                                    className={`order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
                                        validationErrors.dueDate ? "border-red-500" : ""
                                    }`}
                                    required
                                />
                                {validationErrors.dueDate && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {validationErrors.dueDate}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Last Service Date</Label>
                                <input
                                    type="date"
                                    value={form.lastServiceDate || ""}
                                    onChange={(e) =>
                                        setForm({ ...form, lastServiceDate: e.target.value })
                                    }
                                    className="order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <Label>
                                    Assignee <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={form.assignee}
                                    onChange={(e) => {
                                        setForm({ ...form, assignee: e.target.value });
                                        if (validationErrors.assignee) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                assignee: "",
                                            }));
                                        }
                                    }}
                                    className={validationErrors.assignee ? "border-red-500" : ""}
                                />
                                {validationErrors.assignee && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {validationErrors.assignee}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Vendor</Label>
                                <Input
                                    value={form.vendor}
                                    onChange={(e) =>
                                        setForm({ ...form, vendor: e.target.value })
                                    }
                                />
                            </div>

                            <div className="col-span-2">
                                <Label>Notes</Label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) =>
                                        setForm({ ...form, notes: e.target.value })
                                    }
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>

                            <div className="col-span-2 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setValidationErrors({});
                                        setModalAlertData(null);
                                    }}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Save
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
