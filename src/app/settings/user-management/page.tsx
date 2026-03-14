"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Users, UserPlus, Search, Loader2, CheckCircle2, AlertTriangle, X,
  Stethoscope, HeartPulse,
} from "lucide-react";
import { UserResponse, CreateUserRequest, UpdateUserRequest, ResetPasswordResponse } from "@/components/user-management/types";
import UserTable from "@/components/user-management/UserTable";
import UserFormPanel from "@/components/user-management/UserFormPanel";
import ResetPasswordModal from "@/components/user-management/ResetPasswordModal";
import LinkPractitionerModal from "@/components/user-management/LinkPractitionerModal";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

type ToastState = { type: "success" | "error"; text: string } | null;
type Tab = "staff" | "patients";

interface LookupResult {
  id: string | number;
  fhirId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  npi?: string;
  hasAccount?: boolean;
}

/* ──────── Lookup Panel (search providers or patients, then create user) ──────── */
function AddUserLookupPanel({
  open,
  tab,
  onClose,
  onCreated,
}: {
  open: boolean;
  tab: Tab;
  onClose: () => void;
  onCreated: (msg: string, resetData?: ResetPasswordResponse, isError?: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<LookupResult | null>(null);
  const [roleName, setRoleName] = useState(tab === "patients" ? "PATIENT" : "PROVIDER");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [generatePrint, setGeneratePrint] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setRoleName(tab === "patients" ? "PATIENT" : "PROVIDER");
      setSendWelcomeEmail(true);
      setGeneratePrint(false);
      setManualEmail("");
    }
  }, [open, tab]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const endpoint = tab === "patients"
          ? `${API()}/api/patients?search=${encodeURIComponent(query)}&page=0&size=10`
          : `${API()}/api/providers?search=${encodeURIComponent(query)}&page=0&size=10`;
        const res = await fetchWithAuth(endpoint);
        const json = await res.json();
        const list = json.data?.content || json.data || json.content || [];
        const mapped: LookupResult[] = (Array.isArray(list) ? list : []).slice(0, 10).map((r: any) => ({
          id: r.id,
          fhirId: r.fhirId || r.id?.toString(),
          firstName: r.firstName || r.identification?.firstName || r.name?.given?.[0] || (typeof r.name === "string" ? r.name.split(" ")[0] : "") || "",
          lastName: r.lastName || r.identification?.lastName || r.name?.family || (typeof r.name === "string" ? r.name.split(" ").slice(1).join(" ") : "") || "",
          email: r.email || r.systemAccess?.email || r.telecom?.find((t: any) => t.system === "email")?.value || "",
          npi: r.npi || "",
          hasAccount: r.systemAccess?.hasAccount || false,
        }));
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tab]);

  const handleCreate = async () => {
    if (!selected) return;
    const email = selected.email || manualEmail;
    if (!email) return;
    setSaving(true);
    try {
      const body: CreateUserRequest = {
        firstName: selected.firstName,
        lastName: selected.lastName,
        email,
        roleName,
        sendWelcomeEmail,
        generatePrintCredentials: generatePrint,
        linkedFhirId: selected.fhirId,
      };
      const res = await fetchWithAuth(`${API()}/api/admin/users`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const msg = json.message || "User created";
        if (json.data?.temporaryPassword) {
          onCreated(msg, {
            userId: json.data.id,
            username: json.data.email,
            temporaryPassword: json.data.temporaryPassword,
            resetDate: new Date().toISOString().split("T")[0],
          });
        } else {
          onCreated(msg);
        }
        onClose();
      } else {
        onCreated(json.message || "Failed to create user", undefined, true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isPatientTab = tab === "patients";

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {isPatientTab ? "Add Patient Login" : "Add Staff Login"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Search {isPatientTab ? "patient" : "provider"}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Type name to search ${isPatientTab ? "patients" : "providers"}...`}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>

            {/* Results dropdown */}
            {query.length >= 2 && !selected && (
              <div className="mt-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 max-h-52 overflow-y-auto shadow-lg">
                {searching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-400 text-center">No results found</div>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { if (!r.hasAccount) { setSelected(r); setResults([]); } }}
                      disabled={r.hasAccount}
                      className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-700 ${
                        r.hasAccount ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {r.firstName} {r.lastName}
                        </span>
                        {r.hasAccount && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium">
                            Has login
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {r.email}{r.npi ? ` · NPI: ${r.npi}` : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected record */}
          {selected && (
            <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-800 dark:text-green-200">
                    {selected.firstName} {selected.lastName}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {selected.email}{selected.npi ? ` · NPI: ${selected.npi}` : ""}
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setQuery(""); }}
                  className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-800">
                  <X className="w-4 h-4 text-green-600" />
                </button>
              </div>
            </div>
          )}

          {/* Email (when not on file) */}
          {selected && !selected.email && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">Not on file — enter email for login</span>
              </label>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="Enter email address..."
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          )}

          {/* Role */}
          {selected && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select value={roleName} onChange={(e) => setRoleName(e.target.value)}
                disabled={isPatientTab || loadingRoles}
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
          )}

          {/* Options */}
          {selected && (
            <>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="lu-welcome" checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300" />
                <label htmlFor="lu-welcome" className="text-sm text-slate-700 dark:text-slate-300">
                  Send welcome email with credentials
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="lu-print" checked={generatePrint}
                  onChange={(e) => setGeneratePrint(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300" />
                <label htmlFor="lu-print" className="text-sm text-slate-700 dark:text-slate-300">
                  Generate printable credentials
                </label>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!selected || saving || (!selected.email && !manualEmail)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────── Main Page ──────── */
export default function UserManagementPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("staff");
  const [showLookup, setShowLookup] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [resetData, setResetData] = useState<ResetPasswordResponse | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [linkUser, setLinkUser] = useState<UserResponse | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "0", size: "50" });
      if (search) params.set("search", search);
      const res = await fetchWithAuth(`${API()}/api/admin/users?${params}`);
      const json = await res.json();
      if (res.ok && json.success) setUsers(json.data || []);
      else setUsers([]);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Filter users by tab
  const filteredUsers = users.filter((u) => {
    const roles = u.roles.filter(
      (r) => !["default-roles-ciyex", "offline_access", "uma_authorization"].includes(r)
    );
    if (activeTab === "patients") return roles.includes("PATIENT");
    return !roles.includes("PATIENT");
  });

  const handleSave = async (data: CreateUserRequest | UpdateUserRequest, isEdit: boolean) => {
    const url = isEdit ? `${API()}/api/admin/users/${editUser?.id}` : `${API()}/api/admin/users`;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok && json.success) {
      setToast({ type: "success", text: isEdit ? "User updated" : "User created" });
      setShowForm(false);
      setEditUser(null);
      if (!isEdit && json.data?.temporaryPassword) {
        setResetData({
          userId: json.data.id,
          username: json.data.email,
          temporaryPassword: json.data.temporaryPassword,
          resetDate: new Date().toISOString().split("T")[0],
        });
        setShowResetModal(true);
      }
      fetchUsers();
    } else {
      setToast({ type: "error", text: json.message || "Failed to save" });
    }
  };

  const handleResetPassword = async (user: UserResponse) => {
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/users/${user.id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setResetData(json.data);
        setShowResetModal(true);
      } else {
        setToast({ type: "error", text: json.message || "Failed to reset password" });
      }
    } catch {
      setToast({ type: "error", text: "Failed to reset password" });
    }
  };

  const handleSendResetEmail = async (user: UserResponse) => {
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/users/${user.id}/send-reset-email`, { method: "POST" });
      let json: any = {};
      try { json = await res.json(); } catch { /* non-JSON response */ }
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Password reset email sent successfully" });
      } else {
        const errMsg = json.message || json.error || `HTTP ${res.status}`;
        const isConfigError = errMsg.toLowerCase().includes("smtp") || errMsg.toLowerCase().includes("mail") || errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("config");
        setToast({
          type: "error",
          text: isConfigError
            ? `Email not configured: ${errMsg}. Check SMTP settings in System → Settings.`
            : `Failed to send email: ${errMsg}`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setToast({ type: "error", text: `Failed to send email: ${msg}. Check your network connection.` });
    }
  };

  const handleLinkPractitioner = async (userId: string, practitionerFhirId: string, npi: string) => {
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/users/${userId}/link-practitioner`, {
        method: "PUT",
        body: JSON.stringify({ practitionerFhirId, npi }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Record linked successfully" });
        setShowLinkModal(false);
        setLinkUser(null);
        fetchUsers();
      } else {
        setToast({ type: "error", text: json.message || "Failed to link" });
      }
    } catch {
      setToast({ type: "error", text: "Failed to link record" });
    }
  };

  const handleDeactivate = async (user: UserResponse) => {
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/users/${user.id}/deactivate`, { method: "PUT" });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "User deactivated" });
        fetchUsers();
      } else {
        setToast({ type: "error", text: json.message || "Failed to deactivate" });
      }
    } catch {
      setToast({ type: "error", text: "Failed to deactivate user" });
    }
  };

  const handleLookupCreated = (msg: string, rd?: ResetPasswordResponse, isError?: boolean) => {
    if (msg) setToast({ type: isError ? "error" : "success", text: msg });
    if (rd) { setResetData(rd); setShowResetModal(true); }
    if (!isError) fetchUsers();
  };

  const staffCount = users.filter((u) => {
    const roles = u.roles.filter((r) => !["default-roles-ciyex", "offline_access", "uma_authorization"].includes(r));
    return !roles.includes("PATIENT");
  }).length;
  const patientCount = users.filter((u) => {
    const roles = u.roles.filter((r) => !["default-roles-ciyex", "offline_access", "uma_authorization"].includes(r));
    return roles.includes("PATIENT");
  }).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-start gap-3 max-w-md ${
          toast.type === "success"
            ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
            : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="break-words">{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Users</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage staff and patient login accounts</p>
          </div>
        </div>
        <button
          onClick={() => setShowLookup(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 mb-4 flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("staff")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "staff"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Staff & Providers
          <span className="ml-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
            {staffCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("patients")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "patients"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Patients
          <span className="ml-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
            {patientCount}
          </span>
        </button>
      </div>

      {/* Search bar */}
      <div className="shrink-0 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Users className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">
              {activeTab === "patients" ? "No patient logins found" : "No staff logins found"}
            </p>
            <p className="text-xs mt-1">Click &quot;Add User&quot; to create a login.</p>
          </div>
        ) : (
          <UserTable
            users={filteredUsers}
            onEdit={(u) => { setEditUser(u); setShowForm(true); }}
            onResetPassword={handleResetPassword}
            onSendResetEmail={handleSendResetEmail}
            onDeactivate={handleDeactivate}
            onLinkPractitioner={(u) => { setLinkUser(u); setShowLinkModal(true); }}
          />
        )}
      </div>

      {/* Add user lookup panel */}
      <AddUserLookupPanel
        open={showLookup}
        tab={activeTab}
        onClose={() => setShowLookup(false)}
        onCreated={handleLookupCreated}
      />

      {/* Edit form panel (kept for editing existing users) */}
      <UserFormPanel
        open={showForm}
        editUser={editUser}
        onClose={() => { setShowForm(false); setEditUser(null); }}
        onSave={handleSave}
      />

      {/* Reset password modal */}
      <ResetPasswordModal
        open={showResetModal}
        data={resetData}
        onClose={() => { setShowResetModal(false); setResetData(null); }}
      />

      {/* Link practitioner modal */}
      <LinkPractitionerModal
        open={showLinkModal}
        user={linkUser}
        onClose={() => { setShowLinkModal(false); setLinkUser(null); }}
        onSave={handleLinkPractitioner}
      />
    </div>
  );
}
