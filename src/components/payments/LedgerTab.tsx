"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Receipt,
  Loader2,
  X,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { PatientLedger, LedgerEntryType } from "./types";
import { formatCurrency, formatDate } from "./types";

const apiUrl = (p: string) => `${getEnv("NEXT_PUBLIC_API_URL")}${p}`;

const ENTRY_COLORS: Record<LedgerEntryType, string> = {
  charge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  payment: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  adjustment: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  refund: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  write_off: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  insurance_payment: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

type Toast = { type: "success" | "error"; text: string };

type Props = {
  showToast: (t: Toast) => void;
};

export default function LedgerTab({ showToast }: Props) {
  /* Patient search */
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);

  /* Ledger */
  const [entries, setEntries] = useState<PatientLedger[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  /* Post charge modal */
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ amount: "", description: "", referenceType: "" });
  const [posting, setPosting] = useState(false);

  const pName = (p: typeof patientResults[0]) =>
    p.fullName || p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

  /* Patient search */
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

  /* Fetch ledger + balance */
  const fetchLedger = useCallback(async () => {
    if (!selectedPatient) return;
    setLoading(true);
    try {
      const [ledgerRes, balanceRes] = await Promise.all([
        fetchWithAuth(apiUrl(`/api/payments/ledger/patient/${selectedPatient.id}`)),
        fetchWithAuth(apiUrl(`/api/payments/balance/patient/${selectedPatient.id}`)),
      ]);
      const ledgerJson = await ledgerRes.json();
      const balanceJson = await balanceRes.json();
      if (ledgerRes.ok) {
        const data = ledgerJson.data || ledgerJson;
        setEntries(Array.isArray(data) ? data : data.content || []);
      }
      if (balanceRes.ok) {
        const bal = balanceJson.data ?? balanceJson;
        setBalance(typeof bal === "number" ? bal : parseFloat(bal) || 0);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [selectedPatient]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  /* Post charge */
  const handlePostCharge = async () => {
    if (!selectedPatient) return;
    const amt = parseFloat(chargeForm.amount);
    if (!amt || amt <= 0) { showToast({ type: "error", text: "Valid amount required" }); return; }
    setPosting(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/payments/ledger/charge"), {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          amount: amt,
          description: chargeForm.description,
          referenceType: chargeForm.referenceType,
        }),
      });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Charge posted" });
        setChargeOpen(false);
        setChargeForm({ amount: "", description: "", referenceType: "" });
        fetchLedger();
      } else {
        showToast({ type: "error", text: json.message || "Failed to post charge" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setPosting(false); }
  };

  const isCredit = (type: LedgerEntryType) => ["payment", "insurance_payment", "refund"].includes(type);

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="h-full flex flex-col">
      {/* Patient search */}
      <div className="shrink-0 mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Search patient to view their ledger..."
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
            <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select a patient to view their ledger</p>
          </div>
        </div>
      ) : (
        <>
          {/* Balance + actions */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl border px-5 py-3 ${
                balance !== null && balance > 0
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
                  : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10"
              }`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Patient Balance</p>
                <p className={`text-2xl font-bold ${
                  balance !== null && balance > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}>
                  {balance !== null ? formatCurrency(balance) : "--"}
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedPatient.name}</p>
            </div>
            <button
              onClick={() => { setChargeForm({ amount: "", description: "", referenceType: "" }); setChargeOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Post Charge
            </button>
          </div>

          {/* Ledger table */}
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issuer</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                        <span className="text-sm text-gray-500">Loading ledger...</span>
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20">
                        <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No ledger entries</p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ENTRY_COLORS[e.entryType] || ENTRY_COLORS.charge}`}>
                            {isCredit(e.entryType)
                              ? <ArrowDownCircle className="w-3 h-3" />
                              : <ArrowUpCircle className="w-3 h-3" />}
                            {e.entryType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.description || "--"}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{e.invoiceNumber || "--"}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.recipient || "--"}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.issuer || "--"}</td>
                        <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                          isCredit(e.entryType)
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {isCredit(e.entryType) ? "-" : "+"}{formatCurrency(Math.abs(e.amount))}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                          {formatCurrency(e.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Post Charge Modal */}
      {chargeOpen && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setChargeOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Post Charge</h3>
                </div>
                <button onClick={() => setChargeOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Amount ($) *</label>
                  <input type="number" step="0.01" min="0" className={inputCls} value={chargeForm.amount} onChange={(e) => setChargeForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={chargeForm.description} onChange={(e) => setChargeForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Office visit copay" />
                </div>
                <div>
                  <label className={labelCls}>Reference Type</label>
                  <select className={inputCls} value={chargeForm.referenceType} onChange={(e) => setChargeForm((prev) => ({ ...prev, referenceType: e.target.value }))}>
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
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setChargeOpen(false)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button onClick={handlePostCharge} disabled={posting} className="px-5 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2">
                  {posting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Post Charge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
