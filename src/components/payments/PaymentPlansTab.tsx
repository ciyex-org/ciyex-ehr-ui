"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Pause,
  AlertTriangle,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { PaymentPlan, PlanStatus, PlanFrequency, PatientPaymentMethod } from "./types";
import { formatCurrency, formatDate } from "./types";
import DateInput from "@/components/ui/DateInput";

const apiUrl = (p: string) => `${getEnv("NEXT_PUBLIC_API_URL")}${p}`;

const STATUS_COLORS: Record<PlanStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  defaulted: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

const STATUS_ICONS: Record<PlanStatus, React.ReactNode> = {
  active: <CheckCircle className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  defaulted: <AlertTriangle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  paused: <Pause className="w-3.5 h-3.5" />,
};

type Toast = { type: "success" | "error"; text: string };

type Props = {
  showToast: (t: Toast) => void;
};

export default function PaymentPlansTab({ showToast }: Props) {
  /* Patient search */
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);

  /* Plans */
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);

  /* Patient methods (for plan form) */
  const [patientMethods, setPatientMethods] = useState<PatientPaymentMethod[]>([]);

  /* Form */
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [form, setForm] = useState({
    totalAmount: "",
    installmentAmount: "",
    frequency: "monthly" as PlanFrequency,
    startDate: new Date().toISOString().slice(0, 10),
    paymentMethodId: null as number | null,
    autoCharge: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const pName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  /* Patient search debounce */
  useEffect(() => {
    if (!patientQuery.trim()) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(apiUrl(`/api/patients?search=${encodeURIComponent(patientQuery)}`));
        const json = await res.json();
        let list: typeof patientResults = [];
        if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json?.data?.content)) list = json.data.content;
        setPatientResults(list);
        setShowDropdown(true);
      } catch { /* silent */ }
    }, 250);
    return () => clearTimeout(t);
  }, [patientQuery]);

  const selectPatient = (p: typeof patientResults[0]) => {
    const name = pName(p);
    setSelectedPatient({ id: p.id, name });
    setPatientQuery(name);
    setShowDropdown(false);
  };

  /* Fetch plans */
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchPlans = useCallback(async () => {
    if (!selectedPatient) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/plans/patient/${selectedPatient.id}`));
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setPlans(Array.isArray(data) ? data : data.content || []);
      } else {
        setFetchError(`Failed to load payment plans (${res.status})`);
        setPlans([]);
      }
    } catch (err) {
      console.error("Failed to fetch payment plans:", err);
      setFetchError("Failed to load payment plans");
      setPlans([]);
    } finally { setLoading(false); }
  }, [selectedPatient]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  /* Fetch patient methods when opening form */
  const fetchPatientMethods = async () => {
    if (!selectedPatient) return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/methods/patient/${selectedPatient.id}`));
      const json = await res.json();
      if (res.ok) {
        const data = json.data || json;
        setPatientMethods(Array.isArray(data) ? data : data.content || []);
      }
    } catch { /* silent */ }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setForm({
      totalAmount: "",
      installmentAmount: "",
      frequency: "monthly",
      startDate: new Date().toISOString().slice(0, 10),
      paymentMethodId: null,
      autoCharge: false,
      notes: "",
    });
    fetchPatientMethods();
    setFormOpen(true);
  };

  const openEdit = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setForm({
      totalAmount: String(plan.totalAmount || ""),
      installmentAmount: String(plan.installmentAmount || ""),
      frequency: plan.frequency || "monthly",
      startDate: plan.startDate || new Date().toISOString().slice(0, 10),
      paymentMethodId: plan.paymentMethodId ?? null,
      autoCharge: plan.autoCharge ?? false,
      notes: plan.notes || "",
    });
    fetchPatientMethods();
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPatient) return;
    if (!form.totalAmount || parseFloat(form.totalAmount) <= 0) {
      showToast({ type: "error", text: "Valid total amount required" });
      return;
    }
    if (!form.installmentAmount || parseFloat(form.installmentAmount) <= 0) {
      showToast({ type: "error", text: "Valid installment amount required" });
      return;
    }
    setSaving(true);
    const isEdit = !!editingPlan;
    try {
      const url = isEdit ? apiUrl(`/api/payments/plans/${editingPlan!.id}`) : apiUrl("/api/payments/plans");
      const res = await fetchWithAuth(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          totalAmount: parseFloat(form.totalAmount),
          installmentAmount: parseFloat(form.installmentAmount),
          frequency: form.frequency,
          startDate: form.startDate,
          paymentMethodId: form.paymentMethodId,
          autoCharge: form.autoCharge,
          notes: form.notes,
        }),
      });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: isEdit ? "Payment plan updated" : "Payment plan created" });
        setFormOpen(false);
        setEditingPlan(null);
        fetchPlans();
      } else {
        showToast({ type: "error", text: json.message || `Failed to ${isEdit ? "update" : "create"} plan` });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setSaving(false); }
  };

  const handleCancel = async (plan: PaymentPlan) => {
    if (!plan.id) return;
    setCancelling(plan.id);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/plans/${plan.id}/cancel`), { method: "POST" });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Plan cancelled" });
        fetchPlans();
      } else {
        showToast({ type: "error", text: json.message || "Failed to cancel" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setCancelling(null); }
  };

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Patient search */}
      <div className="shrink-0 mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Search patient to view their payment plans..."
          value={patientQuery}
          onChange={(e) => {
            setPatientQuery(e.target.value);
            setSelectedPatient(null);
            setShowDropdown(true);
          }}
        />
        {showDropdown && patientResults.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
            {patientResults.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200"
              >
                {pName(p)} <span className="text-xs text-gray-400">({p.id})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedPatient ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select a patient to view payment plans</p>
          </div>
        </div>
      ) : (
        <>
          <div className="shrink-0 flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Payment Plans for <span className="text-gray-900 dark:text-gray-100">{selectedPatient.name}</span>
            </h3>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{fetchError || "No payment plans found"}</p>
                {fetchError && (
                  <button onClick={fetchPlans} className="mt-2 text-xs text-blue-600 hover:underline">Retry</button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((p) => {
                  const progress = p.installmentsTotal > 0
                    ? Math.round((p.installmentsPaid / p.installmentsTotal) * 100)
                    : 0;
                  return (
                    <div key={p.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(p.totalAmount)}</span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
                              {STATUS_ICONS[p.status]}
                              {p.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(p.installmentAmount)} / {p.frequency} &middot; Remaining: {formatCurrency(p.remainingAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.status !== "cancelled" && (
                            <button
                              onClick={() => openEdit(p)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition"
                            >
                              Edit
                            </button>
                          )}
                          {p.status === "active" && (
                            <button
                              onClick={() => handleCancel(p)}
                              disabled={cancelling === p.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                            >
                              {cancelling === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>{p.installmentsPaid} of {p.installmentsTotal} installments</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Start: {formatDate(p.startDate)}
                        </span>
                        {p.nextPaymentDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Next: {formatDate(p.nextPaymentDate)}
                          </span>
                        )}
                        {p.autoCharge && (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Auto-charge
                          </span>
                        )}
                      </div>
                      {p.notes && <p className="text-xs text-gray-400 mt-2">{p.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Plan Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFormOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{editingPlan ? "Edit Payment Plan" : "Create Payment Plan"}</h3>
                <button onClick={() => setFormOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Total Amount ($) *</label>
                    <input type="number" step="0.01" min="0" className={inputCls} value={form.totalAmount} onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))} placeholder="1000.00" />
                  </div>
                  <div>
                    <label className={labelCls}>Installment Amount ($) *</label>
                    <input type="number" step="0.01" min="0" className={inputCls} value={form.installmentAmount} onChange={(e) => setForm((prev) => ({ ...prev, installmentAmount: e.target.value }))} placeholder="100.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Frequency</label>
                    <select className={inputCls} value={form.frequency} onChange={(e) => setForm((prev) => ({ ...prev, frequency: e.target.value as PlanFrequency }))}>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Start Date</label>
                    <DateInput className={inputCls} value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                  </div>
                </div>

                {patientMethods.length > 0 && (
                  <div>
                    <label className={labelCls}>Payment Method</label>
                    <select
                      className={inputCls}
                      value={form.paymentMethodId ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, paymentMethodId: e.target.value ? parseInt(e.target.value) : null }))}
                    >
                      <option value="">None</option>
                      {patientMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nickname || `${(m.methodType || "").replace(/_/g, " ")} ****${m.lastFour}`}
                          {m.isDefault ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.autoCharge}
                      onChange={(e) => setForm((prev) => ({ ...prev, autoCharge: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-charge enabled</span>
                </div>

                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes..." />
                </div>
              </div>

              <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
                <button onClick={() => { setFormOpen(false); setEditingPlan(null); }} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
