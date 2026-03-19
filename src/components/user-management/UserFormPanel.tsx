"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { UserResponse, CreateUserRequest, UpdateUserRequest } from "./types";
import { isValidEmail, isValidUSPhone } from "@/utils/validation";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

interface RoleOption {
  value: string;
  label: string;
}

interface Props {
  open: boolean;
  editUser: UserResponse | null;
  onClose: () => void;
  onSave: (data: CreateUserRequest | UpdateUserRequest, isEdit: boolean) => Promise<void>;
}

export default function UserFormPanel({ open, editUser, onClose, onSave }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleName, setRoleName] = useState("PROVIDER");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [generatePrint, setGeneratePrint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Fetch roles from API when panel opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await fetchWithAuth(`${API()}/api/admin/roles`);
        const json = await res.json();
        if (!cancelled && res.ok && json.success && Array.isArray(json.data)) {
          setRoles(json.data.filter((r: any) => r.isActive !== false).map((r: any) => ({
            value: r.roleName,
            label: r.roleLabel || r.roleName,
          })));
        }
      } catch { /* keep existing roles */ }
      finally { if (!cancelled) setLoadingRoles(false); }
    };
    fetchRoles();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (editUser) {
      setFirstName(editUser.firstName || "");
      setLastName(editUser.lastName || "");
      setEmail(editUser.email || "");
      setPhone(editUser.phone || "");
      const role = editUser.roles.filter(
        (r) => !["default-roles-ciyex", "offline_access", "uma_authorization"].includes(r)
      )[0] || "";
      setRoleName(role);
    } else {
      setFirstName(""); setLastName(""); setEmail(""); setPhone("");
      setRoleName("PROVIDER"); setSendWelcomeEmail(true); setGeneratePrint(false);
    }
  }, [editUser, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isValidEmail(email)) errs.email = "Invalid email format";
    if (phone.trim() && !isValidUSPhone(phone)) errs.phone = "Mobile number must be exactly 10 digits";
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    setSaving(true);
    try {
      if (editUser) {
        await onSave({ firstName, lastName, email, phone, roleName } as UpdateUserRequest, true);
      } else {
        await onSave({
          firstName, lastName, email, phone, roleName,
          sendWelcomeEmail, generatePrintCredentials: generatePrint,
        } as CreateUserRequest, false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const showAutoLinkNote = !editUser && (roleName === "PROVIDER" || roleName === "PATIENT");

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {editUser ? "Edit User" : "Create User"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label>
            <select value={roleName} onChange={(e) => setRoleName(e.target.value)} required
              disabled={loadingRoles}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm disabled:opacity-60">
              {loadingRoles ? (
                <option>Loading roles...</option>
              ) : roles.length > 0 ? (
                roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))
              ) : (
                <option value={roleName}>{roleName}</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <input type="email" name="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); if (formErrors.email) setFormErrors(p => { const n = {...p}; delete n.email; return n; }); }} required
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm ${formErrors.email ? "border-red-400" : "border-slate-300 dark:border-slate-600"}`} />
            {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
            {showAutoLinkNote && (
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                Will auto-link to matching {roleName === "PATIENT" ? "patient" : "provider"} FHIR record by email
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); if (formErrors.phone) setFormErrors(p => { const n = {...p}; delete n.phone; return n; }); }}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm ${formErrors.phone ? "border-red-400" : "border-slate-300 dark:border-slate-600"}`} />
            {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
          </div>

          {!editUser && (
            <>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="welcomeEmail" checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300" />
                <label htmlFor="welcomeEmail" className="text-sm text-slate-700 dark:text-slate-300">
                  Send welcome email with credentials
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="printCreds" checked={generatePrint}
                  onChange={(e) => setGeneratePrint(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300" />
                <label htmlFor="printCreds" className="text-sm text-slate-700 dark:text-slate-300">
                  Generate printable credentials
                </label>
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editUser ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
