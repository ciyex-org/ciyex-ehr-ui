/**
 * Types for Claims Management
 */

export interface ClaimLineDetail {
  lineid: number;
  dos: number[];
  code: string;
  description: string;
  provider: string;
  totalSubmittedAmount: number;
}

export interface Claim {
  id: number;
  patientId?: number;
  patientName?: string;
  claimNumber?: string;
  provider?: string;
  carrier?: string;
  type?: string;
  status?: string;
  totalAmount?: number;
  dateOfService?: string;
  createdAt?: string;
  updatedAt?: string;
  hasAttachments?: boolean;
  narrative?: string;
}

export interface Patient {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
