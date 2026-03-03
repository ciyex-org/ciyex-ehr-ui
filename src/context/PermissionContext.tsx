"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

type PermissionContextType = {
  permissions: string[];
  role: string;
  superAdmin: boolean;
  loading: boolean;
  /** Exact match: user has this specific permission key */
  hasPermission: (key: string) => boolean;
  /** Category match: user has ANY permission starting with `category.` */
  hasCategory: (category: string) => boolean;
  /** Write match: user has any non-`.read` permission in the category */
  hasCategoryWrite: (category: string) => boolean;
  /** Refresh permissions from server */
  refreshPermissions: () => Promise<void>;
};

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
};

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("token") || localStorage.getItem("authToken"))
        : null;
      if (!token) {
        setLoading(false);
        return;
      }

      const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
      if (!apiUrl) {
        setLoading(false);
        return;
      }

      const res = await fetchWithAuth(`${apiUrl}/api/user/permissions`);
      if (!res.ok) {
        console.warn("Failed to fetch permissions:", res.status);
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setPermissions(json.data.permissions || []);
        setRole(json.data.role || "");
        setSuperAdmin(json.data.superAdmin === true);
      }
    } catch (err) {
      console.warn("Failed to fetch permissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Retry when auth token becomes available (same pattern as MenuContext)
  useEffect(() => {
    if (permissions.length > 0 || role) return;

    const handleAuthToken = () => fetchPermissions();

    let retryCount = 0;
    const maxRetries = 20;
    const interval = setInterval(() => {
      retryCount++;
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      if (token && permissions.length === 0 && !role) {
        fetchPermissions();
        clearInterval(interval);
      } else if (retryCount >= maxRetries) {
        clearInterval(interval);
      }
    }, 500);

    window.addEventListener("auth-token-set", handleAuthToken);

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth-token-set", handleAuthToken);
    };
  }, [fetchPermissions, permissions.length, role]);

  const hasPermission = useCallback(
    (key: string) => superAdmin || permissions.includes(key),
    [permissions, superAdmin]
  );

  const hasCategory = useCallback(
    (category: string) =>
      superAdmin || permissions.some((p) => p.startsWith(category + ".")),
    [permissions, superAdmin]
  );

  const hasCategoryWrite = useCallback(
    (category: string) =>
      superAdmin ||
      permissions.some((p) => p.startsWith(category + ".") && !p.endsWith(".read")),
    [permissions, superAdmin]
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        role,
        superAdmin,
        loading,
        hasPermission,
        hasCategory,
        hasCategoryWrite,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};
