export type FaxDirection = "inbound" | "outbound";

export type FaxCategory =
  | "referral"
  | "lab_result"
  | "prior_auth"
  | "medical_records"
  | "other";

export type InboundStatus =
  | "pending"
  | "received"
  | "categorized"
  | "attached";

export type OutboundStatus =
  | "pending"
  | "sending"
  | "sent"
  | "delivered"
  | "failed";

export type FaxStatus = InboundStatus | OutboundStatus;

export interface FaxMessage {
  id: string;
  direction: FaxDirection;
  faxNumber: string;
  senderName: string;
  recipientName: string;
  subject: string;
  pageCount: number;
  status: FaxStatus;
  patientId: string | null;
  patientName: string | null;
  category: FaxCategory | null;
  documentUrl: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  processedBy: string | null;
  processedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FaxStats {
  inbound: {
    pending: number;
    received: number;
    categorized: number;
    attached: number;
    total: number;
  };
  outbound: {
    pending: number;
    sending: number;
    sent: number;
    delivered: number;
    failed: number;
    total: number;
  };
}

export interface FaxPageData {
  content: FaxMessage[];
  totalPages: number;
  totalElements: number;
}

export interface AssignPayload {
  patientId: string;
  patientName: string;
  category: FaxCategory;
}

export interface SendFaxForm {
  recipientName: string;
  faxNumber: string;
  subject: string;
  pageCount?: number;
  patientName: string;
  category: FaxCategory | "";
  notes: string;
}

export const CATEGORY_LABELS: Record<FaxCategory, string> = {
  referral: "Referral",
  lab_result: "Lab Result",
  prior_auth: "Prior Auth",
  medical_records: "Medical Records",
  other: "Other",
};

export const INBOUND_STATUSES = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "received", label: "Received" },
  { key: "categorized", label: "Categorized" },
  { key: "attached", label: "Attached" },
] as const;

export const OUTBOUND_STATUSES = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "sending", label: "Sending" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "failed", label: "Failed" },
] as const;
