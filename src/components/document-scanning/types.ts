/* ── Document Scanning / OCR types ── */

export interface ScannedDocument {
  id: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl?: string;
  patientId?: number;
  patientName?: string;
  category: DocumentCategory;
  documentDate?: string;
  ocrText?: string;
  ocrStatus: OcrStatus;
  ocrConfidence?: number;
  tags?: string[];
  notes?: string;
  uploadedBy?: string;
  orgAlias?: string;
  createdAt: string;
  updatedAt?: string;
}

export type DocumentCategory =
  | "medical_record"
  | "lab_result"
  | "insurance_card"
  | "referral"
  | "consent_form"
  | "prescription"
  | "imaging"
  | "correspondence"
  | "legal"
  | "other";

export type OcrStatus = "pending" | "processing" | "completed" | "failed" | "not_applicable";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  medical_record: "Medical Record",
  lab_result: "Lab Result",
  insurance_card: "Insurance Card",
  referral: "Referral",
  consent_form: "Consent Form",
  prescription: "Prescription",
  imaging: "Imaging / Radiology",
  correspondence: "Correspondence",
  legal: "Legal Document",
  other: "Other",
};

export const OCR_STATUS_LABELS: Record<OcrStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  not_applicable: "N/A",
};
