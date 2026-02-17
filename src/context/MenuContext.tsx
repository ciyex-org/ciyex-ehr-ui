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

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItemNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrgCustom, setIsOrgCustom] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pageTitleMap, setPageTitleMap] = useState<Record<string, string>>({});

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

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        isLoading,
        isOrgCustom,
        menuId,
        pageTitleMap,
        refreshMenu: fetchMenu,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};
