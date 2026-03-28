"use client";

import { getEnv } from "@/utils/env";
import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";
import { Pencil, Trash2 } from "lucide-react";

type Supplier = {
  id: number; name: string; contactName: string; phone: string;
  email: string; address: string; notes: string; active: boolean;
  createdAt?: string; updatedAt?: string;
};
type AlertData = { variant: "success" | "error"; title: string; message: string };
const API = () => `${getEnv("NEXT_PUBLIC_API_URL")}/api/suppliers`;
const emptyForm = { name: "", contactName: "", phone: "", email: "", address: "", notes: "", active: true };

function Badge({ active }: { active: boolean }) {
  return active
    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Inactive</span>;
}

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 4000); return () => clearTimeout(t); } }, [alert]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API()}?page=${page}&size=${pageSize}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.content || []);
        setTotalPages(json.data.totalPages || 1);
        setTotalItems(json.data.totalElements || 0);
      }
    } catch { console.error("Failed to load suppliers"); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal("add"); };
  const openEdit = (s: Supplier) => {
    setForm({ name: s.name, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "", active: s.active });
    setEditId(s.id); setModal("edit");
  };
  const openDelete = (s: Supplier) => { setDeleteTarget(s); setModal("delete"); };
  const close = () => { setModal(null); setEditId(null); setDeleteTarget(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Supplier name is required";
    else if (form.name.trim().length < 2) errs.name = "Name must be at least 2 characters";
    else if (!/[A-Za-z]/.test(form.name.trim())) errs.name = "Name must contain at least one letter";
    else if (!/^[A-Za-z0-9\s\-_().&,']+$/.test(form.name.trim())) errs.name = "Name contains invalid characters";
    if (form.contactName && form.contactName.trim().length > 0) {
      if (form.contactName.trim().length < 2) errs.contactName = "Contact name must be at least 2 characters";
      else if (!/^[A-Za-z\s\-'.]+$/.test(form.contactName.trim())) errs.contactName = "Contact name must contain only letters, spaces, hyphens, or apostrophes";
    }
    if (form.phone) {
      const digits = form.phone.replace(/\D/g, "");
      if (digits.length !== 10) errs.phone = "Phone number must be exactly 10 digits";
      else if (/[^0-9()\s]/.test(form.phone.trim())) errs.phone = "Phone number can only contain digits, spaces, and parentheses";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(form.email)) errs.email = "Please enter a valid email address (e.g. user@example.com)";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const isEdit = modal === "edit" && editId;
      const res = await fetchWithAuth(isEdit ? `${API()}/${editId}` : API(), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setAlert({ variant: "success", title: isEdit ? "Updated" : "Created", message: `${json.data.name} saved successfully.` });
        close(); load();
      } else { setAlert({ variant: "error", title: "Error", message: json.message || "Save failed." }); }
    } catch { setAlert({ variant: "error", title: "Error", message: "Failed to save supplier." }); }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetchWithAuth(`${API()}/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        // Handle empty response body (204 No Content) and JSON responses
        let json: any = null;
        const text = await res.text();
        if (text) { try { json = JSON.parse(text); } catch { /* non-JSON response */ } }
        if (!json || json.success !== false) {
          setAlert({ variant: "success", title: "Deleted", message: `${deleteTarget.name} deleted.` }); close(); load();
        } else {
          setAlert({ variant: "error", title: "Error", message: json.message || "Delete failed." });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAlert({ variant: "error", title: "Error", message: (errJson as any).message || `Delete failed (HTTP ${res.status})` });
      }
    } catch { setAlert({ variant: "error", title: "Error", message: "Delete failed." }); }
  };

  const filtered = items.filter(s =>
    [s.name, s.contactName, s.email, s.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const F = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));
  const dateInput = "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <>
      <div className="space-y-4">
        {alert && <Alert variant={alert.variant} title={alert.title} message={alert.message} />}
        <div className="flex items-center justify-between">
          <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 max-w-xs" />
          <Button onClick={openAdd} className="h-8 px-3 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ Add Supplier</Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{loading ? "Loading..." : "No suppliers found."}</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.contactName}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.phone}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.email}</td>
                  <td className="px-4 py-3"><Badge active={s.active} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(s)} title="Edit" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openDelete(s)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600">Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600">Next</button>
          </div>
          <div className="flex items-center gap-3">
            <span>Showing {filtered.length} of {totalItems}</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }} className="border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600">
              {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{modal === "edit" ? "Edit Supplier" : "Add Supplier"}</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">X</button>
            </div>
            <form onSubmit={save} className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2"><Label>Name <span className="text-red-500">*</span></Label><Input value={form.name} onChange={e => { F("name", e.target.value); if (formErrors.name) setFormErrors(p => { const n = {...p}; delete n.name; return n; }); }} className={formErrors.name ? "border-red-400" : ""} placeholder="e.g. Medline Industries" />{formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}</div>
              <div><Label>Contact Name</Label><Input value={form.contactName} onChange={e => { F("contactName", e.target.value); if (formErrors.contactName) setFormErrors(p => { const n = {...p}; delete n.contactName; return n; }); }} className={formErrors.contactName ? "border-red-400" : ""} placeholder="e.g. John Smith" />{formErrors.contactName && <p className="text-xs text-red-500 mt-1">{formErrors.contactName}</p>}</div>
              <div><Label>Phone</Label><Input type="tel" value={form.phone} onChange={e => { const v = e.target.value.replace(/[^0-9()\s]/g, ""); F("phone", v); if (formErrors.phone) setFormErrors(p => { const n = {...p}; delete n.phone; return n; }); }} maxLength={14} className={formErrors.phone ? "border-red-400" : ""} placeholder="e.g. (555) 1234567" />{formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}</div>
              <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => { F("email", e.target.value); if (formErrors.email) setFormErrors(p => { const n = {...p}; delete n.email; return n; }); }} className={formErrors.email ? "border-red-400" : ""} placeholder="e.g. contact@supplier.com" />{formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}</div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => F("address", e.target.value)} placeholder="e.g. 123 Main St, City, State" /></div>
              <div className="col-span-2"><Label>Notes</Label><textarea value={form.notes} onChange={e => F("notes", e.target.value)} rows={2} className={`${dateInput} py-2`} /></div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={e => F("active", e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                <Label>Active</Label>
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t dark:border-gray-700">
                <Button type="button" onClick={close}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {modal === "delete" && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Supplier</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget.name}</strong>?</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={close}>Cancel</Button>
              <Button onClick={remove} className="bg-rose-600 text-white hover:bg-rose-700">Yes, Delete</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
