"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Eye,
  RefreshCw,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  X,
  CheckCircle,
  Banknote,
  Wallet,
  Pencil,
  Trash2,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { PaymentTransaction, PaymentStats, TransactionStatus } from "./types";
import { formatCurrency, formatDate } from "./types";
import CollectPaymentModal from "./CollectPaymentModal";

const apiUrl = (p: string) => `${getEnv("NEXT_PUBLIC_API_URL")}${p}`;

const STATUS_COLORS: Record<TransactionStatus, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  partial_refund: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  voided: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const STATUS_ICONS: Record<TransactionStatus, React.ReactNode> = {
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  processing: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
  failed: <AlertTriangle className="w-3.5 h-3.5" />,
  refunded: <RefreshCw className="w-3.5 h-3.5" />,
  partial_refund: <RefreshCw className="w-3.5 h-3.5" />,
  voided: <XCircle className="w-3.5 h-3.5" />,
};

function methodIcon(type: string) {
  if (type === "bank_account") return <Banknote className="w-3.5 h-3.5" />;
  if (type === "fsa" || type === "hsa") return <Wallet className="w-3.5 h-3.5" />;
  if (type === "cash") return <DollarSign className="w-3.5 h-3.5" />;
  return <CreditCard className="w-3.5 h-3.5" />;
}

type Toast = { type: "success" | "error"; text: string };

type Props = {
  showToast: (t: Toast) => void;
};

