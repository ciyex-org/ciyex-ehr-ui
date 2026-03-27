"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import DateInput from "@/components/ui/DateInput";

const API = () => getEnv("NEXT_PUBLIC_API_URL");

/* ---------- Types ---------- */
type OrderLine = {
  id?: number; itemId: number; itemName: string;
  quantityOrdered: number; quantityReceived: number;
  unitCost: number; totalCost: number;
  lotNumber: string; expiryDate: string; notes: string;
};
type Order = {
  id: number; poNumber: string; supplierId: number; supplierName: string;
  status: string; orderDate: string; expectedDate: string;
  receivedDate: string | null; notes: string; totalAmount: number;
  createdBy: string; approvedBy: string | null;
  lines: OrderLine[]; createdAt: string; updatedAt: string;
};
type Supplier = { id: number; name: string };
type InvItem = { id: number; name: string; costPerUnit: number };
type AlertData = { variant: "success" | "error" | "warning" | "info"; title: string; message: string };

/* ---------- Helpers ---------- */
const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);

const statusTone: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

const Badge = ({ status }: { status: string }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusTone[status] ?? statusTone.draft}`}>
    {status}
  </span>
);

const dateLabel = (iso?: string | null) => {
  if (!iso) return "--";
  return formatDisplayDate(iso) || "--";
};

const TABS = ["all", "draft", "submitted", "partial", "received", "cancelled"] as const;

const emptyLine = (): OrderLine => ({
  itemId: 0, itemName: "", quantityOrdered: 1, quantityReceived: 0,
  unitCost: 0, totalCost: 0, lotNumber: "", expiryDate: "", notes: "",
});

const inputCls = "h-8 w-full rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const selectCls = inputCls;

/* ========== Main Component ========== */
export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertData | null>(null);

  // Modal states
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit" | "view" | "receive">("closed");
  const [current, setCurrent] = useState<Order | null>(null);

  // Form state
  const [supplierId, setSupplierId] = useState(0);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()]);
  const [formStatus, setFormStatus] = useState("draft");

  // Receive state
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({});

  // Dropdown data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [formError, setFormError] = useState("");
  const [expectedDateError, setExpectedDateError] = useState("");

  useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 4000); return () => clearTimeout(t); } }, [alert]);

  /* ---------- Fetch orders ---------- */
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API()}/api/orders?page=${page}&size=${pageSize}`);
      const json = await res.json();
      if (json.success && json.data) {
        const pg = json.data;
        setOrders(pg.content ?? []);
        setTotalPages(pg.totalPages ?? 1);
        setTotalItems(pg.totalElements ?? 0);
      }
    } catch (e) { console.error("Failed to load orders", e); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  /* ---------- Load dropdowns ---------- */
  const loadDropdowns = useCallback(async () => {
    try {
      const [sRes, iRes] = await Promise.all([
        fetchWithAuth(`${API()}/api/suppliers/list`),
        fetchWithAuth(`${API()}/api/inventory/list`),
      ]);
      const sJson = await sRes.json();
      const iJson = await iRes.json();
      if (sJson.success) setSuppliers(sJson.data ?? []);
      if (iJson.success) setItems((iJson.data ?? []).map((i: any) => ({ id: i.id, name: i.name, costPerUnit: i.costPerUnit ?? 0 })));
    } catch (e) { console.error("Failed to load dropdowns", e); }
  }, []);

  /* ---------- Filter ---------- */
  const filtered = useMemo(() =>
    tab === "all" ? orders : orders.filter(o => o.status === tab),
    [orders, tab]
  );

  /* ---------- Open modals ---------- */
  const openCreate = () => {
    loadDropdowns();
    setSupplierId(0); setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDate(""); setNotes(""); setLines([emptyLine()]);
    setFormStatus("draft"); setFormError(""); setExpectedDateError("");
    setModalMode("create");
  };

  const openEdit = (o: Order) => {
    loadDropdowns();
    setCurrent(o); setSupplierId(o.supplierId); setOrderDate(o.orderDate ?? "");
    setExpectedDate(o.expectedDate ?? ""); setNotes(o.notes ?? "");
    setLines(o.lines?.length ? o.lines.map(l => ({ ...l })) : [emptyLine()]);
    setFormStatus(o.status); setFormError(""); setExpectedDateError("");
    setModalMode("edit");
  };

  const openView = (o: Order) => { setCurrent(o); setModalMode("view"); };

  const openReceive = (o: Order) => {
    setCurrent(o);
    const qty: Record<number, number> = {};
    (o.lines ?? []).forEach(l => { if (l.id) qty[l.id] = l.quantityOrdered - l.quantityReceived; });
    setReceiveQty(qty); setFormError("");
    setModalMode("receive");
  };

  const closeModal = () => { setModalMode("closed"); setCurrent(null); setFormError(""); };

  /* ---------- Line helpers ---------- */
  const updateLine = (idx: number, patch: Partial<OrderLine>) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, ...patch };
      updated.totalCost = updated.quantityOrdered * updated.unitCost;
      return updated;
    }));
  };

  const removeLine = (idx: number) => setLines(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const grandTotal = useMemo(() => lines.reduce((s, l) => s + (l.quantityOrdered * l.unitCost), 0), [lines]);

  /* ---------- Save (create / edit) ---------- */
  const handleSave = async () => {
    setFormError("");
    if (!supplierId) { setFormError("Select a supplier"); return; }
    if (!lines.some(l => l.itemId > 0)) { setFormError("Add at least one line item"); return; }
    if (expectedDate && orderDate && expectedDate < orderDate) { setExpectedDateError("Expected Delivery Date must be on or after the Order Date"); setFormError("Expected Delivery Date must be on or after the Order Date"); return; }

    const body: any = {
      supplierId, status: formStatus, orderDate, expectedDate, notes,
      lines: lines.filter(l => l.itemId > 0).map(l => ({
        ...l, totalCost: l.quantityOrdered * l.unitCost,
        ...(modalMode === "edit" && l.id ? { id: l.id } : {}),
      })),
    };

    try {
      const isEdit = modalMode === "edit" && current;
      const url = isEdit ? `${API()}/api/orders/${current!.id}` : `${API()}/api/orders`;
      const res = await fetchWithAuth(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Save failed");
      setAlert({ variant: "success", title: isEdit ? "Order Updated" : "Order Created", message: `PO ${json.data?.poNumber ?? ""} saved.` });
      closeModal(); loadOrders();
    } catch (e: any) { setFormError(e.message ?? "Save failed"); }
  };

  /* ---------- Receive ---------- */
  const handleReceive = async () => {
    if (!current) return;
    setFormError("");
    const payload: Record<string, number> = {};
    Object.entries(receiveQty).forEach(([k, v]) => { if (v > 0) payload[k] = v; });
    try {
      const res = await fetchWithAuth(`${API()}/api/orders/${current.id}/receive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Receive failed");
      setAlert({ variant: "success", title: "Order Received", message: `PO ${current.poNumber} inventory updated.` });
      closeModal(); loadOrders();
    } catch (e: any) { setFormError(e.message ?? "Receive failed"); }
  };

  /* ---------- Delete ---------- */
  const handleDelete = async (id: number) => {
    try {
      const res = await fetchWithAuth(`${API()}/api/orders/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setAlert({ variant: "success", title: "Deleted", message: "Order deleted." });
      closeModal(); loadOrders();
    } catch (e: any) { setAlert({ variant: "error", title: "Error", message: e.message }); }
  };

  /* ========== RENDER ========== */
  return (
    <>
      {alert && <div className="mb-3"><Alert variant={alert.variant} title={alert.title} message={alert.message} /></div>}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage purchase orders, line items, and receiving.</p>
        <Button size="sm" onClick={openCreate}>+ New Order</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(0); }}
            className={`px-3 py-2 text-sm font-medium capitalize border-b-2 transition ${tab === t ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
              <th className="px-4 py-3">PO #</th><th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>}
            {!loading && filtered.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => openView(o)}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{o.poNumber}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{o.supplierName}</td>
                <td className="px-4 py-3"><Badge status={o.status} /></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{dateLabel(o.orderDate)}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{currency(o.totalAmount)}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{o.lines?.length ?? 0}</td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  {(o.status === "draft") && <button onClick={() => openEdit(o)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>}
                  {(o.status === "submitted" || o.status === "partial") && <button onClick={() => openReceive(o)} className="text-emerald-600 hover:underline text-xs mr-2">Receive</button>}
                  {(o.status === "draft") && <button onClick={() => handleDelete(o.id)} className="text-rose-600 hover:underline text-xs">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600">Prev</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600">Next</button>
        </div>
        <div className="flex items-center gap-3">
          <span>Total: {totalItems}</span>
          <select value={pageSize} onChange={e => { setPageSize(+e.target.value); setPage(0); }} className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600">
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* ===== View Modal ===== */}
      {modalMode === "view" && current && (
        <Overlay onClose={closeModal}>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Order {current.poNumber}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <Info label="Supplier" value={current.supplierName} /><Info label="Status" value={<Badge status={current.status} />} />
            <Info label="Order Date" value={dateLabel(current.orderDate)} /><Info label="Expected" value={dateLabel(current.expectedDate)} />
            <Info label="Received" value={dateLabel(current.receivedDate)} /><Info label="Total" value={currency(current.totalAmount)} />
            {current.notes && <div className="col-span-2"><Info label="Notes" value={current.notes} /></div>}
          </div>
          <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Line Items</h4>
          <div className="overflow-auto max-h-48 border rounded dark:border-gray-700">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0"><tr className="text-left">
                <th className="px-2 py-1">Item</th><th className="px-2 py-1 text-right">Qty</th>
                <th className="px-2 py-1 text-right">Rcvd</th><th className="px-2 py-1 text-right">Unit $</th>
                <th className="px-2 py-1 text-right">Total</th><th className="px-2 py-1">Lot#</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {(current.lines ?? []).map((l, i) => (
                  <tr key={i}><td className="px-2 py-1">{l.itemName}</td>
                    <td className="px-2 py-1 text-right">{l.quantityOrdered}</td>
                    <td className="px-2 py-1 text-right">{l.quantityReceived}</td>
                    <td className="px-2 py-1 text-right">{currency(l.unitCost)}</td>
                    <td className="px-2 py-1 text-right">{currency(l.totalCost)}</td>
                    <td className="px-2 py-1">{l.lotNumber || "--"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {current.status === "draft" && <Button size="sm" onClick={() => { closeModal(); openEdit(current); }}>Edit</Button>}
            {(current.status === "submitted" || current.status === "partial") && <Button size="sm" onClick={() => { closeModal(); openReceive(current); }}>Receive</Button>}
            <Button size="sm" variant="outline" onClick={closeModal}>Close</Button>
          </div>
        </Overlay>
      )}

      {/* ===== Create / Edit Modal ===== */}
      {(modalMode === "create" || modalMode === "edit") && (
        <Overlay onClose={closeModal} wide>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {modalMode === "create" ? "New Purchase Order" : `Edit ${current?.poNumber}`}
          </h3>
          {formError && <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400">{formError}</div>}

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier *</label>
              <select value={supplierId} onChange={e => setSupplierId(+e.target.value)} className={selectCls}>
                <option value={0}>-- Select --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className={selectCls}>
                <option value="draft">Draft</option><option value="submitted">Submitted</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Order Date</label>
              <DateInput value={orderDate} onChange={e => {
                const val = e.target.value;
                setOrderDate(val);
                if (expectedDate && val && expectedDate < val) {
                  setExpectedDateError("Expected Delivery Date must be on or after the Order Date");
                } else {
                  setExpectedDateError("");
                }
              }} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Date</label>
              <DateInput value={expectedDate} onChange={e => {
                const val = e.target.value;
                setExpectedDate(val);
                if (val && orderDate && val < orderDate) {
                  setExpectedDateError("Expected Delivery Date must be on or after the Order Date");
                } else {
                  setExpectedDateError("");
                }
              }} min={orderDate} className={`${inputCls}${expectedDateError ? " border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`} />
              {expectedDateError && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{expectedDateError}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Lines */}
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Line Items</h4>
            <button onClick={() => setLines(p => [...p, emptyLine()])} className="text-xs text-blue-600 hover:underline">+ Add Line</button>
          </div>
          <div className="overflow-auto max-h-52 border rounded dark:border-gray-700 mb-2">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0"><tr>
                <th className="px-2 py-1.5 text-left">Item *</th><th className="px-2 py-1.5 w-16 text-right">Qty</th>
                <th className="px-2 py-1.5 w-20 text-right">Unit $</th><th className="px-2 py-1.5 w-20 text-right">Total</th>
                <th className="px-2 py-1.5 w-24">Lot #</th><th className="px-2 py-1.5 w-28">Expiry</th>
                <th className="px-2 py-1.5 w-8"></th>
              </tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {lines.map((l, idx) => (
                  <tr key={idx}>
                    <td className="px-1 py-1">
                      <select value={l.itemId} onChange={e => {
                        const item = items.find(it => it.id === +e.target.value);
                        updateLine(idx, { itemId: +e.target.value, itemName: item?.name ?? "", unitCost: item?.costPerUnit ?? l.unitCost });
                      }} className={`${selectCls} text-xs`}>
                        <option value={0}>-- Select --</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1"><input type="number" min={1} value={l.quantityOrdered} onChange={e => updateLine(idx, { quantityOrdered: +e.target.value })} className={`${inputCls} text-right text-xs`} /></td>
                    <td className="px-1 py-1"><input type="number" min={0} step={0.01} value={l.unitCost} onChange={e => updateLine(idx, { unitCost: +e.target.value })} className={`${inputCls} text-right text-xs`} /></td>
                    <td className="px-1 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{currency(l.quantityOrdered * l.unitCost)}</td>
                    <td className="px-1 py-1"><input value={l.lotNumber} onChange={e => updateLine(idx, { lotNumber: e.target.value })} className={`${inputCls} text-xs`} /></td>
                    <td className="px-1 py-1"><DateInput value={l.expiryDate} onChange={e => updateLine(idx, { expiryDate: e.target.value })} className={`${inputCls} text-xs`} /></td>
                    <td className="px-1 py-1 text-center">
                      {lines.length > 1 && <button onClick={() => removeLine(idx)} className="text-rose-500 hover:text-rose-700 text-sm leading-none">&times;</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Grand Total: {currency(grandTotal)}</div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{modalMode === "create" ? "Create Order" : "Save Changes"}</Button>
          </div>
        </Overlay>
      )}

      {/* ===== Receive Modal ===== */}
      {modalMode === "receive" && current && (
        <Overlay onClose={closeModal}>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Receive {current.poNumber}</h3>
          {formError && <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400">{formError}</div>}
          <div className="overflow-auto max-h-64 border rounded dark:border-gray-700 mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0"><tr>
                <th className="px-2 py-1.5 text-left">Item</th><th className="px-2 py-1.5 text-right">Ordered</th>
                <th className="px-2 py-1.5 text-right">Received</th><th className="px-2 py-1.5 text-right">Remaining</th>
                <th className="px-2 py-1.5 w-24 text-right">Receive Qty</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {(current.lines ?? []).map(l => {
                  const remaining = l.quantityOrdered - l.quantityReceived;
                  return (
                    <tr key={l.id}>
                      <td className="px-2 py-1.5">{l.itemName}</td>
                      <td className="px-2 py-1.5 text-right">{l.quantityOrdered}</td>
                      <td className="px-2 py-1.5 text-right">{l.quantityReceived}</td>
                      <td className="px-2 py-1.5 text-right">{remaining}</td>
                      <td className="px-1 py-1">
                        <input type="number" min={0} max={remaining}
                          value={receiveQty[l.id!] ?? 0}
                          onChange={e => setReceiveQty(prev => ({ ...prev, [l.id!]: Math.min(+e.target.value, remaining) }))}
                          className={`${inputCls} text-right text-xs`}
                          disabled={remaining <= 0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button size="sm" onClick={handleReceive}>Confirm Receive</Button>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ---------- Sub-components ---------- */
function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className={`${wide ? "max-w-3xl" : "max-w-lg"} w-full mx-4 max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-medium text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
