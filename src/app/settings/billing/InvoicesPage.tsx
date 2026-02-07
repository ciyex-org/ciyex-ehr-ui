"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<any> | null = null;

async function ensureStripePromise(orgId?: string) {
    if (stripePromise) return stripePromise;
    try {
        const id = orgId || (localStorage.getItem("orgId") || "1");
        const res = await fetch(`${getEnv("NEXT_PUBLIC_API_URL")}/api/stripe/config/${id}`);
        const json = await res.json();
    const pk = json?.publishableKey || getEnv("NEXT_PUBLIC_STRIPE_PK");
    stripePromise = loadStripe(pk as string);
        return stripePromise;
    } catch (e) {
        console.warn("Could not load publishable key, falling back to env", e);
        stripePromise = loadStripe(getEnv("NEXT_PUBLIC_STRIPE_PK") as string);
        return stripePromise;
    }

}

/* ------------ Types ------------ */
type ApiResponse<T> = { success: boolean; message: string; data: T };

type Invoice = {
    id: number;
    externalId: string;
    amount: number;
    status: string;
    createdAt: string;
    dueDate?: string;
    orgId?: number;
    userId?: number;
    subscriptionId?: number;
    receiptUrl?: string;
    paidAt?: string;
};

type BillingCard = {
    id: string | number;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    defaultCard?: boolean;
};

/* ------------ Helpers ------------ */
const formatDate = (d?: string) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    // Return date-only (e.g., "May 13, 2025")
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(date);
};

