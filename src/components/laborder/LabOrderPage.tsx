"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { usePermissions } from "@/context/PermissionContext";
import { handleLabOrderPrint } from "@/components/laborder/LabOrderForm";
import { confirmDialog } from "@/utils/toast";

/* Types */
type LabOrder = {
  id?: number; patientId: number; patientFirstName: string; patientLastName: string;
  patientHomePhone: string; mrn: string; testCode: string; orderName: string;
  testDisplay: string; status: string; priority: string; orderDateTime: string;
  orderDate: string; labName: string; orderNumber: string; orderingProvider: string;
  physicianName: string; specimenId: string; notes: string; diagnosisCode?: string;
  result: string; procedureCode?: string;
};

type OrderSet = { id: number; name: string; code: string; description: string; tests: string; category: string; active?: boolean };
type LabResult = { id: number; labOrderId: number; testName: string; value: string; status: string; abnormalFlag: string; reportedDate: string };
type ToastState = { type: "success" | "error" | "info"; text: string } | null;

/* Helpers */
function normalizeOrders(payload: unknown): LabOrder[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const k of ["data", "content", "items", "records", "result"]) {
      if (Array.isArray(obj[k])) return obj[k] as LabOrder[];
    }
  }
  return [];
}

function normalizePatientId(o: LabOrder): LabOrder {
  if (o.patientId && o.patientId > 0) return o;
  const a = o as unknown as Record<string, unknown>;
  const p = a["patient"] as Record<string, unknown> | undefined;
  for (const c of [a["patientId"], a["patient_id"], a["patientID"], p?.["id"], p?.["patientId"]]) {
    const n = Number(c);
    if (!Number.isNaN(n) && n > 0) return { ...o, patientId: n };
  }
  return o;
}

const resolveOrgId = () => {
  if (typeof window !== "undefined") { const v = localStorage.getItem("orgId"); if (v?.trim()) return v.trim(); }
  if (getEnv("NEXT_PUBLIC_ORG_ID")) return String(getEnv("NEXT_PUBLIC_ORG_ID"));
  return "1";
};

const apiBase = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200",
  active: "bg-green-100 text-green-800 ring-1 ring-green-200",
  pending: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
  completed: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  cancelled: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  revoked: "bg-red-50 text-red-800 ring-1 ring-red-200",
};
const badgeCls = (s?: string) => statusColors[(s || "").toLowerCase()] || "bg-gray-100 text-gray-800 ring-1 ring-gray-200";

const STATUS_STEPS = ["ordered", "collected", "processing", "resulted"] as const;
const statusStepMap: Record<string, number> = { draft: 0, active: 0, pending: 1, completed: 3, cancelled: -1, revoked: -1 };

/* Subcomponents */
function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const cls = toast.type === "success" ? "bg-green-50 border-green-200 text-green-900"
    : toast.type === "error" ? "bg-red-50 border-red-200 text-red-900" : "bg-blue-50 border-blue-200 text-blue-900";
  return (
    <div className={`fixed top-4 right-4 z-60 rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${cls}`}>
      <span>{toast.type === "success" ? "\u2714" : toast.type === "error" ? "\u26A0" : "\u2139"}</span>
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5" aria-label="Close">{"\u2715"}</button>
    </div>
  );
}

function Modal({ title, open, onClose, children, footer, wide = true }: {
  title: string; open: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto">
        <div className={`${wide ? "w-[min(1120px,96vw)]" : "w-[min(720px,96vw)]"} max-h-[85vh] rounded-lg bg-white shadow-xl border flex flex-col mx-4`}
          role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">{"\u2715"}</button>
          </div>
          <div className="px-6 py-4 grow overflow-y-auto">{children}</div>
          {footer && <div className="px-6 py-3 border-t flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border px-4 py-3 flex flex-col">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const step = statusStepMap[(status || "").toLowerCase()] ?? 0;
  const isCancelled = step === -1;
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((s, i) => {
        const done = !isCancelled && i <= step;
        const active = !isCancelled && i === step;
        return (
          <React.Fragment key={s}>
            <div className={`flex flex-col items-center ${i > 0 ? "ml-0" : ""}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                ${isCancelled ? "bg-gray-200 text-gray-400"
                  : done ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}
                ${active ? "ring-2 ring-blue-300" : ""}`}>
                {done && !isCancelled ? "\u2713" : i + 1}
              </div>
              <span className={`text-[9px] mt-0.5 capitalize ${done && !isCancelled ? "text-blue-700 font-medium" : "text-gray-400"}`}>{s}</span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-4 -mt-2.5 ${!isCancelled && i < step ? "bg-blue-500" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        );
      })}
      {isCancelled && <span className="ml-2 text-[10px] text-red-600 font-medium uppercase">{status}</span>}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority || "").toLowerCase();
  if (p === "stat") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 ring-1 ring-red-200 font-semibold">
      <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" /></span>
      STAT
    </span>
  );
  if (p === "urgent") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 ring-1 ring-orange-200 font-semibold">
      <span className="inline-flex rounded-full h-2 w-2 bg-orange-500" /> URGENT
    </span>
  );
  return <span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">ROUTINE</span>;
}

