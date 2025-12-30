"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { handleLabOrderPrint } from "@/components/laborder/LabOrderForm";

/* ---------------- Types ---------------- */
 

type LabOrder = {
  id?: number;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
  patientHomePhone: string;
  mrn: string;
  testCode: string;
  orderName: string;
  testDisplay: string;
  status: string;        // draft | active | pending | completed | cancelled | revoked
  priority: string;      // routine | urgent | stat
  orderDateTime: string; // ISO
  orderDate: string;     // YYYY-MM-DD
  labName: string;
  orderNumber: string;
  orderingProvider: string;
  physicianName: string;
  specimenId: string;
  notes: string;
  diagnosisCode?: string;
  result: string;        // Pending | Partial | Final
  procedureCode?: string;
};

// Normalize patient ID from various possible field names
function normalizePatientId(order: LabOrder): LabOrder {
  if (order.patientId && order.patientId > 0) return order; // Already set
  
  const anyOrder = order as unknown as Record<string, unknown>;
  const patientObj = anyOrder['patient'] as Record<string, unknown> | undefined;
  
  // Try multiple common field names
  const candidates = [
    anyOrder['patientId'],
    anyOrder['patient_id'],
    anyOrder['patientID'],
    patientObj?.['id'],
    patientObj?.['patientId'],
  ];
  
  for (const candidate of candidates) {
    if (candidate || candidate === 0) {
      const num = Number(candidate);
      if (!Number.isNaN(num) && num > 0) {
        return { ...order, patientId: num };
      }
    }
  }
  
  return order;
}

// Batch normalize patient IDs in orders array
function normalizeOrderPatientIds(orders: LabOrder[]): LabOrder[] {
  return orders.map(normalizePatientId);
}
// Backend may return in different shapes (after recent changes):
// 1. { success:true, data:[...] }
// 2. [ ... ] (raw array)
// 3. { content:[...], success?:bool }
// 4. { items:[...]} or { records:[...] }
// This helper extracts an array of orders or returns [].
function normalizeOrders(payload: unknown): LabOrder[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as LabOrder[];
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const keys = ['data','content','items','records','result'];
    for (const k of keys) {
      if (Array.isArray(obj[k])) return obj[k] as LabOrder[];
    }
  }
  return [];
}

// (Create/Edit handled on standalone page)

/* ---------------- Helpers ---------------- */

function FieldRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 text-sm">
      <div className="text-gray-900">{label}</div>
      {children}
    </div>
  );
}

function statusBadgeClasses(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "draft")    return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";
  if (s === "active")   return "bg-green-100 text-green-800 ring-1 ring-green-200";
  if (s === "pending")  return "bg-orange-100 text-orange-800 ring-1 ring-orange-200";
  if (s === "completed")return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
  if (s === "cancelled")return "bg-gray-100 text-gray-800 ring-1 ring-gray-200";
  if (s === "revoked")  return "bg-red-50 text-red-800 ring-1 ring-red-200";
  return "bg-gray-100 text-gray-800 ring-1 ring-gray-200";
}

function resolveOrgId(): string {
  if (typeof window !== "undefined") {
    const fromLS = window.localStorage.getItem("orgId");
    if (fromLS && fromLS.trim()) return fromLS.trim();
  }
  if (process.env.NEXT_PUBLIC_ORG_ID) return String(process.env.NEXT_PUBLIC_ORG_ID);
  return "1";
}

// user display name resolution now done on form page

function formatMrn(mrn?: string) {
  if (!mrn) return "—";
  const trimmed = String(mrn).trim();
  if (/^mrn\b/i.test(trimmed)) return trimmed;
  return `MRN ${trimmed}`;
}

// order number generation handled in standalone form component

/* ---------------- Toast ---------------- */

type ToastState = { type: "success" | "error" | "info"; text: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const base =
    "fixed top-4 right-4 z-[60] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3";
  const styles =
    toast.type === "success"
      ? "bg-green-50 border-green-200 text-green-900"
      : toast.type === "error"
      ? "bg-red-50 border-red-200 text-red-900"
      : "bg-blue-50 border-blue-200 text-blue-900";
  const icon = toast.type === "success" ? "✔" : toast.type === "error" ? "⚠" : "ℹ";
  return (
    <div className={`${base} ${styles}`}>
      <span>{icon}</span>
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-black/5" aria-label="Close">
        ✕
      </button>
    </div>
  );
}

/* ---------------- Modal ---------------- */

