"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getEnv } from "@/utils/env";

// Types matching backend MenuDetailDto
export type MenuItemData = {
  id: string;
  itemKey: string;
  label: string;
  icon: string | null;
  screenSlug: string | null;
  position: number;
  roles: string[] | null;
  requiredPermission: string | null;
};

export type MenuItemNode = {
  item: MenuItemData;
  children: MenuItemNode[] | null;
};

export type MenuData = {
  menu: {
    id: string;
    code: string;
    name: string;
    orgId: string;
  };
  items: MenuItemNode[];
};

type MenuContextType = {
  menuItems: MenuItemNode[];
  isLoading: boolean;
  isOrgCustom: boolean;
  menuId: string | null;
  pageTitleMap: Record<string, string>;
  /** Maps screenSlug → requiredPermission (null means visible to all) */
  pagePermissionMap: Record<string, string | null>;
  refreshMenu: () => Promise<void>;
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
};

// Build a flat { path: label } map from the menu tree for page titles
function buildPageTitleMap(items: MenuItemNode[]): Record<string, string> {
  const map: Record<string, string> = {};

  function traverse(nodes: MenuItemNode[]) {
    for (const node of nodes) {
      if (node.item.screenSlug) {
        map[node.item.screenSlug] = node.item.label;
      }
      if (node.children?.length) {
        traverse(node.children);
      }
    }
  }

  traverse(items);
  return map;
}

function buildPagePermissionMap(items: MenuItemNode[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};

  function traverse(nodes: MenuItemNode[]) {
    for (const node of nodes) {
      if (node.item.screenSlug) {
        map[node.item.screenSlug] = node.item.requiredPermission;
      }
      if (node.children?.length) {
        traverse(node.children);
      }
    }
  }

  traverse(items);
  return map;
}

/** Read a pre-fetched permission map injected into localStorage by automated tests */
function readCachedPermissionMap(): Record<string, string | null> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("__menu_perm_map_cache__");
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string | null>;
  } catch {
    return {};
  }
}

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItemNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrgCustom, setIsOrgCustom] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pageTitleMap, setPageTitleMap] = useState<Record<string, string>>({});
  const [pagePermissionMap, setPagePermissionMap] = useState<Record<string, string | null>>(readCachedPermissionMap);

  const fetchMenu = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
      if (!apiUrl) {
        setIsLoading(false);
        return;
      }

      // Check for auth token before fetching - skip if not logged in
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("token") || localStorage.getItem("authToken"))
        : null;
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Include practice type if available from org settings
      const practiceType = typeof window !== "undefined" ? localStorage.getItem("practiceType") : null;
      const ptParam = practiceType ? `?practiceType=${encodeURIComponent(practiceType)}` : "";

      // Use plain fetch (not fetchWithAuth) to avoid auto-signout on 401
      const res = await fetch(`${apiUrl}/api/menus/ehr-sidebar${ptParam}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          ...(localStorage.getItem("orgId") ? { "X-Org-Id": localStorage.getItem("orgId")! } : {}),
          ...(localStorage.getItem("tenantName") ? { "X-Tenant-Name": localStorage.getItem("tenantName")! } : {}),
        },
      });
      if (!res.ok) {
        console.warn("Failed to fetch menu:", res.status);
        setIsLoading(false);
        return;
      }

      const data: MenuData = await res.json();
      setMenuItems(data.items || []);
      setMenuId(data.menu?.id || null);
      setPageTitleMap(buildPageTitleMap(data.items || []));
      setPagePermissionMap(buildPagePermissionMap(data.items || []));

      // Check if org has customizations (overrides)
      try {
        const customRes = await fetch(`${apiUrl}/api/menus/ehr-sidebar/has-custom`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            ...(localStorage.getItem("orgId") ? { "X-Org-Id": localStorage.getItem("orgId")! } : {}),
            ...(localStorage.getItem("tenantName") ? { "X-Tenant-Name": localStorage.getItem("tenantName")! } : {}),
          },
        });
        if (customRes.ok) {
          const customData = await customRes.json();
          setIsOrgCustom(customData.hasCustom === true);
        } else {
          setIsOrgCustom(false);
        }
      } catch {
        setIsOrgCustom(false);
      }
    } catch (err) {
      console.warn("Failed to fetch menu, using fallback:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Retry menu fetch when auth token becomes available after initial mount
  // This handles the race condition where MenuProvider mounts before the
  // auth callback stores the token in localStorage.
  // Also handles new-user login after sign-out (when existing menu items belong
  // to the previous user and must be replaced with the new user's menu).
  useEffect(() => {
    // Listen for localStorage changes (cross-tab) and custom auth event (same-tab).
    // NOTE: This listener is NOT guarded by menuItems.length so it fires for any
    // new login, even if a previous user's menu is already loaded.
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      const key = e instanceof StorageEvent ? e.key : (e as CustomEvent).detail?.key;
      if (key === "token" || key === "authToken") {
        fetchMenu();
      }
    };

    // Poll briefly for token availability (handles same-tab navigation from callback).
    // Only run the poll if we don't yet have menu items (initial load / after logout).
    let retryCount = 0;
    const maxRetries = 20; // 20 * 500ms = 10 seconds
    let interval: ReturnType<typeof setInterval> | null = null;
    if (menuItems.length === 0) {
      interval = setInterval(() => {
        retryCount++;
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        if (token && menuItems.length === 0) {
          fetchMenu();
          if (interval) clearInterval(interval);
        } else if (retryCount >= maxRetries) {
          if (interval) clearInterval(interval);
        }
      }, 500);
    }

    window.addEventListener("storage", handleStorageChange as EventListener);
    window.addEventListener("auth-token-set", handleStorageChange as EventListener);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange as EventListener);
      window.removeEventListener("auth-token-set", handleStorageChange as EventListener);
    };
  }, [fetchMenu, menuItems.length]);

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        isLoading,
        isOrgCustom,
        menuId,
        pageTitleMap,
        pagePermissionMap,
        refreshMenu: fetchMenu,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};
