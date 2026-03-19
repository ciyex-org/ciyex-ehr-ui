"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  ShieldAlert,
  Plus,
  Search,
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { CDSRule, CDSAlert, CDSStats } from "@/components/cds/types";
import CDSRuleTable from "@/components/cds/CDSRuleTable";
import CDSRuleFormPanel from "@/components/cds/CDSRuleFormPanel";
import CDSAlertHistory from "@/components/cds/CDSAlertHistory";
import { confirmDialog } from "@/utils/toast";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

type ToastState = { type: "success" | "error"; text: string } | null;
type TabKey = "rules" | "alerts";

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const cls = toast.type === "success"
    ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
    : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200";
  return (
    <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${cls}`}>
      {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function CDSPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rules");
  const [rules, setRules] = useState<CDSRule[]>([]);
  const [alerts, setAlerts] = useState<CDSAlert[]>([]);
  const [stats, setStats] = useState<CDSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);

  /* Pagination */
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  /* Search */
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Filters */
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  /* Panel */
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CDSRule | null>(null);

  /* Toast */
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  /* ── Fetch Rules ── */
  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API()}/api/cds/rules?page=${page}&size=${pageSize}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (typeFilter !== "all") url += `&ruleType=${typeFilter}`;
      if (severityFilter !== "all") url += `&severity=${severityFilter}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (res.ok && json.success) {
        const rawRules: any[] = json.data.content || json.data || [];
        // Normalize active field: backend may return `active` (Java) or `isActive` (TS interface)
        setRules(rawRules.map((r: any) => ({ ...r, isActive: r.isActive ?? r.active ?? false })));
        setTotalPages(json.data.totalPages || 1);
        setTotalElements(json.data.totalElements || rawRules.length);
      } else {
        setRules([]);
      }
    } catch { setRules([]); }
    finally { setLoading(false); }
  }, [page, searchQuery, typeFilter, severityFilter]);

  /* Alert search & filters */
  const [alertSearchDraft, setAlertSearchDraft] = useState("");
  const [alertSearchQuery, setAlertSearchQuery] = useState("");
  const [alertTypeFilter, setAlertTypeFilter] = useState("all");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState("all");
  const alertDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch Alerts ── */
  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetchWithAuth(`${API()}/api/cds/alerts?page=0&size=50`);
      const json = await res.json();
      if (res.ok && json.success) {
        const rawAlerts: any[] = json.data.content || json.data || [];
        setAlerts(rawAlerts.map((a: any) => ({
          ...a,
          createdAt: Array.isArray(a.createdAt)
            ? new Date(a.createdAt[0], (a.createdAt[1] || 1) - 1, a.createdAt[2] || 1, a.createdAt[3] || 0, a.createdAt[4] || 0).toISOString()
            : (a.createdAt || new Date().toISOString()),
        })));
      } else setAlerts([]);
    } catch { setAlerts([]); }
    finally { setAlertsLoading(false); }
  }, []);

  /* ── Fetch Stats ── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API()}/api/cds/stats`);
      if (!res.ok) { setStats(null); return; }
      const json = await res.json().catch(() => null);
      if (json?.success) setStats(json.data);
    } catch { /* stats are optional — silently ignore */ }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);
  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  /* Debounced search */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchQuery(searchDraft.trim()); setPage(0); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchDraft]);

  /* Debounced alert search */
  useEffect(() => {
    if (alertDebounceRef.current) clearTimeout(alertDebounceRef.current);
    alertDebounceRef.current = setTimeout(() => { setAlertSearchQuery(alertSearchDraft.trim()); }, 350);
    return () => { if (alertDebounceRef.current) clearTimeout(alertDebounceRef.current); };
  }, [alertSearchDraft]);

  /* Client-side filtered rules (fallback if backend ignores filter params) */
  const filteredRules = rules.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (r.name || "").toLowerCase().includes(q)
        || (r.description || "").toLowerCase().includes(q)
        || (r.ruleType || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    if (typeFilter !== "all" && r.ruleType !== typeFilter) return false;
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    return true;
  });

  /* Client-side filtered alerts */
  const filteredAlerts = alerts.filter((a) => {
    if (alertSearchQuery) {
      const q = alertSearchQuery.toLowerCase();
      const match = (a.ruleName || "").toLowerCase().includes(q)
        || (a.message || "").toLowerCase().includes(q)
        || (a.patientName || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    if (alertTypeFilter !== "all" && a.alertType !== alertTypeFilter) return false;
    if (alertSeverityFilter !== "all" && a.severity !== alertSeverityFilter) return false;
    return true;
  });

  /* ── CRUD ── */
  const handleSave = async (data: Partial<CDSRule>) => {
    const url = editingRule ? `${API()}/api/cds/rules/${editingRule.id}` : `${API()}/api/cds/rules`;
    const method = editingRule ? "PUT" : "POST";
    try {
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setToast({ type: "success", text: editingRule ? "Rule updated" : "Rule created" });
        setPanelOpen(false);
        setEditingRule(null);
        fetchRules();
        fetchStats();
      } else {
        setToast({ type: "error", text: json?.message || "Failed to save rule" });
      }
    } catch {
      setToast({ type: "error", text: "An error occurred while saving the rule" });
    }
  };

  const handleDelete = async (rule: CDSRule) => {
    const confirmed = await confirmDialog(`Delete rule "${rule.name}"?`);
    if (!confirmed) return;
    const res = await fetchWithAuth(`${API()}/api/cds/rules/${rule.id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ type: "success", text: "Rule deleted" });
      fetchRules();
      fetchStats();
    } else {
      setToast({ type: "error", text: "Failed to delete rule" });
    }
  };

  const handleToggle = async (rule: CDSRule) => {
    const res = await fetchWithAuth(`${API()}/api/cds/rules/${rule.id}/toggle`, {
      method: "POST",
    });
    if (res.ok) {
      setToast({ type: "success", text: rule.isActive ? "Rule deactivated" : "Rule activated" });
      fetchRules();
      fetchStats();
    }
  };

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Clinical Decision Support</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage CDS rules, alerts, and preventive reminders</p>
            </div>
          </div>
          <button
            onClick={() => { setEditingRule(null); setPanelOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex flex-wrap gap-2 mb-4 shrink-0">
            <StatPill label="Total Rules" value={stats.totalRules} icon={<ShieldAlert className="w-3.5 h-3.5" />} color="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" />
            <StatPill label="Active" value={stats.activeRules} icon={<Activity className="w-3.5 h-3.5" />} color="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" />
            <StatPill label="Alerts (24h)" value={stats.alertsToday} icon={<AlertTriangle className="w-3.5 h-3.5" />} color="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
            <StatPill label="Critical" value={stats.criticalAlerts} icon={<AlertTriangle className="w-3.5 h-3.5" />} color="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" />
          </div>
        )}

        {/* Tabs */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 mb-4">
          <nav className="flex gap-1 -mb-px">
            {[
              { key: "rules" as TabKey, label: "Rules" },
              { key: "alerts" as TabKey, label: "Alert History" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab: Rules */}
        {activeTab === "rules" && (
          <>
            {/* Search + Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Search rules..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
                {searchDraft && (
                  <button onClick={() => setSearchDraft("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="preventive_screening">Preventive Screening</option>
                <option value="drug_allergy">Drug-Allergy</option>
                <option value="drug_drug">Drug-Drug</option>
                <option value="duplicate_order">Duplicate Order</option>
                <option value="age_based">Age-Based</option>
                <option value="condition_based">Condition-Based</option>
                <option value="lab_value">Lab Value</option>
                <option value="custom">Custom</option>
              </select>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
                className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <CDSRuleTable
              rules={filteredRules}
              loading={loading}
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={setPage}
              onEdit={(r) => { setEditingRule(r); setPanelOpen(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          </>
        )}

        {/* Tab: Alert History */}
        {activeTab === "alerts" && (
          <>
            {/* Alert Search + Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Search alerts..."
                  value={alertSearchDraft}
                  onChange={(e) => setAlertSearchDraft(e.target.value)}
                />
                {alertSearchDraft && (
                  <button onClick={() => setAlertSearchDraft("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              <select
                value={alertTypeFilter}
                onChange={(e) => setAlertTypeFilter(e.target.value)}
                className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="preventive_screening">Preventive Screening</option>
                <option value="drug_allergy">Drug-Allergy</option>
                <option value="drug_drug">Drug-Drug</option>
                <option value="duplicate_order">Duplicate Order</option>
                <option value="age_based">Age-Based</option>
                <option value="condition_based">Condition-Based</option>
                <option value="lab_value">Lab Value</option>
                <option value="custom">Custom</option>
              </select>
              <select
                value={alertSeverityFilter}
                onChange={(e) => setAlertSeverityFilter(e.target.value)}
                className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CDSAlertHistory alerts={filteredAlerts} loading={alertsLoading} />
            </div>
          </>
        )}

        {/* Form Panel */}
        <CDSRuleFormPanel
          rule={editingRule}
          open={panelOpen}
          onClose={() => { setPanelOpen(false); setEditingRule(null); }}
          onSave={handleSave}
        />
      </div>
    </AdminLayout>
  );
}

function StatPill({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${color}`}>
      {icon}
      <span className="font-semibold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}
