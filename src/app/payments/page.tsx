"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import {
  Receipt,
  CreditCard,
  Calendar,
  BookOpen,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
} from "lucide-react";
import TransactionsTab from "@/components/payments/TransactionsTab";
import PaymentMethodsTab from "@/components/payments/PaymentMethodsTab";
import PaymentPlansTab from "@/components/payments/PaymentPlansTab";
import LedgerTab from "@/components/payments/LedgerTab";
import PaymentSettings from "@/components/payments/PaymentSettings";

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

type ToastState = { type: "success" | "error" | "info"; text: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const cls =
    toast.type === "success"
      ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
      : toast.type === "error"
        ? "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
        : "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200";
  return (
    <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${cls}`}>
      {toast.type === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
      {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600" />}
      {toast.type === "info" && <Clock className="w-4 h-4 text-blue-600" />}
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "transactions", label: "Transactions", icon: <Receipt className="w-4 h-4" /> },
  { key: "methods", label: "Payment Methods", icon: <CreditCard className="w-4 h-4" /> },
  { key: "plans", label: "Payment Plans", icon: <Calendar className="w-4 h-4" /> },
  { key: "ledger", label: "Ledger", icon: <BookOpen className="w-4 h-4" /> },
  { key: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("transactions");

  /* Toast */
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (t: { type: "success" | "error"; text: string }) => setToast(t);

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* Tab bar */}
        <div className="shrink-0 flex items-center gap-1 mb-4 overflow-x-auto border-b border-gray-200 dark:border-slate-700 pb-0">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "transactions" && <TransactionsTab showToast={showToast} />}
          {activeTab === "methods" && <PaymentMethodsTab showToast={showToast} />}
          {activeTab === "plans" && <PaymentPlansTab showToast={showToast} />}
          {activeTab === "ledger" && <LedgerTab showToast={showToast} />}
          {activeTab === "settings" && <PaymentSettings showToast={showToast} />}
        </div>
      </div>
    </AdminLayout>
  );
}
