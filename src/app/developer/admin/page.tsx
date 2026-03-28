"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { formatDisplayDate } from "@/utils/dateUtils";
import Link from "next/link";
import {
    ShieldCheck,
    ArrowLeft,
    Loader2,
    Clock,
    AlertCircle,
    Eye,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface Submission {
    id: string;
    vendorId: string;
    appSlug: string;
    appName: string;
    submissionType: string;
    status: string;
    version?: string;
    category?: string;
    description?: string;
    submittedAt?: string;
    createdAt: string;
}

export default function AdminReviewQueuePage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const loadQueue = async (p: number) => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${MARKETPLACE_BASE()}/api/v1/admin/submissions?page=${p}&size=20`
            );
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data.content || []);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
                setPage(data.number || 0);
            }
        } catch (err) {
            console.error("Failed to load review queue:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadQueue(0);
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/developer"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <ShieldCheck className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Submission Review Queue
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {totalElements} submission{totalElements !== 1 ? "s" : ""} pending review
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">
                        <ShieldCheck className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            No submissions pending review. All caught up!
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {submissions.map((sub) => (
                                <Link
                                    key={sub.id}
                                    href={`/developer/admin/${sub.id}`}
                                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${
                                            sub.status === "in_review"
                                                ? "bg-amber-50 dark:bg-amber-900/20"
                                                : "bg-blue-50 dark:bg-blue-900/20"
                                        }`}>
                                            {sub.status === "in_review" ? (
                                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            ) : (
                                                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {sub.appName}
                                                {sub.version && (
                                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                                        v{sub.version}
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="capitalize">{sub.submissionType}</span>
                                                {sub.category && <span>{sub.category}</span>}
                                                <span>slug: {sub.appSlug}</span>
                                                {sub.submittedAt && (
                                                    <span>
                                                        Submitted {formatDisplayDate(sub.submittedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                            sub.status === "in_review"
                                                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                                : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                        }`}>
                                            {sub.status === "in_review" ? "In Review" : "Submitted"}
                                        </span>
                                        <Eye className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Page {page + 1} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => loadQueue(page - 1)}
                                        disabled={page === 0}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => loadQueue(page + 1)}
                                        disabled={page >= totalPages - 1}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
