"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { formatDisplayDate } from "@/utils/dateUtils";
import Link from "next/link";
import {
    Key,
    ArrowLeft,
    Plus,
    Loader2,
    Trash2,
    Copy,
    Check,
    AlertTriangle,
} from "lucide-react";
import { toast, confirmDialog } from "@/utils/toast";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    rateLimit: number;
    lastUsedAt?: string;
    expiresAt?: string;
    createdAt: string;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
    const [newKeyExpiry, setNewKeyExpiry] = useState<string>("90");
    const [rawKey, setRawKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    const loadKeys = async () => {
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/api-keys`);
            if (res.ok) {
                const data = await res.json();
                setKeys(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to load API keys:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadKeys();
    }, []);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/api-keys`, {
                method: "POST",
                body: JSON.stringify({
                    name: newKeyName || "API Key",
                    scopes: newKeyScopes,
                    expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry) : null,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setRawKey(data.rawKey);
                setNewKeyName("");
                setNewKeyExpiry("90");
                await loadKeys();
            }
        } catch (err) {
            console.error("Failed to create API key:", err);
        }
        setCreating(false);
    };

    const handleRevoke = async (keyId: string) => {
        if (!(await confirmDialog("Are you sure you want to revoke this API key? This cannot be undone."))) return;
        setRevoking(keyId);
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/api-keys/${keyId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setKeys((prev) => prev.filter((k) => k.id !== keyId));
            }
        } catch (err) {
            console.error("Failed to revoke key:", err);
        }
        setRevoking(null);
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                        <Key className="w-7 h-7 text-amber-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                API Keys
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {keys.length} active key{keys.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowCreate(true); setRawKey(null); }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Key
                    </button>
                </div>

                {/* Raw key display (shown once after creation) */}
                {rawKey && (
                    <div className="p-4 border border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Copy your API key now — it won&apos;t be shown again.
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white break-all">
                                        {rawKey}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(rawKey)}
                                        className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create key form */}
                {showCreate && !rawKey && (
                    <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                            Create New API Key
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="e.g., Production Key"
                                    className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Scopes
                                </label>
                                <div className="flex gap-3">
                                    {["read", "write", "admin"].map((scope) => (
                                        <label key={scope} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={newKeyScopes.includes(scope)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setNewKeyScopes((prev) => [...prev, scope]);
                                                    } else {
                                                        setNewKeyScopes((prev) => prev.filter((s) => s !== scope));
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                            />
                                            {scope}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Expires in (days)
                                </label>
                                <select
                                    value={newKeyExpiry}
                                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                    <option value="30">30 days</option>
                                    <option value="90">90 days</option>
                                    <option value="180">180 days</option>
                                    <option value="365">1 year</option>
                                    <option value="">Never</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Key
                                </button>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Keys list */}
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Prefix</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Scopes</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Created</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Expires</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                            {keys.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No API keys yet. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                keys.map((key) => (
                                    <tr key={key.id}>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {key.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-gray-300">
                                                {key.keyPrefix}...
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {key.scopes.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded"
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                            {formatDisplayDate(key.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                            {key.expiresAt
                                                ? formatDisplayDate(key.expiresAt)
                                                : "Never"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleRevoke(key.id)}
                                                disabled={revoking === key.id}
                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                title="Revoke key"
                                            >
                                                {revoking === key.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
