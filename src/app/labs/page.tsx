"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/app/(admin)/layout";
import { FlaskConical, TestTube, FileBarChart } from "lucide-react";

const LabOrderPage = dynamic(() => import("@/components/laborder/LabOrderPage"), { ssr: false });
const LabResultsTable = dynamic(() => import("@/components/labresults/LabResultsTable"), { ssr: false });

const NAV_ITEMS = [
  { key: "orders", label: "Lab Orders", icon: TestTube },
  { key: "results", label: "Lab Results", icon: FileBarChart },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

export default function LabsPage() {
  const [active, setActive] = useState<NavKey>("orders");

  return (
    <AdminLayout>
      <div className="flex h-full min-h-0 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 dark:bg-teal-900/40 rounded-lg">
                <FlaskConical className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Labs</h1>
                <p className="text-[10px] text-slate-500">Orders & results</p>
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
                      ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
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
          {active === "orders" && <LabOrderPage />}
          {active === "results" && (
            <div className="p-6 space-y-6">
              <LabResultsTable />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
