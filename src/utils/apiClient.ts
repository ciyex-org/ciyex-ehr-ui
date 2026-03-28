/**
 * API Client with automatic token refresh
 */

import { refreshAccessToken, clearAuth, getAuthHeader } from './authUtils';

interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRetry?: boolean;
}

/**
 * Enhanced fetch with automatic token refresh
 */
export const apiClient = async (url: string, options: ApiRequestOptions = {}): Promise<Response> => {
  const { skipAuth = false, skipRetry = false, ...fetchOptions } = options;

  // Add auth header if not skipped
  if (!skipAuth) {
    const authHeader = getAuthHeader();
    fetchOptions.headers = {
      ...fetchOptions.headers,
      ...authHeader,
    };
  }

  // Make the request
  let response = await fetch(url, fetchOptions);

  // If 401 and we haven't already retried, try to refresh token
  if (response.status === 401 && !skipRetry && !skipAuth) {
    console.log('API request failed with 401, attempting token refresh...');
    
    const refreshed = await refreshAccessToken();
    
    if (refreshed) {
      console.log('Token refreshed, retrying API request...');
      
      // Retry the request with new token
      const newAuthHeader = getAuthHeader();
      fetchOptions.headers = {
        ...fetchOptions.headers,
        ...newAuthHeader,
      };
      
      response = await fetch(url, { ...fetchOptions, skipRetry: true } as ApiRequestOptions);
    } else {
      console.log('Token refresh failed, redirecting to signin...');
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    }
  }

  return response;
};

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (url: string, options?: ApiRequestOptions) => 
    apiClient(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiClient(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiClient(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: (url: string, options?: ApiRequestOptions) => 
    apiClient(url, { ...options, method: 'DELETE' }),
};