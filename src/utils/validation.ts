/** Validation utilities for form fields */

const NAME_RE = /^[A-Za-z\s\-'.]+$/;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;
const US_PHONE_RE = /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const FAX_RE = /^[+]?[\d\s().-]{7,20}$/;
const URL_RE = /^https?:\/\/.+\..+/;
const NPI_RE = /^\d{10}$/;

export function isValidName(v: string): boolean {
  return NAME_RE.test(v.trim());
}

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  return PHONE_RE.test(v.trim());
}

/** Validate US phone number: exactly 10 digits */
export function isValidUSPhone(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  return digits.length === 10;
}

/** Format phone digits to US format: (xxx) xxx-xxxx */
export function formatUSPhone(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function isValidFax(v: string): boolean {
  return FAX_RE.test(v.trim());
}

export function isValidUrl(v: string): boolean {
  return URL_RE.test(v.trim());
}

export function isValidNpi(v: string): boolean {
  return NPI_RE.test(v.trim());
}

/** Validate SSN: exactly 9 digits (with or without dashes) */
export function isValidSSN(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  return digits.length === 9;
}

/** Validate that a string contains only letters (and spaces, hyphens, apostrophes) — no numbers */
export function isStringOnly(v: string): boolean {
  return /^[A-Za-z\s\-'.]+$/.test(v.trim());
}

/** Validate Driver License: alphanumeric, 5-20 characters */
export function isValidDriverLicense(v: string): boolean {
  return /^[A-Za-z0-9\-]{5,20}$/.test(v.trim());
}

/** Validate Medicaid ID: alphanumeric, 8-12 characters */
export function isValidMedicaidId(v: string): boolean {
  return /^[A-Za-z0-9]{8,12}$/.test(v.trim());
}

/** Validate Medicare Beneficiary ID (MBI): 11 characters, specific pattern */
export function isValidMedicareBeneficiaryId(v: string): boolean {
  return /^[1-9][A-Za-z][A-Za-z0-9][0-9][A-Za-z][A-Za-z0-9][0-9][A-Za-z]{2}[0-9]{2}$/.test(v.trim());
}
