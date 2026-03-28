"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminLayout from "@/app/(admin)/layout";
import { LayoutDashboard, Menu, ClipboardList, Settings, Globe } from "lucide-react";

const LAYOUT_SETTINGS_NAV = [
    { href: "/settings/layout-settings", label: "Chart", icon: LayoutDashboard },
    { href: "/settings/menu-configuration", label: "Menu", icon: Menu },
    { href: "/settings/encounter-settings", label: "Encounter", icon: ClipboardList },
    { href: "/settings/portal-settings", label: "Portal", icon: Globe },
    { href: "/settings/layout-settings/config/settings", label: "Settings", icon: Settings },
];

// Pages that show the layout settings sidebar
const LAYOUT_PAGES = LAYOUT_SETTINGS_NAV.map((n) => n.href);

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "";
    const router = useRouter();

    const showSidebar = LAYOUT_PAGES.some((p) =>
        p === pathname ||
        (p === "/settings/layout-settings" && pathname.startsWith("/settings/layout-settings")) ||
        (p === "/settings/portal-settings" && pathname.startsWith("/settings/portal-settings"))
    );

    return (
        <AdminLayout>
            {showSidebar ? (
                <div className="flex h-full">
                    <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto shrink-0">
                        <div className="px-3 py-3 border-b border-gray-200">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <LayoutDashboard className="w-3.5 h-3.5" /> Layout Settings
                            </h2>
                        </div>
                        <nav className="p-1.5 space-y-0.5">
                            {LAYOUT_SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
                                const isActive = href === pathname ||
                                    (href === "/settings/layout-settings" && pathname.startsWith("/settings/layout-settings") && !pathname.startsWith("/settings/layout-settings/config/settings")) ||
                                    (href === "/settings/portal-settings" && pathname.startsWith("/settings/portal-settings"));
                                return (
                                    <button
                                        key={href}
                                        onClick={() => router.push(href)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                                            isActive
                                                ? "bg-blue-50 text-blue-700 font-medium"
                                                : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {children}
                    </div>
                </div>
            ) : (
                children
            )}
        </AdminLayout>
    );
}
