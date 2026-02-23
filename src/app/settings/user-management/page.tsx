"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Users, Plus, Search, Loader2, CheckCircle2, AlertTriangle, X,
} from "lucide-react";
import { UserResponse, CreateUserRequest, UpdateUserRequest, ResetPasswordResponse } from "@/components/user-management/types";
import UserTable from "@/components/user-management/UserTable";
import UserFormPanel from "@/components/user-management/UserFormPanel";
import ResetPasswordModal from "@/components/user-management/ResetPasswordModal";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

type ToastState = { type: "success" | "error"; text: string } | null;

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [resetData, setResetData] = useState<ResetPasswordResponse | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
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

  const handleSave = async (data: CreateUserRequest | UpdateUserRequest, isEdit: boolean) => {
    const url = isEdit ? `${API()}/api/admin/users/${editUser?.id}` : `${API()}/api/admin/users`;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok && json.success) {
      setToast({ type: "success", text: isEdit ? "User updated" : "User created" });
      setShowForm(false);
      setEditUser(null);

      // If print credentials were requested, show the modal
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
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Password reset email sent" });
      } else {
        setToast({ type: "error", text: json.message || "Failed to send email" });
      }
    } catch {
      setToast({ type: "error", text: "Failed to send email" });
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

  return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
              : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{toast.text}</span>
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
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">User Management</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage staff accounts, roles, and access</p>
            </div>
          </div>
          <button
            onClick={() => { setEditUser(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Add User
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
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Users className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs mt-1">Create a user to get started.</p>
            </div>
          ) : (
            <UserTable
              users={users}
              onEdit={(u) => { setEditUser(u); setShowForm(true); }}
              onResetPassword={handleResetPassword}
              onSendResetEmail={handleSendResetEmail}
              onDeactivate={handleDeactivate}
            />
          )}
        </div>

        {/* Form panel */}
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
      </div>
  );
}
