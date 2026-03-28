"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/app/(admin)/layout";
import {
  Package, LayoutDashboard, ShoppingCart, FileText, Truck, Wrench, Settings,
} from "lucide-react";

const Dashboard = dynamic(() => import("@/components/inventory-management/Dashboard/Dashboard"), { ssr: false });
const Inventory = dynamic(() => import("@/components/inventory-management/Inventory/Inventory"), { ssr: false });
const Orders = dynamic(() => import("@/components/inventory-management/Orders/Orders"), { ssr: false });
const Records = dynamic(() => import("@/components/inventory-management/Records/Records"), { ssr: false });
const Suppliers = dynamic(() => import("@/components/inventory-management/Suppliers/Suppliers"), { ssr: false });
const Maintenance = dynamic(() => import("@/components/inventory-management/Maintenance/Maintenance"), { ssr: false });
const SettingsPanel = dynamic(() => import("@/components/inventory-management/Settings/Settings"), { ssr: false });

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "records", label: "Records", icon: FileText },
  { key: "suppliers", label: "Suppliers", icon: Truck },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

function renderPanel(key: NavKey) {
  switch (key) {
    case "dashboard": return <Dashboard />;
    case "inventory": return <Inventory />;
    case "orders": return <Orders />;
    case "records": return <Records />;
    case "suppliers": return <Suppliers />;
    case "maintenance": return <Maintenance />;
    case "settings": return <SettingsPanel />;
  }
}

export default function InventoryManagementPage() {
  const [active, setActive] = useState<NavKey>("dashboard");

  return (
    <AdminLayout>
      <div className="flex h-full overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Inventory</h1>
                <p className="text-[10px] text-slate-500">Manage stock & supplies</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 min-h-0 overflow-y-auto py-2 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActive(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium mb-0.5 transition ${
                    isActive
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {renderPanel(active)}
        </div>
      </div>
    </AdminLayout>
  );
}
