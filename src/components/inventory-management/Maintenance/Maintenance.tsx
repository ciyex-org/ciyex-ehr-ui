"use client";

import { getEnv } from "@/utils/env";
import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import Alert from "@/components/ui/alert/Alert";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import DateInput from "@/components/ui/DateInput";
import { formatDisplayDate } from "@/utils/dateUtils";
import { Play, CheckCircle2, RotateCcw, Pencil, Trash2 } from "lucide-react";

type Maint = {
  id: number; equipmentName: string; equipmentId: string; category: string;
  location: string; dueDate: string; lastServiceDate: string; nextServiceDate: string;
  assignee: string; vendor: string; priority: string; status: string;
  notes: string; cost: number; createdAt?: string; updatedAt?: string;
};
type AlertData = { variant: "success" | "error"; title: string; message: string };
const API = () => `${getEnv("NEXT_PUBLIC_API_URL")}/api/maintenances`;

const emptyForm = {
  equipmentName: "", equipmentId: "", category: "preventive", location: "",
  dueDate: "", lastServiceDate: "", nextServiceDate: "", assignee: "",
  vendor: "", priority: "medium", status: "scheduled", notes: "", cost: 0,
};

const priorityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};
const statusBadge: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};
const statusLabel: Record<string, string> = {
  scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed", overdue: "Overdue", cancelled: "Cancelled",
};

