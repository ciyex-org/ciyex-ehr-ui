export interface RolePermission {
  id: number;
  roleName: string;
  roleLabel: string;
  description: string;
  permissions: string[];
  smartScopes: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * SMART on FHIR resource types with human-readable labels,
 * grouped by clinical domain for the scope matrix UI.
 */
export const SMART_SCOPE_RESOURCES: { group: string; resources: { type: string; label: string }[] }[] = [
  {
    group: "Clinical",
    resources: [
      { type: "Patient", label: "Patient" },
      { type: "Encounter", label: "Encounter" },
      { type: "Observation", label: "Observation" },
      { type: "Procedure", label: "Procedure" },
      { type: "MedicationRequest", label: "Medication Rx" },
      { type: "DiagnosticReport", label: "Diagnostic Report" },
      { type: "CarePlan", label: "Care Plan" },
      { type: "Immunization", label: "Immunization" },
      { type: "AllergyIntolerance", label: "Allergy" },
      { type: "Condition", label: "Condition" },
      { type: "Composition", label: "Composition" },
    ],
  },
  {
    group: "Administrative",
    resources: [
      { type: "Appointment", label: "Appointment" },
      { type: "ServiceRequest", label: "Service Request" },
      { type: "DocumentReference", label: "Document" },
      { type: "Consent", label: "Consent" },
      { type: "Task", label: "Task" },
      { type: "Communication", label: "Messaging" },
      { type: "RelatedPerson", label: "Related Person" },
      { type: "Flag", label: "Clinical Alert" },
      { type: "QuestionnaireResponse", label: "Questionnaire" },
    ],
  },
  {
    group: "Billing & Financial",
    resources: [
      { type: "Claim", label: "Claim" },
      { type: "ClaimResponse", label: "Claim Response" },
      { type: "Coverage", label: "Coverage" },
      { type: "Invoice", label: "Invoice" },
      { type: "ExplanationOfBenefit", label: "EOB" },
      { type: "MeasureReport", label: "Measure Report" },
    ],
  },
  {
    group: "Organization & Settings",
    resources: [
      { type: "Practitioner", label: "Practitioner" },
      { type: "Organization", label: "Organization" },
      { type: "Location", label: "Location" },
      { type: "HealthcareService", label: "Service" },
    ],
  },
];

/**
 * Page-level permissions — only for non-FHIR pages.
 * FHIR resource access is controlled entirely by SMART scopes above.
 * These categories control sidebar visibility and page access for
 * pages that don't go through the FHIR server.
 */
export const PERMISSION_CATEGORIES: { category: string; permissions: { key: string; label: string }[] }[] = [
  {
    category: "Messaging",
    permissions: [
      { key: "messaging.read", label: "View Messages" },
      { key: "messaging.send", label: "Send Messages" },
    ],
  },
  {
    category: "Reports",
    permissions: [
      { key: "reports.read", label: "View Reports" },
      { key: "reports.write", label: "Manage Reports" },
    ],
  },
  {
    category: "Administration",
    permissions: [
      { key: "admin.users", label: "Manage Users" },
      { key: "admin.settings", label: "Manage Settings" },
      { key: "admin.roles", label: "Manage Roles" },
    ],
  },
];
