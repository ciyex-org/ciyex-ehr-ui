"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import SubscriptionsPage from "./Subscriptions";
import InvoicesPage from "./InvoicesPage";
import CardsPage from "./card";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

/* ------------ Stripe ------------ */
const stripePromise = loadStripe(
    getEnv("NEXT_PUBLIC_STRIPE_PK") ||
    "pk_test_51S5UPvJSxIy1fnkK6dpKKhcedyuGTeD6IyZE4UtJ02MCHGyR28wFoCO9397j2JF31WGYLMLCH7cokGRkRDcugN2500tQtAXCJV"
);

/* ------------ Types ------------ */
type ApiResponse<T> = { success: boolean; message: string; data: T };

type BillingHistory = {
    id: number;
    externalId?: string;
    createdAt: string | number[] | number | null;
    // amount may come as number, string, or serialized BigDecimal-like object
    amount: number | string | { amount?: number };
    status: string;
    invoiceUrl?: string;
    receiptUrl?: string;
    // optional fields returned by backend
    method?: string; // e.g., provider or method
    provider?: string; // STRIPE or GPS
    // provider-specific fields that some backend shapes include
    stripePaymentIntentId?: string;
    stripePaymentMethodId?: string;
    gpsTransactionId?: string;
    gpsCustomerVaultId?: string;
    invoiceNumber?: string;
};

/* ------------ Helpers ------------ */
async function safeJson<T>(res: Response): Promise<ApiResponse<T> | null> {
    try {
        const text = await res.text();
        return text ? (JSON.parse(text) as ApiResponse<T>) : null;
    } catch {
        return null;
    }
}

// Local date helper (keep changes inside frontend files only)
function parseToDate(value: any): Date | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "object" && !Array.isArray(value)) {
        const maybeYear = value.year ?? value.y ?? value[0];
        const maybeMonth = value.month ?? value.m ?? value[1];
        const maybeDay = value.day ?? value.d ?? value[2];
        const maybeHour = value.hour ?? value.h ?? value[3] ?? 0;
        const maybeMinute = value.minute ?? value.min ?? value[4] ?? 0;
        const maybeSecond = value.second ?? value.s ?? value[5] ?? 0;
        if (maybeYear != null && maybeMonth != null) {
            return new Date(Number(maybeYear), Math.max(0, Number(maybeMonth) - 1), Number(maybeDay || 1), Number(maybeHour || 0), Number(maybeMinute || 0), Number(maybeSecond || 0));
        }
        if (value.epochMillis || value.epoch || value.timestamp) {
            const ms = Number(value.epochMillis ?? value.epoch ?? value.timestamp);
            const v = ms < 1e11 ? ms * 1000 : ms;
            return new Date(v);
        }
    }
    if (Array.isArray(value)) {
        const [y, m, d, h = 0, min = 0, s = 0] = value.map((v: any) => Number(v || 0));
        return new Date(y, Math.max(0, m - 1), d || 1, h, min, s);
    }
    if (typeof value === "number") {
        const v = value < 1e11 ? value * 1000 : value;
        return new Date(v);
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) {
            const n = Number(trimmed);
            const v = n < 1e11 ? n * 1000 : n;
            return new Date(v);
        }
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

const formatDate = (value?: any, withTime = false) => {
    const d = parseToDate(value);
    if (!d) return "-";
    return withTime ? d.toLocaleString() : d.toLocaleDateString();
};

// Safely format numeric amount values coming from backend (could be number, string, BigDecimal-like)
const safeFormatAmount = (value: any) => {
    if (value == null) return "-";
    if (typeof value === "object") {
        if ((value as any).amount != null) value = (value as any).amount;
        else value = String(value);
    }
    const n = typeof value === "string" ? Number(value) : value;
    if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
    return "-";
};

const getStatusBadge = (status?: string) => {
    if (!status) return <span className="text-gray-500">-</span>;
    const base = "px-2 py-1 rounded text-xs font-semibold";
    switch (status.toUpperCase()) {
        case "PAID":
        case "SUCCEEDED":
            return (
                <span className={`${base} bg-green-100 text-green-700`}>{status}</span>
            );
        case "FAILED":
            return (
                <span className={`${base} bg-red-100 text-red-700`}>{status}</span>
            );
        case "UNPAID":
            return (
                <span className={`${base} bg-yellow-100 text-yellow-700`}>
          {status}
        </span>
            );
        case "ARCHIVED":
            return (
                <span className={`${base} bg-gray-200 text-gray-600`}>{status}</span>
            );
        default:
            return (
                <span className={`${base} bg-blue-100 text-blue-700`}>{status}</span>
            );
    }
};

