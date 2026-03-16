"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  CreditCard,
  Banknote,
  Wallet,
  Building2,
  Trash2,
  Edit,
  CheckCircle,
  Loader2,
  X,
  Star,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { PatientPaymentMethod, MethodType, CardBrand, AccountType } from "./types";

const apiUrl = (p: string) => `${getEnv("NEXT_PUBLIC_API_URL")}${p}`;

const METHOD_OPTIONS: { value: MethodType; label: string }[] = [
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "bank_account", label: "Bank Account" },
  { value: "fsa", label: "FSA" },
  { value: "hsa", label: "HSA" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const CARD_BRANDS: { value: CardBrand; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "discover", label: "Discover" },
];

function methodIcon(type: MethodType) {
  if (type === "bank_account") return <Building2 className="w-5 h-5 text-slate-500" />;
  if (type === "fsa" || type === "hsa") return <Wallet className="w-5 h-5 text-purple-500" />;
  if (type === "cash") return <Banknote className="w-5 h-5 text-green-500" />;
  return <CreditCard className="w-5 h-5 text-blue-500" />;
}

function brandLabel(b: CardBrand) {
  if (b === "visa") return "Visa";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex") return "Amex";
  if (b === "discover") return "Discover";
  return "";
}

type Toast = { type: "success" | "error"; text: string };

type Props = {
  showToast: (t: Toast) => void;
};

function blankMethod(): Partial<PatientPaymentMethod> {
  return {
    methodType: "credit_card",
    cardBrand: "" as CardBrand,
    lastFour: "",
    expMonth: null,
    expYear: null,
    cardholderName: "",
    bankName: "",
    accountType: "" as AccountType,
    routingLastFour: "",
    billingAddress: "",
    billingZip: "",
    nickname: "",
  };
}

