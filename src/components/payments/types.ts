/* ------------------------------------------------------------------ */
/*  Payment Integration – Shared Types                                 */
/* ------------------------------------------------------------------ */
import { formatDisplayDate } from "@/utils/dateUtils";

export type MethodType =
  | "credit_card"
  | "debit_card"
  | "bank_account"
  | "fsa"
  | "hsa"
  | "check"
  | "cash"
  | "other";

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "";

export type AccountType = "checking" | "savings" | "";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "partial_refund"
  | "voided";

export type TransactionType = "payment" | "refund" | "adjustment" | "write_off";

export type PlanStatus =
  | "active"
  | "completed"
  | "defaulted"
  | "cancelled"
  | "paused";

export type PlanFrequency = "weekly" | "biweekly" | "monthly";

export type LedgerEntryType =
  | "charge"
  | "payment"
  | "adjustment"
  | "refund"
  | "write_off"
  | "insurance_payment";

/* ---- DTOs ---- */

export type PatientPaymentMethod = {
  id?: number;
  patientId: string;
  patientName: string;
  methodType: MethodType;
  cardBrand: CardBrand;
  lastFour: string;
  expMonth: number | null;
  expYear: number | null;
  cardholderName: string;
  bankName: string;
  accountType: AccountType;
  routingLastFour: string;
  billingAddress: string;
  billingZip: string;
  isDefault: boolean;
  isActive: boolean;
  stripePaymentMethodId: string;
  stripeCustomerId: string;
  tokenReference: string;
  nickname: string;
  notes: string;
};

export type PaymentTransaction = {
  id?: number;
  patientId: string;
  patientName: string;
  paymentMethodId: number | null;
  amount: number;
  currency: string;
  status: TransactionStatus;
  transactionType: TransactionType;
  paymentMethodType: MethodType | "";
  cardBrand: CardBrand;
  lastFour: string;
  description: string;
  referenceType: string;
  referenceId: string;
  invoiceNumber: string;
  convenienceFee: number;
  refundAmount: number;
  refundReason: string;
  receiptSent: boolean;
  receiptEmail: string;
  collectedBy: string;
  collectedAt: string;
  notes: string;
};

export type PaymentPlan = {
  id?: number;
  patientId: string;
  patientName: string;
  totalAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  frequency: PlanFrequency;
  paymentMethodId: number | null;
  autoCharge: boolean;
  nextPaymentDate: string;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  installmentsTotal: number;
  installmentsPaid: number;
  notes: string;
};

export type PatientLedger = {
  id?: number;
  patientId: string;
  entryType: LedgerEntryType;
  amount: number;
  runningBalance: number;
  description: string;
  referenceType: string;
  referenceId: string;
  invoiceNumber?: string;
  recipient?: string;
  issuer?: string;
  postedBy: string;
  createdAt?: string;
};

export type PaymentStats = {
  today: number;
  last7d: number;
  last30d: number;
  pendingCount: number;
  failedCount: number;
};

export type PaymentConfig = {
  id?: number;
  processor: string;
  enabled: boolean;
  config: Record<string, string>;
  acceptedMethods: string[];
  convenienceFeeEnabled: boolean;
  convenienceFeePercent: number;
  convenienceFeeFlatAmount: number;
  autoReceipt: boolean;
};

export type Patient = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

/* ---- Helpers ---- */

export function patientDisplayName(p: Patient): string {
  if (p.fullName) return p.fullName;
  if (p.name) return p.name;
  if (p.firstName || p.lastName)
    return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return p.id;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(d?: string): string {
  if (!d) return "--";
  return formatDisplayDate(d) || "--";
}
