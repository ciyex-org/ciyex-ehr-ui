"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { formatDisplayDate } from "@/utils/dateUtils";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ShieldCheck,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Tag,
    Globe,
    Lock,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface SubmissionDetail {
    id: string;
    vendorId: string;
    appId?: string;
    appSlug: string;
    appName: string;
    submissionType: string;
    status: string;
    version?: string;
    description?: string;
    category?: string;
    iconUrl?: string;
    screenshots?: { url?: string; caption?: string }[];
    features?: string[];
    extensionPoints?: string[];
    smartLaunchUrl?: string;
    fhirResources?: string[];
    fhirScopes?: string;
    configSchema?: Record<string, unknown>;
    pricing?: { model?: string; amount?: number; currency?: string; interval?: string }[];
    reviewerId?: string;
    reviewNotes?: string;
    rejectionReason?: string;
    reviewedAt?: string;
    securityScore?: number;
    securityReport?: {
        checks?: { id: string; description: string; status: string; detail: string }[];
        totalChecks?: number;
        passedChecks?: number;
        failedChecks?: number;
        validatedAt?: string;
    };
    submittedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export default function SubmissionReviewPage() {
    const params = useParams()!;
    const router = useRouter();
    const submissionId = params.id as string;

    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(
                    `${MARKETPLACE_BASE()}/api/v1/admin/submissions/${submissionId}`
                );
                if (res.ok) {
                    setSubmission(await res.json());
                }
            } catch (err) {
                console.error("Failed to load submission:", err);
            }
            setLoading(false);
        })();
    }, [submissionId]);

    const handleReview = async (reviewAction: string) => {
        setSubmitting(true);
        try {
            const res = await fetchWithAuth(
                `${MARKETPLACE_BASE()}/api/v1/admin/submissions/${submissionId}/review`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        action: reviewAction,
                        notes,
                        rejectionReason: reviewAction === "reject" ? rejectionReason : null,
                    }),
                }
            );
            if (res.ok) {
                router.push("/developer/admin");
            }
        } catch (err) {
            console.error("Failed to submit review:", err);
        }
        setSubmitting(false);
    };

    const handleRescan = async () => {
        setScanning(true);
        try {
            const res = await fetchWithAuth(
                `${MARKETPLACE_BASE()}/api/v1/admin/submissions/${submissionId}/security-scan`,
                { method: "POST" }
            );
            if (res.ok) {
                const updated = await res.json();
                setSubmission(updated);
            }
        } catch (err) {
            console.error("Failed to run security scan:", err);
        }
        setScanning(false);
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

    if (!submission) {
        return (
            <AdminLayout>
                <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-gray-400">Submission not found.</p>
                    <Link href="/developer/admin" className="text-indigo-600 hover:underline mt-2 inline-block">
                        Back to queue
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const isReviewable = submission.status === "submitted" || submission.status === "in_review";

    return (
        <AdminLayout>
            <div className="max-w-4xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/developer/admin"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <ShieldCheck className="w-7 h-7 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Review: {submission.appName}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {submission.submissionType} submission &middot; {submission.appSlug}
                            {submission.version && ` &middot; v${submission.version}`}
                        </p>
                    </div>
                </div>

                {/* App Overview Card */}
                <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                    <div className="flex items-start gap-4">
                        {submission.iconUrl ? (
                            <img
                                src={submission.iconUrl}
                                alt={submission.appName}
                                className="w-16 h-16 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                                <Tag className="w-7 h-7 text-indigo-500" />
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {submission.appName}
                                </h2>
                                {submission.category && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full">
                                        {submission.category}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {submission.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Features */}
                {submission.features && submission.features.length > 0 && (
                    <Section title="Features">
                        <ul className="space-y-1">
                            {submission.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {/* Integration Details */}
                <Section title="Integration">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {submission.smartLaunchUrl && (
                            <InfoRow icon={Globe} label="SMART Launch URL" value={submission.smartLaunchUrl} />
                        )}
                        {submission.fhirScopes && (
                            <InfoRow icon={Lock} label="FHIR Scopes" value={submission.fhirScopes} />
                        )}
                        {submission.fhirResources && submission.fhirResources.length > 0 && (
                            <div className="sm:col-span-2">
                                <span className="text-gray-500 dark:text-gray-400">FHIR Resources:</span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {submission.fhirResources.map((r) => (
                                        <span key={r} className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {submission.extensionPoints && submission.extensionPoints.length > 0 && (
                            <div className="sm:col-span-2">
                                <span className="text-gray-500 dark:text-gray-400">Extension Points:</span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {submission.extensionPoints.map((ep) => (
                                        <span key={ep} className="px-2 py-0.5 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full font-mono">
                                            {ep}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Section>

                {/* Config Schema */}
                {submission.configSchema && Object.keys(submission.configSchema).length > 0 && (
                    <Section title="Configuration Schema">
                        <pre className="text-xs font-mono bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300">
                            {JSON.stringify(submission.configSchema, null, 2)}
                        </pre>
                    </Section>
                )}

                {/* Pricing */}
                {submission.pricing && submission.pricing.length > 0 && (
                    <Section title="Pricing Plans">
                        <div className="flex gap-3">
                            {submission.pricing.map((plan, i) => (
                                <div
                                    key={i}
                                    className="px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg"
                                >
                                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                                        {plan.model || "Free"}
                                    </p>
                                    {plan.amount != null && plan.amount > 0 && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            ${plan.amount}/{plan.interval || "month"}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Security Assessment */}
                <Section title="Security Assessment">
                    <div className="space-y-4">
                        {/* Score + Re-scan header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {submission.securityScore != null ? (
                                    <>
                                        <div className={`text-2xl font-bold ${
                                            submission.securityScore >= 80
                                                ? "text-green-600"
                                                : submission.securityScore >= 50
                                                ? "text-amber-600"
                                                : "text-red-600"
                                        }`}>
                                            {submission.securityScore}/100
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            <span>Security Score</span>
                                            {submission.securityReport?.validatedAt && (
                                                <span className="ml-2 text-xs">
                                                    (scanned {new Date(submission.securityReport.validatedAt).toLocaleString()})
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        No security scan has been run yet.
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleRescan}
                                disabled={scanning}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 disabled:opacity-50 transition-colors"
                            >
                                {scanning ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                {scanning ? "Scanning..." : "Re-run Scan"}
                            </button>
                        </div>

                        {/* Summary bar */}
                        {submission.securityReport?.totalChecks != null && (
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    {submission.securityReport.passedChecks ?? 0} passed
                                </span>
                                <span className="flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    {(submission.securityReport.totalChecks ?? 0) -
                                        (submission.securityReport.passedChecks ?? 0) -
                                        (submission.securityReport.failedChecks ?? 0)} warnings
                                </span>
                                <span className="flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                                    {submission.securityReport.failedChecks ?? 0} failed
                                </span>
                                <span>
                                    {submission.securityReport.totalChecks} total checks
                                </span>
                            </div>
                        )}

                        {/* Individual checks */}
                        {submission.securityReport?.checks && submission.securityReport.checks.length > 0 && (
                            <div className="divide-y divide-gray-100 dark:divide-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                {submission.securityReport.checks.map((check) => (
                                    <div key={check.id} className="flex items-start gap-3 px-4 py-3 bg-white dark:bg-slate-800">
                                        {check.status === "pass" ? (
                                            <CheckCircle2 className="w-4.5 h-4.5 text-green-500 mt-0.5 shrink-0" />
                                        ) : check.status === "warning" ? (
                                            <AlertTriangle className="w-4.5 h-4.5 text-amber-500 mt-0.5 shrink-0" />
                                        ) : (
                                            <XCircle className="w-4.5 h-4.5 text-red-500 mt-0.5 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {check.description}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {check.detail}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                                            check.status === "pass"
                                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                                : check.status === "warning"
                                                ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                        }`}>
                                            {check.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Section>

                {/* Review Actions */}
                {isReviewable && (
                    <div className="p-5 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 space-y-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            Review Decision
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Review Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Add notes about your review..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                        </div>

                        {action === "reject" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Rejection Reason
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={2}
                                    placeholder="Explain why this submission is being rejected..."
                                    className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-800 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setAction("approve");
                                    handleReview("approve");
                                }}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                {submitting && action === "approve" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Approve & Publish
                            </button>
                            <button
                                onClick={() => {
                                    if (action !== "reject") {
                                        setAction("reject");
                                        return;
                                    }
                                    handleReview("reject");
                                }}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {submitting && action === "reject" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                {action === "reject" ? "Confirm Reject" : "Reject"}
                            </button>
                            <button
                                onClick={() => {
                                    setAction("request_revisions");
                                    handleReview("request_revisions");
                                }}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                            >
                                {submitting && action === "request_revisions" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="w-4 h-4" />
                                )}
                                Request Revisions
                            </button>
                        </div>
                    </div>
                )}

                {/* Already reviewed */}
                {!isReviewable && submission.reviewedAt && (
                    <div className={`p-4 rounded-xl border ${
                        submission.status === "approved"
                            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
                            : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
                    }`}>
                        <p className="text-sm font-medium">
                            {submission.status === "approved"
                                ? "This submission was approved"
                                : `This submission was ${submission.status.replace("_", " ")}`}
                            {" on "}
                            {formatDisplayDate(submission.reviewedAt)}
                        </p>
                        {submission.reviewNotes && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Notes: {submission.reviewNotes}
                            </p>
                        )}
                        {submission.rejectionReason && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                Reason: {submission.rejectionReason}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
            {children}
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <Icon className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
                <span className="text-gray-500 dark:text-gray-400">{label}:</span>
                <p className="text-gray-900 dark:text-white break-all">{value}</p>
            </div>
        </div>
    );
}
