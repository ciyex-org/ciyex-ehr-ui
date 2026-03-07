import { getEnv } from "@/utils/env";
/**
 * Authentication Utilities
 * Helper functions for handling both Keycloak and local authentication
 */

export interface UserAuth {
    token: string;
    email: string;
    fullName: string;
    authMethod: 'keycloak' | 'local';
    
    // Keycloak specific
    groups?: string[];
    userId?: string;
    
    // Local auth specific
    orgId?: string;
    orgIds?: number[];
    facilityId?: string;
    role?: string;
}

/**
 * Get current authentication method
 */
export const getAuthMethod = (): 'keycloak' | 'local' | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authMethod') as 'keycloak' | 'local' | null;
};

/**
 * Check if user is authenticated with Keycloak
 */
export const isKeycloakAuth = (): boolean => {
    return getAuthMethod() === 'keycloak';
};

/**
 * Check if user is authenticated with local auth
 */
export const isLocalAuth = (): boolean => {
    return getAuthMethod() === 'local';
};

/**
 * Get user's groups (Keycloak) or empty array
 */
export const getUserGroups = (): string[] => {
    if (typeof window === 'undefined') return [];
    const groupsStr = localStorage.getItem('groups');
    if (!groupsStr) return [];
    try {
        return JSON.parse(groupsStr);
    } catch {
        return [];
    }
};

/**
 * Check if user belongs to a specific group
 */
export const hasGroup = (groupName: string): boolean => {
    const groups = getUserGroups();
    return groups.includes(groupName);
};

/**
 * Check if user belongs to any of the specified groups
 */
export const hasAnyGroup = (groupNames: string[]): boolean => {
    const groups = getUserGroups();
    return groupNames.some(groupName => groups.includes(groupName));
};

/**
 * Check if user belongs to all of the specified groups
 */
export const hasAllGroups = (groupNames: string[]): boolean => {
    const groups = getUserGroups();
    return groupNames.every(groupName => groups.includes(groupName));
};

/**
 * Get user's primary group (first group in list)
 */
export const getPrimaryGroup = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('primaryGroup');
};

/**
 * Get user's organization ID (local auth) or primary group (Keycloak)
 */
export const getUserOrgIdentifier = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    if (isKeycloakAuth()) {
        return getPrimaryGroup();
    } else {
        return localStorage.getItem('orgId');
    }
};

/**
 * Get current user authentication data
 */
export const getCurrentUser = (): UserAuth | null => {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const authMethod = getAuthMethod();
    if (!authMethod) return null;
    
    const email = localStorage.getItem('userEmail') || '';
    const fullName = localStorage.getItem('userFullName') || '';
    
    if (authMethod === 'keycloak') {
        return {
            token,
            email,
            fullName,
            authMethod: 'keycloak',
            groups: getUserGroups(),
            userId: localStorage.getItem('userId') || undefined,
        };
    } else {
        const orgIdsStr = localStorage.getItem('orgIds');
        let orgIds: number[] = [];
        if (orgIdsStr) {
            try {
                orgIds = JSON.parse(orgIdsStr);
            } catch {
                orgIds = [];
            }
        }
        
        return {
            token,
            email,
            fullName,
            authMethod: 'local',
            orgId: localStorage.getItem('orgId') || undefined,
            orgIds,
            facilityId: localStorage.getItem('facilityId') || undefined,
            role: localStorage.getItem('role') || undefined,
        };
    }
};

/**
 * Check if user has access based on auth method
 * For Keycloak: checks group membership
 * For Local: checks org/facility/role
 */
export const hasAccess = (requirement: {
    groups?: string[];
    orgId?: string;
    facilityId?: string;
    role?: string;
}): boolean => {
    const user = getCurrentUser();
    if (!user) return false;
    
    if (user.authMethod === 'keycloak') {
        // For Keycloak, check group membership
        if (requirement.groups && requirement.groups.length > 0) {
            return hasAnyGroup(requirement.groups);
        }
        return true;
    } else {
        // For local auth, check org/facility/role
        if (requirement.orgId && user.orgId !== requirement.orgId) {
            return false;
        }
        if (requirement.facilityId && user.facilityId !== requirement.facilityId) {
            return false;
        }
        if (requirement.role && user.role !== requirement.role) {
            return false;
        }
        return true;
    }
};

