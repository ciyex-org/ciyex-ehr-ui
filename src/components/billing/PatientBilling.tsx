



"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";


/* =========================================================
   Props / Types
========================================================= */
type Props = {
    patientId: number;
    patientName: string;
};

type InvoiceStatus = "OPEN" | "PARTIALLY_PAID" | "PAID" | "VOID";
type ClaimStatus =
    | "DRAFT"
    | "READY_FOR_SUBMISSION"
    | "SUBMITTED"
    | "IN_PROCESS"
    | "ACCEPTED"
    | "REJECTED"
    | "CLOSED"
    | "VOID";

type PaymentMethod =
    | "CREDIT_CARD"
    | "CHECK"
    | "DEBIT_CARD"
    | "EFT"
    | "CASH"
    | "CARE_CREDIT"
    | "MASTERCARD"
    | "VISA"
    | "DISCOVER"
    | "AMEX";

type NoteTargetType = "INVOICE" | "CLAIM" | "INSURANCE_PAYMENT" | "PATIENT_PAYMENT";

type Note = {
    id: number;
    patientId: number;
    invoiceId?: number;
    type: NoteTargetType;
    targetId: number;
    text: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
};

type InvoiceLine = {
    id: number;
    dos: string;
    code: string;
    treatment: string;
    provider: string;
    charge: number;
    allowed?: number;
    insWriteOff?: number;
    insPortion?: number;
    patientPortion?: number;
};

type ProcedureLineInput = {
    code: string;
    description: string;
    rate: number;
    units: number;
};

type Invoice = {
    id: number;
    patientId: number;
    status: InvoiceStatus;
    lines: InvoiceLine[];
    insWO?: number;
    ptBalance?: number;
    insBalance?: number;
    totalCharge?: number;
    insPaid?: number;
    ptPaid?: number;
};

type Claim = {
    id: number;
    invoiceId: number;
    patientId: number;
    payerName: string | null;
    treatingProviderId?: string | null;
    provider?: string | null;
    billingEntity?: string | null;
    policyNumber?: string | null;
    type: "Electronic" | "Paper" | null;
    notes?: string | null;
    status: ClaimStatus;
    attachments: number;
    eobAttached: boolean;
    createdOn?: string | null;
    locked?: boolean; // Add locked flag to Claim type
};

type InsuranceRemitLine = {
     id: number;
    invoiceLineId: number;
    submitted: number;
    balance: number;
    deductible: number;
    allowed: number;
    insWriteOff: number;
    insPay: number;
    updateAllowed?: boolean;
    updateFlatPortion?: boolean;
    applyWriteoff?: boolean;
};

type PatientPaymentAllocation = {
    invoiceLineId: number;
    amount: number;
};

type PatientPayment = {
  id: number;                 // <-- paymentId
  amount: number;
  paymentMethod?: PaymentMethod | string;
};

type AccountCredit = { balance: number };

type PatientDepositDto = {
    id: number;
    patientId: number;
    amount: number;
    paymentMethod: PaymentMethod | string;
    depositDate: number[]; // [year, month, day]
    description?: string | null;
};

type InsuranceDepositDto = {
    id: number;
    patientId: number;
    depositAmount: number;
    paymentMethod: PaymentMethod | string;
    depositDate: string | number[]; // [year, month, day] or "YYYY-MM-DD"
    description?: string | null;
    policyId?: number | null;
    providerId?: string | null;
};

type ServerProviderData = {
    id: number;
    identification?: {
        firstName?: string;
        lastName?: string;
    };
};

type ServerPatientData = {
    id: number;
    firstName?: string;
    lastName?: string;
};

type ServerInsuranceCompanyData = {
    id: number;
    name: string;
};

type ServerInvoiceLineData = {
    id: number;
    dos: string | number[];
    code: string;
    treatment: string;
    provider: string;
    charge: number;
    allowed?: number;
    insWriteOff?: number;
    insPortion?: number;
    patientPortion?: number;
};

type ServerInvoiceData = {
    id: number;
    patientId: number;
    status: InvoiceStatus;
    lines: ServerInvoiceLineData[];
    insWO?: number;
    ptBalance?: number;
    insBalance?: number;
    totalCharge?: number;
    insPaid?: number;
    ptPaid?: number;
};

type ServerClaimData = {
    id: number;
    invoiceId: number;
    patientId: number;
    payerName?: string | null;
    treatingProviderId?: string | null;
    provider?: string | null;
    billingEntity?: string | null;
    policyNumber?: string | null;
    policynumber?: string | null;
    type?: "Electronic" | "Paper" | null;
    notes?: string | null;
    status: ClaimStatus;
    attachments?: number;
    eobAttached?: boolean;
    createdOn?: string | number[] | null;
    locked?: boolean;
};

type PatientPaymentData = {
    id: number;
    amount: number;
    payment?: number;
    paid?: number;
    paymentMethod?: PaymentMethod | string;
};

type CourtesyCredit = {
    id: number;
    invoiceId: number;
    patientId: number;
    adjustmentType: string;
    amount: number;
    description?: string;
    appliedDate?: string;
    createdAt?: string;
    isActive?: boolean;
};

type Provider = {
    id: number;
    name: string;
};

type Patient = {
    id: number;
    name: string;
};

type InsuranceCompany = {
    id: number;
    name: string;
};

type PatientPolicy = {
    id: number;
    planName: string;
    policyNumber?: string;
};

type InvoiceLineDetail = {
    id: number;
    dos: number[];
    code: string;
    treatment: string;
    provider: string;
    charge: number;
    allowed?: number;
    insWriteOff?: number;
    insPortion?: number;
    patientPortion?: number;
};

type ClaimLineDetail = {
    lineId: number;
    dos: number[];
    code: string;
    description: string;
    provider: string;
    totalSubmittedAmount: number;
};

type InsurancePaymentDetail = {
    remitId: number;
    invoiceId: number;
    invoiceNumber: string;
    paymentDate: number[];
    chequeNumber: string;
    bankBranchNumber: string;
    insWriteoff: number;
    patientAmount: number;
    insuranceAmount: number;
    previousTotalBalance: number;
    paymentAmount: number;
    appliedWO: number;
    ptPaid: number;
    insPaid: number;
    lineDetails: Array<{
        lineId: number;
        description: string;
        providerName: string;
        amount: number;
        patient: number;
        insurance: number;
        previousBalance: number;
        payment: number;
    }>;
};

type PatientPaymentDetail = {
    paymentId: number;
    invoiceId: number;
    invoiceNumber: string;
    paymentDate: number[];
    paymentMethod: string;
    chequeNumber: string;
    bankBranchNumber: string;
    patientAmount: number;
    previousTotalBalance: number;
    paymentAmount: number;
    ptHis: number;
    insPaid: number;
    lineDetails: Array<{
        lineId: number;
        description: string;
        providerName: string;
        amount: number;
        patient: number;
        insurance: number;
        previousBalance: number;
        payment: number;
    }>;
};

// Print Invoice Types
type PrintInvoiceTransaction = {
    date: number[]; // [year, month, day]
    description: string | null;
    provider: string | null;
    amount: number | null;
    credit: number | null;
    balance: number;
    transactionType: string;
    code: string | null;
    procedureDescription: string | null;
    paymentMethod?: string | null;
};

type PrintInvoiceClaim = {
    claimId: number;
    claimNumber: string;
    insuranceName: string;
    localId: string;
    status: string;
};

type PrintInvoicePaymentLine = {
    code: string;
    amount: number;
};

type PrintInvoiceInsurancePayment = {
    paymentId: number;
    paymentDate: number[];
    description: string;
    insuranceName: string;
    amount: number;
    credit: number;
    lines: PrintInvoicePaymentLine[];
};

type PrintInvoicePatientPayment = {
    paymentId: number;
    paymentDate: number[];
    description: string;
    paymentMethod: string;
    amount: number;
    credit: number;
};

type PrintInvoicePatientDeposit = {
    depositId: number;
    depositDate: number[];
    description: string;
    paymentMethod: string | null;
    amount: number;
};

type PrintInvoiceFinancialSummary = {
    totalCharges: number;
    totalPatientPayments: number;
    totalInsurancePayments: number;
    totalAdjustment: number;
    outstandingBalance: number;
    estimatedRemainingInsurance: number;
    estimatedRemainingInsuranceAdjustment: number;
};

type PrintInvoiceAgingSummary = {
    balance0_30: number;
    balance30_60: number;
    balance60_90: number;
    balance90plus: number;
    accountCredit?: number;
};

type PrintInvoiceAppointments = {
    nextScheduledTreatment: string;
    nextScheduledHygiene: string;
};

type PrintInvoicePracticeInfo = {
    practiceName: string;
    address: string;
    phone: string;
    email: string;
    website: string | null;
};

type PatientInvoicePrintDto = {
    practice: PrintInvoicePracticeInfo;
    patientId: number;
    patientName: string;
    patientPhone: string;
    patientEmail: string;
    patientAddress: string;
    invoiceId: number;
    invoiceDate: number[];
    invoiceNumber: string;
    status: string;
    transactions: PrintInvoiceTransaction[];
    claims: PrintInvoiceClaim[];
    insurancePayments: PrintInvoiceInsurancePayment[];
    patientPayments: PrintInvoicePatientPayment[];
    patientDeposits: PrintInvoicePatientDeposit[];
    courtesyCredits: any[];
    financialSummary: PrintInvoiceFinancialSummary;
    agingSummary: PrintInvoiceAgingSummary;
    appointments: PrintInvoiceAppointments;
    notes: string[];
};

/* =========================================================
   Small UI helpers
========================================================= */
const currency = (n: number | undefined) =>
    Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

// safe-sum helper (prevents “number | undefined” errors)
const sum = (nums: Array<number | undefined>) =>
    nums.reduce((a: number, b) => a + (Number.isFinite(Number(b)) ? Number(b) : 0), 0);

