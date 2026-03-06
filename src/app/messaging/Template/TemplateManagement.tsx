"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/* ------------ Types ------------ */
type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

type Template = {
    id: number;
    templateName: string;
    subject: string;
    body: string;
    updatedAt?: string;
    createdAt?: string;
};

/* ------------ Helpers ------------ */
const STORAGE_TMPL = "hinisoft:messaging:templates";

function saveTemplates(t: Template[]) {
    try {
        localStorage.setItem(STORAGE_TMPL, JSON.stringify(t));
    } catch {
        // ignore storage errors
    }
}

async function safeJson<T>(res: Response): Promise<ApiResponse<T> | null> {
    try {
        const text = await res.text();
        return text ? (JSON.parse(text) as ApiResponse<T>) : null;
    } catch (err) {
        console.error("Failed to parse JSON:", err);
        return null;
    }
}

/* ------------ Component ------------ */
const TemplateManagement = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
    const [tplName, setTplName] = useState("");
    const [tplSubject, setTplSubject] = useState("");
    const [tplBody, setTplBody] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    // pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 🔑 Listen for "openAddTemplate" trigger from MessagingPage
    useEffect(() => {
        const handler = () => {
            resetForm();
            setIsAddTemplateOpen(true);
        };
        window.addEventListener("openAddTemplate", handler);
        return () => window.removeEventListener("openAddTemplate", handler);
    }, []);

    // Load templates from API
    useEffect(() => {
        async function load() {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/notifications/config/templates`
                );
                const json = await safeJson<Template[]>(res);

                if (json && json.success && Array.isArray(json.data)) {
                    const normalized: Template[] = json.data.map((t) => ({
                        ...t,
                        updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
                    }));
                    setTemplates(normalized);
                    saveTemplates(normalized);
                } else {
                    setTemplates([]);
                }
            } catch (err) {
                console.error("Error loading templates:", err);
            }
        }
        load();
    }, []);

    // derive paginated rows
    const paginatedTemplates = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return templates.slice(start, start + pageSize);
    }, [templates, currentPage, pageSize]);

    async function saveTemplate() {
        if (!tplName.trim() || !tplSubject.trim() || !tplBody.trim()) return;

        const payload = {
            templateName: tplName.trim(),
            subject: tplSubject.trim(),
            body: tplBody.trim(),
            description: tplName.trim(),
            category: tplSubject.trim(),
            status: "current",
        };

        try {
            if (isEditMode && editId !== null) {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/notifications/config/templates/${editId}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );
                const json = await safeJson<Template>(res);

                if (json && json.success && json.data) {
                    const updated: Template[] = templates.map((t) =>
                        t.id === editId
                            ? { ...(json.data as Template), updatedAt: new Date().toISOString() }
                            : t
                    );
                    setTemplates(updated);
                    saveTemplates(updated);
                }
            } else {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/notifications/config/templates`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );
                const json = await safeJson<Template>(res);

                if (json && json.success && json.data) {
                    const newT: Template = {
                        ...(json.data as Template),
                        updatedAt: new Date().toISOString(),
                    };
                    const updated = [newT, ...templates];
                    setTemplates(updated);
                    saveTemplates(updated);
                }
            }
            resetForm();
        } catch (err) {
            console.error("Error saving template:", err);
        }
    }

    async function deleteTemplate(id: number) {
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/notifications/config/templates/${id}`,
                { method: "DELETE" }
            );
            const json = await safeJson<Record<string, unknown>>(res);

            if (json && json.success) {
                const updated = templates.filter((t) => t.id !== id);
                setTemplates(updated);
                saveTemplates(updated);
                resetForm();
            }
        } catch (err) {
            console.error("Error deleting template:", err);
        }
    }

    function startEdit(t: Template) {
        setIsEditMode(true);
        setEditId(t.id);
        setTplName(t.templateName);
        setTplSubject(t.subject);
        setTplBody(t.body);
        setIsAddTemplateOpen(true);
    }

    function resetForm() {
        setTplName("");
        setTplSubject("");
        setTplBody("");
        setIsAddTemplateOpen(false);
        setIsEditMode(false);
        setEditId(null);
    }

    return (
        <div>
            {/* Table */}
            <table className="w-full text-sm border rounded bg-white shadow-sm">
                <thead className="bg-gray-100 text-left">
                <tr>
                    <th className="px-3 py-2">No.</th>
                    <th className="px-3 py-2">Template Name</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Body</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                </tr>
                </thead>
                <tbody>
                {paginatedTemplates.length ? (
                    paginatedTemplates.map((t, idx) => (
                        <tr key={t.id} className="border-t hover:bg-gray-50 align-top">
                            {/* ✅ Serial Number column */}
                            <td className="px-3 py-3">
                                {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="px-3 py-3">{t.templateName}</td>
                            <td className="px-3 py-3">{t.subject}</td>
                            <td
                                className="px-3 py-3 max-w-[250px] truncate"
                                title={t.body}
                            >
                                {t.body}
                            </td>
                            <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                                {t.updatedAt
                                    ? new Date(t.updatedAt).toLocaleString()
                                    : new Date().toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right">
                                <button
                                    onClick={() => startEdit(t)}
                                    className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                            No templates found.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>

            {/* ✅ Pagination Footer */}
            {templates.length > 0 && (
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
                            {Math.max(1, Math.ceil(templates.length / pageSize))}
                        </span>
                        <button
                            onClick={() =>
                                setCurrentPage((p) =>
                                    p < Math.ceil(templates.length / pageSize) ? p + 1 : p
                                )
                            }
                            disabled={currentPage >= Math.ceil(templates.length / pageSize)}
                            className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span>
                            Showing{" "}
                            {templates.length === 0
                                ? "0"
                                : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                                    currentPage * pageSize,
                                    templates.length
                                )}`}{" "}
                            of {templates.length}
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

            {/* Add/Edit Template Modal */}
            {isAddTemplateOpen && (
                <div className="fixed inset-0 z-[99999] grid place-items-center bg-black/40 p-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">
                                {isEditMode ? "Edit Template" : "Add Template"}
                            </h2>
                            <button
                                onClick={() => resetForm()}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs">Template Name</label>
                                <input
                                    value={tplName}
                                    onChange={(e) => setTplName(e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="text-xs">Subject</label>
                                <input
                                    value={tplSubject}
                                    onChange={(e) => setTplSubject(e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="text-xs">Body</label>
                                <textarea
                                    rows={5}
                                    value={tplBody}
                                    onChange={(e) => setTplBody(e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                {isEditMode && editId !== null && (
                                    <button
                                        onClick={() => deleteTemplate(editId)}
                                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => resetForm()}
                                        className="px-4 py-2 rounded bg-gray-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveTemplate}
                                        className="px-4 py-2 rounded bg-blue-600 text-white"
                                    >
                                        {isEditMode ? "Update Template" : "Save Template"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateManagement;
