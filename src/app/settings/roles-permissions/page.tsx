"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Shield, Plus, Loader2, CheckCircle2, AlertTriangle, X, Trash2, Edit3, Lock,
} from "lucide-react";
import { RolePermission } from "@/components/roles/types";
import PermissionMatrix from "@/components/roles/PermissionMatrix";
import SmartScopeMatrix from "@/components/roles/SmartScopeMatrix";
import RoleFormPanel from "@/components/roles/RoleFormPanel";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

type ToastState = { type: "success" | "error"; text: string } | null;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "border-l-red-500",
  PROVIDER: "border-l-blue-500",
  NURSE: "border-l-green-500",
  MA: "border-l-teal-500",
  FRONT_DESK: "border-l-amber-500",
  BILLING: "border-l-purple-500",
  PATIENT: "border-l-slate-500",
};

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState<RolePermission | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/roles`);
      const json = await res.json();
      if (res.ok && json.success) setRoles(json.data || []);
      else setRoles([]);
    } catch { setRoles([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleSave = async (data: Partial<RolePermission>) => {
    const url = editRole ? `${API()}/api/admin/roles/${editRole.id}` : `${API()}/api/admin/roles`;
    const method = editRole ? "PUT" : "POST";
    const res = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok && json.success) {
      setToast({ type: "success", text: editRole ? "Role updated" : "Role created" });
      setShowForm(false);
      setEditRole(null);
      fetchRoles();
    } else {
      setToast({ type: "error", text: json.message || "Failed to save" });
    }
  };

  const handleDelete = async (role: RolePermission) => {
    if (role.isSystem) return;
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/roles/${role.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Role deleted" });
        fetchRoles();
      } else {
        setToast({ type: "error", text: json.message || "Failed to delete" });
      }
    } catch {
      setToast({ type: "error", text: "Failed to delete role" });
    }
  };

  const handleQuickScopeUpdate = async (role: RolePermission, newScopes: string[]) => {
    if (role.roleName === "ADMIN" && newScopes.length === 0) {
      setToast({ type: "error", text: "Cannot remove all FHIR scopes from ADMIN — this would lock out the organization" });
      return;
    }
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/roles/${role.id}`, {
        method: "PUT",
        body: JSON.stringify({ smartScopes: newScopes }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "FHIR scopes updated" });
        fetchRoles();
      } else {
        setToast({ type: "error", text: json.message || "Failed to update FHIR scopes" });
      }
    } catch {
      setToast({ type: "error", text: "Failed to update FHIR scopes" });
    }
  };

  const handleQuickPermissionUpdate = async (role: RolePermission, newPermissions: string[]) => {
    if (role.roleName === "ADMIN" && newPermissions.length === 0) {
      setToast({ type: "error", text: "Cannot remove all permissions from ADMIN — this would lock out the organization" });
      return;
    }
    try {
      const res = await fetchWithAuth(`${API()}/api/admin/roles/${role.id}`, {
        method: "PUT",
        body: JSON.stringify({ permissions: newPermissions }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ type: "success", text: "Permissions updated" });
        fetchRoles();
      } else {
        setToast({ type: "error", text: json.message || "Failed to update permissions" });
      }
    } catch {
      setToast({ type: "error", text: "Failed to update permissions" });
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
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Roles & Permissions</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure role-based access control</p>
            </div>
          </div>
          <button
            onClick={() => { setEditRole(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> New Role
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Shield className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No roles configured</p>
              <p className="text-xs mt-1">System roles will be initialized automatically.</p>
            </div>
          ) : (
            roles.map((role) => {
              const isExpanded = expandedRole === role.id;
              const borderColor = ROLE_COLORS[role.roleName] || "border-l-slate-400";

              return (
                <div key={role.id}
                  className={`rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 ${borderColor} bg-white dark:bg-slate-800/50`}>
                  {/* Role header */}
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedRole(isExpanded ? null : role.id)}>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{role.roleLabel}</span>
                          <span className="text-xs font-mono text-slate-400">{role.roleName}</span>
                          {role.isSystem && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <Lock className="w-3 h-3" /> System
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {role.description} — {role.permissions.length} permissions, {(role.smartScopes || []).length} FHIR scopes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditRole(role); setShowForm(true); }}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded permission + SMART scope matrices */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">FHIR Resource Access</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Controls read/write access to clinical data, scheduling, billing, and settings</p>
                        <SmartScopeMatrix
                          selected={role.smartScopes || []}
                          onChange={(newScopes) => handleQuickScopeUpdate(role, newScopes)}
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Feature Access</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Controls access to messaging, reports, and administration features</p>
                        <PermissionMatrix
                          selected={role.permissions}
                          onChange={(newPerms) => handleQuickPermissionUpdate(role, newPerms)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Form panel */}
        <RoleFormPanel
          open={showForm}
          editRole={editRole}
          onClose={() => { setShowForm(false); setEditRole(null); }}
          onSave={handleSave}
        />
      </div>
  );
}
