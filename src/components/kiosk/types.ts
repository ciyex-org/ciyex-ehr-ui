/* ── Kiosk Mode types ── */

export interface KioskConfig {
  id?: number;
  enabled: boolean;
  config: {
    verify_dob?: boolean;
    verify_phone?: boolean;
    update_demographics?: boolean;
    update_insurance?: boolean;
    sign_consent?: boolean;
    collect_copay?: boolean;
    show_wait_time?: boolean;
  };
  welcomeMessage: string;
  completionMessage: string;
  idleTimeoutSec: number;
  orgAlias?: string;
}

export interface KioskCheckin {
  id: number;
  patientId: number;
  patientName: string;
  appointmentId?: number;
  checkInTime: string;
  demographicsUpdated: boolean;
  insuranceUpdated: boolean;
  consentSigned: boolean;
  copayCollected: boolean;
  copayAmount?: number;
  verificationMethod?: string;
  createdAt: string;
}

export type KioskStep =
  | "lookup"
  | "verify"
  | "demographics"
  | "insurance"
  | "consent"
  | "copay"
  | "complete";

export const KIOSK_STEP_LABELS: Record<KioskStep, string> = {
  lookup: "Find Your Appointment",
  verify: "Verify Identity",
  demographics: "Update Demographics",
  insurance: "Insurance Information",
  consent: "Sign Consent Forms",
  copay: "Copay Payment",
  complete: "Check-in Complete",
};
