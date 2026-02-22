"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Link from "next/link";
import {
    Webhook,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface DeliveryLog {
    id: string;
    webhookId: string;
    eventType: string;
    requestUrl: string;
    responseStatus?: number;
    success: boolean;
    durationMs?: number;
    attemptNumber: number;
    nextRetryAt?: string;
    createdAt: string;
}

export default function WebhookLogsPage() {
    const [logs, setLogs] = useState<DeliveryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const loadLogs = async (p: number) => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${MARKETPLACE_BASE()}/api/v1/vendors/me/webhook-logs?page=${p}&size=20`
            );
            if (res.ok) {
                const data = await res.json();
                setLogs(data.content || []);
                setTotalPages(data.totalPages || 0);
                setPage(data.number || 0);
            }
        } catch (err) {
            console.error("Failed to load webhook logs:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadLogs(0);
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
                    <Webhook className="w-7 h-7 text-rose-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Webhook Delivery Logs
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Track webhook deliveries and debug failures
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">
                        <Webhook className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            No webhook deliveries yet.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Logs table */}
                        <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Event</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">URL</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">HTTP</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Duration</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Attempt</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-4 py-3">
                                                {log.success ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-gray-300">
                                                    {log.eventType}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={log.requestUrl}>
                                                {log.requestUrl}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.responseStatus ? (
                                                    <span
                                                        className={`text-xs font-mono ${
                                                            log.responseStatus >= 200 && log.responseStatus < 300
                                                                ? "text-green-600 dark:text-green-400"
                                                                : "text-red-600 dark:text-red-400"
                                                        }`}
                                                    >
                                                        {log.responseStatus}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                {log.durationMs != null ? `${log.durationMs}ms` : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                {log.attemptNumber}
                                                {log.nextRetryAt && (
                                                    <span className="ml-1 text-xs text-amber-500" title={`Retry at ${log.nextRetryAt}`}>
                                                        (retry)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Page {page + 1} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => loadLogs(page - 1)}
                                        disabled={page === 0}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => loadLogs(page + 1)}
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
