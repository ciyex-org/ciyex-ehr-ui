"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { MethodType } from "./types";

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

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (t: { type: "success" | "error"; text: string }) => void;
};

export default function CollectPaymentModal({ open, onClose, onSuccess, showToast }: Props) {
  const [form, setForm] = useState({
    patientId: "",
    patientName: "",
    paymentMethodId: null as number | null,
    amount: "",
    description: "",
    referenceType: "",
    referenceId: "",
    invoiceNumber: "",
    paymentMethodType: "cash" as MethodType,
    receiptEmail: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* Patient search */
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  /* Claims for selected patient */
  const [claimsList, setClaimsList] = useState<{ id: string; claimNumber?: string; status?: string; totalAmount?: number }[]>([]);

  /* Saved payment methods for selected patient */
  const [savedMethods, setSavedMethods] = useState<{ id: number; cardBrand?: string; lastFour?: string; label?: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({
      patientId: "",
      patientName: "",
      paymentMethodId: null,
      amount: "",
      description: "",
      referenceType: "",
      referenceId: "",
      invoiceNumber: "",
      paymentMethodType: "cash",
      receiptEmail: "",
    });
    setErrors({});
    setPatientQuery("");
    setPatientResults([]);
  }, [open]);

  /* Debounced patient search */
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

  /* Fetch saved payment methods when patient selected */
  useEffect(() => {
    if (!form.patientId) { setSavedMethods([]); return; }
    (async () => {
      try {
        const res = await fetchWithAuth(apiUrl(`/api/payments/methods/patient/${encodeURIComponent(form.patientId)}`));
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.content) ? json.data.content : [];
        setSavedMethods(items);
      } catch { setSavedMethods([]); }
    })();
  }, [form.patientId]);

  /* Fetch claims when patient selected and referenceType is claim */
  useEffect(() => {
    if (!form.patientId || form.referenceType !== "claim") { setClaimsList([]); return; }
    (async () => {
      try {
        const res = await fetchWithAuth(apiUrl(`/api/claims?patientId=${encodeURIComponent(form.patientId)}&size=200`));
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.content) ? json.data.content : [];
        setClaimsList(items);
      } catch { setClaimsList([]); }
    })();
  }, [form.patientId, form.referenceType]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  const pName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  const selectPatient = (p: typeof patientResults[0]) => {
    const name = pName(p);
    setForm((prev) => ({ ...prev, patientId: p.id, patientName: name }));
    setPatientQuery(name);
    setShowDropdown(false);
    setErrors((prev) => { const n = { ...prev }; delete n.patientName; delete n.paymentMethodId; return n; });
  };

  const isCardPayment = form.paymentMethodType === "credit_card" || form.paymentMethodType === "debit_card";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.patientName.trim()) {
      e.patientName = "Patient is required";
    } else if (!form.patientId) {
      e.patientName = "Please select a patient from the search results";
    }
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) e.amount = "Valid amount is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.paymentMethodType) e.paymentMethodType = "Payment method type is required";
    if (isCardPayment) {
      if (!form.patientId) {
        e.paymentMethodId = "Select a patient first to load their saved cards";
      } else if (savedMethods.length === 0) {
        e.paymentMethodId = "No saved cards for this patient — add a card in Payment Methods or choose Cash / Check";
      } else if (!form.paymentMethodId) {
        e.paymentMethodId = "Please select a saved card";
      }
    }
    if (form.receiptEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.receiptEmail.trim())) {
      e.receiptEmail = "Please enter a valid email address";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCollect = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/payments/collect"), {
        method: "POST",
        body: JSON.stringify({
          ...form,
          patientId: form.patientId ? parseInt(String(form.patientId), 10) || form.patientId : null,
          amount: parseFloat(form.amount),
        }),
      });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Payment collected successfully" });
        onSuccess();
        onClose();
      } else {
        showToast({ type: "error", text: json.message || "Failed to collect payment" });
      }
    } catch {
      showToast({ type: "error", text: "Network error collecting payment" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls = (field?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${field && errors[field] ? "border-red-400 ring-1 ring-red-300" : ""}`;

  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                Collect Payment
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Patient */}
            <div className="relative">
              <label className={labelCls}>Patient *</label>
              <input
                className={inputCls("patientName")}
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  setForm((prev) => ({ ...prev, patientId: "", patientName: "" }));
                  setShowDropdown(true);
                  setErrors((prev) => { const n = { ...prev }; delete n.patientName; delete n.paymentMethodId; return n; });
                }}
                placeholder="Search patient..."
              />
              {errors.patientName && <p className="text-xs text-red-500 mt-1">{errors.patientName}</p>}
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

            {/* Amount */}
            <div>
              <label className={labelCls}>Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls("amount")}
                value={form.amount}
                onChange={(e) => { setForm((prev) => ({ ...prev, amount: e.target.value })); setErrors((p) => { const n = { ...p }; delete n.amount; return n; }); }}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            {/* Payment Method Type */}
            <div>
              <label className={labelCls}>Payment Method Type *</label>
              <select
                className={inputCls("paymentMethodType")}
                value={form.paymentMethodType}
                onChange={(e) => { setForm((prev) => ({ ...prev, paymentMethodType: e.target.value as MethodType, paymentMethodId: null })); setErrors((p) => { const n = { ...p }; delete n.paymentMethodType; delete n.paymentMethodId; return n; }); }}
              >
                {METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.paymentMethodType && <p className="text-xs text-red-500 mt-1">{errors.paymentMethodType}</p>}
            </div>

            {/* Saved Card Selection (for card methods) */}
            {(form.paymentMethodType === "credit_card" || form.paymentMethodType === "debit_card") && (
              <div>
                <label className={labelCls}>Saved Card *</label>
                {savedMethods.length > 0 ? (
                  <select
                    className={inputCls("paymentMethodId")}
                    value={form.paymentMethodId ?? ""}
                    onChange={(e) => { setForm((prev) => ({ ...prev, paymentMethodId: e.target.value ? parseInt(e.target.value) : null })); setErrors((p) => { const n = { ...p }; delete n.paymentMethodId; return n; }); }}
                  >
                    <option value="">Select a saved card...</option>
                    {savedMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.cardBrand ? `${m.cardBrand} ` : ""}{m.lastFour ? `****${m.lastFour}` : m.label || `Card #${m.id}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    {form.patientId
                      ? "No saved cards found for this patient. Please add a card in Payment Methods first, or select a different payment method (Cash, Check, etc.)."
                      : "Please select a patient first."}
                  </p>
                )}
                {errors.paymentMethodId && <p className="text-xs text-red-500 mt-1">{errors.paymentMethodId}</p>}
              </div>
            )}

            {/* Description */}
            <div>
              <label className={labelCls}>Description *</label>
              <input
                className={inputCls("description")}
                value={form.description}
                onChange={(e) => { setForm((prev) => ({ ...prev, description: e.target.value })); setErrors((p) => { const n = { ...p }; delete n.description; return n; }); }}
                placeholder="Payment for visit..."
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Reference Type */}
              <div>
                <label className={labelCls}>Reference Type</label>
                <select
                  className={inputCls()}
                  value={form.referenceType}
                  onChange={(e) => setForm((prev) => ({ ...prev, referenceType: e.target.value }))}
                >
                  <option value="">Select...</option>
                  <option value="encounter">Encounter</option>
                  <option value="claim">Claim</option>
                  <option value="invoice">Invoice</option>
                  <option value="copay">Copay</option>
                  <option value="deductible">Deductible</option>
                  <option value="self_pay">Self Pay</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Claim / Reference ID */}
              <div>
                {form.referenceType === "claim" ? (
                  <>
                    <label className={labelCls}>Claim</label>
                    <select
                      className={inputCls()}
                      value={form.referenceId}
                      onChange={(e) => setForm((prev) => ({ ...prev, referenceId: e.target.value }))}
                    >
                      <option value="">Select claim...</option>
                      {claimsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.claimNumber || c.id} {c.status ? `(${c.status})` : ""} {c.totalAmount != null ? `- $${c.totalAmount}` : ""}
                        </option>
                      ))}
                    </select>
                    {claimsList.length === 0 && form.patientId && (
                      <p className="text-xs text-gray-400 mt-1">No claims found for this patient</p>
                    )}
                  </>
                ) : (
                  <>
                    <label className={labelCls}>Invoice Number</label>
                    <input
                      className={inputCls()}
                      value={form.invoiceNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                      placeholder="INV-001"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Receipt Email */}
            <div>
              <label className={labelCls}>Receipt Email</label>
              <input
                type="email"
                className={inputCls("receiptEmail")}
                value={form.receiptEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, receiptEmail: e.target.value }))}
                placeholder="patient@email.com"
              />
              {errors.receiptEmail && <p className="text-xs text-red-500 mt-1">{errors.receiptEmail}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCollect}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Collect Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
