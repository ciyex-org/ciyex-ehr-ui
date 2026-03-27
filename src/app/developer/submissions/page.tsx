"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { formatDisplayDate } from "@/utils/dateUtils";
import Link from "next/link";
import {
    Send,
    ArrowLeft,
    Plus,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    FileEdit,
    AlertCircle,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface Submission {
    id: string;
    appSlug: string;
    appName: string;
    submissionType: string;
    status: string;
    version?: string;
    category?: string;
    submittedAt?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
    draft: { icon: FileEdit, label: "Draft", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-slate-700" },
    submitted: { icon: Clock, label: "Submitted", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    in_review: { icon: AlertCircle, label: "In Review", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
    approved: { icon: CheckCircle2, label: "Approved", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
    rejected: { icon: XCircle, label: "Rejected", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
    revisions_requested: { icon: FileEdit, label: "Revisions Requested", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
};

export default function SubmissionsPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);

    const loadSubmissions = async () => {
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/submissions?page=0&size=50`);
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data.content || []);
            }
        } catch (err) {
            console.error("Failed to load submissions:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSubmissions();
    }, []);

    const handleSubmitForReview = async (submissionId: string) => {
        setSubmitting(submissionId);
        try {
            const res = await fetchWithAuth(
                `${MARKETPLACE_BASE()}/api/v1/vendors/me/submissions/${submissionId}/submit`,
                { method: "POST" }
            );
            if (res.ok) {
                await loadSubmissions();
            }
        } catch (err) {
            console.error("Failed to submit for review:", err);
        }
        setSubmitting(null);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/developer"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <Send className="w-7 h-7 text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                App Submissions
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/developer/submissions/new"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Submission
                    </Link>
                </div>

                {/* Submissions list */}
                {submissions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">
                        <Send className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            No submissions yet. Create your first app submission to get started.
                        </p>
                        <Link
                            href="/developer/submissions/new"
                            className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Submission
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map((sub) => {
                            const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.draft;
                            const StatusIcon = statusCfg.icon;
                            return (
                                <div
                                    key={sub.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${statusCfg.bg}`}>
                                            <StatusIcon className={`w-5 h-5 ${statusCfg.color}`} />
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
                                                <span>{sub.submissionType}</span>
                                                {sub.category && <span>{sub.category}</span>}
                                                <span>
                                                    {formatDisplayDate(sub.createdAt)}
                                                </span>
                                            </div>
                                            {sub.rejectionReason && (
                                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                                    Reason: {sub.rejectionReason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                                            {statusCfg.label}
                                        </span>
                                        {sub.status === "draft" && (
                                            <button
                                                onClick={() => handleSubmitForReview(sub.id)}
                                                disabled={submitting === sub.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                            >
                                                {submitting === sub.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Send className="w-3 h-3" />
                                                )}
                                                Submit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
