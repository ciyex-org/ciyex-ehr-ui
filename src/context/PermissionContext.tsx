"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

type PermissionContextType = {
  permissions: string[];
  role: string;
  loading: boolean;
  /** FHIR resource types the user can write (e.g. ["Appointment", "Patient"]) */
  writableResources: string[];
  /** FHIR resource types the user can read (e.g. ["Communication", "Patient"]) */
  readableResources: string[];
  /** Exact match: user has this specific permission key */
  hasPermission: (key: string) => boolean;
  /** Category match: user has ANY permission starting with `category.` */
  hasCategory: (category: string) => boolean;
  /** Write match: user has any non-`.read` permission in the category */
  hasCategoryWrite: (category: string) => boolean;
  /** Check if user can write a specific FHIR resource type (e.g. "Practitioner") */
  canWriteResource: (resourceType: string) => boolean;
  /** Check if user can read a specific FHIR resource type (e.g. "Communication") */
  canReadResource: (resourceType: string) => boolean;
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

/** Read pre-fetched permission data injected into localStorage by automated tests */
function readCachedPermissions(): { permissions: string[]; role: string } {
  try {
    if (typeof window === "undefined") return { permissions: [], role: "" };
    const raw = localStorage.getItem("__perm_cache__");
    if (!raw) return { permissions: [], role: "" };
    return JSON.parse(raw) as { permissions: string[]; role: string };
  } catch {
    return { permissions: [], role: "" };
  }
}

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = readCachedPermissions();
  const [permissions, setPermissions] = useState<string[]>(cached.permissions);
  const [role, setRole] = useState(cached.role);
  const [writableResources, setWritableResources] = useState<string[]>([]);
  const [readableResources, setReadableResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(!cached.role); // skip loading if we have cached data

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
        setWritableResources(json.data.writableResources || []);
        setReadableResources(json.data.readableResources || []);
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

  // Retry when auth token becomes available.
  // The listener is NOT guarded by existing permission state so a new-user login
  // after sign-out triggers a fresh fetch even when a previous user's data is loaded.
  useEffect(() => {
    const handleAuthToken = () => fetchPermissions();

    // Poll only when we don't yet have permissions (initial load / after logout).
    let retryCount = 0;
    const maxRetries = 20;
    let interval: ReturnType<typeof setInterval> | null = null;
    if (permissions.length === 0 && !role) {
      interval = setInterval(() => {
        retryCount++;
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        if (token && permissions.length === 0 && !role) {
          fetchPermissions();
          if (interval) clearInterval(interval);
        } else if (retryCount >= maxRetries) {
          if (interval) clearInterval(interval);
        }
      }, 500);
    }

    window.addEventListener("auth-token-set", handleAuthToken);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("auth-token-set", handleAuthToken);
    };
  }, [fetchPermissions, permissions.length, role]);

  const hasPermission = useCallback(
    (key: string) => permissions.includes(key),
    [permissions]
  );

  const hasCategory = useCallback(
    (category: string) =>
      permissions.some((p) => p.startsWith(category + ".")),
    [permissions]
  );

  const hasCategoryWrite = useCallback(
    (category: string) =>
      permissions.some((p) => p.startsWith(category + ".") && !p.endsWith(".read")),
    [permissions]
  );

  const canWriteResource = useCallback(
    (resourceType: string) =>
      writableResources.includes(resourceType),
    [writableResources]
  );

  const canReadResource = useCallback(
    (resourceType: string) =>
      readableResources.includes(resourceType) || writableResources.includes(resourceType),
    [readableResources, writableResources]
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        role,
        loading,
        writableResources,
        readableResources,
        hasPermission,
        hasCategory,
        hasCategoryWrite,
        canWriteResource,
        canReadResource,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};