export default function TransactionsTab({ showToast }: Props) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [stats, setStats] = useState<PaymentStats>({ today: 0, last7d: 0, last30d: 0, pendingCount: 0, failedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Modals */
  const [collectOpen, setCollectOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<PaymentTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [voiding, setVoiding] = useState<number | null>(null);

  /* Detail view */
  const [viewTarget, setViewTarget] = useState<PaymentTransaction | null>(null);

  /* Edit */
  const [editTarget, setEditTarget] = useState<PaymentTransaction | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", description: "", paymentMethodType: "" });
  const [editSaving, setEditSaving] = useState(false);

  /* Delete */
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/transactions?page=${page}&size=${pageSize}`));
      const json = await res.json();
      if (res.ok) {
        const data = json.data || json;
        setTransactions(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/payments/stats"));
      const json = await res.json();
      if (res.ok) {
        const raw = json.data || json;
        setStats({
          today: raw.todayCollections ?? raw.today ?? 0,
          last7d: raw.last7d ?? 0,
          last30d: raw.monthCollections ?? raw.last30d ?? 0,
          pendingCount: raw.pendingCount ?? 0,
          failedCount: raw.failedCount ?? 0,
        });
      }
    } catch { /* silent */ }
  }, []);

  const refreshAll = useCallback(() => {
    fetchTransactions();
    fetchStats();
  }, [fetchTransactions, fetchStats]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  /* Debounced search (client-side filter) */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchDraft.trim().toLowerCase()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchDraft]);

  const filtered = searchQuery
    ? transactions.filter(
        (t) =>
          (t.patientName || "").toLowerCase().includes(searchQuery) ||
          (t.description || "").toLowerCase().includes(searchQuery) ||
          (t.invoiceNumber || "").toLowerCase().includes(searchQuery)
      )
    : transactions;

  /* Refund */
  const openRefund = (t: PaymentTransaction) => {
    setRefundTarget(t);
    const maxRefund = t.amount - (t.refundAmount || 0);
    setRefundAmount(maxRefund.toFixed(2));
    setRefundReason("");
  };

  const handleRefund = async () => {
    if (!refundTarget?.id) return;
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) { showToast({ type: "error", text: "Invalid refund amount" }); return; }
    setRefunding(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/transactions/${refundTarget.id}/refund`), {
        method: "POST",
        body: JSON.stringify({ amount: amt, reason: refundReason }),
      });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Refund processed" });
        setRefundTarget(null);
        refreshAll();
      } else {
        showToast({ type: "error", text: json.message || "Refund failed" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setRefunding(false); }
  };

  /* Void */
  const handleVoid = async (t: PaymentTransaction) => {
    if (!t.id) return;
    setVoiding(t.id);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/transactions/${t.id}/void`), { method: "POST" });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Transaction voided" });
        refreshAll();
      } else {
        showToast({ type: "error", text: json.message || "Void failed" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setVoiding(null); }
  };

  /* Edit */
  const openEdit = (t: PaymentTransaction) => {
    setEditTarget(t);
    setEditForm({
      amount: String(t.amount || ""),
      description: t.description || "",
      paymentMethodType: t.paymentMethodType || "",
    });
  };

  const handleEdit = async () => {
    if (!editTarget?.id) return;
    const amt = parseFloat(editForm.amount);
    if (!amt || amt <= 0) { showToast({ type: "error", text: "Valid amount required" }); return; }
    setEditSaving(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/transactions/${editTarget.id}`), {
        method: "PUT",
        body: JSON.stringify({ amount: amt, description: editForm.description, paymentMethodType: editForm.paymentMethodType }),
      });
      const json = await res.json();
      if (res.ok && (json.success !== false)) {
        showToast({ type: "success", text: "Payment updated" });
        setEditTarget(null);
        refreshAll();
      } else {
        showToast({ type: "error", text: json.message || "Update failed" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setEditSaving(false); }
  };

  /* Delete */
  const handleDelete = async (t: PaymentTransaction) => {
    if (!t.id) return;
    setDeleting(t.id);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/payments/transactions/${t.id}`), { method: "DELETE" });
      if (res.ok) {
        showToast({ type: "success", text: "Payment deleted" });
        refreshAll();
      } else {
        const json = await res.json().catch(() => ({}));
        showToast({ type: "error", text: json.message || "Delete failed" });
      }
    } catch {
      showToast({ type: "error", text: "Network error" });
    } finally { setDeleting(null); }
  };

  const statCards = [
    { label: "Today", value: formatCurrency(stats.today), icon: <DollarSign className="w-4 h-4" />, color: "text-green-600 dark:text-green-400" },
    { label: "Last 7 Days", value: formatCurrency(stats.last7d), icon: <TrendingUp className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
    { label: "Last 30 Days", value: formatCurrency(stats.last30d), icon: <TrendingUp className="w-4 h-4" />, color: "text-indigo-600 dark:text-indigo-400" },
    { label: "Pending", value: String(stats.pendingCount), icon: <Clock className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400" },
    { label: "Failed", value: String(stats.failedCount), icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Stats */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {statCards.map((sc) => (
          <div key={sc.label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
            <div className={`flex-shrink-0 ${sc.color}`}>{sc.icon}</div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{sc.value}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{sc.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Search patient, description, invoice..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          {searchDraft && (
            <button onClick={() => setSearchDraft("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setCollectOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm ml-auto"
        >
          <Plus className="w-4 h-4" />
          Collect Payment
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Description</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                    <span className="text-sm text-gray-500">Loading transactions...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <DollarSign className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">No transactions found</p>
                    <p className="text-xs text-gray-400 mt-1">Collect a payment to get started</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(t.collectedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t.patientName || "--"}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        {methodIcon(t.paymentMethodType || "")}
                        <span className="text-xs">{t.lastFour ? `****${t.lastFour}` : (t.paymentMethodType || "--").replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[t.status] || STATUS_COLORS.pending}`}>
                        {STATUS_ICONS[t.status]}
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{(t.transactionType || "").replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate block max-w-[180px]">{t.description || "--"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewTarget(t)} title="View" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(t)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {(t.status === "completed" || t.status === "partial_refund") && (
                          <button onClick={() => openRefund(t)} title="Refund" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {(t.status === "pending" || t.status === "completed") && (
                          <button
                            onClick={() => handleVoid(t)}
                            disabled={voiding === t.id}
                            title="Void"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
                            {voiding === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={deleting === t.id}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          {deleting === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {page * pageSize + 1}--{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pn: number;
                if (totalPages <= 5) pn = i;
                else if (page < 3) pn = i;
                else if (page > totalPages - 4) pn = totalPages - 5 + i;
                else pn = page - 2 + i;
                return (
                  <button
                    key={pn}
                    onClick={() => setPage(pn)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition ${pn === page ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                  >
                    {pn + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collect Payment Modal */}
      <CollectPaymentModal open={collectOpen} onClose={() => setCollectOpen(false)} onSuccess={refreshAll} showToast={showToast} />

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRefundTarget(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Process Refund</h3>
                <button onClick={() => setRefundTarget(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Original: {formatCurrency(refundTarget.amount)} | Already refunded: {formatCurrency(refundTarget.refundAmount || 0)}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Refund Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={refundTarget.amount - (refundTarget.refundAmount || 0)}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason</label>
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    rows={2}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Reason for refund..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setRefundTarget(null)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button onClick={handleRefund} disabled={refunding} className="px-5 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition flex items-center gap-2">
                  {refunding && <Loader2 className="w-4 h-4 animate-spin" />}
                  Process Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewTarget(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Transaction Details</h3>
                <button onClick={() => setViewTarget(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ["ID", viewTarget.id],
                  ["Patient", viewTarget.patientName],
                  ["Amount", formatCurrency(viewTarget.amount)],
                  ["Status", viewTarget.status],
                  ["Type", viewTarget.transactionType],
                  ["Method", (viewTarget.paymentMethodType || "").replace(/_/g, " ")],
                  ["Card", viewTarget.lastFour ? `****${viewTarget.lastFour}` : null],
                  ["Description", viewTarget.description],
                  ["Invoice", viewTarget.invoiceNumber || viewTarget.invoiceId],
                  ["Ref Type", viewTarget.referenceType],
                  ["Ref ID", viewTarget.referenceId],
                  ["Convenience Fee", viewTarget.convenienceFee != null ? formatCurrency(viewTarget.convenienceFee) : null],
                  ["Refund Amount", viewTarget.refundAmount != null ? formatCurrency(viewTarget.refundAmount) : null],
                  ["Refund Reason", viewTarget.refundReason],
                  ["Receipt Sent", viewTarget.receiptSent != null ? (viewTarget.receiptSent ? "Yes" : "No") : null],
                  ["Receipt Email", viewTarget.receiptEmail],
                  ["Collected By", viewTarget.collectedBy || viewTarget.collectedByName],
                  ["Collected At", formatDate(viewTarget.collectedAt)],
                ].filter(([, val]) => val != null && val !== "").map(([label, val]) => (
                  <div key={label as string} className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium capitalize">{val || "N/A"}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <button onClick={() => setViewTarget(null)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Edit Payment</h3>
                <button onClick={() => setEditTarget(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Patient: {editTarget.patientName || "N/A"}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Payment description..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Method</label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={editForm.paymentMethodType}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, paymentMethodType: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="bank_account">Bank Account</option>
                    <option value="fsa">FSA</option>
                    <option value="hsa">HSA</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button onClick={handleEdit} disabled={editSaving} className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2">
                  {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
