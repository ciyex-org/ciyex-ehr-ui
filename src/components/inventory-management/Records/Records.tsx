"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDateTime } from "@/utils/dateUtils";

const API = getEnv("NEXT_PUBLIC_API_URL")!;

type Item = { id: number; name: string; category?: string; categoryName?: string; stock?: number; stockOnHand?: number; quantity?: number; currentStock?: number; stockQuantity?: number; unit: string };
type Adjustment = {
  id: number; itemId: number; itemName: string; quantityChange: number;
  reasonCode: string; notes: string; adjustedBy: string;
  referenceType: string; referenceId: number; createdAt: string;
};
type Waste = {
  id: number; itemId: number; itemName: string; quantity: number;
  reasonCode: string; notes: string; loggedBy: string; createdAt: string;
};

const RECORD_TABS = ["Adjustments", "Waste Log"] as const;
type RecordTab = (typeof RECORD_TABS)[number];

async function api<T>(url: string): Promise<T | null> {
  try {
    const res = await fetchWithAuth(url);
    const text = await res.text();
    if (!text) return null;
    const json = JSON.parse(text);
    return res.ok && json.success ? json.data : null;
  } catch { return null; }
}

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{text}</span>;
}

function reasonBadge(code: string) {
  const map: Record<string, string> = {
    received: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    consumed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    damaged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    expired: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    returned: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    correction: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  };
  return <Badge text={code} color={map[code] || "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"} />;
}

function formatDate(iso: string) {
  if (!iso) return "-";
  return formatDisplayDateTime(iso) || "-";
}

export default function Records() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [tab, setTab] = useState<RecordTab>("Adjustments");
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [waste, setWaste] = useState<Waste[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await api<Item[]>(`${API}/api/inventory/list`);
      if (data) setItems(data);
      setLoading(false);
    })();
  }, []);

  const loadRecords = useCallback(async (itemId: number) => {
    setRecordLoading(true);
    const [adj, w] = await Promise.all([
      api<Adjustment[]>(`${API}/api/inventory/${itemId}/adjustments`),
      api<Waste[]>(`${API}/api/inventory/${itemId}/waste`),
    ]);
    setAdjustments(adj || []);
    setWaste(w || []);
    setRecordLoading(false);
  }, []);

  function selectItem(item: Item) {
    setSelectedItem(item);
    setTab("Adjustments");
    loadRecords(item.id);
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        View stock adjustment history and waste logs per item.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Item Selector */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-3 dark:border-slate-700">
              <Input placeholder="Search items..." value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div className="max-h-105 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading items...</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">No items found.</p>
              ) : (
                filtered.map((item) => (
                  <button key={item.id} onClick={() => selectItem(item)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                      selectedItem?.id === item.id ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{item.categoryName || item.category || "—"}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">|</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{String(item.stockOnHand ?? item.stock ?? item.quantity ?? item.currentStock ?? item.stockQuantity ?? 0)} {item.unit}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Records Panel */}
        <div className="lg:col-span-8">
          {!selectedItem ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">Select an item to view its records.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              {/* Item header */}
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedItem.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedItem.categoryName || selectedItem.category || "—"} &middot; Stock:{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {String(selectedItem.stockOnHand ?? selectedItem.stock ?? selectedItem.quantity ?? selectedItem.currentStock ?? selectedItem.stockQuantity ?? 0)}
                  </span>{" "}{selectedItem.unit}
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 border-b border-slate-200 px-4 pt-2 dark:border-slate-700">
                {RECORD_TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                      tab === t ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-4">
                {recordLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading records...</p>
                ) : tab === "Adjustments" ? (
                  adjustments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No adjustments recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Date</th>
                            <th className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">Qty</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Reason</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Notes</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">By</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Ref</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {adjustments.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(a.createdAt)}</td>
                              <td className={`px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap ${
                                a.quantityChange > 0 ? "text-green-600 dark:text-green-400" : a.quantityChange < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500"}`}>
                                {a.quantityChange > 0 ? "+" : ""}{a.quantityChange}
                              </td>
                              <td className="px-3 py-2">{reasonBadge(a.reasonCode)}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-45 truncate">{a.notes || "-"}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{a.adjustedBy || "-"}</td>
                              <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                {a.referenceType ? `${a.referenceType}#${a.referenceId}` : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  waste.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No waste entries recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Date</th>
                            <th className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">Qty</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Reason</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Notes</th>
                            <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {waste.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(w.createdAt)}</td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">-{w.quantity}</td>
                              <td className="px-3 py-2">{reasonBadge(w.reasonCode)}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-55 truncate">{w.notes || "-"}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{w.loggedBy || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
