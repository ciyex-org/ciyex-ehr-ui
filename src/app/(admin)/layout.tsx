"use client";


import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { useMenu } from "@/context/MenuContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { usePathname } from "next/navigation";
import AppointmentModal from "@/components/calendar/AppointmentModal";
import { useLowStockNotifications } from "@/hooks/useLowStockNotifications";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PermissionGuard from "@/components/auth/PermissionGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const { pageTitleMap } = useMenu();
    const pathname = usePathname() || "";

    // ✅ OrgId from localStorage
    const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") : null;

    // ✅ Track settings
    const [lowStockAlerts, setLowStockAlerts] = useState(false);
    const [threshold, setThreshold] = useState(10);

    // ✅ Load settings once on mount
    useEffect(() => {
        if (!orgId) return;
        (async () => {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/inventory-settings/${orgId}`
                );
                const text = await res.text();
                if (!text) return;
                const json = JSON.parse(text);

                if (res.ok && json.success) {
                    setLowStockAlerts(json.data.lowStockAlerts);
                    setThreshold(json.data.criticalLowPercentage);
                }
            } catch (err) {
                console.error("Failed to load inventory settings:", err);
            }
        })();
    }, [orgId]);

    // ✅ Run notifications only if toggle is ON
    useLowStockNotifications(orgId, threshold, lowStockAlerts);

    // Page title mapping comes from Menu API; empty fallback
    const fallbackMapping: Record<string, string> = {};

    // Merge: API-driven mapping takes priority, fallback fills gaps
    const mapping = useMemo(() => ({
        ...fallbackMapping,
        ...pageTitleMap,
    }), [pageTitleMap]);

    const pageTitle =
        Object.entries(mapping)
            .filter(([key]) => pathname.startsWith(key))
            .sort((a, b) => b[0].length - a[0].length)[0]?.[1] || "";

    const mainContentMargin = isMobileOpen
        ? "ml-0"
        : isExpanded || isHovered
            ? "lg:ml-[290px]"
            : "lg:ml-[90px]";

    return (
        <ProtectedRoute>
            <div className="h-screen overflow-hidden xl:flex font-sans text-[15px] leading-6 antialiased transition-colors duration-300 bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <AppSidebar />
                <Backdrop />

                <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${mainContentMargin}`}>
                    <AppHeader pageTitle={pageTitle} />
                    <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 relative">
                        <div key={pathname} className="transition-colors duration-300 h-full">
                            <PermissionGuard>
                                {children}
                            </PermissionGuard>
                        </div>
                    </div>
                </div>

                <AppointmentModal />
            </div>
        </ProtectedRoute>
    );
}
