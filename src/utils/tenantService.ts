import { getEnv } from "@/utils/env";
export interface AccessibleTenantsResponse {
  hasFullAccess: boolean;
  tenants: string[];
  requiresSelection: boolean;
}

export const getAccessibleTenants = async (token: string): Promise<AccessibleTenantsResponse> => {
  const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
  
  try {
    const response = await fetch(`${apiUrl}/api/tenants/accessible`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If endpoint doesn't exist or returns error, return default response
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        console.warn('Tenants endpoint not available, using default single tenant mode');
        return {
          hasFullAccess: true,
          tenants: [],
          requiresSelection: false,
        };
      }
      throw new Error(`Failed to fetch accessible tenants: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.warn('Error fetching accessible tenants, defaulting to single tenant mode:', error);
    // Return default response to allow app to continue
    return {
      hasFullAccess: true,
      tenants: [],
      requiresSelection: false,
    };
  }
};

export const getSelectedTenant = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('selectedTenant');
};

export const setSelectedTenant = (tenantName: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('selectedTenant', tenantName);
};

export const clearSelectedTenant = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('selectedTenant');
};
