"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    DollarSign, Plus, X, CreditCard,
    Check, Loader2, Pencil, Trash2, Wallet
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { confirmDialog } from "@/utils/toast";
import { formatDisplayDate } from "@/utils/dateUtils";

interface PaymentPostingTabProps {
    patientId: number;
}

interface ClaimSummary {
    id: string;
    claimNumber: string;
    claimStatus: string;
    dateOfService: string;
    providerName: string;
    payerName: string;
    totalCharges: number;
    totalPaid: number;
    lines: ClaimLine[];
    diagnoses: { icd10Code: string; description: string }[];
}

interface ClaimLine {
    lineNumber: number;
    cptCode: string;
    description: string;
    chargeAmount: number;
    paidAmount: number;
    adjustmentAmount: number;
    patientResponsibility: number;
}

interface ExistingPayment {
    id: string;
    claimNumber: string;
    dateOfService: string;
    date: string;
    amount: number;
    paymentType: string;
    status: string;
    reference: string;
    notes: string;
}

interface LinePayment {
    cptCode: string;
    description: string;
    chargeAmount: number;
    alreadyPaid: number;
    allowedAmount: string;
    paymentAmount: string;
    adjustmentAmount: string; // contractual write-off
    deductible: string;
    copay: string;
    coinsurance: string;
}

const PAYMENT_TYPES = [
    { value: "insurance", label: "Insurance Payment" },
    { value: "patient_copay", label: "Patient Copay" },
    { value: "patient_coinsurance", label: "Patient Coinsurance" },
    { value: "patient_deductible", label: "Patient Deductible" },
    { value: "patient_self_pay", label: "Patient Self-Pay" },
    { value: "cash", label: "Cash" },
    { value: "check", label: "Check" },
    { value: "credit_card", label: "Credit Card" },
    { value: "eft", label: "EFT/ACH" },
];

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    issued: "bg-blue-100 text-blue-700",
    balanced: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
    draft: "Draft",
    issued: "Posted",
    balanced: "Balanced",
    cancelled: "Cancelled",
};

function formatDate(d: string): string {
    if (!d) return "-";
    return formatDisplayDate(d) || "-";
}

function formatCurrency(n: number | string | undefined): string {
    return "$" + Number(n ?? 0).toFixed(2);
}

