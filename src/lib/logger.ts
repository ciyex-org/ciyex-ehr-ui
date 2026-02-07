import { getEnv } from "@/utils/env";
/**
 * Logger utility for consistent logging across the application
 * In production, logs can be disabled or sent to a logging service
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warning messages
   */
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log error messages (always, but structured)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log debug messages (only in development with DEBUG flag)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment && getEnv("NEXT_PUBLIC_DEBUG") === 'true') {
      console.debug('[DEBUG]', ...args);
    }
  },
};

export default logger;
