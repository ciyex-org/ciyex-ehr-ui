/* ── Clinical Decision Support types ── */

export type RuleType =
  | "preventive_screening"
  | "drug_allergy"
  | "drug_drug"
  | "duplicate_order"
  | "age_based"
  | "condition_based"
  | "lab_value"
  | "custom";

export type RuleCategory =
  | "preventive"
  | "medication_safety"
  | "order_entry"
  | "chronic_disease";

export type TriggerEvent =
  | "encounter_open"
  | "order_entry"
  | "medication_prescribe"
  | "lab_result"
  | "manual";

export type ActionType = "alert" | "reminder" | "suggestion" | "hard_stop";
export type Severity = "info" | "warning" | "critical";
export type AlertAction = "acknowledged" | "overridden" | "acted_on" | "snoozed" | "dismissed";

export interface CDSRule {
  id: number;
  name: string;
  description?: string;
  ruleType: RuleType;
  category?: RuleCategory;
  triggerEvent?: TriggerEvent;
  conditions: Record<string, unknown>;
  actionType: ActionType;
  severity: Severity;
  message: string;
  recommendation?: string;
  referenceUrl?: string;
  isActive: boolean;
  appliesTo: string;
  snoozeDays: number;
  orgAlias?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CDSAlert {
  id: number;
  ruleId: number;
  ruleName: string;
  patientId: number;
  patientName: string;
  encounterId?: number;
  alertType?: string;
  severity: Severity;
  message: string;
  actionTaken?: AlertAction;
  overrideReason?: string;
  actedBy?: string;
  actedAt?: string;
  createdAt: string;
}

export interface CDSStats {
  totalRules: number;
  activeRules: number;
  alertsToday: number;
  alerts7d: number;
  criticalAlerts: number;
  overrideRate: number;
}

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  preventive_screening: "Preventive Screening",
  drug_allergy: "Drug-Allergy Interaction",
  drug_drug: "Drug-Drug Interaction",
  duplicate_order: "Duplicate Order Warning",
  age_based: "Age-Based Reminder",
  condition_based: "Condition-Based",
  lab_value: "Lab Value Alert",
  custom: "Custom Rule",
};

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  preventive: "Preventive Care",
  medication_safety: "Medication Safety",
  order_entry: "Order Entry",
  chronic_disease: "Chronic Disease",
};

export const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  info: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  warning: { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  critical: { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
};
