export type PrescriptionStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "on_hold"
  | "discontinued";

export type PrescriptionPriority = "routine" | "urgent" | "stat";

export type DosageForm =
  | "tablet"
  | "capsule"
  | "solution"
  | "injection"
  | "cream"
  | "ointment"
  | "patch"
  | "inhaler"
  | "drops"
  | "suppository"
  | "other";

export type DEASchedule = "" | "II" | "III" | "IV" | "V";

export interface Prescription {
  id?: number;
  patientId: string;
  patientName: string;
  encounterId?: string;
  prescriberName?: string;
  prescriberNpi?: string;
  medicationName: string;
  medicationCode?: string;
  medicationSystem?: string; // NDC or RxNorm
  strength?: string;
  dosageForm?: string;
  sig: string;
  quantity?: number;
  quantityUnit?: string;
  daysSupply?: number;
  refills?: number;
  refillsRemaining?: number;
  pharmacyName?: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  status: PrescriptionStatus;
  priority: PrescriptionPriority;
  startDate?: string;
  endDate?: string;
  discontinuedDate?: string;
  discontinuedReason?: string;
  notes?: string;
  deaSchedule?: DEASchedule;
}

export interface PrescriptionStats {
  active: number;
  completed: number;
  cancelled: number;
  on_hold: number;
  discontinued: number;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "minor" | "moderate" | "major" | "contraindicated";
  description: string;
}

export type ToastState = { type: "success" | "error" | "info"; text: string } | null;
