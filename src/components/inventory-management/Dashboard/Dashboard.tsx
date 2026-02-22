"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

const API = getEnv("NEXT_PUBLIC_API_URL")!;

/* ---------- inline helpers ---------- */

function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {title && (
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: string | number; color?: string }) {
  const ring = color ? `border-l-4 border-l-${color}-500` : "";
  return (
    <Panel className={ring}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </Panel>
  );
}

function SimpleBarChart({ data, labelKey, valueKey }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const pct = Math.round((v / max) * 100);
        return (
          <div key={i}>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{String(d[labelKey])}</span>
              <span className="tabular-nums">{v}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- types ---------- */

interface LowStockItem {
  name: string;
  sku: string;
  stockOnHand: number;
  minStock: number;
  supplierName: string;
}

interface DashboardData {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingOrders: number;
  totalValue: number;
  expiringWithin30Days: number;
  overdueMaintenanceTasks: number;
  lowStockItems: LowStockItem[];
  categoryBreakdown: Record<string, unknown>[];
}

/* ---------- component ---------- */

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [supplierCount, setSupplierCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, suppRes] = await Promise.all([
          fetchWithAuth(`${API}/api/inventory/dashboard`),
          fetchWithAuth(`${API}/api/suppliers/count`),
        ]);
        const dash = await dashRes.json();
        const supp = await suppRes.json();
        if (dash.success) setData(dash.data);
        if (supp.success) setSupplierCount(supp.data ?? 0);
      } catch (e) {
        console.error("Dashboard fetch failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">Loading dashboard...</div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-red-400">Failed to load dashboard data.</div>
    );
  }

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <>
      <div className="space-y-6 p-1">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track stock, purchase orders, suppliers, and equipment upkeep.
        </p>

        {/* Alert banner */}
        {data.lowStockItems.length > 0 && (
          <Panel className="border-l-4 border-l-red-500">
            <div className="flex items-start gap-3">
              <span className="text-lg text-red-500">!</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-700 dark:text-red-400">Low Stock Alerts</h3>
                <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                  {data.lowStockItems.length} item{data.lowStockItems.length > 1 ? "s" : ""} below minimum:{" "}
                  {data.lowStockItems
                    .slice(0, 3)
                    .map((i) => i.name)
                    .join(", ")}
                  {data.lowStockItems.length > 3 && ` and ${data.lowStockItems.length - 3} more`}
                </p>
                <a href="/inventory-management/inventory" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View Inventory &rarr;
                </a>
              </div>
            </div>
          </Panel>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard title="Total Items" value={data.totalItems} />
          <MetricCard title="Low Stock" value={data.lowStockCount} color="amber" />
          <MetricCard title="Out of Stock" value={data.outOfStockCount} color="red" />
          <MetricCard title="Pending Orders" value={data.pendingOrders} />
          <MetricCard title="Total Value" value={fmtCurrency(data.totalValue)} />
          <MetricCard title="Expiring (30d)" value={data.expiringWithin30Days} />
          <MetricCard title="Overdue Maint." value={data.overdueMaintenanceTasks} color="red" />
          <MetricCard title="Active Suppliers" value={supplierCount} />
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category breakdown */}
          {data.categoryBreakdown.length > 0 && (
            <Panel title="Category Breakdown">
              <SimpleBarChart data={data.categoryBreakdown} labelKey="category" valueKey="count" />
            </Panel>
          )}

          {/* Low stock table */}
          {data.lowStockItems.length > 0 && (
            <Panel title="Low Stock Items">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">SKU</th>
                      <th className="pb-2 pr-4 text-right">Stock</th>
                      <th className="pb-2 pr-4 text-right">Min</th>
                      <th className="pb-2">Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStockItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                        <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{item.sku}</td>
                        <td className="py-2 pr-4 text-right font-mono text-red-600 dark:text-red-400">{item.stockOnHand}</td>
                        <td className="py-2 pr-4 text-right font-mono text-slate-500 dark:text-slate-400">{item.minStock}</td>
                        <td className="py-2 text-slate-500 dark:text-slate-400">{item.supplierName || "---"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
