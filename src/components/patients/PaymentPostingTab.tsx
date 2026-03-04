"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    DollarSign, Plus, X, CreditCard,
    Check, Loader2
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

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
    paymentAmount: string; // string for input binding
    adjustmentAmount: string;
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
    try {
        const date = new Date(d.includes("T") ? d : d + "T00:00:00");
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return d;
    }
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

    // Fetch claims from RCM
    const fetchClaims = useCallback(async () => {
        try {
            const res = await fetchWithAuth(
                `/api/app-proxy/ciyex-rcm/api/rcm/claims/patient/${patientId}`
            );
            if (res.ok) {
                const data = await res.json();
                const pageData = data.data || data;
                const content = pageData.content || (Array.isArray(pageData) ? pageData : []);
                setClaims(content);
            }
        } catch {
            // RCM may not be available
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

    useEffect(() => {
        Promise.all([fetchClaims(), fetchPayments()]).finally(() => setLoading(false));
    }, [fetchClaims, fetchPayments]);

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
                    paymentAmount: "",
                    adjustmentAmount: "",
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
                paymentAmount: "",
                adjustmentAmount: "",
            })));
        } else {
            setLinePayments([]);
        }
    };

    const updateLinePayment = (idx: number, field: "paymentAmount" | "adjustmentAmount", value: string) => {
        setLinePayments((prev) =>
            prev.map((lp, i) => (i === idx ? { ...lp, [field]: value } : lp))
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

    const handleSave = async () => {
        if (!selectedClaim) return;
        setSaving(true);
        setSaveError(null);

        const today = new Date().toISOString().slice(0, 10);

        try {
            // Save as FHIR Invoice resource via generic API
            const payload: Record<string, any> = {
                claimNumber: selectedClaim.claimNumber,
                dateOfService: selectedClaim.dateOfService
                    ? selectedClaim.dateOfService.substring(0, 10)
                    : "",
                chargeAmount: selectedClaim.totalCharges || 0,
                date: today,
                amount: totalPayment,
                paymentType,
                reference,
                status: "issued", // Posted
                notes: notes || buildAutoNotes(),
            };

            const res = await fetchWithAuth(`/api/fhir-resource/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId: String(patientId),
                    formData: payload,
                }),
            });

            if (res.ok) {
                // Reset form
                setShowForm(false);
                setSelectedClaimId("");
                setLinePayments([]);
                setPaymentType("insurance");
                setReference("");
                setNotes("");
                setLumpSumAmount("");
                // Refresh payments list
                await fetchPayments();
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
            {/* Summary bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">
                            Total Paid: <span className="font-semibold text-green-700">{formatCurrency(totalPaid)}</span>
                        </span>
                    </div>
                    <span className="text-xs text-gray-400">{paymentList.length} payment{paymentList.length !== 1 ? "s" : ""}</span>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Post Payment
                    </button>
                )}
            </div>

            {/* New Payment Form */}
            {showForm && (
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-50/50 rounded-t-lg">
                        <h3 className="text-sm font-semibold text-gray-800">Post Payment</h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
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
                                {claims.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.claimNumber} &bull; {formatDate(c.dateOfService)} &bull; {c.payerName || "No payer"} &bull; {formatCurrency(c.totalCharges)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Claim details + line items */}
                        {selectedClaim && (
                            <>
                                <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2">
                                    <span><span className="font-medium text-gray-700">Provider:</span> {selectedClaim.providerName || "-"}</span>
                                    <span><span className="font-medium text-gray-700">Payer:</span> {selectedClaim.payerName || "-"}</span>
                                    <span><span className="font-medium text-gray-700">DOS:</span> {formatDate(selectedClaim.dateOfService)}</span>
                                    <span><span className="font-medium text-gray-700">Status:</span> {selectedClaim.claimStatus}</span>
                                </div>

                                {/* CPT Line Items Table */}
                                {linePayments.length > 0 && (
                                    <div className="border border-gray-200 rounded-md overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-600">CPT</th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Charges</th>
                                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Already Paid</th>
                                                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Payment</th>
                                                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Adjustment</th>
                                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {linePayments.map((lp, idx) => {
                                                    const pay = parseFloat(lp.paymentAmount) || 0;
                                                    const adj = parseFloat(lp.adjustmentAmount) || 0;
                                                    const balance = lp.chargeAmount - lp.alreadyPaid - pay - adj;
                                                    return (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-3 py-2 font-mono font-medium text-blue-600">
                                                                {lp.cptCode}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">
                                                                {lp.description}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                {formatCurrency(lp.chargeAmount)}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-500">
                                                                {formatCurrency(lp.alreadyPaid)}
                                                            </td>
                                                            <td className="px-3 py-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={lp.paymentAmount}
                                                                    onChange={(e) => updateLinePayment(idx, "paymentAmount", e.target.value)}
                                                                    placeholder="0.00"
                                                                    className="w-full text-right text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={lp.adjustmentAmount}
                                                                    onChange={(e) => updateLinePayment(idx, "adjustmentAmount", e.target.value)}
                                                                    placeholder="0.00"
                                                                    className="w-full text-right text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className={`px-3 py-2 text-right font-medium ${balance > 0 ? "text-red-600" : balance === 0 ? "text-green-600" : "text-gray-600"}`}>
                                                                {formatCurrency(balance)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gray-50 font-medium">
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-2 text-right text-gray-700">Totals:</td>
                                                    <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totalPayment)}</td>
                                                    <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(totalAdjustment)}</td>
                                                    <td className="px-3 py-2 text-right text-gray-700">
                                                        {formatCurrency(
                                                            (selectedClaim.totalCharges || 0) -
                                                            (selectedClaim.totalPaid || 0) -
                                                            totalPayment -
                                                            totalAdjustment
                                                        )}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
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
                                        onClick={() => setShowForm(false)}
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
                                        {saving ? "Saving..." : `Post ${formatCurrency(totalPayment)}`}
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
                                <div key={p.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
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
                                        <span className="text-sm font-semibold text-green-700">
                                            {formatCurrency(p.amount)}
                                        </span>
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
