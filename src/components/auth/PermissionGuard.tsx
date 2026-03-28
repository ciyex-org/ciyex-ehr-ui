"use client";

import { usePathname } from "next/navigation";
import { ShieldX } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/context/PermissionContext";
import { useMenu } from "@/context/MenuContext";

interface PermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps page content and shows a 403 screen if the current user's permissions
 * do not include the permission required by the current menu route.
 *
 * Pages with no requiredPermission in the menu are always visible to authenticated users.
 */
export default function PermissionGuard({ children }: PermissionGuardProps) {
  const pathname = usePathname();
  const { permissions, hasCategory, loading: permLoading } = usePermissions();
  const { pagePermissionMap, isLoading: menuLoading } = useMenu();

  // Wait for both permission and menu data
  if (permLoading || menuLoading) return null;

  // If user has zero permissions, block all screens entirely
  if (permissions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <ShieldX className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            No Access
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Your account has no permissions configured. Contact your administrator
            to set up your role and access rights.
          </p>
        </div>
      </div>
    );
  }

  // Find the required permission for the current path.
  // Try exact match first, then prefix match (longest wins).
  const requiredPermission =
    pagePermissionMap[pathname] ??
    Object.entries(pagePermissionMap)
      .filter(([slug]) => pathname.startsWith(slug + "/"))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    undefined;

  // No entry in menu → open to all authenticated users
  if (requiredPermission === undefined || requiredPermission === null) {
    return <>{children}</>;
  }

  if (!hasCategory(requiredPermission)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <ShieldX className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            You don&apos;t have permission to view this page. Contact your administrator
            if you believe this is a mistake.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
