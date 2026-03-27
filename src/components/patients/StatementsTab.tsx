"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    FileText, Loader2, Printer, CheckSquare, Square,
    Download, X, Calendar
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";

interface StatementsTabProps {
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
    lines: { cptCode: string; description: string; chargeAmount: number; paidAmount: number }[];
}

interface PaymentRecord {
    id: string;
    claimNumber: string;
    date: string;
    amount: number;
    paymentType: string;
    reference: string;
    notes: string;
}

interface PatientInfo {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    email: string;
    address?: { line1?: string; line2?: string; city?: string; state?: string; zip?: string };
}

interface PracticeInfo {
    name: string;
    phone: string;
    address: string;
    npi: string;
}

interface GeneratedStatement {
    id: string;
    date: string;
    claimNumbers: string[];
    totalCharges: number;
    totalPayments: number;
    balance: number;
}

function formatDate(d: string): string {
    if (!d) return "-";
    return formatDisplayDate(d) || "-";
}

function formatCurrency(n: number | string | undefined): string {
    return "$" + Number(n ?? 0).toFixed(2);
}

export default function StatementsTab({ patientId }: StatementsTabProps) {
    const [claims, setClaims] = useState<ClaimSummary[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [patient, setPatient] = useState<PatientInfo | null>(null);
    const [practice, setPractice] = useState<PracticeInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showGenerator, setShowGenerator] = useState(false);
    const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
    const [showPreview, setShowPreview] = useState(false);
    const [statements, setStatements] = useState<GeneratedStatement[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    // Fetch all data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [claimsRes, paymentsRes, patientRes] = await Promise.all([
                fetchWithAuth(`/api/app-proxy/ciyex-rcm/api/rcm/claims/patient/${patientId}`),
                fetchWithAuth(`/api/fhir-resource/payment/patient/${patientId}?page=0&size=100`),
                fetchWithAuth(`/api/patients/${patientId}`),
            ]);

            if (claimsRes.ok) {
                const data = await claimsRes.json();
                const pageData = data.data || data;
                setClaims(pageData.content || (Array.isArray(pageData) ? pageData : []));
            }

            if (paymentsRes.ok) {
                const data = await paymentsRes.json();
                const pageData = data.data ?? data;
                setPayments(Array.isArray(pageData) ? pageData : pageData.content ?? []);
            }

            if (patientRes.ok) {
                const data = await patientRes.json();
                const patData = data.data ?? data;
                setPatient(patData);
            }

            // Load practice info from first facility/location
            try {
                const locRes = await fetchWithAuth(`/api/fhir-resource/facilities?page=0&size=1`);
                if (locRes.ok) {
                    const locData = await locRes.json();
                    const loc = (locData.data?.content || locData.content || [])[0];
                    if (loc) {
                        setPractice({
                            name: (loc.name || "").replace(/ - Branch$/, ""),
                            phone: loc.phone || loc.telecom || "",
                            address: [loc.addressLine1, loc.city, loc.state, loc.postalCode].filter(Boolean).join(", "),
                            npi: loc.npi || "",
                        });
                    }
                }
            } catch { /* ignore */ }

            // Load previously generated statements from FHIR
            try {
                const stmtRes = await fetchWithAuth(`/api/fhir-resource/statements/patient/${patientId}?page=0&size=50`);
                if (stmtRes.ok) {
                    const stmtData = await stmtRes.json();
                    const pageData = stmtData.data ?? stmtData;
                    const records = Array.isArray(pageData) ? pageData : pageData.content ?? [];
                    setStatements(records.map((r: any) => ({
                        id: r.id,
                        date: r.date || r.statementDate || "",
                        claimNumbers: r.notes ? r.notes.split("; ").filter((s: string) => s.startsWith("Claims:")).map((s: string) => s.replace("Claims: ", "")) : [],
                        totalCharges: Number(r.totalGross || 0),
                        totalPayments: Number(r.totalNet || 0),
                        balance: Number(r.totalGross || 0) - Number(r.totalNet || 0),
                    })));
                }
            } catch { /* ignore */ }
        } catch { /* ignore */ }
        setLoading(false);
    }, [patientId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleClaim = (id: string) => {
        setSelectedClaimIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedClaimIds.size === claims.length) {
            setSelectedClaimIds(new Set());
        } else {
            setSelectedClaimIds(new Set(claims.map((c) => c.id)));
        }
    };

    const selectedClaims = claims.filter((c) => selectedClaimIds.has(c.id));

    // Get payments for a specific claim
    const getClaimPayments = (claimNumber: string) =>
        payments.filter((p) => p.claimNumber === claimNumber);

    // Calculate totals for selected claims
    const totalCharges = selectedClaims.reduce((s, c) => s + Number(c.totalCharges || 0), 0);
    const totalPayments = selectedClaims.reduce((s, c) => {
        const claimPmts = getClaimPayments(c.claimNumber);
        return s + claimPmts.reduce((ps, p) => ps + Number(p.amount || 0), 0);
    }, 0);
    const totalBalance = totalCharges - totalPayments;

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow || !printRef.current) return;

        const content = printRef.current.innerHTML;
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Patient Statement</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #333; padding: 20px; }
                    .stmt-header { display: flex; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a56db; }
                    .practice-name { font-size: 18px; font-weight: bold; color: #1a56db; margin-bottom: 4px; }
                    .practice-detail { font-size: 10px; color: #666; }
                    .stmt-title { font-size: 20px; font-weight: bold; color: #333; text-align: right; }
                    .stmt-date { font-size: 10px; color: #666; text-align: right; }
                    .patient-box { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; margin-bottom: 20px; }
                    .patient-box h3 { font-size: 12px; font-weight: bold; color: #555; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .patient-info { font-size: 11px; line-height: 1.6; }
                    .summary-box { display: flex; gap: 16px; margin-bottom: 20px; }
                    .summary-item { flex: 1; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; text-align: center; }
                    .summary-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
                    .summary-value { font-size: 16px; font-weight: bold; }
                    .amount-due { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
                    .amount-paid { color: #16a34a; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th { background: #1a56db; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
                    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
                    tr:nth-child(even) { background: #f9fafb; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .total-row { background: #f0f0f0 !important; font-weight: bold; }
                    .claim-header { background: #eef2ff; padding: 8px; font-weight: bold; font-size: 11px; color: #1a56db; border-bottom: 1px solid #c7d2fe; }
                    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #888; }
                    .payment-notice { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 12px; margin-top: 20px; text-align: center; }
                    .payment-notice p { font-size: 10px; color: #166534; }
                    .payment-notice .amount { font-size: 18px; font-weight: bold; color: #dc2626; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
    };

    const handleSaveStatement = async () => {
        // Save statement record to FHIR
        const today = new Date().toISOString().slice(0, 10);
        const payload = {
            date: today,
            totalGross: totalCharges,
            totalNet: totalPayments,
            status: "issued",
            type: "Statement",
            notes: `Claims: ${selectedClaims.map((c) => c.claimNumber).join(", ")}; Balance: ${formatCurrency(totalBalance)}`,
            identifier: `STMT-${Date.now().toString(36).toUpperCase()}`,
        };

        try {
            const res = await fetchWithAuth(`/api/fhir-resource/statements/patient/${patientId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                // Print before any await so window.open remains within user gesture context
                handlePrint();
                setShowPreview(false);
                setShowGenerator(false);
                setSelectedClaimIds(new Set());
                fetchData();
            }
        } catch { /* ignore */ }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading statement data...
            </div>
        );
    }

    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-sm font-semibold text-gray-800">Statements</h3>
                        </div>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-sm text-gray-600">
                            {statements.length} statement{statements.length !== 1 ? "s" : ""} generated
                        </span>
                    </div>
                    {!showGenerator && !showPreview && (
                        <button
                            onClick={() => setShowGenerator(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Generate Statement
                        </button>
                    )}
                </div>
            </div>

            {/* Claim Selector */}
            {showGenerator && !showPreview && (
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-50/50 rounded-t-lg">
                        <h3 className="text-sm font-semibold text-gray-800">Select Claims for Statement</h3>
                        <button onClick={() => { setShowGenerator(false); setSelectedClaimIds(new Set()); }} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        {claims.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No claims found for this patient.</p>
                        ) : (
                            <>
                                <button
                                    onClick={selectAll}
                                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    {selectedClaimIds.size === claims.length ? (
                                        <CheckSquare className="w-3.5 h-3.5" />
                                    ) : (
                                        <Square className="w-3.5 h-3.5" />
                                    )}
                                    {selectedClaimIds.size === claims.length ? "Deselect All" : "Select All"}
                                </button>
                                <div className="space-y-1">
                                    {claims.map((c) => {
                                        const claimPmts = getClaimPayments(c.claimNumber);
                                        const paid = claimPmts.reduce((s, p) => s + Number(p.amount || 0), 0);
                                        const bal = Number(c.totalCharges || 0) - paid;
                                        return (
                                            <label
                                                key={c.id}
                                                className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                                                    selectedClaimIds.has(c.id)
                                                        ? "bg-blue-50 border-blue-300"
                                                        : "bg-white border-gray-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedClaimIds.has(c.id)}
                                                        onChange={() => toggleClaim(c.id)}
                                                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-mono font-medium text-blue-600">{c.claimNumber}</span>
                                                        <span className="text-xs text-gray-400 ml-2">{formatDate(c.dateOfService)}</span>
                                                        <span className="text-xs text-gray-400 ml-2">{c.payerName}</span>
                                                        <span className="text-xs text-gray-400 ml-2">{c.claimStatus}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-gray-600">Charges: {formatCurrency(c.totalCharges)}</span>
                                                    <span className="text-green-600">Paid: {formatCurrency(paid)}</span>
                                                    <span className={bal > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                                        Bal: {formatCurrency(bal)}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                {selectedClaimIds.size > 0 && (
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <div className="text-xs text-gray-600">
                                            {selectedClaimIds.size} claim{selectedClaimIds.size !== 1 ? "s" : ""} selected
                                            &bull; Charges: {formatCurrency(totalCharges)}
                                            &bull; Paid: {formatCurrency(totalPayments)}
                                            &bull; <span className={totalBalance > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>Balance: {formatCurrency(totalBalance)}</span>
                                        </div>
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            Preview Statement
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Statement Preview */}
            {showPreview && (
                <div className="bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                        <h3 className="text-sm font-semibold text-gray-800">Statement Preview</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print Only
                            </button>
                            <button
                                onClick={handleSaveStatement}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Save & Print
                            </button>
                        </div>
                    </div>

                    {/* Printable content */}
                    <div ref={printRef} className="p-6 text-xs">
                        {/* Header */}
                        <div className="stmt-header flex justify-between mb-6 pb-4 border-b-2 border-blue-600">
                            <div>
                                <div className="practice-name text-lg font-bold text-blue-700">{practice?.name || "Medical Practice"}</div>
                                {practice?.address && <div className="practice-detail text-[10px] text-gray-500">{practice.address}</div>}
                                {practice?.phone && <div className="practice-detail text-[10px] text-gray-500">Phone: {practice.phone}</div>}
                                {practice?.npi && <div className="practice-detail text-[10px] text-gray-500">NPI: {practice.npi}</div>}
                            </div>
                            <div className="text-right">
                                <div className="stmt-title text-xl font-bold text-gray-800">PATIENT STATEMENT</div>
                                <div className="stmt-date text-[10px] text-gray-500">Date: {today}</div>
                                <div className="stmt-date text-[10px] text-gray-500">Account #: {patientId}</div>
                            </div>
                        </div>

                        {/* Patient Info */}
                        <div className="patient-box bg-gray-50 border border-gray-200 rounded p-3 mb-5">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Patient Information</h3>
                            <div className="patient-info text-xs leading-relaxed">
                                <div className="font-semibold text-gray-800">
                                    {patient?.firstName} {patient?.lastName}
                                </div>
                                {patient?.dateOfBirth && <div>DOB: {formatDate(patient.dateOfBirth)} &bull; {patient.gender}</div>}
                                {patient?.phoneNumber && <div>Phone: {patient.phoneNumber}</div>}
                                {patient?.email && <div>Email: {patient.email}</div>}
                            </div>
                        </div>

                        {/* Summary boxes */}
                        <div className="summary-box flex gap-4 mb-5">
                            <div className="summary-item flex-1 bg-gray-50 border border-gray-200 rounded p-3 text-center">
                                <div className="summary-label text-[9px] uppercase tracking-wider text-gray-400">Total Charges</div>
                                <div className="summary-value text-base font-bold text-gray-800">{formatCurrency(totalCharges)}</div>
                            </div>
                            <div className="summary-item flex-1 bg-gray-50 border border-gray-200 rounded p-3 text-center">
                                <div className="summary-label text-[9px] uppercase tracking-wider text-gray-400">Payments</div>
                                <div className="summary-value text-base font-bold text-green-600">{formatCurrency(totalPayments)}</div>
                            </div>
                            <div className={`summary-item flex-1 rounded p-3 text-center border ${totalBalance > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                                <div className="summary-label text-[9px] uppercase tracking-wider text-gray-400">Amount Due</div>
                                <div className={`summary-value text-base font-bold ${totalBalance > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(totalBalance)}</div>
                            </div>
                        </div>

                        {/* Claim details */}
                        {selectedClaims.map((claim) => {
                            const claimPmts = getClaimPayments(claim.claimNumber);
                            const claimPaid = claimPmts.reduce((s, p) => s + Number(p.amount || 0), 0);
                            const claimBal = Number(claim.totalCharges || 0) - claimPaid;
                            return (
                                <div key={claim.id} className="mb-4">
                                    <div className="claim-header bg-blue-50 px-2 py-1.5 font-semibold text-xs text-blue-700 border-b border-blue-200">
                                        Claim {claim.claimNumber} &bull; DOS: {formatDate(claim.dateOfService)} &bull; {claim.payerName || "Self-Pay"}
                                    </div>
                                    <table className="w-full border-collapse text-[10px]">
                                        <thead>
                                            <tr className="bg-blue-600 text-white">
                                                <th className="text-left px-2 py-1 text-[9px] uppercase">Date</th>
                                                <th className="text-left px-2 py-1 text-[9px] uppercase">Description</th>
                                                <th className="text-left px-2 py-1 text-[9px] uppercase">CPT</th>
                                                <th className="text-right px-2 py-1 text-[9px] uppercase">Charges</th>
                                                <th className="text-right px-2 py-1 text-[9px] uppercase">Payments</th>
                                                <th className="text-right px-2 py-1 text-[9px] uppercase">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(claim.lines || []).map((line, idx) => (
                                                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                                    <td className="px-2 py-1 text-gray-600">{formatDate(claim.dateOfService)}</td>
                                                    <td className="px-2 py-1">{line.description}</td>
                                                    <td className="px-2 py-1 font-mono">{line.cptCode}</td>
                                                    <td className="px-2 py-1 text-right">{formatCurrency(line.chargeAmount)}</td>
                                                    <td className="px-2 py-1 text-right text-green-700">{formatCurrency(line.paidAmount)}</td>
                                                    <td className="px-2 py-1 text-right">{formatCurrency(Number(line.chargeAmount || 0) - Number(line.paidAmount || 0))}</td>
                                                </tr>
                                            ))}
                                            {/* If no lines, show summary row */}
                                            {(!claim.lines || claim.lines.length === 0) && (
                                                <tr>
                                                    <td className="px-2 py-1 text-gray-600">{formatDate(claim.dateOfService)}</td>
                                                    <td className="px-2 py-1">Medical Services</td>
                                                    <td className="px-2 py-1">-</td>
                                                    <td className="px-2 py-1 text-right">{formatCurrency(claim.totalCharges)}</td>
                                                    <td className="px-2 py-1 text-right text-green-700">{formatCurrency(claimPaid)}</td>
                                                    <td className="px-2 py-1 text-right">{formatCurrency(claimBal)}</td>
                                                </tr>
                                            )}
                                            {/* Payment detail rows */}
                                            {claimPmts.map((pmt) => (
                                                <tr key={pmt.id} className="bg-green-50">
                                                    <td className="px-2 py-1 text-gray-600">{formatDate(pmt.date)}</td>
                                                    <td className="px-2 py-1 text-green-700" colSpan={2}>
                                                        Payment - {pmt.reference || pmt.paymentType}
                                                    </td>
                                                    <td className="px-2 py-1 text-right">-</td>
                                                    <td className="px-2 py-1 text-right text-green-700 font-medium">-{formatCurrency(pmt.amount)}</td>
                                                    <td className="px-2 py-1 text-right">-</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="px-2 py-1.5" colSpan={3}>Claim Total</td>
                                                <td className="px-2 py-1.5 text-right">{formatCurrency(claim.totalCharges)}</td>
                                                <td className="px-2 py-1.5 text-right text-green-700">{formatCurrency(claimPaid)}</td>
                                                <td className="px-2 py-1.5 text-right font-bold">{formatCurrency(claimBal)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            );
                        })}

                        {/* Grand total */}
                        {selectedClaims.length > 1 && (
                            <div className="mt-2 p-3 bg-gray-100 rounded flex justify-between text-xs font-bold">
                                <span>GRAND TOTAL</span>
                                <div className="flex gap-8">
                                    <span>Charges: {formatCurrency(totalCharges)}</span>
                                    <span className="text-green-700">Payments: {formatCurrency(totalPayments)}</span>
                                    <span className={totalBalance > 0 ? "text-red-600" : "text-green-600"}>Balance Due: {formatCurrency(totalBalance)}</span>
                                </div>
                            </div>
                        )}

                        {/* Payment notice */}
                        {totalBalance > 0 && (
                            <div className="payment-notice bg-green-50 border border-green-200 rounded p-3 mt-5 text-center">
                                <p className="text-[10px] text-green-800 font-medium mb-1">Amount Due</p>
                                <p className="amount text-lg font-bold text-red-600">{formatCurrency(totalBalance)}</p>
                                <p className="text-[10px] text-green-700 mt-1">
                                    Please remit payment at your earliest convenience. Contact us with any questions.
                                </p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="footer mt-8 pt-4 border-t border-gray-200 text-center text-[9px] text-gray-400">
                            <p>This statement is for your records. Please retain for tax and insurance purposes.</p>
                            <p className="mt-1">{practice?.name} &bull; {practice?.phone} &bull; {practice?.address}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Statement History */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Statement History</h3>
                </div>
                {statements.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No statements generated</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Click &ldquo;Generate Statement&rdquo; to create a patient billing statement.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {statements.map((stmt) => (
                            <div key={stmt.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-xs text-gray-700 font-medium">{formatDate(stmt.date)}</span>
                                    </div>
                                    <span className={`text-sm font-semibold ${stmt.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                                        {formatCurrency(stmt.balance)} due
                                    </span>
                                </div>
                                <div className="text-[11px] text-gray-400 mt-1">
                                    Charges: {formatCurrency(stmt.totalCharges)} &bull; Payments: {formatCurrency(stmt.totalPayments)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
