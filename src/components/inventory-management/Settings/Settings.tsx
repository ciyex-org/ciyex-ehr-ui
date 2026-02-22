"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useCallback } from "react";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

const API = getEnv("NEXT_PUBLIC_API_URL")!;

type Settings = {
  id?: number; lowStockAlerts: boolean; autoReorder: boolean;
  criticalLowPct: number; defaultCostMethod: string;
  poApprovalRequired: boolean; poApprovalThreshold: number;
};
type Category = { id: number; name: string; parentId: number | null; parentName: string | null };
type Location = { id: number; name: string; type: string; parentId: number | null; parentName: string | null };

const TABS = ["General", "Categories", "Locations"] as const;
type Tab = (typeof TABS)[number];

const COST_METHODS = ["fifo", "lifo", "average"];
const LOC_TYPES = ["room", "shelf", "bin", "cabinet"];

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {title && (
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

async function api<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetchWithAuth(url, opts);
    const text = await res.text();
    if (!text) return null;
    const json = JSON.parse(text);
    return res.ok && json.success ? json.data : null;
  } catch { return null; }
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>("General");
  const [settings, setSettings] = useState<Settings>({
    lowStockAlerts: true, autoReorder: false, criticalLowPct: 10,
    defaultCostMethod: "fifo", poApprovalRequired: false, poApprovalThreshold: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newLoc, setNewLoc] = useState({ name: "", type: "room" });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);

  useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 4000); return () => clearTimeout(t); } }, [alert]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, c, l] = await Promise.all([
      api<Settings>(`${API}/api/inventory-settings`),
      api<Category[]>(`${API}/api/inventory/categories`),
      api<Location[]>(`${API}/api/inventory/locations`),
    ]);
    if (s) setSettings(s);
    if (c) setCategories(c);
    if (l) setLocations(l);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveSettings(patch: Partial<Settings>) {
    const body = { ...settings, ...patch };
    const result = await api<Settings>(`${API}/api/inventory-settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (result) {
      setSettings(result);
      setAlert({ variant: "success", title: "Saved", message: "Settings updated." });
    } else {
      setAlert({ variant: "error", title: "Error", message: "Failed to save settings." });
    }
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    const result = await api<Category>(`${API}/api/inventory/categories`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCat.trim() }),
    });
    if (result) { setCategories((p) => [...p, result]); setNewCat(""); setAlert({ variant: "success", title: "Added", message: "Category created." }); }
    else setAlert({ variant: "error", title: "Error", message: "Failed to create category." });
  }

  async function addLocation() {
    if (!newLoc.name.trim()) return;
    const result = await api<Location>(`${API}/api/inventory/locations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLoc.name.trim(), type: newLoc.type }),
    });
    if (result) { setLocations((p) => [...p, result]); setNewLoc({ name: "", type: "room" }); setAlert({ variant: "success", title: "Added", message: "Location created." }); }
    else setAlert({ variant: "error", title: "Error", message: "Failed to create location." });
  }

  if (loading) return <p className="p-6 text-slate-500 dark:text-slate-400">Loading...</p>;

  return (
    <>
      {alert && <div className="mb-4"><Alert variant={alert.variant} title={alert.title} message={alert.message} /></div>}
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Configure inventory thresholds, categories, and storage locations.</p>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${tab === t ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === "General" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Alerts & Automation">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><div className="font-medium text-slate-900 dark:text-slate-100">Low Stock Alerts</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Notify when stock dips below minimum</div></div>
                <Switch checked={settings.lowStockAlerts} onChange={() => saveSettings({ lowStockAlerts: !settings.lowStockAlerts })} label="Low Stock Alerts" />
              </div>
              <div className="flex items-center justify-between">
                <div><div className="font-medium text-slate-900 dark:text-slate-100">Auto Reorder</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Automatically generate POs for low stock</div></div>
                <Switch checked={settings.autoReorder} onChange={() => saveSettings({ autoReorder: !settings.autoReorder })} label="Auto Reorder" />
              </div>
            </div>
          </Panel>
          <Panel title="Thresholds & Cost">
            <div className="space-y-4">
              <div>
                <Label className="dark:text-slate-300">Critical Low (%)</Label>
                <Input type="number" min={1} max={50} value={settings.criticalLowPct}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings((s) => ({ ...s, criticalLowPct: Number(e.target.value) }))}
                  onBlur={() => saveSettings({ criticalLowPct: settings.criticalLowPct })}
                  className="mt-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Items below this % of minimum stock are marked Critical.</p>
              </div>
              <div>
                <Label className="dark:text-slate-300">Default Cost Method</Label>
                <select value={settings.defaultCostMethod}
                  onChange={(e) => { setSettings((s) => ({ ...s, defaultCostMethod: e.target.value })); saveSettings({ defaultCostMethod: e.target.value }); }}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  {COST_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
          </Panel>
          <Panel title="Purchase Order Approval">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><div className="font-medium text-slate-900 dark:text-slate-100">Require PO Approval</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Orders above threshold need manager sign-off</div></div>
                <Switch checked={settings.poApprovalRequired} onChange={() => saveSettings({ poApprovalRequired: !settings.poApprovalRequired })} label="PO Approval" />
              </div>
              {settings.poApprovalRequired && (
                <div>
                  <Label className="dark:text-slate-300">Approval Threshold ($)</Label>
                  <Input type="number" min={0} value={settings.poApprovalThreshold}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings((s) => ({ ...s, poApprovalThreshold: Number(e.target.value) }))}
                    onBlur={() => saveSettings({ poApprovalThreshold: settings.poApprovalThreshold })}
                    className="mt-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Categories */}
      {tab === "Categories" && (
        <Panel title="Inventory Categories">
          <div className="flex gap-2 mb-4">
            <Input placeholder="New category name" value={newCat} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCat(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addCategory()}
              className="flex-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            <Button onClick={addCategory} className="bg-indigo-600 text-white hover:bg-indigo-700">Add</Button>
          </div>
          {categories.length === 0
            ? <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No categories yet.</p>
            : <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 px-1">
                    <span className="text-sm text-slate-900 dark:text-slate-100">{c.name}</span>
                    {c.parentName && <span className="text-xs text-slate-500 dark:text-slate-400">Parent: {c.parentName}</span>}
                  </div>
                ))}
              </div>}
        </Panel>
      )}

      {/* Locations */}
      {tab === "Locations" && (
        <Panel title="Storage Locations">
          <div className="flex gap-2 mb-4">
            <Input placeholder="Location name" value={newLoc.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLoc((l) => ({ ...l, name: e.target.value }))}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addLocation()}
              className="flex-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            <select value={newLoc.type} onChange={(e) => setNewLoc((l) => ({ ...l, type: e.target.value }))}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              {LOC_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <Button onClick={addLocation} className="bg-indigo-600 text-white hover:bg-indigo-700">Add</Button>
          </div>
          {locations.length === 0
            ? <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No locations yet.</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Name</th>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Type</th>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-300">Parent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {locations.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{l.name}</td>
                        <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize dark:bg-slate-800 dark:text-slate-300">{l.type}</span></td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{l.parentName || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
        </Panel>
      )}
    </>
  );
}
