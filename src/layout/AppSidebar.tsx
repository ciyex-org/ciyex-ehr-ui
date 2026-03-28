
"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useMenu, type MenuItemNode } from "../context/MenuContext";
import { usePermissions } from "../context/PermissionContext";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
} from "../icons/index";
import {
  Calendar, CalendarCheck, Users, Package, Bell, BarChart3,
  Settings, FlaskConical, List, ClipboardList, MessageSquare,
  GraduationCap, FileCode, Receipt, LayoutDashboard, ShoppingCart,
  FileText, Truck, Wrench, UserCog, UserPlus, Building, Shield,
  FilePlus, Plug, Briefcase, CreditCard, FileInput, Building2,
  Stethoscope, LayoutGrid, Menu, TestTube, FileBarChart, DollarSign,
  Store, Code2, Palette, CheckSquare, ArrowRightLeft, ShieldCheck,
  FileCheck, Syringe, ScrollText, Printer, TabletSmartphone, BookOpen,
  Globe, ShieldAlert, ScanLine, Pill, HeartPulse, Bot,
  type LucideIcon,
} from "lucide-react";
import PluginSlot from "@/components/plugins/PluginSlot";

// Prevent hydration mismatch
const useHasMounted = () => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);
  return hasMounted;
};

// ===== Types (nested) =====
type SubItem = {
  name: string;
  path?: string;
  pro?: boolean;
  new?: boolean;
  subItems?: SubItem[];
  requiresPatient?: boolean;
  customComponent?: boolean;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

// Map Lucide icon name strings from the database to React components
const SIDEBAR_ICON_MAP: Record<string, LucideIcon> = {
  Calendar, CalendarCheck, Users, Package, Bell, BarChart3,
  Settings, FlaskConical, List, ClipboardList, MessageSquare,
  GraduationCap, FileCode, Receipt, LayoutDashboard, ShoppingCart,
  FileText, Truck, Wrench, UserCog, UserPlus, Building, Shield,
  FilePlus, Plug, Briefcase, CreditCard, FileInput, Building2,
  Stethoscope, LayoutGrid, Menu, TestTube, FileBarChart, DollarSign,
  Store, Code2, Palette, CheckSquare, ArrowRightLeft, ShieldCheck,
  FileCheck, Syringe, ScrollText, Printer, TabletSmartphone, BookOpen,
  Globe, ShieldAlert, ScanLine, Pill, HeartPulse, Bot,
};

// Transform API menu tree nodes into SubItem[] (recursive)
function transformChildren(nodes: MenuItemNode[]): SubItem[] {
  return nodes.map((node) => ({
    name: node.item.label,
    path: node.item.screenSlug || undefined,
    subItems: node.children?.length ? transformChildren(node.children) : undefined,
  }));
}

// Transform API menu tree into NavItem[] for the sidebar renderer
function transformMenuToNavItems(items: MenuItemNode[]): NavItem[] {
  return items.map((node) => {
    const IconComponent = node.item.icon ? SIDEBAR_ICON_MAP[node.item.icon] : null;
    const icon = IconComponent
      ? <IconComponent className="h-6 w-6" />
      : <GridIcon />;

    const hasChildren = !!node.children?.length;
    return {
      name: node.item.label,
      icon,
      path: hasChildren ? undefined : (node.item.screenSlug || undefined),
      subItems: hasChildren ? transformChildren(node.children!) : undefined,
    };
  });
}

// Empty fallback — all navigation comes from the Menu API (database)
const FALLBACK_NAV_ITEMS: NavItem[] = [];

// Filter menu tree by permissions (recursive).
// An item is visible if:
//   - it has no requiredPermission (null) → always visible
//   - or the user hasCategory(requiredPermission)
// A parent with children is visible if it has at least one visible child.
function filterByPermission(
  items: MenuItemNode[],
  hasCategory: (cat: string) => boolean
): MenuItemNode[] {
  return items
    .map((node) => {
      const perm = node.item.requiredPermission;
      const selfAllowed = !perm || hasCategory(perm);

      // Recursively filter children
      const filteredChildren = node.children?.length
        ? filterByPermission(node.children, hasCategory)
        : [];

      // A parent item (with children) is shown if it has any visible child
      // A leaf item is shown only if selfAllowed
      if (node.children?.length) {
        // Parent: visible if selfAllowed AND has visible children
        if (selfAllowed && filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }

      // Leaf node
      return selfAllowed ? { ...node, children: filteredChildren } : null;
    })
    .filter(Boolean) as MenuItemNode[];
}

// ===== Component =====
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { menuItems, isLoading } = useMenu();
  const { hasCategory, loading: permLoading } = usePermissions();
  const pathname = usePathname();
  const hasMounted = useHasMounted();

  // Filter by permissions, then transform to NavItems
  const navItems = useMemo(() => {
    if (menuItems.length > 0) {
      const filtered = filterByPermission(menuItems, hasCategory);
      return transformMenuToNavItems(filtered);
    }
    return FALLBACK_NAV_ITEMS;
  }, [menuItems, hasCategory]);

  // Safe isActive (handles undefined, ignores query)
  const isActive = useCallback(
    (path?: string) => {
      if (!path) return false;
      try {
        const u = new URL(path, "http://local");
        return u.pathname === pathname;
      } catch {
        return path.split("?")[0] === pathname;
      }
    },
    [pathname]
  );

  // Open state:
  // - top: which top-level group is open (main/others + index)
  // - l2: which level-2 (within a top group) is open
  const [openTop, setOpenTop] = useState<{ type: "main" | "others"; index: number } | null>(null);
  const [openL2, setOpenL2] = useState<Record<string, boolean>>({});

  const toggleTop = (type: "main" | "others", index: number) => {
    setOpenTop((prev) => (prev && prev.type === type && prev.index === index ? null : { type, index }));
  };

  const toggleL2 = (key: string) => {
    setOpenL2((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const keyL2 = (type: "main" | "others", topIdx: number, subIdx: number) => `${type}-${topIdx}-${subIdx}`;

  // Auto-open parents when current route is inside them
  useEffect(() => {
    const checkDescActive = (items: SubItem[]): boolean => {
      for (const it of items) {
        if (it.path && isActive(it.path)) return true;
        if (it.subItems && checkDescActive(it.subItems)) return true;
      }
      return false;
    };

    let found = false;
    for (let i = 0; i < navItems.length; i++) {
      const nav = navItems[i];

      if (nav.path && isActive(nav.path)) {
        setOpenTop({ type: "main", index: i });
        found = true;
        break;
      }

      if (nav.subItems && checkDescActive(nav.subItems)) {
        setOpenTop({ type: "main", index: i });
        found = true;
        break;
      }
    }

    if (!found) setOpenTop(null);
  }, [pathname, isActive, navItems]);

  // Renderer
  const renderMenuItems = (items: NavItem[], type: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, topIdx) => {
        const topOpen = openTop?.type === type && openTop.index === topIdx;

        return (
          <li key={nav.name}>
            {/* Top row (button or link) */}
            {nav.subItems ? (
              <button
                onClick={() => toggleTop(type, topIdx)}
                className={`menu-item group ${
                  topOpen ? "menu-item-active" : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
              >
                <span className={`${topOpen ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                      topOpen ? "rotate-180 text-brand-500" : ""
                    }`}
                  />
                )}
              </button>
            ) : nav.path ? (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            ) : null}

            {/* Top-level dropdown (simple show/hide) */}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div className={`${topOpen ? "block" : "hidden"}`}>
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((sub, subIdx) => {
                    const hasKids = !!sub.subItems?.length;
                    const k = keyL2(type, topIdx, subIdx);
                    const l2Open = !!openL2[k];

                    return (
                      <li key={sub.name}>
                        {hasKids ? (
                          <>
                            {/* Level-2 toggle row with chevron */}
                            <button
                              type="button"
                              onClick={() => toggleL2(k)}
                              className={`menu-dropdown-item ${
                                l2Open
                                  ? "menu-dropdown-item-active"
                                  : "menu-dropdown-item-inactive"
                              } w-full flex items-center`}
                            >
                              <span>{sub.name}</span>
                              <ChevronDownIcon
                                className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                                  l2Open ? "rotate-180 text-brand-500" : ""
                                }`}
                              />
                            </button>

                            {/* Level-3 (e.g. Forms → Lists/Form Admin) */}
                            <div className={`${l2Open ? "block" : "hidden"}`}>
                              <ul className="ml-6 mt-1 space-y-1">
                                {sub.subItems!.map((g, gIdx) => {
                                  const hasGrandKids = !!g.subItems?.length;
                                  const gKey = `${k}-${gIdx}`;
                                  const l3Open = !!openL2[gKey];

                                  return (
                                    <li key={g.name}>
                                      {hasGrandKids ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => toggleL2(gKey)}
                                            className={`menu-dropdown-item ${
                                              l3Open
                                                ? "menu-dropdown-item-active"
                                                : "menu-dropdown-item-inactive"
                                            } w-full flex items-center`}
                                          >
                                            <span>{g.name}</span>
                                            <ChevronDownIcon
                                              className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                                                l3Open ? "rotate-180 text-brand-500" : ""
                                              }`}
                                            />
                                          </button>

                                          <div className={`${l3Open ? "block" : "hidden"}`}>
                                            <ul className="ml-6 mt-1 space-y-1">
                                              {g.subItems!.map((c) => (
                                                <li key={c.name}>
                                                  {c.path ? (
                                                    <Link
                                                      href={c.path}
                                                      className={`menu-dropdown-item ${
                                                        isActive(c.path)
                                                          ? "menu-dropdown-item-active"
                                                          : "menu-dropdown-item-inactive"
                                                      }`}
                                                    >
                                                      {c.name}
                                                    </Link>
                                                  ) : (
                                                    <div className="menu-dropdown-item menu-dropdown-item-inactive cursor-default">
                                                      {c.name}
                                                    </div>
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </>
                                      ) : g.path ? (
                                        <Link
                                          href={g.path}
                                          className={`menu-dropdown-item ${
                                            isActive(g.path)
                                              ? "menu-dropdown-item-active"
                                              : "menu-dropdown-item-inactive"
                                          }`}
                                        >
                                          {g.name}
                                        </Link>
                                      ) : (
                                        <div className="menu-dropdown-item menu-dropdown-item-inactive cursor-default">
                                          {g.name}
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </>
                        ) : sub.path ? (
                          <Link
                            href={sub.path}
                            className={`menu-dropdown-item ${
                              isActive(sub.path)
                                ? "menu-dropdown-item-active"
                                : "menu-dropdown-item-inactive"
                            }`}
                          >
                            {sub.name}
                          </Link>
                        ) : (
                          <div className="menu-dropdown-item menu-dropdown-item-inactive cursor-default">
                            {sub.name}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  // Show loading state until mounted to prevent hydration mismatch
  if (!hasMounted) {
    return (
      <div className="text-center">
        {/* Loading placeholder that matches server render */}
      </div>
    );
  }

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${(isExpanded || isMobileOpen) ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-6 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/calendar" className="flex items-center gap-2.5">
          <Image
            src="/images/ciyex-logo-no-text.png"
            alt="Ciyex"
            width={40}
            height={40}
            className="rounded-lg"
            style={{ width: "auto", height: "auto" }}
          />
          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              Ciyex EHR
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "Menu" : <HorizontaLDots />}
              </h2>
              {(isLoading || permLoading) ? (
                <div className="space-y-3 px-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                renderMenuItems(navItems, "main")
              )}
              {/* Plugin-injected navigation items */}
              <PluginSlot name="global:nav-item" className="mt-2" />
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
