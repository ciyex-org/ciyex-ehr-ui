export interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
  groups: string[];
  createdTimestamp?: number;
  temporaryPassword?: string;
  practitionerFhirId?: string;
  npi?: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleName: string;
  temporaryPassword?: string;
  sendWelcomeEmail: boolean;
  generatePrintCredentials: boolean;
  linkedFhirId?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roleName?: string;
  enabled?: boolean;
}

export interface ResetPasswordResponse {
  userId: string;
  username: string;
  temporaryPassword: string;
  practiceName?: string;
  portalUrl?: string;
  resetDate: string;
}

export const SYSTEM_ROLES = [
  { value: "ADMIN", label: "Administrator" },
  { value: "PROVIDER", label: "Provider" },
  { value: "NURSE", label: "Nurse" },
  { value: "MA", label: "Medical Assistant" },
  { value: "FRONT_DESK", label: "Front Desk" },
  { value: "BILLING", label: "Billing" },
  { value: "PATIENT", label: "Patient" },
] as const;

export const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  PROVIDER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  NURSE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  MA: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  FRONT_DESK: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  BILLING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PATIENT: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};