const Badge: React.FC<{
    tone: "red" | "green" | "amber" | "blue" | "gray" | "purple";
    children: React.ReactNode;
}> = ({ tone, children }) => {
    const map: Record<string, string> = {
        red: "bg-red-100 text-red-700 border-red-200",
        green: "bg-green-100 text-green-700 border-green-200",
        amber: "bg-amber-100 text-amber-800 border-amber-200",
        blue: "bg-blue-100 text-blue-700 border-blue-200",
        gray: "bg-gray-100 text-gray-700 border-gray-200",
        purple: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return (
        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${map[tone]}`}>
      {children}
    </span>
    );
};

const SectionCard: React.FC<{
    title: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, actions, children }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            {actions}
        </div>
        {children}
    </div>
);

const SegmentedTabs: React.FC<{
    tabs: { id: string; label: string }[];
    value: string;
    onChange: (id: string) => void;
}> = ({ tabs, value, onChange }) => (
    <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 border-b bg-white/80 px-1 py-2 backdrop-blur">
        {tabs.map((t) => (
            <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition ${
                    value === t.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
                {t.label}
            </button>
        ))}
    </div>
);

const RowStat: React.FC<{
    label: string;
    value: string;
    bold?: boolean;
    tone?: "red" | "default";
    hideOnSmall?: boolean;
}> = ({ label, value, bold, tone = "default", hideOnSmall }) => (
    <div className={`${hideOnSmall ? "hidden md:block" : ""}`}>
        <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
        <div className={`${bold ? "font-semibold" : ""} ${tone === "red" ? "text-red-600" : ""}`}>{value}</div>
    </div>
);

const IconBtn: React.FC<React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>> = ({
                                                                                                 children,
                                                                                                 title,
                                                                                                 onClick,
                                                                                                 disabled,
                                                                                             }) => (
    <button
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`rounded border border-gray-200 bg-white px-2 py-1 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
    >
        {children}
    </button>
);

const styles = `
.btn-primary{border-radius:.375rem;padding:.375rem .75rem;font-size:.875rem;background:#2563eb;color:#fff;transition:filter .15s}
.btn-primary:hover{filter:brightness(.95)}
.btn-light{border:1px solid #e5e7eb;border-radius:.375rem;padding:.375rem .75rem;font-size:.875rem;background:#fff;transition:background .15s}
.btn-light:hover{background:#f8fafc}
.btn-danger{border-radius:.375rem;padding:.375rem .75rem;font-size:.875rem;background:#dc2626;color:#fff}
.input{border:1px solid #e5e7eb;border-radius:.375rem;padding:.375rem .75rem;font-size:.875rem;outline:none}
.input:focus{box-shadow:0 0 0 2px #93c5fd;border-color:#60a5fa}
.label{margin-bottom:.25rem;display:block;font-size:.75rem;font-weight:500;color:#64748b}

/* Print Styles */
@media print {
    body * {
        visibility: hidden;
    }
    #print-invoice-content, #print-invoice-content *,
    #print-ehr-claim-content, #print-ehr-claim-content * {
        visibility: visible;
    }
    #print-invoice-content, #print-ehr-claim-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        max-height: none;
        overflow: visible;
    }
    .no-print {
        display: none !important;
    }
    #print-invoice-modal, #print-ehr-claim-modal {
        position: static;
        background: white;
    }
    @page {
        margin: 0.5in;
    }
}
`;
const StyleInjector: React.FC = () => (
    <style id="billing-inline-styles-v6" dangerouslySetInnerHTML={{ __html: styles }} />
);

/* =========================================================
   Component
========================================================= */
export default function PatientBilling({ patientId, patientName }: Props) {
    // More Actions state
    const [moreActionsOpenId, setMoreActionsOpenId] = React.useState<number | null>(null);
    const [showStatusModal, setShowStatusModal] = React.useState(false);
    const [statusModalClaim, setStatusModalClaim] = React.useState<Claim | null>(null);
    const [showAttachmentModal, setShowAttachmentModal] = React.useState(false);
    const [attachmentClaim, setAttachmentClaim] = React.useState<Claim | null>(null);
    const [showAttachmentConfirm, setShowAttachmentConfirm] = React.useState(false);
    const [lockLoading, setLockLoading] = React.useState(false);

    // Print Invoice Statement
    const [showPrintInvoice, setShowPrintInvoice] = React.useState(false);
    const [printInvoiceData, setPrintInvoiceData] = React.useState<PatientInvoicePrintDto | null>(null);
    const [printInvoiceLoading, setPrintInvoiceLoading] = React.useState(false);

    // Print EHR Claim Form
    const [showPrintEhrClaim, setShowPrintEhrClaim] = React.useState(false);
    const [printEhrClaimData, setPrintEhrClaimData] = React.useState<any | null>(null);
    const [printEhrClaimLoading, setPrintEhrClaimLoading] = React.useState(false);

    async function handleLockClaim(claim: Claim) {
        setLockLoading(true);
        try {
            const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patient-billing/${patientId}/claims/${claim.id}/lock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const body = await res.json();
            if (!body?.success) {
                alert(body?.message || "Failed to lock claim");
                return;
            }
            await loadAll(); // Refresh claim data
        } catch (err) {
            alert("Error: " + (err as Error).message);
        } finally {
            setLockLoading(false);
        }
    }

    function handleChangeClaimStatus(claim: Claim) {
        setStatusModalClaim(claim);
        setShowStatusModal(true);
        // Actual API call is in StatusModal's handleSave
    }

    function handleSubmitAttachments(claim: Claim) {
        setAttachmentClaim(claim);
        setShowAttachmentConfirm(true);
        // Actual API call is in AttachmentModal's handleUpload
    }

    function renderMoreActions(claim: Claim) {
        return (
            <div style={{ position: "relative", display: "inline-block" }}>
                <IconBtn title="More Actions" onClick={() => setMoreActionsOpenId(moreActionsOpenId === claim.id ? null : claim.id)}>
                    <span role="img" aria-label="more">⋮</span>
                </IconBtn>
                {moreActionsOpenId === claim.id && (
                    <div style={{ position: "absolute", right: 0, zIndex: 10, background: "#fff", border: "1px solid #eee", borderRadius: 4, boxShadow: "0 2px 8px #0002", minWidth: 180 }}>
                        <button className="btn-light" style={{ width: "100%", textAlign: "left" }} disabled={claim.locked} onClick={() => { handleLockClaim(claim); setMoreActionsOpenId(null); }}>Lock Claim</button>
                        <button className="btn-light" style={{ width: "100%", textAlign: "left" }} onClick={() => { handleSubmitAttachments(claim); setMoreActionsOpenId(null); }}>Submit Attachments</button>
                        <button className="btn-light" style={{ width: "100%", textAlign: "left" }} disabled={claim.locked} onClick={() => { handleChangeClaimStatus(claim); setMoreActionsOpenId(null); }}>Change Claim Status</button>
                    </div>
                )}
            </div>
        );
    }

    // Modal for Change Claim Status
    function StatusModal({ claim, onClose }: { claim: Claim, onClose: () => void }) {
        const [selectedStatus, setSelectedStatus] = React.useState<string>("");
        const [remitDate, setRemitDate] = React.useState("");
        const [paymentAmount, setPaymentAmount] = React.useState("");
        async function handleSave() {
            try {
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patient-billing/${patientId}/claims/${claim.id}/status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: selectedStatus, remitDate, paymentAmount }),
                });
                const body = await res.json();
                if (!body?.success) {
                    alert(body?.message || "Failed to change claim status");
                    return;
                }
                await loadAll();
                onClose();
            } catch (err) {
                alert("Error: " + (err as Error).message);
            }
        }
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Modify Claim Status</h3>
                    <div className="mb-3">
                        <label><input type="radio" value="ACCEPTED" checked={selectedStatus === "ACCEPTED"} onChange={() => setSelectedStatus("ACCEPTED")} /> Accepted & Paid</label><br />
                        <label><input type="radio" value="DENIED" checked={selectedStatus === "DENIED"} onChange={() => setSelectedStatus("DENIED")} /> Accepted but Final Payment Denied</label><br />
                        <label><input type="radio" value="REJECTED" checked={selectedStatus === "REJECTED"} onChange={() => setSelectedStatus("REJECTED")} /> Rejected</label>
                    </div>
                    {/* Show Remittance Date for Accepted & Paid and Denied */}
                    {(selectedStatus === "ACCEPTED" || selectedStatus === "DENIED") && (
                        <div className="mb-3">
                            <label>Remittance Date: <input type="date" value={remitDate} onChange={e => setRemitDate(e.target.value)} /></label>
                        </div>
                    )}
                    {/* Show Insurance Payment Amount only for Accepted & Paid */}
                    {selectedStatus === "ACCEPTED" && (
                        <div className="mb-3">
                            <label>Insurance Payment Amount: <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></label>
                        </div>
                    )}
                    <div className="flex gap-2 mt-4">
                        <button className="btn-primary" onClick={handleSave}>Save</button>
                        <button className="btn-light" onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    // Modal for Submit Attachments
    function AttachmentModal({ claim, onClose }: { claim: Claim, onClose: () => void }) {
        const [file, setFile] = React.useState<File | null>(null);
        async function handleUpload() {
            if (!file) return;
            const formData = new FormData();
            formData.append("file", file);
            try {
                const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patient-billing/${patientId}/claims/${claim.id}/attachment`, {
                    method: "POST",
                    body: formData,
                });
                const body = await res.json();
                if (!body?.success) {
                    alert(body?.message || "Failed to submit attachment");
                    return;
                }
                await loadAll();
                onClose();
            } catch (err) {
                alert("Error: " + (err as Error).message);
            }
        }
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Submit Attachments</h3>
                    <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                    <div className="flex gap-2 mt-4">
                        <button className="btn-primary" onClick={handleUpload} disabled={!file}>Upload</button>
                        <button className="btn-light" onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    // Confirmation modal for Submit Attachments
    function AttachmentConfirmModal({ claim, onClose, onOk }: { claim: Claim, onClose: () => void, onOk: () => void }) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4 text-center">Are you sure you want to manually submit the claim attachments?</h3>
                    <div className="flex gap-2 mt-4 justify-center">
                        <button className="btn-light" onClick={onClose}>Cancel</button>
                        <button className="btn-primary" onClick={onOk}>OK</button>
                    </div>
                </div>
            </div>
        );
    }

    // Print Invoice Statement Modal
    function PrintInvoiceModal({ data, onClose }: { data: PatientInvoicePrintDto; onClose: () => void }) {
        const [notesText, setNotesText] = React.useState<string>(data.notes?.join('\n') || '');

        const formatDate = (dateArray: number[]) => {
            if (!dateArray || dateArray.length < 3) return "";
            return `${dateArray[1].toString().padStart(2, '0')}/${dateArray[2].toString().padStart(2, '0')}/${dateArray[0]}`;
        };

        const formatCurrency = (amount: number | null | undefined) => {
            if (amount === null || amount === undefined) return "$0.00";
            return `$${Math.abs(amount).toFixed(2)}`;
        };

        const handlePrint = () => {
            window.print();
        };

        const getTodayDate = () => {
            const today = new Date();
            return `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
        };

        const handleAddNotes = () => {
            // TODO: Implement API call to save notes
            alert('Add Notes functionality - to be implemented');
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" id="print-invoice-modal">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col" id="print-invoice-content">
                    {/* Header with Close and Print buttons - hidden during print */}
                    <div className="flex justify-between items-center px-6 py-3 border-b bg-gray-50 no-print">
                        <h2 className="text-lg font-semibold text-gray-800">Patient Account Statement</h2>
                        <div className="flex gap-2">
                            <button className="btn-light text-sm px-4 py-2" onClick={onClose}>Close</button>
                            <button className="btn-light text-sm px-4 py-2" onClick={handleAddNotes}>Add Notes</button>
                            <button className="btn-primary text-sm px-4 py-2" onClick={handlePrint}>Print</button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1">
                        <div className="p-6">
                            {/* Practice Header with Logo */}
                            <div className="mb-6 pb-4 border-b-4 border-blue-900">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Logo */}
                                        <img 
                                            src="/images/ciyex-logo.png" 
                                            alt="Ciyex Logo" 
                                            className="w-20 h-20 object-contain"
                                        />
                                        <div>
                                            <h1 className="text-xl font-bold text-blue-900">{data.practice.practiceName}</h1>
                                            <p className="text-sm text-gray-700">{data.practice.address}</p>
                                            <p className="text-sm text-gray-700">{data.practice.email}</p>
                                            <p className="text-sm text-gray-700">
                                                {data.practice.website ? (
                                                    <a href={data.practice.website} className="text-blue-600 underline">{data.practice.website}</a>
                                                ) : 'http://www.rockawaydentist.com/'}
                                            </p>
                                            <p className="text-sm text-gray-700">{data.practice.phone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-2xl font-bold text-blue-900 mb-2">Patient Account Statement</h2>
                                    </div>
                                </div>
                            </div>

                            {/* Patient Info and Statement Date */}
                            <div className="grid grid-cols-2 gap-8 mb-6">
                                <div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Name</label>
                                        <p className="text-sm text-gray-900">{data.patientName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Statement Date</label>
                                        <p className="text-sm text-gray-900">{getTodayDate()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Transactions Table */}
                            <div className="mb-6">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-blue-900 text-white">
                                            <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Date</th>
                                            <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Description</th>
                                            <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Provider</th>
                                            <th className="border border-gray-400 px-2 py-2 text-right font-semibold">Amount</th>
                                            <th className="border border-gray-400 px-2 py-2 text-right font-semibold">Credit</th>
                                            <th className="border border-gray-400 px-2 py-2 text-right font-semibold">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.transactions.map((transaction, index) => {
                                            const isAlternate = index % 2 === 1;
                                            return (
                                                <tr key={index} className={isAlternate ? 'bg-blue-50' : 'bg-white'}>
                                                    <td className="border border-gray-300 px-2 py-1 text-gray-900">{formatDate(transaction.date)}</td>
                                                    <td className="border border-gray-300 px-2 py-1 text-gray-900">
                                                        {transaction.description || 
                                                         (transaction.code && transaction.procedureDescription 
                                                            ? `${transaction.code} ${transaction.procedureDescription}` 
                                                            : transaction.code || '')}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-1 text-gray-900">{transaction.provider || ""}</td>
                                                    <td className="border border-gray-300 px-2 py-1 text-right text-gray-900">
                                                        {transaction.amount !== null && transaction.amount !== undefined ? formatCurrency(transaction.amount) : ""}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-1 text-right text-gray-900">
                                                        {transaction.credit !== null && transaction.credit !== undefined ? formatCurrency(transaction.credit) : ""}
                                                    </td>
                                                    <td className="border border-gray-300 px-2 py-1 text-right font-semibold text-gray-900">
                                                        {formatCurrency(transaction.balance)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Outstanding Balance Row */}
                                        <tr className="bg-blue-900 text-white font-bold">
                                            <td colSpan={5} className="border border-gray-400 px-2 py-2 text-right text-sm">
                                                Outstanding Balance
                                            </td>
                                            <td className="border border-gray-400 px-2 py-2 text-right text-sm">
                                                {formatCurrency(data.financialSummary.outstandingBalance)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Financial Summary Table */}
                            <div className="mb-6">
                                <table className="w-full text-xs">
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="py-2 px-2 font-semibold text-gray-800">Total Charges</td>
                                            <td className="py-2 px-2 text-right text-gray-900">{formatCurrency(data.financialSummary.totalCharges)}</td>
                                            <td className="py-2 px-2 font-semibold text-gray-800">Total Insurance Payments</td>
                                            <td className="py-2 px-2 text-right text-gray-900">{formatCurrency(data.financialSummary.totalInsurancePayments)}</td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 px-2 font-semibold text-gray-800">Total Patient Payments</td>
                                            <td className="py-2 px-2 text-right text-gray-900">{formatCurrency(data.financialSummary.totalPatientPayments)}</td>
                                            <td className="py-2 px-2 font-semibold text-gray-800">Total Adjustment</td>
                                            <td className="py-2 px-2 text-right text-gray-900">{formatCurrency(data.financialSummary.totalAdjustment)}</td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 px-2"></td>
                                            <td className="py-2 px-2"></td>
                                            <td className="py-2 px-2 font-semibold text-gray-800">Outstanding Balance</td>
                                            <td className="py-2 px-2 text-right font-bold text-gray-900">{formatCurrency(data.financialSummary.outstandingBalance)}</td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-2 px-2"></td>
                                            <td className="py-2 px-2"></td>
                                            <td className="py-2 px-2 text-sm text-gray-700">Estimated Remaining Insurance</td>
                                            <td className="py-2 px-2 text-right text-sm text-gray-700">{formatCurrency(data.financialSummary.estimatedRemainingInsurance)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-2"></td>
                                            <td className="py-2 px-2"></td>
                                            <td className="py-2 px-2 text-sm text-gray-700">Estimated Remaining Insurance Adjustment</td>
                                            <td className="py-2 px-2 text-right text-sm text-gray-700">{formatCurrency(data.financialSummary.estimatedRemainingInsuranceAdjustment)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Your Portion - Large Blue Box */}
                            <div className="mb-6 bg-blue-900 text-white p-6 rounded text-center">
                                <h3 className="text-lg font-bold mb-2">Your Portion</h3>
                                <p className="text-4xl font-bold">{formatCurrency(data.financialSummary.outstandingBalance)}</p>
                            </div>

                            {/* Aging Summary */}
                            <div className="mb-6">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-blue-100 border border-gray-400">
                                            <th className="border-r border-gray-400 px-3 py-2 font-semibold text-gray-800">Balance 0-30 days</th>
                                            <th className="border-r border-gray-400 px-3 py-2 font-semibold text-gray-800">&gt;30 days</th>
                                            <th className="border-r border-gray-400 px-3 py-2 font-semibold text-gray-800">&gt;60 days</th>
                                            <th className="border-r border-gray-400 px-3 py-2 font-semibold text-gray-800">&gt;90 days</th>
                                            <th className="px-3 py-2 font-semibold text-gray-800">Account Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="text-center bg-white">
                                            <td className="border border-gray-400 px-3 py-2 text-gray-900">{formatCurrency(data.agingSummary.balance0_30)}</td>
                                            <td className="border border-gray-400 px-3 py-2 text-gray-900">{formatCurrency(data.agingSummary.balance30_60)}</td>
                                            <td className="border border-gray-400 px-3 py-2 text-gray-900">{formatCurrency(data.agingSummary.balance60_90)}</td>
                                            <td className="border border-gray-400 px-3 py-2 text-gray-900">{formatCurrency(data.agingSummary.balance90plus)}</td>
                                            <td className="border border-gray-400 px-3 py-2 text-gray-900">{formatCurrency(data.agingSummary.accountCredit || 0)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p className="text-xs text-gray-600 italic mt-2">* These transactions will not affect the running balance.</p>
                            </div>

                            {/* Appointments Section */}
                            <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Next Scheduled Treatment Appointment</h3>
                                    <p className="text-gray-700">{data.appointments?.nextScheduledTreatment || "No Scheduled Appointment"}</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Next Scheduled Hygiene Appointment</h3>
                                    <p className="text-gray-700">{data.appointments?.nextScheduledHygiene || "No Scheduled Appointment"}</p>
                                </div>
                            </div>

                            {/* Statement Notes */}
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-sm text-gray-800">Statement Notes:</h3>
                                    <button 
                                        className="text-xs text-blue-600 hover:underline no-print"
                                        onClick={onClose}
                                    >
                                        x
                                    </button>
                                </div>
                                <textarea 
                                    className="w-full border border-gray-300 rounded p-2 text-xs min-h-[80px] resize-none"
                                    placeholder="Write notes..."
                                    value={notesText}
                                    onChange={(e) => setNotesText(e.target.value)}
                                />
                                <div className="flex justify-end gap-2 mt-2 no-print">
                                    <button className="btn-light text-xs px-4 py-1.5" onClick={onClose}>Done</button>
                                    <button 
                                        className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded hover:bg-blue-700"
                                        onClick={handleAddNotes}
                                    >
                                        Add Notes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    
    // =====================
    // Patient Deposit Actions
    // =====================
    async function fetchPatientDeposits() {
        try {
            const res = await fetchWithAuth(`${API}/deposit`);
            const body = await res.json();
            if (body?.success && Array.isArray(body.data)) {
                setPatientDeposits(body.data);
            }
        } catch (error) {
            console.error("Failed to fetch deposits:", error);
        }
    }

    async function updatePatientDeposit(depositId: number, request: { amount: number; paymentMethod: string; notes?: string }) {
        try {
            const res = await fetchWithAuth(`${API}/deposit/${depositId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });
            const body = await res.json();
            if (body?.success) {
                alert(body?.message || "Deposit updated successfully");
                await fetchPatientDeposits();
                setEditDepositModal(null);
            } else {
                alert(body?.message || "Failed to update deposit");
            }
        } catch (error) {
            console.error("Failed to update deposit:", error);
            alert("Failed to update deposit. Please try again.");
        }
    }

    async function deletePatientDeposit(depositId: number) {
        if (!confirm("Are you sure you want to delete this deposit?")) return;
        try {
            const res = await fetchWithAuth(`${API}/deposit/${depositId}`, {
                method: "DELETE",
            });
            const body = await res.json();
            if (body?.success) {
                alert(body?.message || "Deposit deleted successfully");
                await fetchPatientDeposits();
            } else {
                alert(body?.message || "Failed to delete deposit");
            }
        } catch (error) {
            console.error("Failed to delete deposit:", error);
            alert("Failed to delete deposit. Please try again.");
        }
    }

    async function printPatientDeposit(depositId: number) {
        alert(`Print functionality for deposit #${depositId} - To be implemented`);
        // TODO: Implement print functionality
    }

    // =====================
    // Insurance Deposit Actions
    // =====================
    async function fetchInsuranceDeposits() {
        try {
            const res = await fetchWithAuth(`${API}/insurance-deposit`);
            const body = await res.json();
            if (body?.success && Array.isArray(body.data)) {
                setInsuranceDeposits(body.data);
            }
        } catch (error) {
            console.error("Failed to fetch insurance deposits:", error);
        }
    }

    async function addInsuranceDeposit() {
        if (!depositAmount || !depositMethod || !depositFromPatientId) return;
        try {
            const res = await fetchWithAuth(`${API}/insurance-deposit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(depositAmount),
                    paymentMethod: depositMethod,
                    description: depositDesc,
                    patientId: depositFromPatientId,
                    policyId: depositPolicyId,
                    providerId: depositToProviderId
                }),
            });
            const body = await res.json();
            if (!body?.success) {
                alert(body?.message || "Failed to add insurance deposit");
                return;
            }
            await fetchInsuranceDeposits();
            setDepositAmount("");
            setDepositDesc("");
            setDepositFromPatientId(null);
            setDepositPolicyId(null);
            setDepositToProviderId(null);
            setShowDepositType(null);
            alert("Insurance deposit added successfully");
        } catch (err) {
            alert("Error: " + (err as Error).message);
        }
    }

    async function updateInsuranceDeposit(depositId: number, request: { amount: number; paymentMethod: string; description?: string }) {
        try {
            const res = await fetchWithAuth(`${API}/insurance-deposit/${depositId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });
            const body = await res.json();
            if (body?.success) {
                alert(body?.message || "Insurance deposit updated successfully");
                await fetchInsuranceDeposits();
                setEditInsuranceDepositModal(null);
            } else {
                alert(body?.message || "Failed to update insurance deposit");
            }
        } catch (error) {
            console.error("Failed to update insurance deposit:", error);
            alert("Failed to update insurance deposit. Please try again.");
        }
    }

    async function deleteInsuranceDeposit(depositId: number) {
        if (!confirm("Are you sure you want to delete this insurance deposit?")) return;
        try {
            const res = await fetchWithAuth(`${API}/insurance-deposit/${depositId}`, {
                method: "DELETE",
            });
            const body = await res.json();
            if (body?.success) {
                alert(body?.message || "Insurance deposit deleted successfully");
                await fetchInsuranceDeposits();
            } else {
                alert(body?.message || "Failed to delete insurance deposit");
            }
        } catch (error) {
            console.error("Failed to delete insurance deposit:", error);
            alert("Failed to delete insurance deposit. Please try again.");
        }
    }

    async function printInsuranceDeposit(depositId: number) {
        alert(`Print functionality for insurance deposit #${depositId} - To be implemented`);
        // TODO: Implement print functionality
    }

    async function getInsuranceDeposit(depositId: number) {
        try {
            const res = await fetchWithAuth(`${API}/insurance-deposit/${depositId}`);
            const body = await res.json();
            if (body?.success && body.data) {
                return body.data;
            }
        } catch (error) {
            console.error("Failed to get insurance deposit:", error);
        }
        return null;
    }

    // Print Invoice Statement
    async function fetchPrintInvoice(invoiceId: number) {
        setPrintInvoiceLoading(true);
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/print`);
            const body = await res.json();
            if (body?.success && body.data) {
                setPrintInvoiceData(body.data);
                setShowPrintInvoice(true);
            } else {
                alert(body?.message || "Failed to load invoice for printing");
            }
        } catch (error) {
            console.error("Failed to fetch print invoice:", error);
            alert("Failed to load invoice statement. Please try again.");
        } finally {
            setPrintInvoiceLoading(false);
        }
    }

    // Print EHR Claim Form
    async function fetchPrintEhrClaim(claimId: number) {
        setPrintEhrClaimLoading(true);
        try {
            const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patient-billing/${patientId}/claims/${claimId}/ehr-form-data`);
            const body = await res.json();
            if (body?.success && body.data) {
                setPrintEhrClaimData(body.data);
                setShowPrintEhrClaim(true);
            } else {
                alert(body?.message || "Failed to load EHR claim form data");
            }
        } catch (error) {
            console.error("Failed to fetch EHR claim form:", error);
            alert("Failed to load EHR claim form. Please try again.");
        } finally {
            setPrintEhrClaimLoading(false);
        }
    }

    // Patient Deposit logic
    async function addPatientDeposit() {
        if (!depositAmount || !depositMethod || !depositFromPatientId) return;
        try {
            const res = await fetchWithAuth(`${API}/deposit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(depositAmount),
                    method: depositMethod,
                    description: depositDesc,
                    fromPatientId: depositFromPatientId
                }),
            });
            const body = await res.json();
            if (!body?.success) {
                alert(body?.message || "Failed to add deposit");
                return;
            }
            // Update account credit after deposit
            setAccountCredit({ balance: body.data?.balance ?? 0 });
            // Optionally reset deposit modal state
            setDepositAmount("");
            setDepositDesc("");
            setShowDepositType(null);
        } catch (err) {
            alert("Error: " + (err as Error).message);
        }
    }

    // Courtesy Credit logic
    async function addCourtesyCredit() {
        if (!selectedInvoiceId) {
            alert("Please select an invoice from the Invoice tab first");
            return;
        }
        if (!depositAmount || Number(depositAmount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        try {
            const res = await fetchWithAuth(`${API}/invoices/${selectedInvoiceId}/courtesy-credit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adjustmentType: courtesyType,
                    amount: Number(depositAmount),
                    description: depositDesc
                }),
            });
            const body = await res.json();
            if (!body?.success) {
                alert(body?.message || "Failed to add courtesy credit");
                return;
            }
            // Reload all invoice data to show the courtesy credit transaction
            await loadAll();
            // Reset modal state
            setDepositAmount("");
            setDepositDesc("");
            setCourtesyType("Un-Collected");
            setShowDepositType(null);
            alert("Courtesy credit added successfully");
        } catch (err) {
            alert("Error: " + (err as Error).message);
        }
    }
    // Transfer INS balance to PT balance
    async function transferOutstandingToPatient(invoiceId: number, amount: number) {
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/transfer-outstanding-to-patient`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (!data?.success) {
                alert(data?.message || "Transfer to patient failed");
                return;
            }
            // Success: reload invoice and balances
            await loadAll();
            // Optionally show success message
            // alert("Transfer to patient successful");
            return data;
        } catch (err) {
            alert("Error: " + (err as Error).message);
        }
    }

    // Transfer PT balance to INS balance
    async function transferOutstandingToInsurance(invoiceId: number, amount: number) {
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/transfer-outstanding-to-insurance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (!data?.success) {
                alert(data?.message || "Transfer to insurance failed");
                return;
            }
            // Success: reload invoice and balances
            await loadAll();
            // Optionally show success message
            // alert("Transfer to insurance successful");
            return data;
        } catch (err) {
            alert("Error: " + (err as Error).message);
        }
    }

    // Edit modals for insurance and patient payments
    const [editInsuranceModal, setEditInsuranceModal] = useState<{invoiceId: number, remit: InsuranceRemitLine} | null>(null);
    const [editPatientModal, setEditPatientModal] = useState<{invoiceId: number, payment: PatientPayment} | null>(null);
    const [editCourtesyModal, setEditCourtesyModal] = useState<{invoiceId: number, courtesy: CourtesyCredit} | null>(null);
    // Patient deposits state
    const [patientDeposits, setPatientDeposits] = useState<PatientDepositDto[]>([]);
    const [editDepositModal, setEditDepositModal] = useState<PatientDepositDto | null>(null);
    // Insurance deposits state
    const [insuranceDeposits, setInsuranceDeposits] = useState<InsuranceDepositDto[]>([]);
    const [editInsuranceDepositModal, setEditInsuranceDepositModal] = useState<InsuranceDepositDto | null>(null);
    // Notes state
    const [currentNotes, setCurrentNotes] = useState<Note[]>([]);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [showNotesFor, setShowNotesFor] = useState<{ invoiceId: number; anchor: HTMLElement | null } | null>(null);
    const notesInputRef = React.useRef<HTMLTextAreaElement>(null); // Updated to use invoiceId directly
    // Dropdown data
    const [providers, setProviders] = useState<Provider[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
    const [patientPolicies, setPatientPolicies] = useState<PatientPolicy[]>([]);

    // Transfer Credit Modal state (move to top-level)
    const [showTransferCreditModal, setShowTransferCreditModal] = useState<{ invoiceId: number, payment: PatientPaymentData } | null>(null);
    const [transferToPatientId, setTransferToPatientId] = useState<number | null>(null);
    const [transferAmount, setTransferAmount] = useState<string>("");
    const [transferLoading, setTransferLoading] = useState(false);

    // Modal for transferring patient credit to another patient
    const TransferCreditModal = () => {
        if (!showTransferCreditModal) return null;
        return (
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.15)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }} onClick={() => setShowTransferCreditModal(null)}>
                <div style={{ background: "#fff", borderRadius: 8, minWidth: 340, maxWidth: 400, padding: 24, boxShadow: "0 2px 16px #0002" }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 18 }}>Transfer Credit to Another Patient</div>
                    <div className="mb-3">
                        <label className="label">Select Patient</label>
                        <select
                            className="input w-full"
                            value={transferToPatientId ?? ''}
                            onChange={e => setTransferToPatientId(Number(e.target.value) || null)}
                        >
                            <option value="">-- Select Patient --</option>
                            {patients.filter(p => p.id !== patientId).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-3">
                        <label className="label">Amount</label>
                        <input
                            className="input w-full"
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={transferAmount}
                            onChange={e => setTransferAmount(e.target.value)}
                            placeholder="Enter amount"
                        />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button className="btn-light" onClick={() => setShowTransferCreditModal(null)} disabled={transferLoading}>Cancel</button>
                        <button
                            className="btn-primary"
                            disabled={transferLoading || !transferToPatientId || !transferAmount || Number(transferAmount) <= 0}
                            onClick={async () => {
                                if (!showTransferCreditModal || !transferToPatientId || !transferAmount) return;
                                setTransferLoading(true);
                                try {
                                    await transferPatientCreditToPatient(
                                        patientId,
                                        transferToPatientId,
                                        Number(transferAmount),
                                        `Transferred from patient #${patientId} to #${transferToPatientId}`
                                    );
                                    setShowTransferCreditModal(null);
                                    setTransferToPatientId(null);
                                    setTransferAmount("");
                                    alert("Credit transferred successfully.");
                                } catch (err: unknown) {
                                    alert(err?.message || "Transfer failed");
                                } finally {
                                    setTransferLoading(false);
                                }
                            }}
                        >
                            {transferLoading ? "Transferring..." : "Transfer"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Preview modal state
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Expandable row states
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);
    const [expandedClaimId, setExpandedClaimId] = useState<number | null>(null);
    const [expandedInsPaymentId, setExpandedInsPaymentId] = useState<number | null>(null);
    const [expandedPtPaymentId, setExpandedPtPaymentId] = useState<number | null>(null);
    const [expandedCreditAdjustmentId, setExpandedCreditAdjustmentId] = useState<number | null>(null);
    const [expandedTransferOfCreditId, setExpandedTransferOfCreditId] = useState<number | null>(null);

    // Detailed data states
    const [invoiceLinesDetail, setInvoiceLinesDetail] = useState<InvoiceLineDetail[]>([]);
    const [claimLinesDetail, setClaimLinesDetail] = useState<ClaimLineDetail[]>([]);
    const [insPaymentDetail, setInsPaymentDetail] = useState<InsurancePaymentDetail | null>(null);
    const [ptPaymentDetail, setPtPaymentDetail] = useState<PatientPaymentDetail | null>(null);
    const [creditAdjustmentDetail, setCreditAdjustmentDetail] = useState<any>(null);
    const [transferOfCreditDetail, setTransferOfCreditDetail] = useState<any>(null);

    // Loading states
    const [loadingInvoiceLines, setLoadingInvoiceLines] = useState(false);
    const [loadingClaimLines, setLoadingClaimLines] = useState(false);
    const [loadingInsPaymentDetail, setLoadingInsPaymentDetail] = useState(false);
    const [loadingPtPaymentDetail, setLoadingPtPaymentDetail] = useState(false);
    const [loadingCreditAdjustment, setLoadingCreditAdjustment] = useState(false);
    const [loadingTransferOfCredit, setLoadingTransferOfCredit] = useState(false);

    // Fetch providers and patients for dropdowns
    useEffect(() => {
        fetchWithAuth("/api/providers")
            .then((res) => res.json())
            .then((data) => {
                if (data && data.success && Array.isArray(data.data)) {
                    setProviders(data.data.map((p: ServerProviderData) => ({ id: p.id, name: (p.identification?.firstName || '') + ' ' + (p.identification?.lastName || '') })));
                }
            });
        fetchWithAuth("/api/patients")
            .then((res) => res.json())
            .then((data) => {
                if (data && data.success && Array.isArray(data.data)) {
                    setPatients(data.data.map((p: ServerPatientData) => ({ id: p.id, name: (p.firstName || '') + ' ' + (p.lastName || '') })));
                }
            });
    }, []);
    // =====================
    // Insurance Payment Actions
    // =====================
    async function editInsuranceRemitLine(invoiceId: number, remitId: number, body: Partial<InsuranceRemitLine>) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/insurance-payments/${remitId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to edit insurance payment");
        await loadAll();
    }

    async function voidInsurancePayment(invoiceId: number, remitId: number, reason?: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/insurance-payments/${remitId}/void`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: reason ? JSON.stringify({ reason }) : undefined,
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to void insurance payment");
        await loadAll();
    }

    async function refundInsurancePayment(invoiceId: number, remitId: number, amount: number, reason: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/insurance-payments/${remitId}/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, reason }),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to refund insurance payment");
        await loadAll();
    }

    async function transferInsuranceCreditToPatient(invoiceId: number, remitId: number, amount: number, note: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/insurance-payments/${remitId}/transfer-credit-to-patient`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, note }),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to transfer insurance credit");
        await loadAll();
    }

    // =====================
    // Patient Payment Actions
    // =====================
    async function editPatientPayment(invoiceId: number, paymentId: number, body: Partial<PatientPayment>) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/patient-payments/${paymentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to edit patient payment");
        await loadAll();
    }

    async function voidPatientPayment(invoiceId: number, paymentId: number, reason?: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/patient-payments/${paymentId}/void`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: reason ? JSON.stringify({ reason }) : undefined,
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to void patient payment");
        await loadAll();
    }

    async function refundPatientPayment(invoiceId: number, paymentId: number, amount: number, reason: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/patient-payments/${paymentId}/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, reason }),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to refund patient payment");
        await loadAll();
    }

    async function transferPatientCreditToPatient(fromPatientId: number, toPatientId: number, amount: number, note: string) {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patient-billing/${patientId}/patients/${fromPatientId}/${toPatientId}/transfer-credit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to transfer patient credit");
        await loadAll();
        return data;
    }

    // =====================
    // Courtesy Credit Actions
    // =====================
    async function updateCourtesyCredit(invoiceId: number, body: { adjustmentType: string; amount: number; description?: string }) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/courtesy-credit`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const resBody = await res.json();
        if (!resBody?.success) throw new Error(resBody?.message || "Failed to update courtesy credit");
        await loadAll();
    }

    async function removeCourtesyCredit(invoiceId: number, reason?: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/courtesy-credit`, {
            method: "DELETE",
        });
        const resBody = await res.json();
        if (!resBody?.success) throw new Error(resBody?.message || "Failed to remove courtesy credit");
        await loadAll();
    }

    // =====================
    // Edit Invoice Action
    // =====================
    async function updateInvoice(invoiceId: number, body: { code: string; description: string; provider: string; dos: string; rate: number }) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Failed to update invoice");
        await loadAll();
    }

    // =====================
    // Notes Actions
    // =====================
    async function fetchNotes(invoiceId: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/notes`);
        const data = await res.json();
        if (data?.success) {
            setCurrentNotes(data.data || []);
        } else {
            setCurrentNotes([]);
        }
    }

    async function createNote(invoiceId: number, text: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (data?.success) {
            await fetchNotes(invoiceId);
            if (notesInputRef.current) notesInputRef.current.value = "";
        } else {
            throw new Error(data?.message || "Failed to create note");
        }
    }

    async function updateNote(invoiceId: number, noteId: number, text: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (data?.success) {
            await fetchNotes(invoiceId);
            setEditingNote(null);
            if (notesInputRef.current) notesInputRef.current.value = "";
        } else {
            throw new Error(data?.message || "Failed to update note");
        }
    }

    async function deleteNote(invoiceId: number, noteId: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/notes/${noteId}`, {
            method: "DELETE",
        });
        const data = await res.json();
        if (data?.success) {
            await fetchNotes(invoiceId); // Refresh list
        } else {
            throw new Error(data?.message || "Failed to delete note");
        }
    }

    const handleOpenNotes = async (invoiceId: number, e?: React.MouseEvent) => {
        setShowNotesFor({ invoiceId, anchor: e?.currentTarget as HTMLElement || null });
        setEditingNote(null);
        await fetchNotes(invoiceId);
        setTimeout(() => {
            if (notesInputRef.current) {
                notesInputRef.current.value = "";
                notesInputRef.current.focus();
            }
        }, 100);
    };

    const handleCloseNotes = () => {
        setShowNotesFor(null);
        setCurrentNotes([]);
        setEditingNote(null);
        if (notesInputRef.current) notesInputRef.current.value = "";
    };

    const handleSaveNote = async () => {
        if (!showNotesFor || !notesInputRef.current) return;
        const text = notesInputRef.current.value.trim();
        if (!text) return;
        
        if (editingNote) {
            await updateNote(showNotesFor.invoiceId, editingNote.id, text);
        } else {
            await createNote(showNotesFor.invoiceId, text);
        }
    };

    const handleEditNote = (note: Note) => {
        setEditingNote(note);
        if (notesInputRef.current) {
            notesInputRef.current.value = note.text;
            notesInputRef.current.focus();
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        if (!showNotesFor) return;
        if (confirm("Are you sure you want to delete this note?")) {
            await deleteNote(showNotesFor.invoiceId, noteId);
        }
    };

    // =====================
    // Expandable Row Actions - Fetch Detailed Data
    // =====================
    async function fetchInvoiceLines(invoiceId: number) {
        if (expandedInvoiceId === invoiceId) {
            // If already expanded, collapse it
            setExpandedInvoiceId(null);
            setInvoiceLinesDetail([]);
            return;
        }
        
        setLoadingInvoiceLines(true);
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/lines`);
            const data = await res.json();
            if (data?.success && Array.isArray(data.data)) {
                setInvoiceLinesDetail(data.data);
                setExpandedInvoiceId(invoiceId);
            } else {
                throw new Error(data?.message || "Failed to fetch invoice lines");
            }
        } catch (error) {
            alert((error as Error).message);
            setInvoiceLinesDetail([]);
        } finally {
            setLoadingInvoiceLines(false);
        }
    }

    async function fetchClaimLines(claimId: number) {
        if (expandedClaimId === claimId) {
            // If already expanded, collapse it
            setExpandedClaimId(null);
            setClaimLinesDetail([]);
            return;
        }
        
        setLoadingClaimLines(true);
        try {
            const res = await fetchWithAuth(`${API}/claims/${claimId}/lines`);
            const data = await res.json();
            if (data?.success && Array.isArray(data.data)) {
                setClaimLinesDetail(data.data);
                setExpandedClaimId(claimId);
            } else {
                throw new Error(data?.message || "Failed to fetch claim lines");
            }
        } catch (error) {
            alert((error as Error).message);
            setClaimLinesDetail([]);
        } finally {
            setLoadingClaimLines(false);
        }
    }

    async function fetchInsurancePaymentDetails(invoiceId: number, remitId: number) {
        if (expandedInsPaymentId === remitId) {
            // If already expanded, collapse it
            setExpandedInsPaymentId(null);
            setInsPaymentDetail(null);
            return;
        }
        
        setLoadingInsPaymentDetail(true);
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/insurance-payments/${remitId}/details`);
            const data = await res.json();
            if (data?.success && data.data) {
                setInsPaymentDetail(data.data);
                setExpandedInsPaymentId(remitId);
            } else {
                throw new Error(data?.message || "Failed to fetch insurance payment details");
            }
        } catch (error) {
            alert((error as Error).message);
            setInsPaymentDetail(null);
        } finally {
            setLoadingInsPaymentDetail(false);
        }
    }

    async function fetchPatientPaymentDetails(invoiceId: number, paymentId: number) {
        if (expandedPtPaymentId === paymentId) {
            // If already expanded, collapse it
            setExpandedPtPaymentId(null);
            setPtPaymentDetail(null);
            return;
        }
        
        setLoadingPtPaymentDetail(true);
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/patient-payments/${paymentId}/details`);
            const data = await res.json();
            if (data?.success && data.data) {
                setPtPaymentDetail(data.data);
                setExpandedPtPaymentId(paymentId);
            } else {
                throw new Error(data?.message || "Failed to fetch patient payment details");
            }
        } catch (error) {
            alert((error as Error).message);
            setPtPaymentDetail(null);
        } finally {
            setLoadingPtPaymentDetail(false);
        }
    }

    async function fetchCreditAdjustmentDetails(invoiceId: number, toggleExpand = true) {
        if (toggleExpand && expandedCreditAdjustmentId === invoiceId) {
            setExpandedCreditAdjustmentId(null);
            return;
        }
        
        setLoadingCreditAdjustment(true);
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/credit-adjustment`);
            const data = await res.json();
            if (data?.success && data.data) {
                setCreditAdjustmentDetail(data.data);
                if (toggleExpand) setExpandedCreditAdjustmentId(invoiceId);
            }
        } catch (error) {
            console.error("Failed to fetch credit adjustment:", error);
        } finally {
            setLoadingCreditAdjustment(false);
        }
    }

    async function fetchTransferOfCreditDetails(invoiceId: number, toggleExpand = true) {
        if (toggleExpand && expandedTransferOfCreditId === invoiceId) {
            setExpandedTransferOfCreditId(null);
            return;
        }
        
        setLoadingTransferOfCredit(true);
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/transfer-of-credit`);
            const data = await res.json();
            if (data?.success && data.data) {
                setTransferOfCreditDetail(data.data);
                if (toggleExpand) setExpandedTransferOfCreditId(invoiceId);
            }
        } catch (error) {
            console.error("Failed to fetch transfer of credit:", error);
        } finally {
            setLoadingTransferOfCredit(false);
        }
    }

    // Notes Popover/Modal - Enhanced to use portal, anchor to row, and smooth input
  
    // Notes Modal - Uncontrolled textarea for smooth typing
    const NotesModal = ({ open, invoiceId, onClose, notes, editingNote, onSave, onEdit, onDelete }: {
        open: boolean;
        invoiceId: number;
        onClose: () => void;
        notes: Note[];
        editingNote: Note | null;
        onSave: () => void;
        onEdit: (note: Note) => void;
        onDelete: (noteId: number) => void;
    }) => {
        if (!open) return null;
        return (
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.15)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }} onClick={onClose}>
                <div style={{ background: "#fff", borderRadius: 8, minWidth: 340, maxWidth: 400, padding: 20, boxShadow: "0 2px 16px #0002" }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Notes for Invoice #{invoiceId}</div>
                    <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 8 }}>
                        {notes.length === 0 && <div style={{ color: "#888", fontSize: 13 }}>No notes yet.</div>}
                        {notes.map(note => (
                            <div key={note.id} style={{ borderBottom: "1px solid #eee", padding: "4px 0" }}>
                                <div style={{ fontSize: 13, color: "#333" }}>{note.text}</div>
                                <div style={{ fontSize: 11, color: "#888" }}>{note.createdBy || ""} {note.createdAt && (new Date(note.createdAt)).toLocaleString()}</div>
                                <div style={{ marginTop: 2 }}>
                                    <button className="btn-light" style={{ fontSize: 11, marginRight: 4 }} onClick={() => onEdit(note)}>Edit</button>
                                    <button className="btn-danger" style={{ fontSize: 11 }} onClick={() => onDelete(note.id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <textarea
                        ref={notesInputRef}
                        className="input"
                        style={{ width: "100%", minHeight: 60, marginBottom: 8, resize: "vertical" }}
                        placeholder={editingNote ? "Edit note..." : "Enter new note..."}
                        defaultValue=""
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button className="btn-light" onClick={onClose}>Cancel</button>
                        <button className="btn-primary" onClick={onSave}>{editingNote ? "Update" : "Save"}</button>
                    </div>
                </div>
            </div>
        );
    };

    if (!Number.isFinite(Number(patientId))) {
        return (
            <div className="p-6">
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
                    Unable to load billing: invalid patient id.
                </div>
            </div>
        );
    }

    const API = `${process.env.NEXT_PUBLIC_API_URL}/api/patient-billing/${patientId}`;

    const [tab, setTab] = useState<"INVOICE" | "CLAIM" | "INS" | "PATIENT" | "DEPOSIT">("INVOICE");

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [claims, setClaims] = useState<Record<number, Claim>>({});
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
    const selectedInvoice =
        invoices.find((x) => x.id === selectedInvoiceId) ?? (invoices.length ? invoices[0] : undefined);
    const selectedClaim = selectedInvoice ? claims[selectedInvoice.id] : undefined;

    // Pre-fetched payment summaries per invoice
    const [insPayMap, setInsPayMap] = useState<Record<number, InsuranceRemitLine[]>>({});
    const [ptPayMap, setPtPayMap] = useState<Record<number, PatientPaymentData[]>>({});
    const [courtesyCreditsMap, setCourtesyCreditsMap] = useState<Record<number, CourtesyCredit[]>>({});

    // Patient payment allocations
    const [payMethod, setPayMethod] = useState<PaymentMethod>("CREDIT_CARD");
    const [allocs, setAllocs] = useState<PatientPaymentAllocation[]>([]);
    useEffect(() => {
        if (!selectedInvoice) return;
        setAllocs(
            selectedInvoice.lines.map((l) => ({
                invoiceLineId: l.id,
                amount: Number(l.patientPortion ?? 0),
            }))
        );
    }, [selectedInvoice?.id, selectedInvoice?.lines]);

    // --- Calculate PT PAID and INS PAID for summary bar ---
    // Use ptPayMap and insPayMap if invoice-level values are missing or zero
    const invoicePtPaid = useMemo(() => {
        if (!selectedInvoice) return 0;
        if (Number(selectedInvoice.ptPaid) > 0) return Number(selectedInvoice.ptPaid);
        const pp = ptPayMap[selectedInvoice.id] ?? [];
        return sum(pp.map((p: PatientPaymentData) => Number(p.amount ?? p.payment ?? p.paid ?? 0)));
    }, [selectedInvoice, ptPayMap]);

    const invoiceInsPaid = useMemo(() => {
        if (!selectedInvoice) return 0;
        if (Number(selectedInvoice.insPaid) > 0) return Number(selectedInvoice.insPaid);
        const ip = insPayMap[selectedInvoice.id] ?? [];
        return sum(ip.map((r: InsuranceRemitLine) => Number(r.insPay ?? 0)));
    }, [selectedInvoice, insPayMap]);

    const [accountCredit, setAccountCredit] = useState<AccountCredit>({ balance: 0 });

    // Insurance remit state – per selected invoice
    const [remits, setRemits] = useState<InsuranceRemitLine[]>([]);
    useEffect(() => {
        if (!selectedInvoice) return;
        setRemits(
            selectedInvoice.lines.map((l) => {
                const submitted = Number(l.charge ?? 0);
                const allowed = Number(l.allowed ?? l.charge ?? 0);
                const appliedWriteOff = Math.max(0, submitted - allowed);
                const insPay = Number(l.charge ?? 0);
                const patientResp = Math.max(0, allowed - insPay);
                return {
                    id: l.id,
                    invoiceLineId: l.id,
                    submitted,
                    balance: patientResp,
                    deductible: 0,
                    allowed,
                    insWriteOff: appliedWriteOff,
                    insPay,
                };
            })
        );
    }, [selectedInvoice?.id]); // eslint-disable-line

    // Removed duplicate declarations of insPayMap, ptPayMap, payMethod, allocs, and their useEffect

    /* -------- Derived ---------- */
    const patientOwing = useMemo(
        () =>
            selectedInvoice
                ? selectedInvoice.lines.reduce((a, l) => a + Number(l.patientPortion ?? 0), 0)
                : 0,
        [selectedInvoice]
    );

    const isClosed = useMemo(
        () =>
            selectedInvoice?.status === "PAID" &&
            Number(selectedInvoice?.ptBalance ?? 0) === 0 &&
            Number(selectedInvoice?.insBalance ?? 0) === 0,
        [selectedInvoice?.status, selectedInvoice?.ptBalance, selectedInvoice?.insBalance]
    );

    const outstanding = useMemo(
        () => (isClosed ? 0 : Number(selectedInvoice?.ptBalance ?? patientOwing)),
        [isClosed, selectedInvoice?.ptBalance, patientOwing]
    );

    const entered = useMemo(
        () => allocs.reduce((a, r) => a + Number(r.amount || 0), 0),
        [allocs]
    );
    const overpay = Math.max(0, entered - outstanding);

    /* -------- UI modals / popovers ---------- */
    const [transferOpenFor, setTransferOpenFor] = useState<number | null>(null);
    const [showEditLinesFor, setShowEditLinesFor] = useState<number | null>(null);
    const [showAdjustmentFor, setShowAdjustmentFor] = useState<number | null>(null);
    const [showAddProcedure, setShowAddProcedure] = useState(false);
    const [procedureList, setProcedureList] = useState<Array<{ code: string; description: string; rate: number }>>([{ code: "D2391", description: "Composite Resin, 1 surface", rate: 239 }]);
    
    useEffect(() => {
        if (showAddProcedure) {
            setProcedureList([{ code: "D2391", description: "Composite Resin, 1 surface", rate: 239 }]);
        }
    }, [showAddProcedure]);
    const [showClaimEditFor, setShowClaimEditFor] = useState<number | null>(null);
    const [showVoidFor, setShowVoidFor] = useState<number | null>(null);
    const [showClaimComposeFor, setShowClaimComposeFor] = useState<number | null>(null);
    const [cheque, setCheque] = useState({ number: "", bankBranch: "" });

    const [showAttachmentFor, setShowAttachmentFor] = useState<number | null>(null);
    const [showEobFor, setShowEobFor] = useState<number | null>(null);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [eobFile, setEobFile] = useState<File | null>(null);

    const [showDepositType, setShowDepositType] = useState<"PATIENT" | "INSURANCE" | "COURTESY" | null>(null);

    // New modals for update
    const [showBackdateFor, setShowBackdateFor] = useState<number | null>(null);
    const [showAccountAdjustmentFor, setShowAccountAdjustmentFor] = useState<number | null>(null);
    const [showAdjustmentInvoiceFor, setShowAdjustmentInvoiceFor] = useState<number | null>(null);
    const [showInsuranceWriteOffFor, setShowInsuranceWriteOffFor] = useState<number | null>(null);
    const [showMembershipAdjustmentFor, setShowMembershipAdjustmentFor] = useState<number | null>(null);

    /* =========================================================
       Load data (invoices, credit + payment GETs)
    ========================================================== */
    const mapServerInvoice = (raw: ServerInvoiceData): Invoice => ({
        id: raw.id,
        patientId: raw.patientId,
        status: raw.status,
        insWO: raw.insWO,
        ptBalance: raw.ptBalance,
        insBalance: raw.insBalance,
        totalCharge: raw.totalCharge,
        insPaid: raw.insPaid ?? 0,
        ptPaid: raw.ptPaid ?? 0,
        lines: (raw.lines || []).map((l: ServerInvoiceLineData) => ({
            id: l.id,
            dos: Array.isArray(l.dos)
                ? `${l.dos[0]}-${String(l.dos[1]).padStart(2, "0")}-${String(l.dos[2]).padStart(2, "0")}`
                : l.dos,
            code: l.code,
            treatment: l.treatment,
            provider: l.provider,
            charge: l.charge,
            allowed: l.allowed,
            insWriteOff: l.insWriteOff,
            insPortion: l.insPortion,
            patientPortion: l.patientPortion,
        })),
    });

    const mapServerClaim = (raw: ServerClaimData): Claim => ({
        id: raw.id,
        invoiceId: raw.invoiceId,
        patientId: raw.patientId,
        payerName: raw.payerName ?? null,
        treatingProviderId: raw.treatingProviderId ?? null,
        provider: raw.provider ?? null,
        billingEntity: raw.billingEntity ?? null,
        policyNumber: raw.policyNumber ?? raw.policynumber ?? null,
        type: (raw.type as Claim["type"]) ?? null,
        notes: raw.notes ?? null,
        status: raw.status,
        attachments: raw.attachments ?? 0,
        eobAttached: !!raw.eobAttached,
        createdOn: Array.isArray(raw.createdOn)
            ? `${raw.createdOn[0]}-${String(raw.createdOn[1]).padStart(2, "0")}-${String(raw.createdOn[2]).padStart(2, "0")}`
            : raw.createdOn ?? null,
    });

    async function loadAll() {
        // invoices
        const invRes = await fetchWithAuth(`${API}/invoices`);
        const invBody = await invRes.json();
        let invs: Invoice[] = [];
        if (invBody?.success) {
            invs = (invBody.data || []).map(mapServerInvoice);
            setInvoices(invs);
            setSelectedInvoiceId((s) => s ?? (invs[0]?.id ?? null));
        }

        // claims
        try {
            const clRes = await fetchWithAuth(`${API}/claims`);
            const clBody = await clRes.json();
            if (clBody?.success && Array.isArray(clBody.data)) {
                const claimMap = (clBody.data as ServerClaimData[]).reduce((acc, raw) => {
                    const c = mapServerClaim(raw);
                    if (!acc[c.invoiceId]) acc[c.invoiceId] = c;
                    return acc;
                }, {} as Record<number, Claim>);
                setClaims(claimMap);
            }
        } catch {}

        // insurance & patient payments & courtesy credits per invoice
        try {
            const all = await Promise.all(
                invs.map(async (inv) => {
                    const [insRes, ptRes, ccRes] = await Promise.all([
                        fetchWithAuth(`${API}/invoices/${inv.id}/insurance-payments`),
                        fetchWithAuth(`${API}/invoices/${inv.id}/patient-payments`),
                        fetchWithAuth(`${API}/invoices/${inv.id}/courtesy-credit`),
                    ]);
                    const [insJ, ptJ, ccJ] = await Promise.all([insRes.json(), ptRes.json(), ccRes.json()]);
                    return {
                        id: inv.id,
                        ins: Array.isArray(insJ?.data) ? (insJ.data as InsuranceRemitLine[]) : [],
                        pt: Array.isArray(ptJ?.data) ? (ptJ.data as PatientPaymentData[]) : [],
                        cc: ccJ?.success && Array.isArray(ccJ?.data) ? (ccJ.data as CourtesyCredit[]) : [],
                    };
                })
            );
            const nextIns: Record<number, InsuranceRemitLine[]> = {};
            const nextPt: Record<number, PatientPaymentData[]> = {};
            const nextCc: Record<number, CourtesyCredit[]> = {};
            all.forEach(({ id, ins, pt, cc }) => {
                nextIns[id] = ins;
                nextPt[id] = pt;
                nextCc[id] = cc;
            });
            setInsPayMap(nextIns);
            setPtPayMap(nextPt);
            setCourtesyCreditsMap(nextCc);
        } catch {}

        // account credit
        try {
            const crRes = await fetchWithAuth(`${API}/account-credit`);
            const crBody = await crRes.json();
            if (crBody?.success && crBody.data) setAccountCredit({ balance: crBody.data.balance ?? 0 });
        } catch {}
    }

    async function loadDropdowns() {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const [provRes, patRes, insRes, polRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/api/providers`),
                fetchWithAuth(`${API_URL}/api/patients`),
                fetchWithAuth(`${API_URL}/api/insurance-companies`),
                fetchWithAuth(`${API_URL}/api/coverages`)
            ]);
            const provData = await provRes.json();
            const patData = await patRes.json();
            const insData = await insRes.json();
            const polData = await polRes.json();

            // Providers: expect data.data to be an array
            setProviders(
                provData.success && Array.isArray(provData.data)
                    ? provData.data.map((p: ServerProviderData) => ({
                        id: p.id,
                        name: `${p.identification?.firstName ?? ""} ${p.identification?.lastName ?? ""}`.trim()
                    }))
                    : []
            );
            // Patients: expect data.data.content to be an array (paginated)
            setPatients(
                patData.success && patData.data && Array.isArray(patData.data.content)
                    ? patData.data.content.map((p: ServerPatientData) => ({
                        id: p.id,
                        name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
                    }))
                    : []
            );
            setInsuranceCompanies(
                insData.success && Array.isArray(insData.data)
                    ? insData.data.map((i: ServerInsuranceCompanyData) => ({
                        id: i.id,
                        name: i.name
                    }))
                    : []
            );
            // Patient Policies: filter by current patient
            setPatientPolicies(
                polData.success && Array.isArray(polData.data)
                    ? polData.data
                        .filter((c: any) => Number(c.patientId) === patientId)
                        .map((c: any) => ({
                            id: c.id,
                            planName: c.planName || 'Unnamed Policy',
                            policyNumber: c.policyNumber
                        }))
                    : []
            );
        } catch (error) {
            setProviders([]); setPatients([]); setInsuranceCompanies([]); setPatientPolicies([]);
        }
    }

    useEffect(() => {
        void loadAll();
        void loadDropdowns();
        void fetchPatientDeposits();
        void fetchInsuranceDeposits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    /* =========================================================
       Actions → Backend
    ========================================================== */
    // Backdate invoice
    async function backdateInvoice(invoiceId: number, date: string) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/backdate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date }),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to backdate invoice");
        const inv = mapServerInvoice(body.data);
        setInvoices((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
    }

    // Invoice adjustment (flat/percent)
    async function adjustInvoice(invoiceId: number, payload: { adjustmentType: string; discountPercent?: number; description?: string; }) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/adjust`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to adjust invoice");
        const inv = mapServerInvoice(body.data);
        setInvoices((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
    }

    // Account adjustment
    async function accountAdjustment(payload: { adjustmentType: string; flatRate?: number; specificAmount?: number; description?: string; includeCourtesyCredit?: boolean; }) {
        const res = await fetchWithAuth(`${API}/account-adjustment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to adjust account");
        setAccountCredit({ balance: body.data?.balance ?? 0 });
    }
    async function createInvoiceFromProcedure(p: {
        dos: string;
        provider: string;
        procedures: Array<{ code: string; description: string; rate: number }>;
    }) {
        const res = await fetchWithAuth(`${API}/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                provider: p.provider,
                dos: p.dos,
                procedures: p.procedures
            }),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to create invoice");
        const inv = mapServerInvoice(body.data);
        setInvoices((arr) => [inv, ...arr]);
        setSelectedInvoiceId(inv.id);
    }

    async function reestimateLine(invoiceId: number, lineId: number, newCharge: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/lines/${lineId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newCharge }),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to update line");
        const inv = mapServerInvoice(body.data);
        setInvoices((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
    }

    async function promoteClaim(invoiceId: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/claim/promote`, { method: "POST" });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to promote claim");
        const claim = mapServerClaim(body.data);
        setClaims((m) => ({ ...m, [invoiceId]: claim }));
    }

    async function sendToBatch(invoiceId: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/claim/send-to-batch`, {
            method: "POST",
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to move claim to batch");
        const claim = mapServerClaim(body.data);
        setClaims((m) => ({ ...m, [invoiceId]: claim }));
        setShowClaimComposeFor(null);
    }

    async function submitClaim(invoiceId: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/claim/submit`, { method: "POST" });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to submit claim");
        const claim = mapServerClaim(body.data);
        setClaims((m) => ({ ...m, [invoiceId]: claim }));
    }

    async function closeClaim(invoiceId: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/claim/close`, { method: "POST" });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to close claim");
        const claim = mapServerClaim(body.data);
        setClaims((m) => ({ ...m, [invoiceId]: claim }));
    }

    async function voidAndRecreateClaim(invoiceId: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/claim/void-recreate`, { method: "POST" });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to void/recreate claim");
        const claim = mapServerClaim(body.data);
        setClaims((m) => ({ ...m, [invoiceId]: claim }));
        setShowVoidFor(null);
    }

    async function updateClaim(invoiceId: number, payload: Partial<Claim> & Record<string, string | number | boolean | null | undefined>) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/claim`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to update claim");
        const claim = mapServerClaim(body.data);
        setClaims((m) => ({ ...m, [invoiceId]: claim }));
    }

    async function applyInsurancePayment() {
        if (!selectedInvoice) return;
        const payload = {
            chequeNumber: cheque.number || "000000000",
            bankBranch: cheque.bankBranch || "000",
            lines: remits.map((r) => ({
                invoiceLineId: r.invoiceLineId,
                submitted: Number(r.submitted || 0),
                balance: Number(r.balance || 0),
                deductible: Number(r.deductible || 0),
                allowed: Number(r.allowed || 0),
                insWriteOff: Number(r.insWriteOff || 0),
                insPay: Number(r.insPay || 0),
                updateAllowed: !!r.updateAllowed,
                updateFlatPortion: !!r.updateFlatPortion,
                applyWriteoff: !!r.applyWriteoff,
            })),
        };
        const res = await fetchWithAuth(`${API}/invoices/${selectedInvoice.id}/insurance-payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to apply insurance payment");
        const inv = mapServerInvoice(body.data);
        setInvoices((list) => list.map((x) => (x.id === inv.id ? inv : x)));


        setAllocs(inv.lines.map((l) => ({ invoiceLineId: l.id, amount: Number(l.patientPortion ?? 0) })));
        setSelectedInvoiceId(inv.id);
        setTab("PATIENT");
    }

    async function applyPatientPayment() {
        if (!selectedInvoice) return;
        const res = await fetchWithAuth(`${API}/invoices/${selectedInvoice.id}/patient-payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                paymentMethod: payMethod,
                allocations: allocs.map((a) => ({ ...a, amount: Number(a.amount || 0) })),
            }),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to apply patient payment");
        const inv = mapServerInvoice(body.data);
        setInvoices((list) => list.map((x) => (x.id === inv.id ? inv : x)));


        // refresh allocations & credit
        setAllocs(inv.lines.map((l) => ({ invoiceLineId: l.id, amount: Number(l.patientPortion ?? 0) })));
        try {
            const crRes = await fetchWithAuth(`${API}/account-credit`);
            const crBody = await crRes.json();
            if (crBody?.success && crBody.data) setAccountCredit({ balance: crBody.data.balance ?? 0 });
        } catch {}
    }

    async function applyPercentAdjustment(invoiceId: number, percent: number) {
        const res = await fetchWithAuth(`${API}/invoices/${invoiceId}/adjustment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percent }),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to adjust invoice");
        const inv = mapServerInvoice(body.data);
        setInvoices((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
    }

    async function applyAccountCredit(amount: number) {
        const res = await fetchWithAuth(`${API}/account-credit/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        const body = await res.json();
        if (!body?.success) throw new Error(body?.message || "Failed to apply credit");
        setAccountCredit({ balance: body.data?.balance ?? 0 });
    }

    async function deleteInvoice(invoiceId: number) {
        if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
        try {
            const res = await fetchWithAuth(`${API}/invoices/${invoiceId}`, {
                method: "DELETE",
            });
            const body = await res.json();
            if (!body?.success) throw new Error(body?.message || "Failed to delete invoice");
            // Remove invoice from state
            setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
            // Clear selection if deleted invoice was selected
            if (selectedInvoiceId === invoiceId) {
                const remaining = invoices.filter((inv) => inv.id !== invoiceId);
                setSelectedInvoiceId(remaining.length > 0 ? remaining[0].id : null);
            }
            alert("Invoice deleted successfully");
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to delete invoice");
        }
    }

    // Payment methods for deposit modals
    const paymentMethods = [
        { value: "CREDIT_CARD", label: "Credit Card" },
        { value: "CHECK", label: "Check" },
        { value: "DEBIT_CARD", label: "Debit Card" },
        { value: "EFT", label: "EFT" },
        { value: "CASH", label: "Cash" },
        { value: "CARE_CREDIT", label: "Care Credit" },
        { value: "MASTERCARD", label: "Master Card" },
        { value: "VISA", label: "Visa" },
        { value: "DISCOVER", label: "Discover" },
        { value: "AMEX", label: "Amex" },
    ];

    // Deposit modal state variables (enhanced)
    const [depositMethod, setDepositMethod] = useState<string>("CREDIT_CARD");
    const [depositFromPatientId, setDepositFromPatientId] = useState<number | null>(null); // For insurance/patient deposit
    const [depositToProviderId, setDepositToProviderId] = useState<number | null>(null); // For insurance deposit
    const [depositPolicyId, setDepositPolicyId] = useState<number | null>(null); // For insurance policy
    const [depositAmount, setDepositAmount] = useState<string>("");
    const [depositDesc, setDepositDesc] = useState<string>("");
    const [courtesyType, setCourtesyType] = useState<string>("Un-Collected");
    const courtesyTypes = [
        "Un-Collected",
        "Professional Courtesy",
        "Migrated",
        "MembershipPlan"
    ];

    return (
        <div className="p-6 space-y-6">
            <StyleInjector />

            {/* Top summary cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border p-4">
                    <div className="text-sm text-gray-500">Patient</div>
                    <div className="text-xl font-semibold">{patientName || "Patient"}</div>
                </div>
                <div className="rounded-xl border p-4">
                    <div className="text-sm text-gray-500">Invoices</div>
                    <div className="text-xl font-semibold">{invoices.length}</div>
                </div>
                <div className="rounded-xl border p-4">
                    <div className="text-sm text-gray-500">Claims</div>
                    <div className="text-xl font-semibold">
                        {Object.values(claims).filter(Boolean).length}
                    </div>
                </div>
                <div className="rounded-xl border p-4">
                    <div className="text-sm text-gray-500">Account Credit</div>
                    <div className="text-xl font-semibold">{currency(Number(accountCredit.balance ?? 0))}</div>
                </div>
            </div>

            {/* Primary actions */}
            <div className="flex flex-wrap items-center gap-2">
                <button className="btn-primary" onClick={() => setShowAddProcedure(true)}>
                    + Add Procedure
                </button>
                <select
                    className="input"
                    value={selectedInvoice?.id ?? ""}
                    onChange={(e) => setSelectedInvoiceId(Number(e.target.value))}
                >
                    {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                            Select Invoice #{inv.id}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tabs */}
            {/* Tabs with Deposit */}
            <SegmentedTabs
                tabs={[
                    { id: "INVOICE", label: "Invoice(s)" },
                    { id: "CLAIM", label: "Claim (selected)" },
                    { id: "INS", label: "Insurance Payment" },
                    { id: "PATIENT", label: "Patient Payment" },
                    { id: "DEPOSIT", label: "Deposit" },
                ]}
                value={tab}
                onChange={(id) => { setTab(id as typeof tab); setShowDepositType(null); }}
            />
            {/* Deposit Tab Implementation */}
            {tab === "DEPOSIT" && (
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <button className="btn-light" onClick={() => { setShowDepositType("PATIENT"); }}>Add Patient Deposit</button>
                        <button className="btn-light" onClick={() => { setShowDepositType("INSURANCE"); }}>Add Insurance Deposit</button>
                        <button className="btn-light" onClick={() => { setShowDepositType("COURTESY"); }}>Add Courtesy Credit</button>
                    </div>

                    {/* Patient Deposits List */}
                    {patientDeposits.length > 0 && (
                        <SectionCard title="Patient Deposits" actions={null}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">Deposit ID</th>
                                            <th className="px-3 py-2 text-left font-medium">Date</th>
                                            <th className="px-3 py-2 text-left font-medium">Amount</th>
                                            <th className="px-3 py-2 text-left font-medium">Payment Method</th>
                                            <th className="px-3 py-2 text-left font-medium">Description</th>
                                            <th className="px-3 py-2 text-center font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patientDeposits.map((deposit) => {
                                            const depositDateStr = Array.isArray(deposit.depositDate)
                                                ? `${deposit.depositDate[0]}-${String(deposit.depositDate[1]).padStart(2, "0")}-${String(deposit.depositDate[2]).padStart(2, "0")}`
                                                : deposit.depositDate || "—";
                                            return (
                                                <tr key={deposit.id} className="border-b hover:bg-gray-50">
                                                    <td className="px-3 py-2">#{deposit.id}</td>
                                                    <td className="px-3 py-2">{depositDateStr}</td>
                                                    <td className="px-3 py-2 font-medium">{currency(deposit.amount)}</td>
                                                    <td className="px-3 py-2">{deposit.paymentMethod}</td>
                                                    <td className="px-3 py-2">{deposit.description || "—"}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <IconBtn title="Edit Deposit" onClick={() => setEditDepositModal(deposit)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                                </svg>
                                                            </IconBtn>
                                                            <IconBtn title="Void Deposit" onClick={() => deletePatientDeposit(deposit.id)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-600">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                </svg>
                                                            </IconBtn>
                                                            <IconBtn title="Print Deposit" onClick={() => printPatientDeposit(deposit.id)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                                                                </svg>
                                                            </IconBtn>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    )}

                    {/* Patient Deposit Modal */}
                    {showDepositType === "PATIENT" && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                                <div className="font-semibold text-lg mb-2">Patient Deposit</div>
                                <div className="text-sm text-gray-500 mb-4">{new Date().toLocaleDateString()} Deposit #XXXXX from {patientName}</div>
                                <div className="mb-3">
                                    <label className="label">Select Patient</label>
                                    <select className="input w-full" value={depositFromPatientId ?? ''} onChange={e => setDepositFromPatientId(Number(e.target.value) || null)}>
                                        <option value="">Select Patient</option>
                                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="label">Deposit Amount:</label>
                                    <input className="input w-full" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="label">Payment Method:</label>
                                    <select className="input w-full" value={depositMethod} onChange={e => setDepositMethod(e.target.value)}>
                                        {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="label">Add description</label>
                                    <input className="input w-full" value={depositDesc} onChange={e => setDepositDesc(e.target.value)} />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button className="btn-primary" onClick={addPatientDeposit}>Add Deposit</button>
                                    <button className="btn-light" onClick={() => setShowDepositType(null)}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Insurance Deposit Modal */}
                    {showDepositType === "INSURANCE" && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                                <div className="font-semibold text-lg mb-2">Insurance Deposit</div>
                                <div className="text-sm text-gray-500 mb-2">{new Date().toLocaleDateString()} Deposit #XXXXX</div>
                                <div className="mb-3">
                                    <label className="label">Select Patient</label>
                                    <select className="input w-full" value={depositFromPatientId ?? ''} onChange={e => setDepositFromPatientId(Number(e.target.value) || null)}>
                                        <option value="">Select Patient</option>
                                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="label">Payment Method</label>
                                    <select className="input w-full" value={depositMethod} onChange={e => setDepositMethod(e.target.value)}>
                                        {paymentMethods.map(pm => (
                                            <option key={pm.value} value={pm.value}>{pm.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="label">Select Policy</label>
                                    <select className="input w-full" value={depositPolicyId ?? ''} onChange={e => setDepositPolicyId(Number(e.target.value) || null)}>
                                        <option value="">Select Policy</option>
                                        {patientPolicies.map(pol => (
                                            <option key={pol.id} value={pol.id}>
                                                {pol.planName}{pol.policyNumber ? ` (${pol.policyNumber})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="label">Deposit Amount</label>
                                    <input className="input w-full" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="label">Select Provider</label>
                                    <select className="input w-full" value={depositToProviderId ?? ''} onChange={e => setDepositToProviderId(Number(e.target.value) || null)}>
                                        <option value="">Select Provider</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="label">Add description</label>
                                    <input className="input w-full" value={depositDesc} onChange={e => setDepositDesc(e.target.value)} />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button className="btn-primary" onClick={addInsuranceDeposit}>Add Deposit</button>
                                    <button className="btn-light" onClick={() => setShowDepositType(null)}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Insurance Deposits List */}
                    {insuranceDeposits.length > 0 && (
                        <SectionCard title="Insurance Deposits" actions={null}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">Deposit ID</th>
                                            <th className="px-3 py-2 text-left font-medium">Date</th>
                                            <th className="px-3 py-2 text-left font-medium">Amount</th>
                                            <th className="px-3 py-2 text-left font-medium">Payment Method</th>
                                            <th className="px-3 py-2 text-left font-medium">Description</th>
                                            <th className="px-3 py-2 text-center font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {insuranceDeposits.map((deposit) => {
                                            const depositDateStr = Array.isArray(deposit.depositDate)
                                                ? `${deposit.depositDate[0]}-${String(deposit.depositDate[1]).padStart(2, "0")}-${String(deposit.depositDate[2]).padStart(2, "0")}`
                                                : typeof deposit.depositDate === 'string' ? deposit.depositDate : "—";
                                            return (
                                                <tr key={deposit.id} className="border-b hover:bg-gray-50">
                                                    <td className="px-3 py-2">#{deposit.id}</td>
                                                    <td className="px-3 py-2">{depositDateStr}</td>
                                                    <td className="px-3 py-2 font-medium">{currency(deposit.depositAmount)}</td>
                                                    <td className="px-3 py-2">{deposit.paymentMethod}</td>
                                                    <td className="px-3 py-2">{deposit.description || "—"}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <IconBtn title="Edit Deposit" onClick={() => setEditInsuranceDepositModal(deposit)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                                </svg>
                                                            </IconBtn>
                                                            <IconBtn title="Void Deposit" onClick={() => deleteInsuranceDeposit(deposit.id)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-600">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                </svg>
                                                            </IconBtn>
                                                            <IconBtn title="Print Deposit" onClick={() => printInsuranceDeposit(deposit.id)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                                                                </svg>
                                                            </IconBtn>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    )}

                    {/* Courtesy Credit Modal */}
                    {showDepositType === "COURTESY" && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                                <div className="font-semibold text-lg mb-2">Courtesy Credit</div>
                                <div className="text-sm text-gray-500 mb-2">{new Date().toLocaleDateString()}</div>
                                {selectedInvoiceId ? (
                                    <div className="text-sm text-blue-600 font-medium mb-2">For Invoice #{selectedInvoiceId} - Remaining Patient Balance: {currency(Number(selectedInvoice?.ptBalance ?? 0))}</div>
                                ) : (
                                    <div className="text-sm text-red-600 font-medium mb-2">⚠️ Please select an invoice from the Invoice tab first</div>
                                )}
                                <div className="mb-2">
                                    <label className="label">Adjustment Type</label>
                                    <select className="input w-full" value={courtesyType} onChange={e => setCourtesyType(e.target.value)}>
                                        {courtesyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="label">Courtesy Credit Amount:</label>
                                    <input className="input w-full" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="label">Add description</label>
                                    <input className="input w-full" value={depositDesc} onChange={e => setDepositDesc(e.target.value)} />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button 
                                        className="btn-primary" 
                                        onClick={addCourtesyCredit}
                                        disabled={!selectedInvoiceId || !depositAmount || Number(depositAmount) <= 0}
                                        style={!selectedInvoiceId || !depositAmount || Number(depositAmount) <= 0 ? {opacity: 0.5, cursor: 'not-allowed'} : {}}
                                    >
                                        Add Courtesy
                                    </button>
                                    <button className="btn-light" onClick={() => setShowDepositType(null)}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ================= INVOICE LIST ================= */}
            {tab === "INVOICE" && (
                <div className="space-y-4">
                    {selectedInvoiceId === null ? (
                        <>
                            {/* Insurance Deposits displayed as top-level items */}
                            {insuranceDeposits.map((deposit) => {
                                const depositDateStr = Array.isArray(deposit.depositDate) 
                                    ? `${deposit.depositDate[1].toString().padStart(2, '0')}/${deposit.depositDate[2].toString().padStart(2, '0')}/${deposit.depositDate[0]}`
                                    : typeof deposit.depositDate === 'string' ? new Date(deposit.depositDate).toLocaleDateString() : new Date().toLocaleDateString();
                                
                                return (
                                    <div key={`insurance-deposit-${deposit.id}`} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                                        <div className="flex items-center gap-4 px-3 py-2 text-sm bg-green-50">
                                            <Badge tone="green">
                                                Insurance Deposit#{deposit.id} ({depositDateStr})
                                            </Badge>
                                            <div className="flex-1 flex items-center gap-4">
                                                <span className="text-gray-700">with {deposit.paymentMethod}:</span>
                                                <span className="font-bold text-green-600">{currency(deposit.depositAmount)}/{currency(deposit.depositAmount)}</span>
                                            </div>
                                            {/* Action icons: Edit, Void, Print */}
                                            <div className="ml-auto flex items-center gap-2">
                                                <IconBtn 
                                                    title="Print Deposit" 
                                                    onClick={() => printInsuranceDeposit(deposit.id)}
                                                >
                                                    🖨️
                                                </IconBtn>
                                                <IconBtn 
                                                    title="Edit Deposit" 
                                                    onClick={() => setEditInsuranceDepositModal(deposit)}
                                                >
                                                    ✏️
                                                </IconBtn>
                                                <IconBtn 
                                                    title="Void Deposit" 
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to void insurance deposit #${deposit.id}?`)) {
                                                            void deleteInsuranceDeposit(deposit.id);
                                                        }
                                                    }}
                                                >
                                                    🗑️
                                                </IconBtn>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Patient Deposits displayed as top-level items */}
                            {patientDeposits.map((deposit) => {
                                const depositDateStr = Array.isArray(deposit.depositDate) 
                                    ? `${deposit.depositDate[1].toString().padStart(2, '0')}/${deposit.depositDate[2].toString().padStart(2, '0')}/${deposit.depositDate[0]}`
                                    : new Date().toLocaleDateString();
                                
                                return (
                                    <div key={`deposit-${deposit.id}`} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                                        <div className="flex items-center gap-4 px-3 py-2 text-sm bg-blue-50">
                                            <Badge tone="blue">
                                                Patient Deposit#{deposit.id} ({depositDateStr})
                                            </Badge>
                                            <div className="flex-1 flex items-center gap-4">
                                                <span className="text-gray-700">with Cash:</span>
                                                <span className="font-bold text-green-600">{currency(deposit.amount)}/{currency(deposit.amount)}</span>
                                            </div>
                                            {/* Action icons: Edit, Void, Print */}
                                            <div className="ml-auto flex items-center gap-2">
                                                <IconBtn 
                                                    title="Print Deposit" 
                                                    onClick={() => printPatientDeposit(deposit.id)}
                                                >
                                                    🖨️
                                                </IconBtn>
                                                <IconBtn 
                                                    title="Edit Deposit" 
                                                    onClick={() => setEditDepositModal(deposit)}
                                                >
                                                    ✏️
                                                </IconBtn>
                                                <IconBtn 
                                                    title="Void Deposit" 
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to void deposit #${deposit.id}?`)) {
                                                            void deletePatientDeposit(deposit.id);
                                                        }
                                                    }}
                                                >
                                                    🗑️
                                                </IconBtn>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Invoices */}
                            {invoices.map((inv) => {
                                const first = inv.lines[0];
                                const claim = claims[inv.id];
                                const effectiveStatus: InvoiceStatus =
                                    (inv.status === "PAID" && Number(inv.ptBalance ?? 0) === 0 && Number(inv.insBalance ?? 0) === 0 ? "PAID" : inv.status);
                                const rowTone =
                                    effectiveStatus === "OPEN"
                                        ? "bg-red-50"
                                        : effectiveStatus === "PARTIALLY_PAID"
                                            ? "bg-amber-50"
                                            : (effectiveStatus === "PAID" ? "bg-green-50" : "bg-gray-50");
                                const ip = insPayMap[inv.id] ?? [];
                                const pp = ptPayMap[inv.id] ?? [];
                                const ptPaid = Number(inv.ptPaid) > 0 ? Number(inv.ptPaid) : sum(pp.map((p: PatientPaymentData) => Number(p.amount ?? p.payment ?? p.paid ?? 0)));
                                const insPaid = Number(inv.insPaid) > 0 ? Number(inv.insPaid) : sum(ip.map((r: InsuranceRemitLine) => Number(r.insPay ?? 0)));
                                const showInsuranceSummary = ip.length > 0;
                                const showPatientSummary = pp.length > 0;
                                return (
                                    <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm cursor-pointer" onClick={() => setSelectedInvoiceId(inv.id)}>
                                        <div className={`flex items-center gap-4 border-b px-3 py-2 text-sm ${rowTone}`}>
                                            <Badge
                                                tone={effectiveStatus === "OPEN" ? "red" : effectiveStatus === "PARTIALLY_PAID" ? "amber" : "green"}
                                            >
                                                INVOICE #{inv.id} ({first?.dos ?? "—"})
                                            </Badge>
                                            <div className="ml-2 grid flex-1 grid-cols-4 gap-3 md:grid-cols-6">
                                                <RowStat label="Pt Balance" value={currency(Number(inv.ptBalance ?? 0))} tone="red" />
                                                <RowStat label="Ins Balance" value={currency(Number(inv.insBalance ?? 0))} />
                                                <RowStat label="Invoice Balance" value={currency(Number(inv.ptBalance ?? 0) + Number(inv.insBalance ?? 0))} bold />
                                                <RowStat label="Ins WO" value={currency(Number(inv.insWO ?? inv.lines.reduce((a, l) => a + Math.max(0, Number(l.charge || 0) - Number(l.allowed || 0)), 0)))} />
                                                <RowStat label="Pt Paid" value={currency(ptPaid)} />
                                                <RowStat label="Ins Paid" value={currency(insPaid)} />
                                            </div>
                                            {/* Four action icons: Backdate, Account Adjustment, Adjustment Invoice, Statement */}
                                            <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <IconBtn title="Backdate Invoice" onClick={() => setShowBackdateFor(inv.id)}>
                                                    <span role="img" aria-label="backdate">📅</span>
                                                </IconBtn>
                                                <IconBtn title="Account Adjustment" onClick={() => setShowAccountAdjustmentFor(inv.id)}>
                                                    <span role="img" aria-label="account-adjustment">💲</span>
                                                </IconBtn>
                                                <IconBtn title="Adjustment Invoice" onClick={() => setShowAdjustmentInvoiceFor(inv.id)}>
                                                    <span role="img" aria-label="adjustment-invoice">📝</span>
                                                </IconBtn>
                                                <IconBtn 
                                                    title="Statement" 
                                                    onClick={() => void fetchPrintInvoice(inv.id)}
                                                    disabled={printInvoiceLoading}
                                                >
                                                    <span role="img" aria-label="statement">📄</span>
                                                </IconBtn>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        (() => {
                            const inv = invoices.find(i => i.id === selectedInvoiceId);
                            if (!inv) return null;
                            const first = inv.lines[0];
                            const claim = claims[inv.id];
                            const effectiveStatus: InvoiceStatus =
                                (inv.status === "PAID" && Number(inv.ptBalance ?? 0) === 0 && Number(inv.insBalance ?? 0) === 0 ? "PAID" : inv.status);
                            const rowTone =
                                effectiveStatus === "OPEN"
                                    ? "bg-red-50"
                                    : effectiveStatus === "PARTIALLY_PAID"
                                        ? "bg-amber-50"
                                        : (effectiveStatus === "PAID" ? "bg-green-50" : "bg-gray-50");
                            const ip = insPayMap[inv.id] ?? [];
                            const pp = ptPayMap[inv.id] ?? [];
                            const ptPaid = Number(inv.ptPaid) > 0 ? Number(inv.ptPaid) : sum(pp.map((p: PatientPaymentData) => Number(p.amount ?? p.payment ?? p.paid ?? 0)));
                            const insPaid = Number(inv.insPaid) > 0 ? Number(inv.insPaid) : sum(ip.map((r: InsuranceRemitLine) => Number(r.insPay ?? 0)));
                            const showInsuranceSummary = ip.length > 0;
                            const showPatientSummary = pp.length > 0;
                            return (
                                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                                    <div className="flex items-center gap-4 border-b px-3 py-2 text-sm">
                                        <button className="btn-light mr-2" onClick={() => setSelectedInvoiceId(null)}>
                                            ← Back to Invoice List
                                        </button>
                                        <Badge
                                            tone={effectiveStatus === "OPEN" ? "red" : effectiveStatus === "PARTIALLY_PAID" ? "amber" : "green"}
                                        >
                                            INVOICE #{inv.id} ({first?.dos ?? "—"})
                                        </Badge>
                                        <div className="ml-2 grid flex-1 grid-cols-4 gap-3 md:grid-cols-6">
                                            <RowStat label="Applied WO" value={currency(Number(inv.insWO ?? inv.lines.reduce((a, l) => a + Math.max(0, Number(l.charge || 0) - Number(l.allowed || 0)), 0)))} />
                                            <RowStat label="Pt Balance" value={currency(Number(inv.ptBalance ?? 0))} tone="red" />
                                            <RowStat label="Ins Balance" value={currency(Number(inv.insBalance ?? 0))} />
                                            <RowStat label="Invoice Balance" value={currency(Number(inv.ptBalance ?? 0) + Number(inv.insBalance ?? 0))} bold />
                                            <RowStat label="Pt Paid" value={currency(ptPaid)} />
                                            <RowStat label="Ins Paid" value={currency(insPaid)} />
                                        </div>
                                    </div>
                                    {/* Claim summary row (if exists) */}
                                    {claim && claim.status !== "DRAFT" ? (
                                        <>
                                            <div 
                                                className="flex items-start gap-3 border-b px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                                                onClick={() => fetchClaimLines(claim.id)}
                                            >
                                                <button
                                                    className="mr-2 p-1 rounded-full hover:bg-amber-100"
                                                    title="View/Add Notes"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenNotes(inv.id, e); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-600">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25S16.556 3.75 12 3.75 3.75 7.444 3.75 12s3.694 8.25 8.25 8.25z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-[100px] text-gray-500">{claim.createdOn || first?.dos}</div>
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-gray-600">
                                                            <b>Claim #{claim.id}</b> to <b>{claim.payerName ?? "—"}</b>
                                                            {(claim.provider || claim.treatingProviderId) && <span> | Provider: <b>{claim.provider ?? claim.treatingProviderId}</b></span>}
                                                            {claim.policyNumber && <span> | Policy: <b>{claim.policyNumber}</b></span>}
                                                            <span> :</span>
                                                            {expandedClaimId === claim.id && <span className="ml-2 text-blue-600">▼</span>}
                                                            {expandedClaimId !== claim.id && <span className="ml-2 text-gray-400">▶</span>}
                                                        </span>
                                                        <Badge tone="amber">
                                                            {claim.status === "IN_PROCESS"
                                                                ? "Claim in process"
                                                                : claim.status.replaceAll("_", " ").toLowerCase()}
                                                        </Badge>
                                                        <Badge tone="blue">Status Response (A1): Th…</Badge>
                                                    </div>
                                                </div>
                                                <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <IconBtn title="Print Claim" onClick={() => void fetchPrintEhrClaim(claim.id)} disabled={printEhrClaimLoading}>🖨️</IconBtn>
                                                    <IconBtn title="Edit" onClick={() => setShowClaimEditFor(inv.id)} disabled={claim.locked}>✏️</IconBtn>
                                                    <IconBtn title="Close Claim" onClick={() => { void closeClaim(inv.id); }} disabled={claim.locked}>✅</IconBtn>
                                                    <IconBtn title="Attachments" onClick={() => setShowAttachmentFor(inv.id)}>📎</IconBtn>
                                                    <IconBtn title="Void & Re-Create" onClick={() => setShowVoidFor(inv.id)} disabled={claim.locked}>🗑️</IconBtn>
                                                    <IconBtn title="EOB" onClick={() => setShowEobFor(inv.id)}>📄</IconBtn>
                                                    <IconBtn title="Submit Claim" onClick={() => { void submitClaim(inv.id); }} disabled={claim.locked}>📤</IconBtn>
                                                    {/* More Actions icon next to Submit Claim */}
                                                    {renderMoreActions(claim)}
                                                </div>
                                            </div>
                                            {/* Expanded Claim Lines */}
                                            {expandedClaimId === claim.id && (
                                                <div className="px-3 py-2 bg-amber-50/30 border-t">
                                                    {loadingClaimLines ? (
                                                        <div className="text-center py-4 text-gray-500">Loading claim lines...</div>
                                                    ) : claimLinesDetail.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="text-left border-b">
                                                                    <tr>
                                                                        <th className="p-2">Line ID</th>
                                                                        <th className="p-2">Date of Service</th>
                                                                        <th className="p-2">Code</th>
                                                                        <th className="p-2">Description</th>
                                                                        <th className="p-2">Provider</th>
                                                                        <th className="p-2">Total Submitted Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {claimLinesDetail.map((line) => {
                                                                        const dosStr = Array.isArray(line.dos) 
                                                                            ? `${line.dos[1].toString().padStart(2, '0')}/${line.dos[2].toString().padStart(2, '0')}/${line.dos[0]}`
                                                                            : line.dos;
                                                                        return (
                                                                            <tr key={line.lineId} className="border-b hover:bg-white">
                                                                                <td className="p-2">{line.lineId}</td>
                                                                                <td className="p-2">{dosStr}</td>
                                                                                <td className="p-2 font-mono">{line.code}</td>
                                                                                <td className="p-2">{line.description}</td>
                                                                                <td className="p-2">{line.provider}</td>
                                                                                <td className="p-2 font-semibold">{currency(line.totalSubmittedAmount)}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-gray-500">No claim lines found</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
                                            <div className="text-gray-600">No active claim yet for invoice #{inv.id}.</div>
                                            <div className="flex items-center gap-2">
                                                <button className="btn-light" onClick={() => setShowClaimComposeFor(inv.id)}>
                                                    + Add note/narrative
                                                </button>
                                                <button className="btn-primary" onClick={() => { void promoteClaim(inv.id); }}>
                                                    Create Claim
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {/* Insurance payment summary (inline, only after insurance paid) */}
                                    {showInsuranceSummary && (
                                        <>
                                            <div 
                                                className="flex items-start gap-3 border-b px-3 py-2 text-sm bg-blue-50/40 cursor-pointer hover:bg-blue-100/40"
                                                onClick={() => {
                                                    const remit = ip[0];
                                                    if (remit) fetchInsurancePaymentDetails(inv.id, remit.id);
                                                }}
                                            >
                                                <button
                                                    className="mr-2 p-1 rounded-full hover:bg-blue-100"
                                                    title="View/Add Notes"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenNotes(inv.id, e); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25S16.556 3.75 12 3.75 3.75 7.444 3.75 12s3.694 8.25 8.25 8.25z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-[100px] text-gray-500">Insurance</div>
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge tone="blue">Submitted {currency(Number(sum(ip.map(r => r.submitted))))}</Badge>
                                                        <Badge tone="gray">Allowed {currency(Number(sum(ip.map(r => r.allowed))))}</Badge>
                                                        <Badge tone="green">Paid {currency(Number(sum(ip.map(r => r.insPay))))}</Badge>
                                                        <Badge tone="purple">Write-off {currency(Number(sum(ip.map(r => r.insWriteOff))))}</Badge>
                                                        {ip[0] && expandedInsPaymentId === ip[0].id && <span className="ml-2 text-blue-600">▼</span>}
                                                        {ip[0] && expandedInsPaymentId !== ip[0].id && <span className="ml-2 text-gray-400">▶</span>}
                                                    </div>
                                                </div>
                                                <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <IconBtn title="Void Insurance Payment" onClick={() => {
                                                        const remit = ip[0];
                                                        if (remit) void voidInsurancePayment(inv.id, remit.id, "Payer reversal / posted in error");
                                                    }}>
                                                        <span role="img" aria-label="void">🚫</span>
                                                    </IconBtn>
                                                    <IconBtn title="Edit Insurance Payment" onClick={() => {
                                                        const remit = ip[0];
                                                        if (remit) setEditInsuranceModal({ invoiceId: inv.id, remit });
                                                    }}>
                                                        <span role="img" aria-label="edit">✏️</span>
                                                    </IconBtn>
                                                    <IconBtn title="Refund Insurance Payment" onClick={() => {
                                                        const remit = ip[0];
                                                        if (remit) void refundInsurancePayment(inv.id, remit.id, 10, "Overpayment per EOB");
                                                    }}>
                                                        <span role="img" aria-label="refund">⋯</span>
                                                    </IconBtn>
                                                    <IconBtn title="Transfer Credit to Patient" onClick={() => {
                                                        const remit = ip[0];
                                                        if (remit) void transferInsuranceCreditToPatient(inv.id, remit.id, 20, "Move insurance overpay to patient account credit");
                                                    }}>
                                                        <span role="img" aria-label="transfer">🔁</span>
                                                    </IconBtn>
                                                </div>
                                            </div>
                                            {/* Expanded Insurance Payment Details */}
                                            {ip[0] && expandedInsPaymentId === ip[0].id && insPaymentDetail && (
                                                <div className="px-3 py-2 bg-blue-50/20 border-t">
                                                    {loadingInsPaymentDetail ? (
                                                        <div className="text-center py-4 text-gray-500">Loading payment details...</div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Payment Date</div>
                                                                    <div className="font-medium">
                                                                        {Array.isArray(insPaymentDetail.paymentDate) 
                                                                            ? `${insPaymentDetail.paymentDate[1].toString().padStart(2, '0')}/${insPaymentDetail.paymentDate[2].toString().padStart(2, '0')}/${insPaymentDetail.paymentDate[0]}`
                                                                            : insPaymentDetail.paymentDate}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Cheque Number</div>
                                                                    <div className="font-medium">{insPaymentDetail.chequeNumber || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Bank/Branch</div>
                                                                    <div className="font-medium">{insPaymentDetail.bankBranchNumber || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Invoice #</div>
                                                                    <div className="font-medium">{insPaymentDetail.invoiceNumber}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Ins Writeoff</div>
                                                                    <div className="font-medium">{currency(insPaymentDetail.insWriteoff)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Patient Amount</div>
                                                                    <div className="font-medium">{currency(insPaymentDetail.patientAmount)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Insurance Amount</div>
                                                                    <div className="font-medium text-green-600">{currency(insPaymentDetail.insuranceAmount)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Previous Balance</div>
                                                                    <div className="font-medium">{currency(insPaymentDetail.previousTotalBalance)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Payment Amount</div>
                                                                    <div className="font-medium text-blue-600">{currency(insPaymentDetail.paymentAmount)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Applied WO</div>
                                                                    <div className="font-medium">{currency(insPaymentDetail.appliedWO)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Pt Paid</div>
                                                                    <div className="font-medium">{currency(insPaymentDetail.ptPaid)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Ins Paid</div>
                                                                    <div className="font-medium">{currency(insPaymentDetail.insPaid)}</div>
                                                                </div>
                                                            </div>
                                                            {insPaymentDetail.lineDetails && insPaymentDetail.lineDetails.length > 0 && (
                                                                <div className="overflow-x-auto mt-3">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead className="text-left border-b">
                                                                            <tr>
                                                                                <th className="p-2">Line ID</th>
                                                                                <th className="p-2">Description</th>
                                                                                <th className="p-2">Provider</th>
                                                                                <th className="p-2">Amount</th>
                                                                                <th className="p-2">Patient</th>
                                                                                <th className="p-2">Insurance</th>
                                                                                <th className="p-2">Previous Balance</th>
                                                                                <th className="p-2">Payment</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {insPaymentDetail.lineDetails.map((line, idx) => (
                                                                                <tr key={idx} className="border-b hover:bg-white">
                                                                                    <td className="p-2">{line.lineId}</td>
                                                                                    <td className="p-2">{line.description}</td>
                                                                                    <td className="p-2">{line.providerName}</td>
                                                                                    <td className="p-2">{currency(line.amount)}</td>
                                                                                    <td className="p-2">{currency(line.patient)}</td>
                                                                                    <td className="p-2">{currency(line.insurance)}</td>
                                                                                    <td className="p-2">{currency(line.previousBalance)}</td>
                                                                                    <td className="p-2 font-semibold">{currency(line.payment)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {/* Credit Adjustment Row */}
                                            <div className="flex items-start gap-3 border-b px-3 py-2 text-sm bg-white" onMouseEnter={() => !creditAdjustmentDetail && fetchCreditAdjustmentDetails(inv.id, false)}>
                                                <button
                                                    className="mr-2 p-1 rounded-full hover:bg-gray-100"
                                                    title="View/Add Notes"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenNotes(inv.id, e); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25S16.556 3.75 12 3.75 3.75 7.444 3.75 12s3.694 8.25 8.25 8.25z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-[100px] text-gray-500">{creditAdjustmentDetail?.date || ''}</div>
                                                <div className="flex-1 cursor-pointer" onClick={() => fetchCreditAdjustmentDetails(inv.id)}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-700">Credit Adjustment #{creditAdjustmentDetail?.id || ''}: <span className="text-blue-600">Write Off</span>{currency(creditAdjustmentDetail?.writeOffAmount || creditAdjustmentDetail?.insWriteoff || 0)}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-semibold">{currency(creditAdjustmentDetail?.endConcernAmount || creditAdjustmentDetail?.amount || 0)}</span>
                                                            <span className="text-gray-500">ARO</span>
                                                            <button className="p-1">
                                                                {expandedCreditAdjustmentId === inv.id ? (
                                                                    <span className="text-blue-600">▼</span>
                                                                ) : (
                                                                    <span className="text-gray-400">▶</span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {expandedCreditAdjustmentId === inv.id && creditAdjustmentDetail && (
                                                <div className="px-3 py-2 bg-gray-50 border-t">
                                                    {loadingCreditAdjustment ? (
                                                        <div className="text-center py-4 text-gray-500">Loading credit adjustment...</div>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="text-left border-b">
                                                                    <tr>
                                                                        <th className="p-2">Code</th>
                                                                        <th className="p-2">Treatment</th>
                                                                        <th className="p-2">Ins. Writeoff</th>
                                                                        <th className="p-2">Pt. Portion</th>
                                                                        <th className="p-2">In. Portion</th>
                                                                        <th className="p-2">Total Charge</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {creditAdjustmentDetail.lines?.map((line: any, idx: number) => (
                                                                        <tr key={idx} className="border-b hover:bg-white">
                                                                            <td className="p-2 font-mono">{line.code}</td>
                                                                            <td className="p-2">{line.treatment}</td>
                                                                            <td className="p-2">{currency(line.insWriteoff || 0)}</td>
                                                                            <td className="p-2">{currency(line.ptPortion || 0)}</td>
                                                                            <td className="p-2">{currency(line.inPortion || 0)}</td>
                                                                            <td className="p-2 font-semibold">{currency(line.totalCharge || 0)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {/* Transfer of Credit Row */}
                                            <div className="flex items-start gap-3 border-b px-3 py-2 text-sm bg-white" onMouseEnter={() => !transferOfCreditDetail && fetchTransferOfCreditDetails(inv.id, false)}>
                                                <button
                                                    className="mr-2 p-1 rounded-full hover:bg-gray-100"
                                                    title="View/Add Notes"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenNotes(inv.id, e); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25S16.556 3.75 12 3.75 3.75 7.444 3.75 12s3.694 8.25 8.25 8.25z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-[100px] text-gray-500">{transferOfCreditDetail?.date || ''}</div>
                                                <div className="flex-1 cursor-pointer" onClick={() => fetchTransferOfCreditDetails(inv.id)}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-700">Transfer of credits #{transferOfCreditDetail?.transferCreditId || transferOfCreditDetail?.id || ''}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-semibold">{currency(transferOfCreditDetail?.endConcernAmount || transferOfCreditDetail?.amount || 0)}</span>
                                                            <span className="text-gray-500">ARO</span>
                                                            <button className="p-1">
                                                                {expandedTransferOfCreditId === inv.id ? (
                                                                    <span className="text-blue-600">▼</span>
                                                                ) : (
                                                                    <span className="text-gray-400">▶</span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {expandedTransferOfCreditId === inv.id && transferOfCreditDetail && (
                                                <div className="px-3 py-2 bg-gray-50 border-t">
                                                    {loadingTransferOfCredit ? (
                                                        <div className="text-center py-4 text-gray-500">Loading transfer of credit...</div>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="text-left border-b">
                                                                    <tr>
                                                                        <th className="p-2">Code</th>
                                                                        <th className="p-2">Treatment</th>
                                                                        <th className="p-2">Ins. Writeoff</th>
                                                                        <th className="p-2">Pt. Portion</th>
                                                                        <th className="p-2">In. Portion</th>
                                                                        <th className="p-2">Total Charge</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {transferOfCreditDetail.lines?.map((line: any, idx: number) => (
                                                                        <tr key={idx} className="border-b hover:bg-white">
                                                                            <td className="p-2 font-mono">{line.code}</td>
                                                                            <td className="p-2">{line.treatment}</td>
                                                                            <td className="p-2">{currency(line.insWriteoff || 0)}</td>
                                                                            <td className="p-2">{currency(line.ptPortion || 0)}</td>
                                                                            <td className="p-2">{currency(line.inPortion || 0)}</td>
                                                                            <td className="p-2 font-semibold">{currency(line.totalCharge || 0)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {/* Patient payment summary (inline, only after insurance paid) */}
                                    {showPatientSummary && (
                                        <>
                                            <div 
                                                className="flex items-start gap-3 border-b px-3 py-2 text-sm bg-purple-50/40 cursor-pointer hover:bg-purple-100/40"
                                                onClick={() => {
                                                    const pay = pp[0];
                                                    if (pay) fetchPatientPaymentDetails(inv.id, pay.id);
                                                }}
                                            >
                                                <button
                                                    className="mr-2 p-1 rounded-full hover:bg-purple-100"
                                                    title="View/Add Notes"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenNotes(inv.id, e); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-600">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25S16.556 3.75 12 3.75 3.75 7.444 3.75 12s3.694 8.25 8.25 8.25z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-[100px] text-gray-500">Patient</div>
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge tone="green">Payments {currency(sum(pp.map((p: PatientPaymentData) => Number(p.amount ?? p.payment ?? p.paid ?? 0))) )}</Badge>
                                                        <Badge tone="gray">{pp.length} entr{pp.length === 1 ? "y" : "ies"}</Badge>
                                                        {pp[0] && expandedPtPaymentId === pp[0].id && <span className="ml-2 text-purple-600">▼</span>}
                                                        {pp[0] && expandedPtPaymentId !== pp[0].id && <span className="ml-2 text-gray-400">▶</span>}
                                                    </div>
                                                </div>
                                                <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <IconBtn title="Void Patient Payment" onClick={() => {
                                                        const pay = pp[0];
                                                        if (pay) void voidPatientPayment(inv.id, pay.id, "Duplicate collection at front desk");
                                                    }}>
                                                        <span role="img" aria-label="void">🚫</span>
                                                    </IconBtn>
                                                    <IconBtn title="Edit Patient Payment" onClick={() => {
                                                        const pay = pp[0];
                                                        if (pay) setEditPatientModal({ invoiceId: inv.id, payment: { id: pay.id, amount: Number(pay.amount ?? pay.payment ?? pay.paid ?? 0), paymentMethod: pay.paymentMethod } });
                                                    }}>
                                                        <span role="img" aria-label="edit">✏️</span>
                                                    </IconBtn>
                                                    <IconBtn title="Refund Patient Payment" onClick={() => {
                                                        const pay = pp[0];
                                                        if (pay) void refundPatientPayment(inv.id, pay.id, 10, "Partial refund");
                                                    }}>
                                                        <span role="img" aria-label="refund">⋯</span>
                                                    </IconBtn>
                                                    <IconBtn title="Transfer Credit to Patient" onClick={() => {
                                                        const pay = pp[0];
                                                        if (pay) setShowTransferCreditModal({ invoiceId: inv.id, payment: pay });
                                                    }}>
                                                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M10 2V18M10 18L5 13M10 18L15 13" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </IconBtn>
                                                </div>
                                            </div>
                                            {/* Expanded Patient Payment Details */}
                                            {pp[0] && expandedPtPaymentId === pp[0].id && ptPaymentDetail && (
                                                <div className="px-3 py-2 bg-purple-50/20 border-t">
                                                    {loadingPtPaymentDetail ? (
                                                        <div className="text-center py-4 text-gray-500">Loading payment details...</div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Payment Date</div>
                                                                    <div className="font-medium">
                                                                        {Array.isArray(ptPaymentDetail.paymentDate) 
                                                                            ? `${ptPaymentDetail.paymentDate[1].toString().padStart(2, '0')}/${ptPaymentDetail.paymentDate[2].toString().padStart(2, '0')}/${ptPaymentDetail.paymentDate[0]}`
                                                                            : ptPaymentDetail.paymentDate}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Payment Method</div>
                                                                    <div className="font-medium">{ptPaymentDetail.paymentMethod || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Cheque Number</div>
                                                                    <div className="font-medium">{ptPaymentDetail.chequeNumber || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Bank/Branch</div>
                                                                    <div className="font-medium">{ptPaymentDetail.bankBranchNumber || '—'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Invoice #</div>
                                                                    <div className="font-medium">{ptPaymentDetail.invoiceNumber}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Patient Amount</div>
                                                                    <div className="font-medium text-purple-600">{currency(ptPaymentDetail.patientAmount)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Previous Balance</div>
                                                                    <div className="font-medium">{currency(ptPaymentDetail.previousTotalBalance)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Payment Amount</div>
                                                                    <div className="font-medium text-green-600">{currency(ptPaymentDetail.paymentAmount)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Pt His</div>
                                                                    <div className="font-medium">{currency(ptPaymentDetail.ptHis)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Ins Paid</div>
                                                                    <div className="font-medium">{currency(ptPaymentDetail.insPaid)}</div>
                                                                </div>
                                                            </div>
                                                            {ptPaymentDetail.lineDetails && ptPaymentDetail.lineDetails.length > 0 && (
                                                                <div className="overflow-x-auto mt-3">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead className="text-left border-b">
                                                                            <tr>
                                                                                <th className="p-2">Line ID</th>
                                                                                <th className="p-2">Description</th>
                                                                                <th className="p-2">Provider</th>
                                                                                <th className="p-2">Amount</th>
                                                                                <th className="p-2">Patient</th>
                                                                                <th className="p-2">Insurance</th>
                                                                                <th className="p-2">Previous Balance</th>
                                                                                <th className="p-2">Payment</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {ptPaymentDetail.lineDetails.map((line, idx) => (
                                                                                <tr key={idx} className="border-b hover:bg-white">
                                                                                    <td className="p-2">{line.lineId}</td>
                                                                                    <td className="p-2">{line.description}</td>
                                                                                    <td className="p-2">{line.providerName}</td>
                                                                                    <td className="p-2">{currency(line.amount)}</td>
                                                                                    <td className="p-2">{currency(line.patient)}</td>
                                                                                    <td className="p-2">{currency(line.insurance)}</td>
                                                                                    <td className="p-2">{currency(line.previousBalance)}</td>
                                                                                    <td className="p-2 font-semibold">{currency(line.payment)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {/* Courtesy credit summary (inline, shown for each courtesy credit applied) */}
                                    {(() => {
                                        const cc = courtesyCreditsMap[inv.id] ?? [];
                                        if (cc.length === 0) return null;
                                        return cc.map((courtesy) => (
                                            <div key={courtesy.id} className="flex items-start gap-3 border-b px-3 py-2 text-sm bg-amber-50/40">
                                                <button
                                                    className="mr-2 p-1 rounded-full hover:bg-amber-100"
                                                    title="View/Add Notes"
                                                    onClick={e => handleOpenNotes(inv.id, e)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-600">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25S16.556 3.75 12 3.75 3.75 7.444 3.75 12s3.694 8.25 8.25 8.25z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-[100px] text-gray-500">
                                                    {courtesy.createdAt ? new Date(courtesy.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-gray-700">
                                                            <b>Courtesy Credit Adjustment #{courtesy.id}:</b> {courtesy.adjustmentType}
                                                        </span>
                                                        <Badge tone="amber">{currency(Number(courtesy.amount))}</Badge>
                                                        {courtesy.description && <Badge tone="gray">{courtesy.description}</Badge>}
                                                        {!courtesy.isActive && <Badge tone="red">Voided</Badge>}
                                                    </div>
                                                </div>
                                                <div className="ml-auto flex items-center gap-2">
                                                    {courtesy.isActive !== false && (
                                                        <>
                                                            <IconBtn title="Edit Courtesy Credit" onClick={() => {
                                                                setEditCourtesyModal({ invoiceId: inv.id, courtesy });
                                                            }}>
                                                                <span role="img" aria-label="edit">✏️</span>
                                                            </IconBtn>
                                                            <IconBtn title="Void Courtesy Credit" onClick={() => {
                                                                if (confirm('Are you sure you want to void this courtesy credit? This will remove it from the invoice.')) {
                                                                    void removeCourtesyCredit(inv.id, "Voided by user");
                                                                }
                                                            }}>
                                                                <span role="img" aria-label="void">🚫</span>
                                                            </IconBtn>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                    {/* Mini invoice line row */}
                                    {first && (
                                        <>
                                            <div 
                                                className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                                                onClick={() => fetchInvoiceLines(inv.id)}
                                            >
                                                <button
                                                    className="mr-2 p-1 rounded-full hover:bg-gray-100"
                                                    title="View/Add Notes"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenNotes(inv.id, e); }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25S16.556 3.75 12 3.75 3.75 7.444 3.75 12s3.694 8.25 8.25 8.25z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-[100px] text-gray-500">{first.dos}</div>
                                                <div className="flex-1">
                                                    <span className="text-gray-700">
                                                        Invoice #{inv.id}: [ {first.treatment} ] <b>{currency(Number(first.charge ?? 0))}</b>
                                                        {expandedInvoiceId === inv.id && <span className="ml-2 text-blue-600">▼</span>}
                                                        {expandedInvoiceId !== inv.id && <span className="ml-2 text-gray-400">▶</span>}
                                                    </span>
                                                </div>
                                                <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <IconBtn title="Print" onClick={() => void fetchPrintInvoice(inv.id)} disabled={printInvoiceLoading}>🖨️</IconBtn>
                                                    <IconBtn title="Edit" onClick={() => setShowEditLinesFor(inv.id)}>✏️</IconBtn>
                                                    <IconBtn title="Transfer Outstanding" onClick={() => setTransferOpenFor(inv.id)}>🔁</IconBtn>
                                                    <IconBtn title="Adjustment" onClick={() => setShowAdjustmentInvoiceFor(inv.id)}>➖</IconBtn>
                                                    <IconBtn title="Delete Invoice" onClick={() => deleteInvoice(inv.id)}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-600">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                        </svg>
                                                    </IconBtn>
                                                </div>
                                            </div>
                                            {/* Expanded Invoice Lines */}
                                            {expandedInvoiceId === inv.id && (
                                                <div className="px-3 py-2 bg-gray-50 border-t">
                                                    {loadingInvoiceLines ? (
                                                        <div className="text-center py-4 text-gray-500">Loading invoice lines...</div>
                                                    ) : invoiceLinesDetail.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="text-left border-b">
                                                                    <tr>
                                                                        <th className="p-2">Date of Service</th>
                                                                        <th className="p-2">Code</th>
                                                                        <th className="p-2">Treatment</th>
                                                                        <th className="p-2">Provider</th>
                                                                        <th className="p-2">Charge</th>
                                                                        <th className="p-2">Allowed</th>
                                                                        <th className="p-2">Ins Write-Off</th>
                                                                        <th className="p-2">Ins Portion</th>
                                                                        <th className="p-2">Patient Portion</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {invoiceLinesDetail.map((line) => {
                                                                        const dosStr = Array.isArray(line.dos) 
                                                                            ? `${line.dos[1].toString().padStart(2, '0')}/${line.dos[2].toString().padStart(2, '0')}/${line.dos[0]}`
                                                                            : line.dos;
                                                                        return (
                                                                            <tr key={line.id} className="border-b hover:bg-white">
                                                                                <td className="p-2">{dosStr}</td>
                                                                                <td className="p-2 font-mono">{line.code}</td>
                                                                                <td className="p-2">{line.treatment}</td>
                                                                                <td className="p-2">{line.provider}</td>
                                                                                <td className="p-2 font-semibold">{currency(line.charge)}</td>
                                                                                <td className="p-2">{currency(line.allowed ?? 0)}</td>
                                                                                <td className="p-2">{currency(line.insWriteOff ?? 0)}</td>
                                                                                <td className="p-2">{currency(line.insPortion ?? 0)}</td>
                                                                                <td className="p-2">{currency(line.patientPortion ?? 0)}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-gray-500">No invoice lines found</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {transferOpenFor === inv.id && (
                                        <div className="relative">
                                            <div className="absolute z-10 ml-3 mt-2 w-64 rounded-md border bg-white p-1 shadow">
                                                <button className="w-full rounded px-3 py-2 text-left hover:bg-gray-50" onClick={() => { transferOutstandingToPatient(inv.id, Number(inv.insBalance ?? 0)); setTransferOpenFor(null); }}>
                                                    Transfer Outstanding To Patient
                                                </button>
                                                <button className="w-full rounded px-3 py-2 text-left hover:bg-gray-50" onClick={() => { transferOutstandingToInsurance(inv.id, Number(inv.ptBalance ?? 0)); setTransferOpenFor(null); }}>
                                                    Transfer Outstanding To Insurance
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    )}
                </div>
            )}

            {/* Notes Modal for invoice notes */}
            <NotesModal
                open={!!showNotesFor}
                invoiceId={showNotesFor?.invoiceId ?? 0}
                onClose={handleCloseNotes}
                notes={currentNotes}
                editingNote={editingNote}
                onSave={handleSaveNote}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
            />

            {/* Add modal for Change Claim Status */}
            {showStatusModal && statusModalClaim && <StatusModal claim={statusModalClaim} onClose={() => setShowStatusModal(false)} />}
            
            {/* Add modal for Submit Attachments */}
            {showAttachmentConfirm && attachmentClaim && (
                <AttachmentConfirmModal
                    claim={attachmentClaim}
                    onClose={() => setShowAttachmentConfirm(false)}
                    onOk={() => {
                        setShowAttachmentConfirm(false);
                        setShowAttachmentModal(true);
                    }}
                />
            )}
            {showAttachmentModal && attachmentClaim && <AttachmentModal claim={attachmentClaim} onClose={() => setShowAttachmentModal(false)} />}

            {/* Print Invoice Statement Modal */}
            {showPrintInvoice && printInvoiceData && (
                <PrintInvoiceModal 
                    data={printInvoiceData} 
                    onClose={() => {
                        setShowPrintInvoice(false);
                        setPrintInvoiceData(null);
                    }} 
                />
            )}

            {/* ================= CLAIM TAB ================= */}
            {tab === "CLAIM" && selectedInvoice && selectedClaim && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <div>
                                <span className="font-semibold">Claim #{selectedClaim.id}</span>
                                {" · For "}
                                <span className="font-semibold">{patientName}</span>
                                {" · To "}
                                <span className="font-semibold">{selectedClaim.payerName ?? "—"}</span>
                                {((selectedClaim.provider || selectedClaim.treatingProviderId)) && (
                                    <span> | Provider: <b>{selectedClaim.provider ?? selectedClaim.treatingProviderId}</b></span>
                                )}
                                {selectedClaim.policyNumber && (
                                    <span> | Policy: <b>{selectedClaim.policyNumber}</b></span>
                                )}
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <button className="btn-light" onClick={() => setShowClaimComposeFor(selectedInvoice.id)}>
                                    + Add note/narrative
                                </button>
                                <button className="btn-primary" onClick={() => { void sendToBatch(selectedInvoice.id); }}>
                                    Send to Batch
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-amber-800">
                            This claim will be split into multiple claims unless you specify a treating provider.
                        </div>
                    </div>
                    <SectionCard
                        title={`Claim #${selectedClaim.id}`}
                        actions={
                            <div className="flex gap-2">
                                <button className="btn-light" onClick={() => window.print()}>Print</button>
                                <button className="btn-light" onClick={() => setShowClaimEditFor(selectedInvoice.id)}>Edit</button>
                                <button className="btn-light" onClick={() => { void closeClaim(selectedInvoice.id); }}>Close Claim</button>
                                <button
                                    className="btn-light"
                                    title={selectedClaim.attachments ? "" : "No Attachments"}
                                    onClick={() => setShowAttachmentFor(selectedInvoice.id)}
                                />
                                <button className="btn-light" onClick={() => setShowEobFor(selectedInvoice.id)}>EOB</button>
                                <button className="btn-danger" onClick={() => setShowVoidFor(selectedInvoice.id)}>
                                    Void & Re-Create
                                </button>
                            </div>
                        }
                    >
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <div>
                                {" "}
                                Status: <Badge tone="blue">{selectedClaim.status.replaceAll("_", " ").toLowerCase()}</Badge>
                            </div>
                            <div>
                                {" "}
                                Type: <Badge tone="gray">{(selectedClaim.type ?? "Electronic").toString().toLowerCase()}</Badge>
                            </div>
                            <div>
                                {" "}
                                Attachments: <Badge tone="gray">{String(selectedClaim.attachments)}</Badge>
                            </div>
                            <div>
                                {" "}
                                EOB: {selectedClaim.eobAttached ? <Badge tone="green">attached</Badge> : <Badge tone="gray">none</Badge>} {" "}
                            </div>
                            <div className="ml-auto">
                                <button className="btn-primary" onClick={() => { void submitClaim(selectedInvoice.id); }}>
                                    Submit Claim
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* ============ INSURANCE PAYMENT ============ */}
            {tab === "INS" && selectedInvoice && (
                <SectionCard
                    title={`Add Payment (Insurance) — Invoice #${selectedInvoice.id}`}
                    actions={
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Cheque #</label>
                            <input
                                className="input"
                                placeholder="e.g., 0037089513"
                                value={cheque.number}
                                onChange={(e) => setCheque((c) => ({ ...c, number: e.target.value }))}
                            />
                            <label className="text-sm text-gray-600">Bank/Branch #</label>
                            <input
                                className="input"
                                placeholder="…"
                                value={cheque.bankBranch}
                                onChange={(e) => setCheque((c) => ({ ...c, bankBranch: e.target.value }))}
                            />
                            <button className="btn-primary" onClick={() => { void applyInsurancePayment(); }}>
                                Apply
                            </button>
                        </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-left">
                            <tr className="border-b">
                                <th className="p-2">Code</th>
                                <th className="p-2">Submitted</th>
                                <th className="p-2">Balance</th>
                                <th className="p-2">Deductible</th>
                                <th className="p-2">Allowed</th>
                                <th className="p-2">Ins WO</th>
                                <th className="p-2">Ins Pay</th>
                                <th className="p-2">Pt Resp / Options</th>
                            </tr>
                            </thead>
                            <tbody>
                            {selectedInvoice.lines.map((l, idx) => {
                                const r = remits[idx];
                                const submitted = Number(r?.submitted || 0);
                                const allowed = Number(r?.allowed || 0);
                                const writeOff = Math.max(0, submitted - allowed);
                                const insPay = Number(r?.insPay || 0);
                                const patientResp = Math.max(0, allowed - insPay);
                                return (
                                    <tr key={l.id} className="border-b">
                                        <td className="p-2 font-mono">{l.code}</td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="input w-28 bg-gray-50"
                                                value={r?.submitted ?? 0}
                                                readOnly
                                                title="Submitted (read-only)"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="input w-24"
                                                value={r?.balance ?? 0}
                                                onChange={(e) =>
                                                    setRemits((arr) =>
                                                        arr.map((x, i) => (i === idx ? { ...x, balance: +e.target.value } : x))
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="input w-24"
                                                value={r?.deductible ?? 0}
                                                onChange={(e) =>
                                                    setRemits((arr) =>
                                                        arr.map((x, i) => (i === idx ? { ...x, deductible: +e.target.value } : x))
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="input w-24"
                                                value={r?.allowed ?? 0}
                                                onChange={(e) =>
                                                    setRemits((arr) =>
                                                        arr.map((x, i) => (i === idx ? { ...x, allowed: +e.target.value } : x))
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="input w-24 bg-green-50 text-green-700 font-semibold"
                                                value={writeOff}
                                                readOnly
                                                title="Write-off (Auto-calculated: Submitted - Allowed)"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="input w-24"
                                                value={r?.insPay ?? 0}
                                                onChange={(e) =>
                                                    setRemits((arr) =>
                                                        arr.map((x, i) => (i === idx ? { ...x, insPay: +e.target.value } : x))
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="p-2">
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="number"
                                                    className="input w-24 bg-gray-50"
                                                    value={patientResp}
                                                    readOnly
                                                    title="Patient Responsibility (Auto-calculated: Allowed - Ins Pay)"
                                                />
                                                <div className="flex items-center gap-3 text-xs">
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={r?.updateAllowed ?? false}
                                                            onChange={(e) =>
                                                                setRemits((arr) =>
                                                                    arr.map((x, i) => (i === idx ? { ...x, updateAllowed: e.target.checked } : x))
                                                                )
                                                            }
                                                        />
                                                        Update allowed
                                                    </label>
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={r?.updateFlatPortion ?? false}
                                                            onChange={(e) =>
                                                                setRemits((arr) =>
                                                                    arr.map((x, i) => (i === idx ? { ...x, updateFlatPortion: e.target.checked } : x))
                                                                )
                                                            }
                                                        />
                                                        Update Flat
                                                    </label>
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={r?.applyWriteoff ?? false}
                                                            onChange={(e) =>
                                                                setRemits((arr) =>
                                                                    arr.map((x, i) => (i === idx ? { ...x, applyWriteoff: e.target.checked } : x))
                                                                )
                                                            }
                                                        />
                                                        Apply WO
                                                    </label>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                        Note: In multiple coverage scenarios, primary write-off may be deferred until final EOB.
                    </div>
                </SectionCard>
            )}

            {/* ============ PATIENT PAYMENT ============ */}
            {tab === "PATIENT" && selectedInvoice && (
                <div className="space-y-4">
                    {outstanding <= 0 && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800">
                            {/* There is no outstanding balance on the patient’s account. Please add as a deposit. */}
                        </div>
                    )}

                    <SectionCard
                        title={`Add Payment (Patient) — Invoice #${selectedInvoice.id}`}
                        actions={
                            <div className="flex items-center gap-2">
                                <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                                    <option value="CREDIT_CARD">Credit Card</option>
                                    <option value="CHECK">Check</option>
                                    <option value="DEBIT_CARD">Debit Card (debit)</option>
                                    <option value="EFT">EFT</option>
                                    <option value="CASH">Cash</option>
                                    <option value="CARE_CREDIT">Care Credit</option>
                                    <option value="MASTERCARD">Master Card</option>
                                    <option value="VISA">Visa</option>
                                    <option value="DISCOVER">Discover</option>
                                    <option value="AMEX">Amex</option>
                                </select>
                                <button className="btn-primary" onClick={() => { void applyPatientPayment(); }}>
                                    Apply
                                </button>
                            </div>
                        }
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-left">
                                <tr className="border-b">
                                    <th className="p-2">Invoice</th>
                                    <th className="p-2">Line</th>
                                    <th className="p-2">Charge</th>
                                    <th className="p-2">Payment</th>
                                </tr>
                                </thead>
                                <tbody>
                                {selectedInvoice.lines.map((l, idx) => (
                                    <tr key={l.id} className="border-b">
                                        <td className="p-2">#{selectedInvoice.id}</td>
                                        <td className="p-2">
                                            {l.code} — {l.treatment}
                                        </td>
                                        <td className="p-2">{currency(Number(l.charge ?? 0))}</td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="input w-32"
                                                value={allocs[idx]?.amount ?? 0}
                                                onChange={(e) =>
                                                    setAllocs((arr) => arr.map((a, i) => (i === idx ? { ...a, amount: +e.target.value } : a)))
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td className="p-2 font-medium" colSpan={3}>
                                        Overpayment:
                                    </td>
                                    <td className="p-2 font-semibold">{currency(overpay)}</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" /> Generate Statement
                            </label>
                            <div className="text-gray-700">
                                Entered: <span className="font-semibold">{currency(entered)}</span> · Outstanding:{" "}
                                <span className="font-semibold">{currency(outstanding)}</span>
                            </div>
                        </div>
                    </SectionCard>

                    <div className="rounded-xl border border-purple-300 bg-purple-50 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-purple-900">
                                Account Credit: <b>{currency(Number(accountCredit.balance ?? 0))}</b>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="btn-light"
                                    onClick={() => {
                                        void applyAccountCredit(Math.min(Number(accountCredit.balance ?? 0), Number(outstanding ?? 0)));
                                    }}
                                >
                                    Apply to open balance
                                </button>
                                <button className="btn-light" onClick={() => { void applyAccountCredit(0); }}>
                                    Keep as account credit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======= MODALS ======= */}
            {/* Backdate Transaction Modal */}
            {showBackdateFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-blue-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Backdate Transaction</h4>
                            <button onClick={() => setShowBackdateFor(null)} className="rounded p-1 hover:bg-blue-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-sm text-gray-600">Backdate to:</div>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="date" 
                                    id="backdate-input"
                                    className="input flex-1" 
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="btn-light" style={{background: '#f59e0b', color: 'white', borderColor: '#f59e0b'}} onClick={async () => {
                                    const dateInput = document.getElementById('backdate-input') as HTMLInputElement;
                                    const backdate = dateInput?.value;
                                    if (!backdate || !showBackdateFor) return;
                                    try {
                                        await backdateInvoice(showBackdateFor, backdate);
                                        alert(`Invoice #${showBackdateFor} backdated to ${backdate}`);
                                    } catch (err) {
                                        alert("Error: " + (err as Error).message);
                                    }
                                    setShowBackdateFor(null);
                                }}>
                                    Backdate Transaction
                                </button>
                                <button className="btn-light" onClick={() => setShowBackdateFor(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Adjustment Modal */}
            {showAccountAdjustmentFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-purple-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Account Adjustment</h4>
                            <button onClick={() => setShowAccountAdjustmentFor(null)} className="rounded p-1 hover:bg-purple-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <label className="label flex-shrink-0">Adjustment Type</label>
                                <select id="acct-adj-type" className="input flex-1" defaultValue="Un-Collected">
                                    <option value="Un-Collected">Un-Collected</option>
                                    <option value="Professional Courtesy">Professional Courtesy</option>
                                    <option value="Migrated">Migrated</option>
                                    <option value="MembershipPlan">MembershipPlan</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="label flex-shrink-0">Flat rate</label>
                                <input type="radio" name="adj-method" value="flat" defaultChecked />
                                <label className="label flex-shrink-0 ml-4">Total Outstanding</label>
                                <input type="number" id="acct-adj-total" className="input w-32" placeholder="$0.00" />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="label flex-shrink-0">Patient Outstanding</label>
                                <input type="number" id="acct-adj-patient" className="input w-32" placeholder="$0.00" />
                                <label className="label flex-shrink-0 ml-4">Specific</label>
                                <input type="radio" name="adj-method" value="specific" />
                                <input type="number" className="input w-20" placeholder="$0" />
                            </div>
                            <div className="mt-2">
                                <input type="checkbox" id="include-courtesy" />
                                <label htmlFor="include-courtesy" className="ml-2 text-sm">Include the Courtesy Credit ($0.00)</label>
                            </div>
                            <div className="mt-2">
                                <label className="label">+ Add description</label>
                                <textarea id="acct-adj-desc" className="input w-full h-20" placeholder="Add description..."></textarea>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="btn-primary" onClick={async () => {
                                    const type = (document.getElementById('acct-adj-type') as HTMLSelectElement)?.value;
                                    const flatRate = Number((document.getElementById('acct-adj-total') as HTMLInputElement)?.value);
                                    const specificAmount = Number((document.getElementById('acct-adj-patient') as HTMLInputElement)?.value);
                                    const description = (document.getElementById('acct-adj-desc') as HTMLTextAreaElement)?.value;
                                    const includeCourtesyCredit = (document.getElementById('include-courtesy') as HTMLInputElement)?.checked;
                                    if (!type || (!flatRate && !specificAmount) || !showAccountAdjustmentFor) return;
                                    try {
                                        await accountAdjustment({ adjustmentType: type, flatRate, specificAmount, description, includeCourtesyCredit });
                                        alert(`Account adjustment applied: ${type}`);
                                    } catch (err) {
                                        alert("Error: " + (err as Error).message);
                                    }
                                    setShowAccountAdjustmentFor(null);
                                }}>
                                    Apply
                                </button>
                                <button className="btn-light" onClick={() => setShowAccountAdjustmentFor(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjustment Invoice Modal */}
            {showAdjustmentInvoiceFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => {
                    if (e.target === e.currentTarget) setShowAdjustmentInvoiceFor(null);
                }}>
                    <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-purple-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Adjust Invoice #{showAdjustmentInvoiceFor}</h4>
                            <button onClick={() => setShowAdjustmentInvoiceFor(null)} className="rounded p-1 hover:bg-purple-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="text-sm">{new Date().toLocaleDateString()}</div>
                                <div className="text-sm">Credit Adjustment <span className="font-semibold">#27943</span> type</div>
                                <select id="adj-invoice-type" className="input" defaultValue="Un-Collected">
                                    <option value="Un-Collected">Un-Collected</option>
                                    <option value="Professional Courtesy">Professional Courtesy</option>
                                    <option value="Migrated">Migrated</option>
                                    <option value="MembershipPlan">MembershipPlan</option>
                                </select>
                                <div className="text-sm">for invoice: <span className="font-semibold">#{showAdjustmentInvoiceFor}</span></div>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <label className="text-sm">Percentage ~</label>
                                <input id="adj-invoice-percent" type="number" className="input w-20" placeholder="% 0" />
                                <div className="text-sm">= $0</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border-collapse">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 text-left border">Invoice #</th>
                                            <th className="p-2 text-left border">Code</th>
                                            <th className="p-2 text-left border">Provider</th>
                                            <th className="p-2 text-right border">Ins Writeoff</th>
                                            <th className="p-2 text-right border">Patient: $0.00</th>
                                            <th className="p-2 text-right border">Insurance: $206.00</th>
                                            <th className="p-2 text-right border">Previous Total Owing: $206.00</th>
                                            <th className="p-2 text-right border">Payment: $0.00</th>
                                            <th className="p-2 text-right border">Adjust: $0.00</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.find((i) => i.id === showAdjustmentInvoiceFor)?.lines.map((l) => (
                                            <tr key={l.id} className="border-b">
                                                <td className="p-2 border">#{showAdjustmentInvoiceFor} : {l.dos} for</td>
                                                <td className="p-2 border">{l.code}</td>
                                                <td className="p-2 border">{l.provider}</td>
                                                <td className="p-2 text-right border">$0.00</td>
                                                <td className="p-2 text-right border">$0.00</td>
                                                <td className="p-2 text-right border">${l.charge?.toFixed(2)}</td>
                                                <td className="p-2 text-right border">${l.charge?.toFixed(2)}</td>
                                                <td className="p-2 text-right border">$0.00</td>
                                                <td className="p-2 text-right border">
                                                    <input id={`adj-invoice-line-${l.id}`} type="number" className="input w-20 text-right" placeholder="0%" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3">
                                <label className="label">+ Add description</label>
                                <textarea id="adj-invoice-desc" className="input w-full h-16" placeholder="Add description..."></textarea>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="btn-primary" onClick={async () => {
                                    const invoiceId = showAdjustmentInvoiceFor;
                                    const type = (document.getElementById('adj-invoice-type') as HTMLSelectElement)?.value;
                                    const percent = Number((document.getElementById('adj-invoice-percent') as HTMLInputElement)?.value);
                                    const description = (document.getElementById('adj-invoice-desc') as HTMLTextAreaElement)?.value;
                                    if (!invoiceId || !type) {
                                        alert('Please select an adjustment type');
                                        return;
                                    }
                                    try {
                                        await adjustInvoice(invoiceId, { 
                                            adjustmentType: type, 
                                            discountPercent: percent > 0 ? percent : undefined,
                                            description: description || undefined
                                        });
                                        alert(`Invoice adjusted successfully`);
                                        await loadAll();
                                    } catch (err) {
                                        alert("Error: " + (err as Error).message);
                                    }
                                    setShowAdjustmentInvoiceFor(null);
                                }}>
                                    Adjust
                                </button>
                                <button className="btn-light" onClick={() => setShowAdjustmentInvoiceFor(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Insurance Write-Off Modal */}
            {showInsuranceWriteOffFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-purple-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Insurance Write-Off Invoice #{showInsuranceWriteOffFor}</h4>
                            <button onClick={() => setShowInsuranceWriteOffFor(null)} className="rounded p-1 hover:bg-purple-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-sm text-gray-600">
                                {new Date().toLocaleDateString()} claim: <span className="font-semibold">select a claim</span> for invoice: <span className="font-semibold">#{showInsuranceWriteOffFor}</span>
                            </div>
                            <div>
                                <select className="input w-full">
                                    <option value="">Select a claim</option>
                                    {Object.values(claims).filter(c => c.invoiceId === showInsuranceWriteOffFor).map(c => (
                                        <option key={c.id} value={c.id}>Claim #{c.id} - {c.payerName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="btn-primary" onClick={() => {
                                    alert(`Insurance write-off applied to invoice #${showInsuranceWriteOffFor}`);
                                    setShowInsuranceWriteOffFor(null);
                                }}>
                                    Apply
                                </button>
                                <button className="btn-light" onClick={() => setShowInsuranceWriteOffFor(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Membership Adjustment Modal */}
            {showMembershipAdjustmentFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-purple-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Membership Adjustment</h4>
                            <button onClick={() => setShowMembershipAdjustmentFor(null)} className="rounded p-1 hover:bg-purple-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-center text-red-600 font-semibold">Patient Has No Membership Plans</div>
                            <div>
                                <label className="label">Description</label>
                                <textarea className="input w-full h-20" placeholder="Add description..."></textarea>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="btn-primary" disabled>Apply</button>
                                <button className="btn-light" onClick={() => setShowMembershipAdjustmentFor(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <TransferCreditModal />
            {/* ...existing code... */}
            {showEditLinesFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    {/* ...existing code... */}
                </div>
            )}
            {/* ...existing code... */}

            {showAddProcedure && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b px-5 py-3 sticky top-0 bg-white">
                                <h4 className="text-base font-semibold">Add Procedure (creates Invoice)</h4>
                                <button onClick={() => setShowAddProcedure(false)} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
                                    ✕
                                </button>
                            </div>
                            <div className="p-5 space-y-5">
                                {/* Common fields */}
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div>
                                        <label className="label">Date of Service</label>
                                        <input id="p-dos" className="input w-full" placeholder="YYYY-MM-DD" defaultValue={new Date().toISOString().slice(0, 10)} />
                                    </div>
                                    <div>
                                        <label className="label">Provider</label>
                                        <select id="p-prov" className="input w-full" defaultValue={providers[0]?.name || ""}>
                                            <option value="">Select Provider</option>
                                            {providers.map((prov) => (
                                                <option key={prov.id} value={prov.name}>
                                                    {prov.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Procedures list */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="label mb-0">Procedures</label>
                                        <button 
                                            className="btn-light text-sm"
                                            onClick={() => setProcedureList([...procedureList, { code: "", description: "", rate: 0 }])}
                                        >
                                            + Add Another Procedure
                                        </button>
                                    </div>
                                    
                                    {procedureList.map((proc, idx) => (
                                        <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Procedure #{idx + 1}</span>
                                                {procedureList.length > 1 && (
                                                    <button 
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                        onClick={() => setProcedureList(procedureList.filter((_, i) => i !== idx))}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <div>
                                                    <label className="label">Code</label>
                                                    <input 
                                                        className="input w-full" 
                                                        placeholder="e.g., D2391"
                                                        value={proc.code}
                                                        onChange={(e) => {
                                                            const updated = [...procedureList];
                                                            updated[idx].code = e.target.value;
                                                            setProcedureList(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label">Rate</label>
                                                    <input 
                                                        className="input w-full" 
                                                        type="number"
                                                        placeholder="e.g., 239"
                                                        value={proc.rate || ""}
                                                        onChange={(e) => {
                                                            const updated = [...procedureList];
                                                            updated[idx].rate = Number(e.target.value);
                                                            setProcedureList(updated);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label">Description</label>
                                                <input 
                                                    className="input w-full" 
                                                    placeholder="e.g., Composite Resin, 1 surface"
                                                    value={proc.description}
                                                    onChange={(e) => {
                                                        const updated = [...procedureList];
                                                        updated[idx].description = e.target.value;
                                                        setProcedureList(updated);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <button className="btn-light" onClick={() => setShowAddProcedure(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            const dos = (document.getElementById("p-dos") as HTMLInputElement).value || new Date().toISOString().slice(0, 10);
                                            const provider = (document.getElementById("p-prov") as HTMLSelectElement).value || providers[0]?.name || "Dr. John Smith";
                                            
                                            const validProcedures = procedureList.filter(p => p.code && p.description && p.rate > 0);
                                            
                                            if (validProcedures.length === 0) {
                                                alert("Please add at least one valid procedure with code, description, and rate.");
                                                return;
                                            }

                                            void createInvoiceFromProcedure({ dos, provider, procedures: validProcedures });
                                            setShowAddProcedure(false);
                                            setTab("INVOICE");
                                        }}
                                    >
                                        Save & Create Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
            )}

            {showClaimComposeFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <h4 className="text-base font-semibold">Claim notes / narrative</h4>
                            <button onClick={() => setShowClaimComposeFor(null)} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
                                ✕
                            </button>
                        </div>
                        <div className="p-5">
                            {(() => {
                                const c = claims[showClaimComposeFor ?? -1];
                                if (!c) return null;
                                return (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <div>
                                                <label className="label">Treating Provider</label>
                                                <input
                                                    className="input w-full"
                                                    defaultValue={c.treatingProviderId ?? ""}
                                                    onBlur={(e) => {
                                                        void updateClaim(c.invoiceId, { treatingProviderId: e.currentTarget.value });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Billing Entity</label>
                                                <input
                                                    className="input w-full"
                                                    defaultValue={c.billingEntity ?? ""}
                                                    onBlur={(e) => {
                                                        void updateClaim(c.invoiceId, { billingEntity: e.currentTarget.value });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Notes</label>
                                            <textarea
                                                className="input h-28 w-full"
                                                defaultValue={c.notes ?? ""}
                                                onBlur={(e) => {
                                                    void updateClaim(c.invoiceId, { notes: e.currentTarget.value });
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button className="btn-primary" onClick={() => { void sendToBatch(c.invoiceId); }}>
                                                Send to Batch
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {showClaimEditFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <h4 className="text-base font-semibold">{`Edit Claim #${claims[showClaimEditFor!]?.id}`}</h4>
                            <button onClick={() => setShowClaimEditFor(null)} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
                                ✕
                            </button>
                        </div>
                        <div className="p-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {[
                                ["attachmentIndicator", "Attachment Indicator (Y/N)"],
                                ["attachmentType", "Attachment Type (e.g., EOB)"],
                                ["attachmentTransmissionCode", "Attachment Transmission Code (EL/Mail/Fax)"],
                                ["claimSubmissionReasonCode", "Claim Submission Reason Code (e.g., 1)"],
                                ["type", "Type (Electronic/Paper)"],
                            ].map(([key, label]) => (
                                <div key={key}>
                                    <label className="label">{label}</label>
                                    <input
                                        className="input w-full"
                                        onBlur={(e) => {
                                            void updateClaim(showClaimEditFor!, { [key]: e.currentTarget.value });
                                        }}
                                    />
                                </div>
                            ))}
                            <div className="md:col-span-2 flex justify-end">
                                <button className="btn-primary" onClick={() => setShowClaimEditFor(null)}>
                                    Edit Claim
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showVoidFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <h4 className="text-base font-semibold">Void & Re-Create claim</h4>
                            <button onClick={() => setShowVoidFor(null)} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
                                ✕
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-sm">
                                Are you sure you want to void & recreate this claim? This will only void the claim in the system and
                                create a clone without submitting. <b>This can’t be undone!</b>
                            </p>
                            <div className="flex justify-end gap-2">
                                <button className="btn-light" onClick={() => setShowVoidFor(null)}>
                                    Cancel
                                </button>
                                <button className="btn-danger" onClick={() => { void voidAndRecreateClaim(showVoidFor!); }}>
                                    Void & Re-Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======= ATTACHMENTS UPLOAD MODAL ======= */}
            {showAttachmentFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <h4 className="text-base font-semibold">
                                {`Upload Attachment — Claim #${claims[showAttachmentFor]?.id ?? "—"}`}
                            </h4>
                            <button
                                onClick={() => { setAttachmentFile(null); setShowAttachmentFor(null); }}
                                className="rounded p-1 hover:bg-gray-100"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-5 grid gap-4">
                            <div>
                                <label className="label">Select document (image/PDF)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="input w-full"
                                    onChange={(e) => setAttachmentFile(e.currentTarget.files?.[0] ?? null)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    className="btn-light"
                                    onClick={async () => {
                                        const claimId = claims[showAttachmentFor]?.id;
                                        if (!claimId) return;
                                        const res = await fetchWithAuth(`${API}/claims/${claimId}/attachment`, { method: "GET" });
                                        if (res.ok) {
                                            const contentType = res.headers.get("content-type") || "";
                                            const blob = await res.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            if (contentType.startsWith("image/")) {
                                                setPreviewUrl(url);
                                                setPreviewType("image");
                                                setPreviewOpen(true);
                                            } else if (contentType === "application/pdf") {
                                                setPreviewUrl(url);
                                                setPreviewType("pdf");
                                                setPreviewOpen(true);
                                            } else {
                                                window.open(url, "_blank");
                                            }
                                        }
                                    }}
                                >
                                    View documents
                                </button>

                                <div className="flex gap-2">
                                    <button className="btn-light" onClick={() => { setAttachmentFile(null); setShowAttachmentFor(null); }}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={async () => {
                                            if (!attachmentFile || !showAttachmentFor) return;
                                            const claimId = claims[showAttachmentFor]?.id;
                                            if (!claimId) return;
                                            const formData = new FormData();
                                            formData.append("file", attachmentFile);
                                            await fetchWithAuth(`${API}/claims/${claimId}/attachment`, {
                                                method: "POST",
                                                body: formData,
                                            });
                                            setAttachmentFile(null);
                                            setShowAttachmentFor(null);
                                            // Optionally reload claim data here
                                        }}
                                        disabled={!attachmentFile}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======= EOB UPLOAD MODAL ======= */}
            {showEobFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <h4 className="text-base font-semibold">
                                {`Upload EOB — Claim #${claims[showEobFor]?.id ?? "—"}`}
                            </h4>
                            <button
                                onClick={() => { setEobFile(null); setShowEobFor(null); }}
                                className="rounded p-1 hover:bg-gray-100"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-5 grid gap-4">
                            <div>
                                <label className="label">Select EOB (image/PDF)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="input w-full"
                                    onChange={(e) => setEobFile(e.currentTarget.files?.[0] ?? null)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    className="btn-light"
                                    onClick={async () => {
                                        const claimId = claims[showEobFor]?.id;
                                        if (!claimId) return;
                                        const res = await fetchWithAuth(`${API}/claims/${claimId}/eob`, { method: "GET" });
                                        if (res.ok) {
                                            const contentType = res.headers.get("content-type") || "";
                                            const blob = await res.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            if (contentType.startsWith("image/")) {
                                                setPreviewUrl(url);
                                                setPreviewType("image");
                                                setPreviewOpen(true);
                                            } else if (contentType === "application/pdf") {
                                                setPreviewUrl(url);
                                                setPreviewType("pdf");
                                                setPreviewOpen(true);
                                            } else {
                                                window.open(url, "_blank");
                                            }
                                        }
                                    }}
                                >
                                    View documents
                                </button>
            {/* ======= FILE PREVIEW MODAL ======= */}
            {previewOpen && previewUrl && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl relative">
                        <button
                            onClick={() => { setPreviewOpen(false); setPreviewUrl(null); setPreviewType(null); }}
                            className="absolute top-2 right-2 rounded p-1 hover:bg-gray-100"
                            aria-label="Close"
                        >✕</button>
                        <div className="p-5 flex justify-center items-center min-h-[400px]">
                            {previewType === "image" ? (
                                <img src={previewUrl} alt="Preview" className="max-h-[70vh] max-w-full rounded" />
                            ) : previewType === "pdf" ? (
                                <iframe src={previewUrl} title="PDF Preview" className="w-full h-[70vh]" />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

                                <div className="flex gap-2">
                                    <button className="btn-light" onClick={() => { setEobFile(null); setShowEobFor(null); }}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={async () => {
                                            if (!eobFile || !showEobFor) return;
                                            const claimId = claims[showEobFor]?.id;
                                            if (!claimId) return;
                                            const formData = new FormData();
                                            formData.append("file", eobFile);
                                            await fetchWithAuth(`${API}/claims/${claimId}/eob`, {
                                                method: "POST",
                                                body: formData,
                                            });
                                            setEobFile(null);
                                            setShowEobFor(null);
                                            // Optionally reload claim data here
                                        }}
                                        disabled={!eobFile}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Insurance Payment Modal */}
            {editInsuranceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
                        <h3 className="text-lg font-semibold mb-4">Edit Insurance Payment</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as typeof e.target & {
                                submitted: { value: string },
                                balance: { value: string },
                                deductible: { value: string },
                                allowed: { value: string },
                                insWriteOff: { value: string },
                                insPay: { value: string },
                                updateAllowed: { checked: boolean },
                                updateFlatPortion: { checked: boolean },
                                applyWriteoff: { checked: boolean },
                            };
                            await editInsuranceRemitLine(
                                editInsuranceModal.invoiceId,
                                editInsuranceModal.remit.id,
                                {
                                    invoiceLineId: editInsuranceModal.remit.invoiceLineId,
                                    submitted: Number(form.submitted.value),
                                    balance: Number(form.balance.value),
                                    deductible: Number(form.deductible.value),
                                    allowed: Number(form.allowed.value),
                                    insWriteOff: Number(form.insWriteOff.value),
                                    insPay: Number(form.insPay.value),
                                    updateAllowed: form.updateAllowed.checked,
                                    updateFlatPortion: form.updateFlatPortion.checked,
                                    applyWriteoff: form.applyWriteoff.checked,
                                }
                            );
                            setEditInsuranceModal(null);
                        }}>
                            <div className="grid grid-cols-2 gap-3">
                                <label>Submitted<input name="submitted" type="number" className="input w-full" defaultValue={editInsuranceModal.remit.submitted} /></label>
                                <label>Balance<input name="balance" type="number" className="input w-full" defaultValue={editInsuranceModal.remit.balance} /></label>
                                <label>Deductible<input name="deductible" type="number" className="input w-full" defaultValue={editInsuranceModal.remit.deductible} /></label>
                                <label>Allowed<input name="allowed" type="number" className="input w-full" defaultValue={editInsuranceModal.remit.allowed} /></label>
                                <label>Ins WriteOff<input name="insWriteOff" type="number" className="input w-full" defaultValue={editInsuranceModal.remit.insWriteOff} /></label>
                                <label>Ins Pay<input name="insPay" type="number" className="input w-full" defaultValue={editInsuranceModal.remit.insPay} /></label>
                                <label className="col-span-2"><input name="updateAllowed" type="checkbox" defaultChecked={!!editInsuranceModal.remit.updateAllowed} /> Update Allowed</label>
                                <label className="col-span-2"><input name="updateFlatPortion" type="checkbox" defaultChecked={!!editInsuranceModal.remit.updateFlatPortion} /> Update Flat Portion</label>
                                <label className="col-span-2"><input name="applyWriteoff" type="checkbox" defaultChecked={!!editInsuranceModal.remit.applyWriteoff} /> Apply Writeoff</label>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" className="btn-light" onClick={() => setEditInsuranceModal(null)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Patient Payment Modal */}
            {editPatientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
                        <h3 className="text-lg font-semibold mb-4">Edit Patient Payment</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as typeof e.target & {
                                amount: { value: string },
                                paymentMethod: { value: string },
                            };
                            await editPatientPayment(
                                editPatientModal.invoiceId,
                                editPatientModal.payment.id,
                                {
                                    amount: Number(form.amount.value),
                                    paymentMethod: form.paymentMethod.value,
                                }
                            );
                            setEditPatientModal(null);
                        }}>
                            <div className="grid grid-cols-2 gap-3">
                                <label>Amount<input name="amount" type="number" className="input w-full" defaultValue={editPatientModal.payment.amount} /></label>
                                <label>Payment Method
                                    <select name="paymentMethod" className="input w-full" defaultValue={editPatientModal.payment.paymentMethod}>
                                        <option value="CREDIT_CARD">Credit Card</option>
                                        <option value="CHECK">Check</option>
                                        <option value="DEBIT_CARD">Debit Card</option>
                                        <option value="EFT">EFT</option>
                                        <option value="CASH">Cash</option>
                                        <option value="CARE_CREDIT">Care Credit</option>
                                        <option value="MASTERCARD">Master Card</option>
                                        <option value="VISA">Visa</option>
                                        <option value="DISCOVER">Discover</option>
                                        <option value="AMEX">Amex</option>
                                    </select>
                                </label>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" className="btn-light" onClick={() => setEditPatientModal(null)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Invoice Modal */}
            {showEditLinesFor && (() => {
                const invoice = invoices.find(inv => inv.id === showEditLinesFor);
                if (!invoice || !invoice.lines.length) return null;
                const firstLine = invoice.lines[0];
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
                            <h3 className="text-lg font-semibold mb-4">Edit Invoice #{invoice.id}</h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.target as typeof e.target & {
                                    code: { value: string };
                                    description: { value: string };
                                    provider: { value: string };
                                    dos: { value: string };
                                    rate: { value: string };
                                };
                                try {
                                    await updateInvoice(invoice.id, {
                                        code: form.code.value,
                                        description: form.description.value,
                                        provider: form.provider.value,
                                        dos: form.dos.value,
                                        rate: Number(form.rate.value),
                                    });
                                    setShowEditLinesFor(null);
                                } catch (error) {
                                    console.error("Failed to update invoice:", error);
                                    alert("Failed to update invoice. Please try again.");
                                }
                            }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                                        <input
                                            name="code"
                                            type="text"
                                            className="input w-full"
                                            defaultValue={firstLine.code}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input
                                            name="description"
                                            type="text"
                                            className="input w-full"
                                            defaultValue={firstLine.treatment}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                        <input
                                            name="provider"
                                            type="text"
                                            className="input w-full"
                                            defaultValue={firstLine.provider}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Service</label>
                                        <input
                                            name="dos"
                                            type="date"
                                            className="input w-full"
                                            defaultValue={firstLine.dos}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                                        <input
                                            name="rate"
                                            type="number"
                                            step="0.01"
                                            className="input w-full"
                                            defaultValue={firstLine.charge}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" className="btn-light" onClick={() => setShowEditLinesFor(null)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Update Invoice</button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Edit Patient Deposit Modal */}
            {editDepositModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-blue-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Edit Patient Deposit #{editDepositModal.id}</h4>
                            <button onClick={() => setEditDepositModal(null)} className="rounded p-1 hover:bg-blue-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget as HTMLFormElement;
                                try {
                                    await updatePatientDeposit(editDepositModal.id, {
                                        amount: Number((form.elements.namedItem('amount') as HTMLInputElement).value),
                                        paymentMethod: (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value,
                                        notes: (form.elements.namedItem('notes') as HTMLInputElement).value,
                                    });
                                } catch (error) {
                                    console.error("Failed to update deposit:", error);
                                }
                            }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Amount</label>
                                        <input
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            className="input w-full"
                                            defaultValue={editDepositModal.amount}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Payment Method</label>
                                        <select name="paymentMethod" className="input w-full" defaultValue={editDepositModal.paymentMethod}>
                                            {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Notes</label>
                                        <input
                                            name="notes"
                                            type="text"
                                            className="input w-full"
                                            defaultValue={editDepositModal.description || ''}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" className="btn-light" onClick={() => setEditDepositModal(null)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Update</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Insurance Deposit Modal */}
            {editInsuranceDepositModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-green-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Edit Insurance Deposit #{editInsuranceDepositModal.id}</h4>
                            <button onClick={() => setEditInsuranceDepositModal(null)} className="rounded p-1 hover:bg-green-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget as HTMLFormElement;
                                try {
                                    await updateInsuranceDeposit(editInsuranceDepositModal.id, {
                                        amount: Number((form.elements.namedItem('amount') as HTMLInputElement).value),
                                        paymentMethod: (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value,
                                        description: (form.elements.namedItem('description') as HTMLInputElement).value,
                                    });
                                } catch (error) {
                                    console.error("Failed to update insurance deposit:", error);
                                }
                            }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Amount</label>
                                        <input
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            className="input w-full"
                                            defaultValue={editInsuranceDepositModal.depositAmount}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Payment Method</label>
                                        <select name="paymentMethod" className="input w-full" defaultValue={editInsuranceDepositModal.paymentMethod}>
                                            {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Description</label>
                                        <input
                                            name="description"
                                            type="text"
                                            className="input w-full"
                                            defaultValue={editInsuranceDepositModal.description || ''}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" className="btn-light" onClick={() => setEditInsuranceDepositModal(null)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Update</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Print EHR Claim Form Modal */}
            {showPrintEhrClaim && printEhrClaimData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" id="print-ehr-claim-modal">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col" id="print-ehr-claim-content">
                        {/* Header with Close and Print buttons - hidden during print */}
                        <div className="flex justify-between items-center px-6 py-3 border-b bg-gray-50 no-print">
                            <h2 className="text-lg font-semibold text-gray-800">EHR Claim Form</h2>
                            <div className="flex gap-2">
                                <button className="btn-light text-sm px-4 py-2" onClick={() => setShowPrintEhrClaim(false)}>Close</button>
                                <button className="btn-primary text-sm px-4 py-2" onClick={() => window.print()}>Print</button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto flex-1">
                            <div className="p-6">
                                {/* Practice Header with Logo */}
                                <div className="mb-6 pb-4 border-b-4 border-blue-900">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <img 
                                                src="/images/ciyex-logo.png" 
                                                alt="Ciyex Logo" 
                                                className="w-20 h-20 object-contain"
                                            />
                                            <div>
                                                <h1 className="text-xl font-bold text-blue-900">{printEhrClaimData.providerInfo?.facilityName || 'Medical Facility'}</h1>
                                                <p className="text-sm text-gray-700">{printEhrClaimData.providerInfo?.address || ''}</p>
                                                <p className="text-sm text-gray-700">{printEhrClaimData.providerInfo?.city || ''}, {printEhrClaimData.providerInfo?.state || ''} {printEhrClaimData.providerInfo?.zipCode || ''}</p>
                                                <p className="text-sm text-gray-700">Phone: {printEhrClaimData.providerInfo?.phone || ''}</p>
                                                <p className="text-sm text-gray-700">Email: {printEhrClaimData.providerInfo?.email || ''}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-2xl font-bold text-blue-900 mb-2">EHR CLAIM FORM</h2>
                                            <p className="text-sm text-gray-700">Claim #{printEhrClaimData.claimNumber}</p>
                                            <p className="text-sm text-gray-700">Status: {printEhrClaimData.claimStatus}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Information */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-blue-900 mb-3 border-b pb-2">PATIENT INFORMATION</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Patient Name</label>
                                            <p className="text-sm text-gray-900">{printEhrClaimData.patientInfo?.fullName || ''}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                                            <p className="text-sm text-gray-900">{printEhrClaimData.patientInfo?.dateOfBirth || ''}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                                            <p className="text-sm text-gray-900">{printEhrClaimData.patientInfo?.gender || ''}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Patient Account #</label>
                                            <p className="text-sm text-gray-900">{printEhrClaimData.patientInfo?.patientAccountNumber || ''}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                                            <p className="text-sm text-gray-900">{printEhrClaimData.patientInfo?.phone || ''}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                            <p className="text-sm text-gray-900">{printEhrClaimData.patientInfo?.email || ''}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Insurance Information */}
                                {printEhrClaimData.insuranceInfo && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-blue-900 mb-3 border-b pb-2">INSURANCE INFORMATION</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Insurance Company</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.insuranceInfo.companyName || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Name</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.insuranceInfo.planName || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Policy Number</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.insuranceInfo.policyNumber || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Group Number</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.insuranceInfo.groupNumber || ''}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Policyholder Information */}
                                {printEhrClaimData.policyholderInfo && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-blue-900 mb-3 border-b pb-2">POLICYHOLDER/SUBSCRIBER INFORMATION</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Policyholder Name</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.policyholderInfo.fullName || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship to Patient</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.policyholderInfo.relationshipToPatient || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Subscriber ID</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.policyholderInfo.subscriberId || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.policyholderInfo.phone || ''}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Provider Information */}
                                {printEhrClaimData.providerInfo && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-blue-900 mb-3 border-b pb-2">PROVIDER INFORMATION</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Provider Name</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.providerInfo.providerName || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">NPI</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.providerInfo.npi || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tax ID</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.providerInfo.taxId || ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                                                <p className="text-sm text-gray-900">{printEhrClaimData.providerInfo.phone || ''}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Service Records Table */}
                                {printEhrClaimData.serviceRecords && printEhrClaimData.serviceRecords.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-blue-900 mb-3 border-b pb-2">SERVICE RECORDS</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-blue-900 text-white">
                                                        <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Date of Service</th>
                                                        <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Procedure Code</th>
                                                        <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Description</th>
                                                        <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Provider</th>
                                                        <th className="border border-gray-400 px-2 py-2 text-right font-semibold">Charge Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {printEhrClaimData.serviceRecords.map((service: any, index: number) => {
                                                        const isAlternate = index % 2 === 1;
                                                        return (
                                                            <tr key={index} className={isAlternate ? 'bg-blue-50' : 'bg-white'}>
                                                                <td className="border border-gray-300 px-2 py-1 text-gray-900">{service.serviceDate || ''}</td>
                                                                <td className="border border-gray-300 px-2 py-1 text-gray-900 font-mono">{service.procedureCode || ''}</td>
                                                                <td className="border border-gray-300 px-2 py-1 text-gray-900">{service.description || ''}</td>
                                                                <td className="border border-gray-300 px-2 py-1 text-gray-900">{service.providerName || ''}</td>
                                                                <td className="border border-gray-300 px-2 py-1 text-right text-gray-900">${service.chargeAmount?.toFixed(2) || '0.00'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Financial Summary */}
                                {printEhrClaimData.financialSummary && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-blue-900 mb-3 border-b pb-2">FINANCIAL SUMMARY</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm font-semibold text-gray-700">Total Charges:</span>
                                                <span className="text-sm text-gray-900">${printEhrClaimData.financialSummary.totalCharges?.toFixed(2) || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm font-semibold text-gray-700">Total Submitted:</span>
                                                <span className="text-sm text-gray-900">${printEhrClaimData.financialSummary.totalSubmitted?.toFixed(2) || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm font-semibold text-gray-700">Insurance Balance:</span>
                                                <span className="text-sm text-gray-900">${printEhrClaimData.financialSummary.insuranceBalance?.toFixed(2) || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm font-semibold text-gray-700">Patient Balance:</span>
                                                <span className="text-sm font-bold text-red-600">${printEhrClaimData.financialSummary.patientBalance?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Claim Date */}
                                <div className="mt-6 text-right text-sm text-gray-600">
                                    <p>Claim Date: {printEhrClaimData.claimDate || new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Patient Deposit Modal */}
            {editDepositModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-blue-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Edit Patient Deposit #{editDepositModal.id}</h4>
                            <button onClick={() => setEditDepositModal(null)} className="rounded p-1 hover:bg-blue-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget as HTMLFormElement;
                                try {
                                    await updatePatientDeposit(editDepositModal.id, {
                                        amount: Number((form.elements.namedItem('amount') as HTMLInputElement).value),
                                        paymentMethod: (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value,
                                        notes: (form.elements.namedItem('notes') as HTMLInputElement).value,
                                    });
                                } catch (error) {
                                    console.error("Failed to update deposit:", error);
                                }
                            }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Amount</label>
                                        <input
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            className="input w-full"
                                            defaultValue={editDepositModal.amount}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Payment Method</label>
                                        <select name="paymentMethod" className="input w-full" defaultValue={editDepositModal.paymentMethod}>
                                            {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Notes</label>
                                        <input
                                            name="notes"
                                            type="text"
                                            className="input w-full"
                                            defaultValue={editDepositModal.description || ''}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" className="btn-light" onClick={() => setEditDepositModal(null)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Update</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Courtesy Credit Modal */}
            {editCourtesyModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-3 bg-amber-600 text-white rounded-t-2xl">
                            <h4 className="text-base font-semibold">Edit Courtesy Credit #{editCourtesyModal.courtesy.id}</h4>
                            <button onClick={() => setEditCourtesyModal(null)} className="rounded p-1 hover:bg-amber-700" aria-label="Close">✕</button>
                        </div>
                        <div className="p-5">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget as HTMLFormElement;
                                try {
                                    await updateCourtesyCredit(editCourtesyModal.invoiceId, {
                                        adjustmentType: (form.elements.namedItem('adjustmentType') as HTMLSelectElement).value,
                                        amount: Number((form.elements.namedItem('amount') as HTMLInputElement).value),
                                        description: (form.elements.namedItem('description') as HTMLInputElement).value,
                                    });
                                    setEditCourtesyModal(null);
                                    alert("Courtesy credit updated successfully");
                                } catch (error) {
                                    console.error("Failed to update courtesy credit:", error);
                                    alert("Failed to update courtesy credit. Please try again.");
                                }
                            }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Adjustment Type</label>
                                        <select name="adjustmentType" className="input w-full" defaultValue={editCourtesyModal.courtesy.adjustmentType}>
                                            {courtesyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Amount</label>
                                        <input
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            className="input w-full"
                                            defaultValue={editCourtesyModal.courtesy.amount}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Description</label>
                                        <input
                                            name="description"
                                            type="text"
                                            className="input w-full"
                                            defaultValue={editCourtesyModal.courtesy.description || ''}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" className="btn-light" onClick={() => setEditCourtesyModal(null)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Update</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