/* ------------ Component ------------ */
const InvoicesPage = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [cards, setCards] = useState<BillingCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("UNPAID");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [paymentMethod, setPaymentMethod] = useState("STRIPE");
    const [selectedCard, setSelectedCard] = useState("");

    async function loadInvoices() {
        const userId = localStorage.getItem("userId") || "1";

        const res = await fetchWithAuth(
            `${getEnv("NEXT_PUBLIC_API_URL")}/api/invoice-bills`,
            { headers: { "X-User-Id": userId } }
        );

        const text = await res.text();
        console.log("Invoices API raw response:", text);

        try {
            const parsed: ApiResponse<Invoice[]> = text ? JSON.parse(text) : null;
            const invoices =
                parsed?.data && Array.isArray(parsed.data) ? parsed.data : [];
            setInvoices(invoices);
        } catch (e) {
            console.error("Invoice JSON parse error", e);
        }
    }

    async function loadCards(method: string) {
        const userId = localStorage.getItem("userId") || "1";

        const url =
            method === "STRIPE"
                ? `${getEnv("NEXT_PUBLIC_API_URL")}/api/stripe/cards`
                : `${getEnv("NEXT_PUBLIC_API_URL")}/api/gps/cards`;

        const res = await fetchWithAuth(url, { headers: { "X-User-Id": userId } });
        const text = await res.text();
        console.log(`${method} cards API raw response:`, text);

        try {
            const parsed: ApiResponse<BillingCard[]> = text ? JSON.parse(text) : null;
            const list = parsed?.data && Array.isArray(parsed.data) ? parsed.data : [];
            setCards(list);
            setSelectedCard(
                list.find((c) => c.defaultCard)?.id?.toString() ||
                list[0]?.id?.toString() ||
                ""
            );
        } catch (e) {
            console.error("Card JSON parse error", e);
            setCards([]);
            setSelectedCard("");
        }
    }

    async function handlePayment(invoiceIds: number[], payAll = false) {
        setLoading(true);
        try {
            const orgId = localStorage.getItem("orgId") || "1";
            const userId = localStorage.getItem("userId") || "1";

            const body = {
                orgId: Number(orgId),
                userId: Number(userId),
                paymentMethod,
                cardId: selectedCard,
                invoiceIds,
                payAll,
            };

            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/payments/create`,
                {
                    method: "POST",
                    headers: { "X-User-Id": userId },
                    body: JSON.stringify(body),
                }
            );

            const text = await res.text();
            console.log("Payment API raw response:", text);

            let parsed: any = null;
            try {
                parsed = text ? JSON.parse(text) : null;
            } catch (e) {
                console.error("Payment JSON parse error", e, text);
            }

            if (parsed?.paymentMethod === "STRIPE") {
                // If a saved card was used (selectedCard present), the server will confirm the PaymentIntent.
                    if (selectedCard && selectedCard !== "") {
                    // Server-side confirmation path — only treat as success when explicitly succeeded
                    if (parsed.status === "succeeded") {
                        window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment success", type: "success" } }));
                        await loadInvoices();
                    } else if (parsed?.clientSecret) {
                        // fallback: if server returned clientSecret, attempt client confirm
                        const sp = await ensureStripePromise();
                        const stripe = await sp;
                        const { error, paymentIntent } = await stripe.confirmCardPayment(parsed.clientSecret);
                        if (error) {
                            // keep console error detail, but show generic toast
                            console.error("Stripe confirm error", error);
                            window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed", type: "error" } }));
                        } else if (paymentIntent?.status === "succeeded") {
                            window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment success", type: "success" } }));
                            await loadInvoices();
                        } else {
                            window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed", type: "error" } }));
                        }
                    } else {
                        window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed", type: "error" } }));
                    }
                } else {
                    // Client-side card entry flow: initialize Stripe and confirm using client secret
                    const sp = await ensureStripePromise();
                    const stripe = await sp;
                    if (!stripe) throw new Error("Stripe.js failed to load");
                    const { error, paymentIntent } = await stripe.confirmCardPayment(parsed.clientSecret);
                    if (error) {
                        console.error("Stripe confirm error", error);
                        window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed", type: "error" } }));
                    } else if (paymentIntent?.status === "succeeded") {
                        window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment success", type: "success" } }));
                        await loadInvoices();
                    } else {
                        window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed", type: "error" } }));
                    }
                }
            } else if (parsed?.transactionId) {
                // GPS path — show success only if explicitly succeeded
                if (parsed.status === "succeeded") {
                    window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment success", type: "success" } }));
                } else {
                    window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed", type: "error" } }));
                }
                await loadInvoices();
            } else {
                window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed", type: "error" } }));
            }

            setSelectedIds([]);
        } catch (e) {
            console.error("Payment error", e);
            window.dispatchEvent(new CustomEvent("ciyex:toast", { detail: { message: "Payment failed unexpectedly", type: "error" } }));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadInvoices();
    }, []);

    useEffect(() => {
        loadCards(paymentMethod);
    }, [paymentMethod]);

    const filteredInvoices =
        statusFilter === "ALL"
            ? invoices
            : invoices.filter((inv) => inv.status === statusFilter);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const allSelected =
        filteredInvoices.length > 0 &&
        selectedIds.length === filteredInvoices.length;

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Invoices</h1>
                <div className="flex gap-3 items-center">
                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value="ALL">All</option>
                        <option value="UNPAID">Unpaid</option>
                        <option value="PAID">Paid</option>
                    </select>

                    {/* Payment method */}
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value="STRIPE">Stripe</option>
                        <option value="GPS">GPS</option>
                    </select>

                    {/* Card selector */}
                    <select
                        value={selectedCard}
                        onChange={(e) => setSelectedCard(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        {cards.length > 0 ? (
                            cards.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.brand
                                        ? `${c.brand} •••• ${c.last4}`
                                        : `Card ${c.id}`}
                                    {c.expMonth && c.expYear
                                        ? ` (exp ${c.expMonth}/${c.expYear})`
                                        : ""}
                                </option>
                            ))
                        ) : (
                            <option value="">No cards available</option>
                        )}
                    </select>

                    {/* Pay buttons */}
                    <button
                        disabled={loading || !selectedIds.length}
                        onClick={() => handlePayment(selectedIds, false)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Pay Selected"}
                    </button>

                    <button
                        disabled={loading || !filteredInvoices.length}
                        onClick={() => handlePayment([], true)}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Pay All"}
                    </button>
                </div>
            </div>

            {/* Table */}
            <table className="table-auto w-full text-sm border rounded bg-white">
                <thead className="bg-gray-100">
                <tr>
                    <th className="px-2 py-2">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() =>
                                setSelectedIds(
                                    allSelected ? [] : filteredInvoices.map((i) => i.id)
                                )
                            }
                        />
                    </th>
                    <th className="px-4 py-2">Invoice</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Due Date</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Created</th>
                </tr>
                </thead>
                <tbody>
                {filteredInvoices.length ? (
                    filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="border-t hover:bg-gray-50">
                            <td className="px-2 py-2">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(inv.id)}
                                    onChange={() => toggleSelect(inv.id)}
                                    disabled={inv.status === "PAID"}
                                />
                            </td>
                            <td className="px-4 py-2">{inv.externalId}</td>
                            <td className="px-4 py-2">
                                {inv.userId ? `User ${inv.userId}` : `Org ${inv.orgId}`}
                            </td>
                            <td className="px-4 py-2">${inv.amount.toFixed(2)}</td>
                            <td className="px-4 py-2">{formatDate(inv.dueDate)}</td>
                            <td className="px-4 py-2">{inv.status}</td>
                            <td className="px-4 py-2">{formatDate(inv.createdAt)}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500">
                            No invoices found 🎉
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
};

export default InvoicesPage;