/**
 * Store authentication tokens
 */
export const storeTokens = (accessToken: string, refreshToken?: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', accessToken);
    if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
    }
};

/**
 * Get refresh token
 */
export const getRefreshToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
};

/**
 * Clear all authentication data
 */
export const clearAuth = (): void => {
    if (typeof window === 'undefined') return;
    
    // Clear common auth data
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('authMethod');
    localStorage.removeItem('user');
    
    // Clear Keycloak specific data
    localStorage.removeItem('groups');
    localStorage.removeItem('userId');
    localStorage.removeItem('primaryGroup');
    
    // Clear local auth specific data
    localStorage.removeItem('orgId');
    localStorage.removeItem('orgIds');
    localStorage.removeItem('facilityId');
    localStorage.removeItem('role');
    
    // Clear tenant data
    localStorage.removeItem('selectedTenant');
    localStorage.removeItem('tenantName');
    
    // Clear session storage
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('processed_auth_code');
    sessionStorage.removeItem('lastActivity');
};

/**
 * Check if token exists (basic auth check)
 */
export const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
};

/**
 * Refresh access token using refresh token.
 * Uses a singleton pattern to prevent concurrent refresh calls
 * (Keycloak rotates refresh tokens — a second concurrent call would
 * use an already-consumed token and fail).
 */
let _refreshPromise: Promise<boolean> | null = null;

export const refreshAccessToken = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    // Singleton: if a refresh is already in flight, share the same promise
    if (_refreshPromise) {
        return _refreshPromise;
    }

    _refreshPromise = _doRefreshAccessToken();
    try {
        return await _refreshPromise;
    } finally {
        _refreshPromise = null;
    }
};

async function _doRefreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const API_BASE = getEnv("NEXT_PUBLIC_API_URL") || "";
        const refreshUrl = (API_BASE ? `${API_BASE.replace(/\/$/, "")}` : "") + "/api/auth/refresh";

        const response = await fetch(refreshUrl, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            // Do NOT call clearAuth() here — let the caller decide.
            // A concurrent race should not wipe valid tokens.
            return false;
        }

        const data = await response.json();

        if (data.success && data.data?.token) {
            storeTokens(data.data.token, data.data.refreshToken);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}

/**
 * Get authorization header for API requests
 */
export const getAuthHeader = (): { Authorization: string } | {} => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Map group name to display name
 */
export const getGroupDisplayName = (groupName: string): string => {
    // Remove prefixes for display
    if (groupName.startsWith('org-')) {
        return groupName.substring(4).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (groupName.startsWith('role-')) {
        return groupName.substring(5).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (groupName.startsWith('facility-')) {
        return groupName.substring(9).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return groupName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get all user's groups with display names
 */
export const getUserGroupsWithDisplayNames = (): Array<{ name: string; displayName: string }> => {
    const groups = getUserGroups();
    return groups.map(group => ({
        name: group,
        displayName: getGroupDisplayName(group),
    }));
};

/**
 * Get tenant name from JWT token or localStorage
 */
export const getTenantName = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    // First check localStorage (cached from JWT)
    const cachedTenant = localStorage.getItem('tenantName');
    if (cachedTenant) return cachedTenant;
    
    // Then check localStorage selectedTenant
    const selectedTenant = localStorage.getItem('selectedTenant');
    if (selectedTenant) return selectedTenant;
    
    // Finally try to decode from token
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const { jwtDecode } = require('jwt-decode');
            const decoded: any = jwtDecode(token);
            const org = decoded.organization;
            
            // Handle if organization is an object with a name property, or just a string
            let tenantName: string | null = null;
            if (typeof org === 'string') {
                tenantName = org;
            } else if (Array.isArray(org) && org.length > 0) {
                tenantName = String(org[0]);
            } else if (org && typeof org === 'object' && org.name) {
                tenantName = String(org.name);
            }
            
            if (tenantName) {
                localStorage.setItem('tenantName', tenantName);
                return tenantName;
            }
        } catch (error) {
            console.warn('Failed to decode JWT for tenant name:', error);
        }
    }
    
    return null;
};
