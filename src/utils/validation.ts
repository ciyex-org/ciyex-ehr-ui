/** Validation utilities for form fields */

const NAME_RE = /^[A-Za-z\s\-'.]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