/* Main Page */
export default function LabOrdersPage() {
  const router = useRouter();
  const { canWriteResource } = usePermissions();
  const canWriteOrders = canWriteResource("ServiceRequest");

  // Core state
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patientCache, setPatientCache] = useState<Map<number, { firstName: string; lastName: string }>>(new Map());
  const [orderSets, setOrderSets] = useState<OrderSet[]>([]);
  const [orderResults, setOrderResults] = useState<Map<number, LabResult[]>>(new Map());

  // Filters
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const debounceRef = useRef<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection / modals
  const [selected, setSelected] = useState<LabOrder | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [batchIds, setBatchIds] = useState<Set<number>>(new Set());
  const [showSets, setShowSets] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  /* ---------- Fetch helpers ---------- */

  const fetchOrders = useCallback(async (q: string, showToast = true) => {
    try {
      const base = apiBase();
      if (!base) { if (showToast) setToast({ type: "error", text: "API URL not configured" }); setOrders([]); return; }
      const org = resolveOrgId();
      const res = await fetchWithAuth(`${base}/api/lab-order/search?q=${encodeURIComponent(q)}`, { method: "GET", headers: { orgId: org } });
      const text = await res.text();
      let parsed: unknown = null; try { parsed = text ? JSON.parse(text) : null; } catch { /* skip */ }
      const arr = normalizeOrders(parsed).map(normalizePatientId);
      if (res.ok) { setOrders(arr); if (arr.length === 0 && showToast) setToast({ type: "info", text: "No lab orders found." }); return; }
      setOrders([]);
      if (res.status === 401) { if (showToast) setToast({ type: "error", text: "Unauthorized. Please login again." }); }
      else if (showToast) setToast({ type: "error", text: `Failed loading orders (HTTP ${res.status})` });
    } catch (e) {
      console.error("fetchOrders error", e);
      // Relative fallback
      try {
        const org = resolveOrgId();
        const res = await fetchWithAuth(`/api/lab-order/search?q=${encodeURIComponent(q)}`, { method: "GET", headers: { orgId: org } });
        const text = await res.text();
        let parsed: unknown = null; try { parsed = text ? JSON.parse(text) : null; } catch { /* skip */ }
        if (res.ok) { setOrders(normalizeOrders(parsed).map(normalizePatientId)); return; }
      } catch { /* give up */ }
      if (showToast) setToast({ type: "error", text: "Backend unreachable." });
    }
  }, []);

  const fetchOrderSets = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/lab-order-sets`);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) setOrderSets(json.data.filter((s: OrderSet) => s.active !== false));
    } catch { /* silent */ }
  }, []);

  const fetchResultsForOrder = useCallback(async (orderId: number) => {
    try {
      const res = await fetchWithAuth(`${apiBase()}/api/lab-results/order/${orderId}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setOrderResults(prev => { const m = new Map(prev); m.set(orderId, json.data); return m; });
      }
    } catch { /* silent */ }
  }, []);

  /* ---------- Initial load ---------- */

  useEffect(() => {
    fetchOrders("", false);
    fetchOrderSets();
    if (typeof window !== "undefined") {
      const flag = sessionStorage.getItem("labOrderToast");
      if (flag === "saved") setToast({ type: "success", text: "Saved successfully" });
      if (flag === "deleted") setToast({ type: "success", text: "Deleted successfully" });
      if (flag) sessionStorage.removeItem("labOrderToast");
    }
  }, [fetchOrders, fetchOrderSets]);

  // Fetch patient names for orders missing them
  useEffect(() => {
    const missing = orders.filter(o => !o.patientFirstName && o.patientId && !patientCache.has(o.patientId));
    if (!missing.length) return;
    Promise.all(missing.map(async o => {
      try {
        const res = await fetchWithAuth(`${apiBase()}/api/patients/${o.patientId}`);
        const json = await res.json();
        if (json?.success && json?.data) return { id: o.patientId, firstName: json.data.firstName, lastName: json.data.lastName };
      } catch { /* skip */ }
      return null;
    })).then(results => {
      const nc = new Map(patientCache);
      results.forEach(r => r && nc.set(r.id, { firstName: r.firstName, lastName: r.lastName }));
      setPatientCache(nc);
    });
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setQuery(searchDraft.trim()), 300) as unknown as number;
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchDraft]);

  // Re-fetch when query changes
  useEffect(() => { fetchOrders(query, query.length > 0); }, [query, fetchOrders]);

  /* ---------- Filtering & pagination ---------- */

  const filtered = useMemo(() => orders.filter(o => {
    const cached = patientCache.get(o.patientId);
    const hay = [o.orderNumber, o.orderName, o.testCode, o.patientFirstName, o.patientLastName, o.mrn,
      String(o.patientId), cached?.firstName, cached?.lastName].filter(Boolean).join(" ").toLowerCase();
    const q = query.toLowerCase().trim();
    const matchQ = !q || (/^\d+$/.test(q) ? (String(o.patientId) === q || String(o.mrn) === q || hay.includes(q)) : hay.includes(q));
    const matchS = statusFilter === "all" || (o.status || "").toLowerCase() === statusFilter.toLowerCase();
    const matchP = priorityFilter === "all" || (o.priority || "").toLowerCase() === priorityFilter.toLowerCase();
    const matchR = resultFilter === "all" || (o.result || "Pending").toLowerCase() === resultFilter.toLowerCase();
    return matchQ && matchS && matchP && matchR;
  }), [orders, query, statusFilter, priorityFilter, resultFilter, patientCache]);

  useEffect(() => { setPage(1); }, [query, statusFilter, priorityFilter, resultFilter]);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  /* ---------- Statistics ---------- */

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => ["draft", "active", "pending"].includes(o.status)).length,
    completed: orders.filter(o => o.status === "completed").length,
    stat: orders.filter(o => o.priority === "stat" && o.status !== "completed" && o.status !== "cancelled").length,
  }), [orders]);

  /* ---------- Order sets grouped ---------- */

  const groupedSets = useMemo(() => {
    const map: Record<string, OrderSet[]> = {};
    orderSets.forEach(s => { const cat = s.category || "General"; (map[cat] ??= []).push(s); });
    return map;
  }, [orderSets]);

  /* ---------- Actions ---------- */

  const deleteOrder = async (o: LabOrder) => {
    if (!o?.id || !o?.patientId) { setToast({ type: "error", text: "Order or patient ID missing" }); return; }
    if (!(await confirmDialog("Delete this order?"))) return;
    try {
      const org = resolveOrgId();
      const res = await fetchWithAuth(`${apiBase()}/api/lab-order/${o.patientId}/${o.id}`, { method: "DELETE", headers: { orgId: org, "X-Org-Id": org } });
      const text = await res.text();
      let json: { success?: boolean; message?: string } | null = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* skip */ }
      if (res.ok || json?.success) {
        setOrders(p => p.filter(x => x.id !== o.id));
        if (selected?.id === o.id) { setSelected(null); setViewOpen(false); }
        setToast({ type: "success", text: "Deleted successfully" });
      } else {
        setToast({ type: "error", text: `Delete failed: ${json?.message || `HTTP ${res.status}`}` });
      }
    } catch { setToast({ type: "error", text: "Error connecting to backend" }); }
  };

  const markComplete = async (o: LabOrder) => {
    if (!o?.id || !o?.patientId) return;
    try {
      const org = resolveOrgId();
      const res = await fetchWithAuth(`${apiBase()}/api/lab-order/${o.patientId}/${o.id}`, {
        method: "PUT", headers: { orgId: org, "X-Org-Id": org, "Content-Type": "application/json" },
        body: JSON.stringify({ ...o, status: "completed" }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setOrders(p => p.map(x => x.id === o.id ? { ...x, status: "completed" } : x));
        setToast({ type: "success", text: `Order ${o.orderNumber} marked complete` });
      } else { setToast({ type: "error", text: json?.message || "Failed to update" }); }
    } catch { setToast({ type: "error", text: "Error connecting to backend" }); }
  };

  const batchCancel = async () => {
    if (!batchIds.size) return;
    if (!(await confirmDialog(`Cancel ${batchIds.size} selected order(s)?`))) return;
    let ok = 0;
    for (const id of batchIds) {
      const o = orders.find(x => x.id === id);
      if (!o) continue;
      try {
        const org = resolveOrgId();
        const res = await fetchWithAuth(`${apiBase()}/api/lab-order/${o.patientId}/${o.id}`, {
          method: "PUT", headers: { orgId: org, "X-Org-Id": org, "Content-Type": "application/json" },
          body: JSON.stringify({ ...o, status: "cancelled" }),
        });
        if (res.ok) { ok++; setOrders(p => p.map(x => x.id === id ? { ...x, status: "cancelled" } : x)); }
      } catch { /* skip */ }
    }
    setBatchIds(new Set());
    setToast({ type: "success", text: `${ok} order(s) cancelled` });
  };

  const batchPrint = () => {
    const toPrint = orders.filter(o => o.id && batchIds.has(o.id));
    toPrint.forEach(o => {
      const procCodes = (o.procedureCode || "").split(",").map(c => c.trim()).filter(Boolean);
      const diagList = (o.diagnosisCode || "").split(/[;,]/).map(c => c.trim()).filter(Boolean);
      const procRows = procCodes.length ? procCodes.map((code, i) => ({ test: code, testCode: code, diagnosisCodes: i === 0 ? diagList : [] })) : [];
      // Ensure patient name is resolved from cache when not in order fields
      const enriched = { ...o };
      if (!enriched.patientFirstName && !enriched.patientLastName) {
        const c = patientCache.get(o.patientId);
        if (c) { enriched.patientFirstName = c.firstName; enriched.patientLastName = c.lastName; }
      }
      handleLabOrderPrint(enriched, procRows, false);
    });
    setBatchIds(new Set());
  };

  const toggleBatch = (id: number) => setBatchIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (batchIds.size === pageItems.length) setBatchIds(new Set());
    else setBatchIds(new Set(pageItems.map(o => o.id!).filter(Boolean)));
  };

  const openView = async (o: LabOrder) => {
    setSelected(o);
    setViewOpen(true);
    if (o.id && !orderResults.has(o.id)) fetchResultsForOrder(o.id);
  };

  const printSelected = () => {
    if (!selected) return;
    const procCodes = (selected.procedureCode || "").split(",").map(c => c.trim()).filter(Boolean);
    const diagList = (selected.diagnosisCode || "").split(/[;,]/).map(c => c.trim()).filter(Boolean);
    const procRows = procCodes.length ? procCodes.map((code, i) => ({ test: code, testCode: code, diagnosisCodes: i === 0 ? diagList : [] })) : [];
    // Ensure patient name is resolved from cache when not in order fields
    const enriched = { ...selected };
    if (!enriched.patientFirstName && !enriched.patientLastName) {
      const c = patientCache.get(selected.patientId);
      if (c) { enriched.patientFirstName = c.firstName; enriched.patientLastName = c.lastName; }
    }
    handleLabOrderPrint(enriched, procRows, false);
  };

  const patientName = (o: LabOrder) => {
    if (o.patientFirstName && o.patientLastName) return `${o.patientFirstName} ${o.patientLastName}`;
    const c = patientCache.get(o.patientId);
    return c ? `${c.firstName} ${c.lastName}` : String(o.patientId || "\u2014");
  };

  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {orderSets.length > 0 && (
            <button onClick={() => setShowSets(!showSets)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 text-gray-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Order Sets
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canWriteOrders && batchIds.size > 0 && (
            <>
              <span className="text-sm text-gray-600">{batchIds.size} selected</span>
              <button onClick={batchPrint} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 text-gray-700">Print Selected</button>
              <button onClick={batchCancel} className="px-3 py-2 rounded-lg border border-red-200 text-sm text-red-700 hover:bg-red-50">Cancel Selected</button>
            </>
          )}
          {canWriteOrders && (
          <button onClick={() => router.push("/labs/orders/new")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Order
          </button>
          )}
        </div>
      </div>

      {/* Statistics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Orders" value={stats.total} color="text-gray-900" />
        <MetricCard label="Pending" value={stats.pending} color="text-orange-600" />
        <MetricCard label="Completed" value={stats.completed} color="text-blue-600" />
        <MetricCard label="STAT Active" value={stats.stat} color="text-red-600" />
      </div>

      {/* Order Sets sidebar panel */}
      {showSets && orderSets.length > 0 && (
        <div className="bg-white border rounded-lg p-4 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Order Sets / Panels</h4>
            <button onClick={() => setShowSets(false)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(groupedSets).map(([cat, sets]) => (
              <div key={cat}>
                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">{cat}</h5>
                {sets.map(s => (
                  <button key={s.id} onClick={() => { router.push(`/labs/orders/new?testCode=${encodeURIComponent(s.code)}&orderName=${encodeURIComponent(s.name)}`); }}
                    className="block w-full text-left px-2 py-1.5 rounded text-sm hover:bg-blue-50 text-gray-800 group">
                    <span className="font-medium group-hover:text-blue-700">{s.name}</span>
                    <span className="text-xs text-gray-500 ml-1">({s.code})</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-3">
          <input className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white"
            placeholder="Search by order #, test, patient name, MRN..."
            value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setQuery(searchDraft.trim()); } }} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full text-gray-800 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="draft">Draft</option><option value="active">Active</option><option value="pending">Pending</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="revoked">Revoked</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full text-gray-800 bg-white" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All</option><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Result</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full text-gray-800 bg-white" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
            <option value="all">All</option><option value="Pending">Pending</option><option value="Preliminary">Preliminary</option><option value="Partial">Partial</option><option value="Final">Final</option><option value="Corrected">Corrected</option><option value="Amended">Amended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-700">
                <th className="px-3 py-3 w-10"><input type="checkbox" checked={batchIds.size > 0 && batchIds.size === pageItems.filter(o => o.id).length}
                  onChange={toggleAll} className="rounded border-gray-300" /></th>
                <th className="text-left px-3 py-3 font-semibold">Order #</th>
                <th className="text-left px-3 py-3 font-semibold">Patient</th>
                <th className="text-left px-3 py-3 font-semibold">Test</th>
                <th className="text-left px-3 py-3 font-semibold">Priority</th>
                <th className="text-left px-3 py-3 font-semibold">Status</th>
                <th className="text-left px-3 py-3 font-semibold">Result</th>
                <th className="text-left px-3 py-3 font-semibold">Date</th>
                <th className="text-left px-3 py-3 font-semibold">Provider</th>
                <th className="text-right px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => (
                <tr key={o.id ?? `${o.orderNumber}-${o.patientId}`} className="border-t hover:bg-gray-50/80 transition-colors">
                  <td className="px-3 py-3">{o.id && <input type="checkbox" checked={batchIds.has(o.id)} onChange={() => toggleBatch(o.id!)} className="rounded border-gray-300" />}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-900">{o.orderNumber}</td>
                  <td className="px-3 py-3 text-gray-900">
                    <div className="font-medium">{patientName(o)}</div>
                    {o.mrn && <div className="text-xs text-gray-500">MRN {o.mrn}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{o.orderName || o.testDisplay || o.testCode || "\u2014"}</div>
                    {o.testCode && o.orderName && <div className="text-xs text-gray-500">{o.testCode}</div>}
                  </td>
                  <td className="px-3 py-3"><PriorityBadge priority={o.priority} /></td>
                  <td className="px-3 py-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${badgeCls(o.status)}`}>{(o.status || "").toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-medium ${o.result === "Final" ? "text-green-700" : o.result === "Partial" ? "text-orange-600" : "text-gray-500"}`}>
                      {o.result || "Pending"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-900">
                    <div className="text-xs">{o.orderDate}</div>
                    {o.orderDateTime && <div className="text-xs text-gray-500">{o.orderDateTime.slice(11, 16)}</div>}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">{o.orderingProvider}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openView(o)} title="View" className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {canWriteOrders && o.status !== "completed" && o.status !== "cancelled" && (
                        <button onClick={() => markComplete(o)} title="Mark Complete" className="p-1.5 rounded hover:bg-green-50 text-green-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                      )}
                      <button onClick={() => router.push(`/labs/results?orderId=${o.id}`)} title="View Results" className="p-1.5 rounded hover:bg-purple-50 text-purple-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                      {canWriteOrders && (
                        <>
                          <button onClick={() => router.push(`/labs/orders/new?editId=${o.id}&patientId=${o.patientId}`)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => deleteOrder(o)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-gray-500 text-sm">No lab orders found</p>
                      <p className="text-gray-400 text-xs">Create a new order to get started, or try a different search.</p>
                      {canWriteOrders && (
                      <button onClick={() => router.push("/labs/orders/new")}
                        className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
                        Create New Order
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-1 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-40">Prev</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Showing {start + 1}-{Math.min(start + pageSize, total)} of {total}</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
              <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      <Modal title={selected ? `Order ${selected.orderNumber}` : "Order"} open={viewOpen} onClose={() => setViewOpen(false)} wide
        footer={selected && (
          <>
            <button onClick={() => setViewOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm">Close</button>
            <button onClick={printSelected} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 text-sm">Print</button>
            {canWriteOrders && (
              <>
                <button onClick={() => router.push(`/labs/orders/new?editId=${selected.id}&patientId=${selected.patientId}`)}
                  className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm">Edit</button>
                <button onClick={() => deleteOrder(selected)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm">Delete</button>
              </>
            )}
          </>
        )}>
        {selected ? (
          <div className="space-y-6">
            {/* Status timeline */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
              <StatusTimeline status={selected.status} />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Order details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Order Details</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <span className="text-gray-500">Order #</span><span className="font-mono text-gray-900">{selected.orderNumber}</span>
                  <span className="text-gray-500">Order Name</span><span className="text-gray-900">{selected.orderName}</span>
                  <span className="text-gray-500">Test Code</span><span className="text-gray-900">{selected.testCode}{selected.testDisplay ? ` (${selected.testDisplay})` : ""}</span>
                  <span className="text-gray-500">Priority</span><span><PriorityBadge priority={selected.priority} /></span>
                  <span className="text-gray-500">Status</span><span><span className={`inline-block text-xs px-2 py-1 rounded-full ${badgeCls(selected.status)}`}>{(selected.status || "").toUpperCase()}</span></span>
                  <span className="text-gray-500">Date</span><span className="text-gray-900">{selected.orderDate}{selected.orderDateTime ? ` at ${selected.orderDateTime.slice(11, 16)}` : ""}</span>
                  <span className="text-gray-500">Lab</span><span className="text-gray-900">{selected.labName || "\u2014"}</span>
                  <span className="text-gray-500">Result Status</span><span className={`font-medium ${selected.result === "Final" ? "text-green-700" : selected.result === "Partial" ? "text-orange-600" : "text-gray-500"}`}>{selected.result || "Pending"}</span>
                </div>
              </div>

              {/* Specimen & Clinical */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Specimen & Clinical</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <span className="text-gray-500">Specimen ID</span><span className="text-gray-900">{selected.specimenId || "\u2014"}</span>
                  <span className="text-gray-500">Provider</span><span className="text-gray-900">{selected.orderingProvider || selected.physicianName || "\u2014"}</span>
                  {selected.orderingProvider && selected.physicianName && selected.orderingProvider !== selected.physicianName && (
                    <><span className="text-gray-500">Physician</span><span className="text-gray-900">{selected.physicianName}</span></>
                  )}
                  <span className="text-gray-500">Diagnosis</span><span className="text-gray-900">{(selected.diagnosisCode || "").split(/[;,]/).map(s => s.trim()).filter(Boolean).join("; ") || "\u2014"}</span>
                  <span className="text-gray-500">Procedure</span><span className="text-gray-900">{(selected.procedureCode || "").split(",").map(s => s.trim()).filter(Boolean).join(", ") || "\u2014"}</span>
                  <span className="text-gray-500">Notes</span><span className="text-gray-900">{selected.notes || "\u2014"}</span>
                </div>
              </div>
            </div>

            {/* Attached results */}
            {selected.id && orderResults.has(selected.id) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Attached Results ({orderResults.get(selected.id)?.length || 0})
                </h4>
                {(orderResults.get(selected.id) || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No results attached yet.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Test</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Value</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Flag</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Reported</th>
                      </tr></thead>
                      <tbody>
                        {(orderResults.get(selected.id) || []).map(r => (
                          <tr key={r.id} className="border-t">
                            <td className="px-3 py-2 text-gray-900">{r.testName}</td>
                            <td className="px-3 py-2 text-gray-900 font-medium">{r.value || "\u2014"}</td>
                            <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "final" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{r.status}</span></td>
                            <td className="px-3 py-2">{r.abnormalFlag ? <span className="text-xs font-bold text-red-600">{r.abnormalFlag}</span> : <span className="text-gray-400">Normal</span>}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{r.reportedDate || "\u2014"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : <div className="py-8 text-center text-gray-500">No order selected.</div>}
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
