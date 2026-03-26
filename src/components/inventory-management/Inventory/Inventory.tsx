"use client";

import { getEnv } from "@/utils/env";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";

const API_URL = getEnv("NEXT_PUBLIC_API_URL")!;

type InvItem = {
  id: number;
  name: string;
  sku: string;
  description: string;
  unit: string;
  costPerUnit: number | null;
  stockOnHand: number;
  minStock: number;
  maxStock: number | null;
  reorderPoint: number | null;
  reorderQty: number | null;
  status: string;
  itemType: string;
  barcode: string;
  manufacturer: string;
  costMethod: string;
  categoryId: number | null;
  categoryName: string;
  locationId: number | null;
  locationName: string;
  supplierId: number | null;
  supplierName: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

type Category = { id: number; name: string; parentId: number | null; parentName: string | null };
type Location = { id: number; name: string; type: string };
type Supplier = { id: number; name: string };
type SortKey = "name" | "sku" | "stockOnHand" | "minStock" | "unit" | "categoryName" | "locationName" | "status";
type SortDir = "asc" | "desc";
type AlertData = { variant: "success" | "error" | "warning" | "info"; title: string; message: string };

function stockTone(item: InvItem): "ok" | "warn" | "danger" {
  if (item.stockOnHand === 0) return "danger";
  if (item.stockOnHand <= item.minStock) return "warn";
  return "ok";
}

const TONE_CLASSES: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone] || TONE_CLASSES.neutral}`}>{children}</span>;
}

function stockLabel(item: InvItem) {
  if (item.stockOnHand === 0) return "Out of Stock";
  if (item.stockOnHand <= item.minStock) return "Low Stock";
  return "In Stock";
}

const selectCls = "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
const inputCls = "h-9";

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b px-6 py-4 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  );
}

export default function Inventory() {
  // Data
  const [items, setItems] = useState<InvItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  // Search & filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Modals
  const [modalMode, setModalMode] = useState<"closed" | "add" | "edit">("closed");
  const [editItem, setEditItem] = useState<InvItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvItem | null>(null);

  // Alert
  const [alertData, setAlertData] = useState<AlertData | null>(null);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Alert auto-dismiss ──
  useEffect(() => {
    if (alertData) {
      const t = setTimeout(() => setAlertData(null), 4000);
      return () => clearTimeout(t);
    }
  }, [alertData]);

  // ── Debounce search ──
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // ── Load dropdowns on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, locRes, supRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/api/inventory/categories`),
          fetchWithAuth(`${API_URL}/api/inventory/locations`),
          fetchWithAuth(`${API_URL}/api/suppliers/list`),
        ]);
        const catJson = await catRes.json();
        const locJson = await locRes.json();
        const supJson = await supRes.json();
        if (catRes.ok && catJson.success) setCategories(catJson.data ?? []);
        if (locRes.ok && locJson.success) setLocations(locJson.data ?? []);
        if (supRes.ok && supJson.success) setSuppliers((supJson.data ?? []).map((s: any) => ({ id: s.id, name: s.name })));
      } catch (err) {
        console.error("Failed to load dropdown options:", err);
      }
    };
    load();
  }, []);

  // ── Fetch items ──
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetchWithAuth(`${API_URL}/api/inventory?${params}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setItems(json.data.content ?? []);
        setTotalPages(json.data.totalPages ?? 1);
        setTotalElements(json.data.totalElements ?? 0);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Client-side filter + sort ──
  const displayed = useMemo(() => {
    let list = [...items];
    if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
    if (filterCategory !== "all") list = list.filter((i) => String(i.categoryId) === filterCategory);
    if (filterLocation !== "all") list = list.filter((i) => String(i.locationId) === filterLocation);
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [items, filterStatus, filterCategory, filterLocation, sortKey, sortDir]);

  // ── Sort toggle ──
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return "\u2195";
    return sortDir === "asc" ? "\u2191" : "\u2193";
  }

  // ── CRUD ──
  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nameVal = String(fd.get("name") || "").trim();
    if (!nameVal) { setAlertData({ variant: "error", title: "Validation Error", message: "Name is required." }); return; }
    if (!/[A-Za-z]/.test(nameVal)) { setAlertData({ variant: "error", title: "Validation Error", message: "Name must contain at least one letter." }); return; }
    if (!/^[A-Za-z0-9\s\-_().]+$/.test(nameVal)) { setAlertData({ variant: "error", title: "Validation Error", message: "Name may only contain letters, numbers, spaces, and - _ ( ) ." }); return; }
    const dto: Record<string, unknown> = {
      name: fd.get("name"),
      sku: fd.get("sku"),
      description: fd.get("description") || "",
      unit: fd.get("unit"),
      costPerUnit: fd.get("costPerUnit") ? Number(fd.get("costPerUnit")) : null,
      stockOnHand: Number(fd.get("stockOnHand") || 0),
      minStock: Number(fd.get("minStock") || 0),
      maxStock: fd.get("maxStock") ? Number(fd.get("maxStock")) : null,
      reorderPoint: fd.get("reorderPoint") ? Number(fd.get("reorderPoint")) : null,
      reorderQty: fd.get("reorderQty") ? Number(fd.get("reorderQty")) : null,
      status: fd.get("status") || "active",
      itemType: fd.get("itemType") || "consumable",
      barcode: fd.get("barcode") || "",
      manufacturer: fd.get("manufacturer") || "",
      costMethod: fd.get("costMethod") || "fifo",
      categoryId: fd.get("categoryId") ? Number(fd.get("categoryId")) : null,
      locationId: fd.get("locationId") ? Number(fd.get("locationId")) : null,
      supplierId: fd.get("supplierId") ? Number(fd.get("supplierId")) : null,
    };

    const isEdit = modalMode === "edit" && editItem;
    const url = isEdit ? `${API_URL}/api/inventory/${editItem.id}` : `${API_URL}/api/inventory`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetchWithAuth(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(dto) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      setModalMode("closed");
      setEditItem(null);
      setAlertData({ variant: "success", title: isEdit ? "Item Updated" : "Item Added", message: `${json.data.name} was ${isEdit ? "updated" : "added"} successfully.` });
      fetchItems();
    } catch (err: any) {
      setAlertData({ variant: "error", title: "Error", message: err.message || "Operation failed." });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/api/inventory/${deleteTarget.id}`, { method: "DELETE" });
      // Handle empty response body (204 No Content) and JSON responses
      let json: { success?: boolean; message?: string } | null = null;
      const text = await res.text();
      if (text) {
        try { json = JSON.parse(text); } catch { /* non-JSON response */ }
      }
      if (!res.ok && json && !json.success) throw new Error(json.message || "Failed");
      if (!res.ok && !json) throw new Error(`Delete failed (HTTP ${res.status})`);
      setDeleteTarget(null);
      setAlertData({ variant: "success", title: "Item Deleted", message: `${deleteTarget.name} was deleted.` });
      fetchItems();
    } catch (err: any) {
      setAlertData({ variant: "error", title: "Error", message: err.message || "Delete failed." });
    }
  }

  // ── Table header cell ──
  function Th({ label, sortField, align }: { label: string; sortField: SortKey; align?: string }) {
    return (
      <th className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`} onClick={() => toggleSort(sortField)}>
        {label} <span className="text-xs opacity-60">{sortIcon(sortField)}</span>
      </th>
    );
  }

  // ── Item form (shared between add and edit) ──
  function ItemForm({ item }: { item?: InvItem | null }) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
        <Field label="Name" required><Input name="name" defaultValue={item?.name || ""} className={inputCls} required /></Field>
        <Field label="SKU" required><Input name="sku" defaultValue={item?.sku || ""} className={inputCls} required /></Field>
        <div className="sm:col-span-2"><Field label="Description"><Input name="description" defaultValue={item?.description || ""} className={inputCls} /></Field></div>
        <Field label="Unit" required><Input name="unit" defaultValue={item?.unit || ""} className={inputCls} placeholder="pcs / box / vial" required /></Field>
        <Field label="Cost Per Unit"><Input name="costPerUnit" type="number" step="0.01" min="0" defaultValue={item?.costPerUnit ?? ""} className={inputCls} /></Field>
        <Field label="Stock On Hand" required><Input name="stockOnHand" type="number" min="0" defaultValue={item?.stockOnHand ?? 0} className={inputCls} required /></Field>
        <Field label="Min Stock" required><Input name="minStock" type="number" min="0" defaultValue={item?.minStock ?? 0} className={inputCls} required /></Field>
        <Field label="Max Stock"><Input name="maxStock" type="number" min="0" defaultValue={item?.maxStock ?? ""} className={inputCls} /></Field>
        <Field label="Reorder Point"><Input name="reorderPoint" type="number" min="0" defaultValue={item?.reorderPoint ?? ""} className={inputCls} /></Field>
        <Field label="Reorder Qty"><Input name="reorderQty" type="number" min="0" defaultValue={item?.reorderQty ?? ""} className={inputCls} /></Field>
        <Field label="Status">
          <select name="status" defaultValue={item?.status || "active"} className={selectCls}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Item Type">
          <select name="itemType" defaultValue={item?.itemType || "consumable"} className={selectCls}>
            <option value="consumable">Consumable</option>
            <option value="device">Device</option>
            <option value="medication">Medication</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Barcode"><Input name="barcode" defaultValue={item?.barcode || ""} className={inputCls} /></Field>
        <Field label="Manufacturer"><Input name="manufacturer" defaultValue={item?.manufacturer || ""} className={inputCls} /></Field>
        <Field label="Cost Method">
          <select name="costMethod" defaultValue={item?.costMethod || "fifo"} className={selectCls}>
            <option value="fifo">FIFO</option>
            <option value="lifo">LIFO</option>
            <option value="average">Average</option>
          </select>
        </Field>
        <Field label="Category">
          <select name="categoryId" defaultValue={item?.categoryId ?? ""} className={selectCls}>
            <option value="">-- None --</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <select name="locationId" defaultValue={item?.locationId ?? ""} className={selectCls}>
            <option value="">-- None --</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Supplier">
          <select name="supplierId" defaultValue={item?.supplierId ?? ""} className={selectCls}>
            <option value="">-- None --</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
    );
  }

  // ── Render ──
  return (
    <>
      <div className="container mx-auto overflow-x-hidden p-6 text-gray-800 dark:text-gray-200">
        {/* Alert */}
        {alertData && (
          <div className="mb-4">
            <Alert variant={alertData.variant} title={alertData.title} message={alertData.message} />
          </div>
        )}

        <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">Manage stock items, categories, and stock levels.</p>

        {/* Toolbar: Filters + Search + Add */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-36">
            <Label className="text-xs">Status</Label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="w-44">
            <Label className="text-xs">Category</Label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectCls}>
              <option value="all">All</option>
              {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-44">
            <Label className="text-xs">Location</Label>
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={selectCls}>
              <option value="all">All</option>
              {locations.map((l) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
            </select>
          </div>
          <div className="ml-auto w-72">
            <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          </div>
          <Button onClick={() => { setEditItem(null); setModalMode("add"); }} className="h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700">+ Add Item</Button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead className="bg-gray-100 text-left text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <Th label="Name" sortField="name" />
                  <Th label="SKU" sortField="sku" />
                  <Th label="Stock" sortField="stockOnHand" align="right" />
                  <Th label="Min" sortField="minStock" align="right" />
                  <Th label="Unit" sortField="unit" />
                  <Th label="Category" sortField="categoryName" />
                  <Th label="Location" sortField="locationName" />
                  <Th label="Status" sortField="status" />
                  <th className="px-4 py-3 text-left">By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No items found.</td></tr>
                ) : displayed.map((item) => {
                  const tone = item.status === "inactive" ? "neutral" : stockTone(item);
                  const label = item.status === "inactive" ? "Inactive" : stockLabel(item);
                  return (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.sku}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{item.stockOnHand}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{item.minStock}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.unit}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.categoryName || "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.locationName || "\u2014"}</td>
                      <td className="px-4 py-3"><Pill tone={tone}>{label}</Pill></td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.createdBy || "\u2014"}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => { setEditItem(item); setModalMode("edit"); }} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteTarget(item)} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 transition" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-between rounded-b-lg border border-t-0 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded border px-3 py-1.5 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">Prev</button>
            <span>Page {page + 1} of {totalPages || 1}</span>
            <button disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1.5 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">Next</button>
          </div>
          <div className="flex items-center gap-4">
            <span>Showing {loading ? "..." : displayed.length} of {totalElements}</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="rounded border bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Add / Edit Modal */}
        {modalMode !== "closed" && (
          <Modal onClose={() => { setModalMode("closed"); setEditItem(null); }}>
            <ModalHeader title={modalMode === "edit" ? `Edit Item \u2014 ${editItem?.name}` : "Add Inventory Item"} onClose={() => { setModalMode("closed"); setEditItem(null); }} />
            <form onSubmit={handleSave} className="flex max-h-[70vh] flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                <ItemForm item={editItem} />
              </div>
              <div className="flex justify-end gap-3 border-t px-6 py-4 dark:border-gray-700">
                <Button type="button" onClick={() => { setModalMode("closed"); setEditItem(null); }}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">{modalMode === "edit" ? "Save Changes" : "Save Item"}</Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Item</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <span className="font-medium">{deleteTarget.name}</span>? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={handleDelete}>Yes, Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
