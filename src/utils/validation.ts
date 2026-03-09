/** Validation utilities for form fields */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;
const FAX_RE = /^[+]?[\d\s().-]{7,20}$/;
const URL_RE = /^https?:\/\/.+\..+/;
const NPI_RE = /^\d{10}$/;

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  return PHONE_RE.test(v.trim());
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