function Pill({ text, colors }: { text: string; colors: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors}`}>{text}</span>;
}

export default function Maintenance() {
  const [items, setItems] = useState<Maint[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Maint | null>(null);
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
    } catch { console.error("Failed to load maintenances"); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal("add"); };
  const openEdit = (m: Maint) => {
    setForm({
      equipmentName: m.equipmentName || "", equipmentId: m.equipmentId || "",
      category: m.category || "preventive", location: m.location || "",
      dueDate: m.dueDate || "", lastServiceDate: m.lastServiceDate || "",
      nextServiceDate: m.nextServiceDate || "", assignee: m.assignee || "",
      vendor: m.vendor || "", priority: m.priority || "medium",
      status: m.status || "scheduled", notes: m.notes || "", cost: m.cost || 0,
    });
    setEditId(m.id); setModal("edit");
  };
  const openDelete = (m: Maint) => { setDeleteTarget(m); setModal("delete"); };
  const close = () => { setModal(null); setEditId(null); setDeleteTarget(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.equipmentName.trim()) errs.equipmentName = "Equipment name is required";
    else if (!/[A-Za-z]/.test(form.equipmentName.trim())) errs.equipmentName = "Equipment name must contain at least one letter";
    else if (!/^[A-Za-z0-9\s\-_().&,]+$/.test(form.equipmentName.trim())) errs.equipmentName = "Equipment name contains invalid characters";
    if (form.equipmentId.trim() && !/^[A-Za-z0-9\-_./]+$/.test(form.equipmentId.trim())) errs.equipmentId = "Only letters, numbers, hyphens, underscores, dots, and slashes allowed";
    if (form.equipmentId.length > 50) errs.equipmentId = "Equipment ID must be 50 characters or less";
    if (form.location.trim() && !/[A-Za-z]/.test(form.location.trim())) errs.location = "Location must contain at least one letter";
    if (form.location.trim() && !/^[A-Za-z0-9\s\-_().#,/]+$/.test(form.location.trim())) errs.location = "Location contains invalid characters";
    if (form.assignee.trim() && !/[A-Za-z]/.test(form.assignee.trim())) errs.assignee = "Assignee must contain at least one letter";
    if (form.assignee.trim() && !/^[A-Za-z\s\-'.]+$/.test(form.assignee.trim())) errs.assignee = "Assignee must contain only letters, spaces, hyphens, or apostrophes";
    if (form.vendor.trim() && !/[A-Za-z]/.test(form.vendor.trim())) errs.vendor = "Vendor must contain at least one letter";
    if (form.vendor.trim() && !/^[A-Za-z0-9\s\-_().&,']+$/.test(form.vendor.trim())) errs.vendor = "Vendor contains invalid characters";
    // Block past dates for due date and next service date
    const today = new Date().toISOString().split("T")[0];
    if (form.dueDate && form.dueDate < today) errs.dueDate = "Due date cannot be in the past";
    if (form.nextServiceDate && form.nextServiceDate < today) errs.nextServiceDate = "Next service date cannot be in the past";
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
        setAlert({ variant: "success", title: isEdit ? "Updated" : "Created", message: `${json.data.equipmentName} saved.` });
        close(); load();
      } else { setAlert({ variant: "error", title: "Error", message: json.message || "Save failed." }); }
    } catch { setAlert({ variant: "error", title: "Error", message: "Failed to save." }); }
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
          setAlert({ variant: "success", title: "Deleted", message: `${deleteTarget.equipmentName} deleted.` }); close(); load();
        } else {
          setAlert({ variant: "error", title: "Error", message: json.message || "Delete failed." });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAlert({ variant: "error", title: "Error", message: (errJson as any).message || `Delete failed (HTTP ${res.status})` });
      }
    } catch { setAlert({ variant: "error", title: "Error", message: "Delete failed." }); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetchWithAuth(`${API()}/${id}/status?status=${status}`, { method: "PUT" });
      const json = await res.json();
      if (json.success) { setAlert({ variant: "success", title: "Updated", message: `Status changed to ${statusLabel[status] || status}.` }); load(); }
    } catch { setAlert({ variant: "error", title: "Error", message: "Status update failed." }); }
  };

  const filtered = items.filter(m =>
    [m.equipmentName, m.equipmentId, m.assignee, m.location].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const F = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const dateClass = "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  const selClass = "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <>
      <div className="space-y-4">
        {alert && <Alert variant={alert.variant} title={alert.title} message={alert.message} />}
        <div className="flex items-center justify-between">
          <Input placeholder="Search equipment..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 max-w-xs" />
          <Button onClick={openAdd} className="h-8 px-3 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ New Task</Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                <th className="px-4 py-3">Equipment</th><th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th><th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{loading ? "Loading..." : "No tasks found."}</td></tr>
              )}
              {filtered.map(m => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{m.equipmentName}</div>
                    <div className="text-xs text-gray-500">{m.equipmentId}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{m.category}</td>
                  <td className="px-4 py-3"><Pill text={m.priority} colors={priorityBadge[m.priority] || priorityBadge.medium} /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDisplayDate(m.dueDate) || "-"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.assignee}</td>
                  <td className="px-4 py-3"><Pill text={statusLabel[m.status] || m.status} colors={statusBadge[m.status] || statusBadge.scheduled} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {m.status === "scheduled" && <button onClick={() => updateStatus(m.id, "in_progress")} title="Start" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition"><Play className="w-4 h-4" /></button>}
                      {m.status === "in_progress" && <button onClick={() => updateStatus(m.id, "completed")} title="Complete" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition"><CheckCircle2 className="w-4 h-4" /></button>}
                      {(m.status === "completed" || m.status === "cancelled") && <button onClick={() => updateStatus(m.id, "scheduled")} title="Reopen" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"><RotateCcw className="w-4 h-4" /></button>}
                      <button onClick={() => openEdit(m)} title="Edit" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openDelete(m)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
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
          <div className="w-full max-w-2xl rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{modal === "edit" ? "Edit Task" : "New Maintenance Task"}</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">X</button>
            </div>
            <form onSubmit={save} className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><Label>Equipment Name <span className="text-red-500">*</span></Label><Input value={form.equipmentName} onChange={e => { F("equipmentName", e.target.value); if (formErrors.equipmentName) setFormErrors(p => { const n = {...p}; delete n.equipmentName; return n; }); }} className={formErrors.equipmentName ? "border-red-400" : ""} placeholder="e.g. X-Ray Machine" />{formErrors.equipmentName && <p className="text-xs text-red-500 mt-1">{formErrors.equipmentName}</p>}</div>
              <div><Label>Equipment ID</Label><Input value={form.equipmentId} onChange={e => { const v = e.target.value; F("equipmentId", v); if (v.trim() && !/^[A-Za-z0-9\-_./]+$/.test(v.trim())) { setFormErrors(p => ({ ...p, equipmentId: "Only letters, numbers, hyphens, underscores, dots, and slashes allowed" })); } else { setFormErrors(p => { const n = {...p}; delete n.equipmentId; return n; }); } }} maxLength={50} className={formErrors.equipmentId ? "border-red-400" : ""} placeholder="e.g. EQ-001 or XR2024" />{formErrors.equipmentId && <p className="text-xs text-red-500 mt-1">{formErrors.equipmentId}</p>}</div>
              <div><Label>Category</Label>
                <select value={form.category} onChange={e => F("category", e.target.value)} className={selClass}>
                  <option value="preventive">Preventive</option><option value="corrective">Corrective</option>
                  <option value="calibration">Calibration</option><option value="cleaning">Cleaning</option>
                </select>
              </div>
              <div><Label>Priority</Label>
                <select value={form.priority} onChange={e => F("priority", e.target.value)} className={selClass}>
                  <option value="critical">Critical</option><option value="high">High</option>
                  <option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => { F("location", e.target.value); if (formErrors.location) setFormErrors(p => { const n = {...p}; delete n.location; return n; }); }} className={formErrors.location ? "border-red-400" : ""} placeholder="e.g. Room 101, Building A" />{formErrors.location && <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>}</div>
              <div><Label>Assignee</Label><Input value={form.assignee} onChange={e => { F("assignee", e.target.value); if (formErrors.assignee) setFormErrors(p => { const n = {...p}; delete n.assignee; return n; }); }} className={formErrors.assignee ? "border-red-400" : ""} placeholder="e.g. John Smith" />{formErrors.assignee && <p className="text-xs text-red-500 mt-1">{formErrors.assignee}</p>}</div>
              <div><Label>Due Date</Label><DateInput value={form.dueDate} min={new Date().toISOString().split("T")[0]} onChange={e => { F("dueDate", e.target.value); if (formErrors.dueDate) setFormErrors(p => { const n = {...p}; delete n.dueDate; return n; }); }} className={`${dateClass} ${formErrors.dueDate ? "border-red-400" : ""}`} />{formErrors.dueDate && <p className="text-xs text-red-500 mt-1">{formErrors.dueDate}</p>}</div>
              <div><Label>Last Service Date</Label><DateInput value={form.lastServiceDate} onChange={e => F("lastServiceDate", e.target.value)} className={dateClass} /></div>
              <div><Label>Next Service Date</Label><DateInput value={form.nextServiceDate} min={new Date().toISOString().split("T")[0]} onChange={e => { F("nextServiceDate", e.target.value); if (formErrors.nextServiceDate) setFormErrors(p => { const n = {...p}; delete n.nextServiceDate; return n; }); }} className={`${dateClass} ${formErrors.nextServiceDate ? "border-red-400" : ""}`} />{formErrors.nextServiceDate && <p className="text-xs text-red-500 mt-1">{formErrors.nextServiceDate}</p>}</div>
              <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => { F("vendor", e.target.value); if (formErrors.vendor) setFormErrors(p => { const n = {...p}; delete n.vendor; return n; }); }} className={formErrors.vendor ? "border-red-400" : ""} placeholder="e.g. GE Healthcare" />{formErrors.vendor && <p className="text-xs text-red-500 mt-1">{formErrors.vendor}</p>}</div>
              <div><Label>Cost ($)</Label><Input type="number" value={String(form.cost)} onChange={e => F("cost", parseFloat(e.target.value) || 0)} /></div>
              {modal === "edit" && (
                <div><Label>Status</Label>
                  <select value={form.status} onChange={e => F("status", e.target.value)} className={selClass}>
                    <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option><option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
              <div className="col-span-2"><Label>Notes</Label><textarea value={form.notes} onChange={e => F("notes", e.target.value)} rows={2} className={`${dateClass} py-2`} /></div>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Task</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Delete <strong>{deleteTarget.equipmentName}</strong>? This cannot be undone.</p>
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