export default function PaymentMethodsTab({ showToast }: Props) {
  /* Patient search */
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);

  /* Methods */
  const [methods, setMethods] = useState<PatientPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  /* Form */
  const [formOpen, setFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PatientPaymentMethod | null>(null);
  const [form, setForm] = useState<Partial<PatientPaymentMethod>>(blankMethod());
  const [saving, setSaving] = useState(false);

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

  /* Fetch methods when patient is selected */
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchMethods = useCallback(async () => {
    if (!selectedPatient) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/methods/patient/${selectedPatient.id}`));
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setMethods(Array.isArray(data) ? data : data.content || []);
      } else {
        setFetchError(`Failed to load payment methods (${res.status})`);
        setMethods([]);
      }
    } catch (err) {
      console.error("Failed to fetch payment methods:", err);
      setFetchError("Failed to load payment methods");
      setMethods([]);
    } finally { setLoading(false); }
  }, [selectedPatient]);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  /* Form */
  const openAdd = () => {
    setEditingMethod(null);
    setForm(blankMethod());
    setFormOpen(true);
  };

  const openEdit = (m: PatientPaymentMethod) => {
    setEditingMethod(m);
    setForm({ ...m });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPatient) return;
    if (!form.lastFour?.trim()) {
      showToast({ type: "error", text: "Last four digits required" });
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingMethod?.id;
      const url = isEdit
        ? apiUrl(`/api/payments/methods/${editingMethod!.id}`)
        : apiUrl(`/api/payments/methods/patient/${selectedPatient.id}`);
      const body = {
        ...form,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
      };
      const res = await fetchWithAuth(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: isEdit ? "Method updated" : "Method added" });
        setFormOpen(false);
        fetchMethods();
      } else {
        showToast({ type: "error", text: json.message || "Failed to save" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setSaving(false); }
  };

  const handleSetDefault = async (m: PatientPaymentMethod) => {
    if (!m.id || !selectedPatient) return;
    try {
      const res = await fetchWithAuth(
        apiUrl(`/api/payments/methods/${m.id}/set-default?patientId=${selectedPatient.id}`),
        { method: "POST" }
      );
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Default method updated" });
        fetchMethods();
      } else {
        showToast({ type: "error", text: json.message || "Failed to update" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    }
  };

  const handleRemove = async (m: PatientPaymentMethod) => {
    if (!m.id) return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/methods/${m.id}`), { method: "DELETE" });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Method removed" });
        fetchMethods();
      } else {
        showToast({ type: "error", text: json.message || "Failed to remove" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    }
  };

  const isCard = form.methodType === "credit_card" || form.methodType === "debit_card";
  const isBank = form.methodType === "bank_account";

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
          placeholder="Search patient to view their payment methods..."
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
            <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select a patient to view payment methods</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header bar */}
          <div className="shrink-0 flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Payment Methods for <span className="text-gray-900 dark:text-gray-100">{selectedPatient.name}</span>
            </h3>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Method
            </button>
          </div>

          {/* Methods list */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : methods.length === 0 ? (
              <div className="text-center py-20">
                <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{fetchError || "No payment methods on file"}</p>
                {fetchError && (
                  <button onClick={fetchMethods} className="mt-2 text-xs text-blue-600 hover:underline">Retry</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {methods.map((m) => (
                  <div
                    key={m.id}
                    className={`relative rounded-xl border p-4 transition ${
                      m.isDefault
                        ? "border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    {m.isDefault && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      {methodIcon(m.methodType)}
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {m.methodType === "credit_card" || m.methodType === "debit_card"
                            ? `${brandLabel(m.cardBrand)} ****${m.lastFour}`
                            : m.methodType === "bank_account"
                              ? `${m.bankName || "Bank"} ${m.accountType ? `(${m.accountType})` : ""} ****${m.lastFour}`
                              : `${m.methodType.replace(/_/g, " ").toUpperCase()}`}
                        </p>
                        {m.nickname && <p className="text-xs text-gray-500 dark:text-gray-400">{m.nickname}</p>}
                      </div>
                    </div>
                    {(m.methodType === "credit_card" || m.methodType === "debit_card") && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {m.cardholderName && <span>{m.cardholderName} &middot; </span>}
                        {m.expMonth && m.expYear && <span>Exp {String(m.expMonth).padStart(2, "0")}/{m.expYear}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      {!m.isDefault && (
                        <button
                          onClick={() => handleSetDefault(m)}
                          className="text-xs px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(m)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Method Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFormOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
                </h3>
                <button onClick={() => setFormOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Method Type */}
                <div>
                  <label className={labelCls}>Method Type</label>
                  <select className={inputCls} value={form.methodType} onChange={(e) => setForm((prev) => ({ ...prev, methodType: e.target.value as MethodType }))}>
                    {METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Card fields */}
                {isCard && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Card Brand</label>
                        <select className={inputCls} value={form.cardBrand} onChange={(e) => setForm((prev) => ({ ...prev, cardBrand: e.target.value as CardBrand }))}>
                          <option value="">Select...</option>
                          {CARD_BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Last Four *</label>
                        <input className={inputCls} maxLength={4} value={form.lastFour || ""} onChange={(e) => setForm((prev) => ({ ...prev, lastFour: e.target.value }))} placeholder="1234" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Exp Month</label>
                        <input type="number" min={1} max={12} className={inputCls} value={form.expMonth ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, expMonth: e.target.value ? parseInt(e.target.value) : null }))} placeholder="MM" />
                      </div>
                      <div>
                        <label className={labelCls}>Exp Year</label>
                        <input type="number" min={2024} max={2040} className={inputCls} value={form.expYear ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, expYear: e.target.value ? parseInt(e.target.value) : null }))} placeholder="YYYY" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Cardholder Name</label>
                      <input className={inputCls} value={form.cardholderName || ""} onChange={(e) => setForm((prev) => ({ ...prev, cardholderName: e.target.value }))} placeholder="John Doe" />
                    </div>
                  </>
                )}

                {/* Bank fields */}
                {isBank && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Bank Name</label>
                        <input className={inputCls} value={form.bankName || ""} onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))} placeholder="Chase Bank" />
                      </div>
                      <div>
                        <label className={labelCls}>Account Type</label>
                        <select className={inputCls} value={form.accountType || ""} onChange={(e) => setForm((prev) => ({ ...prev, accountType: e.target.value as AccountType }))}>
                          <option value="">Select...</option>
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Last Four *</label>
                        <input className={inputCls} maxLength={4} value={form.lastFour || ""} onChange={(e) => setForm((prev) => ({ ...prev, lastFour: e.target.value }))} placeholder="5678" />
                      </div>
                      <div>
                        <label className={labelCls}>Routing Last Four</label>
                        <input className={inputCls} maxLength={4} value={form.routingLastFour || ""} onChange={(e) => setForm((prev) => ({ ...prev, routingLastFour: e.target.value }))} placeholder="9012" />
                      </div>
                    </div>
                  </>
                )}

                {/* Common fields */}
                {!isCard && !isBank && (
                  <div>
                    <label className={labelCls}>Last Four *</label>
                    <input className={inputCls} maxLength={4} value={form.lastFour || ""} onChange={(e) => setForm((prev) => ({ ...prev, lastFour: e.target.value }))} placeholder="1234" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Billing Address</label>
                    <input className={inputCls} value={form.billingAddress || ""} onChange={(e) => setForm((prev) => ({ ...prev, billingAddress: e.target.value }))} placeholder="123 Main St" />
                  </div>
                  <div>
                    <label className={labelCls}>Billing Zip</label>
                    <input className={inputCls} value={form.billingZip || ""} onChange={(e) => setForm((prev) => ({ ...prev, billingZip: e.target.value }))} placeholder="12345" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Nickname</label>
                  <input className={inputCls} value={form.nickname || ""} onChange={(e) => setForm((prev) => ({ ...prev, nickname: e.target.value }))} placeholder="Personal Visa" />
                </div>
              </div>

              <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
                <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingMethod ? "Update" : "Add"} Method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