export default function PaymentPostingTab({ patientId }: PaymentPostingTabProps) {
    const [claims, setClaims] = useState<ClaimSummary[]>([]);
    const [payments, setPayments] = useState<ExistingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [selectedClaimId, setSelectedClaimId] = useState("");
    const [linePayments, setLinePayments] = useState<LinePayment[]>([]);
    const [paymentType, setPaymentType] = useState("insurance");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [lumpSumAmount, setLumpSumAmount] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Collect patient payment state
    const [showCollect, setShowCollect] = useState(false);
    const [collectAmount, setCollectAmount] = useState("");
    const [collectMethod, setCollectMethod] = useState("credit_card");
    const [collectRef, setCollectRef] = useState("");
    const [collectNotes, setCollectNotes] = useState("");
    const [collectClaimId, setCollectClaimId] = useState("");
    const [collectSaving, setCollectSaving] = useState(false);
    const [collectError, setCollectError] = useState<string | null>(null);
    const [collectSuccess, setCollectSuccess] = useState(false);
    const [savedMethods, setSavedMethods] = useState<{ id: number; cardBrand?: string; lastFour?: string; label?: string }[]>([]);
    const [collectPaymentMethodId, setCollectPaymentMethodId] = useState<number | null>(null);

    // Fetch claims from RCM with FHIR fallback
    const fetchClaims = useCallback(async () => {
        // Try RCM service first
        try {
            const res = await fetchWithAuth(
                `/api/app-proxy/ciyex-rcm/api/rcm/claims/patient/${patientId}`
            );
            if (res.ok) {
                const data = await res.json();
                const pageData = data.data || data;
                const content = pageData.content || (Array.isArray(pageData) ? pageData : []);
                if (content.length > 0) {
                    setClaims(content);
                    return;
                }
            }
        } catch {
            // RCM may not be available, try FHIR fallback
        }
        // Fallback: fetch claims from FHIR resource
        try {
            const res = await fetchWithAuth(
                `/api/fhir-resource/billing/patient/${patientId}?page=0&size=100`
            );
            if (res.ok) {
                const data = await res.json();
                const pageData = data.data || data;
                const content = pageData.content || (Array.isArray(pageData) ? pageData : []);
                if (content.length > 0) {
                    // Map FHIR claims to ClaimSummary format
                    const mapped = content.map((c: any) => ({
                        id: c.id || c.fhirId,
                        claimNumber: c.claimNumber || c.id || c.fhirId,
                        dateOfService: c.serviceDate || c.dateOfService || c.created || "",
                        payerName: c.payerName || c.insurer || c.insurerDisplay || "",
                        totalCharges: c.totalAmount || c.amount || c.total || 0,
                        providerName: c.provider || c.providerName || c.providerDisplay || "",
                        status: c.status || "",
                    }));
                    setClaims(mapped);
                    return;
                }
            }
        } catch {
            // ignore
        }
    }, [patientId]);

    // Fetch existing payments from FHIR
    const fetchPayments = useCallback(async () => {
        try {
            const res = await fetchWithAuth(
                `/api/fhir-resource/payment/patient/${patientId}?page=0&size=100`
            );
            if (res.ok) {
                const data = await res.json();
                const pageData = data.data ?? data;
                const records = Array.isArray(pageData) ? pageData : pageData.content ?? [];
                setPayments(records);
            }
        } catch {
            // ignore
        }
    }, [patientId]);

    // Fetch saved payment methods for this patient
    const fetchSavedMethods = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`/api/payments/methods/patient/${patientId}`);
            if (res.ok) {
                const json = await res.json();
                const items = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.content) ? json.data.content : [];
                setSavedMethods(items);
            }
        } catch { setSavedMethods([]); }
    }, [patientId]);

    useEffect(() => {
        Promise.all([fetchClaims(), fetchPayments(), fetchSavedMethods()]).finally(() => setLoading(false));
    }, [fetchClaims, fetchPayments, fetchSavedMethods]);

    // When a claim is selected, fetch detail and populate line payments
    const handleClaimSelect = async (claimId: string) => {
        setSelectedClaimId(claimId);
        if (!claimId) {
            setLinePayments([]);
            return;
        }

        // Try to fetch full claim detail with lines
        try {
            const res = await fetchWithAuth(
                `/api/app-proxy/ciyex-rcm/api/rcm/claims/${claimId}`
            );
            if (res.ok) {
                const json = await res.json();
                const detail = json.data ?? json;
                const lines = (detail.lines || []).map((l: any) => ({
                    cptCode: l.cptCode || "",
                    description: l.description || "",
                    chargeAmount: Number(l.chargeAmount || 0),
                    alreadyPaid: Number(l.paidAmount || 0),
                    allowedAmount: "",
                    paymentAmount: "",
                    adjustmentAmount: "",
                    deductible: "",
                    copay: "",
                    coinsurance: "",
                }));
                setLinePayments(lines);
                return;
            }
        } catch {
            // Fall through to summary-only mode
        }

        // Fallback: use summary data from list
        const claim = claims.find((c) => c.id === claimId);
        if (claim && claim.lines?.length) {
            setLinePayments(claim.lines.map((l) => ({
                cptCode: l.cptCode,
                description: l.description,
                chargeAmount: Number(l.chargeAmount || 0),
                alreadyPaid: Number(l.paidAmount || 0),
                allowedAmount: "",
                paymentAmount: "",
                adjustmentAmount: "",
                deductible: "",
                copay: "",
                coinsurance: "",
            })));
        } else {
            setLinePayments([]);
        }
    };

    type LineField = "allowedAmount" | "paymentAmount" | "adjustmentAmount" | "deductible" | "copay" | "coinsurance";
    const updateLinePayment = (idx: number, field: LineField, value: string) => {
        setLinePayments((prev) =>
            prev.map((lp, i) => {
                if (i !== idx) return lp;
                const updated = { ...lp, [field]: value };
                // Auto-calculate write-off when allowed amount is entered
                if (field === "allowedAmount") {
                    const allowed = parseFloat(value) || 0;
                    const writeOff = lp.chargeAmount - allowed;
                    updated.adjustmentAmount = writeOff > 0 ? writeOff.toFixed(2) : "0";
                }
                return updated;
            })
        );
    };

    const totalPayment = linePayments.length > 0
        ? linePayments.reduce((sum, lp) => sum + (parseFloat(lp.paymentAmount) || 0), 0)
        : parseFloat(lumpSumAmount) || 0;
    const totalAdjustment = linePayments.reduce(
        (sum, lp) => sum + (parseFloat(lp.adjustmentAmount) || 0),
        0
    );

    const selectedClaim = claims.find((c) => c.id === selectedClaimId);

    const resetForm = () => {
        setShowForm(false);
        setSelectedClaimId("");
        setLinePayments([]);
        setPaymentType("insurance");
        setReference("");
        setNotes("");
        setLumpSumAmount("");
        setEditingPaymentId(null);
        setSaveError(null);
    };

    const handleEdit = (p: ExistingPayment) => {
        setEditingPaymentId(p.id);
        setShowCollect(false);
        setShowForm(true);
        // Find matching claim to select
        const matchingClaim = claims.find((c) => c.claimNumber === p.claimNumber);
        if (matchingClaim) {
            setSelectedClaimId(matchingClaim.id);
            handleClaimSelect(matchingClaim.id);
        } else {
            setSelectedClaimId("");
            setLinePayments([]);
        }
        setPaymentType(p.paymentType || "insurance");
        setReference(p.reference || "");
        setNotes(p.notes || "");
        setLumpSumAmount(String(Number(p.amount || 0)));
    };

    const handleDelete = async (paymentId: string) => {
        const confirmed = await confirmDialog("Delete this payment?");
        if (!confirmed) return;
        setDeletingId(paymentId);
        try {
            const res = await fetchWithAuth(`/api/fhir-resource/payment/patient/${patientId}/${paymentId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                await fetchPayments();
            }
        } catch {
            // ignore
        } finally {
            setDeletingId(null);
        }
    };

    const handleSave = async () => {
        if (!selectedClaim && !editingPaymentId) return;
        setSaving(true);
        setSaveError(null);

        const today = new Date().toISOString().slice(0, 10);

        try {
            const payload: Record<string, any> = {
                claimNumber: selectedClaim?.claimNumber || "",
                dateOfService: selectedClaim?.dateOfService
                    ? selectedClaim.dateOfService.substring(0, 10)
                    : "",
                chargeAmount: selectedClaim?.totalCharges || 0,
                date: today,
                amount: totalPayment,
                paymentType,
                reference,
                status: "issued",
                notes: notes || buildAutoNotes(),
            };

            const isEdit = !!editingPaymentId;
            const url = isEdit
                ? `/api/fhir-resource/payment/patient/${patientId}/${editingPaymentId}`
                : `/api/fhir-resource/payment/patient/${patientId}`;

            const res = await fetchWithAuth(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                // Update claim status in RCM based on payment
                if (selectedClaim) {
                    const claimBalance = Number(selectedClaim.totalCharges || 0) - Number(selectedClaim.totalPaid || 0) - totalPayment;
                    const newStatus = claimBalance <= 0 ? "CLOSED" : "PARTIALLY_PAID";
                    try {
                        await fetchWithAuth(
                            `/api/app-proxy/ciyex-rcm/api/rcm/claims/${selectedClaim.id}/status`,
                            {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: newStatus }),
                            }
                        );
                    } catch {
                        // Non-blocking — payment saved even if status update fails
                    }
                }
                resetForm();
                await Promise.all([fetchPayments(), fetchClaims()]);
            } else {
                const json = await res.json().catch(() => null);
                setSaveError(json?.message || "Failed to save payment");
            }
        } catch {
            setSaveError("Network error saving payment");
        } finally {
            setSaving(false);
        }
    };

    const resetCollectForm = () => {
        setShowCollect(false);
        setCollectAmount("");
        setCollectMethod("credit_card");
        setCollectRef("");
        setCollectNotes("");
        setCollectClaimId("");
        setCollectError(null);
        setCollectSuccess(false);
        setCollectPaymentMethodId(null);
    };

    const isCardCollect = collectMethod === "credit_card" || collectMethod === "debit_card";

    const handleCollectPayment = async () => {
        const amount = parseFloat(collectAmount);
        if (!amount || amount <= 0) return;
        if (isCardCollect && !collectPaymentMethodId) {
            setCollectError("Please select a saved card for card payments");
            return;
        }
        setCollectSaving(true);
        setCollectError(null);

        try {
            // Step 1: Create payment intent (real Stripe or demo)
            const intentRes = await fetchWithAuth(`/api/payments/create-intent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    description: `Patient payment for ${collectClaimId ? claims.find(c => c.id === collectClaimId)?.claimNumber : "account balance"}`,
                }),
            });

            let intentData: any = {};
            if (intentRes.ok) {
                const json = await intentRes.json();
                intentData = json.data ?? json;
            }

            // Step 2: Record the transaction
            const claim = claims.find(c => c.id === collectClaimId);
            const selectedCard = savedMethods.find(m => m.id === collectPaymentMethodId);
            const txnRes = await fetchWithAuth(`/api/payments/collect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId,
                    patientName: "",
                    amount,
                    currency: "USD",
                    paymentMethodType: collectMethod,
                    paymentMethodId: collectPaymentMethodId || null,
                    cardBrand: selectedCard?.cardBrand || undefined,
                    lastFour: selectedCard?.lastFour || undefined,
                    description: `Patient payment${claim ? ` - ${claim.claimNumber}` : ""}`,
                    referenceType: claim ? "claim" : "self_pay",
                    referenceId: null,
                    invoiceNumber: claim?.claimNumber || null,
                    stripePaymentIntentId: intentData.paymentIntentId || null,
                    receiptEmail: null,
                    notes: collectNotes || `${intentData.mode === "demo" ? "[DEMO] " : ""}${selectedCard ? `Card ending ${selectedCard.lastFour || "****"}` : collectMethod}`,
                }),
            });

            if (!txnRes.ok) {
                const json = await txnRes.json().catch(() => null);
                throw new Error(json?.message || "Failed to record transaction");
            }

            // Step 3: Also record as FHIR payment (so it shows in payment list)
            const today = new Date().toISOString().slice(0, 10);
            await fetchWithAuth(`/api/fhir-resource/payment/patient/${patientId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    claimNumber: claim?.claimNumber || "",
                    dateOfService: claim?.dateOfService?.substring(0, 10) || "",
                    chargeAmount: claim?.totalCharges || 0,
                    date: today,
                    amount,
                    paymentType: `patient_${collectMethod === "credit_card" ? "self_pay" : collectMethod}`,
                    reference: collectRef || `${intentData.mode === "demo" ? "DEMO-" : ""}${intentData.paymentIntentId || ""}`,
                    status: "issued",
                    notes: collectNotes || `Patient card payment${intentData.mode === "demo" ? " (demo mode)" : ""}`,
                }),
            });

            // Step 4: Update claim status if applicable
            if (claim) {
                const claimBalance = Number(claim.totalCharges || 0) - Number(claim.totalPaid || 0) - amount;
                const newStatus = claimBalance <= 0 ? "CLOSED" : "PARTIALLY_PAID";
                try {
                    await fetchWithAuth(
                        `/api/app-proxy/ciyex-rcm/api/rcm/claims/${claim.id}/status`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: newStatus }),
                        }
                    );
                } catch { /* non-blocking */ }
            }

            setCollectSuccess(true);
            await Promise.all([fetchPayments(), fetchClaims()]);
            setTimeout(() => resetCollectForm(), 2000);
        } catch (e: any) {
            setCollectError(e.message || "Payment failed");
        } finally {
            setCollectSaving(false);
        }
    };

    const buildAutoNotes = () => {
        const parts: string[] = [];
        for (const lp of linePayments) {
            const pay = parseFloat(lp.paymentAmount) || 0;
            const adj = parseFloat(lp.adjustmentAmount) || 0;
            if (pay > 0 || adj > 0) {
                parts.push(
                    `${lp.cptCode}: paid $${pay.toFixed(2)}${adj > 0 ? `, adj $${adj.toFixed(2)}` : ""}`
                );
            }
        }
        return parts.join("; ");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading payment data...
            </div>
        );
    }

    // Summary totals from existing payments
    const paymentList = Array.isArray(payments) ? payments : [];
    const totalPaid = paymentList.reduce((s, p) => s + Number(p.amount || 0), 0);

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <h3 className="text-sm font-semibold text-gray-800">Payments</h3>
                        </div>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-sm text-gray-600">
                            Total: <span className="font-semibold text-green-700">{formatCurrency(totalPaid)}</span>
                        </span>
                        <span className="text-xs text-gray-400">{paymentList.length} payment{paymentList.length !== 1 ? "s" : ""}</span>
                    </div>
                    {!showForm && !showCollect && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowCollect(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                <Wallet className="w-3.5 h-3.5" />
                                Collect Payment
                            </button>
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Post Payment
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Collect Patient Payment */}
            {showCollect && (
                <div className="bg-white border border-green-200 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-green-50/50 rounded-t-lg">
                        <h3 className="text-sm font-semibold text-gray-800">
                            {collectSuccess ? "Payment Successful" : "Collect Patient Payment"}
                        </h3>
                        <button onClick={resetCollectForm} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {collectSuccess ? (
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Check className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-green-800">Payment of {formatCurrency(parseFloat(collectAmount))} collected successfully!</p>
                            <p className="text-xs text-gray-500 mt-1">Transaction recorded and FHIR payment created.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {/* Claim selector */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Apply to Claim (optional)</label>
                                <select
                                    value={collectClaimId}
                                    onChange={(e) => {
                                        setCollectClaimId(e.target.value);
                                        // Pre-fill balance as amount
                                        const cl = claims.find((c) => c.id === e.target.value);
                                        if (cl) {
                                            const bal = Number(cl.totalCharges || 0) - Number(cl.totalPaid || 0);
                                            // Find existing patient payments for this claim
                                            const existingPtPmts = paymentList
                                                .filter(p => p.claimNumber === cl.claimNumber && (p.paymentType || "").startsWith("patient"))
                                                .reduce((s, p) => s + Number(p.amount || 0), 0);
                                            const ptBalance = bal - existingPtPmts;
                                            if (ptBalance > 0) setCollectAmount(ptBalance.toFixed(2));
                                        }
                                    }}
                                    className="w-full text-sm bg-white border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">-- No claim (general payment) --</option>
                                    {claims
                                        .filter((c, i, arr) => (c.id || c.claimNumber) && arr.findIndex(x => (c.id && x.id === c.id) || (c.claimNumber && x.claimNumber === c.claimNumber)) === i)
                                        .map((c) => {
                                        const bal = Number(c.totalCharges || 0) - Number(c.totalPaid || 0);
                                        return (
                                            <option key={c.id || c.claimNumber} value={c.id || c.claimNumber || ""}>
                                                {c.claimNumber || `Claim #${c.id}`} &bull; Balance: {formatCurrency(bal)}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Amount + Method */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={collectAmount}
                                        onChange={(e) => setCollectAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                                    <select
                                        value={collectMethod}
                                        onChange={(e) => { setCollectMethod(e.target.value); setCollectPaymentMethodId(null); }}
                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="credit_card">Credit Card</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="cash">Cash</option>
                                        <option value="check">Check</option>
                                    </select>
                                </div>
                            </div>

                            {/* Saved card selection for card payments */}
                            {isCardCollect && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Saved Card *</label>
                                    {savedMethods.length > 0 ? (
                                        <select
                                            value={collectPaymentMethodId ?? ""}
                                            onChange={(e) => setCollectPaymentMethodId(e.target.value ? parseInt(e.target.value) : null)}
                                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Select a saved card...</option>
                                            {savedMethods.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.cardBrand ? `${m.cardBrand} ` : ""}{m.lastFour ? `****${m.lastFour}` : m.label || `Card #${m.id}`}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded-md">
                                            No saved cards for this patient. Add a card in Payment Methods first, or select Cash / Check.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Reference + Notes */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Reference #</label>
                                    <input
                                        type="text"
                                        value={collectRef}
                                        onChange={(e) => setCollectRef(e.target.value)}
                                        placeholder="Receipt #, Check #"
                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                    <input
                                        type="text"
                                        value={collectNotes}
                                        onChange={(e) => setCollectNotes(e.target.value)}
                                        placeholder="Optional"
                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {collectError && (
                                <p className="text-xs text-red-600">{collectError}</p>
                            )}

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={resetCollectForm}
                                    className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCollectPayment}
                                    disabled={collectSaving || !collectAmount || parseFloat(collectAmount) <= 0 || (isCardCollect && !collectPaymentMethodId)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
                                >
                                    {collectSaving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <CreditCard className="w-3.5 h-3.5" />
                                    )}
                                    {collectSaving ? "Processing..." : `Charge ${formatCurrency(parseFloat(collectAmount) || 0)}`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* New Payment Form */}
            {showForm && (
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-50/50 rounded-t-lg">
                        <h3 className="text-sm font-semibold text-gray-800">{editingPaymentId ? "Edit Payment" : "Post Payment"}</h3>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Claim Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Select Claim</label>
                            <select
                                value={selectedClaimId}
                                onChange={(e) => handleClaimSelect(e.target.value)}
                                className="w-full text-sm bg-white border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- Choose a claim --</option>
                                {claims
                                    .filter((c, i, arr) => (c.id || c.claimNumber) && arr.findIndex(x => (c.id && x.id === c.id) || (c.claimNumber && x.claimNumber === c.claimNumber)) === i)
                                    .map((c) => (
                                    <option key={c.id || c.claimNumber} value={c.id || c.claimNumber || ""}>
                                        {c.claimNumber || `Claim #${c.id}`} &bull; {formatDate(c.dateOfService)} &bull; {c.payerName || "No payer"} &bull; {formatCurrency(c.totalCharges)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Claim details + line items */}
                        {selectedClaim && (
                            <>
                                <div className="bg-gray-50 rounded-md px-3 py-2 space-y-1">
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span><span className="font-medium text-gray-700">Provider:</span> {selectedClaim.providerName || "-"}</span>
                                        <span><span className="font-medium text-gray-700">Payer:</span> {selectedClaim.payerName || "-"}</span>
                                        <span><span className="font-medium text-gray-700">DOS:</span> {formatDate(selectedClaim.dateOfService)}</span>
                                        <span><span className="font-medium text-gray-700">Status:</span> {selectedClaim.claimStatus}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <span><span className="font-medium text-gray-700">Submitted:</span> <span className="text-green-700 font-semibold">{formatCurrency(selectedClaim.totalCharges)}</span></span>
                                        <span><span className="font-medium text-gray-700">Paid:</span> <span className="text-blue-700 font-semibold">{formatCurrency(selectedClaim.totalPaid)}</span></span>
                                        <span><span className="font-medium text-gray-700">Balance:</span> <span className={`font-semibold ${Number(selectedClaim.totalCharges || 0) - Number(selectedClaim.totalPaid || 0) > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(Number(selectedClaim.totalCharges || 0) - Number(selectedClaim.totalPaid || 0))}</span></span>
                                    </div>
                                </div>

                                {/* CPT Line Items — ERA/EOB Posting */}
                                {linePayments.length > 0 && (
                                    <div className="border border-gray-200 rounded-md overflow-x-auto">
                                        <table className="w-full text-xs min-w-[800px]">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left px-2 py-2 font-medium text-gray-600">CPT</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600">Billed</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600 w-20">Allowed</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600 w-20">Ins Paid</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600">Write-off</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600 w-20">Deductible</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600 w-20">Copay</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600 w-20">CoIns</th>
                                                    <th className="text-right px-2 py-2 font-medium text-gray-600">Pt Resp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {linePayments.map((lp, idx) => {
                                                    const pay = parseFloat(lp.paymentAmount) || 0;
                                                    const adj = parseFloat(lp.adjustmentAmount) || 0;
                                                    const ded = parseFloat(lp.deductible) || 0;
                                                    const cop = parseFloat(lp.copay) || 0;
                                                    const coins = parseFloat(lp.coinsurance) || 0;
                                                    const ptResp = ded + cop + coins;
                                                    const numInput = (field: LineField, val: string, placeholder?: string) => (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={val}
                                                            onChange={(e) => updateLinePayment(idx, field, e.target.value)}
                                                            placeholder={placeholder || "0.00"}
                                                            className="w-full text-right text-xs border border-gray-300 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    );
                                                    return (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-2 py-2 font-mono font-medium text-blue-600 whitespace-nowrap">
                                                                {lp.cptCode}
                                                                <span className="text-gray-400 font-normal ml-1 hidden lg:inline">{lp.description}</span>
                                                            </td>
                                                            <td className="px-2 py-2 text-right text-gray-700">{formatCurrency(lp.chargeAmount)}</td>
                                                            <td className="px-2 py-1">{numInput("allowedAmount", lp.allowedAmount)}</td>
                                                            <td className="px-2 py-1">{numInput("paymentAmount", lp.paymentAmount)}</td>
                                                            <td className="px-2 py-2 text-right text-orange-600">{formatCurrency(adj)}</td>
                                                            <td className="px-2 py-1">{numInput("deductible", lp.deductible)}</td>
                                                            <td className="px-2 py-1">{numInput("copay", lp.copay)}</td>
                                                            <td className="px-2 py-1">{numInput("coinsurance", lp.coinsurance)}</td>
                                                            <td className={`px-2 py-2 text-right font-medium ${ptResp > 0 ? "text-red-600" : "text-green-600"}`}>
                                                                {formatCurrency(ptResp)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gray-50 font-medium text-xs">
                                                <tr>
                                                    <td className="px-2 py-2 text-right text-gray-700">Totals:</td>
                                                    <td className="px-2 py-2 text-right">{formatCurrency(linePayments.reduce((s, l) => s + l.chargeAmount, 0))}</td>
                                                    <td className="px-2 py-2 text-right">{formatCurrency(linePayments.reduce((s, l) => s + (parseFloat(l.allowedAmount) || 0), 0))}</td>
                                                    <td className="px-2 py-2 text-right text-green-700">{formatCurrency(totalPayment)}</td>
                                                    <td className="px-2 py-2 text-right text-orange-600">{formatCurrency(totalAdjustment)}</td>
                                                    <td colSpan={3} className="px-2 py-2 text-right text-gray-500">
                                                        Ded: {formatCurrency(linePayments.reduce((s, l) => s + (parseFloat(l.deductible) || 0), 0))} |
                                                        Copay: {formatCurrency(linePayments.reduce((s, l) => s + (parseFloat(l.copay) || 0), 0))} |
                                                        CoIns: {formatCurrency(linePayments.reduce((s, l) => s + (parseFloat(l.coinsurance) || 0), 0))}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-red-600">
                                                        {formatCurrency(
                                                            linePayments.reduce((s, l) => s + (parseFloat(l.deductible) || 0) + (parseFloat(l.copay) || 0) + (parseFloat(l.coinsurance) || 0), 0)
                                                        )}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                        <div className="px-3 py-1.5 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-600">
                                            Enter Allowed Amount → Write-off auto-calculates. Ins Paid = insurance payment. Deductible/Copay/CoIns = patient responsibility.
                                        </div>
                                    </div>
                                )}

                                {/* Lump-sum amount when no line items */}
                                {linePayments.length === 0 && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={lumpSumAmount}
                                                onChange={(e) => setLumpSumAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <span className="text-xs text-gray-500 pb-2">
                                                Total Charges: {formatCurrency(selectedClaim.totalCharges)} |
                                                Balance: {formatCurrency(Number(selectedClaim.totalCharges || 0) - Number(selectedClaim.totalPaid || 0) - totalPayment)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Payment metadata */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Type</label>
                                        <select
                                            value={paymentType}
                                            onChange={(e) => setPaymentType(e.target.value)}
                                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {PAYMENT_TYPES.map((pt) => (
                                                <option key={pt.value} value={pt.value}>{pt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Check #</label>
                                        <input
                                            type="text"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            placeholder="EOB-2026-001, CHK-1234"
                                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                        <input
                                            type="text"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Auto-generated if blank"
                                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {saveError && (
                                    <p className="text-xs text-red-600">{saveError}</p>
                                )}

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={resetForm}
                                        className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || totalPayment <= 0}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                        {saving ? "Saving..." : `${editingPaymentId ? "Update" : "Post"} ${formatCurrency(totalPayment)}`}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Existing Payments List */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Payment History</h3>
                </div>
                {paymentList.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No payments recorded</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Click &ldquo;Post Payment&rdquo; to record a payment against a claim.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {paymentList.map((p) => {
                            const statusColor = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
                            const statusLabel = STATUS_LABELS[p.status] || p.status;
                            const typeLabel = PAYMENT_TYPES.find((pt) => pt.value === p.paymentType)?.label || p.paymentType;
                            return (
                                <div key={p.id} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            {p.claimNumber && (
                                                <span className="text-xs font-mono font-medium text-blue-600">
                                                    {p.claimNumber}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">{typeLabel}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="hidden group-hover:flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(p)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit payment"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    disabled={deletingId === p.id}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete payment"
                                                >
                                                    {deletingId === p.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <span className="text-sm font-semibold text-green-700">
                                                {formatCurrency(p.amount)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {p.dateOfService && <span>DOS: {formatDate(p.dateOfService)}</span>}
                                        {p.date && <span>Paid: {formatDate(p.date)}</span>}
                                        {p.reference && (
                                            <>
                                                <span className="text-gray-300">|</span>
                                                <span>Ref: {p.reference}</span>
                                            </>
                                        )}
                                    </div>
                                    {p.notes && (
                                        <p className="text-[11px] text-gray-400 mt-1 truncate">{p.notes}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
