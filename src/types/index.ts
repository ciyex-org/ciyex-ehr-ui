/**
 * Central Types Export
 */

export * from './claims';

// Common API Response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// Common Error type for catch blocks
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
}

// Helper to check if error is AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error;
}

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
