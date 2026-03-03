"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Loader2, Search, Link2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { UserResponse, CreateUserRequest, UpdateUserRequest, SYSTEM_ROLES } from "./types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

interface LookupResult {
  id: string;
  fhirId: string;
  name: string;
  email?: string;
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

  // Linked record state
  const [linkedFhirId, setLinkedFhirId] = useState("");
  const [linkedLabel, setLinkedLabel] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const lookupRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const needsLookup = roleName === "PROVIDER" || roleName === "PATIENT";

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
    setLinkedFhirId(""); setLinkedLabel(""); setLookupQuery("");
    setLookupResults([]); setShowLookup(false);
  }, [editUser, open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lookupRef.current && !lookupRef.current.contains(e.target as Node)) {
        setShowLookup(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchRecords = useCallback(async (query: string) => {
    if (query.length < 2) { setLookupResults([]); return; }
    setLookupLoading(true);
    try {
      const isPatient = roleName === "PATIENT";
      const url = isPatient
        ? `${API()}/api/patients?search=${encodeURIComponent(query)}`
        : `${API()}/api/providers?search=${encodeURIComponent(query)}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      // Response: { success, data: { content: [...] } }
      const items = json?.data?.content ?? json?.data;
      if (res.ok && json.success && Array.isArray(items)) {
        const results: LookupResult[] = items.slice(0, 10).map((item: Record<string, unknown>) => {
          const id = String(item.id || item.fhirId || "");
          const fhirId = String(item.fhirId || item.id || "");
          // Handle nested objects (flatToNested: identification.firstName → identification: { firstName })
          const ident = (item.identification || {}) as Record<string, unknown>;
          const contact = (item.contact || {}) as Record<string, unknown>;
          const fn = String(ident.firstName || item.firstName || "");
          const ln = String(ident.lastName || item.lastName || "");
          const em = String(contact.email || item.email || "");
          return { id, fhirId, name: `${fn} ${ln}`.trim(), email: em || undefined };
        });
        setLookupResults(results);
      }
    } catch {
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  }, [roleName]);

  const handleLookupInput = (value: string) => {
    setLookupQuery(value);
    setShowLookup(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchRecords(value), 300);
  };

  const selectRecord = (result: LookupResult) => {
    setLinkedFhirId(result.fhirId);
    setLinkedLabel(result.name + (result.email ? ` (${result.email})` : ""));
    setLookupQuery("");
    setShowLookup(false);
    setLookupResults([]);
    // Auto-fill name/email from selected record if fields are empty
    if (!firstName && !lastName) {
      const parts = result.name.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    if (!email && result.email) {
      setEmail(result.email);
    }
  };

  const clearLinked = () => {
    setLinkedFhirId(""); setLinkedLabel("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        await onSave({ firstName, lastName, email, phone, roleName } as UpdateUserRequest, true);
      } else {
        await onSave({
          firstName, lastName, email, phone, roleName,
          sendWelcomeEmail, generatePrintCredentials: generatePrint,
          linkedFhirId: linkedFhirId || undefined,
        } as CreateUserRequest, false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

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
            <select value={roleName} onChange={(e) => { setRoleName(e.target.value); clearLinked(); }} required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
              {SYSTEM_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {!editUser && needsLookup && (
            <div ref={lookupRef} className="relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Link to {roleName === "PATIENT" ? "Patient" : "Provider"} Record
              </label>
              {linkedFhirId ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-sm">
                  <Link2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-green-800 dark:text-green-200 truncate flex-1">{linkedLabel}</span>
                  <button type="button" onClick={clearLinked}
                    className="text-green-600 dark:text-green-400 hover:text-red-500 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={lookupQuery}
                    onChange={(e) => handleLookupInput(e.target.value)}
                    onFocus={() => lookupResults.length > 0 && setShowLookup(true)}
                    placeholder={`Search ${roleName === "PATIENT" ? "patients" : "providers"} by name...`}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                  />
                  {lookupLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>
              )}
              {showLookup && lookupResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {lookupResults.map((r) => (
                    <button key={r.fhirId} type="button" onClick={() => selectRecord(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{r.name}</div>
                      {r.email && <div className="text-xs text-slate-500">{r.email}</div>}
                    </button>
                  ))}
                </div>
              )}
              {showLookup && lookupQuery.length >= 2 && !lookupLoading && lookupResults.length === 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
                  No matching records found
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Links this account to an existing {roleName === "PATIENT" ? "patient" : "provider"} record
              </p>
            </div>
          )}

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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
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