/* ------------ Toast ------------ */
const Toast = ({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void; }) => (
    <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-3 max-w-xs px-4 py-2 mb-2 rounded-full text-sm shadow-md border ${
            type === "success"
                ? "bg-white text-green-700 border-green-100"
                : "bg-white text-red-700 border-red-100"
        }`}
    >
        <div className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded-full bg-opacity-10">
            {type === "success" ? (
                <svg className="w-4 h-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.07a1 1 0 011.414-1.414L8 10.95l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg className="w-4 h-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.257 3.099c.765-1.36 2.681-1.36 3.446 0l6.518 11.59A1.75 1.75 0 0116.518 17H3.482a1.75 1.75 0 01-1.703-2.311L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-6a.75.75 0 00-.75.75v3.5c0 .414.336.75.75.75s.75-.336.75-.75v-3.5A.75.75 0 0010 7z" />
                </svg>
            )}
        </div>

        <div className="flex-1 text-left truncate">{message}</div>

        <button
            onClick={onClose}
            aria-label="Close notification"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
            ✕
        </button>
    </div>
);

const BillingPage = () => {
    const [currentTab, setCurrentTab] = useState<
        "subscriptions" | "invoices" | "history" | "cards"
    >("subscriptions");

    const [history, setHistory] = useState<BillingHistory[]>([]);
    const [toasts, setToasts] = useState<
        { id: number; message: string; type: "success" | "error" }[]
    >([]);

    function showToast(message: string, type: "success" | "error") {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    }

    // Listen for global toast events so child pages/components can emit toasts
    useEffect(() => {
        const handler = (e: any) => {
            const detail = e?.detail || {};
            const message = detail.message || "";
            const type = detail.type === "error" ? "error" : "success";
            if (message) showToast(message, type);
        };
        (window as any).addEventListener("ciyex:toast", handler);
        return () => (window as any).removeEventListener("ciyex:toast", handler);
    }, []);

    useEffect(() => {
        if (currentTab === "history") {
            loadHistory();
        }
    }, [currentTab]);

    async function loadHistory() {
        try {
            const orgId = localStorage.getItem("orgId") || "1";
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/invoice-bills/history`,
                { headers: { "X-Org-Id": orgId } }
            );
            // Read raw response text for debugging so we can see exactly what the API returns
            const text = await res.text();
            console.log("Billing history raw response:", text);
            let parsed: ApiResponse<BillingHistory[]> | null = null;
            try {
                parsed = text ? (JSON.parse(text) as ApiResponse<BillingHistory[]>) : null;
            } catch (e) {
                console.error("Failed to parse billing history JSON", e);
            }
                if (parsed?.success) {
                console.log("Billing history parsed data:", parsed.data);
                // Normalize a few common backend shapes so table columns render predictably
                const normalized = (parsed.data || []).map((h: any) => {
                    // prefer explicit provider if backend sent it
                    let provider = h.provider || h.method || h.paymentMethod || h.payment_method || h.methodType;

                    // Some backend endpoints map provider into invoiceNumber (e.g. 'STRIPE-<pmid>' or 'GPS-...').
                    // Detect provider from invoiceNumber or externalId as a fallback.
                    const invoiceNumber = (h.invoiceNumber || h.externalId || "").toString();
                    const invUpper = invoiceNumber.toUpperCase();
                    if (!provider && invUpper) {
                        if (invUpper.includes("GPS")) provider = "GPS";
                        else if (invUpper.includes("STRIPE") || invUpper.startsWith("INV-")) provider = "STRIPE";
                    }

                    // If still missing, try to infer from provider-like tokens in invoiceUrl/receiptUrl
                    if (!provider) {
                        const urls = (h.invoiceUrl || "") + "|" + (h.receiptUrl || "");
                        const urlsUpper = urls.toUpperCase();
                        if (urlsUpper.includes("GPS")) provider = "GPS";
                        else if (urlsUpper.includes("STRIPE")) provider = "STRIPE";
                    }

                    // normalize provider to short string
                    if (provider) provider = String(provider).trim();

                    return {
                        ...h,
                        provider,
                        method: h.method || h.paymentMethod || h.payment_method || h.methodType || undefined,
                        recipient: h.recipient || h.payer || h.payerName || h.recipientName || undefined,
                    };
                });
                setHistory(normalized);
            }
        } catch (e) {
            console.error("Failed to load billing history", e);
            showToast("Failed to load billing history", "error");
        }
    }

    async function archiveHistory(id: number) {
        try {
            const orgId = localStorage.getItem("orgId") || "1";
            await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/invoice-bills/${id}/archive`,
                { method: "PUT", headers: { "X-Org-Id": orgId } }
            );
            await loadHistory();
            showToast("History archived", "success");
        } catch {
            showToast("Failed to archive history", "error");
        }
    }

    async function unarchiveHistory(id: number) {
        try {
            const orgId = localStorage.getItem("orgId") || "1";
            await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/invoice-bills/${id}/unarchive`,
                { method: "PUT", headers: { "X-Org-Id": orgId } }
            );
            await loadHistory();
            showToast("History unarchived", "success");
        } catch {
            showToast("Failed to unarchive history", "error");
        }
    }

    async function deleteHistory(id: number) {
        try {
            const orgId = localStorage.getItem("orgId") || "1";
            await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/invoice-bills/${id}`,
                { method: "DELETE", headers: { "X-Org-Id": orgId } }
            );
            await loadHistory();
            showToast("History deleted", "success");
        } catch {
            showToast("Failed to delete history", "error");
        }
    }

    return (
        <AdminLayout>
            {/* Header Tabs */}
            <div className="flex justify-between items-center p-4 border-b bg-white">
                <div className="flex items-center gap-2">
                    {(["subscriptions", "invoices", "history", "cards"] as const).map(
                        (t) => (
                            <button
                                key={t}
                                onClick={() => setCurrentTab(t)}
                                className={`px-3 py-1.5 rounded text-sm ${
                                    currentTab === t
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                {t === "subscriptions"
                                    ? "Subscriptions"
                                    : t === "invoices"
                                        ? "Invoices"
                                        : t === "history"
                                            ? "Billing History"
                                            : "Cards"}
                            </button>
                        )
                    )}
                </div>
            </div>

            <div className="p-6">
                {currentTab === "subscriptions" && <SubscriptionsPage />}
                {currentTab === "invoices" && <InvoicesPage />}
                {currentTab === "cards" && (
                    <Elements stripe={stripePromise}>
                        <CardsPage />
                    </Elements>
                )}

                {currentTab === "history" && (
                    <section>
                        <h2 className="text-lg font-semibold mb-4">Billing History</h2>
                        <table className="table-auto w-full text-sm border rounded bg-white">
                            <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2">No.</th>
                                <th className="px-4 py-2">Invoice #</th>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Amount</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Method</th>
                                <th className="px-4 py-2">Receipt</th>
                                <th className="px-4 py-2">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {history.length ? (
                                history.map((h, idx) => (
                                    <tr key={h.id} className="border-t hover:bg-gray-50">
                                        <td className="px-4 py-2">{idx + 1}</td>
                                        <td className="px-4 py-2">{h.externalId ?? "N/A"}</td>
                                        <td className="px-4 py-2">{formatDate(h.createdAt)}</td>
                                        <td className="px-4 py-2">{safeFormatAmount(h.amount)}</td>
                                        <td className="px-4 py-2">{getStatusBadge(h.status)}</td>
                                        <td className="px-4 py-2">{
                                            // Determine provider/method to display.
                                            (() => {
                                                // prefer explicit provider
                                                let prov = h.provider ?? h.method ?? undefined;
                                                // normalize
                                                prov = prov ? String(prov).trim() : undefined;

                                                // fallback: detect from provider-specific fields
                                                if (!prov) {
                                                    if (h.stripePaymentIntentId || h.stripePaymentMethodId) prov = "STRIPE";
                                                    else if (h.gpsTransactionId || h.gpsCustomerVaultId) prov = "GPS";
                                                }

                                                // fallback: detect from invoice/external id
                                                if (!prov) {
                                                    const inv = (h.invoiceNumber || h.externalId || "").toString().toUpperCase();
                                                    if (inv.includes("GPS")) prov = "GPS";
                                                    else if (inv.includes("STRIPE") || inv.startsWith("INV-")) prov = "STRIPE";
                                                }

                                                if (!prov) return "-";
                                                const up = String(prov).toUpperCase();
                                                if (up === "STRIPE") return "Stripe";
                                                if (up === "GPS") return "GPS";
                                                return up;
                                            })()
                                        }</td>
                                        <td className="px-4 py-2">
                                            {h.receiptUrl ? (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetchWithAuth(
                                                                `${getEnv("NEXT_PUBLIC_API_URL")}/api/invoice-bills/${h.id}/receipt`,
                                                                { method: "GET" }
                                                            );
                                                            if (!res.ok) throw new Error(`Failed to download receipt: ${res.status}`);
                                                            const blob = await res.blob();
                                                            const url = window.URL.createObjectURL(blob);
                                                            const link = document.createElement("a");
                                                            link.href = url;
                                                            const cd = res.headers.get("content-disposition") || "";
                                                            const m = cd.match(/filename=\"?([^\";]+)\"?/);
                                                            const filename = m ? m[1] : `receipt-${h.id}.pdf`;
                                                            link.setAttribute("download", filename);
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            link.remove();
                                                            URL.revokeObjectURL(url);
                                                        } catch (err) {
                                                            console.error("Download failed", err);
                                                            window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Failed to download receipt", type: "error" } }));
                                                        }
                                                    }}
                                                    className="text-blue-600 underline"
                                                >
                                                    View
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 space-x-3">
                                            {h.status === "ARCHIVED" ? (
                                                <button
                                                    onClick={() => unarchiveHistory(h.id)}
                                                    className="text-green-600 hover:underline"
                                                >
                                                    Unarchive
                                                </button>                                            ) : (
                                                <button
                                                    onClick={() => archiveHistory(h.id)}
                                                    className="text-yellow-600 hover:underline"
                                                >
                                                    Archive
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteHistory(h.id)}
                                                className="text-red-600 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="text-center py-6 text-gray-500">
                                        No billing records found
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </section>
                )}
            </div>

            {/* Toast Container - bottom-right, stack upward so newest is at the bottom */}
            <div className="fixed bottom-4 right-4 flex flex-col-reverse items-end gap-2 z-[100000]">
                {toasts.map((t) => (
                    <Toast
                        key={t.id}
                        message={t.message}
                        type={t.type}
                        onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                    />
                ))}
            </div>
        </AdminLayout>
    );
};

export default BillingPage;