function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  wide = true,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto">
        <div
          className={`${wide ? "w-[min(1120px,96vw)]" : "w-[min(720px,96vw)]"} max-h-[82vh] rounded-lg bg-white shadow-xl border flex flex-col mx-4`}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">✕</button>
          </div>
          <div className="px-6 py-4 grow overflow-y-auto">{children}</div>
          <div className="px-6 py-4 border-t flex justify-end gap-2">{footer}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function LabOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [selected, setSelected] = useState<LabOrder | null>(null);
  const [patientCache, setPatientCache] = useState<Map<number, { firstName: string; lastName: string }>>(new Map());

  // filters
  const [query, setQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const debounceRef = useRef<number | null>(null);
  const lastQueryRef = useRef<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modals (create/edit removed – now separate page). Keep view modal for read-only.
  const [viewOpen, setViewOpen] = useState(false);
  // view modal only (editing done on separate route)

  // toast
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load all orders on first mount (empty search). Don't show an error toast if none exist.
  useEffect(() => {
      // initial load – directly hit /search with blank query (controller returns all org orders filtered in backend)
      fetchOrdersByQuery("", false);
    // Show cross-page toast if set by form or deletion redirect
    if (typeof window !== 'undefined') {
      const flag = sessionStorage.getItem('labOrderToast');
      if (flag === 'saved') setToast({ type: 'success', text: 'Saved successfully' });
      if (flag === 'deleted') setToast({ type: 'success', text: 'Deleted successfully' });
      if (flag) sessionStorage.removeItem('labOrderToast');
    }
  }, []);

  // Fetch patient names for orders that don't have them
  useEffect(() => {
    const missingPatients = orders.filter(o => !o.patientFirstName && o.patientId && !patientCache.has(o.patientId));
    if (missingPatients.length === 0) return;
    
    Promise.all(missingPatients.map(async (o) => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${o.patientId}`);
        const json = await res.json();
        if (json?.success && json?.data) {
          return { id: o.patientId, firstName: json.data.firstName, lastName: json.data.lastName };
        }
      } catch (e) {
        console.error('Failed to fetch patient', o.patientId, e);
      }
      return null;
    })).then(results => {
      const newCache = new Map(patientCache);
      results.forEach(r => r && newCache.set(r.id, { firstName: r.firstName, lastName: r.lastName }));
      setPatientCache(newCache);
    });
  }, [orders]);

  // All create/edit form logic removed (handled in LabOrderForm component on /labs/orders/new)

  // (search & patient/provider helpers removed; not needed on listing page)

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const hay = [
        o.orderNumber, o.orderName, o.testCode,
        o.patientFirstName, o.patientLastName, o.mrn, String(o.patientId),
      ].filter(Boolean).join(" ").toLowerCase();
      const q = query.toLowerCase().trim();
      const digitsOnly = /^\d+$/.test(q);
      const matchesQ = digitsOnly
        ? (String(o.patientId) === q || String(o.mrn) === q || hay.includes(q))
        : hay.includes(q);
        
      const matchesS = statusFilter === "all" || o.status === statusFilter;
      const matchesP = priorityFilter === "all" || o.priority === priorityFilter;
      return matchesQ && matchesS && matchesP;
    });
  }, [orders, query, statusFilter, priorityFilter]);

  useEffect(() => { setPage(1); }, [query, statusFilter, priorityFilter, searchDraft, orders]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pageItems = filtered.slice(startIndex, endIndex);

  /* ---------- Backend fetch helpers ---------- */

  // returns number of orders loaded (used in handleSearch)
  async function fetchOrdersForPatient(patientId: number): Promise<number> {
    try {
      const org = resolveOrgId();
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/lab-order/${patientId}`, {
        method: "GET",
        headers: { orgId: org, 'X-Org-Id': org },
      });
      const text = await res.text();
      let parsed: unknown = null; try { parsed = text ? JSON.parse(text) : null; } catch {/*ignore*/}
      const arr = normalizeOrders(parsed);
      if (res.ok && arr.length) {
        setOrders(normalizeOrderPatientIds(arr));
        setToast(null);
        return arr.length;
      }
      setOrders([]);
      if (res.status === 401) {
        setToast({ type: 'error', text: 'Unauthorized (401). Please login again.' });
      } else {
        setToast({ type: "error", text: `No orders found for patient ${patientId}` });
      }
      return 0;
    } catch (e) {
      console.error("fetchOrdersForPatient error", e);
      setToast({ type: "error", text: "Error connecting to backend" });
      return 0;
    }
  }

  // fetch by free-text query. If showToastOnEmpty is false, don't show an error toast when no results
  async function fetchOrdersByQuery(q: string, showToastOnEmpty = true, triedRelative = false) {
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
      if (!base) {
        if (showToastOnEmpty) setToast({ type: "error", text: "API base URL not configured (NEXT_PUBLIC_API_URL)." });
        setOrders([]);
        return;
      }
      const url = `${base}/api/lab-order/search?q=${encodeURIComponent(q)}`;
      const org = resolveOrgId();
      // always send only orgId header (controller expects 'orgId'); X-Org-Id kept by fetchWithAuth already if localStorage has it
      const res = await fetchWithAuth(url, { method: "GET", headers: { orgId: org } });
      const text = await res.text();
      let jsonUnknown: unknown = null; try { jsonUnknown = text ? JSON.parse(text) : null; } catch { /* ignore parse errors */ }
      const arr = normalizeOrders(jsonUnknown);

      if (res.ok && arr.length > 0) {
        setOrders(normalizeOrderPatientIds(arr));
        setToast(null);
        return;
      }

      // Removed fallback calls to non-existing endpoints to avoid extra 401 noise.

      // Empty / none found cases
      if (res.ok && arr.length === 0) {
        setOrders([]);
        if (showToastOnEmpty) setToast({ type: 'info', text: 'No lab orders found.' });
        return;
      }

      // Error status
      setOrders([]);
      if (res.status === 401) {
        if (showToastOnEmpty) setToast({ type: 'error', text: 'Unauthorized (401). Please login again.' });
      } else if (showToastOnEmpty) {
        setToast({ type: 'error', text: `Failed loading orders${res.status ? ` (HTTP ${res.status})` : ''}` });
      }
    } catch (e: unknown) {
      // Network level error (e.g., ECONNREFUSED) – attempt relative fallback once
      interface ErrorLike { message?: string }
      const msg = (() => {
        if (typeof e === 'string') return e;
        if (e && typeof e === 'object') {
          const maybe = e as ErrorLike;
          if (typeof maybe.message === 'string') return maybe.message;
        }
        return String(e);
      })();
      const isConnRefused = /Failed to fetch|ECONNREFUSED|NetworkError/i.test(msg);
      if (isConnRefused && !triedRelative) {
        try {
          const relUrl = `/api/lab-order/search?q=${encodeURIComponent(q)}`;
          const org = resolveOrgId();
          const relRes = await fetchWithAuth(relUrl, { method: 'GET', headers: { orgId: org } });
          const text = await relRes.text();
            let jsonUnknown: unknown = null; try { jsonUnknown = text ? JSON.parse(text) : null; } catch {}
            const arr = normalizeOrders(jsonUnknown);
            if (relRes.ok) {
              setOrders(normalizeOrderPatientIds(arr));
              if (arr.length === 0 && showToastOnEmpty) setToast({ type: 'info', text: 'No lab orders found.' });
              return; // success (even if empty)
            }
        } catch (inner) {
          console.warn('Relative fallback also failed', inner);
        }
      }
      console.error("fetchOrdersByQuery error", e);
      if (showToastOnEmpty) {
        setToast({ type: "error", text: isConnRefused ? "Backend unreachable. Ensure Spring Boot is running on the configured port." : "Error connecting to backend" });
      }
    }
  }

  // Called when user explicitly triggers search (button / Enter)
  async function handleSearch() {
    const q = searchDraft.trim();
    setQuery(q);

    if (/^\d+$/.test(q)) {
      const count = await fetchOrdersForPatient(Number(q));
      if (count === 0) {
        // fallback so numeric MRNs (or any numeric query) still work
        await fetchOrdersByQuery(q);
      }
      return;
    }

    await fetchOrdersByQuery(q);
  }

  // Auto-search debounced when user types (no need to click Search)
  useEffect(() => {
    const raw = searchDraft.trim();
    // Always show all if empty
    const target = raw;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (lastQueryRef.current === target) return; // avoid duplicate fetch
      lastQueryRef.current = target;
      setQuery(target);
      if (/^\d+$/.test(target)) {
        const count = await fetchOrdersForPatient(Number(target));
        if (count === 0) await fetchOrdersByQuery(target, false); // fallback
      } else {
        await fetchOrdersByQuery(target, false);
      }
    }, 350) as unknown as number;
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [searchDraft]);

  // (create/edit CRUD removed)

  async function deleteOrder(o: LabOrder) {
    if (!o?.id) { setToast({ type: "error", text: "Order ID missing" }); return; }
    if (!o?.patientId) { setToast({ type: "error", text: "Patient ID missing" }); return; }
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const org = resolveOrgId();
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lab-order/${o.patientId}/${o.id}`,
        { method: "DELETE", headers: { orgId: org, 'X-Org-Id': org } }
      );
      
      const text = await res.text();
      let json: { success?: boolean; message?: string } | null = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      
      if (res.ok || (json?.success === true)) {
        setOrders((p) => p.filter((x) => x.id !== o.id));
        if (selected?.id === o.id) setSelected(null);
        setViewOpen(false);
        setToast({ type: "success", text: "Deleted successfully" });
        return;
      }
      
      console.error('Delete failed:', { status: res.status, response: text });
      setToast({ type: "error", text: `Failed to delete: ${json?.message || text || `HTTP ${res.status}`}` });
    } catch (e) {
      console.error("delete error", e);
      setToast({ type: "error", text: "Error connecting to backend" });
    }
  }

  /* ---------- Action handlers referenced in JSX ---------- */

  // openCreateModal removed – navigation used instead

  function openEditModal(o: LabOrder) {
    router.push(`/labs/orders/new?editId=${o.id}&patientId=${o.patientId}`);
  }

  function openView(o: LabOrder) {
    setSelected(o);
    setViewOpen(true);
  }

  function printSelected() {
    if (!selected) return;
    // Build draft-like object expected by print helper
    type PrintDraft = {
      orderNumber: string; patientFirstName: string; patientLastName: string;
      orderDate: string; orderDateTime: string; labName: string; orderName: string;
      testCode: string; testDisplay: string; status: string; priority: string;
      orderingProvider: string; physicianName: string; specimenId: string; notes: string;
      diagnosisCode?: string; result: string; procedureCode?: string;
    };
    const draftLike: PrintDraft = {
      orderNumber: selected.orderNumber,
      patientFirstName: selected.patientFirstName,
      patientLastName: selected.patientLastName,
      orderDate: selected.orderDate,
      orderDateTime: selected.orderDateTime,
      labName: selected.labName,
      orderName: selected.orderName,
      testCode: selected.testCode,
      testDisplay: selected.testDisplay,
      status: selected.status,
      priority: selected.priority,
      orderingProvider: selected.orderingProvider,
      physicianName: selected.physicianName,
      specimenId: selected.specimenId,
      notes: selected.notes,
      diagnosisCode: selected.diagnosisCode,
      result: selected.result,
      procedureCode: selected.procedureCode,
    };
    // Derive procedure rows from stored procedureCode / diagnosisCode for richer printout
    const procCodes = (selected.procedureCode || "")
      .split(",")
      .map(c => c.trim())
      .filter(Boolean);
    const diagList = (selected.diagnosisCode || "")
      .split(/[;,]/)
      .map(c => c.trim())
      .filter(Boolean);
    const procRows = procCodes.length > 0 ? procCodes.map((code, idx) => ({
      test: code,
      testCode: code,
      diagnosisCodes: idx === 0 ? diagList : [],
    })) : [];
    handleLabOrderPrint(draftLike, procRows, false);
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => router.push('/labs/orders/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <span className="text-lg leading-none">＋</span> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white"
            placeholder="Order #, test, patient, MRN"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          />
        </div>
        <div className="md:col-span-1">
          <button
            onClick={handleSearch}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            Search
          </button>
        </div>
        <div className="md:col-span-1">
          <FieldRow label="Status">
            <select
              className="border rounded-lg px-3 py-2 text-sm w-full text-gray-800 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="revoked">Revoked</option>
            </select>
          </FieldRow>
        </div>
        <div className="md:col-span-1">
          <FieldRow label="Priority">
            <select
              className="border rounded-lg px-3 py-2 text-sm w-full text-gray-800 bg-white"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
          </FieldRow>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-700">
                <th className="text-left px-4 py-3 font-semibold">Order #</th>
                <th className="text-left px-4 py-3 font-semibold">Patient</th>
                <th className="text-left px-4 py-3 font-semibold">Test</th>
                <th className="text-left px-4 py-3 font-semibold">Priority</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Ordered date</th>
                <th className="text-left px-4 py-3 font-semibold">Provider</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => (
                <tr key={o.id ?? `${o.orderNumber}-${o.patientId}`} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="font-medium">
                      {o.patientFirstName && o.patientLastName 
                        ? `${o.patientFirstName} ${o.patientLastName}`
                        : patientCache.get(o.patientId)
                        ? `${patientCache.get(o.patientId)!.firstName} ${patientCache.get(o.patientId)!.lastName}`
                        : o.patientId || '—'
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="font-medium">{o.orderName}</div>
                    <div className="text-xs text-gray-500">{o.testCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-900">
                      {o.priority?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${statusBadgeClasses(o.status)}`}>
                      {o.status?.toUpperCase()}
                    </span>
                  </td>
                  
                  <td className="px-4 py-3 text-gray-900">
                    <div>{o.orderDate}</div>
                    <div className="text-xs text-gray-500">{o.orderDateTime?.slice(11, 16)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{o.orderingProvider}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openView(o)} title="View" className="p-2 rounded-md hover:bg-blue-50 text-blue-700">👁</button>
                      <button onClick={() => openEditModal(o)} title="Edit" className="p-2 rounded-md hover:bg-blue-50 text-blue-700">✏️</button>
                      <button onClick={() => deleteOrder(o)} title="Delete" className="p-2 rounded-md hover:bg-blue-50 text-blue-700">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    No orders yet. Click <b>New Order</b> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50"
            disabled={page <= 1}
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50"
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">Showing {startIndex + 1}-{endIndex} of {total}</div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

          {/* Create/Edit modal removed in favor of standalone page */}

      {/* Procedure builder modal removed */}

      {/* Code picker removed (handled on standalone form) */}

      {/* VIEW MODAL (read-only) */}
      <Modal
        title={selected ? `Order ${selected.orderNumber}` : "Order"}
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        footer={
          selected && (
            <>
              <button onClick={() => setViewOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
                Close
              </button>
              <button onClick={printSelected} className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700">
                Print
              </button>
              <button onClick={() => openEditModal(selected)} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">
                ✏️ Edit
              </button>
              <button onClick={() => deleteOrder(selected)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
                Delete
              </button>
            </>
          )
        }
        wide
      >
        {selected ? (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Order details */}
              <div className="space-y-3">
                <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span>🧪</span><span>Order details</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <span className="text-gray-500">Order #</span>
                  <span className="font-mono text-gray-900">{selected.orderNumber}</span>
                  <span className="text-gray-500">Order name</span>
                  <span className="text-gray-900">{selected.orderName}</span>
                  <span className="text-gray-500">Test code</span>
                  <span className="text-gray-900">{selected.testCode}{selected.testDisplay ? ` (${selected.testDisplay})` : ""}</span>
                  <span className="text-gray-500">Priority</span>
                  <span><span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-900">{selected.priority?.toUpperCase()}</span></span>
                  <span className="text-gray-500">Status</span>
                  <span>
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${statusBadgeClasses(selected.status)}`}>
                      {selected.status?.toUpperCase()}
                    </span>
                  </span>
                  <span className="text-gray-500">Ordered date</span>
                  <span className="text-gray-900">
                    {selected.orderDate}{selected.orderDateTime ? ` • ${selected.orderDateTime.slice(11,16)}` : ""}
                  </span>
                  <span className="text-gray-500">Lab</span>
                  <span className="text-gray-900">{selected.labName || "—"}</span>
                </div>
              </div>

              {/* Specimen & clinical */}
              <div className="space-y-3">
                <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span>📑</span><span>Specimen &amp; clinical</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <span className="text-gray-500">Specimen ID</span>
                  <span className="text-gray-900">{selected.specimenId || "—"}</span>
                  {(() => {
                    const op = (selected.orderingProvider || "").trim();
                    const pn = (selected.physicianName || "").trim();
                    if (!op && !pn) {
                      return (
                        <>
                          <span className="text-gray-500">Ordering provider</span>
                          <span className="text-gray-900">—</span>
                        </>
                      );
                    }
                    if (op && pn && op === pn) {
                      // collapse into one row when identical
                      return (
                        <>
                          <span className="text-gray-500">Provider</span>
                          <span className="text-gray-900">{op}</span>
                        </>
                      );
                    }
                    return (
                      <>
                        <span className="text-gray-500">Ordering provider</span>
                        <span className="text-gray-900">{op || "—"}</span>
                        <span className="text-gray-500">Physician name</span>
                        <span className="text-gray-900">{pn || "—"}</span>
                      </>
                    );
                  })()}
                  <span className="text-gray-500">Diagnosis code</span>
                  <span className="text-gray-900">{(selected.diagnosisCode || "").toString().split(/[;,]/).map(s => s.trim()).filter(Boolean).join('; ') || "—"}</span>
                  <span className="text-gray-500">Procedure</span>
                  <span className="text-gray-900">{(selected.procedureCode || "").split(',').map(s => s.trim()).filter(Boolean).join(', ') || "—"}</span>
                  <span className="text-gray-500">Notes</span>
                  <span className="text-gray-900">{selected.notes || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No order selected.</div>
        )}
      </Modal>

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
