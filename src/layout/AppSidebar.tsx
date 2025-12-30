
"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  SettingsIcon, // ensure this exists in ../icons/index
  RecallIcon,
  AppointmentIcon, InventoryIcon,
} from "../icons/index";

// Prevent hydration mismatch
const useHasMounted = () => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  return hasMounted;
};


// ===== Types (nested) =====
type SubItem = {
  name: string;
  path?: string;
  pro?: boolean;
  new?: boolean;
  subItems?: SubItem[];
  requiresPatient?: boolean;  // allow nesting
  customComponent?: boolean;  // allow custom sidebar component
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

// ===== Data =====
const navItems: NavItem[] = [
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/calendar",
  },

{
    icon: <AppointmentIcon />,
    name: "Appointments",
    path: "/appointments", //  top-level now
  },

  {
    // Updated Patients icon with SVG path
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2C10.343 2 9 3.343 9 5C9 6.657 10.343 8 12 8C13.657 8 15 6.657 15 5C15 3.343 13.657 2 12 2zM12 4C12.553 4 13 4.447 13 5C13 5.553 12.553 6 12 6C11.447 6 11 5.553 11 5C11 4.447 11.447 4 12 4zM6 14C6 13.447 6.447 13 7 13H17C17.553 13 18 13.447 18 14V19C18 19.553 17.553 20 17 20H7C6.447 20 6 19.553 6 19V14zM8 14V18H16V14H8z"
        />
      </svg>
    ),
    name: "Patients", // New menu item for Patients
    subItems: [
      { name: "Patient List", path: "/patients" },
      { name: "Encounters", path: "/all-encounters" },
      {name:"Messaging",path: "/messaging"},
      { name: "Education", path: "/patient_education" },
        { name: "Codes list", path: "/patients/codes" },
        { name: "Claim Management", path: "/patients/claim-management" },

    ],
  },


  {
    icon: <InventoryIcon />, // swap MessagingIcon → better inventory icon
    name: "Inventory",
    subItems: [
      { name: "Dashboard", path: "/inventory-management" },
      { name: "Inventory", path: "/inventory-management/inventory" },
      { name: "Orders", path: "/inventory-management/orders" },
      { name: "Records", path: "/inventory-management/records" },
      { name: "Suppliers", path: "/inventory-management/suppliers" },
      { name: "Maintenance", path: "/inventory-management/maintenance" },
      { name: "Settings", path: "/inventory-management/settings" },
    ],
  },



  {
    icon: <RecallIcon />,
    name: "Recall",
    path: "/recall",
  },

  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    name: "Reports",
    subItems: [
      { name: "Patient Report", path: "/reports/patient" },
      { name: "Appointment Report", path: "/reports/appointment" },
      { name: "Encounter Report", path: "/reports/encounter" },
      { name: "Payment Reports", path: "/reports/payment" },
    ],
  },

  {
    icon: <SettingsIcon />,
    name: "Settings",
    subItems: [
     
      { name: "Providers", path: "/settings/providers" },
      { name: "Referral Providers", path: "/settings/referral-providers" },
      { name: "Referral Practices", path: "/settings/referral-practices" },
      { name: "Insurance companies", path: "/settings/insurance" },
      { name: "Documents", path: "/settings/Documents" },
      { name: "TemplateDocuments", path: "/settings/templateDocument" },
      {
        name: "Codes", path: "/settings/codes",
      },
      { name: "Integration", path: "/settings/config" },
        { name: "Services", path: "/settings/services" },
        { name: "Billing", path: "/settings/billing" },

      {
        name: "Forms",
        subItems: [
          { name: "Lists", path: "/settings/forms/lists" },
          { name: "Encounters Section", path: "/settings/forms/admin" },
        ],
      },
       { name: "Facilities", path: "/settings/facilities" },
      { name: "Practice", path: "/settings/practice" },
    ],
  },

  {
    name: "Labs",
    icon: <BoxCubeIcon />,
    subItems: [
      {
        name: "Lab Orders",
        path: "/labs/orders",
        pro: false,
      },
      {
        name: "Lab Results",
        path: "/labs/results",
        pro: false,
      },
    ],
  },
];


// ===== Component =====
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const hasMounted = useHasMounted();

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
  const [openL2, setOpenL2] = useState<Record<string, boolean>>({}); // key = "type-index-subIndex"

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

      // direct match on top-level path
      if (nav.path && isActive(nav.path)) {
        setOpenTop({ type: "main", index: i });
        found = true;
        break;
      }

      // match inside sub-items
      if (nav.subItems && checkDescActive(nav.subItems)) {
        setOpenTop({ type: "main", index: i });
        found = true;
        break;
      }
    }

    if (!found) setOpenTop(null);
  }, [pathname, isActive]);

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
                          // Level-2 link with path
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
                          // Level-2 plain label
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
        <Link href="/calendar">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/ciyex-logo.png"
                alt="Ciyex Dashboard"
                width={140}
                height={32}
              />
              <Image
                className="hidden dark:block"
                src="/images/ciyex-logo.png"
                alt="Ciyex Dashboard"
                width={140}
                height={32}
              />
            </>
          ) : (
            <Image 
              src="/images/ciyex-logo-no-text.png" 
              alt="Ciyex" 
              width={40} 
              height={40} 
              className="rounded-lg"
            />
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
              {renderMenuItems(navItems, "main")}
            </div>

            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
              </h2>
            </div>
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;