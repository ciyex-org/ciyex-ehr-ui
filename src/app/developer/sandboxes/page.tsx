"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { formatDisplayDate } from "@/utils/dateUtils";
import Link from "next/link";
import {
    Server,
    ArrowLeft,
    Plus,
    Loader2,
    Trash2,
    RotateCcw,
    Copy,
    Check,
} from "lucide-react";
import { toast, confirmDialog } from "@/utils/toast";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface Sandbox {
    id: string;
    name: string;
    status: string;
    fhirBaseUrl?: string;
    clientId?: string;
    sampleData?: string;
    config?: Record<string, string>;
    lastAccessedAt?: string;
    expiresAt?: string;
    createdAt: string;
}

export default function SandboxesPage() {
    const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const loadSandboxes = async () => {
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/sandboxes`);
            if (res.ok) {
                const data = await res.json();
                setSandboxes(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to load sandboxes:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSandboxes();
    }, []);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/sandboxes`, {
                method: "POST",
                body: JSON.stringify({ sampleData: "standard" }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.config?.clientSecret) {
                    setNewSecret({ id: data.id, secret: data.config.clientSecret });
                }
                await loadSandboxes();
            }
        } catch (err) {
            console.error("Failed to create sandbox:", err);
        }
        setCreating(false);
    };

    const handleDelete = async (id: string) => {
        if (!(await confirmDialog("Delete this sandbox? This cannot be undone."))) return;
        setActionId(id);
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/sandboxes/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setSandboxes((prev) => prev.filter((s) => s.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete sandbox:", err);
        }
        setActionId(null);
    };

    const handleReset = async (id: string) => {
        if (!(await confirmDialog("Reset this sandbox? Credentials will be regenerated."))) return;
        setActionId(id);
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/sandboxes/${id}/reset`, {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                if (data.config?.clientSecret) {
                    setNewSecret({ id, secret: data.config.clientSecret });
                }
                await loadSandboxes();
            }
        } catch (err) {
            console.error("Failed to reset sandbox:", err);
        }
        setActionId(null);
    };

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
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
                        <Server className="w-7 h-7 text-green-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Sandbox Environments
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {sandboxes.filter((s) => s.status === "active").length} of 3 sandboxes active
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={creating || sandboxes.filter((s) => s.status === "active").length >= 3}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {creating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        Create Sandbox
                    </button>
                </div>

                {/* New secret alert */}
                {newSecret && (
                    <div className="p-4 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                            Client secret generated — copy it now, it won&apos;t be shown again.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white break-all">
                                {newSecret.secret}
                            </code>
                            <button
                                onClick={() => copyToClipboard(newSecret.secret, "secret")}
                                className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                            >
                                {copiedField === "secret" ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-green-700 dark:text-green-400" />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Sandboxes list */}
                {sandboxes.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl">
                        <Server className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            No sandboxes yet. Create one to start testing your app.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sandboxes.map((sandbox) => (
                            <div
                                key={sandbox.id}
                                className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {sandbox.name}
                                        </h3>
                                        <span
                                            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                                                sandbox.status === "active"
                                                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                                            }`}
                                        >
                                            {sandbox.status}
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleReset(sandbox.id)}
                                            disabled={actionId === sandbox.id}
                                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                                            title="Reset credentials"
                                        >
                                            {actionId === sandbox.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <RotateCcw className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sandbox.id)}
                                            disabled={actionId === sandbox.id}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                            title="Delete sandbox"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <CopyableField
                                        label="FHIR Base URL"
                                        value={sandbox.fhirBaseUrl || "—"}
                                        fieldKey={`fhir-${sandbox.id}`}
                                        copiedField={copiedField}
                                        onCopy={copyToClipboard}
                                    />
                                    <CopyableField
                                        label="Client ID"
                                        value={sandbox.clientId || "—"}
                                        fieldKey={`client-${sandbox.id}`}
                                        copiedField={copiedField}
                                        onCopy={copyToClipboard}
                                    />
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Sample Data:</span>{" "}
                                        <span className="text-gray-900 dark:text-white">{sandbox.sampleData || "standard"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Expires:</span>{" "}
                                        <span className="text-gray-900 dark:text-white">
                                            {sandbox.expiresAt ? formatDisplayDate(sandbox.expiresAt) : "Never"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function CopyableField({
    label,
    value,
    fieldKey,
    copiedField,
    onCopy,
}: {
    label: string;
    value: string;
    fieldKey: string;
    copiedField: string | null;
    onCopy: (text: string, key: string) => void;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400">{label}:</span>
            <code className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                {value}
            </code>
            {value !== "—" && (
                <button
                    onClick={() => onCopy(value, fieldKey)}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                    {copiedField === fieldKey ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                </button>
            )}
        </div>
    );
}
