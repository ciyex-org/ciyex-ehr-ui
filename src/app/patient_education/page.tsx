"use client";

import AdminLayout from "@/app/(admin)/layout";
import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
    GraduationCap,
    Search,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    Video,
    FileText,
    MessageSquare,
    Globe,
} from "lucide-react";

type EducationItem = {
    id: string;
    status?: string;
    topic?: string;
    category?: string;
    sent?: string;
    medium?: string;
    sender?: string;
    payload?: string;
    reasonCode?: string;
    language?: string;
    patient?: string;
    _resourceType?: string;
};

type ApiResponse<T> = { success: boolean; message: string; data: T };

const categoryIcons: Record<string, React.ReactNode> = {
    Education: <BookOpen className="h-4 w-4" />,
    Handout: <FileText className="h-4 w-4" />,
    Video: <Video className="h-4 w-4" />,
    "Verbal Counseling": <MessageSquare className="h-4 w-4" />,
    "Online Resource": <Globe className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    "in-progress": "bg-blue-100 text-blue-800",
    preparation: "bg-yellow-100 text-yellow-800",
    "not-done": "bg-gray-100 text-gray-800",
    "on-hold": "bg-orange-100 text-orange-800",
};

export default function PatientEducationPage() {
    const [items, setItems] = useState<EducationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 20;

    const loadEducation = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/fhir-resource/education?page=${page}&size=${pageSize}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: ApiResponse<{
                content: EducationItem[];
                totalElements: number;
                totalPages: number;
            }> = await res.json();
            if (json.success && json.data) {
                setItems(json.data.content || []);
                setTotalPages(json.data.totalPages || 1);
                setTotalItems(json.data.totalElements || 0);
            } else {
                setItems([]);
            }
        } catch (err) {
            console.error("Failed to load education resources", err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        loadEducation();
    }, [loadEducation]);

    const filtered = items.filter((item) => {
        const matchesSearch =
            !searchQuery ||
            item.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.payload?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            statusFilter === "All" || item.status === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                    <div className="flex items-center gap-3">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        <div>
                            <h1 className="text-xl font-semibold">Patient Education</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage education materials and track patient education delivery
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={loadEducation}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 px-6 py-3 border-b bg-gray-50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search education records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Completed">Completed</option>
                            <option value="In-progress">In Progress</option>
                            <option value="Preparation">Preparation</option>
                            <option value="Not-done">Not Done</option>
                            <option value="On-hold">On Hold</option>
                        </select>
                    </div>
                    <span className="text-sm text-muted-foreground">{totalItems} records</span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <GraduationCap className="h-12 w-12 mb-3 opacity-40" />
                            <p className="text-lg font-medium">No education records found</p>
                            <p className="text-sm">
                                Education records are created within patient charts under the Education tab.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-gray-50 text-left text-sm font-medium text-muted-foreground">
                                        <th className="px-4 py-3">Topic</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Date Provided</th>
                                        <th className="px-4 py-3">Medium</th>
                                        <th className="px-4 py-3">Educator</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item) => (
                                        <tr key={item.id} className="border-b hover:bg-gray-50 text-sm">
                                            <td className="px-4 py-3 font-medium">
                                                {item.topic || "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {categoryIcons[item.category || ""] || (
                                                        <BookOpen className="h-4 w-4" />
                                                    )}
                                                    {item.category || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        statusColors[item.status || ""] || "bg-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    {item.status || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {item.sent || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {item.medium || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {item.sender || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t bg-white">
                        <span className="text-sm text-muted-foreground">
                            Page {page + 1} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
